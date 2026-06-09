(function () {
  "use strict";

  var GRID_SIZE = 9;
  var STEP_DEG = 0.007;
  var ELEVATION_BATCH = 25;

  /* CARTO Voyager (OSM data): base + label overlay keeps towns/roads readable above zones */
  var BASEMAP = {
    base:
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    labels:
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19
  };

  var ZONE_STYLE = {
    high: {
      color: "#9ec836",
      fillColor: "#c6ff4d",
      fillOpacity: 0.42,
      weight: 1,
      opacity: 0.72
    },
    medium: {
      color: "#9b7ed4",
      fillColor: "#9b7ed4",
      fillOpacity: 0.34,
      weight: 1,
      opacity: 0.62
    },
    low: {
      color: "#6ec8e8",
      fillColor: "#6ec8e8",
      fillOpacity: 0.2,
      weight: 1,
      opacity: 0.5
    }
  };

  var map = null;
  var zoneLayer = null;
  var markerLayer = null;
  var lastContext = null;
  var lastRenderedView = null;
  var mapEventsBound = false;

  function setStatus(type, text) {
    var el = document.getElementById("heatmap-status");
    if (!el) return;
    el.textContent = text;
    el.className = "heatmap-status" + (type ? " is-" + type : "");
  }

  function setElevationNote(visible) {
    var el = document.getElementById("heatmap-elevation-note");
    if (!el) return;
    el.hidden = !visible;
  }

  function setUpdateViewButton(visible) {
    var btn = document.getElementById("heatmap-update-view-btn");
    if (!btn) return;
    btn.hidden = !visible;
  }

  function getHeatmapForm() {
    return document.getElementById("heatmap-location-form");
  }

  function getWeatherForm() {
    return document.getElementById("weather-form");
  }

  function getFormContext(overrides) {
    var form = getWeatherForm();
    var heatmap = getHeatmapForm();
    overrides = overrides || {};
    var ctx = {
      forest: "mixed",
      elevation: "mid",
      rainfall: "moderate",
      temperature: "warming",
      state: "Pennsylvania",
      region: ""
    };
    if (form) {
      ctx.forest = form.forest ? form.forest.value : ctx.forest;
      ctx.elevation = form.elevation ? form.elevation.value : ctx.elevation;
      ctx.rainfall = form.rainfall ? form.rainfall.value : ctx.rainfall;
      ctx.temperature = form.temperature ? form.temperature.value : ctx.temperature;
      ctx.state = form.state ? form.state.value : ctx.state;
      ctx.region = form.region ? form.region.value.trim() : ctx.region;
    }
    if (heatmap && heatmap.state && heatmap.state.value) {
      ctx.state = heatmap.state.value;
    }
    if (heatmap && heatmap.region && heatmap.region.value.trim()) {
      ctx.region = heatmap.region.value.trim();
    }
    if (overrides.state) ctx.state = overrides.state;
    if (overrides.region) ctx.region = overrides.region;
    return ctx;
  }

  function regionalElevationEstimate() {
    if (lastContext && lastContext.elevationM != null && !isNaN(lastContext.elevationM)) {
      return lastContext.elevationM;
    }
    var band = getFormContext().elevation;
    if (band === "low") return 180;
    if (band === "high") return 650;
    return 350;
  }

  function estimateElevations(points, centerEstimate) {
    centerEstimate = centerEstimate != null ? centerEstimate : regionalElevationEstimate();
    return points.map(function (point) {
      var rowOffset = point.r != null ? (point.r - (GRID_SIZE - 1) / 2) * 18 : 0;
      var colOffset = point.c != null ? (point.c - (GRID_SIZE - 1) / 2) * 10 : 0;
      return Math.max(0, centerEstimate + rowOffset + colOffset);
    });
  }

  function fetchElevationBatchGET(points) {
    var lats = points
      .map(function (p) {
        return p.lat.toFixed(4);
      })
      .join(",");
    var lons = points
      .map(function (p) {
        return p.lon.toFixed(4);
      })
      .join(",");
    var url =
      "https://api.open-meteo.com/v1/elevation?latitude=" +
      lats +
      "&longitude=" +
      lons;

    return fetch(url).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || data.error || !data.elevation || !data.elevation.length) {
          throw new Error(data.reason || "Elevation batch unavailable");
        }
        return data.elevation;
      });
    });
  }

  function fetchElevationBatchPOST(points) {
    var body = {
      latitude: points.map(function (p) {
        return parseFloat(p.lat.toFixed(4));
      }),
      longitude: points.map(function (p) {
        return parseFloat(p.lon.toFixed(4));
      })
    };

    return fetch("https://api.open-meteo.com/v1/elevation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || data.error || !data.elevation || !data.elevation.length) {
          throw new Error(data.reason || "Elevation batch unavailable");
        }
        return data.elevation;
      });
    });
  }

  function fetchElevationBatch(points) {
    return fetchElevationBatchGET(points).catch(function () {
      return fetchElevationBatchPOST(points);
    });
  }

  function fetchElevations(points) {
    var batches = [];
    for (var i = 0; i < points.length; i += ELEVATION_BATCH) {
      batches.push(points.slice(i, i + ELEVATION_BATCH));
    }

    var results = [];
    var chain = Promise.resolve();

    batches.forEach(function (batch) {
      chain = chain.then(function () {
        return fetchElevationBatch(batch)
          .then(function (elevs) {
            results.push({ ok: true, elevs: elevs });
          })
          .catch(function () {
            results.push({
              ok: false,
              elevs: estimateElevations(batch)
            });
          });
      });
    });

    return chain
      .then(function () {
        var elevations = [];
        var usedFallback = false;

        results.forEach(function (chunk) {
          if (!chunk.ok) usedFallback = true;
          elevations = elevations.concat(chunk.elevs);
        });

        if (elevations.length !== points.length) {
          usedFallback = true;
          elevations = estimateElevations(points);
        }

        return {
          elevations: elevations,
          usedFallback: usedFallback
        };
      })
      .catch(function () {
        return {
          elevations: estimateElevations(points),
          usedFallback: true
        };
      });
  }

  function timingModifier(formCtx) {
    if (!window.ForageCast || !window.ForageCast.computeMorelRead) return 0;
    var read = window.ForageCast.computeMorelRead({
      state: formCtx.state,
      region: formCtx.region,
      elevation: formCtx.elevation,
      rainfall: formCtx.rainfall,
      temperature: formCtx.temperature,
      forest: formCtx.forest
    });
    if (read.timing === "Prime" || read.timing === "Improving") return 0.06;
    if (read.timing === "Early") return -0.1;
    if (read.timing === "Late") return -0.08;
    if (read.timing === "Poor") return -0.14;
    return 0;
  }

  function buildGrid(centerLat, centerLon) {
    var points = [];
    var half = (GRID_SIZE - 1) / 2;
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        points.push({
          lat: centerLat + (half - r) * STEP_DEG,
          lon: centerLon + (c - half) * STEP_DEG,
          r: r,
          c: c,
          latStep: STEP_DEG,
          lonStep: STEP_DEG
        });
      }
    }
    return points;
  }

  function buildGridFromBounds(bounds) {
    var north = bounds.getNorth();
    var south = bounds.getSouth();
    var east = bounds.getEast();
    var west = bounds.getWest();
    var latStep = (north - south) / GRID_SIZE;
    var lonStep = (east - west) / GRID_SIZE;
    var points = [];

    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        points.push({
          lat: north - (r + 0.5) * latStep,
          lon: west + (c + 0.5) * lonStep,
          r: r,
          c: c,
          latStep: latStep,
          lonStep: lonStep
        });
      }
    }

    return points;
  }

  function getGridPoints(centerLat, centerLon) {
    if (map && map.getBounds && map.getBounds().isValid()) {
      return buildGridFromBounds(map.getBounds());
    }
    return buildGrid(centerLat, centerLon);
  }

  function cellBounds(point) {
    var halfLat = point.latStep / 2;
    var halfLon = point.lonStep / 2;
    return [
      [point.lat - halfLat, point.lon - halfLon],
      [point.lat + halfLat, point.lon + halfLon]
    ];
  }

  function weatherBaseScore(signals, formCtx) {
    var score = 0.42;

    if (signals.rainfall === "wet") score += 0.18;
    else if (signals.rainfall === "moderate") score += 0.1;
    else score -= 0.12;

    if (signals.temperature === "warming") score += 0.14;
    else if (signals.temperature === "cold") score -= 0.18;
    else if (signals.temperature === "warm") score -= 0.06;

    if (formCtx.forest === "ash" || formCtx.forest === "mixed") score += 0.08;
    else if (formCtx.forest === "conifer") score -= 0.14;

    score += timingModifier(formCtx);

    return score;
  }

  function scoreCell(point, elev, centerElev, baseScore, rows, usedFallback) {
    var score = baseScore;

    if (!usedFallback) {
      var elevDiff = Math.abs(elev - centerElev);
      if (elevDiff <= 60) score += 0.12;
      else if (elevDiff <= 140) score += 0.08;
      else if (elevDiff <= 280) score += 0.02;
      else score -= 0.08;
    }

    var southBias = point.r / (rows - 1) - 0.5;
    score += southBias * 0.1;

    var eastBias = point.c / (rows - 1) - 0.5;
    score += eastBias * 0.04;

    var noise =
      Math.sin(point.lat * 1200 + point.lon * 900) * 0.04 +
      Math.cos(point.r * 1.7 + point.c * 2.1) * 0.03;
    score += noise;

    return score;
  }

  function classifyZone(score) {
    if (score >= 0.62) return "high";
    if (score >= 0.45) return "medium";
    return "low";
  }

  function bindMapViewEvents() {
    if (!map || mapEventsBound) return;
    mapEventsBound = true;

    map.on("moveend zoomend", function () {
      if (!lastRenderedView || !lastContext || !lastContext.signals) return;
      var center = map.getCenter();
      var zoom = map.getZoom();
      var moved =
        Math.abs(center.lat - lastRenderedView.lat) > 0.00005 ||
        Math.abs(center.lng - lastRenderedView.lng) > 0.00005 ||
        zoom !== lastRenderedView.zoom;

      if (moved) {
        setUpdateViewButton(true);
        setStatus("", "Map moved — update heatmap for this view.");
      }
    });
  }

  function ensureMap(centerLat, centerLon, recenter) {
    var container = document.getElementById("heatmap-map");
    if (!container || typeof L === "undefined") return null;

    if (!map) {
      map = L.map(container, {
        scrollWheelZoom: true,
        attributionControl: true
      });

      map.createPane("heatmap-labels");
      map.getPane("heatmap-labels").style.zIndex = 450;
      map.getPane("heatmap-labels").style.pointerEvents = "none";

      L.tileLayer(BASEMAP.base, {
        attribution: BASEMAP.attribution,
        subdomains: BASEMAP.subdomains,
        maxZoom: BASEMAP.maxZoom
      }).addTo(map);

      L.tileLayer(BASEMAP.labels, {
        pane: "heatmap-labels",
        subdomains: BASEMAP.subdomains,
        maxZoom: BASEMAP.maxZoom
      }).addTo(map);

      zoneLayer = L.layerGroup().addTo(map);
      markerLayer = L.layerGroup().addTo(map);
      bindMapViewEvents();
    }

    if (recenter !== false) {
      map.setView([centerLat, centerLon], map.getZoom() || 12);
    }

    setTimeout(function () {
      map.invalidateSize();
    }, 150);

    return map;
  }

  function clearLayers() {
    if (zoneLayer) zoneLayer.clearLayers();
    if (markerLayer) markerLayer.clearLayers();
  }

  function waitForMapBounds() {
    return new Promise(function (resolve) {
      if (!map) {
        resolve();
        return;
      }
      setTimeout(resolve, 180);
    });
  }

  function renderHeatmap(centerLat, centerLon, signals, placeName, options) {
    options = options || {};

    if (typeof L === "undefined") {
      setStatus("error", "Map library failed to load.");
      return Promise.resolve();
    }

    if (!signals) {
      setStatus("error", "Weather signals unavailable. Load weather or generate from a location first.");
      return Promise.resolve();
    }

    setStatus("loading", "Building scouting zones…");
    ensureMap(centerLat, centerLon, options.recenter !== false);
    clearLayers();
    setUpdateViewButton(false);
    setElevationNote(false);

    return waitForMapBounds()
      .then(function () {
        var points = getGridPoints(centerLat, centerLon);
        var formCtx = getFormContext({ region: placeName });
        var baseScore = weatherBaseScore(signals, formCtx);

        return fetchElevations(points)
          .then(function (result) {
          var elevations = result.elevations;
          var usedFallback = result.usedFallback;
          var centerElev =
            elevations[Math.floor(elevations.length / 2)] != null
              ? elevations[Math.floor(elevations.length / 2)]
              : regionalElevationEstimate();
          var counts = { high: 0, medium: 0, low: 0 };

          points.forEach(function (point, i) {
            var elev =
              elevations[i] != null ? elevations[i] : regionalElevationEstimate();
            var score = scoreCell(
              point,
              elev,
              centerElev,
              baseScore,
              GRID_SIZE,
              usedFallback
            );
            var zone = classifyZone(score);
            counts[zone] += 1;

            var elevLabel = usedFallback
              ? "Regional elevation estimate"
              : "~" + Math.round(elev) + " m elevation";

            L.rectangle(cellBounds(point), ZONE_STYLE[zone])
              .bindPopup(
                "<strong>" +
                  zone.charAt(0).toUpperCase() +
                  zone.slice(1) +
                  " scouting zone</strong><br>" +
                  "Broad area — not a parcel or property line.<br>" +
                  elevLabel +
                  "<br>" +
                  signals.rainfall +
                  " rain / " +
                  signals.temperature +
                  " trend<br>" +
                  "<em>Prototype: slope + habitat scoring</em>"
              )
              .addTo(zoneLayer);
          });

          if (options.showCenterMarker !== false) {
            L.circleMarker([centerLat, centerLon], {
              radius: 7,
              color: "#9ec836",
              fillColor: "#c6ff4d",
              fillOpacity: 0.9,
              weight: 2
            })
              .bindPopup(placeName || "Map center")
              .addTo(markerLayer);
          }

          lastRenderedView = {
            lat: map.getCenter().lat,
            lng: map.getCenter().lng,
            zoom: map.getZoom()
          };

          setElevationNote(usedFallback);

          var label = placeName ? " for " + placeName : "";
          setStatus(
            "success",
            "Scouting zones" +
              label +
              " — high: " +
              counts.high +
              ", medium: " +
              counts.medium +
              ", low: " +
              counts.low +
              "."
          );
        });
      })
      .catch(function (err) {
        setStatus("error", err.message || "Could not generate scouting map.");
      });
  }

  function geocodeRegion(region, state) {
    if (!window.ForageCastWeather) {
      return Promise.reject(new Error("Weather module not loaded."));
    }
    return window.ForageCastWeather.geocode(region, state).then(function (place) {
      return {
        lat: place.latitude,
        lon: place.longitude,
        name: place.name + (place.admin1 ? ", " + place.admin1 : ""),
        elevationM: place.elevation != null ? place.elevation : null
      };
    });
  }

  function resolveLocationFromHeatmapForm() {
    var form = getHeatmapForm();
    if (!form) {
      return Promise.reject(new Error("Location form not found."));
    }
    var region = form.region.value.trim();
    var state = form.state.value;
    if (!region) {
      return Promise.reject(new Error("Enter a city or county name."));
    }
    return geocodeRegion(region, state);
  }

  function syncFromWeatherForm() {
    var weather = getWeatherForm();
    var heatmap = getHeatmapForm();
    if (!weather || !heatmap) return;
    if (weather.state) heatmap.state.value = weather.state.value;
    if (weather.region && weather.region.value.trim()) {
      heatmap.region.value = weather.region.value.trim();
    }
    setStatus("", "Copied location from weather form. Click Generate scouting map.");
  }

  function loadSignalsForLocation(lat, lon) {
    if (!window.ForageCastWeather) {
      return Promise.resolve({
        rainfall: "moderate",
        temperature: "warming"
      });
    }
    return window.ForageCastWeather.fetchForecast(lat, lon).then(function (
      forecast
    ) {
      return window.ForageCastWeather.analyzeForecast(forecast);
    });
  }

  function generateFromLocation(loc) {
    lastContext = {
      lat: loc.lat,
      lon: loc.lon,
      name: loc.name,
      signals: null,
      elevationM: loc.elevationM != null ? loc.elevationM : null
    };
    return loadSignalsForLocation(loc.lat, loc.lon).then(function (signals) {
      lastContext.signals = signals;
      return renderHeatmap(loc.lat, loc.lon, signals, loc.name, {
        recenter: true,
        showCenterMarker: true
      });
    });
  }

  function updateHeatmapForCurrentView() {
    if (!map || !lastContext || !lastContext.signals) {
      setStatus("error", "Generate a scouting map first.");
      return;
    }

    var center = map.getCenter();
    renderHeatmap(center.lat, center.lng, lastContext.signals, lastContext.name, {
      recenter: false,
      showCenterMarker: false
    });
  }

  function bindControls() {
    var locateBtn = document.getElementById("heatmap-locate-btn");
    var syncBtn = document.getElementById("heatmap-sync-btn");
    var generateBtn = document.getElementById("heatmap-generate-btn");
    var updateViewBtn = document.getElementById("heatmap-update-view-btn");
    var locationForm = getHeatmapForm();

    if (locationForm) {
      locationForm.addEventListener("submit", function (e) {
        e.preventDefault();
        generateBtn && generateBtn.click();
      });
    }

    if (generateBtn) {
      generateBtn.addEventListener("click", function () {
        setStatus("loading", "Finding location…");
        resolveLocationFromHeatmapForm()
          .then(generateFromLocation)
          .catch(function (err) {
            setStatus("error", err.message);
          });
      });
    }

    if (updateViewBtn) {
      updateViewBtn.addEventListener("click", function () {
        updateHeatmapForCurrentView();
      });
    }

    if (locateBtn) {
      locateBtn.addEventListener("click", function () {
        if (!navigator.geolocation) {
          setStatus("error", "Location is not available in this browser.");
          return;
        }
        if (!window.isSecureContext) {
          setStatus(
            "error",
            "Geolocation requires HTTPS or localhost. Enter a city manually instead."
          );
          return;
        }
        setStatus("loading", "Requesting location…");
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            generateFromLocation({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              name: "Your location",
              elevationM: null
            });
          },
          function (err) {
            var msg = "Location permission denied.";
            if (err.code === 2) msg = "Location unavailable. Enter a city manually.";
            if (err.code === 3) msg = "Location timed out. Try again or enter manually.";
            setStatus("error", msg);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 }
        );
      });
    }

    if (syncBtn) {
      syncBtn.addEventListener("click", syncFromWeatherForm);
    }

    document.addEventListener("foragecast:location", function (e) {
      var d = e.detail;
      var heatmap = getHeatmapForm();
      if (heatmap && d.place) {
        if (d.place.admin1 && heatmap.state) {
          heatmap.state.value = d.place.admin1;
        }
        if (d.place.name && heatmap.region) {
          heatmap.region.value = d.place.name;
        }
      }
      lastContext = {
        lat: d.lat,
        lon: d.lon,
        name: d.place && d.place.name ? d.place.name : "Selected area",
        signals: d.signals,
        elevationM: d.place && d.place.elevation != null ? d.place.elevation : null
      };
      setStatus(
        "",
        "Weather loaded for " +
          (lastContext.name || "this area") +
          ". Generate scouting map or adjust location above."
      );
    });
  }

  bindControls();
})();
