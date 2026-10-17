/**
 * home_scrolltrigger.js
 * One pin for: reveal → History → typewriter → Socrates.
 * Treatment bridge + Common Treatments scroll normally after the pin (no pin).
 */
(function () {
  var section = document.getElementById("test-heritage-scroll");
  var pin = document.getElementById("test-heritage-pin");
  if (!section || !pin || !pin.classList.contains("home-merged-pin")) {
    return;
  }

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  var blank = document.getElementById("home-psoriasis-blank");
  var reveal = document.getElementById("psoriasis-reveal");
  var heritagePanel = document.getElementById("test-heritage-panel");
  var heritageBg = document.getElementById("test-heritage-bg");
  var colorWipe = document.getElementById("test-heritage-color-wipe");
  var intro = document.getElementById("test-heritage-intro");
  var typeWrap = document.getElementById("test-heritage-type-wrap");
  var typeLines = typeWrap
    ? Array.prototype.slice.call(typeWrap.querySelectorAll(".test-heritage-type-line"))
    : [];
  var socratesLayer = document.getElementById("home-socrates-scroll");
  var socratesCanvasEl = document.getElementById("home-socrates-canvas");
  var socratesHintEl = document.getElementById("home-socrates-hint");
  var socratesOverlay = document.getElementById("home-socrates-overlay");
  var socratesVoicesHeading = document.getElementById("home-socrates-voices-heading");
  var socratesVoicesHeadingWords = socratesVoicesHeading
    ? Array.prototype.slice.call(
        socratesVoicesHeading.querySelectorAll(".home-socrates-voices-heading__word")
      )
    : [];
  var socratesVoices = Array.prototype.slice.call(
    document.querySelectorAll(".home-socrates-voice")
  );
  var treatmentTransition = document.getElementById("home-socrates-treatment-transition");
  var treatmentTransitionLines = Array.prototype.slice.call(
    document.querySelectorAll(".home-socrates-transition-line")
  );
  var treatmentTransitionBeam = document.querySelector(".home-socrates-transition-beam");

  var teamsLayer = document.getElementById("test-teams-scroll");
  var teamsPin = document.getElementById("test-teams-pin");
  var teamsIntroWrap = document.getElementById("test-teams-intro-wrap");
  var teamsList = document.getElementById("test-teams-list");
  var teamsRows = Array.prototype.slice.call(document.querySelectorAll(".test-teams-row"));
  var teamsColorWipe = document.getElementById("test-teams-color-wipe");

  var DESKTOP_MIN = 1024;
  var desktopQuery = window.matchMedia("(min-width: " + DESKTOP_MIN + "px)");
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var scrollTimeline = null;
  var socratesPreloaded = false;
  var balancePreloaded = false;
  var socratesViewer = null;
  var socratesInitialized = false;

  var socratesConfig = window.HOME_SOCRATES_CONFIG || {};
  var socratesUrl = socratesConfig.socratesUrl || "/static/testing/3D_socrates";
  var socratesBlend =
    typeof socratesConfig.canvasBlendOpacity === "number"
      ? socratesConfig.canvasBlendOpacity
      : 1;
  var materialBlendStrength =
    typeof socratesConfig.materialBlendStrength === "number"
      ? socratesConfig.materialBlendStrength
      : 0;
  var whiteStatue = socratesConfig.whiteStatue !== false;
  var socratesBg = socratesConfig.backgroundColor || "#ffffff";

  // ——— Typing intro (What is Psoriasis?) ———
  function initTypingScroll() {
    var story = document.getElementById("home-psoriasis-scroll");
    if (!story || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      return;
    }
    var lead = document.getElementById("home-psoriasis-lead");
    var rows = Array.prototype.slice.call(story.querySelectorAll(".home-psoriasis-row"));
    var targets = [lead].concat(rows).filter(Boolean);
    if (!targets.length) {
      return;
    }
    var typeDesktop = window.matchMedia("(min-width: 768px)");
    var typed = {};

    function wrapChars(el) {
      if (!el || el.dataset.charsWrapped === "1") return;
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      var textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach(function (node) {
        var text = node.textContent;
        if (!text) return;
        var frag = document.createDocumentFragment();
        text.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            return;
          }
          var word = document.createElement("span");
          word.className = "home-psoriasis-word";
          for (var i = 0; i < part.length; i++) {
            var span = document.createElement("span");
            span.className = "home-psoriasis-char";
            span.textContent = part.charAt(i);
            word.appendChild(span);
          }
          frag.appendChild(word);
        });
        node.parentNode.replaceChild(frag, node);
      });
      el.dataset.charsWrapped = "1";
    }

    function charsOf(el) {
      return el ? el.querySelectorAll(".home-psoriasis-char") : [];
    }

    function typeOut(el) {
      var key = el.id || el.textContent;
      if (typed[key]) return;
      typed[key] = true;
      var chars = charsOf(el);
      if (!chars.length) {
        el.classList.add("is-typed");
        return;
      }
      gsap.set(chars, { opacity: 0 });
      gsap.to(chars, {
        opacity: 1,
        duration: 0.02,
        stagger: 0.032,
        ease: "none",
        onComplete: function () {
          el.classList.add("is-typed");
        },
      });
    }

    targets.forEach(wrapChars);
    if (!typeDesktop.matches || prefersReducedMotion) {
      targets.forEach(function (el) {
        gsap.set(charsOf(el), { opacity: 1 });
        el.classList.add("is-typed");
      });
      story.classList.add("home-psoriasis-story--revealed");
      return;
    }

    targets.forEach(function (el) {
      gsap.set(charsOf(el), { opacity: 0 });
      ScrollTrigger.create({
        trigger: el,
        start: "top 82%",
        once: true,
        onEnter: function () {
          typeOut(el);
        },
      });
    });
  }


  // ——— Tunable pin lengths (viewport heights) ———
  // Lower MERGED_SOCRATES_VH if you still scroll while Socrates is frozen.
  var MERGED_HISTORY_VH = 4.2; // reveal → History → typewriter
  var MERGED_SOCRATES_VH = 4.0; // 3D Socrates spiral + voices
  var MERGED_SCROLL_VIEWPORTS = MERGED_HISTORY_VH + MERGED_SOCRATES_VH;

  // Heritage fraction of the whole pin
  var HERITAGE_BUDGET = MERGED_HISTORY_VH / MERGED_SCROLL_VIEWPORTS;

  // Scale old heritage 0→1 times into the History content window.
  function ht(t) {
    return t * HERITAGE_BUDGET;
  }

  var bridgeEnd = ht(0.08);
  // Short beat on the hover-reveal, then natural scroll into History
  var historySlideStart = 0.05 / MERGED_SCROLL_VIEWPORTS;
  var historySlideDur = 0.55 / MERGED_SCROLL_VIEWPORTS;
  var introFadeEnd = ht(0.08);
  var introFadeStart = historySlideStart + historySlideDur + ht(0.02);
  var typeStart = introFadeStart + introFadeEnd * 0.5;
  var typeDuration = ht(0.48);
  var closingStart = typeStart + typeDuration;

  // History → Patients' Voices: start as soon as typewriter ends (no dead scroll)
  var socratesSlideDur = 0.55 / MERGED_SCROLL_VIEWPORTS;
  var socratesSlideStart = closingStart + 0.008;
  var SOCRATES_START = socratesSlideStart + socratesSlideDur;
  var closingFadeOutStart = socratesSlideStart;
  var closingFadeOutDur = socratesSlideDur;

  window.__HOME_MERGED_SOCRATES_START = SOCRATES_START;
  // Treatments are outside the pin — sidebar uses #test-teams-scroll offset.
  window.__HOME_MERGED_TREATMENTS_START = null;

  // Socrates fills the rest of the pin; pack beats to the end so pin releases
  // as soon as spiral/voices finish (no frozen dead scroll).
  var S_SPAN = 1 - SOCRATES_START;
  var ENTRANCE_HELIX = 0.38;
  var VOICE_START = SOCRATES_START + 0.08 * S_SPAN;
  var VOICE_END = SOCRATES_START + 0.9 * S_SPAN;
  var EXIT_START = SOCRATES_START + 0.95 * S_SPAN;
  var EXIT_DURATION = 1 - EXIT_START;
  // Heading appears during History→Socrates scroll, fades once Socrates is pinned
  var HEADING_IN = socratesSlideStart;
  var HEADING_OUT = SOCRATES_START;
  var HEADING_FADE_DUR = Math.min(socratesSlideDur * 0.45, 0.04);
  var SPIRAL_START = SOCRATES_START;

  // Kept for unused teams helpers below (treatments no longer run inside this pin).
  var TREATMENTS_START = 1;
  var T_SPAN = 0.0001;
  var teamsInFlow =
    !!(teamsLayer && teamsLayer.classList.contains("test-teams-page--flow"));


  // ——— 3D book helpers ———
  var bookConfig = window.TEST_HERITAGE_CONFIG || {};
  var bookUrl = bookConfig.bookUrl || "/static/testing/3D_book";
  var bookBlendOpacity =
    typeof bookConfig.bookBlendOpacity === "number" ? bookConfig.bookBlendOpacity : 1;
  var bookDimOpacity =
    typeof bookConfig.bookDimOpacity === "number" ? bookConfig.bookDimOpacity : 0.15;
  var bookCanvas = document.getElementById("test-heritage-book-canvas");
  var bookDim = document.querySelector(".test-heritage-bg-dim");
  var bookModel = null;
  var bookRenderer = null;
  var bookScene = null;
  var bookCamera = null;
  var spinActive = false;
  var sectionVisible = true;
  var bookInitialized = false;
  var lastSpinTime = 0;
  var SPIN_INTERVAL_MS = 33;

  function wrapTypeChars(el) {
    if (!el || el.dataset.charsWrapped === "1") {
      return;
    }
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }
    textNodes.forEach(function (node) {
      var text = node.textContent;
      if (!text) {
        return;
      }
      var frag = document.createDocumentFragment();
      text.split(/(\s+)/).forEach(function (part) {
        if (!part) {
          return;
        }
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
          return;
        }
        var word = document.createElement("span");
        word.className = "test-heritage-type-word";
        for (var i = 0; i < part.length; i++) {
          var span = document.createElement("span");
          span.className = "test-heritage-type-char";
          span.textContent = part.charAt(i);
          word.appendChild(span);
        }
        frag.appendChild(word);
      });
      node.parentNode.replaceChild(frag, node);
    });
    el.dataset.charsWrapped = "1";
  }

  function charsOfTypeLine(el) {
    return el ? el.querySelectorAll(".test-heritage-type-char") : [];
  }

  function prepareTypeLines() {
    typeLines.forEach(wrapTypeChars);
  }

  function applyBookBlend() {
    if (bookCanvas) {
      bookCanvas.style.opacity = String(bookBlendOpacity);
    }
    if (bookDim) {
      bookDim.style.opacity = String(bookDimOpacity);
    }
  }

  function fitModel(model) {
    var box = new THREE.Box3().setFromObject(model);
    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    var maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      model.scale.setScalar(1.35 / maxDim);
    }
  }

  function resizeBook() {
    if (!bookRenderer || !bookCamera || !bookCanvas || !bookCanvas.parentElement) {
      return;
    }
    var w = bookCanvas.parentElement.clientWidth;
    var h = bookCanvas.parentElement.clientHeight;
    bookRenderer.setSize(w, h, false);
    bookCamera.aspect = w / h;
    bookCamera.updateProjectionMatrix();
    if (bookModel) {
      bookRenderer.render(bookScene, bookCamera);
    }
  }

  function spinFrame(now) {
    if (!spinActive || !bookModel || !bookRenderer) {
      return;
    }
    if (now - lastSpinTime < SPIN_INTERVAL_MS) {
      requestAnimationFrame(spinFrame);
      return;
    }
    lastSpinTime = now;
    bookModel.rotation.y += 0.006;
    bookRenderer.render(bookScene, bookCamera);
    requestAnimationFrame(spinFrame);
  }

  function startBookSpin() {
    if (spinActive || prefersReducedMotion || document.hidden || !sectionVisible) {
      if (bookModel && bookRenderer) {
        bookRenderer.render(bookScene, bookCamera);
      }
      return;
    }
    spinActive = true;
    spinFrame();
  }

  function stopBookSpin() {
    spinActive = false;
  }

  function initBook() {
    if (!bookCanvas || typeof THREE === "undefined") {
      return;
    }
    applyBookBlend();
    bookScene = new THREE.Scene();
    bookCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    bookCamera.position.set(0, 0.15, 4.2);
    bookRenderer = new THREE.WebGLRenderer({
      canvas: bookCanvas,
      antialias: false,
      alpha: true,
    });
    bookRenderer.setClearColor(0x000000, 0);
    bookRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    bookScene.add(new THREE.AmbientLight(0xffffff, 1.15));
    bookScene.add(new THREE.HemisphereLight(0xffffff, 0x6a6a6a, 0.55));
    var key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(2, 4, 5);
    bookScene.add(key);
    var fill = new THREE.DirectionalLight(0xf5ede0, 0.75);
    fill.position.set(-3, 1, 3);
    bookScene.add(fill);
    var front = new THREE.DirectionalLight(0xfff8f0, 0.95);
    front.position.set(0, 0.5, 6);
    bookScene.add(front);
    var loader = new THREE.GLTFLoader();
    loader.load(
      bookUrl,
      function (gltf) {
        bookModel = gltf.scene;
        bookModel.traverse(function (child) {
          if (!child.isMesh || !child.material) {
            return;
          }
          var materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(function (material) {
            if (material.emissive) {
              material.emissive.setHex(0x111111);
            }
          });
        });
        fitModel(bookModel);
        bookScene.add(bookModel);
        resizeBook();
        startBookSpin();
      },
      undefined,
      function () {}
    );
  }

  function ensureBookInit() {
    if (bookInitialized) {
      resizeBook();
      return;
    }
    bookInitialized = true;
    initBook();
  }

  function resetVoiceLines() {
    socratesVoices.forEach(function (voice) {
      gsap.set(voice, { opacity: 0, y: 10 });
    });
    if (socratesVoicesHeadingWords.length) {
      gsap.set(socratesVoicesHeadingWords, {
        opacity: 0,
        x: function (i) {
          return i === 0 ? -36 : 36;
        },
        filter: "blur(8px)",
        letterSpacing: "0.28em",
        scale: 0.94,
      });
      socratesVoicesHeadingWords.forEach(function (word) {
        word.style.setProperty("--heading-rule", "0");
      });
    }
    if (socratesVoicesHeading) {
      socratesVoicesHeading.setAttribute("aria-hidden", "true");
    }
    if (socratesOverlay) {
      socratesOverlay.setAttribute("aria-hidden", "true");
    }
  }

  function addVoicesHeadingSequence(timeline) {
    if (!socratesVoicesHeadingWords.length) {
      return;
    }

    var left = socratesVoicesHeadingWords[0];
    var right = socratesVoicesHeadingWords[1];
    var headingWindow = Math.max(HEADING_OUT - HEADING_IN, 0.001);
    var inDur = Math.min(socratesSlideDur * 0.75, headingWindow * 0.85);
    var outDur = HEADING_FADE_DUR;
    var outAt = HEADING_OUT;

    timeline.call(
      function () {
        if (socratesVoicesHeading) {
          socratesVoicesHeading.setAttribute("aria-hidden", "false");
        }
        if (socratesOverlay) {
          socratesOverlay.setAttribute("aria-hidden", "false");
        }
      },
      null,
      HEADING_IN
    );

    if (left) {
      timeline.fromTo(
        left,
        {
          opacity: 0,
          x: -42,
          filter: "blur(10px)",
          letterSpacing: "0.32em",
          scale: 0.92,
        },
        {
          opacity: 1,
          x: 0,
          filter: "blur(0px)",
          letterSpacing: "-0.03em",
          scale: 1,
          duration: inDur,
          ease: "power3.out",
        },
        HEADING_IN
      );
    }

    if (right) {
      timeline.fromTo(
        right,
        {
          opacity: 0,
          x: 42,
          filter: "blur(10px)",
          letterSpacing: "0.32em",
          scale: 0.92,
        },
        {
          opacity: 1,
          x: 0,
          filter: "blur(0px)",
          letterSpacing: "-0.03em",
          scale: 1,
          duration: inDur,
          ease: "power3.out",
        },
        HEADING_IN + inDur * 0.18
      );
    }

    timeline.to(
      {},
      {
        duration: inDur,
        ease: "none",
        onUpdate: function () {
          var p = this.progress();
          socratesVoicesHeadingWords.forEach(function (word, i) {
            var local = Math.max(0, Math.min(1, (p - i * 0.18) / 0.82));
            word.style.setProperty("--heading-rule", String(local));
          });
        },
        onReverseComplete: function () {
          socratesVoicesHeadingWords.forEach(function (word) {
            word.style.setProperty("--heading-rule", "0");
          });
        },
      },
      HEADING_IN
    );

    timeline.to(
      socratesVoicesHeadingWords,
      {
        opacity: 0,
        x: function (i) {
          return i === 0 ? -28 : 28;
        },
        filter: "blur(7px)",
        letterSpacing: "0.18em",
        scale: 0.96,
        duration: outDur,
        stagger: outDur * 0.12,
        ease: "power2.in",
        onComplete: function () {
          if (socratesVoicesHeading) {
            socratesVoicesHeading.setAttribute("aria-hidden", "true");
          }
        },
        onReverseComplete: function () {
          if (socratesVoicesHeading) {
            socratesVoicesHeading.setAttribute("aria-hidden", "false");
          }
        },
      },
      outAt
    );

    timeline.to(
      {},
      {
        duration: outDur,
        ease: "none",
        onUpdate: function () {
          var p = 1 - this.progress();
          socratesVoicesHeadingWords.forEach(function (word) {
            word.style.setProperty("--heading-rule", String(p));
          });
        },
      },
      outAt
    );
  }

  function resetTreatmentTransition() {
    treatmentTransitionLines.forEach(function (line) {
      gsap.set(line, { opacity: 0, y: 16 });
    });
    if (treatmentTransitionBeam) {
      gsap.set(treatmentTransitionBeam, { opacity: 0 });
    }
    if (treatmentTransition) {
      treatmentTransition.setAttribute("aria-hidden", "true");
    }
  }

  function helixProgressFromTimeline(progress) {
    // Hold front-facing zoom while the heading is up — no spiral yet
    if (progress <= SPIRAL_START) {
      return ENTRANCE_HELIX;
    }
    if (progress >= EXIT_START) {
      return 1;
    }

    var spiralSpan = EXIT_START - SPIRAL_START;
    if (spiralSpan <= 0) {
      return 1;
    }

    var linearT = (progress - SPIRAL_START) / spiralSpan;
    var easedT = Math.pow(linearT, 0.62);
    return ENTRANCE_HELIX + (1 - ENTRANCE_HELIX) * easedT;
  }

  function updateHelixFromScroll() {
    if (!scrollTimeline) {
      return;
    }
    var progress = scrollTimeline.progress();
    // Balance model is for the treatments section (normal flow after pin).
    if (!balancePreloaded && progress > 0.85) {
      balancePreloaded = true;
      window.dispatchEvent(new CustomEvent("home-preload-balance"));
    }
    if (!socratesViewer || !socratesViewer.isReady()) {
      return;
    }
    socratesViewer.setHelixProgress(helixProgressFromTimeline(progress));
  }

  function ensureSocratesInit() {
    if (socratesInitialized || !socratesCanvasEl) {
      return;
    }
    if (typeof THREE === "undefined" || !window.SocratesHelixViewer) {
      return;
    }
    socratesInitialized = true;
    socratesViewer = window.SocratesHelixViewer.create(
      socratesCanvasEl,
      socratesUrl,
      function () {
        if (!socratesViewer || !socratesViewer.isReady()) {
          return;
        }
        socratesViewer.resize();
        socratesViewer.setHelixProgress(
          helixProgressFromTimeline(scrollTimeline ? scrollTimeline.progress() : 0)
        );
        socratesViewer.render();
      },
      function () {},
      {
        blendIntoBackground: !whiteStatue,
        whiteStatue: whiteStatue,
        materialBlendStrength: materialBlendStrength,
        backgroundColor: socratesBg,
      }
    );
  }

  function addVoiceScrollSequence(timeline) {
    if (!socratesVoices.length) {
      return;
    }
    var span = VOICE_END - VOICE_START;
    var slot = span / socratesVoices.length;
    var visible = slot * 0.78;
    var fadeDur = Math.min(0.04 * S_SPAN, visible * 0.35);

    socratesVoices.forEach(function (voice, index) {
      var start = VOICE_START + index * slot;
      timeline.fromTo(
        voice,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: fadeDur,
          ease: "power2.out",
          onStart: function () {
            if (socratesOverlay) {
              socratesOverlay.setAttribute("aria-hidden", "false");
            }
          },
        },
        start
      );
      timeline.to(
        voice,
        {
          opacity: 0,
          y: -8,
          duration: fadeDur,
          ease: "power2.in",
        },
        start + visible - fadeDur
      );
    });

    timeline.set(socratesVoices, { opacity: 0, y: 10 }, EXIT_START);
    timeline.call(
      function () {
        if (socratesOverlay) {
          socratesOverlay.setAttribute("aria-hidden", "true");
        }
      },
      null,
      EXIT_START
    );
  }

  function addTreatmentTransitionSequence(timeline) {
    if (!treatmentTransitionLines.length) {
      return;
    }
    var start = EXIT_START;
    var dur = Math.min(EXIT_DURATION, 1 - EXIT_START - 0.01);
    var firstLine = treatmentTransitionLines[0];
    var secondLine = treatmentTransitionLines[1];
    var lineIn = dur * 0.22;
    var lineOut = dur * 0.2;

    timeline.call(
      function () {
        if (treatmentTransition) {
          treatmentTransition.setAttribute("aria-hidden", "false");
        }
        if (socratesOverlay) {
          socratesOverlay.setAttribute("aria-hidden", "false");
        }
      },
      null,
      start
    );

    if (treatmentTransitionBeam) {
      timeline.fromTo(
        treatmentTransitionBeam,
        { opacity: 0, scaleX: 0.2 },
        {
          opacity: 1,
          scaleX: 1,
          duration: dur * 0.25,
          ease: "power2.out",
        },
        start
      );
    }

    if (firstLine) {
      timeline.fromTo(
        firstLine,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: lineIn, ease: "power2.out" },
        start + dur * 0.08
      );
      timeline.to(
        firstLine,
        { opacity: 0, y: -10, duration: lineOut, ease: "power2.in" },
        start + dur * 0.42
      );
    }

    if (secondLine) {
      timeline.fromTo(
        secondLine,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: lineIn, ease: "power2.out" },
        start + dur * 0.48
      );
      timeline.to(
        secondLine,
        {
          opacity: 0,
          y: -10,
          duration: lineOut,
          ease: "power2.in",
          onComplete: function () {
            if (treatmentTransition) {
              treatmentTransition.setAttribute("aria-hidden", "true");
            }
          },
        },
        start + dur * 0.82
      );
    }

    if (treatmentTransitionBeam) {
      timeline.to(
        treatmentTransitionBeam,
        { opacity: 0, duration: lineOut, ease: "power2.in" },
        start + dur * 0.82
      );
    }
  }

  function getTeamsImgMaxHeight() {
    return Math.round(Math.min(window.innerWidth * 0.28, 380));
  }

  function getTeamsCollapsedRowHeight(row) {
    return row.offsetHeight;
  }

  function getTeamsListOffsetForRow(index, imgMax) {
    if (index === 0 || !teamsRows.length) {
      return 0;
    }

    var pinPadding = 48;
    var viewBudget = window.innerHeight - pinPadding;
    var stackHeight = 0;
    for (var i = 0; i < index; i++) {
      stackHeight += getTeamsCollapsedRowHeight(teamsRows[i]);
    }

    var meta = teamsRows[index].querySelector(".test-teams-meta");
    var metaHeight = meta ? meta.offsetHeight : 0;
    var expandedHeight = metaHeight + imgMax;
    var totalNeeded = stackHeight + expandedHeight;
    var shift = -stackHeight;

    if (totalNeeded > viewBudget) {
      shift = Math.min(shift, -(totalNeeded - viewBudget + 32));
    }

    return shift;
  }

  function setTeamsMobileStatic() {
    if (teamsLayer) {
      gsap.set(teamsLayer, { autoAlpha: 1 });
      teamsLayer.setAttribute("aria-hidden", "false");
    }
    if (teamsIntroWrap) {
      gsap.set(teamsIntroWrap, { autoAlpha: 1, clearProps: "height,marginBottom,overflow" });
    }
    if (teamsList) {
      gsap.set(teamsList, { y: 0 });
    }
    teamsRows.forEach(function (row) {
      var imgBox = row.querySelector(".test-teams-img-box");
      var desc = row.querySelector(".test-teams-desc");
      var summary = row.querySelector(".test-teams-summary");
      row.classList.add("is-expanded");
      if (imgBox) {
        gsap.set(imgBox, { clearProps: "height" });
      }
      if (desc) {
        gsap.set(desc, { clearProps: "opacity" });
      }
      if (summary) {
        gsap.set(summary, { clearProps: "opacity,visibility" });
      }
    });
    document.documentElement.classList.add("test-teams-static");
  }

  function resetTeamsLayers() {
    // Treatments live in normal page flow — never hide them from the pin timeline.
    if (teamsInFlow) {
      setTeamsMobileStatic();
      return;
    }
    document.documentElement.classList.remove("test-teams-static");
    if (teamsColorWipe) {
      gsap.set(teamsColorWipe, { display: "none", opacity: 0 });
    }
    if (teamsLayer) {
      gsap.set(teamsLayer, { autoAlpha: 0 });
      teamsLayer.setAttribute("aria-hidden", "true");
    }
    if (teamsIntroWrap) {
      gsap.set(teamsIntroWrap, {
        autoAlpha: 1,
        height: "auto",
        marginBottom: "",
        overflow: "hidden",
      });
    }
    if (teamsList) {
      gsap.set(teamsList, { y: 0 });
    }
    teamsRows.forEach(function (row) {
      var imgBox = row.querySelector(".test-teams-img-box");
      var desc = row.querySelector(".test-teams-desc");
      var summary = row.querySelector(".test-teams-summary");
      row.classList.remove("is-expanded");
      if (imgBox) {
        gsap.set(imgBox, { height: 0 });
      }
      if (desc) {
        gsap.set(desc, { opacity: 0 });
      }
      if (summary) {
        gsap.set(summary, { autoAlpha: 0 });
      }
    });
  }

  function addTeamsScrollSequence(timeline) {
    if (!teamsLayer || !teamsRows.length) {
      return;
    }

    var imgMax = getTeamsImgMaxHeight();
    var rowDuration = 1;
    var collapseDuration = 0.35;
    var homeIntroDuration = 0.18;
    var rowStartOffset = 0.22;
    var teamsTotal = rowStartOffset + teamsRows.length * rowDuration + 0.4;
    var scale = T_SPAN / teamsTotal;

    function tt(localTime) {
      return TREATMENTS_START + localTime * scale;
    }

    function td(localDur) {
      return localDur * scale;
    }

    timeline.to(
      teamsLayer,
      {
        autoAlpha: 1,
        duration: td(0.12),
        ease: "power2.out",
        onStart: function () {
          teamsLayer.setAttribute("aria-hidden", "false");
          window.dispatchEvent(new CustomEvent("home-preload-balance"));
          window.dispatchEvent(new CustomEvent("test-teams-approach"));
        },
      },
      TREATMENTS_START
    );

    if (teamsIntroWrap) {
      timeline.to(
        teamsIntroWrap,
        {
          autoAlpha: 0,
          height: 0,
          marginBottom: 0,
          duration: td(homeIntroDuration),
          ease: "power2.inOut",
        },
        tt(0)
      );
    }

    var listOffsets = teamsRows.map(function (_, index) {
      return getTeamsListOffsetForRow(index, imgMax);
    });

    teamsRows.forEach(function (row, index) {
      var imgBox = row.querySelector(".test-teams-img-box");
      var desc = row.querySelector(".test-teams-desc");
      var summary = row.querySelector(".test-teams-summary");
      var start = rowStartOffset + index * rowDuration;

      if (teamsList && listOffsets[index] !== 0) {
        timeline.to(
          teamsList,
          {
            y: listOffsets[index],
            duration: td(rowDuration * 0.45),
            ease: "power2.out",
          },
          tt(start)
        );
      }

      if (imgBox) {
        timeline.to(
          imgBox,
          {
            height: imgMax,
            duration: td(rowDuration * 0.55),
            ease: "power2.out",
            onStart: function () {
              row.classList.add("is-expanded");
            },
          },
          tt(start)
        );
      }

      if (desc) {
        timeline.to(
          desc,
          {
            opacity: 1,
            duration: td(rowDuration * 0.25),
            ease: "power1.out",
          },
          tt(start + rowDuration * 0.12)
        );
      }

      if (summary) {
        timeline.to(
          summary,
          {
            autoAlpha: 1,
            duration: td(rowDuration * 0.28),
            ease: "power1.out",
          },
          tt(start + rowDuration * 0.1)
        );
      }

      if (index < teamsRows.length - 1) {
        if (desc) {
          timeline.to(
            desc,
            {
              opacity: 0,
              duration: td(collapseDuration * 0.5),
              ease: "power1.in",
            },
            tt(start + rowDuration * 0.72)
          );
        }

        if (summary) {
          timeline.to(
            summary,
            {
              autoAlpha: 0,
              duration: td(collapseDuration * 0.5),
              ease: "power1.in",
            },
            tt(start + rowDuration * 0.72)
          );
        }

        if (imgBox) {
          timeline.to(
            imgBox,
            {
              height: 0,
              duration: td(collapseDuration),
              ease: "power2.in",
              onComplete: function () {
                row.classList.remove("is-expanded");
              },
            },
            tt(start + rowDuration * 0.75)
          );
        }
      }
    });
  }

  // ——— Treatment bridge: type each line when it is actually visible ———
  // (ScrollTrigger start positions fire too early while Socrates is still pinned.)
  var bridgeTypeTweens = [];
  var bridgeObserver = null;

  function initTreatmentBridgeTypewriter() {
    var bridge = document.getElementById("home-treatment-bridge");
    if (!bridge) {
      return;
    }
    var lines = Array.prototype.slice.call(
      bridge.querySelectorAll(".home-treatment-bridge__line")
    );
    if (!lines.length) {
      return;
    }

    bridgeTypeTweens.forEach(function (tw) {
      tw.kill();
    });
    bridgeTypeTweens = [];
    if (bridgeObserver) {
      bridgeObserver.disconnect();
      bridgeObserver = null;
    }

    function wrapBridgeChars(el) {
      if (!el || el.dataset.charsWrapped === "1") {
        return;
      }
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      var textNodes = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }
      textNodes.forEach(function (node) {
        var text = node.textContent;
        if (!text) {
          return;
        }
        var frag = document.createDocumentFragment();
        text.split(/(\s+)/).forEach(function (part) {
          if (!part) {
            return;
          }
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            return;
          }
          var word = document.createElement("span");
          word.className = "home-treatment-bridge__word";
          for (var i = 0; i < part.length; i++) {
            var span = document.createElement("span");
            span.className = "home-treatment-bridge__char";
            span.textContent = part.charAt(i);
            word.appendChild(span);
          }
          frag.appendChild(word);
        });
        node.parentNode.replaceChild(frag, node);
      });
      el.dataset.charsWrapped = "1";
    }

    function charsOf(el) {
      return el ? el.querySelectorAll(".home-treatment-bridge__char") : [];
    }

    function typeOut(el) {
      if (!el || el.dataset.typed === "1") {
        return;
      }
      el.dataset.typed = "1";
      var chars = charsOf(el);
      if (!chars.length) {
        el.classList.add("is-typed");
        return;
      }
      gsap.set(chars, { opacity: 0 });
      var tw = gsap.to(chars, {
        opacity: 1,
        duration: 0.02,
        stagger: 0.032,
        ease: "none",
        onComplete: function () {
          el.classList.add("is-typed");
        },
      });
      bridgeTypeTweens.push(tw);
    }

    lines.forEach(wrapBridgeChars);

    if (prefersReducedMotion) {
      lines.forEach(function (el) {
        gsap.set(charsOf(el), { opacity: 1 });
        el.classList.add("is-typed");
        el.dataset.typed = "1";
      });
      bridge.classList.add("is-revealed");
      return;
    }

    lines.forEach(function (el) {
      if (el.dataset.typed === "1") {
        gsap.set(charsOf(el), { opacity: 1 });
        el.classList.add("is-typed");
        return;
      }
      gsap.set(charsOf(el), { opacity: 0 });
    });

    // Already scrolled past the whole bridge — show finished text
    var bridgeRect = bridge.getBoundingClientRect();
    if (bridgeRect.bottom < 0) {
      lines.forEach(function (el) {
        gsap.set(charsOf(el), { opacity: 1 });
        el.classList.add("is-typed");
        el.dataset.typed = "1";
      });
      bridge.classList.add("is-revealed");
      return;
    }

    // rootMargin top negative = wait until line is further into the viewport
    // Adjust the first value (e.g. -20% → -35%) if typing still starts early.
    bridgeObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }
          typeOut(entry.target);
          bridgeObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.35,
        rootMargin: "-20% 0px -15% 0px",
      }
    );

    lines.forEach(function (el) {
      if (el.dataset.typed !== "1") {
        bridgeObserver.observe(el);
      }
    });
  }

  function destroy() {
    if (scrollTimeline) {
      scrollTimeline.kill();
      scrollTimeline = null;
    }
  }

  function init() {
    destroy();
    gsap.registerPlugin(ScrollTrigger);
    initTypingScroll();
    initTreatmentBridgeTypewriter();

    if (!desktopQuery.matches || prefersReducedMotion) {
      if (reveal) {
        gsap.set(reveal, { opacity: 1, clearProps: "filter,y" });
      }
      if (blank) {
        gsap.set(blank, { y: 0, autoAlpha: 1, clearProps: "transform" });
      }
      if (heritagePanel) {
        gsap.set(heritagePanel, { y: 0, autoAlpha: 1, clearProps: "transform" });
      }
      if (intro) {
        gsap.set(intro, { opacity: 1 });
      }
      if (colorWipe) {
        gsap.set(colorWipe, { opacity: 0, display: "none" });
      }
      if (typeWrap) {
        gsap.set(typeWrap, { opacity: 1 });
        typeWrap.setAttribute("aria-hidden", "false");
      }
      prepareTypeLines();
      typeLines.forEach(function (line) {
        gsap.set(line, { opacity: 1 });
        gsap.set(charsOfTypeLine(line), { opacity: 1 });
      });
      if (socratesLayer) {
        gsap.set(socratesLayer, { y: 0, autoAlpha: 1, clearProps: "transform" });
      }
      if (socratesCanvasEl) {
        socratesCanvasEl.classList.add("home-socrates-canvas-visible");
        gsap.set(socratesCanvasEl, { autoAlpha: socratesBlend });
        ensureSocratesInit();
      }
      if (socratesHintEl) {
        gsap.set(socratesHintEl, { autoAlpha: 1 });
      }
      setTeamsMobileStatic();
      return;
    }

    // Initial states
    if (blank) {
      gsap.set(blank, { opacity: 1, autoAlpha: 1, y: 0 });
    }
    if (reveal) {
      gsap.set(reveal, { opacity: 1, y: 0, filter: "blur(0px)", pointerEvents: "auto" });
    }
    if (colorWipe) {
      gsap.set(colorWipe, { display: "none", opacity: 0 });
    }
    if (heritagePanel) {
      gsap.set(heritagePanel, {
        y: function () {
          return window.innerHeight;
        },
        autoAlpha: 1,
      });
    }
    if (intro) {
      gsap.set(intro, { opacity: 1, y: 0 });
    }
    if (heritageBg) {
      gsap.set(heritageBg, { autoAlpha: 1 });
    }
    prepareTypeLines();
    if (typeWrap) {
      gsap.set(typeWrap, { opacity: 0 });
      typeWrap.setAttribute("aria-hidden", "true");
    }
    typeLines.forEach(function (line) {
      gsap.set(line, { opacity: 0 });
      gsap.set(charsOfTypeLine(line), { opacity: 0 });
    });
    resetVoiceLines();
    resetTreatmentTransition();
    resetTeamsLayers();
    if (socratesCanvasEl) {
      socratesCanvasEl.classList.add("home-socrates-canvas-visible");
      gsap.set(socratesCanvasEl, { autoAlpha: socratesBlend });
    }
    if (socratesHintEl) {
      gsap.set(socratesHintEl, { autoAlpha: 0 });
    }
    if (socratesLayer) {
      gsap.set(socratesLayer, {
        autoAlpha: 1,
        y: function () {
          return window.innerHeight;
        },
      });
    }
    scrollTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: function () {
          return "+=" + window.innerHeight * MERGED_SCROLL_VIEWPORTS;
        },
        pin: pin,
        pinSpacing: true,
        scrub: 0.3,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onEnter: function () {
          ensureBookInit();
        },
        onEnterBack: function () {
          ensureBookInit();
        },
      },
    });

    // ——— Bridge: both panels scroll up together (natural-scroll feel) ———
    // Use viewport pixels so the two full-screen layers stay flush (no white gap).
    if (blank) {
      scrollTimeline.fromTo(
        blank,
        { y: 0 },
        {
          y: function () {
            return -window.innerHeight;
          },
          duration: historySlideDur,
          ease: "none",
          onComplete: function () {
            if (reveal) {
              reveal.style.pointerEvents = "none";
            }
          },
          onReverseComplete: function () {
            if (reveal) {
              reveal.style.pointerEvents = "auto";
            }
          },
        },
        historySlideStart
      );
    }

    if (heritagePanel) {
      scrollTimeline.fromTo(
        heritagePanel,
        {
          y: function () {
            return window.innerHeight;
          },
        },
        {
          y: 0,
          duration: historySlideDur,
          ease: "none",
          onStart: function () {
            ensureBookInit();
            resizeBook();
          },
        },
        historySlideStart
      );
    }

    scrollTimeline.call(
      function () {
        resizeBook();
      },
      null,
      historySlideStart + historySlideDur * 0.5
    );

    // ——— Typewriter on the right (intro title + button stay with the book) ———
    if (typeWrap) {
      scrollTimeline.to(
        typeWrap,
        {
          opacity: 1,
          duration: introFadeEnd * 0.6,
          ease: "power1.out",
          onStart: function () {
            typeWrap.setAttribute("aria-hidden", "false");
          },
        },
        introFadeStart + introFadeEnd * 0.4
      );
    }

    if (typeLines.length) {
      var sentenceCount = typeLines.length;
      var slot = typeDuration / sentenceCount;
      var typePortion = slot * 0.72;
      var holdPortion = slot * 0.1;
      var fadePortion = slot * 0.18;

      typeLines.forEach(function (line, index) {
        var chars = charsOfTypeLine(line);
        var lineStart = typeStart + index * slot;
        var isLast = index === sentenceCount - 1;

        scrollTimeline.set(line, { opacity: 1 }, lineStart);
        scrollTimeline.set(chars, { opacity: 0 }, lineStart);

        if (chars.length) {
          var perChar = typePortion / Math.max(chars.length, 1);
          scrollTimeline.to(
            chars,
            {
              opacity: 1,
              duration: perChar,
              stagger: perChar,
              ease: "none",
            },
            lineStart
          );
        }

        if (!isLast) {
          var fadeAt = lineStart + typePortion + holdPortion;
          scrollTimeline.to(
            line,
            {
              opacity: 0,
              duration: fadePortion,
              ease: "power1.inOut",
            },
            fadeAt
          );
        }
      });
    }

    // ——— History → Patients' Voices: both panels scroll up together ———
    scrollTimeline.call(
      ensureSocratesInit,
      null,
      Math.max(0, socratesSlideStart - 0.02)
    );

    if (heritagePanel) {
      scrollTimeline.to(
        heritagePanel,
        {
          y: function () {
            return -window.innerHeight;
          },
          duration: socratesSlideDur,
          ease: "none",
        },
        socratesSlideStart
      );
    }

    if (socratesLayer) {
      scrollTimeline.to(
        socratesLayer,
        {
          y: 0,
          duration: socratesSlideDur,
          ease: "none",
          onStart: function () {
            ensureSocratesInit();
            if (socratesViewer && socratesViewer.isReady()) {
              socratesViewer.resize();
              socratesViewer.setHelixProgress(ENTRANCE_HELIX);
              socratesViewer.render();
            }
          },
        },
        socratesSlideStart
      );
    }

    // ——— Socrates spiral + voices (pin ends here; treatments scroll normally after) ———
    if (socratesHintEl) {
      scrollTimeline.to(
        socratesHintEl,
        {
          autoAlpha: 1,
          duration: socratesSlideDur * 0.35,
          ease: "power2.out",
        },
        SOCRATES_START
      );

      scrollTimeline.to(
        socratesHintEl,
        {
          autoAlpha: 0,
          duration: Math.max(EXIT_DURATION * 0.35, 0.01),
          ease: "power1.in",
        },
        EXIT_START
      );
    }

    addVoicesHeadingSequence(scrollTimeline);
    addVoiceScrollSequence(scrollTimeline);
    // Intentionally not calling addTreatmentTransitionSequence / addTeamsScrollSequence:
    // bridge copy + treatments are normal document flow after this pin.

    scrollTimeline.eventCallback("onUpdate", function () {
      if (!scrollTimeline) {
        return;
      }
      var progress = scrollTimeline.progress();

      if (!socratesPreloaded && progress > SOCRATES_START * 0.55) {
        socratesPreloaded = true;
        ensureSocratesInit();
      }

      updateHelixFromScroll();

      var typeEnd = typeStart + typeDuration;
      if (progress >= typeEnd - 0.01 || progress >= SOCRATES_START) {
        stopBookSpin();
      } else if (progress > bridgeEnd) {
        startBookSpin();
      }
    });

    ScrollTrigger.refresh();
  }

  window.__HOME_MERGED_SCROLL = true;
  applyBookBlend();
  init();
  window.addEventListener("resize", function () {
    resizeBook();
    if (socratesViewer && socratesViewer.isReady()) {
      socratesViewer.resize();
      if (scrollTimeline) {
        socratesViewer.setHelixProgress(
          helixProgressFromTimeline(scrollTimeline.progress())
        );
      }
    }
    init();
  });
  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener("change", init);
  }
})();
