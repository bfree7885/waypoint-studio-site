/**
 * Waypoint Volunteer — "Today I Can..." recommendation engine
 *
 * Placeholder-data recommendations with clear reasoning.
 * Combines user prompts + weather/season/day + soft scoring.
 * Never guilt. Never exaggerate impact.
 */
(function (global) {
  "use strict";

  var PROMPTS = [
    {
      id: "30-min",
      label: "I have 30 minutes.",
      constraints: { availableMinutes: 45 }
    },
    {
      id: "wildlife",
      label: "I want to help wildlife.",
      constraints: { facets: ["animals"] }
    },
    {
      id: "indoors",
      label: "I'd rather stay indoors.",
      constraints: { indoorOutdoor: "indoor" }
    },
    {
      id: "with-children",
      label: "I have children with me.",
      constraints: { familyFriendly: true, physicalIntensity: "moderate" }
    },
    {
      id: "near-park",
      label: "I'm looking for something near a park.",
      constraints: { facets: ["parks"] }
    },
    {
      id: "science",
      label: "I want to try citizen science.",
      constraints: { citizenScienceOnly: true }
    },
    {
      id: "low-effort",
      label: "I need something gentle today.",
      constraints: { physicalIntensity: "light", availableMinutes: 150 }
    },
    {
      id: "outdoors",
      label: "I'd like to be outdoors.",
      constraints: { indoorOutdoor: "outdoor" }
    }
  ];

  function reasonFor(opp, ctx, constraints) {
    var reasons = [];
    var demand = opp.physicalDemand || opp.physicalIntensity || "moderate";
    var minutes = opp.durationMinutes || 120;

    if (constraints.availableMinutes != null && minutes <= constraints.availableMinutes) {
      reasons.push(
        "Fits about " +
          Math.round(minutes) +
          " minutes within the time you mentioned."
      );
    } else if (
      ctx.user &&
      ctx.user.availableHours != null &&
      minutes / 60 <= ctx.user.availableHours
    ) {
      reasons.push("Fits the time you said you have available.");
    }

    if (constraints.familyFriendly && opp.familyFriendly) {
      reasons.push("Listed as family friendly.");
    }

    if (constraints.indoorOutdoor === "indoor" && (opp.indoorOutdoor === "indoor" || opp.remote)) {
      reasons.push(opp.remote ? "You can do this remotely." : "This is an indoor role.");
    }

    if (constraints.indoorOutdoor === "outdoor" && opp.indoorOutdoor === "outdoor") {
      reasons.push("This is outdoors.");
    }

    if (constraints.citizenScienceOnly && opp.isCitizenScience) {
      reasons.push("Citizen science — observations shared for learning, not competition.");
    }

    if (constraints.facets && constraints.facets.indexOf("animals") !== -1) {
      reasons.push("Connected to wildlife care or monitoring.");
    }

    if (constraints.facets && constraints.facets.indexOf("parks") !== -1) {
      reasons.push("Tied to a park or public greenspace.");
    }

    if (demand === "light") {
      reasons.push("Low physical demand.");
    }

    if (opp.remote) {
      reasons.push("No travel required.");
    } else if (opp.distanceMiles != null && opp.distanceMiles <= 15) {
      reasons.push("About " + opp.distanceMiles + " miles from your map center.");
    }

    if (ctx.weather && ctx.weather.available) {
      if (ctx.weather.isRaining || ctx.weather.isHeavyRain) {
        if (opp.indoorOutdoor === "indoor" || opp.remote) {
          reasons.push("Indoor/remote options can be easier when rain is around.");
        } else if (
          opp.weatherSuitability &&
          opp.weatherSuitability.indexOf("rain") !== -1
        ) {
          reasons.push("This activity is sometimes done in wet conditions — check with the host.");
        }
      } else if (ctx.weather.isCool && opp.indoorOutdoor === "outdoor") {
        reasons.push("Cool weather can make outdoor stewardship more comfortable.");
      } else if (ctx.weather.isHot && (opp.indoorOutdoor === "indoor" || opp.remote)) {
        reasons.push("A cooler indoor or remote option on a warm day.");
      }
    }

    if (opp.seasonality && ctx.season && opp.seasonality.indexOf(ctx.season) !== -1) {
      reasons.push("In season for " + ctx.season + ".");
    }

    if (opp.weekdayWeekend === "weekend" && global.VolunteerFilters.isWeekend(ctx.now)) {
      reasons.push("Often scheduled on weekends.");
    }

    if (!reasons.length) {
      reasons.push(
        "A calm match for how you described today — browse the details and decide without pressure."
      );
    }

    reasons.push("Impact is local and modest; the listing explains honestly what you’ll do.");
    return reasons;
  }

  function score(opp, ctx, constraints) {
    var s = 1;
    var minutes = opp.durationMinutes || 120;
    var demand = opp.physicalDemand || "moderate";

    if (constraints.availableMinutes != null) {
      if (minutes <= constraints.availableMinutes) s *= 1.35;
      else s *= 0.2;
    }

    if (constraints.familyFriendly) {
      s *= opp.familyFriendly ? 1.3 : 0.15;
    }

    if (constraints.indoorOutdoor === "indoor") {
      s *= opp.indoorOutdoor === "indoor" || opp.remote ? 1.3 : 0.15;
    }

    if (constraints.indoorOutdoor === "outdoor") {
      s *= opp.indoorOutdoor === "outdoor" && !opp.remote ? 1.25 : 0.2;
    }

    if (constraints.citizenScienceOnly) {
      s *= opp.isCitizenScience ? 1.35 : 0.1;
    }

    if (constraints.facets) {
      constraints.facets.forEach(function (facet) {
        if (global.VolunteerFilters.matchesFacet(opp, facet, ctx)) s *= 1.2;
        else s *= 0.25;
      });
    }

    if (constraints.physicalIntensity === "light") {
      s *= demand === "light" ? 1.25 : demand === "moderate" ? 0.7 : 0.2;
    }

    if (ctx.weather && ctx.weather.available) {
      if (
        (ctx.weather.isRaining || ctx.weather.isHeavyRain) &&
        (opp.indoorOutdoor === "indoor" || opp.remote)
      ) {
        s *= 1.2;
      }
      if (ctx.weather.isCool && opp.indoorOutdoor === "outdoor") s *= 1.1;
    }

    if (opp.distanceMiles != null && opp.distanceMiles <= 10) s *= 1.12;
    if (opp.seasonality && ctx.season && opp.seasonality.indexOf(ctx.season) !== -1) {
      s *= 1.08;
    }

    return Math.round(s * 1000) / 1000;
  }

  function recommend(opportunities, promptId, context, options) {
    var opts = options || {};
    var prompt = PROMPTS.filter(function (p) {
      return p.id === promptId;
    })[0];
    if (!prompt) {
      return { prompt: null, results: [], message: "Choose a prompt to begin." };
    }

    var ctx = context || {};
    ctx.now = ctx.now || new Date();
    ctx.season = ctx.season || global.VolunteerFilters.currentSeason(ctx.now);

    var filters = Object.assign(
      {
        facets: [],
        availableMinutes: null,
        indoorOutdoor: "any",
        familyFriendly: false,
        citizenScienceOnly: false,
        physicalIntensity: "any"
      },
      prompt.constraints
    );

    /* Soft pre-filter — keep near matches for reasoning */
    var pool = global.VolunteerFilters.apply(
      opportunities,
      {
        facets: filters.facets || [],
        availableMinutes: filters.availableMinutes,
        indoorOutdoor: filters.indoorOutdoor || "any",
        familyFriendly: !!filters.familyFriendly,
        citizenScienceOnly: !!filters.citizenScienceOnly,
        physicalIntensity: filters.physicalIntensity || "any",
        distanceMiles: opts.distanceMiles != null ? opts.distanceMiles : "50"
      },
      {
        userLat: ctx.location && ctx.location.lat,
        userLon: ctx.location && ctx.location.lon,
        planning: opts.planning,
        season: ctx.season,
        weatherTags: (ctx.weather && ctx.weather.tags) || [],
        now: ctx.now
      }
    );

    if (!pool.length) {
      pool = global.VolunteerFilters.withDistance(
        opportunities.slice(),
        ctx.location && ctx.location.lat,
        ctx.location && ctx.location.lon
      );
    }

    var ranked = pool
      .map(function (opp) {
        return {
          opportunity: opp,
          score: score(opp, ctx, prompt.constraints),
          reasons: reasonFor(opp, ctx, prompt.constraints)
        };
      })
      .filter(function (r) {
        return r.score >= 0.5;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });

    var limit = opts.limit == null ? 5 : opts.limit;
    var top = ranked.slice(0, limit);

    return {
      prompt: prompt,
      results: top,
      message: top.length
        ? "Here are thoughtful matches for “" + prompt.label + "” — reasons included."
        : "Nothing clear matched that prompt in the demo catalog. Try another, or browse freely."
    };
  }

  global.VolunteerTodayICan = {
    prompts: PROMPTS,
    recommend: recommend,
    reasonFor: reasonFor
  };
})(typeof window !== "undefined" ? window : this);
