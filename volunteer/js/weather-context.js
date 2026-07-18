/**
 * Waypoint Volunteer — weather / daylight context (Open-Meteo)
 * Feeds the Today engine. Failures degrade gracefully.
 */
(function (global) {
  "use strict";

  var FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

  function cToF(c) {
    return (c * 9) / 5 + 32;
  }

  function isRainCode(code) {
    /* WMO weather interpretation codes */
    return (
      (code >= 51 && code <= 67) ||
      (code >= 80 && code <= 82) ||
      (code >= 95 && code <= 99)
    );
  }

  function isHeavyRainCode(code) {
    return code === 65 || code === 67 || code === 82 || code >= 95;
  }

  function buildWeatherFromForecast(data) {
    var current = data.current || {};
    var hourly = data.hourly || {};
    var daily = data.daily || {};

    var tempC = current.temperature_2m;
    var tempF = tempC != null ? cToF(tempC) : null;
    var precipProb = current.precipitation_probability;
    if (precipProb == null && hourly.precipitation_probability) {
      precipProb = hourly.precipitation_probability[0];
    }
    var precip = current.precipitation != null ? current.precipitation : 0;
    var code = current.weather_code != null ? current.weather_code : 0;

    var raining = isRainCode(code) || precip > 0.2;
    var heavy = isHeavyRainCode(code) || precip >= 4;
    var hot = tempF != null && tempF >= 85;
    var cold = tempF != null && tempF <= 35;
    var cool = tempF != null && tempF >= 45 && tempF <= 68;
    var fair = !raining && !heavy && tempF != null && tempF > 35 && tempF < 88;

    /* Afternoon rain: check next 6–10 hours precip probability */
    var afternoonRain = false;
    if (hourly.precipitation_probability) {
      var probs = hourly.precipitation_probability.slice(0, 12);
      afternoonRain = probs.some(function (p) {
        return p >= 55;
      });
    }

    var sunrise =
      daily.sunrise && daily.sunrise[0] ? daily.sunrise[0] : null;
    var sunset = daily.sunset && daily.sunset[0] ? daily.sunset[0] : null;

    return {
      weather: {
        available: true,
        temperatureF: tempF != null ? Math.round(tempF) : null,
        precipProbability: precipProb != null ? Math.round(precipProb) : null,
        precipMm: precip,
        weatherCode: code,
        isRaining: raining,
        isHeavyRain: heavy,
        isHot: hot,
        isCold: cold,
        isCool: cool,
        isFair: fair,
        indoorPreferred: heavy || (raining && precipProb >= 60) || hot,
        airQualityIndex: null,
        raw: { current: current }
      },
      daylight: {
        sunrise: sunrise,
        sunset: sunset,
        hoursRemaining: null,
        isDaytime: true
      },
      forecast: {
        afternoonRainLikely: afternoonRain,
        weekendOutdoorFriendly: !heavy
      }
    };
  }

  function fetchContext(lat, lon) {
    var params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current:
        "temperature_2m,precipitation,precipitation_probability,weather_code",
      hourly: "precipitation_probability,temperature_2m",
      daily: "sunrise,sunset,precipitation_sum",
      timezone: "auto",
      forecast_days: "2"
    });

    return fetch(FORECAST_URL + "?" + params.toString())
      .then(function (res) {
        if (!res.ok) throw new Error("Weather request failed");
        return res.json();
      })
      .then(function (data) {
        var built = buildWeatherFromForecast(data);
        var now = new Date();
        if (built.daylight.sunset) {
          built.daylight.hoursRemaining =
            global.VolunteerTodayEngine.hoursUntilSunset(
              now,
              built.daylight.sunset
            );
          built.daylight.isDaytime =
            built.daylight.hoursRemaining == null ||
            built.daylight.hoursRemaining > 0;
        }
        return built;
      });
  }

  global.VolunteerWeather = {
    fetchContext: fetchContext,
    buildWeatherFromForecast: buildWeatherFromForecast
  };
})(typeof window !== "undefined" ? window : this);
