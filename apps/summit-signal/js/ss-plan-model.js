/**
 * SignalTerrain SOTA V0.7 Activation Plan model.
 *
 * Normalizes selected summit + access + route + AZ + GPS + checklist into a
 * field-oriented plan. Does not fetch data, invent stats, or score safety.
 * Field Readiness is information completeness, not a recommendation.
 */
(function (global) {
  "use strict";

  var PLAN_VERSION = "signalterrain-sota-plan-v0";
  var CHECKLIST_PREFIX = "signalterrain-sota-plan-v0:checklist:";
  var PLANNER_AID =
    "SignalTerrain is a planning aid. Verify current SOTA rules and access conditions before activation.";
  var FIELD_READINESS_NOTE =
    "Field Readiness represents the completeness of information available to SignalTerrain. It is not a safety score, recommendation, or statement that a SOTA activation will be valid.";
  var OSM_CAVEAT =
    "OpenStreetMap data may be incomplete. Verify access before travel.";

  var STATES = {
    KNOWN: "KNOWN",
    UNKNOWN: "UNKNOWN",
    UNAVAILABLE: "UNAVAILABLE",
    VERIFY: "VERIFY",
    NOT_INTEGRATED: "NOT_INTEGRATED"
  };

  var STATE_LABELS = {
    KNOWN: "Known",
    UNKNOWN: "Unknown",
    UNAVAILABLE: "Unavailable",
    VERIFY: "Verify",
    NOT_INTEGRATED: "Not integrated"
  };

  var DEFAULT_CHECKLIST = [
    { id: "radio", label: "Radio" },
    { id: "antenna", label: "Antenna" },
    { id: "power", label: "Power/battery" },
    { id: "logging", label: "Logging method" },
    { id: "water", label: "Water" },
    { id: "nav", label: "Navigation backup" },
    { id: "clothing", label: "Appropriate clothing" }
  ];

  var memoryStore = {};

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function geo() {
    return global.SignalTerrainSotaGeo;
  }

  function accessModel() {
    return global.SignalTerrainSotaAccessModel;
  }

  function rules() {
    return global.SignalTerrainSotaRules;
  }

  function stateLabel(code) {
    return STATE_LABELS[code] || code;
  }

  function memoryStorage() {
    return {
      getItem: function (k) {
        return Object.prototype.hasOwnProperty.call(memoryStore, k) ? memoryStore[k] : null;
      },
      setItem: function (k, v) {
        memoryStore[k] = String(v);
      },
      removeItem: function (k) {
        delete memoryStore[k];
      }
    };
  }

  function storageOf(override) {
    if (override) return override;
    try {
      if (global.localStorage) return global.localStorage;
    } catch (e) {}
    return memoryStorage();
  }

  function checklistKey(summitId) {
    return CHECKLIST_PREFIX + String(summitId || "none");
  }

  function defaultChecklistItems() {
    return DEFAULT_CHECKLIST.map(function (item) {
      return { id: item.id, label: item.label, checked: false };
    });
  }

  function loadChecklist(summitId, storage) {
    var store = storageOf(storage);
    var items = defaultChecklistItems();
    if (!summitId) {
      return { summitId: null, items: items, scoped: false };
    }
    try {
      var raw = store.getItem(checklistKey(summitId));
      if (!raw) return { summitId: summitId, items: items, scoped: true };
      var parsed = JSON.parse(raw);
      var checked = parsed && parsed.checked && typeof parsed.checked === "object" ? parsed.checked : {};
      items.forEach(function (item) {
        if (checked[item.id] === true) item.checked = true;
      });
      return { summitId: summitId, items: items, scoped: true };
    } catch (e) {
      return { summitId: summitId, items: items, scoped: true };
    }
  }

  function saveChecklist(summitId, items, storage) {
    if (!summitId) return loadChecklist(summitId, storage);
    var store = storageOf(storage);
    var checked = {};
    (items || []).forEach(function (item) {
      if (item && item.id) checked[item.id] = !!item.checked;
    });
    try {
      store.setItem(
        checklistKey(summitId),
        JSON.stringify({ v: 1, version: PLAN_VERSION, summitId: summitId, checked: checked })
      );
    } catch (e) {}
    return loadChecklist(summitId, storage);
  }

  function setChecked(summitId, itemId, checked, storage) {
    var loaded = loadChecklist(summitId, storage);
    loaded.items.forEach(function (item) {
      if (item.id === itemId) item.checked = !!checked;
    });
    return saveChecklist(summitId, loaded.items, storage);
  }

  function resetChecklist(summitId, storage) {
    var store = storageOf(storage);
    try {
      store.removeItem(checklistKey(summitId));
    } catch (e) {}
    return loadChecklist(summitId, storage);
  }

  function accessTypeLabel(feature) {
    if (!feature) return null;
    if (feature.kind === "trailhead") return "Mapped trailhead";
    if (feature.kind === "parking") return "Mapped parking candidate";
    return "Mapped access candidate";
  }

  function accessName(feature) {
    if (!feature) return null;
    var AM = accessModel();
    if (AM && AM.startDisplayName) return AM.startDisplayName(feature);
    if (feature.name) return feature.name;
    if (feature.kind === "trailhead") return "Unnamed mapped trailhead";
    return "Unnamed mapped parking";
  }

  function startCoordsLabel(feature) {
    var AM = accessModel();
    if (AM && AM.formatStartCoordinates) return AM.formatStartCoordinates(feature);
    if (!feature || !isFiniteNumber(feature.lat) || !isFiniteNumber(feature.lng)) return null;
    return feature.lat.toFixed(5) + ", " + feature.lng.toFixed(5);
  }

  function catalogStatusLabel(catalog) {
    if (!catalog) return { status: "unknown", display: "Not loaded" };
    var st = catalog.status;
    if (st === "pending") return { status: "pending", display: "Looking up mapped access…" };
    if (st === "unavailable") return { status: "unavailable", display: "OpenStreetMap data unavailable" };
    if (st === "empty") return { status: "empty", display: "No mapped parking or trailhead in this search area" };
    if (st === "ok") return { status: "ok", display: "Mapped OpenStreetMap access loaded" };
    return { status: st || "unknown", display: "Access data status unknown" };
  }

  function activeRoute(hike) {
    if (!hike) return { route: null, elevation: null, destinationMode: "summit" };
    var destAz = hike.destinationMode === "az";
    var azr = hike.azRoute;
    if (destAz && azr && azr.status === "ok" && azr.route) {
      return {
        route: azr.route,
        elevation: hike.azElevation || hike.elevation,
        durationLabel: azr.durationLabel || (azr.route && azr.route.durationLabel) || null,
        destinationMode: "az",
        azRoute: azr
      };
    }
    return {
      route: hike.route,
      elevation: hike.elevation,
      durationLabel: hike.route && hike.route.durationLabel,
      destinationMode: destAz ? "az" : "summit",
      azRoute: azr || null
    };
  }

  function summitSection(summit) {
    var Geo = geo();
    var out = {
      status: summit ? STATES.KNOWN : STATES.UNKNOWN,
      name: summit && summit.name ? summit.name : null,
      reference: summit && (summit.reference || summit.id) ? summit.reference || summit.id : null,
      points: summit && summit.points != null ? summit.points : null,
      elevationM: summit && isFiniteNumber(summit.elevationM) ? summit.elevationM : null,
      elevationFt: summit && isFiniteNumber(summit.elevationFt) ? summit.elevationFt : null,
      elevationLabel: "Unavailable",
      maidenhead: summit && summit.maidenhead ? summit.maidenhead : null,
      maidenheadSource: summit && summit.maidenheadSource ? summit.maidenheadSource : null,
      lat: summit && isFiniteNumber(summit.lat) ? summit.lat : null,
      lng: summit && isFiniteNumber(summit.lng) ? summit.lng : null,
      coordsLabel: "Unavailable"
    };
    if (!summit) {
      out.status = STATES.UNKNOWN;
      return out;
    }
    if (!out.name && !out.reference) out.status = STATES.UNAVAILABLE;
    var elevParts = [];
    if (out.elevationM != null) elevParts.push(Math.round(out.elevationM) + " m");
    if (out.elevationFt != null) elevParts.push(Math.round(out.elevationFt) + " ft");
    if (elevParts.length) out.elevationLabel = elevParts.join(" · ");
    else if (out.elevationM != null && Geo && Geo.formatElevationM) out.elevationLabel = Geo.formatElevationM(out.elevationM);
    if (out.lat != null && out.lng != null) out.coordsLabel = out.lat.toFixed(4) + ", " + out.lng.toFixed(4);
    if (out.maidenhead && out.maidenheadSource === "derived") {
      out.maidenheadLabel = out.maidenhead + " (derived)";
    } else {
      out.maidenheadLabel = out.maidenhead || "Unavailable";
    }
    return out;
  }

  function accessSection(hike, catalog) {
    var start = hike && hike.selectedAccess;
    var cat = catalogStatusLabel(catalog);
    var caveat = (accessModel() && accessModel().CAVEAT) || OSM_CAVEAT;
    var Geo = geo();
    var out = {
      status: start ? STATES.VERIFY : cat.status === "unavailable" ? STATES.UNAVAILABLE : STATES.UNKNOWN,
      selected: null,
      catalogStatus: cat.status,
      catalogDisplay: cat.display,
      caveat: caveat,
      provenance: null
    };
    if (!start) return out;
    var straight = isFiniteNumber(start.distanceKm) ? start.distanceKm : null;
    var osmRef =
      start.osmType && start.osmId != null ? String(start.osmType) + "/" + String(start.osmId) : null;
    var coordsLabel = startCoordsLabel(start);
    out.selected = {
      kind: start.kind || null,
      typeLabel: accessTypeLabel(start),
      name: accessName(start),
      mappedName: start.name || null,
      lat: isFiniteNumber(start.lat) ? start.lat : null,
      lng: isFiniteNumber(start.lng) ? start.lng : null,
      coordsLabel: coordsLabel || "Unavailable",
      straightLineKm: straight,
      straightLineLabel:
        straight != null && Geo && Geo.formatDistanceKm ? Geo.formatDistanceKm(straight) + " from summit (straight-line)" : null,
      osmType: start.osmType || null,
      osmId: start.osmId != null ? start.osmId : null,
      osmRef: osmRef,
      provenanceUrl: start.provenanceUrl || (osmRef ? "https://www.openstreetmap.org/" + osmRef : null),
      source: start.source || "openstreetmap"
    };
    out.provenance = osmRef ? "OpenStreetMap " + osmRef : "OpenStreetMap";
    return out;
  }

  function hikeSection(hike) {
    var active = activeRoute(hike);
    var destAz = !!(hike && hike.destinationMode === "az");
    var out = {
      status: STATES.UNKNOWN,
      destinationMode: destAz ? "az" : "summit",
      destinationLabel: destAz ? "Activation Zone" : "Summit",
      distanceKm: null,
      distanceLabel: "Unavailable",
      gainM: null,
      gainLabel: "Unavailable",
      lossM: null,
      lossLabel: "Unavailable",
      durationLabel: "Unavailable",
      routeSource: "Unavailable",
      elevationSource: "Unavailable"
    };
    if (!hike || (!hike.selectedAccess && !(hike.route && hike.route.status))) {
      return out;
    }
    if (destAz) {
      var azr = hike.azRoute;
      if (!azr || azr.status === "pending") {
        out.status = STATES.UNKNOWN;
        out.distanceLabel = "Calculating…";
        return out;
      }
      if (!(azr.status === "ok" && azr.route && azr.route.status === "ok")) {
        out.status = STATES.UNAVAILABLE;
        return out;
      }
    }
    var route = active.route;
    var elev = active.elevation;
    if (route && route.status === "pending") {
      out.status = STATES.UNKNOWN;
      out.distanceLabel = "Calculating…";
      return out;
    }
    if (!route || route.status !== "ok") {
      out.status = STATES.UNAVAILABLE;
      return out;
    }
    out.status = STATES.KNOWN;
    out.distanceKm = isFiniteNumber(route.distanceKm) ? route.distanceKm : null;
    out.distanceLabel = route.distanceLabel || (out.distanceKm != null ? out.distanceKm.toFixed(1) + " km" : "Unavailable");
    if (elev && (elev.status === "ok" || elev.status === "partial")) {
      out.gainM = isFiniteNumber(elev.gainM) ? elev.gainM : null;
      out.lossM = isFiniteNumber(elev.lossM) ? elev.lossM : null;
      out.gainLabel = elev.gainLabel || "Unavailable";
      out.lossLabel = elev.lossLabel || "Unavailable";
      out.elevationSource =
        elev.source && elev.source.developmentFixture ? "USGS 3DEP (labeled development fixture)" : "USGS 3DEP";
    } else if (elev && elev.status === "pending") {
      out.gainLabel = "Sampling USGS 3DEP…";
      out.elevationSource = "USGS 3DEP";
    }
    out.durationLabel = active.durationLabel || route.durationLabel || "Unavailable";
    out.routeSource =
      route.source && route.source.developmentFixture ? "Valhalla (labeled development fixture)" : "Valhalla";
    return out;
  }

  function locationSection(hike) {
    var geoAz = hike && hike.geoAz;
    var az = hike && hike.az;
    var gpsGranted = geoAz && (geoAz.status === "inside" || geoAz.status === "outside");
    var out = {
      status: STATES.UNAVAILABLE,
      gpsAvailable: false,
      inside: null,
      label: "Location unavailable"
    };
    if (gpsGranted) {
      out.gpsAvailable = true;
      out.inside = geoAz.status === "inside";
      out.status = geoAz.status === "inside" ? "inside" : "outside";
      out.label = geoAz.status === "inside" ? "Inside mapped Activation Zone" : "Outside Activation Zone";
      return out;
    }
    if (geoAz && geoAz.status === "az-unavailable") {
      out.label = "Location unavailable";
      if (az && az.status && az.status !== "ok" && az.status !== "pending") {
        out.label = "Location unavailable";
      }
      return out;
    }
    return out;
  }

  function azSection(hike) {
    var az = hike && hike.az;
    var rel = hike && hike.routeAz;
    var summitRel = hike && hike.summitRouteAz;
    var Geo = geo();
    var Rules = rules();
    var loc = locationSection(hike);
    var out = {
      status: STATES.UNKNOWN,
      available: false,
      summitElevationM: null,
      summitElevationLabel: "Unavailable",
      verticalDistanceM: null,
      thresholdM: null,
      thresholdLabel: "Unavailable",
      terrainSource: "Unavailable",
      routeEnters: null,
      distanceToEntryKm: null,
      distanceToEntryLabel: "Unavailable",
      gps: loc
    };
    if (!az || az.status === "pending") return out;
    if (az.status !== "ok") {
      out.status = STATES.UNAVAILABLE;
      out.reason = az.reason || "Activation Zone unavailable";
      return out;
    }
    out.status = STATES.KNOWN;
    out.available = true;
    out.summitElevationM = isFiniteNumber(az.summitElevationUsedM) ? az.summitElevationUsedM : null;
    out.summitElevationLabel = az.summitElevationLabel || (out.summitElevationM != null && Geo && Geo.formatElevationM ? Geo.formatElevationM(out.summitElevationM) : "Unavailable");
    out.verticalDistanceM =
      az.rule && isFiniteNumber(az.rule.verticalDistanceM)
        ? az.rule.verticalDistanceM
        : Rules && Rules.GENERAL_RULES
          ? Rules.GENERAL_RULES.defaultVerticalDistanceM
          : 25;
    out.thresholdM = isFiniteNumber(az.thresholdM) ? az.thresholdM : null;
    out.thresholdLabel = az.thresholdLabel || (out.thresholdM != null && Geo && Geo.formatElevationM ? Geo.formatElevationM(out.thresholdM) : "Unavailable");
    var dem = az.dem;
    if (dem && dem.developmentFixture) out.terrainSource = "USGS 3DEP (labeled development fixture)";
    else if (dem) out.terrainSource = "USGS 3DEP";
    else out.terrainSource = "USGS 3DEP";
    if (rel && rel.enters === true) {
      out.routeEnters = true;
      out.distanceToEntryKm = isFiniteNumber(rel.distanceToEntryKm) ? rel.distanceToEntryKm : null;
    } else if (rel && rel.enters === false) {
      out.routeEnters = false;
    }
    if (out.distanceToEntryKm == null && summitRel && summitRel.enters === true && isFiniteNumber(summitRel.distanceToEntryKm)) {
      out.distanceToEntryKm = summitRel.distanceToEntryKm;
      if (out.routeEnters == null) out.routeEnters = true;
    }
    var destAz = hike && hike.destinationMode === "az";
    var azr = hike && hike.azRoute;
    if (destAz && azr && azr.status === "ok" && isFiniteNumber(azr.distanceKm)) {
      out.distanceToEntryKm = azr.distanceKm;
      out.routeEnters = true;
    }
    if (out.distanceToEntryKm != null && Geo && Geo.formatRouteDistance) {
      out.distanceToEntryLabel = Geo.formatRouteDistance(out.distanceToEntryKm) + " from start";
    }
    return out;
  }

  function fieldReadiness(summitSt, accessSt, hikeSt, azSt) {
    function row(id, area, state) {
      return { id: id, area: area, state: state, label: stateLabel(state) };
    }
    return [
      row("summit", "Summit", summitSt.status === STATES.KNOWN ? STATES.KNOWN : summitSt.status || STATES.UNKNOWN),
      row("access", "Access", accessSt.status),
      row("route", "Route", hikeSt.status),
      row("activationZone", "Activation Zone", azSt.status),
      row("weather", "Weather", STATES.NOT_INTEGRATED),
      row("radio", "Radio conditions", STATES.NOT_INTEGRATED)
    ];
  }

  function unresolvedItems(summit, accessSt, hikeSt, azSt, catalog) {
    var items = [];
    function add(id, text) {
      items.push({ id: id, text: text });
    }
    if (accessSt.status === STATES.UNKNOWN && !(catalog && catalog.status === "unavailable")) {
      add("select-start", "Select a mapped parking area or trailhead to plan the hike");
    }
    if (accessSt.status === STATES.VERIFY) {
      add("verify-access-legality", "Verify parking/access legality");
      add("verify-trail-conditions", "Verify trail/access conditions");
    }
    if (accessSt.status === STATES.UNAVAILABLE || (catalog && catalog.status === "unavailable")) {
      add("access-data-unavailable", "Mapped access data unavailable — verify access independently");
    }
    if (catalog && catalog.status === "empty" && accessSt.status !== STATES.VERIFY) {
      add("access-not-mapped", "No mapped parking or trailhead in this search area — OpenStreetMap may be incomplete");
    }
    if (hikeSt.status === STATES.UNAVAILABLE) {
      add("route-unavailable", "Hiking route unavailable — verify navigation independently");
    }
    if (azSt.status === STATES.UNAVAILABLE) {
      add("az-unavailable", "Activation Zone unavailable — verify SOTA Activation Zone independently");
    }
    add("weather-not-checked", "Weather not checked in SignalTerrain");
    add("radio-not-checked", "Radio conditions not checked in SignalTerrain");
    add("offline-not-confirmed", "Offline navigation not confirmed");
    return items;
  }

  function startSnapshotValue(accessSt) {
    if (!accessSt || !accessSt.selected) {
      return accessSt && accessSt.status === STATES.UNAVAILABLE ? "Unavailable" : "Not selected";
    }
    if (accessSt.selected.mappedName) {
      return accessSt.selected.mappedName + " (" + accessSt.selected.typeLabel + ")";
    }
    return accessSt.selected.name;
  }

  function stillVerifySummary(unresolved) {
    var bits = [];
    var ids = {};
    unresolved.forEach(function (item) {
      ids[item.id] = true;
    });
    if (ids["verify-access-legality"] || ids["access-data-unavailable"] || ids["select-start"] || ids["access-not-mapped"]) {
      bits.push("Parking/access");
    }
    if (ids["verify-trail-conditions"]) bits.push("trail conditions");
    if (ids["weather-not-checked"]) bits.push("weather");
    if (ids["radio-not-checked"]) bits.push("radio conditions");
    if (ids["offline-not-confirmed"]) bits.push("offline navigation");
    return bits.length ? bits.join(", ") : "None listed from current SignalTerrain knowledge";
  }

  function snapshotOf(summitSt, accessSt, hikeSt, azSt, unresolved) {
    var headlineParts = [];
    if (summitSt.name) headlineParts.push(String(summitSt.name).toUpperCase());
    if (summitSt.reference) headlineParts.push(summitSt.reference);
    var startValue = startSnapshotValue(accessSt);
    var azEntry = "Unavailable";
    if (azSt.distanceToEntryLabel && azSt.distanceToEntryLabel !== "Unavailable") azEntry = azSt.distanceToEntryLabel;
    else if (azSt.routeEnters === false) azEntry = "Selected route does not enter Activation Zone";
    else if (azSt.status === STATES.UNAVAILABLE) azEntry = "Unavailable";
    return {
      headline: headlineParts.join(" — ") || "Activation plan",
      rows: [
        { label: "Start", value: startValue },
        { label: "Destination", value: hikeSt.destinationLabel },
        { label: "Route", value: hikeSt.distanceLabel },
        { label: "Climbing", value: hikeSt.gainLabel },
        { label: "Estimated hike", value: hikeSt.durationLabel },
        { label: "AZ entry", value: azEntry },
        { label: "Still verify", value: stillVerifySummary(unresolved) }
      ]
    };
  }

  function formatCopyText(plan) {
    if (!plan) return "SignalTerrain Activation Plan\nUnavailable";
    var s = plan.summit || {};
    var a = plan.access || {};
    var h = plan.hike || {};
    var az = plan.activationZone || {};
    var lines = ["SignalTerrain Activation Plan"];
    var ident = [s.name, s.reference].filter(Boolean).join(" — ");
    lines.push(ident || "Summit unavailable");
    var start = startSnapshotValue(a);
    lines.push("Start: " + start);
    lines.push("Coordinates: " + (a.selected && a.selected.coordsLabel ? a.selected.coordsLabel : "Unavailable"));
    lines.push("Destination: " + (h.destinationLabel || "Unavailable"));
    lines.push("Route: " + (h.distanceLabel || "Unavailable"));
    lines.push("Gain: " + (h.gainLabel || "Unavailable"));
    lines.push("Estimated time: " + (h.durationLabel || "Unavailable"));
    var entry = "Unavailable";
    if (az.distanceToEntryLabel && az.distanceToEntryLabel !== "Unavailable") entry = az.distanceToEntryLabel;
    else if (az.routeEnters === false) entry = "Selected route does not enter Activation Zone";
    lines.push("AZ entry: " + entry);
    var verify = plan.snapshot && plan.snapshot.rows
      ? (plan.snapshot.rows.filter(function (r) { return r.label === "Still verify"; })[0] || {}).value
      : null;
    lines.push("Verify before travel: " + (verify || stillVerifySummary(plan.unresolved || [])));
    lines.push("");
    lines.push(PLANNER_AID);
    return lines.join("\n");
  }

  function buildPlan(input) {
    var opts = input || {};
    var summit = opts.summit || null;
    var catalog = opts.accessCatalog || null;
    var hike = opts.hike || {};
    var summitId = summit && (summit.id || summit.reference);
    var checklist = opts.checklist || loadChecklist(summitId, opts.storage);
    var summitSt = summitSection(summit);
    var accessSt = accessSection(hike, catalog);
    var hikeSt = hikeSection(hike);
    var azSt = azSection(hike);
    var loc = azSt.gps || locationSection(hike);
    var unresolved = unresolvedItems(summit, accessSt, hikeSt, azSt, catalog);
    var readiness = fieldReadiness(summitSt, accessSt, hikeSt, azSt);
    var snapshot = snapshotOf(summitSt, accessSt, hikeSt, azSt, unresolved);
    var generatedAt = opts.now
      ? (opts.now instanceof Date ? opts.now.toISOString() : String(opts.now))
      : new Date().toISOString();
    var plan = {
      version: PLAN_VERSION,
      generatedAt: generatedAt,
      summit: summitSt,
      access: accessSt,
      hike: hikeSt,
      activationZone: azSt,
      location: loc,
      fieldReadiness: readiness,
      unresolved: unresolved,
      checklist: {
        label: "Personal field checklist",
        note: "Personal packing list. Not official SOTA required equipment.",
        summitId: checklist.summitId || summitId || null,
        items: checklist.items || defaultChecklistItems()
      },
      snapshot: snapshot,
      plannerAid: PLANNER_AID,
      fieldReadinessNote: FIELD_READINESS_NOTE,
      osmCaveat: accessSt.caveat
    };
    plan.copyText = formatCopyText(plan);
    return plan;
  }

  var api = {
    PLAN_VERSION: PLAN_VERSION,
    STATES: STATES,
    STATE_LABELS: STATE_LABELS,
    DEFAULT_CHECKLIST: DEFAULT_CHECKLIST,
    PLANNER_AID: PLANNER_AID,
    FIELD_READINESS_NOTE: FIELD_READINESS_NOTE,
    buildPlan: buildPlan,
    formatCopyText: formatCopyText,
    loadChecklist: loadChecklist,
    saveChecklist: saveChecklist,
    setChecked: setChecked,
    resetChecklist: resetChecklist,
    defaultChecklistItems: defaultChecklistItems,
    checklistKey: checklistKey
  };

  global.SignalTerrainSotaPlan = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Plan = api;
})(typeof window !== "undefined" ? window : globalThis);
