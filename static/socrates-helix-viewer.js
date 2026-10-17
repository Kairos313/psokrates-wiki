(function (global) {
  var DEFAULT_BG_COLOR = 0xf5f5f5;

  function parseBackgroundColor(value, fallback) {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      var hex = value.replace("#", "").trim();
      if (hex) {
        return parseInt(hex, 16);
      }
    }

    return fallback;
  }

  function isDarkBackground(colorValue) {
    var color = new THREE.Color(colorValue);
    return color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722 < 0.18;
  }

  function applyBackgroundBlend(root, bgColorValue, strength) {
    var bgColor = new THREE.Color(bgColorValue);

    root.traverse(function (child) {
      if (!child.isMesh || !child.material) {
        return;
      }

      var materials = Array.isArray(child.material) ? child.material : [child.material];

      materials.forEach(function (material) {
        if (!material) {
          return;
        }

        if (material.color) {
          material.color.lerp(bgColor, strength);
        }

        if (typeof material.metalness === "number") {
          material.metalness = 0;
        }

        if (typeof material.roughness === "number") {
          material.roughness = 1;
        }

        if (material.emissive && material.emissive.isColor) {
          material.emissive.copy(bgColor).multiplyScalar(isDarkBackground(bgColorValue) ? 0.04 : 0.08);
        }

        material.needsUpdate = true;
      });
    });
  }

  function applyWhiteMarble(root) {
    var marble = new THREE.Color(0xf5f0e6);

    root.traverse(function (child) {
      if (!child.isMesh || !child.material) {
        return;
      }

      var materials = Array.isArray(child.material) ? child.material : [child.material];

      materials.forEach(function (material) {
        if (!material) {
          return;
        }

        if (material.color) {
          material.color.copy(marble);
        }

        if (typeof material.metalness === "number") {
          material.metalness = 0.04;
        }

        if (typeof material.roughness === "number") {
          material.roughness = 0.9;
        }

        if (material.emissive && material.emissive.isColor) {
          material.emissive.set(0x000000);
        }

        material.needsUpdate = true;
      });
    });
  }

  function setupSceneLights(scene, bgColorValue, blendIntoBackground, whiteStatue) {
    var dark = isDarkBackground(bgColorValue);

    if (whiteStatue && dark) {
      scene.add(new THREE.AmbientLight(0xffffff, 0.58));

      var keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
      keyLight.position.set(3, 5, 4);
      scene.add(keyLight);

      var fillLight = new THREE.DirectionalLight(0xfff5e8, 0.42);
      fillLight.position.set(-2, 2, 3);
      scene.add(fillLight);

      var rimLight = new THREE.DirectionalLight(0xd6b26c, 0.32);
      rimLight.position.set(-3, 2, -2);
      scene.add(rimLight);
      return;
    }

    if (whiteStatue) {
      scene.add(new THREE.AmbientLight(0xffffff, 0.72));

      var lightKey = new THREE.DirectionalLight(0xffffff, 0.95);
      lightKey.position.set(3, 5, 4);
      scene.add(lightKey);

      var lightFill = new THREE.DirectionalLight(0xfff5e8, 0.38);
      lightFill.position.set(-2, 2, 3);
      scene.add(lightFill);

      var lightRim = new THREE.DirectionalLight(0xd6b26c, 0.28);
      lightRim.position.set(-3, 2, -2);
      scene.add(lightRim);
      return;
    }

    if (blendIntoBackground && dark) {
      scene.add(new THREE.AmbientLight(0xffffff, 0.42));

      var keyLight = new THREE.DirectionalLight(0xfff5e8, 0.95);
      keyLight.position.set(3, 5, 4);
      scene.add(keyLight);

      var fillLight = new THREE.DirectionalLight(0xd6b26c, 0.35);
      fillLight.position.set(-2, 2, 3);
      scene.add(fillLight);

      var rimLight = new THREE.DirectionalLight(0xffffff, 0.22);
      rimLight.position.set(0, -1, -4);
      scene.add(rimLight);
      return;
    }

    if (blendIntoBackground) {
      scene.add(new THREE.AmbientLight(0xf5f5f5, 1.25));

      var softFill = new THREE.DirectionalLight(0xf5f5f5, 0.06);
      softFill.position.set(0, 4, 2);
      scene.add(softFill);
      return;
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    var classicKey = new THREE.DirectionalLight(0xffffff, 0.8);
    classicKey.position.set(3, 5, 4);
    scene.add(classicKey);

    var classicRim = new THREE.DirectionalLight(0xd6b26c, 0.45);
    classicRim.position.set(-3, 2, -2);
    scene.add(classicRim);
  }

  function createSocratesHelixViewer(canvas, modelUrl, onReady, onError, options) {
    options = options || {};
    var blendIntoBackground = options.blendIntoBackground === true;
    var whiteStatue = options.whiteStatue === true;
    var materialBlendStrength =
      typeof options.materialBlendStrength === "number"
        ? options.materialBlendStrength
        : 0.68;
    var bgColorValue = parseBackgroundColor(
      options.backgroundColor,
      DEFAULT_BG_COLOR
    );

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColorValue);

    var camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false,
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    setupSceneLights(scene, bgColorValue, blendIntoBackground, whiteStatue);

    var model = null;
    var bounds = null;
    var loader = new THREE.GLTFLoader();
    var ZOOM_IN_END = 0.38;
    var HEAD_FOCUS_FROM_TOP = 0.06;
    var SPIRAL_START_CAMERA_LIFT = 0.02;

    loader.load(
      modelUrl,
      function (gltf) {
        model = gltf.scene;

        var box = new THREE.Box3().setFromObject(model);
        var center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        box.setFromObject(model);
        var size = box.getSize(new THREE.Vector3());
        var magnify = 4.7;
        var scale = magnify / Math.max(size.x, size.z, 0.001);
        model.scale.setScalar(scale);

        box.setFromObject(model);
        bounds = {
          topY: box.max.y,
          bottomY: box.min.y,
          height: box.max.y - box.min.y,
          orbitRadius: 0,
        };
        bounds.orbitRadius = bounds.height * 0.7;

        if (whiteStatue) {
          applyWhiteMarble(model);
          scene.fog = new THREE.Fog(
            bgColorValue,
            bounds.height * 0.95,
            bounds.height * 3.6
          );
        } else if (blendIntoBackground) {
          applyBackgroundBlend(model, bgColorValue, materialBlendStrength);
          scene.fog = new THREE.Fog(
            bgColorValue,
            bounds.height * 0.9,
            bounds.height * 3.8
          );
        }

        scene.add(model);
        resize();

        if (typeof onReady === "function") {
          onReady();
        }
      },
      undefined,
      function () {
        if (typeof onError === "function") {
          onError();
        }
      }
    );

    function resize() {
      var width;
      var height;

      if (canvas.classList.contains("home-socrates-canvas-handoff")) {
        width = window.innerWidth;
        height = window.innerHeight;
      } else {
        var parent = canvas.parentElement;
        if (!parent) {
          return;
        }

        width = parent.clientWidth;
        height = parent.clientHeight;
      }

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function render() {
      renderer.render(scene, camera);
    }

    function setHelixProgress(progress) {
      if (!model || !bounds) {
        return;
      }

      var t = Math.max(0, Math.min(1, progress));

      if (t <= ZOOM_IN_END) {
        var zoomT = t / ZOOM_IN_END;

        var farDistance = bounds.height * 2.15;
        var closeDistance = bounds.orbitRadius;
        var distance = farDistance + (closeDistance - farDistance) * zoomT;

        var startFocusY = (bounds.topY + bounds.bottomY) * 0.5;
        var headFocus = bounds.topY - bounds.height * HEAD_FOCUS_FROM_TOP;
        var focusY = startFocusY + (headFocus - startFocusY) * zoomT;

        var startHeight = focusY + bounds.height * 0.6;
        var endHeight = focusY + bounds.height * SPIRAL_START_CAMERA_LIFT;
        var cameraHeight = startHeight + (endHeight - startHeight) * zoomT;

        camera.position.x = 0;
        camera.position.z = distance;
        camera.position.y = cameraHeight;
        camera.lookAt(0, focusY, 0);

        model.rotation.y = 0;
        render();
        return;
      }

      var helixT = (t - ZOOM_IN_END) / (1 - ZOOM_IN_END);
      var headFocus = bounds.topY - bounds.height * HEAD_FOCUS_FROM_TOP;
      var toeFocus = bounds.bottomY + bounds.height * 0.20;
      var focusY = headFocus + (toeFocus - headFocus) * helixT;

      var helixTurns = 2;
      var angle = helixT * Math.PI * 2 * helixTurns;
      var orbitRadius = bounds.orbitRadius;

      var startHeight = bounds.height * SPIRAL_START_CAMERA_LIFT;
      var endHeight = bounds.height * 0.04;
      var cameraHeight = focusY + startHeight + (endHeight - startHeight) * helixT;

      camera.position.x = Math.sin(angle) * orbitRadius;
      camera.position.z = Math.cos(angle) * orbitRadius;
      camera.position.y = cameraHeight;
      camera.lookAt(0, focusY, 0);

      model.rotation.y = angle * 0.4;
      render();
    }

    return {
      resize: resize,
      render: render,
      setHelixProgress: setHelixProgress,
      isReady: function () {
        return !!(model && bounds);
      },
    };
  }

  global.SocratesHelixViewer = {
    create: createSocratesHelixViewer,
  };
})(window);
