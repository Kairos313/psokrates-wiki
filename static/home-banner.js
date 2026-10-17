(function () {
  var stage = document.getElementById("home-banner-lottie");
  var block = document.querySelector(".home-banner-block");

  if (!stage) {
    return;
  }

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var path = stage.getAttribute("data-lottie");
  var started = false;

  function syncBannerHeight() {
    if (!block) {
      return;
    }
    block.style.height = window.innerHeight + "px";
  }

  function overlayIsOn() {
    return document.documentElement.classList.contains("is-page-transitioning");
  }

  function showFallback() {
    if (!block || block.querySelector(".home-banner-fallback")) {
      return;
    }
    var note = document.createElement("p");
    note.className = "home-banner-fallback";
    note.textContent = "Banner animation not found. Add static/images/home/hero.json.";
    block.appendChild(note);
  }

  if (typeof lottie === "undefined" || !path) {
    showFallback();
    syncBannerHeight();
    window.addEventListener("resize", syncBannerHeight);
    return;
  }

  var anim = lottie.loadAnimation({
    container: stage,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: path
  });

  function playOnce() {
    if (started || prefersReducedMotion || overlayIsOn()) {
      return;
    }
    started = true;
    anim.goToAndPlay(0, true);
  }

  function startWhenReady() {
    if (prefersReducedMotion) {
      anim.goToAndStop(anim.totalFrames > 1 ? anim.totalFrames - 1 : 0, true);
      return;
    }
    if (!overlayIsOn()) {
      playOnce();
      return;
    }
    var html = document.documentElement;
    var observer = new MutationObserver(function () {
      if (!overlayIsOn()) {
        observer.disconnect();
        playOnce();
      }
    });
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
  }

  anim.addEventListener("DOMLoaded", function () {
    var svg = stage.querySelector("svg");
    if (svg) {
      svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    }
    startWhenReady();
  });

  anim.addEventListener("data_failed", showFallback);

  syncBannerHeight();
  window.addEventListener("resize", syncBannerHeight);
})();

(function () {
  var stage = document.getElementById("fg-balance");
  if (!stage || typeof lottie === "undefined") {
    return;
  }

  var path = stage.getAttribute("data-lottie");
  if (!path) {
    return;
  }

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var anim = lottie.loadAnimation({
    container: stage,
    renderer: "svg",
    loop: !prefersReducedMotion,
    autoplay: !prefersReducedMotion,
    path: path
  });

  anim.addEventListener("DOMLoaded", function () {
    var svg = stage.querySelector("svg");
    if (svg) {
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }
    if (prefersReducedMotion) {
      anim.goToAndStop(0, true);
    }
  });
})();
