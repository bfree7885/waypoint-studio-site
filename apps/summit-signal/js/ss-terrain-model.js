/**
 * USGS 3DEP elevation sampling and ascent/descent for SignalTerrain (SOTA).
 * Does not invent elevations. V0.4 activation-zone work can reuse sample helpers.
 */
(function (global) {
  "use strict";

  var QUERY_VERSION = "signalterrain-sota-elev-v0";
  var NOISE_M = 3;
  var SMOOTH_WINDOW = 5;
  var SAMPLE_SPACING_M = 30;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function parseMeters(v) {
    if (v == null || v === "" || v === "NoData") return null;
    var n = typeof v === "number" ? v : parseFloat(v);
    return isFiniteNumber(n) ? n : null;
  }

  function movingAverage(values, windowSize) {
    var w = windowSize || SMOOTH_WINDOW;
    var half = Math.floor(w / 2);
    var out = [];
    for (var i = 0; i < values.length; i += 1) {
      var sum = 0;
      var n = 0;
      for (var j = i - half; j <= i + half; j += 1) {
        if (j < 0 || j >= values.length || !isFiniteNumber(values[j])) continue;
        sum += values[j];
        n += 1;
      }
      out.push(n ? sum / n : values[i]);
    }
    return out;
  }

  function accumulate(smoothed) {
    var gain = 0;
    var loss = 0;
    for (var i = 1; i < smoothed.length; i += 1) {
      if (!isFiniteNumber(smoothed[i]) || !isFiniteNumber(smoothed[i - 1])) continue;
      var d = smoothed[i] - smoothed[i - 1];
      if (Math.abs(d) < 0.05) continue;
      if (d > 0) gain += d;
      else loss += -d;
    }
    return { gainM: gain, lossM: loss };
  }

  function emptyProfile(query, status, reason, extra) {
    var q = query || {};
    return Object.assign(
      {
        status: status,
        reason: reason || null,
        queryVersion: QUERY_VERSION,
        provider: "usgs-3dep",
        retrievedAt: null,
        points: [],
        gainM: null,
        lossM: null,
        startM: null,
        endM: null,
        maxM: null,
        minM: null,
        gainLabel: null,
        lossLabel: null,
        methodology:
          "USGS 3DEP samples sorted along the route, then a 5-point moving average. Cumulative gain/loss sums smoothed rises and falls.",
        attribution: "Elevation from USGS 3DEP (The National Map).",
        source: { provider: "usgs-3dep", developmentFixture: false }
      },
      extra || {}
    );
  }

  function formatElev(Geo, meters) {
    if (!Geo || typeof Geo.formatElevationM !== "function") return null;
    try {
      return Geo.formatElevationM(meters);
    } catch (e) {
      return null;
    }
  }

  function normalizeSamples(payload, route, query) {
    var q = query || {};
    var Geo = global.SignalTerrainSotaGeo;
    if (!payload || typeof payload !== "object") {
      return emptyProfile(q, "unavailable", "Malformed elevation response.");
    }
    if (payload.error || payload.error_code) {
      return emptyProfile(q, "unavailable", "Elevation service unavailable.");
    }
    var raw = Array.isArray(payload.samples) ? payload.samples.slice() : [];
    if (!raw.length) {
      return emptyProfile(q, "unavailable", "Elevation data unavailable along this route.");
    }
    raw.sort(function (a, b) {
      return (a.locationId || 0) - (b.locationId || 0);
    });
    var points = [];
    var distKm = 0;
    var prev = null;
    var missing = 0;
    for (var i = 0; i < raw.length; i += 1) {
      var s = raw[i];
      var loc = s.location || {};
      var lat = isFiniteNumber(loc.y) ? loc.y : null;
      var lng = isFiniteNumber(loc.x) ? loc.x : null;
      var elev = parseMeters(s.value);
      if (lat == null || lng == null) {
        missing += 1;
        continue;
      }
      if (prev && Geo) {
        var step = Geo.haversineKm(prev.lat, prev.lng, lat, lng);
        if (step != null) distKm += step;
      }
      points.push({
        lat: lat,
        lng: lng,
        elevM: elev,
        distanceKm: distKm,
        resolutionM: isFiniteNumber(s.resolution) ? s.resolution : null
      });
      prev = { lat: lat, lng: lng };
      if (elev == null) missing += 1;
    }
    var valid = points.filter(function (p) {
      return isFiniteNumber(p.elevM);
    });
    if (valid.length < 5) {
      return emptyProfile(q, "unavailable", "Too few elevation samples to build a profile.");
    }
    var series = valid.map(function (p) {
      return p.elevM;
    });
    var smoothed = movingAverage(series, SMOOTH_WINDOW);
    for (var k = 0; k < valid.length; k += 1) valid[k].elevSmoothM = smoothed[k];
    var acc = accumulate(smoothed);
    var startM = smoothed[0];
    var endM = smoothed[smoothed.length - 1];
    var maxM = Math.max.apply(null, smoothed);
    var minM = Math.min.apply(null, smoothed);
    var src = payload.source || {};
    var status = missing > 0 && missing < raw.length ? "partial" : "ok";
    return {
      status: status,
      reason:
        status === "partial"
          ? "Some elevation samples were missing; gain uses the remaining USGS 3DEP points."
          : null,
      queryVersion: QUERY_VERSION,
      provider: "usgs-3dep",
      retrievedAt: src.retrievedAt || new Date().toISOString(),
      routeId: q.routeId || null,
      points: valid,
      gainM: acc.gainM,
      lossM: acc.lossM,
      startM: startM,
      endM: endM,
      maxM: maxM,
      minM: minM,
      gainLabel: formatElev(Geo, acc.gainM),
      lossLabel: formatElev(Geo, acc.lossM),
      startLabel: formatElev(Geo, startM),
      endLabel: formatElev(Geo, endM),
      maxLabel: formatElev(Geo, maxM),
      noiseThresholdM: NOISE_M,
      smoothWindow: SMOOTH_WINDOW,
      sampleSpacingM: SAMPLE_SPACING_M,
        methodology:
          "USGS 3DEP samples sorted along the route, then a 5-point moving average. Cumulative gain/loss sums smoothed rises and falls. The moving average is the noise filter; gain is not summit elevation minus parking elevation.",
      attribution: "Elevation from USGS 3DEP (The National Map).",
      source: {
        provider: "usgs-3dep",
        endpoint: src.endpoint || "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/getSamples",
        developmentFixture: !!src.developmentFixture,
        units: "meters",
        interpolation: src.interpolation || "bilinear"
      }
    };
  }

  /**
   * Clip a normalized 3DEP profile to a prefix distance and recompute
   * smoothing + gain/loss. Used for Route-to-AZ geometry that is a validated
   * subroute of a summit-route fixture. Does not scale summit gain.
   */
  function clipProfile(elev, maxDistanceKm) {
    if (!elev) return emptyProfile({}, "unavailable", "Elevation needs a calculated route.");
    if (elev.status !== "ok" && elev.status !== "partial") return elev;
    if (!isFiniteNumber(maxDistanceKm)) return elev;
    var srcPts = elev.points || [];
    var clipped = [];
    for (var i = 0; i < srcPts.length; i += 1) {
      if ((srcPts[i].distanceKm || 0) <= maxDistanceKm + 1e-9) clipped.push(srcPts[i]);
    }
    if (clipped.length < 5) {
      return emptyProfile(
        { routeId: elev.routeId },
        "unavailable",
        "Too few elevation samples on the Route-to-AZ prefix. The calculated AZ route is still shown."
      );
    }
    var series = clipped.map(function (p) {
      return p.elevM;
    });
    var smoothed = movingAverage(series, SMOOTH_WINDOW);
    var points = [];
    for (var k = 0; k < clipped.length; k += 1) {
      points.push({
        lat: clipped[k].lat,
        lng: clipped[k].lng,
        elevM: clipped[k].elevM,
        distanceKm: clipped[k].distanceKm,
        resolutionM: clipped[k].resolutionM,
        elevSmoothM: smoothed[k]
      });
    }
    var acc = accumulate(smoothed);
    var startM = smoothed[0];
    var endM = smoothed[smoothed.length - 1];
    var maxM = Math.max.apply(null, smoothed);
    var minM = Math.min.apply(null, smoothed);
    var Geo = global.SignalTerrainSotaGeo;
    return {
      status: elev.status,
      reason: elev.reason,
      queryVersion: QUERY_VERSION,
      provider: "usgs-3dep",
      retrievedAt: elev.retrievedAt,
      routeId: elev.routeId,
      points: points,
      gainM: acc.gainM,
      lossM: acc.lossM,
      startM: startM,
      endM: endM,
      maxM: maxM,
      minM: minM,
      gainLabel: formatElev(Geo, acc.gainM),
      lossLabel: formatElev(Geo, acc.lossM),
      startLabel: formatElev(Geo, startM),
      endLabel: formatElev(Geo, endM),
      maxLabel: formatElev(Geo, maxM),
      noiseThresholdM: NOISE_M,
      smoothWindow: SMOOTH_WINDOW,
      sampleSpacingM: SAMPLE_SPACING_M,
      clippedToKm: maxDistanceKm,
      methodology:
        "USGS 3DEP samples along the Valhalla geometry, clipped to the Route-to-AZ prefix distance, then a 5-point moving average. Cumulative gain/loss is recomputed on the prefix samples — not a scaled summit-route total.",
      attribution: elev.attribution || "Elevation from USGS 3DEP (The National Map).",
      source: elev.source || { provider: "usgs-3dep", developmentFixture: false }
    };
  }

  /**
   * Reserved for V0.4 SOTA activation-zone contours from the same DEM.
   * V0.3 does not draw an activation-zone polygon.
   */
  function describeActivationZoneCapability() {
    return {
      available: false,
      reason:
        "A SOTA activation zone is a ~25 m vertical contour, not a circle. V0.3 samples elevation along a hike only. Zone polygons wait for a DEM contour step."
    };
  }

  var api = {
    QUERY_VERSION: QUERY_VERSION,
    NOISE_M: NOISE_M,
    SMOOTH_WINDOW: SMOOTH_WINDOW,
    SAMPLE_SPACING_M: SAMPLE_SPACING_M,
    movingAverage: movingAverage,
    accumulate: accumulate,
    emptyProfile: emptyProfile,
    normalizeSamples: normalizeSamples,
    clipProfile: clipProfile,
    describeActivationZoneCapability: describeActivationZoneCapability
  };

  global.SignalTerrainSotaTerrainModel = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.TerrainModel = api;
})(typeof window !== "undefined" ? window : globalThis);
