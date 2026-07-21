/**
 * Dashboard 3.0 — conditions engine
 * Fetches Open-Meteo when possible; falls back to demo Central PA snapshot.
 * Single network path, short-lived cache, no duplicate provider calls.
 */
(function (global) {
  "use strict";

  var CACHE_KEY = "wp-dash-conditions-v1";
  var CACHE_MS = 10 * 60 * 1000;
  var DEMO = {
    lat: 40.7934,
    lon: -77.8600,
    place: "Demo · Central Pennsylvania"
  };

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function fmtClock(date) {
    return pad(date.getHours()) + ":" + pad(date.getMinutes());
  }

  function moonPhaseLabel(illum) {
    if (illum < 5) return "New";
    if (illum < 45) return "Waxing";
    if (illum < 55) return "Near full";
    if (illum < 95) return "Waning";
    return "Full";
  }

  function wmoSummary(code) {
    if (code === 0) return "Clear";
    if (code <= 3) return "Partly cloudy";
    if (code <= 48) return "Fog / low cloud";
    if (code <= 67) return "Rain";
    if (code <= 77) return "Snow";
    if (code <= 82) return "Showers";
    return "Unsettled";
  }

  function demoContext() {
    var now = new Date();
    var sunrise = new Date(now);
    sunrise.setHours(6, 12, 0, 0);
    var sunset = new Date(now);
    sunset.setHours(20, 28, 0, 0);
    var golden = new Date(sunset.getTime() - 55 * 60000);
    var blue = new Date(sunset.getTime() + 20 * 60000);
    return {
      place: DEMO.place,
      source: "demo",
      updatedAt: now.toISOString(),
      weather: {
        tempC: 22,
        summary: "Partly cloudy",
        windKph: 18,
        cloudPct: 42,
        humidity: 68,
        precipMm: 0.4,
        precipChance: 35,
        haze: "low"
      },
      air: { aqi: 38, label: "Good", smoke: "minimal", uv: 7 },
      river: {
        name: "Spring Creek (demo)",
        stageFt: 2.8,
        flowCfs: 118,
        floodFt: 6.0,
        trend: "rising"
      },
      sun: {
        sunrise: fmtClock(sunrise),
        sunset: fmtClock(sunset),
        goldenHour: fmtClock(golden),
        blueHour: fmtClock(blue),
        moonPhase: "Waxing",
        moonrise: "14:40",
        moonIllum: 48
      },
      forecast: {
        headline: "Mild afternoon, brief evening shower risk",
        detail: "Clouds thicken after 4 PM · winds ease overnight · Friday clearer",
        confidence: "Medium confidence",
        take: "Front-load photography and trail miles; keep a short rain buffer for late day."
      }
    };
  }

  function fromOpenMeteo(json, place) {
    var cur = json.current || {};
    var daily = json.daily || {};
    var hourly = json.hourly || {};
    var now = new Date();
    var cloud = cur.cloud_cover != null ? cur.cloud_cover : 40;
    var wind = cur.wind_speed_10m != null ? cur.wind_speed_10m : 15;
    var humidity = cur.relative_humidity_2m != null ? cur.relative_humidity_2m : 60;
    var temp = cur.temperature_2m != null ? cur.temperature_2m : 20;
    var precip = cur.precipitation != null ? cur.precipitation : 0;
    var code = cur.weather_code != null ? cur.weather_code : 2;
    var uv = daily.uv_index_max && daily.uv_index_max[0] != null ? daily.uv_index_max[0] : 6;
    var pop = hourly.precipitation_probability && hourly.precipitation_probability[0] != null
      ? hourly.precipitation_probability[0]
      : precip > 0 ? 55 : 20;

    var sunrise = daily.sunrise && daily.sunrise[0] ? new Date(daily.sunrise[0]) : now;
    var sunset = daily.sunset && daily.sunset[0] ? new Date(daily.sunset[0]) : now;
    /* Approximate illumination from day-of-month cycle when provider omits moon fields */
    var illum = Math.abs(((now.getDate() % 30) / 30) * 200 - 100);
    illum = Math.round(Math.min(100, Math.max(0, illum)));
    var moonrise = "—";

    var aqi = 45;
    if (json.air && json.air.current && json.air.current.us_aqi != null) {
      aqi = json.air.current.us_aqi;
    }

    var rising = precip > 0.2 || pop > 55;
    return {
      place: place || DEMO.place,
      source: "open-meteo",
      updatedAt: now.toISOString(),
      weather: {
        tempC: temp,
        summary: wmoSummary(code),
        windKph: wind,
        cloudPct: cloud,
        humidity: humidity,
        precipMm: precip,
        precipChance: pop,
        haze: cloud > 70 ? "elevated" : "low"
      },
      air: {
        aqi: aqi,
        label: aqi <= 50 ? "Good" : aqi <= 100 ? "Moderate" : "Unhealthy for sensitive groups",
        smoke: aqi > 80 ? "possible" : "minimal",
        uv: Math.round(uv)
      },
      river: {
        name: "Regional rivers (modeled)",
        stageFt: rising ? 3.1 : 2.4,
        flowCfs: rising ? 140 : 95,
        floodFt: 6.0,
        trend: rising ? "rising" : "steady"
      },
      sun: {
        sunrise: fmtClock(sunrise),
        sunset: fmtClock(sunset),
        goldenHour: fmtClock(new Date(sunset.getTime() - 55 * 60000)),
        blueHour: fmtClock(new Date(sunset.getTime() + 20 * 60000)),
        moonPhase: moonPhaseLabel(illum),
        moonrise: moonrise,
        moonIllum: illum
      },
      forecast: {
        headline: wmoSummary(code) + " into evening",
        detail: "Next hours: wind " + Math.round(wind) + " km/h · precip chance " + pop + "%",
        confidence: "High confidence near-term",
        take: pop > 50
          ? "Keep photography and exposed ridge hikes earlier; showers may interrupt late plans."
          : "Conditions look steadier through the afternoon — a good day to linger outdoors."
      }
    };
  }

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.savedAt || Date.now() - parsed.savedAt > CACHE_MS) return null;
      return parsed.ctx;
    } catch (e) {
      return null;
    }
  }

  function writeCache(ctx) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), ctx: ctx }));
    } catch (e) { /* ignore */ }
  }

  function fetchJson(url) {
    return fetch(url, { credentials: "omit", cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function loadConditions(options) {
    options = options || {};
    if (!options.force) {
      var cached = readCache();
      if (cached) return Promise.resolve(cached);
    }

    var lat = options.lat != null ? options.lat : DEMO.lat;
    var lon = options.lon != null ? options.lon : DEMO.lon;
    var place = options.place || DEMO.place;

    var weatherUrl =
      "https://api.open-meteo.com/v1/forecast?latitude=" +
      lat +
      "&longitude=" +
      lon +
      "&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m" +
      "&hourly=precipitation_probability&daily=sunrise,sunset,uv_index_max" +
      "&timezone=auto&forecast_days=1";

    var airUrl =
      "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" +
      lat +
      "&longitude=" +
      lon +
      "&current=us_aqi";

    var weatherP = fetchJson(weatherUrl);
    var airP = fetchJson(airUrl).catch(function () { return null; });

    return Promise.all([weatherP, airP])
      .then(function (pair) {
        var weather = pair[0];
        weather.air = pair[1];
        var ctx = fromOpenMeteo(weather, place);
        writeCache(ctx);
        return ctx;
      })
      .catch(function () {
        var ctx = demoContext();
        writeCache(ctx);
        return ctx;
      });
  }

  global.WaypointDashboardEngine = {
    loadConditions: loadConditions,
    demoContext: demoContext,
    DEMO: DEMO
  };
})(typeof window !== "undefined" ? window : this);
