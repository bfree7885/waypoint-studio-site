(function () {
  "use strict";

  var STATE_ABBR = {
    PA: "Pennsylvania",
    NY: "New York",
    NJ: "New Jersey",
    VT: "Vermont",
    MA: "Massachusetts",
    ME: "Maine"
  };

  var STATE_NAMES = {};
  Object.keys(STATE_ABBR).forEach(function (abbr) {
    STATE_NAMES[STATE_ABBR[abbr].toLowerCase()] = STATE_ABBR[abbr];
  });

  var data = null;
  var dataPromise = null;

  function loadData() {
    if (data) return Promise.resolve(data);
    if (!dataPromise) {
      dataPromise = fetch("counties.data.json")
        .then(function (res) {
          if (!res.ok) throw new Error("County data unavailable");
          return res.json();
        })
        .then(function (json) {
          data = json;
          return data;
        });
    }
    return dataPromise;
  }

  function normalizeState(state) {
    if (!state) return "";
    var trimmed = String(state).trim();
    var upper = trimmed.toUpperCase();
    if (STATE_ABBR[upper]) return STATE_ABBR[upper];
    var lower = trimmed.toLowerCase();
    if (STATE_NAMES[lower]) return STATE_NAMES[lower];
    return trimmed;
  }

  function normalizeCountyKey(name) {
    return String(name || "")
      .replace(/\./g, "")
      .replace(/\s+county\s*$/i, "")
      .replace(/\s+parish\s*$/i, "")
      .toLowerCase()
      .trim();
  }

  function stripStateFromQuery(query, state) {
    var q = String(query || "").trim();
    var normState = normalizeState(state);

    q = q.replace(/,\s*(PA|NY|NJ|VT|MA|ME)\s*$/i, "");
    Object.keys(STATE_ABBR).forEach(function (abbr) {
      if (STATE_ABBR[abbr] === normState) {
        q = q.replace(new RegExp(",\\s*" + abbr + "\\s*$", "i"), "");
      }
    });
    if (normState) {
      q = q.replace(new RegExp(",\\s*" + normState.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$", "i"), "");
    }
    return q.trim();
  }

  function extractCountyKey(query, state) {
    return normalizeCountyKey(stripStateFromQuery(query, state));
  }

  function looksLikeCountyQuery(query) {
    return /\bcounty\b/i.test(query || "");
  }

  function resolveCounty(state, query) {
    var normState = normalizeState(state);
    var countyKey = extractCountyKey(query, state);
    if (!normState || !countyKey) {
      return Promise.resolve(null);
    }

    return loadData().then(function (d) {
      var byState = d.byStateCounty[normState];
      if (!byState) return null;
      return byState[countyKey] || null;
    });
  }

  function matchesState(admin1, state) {
    var normState = normalizeState(state);
    if (!admin1 || !normState) return false;
    if (admin1 === normState) return true;
    var abbr = null;
    Object.keys(STATE_ABBR).forEach(function (key) {
      if (STATE_ABBR[key] === normState) abbr = key;
    });
    return abbr && String(admin1).toUpperCase() === abbr;
  }

  function findDuplicateCountyNames() {
    return loadData().then(function (d) {
      var byName = {};
      Object.keys(d.byFips).forEach(function (fips) {
        var entry = d.byFips[fips];
        var key = normalizeCountyKey(entry.shortName);
        if (!byName[key]) byName[key] = [];
        byName[key].push(entry.state);
      });
      var dupes = {};
      Object.keys(byName).forEach(function (key) {
        var states = byName[key];
        if (states.length > 1) dupes[key] = states;
      });
      return dupes;
    });
  }

  function countyToPlace(entry) {
    return {
      name: entry.county,
      latitude: entry.lat,
      longitude: entry.lon,
      admin1: entry.state,
      admin2: entry.county,
      fips: entry.fips,
      country_code: "US",
      elevation: null,
      source: "county-registry"
    };
  }

  window.ForageCastCounties = {
    loadData: loadData,
    normalizeState: normalizeState,
    normalizeCountyKey: normalizeCountyKey,
    extractCountyKey: extractCountyKey,
    looksLikeCountyQuery: looksLikeCountyQuery,
    matchesState: matchesState,
    resolve: resolveCounty,
    toPlace: countyToPlace,
    findDuplicateCountyNames: findDuplicateCountyNames
  };
})();
