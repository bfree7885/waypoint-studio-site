/**
 * Route-to-Activation-Zone provider for SignalTerrain (SOTA).
 *
 * Loads the V0.3 summit route and V0.4/V0.5 AZ, then derives a prefix that
 * first enters the AZ. CI uses labeled fixtures via those providers — this
 * module does not call Valhalla, Overpass, or 3DEP itself.
 */
(function (global) {
  "use strict";

  var memoryCache = {};

  function Model() {
    return global.SignalTerrainSotaAzRouteModel;
  }

  function Route() {
    return global.SignalTerrainSotaRoute;
  }

  function Az() {
    return global.SignalTerrainSotaAz;
  }

  function cacheKey(summit, access, az) {
    return Model().cacheKey(summit, access, az);
  }

  function loadAzRoute(summit, access, options) {
    var opts = options || {};
    var M = Model();
    if (!M) {
      return Promise.resolve(
        { status: "generation-failed", reason: "Route-to-AZ model missing — load ss-az-route-model.js first.", destinationMode: "activation-zone" }
      );
    }
    if (!summit || !access) {
      return Promise.resolve(M.emptyResult({ summitId: summit && summit.id, access: access }, "invalid-start", "Select a mapped parking area or trailhead to start the hike."));
    }
    var routeP = opts.summitRoute
      ? Promise.resolve(opts.summitRoute)
      : Route()
        ? Route().loadRoute(summit, access, { live: opts.live, force: opts.force })
        : Promise.resolve(null);
    var azP = opts.az
      ? Promise.resolve(opts.az)
      : Az()
        ? Az().loadActivationZone(summit, { live: opts.live, force: opts.force })
        : Promise.resolve(null);
    return Promise.all([routeP, azP]).then(function (pair) {
      var summitRoute = pair[0];
      var az = pair[1];
      var key = cacheKey(summit, access, az);
      if (!opts.force && memoryCache[key]) return memoryCache[key];
      var result = M.deriveAzRoute(summit, access, summitRoute, az);
      if (result && result.status === "ok") memoryCache[key] = result;
      return result;
    });
  }

  function clearCache() {
    memoryCache = {};
  }

  var api = {
    loadAzRoute: loadAzRoute,
    clearCache: clearCache,
    cacheKey: function (summit, access, az) {
      return Model() ? Model().cacheKey(summit, access, az) : "";
    }
  };

  global.SignalTerrainSotaAzRoute = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.AzRoute = api;
})(typeof window !== "undefined" ? window : globalThis);
