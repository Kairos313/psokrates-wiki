(function () {
  var DESIGN_W = 720;
  var DESIGN_H = 405;
  var DESIGN_DIAMETER = 76.05;
  var DESIGN_CREAM_X = 350;
  var DESIGN_CREAM_Y = 320;
  var DESIGN_CREAM_SIZE = 170;
  var BRUSH_RADIUS = 20;
  var CREAM_FADE_MS = 500;
  var PLAQUE_FADE_MS = 800;
  var RETURN_MS = 3000;

  var TEST_PLAQUES = [
    { id: "plaque-1", x: 465.06, y: 336.89, healed: "skin_plaque_scene1.png" },
    {
      id: "plaque-2",
      x: 404,
      y: 118,
      diameter: 92,
      height: 132,
      healed: "skin_plaque_scene2.png",
    },
    { id: "plaque-3", x: 623, y: 107, healed: "skin_plaque_scene3.png" },
    { id: "plaque-4", x: 563, y: 340, healed: "skin_plaque_scene4.png" },
  ];

  var activeScene = null;

  function scaleX(value, imageW) {
    return value * (imageW / DESIGN_W);
  }

  function scaleY(value, imageH) {
    return value * (imageH / DESIGN_H);
  }

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

  function resolveIntroAsset(introPath, filename) {
    var base = introPath || "/static/intro/";
    if (base.charAt(base.length - 1) !== "/") {
      base += "/";
    }
    return base + filename;
  }

  function createPlaqueElement(plaque, plaqueSourceUrl, healedSourceUrl, imageW, imageH, width, height) {
    var maskW = width;
    var maskH = height || width;
    var radiusX = maskW / 2;
    var radiusY = maskH / 2;
    var leftPct = ((plaque.x - radiusX) / imageW) * 100;
    var topPct = ((plaque.y - radiusY) / imageH) * 100;
    var widthPct = (maskW / imageW) * 100;
    var heightPct = (maskH / imageH) * 100;
    var imageOffsetLeftPct = (-(plaque.x - radiusX) / maskW) * 100;
    var imageOffsetTopPct = (-(plaque.y - radiusY) / maskH) * 100;
    var imageWidthPct = (imageW / maskW) * 100;
    var imageHeightPct = (imageH / maskH) * 100;

    var plaqueEl = document.createElement("div");
    plaqueEl.className = "skin-cream-plaque";
    if (maskH !== maskW) {
      plaqueEl.classList.add("skin-cream-plaque-ellipse");
    }
    plaqueEl.dataset.plaqueId = plaque.id;
    plaqueEl.style.left = leftPct + "%";
    plaqueEl.style.top = topPct + "%";
    plaqueEl.style.width = widthPct + "%";
    plaqueEl.style.height = heightPct + "%";

    if (healedSourceUrl) {
      var healedImg = document.createElement("img");
      healedImg.className = "skin-cream-plaque-healed";
      healedImg.src = healedSourceUrl;
      healedImg.alt = "";
      healedImg.draggable = false;
      healedImg.style.width = imageWidthPct + "%";
      healedImg.style.height = imageHeightPct + "%";
      healedImg.style.left = imageOffsetLeftPct + "%";
      healedImg.style.top = imageOffsetTopPct + "%";
      plaqueEl.appendChild(healedImg);
    }

    var patchImg = document.createElement("img");
    patchImg.className = "skin-cream-plaque-patch";
    patchImg.src = plaqueSourceUrl;
    patchImg.alt = "";
    patchImg.draggable = false;
    patchImg.style.width = imageWidthPct + "%";
    patchImg.style.height = imageHeightPct + "%";
    patchImg.style.left = imageOffsetLeftPct + "%";
    patchImg.style.top = imageOffsetTopPct + "%";

    plaqueEl.appendChild(patchImg);
    return plaqueEl;
  }

  function createCreamTube(imageW, imageH, creamUrl) {
    var radius = scaleX(DESIGN_CREAM_SIZE, imageW) / 2;
    var centerX = scaleX(DESIGN_CREAM_X, imageW);
    var centerY = scaleY(DESIGN_CREAM_Y, imageH);
    var leftPct = ((centerX - radius) / imageW) * 100;
    var topPct = ((centerY - radius) / imageH) * 100;
    var sizePct = ((radius * 2) / imageW) * 100;

    var tube = document.createElement("button");
    tube.type = "button";
    tube.className = "skin-cream-tube";
    tube.setAttribute("aria-label", "Pick up cream medicine");
    tube.style.left = leftPct + "%";
    tube.style.top = topPct + "%";
    tube.style.width = sizePct + "%";

    var img = document.createElement("img");
    img.src = creamUrl;
    img.alt = "";
    img.draggable = false;
    tube.appendChild(img);

    return tube;
  }

  function SkinCreamScene(root, options) {
    this.root = root;
    this.options = options || {};
    this.artboard = null;
    this.layoutW = DESIGN_W;
    this.layoutH = DESIGN_H;
    this.artboardW = DESIGN_W;
    this.artboardH = DESIGN_H;
    this.plaqueDiameter = DESIGN_DIAMETER;
    this.plaqueStates = {};
    this.creamTube = null;
    this.hintEl = null;
    this.hasCreamBrush = false;
    this.isDrawing = false;
    this.hasDrawnThisStroke = false;
    this.lastDrawPoint = null;
    this.strokeHits = {};
    this.displayWidth = 1;
    this.displayHeight = 1;
    this.resizeObserver = null;
    this.setupDone = false;
    this.creamSequenceActive = false;
    this.isPreload = false;
    this.isRevealed = false;
    this.onReadyCallback = null;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerCancel = this.onPointerUp.bind(this);
    this.onCreamTubePointerDown = this.onCreamTubePointerDown.bind(this);
    this.syncCanvasSize = this.syncCanvasSize.bind(this);
    this.finishSetup = this.finishSetup.bind(this);
  }

  SkinCreamScene.prototype.mount = function (preload) {
    this.isPreload = !!preload;
    this.isRevealed = false;
    this.setupDone = false;
    var baseUrl = this.options.baseUrl;
    var plaqueSourceUrl = this.options.plaqueSourceUrl;
    var creamTubeUrl = this.options.creamTubeUrl || "/static/intro/cream.png";
    var designPlaques = this.options.plaques || TEST_PLAQUES;

    this.root.innerHTML =
      '<div class="skin-cream-artboard">' +
      '<img class="skin-cream-base" alt="Skin with psoriasis plaque" />' +
      '<div class="skin-cream-plaques" aria-hidden="false"></div>' +
      '<canvas class="skin-cream-canvas" aria-label="Apply cream to skin"></canvas>' +
      "</div>" +
      '<p class="skin-cream-hint">Click the cream tube, then press and drag on the skin</p>';

    this.artboard = this.root.querySelector(".skin-cream-artboard");
    this.canvas = this.root.querySelector(".skin-cream-canvas");
    this.plaqueLayer = this.root.querySelector(".skin-cream-plaques");
    this.hintEl = this.root.querySelector(".skin-cream-hint");
    this.ctx = this.canvas.getContext("2d");
    this.creamTubeUrl = creamTubeUrl;

    var baseImg = this.root.querySelector(".skin-cream-base");
    this.designPlaques = designPlaques;
    this.plaqueSourceUrl = plaqueSourceUrl;

    baseImg.addEventListener("load", this.finishSetup);
    baseImg.addEventListener("error", function () {
      baseImg.alt = "Could not load skin image";
    });

    baseImg.src = baseUrl;

    if (baseImg.complete && baseImg.naturalWidth > 0) {
      this.finishSetup();
    }
  };

  SkinCreamScene.prototype.finishSetup = function () {
    var baseImg = this.root.querySelector(".skin-cream-base");
    if (this.setupDone || !baseImg || !baseImg.naturalWidth) {
      return;
    }

    this.setupDone = true;

    this.layoutW = DESIGN_W;
    this.layoutH = DESIGN_H;
    this.artboardW = DESIGN_W;
    this.artboardH = DESIGN_H;
    this.plaqueDiameter = DESIGN_DIAMETER;
    this.plaqueStates = {};
    this.plaqueLayer.innerHTML = "";

    for (var i = 0; i < this.designPlaques.length; i += 1) {
      var designPlaque = this.designPlaques[i];
      var plaque = {
        id: designPlaque.id,
        x: designPlaque.x,
        y: designPlaque.y,
      };

      var healedUrl = designPlaque.healed
        ? resolveIntroAsset(this.options.introPath, designPlaque.healed)
        : null;

      var maskW = designPlaque.diameter || DESIGN_DIAMETER;
      var maskH = designPlaque.height || maskW;

      var plaqueEl = createPlaqueElement(
        plaque,
        this.plaqueSourceUrl,
        healedUrl,
        this.layoutW,
        this.layoutH,
        maskW,
        maskH
      );
      this.plaqueLayer.appendChild(plaqueEl);
      this.plaqueStates[plaque.id] = {
        element: plaqueEl,
        faded: false,
        treating: false,
        returnTimer: null,
        x: plaque.x,
        y: plaque.y,
        radiusX: maskW / 2,
        radiusY: maskH / 2,
      };
    }

    this.creamTube = createCreamTube(this.layoutW, this.layoutH, this.creamTubeUrl);
    this.creamTube.addEventListener("pointerdown", this.onCreamTubePointerDown);
    this.artboard.insertBefore(this.creamTube, this.canvas);

    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerCancel);
    window.addEventListener("resize", this.syncCanvasSize);

    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(this.syncCanvasSize);
      this.resizeObserver.observe(this.root);
    }

    var self = this;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        self.syncCanvasSize();

        if (self.isPreload) {
          self.root.classList.add("skin-cream-scene-preload");
          self.root.classList.remove("skin-cream-scene-visible");
        } else {
          self.reveal();
        }

        if (typeof self.onReadyCallback === "function") {
          self.onReadyCallback();
          self.onReadyCallback = null;
        }
      });
    });
  };

  SkinCreamScene.prototype.reveal = function (onComplete) {
    if (this.isRevealed) {
      if (typeof onComplete === "function") {
        onComplete();
      }
      return;
    }

    this.isRevealed = true;
    this.isPreload = false;
    this.root.classList.remove("skin-cream-scene-hidden", "skin-cream-scene-preload");
    this.root.classList.add("skin-cream-scene-visible");
    this.root.setAttribute("aria-hidden", "false");
    document.body.classList.add("skin-cream-active");
    this.syncCanvasSize();

    if (typeof onComplete === "function") {
      window.setTimeout(onComplete, 550);
    }
  };

  SkinCreamScene.prototype.pickUpCream = function () {
    if (this.hasCreamBrush || this.creamSequenceActive) {
      return;
    }

    this.hasCreamBrush = true;
    this.root.classList.add("skin-cream-brush-ready");
    document.body.classList.add("skin-cream-brush-active");

    if (this.hintEl) {
      this.hintEl.textContent = "Press and drag on the skin, then release";
    }
  };

  SkinCreamScene.prototype.releaseCreamBrush = function () {
    this.hasCreamBrush = false;
    this.root.classList.remove("skin-cream-brush-ready");
    document.body.classList.remove("skin-cream-brush-active");

    if (this.hintEl) {
      this.hintEl.textContent = "Click the cream tube, then press and drag on the skin";
    }
  };

  SkinCreamScene.prototype.onCreamTubePointerDown = function (event) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.pickUpCream();
  };

  SkinCreamScene.prototype.destroy = function () {
    this.releaseCreamBrush();

    var ids = Object.keys(this.plaqueStates);
    for (var i = 0; i < ids.length; i += 1) {
      var state = this.plaqueStates[ids[i]];
      if (state.returnTimer) {
        clearTimeout(state.returnTimer);
      }
    }

    if (this.creamTube) {
      this.creamTube.removeEventListener("pointerdown", this.onCreamTubePointerDown);
    }

    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas.removeEventListener("pointermove", this.onPointerMove);
      this.canvas.removeEventListener("pointerup", this.onPointerUp);
      this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
    }

    window.removeEventListener("resize", this.syncCanvasSize);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.root) {
      this.root.innerHTML = "";
      this.root.classList.remove(
        "skin-cream-brush-ready",
        "skin-cream-drawing",
        "skin-cream-scene-preload",
        "skin-cream-scene-visible"
      );
      this.root.classList.add("skin-cream-scene-hidden");
      this.root.setAttribute("aria-hidden", "true");
    }

    this.isPreload = false;
    this.isRevealed = false;
    this.onReadyCallback = null;
    document.body.classList.remove("skin-cream-active", "skin-cream-brush-active");
    this.plaqueStates = {};
    activeScene = null;
  };

  SkinCreamScene.prototype.getArtboardMetrics = function () {
    var rect = this.root.getBoundingClientRect();
    var containerW = Math.max(1, rect.width);
    var containerH = Math.max(1, rect.height);
    var layout = getContainedRect(containerW, containerH, this.layoutW, this.layoutH);

    return {
      containerW: containerW,
      containerH: containerH,
      left: layout.left,
      top: layout.top,
      width: layout.width,
      height: layout.height,
      scaleX: layout.width / this.layoutW,
      scaleY: layout.height / this.layoutH,
    };
  };

  SkinCreamScene.prototype.syncCanvasSize = function () {
    if (!this.root || !this.canvas || !this.artboard) {
      return;
    }

    var metrics = this.getArtboardMetrics();
    var width = Math.max(1, Math.round(metrics.width));
    var height = Math.max(1, Math.round(metrics.height));

    this.artboard.style.left = metrics.left + "px";
    this.artboard.style.top = metrics.top + "px";
    this.artboard.style.width = width + "px";
    this.artboard.style.height = height + "px";

    this.canvas.width = width;
    this.canvas.height = height;
    this.displayWidth = width;
    this.displayHeight = height;
    this.artboardOffsetX = metrics.left;
    this.artboardOffsetY = metrics.top;
    this.displayScaleX = metrics.scaleX;
    this.displayScaleY = metrics.scaleY;
  };

  SkinCreamScene.prototype.getScenePoint = function (event) {
    var rootRect = this.root.getBoundingClientRect();
    var metrics = this.getArtboardMetrics();
    var localX = event.clientX - rootRect.left - metrics.left;
    var localY = event.clientY - rootRect.top - metrics.top;

    return {
      x: (localX / metrics.width) * this.layoutW,
      y: (localY / metrics.height) * this.layoutH,
    };
  };

  SkinCreamScene.prototype.drawCream = function (x, y) {
    var scaleXDisplay = this.displayScaleX || this.displayWidth / this.layoutW;
    var scaleYDisplay = this.displayScaleY || this.displayHeight / this.layoutH;
    var radius = BRUSH_RADIUS * ((scaleXDisplay + scaleYDisplay) / 2);
    var displayX = x * scaleXDisplay;
    var displayY = y * scaleYDisplay;
    var creamStyle = "rgba(255, 248, 235, 0.82)";

    this.ctx.save();
    this.ctx.fillStyle = creamStyle;
    this.ctx.strokeStyle = creamStyle;
    this.ctx.lineWidth = radius * 2;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    if (this.lastDrawPoint) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastDrawPoint.x, this.lastDrawPoint.y);
      this.ctx.lineTo(displayX, displayY);
      this.ctx.stroke();
    } else {
      this.ctx.beginPath();
      this.ctx.arc(displayX, displayY, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
    this.lastDrawPoint = { x: displayX, y: displayY };
    this.hasDrawnThisStroke = true;

    if (this.isDrawing && !this.creamSequenceActive) {
      this.markPlaqueHits(x, y, BRUSH_RADIUS);
    }
  };

  SkinCreamScene.prototype.markPlaqueHits = function (artX, artY, brushRadiusArt) {
    var ids = Object.keys(this.plaqueStates);

    for (var i = 0; i < ids.length; i += 1) {
      var state = this.plaqueStates[ids[i]];
      if (state.faded || state.treating) {
        continue;
      }

      var rx = (state.radiusX || this.plaqueDiameter / 2) + brushRadiusArt * 0.65;
      var ry = (state.radiusY || this.plaqueDiameter / 2) + brushRadiusArt * 0.65;
      var dx = (artX - state.x) / rx;
      var dy = (artY - state.y) / ry;

      if (dx * dx + dy * dy <= 1) {
        this.strokeHits[ids[i]] = state;
      }
    }
  };

  SkinCreamScene.prototype.fadeCream = function (onComplete) {
    if (this.creamSequenceActive) {
      return;
    }

    this.creamSequenceActive = true;
    this.canvas.classList.remove("skin-cream-canvas-fading");
    void this.canvas.offsetWidth;
    this.canvas.classList.add("skin-cream-canvas-fading");

    var self = this;

    window.setTimeout(function () {
      self.canvas.classList.remove("skin-cream-canvas-fading");
      self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
      self.creamSequenceActive = false;
      self.lastDrawPoint = null;

      if (typeof onComplete === "function") {
        onComplete();
      }
    }, CREAM_FADE_MS);
  };

  SkinCreamScene.prototype.startPlaqueFade = function (state) {
    if (!state || state.faded || state.treating) {
      return;
    }

    state.treating = true;
    state.faded = true;
    state.element.classList.remove("skin-cream-plaque-returning");
    state.element.classList.add("skin-cream-plaque-fading");

    if (state.returnTimer) {
      clearTimeout(state.returnTimer);
    }

    var self = this;
    state.returnTimer = window.setTimeout(function () {
      self.restorePlaque(state);
    }, RETURN_MS);
  };

  SkinCreamScene.prototype.finishStroke = function () {
    if (!this.hasDrawnThisStroke || this.creamSequenceActive) {
      return;
    }

    var hitIds = Object.keys(this.strokeHits);
    var hitStates = [];
    var self = this;

    for (var h = 0; h < hitIds.length; h += 1) {
      hitStates.push(this.strokeHits[hitIds[h]]);
    }

    this.releaseCreamBrush();
    this.strokeHits = {};

    this.fadeCream(function () {
      for (var i = 0; i < hitStates.length; i += 1) {
        self.startPlaqueFade(hitStates[i]);
      }
    });
  };

  SkinCreamScene.prototype.restorePlaque = function (state) {
    state.faded = false;
    state.treating = false;
    state.element.classList.remove("skin-cream-plaque-fading");
    state.element.classList.add("skin-cream-plaque-returning");

    window.setTimeout(function () {
      state.element.classList.remove("skin-cream-plaque-returning");
    }, PLAQUE_FADE_MS);

    state.returnTimer = null;
  };

  SkinCreamScene.prototype.onPointerDown = function (event) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (!this.hasCreamBrush || this.creamSequenceActive) {
      return;
    }

    this.isDrawing = true;
    this.hasDrawnThisStroke = false;
    this.lastDrawPoint = null;
    this.strokeHits = {};
    this.root.classList.add("skin-cream-drawing");
    this.canvas.setPointerCapture(event.pointerId);

    var point = this.getScenePoint(event);
    this.drawCream(point.x, point.y);
  };

  SkinCreamScene.prototype.onPointerMove = function (event) {
    if (!this.isDrawing || this.creamSequenceActive) {
      return;
    }

    var point = this.getScenePoint(event);
    this.drawCream(point.x, point.y);
  };

  SkinCreamScene.prototype.onPointerUp = function (event) {
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    if (!this.isDrawing) {
      return;
    }

    this.isDrawing = false;
    this.root.classList.remove("skin-cream-drawing");
    this.finishStroke();
  };

  window.SkinCreamExperience = {
    isReady: function () {
      return !!(activeScene && activeScene.setupDone);
    },

    preload: function (container, options, onReady) {
      if (!container) {
        return null;
      }

      if (activeScene && activeScene.root === container && activeScene.setupDone) {
        if (typeof onReady === "function") {
          onReady();
        }
        return activeScene;
      }

      this.hide();

      container.classList.remove("skin-cream-scene-hidden");
      container.setAttribute("aria-hidden", "true");

      activeScene = new SkinCreamScene(container, options);
      activeScene.onReadyCallback = onReady;
      activeScene.mount(true);
      return activeScene;
    },

    reveal: function (onComplete) {
      if (!activeScene) {
        if (typeof onComplete === "function") {
          onComplete();
        }
        return;
      }

      activeScene.reveal(onComplete);
    },

    syncLayout: function () {
      if (activeScene) {
        activeScene.syncCanvasSize();
      }
    },

    show: function (container, options) {
      if (!container) {
        return null;
      }

      this.hide();

      container.classList.remove("skin-cream-scene-hidden");
      container.setAttribute("aria-hidden", "false");

      activeScene = new SkinCreamScene(container, options);
      activeScene.mount(false);
      return activeScene;
    },

    hide: function () {
      if (activeScene) {
        activeScene.destroy();
      }
    },
  };
})();
