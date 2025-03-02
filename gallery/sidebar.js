module.exports = [
  {
    // This section has no header and so all page links are shown directly in the sidebar
    category: "concepts",
    pages: ["home"],
  },

  {
    category: "lovelace",
    // Label for in the sidebar
    header: "Lovelace",
    // Specify order of pages. Any pages in the category folder but not listed here will
    // automatically be added after the pages listed here.
    pages: ["introduction"],
  },
  {
    category: "automation",
    header: "Automation",
    pages: [
      "editor-trigger",
      "editor-condition",
      "editor-action",
      "selectors",
      "trace",
      "trace-timeline",
    ],
  },
  {
    category: "components",
    header: "Components",
  },
  {
    category: "more-info",
    header: "More Info dialogs",
  },
  {
    category: "misc",
    header: "Miscelaneous",
  },
  {
    category: "user-test",
    header: "User Tests",
  },
  {
    category: "design.home-assistant.io",
    header: "Design Documentation",
  },
];
