/* Design 3 — Strata. Scroll dives the camera through shader-driven translucent sheets. */
(function () {
  "use strict";
  var body = document.body;
  var canvas = document.getElementById("d3-stage");
  var LAYERS = 7, GAP = 14;

  /* ---------- DOM motion ---------- */
  if (!DZ.reduced) {
    gsap.from(".d3-title-in", { yPercent: 110, duration: 1.4, ease: "expo.out", stagger: 0.12, delay: 0.15 });
    gsap.from(".d3-kicker, .d3-tagline, .d3-dive", { y: 26, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.1, delay: 0.6 });
    gsap.utils.toArray(".d3-glass").forEach(function (el) {
      gsap.fromTo(el, { y: 140, opacity: 0, scale: 0.9, rotateX: 18, transformPerspective: 1000 },
        { y: 0, opacity: 1, scale: 1, rotateX: 0, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 100%", end: "top 55%", scrub: 0.6 } });
    });
    gsap.from(".d3-portal", { y: 50, opacity: 0, stagger: 0.07, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".d3-portals", start: "top 85%" } });
  }
  document.querySelectorAll(".d3-portal").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var b = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - b.left) + "px");
      el.style.setProperty("--my", (e.clientY - b.top) + "px");
    });
  });

  var layerNum = document.getElementById("d3-layer"), marker = document.getElementById("d3-marker");
  function setGauge(p) {
    var n = Math.min(6, Math.round(p * 6));
    layerNum.textContent = "0" + n;
    marker.style.top = (p * 100) + "%";
    body.classList.toggle("is-deep", p > 0.4);
  }
  var target = 0;
  ScrollTrigger.create({ trigger: "#d3-main", start: "top top", end: "bottom bottom", onUpdate: function (s) { target = s.progress; if (!DZ.webgl || DZ.reduced) setGauge(s.progress); } });

  if (!DZ.webgl) { body.classList.add("no-webgl"); canvas.style.display = "none"; return; }

  /* ---------- Scene ---------- */
  var renderer = DZ.renderer(canvas, { clear: 0xfde9dc });
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);

  var palette = [
    ["#ffd3b5", "#ff7a59"], ["#ffc2cf", "#f0609a"], ["#e3b3ff", "#a24bd9"], ["#b8a8ff", "#5b3fff"],
    ["#9ff0ff", "#1aa6d9"], ["#7df5d1", "#14b89a"], ["#ffb38a", "#ff4f7b"]
  ];
  var skies = ["#fde9dc", "#f8cfcf", "#d9a6d8", "#7e5bb5", "#2f2366", "#130b2b", "#07040f"].map(function (c) { return new THREE.Color(c); });

  var NOISE = DZ.GLSL_NOISE;

  var sheetVert = [
    "uniform float uTime; uniform float uSeed; varying float vH; varying vec3 vWorld; varying float vDist;",
    NOISE,
    "void main(){",
    "  vec3 p = position;",
    "  float n = snoise(vec3(p.x*.045 + uSeed, p.y*.045, uTime*.08 + uSeed));",
    "  float n2 = snoise(vec3(p.x*.12, p.y*.12 - uTime*.05, uSeed));",
    "  p.z += n*3.2 + n2*.7;",
    "  vH = n*.5 + .5 + n2*.15;",
    "  vec4 w = modelMatrix * vec4(p,1.); vWorld = w.xyz;",
    "  vec4 mv = viewMatrix * w; vDist = -mv.z;",
    "  gl_Position = projectionMatrix * mv;",
    "}"
  ].join("\n");
  var sheetFrag = [
    "uniform vec3 uA; uniform vec3 uB; uniform float uNear; uniform float uTime; uniform vec3 uCam;",
    "varying float vH; varying vec3 vWorld; varying float vDist;",
    "void main(){",
    "  float c = abs(fract(vH*9. - uTime*.05) - .5);",
    "  float line = smoothstep(.06, .0, c);",
    "  vec3 col = mix(uA, uB, smoothstep(.15, .95, vH));",
    "  float edge = 1. - smoothstep(18., 44., length(vWorld.xz - uCam.xz));",
    "  float fade = smoothstep(95., 10., vDist) * smoothstep(.6, 4., vDist);",
    "  float a = (.16 + line*.6 + uNear*.25) * edge * fade;",
    "  col += line * .35 + uNear * .2;",
    "  gl_FragColor = vec4(col, a);",
    "}"
  ].join("\n");

  var sheets = [];
  var sheetGeo = new THREE.PlaneGeometry(100, 100, DZ.coarse ? 90 : 180, DZ.coarse ? 90 : 180);
  for (var i = 0; i < LAYERS; i++) {
    var m = new THREE.ShaderMaterial({
      vertexShader: sheetVert, fragmentShader: sheetFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uSeed: { value: i * 3.7 }, uA: { value: new THREE.Color(palette[i][0]) }, uB: { value: new THREE.Color(palette[i][1]) },
        uNear: { value: 0 }, uCam: { value: new THREE.Vector3() } }
    });
    var sheet = new THREE.Mesh(sheetGeo, m);
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.y = -i * GAP;
    scene.add(sheet);
    sheets.push(sheet);
  }

  /* Glowing orbs with a fresnel rim */
  var rand = DZ.rng(21);
  var ORBS = DZ.coarse ? 70 : 140;
  var orbMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: [
      "varying vec3 vN; varying vec3 vV; varying vec3 vC;",
      "void main(){",
      "  vec4 w = modelMatrix * instanceMatrix * vec4(position,1.);",
      "  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);",
      "  vV = normalize(cameraPosition - w.xyz);",
      "  #ifdef USE_INSTANCING_COLOR",
      "  vC = instanceColor;",
      "  #else",
      "  vC = vec3(1.);",
      "  #endif",
      "  gl_Position = projectionMatrix * viewMatrix * w;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "varying vec3 vN; varying vec3 vV; varying vec3 vC;",
      "void main(){",
      "  float rim = pow(1. - abs(dot(normalize(vN), vV)), 2.4);",
      "  vec3 col = vC * (.12 + rim * 1.5);",
      "  gl_FragColor = vec4(col, .2 + rim*.8);",
      "}"
    ].join("\n")
  });
  var orbs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 32, 20), orbMat, ORBS);
  var orbData = [], dummy = new THREE.Object3D(), tmpColor = new THREE.Color();
  for (var o = 0; o < ORBS; o++) {
    var ox = (rand() - .5) * 70; if (Math.abs(ox) < 9) ox += ox < 0 ? -9 : 9;
    var d = { x: ox, y: 4 - rand() * (GAP * (LAYERS - 1) + 8), z: (rand() - .5) * 50 - 14, s: 0.2 + Math.pow(rand(), 3) * 1.4, ph: rand() * 6.28, sp: 0.2 + rand() * 0.5 };
    orbData.push(d);
    var depth = Math.min(LAYERS - 1, Math.max(0, Math.round(-d.y / GAP)));
    tmpColor.set(palette[depth][1]).lerp(new THREE.Color(palette[(depth + 1) % LAYERS][0]), rand());
    orbs.setColorAt(o, tmpColor);
  }
  scene.add(orbs);

  /* Drifting motes */
  var MOTES = DZ.coarse ? 1500 : 4000;
  var mp = new Float32Array(MOTES * 3);
  for (var k = 0; k < MOTES; k++) { mp[k * 3] = (rand() - .5) * 70; mp[k * 3 + 1] = 8 - rand() * 100; mp[k * 3 + 2] = (rand() - .5) * 70; }
  var moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  var motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ size: 0.08, color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(motes);

  /* ---------- Camera dive ---------- */
  var current = 0, mx = 0, my = 0;
  window.addEventListener("pointermove", function (e) { mx = e.clientX / window.innerWidth - .5; my = e.clientY / window.innerHeight - .5; }, { passive: true });
  var sky = new THREE.Color(), look = new THREE.Vector3();

  function place(p, t) {
    var y = 9 - p * (GAP * (LAYERS - 1) + 6);
    var sway = Math.sin(p * Math.PI * 3) * 4;
    camera.position.set(sway + mx * 2, y, 22 - Math.sin(p * Math.PI) * 8);
    var down = 0.55 - p * 0.35;
    look.set(sway * 0.4 - mx * 3, y - 10 * down - my * 3, 0);
    camera.lookAt(look);
    camera.rotation.z += Math.sin(t * 0.3) * 0.01 + mx * 0.04;

    var f = p * (skies.length - 1), a = Math.floor(f), b = Math.min(a + 1, skies.length - 1);
    sky.copy(skies[a]).lerp(skies[b], f - a);
    renderer.setClearColor(sky, 1);

    for (var i = 0; i < LAYERS; i++) {
      var u = sheets[i].material.uniforms;
      u.uTime.value = t;
      u.uNear.value = Math.max(0, 1 - Math.abs(y - sheets[i].position.y) / 6);
      u.uCam.value.copy(camera.position);
    }
  }

  function updateOrbs(t) {
    for (var i = 0; i < ORBS; i++) {
      var d = orbData[i];
      dummy.position.set(d.x + Math.sin(t * d.sp + d.ph) * 1.4, d.y + Math.sin(t * d.sp * 0.7 + d.ph) * 1.2, d.z + Math.cos(t * d.sp + d.ph) * 1.4);
      dummy.scale.setScalar(d.s * (1 + Math.sin(t * 1.3 + d.ph) * 0.06));
      dummy.updateMatrix();
      orbs.setMatrixAt(i, dummy.matrix);
    }
    orbs.instanceMatrix.needsUpdate = true;
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = camera.aspect < 0.8 ? 75 : 60;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }
  resize();
  DZ.onResize(function () { resize(); if (DZ.reduced) { place(target, 0); renderer.render(scene, camera); } });

  if (DZ.reduced) { updateOrbs(0); place(0, 0); setGauge(0); renderer.render(scene, camera); return; }

  DZ.loop(function (t, dt) {
    current += (target - current) * Math.min(1, dt * 2.6);
    setGauge(current);
    place(current, t);
    updateOrbs(t);
    motes.rotation.y = t * 0.01;
    renderer.render(scene, camera);
  });
})();
