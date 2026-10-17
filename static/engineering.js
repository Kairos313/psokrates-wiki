/**
 * Engineering Cycle
 *
 * Edit SECTIONS to replace placeholder copy.
 * Each cycle has four phases (design / build / test / learn).
 * Only a right-scroll (trackpad swipe right, or Shift + wheel) scrubs cycle.json.
 * A normal downward scroll leaves the cycle alone and goes on to IHP / Education.
 *   0.00s → 0.50s  Design fades in
 *   0.50s → 3.11s  Design holds, then fades out
 *   3.11s          Build
 *   4.77s          Test
 *   6.47s          Learn
 * further right-scroll → next sub-topic (next cycle)
 */
(function () {
  var CYCLE_SECONDS = 8;
  var FPS = 100;
  var CYCLE_PX = 900;
  var INTRO_PX = 140;
  var NAV = 64;
  var FADE = 0.22;
  var HOLD_IN = 0.25;

  var PHASES = [
    { key: "design", appear: 0.5, disappear: 3.11 },
    { key: "build", appear: 3.11, disappear: 4.77 },
    { key: "test", appear: 4.77, disappear: 6.47 },
    { key: "learn", appear: 6.47, disappear: 8 },
  ];

  var PLACEHOLDER = {
    design: "",
    build: "",
    test: "",
    learn: "",
  };

  function cycle(title) {
    return { title: title, phases: PLACEHOLDER };
  }

  var LAB_TOPICS = [
    {
      title: "Fusion peptide elements",
      cycles: [
        cycle("IL1 receptor antagonist"),
        cycle("fusion peptide"),
        cycle("REX binder + a-MSH (based on literature) → dry lab/lit"),
        cycle("Short peptide + LKEKK"),
      ],
    },
    {
      title: "Broad-spectrum immunomodulator",
      cycles: [cycle("Cycle 1")],
    },
    {
      title: "Validation protocol",
      cycles: [cycle("Cycle 1")],
    },
    {
      title: "Bacteria choice",
      cycles: [cycle("Cycle 1")],
    },
    {
      title: "Kill Switch",
      cycles: [cycle("Cycle 1")],
    },
  ];

  var SECTIONS = {
    lab: { topics: LAB_TOPICS },
    ihp: { topics: JSON.parse(JSON.stringify(LAB_TOPICS)) },
    drylab: {
      topics: window.DRYLAB_ENGINEERING || JSON.parse(JSON.stringify(LAB_TOPICS)),
    },
    education: {
      topics: window.EDUCATION_ENGINEERING || JSON.parse(JSON.stringify(LAB_TOPICS)),
    },
  };

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ordinal(n) {
    var v = n % 100;
    var suffix = "th";
    if (v < 11 || v > 13) {
      if (n % 10 === 1) suffix = "st";
      else if (n % 10 === 2) suffix = "nd";
      else if (n % 10 === 3) suffix = "rd";
    }
    return n + suffix + " cycle";
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function phaseOpacity(time, appear, disappear) {
    var fadeInStart = appear === PHASES[0].appear ? 0 : appear;
    var fadeInEnd = appear;
    var fadeOutStart = Math.max(appear, disappear - FADE);
    var fadeOutEnd = disappear;

    if (time < fadeInStart) return 0;
    if (time < fadeInEnd) return (time - fadeInStart) / (fadeInEnd - fadeInStart);
    if (time < fadeOutStart) return 1;
    if (time < fadeOutEnd) return 1 - (time - fadeOutStart) / (fadeOutEnd - fadeOutStart);
    return 0;
  }

  function flatten(topics) {
    var items = [];
    var t;
    var c;
    for (t = 0; t < topics.length; t++) {
      if (topics[t].intro) {
        items.push({
          kind: "intro",
          topicIndex: t,
          topic: topics[t],
        });
      }
      for (c = 0; c < topics[t].cycles.length; c++) {
        items.push({
          kind: "cycle",
          topicIndex: t,
          cycleIndex: c,
          topic: topics[t],
          cycle: topics[t].cycles[c],
        });
      }
    }
    return items;
  }

  function paragraphsOf(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }

  function fillBody(el, value, hmw) {
    if (!el) return;
    el.replaceChildren();
    var parts = paragraphsOf(value);
    var i;
    for (i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var p = document.createElement("p");
      p.textContent = parts[i];
      el.appendChild(p);
    }
    if (hmw) {
      var call = document.createElement("p");
      call.className = "eng-hmw";
      call.textContent = hmw;
      el.appendChild(call);
    }
  }

  function buildSidebar(nav, topics, items) {
    nav.innerHTML = "";
    var t;
    for (t = 0; t < topics.length; t++) {
      var topic = topics[t];
      var wrap = document.createElement("div");
      wrap.className = "eng-topic" + (t === 0 ? " is-current" : "");
      wrap.setAttribute("data-topic", String(t));

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "eng-topic-btn";
      btn.setAttribute("aria-expanded", "false");
      btn.innerHTML =
        '<span class="eng-topic-chevron" aria-hidden="true"></span>' +
        '<span class="eng-topic-label"></span>';
      btn.querySelector(".eng-topic-label").textContent = topic.title;

      var list = document.createElement("ul");
      list.className = "eng-sublist";

      var i;
      for (i = 0; i < items.length; i++) {
        if (items[i].topicIndex !== t) continue;
        var li = document.createElement("li");
        var sub = document.createElement("button");
        sub.type = "button";
        sub.className = "eng-sub-btn";
        sub.setAttribute("data-flat", String(i));
        if (items[i].kind === "intro") {
          sub.textContent = "Why this theme";
        } else {
          sub.textContent = items[i].cycleIndex + 1 + ". " + items[i].cycle.title;
        }
        li.appendChild(sub);
        list.appendChild(li);
      }

      wrap.appendChild(btn);
      wrap.appendChild(list);
      nav.appendChild(wrap);
    }
  }

  function horizontalDelta(event) {
    var dx = event.deltaX;
    var dy = event.deltaY;
    if (event.shiftKey && Math.abs(dy) >= Math.abs(dx)) {
      dx = dy;
    }
    if (event.deltaMode === 1) {
      dx *= 16;
    } else if (event.deltaMode === 2) {
      dx *= CYCLE_PX;
    }
    return dx;
  }

  function isRightScroll(event) {
    if (event.shiftKey) return true;
    return Math.abs(event.deltaX) > Math.abs(event.deltaY);
  }

  function createController(root) {
    var id = root.getAttribute("data-eng-section");
    var data = SECTIONS[id];
    if (!data) return null;

    var stage = root.querySelector(".eng-stage");
    var nav = root.querySelector(".eng-sidebar");
    var lottieEl = root.querySelector(".eng-lottie");
    var progressEl = root.querySelector(".eng-progress");
    var progressFill = root.querySelector(".eng-progress-fill");
    var progressLabel = root.querySelector(".eng-progress-label");
    var progressCaption = root.querySelector(".eng-progress-caption");
    var titleEl = root.querySelector(".eng-head-title");
    var cycleEl = root.querySelector(".eng-head-cycle");
    var nextBtn = root.querySelector(".eng-step-next");
    var prevBtn = root.querySelector(".eng-step-prev");
    var phaseEls = {};
    var bodyEls = {};
    var i;
    for (i = 0; i < PHASES.length; i++) {
      var article = root.querySelector('.eng-phase[data-phase="' + PHASES[i].key + '"]');
      phaseEls[PHASES[i].key] = article;
      bodyEls[PHASES[i].key] = article ? article.querySelector(".eng-phase-body") : null;
    }

    var introEl = root.querySelector('.eng-phase[data-phase="intro"]');
    var introBody = introEl ? introEl.querySelector(".eng-phase-body") : null;
    var items = flatten(data.topics);
    var starts = [];
    var total = 0;
    var spanI;
    for (spanI = 0; spanI < items.length; spanI++) {
      starts.push(total);
      total += items[spanI].kind === "intro" ? INTRO_PX / CYCLE_PX : 1;
    }
    if (total <= 0) total = 1;
    var progress = 0;

    function spanOf(index) {
      if (!items[index]) return 1;
      return items[index].kind === "intro" ? INTRO_PX / CYCLE_PX : 1;
    }

    function locate(value) {
      var i;
      for (i = items.length - 1; i >= 0; i--) {
        if (value + 0.000001 >= starts[i]) {
          var span = spanOf(i);
          var local = items[i].kind === "intro" ? 0 : ((value - starts[i]) / span) * CYCLE_SECONDS;
          return { flat: i, local: local };
        }
      }
      return { flat: 0, local: 0 };
    }
    var anim = null;
    var lastFrame = -1;
    var lastView = "";
    var lastFilled = -1;
    var touchX = null;
    var touchY = null;

    buildSidebar(nav, data.topics, items);

    if (typeof lottie !== "undefined" && lottieEl) {
      anim = lottie.loadAnimation({
        container: lottieEl,
        renderer: "svg",
        loop: false,
        autoplay: false,
        path: lottieEl.getAttribute("data-lottie-path"),
        rendererSettings: { preserveAspectRatio: "xMidYMid slice" },
      });
      anim.addEventListener("DOMLoaded", function () {
        var svg = lottieEl.querySelector("svg");
        if (svg) {
          svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
        }
        anim.goToAndStop(0, true);
      });
    }

    var lastSidebarFlat = -1;

    function setSidebar(topicIndex, flatIndex) {
      var topics = nav.querySelectorAll(".eng-topic");
      var t;
      for (t = 0; t < topics.length; t++) {
        var current = t === topicIndex;
        topics[t].classList.toggle("is-current", current);
        var btn = topics[t].querySelector(".eng-topic-btn");
        var expanded = current || topics[t].classList.contains("is-open");
        if (!expanded) {
          try {
            expanded = topics[t].matches(":hover, :focus-within");
          } catch (err) {
            expanded = false;
          }
        }
        if (btn) btn.setAttribute("aria-expanded", expanded ? "true" : "false");
      }
      var subs = nav.querySelectorAll(".eng-sub-btn");
      var active = null;
      var s;
      for (s = 0; s < subs.length; s++) {
        var on = Number(subs[s].getAttribute("data-flat")) === flatIndex;
        subs[s].classList.toggle("is-active", on);
        if (on) active = subs[s];
      }
      if (active && flatIndex !== lastSidebarFlat) {
        lastSidebarFlat = flatIndex;
        var navBox = nav.getBoundingClientRect();
        var box = active.getBoundingClientRect();
        if (box.top < navBox.top) nav.scrollTop -= navBox.top - box.top + 8;
        else if (box.bottom > navBox.bottom) nav.scrollTop += box.bottom - navBox.bottom + 8;
      }
    }

    function phaseHoldTime(phaseIndex) {
      var appear = PHASES[phaseIndex].appear;
      var disappear = PHASES[phaseIndex].disappear;
      var holdStart = appear + HOLD_IN;
      var holdEnd = disappear - FADE;
      if (holdEnd <= holdStart) {
        return appear + 0.05;
      }
      return holdStart;
    }

    function currentPhaseIndex(localTime) {
      var i;
      for (i = PHASES.length - 1; i >= 0; i--) {
        if (localTime >= PHASES[i].appear) {
          return i;
        }
      }
      return -1;
    }

    function updateStepper(flat, localTime) {
      var item = items[flat];
      var phase = item && item.kind === "intro" ? 0 : currentPhaseIndex(localTime);
      if (prevBtn) {
        prevBtn.disabled = flat <= 0 && (item && item.kind === "intro" ? true : phase < 0);
      }
      if (nextBtn) {
        nextBtn.disabled = flat >= items.length - 1 && phase >= PHASES.length - 1 && !(item && item.kind === "intro");
      }
    }

    function landingTime(flat) {
      var item = items[flat];
      if (!item || item.kind === "intro") return 0;
      return phaseHoldTime(0);
    }

    function goToPhase(flat, phaseIndex) {
      if (items[flat] && items[flat].kind === "intro") {
        if (phaseIndex > 0) {
          if (flat >= items.length - 1) return;
          jumpToFlat(flat + 1, landingTime(flat + 1));
        } else if (phaseIndex < 0) {
          if (flat <= 0) return;
          var prev = items[flat - 1];
          jumpToFlat(flat - 1, prev && prev.kind === "intro" ? 0 : phaseHoldTime(PHASES.length - 1));
        }
        return;
      }
      if (phaseIndex >= PHASES.length) {
        if (flat >= items.length - 1) return;
        jumpToFlat(flat + 1, landingTime(flat + 1));
        return;
      }
      if (phaseIndex < 0) {
        if (flat <= 0) {
          jumpToFlat(0, 0);
          return;
        }
        var previous = items[flat - 1];
        jumpToFlat(flat - 1, previous && previous.kind === "intro" ? 0 : phaseHoldTime(PHASES.length - 1));
        return;
      }
      jumpToFlat(flat, phaseHoldTime(phaseIndex));
    }

    function themeFraction(item, localTime) {
      var cycles = item.topic.cycles ? item.topic.cycles.length : 0;
      if (!cycles || item.kind === "intro") return 0;

      var steps = cycles * PHASES.length;
      var phaseIndex = currentPhaseIndex(localTime);
      if (phaseIndex < 0 || localTime < PHASES[0].appear) {
        phaseIndex = 0;
      }
      if (item.cycleIndex === cycles - 1 && phaseIndex === PHASES.length - 1) {
        return 1;
      }

      var start = phaseIndex === 0 ? 0 : PHASES[phaseIndex].appear;
      var end = phaseIndex < PHASES.length - 1 ? PHASES[phaseIndex + 1].appear : CYCLE_SECONDS;
      var frac = end > start ? clamp((localTime - start) / (end - start), 0, 1) : 0;
      if (localTime < PHASES[0].appear) frac = 0;
      return clamp((item.cycleIndex * PHASES.length + phaseIndex + frac) / steps, 0, 1);
    }

    function setThemeProgress(item, localTime) {
      if (!progressEl) return;
      var fraction = themeFraction(item, localTime);
      var percent = Math.round(fraction * 100);
      if (progressFill) progressFill.style.width = percent + "%";
      if (progressLabel) progressLabel.textContent = percent + "%";
      progressEl.setAttribute("aria-valuenow", String(percent));
    }

    function showPhase(el, opacity) {
      if (!el) return;
      el.style.opacity = String(opacity);
      el.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
    }

    function apply(flatIndex, localTime) {
      var item = items[clamp(flatIndex, 0, items.length - 1)];
      titleEl.textContent = item.topic.title;
      var viewKey = item.kind === "intro" ? "intro-" + flatIndex : flatIndex + "-" + currentPhaseIndex(localTime);
      var activePhase = currentPhaseIndex(localTime);
      if (activePhase < 0) activePhase = 0;

      if (item.kind === "intro") {
        cycleEl.textContent = "Why this theme";
        showPhase(introEl, 1);
        if (lastFilled !== flatIndex) {
          fillBody(introBody, item.topic.intro, "");
          lastFilled = flatIndex;
        }
        var pHide;
        for (pHide = 0; pHide < PHASES.length; pHide++) {
          showPhase(phaseEls[PHASES[pHide].key], 0);
        }
      } else {
        cycleEl.textContent = ordinal(item.cycleIndex + 1) + (item.cycle.title ? " — " + item.cycle.title : "");
        showPhase(introEl, 0);
        if (lastFilled !== flatIndex) {
          var fill;
          for (fill = 0; fill < PHASES.length; fill++) {
            var fillKey = PHASES[fill].key;
            if (bodyEls[fillKey]) {
              fillBody(bodyEls[fillKey], item.cycle.phases[fillKey], fillKey === "learn" ? item.cycle.hmw : "");
            }
          }
          lastFilled = flatIndex;
        }
        var p;
        for (p = 0; p < PHASES.length; p++) {
          var key = PHASES[p].key;
          var opacity;
          if (reduced && id !== "education") {
            opacity = key === "design" ? 1 : 0;
          } else if (reduced) {
            opacity = p === activePhase ? 1 : 0;
          } else {
            opacity = phaseOpacity(localTime, PHASES[p].appear, PHASES[p].disappear);
          }
          showPhase(phaseEls[key], opacity);
        }
      }

      if (viewKey !== lastView) {
        lastView = viewKey;
        if (introEl) introEl.scrollTop = 0;
        var reset;
        for (reset = 0; reset < PHASES.length; reset++) {
          if (phaseEls[PHASES[reset].key]) phaseEls[PHASES[reset].key].scrollTop = 0;
        }
      }

      if (progressCaption) progressCaption.textContent = cycleEl.textContent;
      setSidebar(item.topicIndex, flatIndex);
      setThemeProgress(item, item.kind === "intro" ? 0 : localTime);
      updateStepper(flatIndex, item.kind === "intro" ? PHASES[PHASES.length - 1].appear : localTime);

      if (anim && typeof anim.goToAndStop === "function") {
        var frame = item.kind === "intro" ? 0 : Math.round(clamp(localTime, 0, CYCLE_SECONDS) * FPS);
        if (frame !== lastFrame) {
          lastFrame = frame;
          anim.goToAndStop(frame, true);
        }
      }
    }

    function setProgress(next) {
      var target = clamp(next, 0, total - 0.0001);
      var from = locate(progress);
      var to = locate(target);
      var i;
      if (to.flat > from.flat) {
        for (i = from.flat + 1; i <= to.flat; i++) {
          if (items[i] && items[i].kind === "intro") {
            target = starts[i];
            to = { flat: i, local: 0 };
            break;
          }
        }
        if (items[from.flat] && items[from.flat].kind === "intro" && items[to.flat] && items[to.flat].kind !== "intro" && to.local < phaseHoldTime(0)) {
          jumpToFlat(to.flat, phaseHoldTime(0));
          return;
        }
      } else if (to.flat < from.flat) {
        for (i = from.flat - 1; i >= to.flat; i--) {
          if (items[i] && items[i].kind === "intro") {
            target = starts[i];
            to = { flat: i, local: 0 };
            break;
          }
        }
      }
      progress = target;
      apply(to.flat, reduced ? 0.5 : to.local);
    }

    function jumpToFlat(flat, time) {
      var local = typeof time === "number" ? time : 0;
      var within = items[flat] && items[flat].kind === "intro" ? 0 : (local / CYCLE_SECONDS) * spanOf(flat);
      progress = clamp((starts[flat] || 0) + within, 0, total - 0.0001);
      apply(flat, reduced ? 0.5 : local);
    }

    function goStep(direction) {
      var here = locate(progress);
      var flat = here.flat;
      if (items[flat] && items[flat].kind === "intro") {
        goToPhase(flat, direction > 0 ? 1 : -1);
        return;
      }
      goToPhase(flat, currentPhaseIndex(here.local) + direction);
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function (event) {
        event.preventDefault();
        goStep(1);
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function (event) {
        event.preventDefault();
        goStep(-1);
      });
    }

    nav.addEventListener("click", function (event) {
      var sub = event.target.closest(".eng-sub-btn");
      if (sub) {
        var flat = Number(sub.getAttribute("data-flat"));
        jumpToFlat(flat, landingTime(flat));
        return;
      }

      var topicBtn = event.target.closest(".eng-topic-btn");
      if (!topicBtn) return;
      var topicWrap = topicBtn.closest(".eng-topic");
      if (window.matchMedia("(hover: none), (pointer: coarse)").matches) {
        var willOpen = !topicWrap.classList.contains("is-open");
        var other = nav.querySelectorAll(".eng-topic");
        var o;
        for (o = 0; o < other.length; o++) {
          other[o].classList.toggle("is-open", other[o] === topicWrap && willOpen);
          var otherBtn = other[o].querySelector(".eng-topic-btn");
          if (otherBtn) {
            otherBtn.setAttribute("aria-expanded", other[o].classList.contains("is-open") ? "true" : "false");
          }
        }
        if (!willOpen) return;
      }
      var first = topicWrap.querySelector(".eng-sub-btn");
      if (first) first.click();
    });

    stage.addEventListener(
      "touchstart",
      function (event) {
        if (!event.changedTouches.length) return;
        touchX = event.changedTouches[0].clientX;
        touchY = event.changedTouches[0].clientY;
      },
      { passive: true }
    );

    stage.addEventListener(
      "touchmove",
      function (event) {
        if (reduced || touchX == null || !event.changedTouches.length) return;
        var point = event.changedTouches[0];
        var dx = touchX - point.clientX;
        var dy = touchY - point.clientY;
        touchX = point.clientX;
        touchY = point.clientY;
        var inPhase = event.target.closest && event.target.closest(".eng-phase");
        if (inPhase && Math.abs(dy) >= Math.abs(dx)) return;
        if (Math.abs(dx) < 2) return;
        event.preventDefault();
        setProgress(progress + dx / CYCLE_PX);
      },
      { passive: false }
    );

    stage.addEventListener(
      "touchend",
      function () {
        touchX = null;
      },
      { passive: true }
    );

    apply(0, 0);
    return {
      root: root,
      addDelta: function (dx) {
        setProgress(progress + dx / CYCLE_PX);
      },
    };
  }

  var controllers = [];
  var blocks = document.querySelectorAll("[data-eng-section]");
  var b;
  for (b = 0; b < blocks.length; b++) {
    var created = createController(blocks[b]);
    if (created) controllers.push(created);
  }

  document.addEventListener(
    "wheel",
    function (event) {
      if (!isRightScroll(event)) return;
      event.preventDefault();
      if (reduced) return;
      var section = event.target.closest ? event.target.closest("[data-eng-section]") : null;
      if (!section) return;
      var c;
      for (c = 0; c < controllers.length; c++) {
        if (controllers[c].root === section) {
          controllers[c].addDelta(horizontalDelta(event));
          break;
        }
      }
    },
    { passive: false, capture: true }
  );

  function jumpHash() {
    var target = location.hash && document.querySelector(location.hash);
    if (!target) return;
    var top = target.getBoundingClientRect().top + window.scrollY - NAV + 8;
    window.scrollTo(0, Math.max(0, top));
  }

  window.addEventListener("load", jumpHash);
  jumpHash();
})();
