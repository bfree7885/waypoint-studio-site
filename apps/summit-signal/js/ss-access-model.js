/**
 * Normalized OSM access features for SignalTerrain (SOTA).
 * Candidate trails / trailheads / parking only. Does not invent names or routes.
 */
(function (global) {
  "use strict";

  var QUERY_VERSION = "signalterrain-sota-access-v0";
  var DEFAULT_RADIUS_M = 5000;
  var TRAIL_HIGHWAYS = { path: true, footway: true, track: true };
  var CAVEAT =
    "OpenStreetMap data may be incomplete. Verify access before travel.";
  var CANDIDATE_NOTE =
    "Mapped trail, trailhead, and parking features are candidate access information derived from OpenStreetMap and may be incomplete or outdated. Verify current access conditions before travel.";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function keepTags(tags) {
    if (!tags || typeof tags !== "object") return {};
    var keys = [
      "name",
      "alt_name",
      "ref",
      "highway",
      "amenity",
      "parking",
      "surface",
      "access",
      "fee",
      "capacity",
      "route",
      "network",
      "operator",
      "foot",
      "bicycle",
      "sac_scale",
      "trail_visibility",
      "tracktype",
      "informal",
      "website"
    ];
    var out = {};
    for (var i = 0; i < keys.length; i += 1) {
      var k = keys[i];
      if (tags[k] != null && tags[k] !== "") out[k] = String(tags[k]);
    }
    return out;
  }

  function provenanceUrl(osmType, osmId) {
    if (!osmType || osmId == null) return null;
    return "https://www.openstreetmap.org/" + osmType + "/" + osmId;
  }

  function simplifyGeometry(pts, maxPts) {
    var max = maxPts || 24;
    if (!Array.isArray(pts) || !pts.length) return [];
    var mapped = [];
    for (var i = 0; i < pts.length; i += 1) {
      var p = pts[i];
      var lat = p && (isFiniteNumber(p.lat) ? p.lat : null);
      var lng = p && (isFiniteNumber(p.lng) ? p.lng : isFiniteNumber(p.lon) ? p.lon : null);
      if (lat == null || lng == null) continue;
      mapped.push({ lat: lat, lng: lng });
    }
    if (mapped.length <= max) return mapped;
    var step = Math.max(1, Math.ceil((mapped.length - 1) / (max - 1)));
    var out = [];
    for (var j = 0; j < mapped.length; j += step) out.push(mapped[j]);
    var last = mapped[mapped.length - 1];
    if (out[out.length - 1] !== last) out.push(last);
    return out;
  }

  function centroid(geometry) {
    if (!Array.isArray(geometry) || !geometry.length) return null;
    var lat = 0;
    var lng = 0;
    var n = 0;
    for (var i = 0; i < geometry.length; i += 1) {
      if (!isFiniteNumber(geometry[i].lat) || !isFiniteNumber(geometry[i].lng)) continue;
      lat += geometry[i].lat;
      lng += geometry[i].lng;
      n += 1;
    }
    if (!n) return null;
    return { lat: lat / n, lng: lng / n };
  }

  function looksLikeTrailhead(tags, name) {
    var t = tags || {};
    if (t.highway === "trailhead") return true;
    if (t.trailhead === "yes") return true;
    var n = name || t.name || "";
    return /trailhead/i.test(String(n));
  }

  function featureId(kind, osmType, osmId) {
    return kind + ":" + osmType + "/" + osmId;
  }

  function baseFeature(kind, osmType, osmId, tags, name) {
    var t = keepTags(tags);
    var nm = name != null && name !== "" ? String(name) : t.name || null;
    if (nm === "") nm = null;
    return {
      kind: kind,
      id: featureId(kind, osmType, osmId),
      osmType: osmType,
      osmId: osmId,
      name: nm,
      tags: t,
      source: "openstreetmap",
      sourceObjectType: osmType,
      sourceObjectId: osmId,
      provenanceUrl: provenanceUrl(osmType, osmId)
    };
  }

  function attachDistance(feature, summit) {
    var Geo = global.SignalTerrainSotaGeo;
    if (!feature || !summit || !Geo) return feature;
    if (!isFiniteNumber(feature.lat) || !isFiniteNumber(feature.lng)) {
      feature.distanceKm = null;
      feature.distanceLabel = null;
      return feature;
    }
    var km = Geo.haversineKm(summit.lat, summit.lng, feature.lat, feature.lng);
    feature.distanceKm = km;
    feature.distanceLabel = km == null ? null : Geo.formatDistanceKm(km) + " straight-line to summit";
    return feature;
  }

  var COORDINATE_DIGITS = 5;

  function startDisplayName(feature) {
    if (!feature) return null;
    if (feature.name && String(feature.name).trim()) return String(feature.name).trim();
    if (feature.kind === "trailhead") return "Unnamed mapped trailhead";
    return "Unnamed mapped parking";
  }

  function startTypeLabel(feature) {
    if (!feature) return null;
    if (feature.kind === "trailhead") return "Mapped trailhead";
    if (feature.kind === "parking") return "Mapped parking";
    return "Mapped access feature";
  }

  function mappedTagValue(feature, key) {
    if (!feature) return null;
    var v = feature[key];
    if (v == null && feature.tags) v = feature.tags[key];
    if (v == null || v === "") return null;
    return String(v);
  }

  function accessTagLabel(feature) {
    var v = mappedTagValue(feature, "access");
    return v ? "Mapped access tag: " + v : null;
  }

  function feeTagLabel(feature) {
    var v = mappedTagValue(feature, "fee");
    return v ? "Mapped fee tag: " + v : null;
  }

  function formatStartCoordinates(feature, digits) {
    var d = typeof digits === "number" ? digits : COORDINATE_DIGITS;
    if (!feature || !isFiniteNumber(feature.lat) || !isFiniteNumber(feature.lng)) return null;
    return feature.lat.toFixed(d) + ", " + feature.lng.toFixed(d);
  }

  function detectMapsPlatform(ua) {
    var s = ua == null && typeof navigator !== "undefined" ? navigator.userAgent || "" : String(ua || "");
    if (/iPad|iPhone|iPod/i.test(s)) return "ios";
    if (/Android/i.test(s)) return "android";
    return "generic";
  }

  function mapsHandoffUrl(feature, opts) {
    opts = opts || {};
    if (!feature || !isFiniteNumber(feature.lat) || !isFiniteNumber(feature.lng)) return null;
    var lat = feature.lat.toFixed(COORDINATE_DIGITS);
    var lng = feature.lng.toFixed(COORDINATE_DIGITS);
    var platform = opts.platform || detectMapsPlatform(opts.userAgent);
    var named = feature.name && String(feature.name).trim();
    var label = named || startDisplayName(feature);
    if (platform === "ios") {
      return "https://maps.apple.com/?ll=" + lat + "," + lng + "&q=" + encodeURIComponent(label);
    }
    if (platform === "android") {
      return "geo:" + lat + "," + lng + "?q=" + lat + "," + lng + "(" + encodeURIComponent(label) + ")";
    }
    return "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lng;
  }

  function startInspection(feature) {
    if (!feature) {
      return {
        displayName: null,
        typeLabel: null,
        unnamed: false,
        lat: null,
        lng: null,
        coordsLabel: null,
        hasCoordinates: false,
        accessTag: null,
        feeTag: null,
        accessLabel: null,
        feeLabel: null,
        accessDisplay: "Unavailable",
        feeDisplay: "Unavailable",
        osmRef: null,
        provenanceUrl: null,
        mapsUrl: null
      };
    }
    var coords = formatStartCoordinates(feature);
    var access = accessTagLabel(feature);
    var fee = feeTagLabel(feature);
    var osmRef =
      feature.osmType && feature.osmId != null ? String(feature.osmType) + "/" + String(feature.osmId) : null;
    return {
      displayName: startDisplayName(feature),
      typeLabel: startTypeLabel(feature),
      unnamed: !(feature.name && String(feature.name).trim()),
      lat: isFiniteNumber(feature.lat) ? feature.lat : null,
      lng: isFiniteNumber(feature.lng) ? feature.lng : null,
      coordsLabel: coords,
      hasCoordinates: !!coords,
      accessTag: mappedTagValue(feature, "access"),
      feeTag: mappedTagValue(feature, "fee"),
      accessLabel: access,
      feeLabel: fee,
      accessDisplay: access || "Unavailable",
      feeDisplay: fee || "Unavailable",
      osmRef: osmRef,
      provenanceUrl: feature.provenanceUrl || (osmRef ? provenanceUrl(feature.osmType, feature.osmId) : null),
      mapsUrl: mapsHandoffUrl(feature)
    };
  }

  function sortByDistance(list) {
    list.sort(function (a, b) {
      var da = a.distanceKm == null ? 1e9 : a.distanceKm;
      var db = b.distanceKm == null ? 1e9 : b.distanceKm;
      return da - db;
    });
    return list;
  }

  function sortTrails(list) {
    list.sort(function (a, b) {
      var an = a.name ? String(a.name).toLowerCase() : "";
      var bn = b.name ? String(b.name).toLowerCase() : "";
      if (an && !bn) return -1;
      if (!an && bn) return 1;
      if (an && bn && an !== bn) return an < bn ? -1 : 1;
      return Number(a.osmId) - Number(b.osmId);
    });
    return list;
  }

  function fromPreparedTrail(raw) {
    if (!raw || raw.osmId == null) return null;
    var geom = simplifyGeometry(raw.geometry || [], 24);
    if (geom.length < 2) return null;
    var mid = geom[Math.floor(geom.length / 2)] || centroid(geom);
    var f = baseFeature("trail", raw.osmType || "way", raw.osmId, raw.tags, raw.name);
    f.highway = (raw.tags && raw.tags.highway) || raw.highway || null;
    f.surface = (raw.tags && raw.tags.surface) || null;
    f.access = (raw.tags && raw.tags.access) || null;
    f.geometry = geom;
    f.lat = raw.lat != null ? raw.lat : mid.lat;
    f.lng = raw.lng != null ? raw.lng : mid.lng;
    return f;
  }

  function fromPreparedPoint(kind, raw) {
    if (!raw || raw.osmId == null) return null;
    var geom = simplifyGeometry(raw.geometry || [], 16);
    var c = isFiniteNumber(raw.lat) && isFiniteNumber(raw.lng) ? { lat: raw.lat, lng: raw.lng } : centroid(geom);
    if (!c) return null;
    var f = baseFeature(kind, raw.osmType || "node", raw.osmId, raw.tags, raw.name);
    f.lat = c.lat;
    f.lng = c.lng;
    f.geometry = geom.length ? geom : [{ lat: c.lat, lng: c.lng }];
    f.parking = (raw.tags && raw.tags.parking) || null;
    f.surface = (raw.tags && raw.tags.surface) || null;
    f.access = (raw.tags && raw.tags.access) || null;
    f.fee = (raw.tags && raw.tags.fee) || null;
    return f;
  }

  function fromPreparedRoute(raw) {
    if (!raw || raw.osmId == null) return null;
    var f = baseFeature("named-route", raw.osmType || "relation", raw.osmId, raw.tags, raw.name);
    f.geometry = null;
    f.lat = null;
    f.lng = null;
    f.memberCount = raw.memberCount || null;
    f.drawOnMap = false;
    return f;
  }

  function fromOverpassElement(el) {
    if (!el || el.id == null) return null;
    var tags = el.tags || {};
    var type = el.type;
    if (type === "relation" && tags.route === "hiking") {
      return { bucket: "namedHikingRoutes", feature: fromPreparedRoute({ osmType: "relation", osmId: el.id, tags: tags, name: tags.name, memberCount: (el.members || []).length }) };
    }
    if (tags.amenity === "parking") {
      var geom = el.geometry || (isFiniteNumber(el.lat) ? [{ lat: el.lat, lon: el.lon }] : []);
      var rec = { osmType: type, osmId: el.id, tags: tags, name: tags.name || null, geometry: geom, lat: el.lat, lng: el.lon };
      var park = fromPreparedPoint("parking", rec);
      var extra = looksLikeTrailhead(tags, tags.name) ? fromPreparedPoint("trailhead", rec) : null;
      return { bucket: "parking", feature: park, trailhead: extra };
    }
    if (tags.highway === "trailhead") {
      var g2 = el.geometry || (isFiniteNumber(el.lat) ? [{ lat: el.lat, lon: el.lon }] : []);
      var th = fromPreparedPoint("trailhead", { osmType: type, osmId: el.id, tags: tags, name: tags.name || null, geometry: g2, lat: el.lat, lng: el.lon });
      return { bucket: "trailheads", feature: th };
    }
    if (type === "way" && TRAIL_HIGHWAYS[tags.highway]) {
      var trail = fromPreparedTrail({ osmType: "way", osmId: el.id, tags: tags, name: tags.name || null, highway: tags.highway, geometry: el.geometry || [] });
      return { bucket: "trails", feature: trail };
    }
    return null;
  }

  function emptyCatalog(query, status, reason, extra) {
    var q = query || {};
    return Object.assign(
      {
        status: status,
        reason: reason || null,
        caveat: CAVEAT,
        candidateNote: CANDIDATE_NOTE,
        queryVersion: QUERY_VERSION,
        query: {
          radiusM: q.radiusM != null ? q.radiusM : DEFAULT_RADIUS_M,
          lat: q.lat != null ? q.lat : null,
          lng: q.lng != null ? q.lng : null,
          summitId: q.summitId || null
        },
        trails: [],
        namedHikingRoutes: [],
        trailheads: [],
        parking: [],
        counts: { trails: 0, namedHikingRoutes: 0, trailheads: 0, parking: 0 },
        retrievedAt: null,
        source: { provider: "openstreetmap-overpass", developmentFixture: false }
      },
      extra || {}
    );
  }

  function finalize(catalog, summit) {
    catalog.trails.forEach(function (f) {
      f.distanceKm = null;
      f.distanceLabel = null;
    });
    catalog.trailheads.forEach(function (f) {
      attachDistance(f, summit);
    });
    catalog.parking.forEach(function (f) {
      attachDistance(f, summit);
    });
    sortTrails(catalog.trails);
    sortByDistance(catalog.trailheads);
    sortByDistance(catalog.parking);
    catalog.counts = {
      trails: catalog.trails.length,
      namedHikingRoutes: catalog.namedHikingRoutes.length,
      trailheads: catalog.trailheads.length,
      parking: catalog.parking.length
    };
    var any =
      catalog.counts.trails +
      catalog.counts.namedHikingRoutes +
      catalog.counts.trailheads +
      catalog.counts.parking;
    if (catalog.status === "ok" && any === 0) {
      catalog.status = "empty";
      catalog.reason =
        "No mapped trails, trailheads, or parking were found in this search area. OpenStreetMap may be incomplete.";
    }
    return catalog;
  }

  function normalizeFixture(payload, summit, query) {
    if (!payload || typeof payload !== "object") {
      return emptyCatalog(query, "unavailable", "Access fixture was missing or malformed.");
    }
    var src = payload.source || {};
    var els = payload.elements;
    var q = query || {
      radiusM: src.radiusM || DEFAULT_RADIUS_M,
      lat: summit && summit.lat,
      lng: summit && summit.lng,
      summitId: summit && (summit.id || summit.reference)
    };
    if (Array.isArray(els)) {
      return normalizeOverpass({ elements: els }, summit, q, {
        developmentFixture: !!src.developmentFixture,
        retrievedAt: src.retrievedAt || null,
        label: src.label || null
      });
    }
    var catalog = emptyCatalog(q, "ok", null, {
      retrievedAt: src.retrievedAt || null,
      source: {
        provider: src.provider || "openstreetmap-overpass",
        apiHost: src.apiHost || "https://overpass-api.de",
        license: "ODbL 1.0",
        attribution: "© OpenStreetMap contributors",
        developmentFixture: src.developmentFixture === true,
        label: src.label || "OpenStreetMap access fixture",
        retrievedAt: src.retrievedAt || null,
        summitId: src.summitId || q.summitId
      }
    });
    var groups = els && typeof els === "object" ? els : {};
    (groups.trails || []).forEach(function (raw) {
      var f = fromPreparedTrail(raw);
      if (f) catalog.trails.push(f);
    });
    (groups.namedHikingRoutes || []).forEach(function (raw) {
      var f = fromPreparedRoute(raw);
      if (f) catalog.namedHikingRoutes.push(f);
    });
    (groups.trailheads || []).forEach(function (raw) {
      var f = fromPreparedPoint("trailhead", raw);
      if (f) catalog.trailheads.push(f);
    });
    (groups.parking || []).forEach(function (raw) {
      var f = fromPreparedPoint("parking", raw);
      if (f) catalog.parking.push(f);
    });
    return finalize(catalog, summit);
  }

  function normalizeOverpass(raw, summit, query, extraSrc) {
    var q = query || {};
    if (!raw || typeof raw !== "object") {
      return emptyCatalog(q, "unavailable", "OpenStreetMap response was missing or malformed.");
    }
    if (!Array.isArray(raw.elements)) {
      return emptyCatalog(q, "unavailable", "OpenStreetMap response did not include an elements array.");
    }
    var catalog = emptyCatalog(q, "ok", null, {
      retrievedAt: extraSrc && extraSrc.retrievedAt ? extraSrc.retrievedAt : new Date().toISOString(),
      source: {
        provider: "openstreetmap-overpass",
        apiHost: "https://overpass-api.de",
        license: "ODbL 1.0",
        attribution: "© OpenStreetMap contributors",
        developmentFixture: !!(extraSrc && extraSrc.developmentFixture),
        label: (extraSrc && extraSrc.label) || "Live OpenStreetMap Overpass query",
        retrievedAt: extraSrc && extraSrc.retrievedAt ? extraSrc.retrievedAt : new Date().toISOString()
      }
    });
    for (var i = 0; i < raw.elements.length; i += 1) {
      var parsed = fromOverpassElement(raw.elements[i]);
      if (!parsed || !parsed.feature) continue;
      if (parsed.bucket === "trails") catalog.trails.push(parsed.feature);
      else if (parsed.bucket === "namedHikingRoutes") catalog.namedHikingRoutes.push(parsed.feature);
      else if (parsed.bucket === "trailheads") catalog.trailheads.push(parsed.feature);
      else if (parsed.bucket === "parking") {
        catalog.parking.push(parsed.feature);
        if (parsed.trailhead) catalog.trailheads.push(parsed.trailhead);
      }
    }
    return finalize(catalog, summit);
  }

  function unnamedTrailCount(trails) {
    var n = 0;
    for (var i = 0; i < (trails || []).length; i += 1) {
      if (!trails[i].name) n += 1;
    }
    return n;
  }

  function namedTrailNames(trails, routes, limit) {
    var seen = {};
    var names = [];
    function add(name) {
      if (!name || seen[name]) return;
      seen[name] = true;
      names.push(name);
    }
    (trails || []).forEach(function (t) {
      add(t.name);
    });
    (routes || []).forEach(function (t) {
      add(t.name);
    });
    var cap = typeof limit === "number" ? limit : 12;
    return names.slice(0, cap);
  }

  var api = {
    QUERY_VERSION: QUERY_VERSION,
    DEFAULT_RADIUS_M: DEFAULT_RADIUS_M,
    CAVEAT: CAVEAT,
    CANDIDATE_NOTE: CANDIDATE_NOTE,
    keepTags: keepTags,
    provenanceUrl: provenanceUrl,
    simplifyGeometry: simplifyGeometry,
    looksLikeTrailhead: looksLikeTrailhead,
    normalizeFixture: normalizeFixture,
    normalizeOverpass: normalizeOverpass,
    emptyCatalog: emptyCatalog,
    unnamedTrailCount: unnamedTrailCount,
    namedTrailNames: namedTrailNames,
    attachDistance: attachDistance,
    COORDINATE_DIGITS: COORDINATE_DIGITS,
    startDisplayName: startDisplayName,
    startTypeLabel: startTypeLabel,
    mappedTagValue: mappedTagValue,
    accessTagLabel: accessTagLabel,
    feeTagLabel: feeTagLabel,
    formatStartCoordinates: formatStartCoordinates,
    detectMapsPlatform: detectMapsPlatform,
    mapsHandoffUrl: mapsHandoffUrl,
    startInspection: startInspection
  };

  global.SignalTerrainSotaAccessModel = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.AccessModel = api;
})(typeof window !== "undefined" ? window : globalThis);
