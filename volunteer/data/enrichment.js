/**
 * Waypoint Volunteer — v0.1 field enrichment for demo opportunities
 * Merged at load time with base catalog records.
 */
(function (global) {
  "use strict";

  var ENRICHMENT = {
    "opp-ridge-trail-day": {
      opportunityType: "trail-work",
      discoveryTags: ["nature", "trails", "parks"],
      whatYoullDo:
        "Clear light brush, reset water bars, and tidy trail edges with a small steward crew.",
      whyItMatters:
        "Soft maintenance keeps paths passable and reduces erosion. One Saturday does not “save” a mountain — it keeps care going.",
      whoBenefits: "Hikers, trail stewards, and hillside habitat edges.",
      durationMinutes: 180,
      equipment: ["Sturdy shoes", "Long pants", "Work gloves", "Water"],
      weatherSensitivity: "medium",
      registrationRequired: true,
      registrationNotes: "Sign up so the crew lead knows how many tools to bring.",
      skills: ["walking"],
      schedule: { kind: "recurring", hint: "Most Saturday mornings in fair weather" },
      ageRequirements: {
        summary: "Ages 12+ with an adult; younger children may watch from the trailhead.",
        minAge: 12,
        familyOk: true
      }
    },
    "opp-creek-cleanup": {
      opportunityType: "environmental-restoration",
      discoveryTags: ["nature", "water", "parks", "community"],
      whatYoullDo:
        "Walk the park shoreline and gather litter. Bank edges are optional if mobility is limited.",
      whyItMatters:
        "Litter removal protects wildlife and keeps a shared park welcoming. Results are visible and honest — not dramatic.",
      whoBenefits: "Park visitors, stream life, and the Friends stewardship group.",
      durationMinutes: 120,
      equipment: ["Closed-toe shoes", "Sun hat", "Reusable water bottle"],
      weatherSensitivity: "medium",
      registrationRequired: false,
      registrationNotes: "Walk-ups welcome; bags provided on site.",
      skills: [],
      schedule: { kind: "recurring", hint: "Second Sunday each month" }
    },
    "opp-native-planting": {
      opportunityType: "environmental-restoration",
      discoveryTags: ["nature", "habitat-restoration", "animals"],
      whatYoullDo:
        "Plant native plugs and mulch gently. Instruction is given on site; beginners are welcome.",
      whyItMatters:
        "Native plantings feed pollinators over years. A single morning is a start, not a finished meadow.",
      whoBenefits: "Pollinators, songbirds, and neighbors who use the riverfront path.",
      durationMinutes: 240,
      equipment: ["Kneeling pad or garden pants", "Sun protection", "Gloves"],
      weatherSensitivity: "medium",
      registrationRequired: true,
      skills: [],
      schedule: { kind: "seasonal", hint: "Spring and fall planting weekends" }
    },
    "opp-invasive-pull": {
      opportunityType: "conservation-project",
      discoveryTags: ["nature", "habitat-restoration", "science"],
      whatYoullDo:
        "Pull early-season garlic mustard before seed set after a short identification walk.",
      whyItMatters:
        "Early pulls reduce seed banks. This is steady stewardship, not a one-day cure for invasives.",
      whoBenefits: "Understory plants, woodland wildlife, and future trail users.",
      durationMinutes: 150,
      equipment: ["Long sleeves", "Tick-aware clothing", "Gloves"],
      weatherSensitivity: "medium",
      registrationRequired: true,
      skills: ["plant-id-basic"],
      schedule: { kind: "seasonal", hint: "Weekday mornings in May" },
      isCitizenScience: false
    },
    "opp-bird-count": {
      opportunityType: "citizen-science",
      isCitizenScience: true,
      citizenScienceProgram: "ebird",
      discoveryTags: ["animals", "nature", "science"],
      whatYoullDo:
        "Walk a short neighborhood route and note birds you see or hear. Mentors available for first-timers.",
      whyItMatters:
        "Counts add to shared understanding of local bird life. Your list is a contribution, not a contest.",
      whoBenefits: "Researchers, local naturalists, and conservation planners.",
      durationMinutes: 120,
      equipment: ["Layers for cool mornings", "Quiet shoes", "Optional binoculars"],
      weatherSensitivity: "low",
      registrationRequired: false,
      skills: ["birding-interest"],
      schedule: { kind: "recurring", hint: "Select Saturday mornings" }
    },
    "opp-amphibian-night": {
      opportunityType: "citizen-science",
      isCitizenScience: true,
      citizenScienceProgram: "local-survey",
      discoveryTags: ["animals", "nature", "science", "water"],
      whatYoullDo:
        "Walk a marked roadside corridor at dusk and carefully count migrating amphibians.",
      whyItMatters:
        "Migration nights are brief. Careful counts help partners understand crossings — without heroics.",
      whoBenefits: "Amphibians, roadway planners, and wildlife educators.",
      durationMinutes: 120,
      equipment: ["Rain jacket", "Waterproof footwear"],
      weatherSensitivity: "high",
      registrationRequired: true,
      registrationNotes: "Safety briefing required; reflective gear provided.",
      skills: ["walking"],
      schedule: { kind: "seasonal", hint: "Rainy spring evenings — weather dependent" },
      ageRequirements: {
        summary: "Adults 16+; not designed for young children.",
        minAge: 16,
        familyOk: false
      }
    },
    "opp-pollinator-watch": {
      opportunityType: "citizen-science",
      isCitizenScience: true,
      citizenScienceProgram: "phenology",
      discoveryTags: ["animals", "nature", "science", "habitat-restoration"],
      whatYoullDo:
        "Sit near milkweed and note butterflies and bees. Cards and guidance provided — no pressure to ID everything.",
      whyItMatters:
        "Seasonal observations help track pollinator timing. Noticing is enough; perfect ID is optional.",
      whoBenefits: "Pollinator projects, gardeners, and regional monitoring networks.",
      durationMinutes: 90,
      equipment: ["Sun hat", "Comfortable clothes", "Optional notebook"],
      weatherSensitivity: "medium",
      registrationRequired: false,
      skills: [],
      schedule: { kind: "seasonal", hint: "Late summer weekends" }
    },
    "opp-wildlife-rehab-laundry": {
      opportunityType: "animal-welfare",
      discoveryTags: ["animals", "community"],
      whatYoullDo:
        "Quiet indoor support: laundry, dish prep, and supply sorting. No animal handling in this role.",
      whyItMatters:
        "Rehab centers run on unglamorous care. Clean towels keep animals safer — impact is real and modest.",
      whoBenefits: "Injured wildlife in care and the rehab staff.",
      durationMinutes: 180,
      equipment: ["Closed-toe shoes", "Clothes that can get damp"],
      weatherSensitivity: "none",
      registrationRequired: true,
      skills: ["hygiene-protocol"],
      schedule: { kind: "ongoing", hint: "Weekday daytime shifts" },
      indoorOutdoor: "indoor"
    },
    "opp-inaturalist-bioblitz": {
      opportunityType: "citizen-science",
      isCitizenScience: true,
      citizenScienceProgram: "inaturalist",
      discoveryTags: ["science", "nature", "parks"],
      whatYoullDo:
        "Walk slowly, photograph what you notice, and upload to iNaturalist. Mentors help with the app.",
      whyItMatters:
        "Observations become open data others can learn from. One walk will not map a whole landscape.",
      whoBenefits: "Scientists, educators, and future Fieldry / Education cross-links.",
      durationMinutes: 120,
      equipment: ["Comfortable walking shoes", "Layers", "Smartphone"],
      weatherSensitivity: "medium",
      registrationRequired: false,
      skills: ["smartphone"],
      schedule: { kind: "seasonal", hint: "Seasonal BioBlitz weekends" },
      sharedApps: ["foragecast", "education", "fieldry"]
    },
    "opp-ebird-morning": {
      opportunityType: "citizen-science",
      isCitizenScience: true,
      citizenScienceProgram: "ebird",
      discoveryTags: ["animals", "science", "water", "nature"],
      whatYoullDo:
        "Join a short wetland survey and submit a complete eBird checklist. Beginners can shadow a leader.",
      whyItMatters:
        "Complete checklists strengthen regional bird data. Your presence matters more than rare finds.",
      whoBenefits: "Bird conservation science and local nature-center programs.",
      durationMinutes: 90,
      equipment: ["Warm layers", "Quiet footwear", "Optional binoculars"],
      weatherSensitivity: "low",
      registrationRequired: false,
      skills: ["birding-interest", "smartphone"],
      schedule: { kind: "recurring", hint: "Select weekend mornings" },
      sharedApps: ["education", "fieldry"]
    },
    "opp-globe-clouds": {
      opportunityType: "citizen-science",
      isCitizenScience: true,
      citizenScienceProgram: "globe",
      discoveryTags: ["science", "education", "nature"],
      remote: false,
      whatYoullDo:
        "Look up, log cloud types in GLOBE Observer, and contribute to a global sky dataset.",
      whyItMatters:
        "Many short observations improve climate education datasets. Forty-five minutes is enough.",
      whoBenefits: "NASA GLOBE partners, teachers, and curious neighbors.",
      durationMinutes: 45,
      equipment: ["Weather-appropriate outdoor clothes", "Smartphone"],
      weatherSensitivity: "low",
      registrationRequired: false,
      skills: ["smartphone"],
      schedule: { kind: "ongoing", hint: "Flexible daytime slots" },
      sharedApps: ["education"]
    },
    "opp-food-bank-pack": {
      opportunityType: "food-assistance",
      discoveryTags: ["food-security", "community"],
      whatYoullDo:
        "Sort and pack grocery boxes indoors with a friendly crew and clear instructions.",
      whyItMatters:
        "Packed boxes reach neighbors the same week. Help is practical; you will not solve hunger alone.",
      whoBenefits: "Households using the pantry and pantry staff.",
      durationMinutes: 120,
      equipment: ["Closed-toe shoes", "Layers for cool storage"],
      weatherSensitivity: "none",
      registrationRequired: true,
      skills: ["sorting"],
      schedule: { kind: "recurring", hint: "Weekday afternoons" },
      indoorOutdoor: "indoor"
    },
    "opp-library-shelving": {
      opportunityType: "education",
      discoveryTags: ["education", "community"],
      whatYoullDo: "Reshelve returns and greet visitors in a quiet public library.",
      whyItMatters:
        "Open shelves keep a commons usable. This is steady hospitality, not a performance metric.",
      whoBenefits: "Library visitors and library staff.",
      durationMinutes: 120,
      equipment: ["Casual indoor clothes"],
      weatherSensitivity: "none",
      registrationRequired: true,
      skills: ["sorting"],
      schedule: { kind: "ongoing", hint: "Flexible weekday shifts" },
      indoorOutdoor: "indoor"
    },
    "opp-community-garden": {
      opportunityType: "community-event",
      discoveryTags: ["food-security", "community", "nature", "parks"],
      whatYoullDo:
        "Weed, water, and harvest for the pantry. Kids welcome with an adult. Tools shared on site.",
      whyItMatters:
        "Garden workshares feed both soil and pantry shelves. Weather and season shape what gets done.",
      whoBenefits: "Pantry guests, gardeners, and pollinators at the plot edge.",
      durationMinutes: 120,
      equipment: ["Sun protection", "Garden gloves", "Water bottle"],
      weatherSensitivity: "medium",
      registrationRequired: false,
      skills: [],
      schedule: { kind: "seasonal", hint: "Saturday mornings in growing season" }
    },
    "opp-senior-companion": {
      opportunityType: "volunteer-activity",
      discoveryTags: ["community"],
      remote: true,
      whatYoullDo:
        "Make a short weekly phone call with a neighbor who appreciates company. Orientation provided.",
      whyItMatters:
        "Companionship reduces isolation for some people. Conversations vary — listen more than fix.",
      whoBenefits: "Older neighbors and the mutual-aid network.",
      durationMinutes: 60,
      equipment: [],
      weatherSensitivity: "none",
      registrationRequired: true,
      skills: ["listening"],
      schedule: { kind: "ongoing", hint: "Flexible daytime or evening" },
      indoorOutdoor: "indoor",
      locationLabel: "Remote / from home"
    },
    "opp-cert-intro": {
      opportunityType: "emergency-preparedness",
      discoveryTags: ["emergency-preparedness", "community", "education"],
      whatYoullDo:
        "Learn basic community emergency response skills in a calm classroom. No deployment in this session.",
      whyItMatters:
        "Preparedness is practice, not panic. One evening builds familiarity — not a guarantee of response roles.",
      whoBenefits: "Your household and neighbors if you choose to continue training later.",
      durationMinutes: 180,
      equipment: ["Comfortable indoor clothes", "Closed-toe shoes"],
      weatherSensitivity: "none",
      registrationRequired: true,
      skills: [],
      schedule: { kind: "recurring", hint: "Monthly weekday evenings" },
      indoorOutdoor: "indoor"
    },
    "opp-red-cross-blood": {
      opportunityType: "community-event",
      discoveryTags: ["community", "emergency-preparedness"],
      whatYoullDo:
        "Welcome donors, offer water, and keep the room calm. No medical tasks.",
      whyItMatters:
        "Hospitality helps drives run smoothly. You support donors; clinical work stays with trained staff.",
      whoBenefits: "Blood donors and regional medical supply partners.",
      durationMinutes: 180,
      equipment: ["Clean casual clothes"],
      weatherSensitivity: "none",
      registrationRequired: true,
      skills: ["teaching-presence"],
      schedule: { kind: "one-time", hint: "Scheduled drive weekends" },
      indoorOutdoor: "indoor"
    },
    "opp-museum-docent": {
      opportunityType: "education",
      discoveryTags: ["education", "nature", "science"],
      whatYoullDo:
        "Greet visitors and point toward exhibits. Script and shadowing provided.",
      whyItMatters:
        "A kind welcome makes nature learning less intimidating. Curiosity matters more than expertise.",
      whoBenefits: "Museum visitors and nature-center educators.",
      durationMinutes: 180,
      equipment: ["Neat casual clothes"],
      weatherSensitivity: "none",
      registrationRequired: true,
      skills: ["teaching-presence"],
      schedule: { kind: "recurring", hint: "Weekend daytime" },
      indoorOutdoor: "indoor"
    },
    "opp-stem-outreach": {
      opportunityType: "education",
      discoveryTags: ["education", "science", "community"],
      whatYoullDo:
        "Help kids try simple earth-science activities. Materials are prepared ahead.",
      whyItMatters:
        "Hands-on tables spark interest. One night will not create scientists — it can open a door.",
      whoBenefits: "Families at STEM night and library education staff.",
      durationMinutes: 120,
      equipment: ["Clothes that can get a little messy"],
      weatherSensitivity: "none",
      registrationRequired: true,
      skills: ["teaching-presence"],
      schedule: { kind: "recurring", hint: "Monthly evening events" },
      indoorOutdoor: "indoor"
    },
    "opp-habitat-restoration": {
      opportunityType: "environmental-restoration",
      discoveryTags: ["habitat-restoration", "nature", "water"],
      whatYoullDo:
        "Plant shrubs along a stream buffer. Tools and guidance provided.",
      whyItMatters:
        "Buffers take years to mature. Your planting is a real contribution with delayed, quiet results.",
      whoBenefits: "Stream health, wildlife corridors, and downstream neighbors.",
      durationMinutes: 240,
      equipment: ["Work boots", "Gloves", "Rain layer", "Water"],
      weatherSensitivity: "high",
      registrationRequired: true,
      skills: ["digging", "walking"],
      schedule: { kind: "seasonal", hint: "Spring and fall weekends" },
      physicalDemand: "vigorous"
    },
    "opp-tree-phenology": {
      opportunityType: "citizen-science",
      isCitizenScience: true,
      citizenScienceProgram: "phenology",
      category: "citizen-science",
      title: "Neighborhood tree phenology check",
      organizationId: "org-open-sky-observatory",
      topics: ["Local monitoring", "Phenology"],
      lat: 40.791,
      lon: -77.865,
      locationLabel: "Downtown street-tree loop",
      estimatedCommitment: "45 minutes",
      availableTimeMaxHours: 1,
      indoorOutdoor: "outdoor",
      physicalIntensity: "light",
      physicalDemand: "light",
      weekdayWeekend: "weekday",
      familyFriendly: true,
      petFriendly: false,
      accessibility: {
        summary: "Sidewalks and curb cuts; short stops at marked trees.",
        wheelchairAccess: true,
        notes: "Route can be shortened."
      },
      seasonality: ["spring", "fall"],
      weatherSuitability: ["fair", "cool", "dry"],
      description:
        "Note leaf-out or leaf-fall on a few marked street trees and log observations.",
      officialWebsite: "https://example.org/open-sky",
      applicationLink: "https://example.org/open-sky/volunteer",
      scheduleHint: "Flexible spring and fall mornings",
      discoveryTags: ["science", "nature", "parks"],
      whatYoullDo:
        "Visit a few marked street trees, note leaf stage, and log a short observation.",
      whyItMatters:
        "Phenology tracks season timing year to year. Small, honest notes beat perfect coverage.",
      whoBenefits: "Climate education programs and local naturalists.",
      durationMinutes: 45,
      equipment: ["Comfortable shoes", "Smartphone or paper card"],
      weatherSensitivity: "low",
      registrationRequired: false,
      skills: ["smartphone"],
      schedule: { kind: "seasonal", hint: "Flexible spring and fall mornings" },
      sharedApps: ["foragecast", "fieldry", "education"],
      verificationStatus: "demo",
      source: {
        system: "waypoint-demo",
        label: "Waypoint demo catalog",
        url: null
      }
    },
    "opp-water-clarity": {
      opportunityType: "citizen-science",
      isCitizenScience: true,
      citizenScienceProgram: "water-quality",
      category: "citizen-science",
      title: "Stream clarity kit observation",
      organizationId: "org-clearwater-friends",
      topics: ["Local monitoring", "Water quality"],
      lat: 40.91,
      lon: -77.785,
      locationLabel: "Clearwater access point",
      estimatedCommitment: "1 hour",
      availableTimeMaxHours: 1.5,
      indoorOutdoor: "outdoor",
      physicalIntensity: "light",
      physicalDemand: "light",
      weekdayWeekend: "weekend",
      familyFriendly: true,
      petFriendly: false,
      accessibility: {
        summary: "Short path to a viewing platform; kit use is seated-friendly.",
        wheelchairAccess: true,
        notes: "Platform is level."
      },
      seasonality: ["spring", "summer", "fall"],
      weatherSuitability: ["fair", "cool", "dry"],
      description:
        "Use a simple clarity kit at a public access point and record the reading.",
      officialWebsite: "https://example.org/clearwater",
      applicationLink: "https://example.org/clearwater/help",
      scheduleHint: "Select weekend mid-mornings",
      discoveryTags: ["water", "science", "nature"],
      whatYoullDo:
        "Follow a printed kit card to take one clarity reading and write it down.",
      whyItMatters:
        "Repeated simple readings help partners spot unusual changes. One reading is a data point, not a verdict.",
      whoBenefits: "Watershed stewards and water-education programs.",
      durationMinutes: 60,
      equipment: ["Closed-toe shoes", "Kit (provided)"],
      weatherSensitivity: "medium",
      registrationRequired: true,
      skills: [],
      schedule: { kind: "recurring", hint: "Select weekend mid-mornings" },
      sharedApps: ["education"],
      verificationStatus: "demo",
      source: {
        system: "waypoint-demo",
        label: "Waypoint demo catalog",
        url: null
      }
    },
    "opp-invasive-report": {
      opportunityType: "citizen-science",
      isCitizenScience: true,
      citizenScienceProgram: "invasive-reporting",
      category: "citizen-science",
      title: "Invasive plant photo report walk",
      organizationId: "org-ridgeway-trails",
      topics: ["Invasive species removal", "iNaturalist"],
      lat: 40.798,
      lon: -77.85,
      locationLabel: "Ridgeway connector path",
      estimatedCommitment: "1 hour",
      availableTimeMaxHours: 1.5,
      indoorOutdoor: "outdoor",
      physicalIntensity: "light",
      physicalDemand: "light",
      weekdayWeekend: "weekend",
      familyFriendly: true,
      petFriendly: false,
      accessibility: {
        summary: "Packed path with gentle grades.",
        wheelchairAccess: true,
        notes: null
      },
      seasonality: ["spring", "summer", "fall"],
      weatherSuitability: ["fair", "cool", "dry"],
      description:
        "Photograph suspected invasive plants along a public path and submit reports.",
      officialWebsite: "https://example.org/ridgeway-trails",
      applicationLink: "https://example.org/ridgeway-trails/volunteer",
      scheduleHint: "Self-paced weekends",
      discoveryTags: ["science", "nature", "trails", "habitat-restoration"],
      whatYoullDo:
        "Walk a short public path, photograph plants of concern, and submit with a mentor checklist.",
      whyItMatters:
        "Reports help stewards prioritize later pulls. Reporting is not the same as removal.",
      whoBenefits: "Trail stewards and habitat restoration crews.",
      durationMinutes: 60,
      equipment: ["Smartphone", "Comfortable shoes"],
      weatherSensitivity: "low",
      registrationRequired: false,
      skills: ["smartphone"],
      schedule: { kind: "ongoing", hint: "Self-paced weekends" },
      sharedApps: ["education", "fieldry"],
      verificationStatus: "demo",
      source: {
        system: "waypoint-demo",
        label: "Waypoint demo catalog",
        url: null
      }
    }
  };

  global.VolunteerOpportunityEnrichment = {
    byId: ENRICHMENT,
    get: function (id) {
      return ENRICHMENT[id] || null;
    }
  };
})(typeof window !== "undefined" ? window : this);
