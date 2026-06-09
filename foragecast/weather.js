(function () {
  "use strict";

  var MM_PER_IN = 25.4;
  var PRECIP_DRY_MM = 12;
  var PRECIP_WET_MM = 35;
  var COLD_AVG_F = 50;
  var WARM_AVG_F = 65;

  function cToF(c) {
    return (c * 9) / 5 + 32;
  }

  function mmToIn(mm) {
    return mm / MM_PER_IN;
  }

  function sum(arr, start, count) {
    var total = 0;
    for (var i = start; i < start + count && i < arr.length; i++) {
      total += arr[i] || 0;
    }
    return total;
  }

  function avg(arr, start, count) {
    if (count <= 0) return 0;
    return sum(arr, start, count) / count;
  }

  function pickPlace(results, state, query) {
    var q = (query || "").toLowerCase();
    var inState = results.filter(function (r) {
      return r.admin1 === state && r.country_code === "US";
    });
    var pool = inState.length ? inState : results;

    if (q) {
      var countyMatch = pool.find(function (r) {
        return r.admin2 && r.admin2.toLowerCase().indexOf(q.replace(/ county$/, "")) !== -1;
      });
      if (countyMatch) return countyMatch;

      var nameMatch = pool.find(function (r) {
        return r.name && r.name.toLowerCase().indexOf(q) !== -1;
      });
      if (nameMatch) return nameMatch;
    }

    return pool[0];
  }

  function searchPlaces(term) {
    var url =
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(term) +
      "&count=10&language=en&format=json";

    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Geocoding failed");
      return res.json();
    });
  }

  function geocode(query, state) {
    var stripped = query.replace(/\s+county$/i, "").trim();
    var attempts = [
      query + ", " + state,
      query,
      stripped + ", " + state,
      stripped + " " + state
    ];
    var chain = Promise.reject();

    attempts.forEach(function (term) {
      chain = chain.catch(function () {
        return searchPlaces(term).then(function (data) {
          if (!data.results || !data.results.length) {
            throw new Error("no results");
          }
          return pickPlace(data.results, state, query);
        });
      });
    });

    return chain.catch(function () {
      throw new Error("Location not found — try a city or county name.");
    });
  }

  function fetchForecast(lat, lon) {
    var url =
      "https://api.open-meteo.com/v1/forecast?latitude=" +
      lat +
      "&longitude=" +
      lon +
      "&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&past_days=14&forecast_days=1&timezone=auto";

    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Weather data unavailable");
      return res.json();
    });
  }

  function mapPrecip(mm7) {
    if (mm7 < PRECIP_DRY_MM) return "dry";
    if (mm7 > PRECIP_WET_MM) return "wet";
    return "moderate";
  }

  function mapTemperature(maxTempsC) {
    var len = maxTempsC.length;
    if (len < 7) return "warming";

    var recentAvgF = cToF(avg(maxTempsC, len - 3, 3));
    var priorAvgF = cToF(avg(maxTempsC, len - 7, 4));
    var deltaF = recentAvgF - priorAvgF;

    if (recentAvgF < COLD_AVG_F || deltaF < -3) return "cold";
    if (recentAvgF > WARM_AVG_F) return "warm";
    if (deltaF > 1.5) return "warming";
    if (recentAvgF >= COLD_AVG_F && recentAvgF <= WARM_AVG_F) return "warming";
    return "warming";
  }

  function mapElevation(meters) {
    if (meters == null || isNaN(meters)) return "mid";
    if (meters < 250) return "low";
    if (meters > 600) return "high";
    return "mid";
  }

  function elevationLabel(band) {
    if (band === "low") return "Low";
    if (band === "high") return "High";
    return "Mid";
  }

  function precipLabel(band) {
    if (band === "dry") return "Dry";
    if (band === "wet") return "Wet";
    return "Moderate";
  }

  function tempLabel(band) {
    if (band === "cold") return "Cold";
    if (band === "warm") return "Warm";
    return "Warming";
  }

  function analyzeForecast(forecast) {
    var daily = forecast.daily;
    var precip = daily.precipitation_sum;
    var maxTemps = daily.temperature_2m_max;
    var len = precip.length;
    var precip7mm = sum(precip, Math.max(0, len - 7), 7);
    var rainfall = mapPrecip(precip7mm);
    var temperature = mapTemperature(maxTemps);
    var recentAvgF = cToF(avg(maxTemps, len - 3, 3));
    var priorAvgF = cToF(avg(maxTemps, len - 7, 4));

    return {
      precip7mm: precip7mm,
      precip7in: mmToIn(precip7mm),
      rainfall: rainfall,
      temperature: temperature,
      recentAvgF: recentAvgF,
      priorAvgF: priorAvgF,
      tempDeltaF: recentAvgF - priorAvgF
    };
  }

  function setSelectValue(select, value) {
    select.value = value;
    select.classList.add("is-live-filled");
  }

  function setStatus(el, type, text) {
    if (!el) return;
    el.textContent = text;
    el.className = "weather-load-status" + (type ? " is-" + type : "");
  }

  function showLivePanel(panel, data) {
    if (!panel) return;
    panel.hidden = false;
    panel.innerHTML =
      "<p class=\"weather-live-label\">Live weather · Open-Meteo</p>" +
      "<dl class=\"weather-live-stats\">" +
      "<div><dt>7-day precipitation</dt><dd>" +
      data.signals.precip7in.toFixed(2) +
      " in (" +
      Math.round(data.signals.precip7mm) +
      " mm) → " +
      precipLabel(data.signals.rainfall) +
      "</dd></div>" +
      "<div><dt>Recent high temps</dt><dd>" +
      Math.round(data.signals.recentAvgF) +
      "°F avg · " +
      tempLabel(data.signals.temperature) +
      " trend</dd></div>" +
      "<div><dt>Elevation</dt><dd>" +
      (data.place.elevation != null
        ? Math.round(data.place.elevation) + " m → " + elevationLabel(data.elevation)
        : elevationLabel(data.elevation)) +
      "</dd></div>" +
      "</dl>" +
      "<p class=\"muted weather-live-note\">Rainfall and temperature fields updated below. Adjust forest type, then generate your read.</p>";
  }

  function applyToForm(form, place, signals) {
    var elevation = mapElevation(place.elevation);
    setSelectValue(form.rainfall, signals.rainfall);
    setSelectValue(form.temperature, signals.temperature);
    setSelectValue(form.elevation, elevation);

    if (place.name && form.region && !form.region.value.trim()) {
      form.region.value = place.name;
    }

    form.dataset.liveWeather = "true";
    form.dataset.liveLat = String(place.latitude);
    form.dataset.liveLon = String(place.longitude);
    form.dataset.livePlace = place.name || "";

    return {
      place: place,
      signals: signals,
      elevation: elevation,
      liveBullets: [
        "Live 7-day precipitation: " +
          signals.precip7in.toFixed(2) +
          " in — mapped to " +
          precipLabel(signals.rainfall).toLowerCase() +
          " conditions.",
        "Recent daily highs averaging " +
          Math.round(signals.recentAvgF) +
          "°F (" +
          (signals.tempDeltaF >= 0 ? "+" : "") +
          Math.round(signals.tempDeltaF) +
          "°F vs prior week) — " +
          tempLabel(signals.temperature).toLowerCase() +
          " trend.",
        "Elevation ~" +
          (place.elevation != null ? Math.round(place.elevation) + " m" : "unknown") +
          " — " +
          elevationLabel(elevation).toLowerCase() +
          " elevation band."
      ]
    };
  }

  function loadWeather(form, placeResolver) {
    var statusEl = document.getElementById("weather-load-status");
    var panel = document.getElementById("weather-live-panel");
    var loadBtn = document.getElementById("weather-load-btn");
    var locateBtn = document.getElementById("weather-locate-btn");

    setStatus(statusEl, "loading", "Loading live weather…");
    if (loadBtn) loadBtn.disabled = true;
    if (locateBtn) locateBtn.disabled = true;

    return placeResolver()
      .then(function (place) {
        return fetchForecast(place.latitude, place.longitude).then(function (
          forecast
        ) {
          var signals = analyzeForecast(forecast);
          var applied = applyToForm(form, place, signals);
          showLivePanel(panel, applied);
          setStatus(
            statusEl,
            "success",
            "Weather loaded for " +
              (place.name || "selected area") +
              (place.admin1 ? ", " + place.admin1 : "") +
              "."
          );

          if (window.ForageCast && window.ForageCast.setLiveWeatherBullets) {
            window.ForageCast.setLiveWeatherBullets(applied.liveBullets);
          }

          document.dispatchEvent(
            new CustomEvent("foragecast:location", {
              detail: {
                lat: place.latitude,
                lon: place.longitude,
                place: place,
                signals: signals,
                elevation: elevation
              }
            })
          );

          return applied;
        });
      })
      .catch(function (err) {
        setStatus(
          statusEl,
          "error",
          err.message || "Could not load weather. Try again or enter conditions manually."
        );
        if (panel) panel.hidden = true;
        form.dataset.liveWeather = "false";
        throw err;
      })
      .finally(function () {
        if (loadBtn) loadBtn.disabled = false;
        if (locateBtn) locateBtn.disabled = false;
      });
  }

  function bindWeatherLoad() {
    var form = document.getElementById("weather-form");
    if (!form) return;

    var loadBtn = document.getElementById("weather-load-btn");
    var locateBtn = document.getElementById("weather-locate-btn");

    if (loadBtn) {
      loadBtn.addEventListener("click", function () {
        var state = form.state.value;
        var region = form.region.value.trim();
        if (!region) {
          setStatus(
            document.getElementById("weather-load-status"),
            "error",
            "Enter a county or city in the region field first."
          );
          return;
        }
        loadWeather(form, function () {
          return geocode(region, state);
        });
      });
    }

    if (locateBtn) {
      locateBtn.addEventListener("click", function () {
        if (!navigator.geolocation) {
          setStatus(
            document.getElementById("weather-load-status"),
            "error",
            "Location is not available in this browser."
          );
          return;
        }

        setStatus(
          document.getElementById("weather-load-status"),
          "loading",
          "Requesting location…"
        );
        locateBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
          function (pos) {
            var lat = pos.coords.latitude;
            var lon = pos.coords.longitude;
            loadWeather(form, function () {
              return Promise.resolve({
                name: "Your location",
                latitude: lat,
                longitude: lon,
                elevation: null,
                admin1: form.state.value,
                country_code: "US"
              });
            });
          },
          function () {
            setStatus(
              document.getElementById("weather-load-status"),
              "error",
              "Location permission denied. Enter a county or city instead."
            );
            locateBtn.disabled = false;
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
        );
      });
    }
  }

  bindWeatherLoad();

  window.ForageCastWeather = {
    geocode: geocode,
    fetchForecast: fetchForecast,
    analyzeForecast: analyzeForecast,
    mapElevation: mapElevation
  };
})();
