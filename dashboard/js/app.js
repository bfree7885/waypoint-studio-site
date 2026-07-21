/**
 * Dashboard 3.0 — app bootstrap
 */
(function () {
  "use strict";

  var layout = WaypointDashboardLayout.load();
  var ctx = null;
  var kioskTimer = null;
  var clockTimer = null;

  var els = {
    grid: document.getElementById("dash-grid"),
    place: document.getElementById("dash-place"),
    updated: document.getElementById("dash-updated"),
    status: document.getElementById("dash-status"),
    customize: document.getElementById("dash-customize"),
    customizePanel: document.getElementById("dash-customize-panel"),
    customizeList: document.getElementById("dash-customize-list"),
    refresh: document.getElementById("dash-refresh"),
    locate: document.getElementById("dash-locate"),
    kiosk: document.getElementById("dash-kiosk"),
    exitKiosk: document.getElementById("dash-exit-kiosk"),
    clock: document.getElementById("dash-clock"),
    shell: document.getElementById("dash-shell"),
    brief: document.getElementById("dash-brief")
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatus(msg) {
    if (els.status) els.status.textContent = msg || "";
  }

  function renderBrief() {
    if (!els.brief || !ctx) return;
    var bits = [];
    var w = WaypointDashboardWidgets.byId("weather").build(ctx);
    var p = WaypointDashboardWidgets.byId("photography").build(ctx);
    var h = WaypointDashboardWidgets.byId("hiking").build(ctx);
    bits.push(w.take);
    if (p.take !== w.take) bits.push(p.take);
    if (bits.length < 3) bits.push(h.take);
    els.brief.innerHTML = bits
      .slice(0, 3)
      .map(function (t) {
        return "<li>" + escapeHtml(t) + "</li>";
      })
      .join("");
  }

  function widgetHtml(def, built) {
    return (
      '<article class="dash-widget dash-widget--' +
      escapeHtml(def.size) +
      '" data-widget-id="' +
      escapeHtml(def.id) +
      '">' +
      '<header class="dash-widget__head">' +
      "<div>" +
      '<h3 class="dash-widget__title">' +
      escapeHtml(def.title) +
      "</h3>" +
      '<p class="dash-widget__status">' +
      escapeHtml(built.status) +
      "</p>" +
      "</div>" +
      "</header>" +
      '<p class="dash-widget__primary">' +
      escapeHtml(built.primary) +
      "</p>" +
      '<p class="dash-widget__support">' +
      escapeHtml(built.support) +
      "</p>" +
      '<div class="aurora-take dash-widget__take">' +
      "<h4>Waypoint’s Take</h4>" +
      "<p>" +
      escapeHtml(built.take) +
      "</p>" +
      "<footer>Why it matters today</footer>" +
      "</div>" +
      "</article>"
    );
  }

  function renderGrid() {
    if (!els.grid || !ctx) return;
    var html = "";
    layout.order.forEach(function (id) {
      if (!layout.enabled[id]) return;
      var def = WaypointDashboardWidgets.byId(id);
      if (!def) return;
      html += widgetHtml(def, def.build(ctx));
    });
    if (!html) {
      html =
        '<div class="aurora-empty dash-empty">' +
        '<h3 class="aurora-empty__title">No widgets enabled</h3>' +
        '<p class="aurora-empty__body">Open Customize to turn categories back on.</p>' +
        "</div>";
    }
    els.grid.innerHTML = html;
  }

  function renderCustomize() {
    if (!els.customizeList) return;
    els.customizeList.innerHTML = layout.order
      .map(function (id, index) {
        var def = WaypointDashboardWidgets.byId(id);
        if (!def) return "";
        var checked = layout.enabled[id] ? " checked" : "";
        return (
          '<li class="dash-customize__row" data-id="' +
          escapeHtml(id) +
          '">' +
          '<label class="dash-customize__label">' +
          '<input type="checkbox" data-toggle="' +
          escapeHtml(id) +
          '"' +
          checked +
          " />" +
          "<span><strong>" +
          escapeHtml(def.title) +
          "</strong> — " +
          escapeHtml(def.blurb) +
          "</span>" +
          "</label>" +
          '<div class="dash-customize__moves">' +
          '<button type="button" class="btn-ghost aurora-btn--sm" data-move="' +
          escapeHtml(id) +
          '" data-dir="-1" aria-label="Move ' +
          escapeHtml(def.title) +
          ' up"' +
          (index === 0 ? " disabled" : "") +
          ">Up</button>" +
          '<button type="button" class="btn-ghost aurora-btn--sm" data-move="' +
          escapeHtml(id) +
          '" data-dir="1" aria-label="Move ' +
          escapeHtml(def.title) +
          ' down"' +
          (index === layout.order.length - 1 ? " disabled" : "") +
          ">Down</button>" +
          "</div>" +
          "</li>"
        );
      })
      .join("");
  }

  function applyMeta() {
    if (!ctx) return;
    if (els.place) els.place.textContent = ctx.place;
    if (els.updated) {
      var d = new Date(ctx.updatedAt);
      els.updated.textContent =
        "Updated " +
        d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) +
        " · " +
        (ctx.source === "open-meteo" ? "live providers" : "demo snapshot");
    }
  }

  function refresh(options) {
    setStatus("Refreshing…");
    if (els.refresh) els.refresh.setAttribute("aria-busy", "true");
    return WaypointDashboardEngine.loadConditions(options || {})
      .then(function (next) {
        ctx = next;
        applyMeta();
        renderBrief();
        renderGrid();
        setStatus("");
      })
      .catch(function () {
        ctx = WaypointDashboardEngine.demoContext();
        applyMeta();
        renderBrief();
        renderGrid();
        setStatus("Showing demo conditions");
      })
      .then(function () {
        if (els.refresh) els.refresh.removeAttribute("aria-busy");
      });
  }

  function tickClock() {
    if (!els.clock) return;
    var n = new Date();
    els.clock.textContent = n.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function setKiosk(on) {
    if (!els.shell) return;
    els.shell.classList.toggle("is-kiosk", on);
    document.body.classList.toggle("dash-kiosk-active", on);
    if (els.kiosk) els.kiosk.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) {
      tickClock();
      clockTimer = setInterval(tickClock, 1000);
      kioskTimer = setInterval(function () {
        refresh({ force: true });
      }, 5 * 60 * 1000);
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function () {});
      }
    } else {
      clearInterval(clockTimer);
      clearInterval(kioskTimer);
      clockTimer = null;
      kioskTimer = null;
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(function () {});
      }
    }
  }

  function bind() {
    if (els.refresh) {
      els.refresh.addEventListener("click", function () {
        refresh({ force: true });
      });
    }
    if (els.locate) {
      els.locate.addEventListener("click", function () {
        if (!navigator.geolocation) {
          setStatus("Location unavailable — using demo region");
          return;
        }
        setStatus("Locating…");
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            refresh({
              force: true,
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              place: "Near you · " + pos.coords.latitude.toFixed(2) + ", " + pos.coords.longitude.toFixed(2)
            });
          },
          function () {
            setStatus("Location denied — demo region");
            refresh({ force: true });
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
        );
      });
    }
    if (els.customize && els.customizePanel) {
      els.customize.addEventListener("click", function () {
        var open = els.customizePanel.hidden;
        els.customizePanel.hidden = !open;
        els.customize.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) renderCustomize();
      });
    }
    if (els.customizeList) {
      els.customizeList.addEventListener("change", function (e) {
        var t = e.target;
        if (t && t.getAttribute("data-toggle")) {
          layout.enabled[t.getAttribute("data-toggle")] = !!t.checked;
          WaypointDashboardLayout.save(layout);
          renderGrid();
        }
      });
      els.customizeList.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-move]");
        if (!btn) return;
        var id = btn.getAttribute("data-move");
        var dir = parseInt(btn.getAttribute("data-dir"), 10);
        layout.order = WaypointDashboardLayout.move(layout.order, id, dir);
        WaypointDashboardLayout.save(layout);
        renderCustomize();
        renderGrid();
      });
    }
    if (els.kiosk) {
      els.kiosk.addEventListener("click", function () {
        setKiosk(true);
      });
    }
    if (els.exitKiosk) {
      els.exitKiosk.addEventListener("click", function () {
        setKiosk(false);
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && els.shell && els.shell.classList.contains("is-kiosk")) {
        setKiosk(false);
      }
    });
  }

  bind();
  renderCustomize();
  refresh();
})();
