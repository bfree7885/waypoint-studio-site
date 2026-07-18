/**
 * Waypoint Volunteer — Discovery Engine v0.1 app
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
    activePromptId: null,
    filters: {
      facets: [],
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
      personalOnly: false,
      citizenScienceOnly: false
    },
    weatherBundle: null,
    todayResult: null,
    recommendResult: null,
    filtered: [],
    sheetOpen: true
  };

  var mapApi = null;

  function $(id) {
    return document.getElementById(id);
  }

  function opportunities() {
    return (
      (window.VolunteerOpportunities && window.VolunteerOpportunities.list) ||
      []
    );
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
    f.citizenScienceOnly = $("vol-filter-science").checked;

    var cats = [];
    document.querySelectorAll("[data-cat-filter]").forEach(function (el) {
      if (el.checked) cats.push(el.getAttribute("data-cat-filter"));
    });
    f.categories = cats;

    var facets = [];
    document.querySelectorAll("[data-facet].is-on").forEach(function (el) {
      facets.push(el.getAttribute("data-facet"));
    });
    f.facets = facets;

    if (planning()) {
      planning().setAvailableHours(
        f.availableHours === "" ? null : f.availableHours
      );
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
    state.todayResult = window.VolunteerTodayEngine.run(buildTodayContext());
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
      weatherTags: weatherTags,
      now: new Date()
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

  function renderTodayICan() {
    var host = $("vol-today-ican-results");
    if (!host) return;
    if (!state.recommendResult) {
      host.innerHTML =
        '<p class="muted">Choose a prompt above. Recommendations include clear reasons — never pressure.</p>';
      return;
    }
    var res = state.recommendResult;
    if (!res.results.length) {
      host.innerHTML =
        "<p>" + window.VolunteerCards.escapeHtml(res.message) + "</p>";
      return;
    }
    host.innerHTML =
      "<p class=\"vol-ican-msg\">" +
      window.VolunteerCards.escapeHtml(res.message) +
      "</p>" +
      res.results
        .map(function (r) {
          var opp = r.opportunity;
          return (
            '<article class="vol-ican-card">' +
            "<h3><a href=\"opportunity/?id=" +
            encodeURIComponent(opp.id) +
            '">' +
            window.VolunteerCards.escapeHtml(opp.title) +
            "</a></h3>" +
            "<ul class=\"vol-reason-list\">" +
            r.reasons
              .map(function (reason) {
                return (
                  "<li>" +
                  window.VolunteerCards.escapeHtml(reason) +
                  "</li>"
                );
              })
              .join("") +
            "</ul></article>"
          );
        })
        .join("");
  }

  function runPrompt(promptId) {
    state.activePromptId = promptId;
    document.querySelectorAll("[data-prompt]").forEach(function (btn) {
      var on = btn.getAttribute("data-prompt") === promptId;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var ctx = buildTodayContext();
    if (state.todayResult && state.todayResult.context) {
      ctx = Object.assign(ctx, state.todayResult.context);
    }
    state.recommendResult = window.VolunteerTodayICan.recommend(
      opportunities(),
      promptId,
      ctx,
      { planning: planning(), distanceMiles: state.filters.distanceMiles, limit: 5 }
    );
    renderTodayICan();
  }

  function renderResultsMeta() {
    var el = $("vol-results-meta");
    if (!el) return;
    var n = state.filtered.length;
    el.textContent =
      n === 0
        ? "No opportunities in this view"
        : n === 1
          ? "1 opportunity"
          : n + " opportunities";
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
    if (state.activePromptId) runPrompt(state.activePromptId);
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
    if (
      opts.fromMap &&
      state.view === "map" &&
      window.matchMedia("(max-width: 959px)").matches
    ) {
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
          status.textContent = "Weather unavailable — browsing still works.";
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
    if (shell) shell.setAttribute("data-view", view);
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
      if (e.target.closest("a")) return;
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

  function renderFacets() {
    var host = $("vol-facets");
    if (!host || !window.VolunteerModel) return;
    host.innerHTML = window.VolunteerModel.discoveryFacets
      .map(function (facet) {
        return (
          '<button type="button" class="vol-facet" data-facet="' +
          facet.id +
          '" aria-pressed="false">' +
          window.VolunteerCards.escapeHtml(facet.label) +
          "</button>"
        );
      })
      .join("");
  }

  function renderPrompts() {
    var host = $("vol-today-ican-prompts");
    if (!host || !window.VolunteerTodayICan) return;
    host.innerHTML = window.VolunteerTodayICan.prompts
      .map(function (p) {
        return (
          '<button type="button" class="vol-prompt" data-prompt="' +
          p.id +
          '" aria-pressed="false">' +
          window.VolunteerCards.escapeHtml(p.label) +
          "</button>"
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
    $("vol-filter-science").checked = false;
    document.querySelectorAll("[data-cat-filter]").forEach(function (el) {
      el.checked = false;
    });
    document.querySelectorAll("[data-facet]").forEach(function (el) {
      el.classList.remove("is-on");
      el.setAttribute("aria-pressed", "false");
    });
    state.activePromptId = null;
    state.recommendResult = null;
    document.querySelectorAll("[data-prompt]").forEach(function (el) {
      el.classList.remove("is-on");
      el.setAttribute("aria-pressed", "false");
    });
    renderTodayICan();
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

    $("vol-facets").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-facet]");
      if (!btn) return;
      btn.classList.toggle("is-on");
      btn.setAttribute(
        "aria-pressed",
        btn.classList.contains("is-on") ? "true" : "false"
      );
      refresh();
    });

    $("vol-today-ican-prompts").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-prompt]");
      if (!btn) return;
      runPrompt(btn.getAttribute("data-prompt"));
    });

    if (window.WaypointA11y && window.WaypointA11y.bindDialog) {
      window.WaypointA11y.bindDialog({
        dialog: $("vol-about"),
        openBtn: $("vol-about-btn"),
        closeBtn: $("vol-about-close"),
        backdrop: $("vol-about-backdrop")
      });
    } else {
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
        if (e.key === "Escape" && !$("vol-about").hidden) closeAbout();
      });
    }

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
    renderFacets();
    renderPrompts();
    renderLegend();
    renderTodayICan();
    initMap();
    bind();
    setView("list");
    openSheet(true);

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
