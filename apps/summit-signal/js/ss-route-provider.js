/**
 * Hiking routing provider for SignalTerrain (SOTA).
 *
 * Selected access + summit → this module → RouteModel → map / Plan the Hike.
 * Default: labeled Valhalla fixtures for Slide Mountain parking and Giant Ledge.
 * Optional live: ?route=live=1 (FOSSGIS Valhalla demo — development only).
 * Never draws a straight line or stitches OSM fragments.
 */
(function (global) {
  "use strict";

  var VALHALLA_URL = "https://valhalla1.openstreetmap.de/route";
  var TIMEOUT_MS = 20000;
  var FIXTURES = {
    "way/816358667": "data/st-sota-route-w2-gc-001-slide-parking.json",
    "way/816358666": "data/st-sota-route-w2-gc-001-giant-ledge.json",
    "way/338567127": "data/st-sota-route-w2-gc-002-becker-hollow.json"
  };
  var memoryCache = {};

  function RouteModel() {
    return global.SignalTerrainSotaRouteModel;
  }

  function cacheKey(summit, access) {
    return RouteModel().routeId(summit, access);
  }

  function wantsLive(search) {
    try {
      var q = search || (global.location && global.location.search) || "";
      return /(?:\?|&)route=live=1(?:&|$)/.test(q);
    } catch (e) {
      return false;
    }
  }

  function accessKey(access) {
    if (!access || !access.osmType || access.osmId == null) return "";
    return access.osmType + "/" + access.osmId;
  }

  function fixtureUrl(summit, access) {
    if (!summit || !access) return null;
    return FIXTURES[accessKey(access)] || null;
  }

  function queryFor(summit, access) {
    var Model = RouteModel();
    return {
      start: Model.startFromAccess(access),
      destination: Model.destinationForSummit(summit),
      access: Model.startFromAccess(access),
      summitId: summit && summit.id
    };
  }

  function timeoutFetch(url, options, ms) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = null;
    var opts = options || {};
    if (ctrl) opts.signal = ctrl.signal;
    var p = global.fetch(url, opts);
    if (!ctrl) return p;
    timer = setTimeout(function () {
      ctrl.abort();
    }, ms || TIMEOUT_MS);
    return p.finally(function () {
      clearTimeout(timer);
    });
  }

  function valhallaBody(summit, access) {
    return {
      locations: [
        { lon: access.lng, lat: access.lat, type: "break" },
        { lon: summit.lng, lat: summit.lat, type: "break" }
      ],
      costing: "pedestrian",
      costing_options: {
        pedestrian: {
          use_trails: 1,
          max_hiking_difficulty: 3
        }
      },
      directions_options: { units: "kilometers" }
    };
  }

  function loadJson(url) {
    return timeoutFetch(url, { headers: { Accept: "application/json" } }, TIMEOUT_MS).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function normalize(payload, summit, access) {
    return RouteModel().normalizeValhalla(payload, queryFor(summit, access));
  }

  function loadFixture(summit, access) {
    var url = fixtureUrl(summit, access);
    var Model = RouteModel();
    var q = queryFor(summit, access);
    if (!access || access.lat == null) {
      return Promise.resolve(Model.emptyRoute(q, "invalid-start", "Select a mapped parking area or trailhead to start the hike."));
    }
    if (!url) {
      return Promise.resolve(
        Model.emptyRoute(
          q,
          "unavailable",
          "No labeled hiking-route fixture exists for this access point. Live Valhalla was not requested."
        )
      );
    }
    return loadJson(url).then(
      function (payload) {
        var route = normalize(payload, summit, access);
        if (route.status === "ok") route.source.developmentFixture = true;
        return route;
      },
      function (err) {
        return Model.emptyRoute(q, "unavailable", "Hiking route unavailable (" + String(err && err.message ? err.message : err) + ").");
      }
    );
  }

  function loadLive(summit, access) {
    var Model = RouteModel();
    var q = queryFor(summit, access);
    var body = JSON.stringify(valhallaBody(summit, access));
    return timeoutFetch(
      VALHALLA_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "SignalTerrain-SOTA/0.3 (Waypoint unpublished)"
        },
        body: body
      },
      TIMEOUT_MS
    )
      .then(function (res) {
        return res.json().then(function (payload) {
          payload.status_code = res.status;
          return payload;
        });
      })
      .then(function (payload) {
        return normalize(payload, summit, access);
      })
      .catch(function (err) {
        var aborted = err && (err.name === "AbortError" || /abort/i.test(String(err)));
        if (aborted) {
          return Model.emptyRoute(q, "timeout", "Routing request timed out.");
        }
        return loadFixture(summit, access).then(function (route) {
          if (route.status === "ok") {
            route.reason = "Live Valhalla failed; using the labeled development fixture.";
            return route;
          }
          return Model.emptyRoute(q, "unavailable", "Routing service unavailable.");
        });
      });
  }

  function loadRoute(summit, access, options) {
    var opts = options || {};
    var Model = RouteModel();
    var q = queryFor(summit, access);
    if (!summit || !access) {
      return Promise.resolve(Model.emptyRoute(q, "invalid-start", "Select a mapped parking area or trailhead to start the hike."));
    }
    var key = cacheKey(summit, access);
    if (!opts.force && memoryCache[key]) return Promise.resolve(memoryCache[key]);
    var live = opts.live != null ? opts.live : wantsLive();
    var p = live ? loadLive(summit, access) : loadFixture(summit, access);
    return p.then(function (route) {
      memoryCache[key] = route;
      try {
        if (global.sessionStorage && route.status === "ok") {
          global.sessionStorage.setItem(key, JSON.stringify({ retrievedAt: route.retrievedAt, distanceKm: route.distanceKm }));
        }
      } catch (e) {}
      return route;
    });
  }

  function clearCache() {
    memoryCache = {};
  }

  var api = {
    VALHALLA_URL: VALHALLA_URL,
    TIMEOUT_MS: TIMEOUT_MS,
    loadRoute: loadRoute,
    clearCache: clearCache,
    wantsLive: wantsLive,
    fixtureUrl: fixtureUrl
  };

  global.SignalTerrainSotaRoute = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Route = api;
})(typeof window !== "undefined" ? window : globalThis);
