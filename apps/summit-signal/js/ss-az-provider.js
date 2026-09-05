/**
 * Activation Zone provider for SignalTerrain (SOTA).
 *
 * Default: labeled USGS 3DEP grid fixtures for Slide (W2/GC-001) and
 * Hunter (W2/GC-002). Live opt-in: ?az=live=1 or ?route=live=1.
 * Other W2 summits without a fixture stay unsupported-region unless live.
 * AZ failure must not break SOTA, access, or hiking routing.
 */
(function (global) {
  "use strict";

  var SAMPLES_URL = "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/getSamples";
  var TIMEOUT_MS = 25000;
  var FIXTURES = {
    "W2/GC-001": "data/st-sota-az-dem-w2-gc-001.json",
    "W2/GC-002": "data/st-sota-az-dem-w2-gc-002.json"
  };
  var memoryCache = {};

  function Model() {
    return global.SignalTerrainSotaAzModel;
  }
  function Rules() {
    return global.SignalTerrainSotaRules;
  }

  function cacheKey(summit, rule, live) {
    var ver = (Model() && Model().ALGORITHM_VERSION) || "signalterrain-sota-az-v0";
    var id = summit && (summit.id || summit.reference) || "none";
    var vd = rule && rule.verticalDistanceM != null ? String(rule.verticalDistanceM) : "na";
    var elev = summit && summit.elevationM != null ? String(Math.round(summit.elevationM * 10)) : "na";
    return ver + ":" + id + ":usgs-3dep:" + (rule && rule.source && rule.source.id) + ":vd" + vd + ":e" + elev + (live ? ":live" : ":fixture");
  }

  function wantsLive(search) {
    try {
      var q = search || (global.location && global.location.search) || "";
      return /(?:\?|&)(?:az=live=1|route=live=1)(?:&|$)/.test(q);
    } catch (e) {
      return false;
    }
  }

  function timeoutFetch(url, options, ms) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var opts = options || {};
    if (ctrl) opts.signal = ctrl.signal;
    var p = global.fetch(url, opts);
    if (!ctrl) return p;
    var timer = setTimeout(function () {
      ctrl.abort();
    }, ms || TIMEOUT_MS);
    return p.finally(function () {
      clearTimeout(timer);
    });
  }

  function loadFixtureDem(summit) {
    var id = summit && (summit.id || summit.reference);
    var url = FIXTURES[id];
    if (!url) return Promise.resolve(null);
    return timeoutFetch(url, { headers: { Accept: "application/json" } }, TIMEOUT_MS).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function loadLiveDem(summit) {
    var Geo = global.SignalTerrainSotaGeo;
    var rows = 41;
    var cols = 41;
    var half = 200;
    var points = [];
    var r;
    var c;
    for (r = 0; r < rows; r += 1) {
      var northM = half - (r / (rows - 1)) * (2 * half);
      for (c = 0; c < cols; c += 1) {
        var eastM = -half + (c / (cols - 1)) * (2 * half);
        var p = Geo.destinationOffset(summit.lat, summit.lng, northM, eastM);
        points.push({ r: r, c: c, lat: p.lat, lng: p.lng });
      }
    }
    var elevations = new Array(rows * cols).fill(null);
    var BATCH = 120;
    function batch(i) {
      if (i >= points.length) {
        var nw = points[0];
        var se = points[points.length - 1];
        return {
          source: {
            provider: "usgs-3dep",
            product: "USGS 3DEP Bare Earth DEM Dynamic ImageServer",
            endpoint: SAMPLES_URL,
            interpolation: "bilinear",
            developmentFixture: false,
            retrievedAt: new Date().toISOString(),
            summitId: summit.id,
            units: "meters"
          },
          grid: {
            rows: rows,
            cols: cols,
            cellSizeM: (2 * half) / (cols - 1),
            nw: { lat: nw.lat, lng: nw.lng },
            se: { lat: se.lat, lng: se.lng }
          },
          elevations: elevations
        };
      }
      var chunk = points.slice(i, i + BATCH);
      var geometry = JSON.stringify({
        points: chunk.map(function (p) {
          return [p.lng, p.lat];
        }),
        spatialReference: { wkid: 4326 }
      });
      var qs =
        "f=json&geometryType=esriGeometryMultipoint&interpolation=RSP_BilinearInterpolation&returnFirstValueOnly=true&geometry=" +
        encodeURIComponent(geometry);
      return timeoutFetch(SAMPLES_URL + "?" + qs, { headers: { Accept: "application/json" } }, TIMEOUT_MS)
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (payload) {
          (payload.samples || []).forEach(function (s, idx) {
            var pt = chunk[s.locationId != null ? s.locationId : idx];
            if (!pt) return;
            var n = typeof s.value === "number" ? s.value : parseFloat(s.value);
            elevations[pt.r * cols + pt.c] = isFinite(n) ? n : null;
          });
          return batch(i + BATCH);
        });
    }
    return batch(0);
  }

  function loadActivationZone(summit, options) {
    var opts = options || {};
    var M = Model();
    var R = Rules();
    if (!M || !R) {
      return Promise.resolve(M ? M.emptyAz({}, "rule-unavailable", "Activation Zone engine missing.") : { status: "unavailable" });
    }
    if (!summit) {
      return Promise.resolve(M.emptyAz({}, "malformed", "No summit selected."));
    }
    var assoc = R.associationCodeOf(summit);
    if (assoc && assoc !== "W2" && !FIXTURES[summit.id] && !opts.live) {
      return Promise.resolve(
        M.emptyAz(
          { summitId: summit.id, coordinate: { lat: summit.lat, lng: summit.lng } },
          "unsupported-region",
          "No labeled USGS 3DEP Activation Zone grid exists for this summit. Live DEM was not requested."
        )
      );
    }
    var rule = R.ruleForSummit(summit);
    var live = opts.live != null ? opts.live : wantsLive();
    var key = cacheKey(summit, rule, live);
    if (!opts.force && memoryCache[key]) return Promise.resolve(memoryCache[key]);
    var demP = live ? loadLiveDem(summit) : loadFixtureDem(summit);
    return demP
      .then(function (dem) {
        if (!dem) {
          return M.emptyAz(
            { summitId: summit.id, coordinate: { lat: summit.lat, lng: summit.lng }, rule: rule },
            live ? "dem-unavailable" : "unsupported-region",
            live
              ? "USGS 3DEP Activation Zone grid could not be retrieved."
              : "No labeled USGS 3DEP Activation Zone grid exists for this summit. Live DEM was not requested."
          );
        }
        if (dem.source && !live) dem.source.developmentFixture = true;
        return M.computeAz(summit, dem, { rule: rule });
      })
      .catch(function (err) {
        var aborted = err && (err.name === "AbortError" || /abort/i.test(String(err)));
        return M.emptyAz(
          { summitId: summit.id, rule: rule },
          aborted ? "dem-unavailable" : "dem-unavailable",
          aborted ? "DEM request timed out." : "DEM unavailable (" + String(err && err.message ? err.message : err) + ")."
        );
      })
      .then(function (az) {
        memoryCache[key] = az;
        return az;
      });
  }

  function clearCache() {
    memoryCache = {};
  }

  var api = {
    SAMPLES_URL: SAMPLES_URL,
    loadActivationZone: loadActivationZone,
    clearCache: clearCache,
    cacheKey: cacheKey,
    wantsLive: wantsLive
  };

  global.SignalTerrainSotaAz = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Az = api;
})(typeof window !== "undefined" ? window : globalThis);
