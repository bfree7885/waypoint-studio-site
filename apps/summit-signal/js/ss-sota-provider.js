/**
 * SOTA summit data provider.
 *
 * Raw SOTA source → this module → SignalTerrainSotaModel → UI.
 * Default: labeled development fixture of real retrieved W2/GC records.
 * Optional live fetch: ?live=1 (falls back to the fixture if the request fails).
 */
(function (global) {
  "use strict";

  var FIXTURE_URL = "data/ss-summits-w2-gc.json";
  var LIVE_URL = "https://api2.sota.org.uk/api/regions/W2/GC";
  var CACHE_KEY = "signalterrain-sota-catalog-v0";
  var memoryCache = null;

  function wantsLive(search) {
    try {
      var q = search || (global.location && global.location.search) || "";
      return /(?:\?|&)live=1(?:&|$)/.test(q);
    } catch (e) {
      return false;
    }
  }

  function fetchJson(url) {
    return global.fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
      return res.json();
    });
  }

  function wrapLivePayload(raw) {
    var region = raw && raw.region ? raw.region : {};
    var summits = (raw && raw.summits) || [];
    var stamped = [];
    var now = new Date().toISOString();
    for (var i = 0; i < summits.length; i += 1) {
      var s = Object.assign({}, summits[i]);
      s.retrievedFrom = LIVE_URL;
      s.retrievedAt = now;
      stamped.push(s);
    }
    return {
      source: {
        provider: "sota-api-region",
        apiHost: "https://api2.sota.org.uk",
        endpoint: "/api/regions/W2/GC",
        url: LIVE_URL,
        retrievedAt: now,
        developmentFixture: false,
        label: "Live SOTA region W2/GC (Greater Catskills)"
      },
      region: {
        associationCode: region.associationCode,
        regionCode: region.regionCode,
        regionName: region.regionName,
        manager: region.manager,
        managerCallsign: region.regionManagerCallsign,
        summitCount: region.summits,
        maxLat: region.maxLat,
        maxLng: region.maxLong,
        minLat: region.minLat,
        minLng: region.minLong
      },
      summits: stamped
    };
  }

  function readSessionCache() {
    try {
      if (!global.sessionStorage) return null;
      var raw = global.sessionStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeSessionCache(payload) {
    try {
      if (global.sessionStorage) global.sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch (e) {
      /* quota / private mode */
    }
  }

  function toCatalog(payload, meta) {
    var Model = global.SignalTerrainSotaModel;
    if (!Model) throw new Error("SignalTerrainSotaModel missing — load ss-summit-model.js first");
    var catalog = Model.normalizeCatalog(payload);
    catalog.meta = meta || {};
    return catalog;
  }

  /**
   * @param {{ live?: boolean, fixtureUrl?: string }} [options]
   * @returns {Promise<object>}
   */
  function loadCatalog(options) {
    var opts = options || {};
    var live = opts.live === true || (opts.live == null && wantsLive());
    var fixtureUrl = opts.fixtureUrl || FIXTURE_URL;

    if (memoryCache && !opts.force) {
      return Promise.resolve(memoryCache);
    }

    var cached = readSessionCache();
    if (cached && cached.payload && !live && !opts.force) {
      memoryCache = toCatalog(cached.payload, Object.assign({ cache: "session" }, cached.meta || {}));
      return Promise.resolve(memoryCache);
    }

    function fromFixture(extraMeta) {
      return fetchJson(fixtureUrl).then(function (payload) {
        var meta = Object.assign(
          {
            mode: "fixture",
            liveAttempted: !!(extraMeta && extraMeta.liveAttempted),
            liveError: extraMeta && extraMeta.liveError ? extraMeta.liveError : null,
            cache: "memory"
          },
          extraMeta || {}
        );
        var catalog = toCatalog(payload, meta);
        memoryCache = catalog;
        writeSessionCache({ payload: payload, meta: meta });
        return catalog;
      });
    }

    if (!live) {
      return fromFixture({ liveAttempted: false });
    }

    return fetchJson(LIVE_URL)
      .then(function (raw) {
        var payload = wrapLivePayload(raw);
        var meta = { mode: "live", liveAttempted: true, liveError: null, cache: "memory" };
        var catalog = toCatalog(payload, meta);
        memoryCache = catalog;
        writeSessionCache({ payload: payload, meta: meta });
        return catalog;
      })
      .catch(function (err) {
        return fromFixture({
          liveAttempted: true,
          liveError: String(err && err.message ? err.message : err)
        });
      });
  }

  function clearCache() {
    memoryCache = null;
    try {
      if (global.sessionStorage) global.sessionStorage.removeItem(CACHE_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  var api = {
    FIXTURE_URL: FIXTURE_URL,
    LIVE_URL: LIVE_URL,
    loadCatalog: loadCatalog,
    clearCache: clearCache,
    wantsLive: wantsLive
  };

  global.SignalTerrainSotaProvider = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Provider = api;
})(typeof window !== "undefined" ? window : globalThis);
