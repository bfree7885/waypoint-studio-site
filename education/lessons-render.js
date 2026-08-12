(function () {
  "use strict";

  var registry = window.WaypointLessons;

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function lessonHref(context, currentCategory, slug) {
    if (!registry) return "#";
    var lesson = registry.get(slug);
    if (!lesson) return "#";

    if (context === "hub") {
      return lesson.category + "/" + lesson.slug + "/";
    }
    if (context === "category") {
      if (currentCategory === lesson.category) return lesson.slug + "/";
      return "../" + lesson.category + "/" + lesson.slug + "/";
    }
    if (context === "lesson") {
      if (currentCategory === lesson.category) return "../" + lesson.slug + "/";
      return "../../" + lesson.category + "/" + lesson.slug + "/";
    }
    return lesson.category + "/" + lesson.slug + "/";
  }

  function renderSubnav(active, depth) {
    depth = depth || 0;
    var sections = [
      { key: "hub", label: "Overview" },
      { key: "species", label: "Species" },
      { key: "skills", label: "Skills" },
      { key: "ecosystems", label: "Ecosystems" },
      { key: "safety", label: "Safety" }
    ];

    return (
      '<nav class="edu-subnav" aria-label="Education sections">' +
      sections
        .map(function (item) {
          var href;
          if (depth === 0) {
            href = item.key === "hub" ? "./" : item.key + "/";
          } else if (depth === 1) {
            href = item.key === "hub" ? "../" : "../" + item.key + "/";
            if (item.key === active) href = "./";
          } else {
            href = item.key === "hub" ? "../../" : "../../" + item.key + "/";
            if (item.key === active) href = "../";
          }
          var current = item.key === active ? ' aria-current="page"' : "";
          return (
            '<a href="' +
            escapeHtml(href) +
            '"' +
            current +
            ">" +
            escapeHtml(item.label) +
            "</a>"
          );
        })
        .join("") +
      "</nav>"
    );
  }

  function renderList(items, emptyText) {
    if (!items || !items.length) {
      return '<p class="muted">' + escapeHtml(emptyText || "None listed.") + "</p>";
    }
    return (
      "<ul class=\"edu-lesson-list\">" +
      items
        .map(function (item) {
          return "<li>" + escapeHtml(item) + "</li>";
        })
        .join("") +
      "</ul>"
    );
  }

  function renderSections(sections) {
    return (sections || [])
      .map(function (section) {
        return (
          '<section class="edu-lesson-section">' +
          "<h2>" +
          escapeHtml(section.heading) +
          "</h2>" +
          (section.paragraphs || [])
            .map(function (p) {
              return "<p>" + escapeHtml(p) + "</p>";
            })
            .join("") +
          "</section>"
        );
      })
      .join("");
  }

  function renderRelated(context, currentCategory, slugs) {
    if (!slugs || !slugs.length) return "";
    var cards = slugs
      .map(function (slug) {
        var lesson = registry.get(slug);
        if (!lesson) return "";
        var cat = registry.categories[lesson.category];
        return (
          '<a class="edu-related-card" href="' +
          escapeHtml(lessonHref(context, currentCategory, slug)) +
          '">' +
          '<div class="edu-related-card-top">' +
          '<span class="edu-level-badge edu-level-badge--' +
          escapeHtml(lesson.level) +
          '">' +
          escapeHtml(lesson.level) +
          "</span>" +
          '<span class="edu-category-tag">' +
          escapeHtml(cat ? cat.label : lesson.category) +
          "</span>" +
          "</div>" +
          "<h3>" +
          escapeHtml(lesson.title) +
          "</h3>" +
          "</a>"
        );
      })
      .join("");

    return (
      '<section class="edu-related-section">' +
      "<h2>Related lessons</h2>" +
      '<div class="edu-related-grid">' +
      cards +
      "</div></section>"
    );
  }

  function renderLessonCard(lesson, context, currentCategory) {
    var cat = registry.categories[lesson.category];
    return (
      '<article class="edu-lesson-card edu-lesson-card--' +
      escapeHtml(lesson.category) +
      '">' +
      '<div class="edu-lesson-card-accent" aria-hidden="true"></div>' +
      '<a class="edu-lesson-card-link" href="' +
      escapeHtml(lessonHref(context, currentCategory, lesson.slug)) +
      '">' +
      '<div class="edu-lesson-card-top">' +
      '<span class="edu-level-badge edu-level-badge--' +
      escapeHtml(lesson.level) +
      '">Level ' +
      escapeHtml(lesson.level) +
      "</span>" +
      '<span class="edu-category-tag">' +
      escapeHtml(cat ? cat.label : lesson.category) +
      "</span>" +
      "</div>" +
      '<div class="edu-lesson-card-body">' +
      "<h2>" +
      escapeHtml(lesson.title) +
      "</h2>" +
      '<p class="edu-lesson-card-summary">' +
      escapeHtml(lesson.summary) +
      "</p>" +
      "</div>" +
      '<div class="edu-lesson-card-foot">' +
      escapeHtml(lesson.readingTime) +
      " read" +
      "</div>" +
      "</a></article>"
    );
  }

  function renderHub(grid) {
    if (!registry) return;
    var subnav = document.getElementById("edu-subnav");
    if (subnav) subnav.innerHTML = renderSubnav("hub", 0);

    grid.innerHTML = registry.all
      .map(function (lesson) {
        return renderLessonCard(lesson, "hub", null);
      })
      .join("");
  }

  function renderCategory(category, grid) {
    if (!registry) return;
    var cat = registry.categories[category];
    var subnav = document.getElementById("edu-subnav");
    if (subnav) subnav.innerHTML = renderSubnav(category, 1);

    var lessons = registry.byCategory(category);
    if (!lessons.length) {
      grid.innerHTML = '<p class="muted">Lessons coming soon.</p>';
      return;
    }

    grid.innerHTML = lessons
      .map(function (lesson) {
        return renderLessonCard(lesson, "category", category);
      })
      .join("");

    if (cat) {
      document.title = cat.label + " Lessons | Waypoint Education";
    }
  }

  function renderLesson(slug, container) {
    if (!registry) return;
    var lesson = registry.get(slug);
    if (!lesson) {
      container.innerHTML =
        '<section class="edu-lesson-empty">' +
        "<h1>Lesson not found</h1>" +
        '<p class="muted">That lesson is not in the catalog yet.</p>' +
        '<a class="btn-secondary" href="../">Back to overview</a></section>';
      return;
    }

    var cat = registry.categories[lesson.category];
    var subnav = document.getElementById("edu-subnav");
    if (subnav) subnav.innerHTML = renderSubnav(lesson.category, 2);

    document.title = lesson.title + " | Waypoint Education";

    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", lesson.summary);
    }

    container.innerHTML =
      '<article class="edu-lesson">' +
      '<header class="edu-lesson-hero">' +
      '<p class="edu-lesson-breadcrumb muted">' +
      '<a href="../">' +
      escapeHtml(cat ? cat.label : lesson.category) +
      "</a> · " +
      escapeHtml(lesson.title) +
      "</p>" +
      '<div class="edu-lesson-meta-row">' +
      '<span class="edu-level-badge edu-level-badge--' +
      escapeHtml(lesson.level) +
      '">Level ' +
      escapeHtml(lesson.level) +
      "</span>" +
      '<span class="edu-category-tag">' +
      escapeHtml(cat ? cat.label : lesson.category) +
      "</span>" +
      '<span class="edu-reading-time">' +
      escapeHtml(lesson.readingTime) +
      " read</span>" +
      "</div>" +
      "<h1>" +
      escapeHtml(lesson.title) +
      "</h1>" +
      '<p class="edu-lesson-lead">' +
      escapeHtml(lesson.summary) +
      "</p>" +
      "</header>" +
      '<div class="edu-lesson-layout">' +
      '<div class="edu-lesson-main">' +
      renderSections(lesson.sections) +
      "</div>" +
      '<aside class="edu-lesson-sidebar">' +
      '<section class="edu-aside-block edu-aside-block--tips">' +
      "<h2>Field tips</h2>" +
      renderList(lesson.fieldTips) +
      "</section>" +
      '<section class="edu-aside-block edu-aside-block--mistakes">' +
      "<h2>Common mistakes</h2>" +
      renderList(lesson.commonMistakes) +
      "</section>" +
      "</aside>" +
      "</div>" +
      renderRelated("lesson", lesson.category, lesson.relatedLessons) +
      '<footer class="edu-lesson-foot">' +
      '<p class="global-disclaimer muted">Educational content only — not a substitute for expert identification, legal advice, or land-access permission.</p>' +
      '<div class="edu-lesson-foot-actions">' +
      '<a class="btn-secondary" href="../">All ' +
      escapeHtml(cat ? cat.label.toLowerCase() : "lessons") +
      " lessons</a>" +
      '<a class="btn-secondary" href="../../">Education overview</a>' +
      "</div>" +
      "</footer></article>";
  }

  function init() {
    var hubGrid = document.getElementById("edu-lesson-grid");
    if (hubGrid && document.body.getAttribute("data-edu-page") === "hub") {
      renderHub(hubGrid);
      return;
    }

    var categoryGrid = document.getElementById("edu-category-grid");
    var category = document.body.getAttribute("data-edu-category");
    if (categoryGrid && category) {
      renderCategory(category, categoryGrid);
      return;
    }

    var lessonRoot = document.getElementById("edu-lesson");
    var lessonSlug = document.body.getAttribute("data-lesson");
    if (lessonRoot && lessonSlug) {
      renderLesson(lessonSlug, lessonRoot);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
