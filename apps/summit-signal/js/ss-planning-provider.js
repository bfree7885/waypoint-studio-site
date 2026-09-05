/**
 * Hiking / activation-planning data boundary.
 *
 * V0.2 fills candidate OSM access. V0.3 adds user-selected start + Valhalla
 * route + USGS 3DEP profile. V0.4 fills a terrain-derived Activation Zone
 * when the AZ engine has run. V0.6 adds an explicit Route-to-AZ destination.
 * Never invents hike stats, a "best" trailhead, or an activation-validity claim.
 */
(function (global) {
  "use strict";

  var NOT_INTEGRATED_REASON =
    "Not yet integrated. SignalTerrain has not retrieved trail, parking, or routing data for this summit.";

  var ACTIVATION_ZONE_REASON =
    "The SOTA Activation Zone is the area within a closed contour at the association Vertical Distance below the summit " +
    "(normally 25 m; SOTA General Rules v1.21). SignalTerrain does not draw a radius. A terrain contour is required.";

  var ROUTE_REASON =
    "Select a mapped parking area or trailhead, then choose Start hike here. SignalTerrain does not pick a best access point.";

  var FIELDS = [
    { id: "trailhead", label: "Trailhead" },
    { id: "parking", label: "Parking" },
    { id: "hikingRoute", label: "Hiking route" },
    { id: "distance", label: "Distance" },
    { id: "elevationGain", label: "Elevation gain" },
    { id: "estimatedHikingTime", label: "Estimated hiking time" },
    { id: "activationZone", label: "Activation zone" }
  ];

  var LATER_IDS = ["hikingRoute", "distance", "elevationGain", "estimatedHikingTime", "activationZone"];
  var HIKE_IDS = ["hikingRoute", "distance", "elevationGain", "estimatedHikingTime"];

  function field(id, label, extraReason) {
    return {
      id: id,
      label: label,
      status: "not-integrated",
      value: null,
      display: "Not yet integrated",
      reason: extraReason || NOT_INTEGRATED_REASON
    };
  }

  function laterFields() {
    var items = {};
    for (var i = 0; i < FIELDS.length; i += 1) {
      var f = FIELDS[i];
      if (LATER_IDS.indexOf(f.id) === -1) continue;
      items[f.id] = field(
        f.id,
        f.label,
        f.id === "activationZone" ? ACTIVATION_ZONE_REASON : ROUTE_REASON
      );
    }
    return items;
  }

  function summarizeList(kind, catalog) {
    var AccessModel = global.SignalTerrainSotaAccessModel;
    if (!catalog) {
      return {
        id: kind,
        status: "not-integrated",
        value: null,
        display: "Not yet integrated",
        reason: NOT_INTEGRATED_REASON,
        features: []
      };
    }
    if (catalog.status === "pending") {
      return {
        id: kind,
        status: "pending",
        value: null,
        display: "Looking up mapped access…",
        reason: null,
        features: []
      };
    }
    if (catalog.status === "unavailable") {
      return {
        id: kind,
        status: "unavailable",
        value: null,
        display: "OpenStreetMap data unavailable",
        reason: catalog.reason || "OpenStreetMap data unavailable",
        features: []
      };
    }
    var list =
      kind === "trails"
        ? catalog.trails || []
        : kind === "trailheads"
          ? catalog.trailheads || []
          : catalog.parking || [];
    var routes = kind === "trails" ? catalog.namedHikingRoutes || [] : [];
    if (catalog.status === "empty" || (list.length === 0 && routes.length === 0)) {
      var emptyLabel =
        kind === "trails"
          ? "No mapped paths found in this search area"
          : kind === "trailheads"
            ? "No mapped trailheads found in this search area"
            : "No mapped parking found in this search area";
      return {
        id: kind,
        status: "empty",
        value: [],
        display: emptyLabel,
        reason: emptyLabel + ". OpenStreetMap may be incomplete.",
        features: []
      };
    }
    var count = list.length;
    var unnamed = AccessModel && kind === "trails" ? AccessModel.unnamedTrailCount(list) : 0;
    var names = AccessModel && kind === "trails" ? AccessModel.namedTrailNames(list, routes, 8) : [];
    var display;
    if (kind === "trails") {
      display =
        count +
        " mapped path" +
        (count === 1 ? "" : "s") +
        " nearby" +
        (unnamed ? " · " + unnamed + " unnamed" : "");
    } else if (kind === "trailheads") {
      display = count + " mapped trailhead" + (count === 1 ? "" : "s") + " nearby";
    } else {
      display = count + " mapped parking area" + (count === 1 ? "" : "s") + " nearby";
    }
    return {
      id: kind,
      status: "ok",
      value: list,
      display: display,
      names: names,
      unnamedCount: unnamed,
      features: list,
      namedHikingRoutes: routes
    };
  }

  /**
   * Planning payload for a summit.
   * accessCatalog: V0.2 OSM access.
   * hike: { selectedAccess, route, elevation } from V0.3 providers.
   */
  function getPlanning(summit, accessCatalog, hike) {
    var items = laterFields();
    var access = summarizeList("trails", accessCatalog);
    var trailheads = summarizeList("trailheads", accessCatalog);
    var parking = summarizeList("parking", accessCatalog);
    items.trailhead = {
      id: "trailhead",
      label: "Trailheads",
      status: trailheads.status,
      value: trailheads.status === "ok" ? trailheads.features : null,
      display: trailheads.display,
      reason: trailheads.reason || null,
      features: trailheads.features || []
    };
    items.parking = {
      id: "parking",
      label: "Parking",
      status: parking.status,
      value: parking.status === "ok" ? parking.features : null,
      display: parking.display,
      reason: parking.reason || null,
      features: parking.features || []
    };
    applyHike(items, summit, hike);
    applyAz(items, summit, hike);
    var status;
    if (!accessCatalog) status = "not-integrated";
    else if (accessCatalog.status === "pending") status = "pending";
    else if (accessCatalog.status === "unavailable") status = "unavailable";
    else if (accessCatalog.status === "empty") status = "empty";
    else status = "ok";
    return {
      status: status,
      provider: "signalterrain-sota-planning-v0",
      accessStatus: accessCatalog ? accessCatalog.status : "not-integrated",
      hikeStatus: hike && hike.route ? hike.route.status : "idle",
      access: access,
      trailheads: trailheads,
      parking: parking,
      hike: hike || null,
      caveat: (global.SignalTerrainSotaAccessModel && global.SignalTerrainSotaAccessModel.CAVEAT) || "",
      candidateNote:
        (global.SignalTerrainSotaAccessModel && global.SignalTerrainSotaAccessModel.CANDIDATE_NOTE) || "",
      query: accessCatalog && accessCatalog.query ? accessCatalog.query : null,
      retrievedAt: accessCatalog && accessCatalog.retrievedAt ? accessCatalog.retrievedAt : null,
      intendedSources: [
        "OpenStreetMap-derived trail and trailhead data",
        "Valhalla pedestrian routing on OSM",
        "USGS 3DEP elevation",
        "SOTA General Rules v1.21 Activation Zone contour"
      ],
      forbiddenSources: ["AllTrails scraping", "invented hike stats", "fabricated routes", "straight-line as hike distance"],
      items: items,
      fields: FIELDS.slice()
    };
  }

  function applyHike(items, summit, hike) {
    if (hike && hike.destinationMode === "az") {
      var azr = hike.azRoute;
      if (azr && azr.status === "pending") {
        items.hikingRoute.status = "pending";
        items.hikingRoute.display = "Calculating route to Activation Zone…";
        items.distance.status = "pending";
        items.distance.display = "Calculating…";
        items.estimatedHikingTime.status = "pending";
        items.estimatedHikingTime.display = "Calculating…";
        items.elevationGain.status = "pending";
        items.elevationGain.display = "Waiting for route…";
        return;
      }
      if (azr && azr.status === "ok") {
        hike = {
          selectedAccess: hike.selectedAccess,
          route: azr.route || hike.route,
          elevation: hike.azElevation || hike.elevation
        };
      } else if (azr) {
        items.hikingRoute.status = azr.status;
        items.hikingRoute.display = "Route to Activation Zone unavailable";
        items.hikingRoute.reason = azr.reason;
        items.distance.status = azr.status;
        items.distance.display = "Unavailable";
        items.distance.reason = "Route to AZ is not replaced with a summit route, straight-line, or polygon vertex.";
        items.estimatedHikingTime.status = "unavailable";
        items.estimatedHikingTime.display = "Unavailable";
        items.elevationGain.status = "unavailable";
        items.elevationGain.display = "Unavailable";
        return;
      }
    }
    var route = hike && hike.route;
    var elev = hike && hike.elevation;
    var start = hike && hike.selectedAccess;
    if (!start && !route) {
      items.hikingRoute.display = "Not started";
      items.hikingRoute.reason = ROUTE_REASON;
      return;
    }
    if (route && route.status === "pending") {
      items.hikingRoute.status = "pending";
      items.hikingRoute.display = "Calculating pedestrian route…";
      items.distance.status = "pending";
      items.distance.display = "Calculating…";
      items.estimatedHikingTime.status = "pending";
      items.estimatedHikingTime.display = "Calculating…";
      items.elevationGain.status = "pending";
      items.elevationGain.display = "Waiting for route…";
      return;
    }
    if (route && (route.status === "unavailable" || route.status === "timeout" || route.status === "malformed" || route.status === "invalid-start" || route.status === "no-route")) {
      items.hikingRoute.status = route.status;
      items.hikingRoute.display = route.status === "no-route" ? "No pedestrian/hiking route found" : "Unavailable";
      items.hikingRoute.reason = route.reason;
      items.distance.status = route.status;
      items.distance.display = "Unavailable";
      items.distance.reason = "Route distance is not replaced with straight-line distance.";
      items.estimatedHikingTime.status = "unavailable";
      items.estimatedHikingTime.display = "Unavailable";
      items.elevationGain.status = "unavailable";
      items.elevationGain.display = "Unavailable";
      return;
    }
    if (route && route.status === "ok") {
      items.hikingRoute.status = "ok";
      items.hikingRoute.display = "Calculated pedestrian route";
      items.hikingRoute.value = route;
      items.hikingRoute.reason = route.attribution;
      items.distance.status = "ok";
      items.distance.display = route.distanceLabel || "Unavailable";
      items.distance.value = route.distanceKm;
      items.distance.reason = "Calculated route distance, not straight-line.";
      if (route.durationLabel) {
        items.estimatedHikingTime.status = "ok";
        items.estimatedHikingTime.display = route.durationLabel;
        items.estimatedHikingTime.value = route.durationSec;
        items.estimatedHikingTime.reason = "Valhalla pedestrian costing duration (estimate, rounded).";
      } else if (elev && (elev.status === "ok" || elev.status === "partial") && elev.gainM != null && route.distanceKm != null) {
        var sec = (route.distanceKm / 5 + elev.gainM / 600) * 3600;
        var Geo = global.SignalTerrainSotaGeo;
        var estimateLabel = null;
        try {
          if (Geo && typeof Geo.formatDurationEstimate === "function") {
            estimateLabel = Geo.formatDurationEstimate(sec);
          }
        } catch (e) {
          estimateLabel = null;
        }
        if (estimateLabel) {
          items.estimatedHikingTime.status = "ok";
          items.estimatedHikingTime.display = estimateLabel;
          items.estimatedHikingTime.value = sec;
          items.estimatedHikingTime.reason =
            "SignalTerrain estimate: distance(km)/5 + gain(m)/600 hours. Not a personal pace model.";
        } else {
          items.estimatedHikingTime.status = "unavailable";
          items.estimatedHikingTime.display = "Unavailable";
          items.estimatedHikingTime.reason = "Duration formatter unavailable.";
        }
      } else {
        items.estimatedHikingTime.status = "unavailable";
        items.estimatedHikingTime.display = "Unavailable";
        items.estimatedHikingTime.reason = "No legitimate duration from the router, and elevation is unavailable for an estimate.";
      }
      if (!elev || elev.status === "pending") {
        items.elevationGain.status = "pending";
        items.elevationGain.display = "Sampling USGS 3DEP…";
      } else if (elev.status === "ok" || elev.status === "partial") {
        items.elevationGain.status = elev.status;
        items.elevationGain.display = elev.gainLabel || "Unavailable";
        items.elevationGain.value = elev.gainM;
        items.elevationGain.reason = elev.methodology;
      } else {
        items.elevationGain.status = "unavailable";
        items.elevationGain.display = "Unavailable";
        items.elevationGain.reason = elev.reason || "Elevation data unavailable. The calculated route is still shown.";
      }
    }
  }

  function applyAz(items, summit, hike) {
    var az = hike && hike.az;
    if (!az) return;
    items.activationZone.status = az.status === "ok" ? "ok" : az.status || "unavailable";
    if (az.status === "ok") {
      items.activationZone.display = "Terrain-derived contour";
      items.activationZone.value = az;
      items.activationZone.reason = az.caveat;
    } else if (az.status === "pending") {
      items.activationZone.status = "pending";
      items.activationZone.display = "Calculating Activation Zone…";
    } else {
      items.activationZone.display = "Unavailable";
      items.activationZone.reason = az.reason || "Activation Zone could not be calculated.";
      items.activationZone.value = az;
    }
  }

  function getReadiness(summit, accessCatalog, hike) {
    var planning = getPlanning(summit, accessCatalog, hike);
    var az = hike && hike.az;
    var rel = hike && hike.routeAz;
    var loc = hike && hike.geoAz;
    var Geo = global.SignalTerrainSotaGeo;
    function row(label, status, display, note) {
      return { label: label, status: status || "unavailable", display: display || "Unavailable", note: note || null };
    }
    var access = planning.items.parking;
    var start = hike && hike.selectedAccess;
    var route = hike && hike.route;
    var locRow;
    if (!az || az.status !== "ok") locRow = row("Current location vs AZ", "az-unavailable", "AZ unavailable");
    else if (!loc || loc.status === "location-unavailable") {
      locRow = row("Current location vs AZ", "location-unavailable", "Location unavailable");
    } else {
      locRow = row("Current location vs AZ", loc.status, loc.label, loc.note);
    }
    var enterDisplay = "Unknown";
    var enterStatus = "unknown";
    if (!route || route.status !== "ok") {
      enterDisplay = "Unknown — route unavailable";
      enterStatus = "route-unavailable";
    } else if (!az || az.status !== "ok") {
      enterDisplay = "Unknown — AZ unavailable";
      enterStatus = "az-unavailable";
    } else if (rel && rel.enters === true) {
      enterStatus = "enters";
      enterDisplay = rel.distanceToEntryKm === 0 ? "Route starts inside AZ" : "Route enters Activation Zone";
    } else if (rel && rel.enters === false) {
      enterStatus = "does-not-enter";
      enterDisplay = "Calculated route does not enter Activation Zone";
    }
    return {
      title: "Activation readiness",
      note: "Factual known/unknown summary. Not a score and not a valid-activation claim.",
      groups: [
        {
          id: "summit",
          title: "Summit",
          rows: [
            row("Name", summit && summit.name ? "ok" : "unavailable", summit && summit.name ? summit.name : "Unavailable"),
            row("Reference", summit && (summit.reference || summit.id) ? "ok" : "unavailable", (summit && (summit.reference || summit.id)) || "Unavailable"),
            row("Points", summit && summit.points != null ? "ok" : "unavailable", summit && summit.points != null ? String(summit.points) : "Unavailable"),
            row("Seasonal bonus", "unavailable", "Unavailable")
          ]
        },
        {
          id: "access",
          title: "Access",
          rows: [
            row(
              "Selected start",
              start ? "ok" : "unavailable",
              start ? start.name || (start.kind === "trailhead" ? "Unnamed mapped trailhead" : "Unnamed mapped parking") : "Not selected"
            ),
            row("Access data", access ? access.status : "not-integrated", access ? access.display : "Not yet integrated")
          ]
        },
        {
          id: "hike",
          title: "Hike",
          rows: [
            row("Route", planning.items.hikingRoute.status, planning.items.hikingRoute.display),
            row("Route distance", planning.items.distance.status, planning.items.distance.display, "Route distance, not straight-line."),
            row("Elevation gain", planning.items.elevationGain.status, planning.items.elevationGain.display),
            row("Estimated time", planning.items.estimatedHikingTime.status, planning.items.estimatedHikingTime.display)
          ]
        },
        {
          id: "az",
          title: "Activation zone",
          rows: [
            row("Zone", planning.items.activationZone.status, planning.items.activationZone.display),
            row("Route vs AZ", enterStatus, enterDisplay, rel && rel.reason),
            row(
              "Distance to AZ entry",
              rel && rel.enters && rel.distanceToEntryKm != null ? "ok" : "unavailable",
              rel && rel.enters && rel.distanceToEntryKm != null && Geo
                ? Geo.formatRouteDistance(rel.distanceToEntryKm)
                : "Unavailable"
            ),
            locRow
          ]
        },
        {
          id: "later",
          title: "Not in V0.7",
          rows: [row("Radio", "not-integrated", "Not integrated"), row("Weather", "not-integrated", "Not integrated")]
        }
      ]
    };
  }

  var api = {
    FIELDS: FIELDS,
    LATER_IDS: LATER_IDS,
    HIKE_IDS: HIKE_IDS,
    getPlanning: getPlanning,
    getReadiness: getReadiness
  };

  global.SignalTerrainSotaPlanning = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Planning = api;
})(typeof window !== "undefined" ? window : globalThis);
