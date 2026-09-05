/**
 * Maidenhead locator helpers for SignalTerrain (SOTA).
 * Prefer the SOTA-provided locator when present. Derived values are labeled.
 */
(function (global) {
  "use strict";

  var FIELDS = "ABCDEFGHIJKLMNOPQR";
  var SUBS = "abcdefghijklmnopqrstuvwx";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  /**
   * @param {number} lat
   * @param {number} lng
   * @param {number} [length=6] 4 or 6
   * @returns {string|null}
   */
  function fromLatLng(lat, lng, length) {
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    var len = length === 4 ? 4 : 6;
    var adjLng = lng + 180;
    var adjLat = lat + 90;
    var fieldLng = Math.floor(adjLng / 20);
    var fieldLat = Math.floor(adjLat / 10);
    if (fieldLng < 0 || fieldLng > 17 || fieldLat < 0 || fieldLat > 17) return null;
    var squareLng = Math.floor((adjLng % 20) / 2);
    var squareLat = Math.floor(adjLat % 10);
    var out = FIELDS.charAt(fieldLng) + FIELDS.charAt(fieldLat) + String(squareLng) + String(squareLat);
    if (len === 4) return out;
    var subLng = Math.floor(((adjLng % 20) % 2) * 12);
    var subLat = Math.floor((adjLat % 1) * 24);
    if (subLng < 0 || subLng > 23 || subLat < 0 || subLat > 23) return null;
    return out + SUBS.charAt(subLng) + SUBS.charAt(subLat);
  }

  var api = {
    fromLatLng: fromLatLng
  };

  global.SignalTerrainSotaMaidenhead = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Maidenhead = api;
})(typeof window !== "undefined" ? window : globalThis);
