(function () {
  "use strict";

  var Data = window.ShedsData;
  if (!Data) {
    console.error("ShedsData missing — load sheds-data.js first");
    return;
  }

  var STORAGE_KEY = "wp-sheds-field-v1";
  var CACHE_KEY = "wp-sheds-last-read-v1";

  var BASEMAP = {
    base: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    labels: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19
  };

  var ZONE_STYLE = {
    high: {
      color: "#8a9a3a",
      fillColor: "#d4c46a",
      fillOpacity: 0.38,
      weight: 1.25,
      opacity: 0.8
    },
    medium: {
      color: "#c46a3a",
      fillColor: "#c46a3a",
      fillOpacity: 0.28,
      weight: 1,
      opacity: 0.7
    },
    low: {
      color: "#2f5c47",
      fillColor: "#2f5c47",
      fillOpacity: 0.2,
      weight: 1,
      opacity: 0.55
    }
  };

  var PREDICT_STYLE = {
    color: "#d4c46a",
    fillColor: "#d4c46a",
    fillOpacity: 0.12,
    weight: 1,
    opacity: 0.45,
    dashArray: "4 6"
  };

  var DEFAULT_CENTER = [40.78, -77.86];
  var DEFAULT_ZOOM = 12;
  var reducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var map = null;
  var zoneLayer = null;
  var predictLayer = null;
  var obsLayer = null;
  var regsMarker = null;
  var userMarker = null;
  var searchTimer = null;

  var state = {
    zonesOn: true,
    predictOn: false,
    obsOn: true,
    regsOn: true,
    educationMode: false,
    sheetOpen: false,
    hasFix: false,
    locating: false,
    center: DEFAULT_CENTER.slice(),
    observations: [],
    pane: "today",
    conditionLevel: "fair"
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    var el = $(id);
    if (el) el.textContent = text;
  }

  function isDesktop() {
    return window.matchMedia("(min-width: 960px)").matches;
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.observations)) {
        state.observations = parsed.observations.slice(0, 40);
      }
      if (parsed && parsed.prefs) {
        if (typeof parsed.prefs.zonesOn === "boolean") state.zonesOn = parsed.prefs.zonesOn;
        if (typeof parsed.prefs.predictOn === "boolean") state.predictOn = parsed.prefs.predictOn;
        if (typeof parsed.prefs.obsOn === "boolean") state.obsOn = parsed.prefs.obsOn;
        if (typeof parsed.prefs.regsOn === "boolean") state.regsOn = parsed.prefs.regsOn;
        if (typeof parsed.prefs.educationMode === "boolean") {
          state.educationMode = parsed.prefs.educationMode;
        }
      }
    } catch (err) {
      /* ignore corrupt store */
    }
  }

  function saveStore() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          observations: state.observations,
          prefs: {
            zonesOn: state.zonesOn,
            predictOn: state.predictOn,
            obsOn: state.obsOn,
            regsOn: state.regsOn,
            educationMode: state.educationMode
          },
          savedAt: Date.now()
        })
      );
    } catch (err) {
      /* quota / private mode */
    }
  }

  function cacheRead(payload) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ savedAt: Date.now(), payload: payload })
      );
    } catch (err) {
      /* ignore */
    }
  }

  function applyRead(level) {
    var read = Data.READS[level] || Data.READS.fair;
    state.conditionLevel = read.level;
    var condition = $("sheds-condition");
    if (condition) condition.setAttribute("data-level", read.level);
    setText("sheds-condition-text", read.label);
    setText("sheds-opportunity", read.opportunity);
    setText("sheds-why", read.why);
    setText("sheds-panel-condition", read.label);
    setText("sheds-panel-opportunity", read.opportunity);
    setText("sheds-panel-why", read.why);

    var month = Data.monthIndex();
    var seasonRow = Data.SEASON_MONTHS[month];
    setText(
      "sheds-panel-season",
      seasonRow ? seasonRow.label + " · " + seasonRow.hint : "—"
    );

    var take = Data.buildTake({
      month: month,
      level: read.level,
      educationMode: state.educationMode
    });
    setText("sheds-take-body", take.body);
    setText("sheds-take-footer", take.footer);

    cacheRead({
      level: read.level,
      label: read.label,
      opportunity: read.opportunity,
      why: read.why,
      take: take.body
    });
  }

  function setGpsStatus(kind, text) {
    ["sheds-gps-status", "sheds-gps-status-desktop"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.textContent = text || "";
      el.className = "sheds-hud-status" + (kind ? " is-" + kind : "");
    });
  }

  function updateLegendState() {
    var el = $("sheds-legend-state");
    if (!el) return;
    if (state.educationMode) {
      el.textContent = "Education mode — hotspot and prediction fills hidden.";
    } else if (!state.zonesOn && !state.predictOn) {
      el.textContent = "Interest layers off.";
    } else {
      el.textContent = "Illustrative demo overlays around your map center.";
    }
    var copy = $("sheds-layer-copy");
    if (copy) {
      copy.textContent =
        Data.LAYER_COPY.zones +
        " " +
        (state.predictOn ? Data.LAYER_COPY.predict : "");
    }
  }

  function ringCoords(lat, lon, radiusDeg, points, offset) {
    var coords = [];
    var i;
    var a;
    offset = offset || 0;
    for (i = 0; i <= points; i++) {
      a = offset + (i / points) * Math.PI * 2;
      coords.push([
        lat + Math.sin(a) * radiusDeg * 0.75,
        lon + Math.cos(a) * radiusDeg
      ]);
    }
    return coords;
  }

  function buildDemoZones(lat, lon) {
    return [
      {
        level: "high",
        name: "South bench (demo)",
        latlngs: ringCoords(lat + 0.012, lon + 0.008, 0.009, 24, 0.4)
      },
      {
        level: "medium",
        name: "Timber edge (demo)",
        latlngs: ringCoords(lat - 0.006, lon - 0.014, 0.011, 24, 1.1)
      },
      {
        level: "low",
        name: "Open flat (demo)",
        latlngs: ringCoords(lat + 0.004, lon - 0.02, 0.008, 20, 2.2)
      }
    ];
  }

  function buildPredictRings(lat, lon) {
    return [
      {
        name: "Warm-aspect teaching tint (demo)",
        latlngs: ringCoords(lat + 0.01, lon + 0.004, 0.016, 28, 0.2)
      }
    ];
  }

  function renderZones() {
    if (!map) return;
    if (zoneLayer) {
      map.removeLayer(zoneLayer);
      zoneLayer = null;
    }

    var demoTag = $("sheds-demo-tag");
    if (demoTag) {
      demoTag.hidden =
        state.educationMode || (!state.zonesOn && !state.predictOn);
    }

    if (!state.zonesOn || state.educationMode) {
      updateLegendState();
      return;
    }

    var zones = buildDemoZones(state.center[0], state.center[1]);
    zoneLayer = L.layerGroup();
    zones.forEach(function (z) {
      var poly = L.polygon(z.latlngs, ZONE_STYLE[z.level] || ZONE_STYLE.low);
      poly.bindTooltip(
        z.name + " — " + Data.zoneExplain(z.level),
        { sticky: true, opacity: 0.92, className: "sheds-tip" }
      );
      zoneLayer.addLayer(poly);
    });
    zoneLayer.addTo(map);
    updateLegendState();
  }

  function renderPredict() {
    if (!map) return;
    if (predictLayer) {
      map.removeLayer(predictLayer);
      predictLayer = null;
    }
    if (!state.predictOn || state.educationMode) return;

    var rings = buildPredictRings(state.center[0], state.center[1]);
    predictLayer = L.layerGroup();
    rings.forEach(function (r) {
      var poly = L.polygon(r.latlngs, PREDICT_STYLE);
      poly.bindTooltip(r.name, { sticky: true, opacity: 0.9, className: "sheds-tip" });
      predictLayer.addLayer(poly);
    });
    predictLayer.addTo(map);
  }

  function renderRegs() {
    if (!map) return;
    if (regsMarker) {
      map.removeLayer(regsMarker);
      regsMarker = null;
    }
    if (!state.regsOn) return;

    var lat = state.center[0] - 0.018;
    var lon = state.center[1] + 0.016;
    var icon = L.divIcon({
      className: "",
      html: '<div class="sheds-regs-marker" title="Regulation reminder">Regs</div>',
      iconSize: [44, 28],
      iconAnchor: [22, 14]
    });
    regsMarker = L.marker([lat, lon], { icon: icon, keyboard: true })
      .bindPopup(
        "<strong>Verify locally</strong><br>" +
          Data.REGULATIONS.agencyHint +
          "<br><span class='muted'>Demo pin — not a legal boundary.</span>",
        { maxWidth: 240 }
      )
      .addTo(map);
  }

  function renderObservations() {
    if (!map) return;
    if (obsLayer) {
      map.removeLayer(obsLayer);
      obsLayer = null;
    }
    renderObsList();
    if (!state.obsOn || !state.observations.length) return;

    obsLayer = L.layerGroup();
    state.observations.forEach(function (o) {
      var icon = L.divIcon({
        className: "",
        html: '<div class="sheds-obs-marker"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });
      var m = L.marker([o.lat, o.lon], { icon: icon });
      m.bindTooltip(o.note || "Private observation", {
        sticky: true,
        opacity: 0.9,
        className: "sheds-tip"
      });
      obsLayer.addLayer(m);
    });
    obsLayer.addTo(map);
  }

  function renderObsList() {
    var list = $("sheds-obs-list");
    var empty = $("sheds-obs-empty");
    if (!list) return;
    list.innerHTML = "";
    if (!state.observations.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    state.observations.forEach(function (o, idx) {
      var li = document.createElement("li");
      var when = o.at ? new Date(o.at).toLocaleString() : "";
      li.innerHTML =
        "<button type='button' class='sheds-obs-item' data-idx='" +
        idx +
        "'>" +
        "<span class='sheds-obs-item-note'>" +
        escapeHtml(o.note || "Observation") +
        "</span>" +
        "<span class='sheds-obs-item-meta'>" +
        escapeHtml(o.lat.toFixed(3) + ", " + o.lon.toFixed(3) + (when ? " · " + when : "")) +
        "</span></button>";
      list.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setUserMarker(lat, lon) {
    var icon = L.divIcon({
      className: "",
      html:
        '<div class="sheds-user-marker' +
        (reducedMotion ? "" : " is-pulse") +
        '"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    if (userMarker) {
      userMarker.setLatLng([lat, lon]);
      userMarker.setIcon(icon);
    } else {
      userMarker = L.marker([lat, lon], { icon: icon, interactive: false }).addTo(map);
    }
  }

  function reverseLabel(lat, lon, fallback) {
    var label =
      fallback ||
      lat.toFixed(3) + "°, " + lon.toFixed(3) + "°";
    setText("sheds-location", label);
    setText("sheds-location-desktop", label);
  }

  function refreshOverlays() {
    renderZones();
    renderPredict();
    renderRegs();
    renderObservations();
  }

  function initMap() {
    var container = $("sheds-map");
    if (!container || typeof L === "undefined") return;

    map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    L.tileLayer(BASEMAP.base, {
      attribution: BASEMAP.attribution,
      subdomains: BASEMAP.subdomains,
      maxZoom: BASEMAP.maxZoom
    }).addTo(map);

    L.tileLayer(BASEMAP.labels, {
      subdomains: BASEMAP.subdomains,
      maxZoom: BASEMAP.maxZoom,
      pane: "overlayPane",
      opacity: 0.95
    }).addTo(map);

    map.zoomControl.setPosition("bottomleft");

    state.center = DEFAULT_CENTER.slice();
    reverseLabel(DEFAULT_CENTER[0], DEFAULT_CENTER[1], "Demo area · central PA foothills");
    refreshOverlays();

    map.on("moveend", function () {
      var c = map.getCenter();
      state.center = [c.lat, c.lng];
      if (!state.hasFix) {
        reverseLabel(c.lat, c.lng, "Map center · " + c.lat.toFixed(3) + ", " + c.lng.toFixed(3));
      }
      refreshOverlays();
    });

    requestAnimationFrame(function () {
      map.invalidateSize();
    });
    /* Single deferred invalidate — avoid aggressive timers */
    window.setTimeout(function () {
      if (map) map.invalidateSize();
    }, 180);
  }

  function locate() {
    var btn = $("sheds-locate-btn");
    if (!navigator.geolocation) {
      setGpsStatus("error", "Location not supported on this device.");
      return;
    }
    if (state.locating) return;

    state.locating = true;
    if (btn) btn.classList.add("is-pulsing");
    setGpsStatus("locating", "Locating…");

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        state.locating = false;
        state.hasFix = true;
        if (btn) btn.classList.remove("is-pulsing");
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;
        state.center = [lat, lon];
        map.setView([lat, lon], Math.max(map.getZoom(), 13), {
          animate: !reducedMotion
        });
        setUserMarker(lat, lon);
        reverseLabel(lat, lon);
        setGpsStatus("success", "Location updated · private to this device");
        refreshOverlays();
        window.setTimeout(function () {
          setGpsStatus("", "");
        }, 2200);
      },
      function (err) {
        state.locating = false;
        if (btn) btn.classList.remove("is-pulsing");
        var msg = "Location unavailable.";
        if (err && err.code === 1) msg = "Location denied — map still usable.";
        if (err && err.code === 2) msg = "Position unavailable — try again outside.";
        if (err && err.code === 3) msg = "Location timed out — try again.";
        setGpsStatus("error", msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  function syncLayerChecks() {
    var z = $("sheds-layer-zones");
    var p = $("sheds-layer-predict");
    var o = $("sheds-layer-obs");
    var r = $("sheds-layer-regs");
    if (z) z.checked = state.zonesOn;
    if (p) p.checked = state.predictOn;
    if (o) o.checked = state.obsOn;
    if (r) r.checked = state.regsOn;

    var zonesBtn = $("sheds-zones-btn");
    var predictBtn = $("sheds-predict-btn");
    if (zonesBtn) zonesBtn.setAttribute("aria-pressed", state.zonesOn ? "true" : "false");
    if (predictBtn) {
      predictBtn.setAttribute("aria-pressed", state.predictOn ? "true" : "false");
    }
  }

  function setZones(on) {
    state.zonesOn = !!on;
    syncLayerChecks();
    saveStore();
    renderZones();
  }

  function setPredict(on) {
    state.predictOn = !!on;
    syncLayerChecks();
    saveStore();
    renderPredict();
    updateLegendState();
  }

  function setObsLayer(on) {
    state.obsOn = !!on;
    syncLayerChecks();
    saveStore();
    renderObservations();
  }

  function setRegs(on) {
    state.regsOn = !!on;
    syncLayerChecks();
    saveStore();
    renderRegs();
  }

  function setEducation(on) {
    state.educationMode = !!on;
    var btn = $("sheds-edu-btn");
    var banner = $("sheds-edu-banner");
    if (btn) btn.setAttribute("aria-pressed", state.educationMode ? "true" : "false");
    if (banner) banner.hidden = !state.educationMode;
    if (state.educationMode) {
      setText(
        "sheds-panel-note",
        "Education mode: learn aspect, cover, and travel without hotspot guidance."
      );
    } else {
      setText(
        "sheds-panel-note",
        "Illustrative demo only. Patterns are patterned — not guarantees."
      );
    }
    saveStore();
    applyRead(state.conditionLevel);
    refreshOverlays();
  }

  function setSheet(open) {
    state.sheetOpen = !!open;
    var panel = $("sheds-panel");
    var toggle = $("sheds-sheet-toggle");
    if (!panel) return;
    if (isDesktop()) {
      panel.classList.add("is-open");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
      document.body.classList.remove("sheds-sheet-open");
      return;
    }
    panel.classList.toggle("is-open", state.sheetOpen);
    if (toggle) toggle.setAttribute("aria-expanded", state.sheetOpen ? "true" : "false");
    document.body.classList.toggle("sheds-sheet-open", state.sheetOpen);
  }

  function setPane(name) {
    state.pane = name;
    ["today", "learn", "notes"].forEach(function (id) {
      var tab = $("sheds-tab-" + id);
      var pane = $("sheds-pane-" + id);
      var on = id === name;
      if (tab) {
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
      }
      if (pane) {
        pane.classList.toggle("is-active", on);
        pane.hidden = !on;
      }
    });
  }

  function addObservation(note) {
    var c = state.center;
    state.observations.unshift({
      id: "obs-" + Date.now(),
      lat: c[0],
      lon: c[1],
      note: String(note || "").trim().slice(0, 120),
      at: Date.now()
    });
    if (state.observations.length > 40) state.observations.length = 40;
    state.obsOn = true;
    saveStore();
    syncLayerChecks();
    renderObservations();
    setPane("notes");
    if (!isDesktop()) setSheet(true);
  }

  function clearObservations() {
    if (!state.observations.length) return;
    if (!window.confirm("Clear all private observations on this device?")) return;
    state.observations = [];
    saveStore();
    renderObservations();
  }

  function renderSeason() {
    var el = $("sheds-season");
    var hint = $("sheds-season-hint");
    if (!el) return;
    var month = Data.monthIndex();
    el.innerHTML = "";
    Data.SEASON_MONTHS.forEach(function (row) {
      var li = document.createElement("li");
      li.className =
        "sheds-season-cell" +
        (row.m === month ? " is-current" : "") +
        " is-" +
        row.phase;
      li.innerHTML =
        "<span class='sheds-season-label'>" +
        row.label +
        "</span>";
      li.title = row.hint;
      el.appendChild(li);
    });
    if (hint) {
      var cur = Data.SEASON_MONTHS[month];
      hint.textContent = cur
        ? "Now (demo): " + cur.hint + " — Northeast-oriented calendar, not jurisdiction-specific."
        : "";
    }
  }

  function renderEducation() {
    var list = $("sheds-edu-list");
    if (!list) return;
    list.innerHTML = "";
    Data.EDUCATION.forEach(function (item) {
      var details = document.createElement("details");
      details.className = "sheds-edu-card";
      details.innerHTML =
        "<summary><span class='sheds-edu-title'>" +
        escapeHtml(item.title) +
        "</span><span class='sheds-edu-summary'>" +
        escapeHtml(item.summary) +
        "</span></summary><p>" +
        escapeHtml(item.body) +
        "</p>";
      list.appendChild(details);
    });
  }

  function renderRegulations() {
    setText("sheds-regs-headline", Data.REGULATIONS.headline);
    setText("sheds-regs-agency", Data.REGULATIONS.agencyHint);
    var ul = $("sheds-regs-list");
    if (!ul) return;
    ul.innerHTML = "";
    Data.REGULATIONS.points.forEach(function (p) {
      var li = document.createElement("li");
      li.textContent = p;
      ul.appendChild(li);
    });
  }

  function renderSearchResults(items) {
    var box = $("sheds-search-results");
    if (!box) return;
    box.innerHTML = "";
    if (!items.length) {
      box.hidden = true;
      return;
    }
    items.forEach(function (place, i) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.id = "sheds-search-opt-" + i;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sheds-search-option";
      btn.textContent = place.name;
      btn.addEventListener("click", function () {
        goToPlace(place);
      });
      li.appendChild(btn);
      box.appendChild(li);
    });
    box.hidden = false;
  }

  function goToPlace(place) {
    if (!map || !place) return;
    state.hasFix = false;
    state.center = [place.lat, place.lon];
    map.setView([place.lat, place.lon], 12, { animate: !reducedMotion });
    reverseLabel(place.lat, place.lon, place.name);
    var box = $("sheds-search-results");
    if (box) box.hidden = true;
    var input = $("sheds-search-input");
    if (input) input.value = place.name;
    refreshOverlays();
  }

  function bindSearch() {
    var form = $("sheds-search-form");
    var input = $("sheds-search-input");
    if (!form || !input) return;

    input.addEventListener("input", function () {
      if (searchTimer) window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(function () {
        renderSearchResults(Data.searchPlaces(input.value).slice(0, 6));
      }, 120);
    });

    input.addEventListener("focus", function () {
      renderSearchResults(Data.searchPlaces(input.value).slice(0, 6));
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var hits = Data.searchPlaces(input.value);
      if (hits.length) goToPlace(hits[0]);
    });

    document.addEventListener("click", function (e) {
      var formEl = $("sheds-search-form");
      if (formEl && !formEl.contains(e.target)) {
        var box = $("sheds-search-results");
        if (box) box.hidden = true;
      }
    });
  }

  function bindOffline() {
    function sync() {
      var offline = !navigator.onLine;
      var el = $("sheds-offline");
      if (el) el.hidden = !offline;
      if (offline) {
        try {
          var raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            var parsed = JSON.parse(raw);
            if (parsed && parsed.payload && parsed.payload.take) {
              setText("sheds-take-body", parsed.payload.take + " (cached)");
            }
          }
        } catch (err) {
          /* ignore */
        }
      }
    }
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    sync();
  }

  function bindUi() {
    var locateBtn = $("sheds-locate-btn");
    var zonesBtn = $("sheds-zones-btn");
    var predictBtn = $("sheds-predict-btn");
    var eduBtn = $("sheds-edu-btn");
    var obsBtn = $("sheds-obs-btn");
    var sheetToggle = $("sheds-sheet-toggle");
    var sheetHandle = $("sheds-sheet-handle");

    if (locateBtn) locateBtn.addEventListener("click", locate);
    if (zonesBtn) {
      zonesBtn.addEventListener("click", function () {
        setZones(!state.zonesOn);
      });
    }
    if (predictBtn) {
      predictBtn.addEventListener("click", function () {
        setPredict(!state.predictOn);
      });
    }
    if (eduBtn) {
      eduBtn.addEventListener("click", function () {
        setEducation(!state.educationMode);
      });
    }
    if (obsBtn) {
      obsBtn.addEventListener("click", function () {
        var noteEl = $("sheds-obs-note");
        addObservation(noteEl ? noteEl.value : "");
        if (noteEl) noteEl.value = "";
      });
    }
    if (sheetToggle) {
      sheetToggle.addEventListener("click", function () {
        setSheet(!state.sheetOpen);
      });
    }
    if (sheetHandle) {
      sheetHandle.addEventListener("click", function () {
        setSheet(!state.sheetOpen);
      });
    }

    ["today", "learn", "notes"].forEach(function (id) {
      var tab = $("sheds-tab-" + id);
      if (tab) {
        tab.addEventListener("click", function () {
          setPane(id);
        });
      }
    });

    var layerZones = $("sheds-layer-zones");
    var layerPredict = $("sheds-layer-predict");
    var layerObs = $("sheds-layer-obs");
    var layerRegs = $("sheds-layer-regs");
    if (layerZones) {
      layerZones.addEventListener("change", function () {
        setZones(layerZones.checked);
      });
    }
    if (layerPredict) {
      layerPredict.addEventListener("change", function () {
        setPredict(layerPredict.checked);
      });
    }
    if (layerObs) {
      layerObs.addEventListener("change", function () {
        setObsLayer(layerObs.checked);
      });
    }
    if (layerRegs) {
      layerRegs.addEventListener("change", function () {
        setRegs(layerRegs.checked);
      });
    }

    var obsAdd = $("sheds-obs-add");
    var obsClear = $("sheds-obs-clear");
    if (obsAdd) {
      obsAdd.addEventListener("click", function () {
        var noteEl = $("sheds-obs-note");
        addObservation(noteEl ? noteEl.value : "");
        if (noteEl) noteEl.value = "";
      });
    }
    if (obsClear) obsClear.addEventListener("click", clearObservations);

    var obsList = $("sheds-obs-list");
    if (obsList) {
      obsList.addEventListener("click", function (e) {
        var btn = e.target.closest(".sheds-obs-item");
        if (!btn || !map) return;
        var idx = Number(btn.getAttribute("data-idx"));
        var o = state.observations[idx];
        if (!o) return;
        map.setView([o.lat, o.lon], Math.max(map.getZoom(), 13), {
          animate: !reducedMotion
        });
      });
    }

    if (window.WaypointA11y && window.WaypointA11y.bindDialog) {
      window.WaypointA11y.bindDialog({
        dialog: $("sheds-about"),
        openBtn: $("sheds-about-btn"),
        closeBtn: $("sheds-about-close"),
        backdrop: $("sheds-about-backdrop")
      });
    }

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (map) map.invalidateSize();
        setSheet(isDesktop() ? true : state.sheetOpen);
      }, 150);
    });

    bindSearch();
  }

  function boot() {
    document.documentElement.classList.add("sheds-lock");
    loadStore();
    var level = Data.conditionLevel();
    applyRead(level);
    renderSeason();
    renderEducation();
    renderRegulations();
    initMap();
    bindUi();
    bindOffline();
    syncLayerChecks();
    setEducation(state.educationMode);
    setSheet(isDesktop());
    setPane("today");
    updateLegendState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
