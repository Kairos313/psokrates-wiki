(function () {
  var modal = document.getElementById("intro-psora-modal");
  var openButton = document.getElementById("open-intro-psora");
  var closeButton = document.getElementById("intro-psora-close");
  var skipButton = document.getElementById("intro-psora-skip");
  var nextButton = document.getElementById("intro-psora-next");
  var creamNextButton = document.getElementById("intro-psora-cream-next");
  var modalScroll = document.getElementById("intro-psora-modal-scroll");
  var lottieContainer = document.getElementById("intro-psora-lottie");
  var lottie2Container = document.getElementById("intro-psora2-lottie");
  var lottie3Container = document.getElementById("intro-psora3-lottie");
  var lottie4Container = document.getElementById("intro-psora4-lottie");
  var lottie5Container = document.getElementById("intro-psora5-lottie");
  var lottie6Container = document.getElementById("intro-psora6-lottie");
  var shineLayer = document.getElementById("intro-shine-layer");
  var startLayer = document.getElementById("intro-psora-start-layer");
  var journeyStartButton = document.getElementById("intro-psora-journey-start");
  var journeyButtonLottieEl = document.getElementById("intro-psora-journey-lottie");
  var fallback = document.getElementById("intro-psora-fallback");
  var skinCreamContainer = document.getElementById("skin-cream-scene");
  var pageRoot = document.querySelector(".intro-psora-page");

  if (!modal || !lottieContainer || !startLayer || !journeyStartButton) {
    return;
  }

  var lottiePath =
    (pageRoot && pageRoot.getAttribute("data-intro-psora-json")) ||
    "/static/intro/intro_psora.json";

  var lottie2Path =
    (pageRoot && pageRoot.getAttribute("data-intro-psora2-json")) ||
    "/static/intro/intro_psora2.json";

  var lottie3Path =
    (pageRoot && pageRoot.getAttribute("data-intro-psora3-json")) ||
    "/static/intro/intro_psora3.json";

  var lottie4Path =
    (pageRoot && pageRoot.getAttribute("data-intro-psora4-json")) ||
    "/static/intro/intro_psora4.json";

  var lottie5Path =
    (pageRoot && pageRoot.getAttribute("data-intro-psora5-json")) ||
    "/static/intro/intro_psora5.json";

  var lottie6Path =
    (pageRoot && pageRoot.getAttribute("data-intro-psora6-json")) ||
    "/static/intro/intro_psora6.json";

  var journeyButtonPath =
    (pageRoot && pageRoot.getAttribute("data-journey-button-json")) ||
    "/static/intro/journey_start_button.json";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lottieAnimation = null;
  var lottieAnimation2 = null;
  var lottieAnimation3 = null;
  var lottieAnimation4 = null;
  var lottieAnimation5 = null;
  var lottieAnimation6 = null;
  var journeyButtonLottie = null;
  var isAnimationReady = false;
  var isPart2Ready = false;
  var isPart3Ready = false;
  var isPart4Ready = false;
  var isPart5Ready = false;
  var isPart6Ready = false;
  var pendingPlay = false;
  var introPhase = "idle";
  var pendingSkipToPart2 = false;
  var hoverSegment = null;
  var journeyButtonHovering = false;

  if (openButton) {
    openButton.addEventListener("click", openModal);
  }

  if (closeButton) {
    closeButton.addEventListener("click", closeModal);
  }

  if (skipButton) {
    skipButton.addEventListener("click", onSkipButtonClick);
  }
  journeyStartButton.addEventListener("click", beginJourney);

  if (nextButton) {
    nextButton.addEventListener("click", onNextButtonClick);
  }

  if (creamNextButton) {
    creamNextButton.addEventListener("click", onCreamNextButtonClick);
  }

  function onNextButtonClick() {
    if (introPhase === "part2-done") {
      playIntroPart3();
      return;
    }

    if (introPhase === "part3-done") {
      playIntroPart4();
      return;
    }

    if (introPhase === "part5-done") {
      playIntroPart6();
    }
  }

  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.classList.contains("intro-psora-modal-hidden")) {
      closeModal();
    }
  });

  function readHoverSegment() {
    if (!pageRoot) {
      return null;
    }

    var start = parseInt(pageRoot.getAttribute("data-journey-button-hover-start"), 10);
    var end = parseInt(pageRoot.getAttribute("data-journey-button-hover-end"), 10);

    if (isNaN(start) || isNaN(end) || end <= start) {
      return null;
    }

    return [start, end];
  }

  function updateJourneyButtonDisabled() {
    journeyStartButton.disabled = !isAnimationReady;
    journeyStartButton.setAttribute(
      "aria-disabled",
      isAnimationReady ? "false" : "true"
    );
  }

  function showStartButton() {
    startLayer.classList.remove("intro-psora-start-layer-hidden");
    lottieContainer.classList.add("intro-psora-lottie-pending");
    updateJourneyButtonDisabled();
  }

  function hideStartButton() {
    startLayer.classList.add("intro-psora-start-layer-hidden");
    lottieContainer.classList.remove("intro-psora-lottie-pending");
  }

  function showNextButton() {
    if (!nextButton) {
      return;
    }

    nextButton.classList.remove("intro-psora-next-hidden");
    nextButton.setAttribute("aria-hidden", "false");
  }

  function hideNextButton() {
    if (!nextButton) {
      return;
    }

    nextButton.classList.add("intro-psora-next-hidden");
    nextButton.setAttribute("aria-hidden", "true");
  }

  function showCreamNextButton() {
    if (!creamNextButton) {
      return;
    }

    creamNextButton.classList.remove("intro-psora-cream-next-hidden");
    creamNextButton.setAttribute("aria-hidden", "false");
  }

  function hideCreamNextButton() {
    if (!creamNextButton) {
      return;
    }

    creamNextButton.classList.add("intro-psora-cream-next-hidden");
    creamNextButton.setAttribute("aria-hidden", "true");
  }

  function hideIntroShineLayer() {
    if (window.IntroShineLayer) {
      window.IntroShineLayer.hide();
    }
  }

  function showIntroShineLayer() {
    if (window.IntroShineLayer && shineLayer) {
      window.IntroShineLayer.show(shineLayer);
      if (typeof window.IntroShineLayer.syncLayout === "function") {
        requestAnimationFrame(function () {
          window.IntroShineLayer.syncLayout();
          if (lottieAnimation5) {
            resizeIntroLottie(lottieAnimation5);
          }
        });
      }
    }
  }

  function onSkinCreamSceneReady() {
    showCreamNextButton();
    preloadIntroPart5();
  }

  function onCreamNextButtonClick() {
    if (introPhase !== "skin-cream") {
      return;
    }

    playIntroPart5();
  }

  function pauseIntroAnimation(animation) {
    if (animation) {
      animation.pause();
    }
  }

  function hideIntroPart4() {
    pauseIntroAnimation(lottieAnimation4);

    if (lottie4Container) {
      lottie4Container.classList.add("intro-psora4-lottie-hidden");
      lottie4Container.classList.remove("intro-psora4-lottie-preload", "intro-psora4-lottie-fading");
      lottie4Container.setAttribute("aria-hidden", "true");
    }
  }

  function hideIntroPart5() {
    pauseIntroAnimation(lottieAnimation5);

    if (lottie5Container) {
      lottie5Container.classList.add("intro-psora5-lottie-hidden");
      lottie5Container.classList.remove("intro-psora5-lottie-preload");
      lottie5Container.setAttribute("aria-hidden", "true");
    }
  }

  function hideIntroPart6() {
    pauseIntroAnimation(lottieAnimation6);

    if (lottie6Container) {
      lottie6Container.classList.add("intro-psora6-lottie-hidden");
      lottie6Container.classList.remove("intro-psora6-lottie-preload");
      lottie6Container.setAttribute("aria-hidden", "true");
    }
  }

  function whenPartReady(isReadyCheck, onReady, onTimeout) {
    if (isReadyCheck()) {
      onReady();
      return;
    }

    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;

      if (isReadyCheck()) {
        clearInterval(timer);
        onReady();
        return;
      }

      if (attempts >= 120) {
        clearInterval(timer);
        if (typeof onTimeout === "function") {
          onTimeout();
        }
      }
    }, 50);
  }

  function skipToPart2Done() {
    hideStartButton();
    hideIntroShineLayer();
    hideSkinCreamScene();
    hideCreamNextButton();
    hideIntroPart3();
    hideIntroPart4();
    hideIntroPart5();
    hideIntroPart6();

    pauseIntroAnimation(lottieAnimation);

    function finish() {
      if (lottie2Container) {
        lottie2Container.classList.remove("intro-psora2-lottie-hidden");
        lottie2Container.setAttribute("aria-hidden", "false");
      }

      if (lottieAnimation2) {
        applyIntroLottieLayout(lottie2Container, "fit");
        resizeIntroLottie(lottieAnimation2);
        pauseAtLastFrame(lottieAnimation2);
      }

      if (lottieContainer) {
        lottieContainer.classList.add("intro-psora-lottie-hidden");
        lottieContainer.setAttribute("aria-hidden", "true");
      }

      introPhase = "part2-done";
      preloadIntroPart3();
      showNextButton();
    }

    if (!isPart2Ready || !lottieAnimation2) {
      introPhase = "part2-done";
      showNextButton();
      preloadIntroPart3();

      whenPartReady(
        function () {
          return isPart2Ready && lottieAnimation2;
        },
        finish,
        function () {
          introPhase = "part2-done";
          showNextButton();
        }
      );
      return;
    }

    finish();
  }

  function skipToPart3Done() {
    hideStartButton();
    hideIntroShineLayer();
    hideSkinCreamScene();
    hideCreamNextButton();
    hideIntroPart2();
    hideIntroPart4();
    hideIntroPart5();
    hideIntroPart6();

    pauseIntroAnimation(lottieAnimation);

    if (lottieContainer) {
      lottieContainer.classList.add("intro-psora-lottie-hidden");
      lottieContainer.setAttribute("aria-hidden", "true");
    }

    function finish() {
      if (lottie3Container) {
        lottie3Container.classList.remove("intro-psora3-lottie-hidden", "intro-psora3-lottie-preload");
        lottie3Container.setAttribute("aria-hidden", "false");
      }

      if (lottieAnimation3) {
        applyIntroLottieLayout(lottie3Container, "fit");
        resizeIntroLottie(lottieAnimation3);
        pauseAtLastFrame(lottieAnimation3);
      }

      introPhase = "part3-done";
      preloadIntroPart4();
      showNextButton();
    }

    if (!isPart3Ready || !lottieAnimation3) {
      introPhase = "part3-done";
      showNextButton();
      preloadIntroPart4();
      preloadIntroPart3();

      whenPartReady(
        function () {
          return isPart3Ready && lottieAnimation3;
        },
        finish,
        function () {
          introPhase = "part3-done";
          showNextButton();
        }
      );
      return;
    }

    finish();
  }

  function skipToSkinCream() {
    hideStartButton();
    hideNextButton();
    hideIntroShineLayer();
    hideCreamNextButton();
    hideIntroPart2();
    hideIntroPart3();
    hideIntroPart5();
    hideIntroPart6();

    pauseIntroAnimation(lottieAnimation);

    if (lottieContainer) {
      lottieContainer.classList.add("intro-psora-lottie-hidden");
      lottieContainer.setAttribute("aria-hidden", "true");
    }

    if (lottieAnimation4) {
      pauseAtLastFrame(lottieAnimation4);
    }

    if (lottie4Container) {
      lottie4Container.classList.remove("intro-psora4-lottie-hidden", "intro-psora4-lottie-preload");
      lottie4Container.setAttribute("aria-hidden", "false");
    }

    preloadSkinCreamScene();
    showSkinCreamScene();
  }

  function skipToPart5Done() {
    hideStartButton();
    hideNextButton();
    hideCreamNextButton();
    hideSkinCreamScene();
    hideIntroPart2();
    hideIntroPart3();
    hideIntroPart4();
    hideIntroPart6();

    pauseIntroAnimation(lottieAnimation);

    if (lottieContainer) {
      lottieContainer.classList.add("intro-psora-lottie-hidden");
      lottieContainer.setAttribute("aria-hidden", "true");
    }

    function finish() {
      if (lottie5Container) {
        lottie5Container.classList.remove("intro-psora5-lottie-hidden", "intro-psora5-lottie-preload");
        lottie5Container.setAttribute("aria-hidden", "false");
      }

      if (lottieAnimation5) {
        applyIntroLottieLayout(lottie5Container, "fit");
        resizeIntroLottie(lottieAnimation5);
        pauseAtLastFrame(lottieAnimation5);
      }

      introPhase = "part5-done";
      preloadIntroPart6();
      showIntroShineLayer();
      showNextButton();
    }

    if (!isPart5Ready || !lottieAnimation5) {
      preloadIntroPart5();

      whenPartReady(
        function () {
          return isPart5Ready && lottieAnimation5;
        },
        finish,
        function () {
          introPhase = "part5-done";
          showIntroShineLayer();
          showNextButton();
        }
      );
      return;
    }

    finish();
  }

  function skipToPart6Done() {
    hideStartButton();
    hideNextButton();
    hideCreamNextButton();
    hideSkinCreamScene();
    hideIntroPart2();
    hideIntroPart3();
    hideIntroPart4();
    hideIntroPart5();
    hideIntroShineLayer();

    pauseIntroAnimation(lottieAnimation);

    if (lottieContainer) {
      lottieContainer.classList.add("intro-psora-lottie-hidden");
      lottieContainer.setAttribute("aria-hidden", "true");
    }

    function finish() {
      if (lottie6Container) {
        lottie6Container.classList.remove("intro-psora6-lottie-hidden", "intro-psora6-lottie-preload");
        lottie6Container.setAttribute("aria-hidden", "false");
      }

      if (lottieAnimation6) {
        applyIntroLottieLayout(lottie6Container, "fit");
        resizeIntroLottie(lottieAnimation6);
        pauseAtLastFrame(lottieAnimation6);
      }

      introPhase = "part6-done";
    }

    if (!isPart6Ready || !lottieAnimation6) {
      preloadIntroPart6();

      whenPartReady(
        function () {
          return isPart6Ready && lottieAnimation6;
        },
        finish,
        function () {
          introPhase = "part6-done";
        }
      );
      return;
    }

    finish();
  }

  function onSkipButtonClick() {
    if (introPhase === "idle") {
      if (!isAnimationReady) {
        hideStartButton();
        pendingSkipToPart2 = true;
        introPhase = "part2-done";
        showNextButton();
        return;
      }

      skipToPart2Done();
      return;
    }

    if (introPhase === "part1" || introPhase === "part2") {
      skipToPart2Done();
      return;
    }

    if (introPhase === "part2-done") {
      showNextButton();
      return;
    }

    if (introPhase === "part3") {
      skipToPart3Done();
      return;
    }

    if (introPhase === "part3-done") {
      showNextButton();
      return;
    }

    if (introPhase === "part4") {
      skipToSkinCream();
      return;
    }

    if (introPhase === "skin-cream") {
      showCreamNextButton();
      return;
    }

    if (introPhase === "part5") {
      skipToPart5Done();
      return;
    }

    if (introPhase === "part5-done") {
      showIntroShineLayer();
      showNextButton();
      return;
    }

    if (introPhase === "part6") {
      skipToPart6Done();
    }
  }

  function hideSkinCreamScene() {
    if (window.SkinCreamExperience) {
      window.SkinCreamExperience.hide();
    }
  }

  function isTestCreamMode() {
    return new URLSearchParams(window.location.search).get("test_cream") === "1";
  }

  function getSkinCreamOptions() {
    if (!pageRoot) {
      return null;
    }

    return {
      baseUrl:
        pageRoot.getAttribute("data-skin-base") ||
        "/static/intro/skin_plaque_scene.png",
      plaqueSourceUrl:
        pageRoot.getAttribute("data-skin-plaque-source") ||
        "/static/intro/skin_plaque_scene.png",
      introPath:
        pageRoot.getAttribute("data-skin-intro-path") || "/static/intro/",
      creamTubeUrl:
        pageRoot.getAttribute("data-cream-tube") || "/static/intro/cream.png",
    };
  }

  function hideIntroLottieLayers() {
    if (lottie4Container) {
      lottie4Container.classList.add("intro-psora4-lottie-hidden");
      lottie4Container.classList.remove("intro-psora4-lottie-fading");
      lottie4Container.setAttribute("aria-hidden", "true");
    }

    if (lottie3Container) {
      lottie3Container.classList.add("intro-psora3-lottie-hidden");
    }

    if (lottie2Container) {
      lottie2Container.classList.add("intro-psora2-lottie-hidden");
    }

    if (lottieContainer) {
      lottieContainer.classList.add("intro-psora-lottie-hidden");
    }
  }

  function preloadSkinCreamScene() {
    if (!window.SkinCreamExperience || !skinCreamContainer) {
      return;
    }

    var options = getSkinCreamOptions();
    if (!options) {
      return;
    }

    if (window.SkinCreamExperience.isReady()) {
      return;
    }

    window.SkinCreamExperience.preload(skinCreamContainer, options);
  }

  function prepareSkinCreamHandoff() {
    if (lottieAnimation4) {
      pauseAtLastFrame(lottieAnimation4);
      applyIntroLottieLayout(lottie4Container, "fit");
      resizeIntroLottie(lottieAnimation4);
    }

    if (lottie4Container) {
      lottie4Container.classList.remove("intro-psora4-lottie-hidden", "intro-psora4-lottie-fading");
      lottie4Container.setAttribute("aria-hidden", "false");
    }

    if (window.SkinCreamExperience) {
      window.SkinCreamExperience.syncLayout();
    }
  }

  function revealSkinCreamScene() {
    hideNextButton();
    hideCreamNextButton();
    introPhase = "skin-cream";

    if (!window.SkinCreamExperience || !skinCreamContainer) {
      hideIntroLottieLayers();
      return;
    }

    prepareSkinCreamHandoff();

    window.SkinCreamExperience.reveal(function () {
      if (lottie4Container) {
        lottie4Container.classList.add("intro-psora4-lottie-fading");
      }

      window.setTimeout(function () {
        hideIntroLottieLayers();
        onSkinCreamSceneReady();
      }, 560);
    });
  }

  function showSkinCreamScene() {
    hideNextButton();
    hideCreamNextButton();
    introPhase = "skin-cream";

    if (!window.SkinCreamExperience || !skinCreamContainer) {
      hideIntroLottieLayers();
      return;
    }

    var options = getSkinCreamOptions();
    if (!options) {
      hideIntroLottieLayers();
      return;
    }

    function beginReveal() {
      prepareSkinCreamHandoff();

      window.SkinCreamExperience.reveal(function () {
        if (lottie4Container) {
          lottie4Container.classList.add("intro-psora4-lottie-fading");
        }

        window.setTimeout(function () {
          hideIntroLottieLayers();
          onSkinCreamSceneReady();
        }, 560);
      });
    }

    if (window.SkinCreamExperience.isReady()) {
      beginReveal();
      return;
    }

    window.SkinCreamExperience.preload(skinCreamContainer, options, beginReveal);
  }

  function resetIntroLayers() {
    introPhase = "idle";
    hideNextButton();
    hideCreamNextButton();
    hideIntroShineLayer();
    hideSkinCreamScene();

    if (lottieContainer) {
      lottieContainer.classList.remove("intro-psora-lottie-hidden");
      lottieContainer.setAttribute("aria-hidden", "false");
    }

    if (lottie2Container) {
      lottie2Container.classList.add("intro-psora2-lottie-hidden");
      lottie2Container.setAttribute("aria-hidden", "true");
    }

    if (lottie3Container) {
      lottie3Container.classList.add("intro-psora3-lottie-hidden");
      lottie3Container.classList.remove("intro-psora3-lottie-preload");
      lottie3Container.setAttribute("aria-hidden", "true");
    }

    if (lottie4Container) {
      lottie4Container.classList.add("intro-psora4-lottie-hidden");
      lottie4Container.classList.remove("intro-psora4-lottie-preload");
      lottie4Container.setAttribute("aria-hidden", "true");
    }

    if (lottie5Container) {
      lottie5Container.classList.add("intro-psora5-lottie-hidden");
      lottie5Container.classList.remove("intro-psora5-lottie-preload");
      lottie5Container.setAttribute("aria-hidden", "true");
    }

    if (lottie6Container) {
      lottie6Container.classList.add("intro-psora6-lottie-hidden");
      lottie6Container.classList.remove("intro-psora6-lottie-preload");
      lottie6Container.setAttribute("aria-hidden", "true");
    }
  }

  function applyIntroLottieLayout(container, fitMode) {
    if (!container) {
      return;
    }

    var mode = fitMode === "cover" ? "slice" : "meet";
    var svg = container.querySelector("svg");

    if (svg) {
      svg.setAttribute("preserveAspectRatio", "xMidYMid " + mode);
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";
    }

    var wrapper = container.firstElementChild;
    if (wrapper && wrapper !== svg) {
      wrapper.style.width = "100%";
      wrapper.style.height = "100%";
    }
  }

  function resizeIntroLottie(animation) {
    if (animation && typeof animation.resize === "function") {
      animation.resize();
    }
  }

  function pauseAtLastFrame(animation) {
    if (!animation) {
      return;
    }

    var lastFrame = Math.max(0, animation.totalFrames - 1);
    animation.pause();
    animation.goToAndStop(lastFrame, true);
  }

  function playAnimationOnce(animation) {
    if (!animation) {
      return;
    }

    var lastFrame = Math.max(0, animation.totalFrames - 1);

    animation.loop = false;
    animation.stop();
    animation.goToAndStop(0, true);

    if (typeof animation.playSegments === "function") {
      animation.playSegments([0, lastFrame], true);
      return;
    }

    if (typeof animation.play === "function") {
      animation.play();
    }
  }

  function getJourneyButtonPlayRange() {
    if (hoverSegment) {
      return hoverSegment;
    }

    if (!journeyButtonLottie) {
      return [0, 0];
    }

    return [0, Math.max(0, journeyButtonLottie.totalFrames - 1)];
  }

  function resetJourneyButtonToStart() {
    if (!journeyButtonLottie) {
      return;
    }

    journeyButtonLottie.loop = false;
    journeyButtonLottie.stop();
    journeyButtonLottie.goToAndStop(0, true);
  }

  function onJourneyButtonEnter() {
    if (!journeyButtonLottie || journeyStartButton.disabled || prefersReducedMotion) {
      return;
    }

    journeyButtonHovering = true;
    var range = getJourneyButtonPlayRange();
    journeyButtonLottie.loop = false;

    if (typeof journeyButtonLottie.playSegments === "function") {
      journeyButtonLottie.playSegments(range, true);
      return;
    }

    journeyButtonLottie.goToAndStop(range[0], true);
    if (typeof journeyButtonLottie.play === "function") {
      journeyButtonLottie.play();
    }
  }

  function onJourneyButtonLeave() {
    if (!journeyButtonLottie || prefersReducedMotion) {
      return;
    }

    journeyButtonHovering = false;
    resetJourneyButtonToStart();
  }

  function initJourneyButtonLottie() {
    destroyJourneyButtonLottie();
    hoverSegment = readHoverSegment();

    if (!journeyButtonLottieEl || typeof lottie === "undefined") {
      journeyStartButton.classList.add("intro-psora-journey-btn--text-fallback");
      return;
    }

    journeyStartButton.classList.remove("intro-psora-journey-btn--text-fallback");

    journeyButtonLottie = lottie.loadAnimation({
      container: journeyButtonLottieEl,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: journeyButtonPath,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid meet",
      },
    });

    journeyButtonLottie.addEventListener("data_failed", function () {
      journeyStartButton.classList.add("intro-psora-journey-btn--text-fallback");
    });

    journeyButtonLottie.addEventListener("DOMLoaded", function () {
      resetJourneyButtonToStart();

      if (!prefersReducedMotion) {
        journeyStartButton.addEventListener("mouseenter", onJourneyButtonEnter);
        journeyStartButton.addEventListener("mouseleave", onJourneyButtonLeave);
      }
    });

    journeyButtonLottie.addEventListener("complete", function () {
      if (!journeyButtonHovering || !journeyButtonLottie) {
        return;
      }

      var range = getJourneyButtonPlayRange();
      journeyButtonLottie.pause();
      journeyButtonLottie.goToAndStop(range[1], true);
    });
  }

  function destroyJourneyButtonLottie() {
    journeyStartButton.removeEventListener("mouseenter", onJourneyButtonEnter);
    journeyStartButton.removeEventListener("mouseleave", onJourneyButtonLeave);

    if (journeyButtonLottie) {
      journeyButtonLottie.destroy();
      journeyButtonLottie = null;
    }

    if (journeyButtonLottieEl) {
      journeyButtonLottieEl.innerHTML = "";
    }

    hoverSegment = null;
    journeyButtonHovering = false;
  }

  function openModal() {
    modal.classList.remove("intro-psora-modal-hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("intro-psora-modal-open");
    if (modalScroll) {
      modalScroll.scrollTop = 0;
    }
    pendingPlay = true;
    pendingSkipToPart2 = false;
    isAnimationReady = false;
    isPart2Ready = false;
    isPart3Ready = false;
    isPart4Ready = false;
    isPart5Ready = false;
    isPart6Ready = false;
    if (isTestCreamMode()) {
      hideStartButton();
      showSkinCreamScene();
      return;
    }

    hideStartButton();
    initJourneyButtonLottie();
    initIntroExperience();
  }

  function closeModal() {
    destroyIntroExperience();
    destroyJourneyButtonLottie();
    modal.classList.add("intro-psora-modal-hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("intro-psora-modal-open");
    if (modalScroll) {
      modalScroll.scrollTop = 0;
    }
    pendingPlay = false;
    pendingSkipToPart2 = false;
    isAnimationReady = false;
    isPart2Ready = false;
    isPart3Ready = false;
    isPart4Ready = false;
    isPart5Ready = false;
    isPart6Ready = false;
    showStartButton();
  }

  function beginJourney() {
    if (!isAnimationReady) {
      pendingPlay = true;
      return;
    }
    playIntroFromStart();
  }

  function hideIntroPart1() {
    if (lottieAnimation) {
      lottieAnimation.pause();
    }

    if (lottieContainer) {
      lottieContainer.classList.add("intro-psora-lottie-hidden");
      lottieContainer.setAttribute("aria-hidden", "true");
    }
  }

  function playIntroPart2() {
    if (!lottieAnimation2 || !isPart2Ready) {
      introPhase = "part2-done";
      showNextButton();
      return;
    }

    introPhase = "part2";
    hideNextButton();

    if (lottieContainer) {
      lottieContainer.classList.add("intro-psora-lottie-hidden");
      lottieContainer.setAttribute("aria-hidden", "true");
    }

    if (lottie2Container) {
      lottie2Container.classList.remove("intro-psora2-lottie-hidden");
      lottie2Container.setAttribute("aria-hidden", "false");
    }

    requestAnimationFrame(function () {
      applyIntroLottieLayout(lottie2Container, "fit");
      resizeIntroLottie(lottieAnimation2);
      playAnimationOnce(lottieAnimation2);
    });
  }

  function hideIntroPart2() {
    if (lottieAnimation2) {
      lottieAnimation2.pause();
    }

    if (lottie2Container) {
      lottie2Container.classList.add("intro-psora2-lottie-hidden");
      lottie2Container.setAttribute("aria-hidden", "true");
    }
  }

  function preloadIntroPart3() {
    if (!lottie3Container || typeof lottie === "undefined") {
      return;
    }

    if (isPart3Ready || lottieAnimation3) {
      return;
    }

    lottie3Container.classList.remove("intro-psora3-lottie-hidden");
    lottie3Container.classList.add("intro-psora3-lottie-preload");
    lottie3Container.setAttribute("aria-hidden", "true");

    initIntroPart3();
  }

  function startPart3Playback() {
    if (!lottieAnimation3 || !isPart3Ready) {
      return;
    }

    if (prefersReducedMotion) {
      pauseAtLastFrame(lottieAnimation3);
      introPhase = "part3-done";
      preloadIntroPart4();
      showNextButton();
      return;
    }

    applyIntroLottieLayout(lottie3Container, "fit");
    resizeIntroLottie(lottieAnimation3);
    playAnimationOnce(lottieAnimation3);
  }

  function hideIntroPart3() {
    if (lottieAnimation3) {
      lottieAnimation3.pause();
    }

    if (lottie3Container) {
      lottie3Container.classList.add("intro-psora3-lottie-hidden");
      lottie3Container.classList.remove("intro-psora3-lottie-preload");
      lottie3Container.setAttribute("aria-hidden", "true");
    }
  }

  function preloadIntroPart4() {
    if (!lottie4Container || typeof lottie === "undefined") {
      return;
    }

    if (isPart4Ready || lottieAnimation4) {
      return;
    }

    lottie4Container.classList.remove("intro-psora4-lottie-hidden");
    lottie4Container.classList.add("intro-psora4-lottie-preload");
    lottie4Container.setAttribute("aria-hidden", "true");

    initIntroPart4();
  }

  function startPart4Playback() {
    if (!lottieAnimation4 || !isPart4Ready) {
      return;
    }

    if (prefersReducedMotion) {
      pauseAtLastFrame(lottieAnimation4);
      showSkinCreamScene();
      return;
    }

    applyIntroLottieLayout(lottie4Container, "fit");
    resizeIntroLottie(lottieAnimation4);
    preloadSkinCreamScene();
    playAnimationOnce(lottieAnimation4);
  }

  function playIntroPart4() {
    hideNextButton();
    introPhase = "part4";

    if (lottie4Container) {
      lottie4Container.classList.remove("intro-psora4-lottie-hidden", "intro-psora4-lottie-preload");
      lottie4Container.setAttribute("aria-hidden", "false");
    }

    hideIntroPart3();

    if (!lottie4Container || typeof lottie === "undefined") {
      return;
    }

    if (isPart4Ready && lottieAnimation4) {
      lottieAnimation4.goToAndStop(0, true);
      startPart4Playback();
      return;
    }

    initIntroPart4(startPart4Playback);
  }

  function playIntroPart3() {
    hideNextButton();
    introPhase = "part3";

    if (lottie3Container) {
      lottie3Container.classList.remove("intro-psora3-lottie-hidden", "intro-psora3-lottie-preload");
      lottie3Container.setAttribute("aria-hidden", "false");
    }

    hideIntroPart1();
    hideIntroPart2();

    if (!lottie3Container || typeof lottie === "undefined") {
      return;
    }

    if (isPart3Ready && lottieAnimation3) {
      lottieAnimation3.goToAndStop(0, true);
      startPart3Playback();
      return;
    }

    initIntroPart3(startPart3Playback);
  }

  function playIntroFromStart() {
    hideStartButton();
    hideNextButton();
    pendingPlay = false;
    resetIntroLayers();

    if (!lottieAnimation) {
      return;
    }

    introPhase = "part1";
    playAnimationOnce(lottieAnimation);
  }

  function initIntroPart2() {
    if (!lottie2Container || typeof lottie === "undefined") {
      return;
    }

    if (lottieAnimation2) {
      lottieAnimation2.destroy();
      lottieAnimation2 = null;
    }

    lottie2Container.innerHTML = "";
    isPart2Ready = false;

    lottieAnimation2 = lottie.loadAnimation({
      container: lottie2Container,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: lottie2Path,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid meet",
      },
    });

    lottieAnimation2.addEventListener("DOMLoaded", function () {
      applyIntroLottieLayout(lottie2Container, "fit");
      resizeIntroLottie(lottieAnimation2);
      isPart2Ready = true;
      lottieAnimation2.goToAndStop(0, true);
    });

    lottieAnimation2.addEventListener("complete", function () {
      if (introPhase !== "part2") {
        return;
      }

      introPhase = "part2-done";
      pauseAtLastFrame(lottieAnimation2);
      preloadIntroPart3();
      showNextButton();
    });
  }

  function initIntroPart3(onReady) {
    if (!lottie3Container || typeof lottie === "undefined") {
      return;
    }

    if (lottieAnimation3) {
      lottieAnimation3.destroy();
      lottieAnimation3 = null;
    }

    lottie3Container.innerHTML = "";
    isPart3Ready = false;

    lottieAnimation3 = lottie.loadAnimation({
      container: lottie3Container,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: lottie3Path,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid meet",
      },
    });

    lottieAnimation3.addEventListener("data_failed", function () {
      introPhase = "part2-done";
      showNextButton();
    });

    lottieAnimation3.addEventListener("DOMLoaded", function () {
      applyIntroLottieLayout(lottie3Container, "fit");
      resizeIntroLottie(lottieAnimation3);
      isPart3Ready = true;
      lottieAnimation3.goToAndStop(0, true);

      if (typeof onReady === "function") {
        onReady();
      }
    });

    lottieAnimation3.addEventListener("complete", function () {
      if (introPhase !== "part3") {
        return;
      }

      introPhase = "part3-done";
      pauseAtLastFrame(lottieAnimation3);
      preloadIntroPart4();
      showNextButton();
    });
  }

  function initIntroPart4(onReady) {
    if (!lottie4Container || typeof lottie === "undefined") {
      return;
    }

    if (lottieAnimation4) {
      lottieAnimation4.destroy();
      lottieAnimation4 = null;
    }

    lottie4Container.innerHTML = "";
    isPart4Ready = false;

    lottieAnimation4 = lottie.loadAnimation({
      container: lottie4Container,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: lottie4Path,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid meet",
      },
    });

    lottieAnimation4.addEventListener("data_failed", function () {
      introPhase = "part3-done";
      showNextButton();
    });

    lottieAnimation4.addEventListener("DOMLoaded", function () {
      applyIntroLottieLayout(lottie4Container, "fit");
      resizeIntroLottie(lottieAnimation4);
      isPart4Ready = true;
      lottieAnimation4.goToAndStop(0, true);

      if (typeof onReady === "function") {
        onReady();
      }
    });

    lottieAnimation4.addEventListener("complete", function () {
      if (introPhase !== "part4") {
        return;
      }

      pauseAtLastFrame(lottieAnimation4);
      showSkinCreamScene();
    });
  }

  function preloadIntroPart5() {
    if (!lottie5Container || typeof lottie === "undefined") {
      return;
    }

    if (isPart5Ready || lottieAnimation5) {
      return;
    }

    lottie5Container.classList.remove("intro-psora5-lottie-hidden");
    lottie5Container.classList.add("intro-psora5-lottie-preload");
    lottie5Container.setAttribute("aria-hidden", "true");

    initIntroPart5();
  }

  function startPart5Playback() {
    if (!lottieAnimation5 || !isPart5Ready) {
      return;
    }

    if (prefersReducedMotion) {
      pauseAtLastFrame(lottieAnimation5);
      introPhase = "part5-done";
      preloadIntroPart6();
      showIntroShineLayer();
      showNextButton();
      return;
    }

    applyIntroLottieLayout(lottie5Container, "fit");
    resizeIntroLottie(lottieAnimation5);
    preloadIntroPart6();
    playAnimationOnce(lottieAnimation5);
  }

  function playIntroPart5() {
    hideCreamNextButton();
    hideSkinCreamScene();
    hideIntroShineLayer();
    introPhase = "part5";

    if (lottie5Container) {
      lottie5Container.classList.remove("intro-psora5-lottie-hidden", "intro-psora5-lottie-preload");
      lottie5Container.setAttribute("aria-hidden", "false");
    }

    if (!lottie5Container || typeof lottie === "undefined") {
      return;
    }

    if (isPart5Ready && lottieAnimation5) {
      lottieAnimation5.goToAndStop(0, true);
      startPart5Playback();
      return;
    }

    initIntroPart5(startPart5Playback);
  }

  function initIntroPart5(onReady) {
    if (!lottie5Container || typeof lottie === "undefined") {
      return;
    }

    if (lottieAnimation5) {
      lottieAnimation5.destroy();
      lottieAnimation5 = null;
    }

    lottie5Container.innerHTML = "";
    isPart5Ready = false;

    lottieAnimation5 = lottie.loadAnimation({
      container: lottie5Container,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: lottie5Path,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid meet",
      },
    });

    lottieAnimation5.addEventListener("data_failed", function () {
      introPhase = "skin-cream";
      showCreamNextButton();
    });

    lottieAnimation5.addEventListener("DOMLoaded", function () {
      applyIntroLottieLayout(lottie5Container, "fit");
      resizeIntroLottie(lottieAnimation5);
      isPart5Ready = true;
      lottieAnimation5.goToAndStop(0, true);

      if (typeof onReady === "function") {
        onReady();
      }
    });

    lottieAnimation5.addEventListener("complete", function () {
      if (introPhase !== "part5") {
        return;
      }

      introPhase = "part5-done";
      pauseAtLastFrame(lottieAnimation5);
      preloadIntroPart6();
      showIntroShineLayer();
      showNextButton();
    });
  }

  function preloadIntroPart6() {
    if (!lottie6Container || typeof lottie === "undefined") {
      return;
    }

    if (isPart6Ready || lottieAnimation6) {
      return;
    }

    lottie6Container.classList.remove("intro-psora6-lottie-hidden");
    lottie6Container.classList.add("intro-psora6-lottie-preload");
    lottie6Container.setAttribute("aria-hidden", "true");

    initIntroPart6();
  }

  function startPart6Playback() {
    if (!lottieAnimation6 || !isPart6Ready) {
      return;
    }

    if (prefersReducedMotion) {
      pauseAtLastFrame(lottieAnimation6);
      introPhase = "part6-done";
      return;
    }

    applyIntroLottieLayout(lottie6Container, "fit");
    resizeIntroLottie(lottieAnimation6);
    playAnimationOnce(lottieAnimation6);
  }

  function playIntroPart6() {
    hideNextButton();
    hideIntroShineLayer();
    introPhase = "part6";

    if (lottie6Container) {
      lottie6Container.classList.remove("intro-psora6-lottie-hidden", "intro-psora6-lottie-preload");
      lottie6Container.setAttribute("aria-hidden", "false");
    }

    hideIntroPart5();

    if (!lottie6Container || typeof lottie === "undefined") {
      return;
    }

    if (isPart6Ready && lottieAnimation6) {
      lottieAnimation6.goToAndStop(0, true);
      startPart6Playback();
      return;
    }

    initIntroPart6(startPart6Playback);
  }

  function initIntroPart6(onReady) {
    if (!lottie6Container || typeof lottie === "undefined") {
      return;
    }

    if (lottieAnimation6) {
      lottieAnimation6.destroy();
      lottieAnimation6 = null;
    }

    lottie6Container.innerHTML = "";
    isPart6Ready = false;

    lottieAnimation6 = lottie.loadAnimation({
      container: lottie6Container,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: lottie6Path,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid meet",
      },
    });

    lottieAnimation6.addEventListener("data_failed", function () {
      introPhase = "part5-done";
      showIntroShineLayer();
      showNextButton();
    });

    lottieAnimation6.addEventListener("DOMLoaded", function () {
      applyIntroLottieLayout(lottie6Container, "fit");
      resizeIntroLottie(lottieAnimation6);
      isPart6Ready = true;
      lottieAnimation6.goToAndStop(0, true);

      if (typeof onReady === "function") {
        onReady();
      }
    });

    lottieAnimation6.addEventListener("complete", function () {
      if (introPhase !== "part6") {
        return;
      }

      introPhase = "part6-done";
      pauseAtLastFrame(lottieAnimation6);
    });
  }

  function initIntroExperience() {
    destroyIntroExperience();
    isAnimationReady = false;
    isPart2Ready = false;
    isPart3Ready = false;
    isPart4Ready = false;
    isPart5Ready = false;
    isPart6Ready = false;
    resetIntroLayers();

    if (!pendingPlay) {
      showStartButton();
    } else {
      hideStartButton();
    }

    if (typeof lottie === "undefined") {
      showFallback("Missing Lottie library.");
      return;
    }

    lottieAnimation = lottie.loadAnimation({
      container: lottieContainer,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: lottiePath,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid meet",
      },
    });

    lottieAnimation.addEventListener("data_failed", function () {
      showFallback("Could not load intro_psora.json");
    });

    lottieAnimation.addEventListener("DOMLoaded", function onDomLoaded() {
      applyIntroLottieLayout(lottieContainer, "fit");
      resizeIntroLottie(lottieAnimation);

      isAnimationReady = true;
      updateJourneyButtonDisabled();
      lottieAnimation.goToAndStop(0, true);
      initIntroPart2();

      if (pendingSkipToPart2) {
        pendingSkipToPart2 = false;
        skipToPart2Done();
        return;
      }

      if (prefersReducedMotion) {
        hideStartButton();
        pauseAtLastFrame(lottieAnimation);
        if (lottieAnimation2 && isPart2Ready) {
          if (lottieContainer) {
            lottieContainer.classList.add("intro-psora-lottie-hidden");
          }
          if (lottie2Container) {
            lottie2Container.classList.remove("intro-psora2-lottie-hidden");
            lottie2Container.setAttribute("aria-hidden", "false");
          }
          pauseAtLastFrame(lottieAnimation2);
        }
        introPhase = "part2-done";
        showNextButton();
        return;
      }

      if (pendingPlay) {
        playIntroFromStart();
      }
    });

    lottieAnimation.addEventListener("complete", function () {
      if (introPhase !== "part1") {
        return;
      }

      playIntroPart2();
    });
  }

  function destroyIntroExperience() {
    if (lottieAnimation) {
      lottieAnimation.destroy();
      lottieAnimation = null;
    }

    if (lottieAnimation2) {
      lottieAnimation2.destroy();
      lottieAnimation2 = null;
    }

    if (lottieAnimation3) {
      lottieAnimation3.destroy();
      lottieAnimation3 = null;
    }

    if (lottieAnimation4) {
      lottieAnimation4.destroy();
      lottieAnimation4 = null;
    }

    if (lottieAnimation5) {
      lottieAnimation5.destroy();
      lottieAnimation5 = null;
    }

    if (lottieAnimation6) {
      lottieAnimation6.destroy();
      lottieAnimation6 = null;
    }

    lottieContainer.innerHTML = "";
    lottieContainer.classList.remove("intro-psora-lottie-pending", "intro-psora-lottie-hidden");

    if (lottie2Container) {
      lottie2Container.innerHTML = "";
      lottie2Container.classList.add("intro-psora2-lottie-hidden");
      lottie2Container.setAttribute("aria-hidden", "true");
    }

    if (lottie3Container) {
      lottie3Container.innerHTML = "";
      lottie3Container.classList.add("intro-psora3-lottie-hidden");
      lottie3Container.classList.remove("intro-psora3-lottie-preload");
      lottie3Container.setAttribute("aria-hidden", "true");
    }

    if (lottie4Container) {
      lottie4Container.innerHTML = "";
      lottie4Container.classList.add("intro-psora4-lottie-hidden");
      lottie4Container.classList.remove("intro-psora4-lottie-preload");
      lottie4Container.setAttribute("aria-hidden", "true");
    }

    if (lottie5Container) {
      lottie5Container.innerHTML = "";
      lottie5Container.classList.add("intro-psora5-lottie-hidden");
      lottie5Container.classList.remove("intro-psora5-lottie-preload");
      lottie5Container.setAttribute("aria-hidden", "true");
    }

    if (lottie6Container) {
      lottie6Container.innerHTML = "";
      lottie6Container.classList.add("intro-psora6-lottie-hidden");
      lottie6Container.classList.remove("intro-psora6-lottie-preload");
      lottie6Container.setAttribute("aria-hidden", "true");
    }

    isAnimationReady = false;
    isPart2Ready = false;
    isPart3Ready = false;
    isPart4Ready = false;
    isPart5Ready = false;
    isPart6Ready = false;
    introPhase = "idle";
    hideNextButton();
    hideCreamNextButton();
    hideIntroShineLayer();
    updateJourneyButtonDisabled();

    hideSkinCreamScene();

    if (fallback) {
      fallback.hidden = true;
    }
  }

  function showFallback(message) {
    if (fallback) {
      fallback.hidden = false;
      if (message) {
        fallback.querySelector("p").textContent = message;
      }
    }
    hideStartButton();
    hideNextButton();
  }

  window.IntroPsora = {
    open: openModal,
    close: closeModal,
  };

  if (isTestCreamMode()) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", openModal);
    } else {
      openModal();
    }
  }
})();
