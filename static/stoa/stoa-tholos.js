/* STOA — the Tholos (Engineering page hero).
   A round marble temple whose four labelled columns are the stages named in the hero subtitle.
   Scrolling turns the temple through the cycle; a golden orb travels the ring and each stage
   lights up as it comes to the front. */
(function () {
  "use strict";
  var hero = document.querySelector(".eng-hero");
  if (!hero || typeof THREE === "undefined") return;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  try { var test = document.createElement("canvas"); if (!(test.getContext("webgl") || test.getContext("experimental-webgl"))) return; } catch (e) { return; }

  /* Stage names come from the page's own subtitle, e.g. "Design, Build, Test and Learn." */
  var sub = hero.querySelector(".eng-hero-sub");
  var names = sub ? sub.textContent.replace(/\.$/, "").split(/\s*,\s*|\s+and\s+/i).map(function (s) { return s.trim(); }).filter(Boolean) : [];
  if (names.length !== 4) names = ["", "", "", ""];

  /* ---------- Sticky stage around the existing hero ---------- */
  var stage = document.createElement("section");
  stage.className = "stoa-tholos";
  stage.setAttribute("aria-hidden", "true");
  var sticky = document.createElement("div");
  sticky.className = "stoa-tholos-sticky";
  var canvas = document.createElement("canvas");
  canvas.className = "stoa-tholos-canvas";
  var dots = document.createElement("div");
  dots.className = "stoa-tholos-steps";
  names.forEach(function (n, i) {
    var s = document.createElement("span");
    s.textContent = n;
    s.setAttribute("data-i", i);
    dots.appendChild(s);
  });
  hero.parentNode.insertBefore(stage, hero);
  stage.removeAttribute("aria-hidden");
  sticky.appendChild(canvas);
  sticky.appendChild(hero);
  sticky.appendChild(dots);
  stage.appendChild(sticky);
  hero.classList.add("is-in-tholos");
  var stepEls = Array.prototype.slice.call(dots.children);

  /* ---------- Scene ---------- */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !coarse, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = !coarse;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);

  var seed = 11;
  function rand() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; }
  function marbleTex(base) {
    var c = document.createElement("canvas"); c.width = c.height = 256;
    var g = c.getContext("2d"); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (var v = 0; v < 18; v++) {
      g.strokeStyle = "rgba(120,105,90," + (0.05 + rand() * 0.1) + ")"; g.lineWidth = .5 + rand() * 1.2;
      g.beginPath(); var x = rand() * 256, y = rand() * 256; g.moveTo(x, y);
      for (var s = 0; s < 5; s++) g.quadraticCurveTo(x + (rand() - .5) * 140, y + (rand() - .5) * 140, x += (rand() - .5) * 110, y += (rand() - .5) * 110);
      g.stroke();
    }
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  var marble = new THREE.MeshStandardMaterial({ map: marbleTex("#f6f1e8"), roughness: .45 });
  var marbleWarm = new THREE.MeshStandardMaterial({ map: marbleTex("#ece0cc"), roughness: .55 });
  var gold = new THREE.MeshStandardMaterial({ color: 0xc5a059, roughness: .28, metalness: .9, emissive: 0x3a2508, emissiveIntensity: .2 });

  function fluted(h, r0, r1) {
    var g = new THREE.CylinderGeometry(r1, r0, h, 64, 6);
    var p = g.attributes.position, v = new THREE.Vector3();
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (Math.hypot(v.x, v.z) < .01) continue;
      var k = 1 - Math.pow(Math.max(0, Math.cos(Math.atan2(v.z, v.x) * 16)), .6) * .06;
      p.setXYZ(i, v.x * k, v.y, v.z * k);
    }
    g.computeVertexNormals(); return g;
  }
  var H = 4.2, R = 3.2, COLS = 8;
  var shaft = fluted(H, .34, .3), plinth = new THREE.BoxGeometry(.95, .18, .95), abacus = new THREE.BoxGeometry(1, .16, 1), echinus = new THREE.CylinderGeometry(.48, .32, .22, 32);
  var temple = new THREE.Group();
  scene.add(temple);
  function addMesh(g, m, x, y, z, parent) { var o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = !coarse; (parent || temple).add(o); return o; }

  // stepped circular podium
  [[4.6, .3, 0], [4.25, .3, .3], [3.9, .3, .6]].forEach(function (s) { addMesh(new THREE.CylinderGeometry(s[0], s[0], s[1], 96), marbleWarm, 0, s[2] + s[1] / 2, 0); });
  var BASE = .9;
  var stageCols = [], labels = [];
  for (var i = 0; i < COLS; i++) {
    var a = i / COLS * Math.PI * 2, x = Math.sin(a) * R, z = Math.cos(a) * R;
    var col = new THREE.Group(); col.position.set(x, 0, z); temple.add(col);
    addMesh(plinth, marbleWarm, 0, BASE + .09, 0, col);
    addMesh(shaft, marble, 0, BASE + .18 + H / 2, 0, col);
    var neck = addMesh(new THREE.TorusGeometry(.31, .035, 8, 32), gold, 0, BASE + .18 + H - .08, 0, col); neck.rotation.x = Math.PI / 2;
    addMesh(echinus, marble, 0, BASE + .18 + H + .11, 0, col);
    addMesh(abacus, marbleWarm, 0, BASE + .18 + H + .3, 0, col);
    if (i % 2 === 0) stageCols.push({ group: col, angle: a, index: i / 2 });
  }
  var TOP = BASE + .18 + H + .38;
  // entablature ring + gold band + dome of ribs
  addMesh(new THREE.CylinderGeometry(R + .62, R + .62, .5, 96, 1, true), marble, 0, TOP + .25, 0).material = marble;
  var ringIn = addMesh(new THREE.CylinderGeometry(R - .55, R - .55, .5, 96, 1, true), marbleWarm, 0, TOP + .25, 0); ringIn.material = marbleWarm.clone(); ringIn.material.side = THREE.BackSide;
  addMesh(new THREE.RingGeometry(R - .55, R + .62, 96).rotateX(-Math.PI / 2), marble, 0, TOP + .5, 0);
  addMesh(new THREE.TorusGeometry(R + .63, .05, 8, 128).rotateX(Math.PI / 2), gold, 0, TOP + .12, 0);
  var dome = addMesh(new THREE.SphereGeometry(R + .45, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), marble, 0, TOP + .5, 0);
  dome.scale.y = .62;
  for (var rb = 0; rb < 16; rb++) { // gilt ribs lying on the dome
    var rib = new THREE.Mesh(new THREE.SphereGeometry(R + .47, 4, 24, rb / 16 * Math.PI * 2 - .012, .024, 0, Math.PI / 2), gold);
    rib.position.y = TOP + .5; rib.scale.y = .62; temple.add(rib);
  }
  addMesh(new THREE.SphereGeometry(.24, 24, 16), gold, 0, TOP + .5 + (R + .45) * .62 + .12, 0);

  // floor ring path + travelling orb
  var path = new THREE.Mesh(new THREE.TorusGeometry(R, .025, 8, 160).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xc5a059 }));
  path.position.y = BASE + .02; temple.add(path);
  var orbMat = new THREE.MeshBasicMaterial({ color: 0xffe2a0 });
  var orb = new THREE.Mesh(new THREE.SphereGeometry(.2, 24, 16), orbMat);
  scene.add(orb);
  var glowC = document.createElement("canvas"); glowC.width = glowC.height = 64;
  var gg = glowC.getContext("2d"), gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,236,190,1)"); gr.addColorStop(.4, "rgba(255,200,110,.45)"); gr.addColorStop(1, "rgba(255,190,100,0)");
  gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64);
  var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowC), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(1.8, 1.8, 1); scene.add(halo);
  var orbLight = new THREE.PointLight(0xffc77a, 1.2, 8, 2); scene.add(orbLight);

  // label plaques on the podium in front of each stage column
  function plaque(text) {
    var c = document.createElement("canvas"); c.width = 512; c.height = 128;
    var g = c.getContext("2d");
    g.fillStyle = "rgba(0,0,0,0)"; g.fillRect(0, 0, 512, 128);
    g.font = "400 76px 'Fredericka the Great', Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#1a1208"; g.fillText(text, 256, 68);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    var m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .475), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    m.userData.draw = function (active) {
      g.clearRect(0, 0, 512, 128);
      g.fillStyle = active ? "#9c7a3c" : "rgba(26,18,8,.55)"; g.fillText(text, 256, 68);
      t.needsUpdate = true;
    };
    return m;
  }
  stageCols.forEach(function (sc, idx) {
    var p = plaque(names[idx] || "");
    var a = sc.angle, rr = 4.62;
    p.position.set(Math.sin(a) * rr, .62, Math.cos(a) * rr);
    p.rotation.y = a;
    temple.add(p); labels.push(p);
  });
  if (document.fonts && document.fonts.load) document.fonts.load("400 40px 'Fredericka the Great'").then(function () { labels.forEach(function (l, i) { l.userData.draw(i === activeIdx); }); });

  // light
  scene.add(new THREE.HemisphereLight(0xfff4e2, 0x9c7a50, .55));
  var sunL = new THREE.DirectionalLight(0xffe2b5, 1.45);
  sunL.position.set(9, 9, 5); sunL.castShadow = !coarse;
  if (!coarse) { sunL.shadow.mapSize.set(1024, 1024); var sc = sunL.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sunL.shadow.bias = -.0005; }
  scene.add(sunL);
  var ground = new THREE.Mesh(new THREE.CircleGeometry(14, 64).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: .12 }));
  ground.receiveShadow = true; scene.add(ground);

  /* ---------- Choreography ---------- */
  var target = 0, current = 0, mx = 0, my = 0, activeIdx = -1;
  function measure() {
    var r = stage.getBoundingClientRect();
    target = Math.min(1, Math.max(0, -r.top / Math.max(1, stage.offsetHeight - sticky.offsetHeight)));
  }
  function frameLayout() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    var narrow = camera.aspect < .9;
    camera.fov = narrow ? 44 : 30;
    camera.position.set(0, narrow ? 6 : 5.6, narrow ? 31 : 30);
    camera.lookAt(0, narrow ? .4 : 2, 0);
    temple.position.set(narrow ? 0 : -.8, narrow ? -5.6 : -3.9, 0);
    ground.position.set(temple.position.x, temple.position.y + .001, 0);
    camera.updateProjectionMatrix();
  }
  function update(p, t) {
    // four stops: each stage swings to the front in turn, with a full cycle across the scroll
    var f = p * 4, k = Math.min(3, Math.floor(f)), frac = f - k;
    var eased = k + (frac < .35 ? 0 : frac > .85 ? 1 : (frac - .35) / .5);
    var stop = Math.min(eased, 4);
    var spin = -stop * Math.PI / 2;
    temple.rotation.y = spin + mx * .25 + Math.sin(t * .4) * .03;
    temple.rotation.x = my * .06;
    // orb travels from the previous stage to the next along the ring (world space)
    var orbAngle = stop * Math.PI / 2 + spin;
    var base = temple.position;
    orb.position.set(base.x + Math.sin(orbAngle) * R, base.y + BASE + .45 + Math.sin(t * 2.4) * .08, Math.cos(orbAngle) * R);
    halo.position.copy(orb.position); orbLight.position.copy(orb.position);
    var idx = Math.round(stop) % 4;
    if (idx !== activeIdx) {
      activeIdx = idx;
      labels.forEach(function (l, i) { l.userData.draw(i === idx); });
      stepEls.forEach(function (s, i) { s.classList.toggle("is-active", i === idx); });
    }
    hero.style.opacity = Math.max(.0, 1 - Math.max(0, p - .9) * 10).toFixed(3);
  }

  frameLayout();
  window.addEventListener("resize", function () { frameLayout(); measure(); if (reduced) { update(0, 0); renderer.render(scene, camera); } });
  if (reduced) { stage.classList.add("is-reduced"); update(0, 0); renderer.render(scene, camera); return; }

  window.addEventListener("scroll", measure, { passive: true });
  window.addEventListener("pointermove", function (e) { mx = e.clientX / window.innerWidth - .5; my = e.clientY / window.innerHeight - .5; }, { passive: true });
  measure(); current = target;
  var onScreen = true, raf = 0, last = performance.now();
  function frame(now) {
    raf = 0;
    if (!onScreen || document.hidden) return;
    var dt = Math.min((now - last) / 1000, .05); last = now;
    current += (target - current) * Math.min(1, dt * 3.4);
    update(Math.min(1, Math.max(0, current)), now / 1000);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; if (onScreen) { frameLayout(); start(); } }, { rootMargin: "200px 0px" }).observe(stage);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
  start();
})();
