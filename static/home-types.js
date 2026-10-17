/**
 * Symptoms body map: hover the blue figure to reveal plaque locations
 * and show the matching psoriasis type in the empty space.
 */
(function () {
  var root = document.getElementById("fg-types");
  var figure = document.getElementById("fg-types-figure");
  var overlay = document.getElementById("fg-types-overlay");
  var base = figure ? figure.querySelector(".fg-types-base") : null;
  var title = document.getElementById("fg-types-title");
  var text = document.getElementById("fg-types-text");

  if (!root || !figure || !overlay || !base || !title || !text) {
    return;
  }

  function point(x, y) {
    return { x: x, y: y };
  }

  var zones = [
    {
      name: "Scalp Psoriasis",
      color: "#2a5b6f",
      description:
        "Scalp psoriasis affects the scalp and hairline, often causing persistent itching, flaking, and raised plaques that can extend beyond the hairline.",
      targets: [point(54, 4)]
    },
    {
      name: "Erythrodermic Psoriasis",
      color: "#b94b4b",
      description:
        "Erythrodermic psoriasis is a rare but severe form that can spread across large areas of the body, causing intense redness, scaling, pain, and temperature imbalance.",
      targets: [point(22, 22), point(28, 26), point(32, 24)]
    },
    {
      name: "Inverse Psoriasis",
      color: "#8a5bb8",
      description:
        "Inverse psoriasis appears in skin folds such as the armpits, groin, and under the breasts. The lesions are often smooth, red, and shiny because friction and moisture aggravate the area.",
      targets: [point(76, 29), point(72, 32)]
    },
    {
      name: "Plaque Psoriasis",
      color: "#c57a2e",
      description:
        "Plaque psoriasis is the most common form. It creates raised, inflamed plaques covered with silvery scale, commonly on elbows, knees, trunk, and scalp. Our project aims to focus on plaque psoriasis.",
      targets: [point(10, 42), point(12, 38)]
    },
    {
      name: "Guttate Psoriasis",
      color: "#4a8f62",
      description:
        "Guttate psoriasis causes many small, drop-shaped spots across the trunk, arms, or legs. It often appears suddenly and can be triggered by infections such as strep throat.",
      targets: [point(48, 38), point(55, 42), point(50, 46), point(58, 40)]
    },
    {
      name: "Psoriatic Arthritis",
      color: "#3f6fb5",
      description:
        "Psoriatic arthritis extends inflammation beyond the skin into joints, tendons, and surrounding tissue. It can cause swelling, stiffness, and pain, especially in the hands and fingers.",
      targets: [point(12, 57), point(88, 53), point(86, 56)]
    },
    {
      name: "Pustular Psoriasis",
      color: "#d09a2d",
      description:
        "Pustular psoriasis produces white, pus-filled bumps on red and inflamed skin. Nearby nail psoriasis may cause pitting, discoloration, or thickening of the nail.",
      targets: [point(66, 78), point(68, 82)]
    }
  ];

  var radius = 54;
  var active = null;
  var inside = false;
  var px = 0;
  var py = 0;
  var raf = null;

  function findZone(localX, localY) {
    var matched = null;
    var best = Infinity;
    var width = figure.offsetWidth;
    var height = figure.offsetHeight;
    for (var i = 0; i < zones.length; i++) {
      var targets = zones[i].targets;
      for (var t = 0; t < targets.length; t++) {
        var tx = (targets[t].x / 100) * width;
        var ty = (targets[t].y / 100) * height;
        var dist = (localX - tx) * (localX - tx) + (localY - ty) * (localY - ty);
        if (dist <= radius * radius && dist < best) {
          matched = zones[i];
          best = dist;
        }
      }
    }
    return matched;
  }

  function setCopy(zone) {
    if (zone) {
      root.classList.add("is-active");
      root.style.setProperty("--fg-types-color", zone.color);
      title.textContent = zone.name;
      text.textContent = zone.description;
      return;
    }
    root.classList.remove("is-active");
    title.textContent = "";
    text.textContent = "";
  }

  function clearHole() {
    base.style.maskImage = "";
    base.style.webkitMaskImage = "";
  }

  function punchHole(xPct, yPct) {
    var hole =
      "radial-gradient(circle " +
      radius +
      "px at " +
      xPct +
      "% " +
      yPct +
      "%, transparent " +
      radius +
      "px, #000 " +
      (radius + 1) +
      "px)";
    base.style.maskImage = hole;
    base.style.webkitMaskImage = hole;
    base.style.maskSize = "100% 100%";
    base.style.webkitMaskSize = "100% 100%";
    base.style.maskRepeat = "no-repeat";
    base.style.webkitMaskRepeat = "no-repeat";
  }

  function tick() {
    if (!inside) {
      raf = null;
      figure.classList.remove("is-hover");
      clearHole();
      if (active) {
        active = null;
        setCopy(null);
      }
      return;
    }

    figure.classList.add("is-hover");

    var rect = figure.getBoundingClientRect();
    var xPct = rect.width ? ((px - rect.left) / rect.width) * 100 : 50;
    var yPct = rect.height ? ((py - rect.top) / rect.height) * 100 : 50;
    var localX = (xPct / 100) * figure.offsetWidth;
    var localY = (yPct / 100) * figure.offsetHeight;
    punchHole(xPct, yPct);

    var zone = findZone(localX, localY);
    if (zone !== active) {
      active = zone;
      setCopy(zone);
    }

    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (raf === null) {
      raf = requestAnimationFrame(tick);
    }
  }

  figure.addEventListener("pointerenter", function (event) {
    inside = true;
    px = event.clientX;
    py = event.clientY;
    start();
  });

  figure.addEventListener("pointermove", function (event) {
    inside = true;
    px = event.clientX;
    py = event.clientY;
    start();
  });

  figure.addEventListener("pointerleave", function () {
    inside = false;
    start();
  });
})();
