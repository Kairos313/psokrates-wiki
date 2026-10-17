(function () {
  var slot = document.getElementById("ihp-slot");
  var board = document.getElementById("ihp-board");
  var group = document.getElementById("ihp-group1");
  var scene = document.getElementById("ihp-group1-scene");
  var viewport = group && group.querySelector(".ihp-group1-viewport");
  var ui = document.getElementById("ihp-group1-ui");
  var sofa = document.getElementById("ihp-sofa");
  if (!slot || !board || !group || !scene || !viewport || !ui) {
    return;
  }

  var BOARD_W = 1440;
  var BOARD_H = 8200;
  var GROUP_LEFT = -140.7;
  var GROUP_TOP = 1269;
  var GROUP_W = 1691.7;
  var GROUP_H = 1013;
  // Visible board window mapped into group coordinates.
  var VIS_L = -GROUP_LEFT;
  var VIS_W = BOARD_W;
  var VIS_H = GROUP_H;
  var PANEL_W = 720;
  var FRAME_PAD = 48;
  var MAX_ZOOM = 1.9;
  var BOUNDS_PAD = 0.12;
  var ALPHA_MIN = 28;
  var ALPHA_MAX_W = 320;
  var LEAVE_MS = 90;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function fitBoard() {
    var scale = window.innerWidth / BOARD_W;
    board.style.transform = "scale(" + scale + ")";
    slot.style.height = BOARD_H * scale + "px";
  }

  fitBoard();
  window.addEventListener("resize", fitBoard);

  var hits = {};
  var hitNodes = group.querySelectorAll(".ihp-hit");
  for (var h = 0; h < hitNodes.length; h++) {
    hits[hitNodes[h].getAttribute("data-art")] = hitNodes[h];
  }

  var arts = {};
  var artOrder = [];
  var artNodes = scene.querySelectorAll(".ihp-art");
  for (var i = 0; i < artNodes.length; i++) {
    var art = artNodes[i];
    var key = art.getAttribute("data-art");
    arts[key] = art;
    artOrder.push(art);
  }
  artOrder.sort(function (a, b) {
    return parsePx(b.style.getPropertyValue("--z")) - parsePx(a.style.getPropertyValue("--z"));
  });

  var panels = {};
  var panelNodes = ui.querySelectorAll(".ihp-char-panel");
  for (var p = 0; p < panelNodes.length; p++) {
    panels[panelNodes[p].getAttribute("data-art")] = panelNodes[p];
  }

  var alphaCache = {};
  var boundsCache = {};
  var activeKey = null;
  var hoverKey = null;
  var leaveTimer = null;
  var suppressDocClick = false;

  function parsePx(value) {
    return parseFloat(String(value).replace("px", "")) || 0;
  }

  function artBox(art) {
    return {
      x: parsePx(art.style.getPropertyValue("--x")),
      y: parsePx(art.style.getPropertyValue("--y")),
      w: parsePx(art.style.getPropertyValue("--w")),
      h: parsePx(art.style.getPropertyValue("--h")),
    };
  }

  function hitBox(hit) {
    return {
      x: parsePx(hit.style.getPropertyValue("--x")),
      y: parsePx(hit.style.getPropertyValue("--y")),
      w: parsePx(hit.style.getPropertyValue("--w")),
      h: parsePx(hit.style.getPropertyValue("--h")),
    };
  }

  function buildAlpha(art) {
    var key = art.getAttribute("data-art");
    if (alphaCache[key] || !art.complete || !art.naturalWidth) {
      return;
    }
    var srcW = art.naturalWidth;
    var srcH = art.naturalHeight;
    var scale = Math.min(1, ALPHA_MAX_W / srcW);
    var w = Math.max(1, Math.round(srcW * scale));
    var h = Math.max(1, Math.round(srcH * scale));
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    try {
      ctx.drawImage(art, 0, 0, w, h);
      var data = ctx.getImageData(0, 0, w, h).data;
      alphaCache[key] = { width: w, height: h, data: data };

      var minX = w;
      var minY = h;
      var maxX = -1;
      var maxY = -1;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] >= ALPHA_MIN) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX >= minX && maxY >= minY) {
        var box = artBox(art);
        boundsCache[key] = {
          x: box.x + (minX / w) * box.w,
          y: box.y + (minY / h) * box.h,
          w: ((maxX - minX + 1) / w) * box.w,
          h: ((maxY - minY + 1) / h) * box.h,
        };
      }
    } catch (err) {
      alphaCache[key] = null;
    }
  }

  artOrder.forEach(function (art) {
    if (art.complete) {
      buildAlpha(art);
    } else {
      art.addEventListener("load", function () {
        buildAlpha(art);
      });
    }
  });

  function sampleAlpha(art, sceneX, sceneY) {
    var key = art.getAttribute("data-art");
    var cache = alphaCache[key];
    var box = artBox(art);
    if (sceneX < box.x || sceneY < box.y || sceneX >= box.x + box.w || sceneY >= box.y + box.h) {
      return 0;
    }
    if (!cache || !cache.data) {
      var hit = hits[key];
      if (!hit) {
        return 0;
      }
      var hb = hitBox(hit);
      return sceneX >= hb.x && sceneX <= hb.x + hb.w && sceneY >= hb.y && sceneY <= hb.y + hb.h
        ? 255
        : 0;
    }
    var u = (sceneX - box.x) / box.w;
    var v = (sceneY - box.y) / box.h;
    var px = Math.min(cache.width - 1, Math.max(0, Math.floor(u * cache.width)));
    var py = Math.min(cache.height - 1, Math.max(0, Math.floor(v * cache.height)));
    return cache.data[(py * cache.width + px) * 4 + 3];
  }

  function clientToScene(clientX, clientY) {
    var boardScale = window.innerWidth / BOARD_W;
    var slotRect = slot.getBoundingClientRect();
    var xOnBoard = (clientX - slotRect.left) / boardScale;
    var yOnBoard = (clientY - slotRect.top) / boardScale;
    var vx = xOnBoard - GROUP_LEFT;
    var vy = yOnBoard - GROUP_TOP;
    var zoom = parseFloat(scene.style.getPropertyValue("--ihp-zoom")) || 1;
    var tx = parseFloat(scene.style.getPropertyValue("--ihp-tx")) || 0;
    var ty = parseFloat(scene.style.getPropertyValue("--ihp-ty")) || 0;
    return {
      x: (vx - tx) / zoom,
      y: (vy - ty) / zoom,
    };
  }

  function pickKey(sceneX, sceneY) {
    for (var i = 0; i < artOrder.length; i++) {
      var art = artOrder[i];
      if (sampleAlpha(art, sceneX, sceneY) >= ALPHA_MIN) {
        return art.getAttribute("data-art");
      }
    }
    return null;
  }

  function charBounds(key) {
    var base = null;
    if (boundsCache[key]) {
      base = boundsCache[key];
    } else if (hits[key]) {
      base = hitBox(hits[key]);
    } else {
      base = artBox(arts[key]);
    }

    // Inflate so soft anti-aliased edges stay inside the frame.
    var padX = base.w * BOUNDS_PAD;
    var padY = base.h * BOUNDS_PAD;
    return {
      x: base.x - padX,
      y: base.y - padY,
      w: base.w + padX * 2,
      h: base.h + padY * 2,
    };
  }

  function cameraFor(key) {
    var bounds = charBounds(key);
    var cx = bounds.x + bounds.w * 0.5;
    var side = cx < GROUP_W * 0.5 ? "left" : "right";
    if (reduceMotion) {
      return { zoom: 1, tx: 0, ty: 0, side: side };
    }

    var availL = VIS_L + FRAME_PAD;
    var availR = VIS_L + VIS_W - FRAME_PAD;
    var availT = FRAME_PAD;
    var availB = VIS_H - FRAME_PAD;

    // Reserve a stable column for the text panel on the open side.
    if (side === "left") {
      availR = VIS_L + VIS_W - PANEL_W - FRAME_PAD * 2;
    } else {
      availL = VIS_L + PANEL_W + FRAME_PAD * 2;
    }

    var availW = Math.max(120, availR - availL);
    var availH = Math.max(120, availB - availT);
    var zoom = Math.min(availW / Math.max(1, bounds.w), availH / Math.max(1, bounds.h), MAX_ZOOM);
    zoom = Math.max(1, zoom * 0.9);

    var targetX = side === "left"
      ? availL + bounds.w * zoom * 0.5
      : availR - bounds.w * zoom * 0.5;
    var targetY = (availT + availB) * 0.5;
    var tx = targetX - cx * zoom;
    var ty = targetY - (bounds.y + bounds.h * 0.5) * zoom;

    function projected() {
      return {
        left: bounds.x * zoom + tx,
        right: (bounds.x + bounds.w) * zoom + tx,
        top: bounds.y * zoom + ty,
        bottom: (bounds.y + bounds.h) * zoom + ty,
      };
    }

    var box = projected();
    if (box.left < availL) tx += availL - box.left;
    if (box.right > availR) tx -= box.right - availR;
    box = projected();
    if (box.top < availT) ty += availT - box.top;
    if (box.bottom > availB) ty -= box.bottom - availB;

    // If still overflowing after clamp, shrink until the full character fits.
    box = projected();
    var needW = box.right - box.left;
    var needH = box.bottom - box.top;
    var fitZoom = zoom;
    if (needW > availW) fitZoom = Math.min(fitZoom, (availW / bounds.w) * 0.9);
    if (needH > availH) fitZoom = Math.min(fitZoom, (availH / bounds.h) * 0.9);
    if (fitZoom < zoom) {
      zoom = Math.max(1, fitZoom);
      targetX = side === "left"
        ? availL + bounds.w * zoom * 0.5
        : availR - bounds.w * zoom * 0.5;
      tx = targetX - cx * zoom;
      ty = targetY - (bounds.y + bounds.h * 0.5) * zoom;
      box = projected();
      if (box.left < availL) tx += availL - box.left;
      if (box.right > availR) tx -= box.right - availR;
      box = projected();
      if (box.top < availT) ty += availT - box.top;
      if (box.bottom > availB) ty -= box.bottom - availB;
    }

    return { zoom: zoom, tx: tx, ty: ty, side: side };
  }

  function setHint(key) {
    hoverKey = key;
    Object.keys(hits).forEach(function (artKey) {
      hits[artKey].classList.toggle("is-hint", !activeKey && artKey === key);
    });
    Object.keys(arts).forEach(function (artKey) {
      arts[artKey].classList.toggle("is-hint", !activeKey && artKey === key);
    });
    viewport.classList.toggle("is-over-char", !!key);
  }

  function setFocus(key) {
    activeKey = key;
    var cam = key ? cameraFor(key) : { zoom: 1, tx: 0, ty: 0, side: "left" };

    group.classList.toggle("is-focusing", !!key);
    ui.classList.toggle("is-focusing", !!key);
    group.dataset.focusSide = key ? cam.side : "";
    group.dataset.focusArt = key || "";

    scene.style.setProperty("--ihp-zoom", String(cam.zoom));
    scene.style.setProperty("--ihp-tx", cam.tx + "px");
    scene.style.setProperty("--ihp-ty", cam.ty + "px");

    if (sofa) {
      sofa.classList.toggle("is-dim", !!key);
    }

    Object.keys(arts).forEach(function (artKey) {
      var art = arts[artKey];
      var on = !!key && artKey === key;
      art.classList.toggle("is-focus", on);
      art.classList.toggle("is-away", !!key && !on);
      art.classList.toggle("is-hint", false);
    });

    Object.keys(hits).forEach(function (artKey) {
      var hit = hits[artKey];
      var on = !!key && artKey === key;
      hit.classList.toggle("is-active", on);
      hit.classList.toggle("is-away", !!key && !on);
      hit.classList.toggle("is-hint", false);
      hit.setAttribute("aria-pressed", on ? "true" : "false");
    });

    Object.keys(panels).forEach(function (artKey) {
      var panel = panels[artKey];
      var show = !!key && artKey === key;
      panel.classList.toggle("is-visible", show);
      panel.setAttribute("aria-hidden", show ? "false" : "true");
      panel.classList.toggle("is-side-left", show && cam.side === "right");
      panel.classList.toggle("is-side-right", show && cam.side === "left");
    });

    if (key) {
      hoverKey = null;
    }
    viewport.classList.toggle("is-over-char", !!key);
  }

  function clearFocus() {
    setFocus(null);
    setHint(null);
  }

  function focusPointX(key) {
    return charBounds(key).x + charBounds(key).w * 0.5;
  }

  var charOrder = Object.keys(hits).sort(function (a, b) {
    return focusPointX(a) - focusPointX(b);
  });

  function shiftFocus(delta) {
    if (!activeKey || !charOrder.length) {
      return;
    }
    var idx = charOrder.indexOf(activeKey);
    if (idx < 0) {
      idx = 0;
    }
    var next = charOrder[(idx + delta + charOrder.length) % charOrder.length];
    setFocus(next);
  }

  function activateKey(key) {
    if (!key) {
      return;
    }
    suppressDocClick = true;
    setHint(null);
    setFocus(key);
  }

  function onPointerMove(event) {
    if (event.pointerType === "touch") {
      return;
    }

    if (event.target.closest && event.target.closest(".ihp-nav-arrow")) {
      return;
    }

    var overPanel = event.target.closest && event.target.closest(".ihp-char-panel.is-visible");
    if (overPanel && activeKey && overPanel.getAttribute("data-art") === activeKey) {
      if (leaveTimer) {
        clearTimeout(leaveTimer);
        leaveTimer = null;
      }
      return;
    }

    var pt = clientToScene(event.clientX, event.clientY);
    if (pt.x < -40 || pt.y < -40 || pt.x > GROUP_W + 40 || pt.y > GROUP_H + 40) {
      if (!activeKey) {
        setHint(null);
      }
      return;
    }

    var key = pickKey(pt.x, pt.y);
    if (activeKey) {
      viewport.classList.toggle("is-over-char", false);
      return;
    }
    if (key !== hoverKey) {
      setHint(key);
    }
  }

  function onPointerLeave(event) {
    var related = event.relatedTarget;
    if (related && (group.contains(related) || ui.contains(related))) {
      return;
    }
    if (!activeKey) {
      setHint(null);
    }
  }

  function onPointerDown(event) {
    if (event.button != null && event.button !== 0) {
      return;
    }

    if (event.target.closest && event.target.closest(".ihp-nav-arrow")) {
      return;
    }

    // While zoomed, any click zooms out.
    if (activeKey) {
      event.preventDefault();
      event.stopPropagation();
      suppressDocClick = true;
      clearFocus();
      return;
    }

    var pt = clientToScene(event.clientX, event.clientY);
    var key = pickKey(pt.x, pt.y);
    if (key) {
      event.preventDefault();
      event.stopPropagation();
      activateKey(key);
    }
  }

  group.addEventListener("pointermove", onPointerMove);
  group.addEventListener("pointerleave", onPointerLeave);
  group.addEventListener("pointerdown", onPointerDown);
  ui.addEventListener("pointermove", onPointerMove);
  ui.addEventListener("pointerleave", onPointerLeave);
  ui.addEventListener("pointerdown", onPointerDown);

  var prevBtn = document.getElementById("ihp-nav-prev");
  var nextBtn = document.getElementById("ihp-nav-next");
  if (prevBtn) {
    prevBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      suppressDocClick = true;
      shiftFocus(-1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      suppressDocClick = true;
      shiftFocus(1);
    });
  }

  Object.keys(hits).forEach(function (key) {
    var hit = hits[key];
    hit.setAttribute("aria-pressed", "false");
    hit.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (activeKey) {
        suppressDocClick = true;
        clearFocus();
        return;
      }
      activateKey(key);
    });
    hit.addEventListener("focus", function () {
      if (!activeKey) {
        setHint(key);
      }
    });
    hit.addEventListener("blur", function () {
      if (!activeKey && hoverKey === key) {
        setHint(null);
      }
    });
  });

  document.addEventListener("click", function () {
    if (suppressDocClick) {
      suppressDocClick = false;
      return;
    }
    if (activeKey) {
      clearFocus();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (!activeKey) {
      if (event.key === "Escape" && hoverKey) {
        setHint(null);
      }
      return;
    }
    if (event.key === "Escape") {
      clearFocus();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      shiftFocus(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      shiftFocus(1);
    }
  });
})();
