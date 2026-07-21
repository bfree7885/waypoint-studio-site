/**
 * Dashboard 3.0 — layout preferences (enable / disable / reorder)
 * Private to this browser via localStorage.
 */
(function (global) {
  "use strict";

  var KEY = "wp-dash-layout-v1";

  function defaultOrder() {
    return global.WaypointDashboardWidgets.catalog.map(function (w) {
      return w.id;
    });
  }

  function defaultEnabled() {
    var map = {};
    global.WaypointDashboardWidgets.catalog.forEach(function (w) {
      map[w.id] = !!w.defaultOn;
    });
    return map;
  }

  function normalize(saved) {
    var order = defaultOrder();
    var enabled = defaultEnabled();
    if (saved && Array.isArray(saved.order)) {
      var seen = {};
      var next = [];
      saved.order.forEach(function (id) {
        if (global.WaypointDashboardWidgets.byId(id) && !seen[id]) {
          next.push(id);
          seen[id] = true;
        }
      });
      order.forEach(function (id) {
        if (!seen[id]) next.push(id);
      });
      order = next;
    }
    if (saved && saved.enabled && typeof saved.enabled === "object") {
      order.forEach(function (id) {
        if (typeof saved.enabled[id] === "boolean") enabled[id] = saved.enabled[id];
      });
    }
    return { order: order, enabled: enabled };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return normalize(null);
    }
  }

  function save(layout) {
    try {
      localStorage.setItem(KEY, JSON.stringify(layout));
    } catch (e) { /* ignore quota */ }
  }

  function move(order, id, dir) {
    var i = order.indexOf(id);
    if (i < 0) return order;
    var j = i + dir;
    if (j < 0 || j >= order.length) return order;
    var copy = order.slice();
    var tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
    return copy;
  }

  global.WaypointDashboardLayout = {
    load: load,
    save: save,
    move: move,
    normalize: normalize
  };
})(typeof window !== "undefined" ? window : this);
