/**
 * SignalTerrain SOTA V0.8 map application.
 * Leaflet is vendored locally. Does not import Shed Hunting or SignalTerrain Cyber modules.
 */
(function (global) {
  "use strict";

  var TOPO_URL =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
  var TOPO_ATTR =
    'Tiles &copy; Esri &mdash; Esri, USGS, NOAA, and the GIS User Community. ' +
    'Access features &copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">OpenStreetMap</a> contributors. ' +
    'Routes: Valhalla / OSM. Elevation: USGS 3DEP. Activation Zone: SOTA GR v1.21 + 3DEP. ' +
    'Summit records from <a href="https://www.sota.org.uk/" rel="noopener noreferrer">Summits on the Air</a>.';

  var DEFAULT_CENTER = { lat: 42.0, lng: -74.5 };
  var DEFAULT_ZOOM = 8;
  var NEARBY_LIMIT = 8;

  var state = {
    catalog: null,
    summits: [],
    filtered: [],
    selectedId: null,
    map: null,
    markersById: {},
    markerLayer: null,
    trailLayer: null,
    trailheadLayer: null,
    parkingLayer: null,
    routeLayer: null,
    activationZoneLayer: null,
    locateMarker: null,
    searchOpen: false,
    geolocation: { status: "idle", message: null },
    access: null,
    accessSeq: 0,
    selectedAccess: null,
    inspectedAccess: null,
    sheetOpen: true,
    destinationMode: "summit",
    hikeSeq: 0,
    route: null,
    elevation: null,
    summitRoute: null,
    summitElevation: null,
    azRoute: null,
    azElevation: null,
    az: null,
    azSeq: 0,
    routeAz: null,
    summitRouteAz: null,
    activationPlan: null,
    layersOn: { summits: true, trails: true, trailheads: true, parking: true, hike: true, az: true }
  };

  function $(id) {
    return global.document.getElementById(id);
  }

  function setHidden(el, hidden) {
    if (!el) return;
    if (hidden) el.setAttribute("hidden", "");
    else el.removeAttribute("hidden");
  }

  function text(value, fallback) {
    if (value == null || value === "") return fallback || "Unavailable";
    return String(value);
  }

  function formatElevation(summit) {
    var parts = [];
    if (summit.elevationM != null) parts.push(Math.round(summit.elevationM) + " m");
    if (summit.elevationFt != null) parts.push(Math.round(summit.elevationFt) + " ft");
    return parts.length ? parts.join(" · ") : "Unavailable";
  }

  function formatCoords(summit) {
    if (summit.lat == null || summit.lng == null) return "Unavailable";
    return summit.lat.toFixed(4) + ", " + summit.lng.toFixed(4);
  }

  function formatActivationCount(n) {
    if (n == null) return "Unavailable";
    return String(n);
  }

  function formatLastActivation(summit) {
    if (!summit.lastActivationDate && !summit.lastActivationCall) return "Unavailable";
    var date = summit.lastActivationDate ? String(summit.lastActivationDate).slice(0, 10) : null;
    var call = summit.lastActivationCall;
    if (date && call) return date + " · " + call;
    return date || call;
  }

  function formatMaidenhead(summit) {
    if (!summit.maidenhead) return "Unavailable";
    if (summit.maidenheadSource === "derived") return summit.maidenhead + " (derived)";
    return summit.maidenhead;
  }

  function formatAssociation(summit) {
    var bits = [];
    if (summit.associationName) bits.push(summit.associationName);
    else if (summit.associationCode) bits.push(summit.associationCode);
    return bits.length ? bits.join(" ") : "Unavailable";
  }

  function formatRegion(summit) {
    if (summit.regionName && summit.regionCode) return summit.regionName + " (" + summit.regionCode + ")";
    return summit.regionName || summit.regionCode || "Unavailable";
  }

  function announce(msg) {
    var live = $("ss-live");
    if (live) live.textContent = msg || "";
  }

  function setBanner(message, kind) {
    var el = $("ss-banner");
    if (!el) return;
    if (!message) {
      el.textContent = "";
      setHidden(el, true);
      el.removeAttribute("data-kind");
      return;
    }
    el.textContent = message;
    el.setAttribute("data-kind", kind || "info");
    setHidden(el, false);
  }

  function markerHtml(summit, selected) {
    var pts = summit.points != null ? String(summit.points) : "–";
    var name = summit.name || "Unnamed summit";
    var ref = summit.reference || "";
    var label = name + (ref ? ", " + ref : "") + (summit.points != null ? ", " + summit.points + " points" : "");
    return (
      '<button type="button" class="ss-marker' +
      (selected ? " is-selected" : "") +
      '" data-summit-id="' +
      escapeAttr(summit.id) +
      '" data-points="' +
      escapeAttr(pts) +
      '" data-hike-difficulty="" data-activation-status="" data-weather-suitability="" data-accessibility="" data-recommendation-score="" aria-label="' +
      escapeAttr(label) +
      '" aria-pressed="' +
      (selected ? "true" : "false") +
      '"><span class="ss-marker__peak" aria-hidden="true"></span><span class="ss-marker__pts">' +
      escapeHtml(pts) +
      "</span></button>"
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function makeIcon(summit, selected) {
    var L = global.L;
    return L.divIcon({
      className: "ss-marker-wrap" + (selected ? " is-selected" : ""),
      html: markerHtml(summit, selected),
      iconSize: selected ? [36, 40] : [28, 32],
      iconAnchor: selected ? [18, 38] : [14, 30],
      popupAnchor: [0, -28]
    });
  }

  function applyFilter() {
    var Model = global.SignalTerrainSotaModel;
    var q = ($("ss-search-q") && $("ss-search-q").value) || "";
    var minEl = $("ss-min-points");
    var min = minEl && minEl.value !== "" ? Number(minEl.value) : null;
    state.filtered = Model.searchSummits(state.summits, q, min);
    renderSearchResults();
    refreshMarkerVisibility();
  }

  function refreshMarkerVisibility() {
    var allowed = {};
    for (var i = 0; i < state.filtered.length; i += 1) allowed[state.filtered[i].id] = true;
    Object.keys(state.markersById).forEach(function (id) {
      var marker = state.markersById[id];
      var show = !!allowed[id];
      var onMap = state.map.hasLayer(marker);
      if (show && !onMap) marker.addTo(state.markerLayer);
      if (!show && onMap) state.markerLayer.removeLayer(marker);
    });
  }

  function renderSearchResults() {
    var list = $("ss-search-results");
    if (!list) return;
    list.innerHTML = "";
    var q = ($("ss-search-q") && $("ss-search-q").value) || "";
    var minEl = $("ss-min-points");
    var filtering = !!(q.trim() || (minEl && minEl.value !== ""));
    if (!filtering) {
      var hint = global.document.createElement("li");
      hint.className = "ss-search-hint";
      hint.textContent =
        state.summits.length +
        " summits loaded. Type a name or SOTA reference, or set a minimum points filter.";
      list.appendChild(hint);
      return;
    }
    if (!state.filtered.length) {
      var empty = global.document.createElement("li");
      empty.className = "ss-search-empty";
      empty.textContent = "No matching summits in the loaded catalogue.";
      list.appendChild(empty);
      return;
    }
    var max = Math.min(state.filtered.length, 40);
    for (var i = 0; i < max; i += 1) {
      var s = state.filtered[i];
      var li = global.document.createElement("li");
      var btn = global.document.createElement("button");
      btn.type = "button";
      btn.className = "ss-search-item";
      btn.setAttribute("data-summit-id", s.id);
      btn.innerHTML =
        '<span class="ss-search-item__name">' +
        escapeHtml(s.name || "Unnamed summit") +
        '</span><span class="ss-search-item__meta">' +
        escapeHtml((s.reference || "") + (s.points != null ? " · " + s.points + " pts" : "")) +
        "</span>";
      btn.addEventListener("click", function (ev) {
        selectSummit(ev.currentTarget.getAttribute("data-summit-id"), { pan: true, fromSearch: true });
      });
      li.appendChild(btn);
      list.appendChild(li);
    }
    if (state.filtered.length > max) {
      var more = global.document.createElement("li");
      more.className = "ss-search-hint";
      more.textContent = state.filtered.length - max + " more match the filter on the map.";
      list.appendChild(more);
    }
  }

  function setSelectedMarker(id) {
    Object.keys(state.markersById).forEach(function (mid) {
      var marker = state.markersById[mid];
      var summit = global.SignalTerrainSotaModel.findById(state.summits, mid);
      if (!summit) return;
      var selected = mid === id;
      marker.setIcon(makeIcon(summit, selected));
      marker.setZIndexOffset(selected ? 1000 : 0);
    });
  }

  function accessKey(feature) {
    if (!feature || !feature.osmType || feature.osmId == null) return "";
    return feature.osmType + "/" + feature.osmId;
  }

  function isSelectedAccess(feature) {
    return !!(state.selectedAccess && accessKey(state.selectedAccess) === accessKey(feature));
  }

  function isInspectedAccess(feature) {
    return !!(state.inspectedAccess && accessKey(state.inspectedAccess) === accessKey(feature));
  }

  function accessRole(feature) {
    if (isSelectedAccess(feature)) return "start";
    if (isInspectedAccess(feature)) return "inspect";
    return "candidate";
  }

  function accessPinHtml(kind, label, role) {
    var extra = "";
    if (role === "start") extra = " is-start";
    else if (role === "inspect") extra = " is-inspect";
    var cls =
      (kind === "trailhead" ? "ss-access-pin ss-access-pin--trailhead" : "ss-access-pin ss-access-pin--parking") +
      extra;
    var mark = kind === "trailhead" ? "" : "P";
    return (
      '<div class="' +
      cls +
      '" title="' +
      escapeAttr(label) +
      '"><span class="ss-access-pin__mark">' +
      escapeHtml(mark) +
      "</span></div>"
    );
  }

  function makeAccessIcon(kind, label, role) {
    var L = global.L;
    return L.divIcon({
      className: "ss-marker-wrap ss-access-wrap",
      html: accessPinHtml(kind, label, role),
      iconSize: [22, 22],
      iconAnchor: [11, 18]
    });
  }

  function setLayerVisible(name, on) {
    state.layersOn[name] = !!on;
    var map = state.map;
    if (!map) return;
    var layer =
      name === "summits"
        ? state.markerLayer
        : name === "trails"
          ? state.trailLayer
          : name === "trailheads"
            ? state.trailheadLayer
            : name === "parking"
              ? state.parkingLayer
              : name === "hike"
                ? state.routeLayer
                : name === "az"
                  ? state.activationZoneLayer
                : null;
    if (!layer) return;
    if (on) {
      if (!map.hasLayer(layer)) layer.addTo(map);
    } else if (map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  }

  function clearAccessLayers() {
    if (state.trailLayer) state.trailLayer.clearLayers();
    if (state.trailheadLayer) state.trailheadLayer.clearLayers();
    if (state.parkingLayer) state.parkingLayer.clearLayers();
  }

  function plotAccess(catalog) {
    var L = global.L;
    clearAccessLayers();
    if (!catalog || catalog.status === "unavailable" || catalog.status === "pending") return;
    (catalog.trails || []).forEach(function (trail) {
      if (!trail.geometry || trail.geometry.length < 2) return;
      var latlngs = trail.geometry.map(function (p) {
        return [p.lat, p.lng];
      });
      L.polyline(latlngs, {
        color: "#7fa37c",
        weight: 2,
        opacity: 0.72,
        className: "ss-trail-line",
        interactive: false
      }).addTo(state.trailLayer);
    });
    (catalog.trailheads || []).forEach(function (th) {
      if (th.lat == null || th.lng == null) return;
      var label = th.name || "Unnamed mapped trailhead";
      var role = accessRole(th);
      var marker = L.marker([th.lat, th.lng], {
        icon: makeAccessIcon("trailhead", label, role),
        title: label,
        keyboard: true,
        zIndexOffset: role === "start" ? 500 : role === "inspect" ? 420 : 200
      });
      marker.on("click", function () {
        inspectAccess(th);
      });
      marker.addTo(state.trailheadLayer);
    });
    (catalog.parking || []).forEach(function (pk) {
      if (pk.lat == null || pk.lng == null) return;
      var label = pk.name || "Unnamed mapped parking";
      var role = accessRole(pk);
      var marker = L.marker([pk.lat, pk.lng], {
        icon: makeAccessIcon("parking", label, role),
        title: label,
        keyboard: true,
        zIndexOffset: role === "start" ? 500 : role === "inspect" ? 420 : 180
      });
      marker.on("click", function () {
        inspectAccess(pk);
      });
      marker.addTo(state.parkingLayer);
    });
  }

  function renderFeatureList(features, unnamedFallback, startable) {
    var ul = global.document.createElement("ul");
    ul.className = "ss-access-list";
    var max = 8;
    var shown = features.slice(0, max);
    shown.forEach(function (f) {
      var li = global.document.createElement("li");
      var name = f.name || unnamedFallback;
      var selected = isSelectedAccess(f);
      var inspected = isInspectedAccess(f);
      if (selected) li.className = "is-start";
      else if (inspected) li.className = "is-inspect";
      var meta = [];
      if (f.distanceLabel) meta.push(f.distanceLabel);
      meta.push("OSM " + f.osmType + "/" + f.osmId);
      li.innerHTML =
        '<span class="ss-access-name">' +
        escapeHtml(name) +
        '</span><span class="ss-access-meta">' +
        escapeHtml(meta.join(" · ")) +
        "</span>";
      if (startable) {
        li.setAttribute("data-inspect-access", accessKey(f));
        li.addEventListener("click", function (ev) {
          if (ev.target && ev.target.closest && ev.target.closest("[data-start-hike]")) return;
          inspectAccess(f);
        });
        var btn = global.document.createElement("button");
        btn.type = "button";
        btn.className = "ss-start-hike";
        btn.setAttribute("data-start-hike", accessKey(f));
        btn.setAttribute("aria-pressed", selected ? "true" : "false");
        btn.textContent = selected ? "Starting here" : "Start hike here";
        btn.addEventListener("click", function (ev) {
          ev.stopPropagation();
          startHikeFromAccess(f);
        });
        li.appendChild(btn);
      }
      ul.appendChild(li);
    });
    if (features.length > max) {
      var more = global.document.createElement("li");
      more.className = "ss-access-meta";
      more.textContent = features.length - max + " more mapped in this search area.";
      ul.appendChild(more);
    }
    return ul;
  }

  function renderAccessPanel(summit, catalog) {
    var body = $("ss-access-body");
    var caveat = $("ss-access-caveat");
    if (!body) return;
    body.innerHTML = "";
    var st = catalog && catalog.status ? catalog.status : "pending";
    body.setAttribute("data-access-status", st);
    if (caveat) caveat.textContent = "";
    renderStartSection();
    if (st === "pending") {
      body.textContent = "Looking up mapped access…";
      return;
    }
    var planning = global.SignalTerrainSotaPlanning.getPlanning(summit, catalog && catalog.status ? catalog : null);
    if (st === "unavailable") {
      var fail = global.document.createElement("p");
      fail.className = "ss-note";
      fail.setAttribute("data-access-kind", "unavailable");
      fail.textContent = planning.parking.display || "OpenStreetMap data unavailable";
      if (catalog && catalog.reason) fail.textContent = catalog.reason;
      body.appendChild(fail);
      if (caveat) caveat.textContent = planning.caveat || "";
      return;
    }
    function group(title, summary, list, unnamed, startable) {
      var wrap = global.document.createElement("div");
      wrap.className = "ss-access-group";
      wrap.setAttribute("data-access-kind", summary.id);
      wrap.setAttribute("data-status", summary.status);
      var h = global.document.createElement("h4");
      h.textContent = title;
      wrap.appendChild(h);
      var count = global.document.createElement("p");
      count.className = "ss-access-count";
      count.textContent = summary.display;
      wrap.appendChild(count);
      if (summary.status === "ok" && list && list.length) {
        wrap.appendChild(renderFeatureList(list, unnamed, startable));
      }
      if (summary.id === "trails" && summary.namedHikingRoutes && summary.namedHikingRoutes.length) {
        var routes = global.document.createElement("p");
        routes.className = "ss-note";
        var names = [];
        summary.namedHikingRoutes.forEach(function (r) {
          if (r.name) names.push(r.name);
        });
        if (names.length) {
          routes.textContent = "Named hiking routes mapped nearby: " + names.slice(0, 6).join("; ") + ".";
          wrap.appendChild(routes);
        }
      }
      body.appendChild(wrap);
    }
    group("Nearby mapped paths", planning.access, planning.access.features, "Unnamed mapped path", false);
    group("Nearby mapped trailheads", planning.trailheads, planning.trailheads.features, "Unnamed mapped trailhead", true);
    group("Nearby mapped parking", planning.parking, planning.parking.features, "Unnamed mapped parking", true);
    if (caveat) caveat.textContent = planning.candidateNote || planning.caveat || "";
  }

  function currentStartFeature() {
    return state.inspectedAccess || state.selectedAccess || null;
  }

  function renderStartSection() {
    var section = $("ss-start-section");
    var body = $("ss-start-body");
    if (!section || !body) return;
    var AM = global.SignalTerrainSotaAccessModel;
    var feature = currentStartFeature();
    body.innerHTML = "";
    if (!feature) {
      setHidden(section, false);
      var idle = global.document.createElement("p");
      idle.className = "ss-note";
      idle.textContent =
        "Select a mapped parking area or trailhead to inspect it. Start hike here commits the hiking route origin.";
      body.appendChild(idle);
      return;
    }
    setHidden(section, false);
    var view = AM && AM.startInspection ? AM.startInspection(feature) : null;
    var dl = global.document.createElement("dl");
    dl.className = "ss-kv-list ss-start-kv";
    function row(k, v, extra) {
      var wrap = global.document.createElement("div");
      wrap.className = "ss-kv";
      var dt = global.document.createElement("dt");
      dt.textContent = k;
      var dd = global.document.createElement("dd");
      dd.textContent = v;
      if (extra) dd.setAttribute("data-start-field", extra);
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      dl.appendChild(wrap);
    }
    row("Name", (view && view.displayName) || "Unavailable", "name");
    row("Type", (view && view.typeLabel) || "Unavailable", "type");
    row("Coordinates", (view && view.coordsLabel) || "Unavailable", "coords");
    row("Access", (view && view.accessDisplay) || "Unavailable", "access");
    row("Fee", (view && view.feeDisplay) || "Unavailable", "fee");
    if (view && view.osmRef) row("OSM", view.osmRef, "osm");
    body.appendChild(dl);
    if (state.selectedAccess && accessKey(state.selectedAccess) !== accessKey(feature)) {
      var keep = global.document.createElement("p");
      keep.className = "ss-note";
      keep.setAttribute("data-start-keep", "true");
      var committedName =
        AM && AM.startDisplayName
          ? AM.startDisplayName(state.selectedAccess)
          : state.selectedAccess.name || "the committed start";
      keep.textContent =
        "Current hike start remains " +
        committedName +
        ". Start hike here replaces the route origin.";
      body.appendChild(keep);
    }
    var actions = global.document.createElement("div");
    actions.className = "ss-start-actions";
    var commit = global.document.createElement("button");
    commit.type = "button";
    commit.className = "ss-start-hike";
    commit.id = "ss-start-commit";
    commit.setAttribute("data-start-hike", accessKey(feature));
    commit.setAttribute("aria-pressed", isSelectedAccess(feature) ? "true" : "false");
    commit.textContent = isSelectedAccess(feature) ? "Starting here" : "Start hike here";
    commit.addEventListener("click", function () {
      startHikeFromAccess(feature);
    });
    actions.appendChild(commit);
    var copyBtn = global.document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "ss-btn ss-btn--ghost";
    copyBtn.id = "ss-start-copy";
    copyBtn.textContent = "Copy coordinates";
    copyBtn.disabled = !(view && view.hasCoordinates);
    copyBtn.addEventListener("click", function () {
      copyStartCoordinates(feature);
    });
    actions.appendChild(copyBtn);
    var mapsBtn = global.document.createElement("button");
    mapsBtn.type = "button";
    mapsBtn.className = "ss-btn ss-btn--ghost";
    mapsBtn.id = "ss-start-open-maps";
    mapsBtn.textContent = "Open in Maps";
    var mapsUrl = view && view.mapsUrl ? view.mapsUrl : AM && AM.mapsHandoffUrl ? AM.mapsHandoffUrl(feature) : null;
    if (mapsUrl) mapsBtn.setAttribute("data-maps-url", mapsUrl);
    mapsBtn.disabled = !mapsUrl;
    mapsBtn.addEventListener("click", function () {
      openMapsHandoff(feature);
    });
    actions.appendChild(mapsBtn);
    body.appendChild(actions);
    var status = global.document.createElement("p");
    status.className = "ss-note";
    status.id = "ss-start-copy-status";
    status.setAttribute("aria-live", "polite");
    body.appendChild(status);
    if (!view || !view.hasCoordinates) {
      var miss = global.document.createElement("p");
      miss.className = "ss-note";
      miss.setAttribute("data-start-coords", "unavailable");
      miss.textContent = "Coordinates unavailable for this mapped feature.";
      body.appendChild(miss);
    }
  }

  function inspectAccess(feature) {
    if (!feature) return null;
    state.inspectedAccess = feature;
    state.sheetOpen = true;
    var summit = global.SignalTerrainSotaModel.findById(state.summits, state.selectedId);
    plotAccess(state.access);
    if (summit) renderAccessPanel(summit, state.access || { status: "pending" });
    else renderStartSection();
    syncSheetVisibility();
    var AM = global.SignalTerrainSotaAccessModel;
    var label = AM && AM.startDisplayName ? AM.startDisplayName(feature) : feature.name || "mapped start";
    announce("Inspecting " + label + ". Start hike here commits the route origin.");
    return feature;
  }

  function copyStartCoordinates(feature) {
    var AM = global.SignalTerrainSotaAccessModel;
    var text = AM && AM.formatStartCoordinates ? AM.formatStartCoordinates(feature) : null;
    var statusEl = $("ss-start-copy-status");
    function note(msg) {
      if (statusEl) statusEl.textContent = msg;
      announce(msg);
    }
    if (!text) {
      note("Coordinates unavailable for this mapped feature.");
      return Promise.resolve(false);
    }
    function ok() {
      note("Coordinates copied.");
      return true;
    }
    function fail() {
      note("Copy is unavailable in this browser.");
      return false;
    }
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      return global.navigator.clipboard.writeText(text).then(ok, function () {
        return fallbackCopyText(text) ? ok() : fail();
      });
    }
    return Promise.resolve(fallbackCopyText(text) ? ok() : fail());
  }

  function openMapsHandoff(feature) {
    var AM = global.SignalTerrainSotaAccessModel;
    var url = AM && AM.mapsHandoffUrl ? AM.mapsHandoffUrl(feature) : null;
    var statusEl = $("ss-start-copy-status");
    function note(msg) {
      if (statusEl) statusEl.textContent = msg;
      announce(msg);
    }
    if (!url) {
      note("Maps handoff unavailable — this mapped feature has no coordinates.");
      return null;
    }
    try {
      if (typeof global.open === "function") {
        var opened = global.open(url, "_blank", "noopener,noreferrer");
        if (opened === null) {
          note("Maps handoff was blocked by the browser. Coordinates remain available to copy.");
        } else {
          note("Opening maps at the selected start coordinates.");
        }
      } else {
        note("Maps handoff unavailable in this browser.");
        return url;
      }
    } catch (e) {
      note("Maps handoff unavailable in this browser.");
      return null;
    }
    return url;
  }

  function maybeFocusAccess(summit, catalog) {
    if (!state.map || !summit || !isFinite(Number(summit.lat))) return;
    var pts = [[summit.lat, summit.lng]];
    function add(list) {
      (list || []).forEach(function (f) {
        if (f && isFinite(Number(f.lat)) && isFinite(Number(f.lng))) pts.push([f.lat, f.lng]);
      });
    }
    if (catalog && catalog.status === "ok") {
      add(catalog.parking);
      add(catalog.trailheads);
    }
    if (pts.length > 1) {
      state.map.fitBounds(pts, { padding: [40, 40], maxZoom: 14, animate: true });
      return;
    }
    state.map.setView([summit.lat, summit.lng], Math.max(state.map.getZoom(), 13), { animate: true });
  }

  function loadAccessForSummit(summit) {
    var Access = global.SignalTerrainSotaAccess;
    if (!Access || !summit) return Promise.resolve(null);
    var seq = (state.accessSeq += 1);
    state.access = { status: "pending", query: { summitId: summit.id } };
    renderAccessPanel(summit, state.access);
    return Access.loadAccess(summit)
      .then(function (catalog) {
        if (seq !== state.accessSeq || state.selectedId !== summit.id) return catalog;
        state.access = catalog;
        plotAccess(catalog);
        maybeFocusAccess(summit, catalog);
        renderAccessPanel(summit, catalog);
        return catalog;
      })
      .catch(function (err) {
        if (seq !== state.accessSeq || state.selectedId !== summit.id) return null;
        var failed = {
          status: "unavailable",
          reason: "OpenStreetMap data unavailable (" + String(err && err.message ? err.message : err) + ").",
          trails: [],
          trailheads: [],
          parking: [],
          namedHikingRoutes: []
        };
        state.access = failed;
        clearAccessLayers();
        renderAccessPanel(summit, failed);
        return failed;
      });
  }

  function clearHikeLayers() {
    if (state.routeLayer) state.routeLayer.clearLayers();
  }

  function plotRoute(route) {
    var L = global.L;
    clearHikeLayers();
    if (!route || route.status !== "ok" || !route.geometry || route.geometry.length < 2 || !state.map) return;
    var latlngs = route.geometry.map(function (p) {
      return [p.lat, p.lng];
    });
    L.polyline(latlngs, {
      color: "#3ec8c8",
      weight: 5,
      opacity: 0.92,
      className:
        state.destinationMode === "az" && state.azRoute && state.azRoute.status === "ok"
          ? "ss-hike-line ss-hike-line--az"
          : "ss-hike-line",
      lineJoin: "round",
      interactive: false
    }).addTo(state.routeLayer);
    if (!state.layersOn.hike) setLayerVisible("hike", false);
    plotAzEntry();
    try {
      state.map.fitBounds(latlngs, { padding: [36, 36], maxZoom: 15, animate: true });
    } catch (e) {}
  }

  function hikeState() {
    return {
      selectedAccess: state.selectedAccess,
      destinationMode: state.destinationMode,
      route: state.route,
      elevation: state.elevation,
      summitRoute: state.summitRoute,
      summitElevation: state.summitElevation,
      azRoute: state.azRoute,
      azElevation: state.azElevation,
      az: state.az,
      routeAz: state.routeAz,
      summitRouteAz: state.summitRouteAz,
      geoAz: geoAzState()
    };
  }

  function geoAzState() {
    var AzModel = global.SignalTerrainSotaAzModel;
    var geo = state.geolocation || {};
    if (!AzModel) return { status: "az-unavailable" };
    var loc = {
      status: geo.status,
      lat: state.locateMarker && state.locateMarker.getLatLng ? state.locateMarker.getLatLng().lat : geo.lat,
      lng: state.locateMarker && state.locateMarker.getLatLng ? state.locateMarker.getLatLng().lng : geo.lng
    };
    if (geo.status === "granted") {
      loc.status = "granted";
    }
    return AzModel.locationStatus(state.az, loc);
  }

  function clearAzLayers() {
    if (state.activationZoneLayer) state.activationZoneLayer.clearLayers();
  }

  function plotAz(az) {
    var L = global.L;
    clearAzLayers();
    if (!az || az.status !== "ok" || !az.latlngs || !az.latlngs.length || !state.map) return;
    L.polygon(az.latlngs, {
      color: "#e0b15a",
      weight: 2,
      fillColor: "#e0b15a",
      fillOpacity: 0.28,
      className: "ss-az-area",
      interactive: false
    }).addTo(state.activationZoneLayer);
    if (!state.layersOn.az) setLayerVisible("az", false);
    plotAzEntry();
  }

  function plotAzEntry() {
    var L = global.L;
    var entry = null;
    if (state.destinationMode === "az" && state.azRoute && state.azRoute.status === "ok" && state.azRoute.entry) {
      entry = state.azRoute.entry;
    } else if (state.routeAz && state.routeAz.entry) {
      entry = state.routeAz.entry;
    }
    if (!state.activationZoneLayer || !entry) return;
    var e = entry;
    var marker = L.circleMarker([e.lat, e.lng], {
      radius: 7,
      color: "#0c1210",
      weight: 1,
      fillColor: "#e0b15a",
      fillOpacity: 1,
      className: "ss-az-entry"
    });
    var label = L.marker([e.lat, e.lng], {
      icon: L.divIcon({
        className: "ss-az-entry-wrap",
        html: '<span class="ss-az-entry-label">AZ ENTRY</span>',
        iconSize: [72, 16],
        iconAnchor: [36, -8]
      }),
      interactive: false,
      keyboard: false
    });
    var Geo = global.SignalTerrainSotaGeo;
    var dist =
      e.distanceKm != null && Geo
        ? Geo.formatRouteDistance(e.distanceKm)
        : state.azRoute && state.azRoute.distanceLabel
          ? state.azRoute.distanceLabel
          : "Unavailable";
    var remainSrc = state.summitRouteAz || state.routeAz;
    var remain =
      remainSrc && remainSrc.remainingToSummitKm != null && Geo
        ? Geo.formatRouteDistance(remainSrc.remainingToSummitKm)
        : "Unavailable";
    var elev =
      e.elevationM != null && Geo && Geo.formatElevationM ? Geo.formatElevationM(e.elevationM) : "Unavailable";
    var inside = e.onOrInsideAz === false ? "Outside AZ (invalid)" : "Inside or on AZ boundary";
    marker.bindTooltip(
      "AZ ENTRY<br>From start: " +
        dist +
        "<br>Elevation: " +
        elev +
        "<br>" +
        inside +
        "<br>Remaining toward summit coordinate (along Route-to-Summit): " +
        remain +
        "<br>Not a requirement to stop. Not an activation point.",
      { sticky: true }
    );
    marker.addTo(state.activationZoneLayer);
    label.addTo(state.activationZoneLayer);
  }

  function updateRouteAz() {
    var AzModel = global.SignalTerrainSotaAzModel;
    if (!AzModel) {
      state.routeAz = null;
      state.summitRouteAz = null;
      return;
    }
    state.summitRouteAz = state.summitRoute ? AzModel.relateRoute(state.az, state.summitRoute) : null;
    var displayed =
      state.destinationMode === "az" && state.azRoute && state.azRoute.status === "ok" && state.azRoute.route
        ? state.azRoute.route
        : state.route;
    state.routeAz = AzModel.relateRoute(state.az, displayed);
    AzModel.attachEntryElevation(state.routeAz, state.elevation);
    if (state.summitRouteAz) AzModel.attachEntryElevation(state.summitRouteAz, state.summitElevation || state.elevation);
    plotAz(state.az);
    renderHikePanel();
    renderAzPanel();
    renderReadiness();
  }

  function loadAzForSummit(summit) {
    var Az = global.SignalTerrainSotaAz;
    var seq = (state.azSeq += 1);
    if (!summit) {
      state.az = null;
      state.routeAz = null;
      clearAzLayers();
      renderAzPanel();
      renderReadiness();
      return Promise.resolve(null);
    }
    state.az = { status: "pending" };
    renderAzPanel();
    renderReadiness();
    if (!Az) {
      state.az = global.SignalTerrainSotaAzModel.emptyAz({}, "unavailable", "Activation Zone provider missing.");
      renderAzPanel();
      return Promise.resolve(state.az);
    }
    return Az.loadActivationZone(summit)
      .then(function (az) {
        if (seq !== state.azSeq || state.selectedId !== summit.id) return az;
        state.az = az;
        plotAz(az);
        updateRouteAz();
        renderDetail(summit);
        if (state.destinationMode === "az" && state.selectedAccess && state.summitRoute) {
          return applyAzDestination(summit, state.selectedAccess, state.summitRoute, state.hikeSeq).then(function () {
            return az;
          });
        }
        return az;
      })
      .catch(function (err) {
        if (seq !== state.azSeq) return null;
        state.az = global.SignalTerrainSotaAzModel.emptyAz(
          { summitId: summit.id },
          "dem-unavailable",
          "Activation Zone unavailable (" + String(err && err.message ? err.message : err) + ")."
        );
        clearAzLayers();
        renderAzPanel();
        renderReadiness();
        return state.az;
      });
  }

  function renderAzPanel() {
    var body = $("ss-az-body");
    var caveat = $("ss-az-caveat");
    if (!body) return;
    body.innerHTML = "";
    var az = state.az;
    var summit = global.SignalTerrainSotaModel.findById(state.summits, state.selectedId);
    var st = az && az.status ? az.status : "idle";
    body.setAttribute("data-az-status", st);
    var status = global.document.createElement("p");
    status.className = "ss-az-status";
    status.setAttribute("data-az-kind", st);
    if (st === "pending") status.textContent = "Calculating Activation Zone…";
    else if (st === "ok") status.textContent = "Terrain-derived Activation Zone";
    else if (st === "idle" || !az) status.textContent = "Select a summit to calculate the Activation Zone.";
    else status.textContent = "Activation Zone unavailable";
    body.appendChild(status);
    if (az && az.status === "ok") {
      var dl = global.document.createElement("dl");
      dl.className = "ss-kv-list";
      function row(k, v) {
        var div = global.document.createElement("div");
        div.className = "ss-kv";
        div.innerHTML = "<dt>" + escapeHtml(k) + "</dt><dd>" + escapeHtml(v) + "</dd>";
        dl.appendChild(div);
      }
      row("Summit elevation used", az.summitElevationLabel || (az.summitElevationUsedM != null ? String(az.summitElevationUsedM) + " m" : "Unavailable"));
      row("Activation threshold", az.thresholdLabel || (az.thresholdM != null ? String(az.thresholdM) + " m" : "Unavailable"));
      row(
        "Rule",
        az.rule && az.rule.verticalDistanceM != null
          ? az.rule.verticalDistanceM + " m vertical · SOTA General Rules " + (az.rule.source && az.rule.source.version)
          : "Unavailable"
      );
      row("Terrain source", az.dem && az.dem.provider === "usgs-3dep" ? "USGS 3DEP" : az.dem && az.dem.provider ? az.dem.provider : "Unavailable");
      if (az.dem && az.dem.developmentFixture) row("DEM", "Labeled development fixture");
      row("Calculated", az.retrievedAt ? String(az.retrievedAt).replace("T", " ").slice(0, 19) + " UTC" : "Unavailable");
      if (az.elevationDiscrepancyM != null && Math.abs(az.elevationDiscrepancyM) >= 1) {
        row(
          "DEM at coordinate",
          (Math.round(az.demSummitM) + " m") +
            " (SOTA catalogue not altered; difference " +
            az.elevationDiscrepancyM.toFixed(1) +
            " m)"
        );
      }
      if (state.routeAz && state.routeAz.enters === true) {
        var Geo = global.SignalTerrainSotaGeo;
        row("Route vs AZ", "Route enters Activation Zone");
        row("Distance to AZ entry", state.routeAz.distanceToEntryKm != null && Geo ? Geo.formatRouteDistance(state.routeAz.distanceToEntryKm) : "Unavailable");
        if (state.routeAz.entry && state.routeAz.entry.elevationM != null && Geo) {
          row("Elevation at AZ entry", Geo.formatElevationM(state.routeAz.entry.elevationM));
        }
      } else if (state.routeAz && state.routeAz.enters === false) {
        row("Route vs AZ", "Calculated route does not enter Activation Zone");
      }
      var loc = geoAzState();
      row("Current location", loc.label);
      body.appendChild(dl);
    } else if (az && az.reason) {
      var p = global.document.createElement("p");
      p.className = "ss-note";
      p.textContent = az.reason;
      body.appendChild(p);
    }
    if (caveat) {
      caveat.textContent =
        (az && az.caveat) ||
        "SignalTerrain's Activation Zone is a terrain-derived planning aid. Operators remain responsible for complying with current SOTA rules and verifying their activation.";
    }
  }

  function currentActivationPlan() {
    var Plan = global.SignalTerrainSotaPlan;
    var summit = global.SignalTerrainSotaModel.findById(state.summits, state.selectedId);
    if (!Plan || !summit) return null;
    return Plan.buildPlan({
      summit: summit,
      accessCatalog: state.access && state.selectedId === summit.id ? state.access : null,
      hike: hikeState()
    });
  }

  function appendPlanRows(parent, rows, className) {
    var dl = global.document.createElement("dl");
    dl.className = className || "ss-kv-list";
    (rows || []).forEach(function (r) {
      var div = global.document.createElement("div");
      div.className = "ss-kv";
      if (r.status) div.setAttribute("data-status", r.status);
      if (r.id) div.setAttribute("data-plan-row", r.id);
      var dt = global.document.createElement("dt");
      dt.textContent = r.label;
      var dd = global.document.createElement("dd");
      dd.textContent = r.value;
      if (r.href) {
        var a = global.document.createElement("a");
        a.href = r.href;
        a.rel = "noopener noreferrer";
        a.textContent = r.value;
        dd.textContent = "";
        dd.appendChild(a);
      }
      div.appendChild(dt);
      div.appendChild(dd);
      dl.appendChild(div);
    });
    parent.appendChild(dl);
    return dl;
  }

  function copyActivationPlanText(text) {
    var value = text || "";
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      return global.navigator.clipboard.writeText(value).then(
        function () {
          announce("Activation Plan copied");
          return true;
        },
        function () {
          var ok = fallbackCopyText(value);
          if (ok) announce("Activation Plan copied");
          else announce("Copy is unavailable in this browser");
          return ok;
        }
      );
    }
    var ok = fallbackCopyText(value);
    if (ok) announce("Activation Plan copied");
    else announce("Copy is unavailable in this browser");
    return Promise.resolve(ok);
  }

  function fallbackCopyText(value) {
    try {
      var ta = global.document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      global.document.body.appendChild(ta);
      ta.select();
      var copied = global.document.execCommand("copy");
      global.document.body.removeChild(ta);
      return copied;
    } catch (e) {
      return false;
    }
  }

  function renderReadiness() {
    renderActivationPlan();
  }

  function renderActivationPlan() {
    var body = $("ss-plan-body");
    var readyBody = $("ss-ready-body");
    var summit = global.SignalTerrainSotaModel.findById(state.summits, state.selectedId);
    var Plan = global.SignalTerrainSotaPlan;
    if (body) body.innerHTML = "";
    if (readyBody) readyBody.innerHTML = "";
    if (!summit || !Plan) return;
    var plan = currentActivationPlan();
    if (!plan) return;
    state.activationPlan = plan;
    if (body) {
      body.setAttribute("data-plan-status", "ok");
      body.setAttribute("data-dest-mode", plan.hike.destinationMode);
      var loc = global.document.createElement("p");
      loc.className = "ss-plan-location";
      loc.setAttribute("data-location-status", plan.location.status);
      loc.innerHTML =
        "<span>Location</span> " + escapeHtml(plan.location.label);
      body.appendChild(loc);

      var snap = global.document.createElement("div");
      snap.className = "ss-plan-snapshot";
      snap.setAttribute("data-plan-snapshot", "true");
      var head = global.document.createElement("p");
      head.className = "ss-plan-snapshot__headline";
      head.textContent = plan.snapshot.headline;
      snap.appendChild(head);
      appendPlanRows(snap, plan.snapshot.rows, "ss-hike-kv");
      body.appendChild(snap);

      var actions = global.document.createElement("div");
      actions.className = "ss-plan-actions";
      var copyBtn = global.document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "ss-btn";
      copyBtn.id = "ss-plan-copy";
      copyBtn.textContent = "Copy Plan";
      copyBtn.addEventListener("click", function () {
        copyActivationPlanText((currentActivationPlan() || plan).copyText);
      });
      actions.appendChild(copyBtn);
      body.appendChild(actions);

      var summitSec = global.document.createElement("div");
      summitSec.className = "ss-plan-section";
      summitSec.setAttribute("data-plan-section", "summit");
      var sh = global.document.createElement("h4");
      sh.textContent = "Summit";
      summitSec.appendChild(sh);
      appendPlanRows(summitSec, [
        { id: "name", label: "Name", value: plan.summit.name || "Unavailable" },
        { id: "ref", label: "SOTA reference", value: plan.summit.reference || "Unavailable" },
        { id: "points", label: "SOTA points", value: plan.summit.points != null ? String(plan.summit.points) : "Unavailable" },
        { id: "elev", label: "Elevation", value: plan.summit.elevationLabel },
        { id: "grid", label: "Grid", value: plan.summit.maidenheadLabel || "Unavailable" },
        { id: "coords", label: "Coordinates", value: plan.summit.coordsLabel }
      ]);
      body.appendChild(summitSec);

      var accessSec = global.document.createElement("div");
      accessSec.className = "ss-plan-section";
      accessSec.setAttribute("data-plan-section", "access");
      var ah = global.document.createElement("h4");
      ah.textContent = "Access";
      accessSec.appendChild(ah);
      var accessRows = [
        {
          id: "start",
          label: "Selected start",
          value: plan.access.selected ? plan.access.selected.name : "Not selected",
          status: plan.access.status.toLowerCase()
        },
        {
          id: "type",
          label: "Feature type",
          value: plan.access.selected ? plan.access.selected.typeLabel : "Unavailable"
        },
        {
          id: "coords",
          label: "Start coordinates",
          value: plan.access.selected ? plan.access.selected.coordsLabel : "Unavailable"
        },
        {
          id: "straight",
          label: "Straight-line distance to summit",
          value: plan.access.selected && plan.access.selected.straightLineLabel
            ? plan.access.selected.straightLineLabel
            : "Unavailable"
        },
        {
          id: "osm",
          label: "OSM provenance",
          value: plan.access.provenance || "Unavailable",
          href: plan.access.selected && plan.access.selected.provenanceUrl
        },
        { id: "catalog", label: "Access data", value: plan.access.catalogDisplay }
      ];
      appendPlanRows(accessSec, accessRows);
      var caveat = global.document.createElement("p");
      caveat.className = "ss-note ss-note--caveat";
      caveat.textContent = plan.access.caveat;
      accessSec.appendChild(caveat);
      body.appendChild(accessSec);

      var hikeSec = global.document.createElement("div");
      hikeSec.className = "ss-plan-section";
      hikeSec.setAttribute("data-plan-section", "hike");
      var hh = global.document.createElement("h4");
      hh.textContent = "Hike";
      hikeSec.appendChild(hh);
      appendPlanRows(hikeSec, [
        { id: "dest", label: "Destination", value: plan.hike.destinationLabel, status: plan.hike.destinationMode },
        { id: "dist", label: "Route distance", value: plan.hike.distanceLabel },
        { id: "gain", label: "Elevation gain", value: plan.hike.gainLabel },
        { id: "loss", label: "Elevation loss", value: plan.hike.lossLabel },
        { id: "time", label: "Estimated duration", value: plan.hike.durationLabel },
        { id: "rsrc", label: "Route source", value: plan.hike.routeSource },
        { id: "esrc", label: "Elevation source", value: plan.hike.elevationSource }
      ]);
      body.appendChild(hikeSec);

      var azSec = global.document.createElement("div");
      azSec.className = "ss-plan-section";
      azSec.setAttribute("data-plan-section", "az");
      var zh = global.document.createElement("h4");
      zh.textContent = "Activation Zone";
      azSec.appendChild(zh);
      var entersLabel = "Unknown";
      if (plan.activationZone.routeEnters === true) entersLabel = "Selected route enters Activation Zone";
      else if (plan.activationZone.routeEnters === false) entersLabel = "Selected route does not enter Activation Zone";
      else if (plan.activationZone.status === "UNAVAILABLE") entersLabel = "Unavailable";
      appendPlanRows(azSec, [
        { id: "az-avail", label: "Zone", value: plan.activationZone.available ? "Terrain-derived contour" : "Unavailable" },
        { id: "az-summit", label: "Summit elevation", value: plan.activationZone.summitElevationLabel },
        { id: "az-vd", label: "Vertical threshold", value: plan.activationZone.verticalDistanceM != null ? plan.activationZone.verticalDistanceM + " m" : "Unavailable" },
        { id: "az-th", label: "Activation elevation", value: plan.activationZone.thresholdLabel },
        { id: "az-src", label: "Terrain source", value: plan.activationZone.terrainSource },
        { id: "az-enter", label: "Route vs AZ", value: entersLabel },
        { id: "az-dist", label: "Distance to AZ entry", value: plan.activationZone.distanceToEntryLabel },
        { id: "az-gps", label: "Current GPS", value: plan.location.label }
      ]);
      body.appendChild(azSec);

      var verify = global.document.createElement("div");
      verify.className = "ss-plan-verify";
      verify.setAttribute("data-plan-verify", "true");
      var vh = global.document.createElement("h4");
      vh.textContent = "Verify before you go";
      verify.appendChild(vh);
      var ul = global.document.createElement("ul");
      ul.className = "ss-plan-verify__list";
      (plan.unresolved || []).forEach(function (item) {
        var li = global.document.createElement("li");
        li.setAttribute("data-unresolved", item.id);
        li.textContent = item.text;
        ul.appendChild(li);
      });
      verify.appendChild(ul);
      body.appendChild(verify);

      var checkWrap = global.document.createElement("div");
      checkWrap.className = "ss-plan-checklist";
      checkWrap.setAttribute("data-plan-checklist", "true");
      var ch = global.document.createElement("h4");
      ch.textContent = plan.checklist.label;
      checkWrap.appendChild(ch);
      var note = global.document.createElement("p");
      note.className = "ss-note";
      note.textContent = plan.checklist.note;
      checkWrap.appendChild(note);
      var list = global.document.createElement("ul");
      list.className = "ss-plan-checklist__list";
      plan.checklist.items.forEach(function (item) {
        var li = global.document.createElement("li");
        var lab = global.document.createElement("label");
        lab.className = "ss-check";
        var cb = global.document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !!item.checked;
        cb.setAttribute("data-check-id", item.id);
        cb.addEventListener("change", function () {
          Plan.setChecked(plan.checklist.summitId, item.id, cb.checked);
          renderActivationPlan();
        });
        var span = global.document.createElement("span");
        span.textContent = item.label;
        lab.appendChild(cb);
        lab.appendChild(span);
        li.appendChild(lab);
        list.appendChild(li);
      });
      checkWrap.appendChild(list);
      var reset = global.document.createElement("button");
      reset.type = "button";
      reset.className = "ss-btn ss-btn--ghost";
      reset.id = "ss-plan-reset";
      reset.textContent = "Reset checklist";
      reset.addEventListener("click", function () {
        Plan.resetChecklist(plan.checklist.summitId);
        renderActivationPlan();
        announce("Personal field checklist reset");
      });
      checkWrap.appendChild(reset);
      body.appendChild(checkWrap);

      var aid = global.document.createElement("p");
      aid.className = "ss-note ss-note--caveat";
      aid.setAttribute("data-plan-aid", "true");
      aid.textContent = plan.plannerAid;
      body.appendChild(aid);
    }
    if (readyBody) {
      var readyList = global.document.createElement("ul");
      readyList.className = "ss-ready-states";
      (plan.fieldReadiness || []).forEach(function (row) {
        var li = global.document.createElement("li");
        li.className = "ss-ready-state";
        li.setAttribute("data-ready-area", row.id);
        li.setAttribute("data-ready-state", row.state);
        li.innerHTML =
          "<span class=\"ss-ready-state__area\">" +
          escapeHtml(row.area) +
          "</span><span class=\"ss-ready-state__value\">" +
          escapeHtml(row.label) +
          "</span>";
        readyList.appendChild(li);
      });
      readyBody.appendChild(readyList);
      var readyNote = global.document.createElement("p");
      readyNote.className = "ss-note";
      readyNote.textContent = "Not a score and not a valid-activation claim.";
      readyBody.appendChild(readyNote);
    }
  }

  function renderProfileSvg(elev) {
    var pts = (elev && elev.points) || [];
    if (pts.length < 2) return "";
    var w = 280;
    var h = 88;
    var padL = 8;
    var padR = 8;
    var padT = 10;
    var padB = 16;
    var maxD = pts[pts.length - 1].distanceKm || 1;
    var elevs = pts.map(function (p) {
      return p.elevSmoothM != null ? p.elevSmoothM : p.elevM;
    });
    var minE = Math.min.apply(null, elevs);
    var maxE = Math.max.apply(null, elevs);
    var span = maxE - minE || 1;
    var d = "";
    for (var i = 0; i < pts.length; i += 1) {
      var x = padL + (pts[i].distanceKm / maxD) * (w - padL - padR);
      var y = padT + (1 - (elevs[i] - minE) / span) * (h - padT - padB);
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
    }
    var Geo = global.SignalTerrainSotaGeo;
    return (
      '<svg class="ss-profile" id="ss-hike-profile" viewBox="0 0 ' +
      w +
      " " +
      h +
      '" role="img" aria-label="Elevation profile along the calculated route"><path fill="none" stroke="#3ec8c8" stroke-width="2" d="' +
      d +
      '"></path><text class="ss-profile-axis" x="' +
      padL +
      '" y="' +
      (h - 4) +
      '">0</text><text class="ss-profile-axis" x="' +
      (w - padR - 36) +
      '" y="' +
      (h - 4) +
      '">' +
      escapeHtml(elev.points[elev.points.length - 1].distanceKm.toFixed(1) + " km") +
      "</text></svg>"
    );
  }

  function azRouteStatusText(azr) {
    var st = azr && azr.status;
    if (st === "ok") return "Route to AZ found";
    if (st === "pending") return "Calculating route to Activation Zone…";
    if (st === "az-unavailable") return "Activation Zone unavailable";
    if (st === "no-candidate") return "No valid AZ routing candidate found";
    if (st === "unavailable" || st === "timeout") return "Routing service unavailable";
    if (st === "no-route") return "Route provider returned no route";
    if (st === "all-candidates-failed") return "All candidate routes failed validation";
    if (st === "generation-failed") return "Candidate generation failed";
    if (st === "invalid-start") return "Select a mapped parking area or trailhead to start the hike.";
    return "Route to Activation Zone unavailable";
  }

  function appendDestMode(body) {
    var group = global.document.createElement("div");
    group.className = "ss-dest-mode";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Route destination");
    var lab = global.document.createElement("span");
    lab.className = "ss-dest-mode__label";
    lab.textContent = "Route to";
    group.appendChild(lab);
    function btn(mode, text) {
      var b = global.document.createElement("button");
      b.type = "button";
      b.className = "ss-dest-mode__btn";
      b.setAttribute("data-dest-mode", mode);
      b.setAttribute("aria-pressed", state.destinationMode === mode ? "true" : "false");
      b.textContent = text;
      b.addEventListener("click", function () {
        setDestinationMode(mode);
      });
      group.appendChild(b);
    }
    btn("summit", "Summit");
    btn("az", "Activation Zone");
    body.appendChild(group);
  }

  function appendComparison(body) {
    var s = state.summitRoute;
    var a = state.azRoute;
    if (!s || s.status !== "ok" || !a || a.status !== "ok") return;
    var se = state.summitElevation;
    var ae = state.azElevation;
    var Geo = global.SignalTerrainSotaGeo;
    var wrap = global.document.createElement("div");
    wrap.className = "ss-route-compare";
    wrap.setAttribute("data-route-compare", "true");
    var h = global.document.createElement("p");
    h.className = "ss-route-compare__title";
    h.textContent = "Route comparison";
    wrap.appendChild(h);
    var dl = global.document.createElement("dl");
    dl.className = "ss-hike-kv";
    function row(k, v) {
      var div = global.document.createElement("div");
      div.innerHTML = "<dt>" + escapeHtml(k) + "</dt><dd>" + escapeHtml(v) + "</dd>";
      dl.appendChild(div);
    }
    row(
      "Route to Summit",
      (s.distanceLabel || "Unavailable") +
        (se && (se.status === "ok" || se.status === "partial") && se.gainLabel ? " · " + se.gainLabel + " gain" : "") +
        (s.durationLabel ? " · " + s.durationLabel : "")
    );
    row(
      "Route to Activation Zone",
      (a.distanceLabel || a.route && a.route.distanceLabel || "Unavailable") +
        (ae && (ae.status === "ok" || ae.status === "partial") && ae.gainLabel ? " · " + ae.gainLabel + " gain" : "") +
        (a.durationLabel ? " · " + a.durationLabel : "")
    );
    if (s.distanceKm != null && a.distanceKm != null && s.distanceKm > a.distanceKm + 0.0005 && Geo) {
      row("AZ route saves", Geo.formatRouteDistance(s.distanceKm - a.distanceKm));
    }
    if (
      se &&
      ae &&
      (se.status === "ok" || se.status === "partial") &&
      (ae.status === "ok" || ae.status === "partial") &&
      se.gainM != null &&
      ae.gainM != null &&
      se.gainM > ae.gainM + 0.5 &&
      Geo &&
      Geo.formatElevationM
    ) {
      row("AZ climbing saves", Geo.formatElevationM(se.gainM - ae.gainM));
    }
    wrap.appendChild(dl);
    var note = global.document.createElement("p");
    note.className = "ss-note";
    note.textContent = "Comparison of the two calculated routes from this start. Not a recommendation.";
    wrap.appendChild(note);
    body.appendChild(wrap);
  }

  function renderHikePanel() {
    var body = $("ss-hike-body");
    var caveat = $("ss-hike-caveat");
    if (!body) return;
    body.innerHTML = "";
    var summit = global.SignalTerrainSotaModel.findById(state.summits, state.selectedId);
    var planning = global.SignalTerrainSotaPlanning.getPlanning(
      summit,
      state.access && state.selectedId === (summit && summit.id) ? state.access : null,
      hikeState()
    );
    var dest = state.destinationMode === "az" ? "az" : "summit";
    var azMode = dest === "az";
    var azr = state.azRoute;
    var route = azMode && azr && azr.status === "ok" && azr.route ? azr.route : state.route;
    var elev = azMode && azr && azr.status === "ok" ? state.azElevation || state.elevation : state.elevation;
    var start = state.selectedAccess;
    var st;
    if (azMode) {
      st = azr && azr.status ? azr.status : start ? (state.summitRoute && state.summitRoute.status === "pending" ? "pending" : "pending") : "idle";
    } else {
      st = route && route.status ? route.status : start ? "pending" : "idle";
    }
    body.setAttribute("data-hike-status", st);
    body.setAttribute("data-dest-mode", dest);
    if (caveat) caveat.textContent = "";
    appendDestMode(body);
    if (!start) {
      var idle = global.document.createElement("p");
      idle.className = "ss-note";
      idle.textContent = "No start selected. Use Start hike here on a mapped parking area or trailhead.";
      body.appendChild(idle);
      if (caveat) {
        caveat.textContent =
          "Mapped access is from OpenStreetMap. Destination mode chooses Route to Summit or Route to Activation Zone. SignalTerrain does not pick a best start or an activation point.";
      }
      return;
    }
    var status = global.document.createElement("p");
    status.className = "ss-hike-status";
    status.setAttribute("data-hike-kind", st);
    if (azMode) status.textContent = azRouteStatusText(azr || { status: st });
    else if (st === "pending") status.textContent = "Calculating pedestrian route…";
    else if (st === "ok") status.textContent = "Pedestrian route calculated";
    else if (st === "no-route") status.textContent = "No pedestrian/hiking route found";
    else if (st === "timeout") status.textContent = "Routing request timed out";
    else status.textContent = "Hiking route unavailable";
    body.appendChild(status);
    var dl = global.document.createElement("dl");
    dl.className = "ss-hike-kv";
    function row(k, v) {
      var wrap = global.document.createElement("div");
      wrap.innerHTML = "<dt>" + escapeHtml(k) + "</dt><dd>" + escapeHtml(v) + "</dd>";
      dl.appendChild(wrap);
    }
    var startName = start.name || (start.kind === "trailhead" ? "Unnamed mapped trailhead" : "Unnamed mapped parking");
    row("Start", startName);
    row("Destination", azMode ? "Activation Zone" : (summit && summit.name ? summit.name : "Summit") + " summit vicinity");
    var showAzOk = azMode && azr && azr.status === "ok" && route && route.status === "ok";
    var showSummitOk = !azMode && route && route.status === "ok";
    if (showAzOk || showSummitOk) {
      row("Route distance", route.distanceLabel || "Unavailable");
      if (elev && (elev.status === "ok" || elev.status === "partial")) {
        row("Elevation gain", elev.gainLabel || "Unavailable");
        row("Elevation loss", elev.lossLabel || "Unavailable");
      } else if (elev && elev.status === "pending") {
        row("Elevation gain", "Sampling USGS 3DEP…");
      } else {
        row("Elevation gain", "Unavailable");
        row("Elevation loss", "Unavailable");
      }
      row("Estimated time", (azMode ? azr.durationLabel : null) || route.durationLabel || planning.items.estimatedHikingTime.display);
      if (azMode && azr.entry) {
        row("AZ entry", azr.entry.lat.toFixed(5) + ", " + azr.entry.lng.toFixed(5));
        row("Selection", azr.selectionLabel || "Selected routed AZ entry");
      }
      row("Route source", route.source && route.source.developmentFixture ? "Valhalla (labeled development fixture)" : "Valhalla");
      row(
        "Terrain source",
        elev && (elev.status === "ok" || elev.status === "partial")
          ? elev.source && elev.source.developmentFixture
            ? "USGS 3DEP (labeled development fixture)"
            : "USGS 3DEP"
          : "Unavailable"
      );
      body.appendChild(dl);
      if (elev && (elev.status === "ok" || elev.status === "partial") && elev.points && elev.points.length > 1) {
        var wrap = global.document.createElement("div");
        wrap.innerHTML = renderProfileSvg(elev);
        body.appendChild(wrap.firstChild);
      } else if (route.status === "ok" && elev && elev.status !== "pending") {
        var miss = global.document.createElement("p");
        miss.className = "ss-note";
        miss.setAttribute("data-elev-status", elev.status || "unavailable");
        miss.textContent = elev.reason || "Elevation data unavailable. The calculated route is still shown.";
        body.appendChild(miss);
      }
      appendComparison(body);
    } else {
      row("Route distance", "Unavailable");
      body.appendChild(dl);
      var fail = global.document.createElement("p");
      fail.className = "ss-note";
      fail.setAttribute("data-az-route-fail", azMode ? (azr && azr.status) || "unavailable" : "");
      if (azMode) {
        fail.textContent =
          (azr && azr.reason) ||
          "Route to Activation Zone was not found. The Route-to-Summit result and Activation Zone are unchanged. Straight-line and nearest-polygon substitutes are not used.";
      } else {
        fail.textContent = (route && route.reason) || "Routing did not return a hike. Straight-line distance is not used as a substitute.";
      }
      body.appendChild(fail);
      if (azMode && state.summitRoute && state.summitRoute.status === "ok") {
        appendComparison(body);
      }
    }
    if (caveat) {
      caveat.textContent = azMode
        ? "Route to Activation Zone identifies a legitimate routed entry into the calculated Activation Zone. It does not identify a globally optimal or recommended operating location."
        : "Mapped access is from OpenStreetMap. The hike is a Valhalla pedestrian route toward the summit coordinate, not a recommended trail and not an activation-zone path.";
    }
  }

  function applyAzDestination(summit, feature, summitRoute, seq) {
    var AzRoute = global.SignalTerrainSotaAzRoute;
    var Terrain = global.SignalTerrainSotaTerrain;
    var M = global.SignalTerrainSotaAzRouteModel;
    if (!AzRoute || !M) {
      state.azRoute = M
        ? M.emptyResult({ summitId: summit.id, access: feature }, "generation-failed", "Route-to-AZ provider missing.")
        : { status: "generation-failed", reason: "Route-to-AZ provider missing." };
      state.route = summitRoute;
      state.elevation = state.summitElevation;
      if (summitRoute && summitRoute.status === "ok") plotRoute(summitRoute);
      renderHikePanel();
      updateRouteAz();
      return Promise.resolve(state.azRoute);
    }
    state.azRoute = { status: "pending" };
    renderHikePanel();
    return AzRoute.loadAzRoute(summit, feature, { summitRoute: summitRoute, az: state.az }).then(function (azr) {
      if (seq !== state.hikeSeq || state.selectedId !== summit.id) return azr;
      state.azRoute = azr;
      if (azr && azr.status === "ok" && azr.route) {
        state.route = azr.route;
        plotRoute(azr.route);
        if (!Terrain) {
          state.azElevation = global.SignalTerrainSotaTerrainModel
            ? global.SignalTerrainSotaTerrainModel.emptyProfile({}, "unavailable", "Elevation needs a calculated route.")
            : { status: "unavailable" };
          state.elevation = state.azElevation;
          renderHikePanel();
          updateRouteAz();
          return azr;
        }
        return Terrain.loadElevation(azr.route)
          .then(function (elev) {
            if (seq !== state.hikeSeq) return azr;
            state.azElevation = elev;
            state.elevation = elev;
            renderHikePanel();
            updateRouteAz();
            return azr;
          })
          .catch(function () {
            if (seq !== state.hikeSeq) return azr;
            state.azElevation = global.SignalTerrainSotaTerrainModel.emptyProfile(
              {},
              "unavailable",
              "Elevation data unavailable. The calculated AZ route is still shown."
            );
            state.elevation = state.azElevation;
            renderHikePanel();
            updateRouteAz();
            return azr;
          });
      }
      state.route = summitRoute;
      state.elevation = state.summitElevation;
      if (summitRoute && summitRoute.status === "ok") plotRoute(summitRoute);
      else clearHikeLayers();
      renderHikePanel();
      updateRouteAz();
      return azr;
    });
  }

  function setDestinationMode(mode) {
    var next = mode === "az" ? "az" : "summit";
    if (state.destinationMode === next && !(next === "az" && state.selectedAccess && !state.azRoute)) {
      renderHikePanel();
      return Promise.resolve(state.route);
    }
    state.destinationMode = next;
    if (state.selectedAccess) return startHikeFromAccess(state.selectedAccess);
    renderHikePanel();
    return Promise.resolve(null);
  }

  function startHikeFromAccess(feature) {
    var summit = global.SignalTerrainSotaModel.findById(state.summits, state.selectedId);
    if (!summit || !feature) return Promise.resolve(null);
    var Route = global.SignalTerrainSotaRoute;
    var Terrain = global.SignalTerrainSotaTerrain;
    state.inspectedAccess = feature;
    state.selectedAccess = feature;
    state.sheetOpen = true;
    var seq = (state.hikeSeq += 1);
    state.summitRoute = { status: "pending" };
    state.azRoute = state.destinationMode === "az" ? { status: "pending" } : null;
    state.azElevation = null;
    state.summitElevation = { status: "pending" };
    state.route = { status: "pending" };
    state.elevation = { status: "pending" };
    renderAccessPanel(summit, state.access);
    renderHikePanel();
    plotAccess(state.access);
    if (!Route) {
      state.route = global.SignalTerrainSotaRouteModel.emptyRoute({}, "unavailable", "Routing provider missing.");
      state.summitRoute = state.route;
      renderHikePanel();
      return Promise.resolve(state.route);
    }
    return Route.loadRoute(summit, feature)
      .then(function (route) {
        if (seq !== state.hikeSeq || state.selectedId !== summit.id) return route;
        state.summitRoute = route;
        if (state.destinationMode !== "az") {
          state.route = route;
          plotRoute(route);
        }
        renderHikePanel();
        updateRouteAz();
        var elevP;
        if (route.status !== "ok" || !Terrain) {
          state.summitElevation = global.SignalTerrainSotaTerrainModel
            ? global.SignalTerrainSotaTerrainModel.emptyProfile({}, "unavailable", "Elevation needs a calculated route.")
            : { status: "unavailable" };
          if (state.destinationMode !== "az") state.elevation = state.summitElevation;
          elevP = Promise.resolve(state.summitElevation);
        } else {
          elevP = Terrain.loadElevation(route)
            .then(function (elev) {
              if (seq !== state.hikeSeq || state.selectedId !== summit.id) return elev;
              state.summitElevation = elev;
              if (state.destinationMode !== "az") state.elevation = elev;
              renderHikePanel();
              updateRouteAz();
              return elev;
            })
            .catch(function () {
              if (seq !== state.hikeSeq) return null;
              state.summitElevation = global.SignalTerrainSotaTerrainModel.emptyProfile(
                {},
                "unavailable",
                "Elevation data unavailable. The calculated route is still shown."
              );
              if (state.destinationMode !== "az") state.elevation = state.summitElevation;
              renderHikePanel();
              return state.summitElevation;
            });
        }
        return elevP.then(function () {
          if (seq !== state.hikeSeq) return route;
          if (state.destinationMode === "az") return applyAzDestination(summit, feature, route, seq);
          renderHikePanel();
          return route;
        });
      })
      .catch(function (err) {
        if (seq !== state.hikeSeq) return null;
        state.route = global.SignalTerrainSotaRouteModel.emptyRoute(
          {},
          "unavailable",
          "Routing service unavailable (" + String(err && err.message ? err.message : err) + ")."
        );
        state.summitRoute = state.route;
        if (state.destinationMode === "az") {
          state.azRoute = global.SignalTerrainSotaAzRouteModel
            ? global.SignalTerrainSotaAzRouteModel.emptyResult(
                { summitId: summit.id, access: feature },
                "unavailable",
                "Routing service unavailable."
              )
            : { status: "unavailable" };
        }
        clearHikeLayers();
        renderHikePanel();
        return state.route;
      });
  }

  function renderDetail(summit) {
    var sheet = $("ss-sheet");
    if (!sheet) return;
    if (!summit) {
      syncSheetVisibility();
      return;
    }
    var nearby = global.SignalTerrainSotaGeo.nearbySummits(summit, state.summits, { limit: NEARBY_LIMIT });

    $("ss-detail-name").textContent = summit.name || "Unnamed summit";
    $("ss-detail-ref").textContent = text(summit.reference);
    $("ss-field-elevation").textContent = formatElevation(summit);
    $("ss-field-points").textContent = summit.points != null ? String(summit.points) : "Unavailable";
    $("ss-field-bonus").textContent = summit.seasonalBonus && summit.seasonalBonus.label
      ? summit.seasonalBonus.label
      : "Unavailable";
    $("ss-field-bonus").setAttribute(
      "data-status",
      summit.seasonalBonus && summit.seasonalBonus.status ? summit.seasonalBonus.status : "unavailable"
    );
    $("ss-field-coords").textContent = formatCoords(summit);
    $("ss-field-grid").textContent = formatMaidenhead(summit);
    $("ss-field-grid").setAttribute("data-source", summit.maidenheadSource || "unavailable");
    $("ss-field-activations").textContent = formatActivationCount(summit.activationCount);
    $("ss-field-last").textContent = formatLastActivation(summit);
    $("ss-field-association").textContent = formatAssociation(summit);
    $("ss-field-region").textContent = formatRegion(summit);

    var planRoot = $("ss-planning-fields");
    planRoot.innerHTML = "";
    renderAzPanel();
    renderReadiness();
    renderAccessPanel(summit, state.access && state.selectedId === summit.id ? state.access : { status: "pending" });
    renderHikePanel();

    var nearRoot = $("ss-nearby-list");
    nearRoot.innerHTML = "";
    if (!nearby.length) {
      var none = global.document.createElement("li");
      none.className = "ss-nearby-empty";
      none.textContent = "No other loaded summits with coordinates are available to compare.";
      nearRoot.appendChild(none);
    } else {
      nearby.forEach(function (row) {
        var s = row.summit;
        var li = global.document.createElement("li");
        var btn = global.document.createElement("button");
        btn.type = "button";
        btn.className = "ss-nearby-item";
        btn.setAttribute("data-summit-id", s.id);
        btn.innerHTML =
          '<span class="ss-nearby-item__name">' +
          escapeHtml(s.name || "Unnamed summit") +
          '</span><span class="ss-nearby-item__meta">' +
          escapeHtml(
            (s.reference || "") +
              (s.points != null ? " · " + s.points + " pts" : "") +
              (row.distanceLabel ? " · " + row.distanceLabel : "")
          ) +
          "</span>";
        btn.addEventListener("click", function (ev) {
          selectSummit(ev.currentTarget.getAttribute("data-summit-id"), { pan: true });
        });
        li.appendChild(btn);
        nearRoot.appendChild(li);
      });
    }

    setHidden(sheet, state.sheetOpen === false);
    sheet.setAttribute("aria-hidden", state.sheetOpen === false ? "true" : "false");
    syncSheetVisibility();
    announce("Selected " + (summit.name || summit.reference || "summit"));
  }

  function syncSheetVisibility() {
    var sheet = $("ss-sheet");
    var showBtn = $("ss-show-plan");
    if (!state.selectedId) {
      setHidden(sheet, true);
      if (sheet) sheet.setAttribute("aria-hidden", "true");
      setHidden(showBtn, true);
      return;
    }
    var hide = state.sheetOpen === false;
    setHidden(sheet, hide);
    if (sheet) sheet.setAttribute("aria-hidden", hide ? "true" : "false");
    setHidden(showBtn, !hide);
  }

  function hideSheet() {
    if (!state.selectedId) return;
    state.sheetOpen = false;
    syncSheetVisibility();
    if (state.map) {
      try {
        state.map.invalidateSize();
      } catch (e) {}
    }
    announce("Summit plan hidden. Map and planning state are unchanged.");
  }

  function showSheet() {
    if (!state.selectedId) return;
    state.sheetOpen = true;
    syncSheetVisibility();
    if (state.map) {
      try {
        state.map.invalidateSize();
      } catch (e) {}
    }
  }

  function selectSummit(id, options) {
    var opts = options || {};
    var summit = global.SignalTerrainSotaModel.findById(state.summits, id);
    if (!summit) return null;
    if (state.selectedId !== summit.id) {
      state.selectedAccess = null;
      state.inspectedAccess = null;
      state.route = null;
      state.elevation = null;
      state.summitRoute = null;
      state.summitElevation = null;
      state.azRoute = null;
      state.azElevation = null;
      state.az = null;
      state.routeAz = null;
      state.summitRouteAz = null;
      state.hikeSeq += 1;
      state.azSeq += 1;
      clearHikeLayers();
      clearAzLayers();
    }
    state.selectedId = summit.id;
    state.sheetOpen = true;
    setSelectedMarker(summit.id);
    renderDetail(summit);
    loadAccessForSummit(summit);
    loadAzForSummit(summit);
    if (opts.pan && state.map) {
      state.map.panTo([summit.lat, summit.lng], { animate: true });
    }
    if (opts.fromSearch) {
      setSearchOpen(false);
    }
    var marker = state.markersById[summit.id];
    if (marker && marker.getElement) {
      var btn = marker.getElement() && marker.getElement().querySelector(".ss-marker");
      if (btn) btn.focus();
    }
    return summit;
  }

  function clearSelection() {
    state.selectedId = null;
    state.accessSeq += 1;
    state.access = null;
    state.selectedAccess = null;
    state.inspectedAccess = null;
    state.sheetOpen = true;
    state.route = null;
    state.elevation = null;
    state.summitRoute = null;
    state.summitElevation = null;
    state.azRoute = null;
    state.azElevation = null;
    state.az = null;
    state.routeAz = null;
    state.summitRouteAz = null;
    state.hikeSeq += 1;
    state.azSeq += 1;
    setSelectedMarker(null);
    clearAccessLayers();
    clearHikeLayers();
    clearAzLayers();
    renderDetail(null);
  }

  function setSearchOpen(open) {
    state.searchOpen = !!open;
    var panel = $("ss-search-panel");
    var btn = $("ss-search-open");
    setHidden(panel, !state.searchOpen);
    if (btn) {
      btn.setAttribute("aria-expanded", state.searchOpen ? "true" : "false");
    }
    if (state.searchOpen && $("ss-search-q")) $("ss-search-q").focus();
  }

  function plotSummits() {
    var L = global.L;
    state.markersById = {};
    state.markerLayer.clearLayers();
    for (var i = 0; i < state.summits.length; i += 1) {
      (function (summit) {
        var marker = L.marker([summit.lat, summit.lng], {
          icon: makeIcon(summit, false),
          title: summit.name || summit.reference || "Summit",
          keyboard: false,
          riseOnHover: true
        });
        marker.on("click", function () {
          selectSummit(summit.id, { pan: false });
        });
        marker.addTo(state.markerLayer);
        state.markersById[summit.id] = marker;
      })(state.summits[i]);
    }
  }

  function fitToRegion() {
    var region = state.catalog && state.catalog.region;
    if (region && region.bounds && state.map) {
      state.map.fitBounds(
        [
          [region.bounds.minLat, region.bounds.minLng],
          [region.bounds.maxLat, region.bounds.maxLng]
        ],
        { padding: [28, 28], maxZoom: 10 }
      );
      return;
    }
    var center = (region && region.center) || DEFAULT_CENTER;
    state.map.setView([center.lat, center.lng], DEFAULT_ZOOM);
  }

  function locateUser() {
    if (!global.navigator || !global.navigator.geolocation) {
      state.geolocation = {
        status: "unavailable",
        message: "Geolocation is not available in this browser. The map still works without it."
      };
      setBanner(state.geolocation.message, "info");
      announce(state.geolocation.message);
      return;
    }
    state.geolocation = { status: "pending", message: "Requesting location…" };
    setBanner(state.geolocation.message, "info");
    global.navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        state.geolocation = { status: "granted", message: null };
        setBanner("", null);
        var L = global.L;
        if (state.locateMarker) state.map.removeLayer(state.locateMarker);
        state.locateMarker = L.circleMarker([lat, lng], {
          radius: 7,
          color: "#3ec8c8",
          weight: 2,
          fillColor: "#3ec8c8",
          fillOpacity: 0.85
        }).addTo(state.map);
        state.locateMarker.bindTooltip("Current location (approximate)", { permanent: false });
        state.map.setView([lat, lng], Math.max(state.map.getZoom(), 10));
        state.geolocation.lat = lat;
        state.geolocation.lng = lng;
        renderAzPanel();
        renderReadiness();
        announce("Moved map to current location");
      },
      function () {
        state.geolocation = {
          status: "denied",
          message: "Location permission is off or unavailable. Browse the map without GPS — summits still load."
        };
        setBanner(state.geolocation.message, "info");
        announce(state.geolocation.message);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  function bindUi() {
    var searchBtn = $("ss-search-open");
    if (searchBtn) {
      searchBtn.addEventListener("click", function () {
        setSearchOpen(!state.searchOpen);
      });
    }
    var searchClose = $("ss-search-close");
    if (searchClose) {
      searchClose.addEventListener("click", function () {
        setSearchOpen(false);
      });
    }
    var q = $("ss-search-q");
    if (q) q.addEventListener("input", applyFilter);
    var min = $("ss-min-points");
    if (min) min.addEventListener("change", applyFilter);
    var locate = $("ss-locate");
    if (locate) locate.addEventListener("click", locateUser);
    var layerRoot = $("ss-layers");
    if (layerRoot) {
      layerRoot.addEventListener("change", function (ev) {
        var t = ev.target;
        if (!t || !t.getAttribute) return;
        var name = t.getAttribute("data-layer");
        if (name) setLayerVisible(name, t.checked);
      });
    }
    var close = $("ss-sheet-close");
    if (close) {
      close.addEventListener("click", function () {
        hideSheet();
        var showBtn = $("ss-show-plan");
        if (showBtn) showBtn.focus();
        else close.focus();
      });
    }
    var showPlan = $("ss-show-plan");
    if (showPlan) {
      showPlan.addEventListener("click", function () {
        showSheet();
        if (close) close.focus();
      });
    }
    global.document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        if (state.searchOpen) {
          setSearchOpen(false);
          if (searchBtn) searchBtn.focus();
        } else if (state.selectedId && state.sheetOpen !== false) {
          hideSheet();
        }
      }
    });
  }

  function describeSource(catalog) {
    var src = catalog.source || {};
    var meta = catalog.meta || {};
    var count = catalog.summits.length;
    var label = src.label || "SOTA summit catalogue";
    var parts = [count + " summits · " + label];
    if (meta.liveAttempted && meta.liveError) {
      parts.push("Live SOTA request failed; using the labeled development fixture.");
    }
    if (src.developmentFixture) {
      parts.push("Development fixture of real retrieved records — not invented.");
    }
    return parts.join(" ");
  }

  function bootMap() {
    var L = global.L;
    if (!L) throw new Error("Leaflet missing");
    var mapEl = $("ss-map");
    state.map = L.map(mapEl, {
      zoomControl: true,
      attributionControl: true,
      minZoom: 5,
      maxZoom: 16,
      tap: true
    });
    L.tileLayer(TOPO_URL, {
      attribution: TOPO_ATTR,
      maxZoom: 16,
      maxNativeZoom: 16
    }).addTo(state.map);
    state.trailLayer = L.layerGroup().addTo(state.map);
    /* AZ is an AREA under trails/hike so the summit marker and cyan route stay obvious. */
    state.activationZoneLayer = L.layerGroup().addTo(state.map);
    state.trailheadLayer = L.layerGroup().addTo(state.map);
    state.parkingLayer = L.layerGroup().addTo(state.map);
    state.routeLayer = L.layerGroup().addTo(state.map);
    state.markerLayer = L.layerGroup().addTo(state.map);
    global.__SIGNALTERRAIN_SOTA_MAP__ = state.map;
    setTimeout(function () {
      state.map.invalidateSize();
    }, 80);
  }

  function start() {
    bindUi();
    bootMap();
    setBanner("Loading SOTA summit catalogue…", "info");
    return global.SignalTerrainSotaProvider.loadCatalog()
      .then(function (catalog) {
        state.catalog = catalog;
        state.summits = catalog.summits.slice();
        state.filtered = state.summits.slice();
        plotSummits();
        fitToRegion();
        applyFilter();
        var srcNote = describeSource(catalog);
        $("ss-source-note").textContent = srcNote;
        var err = catalog.meta && catalog.meta.liveError;
        if (err) {
          setBanner(
            "Live SOTA data is unavailable (" +
              err +
              "). Showing the labeled development fixture of real retrieved W2/GC records.",
            "info"
          );
        } else if (catalog.source && catalog.source.developmentFixture) {
          setBanner(
            "Showing a labeled development fixture: " +
              catalog.summits.length +
              " real SOTA summits retrieved from api2.sota.org.uk (W2/GC Greater Catskills).",
            "info"
          );
        } else {
          setBanner(srcNote, "info");
        }
        announce(catalog.summits.length + " summits on the map");
        return catalog;
      })
      .catch(function (err) {
        setBanner(
          "Summit catalogue could not be loaded. " +
            String(err && err.message ? err.message : err) +
            " The map still opens; summit markers are unavailable until data loads.",
          "error"
        );
        fitToRegion();
        return null;
      });
  }

  var api = {
    start: start,
    selectSummit: selectSummit,
    clearSelection: clearSelection,
    applyFilter: applyFilter,
    locateUser: locateUser,
    setLayerVisible: setLayerVisible,
    loadAccessForSummit: loadAccessForSummit,
    inspectAccess: inspectAccess,
    startHikeFromAccess: startHikeFromAccess,
    hideSheet: hideSheet,
    showSheet: showSheet,
    setDestinationMode: setDestinationMode,
    getActivationPlan: currentActivationPlan,
    copyActivationPlan: function () {
      var plan = currentActivationPlan();
      return copyActivationPlanText(plan ? plan.copyText : "");
    },
    copyStartCoordinates: function (feature) {
      return copyStartCoordinates(feature || currentStartFeature());
    },
    mapsHandoffForAccess: function (feature) {
      var AM = global.SignalTerrainSotaAccessModel;
      return AM && AM.mapsHandoffUrl ? AM.mapsHandoffUrl(feature || currentStartFeature()) : null;
    },
    getState: function () {
      return state;
    }
  };

  global.SignalTerrainSotaMapApp = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.MapApp = api;

  if (global.document && global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", function () {
      start();
    });
  } else if (global.document) {
    start();
  }
})(typeof window !== "undefined" ? window : globalThis);
