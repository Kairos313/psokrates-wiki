(function () {
  if (!document.body.classList.contains("page-home")) {
    return;
  }

  var nav = document.querySelector("nav.navbar");
  if (!nav) {
    return;
  }

  var ticking = false;

  function backgroundLuminance(element) {
    var node = element;

    while (node && node !== document.documentElement) {
      var style = window.getComputedStyle(node);
      var backgroundImage = style.backgroundImage;
      var backgroundColor = style.backgroundColor;

      if (backgroundImage && backgroundImage !== "none") {
        var imageMatch = backgroundImage.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (imageMatch) {
          var imageAlpha = imageMatch[4] !== undefined ? parseFloat(imageMatch[4]) : 1;
          if (imageAlpha > 0.08) {
            return sampleRgb(imageMatch[1], imageMatch[2], imageMatch[3]);
          }
        }
      }

      if (backgroundColor && backgroundColor !== "rgba(0, 0, 0, 0)" && backgroundColor !== "transparent") {
        var colorMatch = backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (colorMatch) {
          var colorAlpha = colorMatch[4] !== undefined ? parseFloat(colorMatch[4]) : 1;
          if (colorAlpha > 0.08) {
            return sampleRgb(colorMatch[1], colorMatch[2], colorMatch[3]);
          }
        }
      }

      node = node.parentElement;
    }

    return 1;
  }

  function sampleRgb(r, g, b) {
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  function updateNavTone() {
    ticking = false;

    var probeY = nav.offsetHeight + 2;
    var probeX = Math.min(window.innerWidth - 1, Math.max(1, window.innerWidth * 0.5));
    var target = document.elementFromPoint(probeX, probeY);

    if (!target) {
      return;
    }

    document.body.classList.toggle("home-navbar--on-dark", backgroundLuminance(target) < 0.45);
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateNavTone);
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  window.addEventListener("load", updateNavTone);
  updateNavTone();
})();
