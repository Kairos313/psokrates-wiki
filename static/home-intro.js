/**
 * 1) Scale each Figma artboard so x/y/size stay correct on every screen.
 * 2) Hold intro 1, then fade 1 → 2 → 3.
 */
(function () {
  var NAV_HEIGHT = 64;
  var pin = document.querySelector(".home-intro-pin");
  var boards = document.querySelectorAll(".home-intro-board");
  var figma = document.querySelector(".home-figma");
  var slot = document.querySelector(".home-figma-slot");
  var scenes = pin ? pin.querySelectorAll(".home-intro-scene") : [];
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function fitFigma() {
    var vw = window.innerWidth;
    var availableH = Math.max(window.innerHeight - NAV_HEIGHT, 1);
    var introScale = Math.min(vw / 1440, availableH / 766);

    for (var i = 0; i < boards.length; i++) {
      boards[i].style.transform =
        "translate(-50%, -50%) scale(" + introScale + ")";
    }

    if (figma && slot) {
      var pageScale = vw / 1440;
      figma.style.transform = "scale(" + pageScale + ")";
      slot.style.height = 12140 * pageScale + "px";
    }
  }

  fitFigma();
  window.addEventListener("resize", fitFigma);

  if (!pin || scenes.length < 3) {
    return;
  }

  if (reduced) {
    pin.classList.add("home-intro-pin--static");
    return;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setFade() {
    var rect = pin.getBoundingClientRect();
    var startTop = NAV_HEIGHT;
    var endTop = window.innerHeight - pin.offsetHeight;
    var range = startTop - endTop;
    if (range <= 0) {
      return;
    }

    var progress = clamp((startTop - rect.top) / range, 0, 1);
    var scene1;
    var scene2;
    var scene3;

    if (progress < 0.2) {
      scene1 = 1;
      scene2 = 0;
      scene3 = 0;
    } else if (progress < 0.45) {
      var fade12 = (progress - 0.2) / 0.25;
      scene1 = 1 - fade12;
      scene2 = fade12;
      scene3 = 0;
    } else if (progress < 0.55) {
      scene1 = 0;
      scene2 = 1;
      scene3 = 0;
    } else if (progress < 0.8) {
      var fade23 = (progress - 0.55) / 0.25;
      scene1 = 0;
      scene2 = 1 - fade23;
      scene3 = fade23;
    } else {
      scene1 = 0;
      scene2 = 0;
      scene3 = 1;
    }

    scenes[0].style.opacity = String(scene1);
    scenes[1].style.opacity = String(scene2);
    scenes[2].style.opacity = String(scene3);
  }

  window.addEventListener("scroll", setFade, { passive: true });
  window.addEventListener("resize", setFade);
  setFade();
})();
