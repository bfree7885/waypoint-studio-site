/**
 * Route-to-Activation-Zone model for SignalTerrain (SOTA).
 *
 * Candidates come from the relationship between a selected access point,
 * the Valhalla pedestrian summit-route geometry, and the calculated AZ.
 * Does not invent an activation point, centroid, vertex, or straight-line hop.
 */
(function (global) {
  "use strict";

  var ALGORITHM_VERSION = "signalterrain-sota-az-route-v0";
  var CANDIDATE_METHOD = "valhalla-summit-route-az-intersection";
  var SELECTION_CRITERION = "shortest-routed-az-entry";
  var SELECTION_LABEL = "Shortest routed AZ entry found";
  var DESTINATION_MODE = "activation-zone";
  var DEDUPE_DEG = 1e-5;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function Geo() {
    return global.SignalTerrainSotaGeo;
  }

  function AzModel() {
    return global.SignalTerrainSotaAzModel;
  }

  function RouteModel() {
    return global.SignalTerrainSotaRouteModel;
  }

  function emptyResult(query, status, reason, extra) {
    var q = query || {};
    var base = {
      status: status,
      reason: reason || null,
      destinationMode: DESTINATION_MODE,
      queryVersion: ALGORITHM_VERSION,
      candidateMethod: CANDIDATE_METHOD,
      selectionCriterion: SELECTION_CRITERION,
      selectionLabel: SELECTION_LABEL,
      summitId: q.summitId || null,
      summitCoordinate: q.summitCoordinate || null,
      selectedAccess: q.access || null,
      azCalculationVersion: q.azCalculationVersion || null,
      azCellCount: q.azCellCount != null ? q.azCellCount : null,
      azThresholdM: q.azThresholdM != null ? q.azThresholdM : null,
      provider: "valhalla",
      profile: "pedestrian",
      profileLabel: RouteModel() && RouteModel().PROFILE_LABEL ? RouteModel().PROFILE_LABEL : "Valhalla pedestrian (trail-preferring)",
      retrievedAt: null,
      calculatedAt: null,
      geometry: [],
      distanceKm: null,
      distanceLabel: null,
      durationSec: null,
      durationLabel: null,
      durationSource: null,
      entry: null,
      selectedCandidate: null,
      candidateCountAttempted: 0,
      candidateCountValid: 0,
      attribution: "Route © OpenStreetMap contributors. Engine: Valhalla.",
      source: { provider: "valhalla", developmentFixture: false },
      straightLineUsed: false
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        base[k] = extra[k];
      });
    }
    return base;
  }

  function lengthKm(geometry) {
    var g = Geo();
    if (!g || !geometry || geometry.length < 2) return null;
    var km = 0;
    for (var i = 1; i < geometry.length; i += 1) {
      var d = g.haversineKm(geometry[i - 1].lat, geometry[i - 1].lng, geometry[i].lat, geometry[i].lng);
      if (d != null) km += d;
    }
    return km;
  }

  function clipGeometryToDistance(geometry, targetKm) {
    var g = Geo();
    if (!geometry || geometry.length < 2 || !g) return [];
    if (!isFiniteNumber(targetKm)) return geometry.slice();
    if (targetKm <= 0) return [{ lat: geometry[0].lat, lng: geometry[0].lng }];
    var acc = 0;
    var out = [{ lat: geometry[0].lat, lng: geometry[0].lng }];
    for (var i = 1; i < geometry.length; i += 1) {
      var a = geometry[i - 1];
      var b = geometry[i];
      var step = g.haversineKm(a.lat, a.lng, b.lat, b.lng) || 0;
      if (acc + step >= targetKm) {
        var t = step > 0 ? (targetKm - acc) / step : 1;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        out.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
        return out;
      }
      out.push({ lat: b.lat, lng: b.lng });
      acc += step;
    }
    return out;
  }

  function samePoint(a, b) {
    if (!a || !b) return false;
    return Math.abs(a.lat - b.lat) < DEDUPE_DEG && Math.abs(a.lng - b.lng) < DEDUPE_DEG;
  }

  function isStraightLineForbidden(route) {
    if (!route) return true;
    if (route.straightLine === true || route.kind === "straight-line" || route.provider === "straight-line") return true;
    if (route.source && route.source.provider === "straight-line") return true;
    return false;
  }

  function generateCandidates(summitRoute, az) {
    var Az = AzModel();
    var out = { status: "ok", reason: null, candidates: [] };
    if (!summitRoute || summitRoute.status !== "ok" || !summitRoute.geometry || summitRoute.geometry.length < 2) {
      out.status = "route-unavailable";
      out.reason = "No calculated hiking route to derive an AZ entry from.";
      return out;
    }
    if (isStraightLineForbidden(summitRoute) || summitRoute.provider !== "valhalla") {
      out.status = "generation-failed";
      out.reason = "AZ-entry candidates require a Valhalla pedestrian route. Straight-line geometry is not used.";
      return out;
    }
    if (!az || az.status !== "ok" || !az.latlngs) {
      out.status = "az-unavailable";
      out.reason = "Activation Zone is unavailable, so Route to Activation Zone was not calculated.";
      return out;
    }
    if (!Az) {
      out.status = "generation-failed";
      out.reason = "Activation Zone model missing.";
      return out;
    }
    var rel = Az.relateRoute(az, summitRoute);
    if (rel && rel.enters === true && rel.entry && isFiniteNumber(rel.entry.lat) && isFiniteNumber(rel.entry.lng)) {
      out.candidates.push({
        id: "first-az-entry",
        source: "summit-route-az-intersection",
        lat: rel.entry.lat,
        lng: rel.entry.lng,
        distanceKm: rel.distanceToEntryKm,
        elevationM: rel.entry.elevationM != null ? rel.entry.elevationM : null,
        relate: rel,
        clipToKm: rel.distanceToEntryKm
      });
    }
    var last = summitRoute.geometry[summitRoute.geometry.length - 1];
    if (last && Az.pointInAz(az, last.lat, last.lng)) {
      var terminus = {
        id: "route-terminus-inside-az",
        source: "valhalla-terminus-inside-az",
        lat: last.lat,
        lng: last.lng,
        distanceKm: summitRoute.distanceKm,
        elevationM: last.elevM != null ? last.elevM : null,
        relate: rel,
        clipToKm: summitRoute.distanceKm
      };
      var dup = out.candidates.some(function (c) {
        return samePoint(c, terminus) && Math.abs((c.distanceKm || 0) - (terminus.distanceKm || 0)) < 0.001;
      });
      if (!dup) out.candidates.push(terminus);
    }
    if (!out.candidates.length) {
      out.status = "no-candidate";
      out.reason =
        rel && rel.status === "does-not-enter"
          ? "The calculated pedestrian route does not enter the mapped Activation Zone."
          : "No valid AZ routing candidate was found on the selected access route.";
    }
    return out;
  }

  function prefixGeometry(summitRoute, candidate) {
    if (!summitRoute || !summitRoute.geometry) return [];
    if (!candidate) return [];
    var geom = clipGeometryToDistance(summitRoute.geometry, candidate.clipToKm);
    if (!geom.length) return [];
    var end = geom[geom.length - 1];
    if (!samePoint(end, candidate)) {
      geom[geom.length - 1] = { lat: candidate.lat, lng: candidate.lng };
    } else {
      geom[geom.length - 1] = { lat: candidate.lat, lng: candidate.lng };
    }
    return geom;
  }

  function validateCandidate(candidate, prefixRoute, az) {
    var Az = AzModel();
    var result = { ok: false, reason: null };
    if (!candidate || !isFiniteNumber(candidate.lat) || !isFiniteNumber(candidate.lng)) {
      result.reason = "Candidate coordinate missing.";
      return result;
    }
    if (!prefixRoute || prefixRoute.status !== "ok") {
      result.reason = "Candidate was not a legitimate pedestrian route.";
      return result;
    }
    if (isStraightLineForbidden(prefixRoute) || prefixRoute.provider !== "valhalla") {
      result.reason = "Straight-line or non-Valhalla geometry is not a valid AZ approach.";
      return result;
    }
    if (!prefixRoute.geometry || prefixRoute.geometry.length < 2) {
      result.reason = "Malformed provider route geometry.";
      return result;
    }
    if (!az || az.status !== "ok") {
      result.reason = "Activation Zone unavailable.";
      return result;
    }
    if (!Az) {
      result.reason = "Activation Zone model missing.";
      return result;
    }
    var term = prefixRoute.geometry[prefixRoute.geometry.length - 1];
    if (!Az.pointInAz(az, term.lat, term.lng)) {
      result.reason = "Route ends outside the calculated Activation Zone.";
      return result;
    }
    var rel = Az.relateRoute(az, prefixRoute);
    if (!rel || rel.enters !== true) {
      result.reason = "Route geometry does not reach the calculated Activation Zone.";
      return result;
    }
    result.ok = true;
    result.relate = rel;
    return result;
  }

  function compareCandidates(a, b) {
    var da = a.distanceKm;
    var db = b.distanceKm;
    if (isFiniteNumber(da) && isFiniteNumber(db) && da !== db) return da - db;
    if (isFiniteNumber(da) && !isFiniteNumber(db)) return -1;
    if (!isFiniteNumber(da) && isFiniteNumber(db)) return 1;
    if (a.lat !== b.lat) return a.lat - b.lat;
    return a.lng - b.lng;
  }

  function selectCandidate(valid) {
    if (!valid || !valid.length) return null;
    var copy = valid.slice();
    copy.sort(compareCandidates);
    return copy[0];
  }

  function durationForPrefix(summitRoute, prefixKm) {
    if (!summitRoute || !isFiniteNumber(summitRoute.durationSec) || !isFiniteNumber(summitRoute.distanceKm) || summitRoute.distanceKm <= 0) {
      return { sec: null, source: null };
    }
    if (!isFiniteNumber(prefixKm) || prefixKm < 0) return { sec: null, source: null };
    if (Math.abs(prefixKm - summitRoute.distanceKm) < 0.0005) {
      return { sec: summitRoute.durationSec, source: summitRoute.durationSource || "valhalla-pedestrian" };
    }
    return {
      sec: summitRoute.durationSec * (prefixKm / summitRoute.distanceKm),
      source: "valhalla-pedestrian-distance-fraction"
    };
  }

  function buildPrefixRoute(summitRoute, candidate, az) {
    var Route = RouteModel();
    var g = Geo();
    if (!summitRoute || !candidate) {
      return Route ? Route.emptyRoute({}, "malformed", "Missing summit route or candidate.") : { status: "malformed" };
    }
    var geometry = prefixGeometry(summitRoute, candidate);
    if (geometry.length < 2) {
      return Route.emptyRoute({}, "malformed", "AZ-entry prefix geometry could not be built from the Valhalla route.");
    }
    var distanceKm = lengthKm(geometry);
    var dur = durationForPrefix(summitRoute, distanceKm);
    var distanceLabel = null;
    var durationLabel = null;
    try {
      if (distanceKm != null && g && typeof g.formatRouteDistance === "function") {
        distanceLabel = g.formatRouteDistance(distanceKm);
      }
      if (dur.sec != null && g && typeof g.formatDurationEstimate === "function") {
        durationLabel = g.formatDurationEstimate(dur.sec);
      }
    } catch (e) {
      if (distanceKm != null && !distanceLabel) distanceLabel = distanceKm.toFixed(1) + " km";
    }
    return {
      status: "ok",
      reason: null,
      queryVersion: (Route && Route.QUERY_VERSION) || "signalterrain-sota-route-v0",
      destinationMode: DESTINATION_MODE,
      provider: "valhalla",
      profile: "pedestrian",
      profileLabel: summitRoute.profileLabel,
      retrievedAt: summitRoute.retrievedAt,
      start: summitRoute.start,
      destination: {
        kind: "az-entry",
        label: "Selected routed AZ entry",
        lat: candidate.lat,
        lng: candidate.lng,
        note: "A routed entry into the calculated Activation Zone. Not a requirement to operate here."
      },
      access: summitRoute.access || summitRoute.start,
      geometry: geometry,
      distanceKm: distanceKm,
      distanceLabel: distanceLabel,
      durationSec: dur.sec,
      durationLabel: durationLabel,
      durationSource: dur.source,
      attribution: summitRoute.attribution,
      source: summitRoute.source || { provider: "valhalla", developmentFixture: false },
      parentRouteId: summitRoute.queryVersion ? null : null,
      straightLineUsed: false
    };
  }

  function azIdentity(az) {
    return {
      azCalculationVersion: az && az.calculationVersion ? az.calculationVersion : null,
      azCellCount: az && az.cellCount != null ? az.cellCount : null,
      azThresholdM: az && az.thresholdM != null ? az.thresholdM : null
    };
  }

  function resultFromSelection(summit, access, summitRoute, az, generated, validWrapped, selectedWrap) {
    var now = new Date().toISOString();
    var ident = azIdentity(az);
    var q = {
      summitId: summit && (summit.id || summit.reference),
      summitCoordinate: summit ? { lat: summit.lat, lng: summit.lng } : null,
      access: access || (summitRoute && (summitRoute.access || summitRoute.start)),
      azCalculationVersion: ident.azCalculationVersion,
      azCellCount: ident.azCellCount,
      azThresholdM: ident.azThresholdM
    };
    var attempted = generated && generated.candidates ? generated.candidates.length : 0;
    var validCount = validWrapped ? validWrapped.length : 0;
    if (!selectedWrap) {
      var st = generated && generated.status === "az-unavailable" ? "az-unavailable" : generated && generated.status === "route-unavailable" ? summitRoute && summitRoute.status === "no-route" ? "no-route" : "unavailable" : generated && generated.status === "generation-failed" ? "generation-failed" : attempted && !validCount ? "all-candidates-failed" : "no-candidate";
      return emptyResult(q, st, (generated && generated.reason) || "No valid AZ routing candidate found.", {
        candidateCountAttempted: attempted,
        candidateCountValid: validCount,
        calculatedAt: now,
        retrievedAt: summitRoute && summitRoute.retrievedAt ? summitRoute.retrievedAt : now,
        source: summitRoute && summitRoute.source ? summitRoute.source : { provider: "valhalla", developmentFixture: false }
      });
    }
    var route = selectedWrap.route;
    var g = Geo();
    var entry = {
      lat: selectedWrap.candidate.lat,
      lng: selectedWrap.candidate.lng,
      distanceKm: route.distanceKm,
      elevationM: selectedWrap.candidate.elevationM,
      onOrInsideAz: true
    };
    return {
      status: "ok",
      reason: null,
      destinationMode: DESTINATION_MODE,
      queryVersion: ALGORITHM_VERSION,
      candidateMethod: CANDIDATE_METHOD,
      selectionCriterion: SELECTION_CRITERION,
      selectionLabel: SELECTION_LABEL,
      summitId: q.summitId,
      summitCoordinate: q.summitCoordinate,
      selectedAccess: q.access,
      azCalculationVersion: ident.azCalculationVersion,
      azCellCount: ident.azCellCount,
      azThresholdM: ident.azThresholdM,
      provider: "valhalla",
      profile: "pedestrian",
      profileLabel: route.profileLabel,
      retrievedAt: route.retrievedAt,
      calculatedAt: now,
      geometry: route.geometry,
      distanceKm: route.distanceKm,
      distanceLabel: route.distanceLabel,
      durationSec: route.durationSec,
      durationLabel: route.durationLabel,
      durationSource: route.durationSource,
      entry: entry,
      selectedCandidate: {
        id: selectedWrap.candidate.id,
        source: selectedWrap.candidate.source,
        lat: selectedWrap.candidate.lat,
        lng: selectedWrap.candidate.lng,
        coordinateLabel: g && typeof g.formatRouteDistance === "function" ? null : null
      },
      candidateCountAttempted: attempted,
      candidateCountValid: validCount,
      route: route,
      attribution: route.attribution,
      source: route.source,
      straightLineUsed: false,
      caveat:
        "Route to Activation Zone identifies a legitimate routed entry into the calculated Activation Zone. It does not identify a globally optimal or recommended operating location."
    };
  }

  function deriveAzRoute(summit, access, summitRoute, az) {
    var generated = generateCandidates(summitRoute, az);
    if (generated.status === "az-unavailable") {
      return resultFromSelection(summit, access, summitRoute, az, generated, [], null);
    }
    if (generated.status === "route-unavailable" || generated.status === "generation-failed") {
      return resultFromSelection(summit, access, summitRoute, az, generated, [], null);
    }
    var valid = [];
    for (var i = 0; i < generated.candidates.length; i += 1) {
      var cand = generated.candidates[i];
      var prefix = buildPrefixRoute(summitRoute, cand, az);
      var check = validateCandidate(cand, prefix, az);
      if (check.ok) {
        valid.push({ candidate: cand, route: prefix, relate: check.relate });
      }
    }
    var selected = selectCandidate(valid.map(function (w) { return w.candidate; }));
    var wrap = selected
      ? valid.filter(function (w) {
          return w.candidate.id === selected.id;
        })[0]
      : null;
    if (!wrap && generated.status === "no-candidate") {
      return resultFromSelection(summit, access, summitRoute, az, generated, valid, null);
    }
    if (!wrap) {
      generated.status = valid.length ? generated.status : generated.candidates.length ? "all-candidates-failed" : "no-candidate";
      generated.reason = generated.reason || (valid.length ? null : "All AZ-entry candidate routes failed validation.");
      return resultFromSelection(summit, access, summitRoute, az, generated, valid, null);
    }
    return resultFromSelection(summit, access, summitRoute, az, generated, valid, wrap);
  }

  function cacheKey(summit, access, az) {
    var sid = summit && (summit.id || summit.reference) ? summit.id || summit.reference : "unknown";
    var osm = access && access.osmType && access.osmId != null ? access.osmType + "/" + access.osmId : "none";
    var ident = azIdentity(az);
    return (
      ALGORITHM_VERSION +
      ":" +
      sid +
      ":" +
      osm +
      ":pedestrian:valhalla:" +
      (ident.azCalculationVersion || "az-unknown") +
      ":cells" +
      (ident.azCellCount != null ? ident.azCellCount : "na") +
      ":th" +
      (ident.azThresholdM != null ? ident.azThresholdM : "na") +
      ":" +
      CANDIDATE_METHOD +
      ":" +
      SELECTION_CRITERION
    );
  }

  var api = {
    ALGORITHM_VERSION: ALGORITHM_VERSION,
    CANDIDATE_METHOD: CANDIDATE_METHOD,
    SELECTION_CRITERION: SELECTION_CRITERION,
    SELECTION_LABEL: SELECTION_LABEL,
    DESTINATION_MODE: DESTINATION_MODE,
    emptyResult: emptyResult,
    generateCandidates: generateCandidates,
    prefixGeometry: prefixGeometry,
    clipGeometryToDistance: clipGeometryToDistance,
    validateCandidate: validateCandidate,
    selectCandidate: selectCandidate,
    compareCandidates: compareCandidates,
    buildPrefixRoute: buildPrefixRoute,
    deriveAzRoute: deriveAzRoute,
    cacheKey: cacheKey,
    lengthKm: lengthKm
  };

  global.SignalTerrainSotaAzRouteModel = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.AzRouteModel = api;
})(typeof window !== "undefined" ? window : globalThis);
