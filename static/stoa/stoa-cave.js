/* STOA — Plato's Cave (Education page hero).
   Firelight throws puppet shadows on the cave wall; scrolling turns the viewer around,
   past the fire and out through the mouth into daylight, which fades into the page. */
(function () {
  "use strict";
  var hero = document.querySelector(".edu-hero");
  if (!hero || typeof THREE === "undefined") return;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  try { var test = document.createElement("canvas"); if (!(test.getContext("webgl") || test.getContext("experimental-webgl"))) return; } catch (e) { return; }

  /* ---------- Build the sticky stage around the existing hero (no markup edits) ---------- */
  var stage = document.createElement("section");
  stage.className = "stoa-cave";
  stage.setAttribute("aria-label", "Plato's cave");
  var sticky = document.createElement("div");
  sticky.className = "stoa-cave-sticky";
  var canvas = document.createElement("canvas");
  canvas.className = "stoa-cave-canvas";
  canvas.setAttribute("aria-hidden", "true");
  var flash = document.createElement("div");
  flash.className = "stoa-cave-flash";
  var hint = document.createElement("p");
  hint.className = "stoa-cave-hint";
  hint.setAttribute("aria-hidden", "true");
  hint.textContent = "Scroll to turn toward the light";
  hero.parentNode.insertBefore(stage, hero);
  sticky.appendChild(canvas);
  sticky.appendChild(hero);
  sticky.appendChild(hint);
  sticky.appendChild(flash);
  stage.appendChild(sticky);
  hero.classList.add("is-in-cave");
  document.body.classList.add("has-stoa-cave");

  /* ---------- Renderer / scene ---------- */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !coarse, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  var DARK = new THREE.Color(0x0c0805), DAY = new THREE.Color(0xfdf6e8);
  var scene = new THREE.Scene();
  scene.background = DARK.clone();
  scene.fog = new THREE.Fog(DARK.clone(), 8, 46);
  var camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);

  /* value noise for rocky displacement */
  function hash(x, y, z) { var h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function noise(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
    function L(a, b, t) { return a + (b - a) * t; }
    return L(L(L(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), L(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf),
             L(L(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), L(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf), zf);
  }
  function fbm(x, y, z) { return noise(x, y, z) * 0.6 + noise(x * 2.1, y * 2.1, z * 2.1) * 0.28 + noise(x * 4.3, y * 4.3, z * 4.3) * 0.12; }

  var rock = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1, metalness: 0, flatShading: true, side: THREE.BackSide });
  var wallMat = new THREE.MeshStandardMaterial({ color: 0xc4a77c, roughness: 0.95, metalness: 0 });

  /* Tunnel from the shadow wall (z = -14) to the mouth (z = 34) */
  var tunnel = new THREE.CylinderGeometry(7.5, 7.5, 50, coarse ? 48 : 80, coarse ? 40 : 70, true);
  tunnel.rotateX(Math.PI / 2);
  var tp = tunnel.attributes.position, v = new THREE.Vector3();
  for (var i = 0; i < tp.count; i++) {
    v.fromBufferAttribute(tp, i);
    var r = Math.hypot(v.x, v.y), a = Math.atan2(v.y, v.x);
    var mouthPinch = Math.max(0, (v.z - 14) / 11); // narrow toward the entrance
    var k = 1 + (fbm(Math.cos(a) * 1.4 + 3, Math.sin(a) * 1.4, v.z * 0.18) - 0.5) * 0.55 - mouthPinch * 0.28;
    var floorFlat = v.y < -4.6 ? -4.6 - (v.y + 4.6) * 0.15 : v.y;
    tp.setXYZ(i, v.x * k, floorFlat * (v.y < -4.6 ? 1 : k), v.z);
  }
  tunnel.computeVertexNormals();
  var cave = new THREE.Mesh(tunnel, rock);
  cave.position.z = 10;
  cave.receiveShadow = true;
  scene.add(cave);

  var wallGeo = new THREE.PlaneGeometry(18, 13, 90, 64);
  var wp = wallGeo.attributes.position;
  for (var j = 0; j < wp.count; j++) {
    v.fromBufferAttribute(wp, j);
    wp.setZ(j, (fbm(v.x * 0.25 + 9, v.y * 0.25, 1) - 0.5) * 1.4);
  }
  wallGeo.computeVertexNormals();
  var wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(0, 0.6, -13.5);
  wall.receiveShadow = true;
  scene.add(wall);

  /* Fire behind the viewer, and the puppets carried in front of it */
  var fireLight = new THREE.PointLight(0xff9a3c, 3.4, 42, 1.25);
  fireLight.position.set(-1.2, -2.4, 11);
  fireLight.castShadow = true;
  fireLight.shadow.mapSize.set(coarse ? 512 : 1024, coarse ? 512 : 1024);
  fireLight.shadow.bias = -0.002;
  fireLight.shadow.camera.near = 0.5;
  scene.add(fireLight);
  scene.add(new THREE.AmbientLight(0x2a1c12, 0.16));
  var daylight = new THREE.HemisphereLight(0xfff4dc, 0x8a7355, 0);
  scene.add(daylight);

  var puppetMat = new THREE.MeshStandardMaterial({ color: 0x2a1d12, roughness: 0.9 });
  function amphora() {
    var pts = [[0, 0], [.35, 0], [.25, .2], [.55, .7], [.7, 1.2], [.55, 1.7], [.25, 2], [.22, 2.4], [.38, 2.55], [0, 2.55]].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    return new THREE.Mesh(new THREE.LatheGeometry(pts, 24), puppetMat);
  }
  function column() {
    var g = new THREE.Group();
    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(.28, .32, 2.4, 16), puppetMat); shaft.position.y = 1.4; g.add(shaft);
    var cap = new THREE.Mesh(new THREE.BoxGeometry(.9, .22, .5), puppetMat); cap.position.y = 2.7; g.add(cap);
    var base = new THREE.Mesh(new THREE.BoxGeometry(.8, .2, .5), puppetMat); base.position.y = .1; g.add(base);
    return g;
  }
  function figure() {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(.18, .45, 1.6, 12), puppetMat); body.position.y = .8; g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(.24, 16, 12), puppetMat); head.position.y = 1.85; g.add(head);
    var staff = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 2.6, 6), puppetMat); staff.position.set(.45, 1.2, 0); staff.rotation.z = -0.15; g.add(staff);
    return g;
  }
  function bird() {
    var s = new THREE.Shape();
    s.moveTo(0, 0); s.quadraticCurveTo(.6, .45, 1.3, .1); s.quadraticCurveTo(.7, .05, .9, -.5); s.quadraticCurveTo(.45, -.1, 0, 0);
    s.moveTo(0, 0); s.quadraticCurveTo(-.6, .45, -1.3, .1); s.quadraticCurveTo(-.7, .05, -.9, -.5); s.quadraticCurveTo(-.45, -.1, 0, 0);
    return new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: .05, bevelEnabled: false }), puppetMat);
  }
  var puppets = [amphora(), figure(), column(), bird(), amphora(), figure()];
  puppets.forEach(function (p, idx) {
    p.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    p.userData = { phase: idx / puppets.length, flying: idx === 3 };
    p.scale.setScalar(0.55);
    scene.add(p);
  });
  // the low wall the puppeteers walk behind
  var parapet = new THREE.Mesh(new THREE.BoxGeometry(16, 1.6, .4), puppetMat);
  parapet.position.set(0, -3.3, 7.9); parapet.castShadow = true;
  scene.add(parapet);

  /* Fire: flickering embers */
  var EMBERS = coarse ? 160 : 320;
  var ePos = new Float32Array(EMBERS * 3), eLife = new Float32Array(EMBERS), eSpeed = new Float32Array(EMBERS);
  function resetEmber(n) {
    ePos[n * 3] = -1.2 + (Math.random() - .5) * 1.2; ePos[n * 3 + 1] = -3.4 + Math.random() * .4; ePos[n * 3 + 2] = 11 + (Math.random() - .5) * 1.2;
    eLife[n] = Math.random(); eSpeed[n] = .8 + Math.random() * 1.6;
  }
  for (var e = 0; e < EMBERS; e++) resetEmber(e);
  var emberGeo = new THREE.BufferGeometry(); emberGeo.setAttribute("position", new THREE.BufferAttribute(ePos, 3));
  var dot = document.createElement("canvas"); dot.width = dot.height = 64;
  var dg = dot.getContext("2d"), grad = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,240,200,1)"); grad.addColorStop(.35, "rgba(255,160,60,.75)"); grad.addColorStop(1, "rgba(255,90,20,0)");
  dg.fillStyle = grad; dg.fillRect(0, 0, 64, 64);
  var dotTex = new THREE.CanvasTexture(dot);
  var embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ size: .55, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(embers);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xffa040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(-1.2, -2.8, 11); glow.scale.set(5, 5, 1);
  scene.add(glow);

  /* The mouth of the cave: daylight */
  var mouth = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48), new THREE.MeshBasicMaterial({ color: 0xfff6e2, fog: false }));
  mouth.position.set(0, -0.4, 34.5); mouth.rotation.y = Math.PI;
  scene.add(mouth);
  var sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xfff2c8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sun.position.set(0, -0.4, 33); sun.scale.set(26, 26, 1);
  scene.add(sun);

  /* ---------- Camera choreography ---------- */
  function V(x, y, z) { return new THREE.Vector3(x, y, z); }
  var posCurve = new THREE.CatmullRomCurve3([V(0, -.6, 3.5), V(0, -.6, 3.6), V(.6, -.4, 5), V(2.2, -.3, 9), V(2, -.4, 16), V(.6, -.4, 24), V(0, -.4, 30.5)]);
  var target = 0, current = 0, mx = 0, my = 0;
  var look = new THREE.Vector3(), pos = new THREE.Vector3(), fwd = new THREE.Vector3();
  function measure() {
    var r = stage.getBoundingClientRect();
    var travel = Math.max(1, stage.offsetHeight - sticky.offsetHeight);
    target = Math.min(1, Math.max(0, -r.top / travel));
  }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function place(p, t) {
    // 0 → .3: watch the shadows; .3 → .55: turn around; .55 → 1: walk out
    var walk = Math.min(1, Math.max(0, (p - .3) / .7));
    posCurve.getPointAt(walk, pos);
    var turn = ease(Math.min(1, Math.max(0, (p - .3) / .25)));
    var yaw = turn * Math.PI + mx * .25 * (1 - turn * .6);
    fwd.set(Math.sin(yaw) * -1, -my * .15, Math.cos(yaw) * -1);
    camera.position.copy(pos);
    look.copy(pos).add(fwd);
    camera.lookAt(look);
    // light: fire fades, daylight grows, fog/sky brighten near the mouth
    var day = Math.min(1, Math.max(0, (p - .55) / .45));
    daylight.intensity = day * 1.4;
    scene.fog.color.copy(DARK).lerp(DAY, day * day);
    scene.background.copy(scene.fog.color);
    scene.fog.near = 8 - day * 6; scene.fog.far = 46 + day * 40;
    flash.style.opacity = Math.pow(Math.min(1, Math.max(0, (p - .86) / .14)), 2).toFixed(3);
    hero.style.opacity = Math.max(0, 1 - Math.max(0, p - .22) / .12).toFixed(3);
    hero.style.transform = "translateY(" + (-Math.max(0, p - .22) * 120).toFixed(1) + "px)";
    hint.style.opacity = Math.max(0, 1 - p * 10).toFixed(3);
  }
  function animate(t, dt) {
    // fire flicker
    var flick = .82 + Math.sin(t * 11) * .06 + Math.sin(t * 23.7) * .05 + Math.random() * .07;
    fireLight.intensity = 3.4 * flick;
    fireLight.position.x = -1.2 + Math.sin(t * 7) * .06;
    glow.material.opacity = .55 + flick * .35;
    for (var n = 0; n < EMBERS; n++) {
      eLife[n] += dt * eSpeed[n] * .6;
      ePos[n * 3 + 1] += dt * eSpeed[n] * 1.4;
      ePos[n * 3] += Math.sin(t * 3 + n) * dt * .3;
      if (eLife[n] > 1) resetEmber(n);
    }
    emberGeo.attributes.position.needsUpdate = true;
    // puppets parade between fire and viewer
    puppets.forEach(function (pp) {
      var ph = (pp.userData.phase + t * .045) % 1;
      pp.position.set(6 - ph * 12, pp.userData.flying ? -1.9 + Math.sin(t * 2 + ph * 9) * .2 : -2.9, 7.4);
      pp.rotation.y = pp.userData.flying ? 0 : Math.sin(t * .8 + ph * 6) * .3;
      if (pp.userData.flying) pp.rotation.z = Math.sin(t * 6) * .15;
    });
  }

  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < .8 ? 74 : 58;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", function () { resize(); measure(); });

  if (reduced) {
    stage.classList.add("is-reduced");
    animate(4, 0); place(0, 0); renderer.render(scene, camera);
    return;
  }

  window.addEventListener("scroll", measure, { passive: true });
  window.addEventListener("pointermove", function (ev) { mx = ev.clientX / window.innerWidth - .5; my = ev.clientY / window.innerHeight - .5; }, { passive: true });
  measure(); current = target;

  var onScreen = true, raf = 0, last = performance.now();
  function frame(now) {
    raf = 0;
    if (!onScreen || document.hidden) return;
    var dt = Math.min((now - last) / 1000, .05); last = now;
    current += (target - current) * Math.min(1, dt * 3.2);
    animate(now / 1000, dt);
    place(Math.min(1, Math.max(0, current)), now / 1000);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; if (onScreen) { resize(); start(); } }, { rootMargin: "200px 0px" }).observe(stage);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
  start();
})();
