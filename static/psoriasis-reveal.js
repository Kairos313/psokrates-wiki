(function () {
  "use strict";

  var section = document.getElementById("psoriasis-reveal");
  var image = document.getElementById("psoriasis-reveal-image");
  var overlay = document.getElementById("psoriasis-reveal-overlay");
  var infoPanel = document.getElementById("info-panel");
  var infoTitle = document.getElementById("info-panel-title");
  var infoDescription = document.getElementById("info-panel-description");

  if (!section || !image || !overlay || !infoPanel || !infoTitle || !infoDescription) {
    return;
  }

  var DEFAULT_TITLE = "";
  var DEFAULT_DESCRIPTION = "";

  function pointTarget(x, y) {
    return { x: x, y: y };
  }

  /* Text appears only when the lens circle covers one of these exact coordinate points. */
  var psoriasisZones = [
    {
      name: "Scalp Psoriasis",
      color: "#2a5b6f",
      description: "Scalp psoriasis affects the scalp and hairline, often causing persistent itching, flaking, and raised plaques that can extend beyond the hairline. Because it is visible and difficult to treat through hair, it can be especially frustrating for daily care and confidence.",
      targets: [pointTarget(70.2, 3.3)]
    },
    {
      name: "Erythrodermic Psoriasis",
      color: "#b94b4b",
      description: "Erythrodermic psoriasis is a rare but severe form that can spread across large areas of the body, causing intense redness, scaling, pain, and temperature imbalance. It may require urgent medical attention because the skin barrier becomes widely disrupted.",
      targets: [pointTarget(54.5, 29.5), pointTarget(55.5, 21.9)]
    },
    {
      name: "Inverse Psoriasis",
      color: "#8a5bb8",
      description: "Inverse psoriasis appears in skin folds such as the armpits, groin, and under the breasts. Instead of thick scale, the lesions are often smooth, red, shiny, and irritated because friction, sweat, and moisture constantly aggravate the area.",
      targets: [pointTarget(84, 30)]
    },
    {
      name: "Plaque Psoriasis",
      color: "#c57a2e",
      description: "Plaque psoriasis is the most common form of psoriasis. It creates raised, inflamed plaques covered with silvery scale, commonly on elbows, knees, trunk, and scalp. These plaques may crack, itch, bleed, or return repeatedly after temporary improvement.",
      targets: [pointTarget(44, 43)]
    },
    {
      name: "Guttate Psoriasis",
      color: "#4a8f62",
      description: "Guttate psoriasis causes many small, drop-shaped spots across the trunk, arms, or legs. It often appears suddenly and can be triggered by infections such as strep throat, making the skin look scattered with many small inflamed marks.",
      targets: [
        pointTarget(64, 45),
        pointTarget(74, 45),
        pointTarget(64, 36),
        pointTarget(72, 38)
      ]
    },
    {
      name: "Psoriatic Arthritis",
      color: "#3f6fb5",
      description: "Psoriatic arthritis extends inflammation beyond the skin into joints, tendons, and surrounding tissue. It can cause swelling, stiffness, pain, and reduced movement, especially in the hands and fingers, and may progress if left untreated.",
      targets: [pointTarget(45, 56), pointTarget(90, 50)]
    },
    {
      name: "Pustular Psoriasis",
      color: "#d09a2d",
      description: "Pustular psoriasis produces white, pus-filled bumps on red and inflamed skin. It can be localized or widespread, and nearby nail psoriasis may cause pitting, discoloration, thickening, or separation of the nail from the nail bed.",
      targets: [pointTarget(79, 79), pointTarget(88, 61)]
    }
  ];

  var radius = parseFloat(image.getAttribute("data-lens-radius")) || 130;
  var lens = document.createElement("div");
  lens.className = "psoriasis-reveal-lens";
  lens.style.setProperty("--reveal-lens-size", radius * 2 + "px");
  document.body.appendChild(lens);

  var sectionVisible = false;
  var pointerInside = false;
  var pointerX = window.innerWidth / 2;
  var pointerY = window.innerHeight / 2;
  var rafId = null;
  var activeZone = null;

  function setLensVisible(isVisible) {
    section.classList.toggle("is-cursor-active", isVisible);
    document.body.classList.toggle("psoriasis-reveal-lens-active", isVisible);
    lens.classList.toggle("is-visible", isVisible);
  }

  function clearReveal() {
    overlay.style.clipPath = "circle(0 at 50% 50%)";
  }

  function getLensCenterPercentages() {
    var rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return { x: 0, y: 0, isOverImage: false, rect: rect };
    }

    var cx = pointerX - rect.left;
    var cy = pointerY - rect.top;
    var x = (cx / rect.width) * 100;
    var y = (cy / rect.height) * 100;
    var isOverImage = cx >= 0 && cx <= rect.width && cy >= 0 && cy <= rect.height;

    return { x: x, y: y, cx: cx, cy: cy, isOverImage: isOverImage, rect: rect };
  }

  function targetDistance(rect, cx, cy, target) {
    var targetX = (target.x / 100) * rect.width;
    var targetY = (target.y / 100) * rect.height;

    return Math.pow(cx - targetX, 2) + Math.pow(cy - targetY, 2);
  }

  function findZoneByLens(lensCenter) {
    if (!lensCenter.isOverImage) {
      return null;
    }

    var matched = null;
    var matchedDist = Infinity;

    for (var i = 0; i < psoriasisZones.length; i++) {
      var zone = psoriasisZones[i];
      var targets = zone.targets || [];

      for (var t = 0; t < targets.length; t++) {
        var distance = targetDistance(lensCenter.rect, lensCenter.cx, lensCenter.cy, targets[t]);

        if (distance > radius * radius) {
          continue;
        }

        if (distance < matchedDist) {
          matched = zone;
          matchedDist = distance;
        }
      }
    }

    return matched;
  }

  function setInfoPanel(zone) {
    if (zone) {
      infoPanel.classList.add("is-active");
      infoPanel.style.setProperty("--psoriasis-info-color", zone.color || "#2a5b6f");
      infoTitle.textContent = zone.name;
      infoDescription.textContent = zone.description;
      return;
    }

    infoPanel.classList.remove("is-active");
    infoPanel.style.removeProperty("--psoriasis-info-color");
    infoTitle.textContent = DEFAULT_TITLE;
    infoDescription.textContent = DEFAULT_DESCRIPTION;
  }

  function updateHoverState() {
    var lensCenter = getLensCenterPercentages();
    var zone = findZoneByLens(lensCenter);

    if (zone !== activeZone) {
      activeZone = zone;
      setInfoPanel(zone);
    }
  }

  function updateRevealMask() {
    var overlayRect = overlay.getBoundingClientRect();
    var lensCenter = getLensCenterPercentages();

    if (!lensCenter.isOverImage) {
      clearReveal();
      return;
    }

    var x = pointerX - overlayRect.left;
    var y = pointerY - overlayRect.top;
    overlay.style.clipPath = "circle(" + radius + "px at " + x + "px " + y + "px)";
  }

  function updateLensPosition() {
    lens.style.transform =
      "translate3d(" + pointerX + "px, " + pointerY + "px, 0) translate(-50%, -50%)";
  }

  function tick() {
    if (!sectionVisible || !pointerInside) {
      rafId = null;
      return;
    }

    updateLensPosition();
    updateRevealMask();
    updateHoverState();
    rafId = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (rafId === null) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function activateIfReady() {
    var isActive = sectionVisible && pointerInside;
    setLensVisible(isActive);

    if (isActive) {
      updateLensPosition();
      updateRevealMask();
      updateHoverState();
      startLoop();
      return;
    }

    clearReveal();
    activeZone = null;
    setInfoPanel(null);
    stopLoop();
  }

  function setPointer(event) {
    pointerInside = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    activateIfReady();
  }

  section.addEventListener("pointerenter", setPointer);
  section.addEventListener("pointermove", setPointer);

  section.addEventListener("pointerleave", function () {
    pointerInside = false;
    activateIfReady();
  });

  window.addEventListener("blur", function () {
    pointerInside = false;
    activateIfReady();
  });

  var observer = new IntersectionObserver(
    function (entries) {
      sectionVisible = entries.some(function (entry) {
        return entry.isIntersecting;
      });

      if (!sectionVisible) {
        pointerInside = false;
      }

      activateIfReady();
    },
    { threshold: 0.18 }
  );

  observer.observe(section);
  setInfoPanel(null);
})();
