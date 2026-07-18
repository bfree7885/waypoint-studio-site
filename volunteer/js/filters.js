/**
 * Waypoint Volunteer — discovery filter engine (v0.1)
 * Browse without an account. Chip facets + detailed filters.
 */
(function (global) {
  "use strict";

  var INTENSITY_RANK = { light: 1, moderate: 2, vigorous: 3 };
  var NEAR_ME_MILES = 15;

  function haversineMiles(lat1, lon1, lat2, lon2) {
    var R = 3958.8;
    var toRad = Math.PI / 180;
    var dLat = (lat2 - lat1) * toRad;
    var dLon = (lon2 - lon1) * toRad;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * toRad) *
        Math.cos(lat2 * toRad) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function currentSeason(date) {
    var m = (date || new Date()).getMonth();
    if (m >= 2 && m <= 4) return "spring";
    if (m >= 5 && m <= 7) return "summer";
    if (m >= 8 && m <= 10) return "fall";
    return "winter";
  }

  function isWeekend(date) {
    var d = (date || new Date()).getDay();
    return d === 0 || d === 6;
  }

  function withDistance(opportunities, userLat, userLon) {
    return opportunities.map(function (opp) {
      var copy = Object.assign({}, opp);
      if (opp.remote) {
        copy.distanceMiles = 0;
        copy.distanceLabel = "Remote";
        return copy;
      }
      if (
        userLat != null &&
        userLon != null &&
        typeof opp.lat === "number" &&
        typeof opp.lon === "number"
      ) {
        copy.distanceMiles =
          Math.round(haversineMiles(userLat, userLon, opp.lat, opp.lon) * 10) /
          10;
      } else {
        copy.distanceMiles = null;
      }
      return copy;
    });
  }

  function hasTag(opp, tag) {
    return opp.discoveryTags && opp.discoveryTags.indexOf(tag) !== -1;
  }

  function matchesFacet(opp, facetId, opts) {
    var season = opts.season || currentSeason();
    var now = opts.now || new Date();

    switch (facetId) {
      case "near-me":
        if (opp.remote) return true;
        return (
          opp.distanceMiles != null && opp.distanceMiles <= NEAR_ME_MILES
        );
      case "today":
        /* Seasonal + weekday fit + weather-tolerant enough for "today" browsing */
        if (opp.seasonality && opp.seasonality.indexOf(season) === -1) {
          return false;
        }
        if (isWeekend(now)) {
          return (
            opp.weekdayWeekend === "weekend" ||
            opp.schedule && opp.schedule.kind === "ongoing"
          );
        }
        return (
          opp.weekdayWeekend === "weekday" ||
          (opp.schedule &&
            (opp.schedule.kind === "ongoing" ||
              opp.schedule.kind === "seasonal")) ||
          opp.remote
        );
      case "this-weekend":
        return (
          opp.weekdayWeekend === "weekend" ||
          (opp.schedule && opp.schedule.kind === "one-time")
        );
      case "remote":
        return !!opp.remote;
      case "family-friendly":
        return !!opp.familyFriendly;
      case "indoors":
        return opp.indoorOutdoor === "indoor" || !!opp.remote;
      case "outdoors":
        return opp.indoorOutdoor === "outdoor" && !opp.remote;
      case "low-physical":
        return (opp.physicalDemand || opp.physicalIntensity) === "light";
      case "high-physical":
        return (opp.physicalDemand || opp.physicalIntensity) === "vigorous";
      case "animals":
        return hasTag(opp, "animals") || opp.category === "wildlife";
      case "nature":
        return hasTag(opp, "nature");
      case "trails":
        return hasTag(opp, "trails");
      case "parks":
        return hasTag(opp, "parks");
      case "water":
        return hasTag(opp, "water");
      case "science":
        return (
          hasTag(opp, "science") ||
          !!opp.isCitizenScience ||
          opp.category === "citizen-science"
        );
      case "community":
        return hasTag(opp, "community") || opp.category === "community";
      case "education":
        return hasTag(opp, "education") || opp.category === "education";
      case "food-security":
        return hasTag(opp, "food-security");
      case "emergency-preparedness":
        return (
          hasTag(opp, "emergency-preparedness") ||
          opp.opportunityType === "emergency-preparedness"
        );
      case "habitat-restoration":
        return (
          hasTag(opp, "habitat-restoration") ||
          opp.opportunityType === "environmental-restoration" ||
          opp.opportunityType === "habitat-restoration"
        );
      default:
        return true;
    }
  }

  /**
   * @param {object[]} opportunities
   * @param {object} filters
   * @param {object} options
   */
  function apply(opportunities, filters, options) {
    var opts = options || {};
    var f = filters || {};
    var planning = opts.planning || null;
    var season = opts.season || currentSeason();
    var weatherTags = opts.weatherTags || [];
    var facets = f.facets || [];

    var list = withDistance(
      opportunities.slice(),
      opts.userLat,
      opts.userLon
    );

    return list.filter(function (opp) {
      if (planning && planning.isHidden(opp.id)) return false;

      if (f.personalOnly) {
        if (!planning) return false;
        var onList =
          planning.isSaved(opp.id) ||
          planning.isInterested(opp.id) ||
          planning.isOnPersonalList(opp.id) ||
          planning.isCompleted(opp.id);
        if (!onList) return false;
      }

      if (facets.length) {
        var facetOk = facets.every(function (facetId) {
          return matchesFacet(opp, facetId, {
            season: season,
            now: opts.now
          });
        });
        if (!facetOk) return false;
      }

      if (f.categories && f.categories.length) {
        if (f.categories.indexOf(opp.category) === -1) return false;
      }

      if (f.opportunityTypes && f.opportunityTypes.length) {
        if (f.opportunityTypes.indexOf(opp.opportunityType) === -1) return false;
      }

      if (f.citizenScienceOnly) {
        if (!opp.isCitizenScience) return false;
      }

      if (f.distanceMiles != null && f.distanceMiles !== "") {
        var maxD = Number(f.distanceMiles);
        if (!isNaN(maxD) && !opp.remote) {
          if (opp.distanceMiles != null && opp.distanceMiles > maxD) {
            return false;
          }
        }
      }

      if (f.availableHours != null && f.availableHours !== "") {
        var hours = Number(f.availableHours);
        var maxHours =
          opp.durationMinutes != null
            ? opp.durationMinutes / 60
            : opp.availableTimeMaxHours;
        if (!isNaN(hours) && maxHours != null && maxHours > hours) {
          return false;
        }
      }

      if (f.availableMinutes != null && f.availableMinutes !== "") {
        var mins = Number(f.availableMinutes);
        if (
          !isNaN(mins) &&
          opp.durationMinutes != null &&
          opp.durationMinutes > mins
        ) {
          return false;
        }
      }

      if (f.indoorOutdoor && f.indoorOutdoor !== "any") {
        if (f.indoorOutdoor === "indoor") {
          if (opp.indoorOutdoor !== "indoor" && !opp.remote) return false;
        } else if (opp.indoorOutdoor !== f.indoorOutdoor) {
          return false;
        }
      }

      if (f.physicalIntensity && f.physicalIntensity !== "any") {
        if (f.physicalIntensity === "vigorous-only") {
          if ((opp.physicalDemand || "moderate") !== "vigorous") return false;
        } else {
          var maxRank = INTENSITY_RANK[f.physicalIntensity] || 3;
          var oppRank =
            INTENSITY_RANK[opp.physicalDemand || opp.physicalIntensity] || 2;
          if (oppRank > maxRank) return false;
        }
      }

      if (f.minPhysical && f.minPhysical !== "any") {
        var minRank = INTENSITY_RANK[f.minPhysical] || 1;
        var rank =
          INTENSITY_RANK[opp.physicalDemand || opp.physicalIntensity] || 2;
        if (rank < minRank) return false;
      }

      if (f.weekdayWeekend && f.weekdayWeekend !== "any") {
        if (opp.weekdayWeekend !== f.weekdayWeekend) return false;
      }

      if (f.familyFriendly) {
        if (!opp.familyFriendly) return false;
      }

      if (f.petFriendly) {
        if (!opp.petFriendly) return false;
      }

      if (f.accessible) {
        if (!opp.accessibility || !opp.accessibility.wheelchairAccess) {
          return false;
        }
      }

      if (f.remoteOnly) {
        if (!opp.remote) return false;
      }

      if (f.season && f.season !== "any") {
        if (!opp.seasonality || opp.seasonality.indexOf(f.season) === -1) {
          return false;
        }
      } else if (f.matchCurrentSeason) {
        if (!opp.seasonality || opp.seasonality.indexOf(season) === -1) {
          return false;
        }
      }

      if (f.weatherSuitability && f.weatherSuitability !== "any") {
        if (
          !opp.weatherSuitability ||
          opp.weatherSuitability.indexOf(f.weatherSuitability) === -1
        ) {
          return false;
        }
      } else if (f.matchWeather && weatherTags.length) {
        var ok = weatherTags.some(function (tag) {
          return (
            opp.weatherSuitability &&
            opp.weatherSuitability.indexOf(tag) !== -1
          );
        });
        if (!ok && !(opp.remote || opp.indoorOutdoor === "indoor")) {
          return false;
        }
      }

      return true;
    });
  }

  function sortByDistance(list) {
    return list.slice().sort(function (a, b) {
      if (a.remote && !b.remote) return -1;
      if (!a.remote && b.remote) return 1;
      if (a.distanceMiles == null && b.distanceMiles == null) return 0;
      if (a.distanceMiles == null) return 1;
      if (b.distanceMiles == null) return -1;
      return a.distanceMiles - b.distanceMiles;
    });
  }

  global.VolunteerFilters = {
    apply: apply,
    withDistance: withDistance,
    sortByDistance: sortByDistance,
    haversineMiles: haversineMiles,
    currentSeason: currentSeason,
    isWeekend: isWeekend,
    matchesFacet: matchesFacet,
    NEAR_ME_MILES: NEAR_ME_MILES
  };
})(typeof window !== "undefined" ? window : this);
