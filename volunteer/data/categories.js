/**
 * Waypoint Volunteer — interest categories
 * Colors are map markers / legend only; never used to rank people.
 */
(function (global) {
  "use strict";

  var CATEGORIES = [
    {
      id: "environmental",
      label: "Environmental Conservation",
      shortLabel: "Environment",
      description: "Trail care, restoration, cleanups, and planting.",
      color: "#8fbc4a",
      topics: [
        "Trail maintenance",
        "Park cleanup",
        "Habitat restoration",
        "Native planting",
        "Invasive species removal",
        "River cleanup"
      ]
    },
    {
      id: "wildlife",
      label: "Wildlife",
      shortLabel: "Wildlife",
      description: "Counts, monitoring, rehabilitation, and shelter support.",
      color: "#5aa88a",
      topics: [
        "Bird counts",
        "Amphibian monitoring",
        "Pollinator projects",
        "Wildlife rehabilitation",
        "Animal shelters"
      ]
    },
    {
      id: "citizen-science",
      label: "Citizen Science",
      shortLabel: "Science",
      description: "Contribute observations to shared scientific programs.",
      color: "#6ec8e8",
      topics: [
        "iNaturalist",
        "eBird",
        "GLOBE Observer",
        "NOAA programs",
        "Local monitoring"
      ]
    },
    {
      id: "community",
      label: "Community",
      shortLabel: "Community",
      description: "Food, libraries, gardens, seniors, and local nonprofits.",
      color: "#d4a35c",
      topics: [
        "Food banks",
        "Libraries",
        "Community gardens",
        "Senior assistance",
        "Community events",
        "Local nonprofits"
      ]
    },
    {
      id: "emergency",
      label: "Emergency & Resilience",
      shortLabel: "Resilience",
      description: "Preparedness, recovery, and community response training.",
      color: "#c47a6a",
      topics: [
        "CERT",
        "Red Cross",
        "Community preparedness",
        "Disaster recovery"
      ]
    },
    {
      id: "education",
      label: "Education",
      shortLabel: "Education",
      description: "Museums, nature centers, and STEM outreach.",
      color: "#9b7ed4",
      topics: [
        "Museum volunteers",
        "Nature centers",
        "Environmental education",
        "STEM outreach"
      ]
    }
  ];

  var BY_ID = {};
  CATEGORIES.forEach(function (c) {
    BY_ID[c.id] = c;
  });

  global.VolunteerCategories = {
    list: CATEGORIES,
    byId: BY_ID,
    get: function (id) {
      return BY_ID[id] || null;
    }
  };
})(typeof window !== "undefined" ? window : this);
