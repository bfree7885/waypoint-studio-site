/**
 * Waypoint Volunteer — shared data model registries (Discovery Engine v0.1)
 *
 * Canonical vocabulary for Organization, Opportunity, and related facets.
 * Demo catalog records should use these ids.
 */
(function (global) {
  "use strict";

  var OPPORTUNITY_TYPES = [
    { id: "volunteer-activity", label: "Volunteer activity" },
    { id: "citizen-science", label: "Citizen science" },
    { id: "community-event", label: "Community event" },
    { id: "trail-work", label: "Trail work" },
    { id: "conservation-project", label: "Conservation project" },
    { id: "animal-welfare", label: "Animal welfare" },
    { id: "food-assistance", label: "Food assistance" },
    { id: "education", label: "Education" },
    { id: "environmental-restoration", label: "Environmental restoration" },
    { id: "public-land-stewardship", label: "Public land stewardship" },
    { id: "emergency-preparedness", label: "Emergency preparedness" }
  ];

  var PHYSICAL_DEMAND = [
    { id: "light", label: "Low physical demand", rank: 1 },
    { id: "moderate", label: "Moderate physical demand", rank: 2 },
    { id: "vigorous", label: "High physical demand", rank: 3 }
  ];

  var SCHEDULE_KINDS = [
    { id: "one-time", label: "One-time event" },
    { id: "recurring", label: "Recurring schedule" },
    { id: "ongoing", label: "Ongoing / flexible" },
    { id: "seasonal", label: "Seasonal window" }
  ];

  var WEATHER_SENSITIVITY = [
    { id: "none", label: "Weather independent (indoor / remote)" },
    { id: "low", label: "Low weather sensitivity" },
    { id: "medium", label: "Medium — fair weather preferred" },
    { id: "high", label: "High — conditions may cancel" }
  ];

  var VERIFICATION = [
    { id: "demo", label: "Demo / illustrative" },
    { id: "unverified", label: "Unverified" },
    { id: "community", label: "Community submitted" },
    { id: "partner", label: "Partner verified" },
    { id: "official", label: "Official listing" }
  ];

  var DISCOVERY_FACETS = [
    { id: "near-me", label: "Near Me", kind: "spatial" },
    { id: "today", label: "Today", kind: "time" },
    { id: "this-weekend", label: "This Weekend", kind: "time" },
    { id: "remote", label: "Remote Opportunities", kind: "mode" },
    { id: "family-friendly", label: "Family Friendly", kind: "access" },
    { id: "indoors", label: "Indoors", kind: "setting" },
    { id: "outdoors", label: "Outdoors", kind: "setting" },
    { id: "low-physical", label: "Low Physical Demand", kind: "effort" },
    { id: "high-physical", label: "High Physical Demand", kind: "effort" },
    { id: "animals", label: "Animals", kind: "topic", tags: ["animals"] },
    { id: "nature", label: "Nature", kind: "topic", tags: ["nature"] },
    { id: "trails", label: "Trails", kind: "topic", tags: ["trails"] },
    { id: "parks", label: "Parks", kind: "topic", tags: ["parks"] },
    { id: "water", label: "Water", kind: "topic", tags: ["water"] },
    { id: "science", label: "Science", kind: "topic", tags: ["science"] },
    { id: "community", label: "Community", kind: "topic", tags: ["community"] },
    { id: "education", label: "Education", kind: "topic", tags: ["education"] },
    { id: "food-security", label: "Food Security", kind: "topic", tags: ["food-security"] },
    {
      id: "emergency-preparedness",
      label: "Emergency Preparedness",
      kind: "topic",
      tags: ["emergency-preparedness"]
    },
    {
      id: "habitat-restoration",
      label: "Habitat Restoration",
      kind: "topic",
      tags: ["habitat-restoration"]
    }
  ];

  var CITIZEN_SCIENCE_PROGRAMS = [
    { id: "inaturalist", label: "iNaturalist", sharedApps: ["foragecast", "education", "fieldry"] },
    { id: "ebird", label: "eBird", sharedApps: ["education", "fieldry"] },
    { id: "globe", label: "GLOBE Observer", sharedApps: ["education"] },
    { id: "noaa", label: "NOAA programs", sharedApps: ["education"] },
    { id: "phenology", label: "Phenology", sharedApps: ["foragecast", "fieldry", "education"] },
    { id: "water-quality", label: "Water quality", sharedApps: ["education"] },
    { id: "invasive-reporting", label: "Invasive species reporting", sharedApps: ["education"] },
    { id: "local-survey", label: "Local wildlife survey", sharedApps: ["education", "fieldry"] }
  ];

  var SKILLS = [
    { id: "none", label: "No special skills" },
    { id: "walking", label: "Comfortable walking" },
    { id: "plant-id-basic", label: "Basic plant ID (after briefing)" },
    { id: "birding-interest", label: "Interest in birds" },
    { id: "smartphone", label: "Smartphone for observations" },
    { id: "listening", label: "Warm listening" },
    { id: "sorting", label: "Sorting / packing" },
    { id: "digging", label: "Light digging" },
    { id: "teaching-presence", label: "Comfort with visitors / learners" },
    { id: "hygiene-protocol", label: "Follow hygiene protocols" }
  ];

  function indexById(list) {
    var map = {};
    list.forEach(function (item) {
      map[item.id] = item;
    });
    return map;
  }

  /**
   * Normalize a raw opportunity record into the v0.1 shape.
   * Back-compat: older fields (physicalIntensity, topics) still work.
   */
  function normalizeOpportunity(raw) {
    if (!raw) return null;
    var o = Object.assign({}, raw);
    o.opportunityType = o.opportunityType || "volunteer-activity";
    o.physicalDemand = o.physicalDemand || o.physicalIntensity || "moderate";
    o.physicalIntensity = o.physicalDemand;
    o.discoveryTags = o.discoveryTags || [];
    o.skills = o.skills || o.requiredSkills || [];
    o.requiredSkills = o.skills;
    o.equipment = o.equipment || o.suggestedClothing || [];
    o.weatherSensitivity =
      o.weatherSensitivity ||
      (o.indoorOutdoor === "indoor" || o.remote ? "none" : "medium");
    o.registrationRequired = !!o.registrationRequired;
    o.verificationStatus = o.verificationStatus || "demo";
    o.remote = !!o.remote;
    o.isCitizenScience =
      !!o.isCitizenScience || o.opportunityType === "citizen-science";
    o.durationMinutes =
      o.durationMinutes != null
        ? o.durationMinutes
        : Math.round((o.availableTimeMaxHours || 2) * 60);
    o.schedule = o.schedule || {
      kind: o.weekdayWeekend === "weekend" ? "recurring" : "ongoing",
      hint: o.scheduleHint || ""
    };
    o.source = o.source || {
      system: "waypoint-demo",
      label: "Waypoint demo catalog",
      url: null
    };
    o.ageRequirements = o.ageRequirements || {
      summary: o.familyFriendly
        ? "All ages welcome with an adult when needed"
        : "Adults 18+ unless noted",
      minAge: null,
      familyOk: !!o.familyFriendly
    };
    o.whatYoullDo = o.whatYoullDo || o.description || "";
    o.whyItMatters =
      o.whyItMatters ||
      "Small acts of care help local places and people — impact varies by day and need.";
    o.whoBenefits =
      o.whoBenefits || "Neighbors, local habitat, and the hosting organization.";
    return o;
  }

  global.VolunteerModel = {
    opportunityTypes: OPPORTUNITY_TYPES,
    physicalDemand: PHYSICAL_DEMAND,
    scheduleKinds: SCHEDULE_KINDS,
    weatherSensitivity: WEATHER_SENSITIVITY,
    verification: VERIFICATION,
    discoveryFacets: DISCOVERY_FACETS,
    citizenSciencePrograms: CITIZEN_SCIENCE_PROGRAMS,
    skills: SKILLS,
    byId: {
      opportunityTypes: indexById(OPPORTUNITY_TYPES),
      physicalDemand: indexById(PHYSICAL_DEMAND),
      discoveryFacets: indexById(DISCOVERY_FACETS),
      citizenSciencePrograms: indexById(CITIZEN_SCIENCE_PROGRAMS),
      skills: indexById(SKILLS),
      verification: indexById(VERIFICATION),
      weatherSensitivity: indexById(WEATHER_SENSITIVITY)
    },
    normalizeOpportunity: normalizeOpportunity,
    version: "0.1"
  };
})(typeof window !== "undefined" ? window : this);
