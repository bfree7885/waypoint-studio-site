/**
 * Dashboard 3.0 — widget catalog
 * Each widget: id, title, category, defaultOn, size, build(ctx) → { primary, support, status, take }
 */
(function (global) {
  "use strict";

  function round(n, d) {
    var p = Math.pow(10, d || 0);
    return Math.round(n * p) / p;
  }

  function fmtTemp(c) {
    return round(c, 0) + "°C · " + round((c * 9) / 5 + 32, 0) + "°F";
  }

  var CATALOG = [
    {
      id: "weather",
      title: "Weather",
      blurb: "Temperature, wind, clouds, and rain at a glance.",
      defaultOn: true,
      size: "large",
      build: function (ctx) {
        var w = ctx.weather;
        return {
          primary: fmtTemp(w.tempC) + " · " + w.summary,
          support: "Wind " + round(w.windKph, 0) + " km/h · Clouds " + w.cloudPct + "% · Humidity " + w.humidity + "%",
          status: w.precipMm > 0.2 ? "Wet window" : "Settled",
          take: w.humidity >= 70
            ? "Today’s humidity will soften morning light and hold dew on vegetation longer."
            : w.windKph >= 35
              ? "Gusty air will cool trails quickly and flatten calm-water reflections."
              : "Mild air and manageable wind favor a full outdoor day without rushing the schedule."
        };
      }
    },
    {
      id: "photography",
      title: "Photography",
      blurb: "Light quality and shooting windows.",
      defaultOn: true,
      size: "large",
      build: function (ctx) {
        var w = ctx.weather;
        var sun = ctx.sun;
        var score = Math.max(0, 100 - w.cloudPct * 0.55 - Math.max(0, w.windKph - 20));
        return {
          primary: score >= 70 ? "Favorable light windows" : score >= 45 ? "Mixed light" : "Soft / diffuse day",
          support: "Golden Hour ~" + sun.goldenHour + " · Blue Hour ~" + sun.blueHour + " · Haze " + w.haze,
          status: w.windKph >= 40 ? "Drone caution" : "Field ready",
          take: w.windKph >= 40
            ? "Wind is too high for drone photography — keep to grounded lenses and weighted tripods."
            : w.cloudPct < 40
              ? "Golden Hour should produce warm side lighting on ridges and tree lines."
              : "Cloud cover will diffuse contrast — excellent for forest detail and waterfall texture."
        };
      }
    },
    {
      id: "astronomy",
      title: "Astronomy",
      blurb: "Sun, moon, and celestial timing.",
      defaultOn: true,
      size: "medium",
      build: function (ctx) {
        var sun = ctx.sun;
        return {
          primary: "Sunrise " + sun.sunrise + " · Sunset " + sun.sunset,
          support: "Moon " + sun.moonPhase + " · Moonrise " + sun.moonrise,
          status: sun.moonIllum + "% lit",
          take: sun.moonIllum > 70
            ? "A bright moon will wash faint Milky Way structure — favor moonlit landscapes instead."
            : "Darker lunar phase supports constellation and deep-sky noticing after twilight."
        };
      }
    },
    {
      id: "hiking",
      title: "Hiking",
      blurb: "Trail comfort and suggested windows.",
      defaultOn: true,
      size: "medium",
      build: function (ctx) {
        var w = ctx.weather;
        var uv = ctx.air.uv;
        var window = w.tempC >= 28 || uv >= 7 ? "Earlier miles" : "Flexible day";
        return {
          primary: window,
          support: "UV index " + uv + " · Humidity " + w.humidity + "% · Rain chance " + w.precipChance + "%",
          status: uv >= 7 ? "High UV after late morning" : "Comfortable effort",
          take: uv >= 7
            ? "Strong UV expected after late morning — start early, pack shade, and ease midday climbs."
            : w.precipChance > 50
              ? "Showers may slick rock and roots; choose loops with safe turnarounds."
              : "Temperature and humidity support steady trail miles with normal hydration."
        };
      }
    },
    {
      id: "air",
      title: "Air Quality",
      blurb: "AQI, smoke feel, and outdoor comfort.",
      defaultOn: true,
      size: "medium",
      build: function (ctx) {
        var a = ctx.air;
        return {
          primary: "AQI " + a.aqi + " · " + a.label,
          support: "Smoke " + a.smoke + " · UV " + a.uv,
          status: a.aqi <= 50 ? "Good" : a.aqi <= 100 ? "Moderate" : "Sensitive groups caution",
          take: a.aqi <= 50
            ? "Smoke and haze are minimal — distant ridgelines should read cleanly for photography and views."
            : "Air quality is only moderate — shorten hard efforts if you notice irritation."
        };
      }
    },
    {
      id: "rivers",
      title: "River Conditions",
      blurb: "Flow, trend, and bank safety.",
      defaultOn: true,
      size: "medium",
      build: function (ctx) {
        var r = ctx.river;
        return {
          primary: r.name + " · " + r.stageFt + " ft · " + r.flowCfs + " cfs",
          support: "Trend " + r.trend + " · Flood stage " + r.floodFt + " ft",
          status: r.trend === "rising" ? "Rising" : r.trend === "falling" ? "Falling" : "Steady",
          take: r.trend === "rising"
            ? "River is rising after overnight rain — favor bank-safe vantage points and skip slick put-ins."
            : "Flows are steadier today — riverside photography and careful wading look more workable."
        };
      }
    },
    {
      id: "wildlife",
      title: "Wildlife",
      blurb: "Activity windows and quiet approaches.",
      defaultOn: false,
      size: "small",
      build: function (ctx) {
        var w = ctx.weather;
        return {
          primary: w.windKph < 20 && w.cloudPct > 20 ? "Active edge hours" : "Typical patterns",
          support: "Dawn/dusk movement likelier in calmer, softer light.",
          status: "Observe ethically",
          take: "Cooler edges of the day favor wildlife movement — keep distance and let behavior lead the frame."
        };
      }
    },
    {
      id: "travel",
      title: "Travel",
      blurb: "Day-trip comfort and packing cues.",
      defaultOn: false,
      size: "small",
      build: function (ctx) {
        var w = ctx.weather;
        return {
          primary: w.precipChance > 40 ? "Pack rain layers" : "Light day kit",
          support: "Drive time buffer for wet roads if showers arrive.",
          status: "Plan loose",
          take: "Build one flexible stop into the itinerary so weather shifts don’t erase the day."
        };
      }
    },
    {
      id: "roads",
      title: "Roads",
      blurb: "Surface and visibility context.",
      defaultOn: false,
      size: "small",
      build: function (ctx) {
        var w = ctx.weather;
        return {
          primary: w.precipMm > 1 ? "Wet pavement likely" : "Generally clear travel",
          support: "Visibility " + (w.haze === "low" ? "good" : "reduced in valleys"),
          status: w.windKph > 45 ? "Crosswind caution" : "Normal",
          take: w.precipMm > 1
            ? "Overnight rain may leave leaf-slick curves — ease speed on shaded forest roads."
            : "Road surfaces look workable; still watch for washboard on gravel approaches."
        };
      }
    },
    {
      id: "fishing",
      title: "Fishing",
      blurb: "Pressure, clarity, and comfort cues.",
      defaultOn: false,
      size: "small",
      build: function (ctx) {
        var r = ctx.river;
        var w = ctx.weather;
        return {
          primary: r.trend === "rising" ? "Stained / pushy water" : "More readable water",
          support: "Clouds " + w.cloudPct + "% · Wind " + round(w.windKph, 0) + " km/h",
          status: "Local regs apply",
          take: r.trend === "rising"
            ? "Rising, off-color water favors banks and slower seams — fish patiently, not mid-current bravado."
            : "Clearer, steadier flow supports careful presentations in softer light under clouds."
        };
      }
    },
    {
      id: "fire",
      title: "Fire",
      blurb: "Awareness context — not a dispatch tool.",
      defaultOn: false,
      size: "small",
      build: function (ctx) {
        var w = ctx.weather;
        var risk = w.humidity < 35 && w.windKph > 25 ? "Elevated caution" : "Routine awareness";
        return {
          primary: risk,
          support: "Humidity " + w.humidity + "% · Wind " + round(w.windKph, 0) + " km/h",
          status: "Check official sources",
          take: "This is awareness only — verify burn bans and alerts from official fire authorities before any flame."
        };
      }
    },
    {
      id: "nightsky",
      title: "Night Sky",
      blurb: "Darkness and night photography potential.",
      defaultOn: true,
      size: "medium",
      build: function (ctx) {
        var sun = ctx.sun;
        var w = ctx.weather;
        var dark = sun.moonIllum < 40 && w.cloudPct < 45;
        return {
          primary: dark ? "Promising darkness" : "Compromised night sky",
          support: "Moon " + sun.moonIllum + "% · Clouds " + w.cloudPct + "%",
          status: dark ? "Worth a late outing" : "Hold for clearer dark",
          take: dark
            ? "Low moon and thinner clouds favor a short night-sky session after full astronomical dark."
            : "Moonlight or cloud will limit faint detail — consider moonlit foregrounds instead of deep sky."
        };
      }
    },
    {
      id: "forecast",
      title: "Forecast",
      blurb: "Next hours without repeating the whole dashboard.",
      defaultOn: true,
      size: "large",
      build: function (ctx) {
        var f = ctx.forecast;
        return {
          primary: f.headline,
          support: f.detail,
          status: f.confidence,
          take: f.take
        };
      }
    }
  ];

  global.WaypointDashboardWidgets = {
    catalog: CATALOG,
    byId: function (id) {
      for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === id) return CATALOG[i];
      return null;
    }
  };
})(typeof window !== "undefined" ? window : this);
