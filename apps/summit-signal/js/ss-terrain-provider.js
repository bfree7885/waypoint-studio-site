/**
 * USGS 3DEP elevation provider for SignalTerrain (SOTA).
 *
 * Calculated route → this module → TerrainModel → profile / gain.
 * Default: labeled 3DEP fixtures for the Slide acceptance routes.
 * Optional live: ?route=live=1. Elevation failure must not destroy a valid route.
 */
(function (global) {
  "use strict";

  var SAMPLES_URL = "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/getSamples";
  var TIMEOUT_MS = 20000;
  var FIXTURES = {
    "way/816358667": "data/st-sota-elev-w2-gc-001-slide-parking.json",
    "way/816358666": "data/st-sota-elev-w2-gc-001-giant-ledge.json",
    "way/338567127": "data/st-sota-elev-w2-gc-002-becker-hollow.json"
  };
  var memoryCache = {};

  function TerrainModel() {
    return global.SignalTerrainSotaTerrainModel;
  }

  function accessKey(access) {
    if (!access || !access.osmType || access.osmId == null) return "";
    return access.osmType + "/" + access.osmId;
  }

  function cacheKey(route) {
    var ver = (TerrainModel() && TerrainModel().QUERY_VERSION) || "signalterrain-sota-elev-v0";
    var id = (route && route.start && route.start.osmType && route.start.osmId != null
      ? route.start.osmType + "/" + route.start.osmId
      : "none");
    var dist = route && route.distanceKm != null ? String(Math.round(route.distanceKm * 1000)) : "0";
    return ver + ":" + id + ":" + dist;
  }

  function wantsLive(search) {
    try {
      var q = search || (global.location && global.location.search) || "";
      return /(?:\?|&)route=live=1(?:&|$)/.test(q);
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

  function simplifyGeometry(geometry, maxPts) {
    var max = maxPts || 120;
    if (!geometry || geometry.length <= max) return geometry || [];
    var step = Math.max(1, Math.ceil((geometry.length - 1) / (max - 1)));
    var out = [];
    for (var i = 0; i < geometry.length; i += step) out.push(geometry[i]);
    var last = geometry[geometry.length - 1];
    if (out[out.length - 1] !== last) out.push(last);
    return out;
  }

  function loadFixture(route) {
    var Model = TerrainModel();
    var url = route && route.start ? FIXTURES[accessKey(route.start)] : null;
    if (!url) {
      return Promise.resolve(
        Model.emptyProfile({ routeId: cacheKey(route) }, "unavailable", "No labeled USGS 3DEP fixture exists for this route. Live elevation was not requested.")
      );
    }
    return timeoutFetch(url, { headers: { Accept: "application/json" } }, TIMEOUT_MS)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (payload) {
        var profile = Model.normalizeSamples(payload, route, { routeId: cacheKey(route) });
        if (profile.status === "ok" || profile.status === "partial") profile.source.developmentFixture = true;
        if (route && route.destinationMode === "activation-zone" && route.distanceKm != null && (profile.status === "ok" || profile.status === "partial")) {
          profile = Model.clipProfile(profile, route.distanceKm);
        }
        return profile;
      })
      .catch(function (err) {
        return Model.emptyProfile(
          { routeId: cacheKey(route) },
          "unavailable",
          "Elevation data unavailable (" + String(err && err.message ? err.message : err) + ")."
        );
      });
  }

  function loadLive(route) {
    var Model = TerrainModel();
    var geom = simplifyGeometry(route.geometry, 120);
    var path = geom.map(function (p) {
      return [p.lng, p.lat];
    });
    var geometry = JSON.stringify({ paths: [path], spatialReference: { wkid: 4326 } });
    var qs =
      "f=json&geometryType=esriGeometryPolyline&interpolation=RSP_BilinearInterpolation&returnFirstValueOnly=true&sampleCount=" +
      encodeURIComponent(String(Math.min(180, Math.max(80, geom.length)))) +
      "&geometry=" +
      encodeURIComponent(geometry);
    return timeoutFetch(SAMPLES_URL + "?" + qs, { headers: { Accept: "application/json" } }, TIMEOUT_MS)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (payload) {
        var profile = Model.normalizeSamples(payload, route, { routeId: cacheKey(route) });
        if (route && route.destinationMode === "activation-zone" && route.distanceKm != null && (profile.status === "ok" || profile.status === "partial")) {
          profile = Model.clipProfile(profile, route.distanceKm);
        }
        return profile;
      })
      .catch(function (err) {
        var aborted = err && (err.name === "AbortError" || /abort/i.test(String(err)));
        if (aborted) {
          return Model.emptyProfile({ routeId: cacheKey(route) }, "timeout", "Elevation request timed out.");
        }
        return loadFixture(route).then(function (profile) {
          if (profile.status === "ok" || profile.status === "partial") {
            profile.reason = "Live USGS 3DEP failed; using the labeled development fixture.";
            return profile;
          }
          return Model.emptyProfile({ routeId: cacheKey(route) }, "unavailable", "Elevation data unavailable.");
        });
      });
  }

  function loadElevation(route, options) {
    var opts = options || {};
    var Model = TerrainModel();
    if (!route || route.status !== "ok" || !route.geometry || route.geometry.length < 2) {
      return Promise.resolve(Model.emptyProfile({}, "unavailable", "Elevation needs a calculated route."));
    }
    var key = cacheKey(route);
    if (!opts.force && memoryCache[key]) return Promise.resolve(memoryCache[key]);
    var live = opts.live != null ? opts.live : wantsLive();
    var p = live ? loadLive(route) : loadFixture(route);
    return p.then(function (profile) {
      memoryCache[key] = profile;
      return profile;
    });
  }

  function clearCache() {
    memoryCache = {};
  }

  var api = {
    SAMPLES_URL: SAMPLES_URL,
    TIMEOUT_MS: TIMEOUT_MS,
    loadElevation: loadElevation,
    clearCache: clearCache,
    simplifyGeometry: simplifyGeometry
  };

  global.SignalTerrainSotaTerrain = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Terrain = api;
})(typeof window !== "undefined" ? window : globalThis);
