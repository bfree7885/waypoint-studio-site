/**
 * SOTA summit data provider.
 *
 * Regional packs → merge/normalize → SignalTerrainSotaModel → UI.
 * Default: labeled development catalogue of committed regional fixtures.
 * Optional live fetch: ?live=1 replaces only the W2/GC pack (falls back to
 * that pack's fixture if the request fails). CI must not use live mode.
 */
(function (global) {
  "use strict";

  var CATALOGUE_URL = "data/ss-summit-catalogue.json";
  var FIXTURE_URL = "data/ss-summits-w2-gc.json";
  var LIVE_URL = "https://api2.sota.org.uk/api/regions/W2/GC";
  var CACHE_KEY = "signalterrain-sota-catalog-v1-1";
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
        packId: "W2-GC",
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

  function toMergedCatalog(payloads, catalogueMeta, meta) {
    var Model = global.SignalTerrainSotaModel;
    if (!Model) throw new Error("SignalTerrainSotaModel missing — load ss-summit-model.js first");
    var catalog = Model.mergeCatalogs(payloads, catalogueMeta);
    catalog.meta = meta || {};
    return catalog;
  }

  function isW2GcPack(entry, payload) {
    if (entry && (entry.liveReplaceable || entry.id === "W2-GC")) return true;
    var region = payload && payload.region ? payload.region : {};
    return region.associationCode === "W2" && region.regionCode === "GC";
  }

  /**
   * @param {{ live?: boolean, fixtureUrl?: string, catalogueUrl?: string }} [options]
   * @returns {Promise<object>}
   */
  function loadCatalog(options) {
    var opts = options || {};
    var live = opts.live === true || (opts.live == null && wantsLive());
    var fixtureUrl = opts.fixtureUrl;
    var catalogueUrl = opts.catalogueUrl || CATALOGUE_URL;

    if (memoryCache && !opts.force) {
      return Promise.resolve(memoryCache);
    }

    var cached = readSessionCache();
    if (cached && cached.catalog && !live && !opts.force) {
      memoryCache = cached.catalog;
      return Promise.resolve(memoryCache);
    }

    function finish(catalog) {
      memoryCache = catalog;
      writeSessionCache({ catalog: catalog });
      return catalog;
    }

    function fromSingleFixture(extraMeta) {
      var url = fixtureUrl || FIXTURE_URL;
      return fetchJson(url).then(function (payload) {
        var meta = Object.assign(
          {
            mode: "fixture",
            liveAttempted: !!(extraMeta && extraMeta.liveAttempted),
            liveError: extraMeta && extraMeta.liveError ? extraMeta.liveError : null,
            cache: "memory"
          },
          extraMeta || {}
        );
        return finish(toCatalog(payload, meta));
      });
    }

    function loadPacks(manifest, extraMeta) {
      var entries = (manifest && Array.isArray(manifest.packs) ? manifest.packs : []).slice();
      if (!entries.length) {
        return fromSingleFixture(extraMeta);
      }
      var fetches = entries.map(function (entry) {
        return fetchJson(entry.url).then(function (payload) {
          return { entry: entry, payload: payload };
        });
      });
      return Promise.all(fetches).then(function (loaded) {
        function mergeFrom(rows, mode, liveError) {
          var payloads = rows.map(function (row) {
            return row.payload;
          });
          var meta = Object.assign(
            {
              mode: mode,
              liveAttempted: !!(extraMeta && extraMeta.liveAttempted),
              liveError: liveError || (extraMeta && extraMeta.liveError) || null,
              cache: "memory",
              packCount: payloads.length
            },
            extraMeta || {}
          );
          var catalogueMeta = {
            id: manifest.id,
            version: manifest.version,
            label: manifest.label,
            coverageNote: manifest.coverageNote,
            source: {
              provider: "signalterrain-summit-catalogue",
              developmentFixture: true,
              retrievedAt: manifest.retrievedAt,
              label: manifest.label,
              packCount: payloads.length
            }
          };
          return finish(toMergedCatalog(payloads, catalogueMeta, meta));
        }

        if (!live) {
          return mergeFrom(loaded, "fixture", null);
        }

        return fetchJson(LIVE_URL)
          .then(function (raw) {
            var livePayload = wrapLivePayload(raw);
            var rows = loaded.map(function (row) {
              if (isW2GcPack(row.entry, row.payload)) {
                return { entry: row.entry, payload: livePayload };
              }
              return row;
            });
            extraMeta = Object.assign({}, extraMeta || {}, { liveAttempted: true, liveError: null });
            try {
              return mergeFrom(rows, "live", null);
            } catch (e) {
              extraMeta = Object.assign({}, extraMeta || {}, {
                liveAttempted: true,
                liveError: String(e && e.message ? e.message : e)
              });
              return mergeFrom(loaded, "fixture", extraMeta.liveError);
            }
          })
          .catch(function (err) {
            extraMeta = Object.assign({}, extraMeta || {}, {
              liveAttempted: true,
              liveError: String(err && err.message ? err.message : err)
            });
            return mergeFrom(loaded, "fixture", extraMeta.liveError);
          });
      });
    }

    if (fixtureUrl) {
      if (!live) {
        return fromSingleFixture({ liveAttempted: false });
      }
      return fetchJson(LIVE_URL)
        .then(function (raw) {
          var payload = wrapLivePayload(raw);
          var meta = { mode: "live", liveAttempted: true, liveError: null, cache: "memory" };
          return finish(toCatalog(payload, meta));
        })
        .catch(function (err) {
          return fromSingleFixture({
            liveAttempted: true,
            liveError: String(err && err.message ? err.message : err)
          });
        });
    }

    return fetchJson(catalogueUrl)
      .then(function (manifest) {
        return loadPacks(manifest, { liveAttempted: !!live && live });
      })
      .catch(function () {
        return fromSingleFixture({ liveAttempted: false, catalogueFallback: true });
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
    CATALOGUE_URL: CATALOGUE_URL,
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
