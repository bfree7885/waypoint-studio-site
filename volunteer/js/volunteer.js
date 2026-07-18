/**
 * Waypoint Volunteer — main app
 * Mission: "What good can I do today?"
 */
(function () {
  "use strict";

  var DEFAULT_CENTER = (window.VolunteerMap &&
    window.VolunteerMap.DEFAULT_CENTER) || [40.78, -77.86];

  var state = {
    view: "list",
    userLat: null,
    userLon: null,
    hasFix: false,
    locating: false,
    selectedId: null,
    expandedId: null,
    filters: {
      distanceMiles: "50",
      availableHours: "",
      indoorOutdoor: "any",
      physicalIntensity: "any",
      weekdayWeekend: "any",
      familyFriendly: false,
      petFriendly: false,
      accessible: false,
      categories: [],
      season: "any",
      weatherSuitability: "any",
      matchCurrentSeason: false,
      matchWeather: false,
      personalOnly: false
    },
    weatherBundle: null,
    todayResult: null,
    filtered: [],
    sheetOpen: true
  };

  var mapApi = null;

  function $(id) {
    return document.getElementById(id);
  }

  function opportunities() {
    return (window.VolunteerOpportunities &&
      window.VolunteerOpportunities.list) ||
      [];
  }

  function planning() {
    return window.VolunteerPlanning;
  }

  function readFiltersFromDom() {
    var f = state.filters;
    f.distanceMiles = $("vol-filter-distance").value;
    f.availableHours = $("vol-filter-hours").value;
    f.indoorOutdoor = $("vol-filter-setting").value;
    f.physicalIntensity = $("vol-filter-intensity").value;
    f.weekdayWeekend = $("vol-filter-when").value;
    f.familyFriendly = $("vol-filter-family").checked;
    f.petFriendly = $("vol-filter-pet").checked;
    f.accessible = $("vol-filter-accessible").checked;
    f.season = $("vol-filter-season").value;
    f.weatherSuitability = $("vol-filter-weather").value;
    f.matchCurrentSeason = $("vol-filter-match-season").checked;
    f.matchWeather = $("vol-filter-match-weather").checked;
    f.personalOnly = $("vol-filter-personal").checked;

    var cats = [];
    document.querySelectorAll("[data-cat-filter]").forEach(function (el) {
      if (el.checked) cats.push(el.getAttribute("data-cat-filter"));
    });
    f.categories = cats;

    var hours = f.availableHours;
    if (planning()) {
      planning().setAvailableHours(hours === "" ? null : hours);
      planning().setInterests(cats);
      planning().setMobility({
        preferAccessible: f.accessible,
        maxIntensity:
          f.physicalIntensity === "any" ? "vigorous" : f.physicalIntensity
      });
    }
  }

  function buildTodayContext() {
    var season = window.VolunteerFilters.currentSeason();
    var plan = planning() ? planning().getState() : {};
    var ctx = window.VolunteerTodayEngine.emptyContext();
    ctx.now = new Date();
    ctx.season = season;
    ctx.location = {
      lat: state.userLat,
      lon: state.userLon,
      label: state.hasFix ? "Your location" : "Demo region (central PA)",
      hasFix: state.hasFix
    };
    ctx.user = {
      availableHours:
        state.filters.availableHours === ""
          ? null
          : Number(state.filters.availableHours),
      interests: state.filters.categories.slice(),
      mobility: {
        preferAccessible: state.filters.accessible,
        maxIntensity:
          state.filters.physicalIntensity === "any"
            ? "vigorous"
            : state.filters.physicalIntensity
      }
    };

    if (state.weatherBundle) {
      ctx.weather = Object.assign(ctx.weather, state.weatherBundle.weather);
      ctx.daylight = Object.assign(ctx.daylight, state.weatherBundle.daylight);
      ctx.forecast = Object.assign(ctx.forecast, state.weatherBundle.forecast);
    }

    return ctx;
  }

  function refreshToday() {
    var ctx = buildTodayContext();
    state.todayResult = window.VolunteerTodayEngine.run(ctx);
    renderInsights();
  }

  function filterList() {
    var weatherTags =
      (state.todayResult && state.todayResult.weatherTags) || [];
    var list = window.VolunteerFilters.apply(opportunities(), state.filters, {
      userLat: state.userLat != null ? state.userLat : DEFAULT_CENTER[0],
      userLon: state.userLon != null ? state.userLon : DEFAULT_CENTER[1],
      planning: planning(),
      season: window.VolunteerFilters.currentSeason(),
      weatherTags: weatherTags
    });

    if (state.todayResult) {
      var ranked = state.todayResult.rank(list);
      state.filtered = ranked.map(function (r) {
        return r.opportunity;
      });
    } else {
      state.filtered = window.VolunteerFilters.sortByDistance(list);
    }
  }

  function renderInsights() {
    var el = $("vol-insights");
    if (!el || !state.todayResult) return;
    var items = state.todayResult.presented || [];
    if (!items.length) {
      el.innerHTML =
        '<p class="vol-insight">Browse at your own pace. There’s no streak to keep.</p>';
      return;
    }
    el.innerHTML = items
      .map(function (item) {
        return (
          '<p class="vol-insight" data-tone="' +
          window.VolunteerCards.escapeHtml(item.tone) +
          '">' +
          window.VolunteerCards.escapeHtml(item.message) +
          "</p>"
        );
      })
      .join("");
  }

  function renderResultsMeta() {
    var el = $("vol-results-meta");
    if (!el) return;
    var n = state.filtered.length;
    var label =
      n === 0
        ? "No opportunities in this view"
        : n === 1
          ? "1 opportunity"
          : n + " opportunities";
    el.textContent = label;
  }

  function renderList() {
    var el = $("vol-results");
    if (!el) return;
    el.innerHTML = window.VolunteerCards.renderList(state.filtered, {
      selectedId: state.selectedId,
      expandedId: state.expandedId
    });
    renderResultsMeta();
  }

  function renderMapMarkers() {
    if (!mapApi) return;
    mapApi.setOpportunities(state.filtered, state.selectedId, function (id) {
      selectOpportunity(id, { fromMap: true });
    });
  }

  function refresh() {
    readFiltersFromDom();
    refreshToday();
    filterList();
    renderList();
    renderMapMarkers();
    updateLocateLabel();
  }

  function selectOpportunity(id, options) {
    var opts = options || {};
    state.selectedId = id;
    var opp =
      window.VolunteerOpportunities && window.VolunteerOpportunities.get(id);
    renderList();
    renderMapMarkers();
    if (opp && mapApi) {
      mapApi.focusOpportunity(opp, opts.fromMap ? null : 12);
    }
    if (opts.fromMap && state.view === "map" && window.matchMedia("(max-width: 959px)").matches) {
      openSheet(true);
      var card = document.querySelector('[data-opp-id="' + id + '"]');
      if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function updateLocateLabel() {
    var el = $("vol-location-label");
    if (!el) return;
    if (state.locating) {
      el.textContent = "Finding your location…";
      return;
    }
    if (state.hasFix) {
      el.textContent = "Near you";
      return;
    }
    el.textContent = "Demo area · central PA";
  }

  function setGpsStatus(text, kind) {
    var el = $("vol-gps-status");
    if (!el) return;
    el.textContent = text || "";
    el.className = "vol-gps-status" + (kind ? " is-" + kind : "");
  }

  function applyUserLocation(lat, lon, fromGeo) {
    state.userLat = lat;
    state.userLon = lon;
    state.hasFix = !!fromGeo;
    if (mapApi) {
      mapApi.setUserLocation(lat, lon);
      mapApi.map.setView([lat, lon], 11);
    }
    updateLocateLabel();
    loadWeather(lat, lon);
    refresh();
  }

  function loadWeather(lat, lon) {
    var status = $("vol-weather-status");
    if (status) status.textContent = "Checking conditions…";
    if (!window.VolunteerWeather) {
      if (status) status.textContent = "";
      return;
    }
    window.VolunteerWeather.fetchContext(lat, lon)
      .then(function (bundle) {
        state.weatherBundle = bundle;
        if (status) {
          var w = bundle.weather;
          var parts = [];
          if (w.temperatureF != null) parts.push(w.temperatureF + "°F");
          if (w.isRaining) parts.push("rain nearby");
          else if (w.isFair) parts.push("fair");
          status.textContent = parts.length
            ? "Conditions: " + parts.join(" · ")
            : "Conditions loaded";
        }
        refresh();
      })
      .catch(function () {
        state.weatherBundle = null;
        if (status) {
          status.textContent =
            "Weather unavailable — browsing still works.";
        }
        refresh();
      });
  }

  function locateUser() {
    if (!navigator.geolocation) {
      setGpsStatus("Location isn’t available in this browser.", "warn");
      return;
    }
    state.locating = true;
    updateLocateLabel();
    setGpsStatus("Requesting location…", "");
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        state.locating = false;
        applyUserLocation(pos.coords.latitude, pos.coords.longitude, true);
        setGpsStatus("Location updated. Distances are approximate.", "ok");
      },
      function () {
        state.locating = false;
        updateLocateLabel();
        setGpsStatus(
          "Couldn’t get location. You can still explore the demo area.",
          "warn"
        );
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
    );
  }

  function setView(view) {
    state.view = view;
    var shell = $("vol-shell");
    if (shell) {
      shell.setAttribute("data-view", view);
    }
    document.querySelectorAll("[data-view-btn]").forEach(function (btn) {
      var on = btn.getAttribute("data-view-btn") === view;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("is-on", on);
    });
    if (view === "map" && mapApi) {
      setTimeout(function () {
        mapApi.invalidate();
      }, 50);
    }
  }

  function openSheet(open) {
    state.sheetOpen = open;
    var panel = $("vol-panel");
    var btn = $("vol-sheet-toggle");
    if (panel) panel.classList.toggle("is-open", open);
    if (btn) {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "Hide list" : "Show list";
    }
  }

  function onResultsClick(e) {
    var actionBtn = e.target.closest("[data-action]");
    var card = e.target.closest("[data-opp-id]");
    if (!card) return;
    var id = card.getAttribute("data-opp-id");
    var opp =
      window.VolunteerOpportunities && window.VolunteerOpportunities.get(id);

    if (!actionBtn) {
      selectOpportunity(id);
      return;
    }

    var action = actionBtn.getAttribute("data-action");
    e.preventDefault();

    if (action === "save") {
      planning().toggleSaved(id);
      refresh();
      return;
    }
    if (action === "interested") {
      planning().toggleInterested(id);
      refresh();
      return;
    }
    if (action === "list") {
      planning().togglePersonalList(id);
      refresh();
      return;
    }
    if (action === "hide") {
      planning().toggleHidden(id);
      if (state.selectedId === id) state.selectedId = null;
      refresh();
      return;
    }
    if (action === "org" && opp) {
      planning().toggleOrgBookmark(opp.organizationId);
      refresh();
      return;
    }
    if (action === "toggle-detail") {
      state.expandedId = state.expandedId === id ? null : id;
      state.selectedId = id;
      renderList();
      return;
    }
    if (action === "focus-map" && opp) {
      setView("map");
      selectOpportunity(id);
      if (mapApi) mapApi.focusOpportunity(opp, 13);
      return;
    }
  }

  function renderCategoryFilters() {
    var host = $("vol-category-filters");
    if (!host || !window.VolunteerCategories) return;
    host.innerHTML = window.VolunteerCategories.list
      .map(function (cat) {
        return (
          '<label class="vol-check vol-check-cat">' +
          '<input type="checkbox" data-cat-filter="' +
          cat.id +
          '">' +
          '<span class="vol-cat-swatch" style="background:' +
          cat.color +
          '" aria-hidden="true"></span>' +
          "<span>" +
          window.VolunteerCards.escapeHtml(cat.shortLabel) +
          "</span>" +
          "</label>"
        );
      })
      .join("");
  }

  function renderLegend() {
    var host = $("vol-map-legend");
    if (!host || !window.VolunteerCategories) return;
    host.innerHTML = window.VolunteerCategories.list
      .map(function (cat) {
        return (
          '<li><span class="vol-legend-dot" style="background:' +
          cat.color +
          '"></span>' +
          window.VolunteerCards.escapeHtml(cat.shortLabel) +
          "</li>"
        );
      })
      .join("");
  }

  function clearFilters() {
    $("vol-filter-distance").value = "50";
    $("vol-filter-hours").value = "";
    $("vol-filter-setting").value = "any";
    $("vol-filter-intensity").value = "any";
    $("vol-filter-when").value = "any";
    $("vol-filter-family").checked = false;
    $("vol-filter-pet").checked = false;
    $("vol-filter-accessible").checked = false;
    $("vol-filter-season").value = "any";
    $("vol-filter-weather").value = "any";
    $("vol-filter-match-season").checked = false;
    $("vol-filter-match-weather").checked = false;
    $("vol-filter-personal").checked = false;
    document.querySelectorAll("[data-cat-filter]").forEach(function (el) {
      el.checked = false;
    });
    refresh();
  }

  function bind() {
    $("vol-results").addEventListener("click", onResultsClick);

    document.querySelectorAll("[data-view-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setView(btn.getAttribute("data-view-btn"));
      });
    });

    $("vol-locate-btn").addEventListener("click", locateUser);
    $("vol-clear-filters").addEventListener("click", clearFilters);
    $("vol-sheet-toggle").addEventListener("click", function () {
      openSheet(!state.sheetOpen);
    });

    var filterRoot = $("vol-filters");
    filterRoot.addEventListener("submit", function (e) {
      e.preventDefault();
    });
    filterRoot.addEventListener("change", refresh);
    filterRoot.addEventListener("input", function (e) {
      if (e.target && e.target.id === "vol-filter-hours") refresh();
    });

    $("vol-about-btn").addEventListener("click", function () {
      var dlg = $("vol-about");
      dlg.hidden = false;
      $("vol-about-btn").setAttribute("aria-expanded", "true");
      $("vol-about-close").focus();
    });

    function closeAbout() {
      $("vol-about").hidden = true;
      $("vol-about-btn").setAttribute("aria-expanded", "false");
      $("vol-about-btn").focus();
    }

    $("vol-about-close").addEventListener("click", closeAbout);
    $("vol-about-backdrop").addEventListener("click", closeAbout);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("vol-about").hidden) {
        closeAbout();
      }
    });

    $("vol-reset-hidden").addEventListener("click", function () {
      planning().clearHidden();
      refresh();
    });
  }

  function initMap() {
    mapApi = window.VolunteerMap.createMap("vol-map", {
      center: DEFAULT_CENTER,
      zoom: 10
    });
    mapApi.setUserLocation(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
  }

  function init() {
    document.documentElement.classList.add("vol-lock");
    renderCategoryFilters();
    renderLegend();
    initMap();
    bind();
    setView("list");
    openSheet(true);

    /* Start with demo region; weather still loads for Today insights */
    state.userLat = DEFAULT_CENTER[0];
    state.userLon = DEFAULT_CENTER[1];
    loadWeather(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
    refresh();

    if (mapApi) {
      mapApi.fitToOpportunities(
        state.filtered,
        DEFAULT_CENTER[0],
        DEFAULT_CENTER[1]
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
