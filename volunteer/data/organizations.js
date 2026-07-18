/**
 * Waypoint Volunteer — organization model + sample orgs
 *
 * Fields: name, mission, website, volunteerUrl, location,
 * contact, categories, serviceArea, verificationStatus
 */
(function (global) {
  "use strict";

  var ORGANIZATIONS = [
    {
      id: "org-ridgeway-trails",
      name: "Ridgeway Trails Conservancy",
      mission: "Steward footpaths and wild edges so people and wildlife can share the hills.",
      website: "https://example.org/ridgeway-trails",
      volunteerUrl: "https://example.org/ridgeway-trails/volunteer",
      location: {
        label: "State College, PA",
        lat: 40.7934,
        lon: -77.86,
        precision: "approximate"
      },
      contact: {
        email: "hello@ridgeway-trails.example",
        phone: null
      },
      categories: ["environmental"],
      serviceArea: "Centre County and adjoining trail corridors",
      verificationStatus: "demo"
    },
    {
      id: "org-clearwater-friends",
      name: "Friends of Clearwater Creek",
      mission: "Protect stream health through cleanups, plantings, and quiet stewardship.",
      website: "https://example.org/clearwater",
      volunteerUrl: "https://example.org/clearwater/help",
      location: {
        label: "Bellefonte, PA",
        lat: 40.9134,
        lon: -77.7783,
        precision: "approximate"
      },
      contact: {
        email: "stewards@clearwater.example",
        phone: null
      },
      categories: ["environmental", "citizen-science"],
      serviceArea: "Spring Creek watershed",
      verificationStatus: "demo"
    },
    {
      id: "org-valley-wildlife",
      name: "Valley Wildlife Center",
      mission: "Care for injured wildlife and invite neighbors into seasonal monitoring.",
      website: "https://example.org/valley-wildlife",
      volunteerUrl: "https://example.org/valley-wildlife/volunteer",
      location: {
        label: "Boalsburg, PA",
        lat: 40.7795,
        lon: -77.7764,
        precision: "approximate"
      },
      contact: {
        email: "volunteer@valley-wildlife.example",
        phone: null
      },
      categories: ["wildlife", "education"],
      serviceArea: "Central Pennsylvania",
      verificationStatus: "demo"
    },
    {
      id: "org-pollinator-pact",
      name: "Pollinator Pact",
      mission: "Grow native habitat and track pollinators with community science.",
      website: "https://example.org/pollinator-pact",
      volunteerUrl: "https://example.org/pollinator-pact/join",
      location: {
        label: "Huntingdon, PA",
        lat: 40.4848,
        lon: -78.0103,
        precision: "approximate"
      },
      contact: {
        email: "grow@pollinator-pact.example",
        phone: null
      },
      categories: ["wildlife", "citizen-science", "environmental"],
      serviceArea: "Juniata River corridor",
      verificationStatus: "demo"
    },
    {
      id: "org-open-sky-observatory",
      name: "Open Sky Nature Center",
      mission: "Share earth systems and local ecology through gentle outdoor learning.",
      website: "https://example.org/open-sky",
      volunteerUrl: "https://example.org/open-sky/volunteer",
      location: {
        label: "Pine Grove Mills, PA",
        lat: 40.7348,
        lon: -77.8825,
        precision: "approximate"
      },
      contact: {
        email: "educators@open-sky.example",
        phone: null
      },
      categories: ["education", "citizen-science"],
      serviceArea: "Centre County",
      verificationStatus: "demo"
    },
    {
      id: "org-table-and-shelf",
      name: "Table & Shelf Collective",
      mission: "Stock shelves, welcome neighbors, and keep community spaces open.",
      website: "https://example.org/table-shelf",
      volunteerUrl: "https://example.org/table-shelf/volunteer",
      location: {
        label: "State College, PA",
        lat: 40.795,
        lon: -77.859,
        precision: "approximate"
      },
      contact: {
        email: "welcome@table-shelf.example",
        phone: null
      },
      categories: ["community"],
      serviceArea: "Borough of State College",
      verificationStatus: "demo"
    },
    {
      id: "org-ready-neighbors",
      name: "Ready Neighbors Network",
      mission: "Build calm preparedness skills so communities can help each other.",
      website: "https://example.org/ready-neighbors",
      volunteerUrl: "https://example.org/ready-neighbors/train",
      location: {
        label: "Lewistown, PA",
        lat: 40.5992,
        lon: -77.5714,
        precision: "approximate"
      },
      contact: {
        email: "train@ready-neighbors.example",
        phone: null
      },
      categories: ["emergency", "community"],
      serviceArea: "Mifflin and neighbouring counties",
      verificationStatus: "demo"
    },
    {
      id: "org-library-commons",
      name: "Schlow Commons Volunteers",
      mission: "Keep libraries welcoming — shelves, events, and quiet tech help.",
      website: "https://example.org/schlow-commons",
      volunteerUrl: "https://example.org/schlow-commons/volunteer",
      location: {
        label: "State College, PA",
        lat: 40.7942,
        lon: -77.8615,
        precision: "approximate"
      },
      contact: {
        email: "volunteers@schlow-commons.example",
        phone: null
      },
      categories: ["community", "education"],
      serviceArea: "Centre County libraries",
      verificationStatus: "demo"
    }
  ];

  var BY_ID = {};
  ORGANIZATIONS.forEach(function (o) {
    BY_ID[o.id] = o;
  });

  global.VolunteerOrganizations = {
    list: ORGANIZATIONS,
    byId: BY_ID,
    get: function (id) {
      return BY_ID[id] || null;
    }
  };
})(typeof window !== "undefined" ? window : this);
