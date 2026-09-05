/**
 * Normalized hiking-route model for SignalTerrain (SOTA).
 * Valhalla pedestrian routes only. Does not invent geometry or distances.
 */
(function (global) {
  "use strict";

  var QUERY_VERSION = "signalterrain-sota-route-v0";
  var PROFILE = "pedestrian";
  var PROFILE_LABEL = "Valhalla pedestrian (trail-preferring)";
  var DESTINATION_NOTE =
    "Routing uses the SOTA summit coordinate (summit vicinity). Reaching this exact point is not necessarily required for a valid SOTA activation.";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function decodePolyline6(encoded) {
    if (!encoded || typeof encoded !== "string") return [];
    var coords = [];
    var index = 0;
    var lat = 0;
    var lng = 0;
    var len = encoded.length;
    while (index < len) {
      var result = 0;
      var shift = 0;
      var b;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      var dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;
      result = 0;
      shift = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      var dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;
      coords.push({ lat: lat / 1e6, lng: lng / 1e6 });
    }
    return coords;
  }

  function emptyRoute(query, status, reason, extra) {
    var q = query || {};
    return Object.assign(
      {
        status: status,
        reason: reason || null,
        queryVersion: QUERY_VERSION,
        provider: "valhalla",
        profile: PROFILE,
        profileLabel: PROFILE_LABEL,
        retrievedAt: null,
        start: q.start || null,
        destination: q.destination || null,
        access: q.access || null,
        geometry: [],
        distanceKm: null,
        distanceLabel: null,
        durationSec: null,
        durationLabel: null,
        durationSource: null,
        attribution: "Route © OpenStreetMap contributors. Engine: Valhalla.",
        source: { provider: "valhalla", developmentFixture: false }
      },
      extra || {}
    );
  }

  function destinationForSummit(summit) {
    if (!summit || !isFiniteNumber(summit.lat) || !isFiniteNumber(summit.lng)) return null;
    return {
      kind: "summit-coordinate",
      label: (summit.name || "Summit") + " summit vicinity",
      lat: summit.lat,
      lng: summit.lng,
      note: DESTINATION_NOTE
    };
  }

  function startFromAccess(feature) {
    if (!feature || !isFiniteNumber(feature.lat) || !isFiniteNumber(feature.lng)) return null;
    return {
      kind: feature.kind || "parking",
      name: feature.name || null,
      displayName: feature.name || (feature.kind === "trailhead" ? "Unnamed mapped trailhead" : "Unnamed mapped parking"),
      lat: feature.lat,
      lng: feature.lng,
      osmType: feature.osmType || null,
      osmId: feature.osmId != null ? feature.osmId : null,
      provenanceUrl: feature.provenanceUrl || null
    };
  }

  function lengthKmFromSummary(summary, geometry) {
    if (summary && isFiniteNumber(summary.length)) return summary.length;
    var Geo = global.SignalTerrainSotaGeo;
    if (!Geo || !geometry || geometry.length < 2) return null;
    var km = 0;
    for (var i = 1; i < geometry.length; i += 1) {
      var d = Geo.haversineKm(geometry[i - 1].lat, geometry[i - 1].lng, geometry[i].lat, geometry[i].lng);
      if (d != null) km += d;
    }
    return km || null;
  }

  function normalizeValhalla(payload, query) {
    var q = query || {};
    if (!payload || typeof payload !== "object") {
      return emptyRoute(q, "malformed", "Malformed routing response.");
    }
    if (payload.error_code != null || payload.error) {
      var code = Number(payload.error_code);
      if (code === 442 || /no path/i.test(String(payload.error || ""))) {
        return emptyRoute(q, "no-route", "No pedestrian/hiking route found between this access point and the summit vicinity.");
      }
      return emptyRoute(q, "unavailable", "Routing service unavailable (" + String(payload.error) + ").");
    }
    var trip = payload.trip || payload;
    if (trip.status != null && Number(trip.status) !== 0) {
      var msg = trip.status_message || "Routing did not return a path.";
      if (/no path|could not/i.test(String(msg))) {
        return emptyRoute(q, "no-route", "No pedestrian/hiking route found between this access point and the summit vicinity.");
      }
      return emptyRoute(q, "unavailable", String(msg));
    }
    var legs = trip.legs || [];
    if (!legs.length || !legs[0] || !legs[0].shape) {
      return emptyRoute(q, "malformed", "Routing response had no route geometry.");
    }
    var geometry = decodePolyline6(legs[0].shape);
    if (geometry.length < 2) {
      return emptyRoute(q, "malformed", "Routing response geometry could not be decoded.");
    }
    var summary = trip.summary || legs[0].summary || {};
    var distanceKm = lengthKmFromSummary(summary, geometry);
    var durationSec = isFiniteNumber(summary.time) ? summary.time : null;
    var Geo = global.SignalTerrainSotaGeo;
    var durationLabel = null;
    var distanceLabel = null;
    try {
      if (durationSec != null && Geo && typeof Geo.formatDurationEstimate === "function") {
        durationLabel = Geo.formatDurationEstimate(durationSec);
      }
      if (distanceKm != null && Geo && typeof Geo.formatRouteDistance === "function") {
        distanceLabel = Geo.formatRouteDistance(distanceKm);
      } else if (distanceKm != null) {
        distanceLabel = distanceKm.toFixed(1) + " km";
      }
    } catch (labelErr) {
      if (distanceKm != null && !distanceLabel) distanceLabel = distanceKm.toFixed(1) + " km";
    }
    var src = payload.source || {};
    return {
      status: "ok",
      reason: null,
      queryVersion: QUERY_VERSION,
      provider: "valhalla",
      profile: PROFILE,
      profileLabel: PROFILE_LABEL,
      retrievedAt: src.retrievedAt || new Date().toISOString(),
      start: q.start || null,
      destination: q.destination || null,
      access: q.access || null,
      geometry: geometry,
      encodedShape: legs[0].shape,
      distanceKm: distanceKm,
      distanceLabel: distanceLabel,
      durationSec: durationSec,
      durationLabel: durationLabel,
      durationSource: durationLabel ? "valhalla-pedestrian" : null,
      maneuvers: legs[0].maneuvers || [],
      attribution: "Route © OpenStreetMap contributors. Engine: Valhalla.",
      source: {
        provider: "valhalla",
        endpoint: src.endpoint || "https://valhalla1.openstreetmap.de/route",
        developmentFixture: !!src.developmentFixture,
        licenseNote: src.licenseNote || null
      }
    };
  }

  function routeId(summit, access) {
    var sid = summit && (summit.id || summit.reference) ? summit.id || summit.reference : "unknown";
    var osm = access && access.osmType && access.osmId != null ? access.osmType + "/" + access.osmId : "none";
    return QUERY_VERSION + ":" + sid + ":" + osm + ":" + PROFILE;
  }

  var api = {
    QUERY_VERSION: QUERY_VERSION,
    PROFILE: PROFILE,
    PROFILE_LABEL: PROFILE_LABEL,
    DESTINATION_NOTE: DESTINATION_NOTE,
    decodePolyline6: decodePolyline6,
    emptyRoute: emptyRoute,
    destinationForSummit: destinationForSummit,
    startFromAccess: startFromAccess,
    normalizeValhalla: normalizeValhalla,
    routeId: routeId
  };

  global.SignalTerrainSotaRouteModel = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.RouteModel = api;
})(typeof window !== "undefined" ? window : globalThis);
