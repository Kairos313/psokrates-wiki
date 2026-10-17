(function () {
  var config = window.TEST_TEAMS_BALANCE_CONFIG || {};
  var balanceUrl = config.balanceUrl || "/static/testing/3D_balance";
  var canvas = document.getElementById("test-teams-balance-canvas");
  var pin = document.getElementById("test-teams-pin");
  var teamsPage = pin ? pin.closest(".test-teams-page") : null;
  var isHome = teamsPage && teamsPage.classList.contains("test-teams-page--home");

  if (!canvas || !isHome || typeof THREE === "undefined") {
    return;
  }

  var DESKTOP_MIN = 1024;
  var desktopQuery = window.matchMedia("(min-width: " + DESKTOP_MIN + "px)");
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var balanceModel = null;
  var balanceRenderer = null;
  var balanceScene = null;
  var balanceCamera = null;
  var spinActive = false;
  var sectionVisible = false;
  var balanceInitialized = false;
  var lastSpinTime = 0;
  var SPIN_INTERVAL_MS = 33;

  function fitModel(model) {
    var box = new THREE.Box3().setFromObject(model);
    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    model.position.x += size.x * 0.12;

    var maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      model.scale.setScalar(0.9 / maxDim);
    }
  }

  function initBalance() {
    balanceScene = new THREE.Scene();
    balanceCamera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    balanceCamera.position.set(0.45, 0.08, 4.25);
    balanceCamera.lookAt(0.28, 0, 0);

    balanceRenderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false,
      alpha: true,
    });
    balanceRenderer.setClearColor(0x000000, 0);
    balanceRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    balanceScene.add(new THREE.AmbientLight(0xffffff, 1.1));
    balanceScene.add(new THREE.HemisphereLight(0xfff8f0, 0x2a2418, 0.5));

    var key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(3, 4, 5);
    balanceScene.add(key);

    var fill = new THREE.DirectionalLight(0xd6b26c, 0.55);
    fill.position.set(-2, 1, 3);
    balanceScene.add(fill);

    var rim = new THREE.DirectionalLight(0xfff5e8, 0.45);
    rim.position.set(1, -1, -3);
    balanceScene.add(rim);

    var loader = new THREE.GLTFLoader();
    loader.load(
      balanceUrl,
      function (gltf) {
        balanceModel = gltf.scene;
        fitModel(balanceModel);
        balanceScene.add(balanceModel);
        resizeBalance();
        startSpin();
      },
      undefined,
      function () {
        /* optional */
      }
    );
  }

  function resizeBalance() {
    if (!balanceRenderer || !balanceCamera || !canvas.parentElement) {
      return;
    }

    var w = canvas.parentElement.clientWidth;
    var h = canvas.parentElement.clientHeight;
    balanceRenderer.setSize(w, h, false);
    balanceCamera.aspect = w / h;
    balanceCamera.updateProjectionMatrix();

    if (balanceModel) {
      balanceRenderer.render(balanceScene, balanceCamera);
    }
  }

  function spinFrame(now) {
    if (!spinActive || !balanceModel || !balanceRenderer) {
      return;
    }

    if (now - lastSpinTime < SPIN_INTERVAL_MS) {
      requestAnimationFrame(spinFrame);
      return;
    }

    lastSpinTime = now;
    balanceModel.rotation.y += 0.007;
    balanceRenderer.render(balanceScene, balanceCamera);
    requestAnimationFrame(spinFrame);
  }

  function startSpin() {
    if (
      spinActive ||
      prefersReducedMotion ||
      !desktopQuery.matches ||
      document.hidden ||
      !sectionVisible
    ) {
      if (balanceModel && balanceRenderer) {
        balanceRenderer.render(balanceScene, balanceCamera);
      }
      return;
    }

    spinActive = true;
    spinFrame();
  }

  function stopSpin() {
    spinActive = false;
  }

  function onResize() {
    if (!desktopQuery.matches) {
      stopSpin();
      return;
    }

    resizeBalance();

    if (balanceModel && !spinActive && !prefersReducedMotion) {
      startSpin();
    }
  }

  function watchSectionApproach(target, onApproach) {
    var triggered = false;
    var margin = window.innerHeight * 2;

    function check() {
      if (triggered || !target) {
        return;
      }

      var rect = target.getBoundingClientRect();
      if (rect.top < window.innerHeight + margin && rect.bottom > -margin) {
        triggered = true;
        window.removeEventListener("scroll", check);
        window.removeEventListener("resize", check);
        onApproach();
      }
    }

    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    requestAnimationFrame(check);
  }

  function ensureBalanceInit() {
    if (balanceInitialized || !desktopQuery.matches) {
      return;
    }

    balanceInitialized = true;
    initVisibilityObserver();
    initBalance();
  }

  function initBalanceLazyLoad() {
    if (!desktopQuery.matches) {
      return;
    }

    watchSectionApproach(pin, ensureBalanceInit);
  }

  function initVisibilityObserver() {
    if (!("IntersectionObserver" in window)) {
      sectionVisible = true;
      startSpin();
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        sectionVisible = entries.some(function (entry) {
          return entry.isIntersecting;
        });

        if (sectionVisible) {
          startSpin();
        } else {
          stopSpin();
        }
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(pin);
  }

  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener("change", function () {
      if (desktopQuery.matches) {
        initBalanceLazyLoad();
      }
      onResize();
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      stopSpin();
    } else if (
      balanceModel &&
      desktopQuery.matches &&
      !prefersReducedMotion &&
      sectionVisible
    ) {
      startSpin();
    }
  });

  window.addEventListener("resize", onResize);
  window.addEventListener("test-teams-approach", ensureBalanceInit);
  window.addEventListener("home-preload-balance", ensureBalanceInit);
  initBalanceLazyLoad();
})();
