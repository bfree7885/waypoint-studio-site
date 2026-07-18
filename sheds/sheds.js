(function () {
  "use strict";

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
      color: "#9ec836",
      fillColor: "#c6ff4d",
      fillOpacity: 0.4,
      weight: 1.25,
      opacity: 0.75
    },
    medium: {
      color: "#9b7ed4",
      fillColor: "#9b7ed4",
      fillOpacity: 0.32,
      weight: 1,
      opacity: 0.65
    },
    low: {
      color: "#6ec8e8",
      fillColor: "#6ec8e8",
      fillOpacity: 0.18,
      weight: 1,
      opacity: 0.5
    }
  };

  /* Default center: central PA foothills — illustrative only */
  var DEFAULT_CENTER = [40.78, -77.86];
  var DEFAULT_ZOOM = 12;

  var READS = {
    favorable: {
      level: "favorable",
      label: "Favorable",
      opportunity: "South benches — demo",
      why: "Warm aspects hold sun after cold nights; soft snowline edges look promising."
    },
    fair: {
      level: "fair",
      label: "Fair",
      opportunity: "Lee-side timber — demo",
      why: "Mixed thermal cover; check transitions where bedding meets travel."
    },
    poor: {
      level: "poor",
      label: "Poor",
      opportunity: "Learn terrain first — demo",
      why: "Conditions look quiet. Use Education mode and read aspect and cover."
    }
  };

  var map = null;
  var zoneLayer = null;
  var userMarker = null;
  var state = {
    zonesOn: true,
    educationMode: false,
    sheetOpen: false,
    hasFix: false,
    locating: false,
    center: DEFAULT_CENTER.slice()
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

  function demoConditionLevel() {
    /* Lightweight seasonal demo label — not a forecast model */
    var month = new Date().getMonth(); /* 0–11 */
    if (month === 1 || month === 2 || month === 3) return "favorable";
    if (month === 0 || month === 11) return "fair";
    return "poor";
  }

  function applyRead(level) {
    var read = READS[level] || READS.fair;
    var condition = $("sheds-condition");
    if (condition) condition.setAttribute("data-level", read.level);
    setText("sheds-condition-text", read.label);
    setText("sheds-opportunity", read.opportunity);
    setText("sheds-why", read.why);
    setText("sheds-panel-condition", read.label);
    setText("sheds-panel-opportunity", read.opportunity);
    setText("sheds-panel-why", read.why);
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
      el.textContent = "Education mode — hotspot fills hidden.";
    } else if (!state.zonesOn) {
      el.textContent = "Zones off.";
    } else {
      el.textContent = "Illustrative demo overlays around your map center.";
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

  function renderZones() {
    if (!map) return;
    if (zoneLayer) {
      map.removeLayer(zoneLayer);
      zoneLayer = null;
    }

    var demoTag = $("sheds-demo-tag");
    if (demoTag) {
      demoTag.hidden = state.educationMode || !state.zonesOn;
    }

    if (!state.zonesOn || state.educationMode) {
      updateLegendState();
      return;
    }

    var zones = buildDemoZones(state.center[0], state.center[1]);
    zoneLayer = L.layerGroup();
    zones.forEach(function (z) {
      var poly = L.polygon(z.latlngs, ZONE_STYLE[z.level] || ZONE_STYLE.low);
      poly.bindTooltip(z.name, { sticky: true, opacity: 0.9 });
      zoneLayer.addLayer(poly);
    });
    zoneLayer.addTo(map);
    updateLegendState();
  }

  function setUserMarker(lat, lon) {
    var icon = L.divIcon({
      className: "",
      html: '<div class="sheds-user-marker is-pulse"></div>',
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
    renderZones();

    map.on("moveend", function () {
      var c = map.getCenter();
      state.center = [c.lat, c.lng];
      if (!state.hasFix) {
        reverseLabel(c.lat, c.lng, "Map center · " + c.lat.toFixed(3) + ", " + c.lng.toFixed(3));
      }
      if (state.zonesOn && !state.educationMode) {
        renderZones();
      }
    });

    /* Fix Leaflet sizing inside grid/absolute layouts */
    requestAnimationFrame(function () {
      map.invalidateSize();
    });
    setTimeout(function () {
      map.invalidateSize();
    }, 200);
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
        map.setView([lat, lon], Math.max(map.getZoom(), 13), { animate: true });
        setUserMarker(lat, lon);
        reverseLabel(lat, lon);
        setGpsStatus("success", "Location updated");
        renderZones();
        setTimeout(function () {
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
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  function setZones(on) {
    state.zonesOn = !!on;
    var btn = $("sheds-zones-btn");
    if (btn) btn.setAttribute("aria-pressed", state.zonesOn ? "true" : "false");
    renderZones();
  }

  function setEducation(on) {
    state.educationMode = !!on;
    var btn = $("sheds-edu-btn");
    var banner = $("sheds-edu-banner");
    if (btn) btn.setAttribute("aria-pressed", state.educationMode ? "true" : "false");
    if (banner) banner.hidden = !state.educationMode;
    if (state.educationMode) {
      setText("sheds-panel-note", "Education mode: learn aspect, cover, and travel without hotspot guidance.");
    } else {
      setText(
        "sheds-panel-note",
        "Illustrative demo only. Patterns are patterned — not guarantees."
      );
    }
    renderZones();
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

  function openAbout(open) {
    /* Kept for compatibility; Prefer WaypointA11y.bindDialog when available. */
    var about = $("sheds-about");
    var btn = $("sheds-about-btn");
    if (!about) return;
    about.hidden = !open;
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      var closeEl = $("sheds-about-close");
      if (closeEl) closeEl.focus();
    }
  }

  function bindOffline() {
    function sync() {
      var offline = !navigator.onLine;
      var el = $("sheds-offline");
      if (el) el.hidden = !offline;
    }
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    sync();
  }

  function bindUi() {
    var locateBtn = $("sheds-locate-btn");
    var zonesBtn = $("sheds-zones-btn");
    var eduBtn = $("sheds-edu-btn");
    var sheetToggle = $("sheds-sheet-toggle");
    var sheetHandle = $("sheds-sheet-handle");

    if (locateBtn) locateBtn.addEventListener("click", locate);
    if (zonesBtn) {
      zonesBtn.addEventListener("click", function () {
        setZones(!state.zonesOn);
      });
    }
    if (eduBtn) {
      eduBtn.addEventListener("click", function () {
        setEducation(!state.educationMode);
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

    if (window.WaypointA11y && window.WaypointA11y.bindDialog) {
      window.WaypointA11y.bindDialog({
        dialog: $("sheds-about"),
        openBtn: $("sheds-about-btn"),
        closeBtn: $("sheds-about-close"),
        backdrop: $("sheds-about-backdrop")
      });
    }

    window.addEventListener("resize", function () {
      if (map) map.invalidateSize();
      setSheet(isDesktop() ? true : state.sheetOpen);
    });
  }

  function boot() {
    document.documentElement.classList.add("sheds-lock");
    applyRead(demoConditionLevel());
    initMap();
    bindUi();
    bindOffline();
    setZones(true);
    setEducation(false);
    setSheet(isDesktop());
    updateLegendState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
