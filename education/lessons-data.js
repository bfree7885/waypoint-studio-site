(function () {
  "use strict";

  /**
   * Waypoint Education lesson catalog.
   * Add a lesson: push to LESSONS, create education/{category}/{slug}/index.html
   * with data-lesson="{slug}".
   */
  var CATEGORIES = {
    species: { label: "Species", path: "species" },
    skills: { label: "Skills", path: "skills" },
    ecosystems: { label: "Ecosystems", path: "ecosystems" },
    safety: { label: "Safety", path: "safety" }
  };

  var LESSONS = [
    {
      slug: "morels-101",
      title: "Morels 101",
      level: "101",
      category: "species",
      summary:
        "A calm introduction to morel ecology, timing, and what to notice before you ever pick one.",
      readingTime: "8 min",
      sections: [
        {
          heading: "What is a morel?",
          paragraphs: [
            "Morels are spring mushrooms in the genus Morchella. They appear when soil warms and moisture returns — often after rain on south-facing slopes, floodplain edges, and disturbed ground.",
            "At this level, your goal is not to harvest. Your goal is to learn what morel habitat looks like and when the season typically opens in your area."
          ]
        },
        {
          heading: "When to look",
          paragraphs: [
            "Morel season varies by latitude and elevation. In the Northeast, many foragers start watching in late April and peak through May. Soil temperature near 50°F is a common benchmark — not a guarantee.",
            "Track recent rain, night lows, and leaf-out stage on nearby hardwoods. Morels often follow the transition from bare ground to early spring green."
          ]
        },
        {
          heading: "Where they associate",
          paragraphs: [
            "Morels are often reported near dying or dead hardwoods — elm, ash, apple, tulip poplar, and sycamore in riparian zones. Old orchards, burn edges, and mulched landscaping can also produce fruitings.",
            "Think in layers: canopy trees, ground cover, moisture, and disturbance. You are reading a place, not searching for a dot on a map."
          ]
        },
        {
          heading: "First field marks",
          paragraphs: [
            "A true morel has a honeycombed, pitted cap attached to the stem. Slice it lengthwise: the interior should be hollow from tip to base.",
            "Color ranges from cream to gray to yellow-brown. Size and shape vary. The honeycomb pattern and hollow interior matter more than color alone."
          ]
        }
      ],
      fieldTips: [
        "Walk slowly and scan the ground at mid-distance — morels are easy to step past.",
        "Note the date, weather, trees nearby, and slope aspect when you find one. Patterns emerge over seasons.",
        "Start on trails you know well. Familiar ground teaches faster than new terrain every week."
      ],
      commonMistakes: [
        "Rushing the season before soil and canopy cues align.",
        "Collecting without cutting and checking for a hollow stem.",
        "Assuming every honeycomb-shaped mushroom is safe — false morels exist."
      ],
      relatedLessons: ["morels-102", "foraging-safety-101", "forest-succession-101"]
    },
    {
      slug: "morels-102",
      title: "Morels 102",
      level: "102",
      category: "species",
      summary:
        "Beyond basics — gray vs. yellow morels, habitat nuance, and building a repeatable scouting rhythm.",
      readingTime: "10 min",
      sections: [
        {
          heading: "Gray and yellow morels",
          paragraphs: [
            "Foragers often speak of gray and yellow morels as distinct spring phases or species complexes. Grays tend to appear earlier; yellows often follow as temperatures rise.",
            "At 102 level, treat these as field categories, not rigid taxonomy. Local mycologists may name species differently. Focus on consistent field characters and habitat notes."
          ]
        },
        {
          heading: "Micro-habitat",
          paragraphs: [
            "Within a good woods, morels cluster where moisture, warmth, and organic debris intersect — swales, root bowls, downed limb edges, and transition zones between wet and dry ground.",
            "Elevation matters. A south-facing lower slope may fruit weeks before a north-facing ridge in the same county."
          ]
        },
        {
          heading: "Building a scouting loop",
          paragraphs: [
            "Choose three to five locations with different aspects and elevations. Visit on a rhythm — weekly in season — and log conditions, not just finds.",
            "Pair your notes with ForageCast weather reads when available. You are correlating rain, temperature trend, and elevation band with fruiting windows."
          ]
        },
        {
          heading: "Ethical harvest principles",
          paragraphs: [
            "Cut at the base rather than uprooting entire patches when you do harvest. Leave small specimens and spread finds across an area.",
            "Some public lands prohibit mushroom collecting. Private land requires permission. Rules vary — verify before every season."
          ]
        }
      ],
      fieldTips: [
        "Mark waypoints only on private land or with appropriate permission — respect public-land ethics.",
        "Photograph cap and stem in situ before picking. Photos help ID review later.",
        "If a patch is small, observe one season before harvesting heavily."
      ],
      commonMistakes: [
        "Treating one good year as a permanent honey hole without noting what changed.",
        "Ignoring land-use rules because a spot \"always worked before.\"",
        "Overconfidence after a few successful finds — false morel risk remains."
      ],
      relatedLessons: ["morels-101", "chanterelles-101", "reading-terrain-101"]
    },
    {
      slug: "chanterelles-101",
      title: "Chanterelles 101",
      level: "101",
      category: "species",
      summary:
        "Learn the chanterelle's smooth ridge underside, summer timing, and oak-beech forest context.",
      readingTime: "7 min",
      sections: [
        {
          heading: "What distinguishes a chanterelle",
          paragraphs: [
            "Chanterelles are golden to apricot-colored mushrooms with a funnel-shaped cap and false gills — blunt ridges that run down the stem rather than thin, blade-like gills.",
            "Fresh specimens often smell faintly fruity or apricot-like. They are firm and slow to decay compared with many gilled mushrooms."
          ]
        },
        {
          heading: "Season and weather",
          paragraphs: [
            "In the Northeast, chanterelles often appear mid-summer through fall when humidity is steady and soils stay moist. A dry July can delay fruiting; consistent rain brings flushes.",
            "Unlike spring morels, chanterelles reward patience in warm, humid weeks — not the first warm day of the year."
          ]
        },
        {
          heading: "Habitat",
          paragraphs: [
            "Look in mossy hardwood forests with oak, beech, birch, and hemlock. Chanterelles are mycorrhizal — they associate with living tree roots, not bare lawn or wood chips alone.",
            "They often fruit in scattered groups across rolling ground rather than tight clusters on a single log."
          ]
        },
        {
          heading: "Safe comparison mindset",
          paragraphs: [
            "The critical comparison is chanterelle ridges vs. true gills. Jack-o'-lantern mushrooms have sharp, knife-like gills and grow in overlapping clusters on wood.",
            "At 101 level, learn chanterelles with an experienced forager or trusted regional guide before eating any wild mushroom."
          ]
        }
      ],
      fieldTips: [
        "Use a hand lens to compare ridge vs. gill structure on the cap underside.",
        "Note tree species within arm's reach of each find — associations build memory.",
        "Chanterelles can hide under leaf litter; move leaves gently with a stick, not your hands alone."
      ],
      commonMistakes: [
        "Confusing golden chanterelles with orange jack-o'-lanterns in summer woods.",
        "Assuming all ridge-bearing mushrooms are chanterelles — some false chanterelles exist.",
        "Harvesting from polluted roadsides or treated landscapes."
      ],
      relatedLessons: ["morels-101", "forest-succession-101", "foraging-safety-101"]
    },
    {
      slug: "reading-terrain-101",
      title: "Reading Terrain 101",
      level: "101",
      category: "skills",
      summary:
        "Slope, aspect, elevation, and drainage — the quiet cues that explain why one hillside behaves differently from another.",
      readingTime: "9 min",
      sections: [
        {
          heading: "Why terrain matters",
          paragraphs: [
            "Species, moisture, and season all respond to shape of the land. A north-facing hollow holds cold and moisture longer. A south-facing bench warms first in spring.",
            "Reading terrain turns random walks into structured observation. You are learning where life accumulates."
          ]
        },
        {
          heading: "Aspect and slope",
          paragraphs: [
            "Aspect is the direction a slope faces. South and west aspects receive more sun; north and east stay cooler and wetter longer.",
            "Gentle slopes often collect organic matter; steep slopes shed water and soil. Transition zones — toe slopes, benches, and ridgelines — are worth slow attention."
          ]
        },
        {
          heading: "Elevation bands",
          paragraphs: [
            "Season moves uphill. Low valleys green first; higher ridges lag by days or weeks. The same species may fruit at different calendar dates across a few hundred feet of elevation.",
            "When scouting, compare a low floodplain site with a mid-slope hardwood site on the same outing."
          ]
        },
        {
          heading: "Drainage and moisture",
          paragraphs: [
            "Water paths show where soil stays damp: swales, seep zones, and below rock ledges. Dry ridgetops and sandy knolls behave differently from clay-bottom hollows.",
            "You do not need expensive tools. Watch leaf litter color, moss patches, and plant indicators as you move."
          ]
        }
      ],
      fieldTips: [
        "Stand still for two minutes at each new aspect and note wind, temperature, and ground moisture.",
        "Use a simple topo map or phone terrain layer to confirm what your body already senses.",
        "Log aspect and elevation with every meaningful find — patterns emerge quickly."
      ],
      commonMistakes: [
        "Searching only convenient trail edges and ignoring interior terrain variation.",
        "Assuming one hillside represents a whole property or county.",
        "Forgetting that logging roads and cuts change drainage and sun exposure for years."
      ],
      relatedLessons: ["forest-succession-101", "morels-101", "morels-102"]
    },
    {
      slug: "forest-succession-101",
      title: "Forest Succession 101",
      level: "101",
      category: "ecosystems",
      summary:
        "How forests age, open, and rebuild — and why disturbance history explains what grows there today.",
      readingTime: "9 min",
      sections: [
        {
          heading: "What succession means",
          paragraphs: [
            "Ecological succession is the gradual change in plant and animal communities over time. After a field is abandoned, after a fire, or after selective logging, species composition shifts in predictable broad stages.",
            "You are not memorizing a textbook sequence. You are reading clues — tree size classes, deadwood, shade tolerance — that reveal where a stand sits in its story."
          ]
        },
        {
          heading: "Early and mid stages",
          paragraphs: [
            "Young forests often have dense saplings, sun-loving species, and fast-growing pioneers. Mid-stage forests develop closed canopy with mixed ages and accumulating woody debris.",
            "Some mushrooms and plants respond to these transitions — morels famously associate with disturbance and dying hardwoods in certain contexts."
          ]
        },
        {
          heading: "Mature and old-growth character",
          paragraphs: [
            "Mature forests have large-diameter trees, layered canopy, standing dead snags, and rotting logs. Species diversity can be high, but fruiting patterns differ from young woods.",
            "Old-growth is rare in the Northeast. Many \"old\" forests are recovering from past clearing — human history is part of the story."
          ]
        },
        {
          heading: "Reading the stand",
          paragraphs: [
            "Look for stumps, stone walls, uniform tree size, and planted rows — signs of past agriculture or forestry. These explain why a forest feels young or oddly even-aged.",
            "Succession is local. Two forests a mile apart may differ because of fire, grazing, logging, or flooding history."
          ]
        }
      ],
      fieldTips: [
        "Count a few tree diameters at chest height — uniform sizes suggest a single disturbance event.",
        "Note snags and downed logs; they hold moisture and fungi long after canopy closes.",
        "Read stone walls and barbed wire as historical field edges — edges are productive learning zones."
      ],
      commonMistakes: [
        "Treating all hardwood forests as interchangeable for foraging.",
        "Ignoring human land-use history because trees look \"natural.\"",
        "Expecting the same species in young regrowth and mature moist hollows."
      ],
      relatedLessons: ["reading-terrain-101", "morels-101", "chanterelles-101"]
    },
    {
      slug: "foraging-safety-101",
      title: "Foraging Safety 101",
      level: "101",
      category: "safety",
      summary:
        "Identification discipline, legal awareness, and the habits that keep foraging calm and responsible.",
      readingTime: "8 min",
      sections: [
        {
          heading: "The golden rule",
          paragraphs: [
            "If you cannot identify a wild food with confidence, do not eat it. \"Pretty sure\" is not sure enough for mushrooms, plants, or berries.",
            "Safety is not fear — it is a repeatable process: observe, compare, confirm with trusted references, and ask experienced people when possible."
          ]
        },
        {
          heading: "Identification habits",
          paragraphs: [
            "Use multiple field characters — not color alone. Note habitat, season, smell, spore surface, stem structure, and what grows nearby.",
            "Photograph specimens before handling heavily. Keep unknown samples separate from your harvest bag."
          ]
        },
        {
          heading: "Legal and land access",
          paragraphs: [
            "Foraging rules vary by state, park, and landowner. Some public lands prohibit collection; others allow limited personal harvest.",
            "Always obtain clear permission on private land. Verbal permission with a name and date is better than assumption."
          ]
        },
        {
          heading: "Harvest and handling",
          paragraphs: [
            "Avoid roadsides, industrial sites, and treated lawns. Contaminants accumulate in soil and plant tissue.",
            "Even correctly identified foods can cause illness if spoiled, undercooked, or eaten in quantity. Start with small portions when trying any new wild food."
          ]
        }
      ],
      fieldTips: [
        "Carry a regional field guide or vetted app — cross-check every new species twice.",
        "Tell someone where you are going and when you expect to return.",
        "Wear tick-aware clothing and check yourself after every outing in the Northeast."
      ],
      commonMistakes: [
        "Relying on a single photo match from social media.",
        "Assuming experts on forums can ID from one blurry image.",
        "Harvesting under time pressure — hurry breeds mistakes."
      ],
      relatedLessons: ["morels-101", "chanterelles-101", "reading-terrain-101"]
    }
  ];

  var bySlug = {};
  LESSONS.forEach(function (lesson) {
    bySlug[lesson.slug] = lesson;
  });

  window.WaypointLessons = {
    categories: CATEGORIES,
    all: LESSONS,
    get: function (slug) {
      return bySlug[slug] || null;
    },
    byCategory: function (category) {
      return LESSONS.filter(function (l) {
        return l.category === category;
      });
    }
  };
})();
