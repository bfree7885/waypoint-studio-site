(function () {
  "use strict";

  /**
   * Single source of truth for ForageCast species profiles.
   * To add a species: push a new entry to SPECIES, add an image to
   * /assets/species/, and create education/{slug}/index.html with
   * data-species="{slug}".
   *
   * Swap placeholders for verified photos by updating `image` (e.g. morel.jpg).
   */
  var IMAGE_BASE = "/assets/species/";
  var IMAGE_DISCLAIMER =
    "Images are illustrative placeholders until verified field photos are added.";

  var SPECIES = [
    {
      slug: "morel",
      commonName: "Morel",
      scientificName: "Morchella spp.",
      category: "Fungus",
      image: "morel.svg",
      habitat:
        "Mixed hardwood forests, floodplains, south-facing slopes, and disturbed ground near elm, ash, apple, and tulip poplar.",
      season: "Early to mid-spring; often after soil warms and following rain.",
      associatedPlants: [
        "American elm (historically)",
        "Ash",
        "Apple",
        "Tulip poplar",
        "Sycamore in riparian zones"
      ],
      identificationTips: [
        "Honeycombed, pitted cap attached to stem",
        "Hollow stem and cap when sliced lengthwise",
        "Cap ridges run vertically; pits are irregular"
      ],
      lookalikes: [
        "False morel (Gyromitra) — brain-like, not honeycombed; not hollow",
        "Verpa — cap free from stem; only stem hollow"
      ],
      range:
        "Temperate North America; common in the Northeast and Midwest during spring morel season.",
      beginnerNotes:
        "Start with intact, fresh specimens. Always cut and inspect the hollow interior. When in doubt, leave it out."
    },
    {
      slug: "chanterelle",
      commonName: "Chanterelle",
      scientificName: "Cantharellus cibarius and allies",
      category: "Fungus",
      image: "chanterelle.svg",
      habitat:
        "Mossy hardwood and mixed forests; often on rolling ground with oak, beech, birch, and hemlock nearby.",
      season: "Mid-summer through fall; peaks after consistent humidity.",
      associatedPlants: ["Oak", "Beech", "Birch", "Hemlock", "Mossy forest floor"],
      identificationTips: [
        "Smooth to slightly wrinkled underside — not true gills",
        "Funnel-shaped cap with wavy margin",
        "Apricot-like color and fruity scent when fresh"
      ],
      lookalikes: [
        "Jack-o'-lantern (Omphalotus) — true gills, grows in clusters on wood",
        "False chanterelle (Hygrophoropsis) — thin, forked gills"
      ],
      range:
        "Widespread in eastern North America; especially productive in humid summers.",
      beginnerNotes:
        "Learn gills vs. ridges first. Chanterelles are sturdy and slow to decay — good for field study."
    },
    {
      slug: "black-trumpet",
      commonName: "Black Trumpet",
      scientificName: "Craterellus cornucopioides",
      category: "Fungus",
      image: "black-trumpet.svg",
      habitat:
        "Low, moist hardwood forests; often near moss, streams, and decaying leaf litter.",
      season: "Late summer through fall; often after sustained rain.",
      associatedPlants: ["Oak", "Beech", "Moss", "Stream-side hardwoods"],
      identificationTips: [
        "Thin, trumpet- or funnel-shaped black to gray-brown fruiting body",
        "No true gills; smooth or slightly wrinkled outer surface",
        "Fragile, hollow interior"
      ],
      lookalikes: [
        "Devil's urn (Urnula) — more cup-shaped, grows on wood",
        "Dark cup fungi — different shape and substrate"
      ],
      range:
        "Eastern North America; patchy but locally abundant in suitable hardwood forest.",
      beginnerNotes:
        "Hard to spot against leaf litter — scan slowly at ground level. Excellent dried; low beginner risk when ID is confirmed."
    },
    {
      slug: "ramps",
      commonName: "Ramps",
      scientificName: "Allium tricoccum",
      category: "Plant",
      image: "ramps.svg",
      habitat:
        "Rich, moist deciduous forest floors; often on north-facing slopes with deep leaf litter.",
      season: "Early spring; leaves fade before or during summer.",
      associatedPlants: [
        "Trillium",
        "Bloodroot",
        "Trout lily",
        "Sugar maple / beech canopy"
      ],
      identificationTips: [
        "Two or three broad smooth leaves emerging from a reddish sheath",
        "Strong onion-garlic odor when crushed",
        "Bulb white and oval, often with reddish stem base"
      ],
      lookalikes: [
        "Lily-of-the-valley — no onion odor; toxic",
        "False hellebore — pleated leaves, no onion odor",
        "Young trout lily — often mottled leaves"
      ],
      range:
        "Appalachians and eastern hardwood forests; locally common where habitat is intact.",
      beginnerNotes:
        "Smell is the key field test. Harvest sustainably — take leaves only or a few bulbs from large colonies."
    },
    {
      slug: "blueberry",
      commonName: "Blueberry",
      scientificName: "Vaccinium spp.",
      category: "Plant",
      image: "blueberry.svg",
      habitat:
        "Acidic soils in open woods, barrens, and old fields; full sun to partial shade.",
      season: "Mid- to late summer for fruit; flowers in spring.",
      associatedPlants: [
        "Lowbush and highbush forms",
        "Sweet fern",
        "Pine and oak barrens",
        "Heath family associates"
      ],
      identificationTips: [
        "Shrub with alternate, fine-toothed oval leaves",
        "Bell-shaped white to pink flowers in spring",
        "Blue berries with crown scar; green flesh inside"
      ],
      lookalikes: [
        "Huckleberry — darker berries, different seed pattern",
        "Unripe or other blue-fruited shrubs — check leaf and flower structure"
      ],
      range:
        "Widespread in eastern North America; wild lowbush common in Northeast barrens and openings.",
      beginnerNotes:
        "One of the safest beginner harvests when fruit is clearly ripe and on a confirmed Vaccinium shrub."
    }
  ];

  var bySlug = {};
  SPECIES.forEach(function (entry) {
    bySlug[entry.slug] = entry;
  });

  window.ForageCastSpecies = {
    all: SPECIES,
    imageBase: IMAGE_BASE,
    imageDisclaimer: IMAGE_DISCLAIMER,
    imageUrl: function (species) {
      if (!species || !species.image) return "";
      return IMAGE_BASE + species.image;
    },
    get: function (slug) {
      return bySlug[slug] || null;
    }
  };
})();
