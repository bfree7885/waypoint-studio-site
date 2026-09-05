/**
 * Normalized SignalTerrain (SOTA) summit model.
 * UI code should consume this shape, not raw SOTA payloads.
 *
 * Honesty: missing source fields stay unavailable. Never invent points,
 * elevation, activations, seasonal bonus, or coordinates.
 */
(function (global) {
  "use strict";

  var UNAVAILABLE = {
    status: "unavailable",
    label: "Unavailable",
    reason: "Not present in the retrieved SOTA record."
  };

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function asNumber(value) {
    if (isFiniteNumber(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      var n = Number(value);
      if (isFinite(n)) return n;
    }
    return null;
  }

  function asString(value) {
    if (typeof value === "string") {
      var t = value.trim();
      return t ? t : null;
    }
    if (typeof value === "number" && isFinite(value)) return String(value);
    return null;
  }

  function validCoords(lat, lng) {
    return isFiniteNumber(lat) && isFiniteNumber(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  function seasonalBonus(raw) {
    var pts = asNumber(raw && (raw.bonusPoints != null ? raw.bonusPoints : raw.seasonalBonus));
    if (pts == null) {
      return {
        status: "unavailable",
        label: "Unavailable",
        points: null,
        reason: "Seasonal bonus is not present in this SOTA payload."
      };
    }
    return {
      status: "retrieved",
      label: String(pts) + " bonus points",
      points: pts,
      reason: null
    };
  }

  function maidenheadFor(raw, lat, lng) {
    var provided = asString(raw && raw.locator);
    if (provided) {
      return { value: provided, source: "sota" };
    }
    var Maidenhead = global.SignalTerrainSotaMaidenhead;
    var derived = Maidenhead && lat != null && lng != null ? Maidenhead.fromLatLng(lat, lng, 6) : null;
    if (derived) {
      return { value: derived, source: "derived" };
    }
    return { value: null, source: null };
  }

  /**
   * @param {object} raw SOTA region summit object (or equivalent)
   * @returns {object|null} normalized summit, or null if coordinates are invalid
   */
  function normalizeSummit(raw) {
    if (!raw || typeof raw !== "object") return null;
    var lat = asNumber(raw.latitude != null ? raw.latitude : raw.lat);
    var lng = asNumber(raw.longitude != null ? raw.longitude : raw.lng);
    if (!validCoords(lat, lng)) return null;

    var reference = asString(raw.summitCode) || asString(raw.reference) || asString(raw.id);
    var name = asString(raw.name);
    var grid = maidenheadFor(raw, lat, lng);

    return {
      id: reference || (lat.toFixed(5) + "," + lng.toFixed(5)),
      name: name,
      reference: reference,
      points: asNumber(raw.points),
      elevationM: asNumber(raw.altM != null ? raw.altM : raw.elevationM),
      elevationFt: asNumber(raw.altFt != null ? raw.altFt : raw.elevationFt),
      lat: lat,
      lng: lng,
      maidenhead: grid.value,
      maidenheadSource: grid.source,
      activationCount: asNumber(raw.activationCount),
      lastActivationDate: asString(raw.activationDate),
      lastActivationCall: asString(raw.activationCall),
      associationCode: asString(raw.associationCode),
      associationName: asString(raw.associationName),
      regionCode: asString(raw.regionCode),
      regionName: asString(raw.regionName),
      valid: raw.valid === false ? false : raw.valid === true ? true : null,
      seasonalBonus: seasonalBonus(raw),
      sourceUrl: asString(raw.retrievedFrom) || null,
      retrievedAt: asString(raw.retrievedAt) || null,
      /* Future visual encodings — unset in V0.1, reserved for later. */
      visual: {
        hikeDifficulty: null,
        activationStatus: null,
        weatherSuitability: null,
        accessibility: null,
        recommendationScore: null
      }
    };
  }

  function normalizeRegion(rawRegion, fallbackAssociationName) {
    var r = rawRegion && typeof rawRegion === "object" ? rawRegion : {};
    var minLat = asNumber(r.minLat);
    var maxLat = asNumber(r.maxLat);
    var minLng = asNumber(r.minLng != null ? r.minLng : r.minLong);
    var maxLng = asNumber(r.maxLng != null ? r.maxLng : r.maxLong);
    var center = null;
    if (validCoords(minLat, minLng) && validCoords(maxLat, maxLng)) {
      center = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
    }
    return {
      associationCode: asString(r.associationCode),
      associationName: asString(r.associationName) || asString(fallbackAssociationName) || null,
      regionCode: asString(r.regionCode),
      regionName: asString(r.regionName),
      manager: asString(r.manager),
      managerCallsign: asString(r.managerCallsign) || asString(r.regionManagerCallsign),
      summitCount: asNumber(r.summitCount),
      bounds:
        validCoords(minLat, minLng) && validCoords(maxLat, maxLng)
          ? { minLat: minLat, minLng: minLng, maxLat: maxLat, maxLng: maxLng }
          : null,
      center: center
    };
  }

  function normalizeCatalog(payload) {
    var empty = {
      summits: [],
      droppedInvalid: 0,
      region: normalizeRegion(null),
      source: payload && payload.source ? payload.source : null
    };
    if (!payload || typeof payload !== "object") return empty;
    var list = Array.isArray(payload.summits) ? payload.summits : [];
    var summits = [];
    var droppedInvalid = 0;
    for (var i = 0; i < list.length; i += 1) {
      var n = normalizeSummit(list[i]);
      if (n) summits.push(n);
      else droppedInvalid += 1;
    }
    var fallbackAssoc = summits[0] && summits[0].associationName;
    return {
      summits: summits,
      droppedInvalid: droppedInvalid,
      region: normalizeRegion(payload.region, fallbackAssoc),
      source: payload.source || null
    };
  }

  function searchSummits(summits, query, minPoints) {
    var list = Array.isArray(summits) ? summits : [];
    var q = typeof query === "string" ? query.trim().toLowerCase() : "";
    var min = minPoints == null || minPoints === "" ? null : asNumber(minPoints);
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      var s = list[i];
      if (!s) continue;
      if (min != null && (s.points == null || s.points < min)) continue;
      if (q) {
        var name = (s.name || "").toLowerCase();
        var ref = (s.reference || "").toLowerCase();
        if (name.indexOf(q) === -1 && ref.indexOf(q) === -1) continue;
      }
      out.push(s);
    }
    return out;
  }

  function findById(summits, id) {
    if (!id || !Array.isArray(summits)) return null;
    for (var i = 0; i < summits.length; i += 1) {
      if (summits[i] && (summits[i].id === id || summits[i].reference === id)) return summits[i];
    }
    return null;
  }

  var api = {
    UNAVAILABLE: UNAVAILABLE,
    normalizeSummit: normalizeSummit,
    normalizeCatalog: normalizeCatalog,
    searchSummits: searchSummits,
    findById: findById,
    validCoords: validCoords
  };

  global.SignalTerrainSotaModel = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Model = api;
})(typeof window !== "undefined" ? window : globalThis);
