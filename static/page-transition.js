(function () {
  var overlay = document.getElementById("page-transition");
  if (!overlay) {
    return;
  }

  var STORAGE_KEY = "psokrates-page-transition";
  var LOOP_SEC = 2;
  var FADE_MS = 380;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var QUOTES = [
    "The unexamined life is not worth living.",
    "The only true wisdom is in knowing you know nothing.",
    "Wonder is the beginning of wisdom.",
    "I cannot teach anybody anything. I can only make them think.",
    "There is only one good, knowledge, and one evil, ignorance.",
    "Be as you wish to seem.",
    "Let him who would move the world first move himself.",
    "To find yourself, think for yourself.",
    "True knowledge exists in knowing that you know nothing.",
    "Not life, but good life, is to be chiefly valued.",
    "He is richest who is content with the least.",
    "An honest man is always a child.",
    "Wisdom begins in wonder.",
    "Employ your time in improving yourself by other men's writings.",
    "The greatest blessing granted to mankind comes by way of words."
  ];

  var LOTTIE_PATHS = [
    overlay.getAttribute("data-lottie-a"),
    overlay.getAttribute("data-lottie-b")
  ].filter(Boolean);

  var lottieEl = document.getElementById("page-transition-lottie");
  var quoteWrap = overlay.querySelector(".page-transition-quote");
  var quoteEl = overlay.querySelector(".page-transition-quote-text");
  var anim = null;
  var navigating = false;
  var loopsDone = 0;
  var pageReady = false;
  var pendingUrl = "";
  var loopTimer = 0;
  var loopStartedAt = 0;

  function pageKey(url) {
    var path = url.pathname.replace(/\/index\.html?$/i, "/").replace(/\.html?$/i, "");
    if (path.length > 1 && path.charAt(path.length - 1) === "/") {
      path = path.slice(0, -1);
    }
    return path + url.search;
  }

  function readState() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeState(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      /* ignore quota / private mode */
    }
  }

  function clearState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  function randomIndex(length, avoid) {
    if (length <= 1) {
      return 0;
    }
    var index = Math.floor(Math.random() * length);
    if (index === avoid) {
      index = (index + 1) % length;
    }
    return index;
  }

  function pickState(existing) {
    if (existing && typeof existing.anim === "number" && typeof existing.quote === "number") {
      return existing;
    }
    var last = readState() || {};
    return {
      anim: randomIndex(LOTTIE_PATHS.length, last.anim),
      quote: randomIndex(QUOTES.length, last.quote),
      t: Date.now()
    };
  }

  function destroyAnim() {
    if (loopTimer) {
      window.clearTimeout(loopTimer);
      loopTimer = 0;
    }
    if (anim) {
      try {
        anim.destroy();
      } catch (err) {
        /* ignore */
      }
      anim = null;
    }
    if (lottieEl) {
      lottieEl.innerHTML = "";
    }
  }

  function markLoopDone() {
    if (loopsDone >= 1) {
      maybeFinish();
      return;
    }
    loopsDone = 1;
    var state = readState();
    if (state) {
      state.loopDone = true;
      writeState(state);
    }
    maybeFinish();
  }

  function squeezeToLoop(animation) {
    var frames = animation.totalFrames || 1;
    var fps = animation.frameRate || 30;
    var natural = frames / fps;
    if (natural > 0) {
      animation.setSpeed(natural / LOOP_SEC);
    }
  }

  function playLottie(index) {
    if (!lottieEl || typeof lottie === "undefined") {
      return;
    }
    var path = LOTTIE_PATHS[index] || LOTTIE_PATHS[0];
    if (!path) {
      return;
    }
    destroyAnim();
    loopsDone = 0;
    loopStartedAt = 0;
    var isCycle = /cycle\.json(?:\?|$)/.test(path);
    var isAnime = /anime\.json(?:\?|$)/.test(path);
    if (lottieEl) {
      lottieEl.classList.toggle("is-cycle", isCycle);
      lottieEl.classList.toggle("is-anime", isAnime);
    }
    anim = lottie.loadAnimation({
      container: lottieEl,
      renderer: "svg",
      loop: true,
      autoplay: false,
      path: path
    });
    anim.addEventListener("DOMLoaded", function () {
      var svg = lottieEl.querySelector("svg");
      if (svg) {
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      }
      squeezeToLoop(anim);
      loopStartedAt = Date.now();
      if (!reduced) {
        anim.goToAndPlay(0, true);
      }
      loopTimer = window.setTimeout(markLoopDone, LOOP_SEC * 1000 + 80);
    });
    anim.addEventListener("loopComplete", function () {
      if (!loopStartedAt || Date.now() - loopStartedAt < LOOP_SEC * 1000 - 120) {
        return;
      }
      markLoopDone();
    });
  }

  function showOverlay(state) {
    if (quoteEl) {
      quoteEl.textContent = "“" + QUOTES[state.quote] + "”";
    }
    if (quoteWrap) {
      quoteWrap.classList.remove("is-in");
      void quoteWrap.offsetWidth;
      quoteWrap.classList.add("is-in");
    }
    overlay.classList.remove("is-leaving");
    overlay.classList.add("is-on");
    overlay.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("is-page-transitioning");
    playLottie(state.anim);
  }

  function hideOverlay() {
    overlay.classList.add("is-leaving");
    overlay.classList.remove("is-on");
    overlay.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("is-page-transitioning");
    if (quoteWrap) {
      quoteWrap.classList.remove("is-in");
    }
    pendingUrl = "";
    pageReady = false;
    clearState();
    window.setTimeout(destroyAnim, FADE_MS);
  }

  function maybeFinish() {
    if (pendingUrl && loopsDone >= 1) {
      var url = pendingUrl;
      pendingUrl = "";
      goTo(url);
      return;
    }
    if (!pendingUrl && pageReady && loopsDone >= 1) {
      hideOverlay();
    }
  }

  function isInternalNav(anchor) {
    if (!anchor) {
      return false;
    }
    if (anchor.target && anchor.target !== "_self") {
      return false;
    }
    if (anchor.hasAttribute("download")) {
      return false;
    }
    var href = anchor.getAttribute("href");
    if (!href || href.charAt(0) === "#") {
      return false;
    }
    var lowered = href.trim().toLowerCase();
    if (
      lowered.indexOf("javascript:") === 0 ||
      lowered.indexOf("mailto:") === 0 ||
      lowered.indexOf("tel:") === 0
    ) {
      return false;
    }
    var next;
    try {
      next = new URL(anchor.href, window.location.href);
    } catch (err) {
      return false;
    }
    if (next.origin !== window.location.origin) {
      return false;
    }
    if (pageKey(next) === pageKey(window.location)) {
      return false;
    }
    return true;
  }

  function goTo(url) {
    window.location.href = url;
  }

  document.addEventListener(
    "click",
    function (event) {
      if (event.defaultPrevented || navigating) {
        return;
      }
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (reduced) {
        return;
      }
      var anchor = event.target.closest && event.target.closest("a[href]");
      if (!isInternalNav(anchor)) {
        return;
      }
      event.preventDefault();
      navigating = true;
      pageReady = false;
      pendingUrl = anchor.href;
      var state = pickState(null);
      state.t = Date.now();
      state.loopDone = false;
      writeState(state);
      showOverlay(state);
    },
    true
  );

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      navigating = false;
      hideOverlay();
    }
  });

  var arriving = readState();
  if (arriving && !reduced) {
    arriving.t = arriving.t || Date.now();
    pendingUrl = "";
    pageReady = document.readyState === "complete";
    showOverlay(arriving);
    if (arriving.loopDone) {
      loopsDone = 1;
    }
    function onArriveReady() {
      pageReady = true;
      maybeFinish();
    }
    if (pageReady) {
      onArriveReady();
    } else {
      window.addEventListener("load", onArriveReady, { once: true });
    }
  } else if (arriving && reduced) {
    clearState();
    document.documentElement.classList.remove("is-page-transitioning");
  }
})();
