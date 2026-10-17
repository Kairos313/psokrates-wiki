/* ==========================================================================
   Sidebar — Lottie column + section labels
   ========================================================================== */

(function () {
  'use strict';

  var sidebar = document.getElementById('toc-sidebar');
  if (!sidebar) return;

  var links = sidebar.querySelectorAll('.toc-link');
  var railFill = sidebar.querySelector('.toc-rail-fill');
  var lottieColumnEl = document.getElementById('toc-lottie-column');
  var lottieColumn = null;
  if (!links.length) return;

  /* ========================================================================
     MANUAL TUNING
     Section labels follow scroll (below). The column Lottie uses
     LOTTIE_MILESTONES — change those numbers if the label timing feels right
     but the column animation looks too early or too late.

     Milestone scroll anchors are the section starts:
       History            → 25%
       Patients' Voices   → 50%
       Current Treatment  → 100%

     Lottie file: static/sidebar/sidebar_column.json (~500 frames, 5 s)
     Frame at 25% ≈ frame 125 · at 50% ≈ 250 · at 100% ≈ 499

     Or set USE_LOTTIE_FRAMES = true and edit LOTTIE_FRAMES directly.
     ======================================================================== */

  var LOTTIE_MILESTONES = {
    intro: 0,
    history: 35,
    patients: 57,
    treatment: 100
  };

  var USE_LOTTIE_FRAMES = false;

  var LOTTIE_FRAMES = {
    intro: 0,
    history: 125,
    patients: 250,
    treatment: 499
  };

  var sectionOrder = [
    'home-psoriasis-scroll',
    'test-heritage-scroll',
    'home-socrates-scroll',
    'test-teams-scroll'
  ];

  var sectionMap = sectionOrder
    .map(function (id) {
      var el = document.getElementById(id);
      var link = sidebar.querySelector('.toc-link[href="#' + id + '"]');
      if (!el || !link) return null;
      return { id: id, el: el, link: link };
    })
    .filter(Boolean);

  if (!sectionMap.length) return;

  if (lottieColumnEl && window.lottie) {
    lottieColumn = window.lottie.loadAnimation({
      container: lottieColumnEl,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: lottieColumnEl.getAttribute('data-lottie-path')
    });
  }

  var currentId = null;
  var activeTextTimeout = null;
  var lottieReady = false;

  function getScrollTriggerFor(el) {
    if (typeof ScrollTrigger === 'undefined' || !el) return null;

    var triggers = ScrollTrigger.getAll();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].trigger === el) {
        return triggers[i];
      }
    }

    return null;
  }

  function getAbsoluteTop(el) {
    if (!el) return 0;
    return el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset);
  }

  function getSectionStart(el, st) {
    if (st && st.start >= 0) return st.start;
    if (!el) return 0;

    return typeof el.offsetTop === 'number' ? el.offsetTop : getAbsoluteTop(el);
  }

  function lerp(a, b, t) {
    return a + (b - a) * Math.min(1, Math.max(0, t));
  }

  function segmentT(value, start, end) {
    if (end <= start) return value >= start ? 1 : 0;
    return Math.min(1, Math.max(0, (value - start) / (end - start)));
  }

  function getScrollBounds() {
    var heritageEl = document.getElementById('test-heritage-scroll');
    var heritageST = getScrollTriggerFor(heritageEl);
    var historyStart = getSectionStart(heritageEl, heritageST);
    var pinEnd =
      heritageST && heritageST.end >= 0
        ? heritageST.end
        : historyStart + window.innerHeight;

    var socratesFrac =
      typeof window.__HOME_MERGED_SOCRATES_START === 'number'
        ? window.__HOME_MERGED_SOCRATES_START
        : 0.36;

    var socratesStart = historyStart + (pinEnd - historyStart) * socratesFrac;

    // Treatments are normal flow after the pin — use real section offset.
    var teamsEl = document.getElementById('test-teams-scroll');
    var teamsStart;
    if (
      teamsEl &&
      (teamsEl.classList.contains('test-teams-page--flow') ||
        window.__HOME_MERGED_TREATMENTS_START == null)
    ) {
      teamsStart = teamsEl.getBoundingClientRect().top + window.pageYOffset;
    } else {
      var treatmentsFrac =
        typeof window.__HOME_MERGED_TREATMENTS_START === 'number'
          ? window.__HOME_MERGED_TREATMENTS_START
          : 0.68;
      teamsStart = historyStart + (pinEnd - historyStart) * treatmentsFrac;
    }

    return {
      heritageST: heritageST,
      historyStart: historyStart,
      socratesStart: socratesStart,
      teamsStart: teamsStart
    };
  }

  function getSectionIndex(scrollY, bounds) {
    if (scrollY < bounds.historyStart) {
      return 0;
    }

    if (scrollY < bounds.socratesStart) {
      return 1;
    }

    if (scrollY < bounds.teamsStart) {
      return 2;
    }

    return 3;
  }

  function lottieTargets() {
    if (USE_LOTTIE_FRAMES) {
      return [
        LOTTIE_FRAMES.intro,
        LOTTIE_FRAMES.history,
        LOTTIE_FRAMES.patients,
        LOTTIE_FRAMES.treatment
      ];
    }

    return [
      LOTTIE_MILESTONES.intro,
      LOTTIE_MILESTONES.history,
      LOTTIE_MILESTONES.patients,
      LOTTIE_MILESTONES.treatment
    ];
  }

  function computeLottiePct(scrollY, bounds) {
    var targets = lottieTargets();

    if (scrollY < bounds.historyStart) {
      return lerp(targets[0], targets[1], segmentT(scrollY, 0, bounds.historyStart));
    }

    if (scrollY < bounds.socratesStart) {
      return lerp(
        targets[1],
        targets[2],
        segmentT(scrollY, bounds.historyStart, bounds.socratesStart)
      );
    }

    if (scrollY < bounds.teamsStart) {
      return lerp(
        targets[2],
        targets[3],
        segmentT(scrollY, bounds.socratesStart, bounds.teamsStart)
      );
    }

    return targets[3];
  }

  function lottieValueToFrame(value) {
    if (!lottieColumn || !lottieReady) return 0;

    var startFrame = lottieColumn.firstFrame || 0;
    var endFrame = (lottieColumn.totalFrames || 1) - 1;

    if (USE_LOTTIE_FRAMES) {
      return Math.min(endFrame, Math.max(startFrame, value));
    }

    var clamped = Math.min(100, Math.max(0, value));
    return startFrame + (endFrame - startFrame) * (clamped / 100);
  }

  function activate(id) {
    if (id === currentId) return;
    currentId = id;
    sidebar.classList.add('section-label-visible');

    if (activeTextTimeout) {
      clearTimeout(activeTextTimeout);
    }

    activeTextTimeout = setTimeout(function () {
      sidebar.classList.remove('section-label-visible');
      activeTextTimeout = null;
    }, 2000);

    var activeIndex = -1;
    for (var i = 0; i < sectionMap.length; i++) {
      if (sectionMap[i].id === id) {
        activeIndex = i;
        break;
      }
    }

    links.forEach(function (a, idx) {
      var isActive = a.getAttribute('href') === '#' + id;
      a.classList.toggle('active', isActive);

      if (activeIndex >= 0 && idx < activeIndex) {
        a.classList.add('visited');
      } else {
        a.classList.remove('visited');
      }
    });
  }

  function updateProgress() {
    var scrollY = window.scrollY || document.documentElement.scrollTop;
    var bounds = getScrollBounds();
    var idx = getSectionIndex(scrollY, bounds);
    var lottiePct = computeLottiePct(scrollY, bounds);

    activate(sectionMap[idx].id);

    if (railFill) {
      if (USE_LOTTIE_FRAMES && lottieColumn && lottieReady) {
        var endFrame = (lottieColumn.totalFrames || 1) - 1;
        railFill.style.height = (lottiePct / endFrame) * 100 + '%';
      } else {
        railFill.style.height = lottiePct + '%';
      }
    }

    if (lottieColumn && lottieReady) {
      lottieColumn.goToAndStop(lottieValueToFrame(lottiePct), true);
    }
  }

  var textHideTimeout = null;

  function showText() {
    sidebar.classList.add('scrolling');
    if (textHideTimeout) {
      clearTimeout(textHideTimeout);
      textHideTimeout = null;
    }
  }

  function hideText() {
    sidebar.classList.remove('scrolling');
  }

  function scheduleTextHide() {
    if (textHideTimeout) clearTimeout(textHideTimeout);
    textHideTimeout = setTimeout(function () {
      hideText();
      textHideTimeout = null;
    }, 1000);
  }

  var ticking = false;
  window.addEventListener(
    'scroll',
    function () {
      showText();
      scheduleTextHide();

      if (!ticking) {
        requestAnimationFrame(function () {
          updateProgress();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );

  window.addEventListener('resize', function () {
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
    updateProgress();
  });

  function onLottieReady() {
    lottieReady = true;
    updateProgress();
  }

  if (lottieColumn) {
    lottieColumn.addEventListener('DOMLoaded', onLottieReady);
    lottieColumn.addEventListener('data_ready', onLottieReady);
    lottieColumn.addEventListener('config_ready', onLottieReady);
  }

  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      var id = href.substring(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();

      var nav = document.querySelector('.top-nav');
      var navHeight = nav ? nav.offsetHeight : 80;
      var offset = navHeight + 30;
      var targetPosition;

      if (id === 'home-socrates-scroll' && window.__HOME_MERGED_SCROLL) {
        var bounds = getScrollBounds();
        targetPosition = bounds.socratesStart - offset;
      } else {
        targetPosition =
          target.getBoundingClientRect().top + window.pageYOffset - offset;
      }

      window.scrollTo({
        top: Math.max(0, targetPosition),
        behavior: 'smooth'
      });

      history.pushState(null, '', href);
    });
  });

  function initAfterScrollTriggers() {
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
    updateProgress();
  }

  activate(sectionMap[0].id);
  requestAnimationFrame(function () {
    requestAnimationFrame(initAfterScrollTriggers);
  });
  window.addEventListener('load', initAfterScrollTriggers);
})();
