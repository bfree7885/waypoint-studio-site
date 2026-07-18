/**
 * Waypoint Volunteer — local-first personal planning (v0.2)
 * Save, lists, completed (private), notes. No public sharing.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-volunteer-planning-v2";
  var LEGACY_KEY = "waypoint-volunteer-planning-v1";

  var DEFAULT_STATE = {
    savedOpportunities: [],
    interestedOpportunities: [],
    hiddenOpportunities: [],
    bookmarkedOrganizations: [],
    personalList: [],
    completedOpportunities: [],
    notes: {},
    customLists: {
      /* id -> { id, name, opportunityIds: [] } */
    },
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

  function migrateLegacy() {
    try {
      var raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : migrateLegacy();
      var state = clone(DEFAULT_STATE);
      if (!parsed) return state;
      Object.keys(DEFAULT_STATE).forEach(function (key) {
        if (parsed[key] !== undefined) state[key] = parsed[key];
      });
      if (!state.notes || typeof state.notes !== "object") state.notes = {};
      if (!state.customLists || typeof state.customLists !== "object") {
        state.customLists = {};
      }
      if (!Array.isArray(state.completedOpportunities)) {
        state.completedOpportunities = [];
      }
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

  function slugify(name) {
    return String(name || "list")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
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

    isCompleted: function (id) {
      return has(load().completedOpportunities, id);
    },

    getNote: function (id) {
      return load().notes[id] || "";
    },

    setNote: function (id, text) {
      var state = load();
      var cleaned = String(text || "").slice(0, 2000);
      if (!cleaned) delete state.notes[id];
      else state.notes[id] = cleaned;
      save(state);
      return state.notes[id] || "";
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
        [
          "savedOpportunities",
          "interestedOpportunities",
          "personalList",
          "completedOpportunities"
        ].forEach(function (key) {
          var i = state[key].indexOf(id);
          if (i !== -1) state[key].splice(i, 1);
        });
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

    toggleCompleted: function (id) {
      var state = load();
      var on = toggleInList(state.completedOpportunities, id);
      if (on && !has(state.savedOpportunities, id)) {
        state.savedOpportunities.push(id);
      }
      save(state);
      return on;
    },

    createList: function (name) {
      var state = load();
      var id = "list-" + slugify(name) + "-" + Date.now().toString(36).slice(-4);
      state.customLists[id] = {
        id: id,
        name: String(name || "My list").slice(0, 80),
        opportunityIds: []
      };
      save(state);
      return state.customLists[id];
    },

    renameList: function (listId, name) {
      var state = load();
      if (!state.customLists[listId]) return null;
      state.customLists[listId].name = String(name || "My list").slice(0, 80);
      save(state);
      return state.customLists[listId];
    },

    deleteList: function (listId) {
      var state = load();
      delete state.customLists[listId];
      save(state);
    },

    addToList: function (listId, opportunityId) {
      var state = load();
      var list = state.customLists[listId];
      if (!list) return false;
      if (list.opportunityIds.indexOf(opportunityId) === -1) {
        list.opportunityIds.push(opportunityId);
      }
      if (!has(state.savedOpportunities, opportunityId)) {
        state.savedOpportunities.push(opportunityId);
      }
      save(state);
      return true;
    },

    removeFromList: function (listId, opportunityId) {
      var state = load();
      var list = state.customLists[listId];
      if (!list) return false;
      var i = list.opportunityIds.indexOf(opportunityId);
      if (i !== -1) list.opportunityIds.splice(i, 1);
      save(state);
      return true;
    },

    getLists: function () {
      var state = load();
      return Object.keys(state.customLists).map(function (id) {
        return state.customLists[id];
      });
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
