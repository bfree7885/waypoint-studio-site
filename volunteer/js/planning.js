/**
 * Waypoint Volunteer — local-first personal planning
 * Save / bookmark / interested / hide / personal list.
 * No public sharing. No accounts.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-volunteer-planning-v1";

  var DEFAULT_STATE = {
    savedOpportunities: [],
    interestedOpportunities: [],
    hiddenOpportunities: [],
    bookmarkedOrganizations: [],
    personalList: [],
    interests: [],
    mobility: {
      preferAccessible: false,
      maxIntensity: "vigorous"
    },
    availableHours: null
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULT_STATE);
      var parsed = JSON.parse(raw);
      var state = clone(DEFAULT_STATE);
      Object.keys(DEFAULT_STATE).forEach(function (key) {
        if (parsed[key] !== undefined) state[key] = parsed[key];
      });
      return state;
    } catch (err) {
      return clone(DEFAULT_STATE);
    }
  }

  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      return false;
    }
  }

  function toggleInList(list, id) {
    var i = list.indexOf(id);
    if (i === -1) {
      list.push(id);
      return true;
    }
    list.splice(i, 1);
    return false;
  }

  function has(list, id) {
    return list.indexOf(id) !== -1;
  }

  var api = {
    getState: function () {
      return load();
    },

    isSaved: function (id) {
      return has(load().savedOpportunities, id);
    },

    isInterested: function (id) {
      return has(load().interestedOpportunities, id);
    },

    isHidden: function (id) {
      return has(load().hiddenOpportunities, id);
    },

    isOrgBookmarked: function (id) {
      return has(load().bookmarkedOrganizations, id);
    },

    isOnPersonalList: function (id) {
      return has(load().personalList, id);
    },

    toggleSaved: function (id) {
      var state = load();
      var on = toggleInList(state.savedOpportunities, id);
      if (on) {
        var hi = state.hiddenOpportunities.indexOf(id);
        if (hi !== -1) state.hiddenOpportunities.splice(hi, 1);
      }
      save(state);
      return on;
    },

    toggleInterested: function (id) {
      var state = load();
      var on = toggleInList(state.interestedOpportunities, id);
      save(state);
      return on;
    },

    toggleHidden: function (id) {
      var state = load();
      var on = toggleInList(state.hiddenOpportunities, id);
      if (on) {
        ["savedOpportunities", "interestedOpportunities", "personalList"].forEach(
          function (key) {
            var i = state[key].indexOf(id);
            if (i !== -1) state[key].splice(i, 1);
          }
        );
      }
      save(state);
      return on;
    },

    toggleOrgBookmark: function (id) {
      var state = load();
      var on = toggleInList(state.bookmarkedOrganizations, id);
      save(state);
      return on;
    },

    togglePersonalList: function (id) {
      var state = load();
      var on = toggleInList(state.personalList, id);
      save(state);
      return on;
    },

    setInterests: function (categoryIds) {
      var state = load();
      state.interests = (categoryIds || []).slice();
      save(state);
      return state.interests;
    },

    setMobility: function (prefs) {
      var state = load();
      state.mobility = Object.assign({}, state.mobility, prefs || {});
      save(state);
      return state.mobility;
    },

    setAvailableHours: function (hours) {
      var state = load();
      state.availableHours = hours == null || hours === "" ? null : Number(hours);
      save(state);
      return state.availableHours;
    },

    clearHidden: function () {
      var state = load();
      state.hiddenOpportunities = [];
      save(state);
    },

    exportLocal: function () {
      return load();
    },

    resetAll: function () {
      save(clone(DEFAULT_STATE));
    }
  };

  global.VolunteerPlanning = api;
})(typeof window !== "undefined" ? window : this);
