/**
 * OSM access-data provider for SignalTerrain (SOTA).
 *
 * Selected summit → this module → AccessModel → map / Summit Detail.
 * Default: labeled fixture of real retrieved OSM records for W2/GC-001.
 * Optional live Overpass: ?access=live=1 (falls back to the fixture for Slide,
 * otherwise an honest unavailable state). Never invents access features.
 */
(function (global) {
  "use strict";

  var FIXTURE_URL = "data/st-sota-access-w2-gc-001.json";
  var FIXTURES = {
    "W2/GC-001": "data/st-sota-access-w2-gc-001.json",
    "W2/GC-002": "data/st-sota-access-w2-gc-002.json"
  };
  var OVERPASS_URL = "https://overpass-api.de/api/interpreter";
  var TIMEOUT_MS = 15000;
  var memoryCache = {};

  function AccessModel() {
    return global.SignalTerrainSotaAccessModel;
  }

  function radiusM() {
    var Model = AccessModel();
    return Model && Model.DEFAULT_RADIUS_M ? Model.DEFAULT_RADIUS_M : 5000;
  }

  function cacheKey(summitId, r) {
    var ver = (AccessModel() && AccessModel().QUERY_VERSION) || "signalterrain-sota-access-v0";
    return ver + ":" + String(summitId || "") + ":" + String(r || radiusM());
  }

  function wantsLive(search) {
    try {
      var q = search || (global.location && global.location.search) || "";
      return /(?:\?|&)access=live=1(?:&|$)/.test(q);
    } catch (e) {
      return false;
    }
  }

  function overpassQuery(lat, lng, r) {
    return (
      "[out:json][timeout:25];\n" +
      "(\n" +
      '  way["highway"~"^(path|footway|track)$"](around:' +
      r +
      "," +
      lat +
      "," +
      lng +
      ");\n" +
      '  node["highway"="trailhead"](around:' +
      r +
      "," +
      lat +
      "," +
      lng +
      ");\n" +
      '  node["amenity"="parking"](around:' +
      r +
      "," +
      lat +
      "," +
      lng +
      ");\n" +
      '  way["amenity"="parking"](around:' +
      r +
      "," +
      lat +
      "," +
      lng +
      ");\n" +
      ");\n" +
      "out geom;\n" +
      'relation["route"="hiking"](around:' +
      r +
      "," +
      lat +
      "," +
      lng +
      ");\n" +
      "out tags;"
    );
  }

  function fetchJson(url, options) {
    var opts = options || {};
    var ctrl = typeof global.AbortController === "function" ? new global.AbortController() : null;
    var timer = null;
    if (ctrl) {
      timer = setTimeout(function () {
        try {
          ctrl.abort();
        } catch (e) {
          /* ignore */
        }
      }, opts.timeoutMs || TIMEOUT_MS);
    }
    return global
      .fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: ctrl ? ctrl.signal : undefined
      })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
        return res.json();
      })
      .finally(function () {
        if (timer) clearTimeout(timer);
      });
  }

  function readSession(key) {
    try {
      if (!global.sessionStorage) return null;
      var raw = global.sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeSession(key, payload) {
    try {
      if (global.sessionStorage) global.sessionStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      /* quota / private mode */
    }
  }

  function queryMeta(summit, r) {
    return {
      radiusM: r,
      lat: summit && summit.lat,
      lng: summit && summit.lng,
      summitId: summit && (summit.id || summit.reference)
    };
  }

  function unavailable(summit, reason, extra) {
    var Model = AccessModel();
    var catalog = Model.emptyCatalog(queryMeta(summit, radiusM()), "unavailable", reason, extra || {});
    catalog.meta = Object.assign({ mode: "unavailable" }, extra && extra.meta ? extra.meta : {});
    return catalog;
  }

  function defaultFixtureUrl(summit) {
    var id = summit && (summit.id || summit.reference);
    return (id && FIXTURES[id]) || null;
  }

  function fixtureMatches(payload, summit) {
    var sid = summit && (summit.id || summit.reference);
    var src = payload && payload.source ? payload.source : {};
    return sid && src.summitId && String(src.summitId) === String(sid);
  }

  function fromFixturePayload(payload, summit, extraMeta) {
    var Model = AccessModel();
    var catalog = Model.normalizeFixture(payload, summit, queryMeta(summit, radiusM()));
    catalog.meta = Object.assign(
      {
        mode: "fixture",
        liveAttempted: false,
        liveError: null,
        cache: "memory"
      },
      extraMeta || {}
    );
    return catalog;
  }

  function loadFixture(summit, fixtureUrl, extraMeta) {
    return fetchJson(fixtureUrl || FIXTURE_URL, { timeoutMs: TIMEOUT_MS }).then(function (payload) {
      if (!fixtureMatches(payload, summit)) {
        var miss = unavailable(
          summit,
          "No labeled OpenStreetMap fixture exists for this summit. Live Overpass was not requested."
        );
        memoryCache[cacheKey(summit.id || summit.reference, radiusM())] = miss;
        return miss;
      }
      var catalog = fromFixturePayload(payload, summit, extraMeta);
      memoryCache[cacheKey(catalog.query.summitId, catalog.query.radiusM)] = catalog;
      writeSession(cacheKey(catalog.query.summitId, catalog.query.radiusM), {
        payload: payload,
        meta: catalog.meta
      });
      return catalog;
    });
  }

  function loadLive(summit, opts) {
    var r = radiusM();
    var q = overpassQuery(summit.lat, summit.lng, r);
    var url = OVERPASS_URL + "?data=" + encodeURIComponent(q);
    return fetchJson(url, { timeoutMs: opts.timeoutMs || TIMEOUT_MS })
      .then(function (raw) {
        var Model = AccessModel();
        var catalog = Model.normalizeOverpass(raw, summit, queryMeta(summit, r), {
          retrievedAt: new Date().toISOString(),
          developmentFixture: false,
          label: "Live OpenStreetMap Overpass query"
        });
        catalog.meta = {
          mode: "live",
          liveAttempted: true,
          liveError: null,
          cache: "memory",
          overpassUrl: OVERPASS_URL
        };
        memoryCache[cacheKey(catalog.query.summitId, r)] = catalog;
        writeSession(cacheKey(catalog.query.summitId, r), { live: raw, meta: catalog.meta, summitId: catalog.query.summitId });
        return catalog;
      })
      .catch(function (err) {
        var msg = String(err && err.message ? err.message : err);
        return loadFixture(summit, opts.fixtureUrl || defaultFixtureUrl(summit) || FIXTURE_URL, {
          liveAttempted: true,
          liveError: msg,
          mode: "fixture"
        }).catch(function () {
          return unavailable(summit, "OpenStreetMap data unavailable (" + msg + ").", {
            meta: { liveAttempted: true, liveError: msg }
          });
        });
      });
  }

  /**
   * @param {object} summit
   * @param {{ live?: boolean, fixtureUrl?: string, force?: boolean, timeoutMs?: number }} [options]
   */
  function loadAccess(summit, options) {
    var opts = options || {};
    var Model = AccessModel();
    if (!Model) {
      return Promise.resolve(unavailable(summit, "Access model missing — load ss-access-model.js first."));
    }
    if (!summit || !isFinite(Number(summit.lat)) || !isFinite(Number(summit.lng))) {
      return Promise.resolve(unavailable(summit, "Summit has no valid coordinates, so access data was not queried."));
    }
    var sid = summit.id || summit.reference;
    var r = radiusM();
    var key = cacheKey(sid, r);
    var live = opts.live === true || (opts.live == null && wantsLive());

    if (memoryCache[key] && !opts.force) {
      return Promise.resolve(memoryCache[key]);
    }

    var cached = readSession(key);
    if (cached && !live && !opts.force) {
      if (cached.payload) {
        var fromSess = fromFixturePayload(cached.payload, summit, Object.assign({ cache: "session" }, cached.meta || {}));
        memoryCache[key] = fromSess;
        return Promise.resolve(fromSess);
      }
      if (cached.live) {
        var fromLive = Model.normalizeOverpass(cached.live, summit, queryMeta(summit, r), {
          retrievedAt: cached.meta && cached.meta.retrievedAt,
          developmentFixture: false
        });
        fromLive.meta = Object.assign({ cache: "session", mode: "live" }, cached.meta || {});
        memoryCache[key] = fromLive;
        return Promise.resolve(fromLive);
      }
    }

    if (live) {
      return loadLive(summit, opts);
    }

    var url = opts.fixtureUrl || defaultFixtureUrl(summit);
    if (!url) {
      return Promise.resolve(
        unavailable(summit, "No labeled OpenStreetMap fixture exists for this summit. Live Overpass was not requested.")
      );
    }
    return loadFixture(summit, url, { liveAttempted: false }).catch(function (err) {
      return unavailable(summit, "OpenStreetMap data unavailable (" + String(err && err.message ? err.message : err) + ").");
    });
  }

  function clearCache() {
    memoryCache = {};
  }

  var api = {
    FIXTURE_URL: FIXTURE_URL,
    FIXTURES: FIXTURES,
    OVERPASS_URL: OVERPASS_URL,
    TIMEOUT_MS: TIMEOUT_MS,
    cacheKey: cacheKey,
    wantsLive: wantsLive,
    overpassQuery: overpassQuery,
    loadAccess: loadAccess,
    clearCache: clearCache
  };

  global.SignalTerrainSotaAccess = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Access = api;
})(typeof window !== "undefined" ? window : globalThis);
