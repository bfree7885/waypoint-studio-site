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

  var COORD_EPS = 0.00015;
  var SEARCH_MISS = "Not found in current summit catalogue";

  function packIdOf(region, source, fallback) {
    if (source && source.packId) return asString(source.packId);
    var assoc = region && region.associationCode;
    var code = region && region.regionCode;
    if (assoc && code) return assoc + "-" + code;
    return fallback || "unknown-pack";
  }

  function attachProvenance(summit, packMeta, source) {
    if (!summit) return summit;
    var src = source || {};
    var pack = packMeta || {};
    summit.packId = pack.id || summit.packId || null;
    summit.packLabel = pack.label || summit.packLabel || src.label || null;
    summit.fixtureVersion = pack.fixtureVersion || src.retrievedAt || summit.fixtureVersion || null;
    summit.provenance = {
      source: asString(src.provider) || asString(src.source) || summit.sourceUrl || null,
      sourceUrl: summit.sourceUrl,
      associationCode: summit.associationCode,
      associationName: summit.associationName,
      regionCode: summit.regionCode,
      regionName: summit.regionName,
      retrievedAt: summit.retrievedAt || asString(src.retrievedAt),
      fixtureVersion: summit.fixtureVersion,
      packId: summit.packId,
      developmentFixture: src.developmentFixture === true
    };
    return summit;
  }

  function packSummary(payload, catalog, fallbackId) {
    var region = catalog.region || {};
    var source = (payload && payload.source) || {};
    var id = packIdOf(region, source, fallbackId);
    var label =
      asString(source.label) ||
      (region.regionName && region.associationCode && region.regionCode
        ? region.regionName + " (" + region.associationCode + "/" + region.regionCode + ")"
        : region.regionName || id);
    return {
      id: id,
      label: label,
      associationCode: region.associationCode,
      associationName: region.associationName,
      regionCode: region.regionCode,
      regionName: region.regionName,
      summitCount: catalog.summits.length,
      retrievedAt: asString(source.retrievedAt),
      developmentFixture: source.developmentFixture === true,
      source: source,
      fixtureVersion: asString(source.retrievedAt) || asString(source.fixtureVersion)
    };
  }

  function boundsFromSummits(summits) {
    var list = Array.isArray(summits) ? summits : [];
    var minLat = null;
    var maxLat = null;
    var minLng = null;
    var maxLng = null;
    for (var i = 0; i < list.length; i += 1) {
      var s = list[i];
      if (!s || !validCoords(s.lat, s.lng)) continue;
      if (minLat == null) {
        minLat = maxLat = s.lat;
        minLng = maxLng = s.lng;
      } else {
        if (s.lat < minLat) minLat = s.lat;
        if (s.lat > maxLat) maxLat = s.lat;
        if (s.lng < minLng) minLng = s.lng;
        if (s.lng > maxLng) maxLng = s.lng;
      }
    }
    if (minLat == null) return null;
    return { minLat: minLat, minLng: minLng, maxLat: maxLat, maxLng: maxLng };
  }

  function crossLngLat(o, a, b) {
    return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
  }

  function convexHull(summits) {
    var pts = [];
    var list = Array.isArray(summits) ? summits : [];
    for (var i = 0; i < list.length; i += 1) {
      if (list[i] && validCoords(list[i].lat, list[i].lng)) {
        pts.push({ lat: list[i].lat, lng: list[i].lng });
      }
    }
    if (pts.length < 2) return pts.slice();
    pts.sort(function (a, b) {
      if (a.lng === b.lng) return a.lat - b.lat;
      return a.lng - b.lng;
    });
    var lower = [];
    for (var j = 0; j < pts.length; j += 1) {
      while (lower.length >= 2 && crossLngLat(lower[lower.length - 2], lower[lower.length - 1], pts[j]) <= 0) {
        lower.pop();
      }
      lower.push(pts[j]);
    }
    var upper = [];
    for (var k = pts.length - 1; k >= 0; k -= 1) {
      while (upper.length >= 2 && crossLngLat(upper[upper.length - 2], upper[upper.length - 1], pts[k]) <= 0) {
        upper.pop();
      }
      upper.push(pts[k]);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  function pointInConvexHull(lat, lng, hull) {
    if (!validCoords(lat, lng) || !Array.isArray(hull) || hull.length < 3) return false;
    var pt = { lat: lat, lng: lng };
    for (var i = 0; i < hull.length; i += 1) {
      var a = hull[i];
      var b = hull[(i + 1) % hull.length];
      if (crossLngLat(a, b, pt) < 0) return false;
    }
    return true;
  }

  function pointInBounds(lat, lng, bounds) {
    if (!bounds || !validCoords(lat, lng)) return false;
    return lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng;
  }

  function summitsInBounds(summits, bounds) {
    var list = Array.isArray(summits) ? summits : [];
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      var s = list[i];
      if (s && pointInBounds(s.lat, s.lng, bounds)) out.push(s);
    }
    return out;
  }

  function hullIntersectsBounds(hull, bounds) {
    if (!bounds || !Array.isArray(hull) || !hull.length) return false;
    var i;
    for (i = 0; i < hull.length; i += 1) {
      if (pointInBounds(hull[i].lat, hull[i].lng, bounds)) return true;
    }
    var corners = [
      { lat: bounds.minLat, lng: bounds.minLng },
      { lat: bounds.minLat, lng: bounds.maxLng },
      { lat: bounds.maxLat, lng: bounds.minLng },
      { lat: bounds.maxLat, lng: bounds.maxLng }
    ];
    if (hull.length >= 3) {
      for (i = 0; i < corners.length; i += 1) {
        if (pointInConvexHull(corners[i].lat, corners[i].lng, hull)) return true;
      }
    }
    return false;
  }

  function coverageFromSummits(summits, packs) {
    var hull = convexHull(summits);
    return {
      hull: hull,
      bounds: boundsFromSummits(summits),
      packCount: Array.isArray(packs) ? packs.length : 0,
      summitCount: Array.isArray(summits) ? summits.length : 0
    };
  }

  function viewportCoverageState(bounds, summits, hull) {
    var visible = summitsInBounds(summits, bounds);
    var ring = Array.isArray(hull) ? hull : [];
    if (!bounds) {
      return {
        state: "unknown",
        visibleCount: visible.length,
        message: "Summit coverage is unavailable."
      };
    }
    var intersects = visible.length > 0 || hullIntersectsBounds(ring, bounds);
    var corners = [
      { lat: bounds.minLat, lng: bounds.minLng },
      { lat: bounds.minLat, lng: bounds.maxLng },
      { lat: bounds.maxLat, lng: bounds.minLng },
      { lat: bounds.maxLat, lng: bounds.maxLng }
    ];
    var insideCorners = 0;
    if (ring.length >= 3) {
      for (var i = 0; i < corners.length; i += 1) {
        if (pointInConvexHull(corners[i].lat, corners[i].lng, ring)) insideCorners += 1;
      }
    }
    if (!intersects) {
      return {
        state: "outside",
        visibleCount: 0,
        message: "Summit catalogue not loaded for this area."
      };
    }
    if (insideCorners === 4) {
      return { state: "inside", visibleCount: visible.length, message: null };
    }
    return {
      state: "partial",
      visibleCount: visible.length,
      message: "Visible map includes area outside the loaded summit catalogue."
    };
  }

  function describeCatalogue(catalog) {
    if (!catalog) return "Summit catalogue unavailable";
    var n = (catalog.summits && catalog.summits.length) || 0;
    var packs = Array.isArray(catalog.packs) ? catalog.packs : [];
    var packBit = packs.length === 1 ? "1 regional pack" : packs.length + " regional packs";
    var names = [];
    for (var i = 0; i < packs.length; i += 1) {
      var p = packs[i];
      if (!p) continue;
      if (p.regionName && p.associationCode && p.regionCode) {
        names.push(p.regionName + " (" + p.associationCode + "/" + p.regionCode + ")");
      } else if (p.label) names.push(p.label);
      else if (p.id) names.push(p.id);
    }
    var nameBit = names.length ? names.join(" + ") : "development catalogue";
    var fixture = packs.length && packs.every(function (p) { return p.developmentFixture; });
    var kind = fixture ? "development catalogue" : "summit catalogue";
    if (names.length) {
      return n + " summits loaded · " + packBit + " · " + nameBit + " · " + kind;
    }
    return n + " summits loaded · " + packBit + " · " + kind;
  }

  function coordsClose(a, b) {
    if (!a || !b) return false;
    return Math.abs(a.lat - b.lat) <= COORD_EPS && Math.abs(a.lng - b.lng) <= COORD_EPS;
  }

  function validatePack(payload, options) {
    var opts = options || {};
    var errors = [];
    if (!payload || typeof payload !== "object") {
      return { ok: false, errors: ["Pack is missing or not an object."] };
    }
    var source = payload.source;
    if (!source || typeof source !== "object") {
      errors.push("Pack provenance (source) is missing.");
    } else {
      if (!asString(source.provider) && !asString(source.url)) {
        errors.push("Pack source provider/url is missing.");
      }
      if (!asString(source.retrievedAt) && !asString(source.fixtureVersion)) {
        errors.push("Pack retrievedAt/fixtureVersion is missing.");
      }
    }
    var region = payload.region || {};
    if (opts.requireAssociation !== false && !asString(region.associationCode)) {
      errors.push("Pack associationCode is missing.");
    }
    if (opts.requireRegion !== false && !asString(region.regionCode)) {
      errors.push("Pack regionCode is missing.");
    }
    if (!Array.isArray(payload.summits) || payload.summits.length < 1) {
      errors.push("Pack has no summit records.");
      return { ok: false, errors: errors };
    }
    var seen = {};
    for (var i = 0; i < payload.summits.length; i += 1) {
      var raw = payload.summits[i];
      var label = "Record " + (i + 1);
      if (!raw || typeof raw !== "object") {
        errors.push(label + " is malformed.");
        continue;
      }
      var ref = asString(raw.summitCode) || asString(raw.reference) || asString(raw.id);
      var lat = asNumber(raw.latitude != null ? raw.latitude : raw.lat);
      var lng = asNumber(raw.longitude != null ? raw.longitude : raw.lng);
      var elev = asNumber(raw.altM != null ? raw.altM : raw.elevationM);
      var elevFt = asNumber(raw.altFt != null ? raw.altFt : raw.elevationFt);
      if (!ref) errors.push(label + " is missing a SOTA reference.");
      if (!validCoords(lat, lng)) errors.push((ref || label) + " has invalid latitude/longitude.");
      if (elev == null && elevFt == null) errors.push((ref || label) + " has invalid elevation.");
      if (opts.requireAssociation !== false && !asString(raw.associationCode) && !asString(region.associationCode)) {
        errors.push((ref || label) + " is missing association.");
      }
      if (opts.requireRegion !== false && !asString(raw.regionCode) && !asString(region.regionCode)) {
        errors.push((ref || label) + " is missing region.");
      }
      if (ref) {
        if (seen[ref]) errors.push("Duplicate SOTA reference " + ref + ".");
        seen[ref] = true;
      }
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function normalizeCatalog(payload) {
    var empty = {
      summits: [],
      droppedInvalid: 0,
      region: normalizeRegion(null),
      source: payload && payload.source ? payload.source : null,
      packs: [],
      regions: [],
      coverage: coverageFromSummits([], [])
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
    var region = normalizeRegion(payload.region, fallbackAssoc);
    var catalog = {
      summits: summits,
      droppedInvalid: droppedInvalid,
      region: region,
      source: payload.source || null,
      packs: [],
      regions: region.regionCode || region.associationCode ? [region] : [],
      coverage: null
    };
    var pack = packSummary(payload, catalog, "pack");
    catalog.packs = [pack];
    for (var j = 0; j < summits.length; j += 1) {
      attachProvenance(summits[j], pack, payload.source);
    }
    catalog.coverage = coverageFromSummits(summits, catalog.packs);
    return catalog;
  }

  function mergeCatalogs(payloads, catalogueMeta) {
    var meta = catalogueMeta || {};
    var list = Array.isArray(payloads) ? payloads : [];
    var packs = [];
    var regions = [];
    var merged = [];
    var droppedInvalid = 0;
    var byRef = {};
    var deduped = 0;
    var errors = [];

    for (var p = 0; p < list.length; p += 1) {
      var payload = list[p];
      var check = validatePack(payload);
      if (!check.ok) {
        errors.push.apply(errors, check.errors);
        continue;
      }
      var catalog = normalizeCatalog(payload);
      droppedInvalid += catalog.droppedInvalid;
      var pack = catalog.packs[0];
      packs.push(pack);
      if (catalog.region) regions.push(catalog.region);
      for (var i = 0; i < catalog.summits.length; i += 1) {
        var s = catalog.summits[i];
        var key = s.reference || s.id;
        if (key && byRef[key]) {
          var prev = byRef[key];
          if (!coordsClose(prev, s)) {
            errors.push("Conflicting duplicate SOTA reference " + key + ".");
            continue;
          }
          if (!prev.overlappingPackIds) prev.overlappingPackIds = [];
          prev.overlappingPackIds.push(s.packId);
          deduped += 1;
          continue;
        }
        if (key) byRef[key] = s;
        merged.push(s);
      }
    }

    if (errors.length) {
      var err = new Error("Summit pack validation failed: " + errors.join(" "));
      err.validationErrors = errors;
      throw err;
    }

    var coverage = coverageFromSummits(merged, packs);
    return {
      summits: merged,
      droppedInvalid: droppedInvalid,
      region: regions[0] || normalizeRegion(null),
      regions: regions,
      packs: packs,
      source: meta.source || (packs[0] && packs[0].source) || null,
      coverage: coverage,
      deduped: deduped,
      catalogue: {
        id: meta.id || "signalterrain-sota-catalogue",
        version: meta.version || null,
        label: meta.label || null,
        coverageNote: meta.coverageNote || null
      }
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
        var region = ((s.regionName || "") + " " + (s.regionCode || "")).toLowerCase();
        var assoc = ((s.associationName || "") + " " + (s.associationCode || "")).toLowerCase();
        var pack = (s.packId || "").toLowerCase();
        if (
          name.indexOf(q) === -1 &&
          ref.indexOf(q) === -1 &&
          region.indexOf(q) === -1 &&
          assoc.indexOf(q) === -1 &&
          pack.indexOf(q) === -1
        ) {
          continue;
        }
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
    SEARCH_MISS: SEARCH_MISS,
    normalizeSummit: normalizeSummit,
    normalizeCatalog: normalizeCatalog,
    mergeCatalogs: mergeCatalogs,
    validatePack: validatePack,
    searchSummits: searchSummits,
    findById: findById,
    validCoords: validCoords,
    summitsInBounds: summitsInBounds,
    convexHull: convexHull,
    pointInConvexHull: pointInConvexHull,
    coverageFromSummits: coverageFromSummits,
    viewportCoverageState: viewportCoverageState,
    describeCatalogue: describeCatalogue,
    boundsFromSummits: boundsFromSummits
  };

  global.SignalTerrainSotaModel = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Model = api;
})(typeof window !== "undefined" ? window : globalThis);
