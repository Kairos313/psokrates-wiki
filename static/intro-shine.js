(function () {
  var DESIGN_W = 720;
  var DESIGN_H = 405;
  var DESIGN_DIAMETER = 7;

  var SHINE_POINTS = [
    {
      id: "shine-1",
      x: 535,
      y: 72,
      quote:
        "It's the subtle things. The person on the MTR who looks at my arm, pauses, and quietly moves to the next handrail.",
    },
    {
      id: "shine-2",
      x: 515,
      y: 105,
      quote:
        "At the swimming pool, someone asked me to leave as he thought my rash was contagious.",
    },
    {
      id: "shine-3",
      x: 474,
      y: 180,
      quote:
        "When you have a flare-up, you become a master of hiding. Long sleeves in mid-summer, high collars... anything to stop the staring before it starts.",
    },
    {
      id: "shine-4",
      x: 463,
      y: 196,
      quote:
        "The waiter who hesitantly used two fingers to take my credit card, trying his best not to brush against my fingers.",
    },
    {
      id: "shine-5",
      x: 576,
      y: 172,
      quote:
        "A coworker saw my hands and asked, 'Have you tried just washing them more often?' As if it's a matter of hygiene.",
    },
    {
      id: "shine-6",
      x: 572,
      y: 196,
      quote:
        "At a salon, the hair stylist gasped when she parted my hair and quietly asked if she should wear gloves.",
    },
    {
      id: "shine-7",
      x: 492,
      y: 303,
      quote:
        "People giving you skincare advice or selling you miracle creams on the street, assuming you just haven't tried hard enough to fix yourself.",
    },
    {
      id: "shine-8",
      x: 546,
      y: 300,
      quote:
        "Sitting down on a crowded bus, and watching the person next to me immediately stand up and walk away.",
    },
  ];

  var activeLayer = null;
  var activeArtboard = null;
  var activeChat = null;
  var activeCircle = null;
  var hideChatTimer = null;
  var chatQuoteEl = null;
  var resizeObserver = null;
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function getContainedRect(containerW, containerH, artW, artH) {
    var containerAspect = containerW / containerH;
    var artAspect = artW / artH;
    var width;
    var height;

    if (containerAspect > artAspect) {
      height = containerH;
      width = artW * (containerH / artH);
    } else {
      width = containerW;
      height = artH * (containerW / artW);
    }

    return {
      left: (containerW - width) / 2,
      top: (containerH - height) / 2,
      width: width,
      height: height,
    };
  }

  function syncArtboardLayout() {
    if (!activeLayer || !activeArtboard) {
      return;
    }

    var rect = activeLayer.getBoundingClientRect();
    var containerW = Math.max(1, rect.width);
    var containerH = Math.max(1, rect.height);
    var layout = getContainedRect(containerW, containerH, DESIGN_W, DESIGN_H);

    activeArtboard.style.left = layout.left + "px";
    activeArtboard.style.top = layout.top + "px";
    activeArtboard.style.width = layout.width + "px";
    activeArtboard.style.height = layout.height + "px";

    if (activeCircle && activeChat && activeChat.classList.contains("intro-shine-chat-visible")) {
      positionChat(activeCircle);
    }
  }

  function clearHideChatTimer() {
    if (hideChatTimer) {
      clearTimeout(hideChatTimer);
      hideChatTimer = null;
    }
  }

  function scheduleHideChat() {
    clearHideChatTimer();
    hideChatTimer = setTimeout(hideChat, 220);
  }

  function setActiveCircle(circle) {
    if (activeCircle) {
      activeCircle.classList.remove("intro-shine-circle-active");
    }

    activeCircle = circle || null;

    if (activeCircle) {
      activeCircle.classList.add("intro-shine-circle-active");
    }
  }

  function createChatPanel() {
    var chat = document.createElement("aside");
    chat.className = "intro-shine-chat intro-shine-chat-hidden";
    chat.setAttribute("role", "dialog");
    chat.setAttribute("aria-live", "polite");

    chatQuoteEl = document.createElement("p");
    chatQuoteEl.className = "intro-shine-chat-quote";

    chat.appendChild(chatQuoteEl);

    chat.addEventListener("mouseenter", clearHideChatTimer);
    chat.addEventListener("mouseleave", scheduleHideChat);

    return chat;
  }

  function positionChat(circle) {
    if (!activeChat || !activeLayer || !circle) {
      return;
    }

    var layerRect = activeArtboard.getBoundingClientRect();
    var circleRect = circle.getBoundingClientRect();
    var chatRect = activeChat.getBoundingClientRect();
    var gap = 12;
    var padding = 10;

    var anchorX = circleRect.left - layerRect.left + circleRect.width / 2;
    var anchorY = circleRect.top - layerRect.top + circleRect.height / 2;

    var placeAbove = anchorY - chatRect.height - gap >= padding;
    var top = placeAbove
      ? anchorY - chatRect.height - gap
      : anchorY + circleRect.height / 2 + gap;

    var left = anchorX - chatRect.width / 2;
    left = Math.max(padding, Math.min(left, layerRect.width - chatRect.width - padding));

    activeChat.style.left = left + "px";
    activeChat.style.top = top + "px";
    activeChat.dataset.placement = placeAbove ? "above" : "below";
  }

  function showChat(circle, quote) {
    if (!activeChat || !chatQuoteEl) {
      return;
    }

    clearHideChatTimer();
    setActiveCircle(circle);
    chatQuoteEl.textContent = quote;
    activeChat.classList.remove("intro-shine-chat-hidden", "intro-shine-chat-visible");
    activeChat.classList.add("intro-shine-chat-positioning");

    requestAnimationFrame(function () {
      positionChat(circle);
      requestAnimationFrame(function () {
        positionChat(circle);
        activeChat.classList.remove("intro-shine-chat-positioning");
        activeChat.classList.add("intro-shine-chat-visible");
      });
    });
  }

  function hideChat() {
    clearHideChatTimer();

    if (activeChat) {
      activeChat.classList.remove("intro-shine-chat-visible");
      activeChat.classList.add("intro-shine-chat-hidden");
    }

    setActiveCircle(null);
  }

  function onCircleEnter(point, circle) {
    showChat(circle, point.quote);
  }

  function onCircleLeave() {
    scheduleHideChat();
  }

  function onCircleClick(point, circle, event) {
    event.stopPropagation();

    if (activeCircle === circle && activeChat && activeChat.classList.contains("intro-shine-chat-visible")) {
      hideChat();
      return;
    }

    showChat(circle, point.quote);
  }

  function createCircle(point) {
    var radius = DESIGN_DIAMETER / 2;
    var circle = document.createElement("button");
    circle.type = "button";
    circle.className = "intro-shine-circle";
    circle.dataset.shineId = point.id;
    circle.setAttribute("aria-label", "Hear an inner voice");
    circle.style.left = ((point.x - radius) / DESIGN_W) * 100 + "%";
    circle.style.top = ((point.y - radius) / DESIGN_H) * 100 + "%";
    circle.style.width = (DESIGN_DIAMETER / DESIGN_W) * 100 + "%";
    circle.style.height = (DESIGN_DIAMETER / DESIGN_H) * 100 + "%";

    if (prefersReducedMotion) {
      circle.classList.add("intro-shine-circle-reduced");
    }

    circle.addEventListener("mouseenter", function () {
      onCircleEnter(point, circle);
    });
    circle.addEventListener("mouseleave", onCircleLeave);
    circle.addEventListener("click", function (event) {
      onCircleClick(point, circle, event);
    });
    circle.addEventListener("focus", function () {
      onCircleEnter(point, circle);
    });
    circle.addEventListener("blur", function () {
      scheduleHideChat();
    });

    return circle;
  }

  function mountLayer(container) {
    container.innerHTML = "";
    container.classList.remove("intro-shine-layer-hidden");
    container.setAttribute("aria-hidden", "false");

    activeArtboard = document.createElement("div");
    activeArtboard.className = "intro-shine-artboard";

    activeChat = createChatPanel();
    activeArtboard.appendChild(activeChat);

    SHINE_POINTS.forEach(function (point) {
      activeArtboard.appendChild(createCircle(point));
    });

    container.appendChild(activeArtboard);

    container.addEventListener("click", function (event) {
      if (!event.target.closest(".intro-shine-circle") && !event.target.closest(".intro-shine-chat")) {
        hideChat();
      }
    });

    activeLayer = container;
    syncArtboardLayout();

    window.addEventListener("resize", syncArtboardLayout);

    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(syncArtboardLayout);
      resizeObserver.observe(container);
    }

    requestAnimationFrame(function () {
      syncArtboardLayout();
    });
  }

  window.IntroShineLayer = {
    show: function (container) {
      if (!container) {
        return;
      }

      mountLayer(container);
    },

    hide: function () {
      hideChat();

      window.removeEventListener("resize", syncArtboardLayout);

      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }

      if (!activeLayer) {
        return;
      }

      activeLayer.innerHTML = "";
      activeLayer.classList.add("intro-shine-layer-hidden");
      activeLayer.setAttribute("aria-hidden", "true");
      activeLayer = null;
      activeArtboard = null;
      activeChat = null;
      chatQuoteEl = null;
    },

    syncLayout: syncArtboardLayout,
  };
})();
