/**
 * Waypoint Volunteer — Today intelligence architecture
 *
 * Design goals:
 * - Soft, hopeful suggestions — never guilt or pressure
 * - No AI generation in MVP; declarative rules + context providers
 * - Ready for future AI or richer data without rewriting the UI
 *
 * Pipeline:
 *   1. Context providers  → weather, season, daylight, location, prefs
 *   2. Rule registry      → produce Insight messages + soft scores
 *   3. Opportunity scorer → gentle ranking for "today" views
 *   4. Presenter          → calm copy for the UI
 *
 * Future AI layer can plug in as an additional InsightSource.
 */
(function (global) {
  "use strict";

  var SEASON_LABELS = {
    spring: "spring",
    summer: "summer",
    fall: "fall",
    winter: "winter"
  };

  function emptyContext() {
    return {
      now: new Date(),
      season: "spring",
      location: { lat: null, lon: null, label: null, hasFix: false },
      weather: {
        available: false,
        temperatureF: null,
        precipProbability: null,
        precipMm: null,
        weatherCode: null,
        isRaining: false,
        isHeavyRain: false,
        isHot: false,
        isCold: false,
        isCool: false,
        isFair: true,
        airQualityIndex: null,
        tags: ["fair"]
      },
      daylight: {
        sunrise: null,
        sunset: null,
        hoursRemaining: null,
        isDaytime: true
      },
      user: {
        availableHours: null,
        interests: [],
        mobility: { preferAccessible: false, maxIntensity: "vigorous" }
      },
      forecast: {
        afternoonRainLikely: false,
        weekendOutdoorFriendly: null
      }
    };
  }

  /** Build weather tags used by filters + rules */
  function deriveWeatherTags(weather) {
    var tags = [];
    if (!weather || !weather.available) {
      return ["fair"];
    }
    if (weather.isHeavyRain || weather.isRaining) tags.push("rain", "wet");
    if (weather.isHot) tags.push("hot");
    if (weather.isCold) tags.push("cold");
    if (weather.isCool) tags.push("cool");
    if (weather.isFair && !weather.isRaining) tags.push("fair", "dry");
    if (weather.indoorPreferred) tags.push("indoor");
    if (!tags.length) tags.push("fair");
    return tags;
  }

  function hoursUntilSunset(now, sunsetIso) {
    if (!sunsetIso) return null;
    var sunset = new Date(sunsetIso);
    var ms = sunset.getTime() - now.getTime();
    if (ms < 0) return 0;
    return Math.round((ms / 3600000) * 10) / 10;
  }

  /**
   * Insight shape:
   * {
   *   id, tone: "hopeful"|"practical"|"seasonal",
   *   message, relatedCategories?: string[],
   *   boost?: { outdoor?: number, indoor?: number, topics?: string[] },
   *   priority: number
   * }
   */
  var RULES = [
    {
      id: "cool-trail-comfort",
      evaluate: function (ctx) {
        if (!ctx.weather.available) return null;
        if (ctx.weather.isCool && !ctx.weather.isRaining) {
          return {
            id: "cool-trail-comfort",
            tone: "hopeful",
            message:
              "Cool weather makes trail work and outdoor stewardship comfortable today.",
            relatedCategories: ["environmental"],
            boost: { outdoor: 1.2, topics: ["Trail maintenance"] },
            priority: 40
          };
        }
        return null;
      }
    },
    {
      id: "afternoon-rain-indoor",
      evaluate: function (ctx) {
        if (
          ctx.forecast.afternoonRainLikely ||
          ctx.weather.isHeavyRain ||
          (ctx.weather.isRaining && ctx.weather.precipProbability >= 60)
        ) {
          return {
            id: "afternoon-rain-indoor",
            tone: "practical",
            message:
              "Rain looks likely. Indoor volunteer opportunities may feel easier today.",
            relatedCategories: ["community", "education", "emergency", "wildlife"],
            boost: { indoor: 1.35 },
            priority: 55
          };
        }
        return null;
      }
    },
    {
      id: "hot-day-shade",
      evaluate: function (ctx) {
        if (ctx.weather.isHot && !ctx.weather.isRaining) {
          return {
            id: "hot-day-shade",
            tone: "practical",
            message:
              "It’s a warm day. Shorter outdoor shifts or shaded indoor help can be kinder.",
            relatedCategories: ["community", "education"],
            boost: { indoor: 1.15 },
            priority: 35
          };
        }
        return null;
      }
    },
    {
      id: "monarch-season",
      evaluate: function (ctx) {
        if (ctx.season === "summer" || (ctx.season === "fall" && ctx.now.getMonth() <= 8)) {
          var m = ctx.now.getMonth();
          if (m >= 6 && m <= 8) {
            return {
              id: "monarch-season",
              tone: "seasonal",
              message:
                "This stretch of the season is ideal for monarch and pollinator watching.",
              relatedCategories: ["wildlife", "citizen-science"],
              boost: { topics: ["Pollinator projects", "iNaturalist"] },
              priority: 30
            };
          }
        }
        return null;
      }
    },
    {
      id: "spring-amphibians",
      evaluate: function (ctx) {
        if (
          ctx.season === "spring" &&
          (ctx.weather.isRaining || ctx.weather.isCool)
        ) {
          return {
            id: "spring-amphibians",
            tone: "seasonal",
            message:
              "Mild wet spring evenings can be good for careful amphibian monitoring.",
            relatedCategories: ["wildlife"],
            boost: { topics: ["Amphibian monitoring"] },
            priority: 28
          };
        }
        return null;
      }
    },
    {
      id: "weekend-cleanup",
      evaluate: function (ctx) {
        var day = ctx.now.getDay();
        var isWeekend = day === 0 || day === 6;
        var nearWeekend = day === 5;
        if (
          (isWeekend || nearWeekend) &&
          !ctx.weather.isHeavyRain &&
          ctx.forecast.weekendOutdoorFriendly !== false
        ) {
          return {
            id: "weekend-cleanup",
            tone: "hopeful",
            message: isWeekend
              ? "A local river or park cleanup may fit this weekend’s outdoor window."
              : "A local river cleanup is often scheduled on weekends — worth a gentle look.",
            relatedCategories: ["environmental"],
            boost: { outdoor: 1.1, topics: ["River cleanup", "Park cleanup"] },
            priority: 25
          };
        }
        return null;
      }
    },
    {
      id: "short-daylight",
      evaluate: function (ctx) {
        if (
          ctx.daylight.hoursRemaining != null &&
          ctx.daylight.hoursRemaining < 2 &&
          ctx.daylight.isDaytime
        ) {
          return {
            id: "short-daylight",
            tone: "practical",
            message:
              "Daylight is winding down. Indoor or near-home opportunities may fit better.",
            relatedCategories: ["community", "education"],
            boost: { indoor: 1.2 },
            priority: 45
          };
        }
        return null;
      }
    },
    {
      id: "limited-time",
      evaluate: function (ctx) {
        if (ctx.user.availableHours != null && ctx.user.availableHours <= 1.5) {
          return {
            id: "limited-time",
            tone: "hopeful",
            message:
              "Even a short stretch of time can help — look for opportunities under two hours.",
            relatedCategories: [],
            boost: {},
            priority: 20
          };
        }
        return null;
      }
    },
    {
      id: "fair-default",
      evaluate: function (ctx) {
        if (ctx.weather.available && ctx.weather.isFair && !ctx.weather.isRaining) {
          return {
            id: "fair-default",
            tone: "hopeful",
            message:
              "Conditions look open for outdoor stewardship if that feels right today.",
            relatedCategories: ["environmental", "wildlife", "citizen-science"],
            boost: { outdoor: 1.05 },
            priority: 10
          };
        }
        return null;
      }
    },
    {
      id: "welcome-any",
      evaluate: function () {
        return {
          id: "welcome-any",
          tone: "hopeful",
          message:
            "There’s no wrong place to start. Browse nearby opportunities at your own pace.",
          relatedCategories: [],
          boost: {},
          priority: 1
        };
      }
    }
  ];

  function buildInsights(ctx) {
    var insights = [];
    RULES.forEach(function (rule) {
      try {
        var result = rule.evaluate(ctx);
        if (result) insights.push(result);
      } catch (err) {
        /* Rules must never break the app */
      }
    });
    insights.sort(function (a, b) {
      return (b.priority || 0) - (a.priority || 0);
    });
    return insights;
  }

  function scoreOpportunity(opp, ctx, insights) {
    var score = 1;
    var reasons = [];

    insights.forEach(function (insight) {
      var boost = insight.boost || {};
      if (boost.outdoor && opp.indoorOutdoor === "outdoor") {
        score *= boost.outdoor;
        reasons.push(insight.id);
      }
      if (boost.indoor && opp.indoorOutdoor === "indoor") {
        score *= boost.indoor;
        reasons.push(insight.id);
      }
      if (boost.topics && opp.topics) {
        var hit = boost.topics.some(function (t) {
          return opp.topics.indexOf(t) !== -1;
        });
        if (hit) {
          score *= 1.15;
          reasons.push(insight.id);
        }
      }
      if (
        insight.relatedCategories &&
        insight.relatedCategories.indexOf(opp.category) !== -1
      ) {
        score *= 1.05;
      }
    });

    if (ctx.user.interests && ctx.user.interests.indexOf(opp.category) !== -1) {
      score *= 1.2;
      reasons.push("interest-match");
    }

    if (
      ctx.user.availableHours != null &&
      opp.availableTimeMaxHours != null &&
      opp.availableTimeMaxHours <= ctx.user.availableHours
    ) {
      score *= 1.1;
      reasons.push("fits-available-time");
    }

    if (
      ctx.user.mobility &&
      ctx.user.mobility.preferAccessible &&
      opp.accessibility &&
      opp.accessibility.wheelchairAccess
    ) {
      score *= 1.15;
      reasons.push("accessibility");
    }

    if (opp.seasonality && opp.seasonality.indexOf(ctx.season) !== -1) {
      score *= 1.08;
    }

    if (opp.weatherSuitability && ctx.weather.tags) {
      var weatherHit = ctx.weather.tags.some(function (tag) {
        return opp.weatherSuitability.indexOf(tag) !== -1;
      });
      if (weatherHit) score *= 1.1;
    }

    /* Soft distance preference — never exclude here */
    if (opp.distanceMiles != null) {
      if (opp.distanceMiles <= 10) score *= 1.12;
      else if (opp.distanceMiles <= 25) score *= 1.05;
      else if (opp.distanceMiles > 60) score *= 0.92;
    }

    return {
      opportunityId: opp.id,
      score: Math.round(score * 1000) / 1000,
      reasons: reasons
    };
  }

  function rankForToday(opportunities, ctx, insights) {
    var ranked = opportunities.map(function (opp) {
      var result = scoreOpportunity(opp, ctx, insights);
      return {
        opportunity: opp,
        score: result.score,
        reasons: result.reasons
      };
    });
    ranked.sort(function (a, b) {
      return b.score - a.score;
    });
    return ranked;
  }

  function presentTopInsights(insights, limit) {
    var max = limit == null ? 3 : limit;
    return insights.slice(0, max).map(function (i) {
      return {
        id: i.id,
        tone: i.tone,
        message: i.message
      };
    });
  }

  /**
   * Future plug-in point: register additional InsightSource modules.
   * An AI source would implement { id, evaluate(ctx) → Insight|Insight[]|null }.
   */
  var extraSources = [];

  function registerInsightSource(source) {
    if (source && typeof source.evaluate === "function") {
      extraSources.push(source);
    }
  }

  function run(ctxInput) {
    var ctx = Object.assign(emptyContext(), ctxInput || {});
    if (ctx.weather) {
      ctx.weather.tags = deriveWeatherTags(ctx.weather);
    }
    if (!ctx.season && global.VolunteerFilters) {
      ctx.season = global.VolunteerFilters.currentSeason(ctx.now);
    }
    if (ctx.daylight && ctx.daylight.sunset && ctx.daylight.hoursRemaining == null) {
      ctx.daylight.hoursRemaining = hoursUntilSunset(ctx.now, ctx.daylight.sunset);
    }

    var insights = buildInsights(ctx);
    extraSources.forEach(function (source) {
      try {
        var extra = source.evaluate(ctx);
        if (!extra) return;
        if (Array.isArray(extra)) {
          insights = insights.concat(extra);
        } else {
          insights.push(extra);
        }
      } catch (err) {
        /* ignore faulty sources */
      }
    });
    insights.sort(function (a, b) {
      return (b.priority || 0) - (a.priority || 0);
    });

    return {
      context: ctx,
      insights: insights,
      presented: presentTopInsights(insights, 3),
      rank: function (opportunities) {
        return rankForToday(opportunities || [], ctx, insights);
      },
      weatherTags: (ctx.weather && ctx.weather.tags) || []
    };
  }

  global.VolunteerTodayEngine = {
    emptyContext: emptyContext,
    deriveWeatherTags: deriveWeatherTags,
    hoursUntilSunset: hoursUntilSunset,
    run: run,
    registerInsightSource: registerInsightSource,
    /* Exposed for tests / future docs */
    _rules: RULES,
    SEASON_LABELS: SEASON_LABELS
  };
})(typeof window !== "undefined" ? window : this);
