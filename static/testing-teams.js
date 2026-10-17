/**
 * Common Treatments — on home, always normal document flow (no pin).
 * Expand rows so the table reads like a standard scrolling section.
 */
(function () {
  var section = document.getElementById("test-teams-scroll");
  var pin = document.getElementById("test-teams-pin");
  var introWrap = document.getElementById("test-teams-intro-wrap");
  var rows = Array.prototype.slice.call(document.querySelectorAll(".test-teams-row"));
  var list = document.getElementById("test-teams-list");

  if (!section || !pin || !rows.length) {
    return;
  }

  function applyStaticFlow() {
    document.documentElement.classList.add("test-teams-static");
    section.setAttribute("aria-hidden", "false");
    if (introWrap) {
      introWrap.style.opacity = "1";
    }
    rows.forEach(function (row) {
      row.classList.add("is-expanded");
    });
    if (list) {
      list.style.transform = "";
    }
  }

  // Home merged scroll: treatments are after the pin — never pin this section.
  if (window.__HOME_MERGED_SCROLL || section.classList.contains("test-teams-page--flow")) {
    applyStaticFlow();
    return;
  }
})();
