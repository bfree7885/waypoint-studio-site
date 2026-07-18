/**
 * Waypoint Volunteer — filter engine
 */
(function (global) {
  "use strict";

  var INTENSITY_RANK = { light: 1, moderate: 2, vigorous: 3 };

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

  function withDistance(opportunities, userLat, userLon) {
    return opportunities.map(function (opp) {
      var copy = Object.assign({}, opp);
      if (
        userLat != null &&
        userLon != null &&
        typeof opp.lat === "number" &&
        typeof opp.lon === "number"
      ) {
        copy.distanceMiles = Math.round(
          haversineMiles(userLat, userLon, opp.lat, opp.lon) * 10
        ) / 10;
      } else {
        copy.distanceMiles = null;
      }
      return copy;
    });
  }

  /**
   * @param {object[]} opportunities
   * @param {object} filters
   * @param {object} options — { userLat, userLon, planning, season, weatherTags }
   */
  function apply(opportunities, filters, options) {
    var opts = options || {};
    var f = filters || {};
    var planning = opts.planning || null;
    var season = opts.season || currentSeason();
    var weatherTags = opts.weatherTags || [];

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
          planning.isOnPersonalList(opp.id);
        if (!onList) return false;
      }

      if (f.categories && f.categories.length) {
        if (f.categories.indexOf(opp.category) === -1) return false;
      }

      if (f.distanceMiles != null && f.distanceMiles !== "") {
        var maxD = Number(f.distanceMiles);
        if (
          !isNaN(maxD) &&
          opp.distanceMiles != null &&
          opp.distanceMiles > maxD
        ) {
          return false;
        }
      }

      if (f.availableHours != null && f.availableHours !== "") {
        var hours = Number(f.availableHours);
        if (
          !isNaN(hours) &&
          opp.availableTimeMaxHours != null &&
          opp.availableTimeMaxHours > hours
        ) {
          return false;
        }
      }

      if (f.indoorOutdoor && f.indoorOutdoor !== "any") {
        if (opp.indoorOutdoor !== f.indoorOutdoor) return false;
      }

      if (f.physicalIntensity && f.physicalIntensity !== "any") {
        var maxRank = INTENSITY_RANK[f.physicalIntensity] || 3;
        var oppRank = INTENSITY_RANK[opp.physicalIntensity] || 2;
        if (oppRank > maxRank) return false;
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
        if (!ok) return false;
      }

      return true;
    });
  }

  function sortByDistance(list) {
    return list.slice().sort(function (a, b) {
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
    currentSeason: currentSeason
  };
})(typeof window !== "undefined" ? window : this);
