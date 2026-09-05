/**
 * Distance and nearby-summit helpers. Pure functions; no data fetching.
 */
(function (global) {
  "use strict";

  var EARTH_KM = 6371;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    if (![lat1, lng1, lat2, lng2].every(isFiniteNumber)) return null;
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_KM * c;
  }

  function formatDistanceKm(km) {
    if (!isFiniteNumber(km)) return null;
    if (km < 1) return Math.round(km * 1000) + " m";
    if (km < 10) return km.toFixed(1) + " km";
    return Math.round(km) + " km";
  }

  function kmToMiles(km) {
    if (!isFiniteNumber(km)) return null;
    return km * 0.621371;
  }

  function metersToFeet(m) {
    if (!isFiniteNumber(m)) return null;
    return m * 3.28084;
  }

  function formatRouteDistance(km) {
    var mi = kmToMiles(km);
    if (mi == null) return null;
    var miTxt = mi < 10 ? mi.toFixed(1) : String(Math.round(mi));
    var kmTxt = formatDistanceKm(km);
    return miTxt + " mi · " + kmTxt;
  }

  function formatElevationM(m) {
    var ft = metersToFeet(m);
    if (ft == null) return null;
    return Math.round(ft).toLocaleString("en-US") + " ft · " + Math.round(m).toLocaleString("en-US") + " m";
  }

  function formatDurationEstimate(seconds) {
    if (!isFiniteNumber(seconds) || seconds <= 0) return null;
    var min = Math.round(seconds / 60 / 5) * 5;
    if (min < 5) min = 5;
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (h && m) return "~" + h + " hr " + m + " min";
    if (h) return "~" + h + " hr";
    return "~" + m + " min";
  }

  /**
   * Nearby SOTA summits relative to a selected summit.
   * Distance is from summit to summit (not trailhead).
   */
  function nearbySummits(origin, summits, options) {
    var opts = options || {};
    var limit = typeof opts.limit === "number" ? opts.limit : 8;
    if (!origin || !isFiniteNumber(origin.lat) || !isFiniteNumber(origin.lng) || !Array.isArray(summits)) {
      return [];
    }
    var originId = origin.id || origin.reference;
    var ranked = [];
    for (var i = 0; i < summits.length; i += 1) {
      var s = summits[i];
      if (!s || s.id === originId || s.reference === originId) continue;
      if (!isFiniteNumber(s.lat) || !isFiniteNumber(s.lng)) continue;
      var km = haversineKm(origin.lat, origin.lng, s.lat, s.lng);
      if (km == null) continue;
      ranked.push({
        summit: s,
        distanceKm: km,
        distanceLabel: formatDistanceKm(km)
      });
    }
    ranked.sort(function (a, b) {
      return a.distanceKm - b.distanceKm;
    });
    return ranked.slice(0, limit);
  }

  function pointInPolygon(lat, lng, latlngs) {
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng) || !latlngs || latlngs.length < 3) return false;
    var inside = false;
    for (var i = 0, j = latlngs.length - 1; i < latlngs.length; j = i, i += 1) {
      var yi = latlngs[i][0];
      var xi = latlngs[i][1];
      var yj = latlngs[j][0];
      var xj = latlngs[j][1];
      var intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0) + xi;
      if (yj === yi) continue;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function destinationOffset(lat, lng, northM, eastM) {
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return null;
    var dLat = (northM || 0) / 111320;
    var dLng = (eastM || 0) / (111320 * Math.cos(toRad(lat)));
    return { lat: lat + dLat, lng: lng + dLng };
  }

  var api = {
    haversineKm: haversineKm,
    formatDistanceKm: formatDistanceKm,
    kmToMiles: kmToMiles,
    metersToFeet: metersToFeet,
    formatRouteDistance: formatRouteDistance,
    formatElevationM: formatElevationM,
    formatDurationEstimate: formatDurationEstimate,
    nearbySummits: nearbySummits,
    pointInPolygon: pointInPolygon,
    destinationOffset: destinationOffset
  };

  global.SignalTerrainSotaGeo = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Geo = api;
})(typeof window !== "undefined" ? window : globalThis);
