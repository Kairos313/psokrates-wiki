/* Design 4 — Signal. A GPU particle cloud morphs between shapes as you scroll; HUD tracks state. */
(function () {
  "use strict";
  var body = document.body;
  var canvas = document.getElementById("d4-stage");

  /* ---------- HUD + DOM ---------- */
  var elScroll = document.getElementById("d4-scroll"), elFps = document.getElementById("d4-fps"),
      elMode = document.getElementById("d4-mode"), elX = document.getElementById("d4-x"), elY = document.getElementById("d4-y");
  function pad(n, w) { n = String(Math.max(0, Math.round(n))); while (n.length < w) n = "0" + n; return n; }
  window.addEventListener("pointermove", function (e) { elX.textContent = pad(e.clientX, 4); elY.textContent = pad(e.clientY, 4); }, { passive: true });

  var steps = document.querySelectorAll(".d4-hud-left span");
  document.querySelectorAll("main [data-step]").forEach(function (sec) {
    ScrollTrigger.create({ trigger: sec, start: "top 55%", end: "bottom 55%", onToggle: function (s) {
      if (!s.isActive) return;
      steps.forEach(function (el) { el.classList.toggle("is-active", el.dataset.step === sec.dataset.step); });
    } });
  });

  document.querySelectorAll("[data-scramble]").forEach(function (el) {
    ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: function () { DZ.scramble(el, 1.1); } });
    el.addEventListener("pointerenter", function () { DZ.scramble(el, 0.5); });
  });

  if (!DZ.reduced) {
    gsap.from(".d4-kicker, .d4-tagline, .d4-hero-actions", { opacity: 0, y: 20, duration: 0.8, stagger: 0.12, delay: 0.5 });
    gsap.utils.toArray(".d4-panel").forEach(function (el) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 75%" } });
      tl.from(el, { clipPath: "inset(0 100% 0 0)", duration: 0.7, ease: "power3.inOut" })
        .from(el.querySelectorAll(".d4-term span"), { opacity: 0, x: -10, stagger: 0.15, duration: 0.3 }, "-=0.1");
    });
    gsap.from(".d4-bar i", { scaleX: 0, duration: 1.4, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: ".d4-data", start: "top 80%" } });

    // horizontal rail
    var rail = document.querySelector(".d4-rail");
    var dist = function () { return Math.max(0, rail.scrollWidth - window.innerWidth); };
    gsap.to(rail, { x: function () { return -dist(); }, ease: "none",
      scrollTrigger: { trigger: ".d4-modules-pin", pin: true, start: "top top", end: function () { return "+=" + (dist() + window.innerHeight * 0.3); }, scrub: 0.8, invalidateOnRefresh: true } });
    DZ.magnetic(".d4-btn", 0.2);
  }
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: function (s) { elScroll.textContent = pad(s.progress * 100, 3); } });
  document.querySelector('.d4-hero .d4-btn').addEventListener("click", function (e) {
    e.preventDefault(); document.getElementById("d4-modules").scrollIntoView({ behavior: DZ.reduced ? "auto" : "smooth" });
  });

  if (!DZ.webgl) { body.classList.add("no-webgl"); canvas.style.display = "none"; return; }

  /* ---------- Particle shapes ---------- */
  var N = DZ.coarse ? 7000 : 16000;
  var rand = DZ.rng(99);
  var aHelix = new Float32Array(N * 3), aSphere = new Float32Array(N * 3), aField = new Float32Array(N * 3), aRing = new Float32Array(N * 3), aRand = new Float32Array(N);

  for (var i = 0; i < N; i++) {
    var r = rand(), j = i * 3, t, ang, k;
    aRand[i] = rand();
    // helix: two strands, rungs, halo
    if (r < 0.62) {
      t = rand(); ang = t * Math.PI * 7 + (i % 2 ? Math.PI : 0);
      var jit = 0.18;
      aHelix[j] = Math.cos(ang) * 2.4 + (rand() - .5) * jit;
      aHelix[j + 1] = (t - .5) * 17 + (rand() - .5) * jit;
      aHelix[j + 2] = Math.sin(ang) * 2.4 + (rand() - .5) * jit;
    } else if (r < 0.86) {
      k = Math.floor(rand() * 44); t = k / 44; ang = t * Math.PI * 7;
      var f = rand() * 2 - 1;
      aHelix[j] = Math.cos(ang) * 2.4 * f;
      aHelix[j + 1] = (t - .5) * 17;
      aHelix[j + 2] = Math.sin(ang) * 2.4 * f;
    } else {
      ang = rand() * Math.PI * 2; var rr = 3 + rand() * 4;
      aHelix[j] = Math.cos(ang) * rr; aHelix[j + 1] = (rand() - .5) * 20; aHelix[j + 2] = Math.sin(ang) * rr;
    }
    // fibonacci sphere with a thin shell
    var phi = Math.acos(1 - 2 * (i + 0.5) / N), th = Math.PI * (1 + Math.sqrt(5)) * i, sr = 5.2 + (rand() - .5) * (r > 0.9 ? 3 : 0.25);
    aSphere[j] = Math.sin(phi) * Math.cos(th) * sr; aSphere[j + 1] = Math.cos(phi) * sr; aSphere[j + 2] = Math.sin(phi) * Math.sin(th) * sr;
    // flat field (y animated in shader)
    var side = Math.ceil(Math.sqrt(N)), gx = i % side, gz = Math.floor(i / side);
    aField[j] = (gx / side - .5) * 30; aField[j + 1] = 0; aField[j + 2] = (gz / side - .5) * 30;
    // torus ring
    var u = rand() * Math.PI * 2, v = rand() * Math.PI * 2, R = 5.4, tr = 0.5 + rand() * 0.9;
    aRing[j] = (R + tr * Math.cos(v)) * Math.cos(u); aRing[j + 1] = tr * Math.sin(v); aRing[j + 2] = (R + tr * Math.cos(v)) * Math.sin(u);
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(aHelix, 3));
  geo.setAttribute("aSphere", new THREE.BufferAttribute(aSphere, 3));
  geo.setAttribute("aField", new THREE.BufferAttribute(aField, 3));
  geo.setAttribute("aRing", new THREE.BufferAttribute(aRing, 3));
  geo.setAttribute("aRand", new THREE.BufferAttribute(aRand, 1));

  var renderer = DZ.renderer(canvas, { clear: 0x05060a });
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 22);

  var uniforms = {
    uTime: { value: 0 }, uMorph: { value: 0 }, uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uPix: { value: renderer.getPixelRatio() }, uA: { value: new THREE.Color(0x39f3ff) }, uB: { value: new THREE.Color(0xff3bd4) }
  };
  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: [
      "uniform float uTime; uniform float uMorph; uniform vec3 uMouse; uniform float uPix;",
      "attribute vec3 aSphere; attribute vec3 aField; attribute vec3 aRing; attribute float aRand;",
      "varying float vR; varying float vGlow;",
      "vec3 rotY(vec3 p, float a){ float c=cos(a), s=sin(a); return vec3(c*p.x+s*p.z, p.y, -s*p.x+c*p.z); }",
      "void main(){",
      "  vec3 field = aField; field.y = sin(field.x*.35 + uTime*1.2)*1.1 + cos(field.z*.3 + uTime*.9)*1.1; field.y -= 2.;",
      "  vec3 helix = rotY(position, uTime*.25);",
      "  vec3 sph = rotY(aSphere, -uTime*.15) * (1. + sin(uTime*1.5 + aRand*6.28)*.02);",
      "  vec3 ring = rotY(aRing, uTime*.3);",
      "  float m = uMorph;",
      "  float e1 = smoothstep(0., 1., clamp(m, 0., 1.));",
      "  float e2 = smoothstep(0., 1., clamp(m-1., 0., 1.));",
      "  float e3 = smoothstep(0., 1., clamp(m-2., 0., 1.));",
      "  float d = aRand*.35;",
      "  vec3 p = mix(helix, sph, smoothstep(d, d+.65, e1));",
      "  p = mix(p, field, smoothstep(d, d+.65, e2));",
      "  p = mix(p, ring, smoothstep(d, d+.65, e3));",
      "  float chaos = sin(3.14159*fract(m)) * (1. - step(2.999, m));",
      "  p += (vec3(fract(aRand*13.1), fract(aRand*7.7), fract(aRand*3.3)) - .5) * chaos * 3.;",
      "  vec4 mv = modelViewMatrix * vec4(p, 1.);",
      "  vec3 toM = mv.xyz - uMouse; float dm = length(toM.xy);",
      "  float push = smoothstep(3.5, 0., dm);",
      "  mv.xy += normalize(toM.xy + .0001) * push * 1.6;",
      "  vGlow = push;",
      "  vR = aRand;",
      "  gl_Position = projectionMatrix * mv;",
      "  gl_PointSize = (1.4 + aRand*2.2 + push*3.) * uPix * (22. / -mv.z);",
      "}"
    ].join("\n"),
    fragmentShader: [
      "uniform vec3 uA; uniform vec3 uB; varying float vR; varying float vGlow;",
      "void main(){",
      "  float d = length(gl_PointCoord - .5);",
      "  float a = smoothstep(.5, .0, d);",
      "  vec3 col = mix(uA, uB, smoothstep(.55, 1., vR)) + vGlow*.6;",
      "  gl_FragColor = vec4(col, a * (.55 + vR*.45));",
      "}"
    ].join("\n")
  });
  var points = new THREE.Points(geo, mat);
  var rig = new THREE.Group();
  rig.add(points);
  scene.add(rig);

  /* faint grid floor for depth */
  var grid = new THREE.GridHelper(80, 60, 0x0f4a55, 0x0a242b);
  grid.position.y = -10;
  grid.material.transparent = true; grid.material.opacity = 0.5;
  scene.add(grid);

  /* ---------- Interaction ---------- */
  var target = 0, morph = 0, mx = 0, my = 0, mobile = false;
  var modes = ["HELIX", "SPHERE", "FIELD", "RING"];
  ScrollTrigger.create({ trigger: "#d4-main", start: "top top", end: "bottom bottom", onUpdate: function (s) { target = s.progress; } });
  var ndc = new THREE.Vector2(9, 9);
  window.addEventListener("pointermove", function (e) {
    mx = e.clientX / window.innerWidth - .5; my = e.clientY / window.innerHeight - .5;
    ndc.set(mx * 2, -my * 2);
  }, { passive: true });

  function layout() {
    mobile = window.innerWidth < 860;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.z = mobile ? 30 : 22;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    uniforms.uPix.value = renderer.getPixelRatio();
  }
  layout();
  DZ.onResize(function () { layout(); if (DZ.reduced) renderer.render(scene, camera); });

  function mouseView() {
    // pointer in view space at the depth of the rig centre
    var depth = camera.position.z;
    var h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * depth;
    uniforms.uMouse.value.set(ndc.x * h * camera.aspect / 2, ndc.y * h / 2, -depth);
  }

  if (DZ.reduced) { rig.position.x = mobile ? 0 : 5; renderer.render(scene, camera); return; }

  var frames = 0, fpsT = 0;
  DZ.loop(function (t, dt) {
    morph += (Math.min(target * 3.4, 3) - morph) * Math.min(1, dt * 2.5);
    uniforms.uMorph.value = morph;
    uniforms.uTime.value = t;
    mouseView();
    var side = mobile ? 0 : 5 * (1 - Math.min(1, morph) * 0.5) * (morph < 2 ? 1 : 0.0);
    rig.position.x += (side - rig.position.x) * 0.05;
    rig.rotation.x += ((morph > 1.5 && morph < 2.5 ? 0.35 : 0.12) + my * 0.2 - rig.rotation.x) * 0.05;
    rig.rotation.z = -mx * 0.15;
    camera.position.y += (-my * 1.5 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
    grid.position.z = (t * 2) % (80 / 60);
    renderer.render(scene, camera);

    frames++; fpsT += dt;
    if (fpsT > 0.5) { elFps.textContent = pad(frames / fpsT, 2); frames = 0; fpsT = 0; }
    elMode.textContent = modes[Math.min(3, Math.round(morph))];
  });
})();
