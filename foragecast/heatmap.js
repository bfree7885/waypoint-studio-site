(function () {
  "use strict";

  var GRID_SIZE = 9;
  var STEP_DEG = 0.007;
  var HALF_STEP = STEP_DEG / 2;

  var ZONE_STYLE = {
    high: {
      color: "#c6ff4d",
      fillColor: "#c6ff4d",
      fillOpacity: 0.38,
      weight: 1,
      opacity: 0.65
    },
    medium: {
      color: "#9b7ed4",
      fillColor: "#9b7ed4",
      fillOpacity: 0.3,
      weight: 1,
      opacity: 0.55
    },
    low: {
      color: "#6ec8e8",
      fillColor: "#6ec8e8",
      fillOpacity: 0.14,
      weight: 1,
      opacity: 0.4
    }
  };

  var map = null;
  var zoneLayer = null;
  var markerLayer = null;
  var lastContext = null;

  function setStatus(type, text) {
    var el = document.getElementById("heatmap-status");
    if (!el) return;
    el.textContent = text;
    el.className = "heatmap-status" + (type ? " is-" + type : "");
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
          c: c
        });
      }
    }
    return points;
  }

  function fetchElevations(points) {
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
      if (!res.ok) throw new Error("Elevation data unavailable");
      return res.json();
    });
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

  function scoreCell(point, elev, centerElev, baseScore, rows) {
    var score = baseScore;
    var elevDiff = Math.abs(elev - centerElev);

    if (elevDiff <= 60) score += 0.12;
    else if (elevDiff <= 140) score += 0.08;
    else if (elevDiff <= 280) score += 0.02;
    else score -= 0.08;

    /* Prototype: south-facing slope proxy (not real aspect GIS) */
    var southBias = point.r / (rows - 1) - 0.5;
    score += southBias * 0.1;

    /* Prototype: minor east/west variation */
    var eastBias = point.c / (rows - 1) - 0.5;
    score += eastBias * 0.04;

    /* Prototype: spatial variation placeholder */
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

  function ensureMap(centerLat, centerLon) {
    var container = document.getElementById("heatmap-map");
    if (!container || typeof L === "undefined") return null;

    if (!map) {
      map = L.map(container, {
        scrollWheelZoom: true,
        attributionControl: true
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19
        }
      ).addTo(map);

      zoneLayer = L.layerGroup().addTo(map);
      markerLayer = L.layerGroup().addTo(map);
    }

    map.setView([centerLat, centerLon], 12);
    setTimeout(function () {
      map.invalidateSize();
    }, 150);

    return map;
  }

  function clearLayers() {
    if (zoneLayer) zoneLayer.clearLayers();
    if (markerLayer) markerLayer.clearLayers();
  }

  function renderHeatmap(centerLat, centerLon, signals, placeName) {
    if (typeof L === "undefined") {
      setStatus("error", "Map library failed to load.");
      return Promise.resolve();
    }

    setStatus("loading", "Building scouting zones…");
    ensureMap(centerLat, centerLon);
    clearLayers();

    var points = buildGrid(centerLat, centerLon);
    var formCtx = getFormContext({ region: placeName });
    var baseScore = weatherBaseScore(signals, formCtx);

    return fetchElevations(points)
      .then(function (data) {
        var elevations = data.elevation || [];
        var centerElev = elevations[Math.floor(elevations.length / 2)] || 300;
        var counts = { high: 0, medium: 0, low: 0 };

        points.forEach(function (point, i) {
          var elev = elevations[i] != null ? elevations[i] : centerElev;
          var score = scoreCell(point, elev, centerElev, baseScore, GRID_SIZE);
          var zone = classifyZone(score);
          counts[zone] += 1;

          var bounds = [
            [point.lat - HALF_STEP, point.lon - HALF_STEP],
            [point.lat + HALF_STEP, point.lon + HALF_STEP]
          ];

          L.rectangle(bounds, ZONE_STYLE[zone])
            .bindPopup(
              "<strong>" +
                zone.charAt(0).toUpperCase() +
                zone.slice(1) +
                " scouting likelihood</strong><br>" +
                "Real: ~" +
                Math.round(elev) +
                " m elevation<br>" +
                "Real: " +
                signals.rainfall +
                " rain / " +
                signals.temperature +
                " trend<br>" +
                "<em>Prototype: slope + habitat scoring</em>"
            )
            .addTo(zoneLayer);
        });

        L.circleMarker([centerLat, centerLon], {
          radius: 7,
          color: "#c6ff4d",
          fillColor: "#c6ff4d",
          fillOpacity: 0.9,
          weight: 2
        })
          .bindPopup(placeName || "Search center")
          .addTo(markerLayer);

        var label = placeName ? " for " + placeName : "";
        setStatus(
          "success",
          "Scouting map" +
            label +
            " — high: " +
            counts.high +
            ", medium: " +
            counts.medium +
            ", low: " +
            counts.low +
            ". Prototype scoring — not guaranteed mushroom locations."
        );
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
        name: place.name + (place.admin1 ? ", " + place.admin1 : "")
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
      signals: null
    };
    return loadSignalsForLocation(loc.lat, loc.lon).then(function (signals) {
      lastContext.signals = signals;
      return renderHeatmap(loc.lat, loc.lon, signals, loc.name);
    });
  }

  function bindControls() {
    var locateBtn = document.getElementById("heatmap-locate-btn");
    var syncBtn = document.getElementById("heatmap-sync-btn");
    var generateBtn = document.getElementById("heatmap-generate-btn");
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
              name: "Your location"
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
        signals: d.signals
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
