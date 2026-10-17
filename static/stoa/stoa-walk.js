/* STOA — homepage colonnade walk.
   A sticky section; scrolling through it walks the camera down a procedural marble
   colonnade and through the temple door, which fades into the story below. */
(function () {
  "use strict";
  var section = document.getElementById("stoa-walk");
  if (!section) return;
  var canvas = section.querySelector(".stoa-walk-canvas");
  var flash = section.querySelector(".stoa-walk-flash");
  var hint = section.querySelector(".stoa-walk-hint");
  var enter = section.querySelector(".stoa-walk-enter");
  var bar = section.querySelector(".stoa-walk-bar i");
  var num = section.querySelector(".stoa-walk-num");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var ROMAN = ["I", "II", "III", "IV", "V", "VI"];

  function hasWebGL() {
    try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); }
    catch (e) { return false; }
  }
  if (typeof THREE === "undefined" || !hasWebGL()) { section.classList.add("is-static"); return; }

  /* ---------- Renderer ---------- */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !coarse, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  var useShadows = !coarse;
  renderer.shadowMap.enabled = useShadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var BG = 0xf3e9d6;
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 18, 105);
  var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);

  var seed = 7;
  function rand() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; }

  /* ---------- Procedural marble ---------- */
  function marbleCanvas(size, base, veins) {
    var c = document.createElement("canvas"); c.width = c.height = size;
    var g = c.getContext("2d");
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    if (base.indexOf("rgba(0,0,0,0)") < 0) {
      var img = g.getImageData(0, 0, size, size), d = img.data;
      for (var i = 0; i < d.length; i += 4) { var n = (rand() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
      g.putImageData(img, 0, 0);
    }
    for (var v = 0; v < veins; v++) {
      g.strokeStyle = "rgba(120,105,90," + (0.05 + rand() * 0.12) + ")";
      g.lineWidth = 0.5 + rand() * 1.6;
      g.beginPath();
      var x = rand() * size, y = rand() * size;
      g.moveTo(x, y);
      for (var s = 0; s < 6; s++) {
        g.bezierCurveTo(x + (rand() - .5) * size * .5, y + (rand() - .5) * size * .5, x + (rand() - .5) * size * .5, y + (rand() - .5) * size * .5,
          x += (rand() - .5) * size * .4, y += (rand() - .3) * size * .4);
      }
      g.stroke();
    }
    return c;
  }
  function tex(c, repeat) {
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (repeat) t.repeat.set(repeat, repeat);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  function floorCanvas() {
    var size = 1024, tiles = 4, c = document.createElement("canvas"); c.width = c.height = size;
    var g = c.getContext("2d"), step = size / tiles;
    for (var y = 0; y < tiles; y++) for (var x = 0; x < tiles; x++) {
      g.fillStyle = (x + y) % 2 === 0 ? "#f3ece0" : "#e3d6c1";
      g.fillRect(x * step, y * step, step, step);
    }
    g.strokeStyle = "rgba(150,120,85,.35)"; g.lineWidth = 3;
    for (var i = 0; i <= tiles; i++) {
      g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, size); g.stroke();
      g.beginPath(); g.moveTo(0, i * step); g.lineTo(size, i * step); g.stroke();
    }
    g.globalAlpha = 0.6; g.drawImage(marbleCanvas(512, "rgba(0,0,0,0)", 40), 0, 0, size, size);
    return c;
  }

  var marble = new THREE.MeshStandardMaterial({ map: tex(marbleCanvas(512, "#f6f1e8", 26)), roughness: 0.42 });
  var marbleWarm = new THREE.MeshStandardMaterial({ map: tex(marbleCanvas(512, "#efe4d2", 26)), roughness: 0.5 });
  var gold = new THREE.MeshStandardMaterial({ color: 0xc5a059, roughness: 0.3, metalness: 0.85 });

  /* ---------- Columns ---------- */
  var H = 9;
  function shaftGeometry(h) {
    var g = new THREE.CylinderGeometry(0.74, 0.88, h, coarse ? 72 : 120, 12, false);
    var p = g.attributes.position, v = new THREE.Vector3();
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (Math.hypot(v.x, v.z) < 0.01) continue;
      var a = Math.atan2(v.z, v.x);
      var k = (1 - Math.pow(Math.max(0, Math.cos(a * 20)), 0.6) * 0.055) * (1 + Math.sin((v.y / h + 0.5) * Math.PI) * 0.025);
      p.setXYZ(i, v.x * k, v.y, v.z * k);
    }
    g.computeVertexNormals();
    return g;
  }
  var geo = {
    plinth: new THREE.BoxGeometry(2.4, 0.4, 2.4), torus: new THREE.TorusGeometry(0.98, 0.16, 16, 64),
    shaft: shaftGeometry(H), neck: new THREE.TorusGeometry(0.8, 0.07, 10, 64),
    echinus: new THREE.CylinderGeometry(1.2, 0.78, 0.5, 64), abacus: new THREE.BoxGeometry(2.5, 0.34, 2.5)
  };
  function shadowed(m) { m.castShadow = useShadows; m.receiveShadow = useShadows; return m; }
  function column(scale) {
    var c = new THREE.Group();
    function add(g, m, y, rx) { var mesh = shadowed(new THREE.Mesh(g, m)); mesh.position.y = y; if (rx) mesh.rotation.x = rx; c.add(mesh); }
    add(geo.plinth, marbleWarm, 0.2);
    add(geo.torus, marble, 0.5, Math.PI / 2);
    add(geo.shaft, marble, 0.6 + H / 2);
    add(geo.neck, gold, 0.6 + H - 0.15, Math.PI / 2);
    add(geo.echinus, marble, 0.6 + H + 0.25);
    add(geo.abacus, marbleWarm, 0.6 + H + 0.67);
    c.scale.setScalar(scale || 1);
    return c;
  }
  var TOP = 0.6 + H + 0.84;

  var floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ map: tex(floorCanvas(), 26), roughness: 0.32, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -40; floor.receiveShadow = useShadows;
  scene.add(floor);

  var Z0 = 12, Z1 = -76, STEP = 7, X = 5.2;
  for (var z = Z0; z >= Z1; z -= STEP) {
    [-X, X].forEach(function (x) { var col = column(1); col.position.set(x, 0, z); scene.add(col); });
    var beam = shadowed(new THREE.Mesh(new THREE.BoxGeometry(X * 2 + 2.4, 0.45, 0.6), marbleWarm));
    beam.position.set(0, TOP + 1.6, z); scene.add(beam);
  }
  var len = Z0 - Z1 + 3, midZ = (Z0 + Z1) / 2;
  [-X, X].forEach(function (x) {
    [[new THREE.BoxGeometry(2.6, 0.9, len), marble, TOP + 0.45], [new THREE.BoxGeometry(2.4, 0.8, len), marbleWarm, TOP + 1.3],
     [new THREE.BoxGeometry(3.2, 0.32, len + 0.6), marble, TOP + 1.86], [new THREE.BoxGeometry(2.66, 0.08, len), gold, TOP + 0.92]].forEach(function (d) {
      var m = shadowed(new THREE.Mesh(d[0], d[1])); m.position.set(x, d[2], midZ); scene.add(m);
    });
  });

  /* Temple facade with a glowing door */
  var temple = new THREE.Group();
  temple.position.set(0, 0, -98);
  for (var s = 0; s < 3; s++) {
    var step = new THREE.Mesh(new THREE.BoxGeometry(26 - s * 1.6, 0.5, 10 - s * 1.2), marbleWarm);
    step.position.y = 0.25 + s * 0.5; temple.add(step);
  }
  for (var k = 0; k < 6; k++) {
    if (k === 2 || k === 3) continue; // leave the doorway clear
    var tc = column(1.25); tc.position.set(-9.5 + k * 3.8, 1.5, 2); temple.add(tc);
  }
  var tTop = 1.5 + TOP * 1.25;
  var arch2 = new THREE.Mesh(new THREE.BoxGeometry(23, 1.3, 4), marble); arch2.position.set(0, tTop + 0.65, 2); temple.add(arch2);
  var tri = new THREE.Shape(); tri.moveTo(-12, 0); tri.lineTo(12, 0); tri.lineTo(0, 4.4); tri.lineTo(-12, 0);
  var ped = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 3, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.2, bevelSegments: 2 }), marble);
  ped.position.set(0, tTop + 1.3, 0.8); temple.add(ped);
  var inner = new THREE.Shape(); inner.moveTo(-10, 0.5); inner.lineTo(10, 0.5); inner.lineTo(0, 3.7); inner.lineTo(-10, 0.5);
  var tymp = new THREE.Mesh(new THREE.ShapeGeometry(inner), gold); tymp.position.set(0, tTop + 1.3, 4.05); temple.add(tymp);
  var cella = new THREE.Mesh(new THREE.BoxGeometry(19, tTop - 1.5, 6), marbleWarm); cella.position.set(0, 1.5 + (tTop - 1.5) / 2, -3); temple.add(cella);
  var doorMat = new THREE.MeshBasicMaterial({ color: 0xffe6b0 });
  var door = new THREE.Mesh(new THREE.PlaneGeometry(5, 9), doorMat); door.position.set(0, 6, 0.02); temple.add(door);
  var frameMat = gold;
  [[-2.7, 6, 0.4, 9.6], [2.7, 6, 0.4, 9.6], [0, 10.9, 5.8, 0.4]].forEach(function (f) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(f[2], f[3], 0.3), frameMat); m.position.set(f[0], f[1], 0.1); temple.add(m);
  });
  temple.traverse(function (o) { if (o.isMesh && o !== door) shadowed(o); });
  scene.add(temple);

  /* Light */
  scene.add(new THREE.HemisphereLight(0xfff4e2, 0xb39a7a, 0.75));
  var sun = new THREE.DirectionalLight(0xffe7c2, 1.25);
  sun.castShadow = useShadows;
  if (useShadows) {
    sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 120;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  }
  scene.add(sun); scene.add(sun.target);
  var glow = new THREE.PointLight(0xffc77a, 1.4, 40, 2); glow.position.set(0, 6, -92); scene.add(glow);

  /* Golden dust */
  var dustCount = coarse ? 500 : 1400;
  var dustPos = new Float32Array(dustCount * 3), dustSpeed = new Float32Array(dustCount);
  for (var i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (rand() - 0.5) * 16; dustPos[i * 3 + 1] = rand() * 12; dustPos[i * 3 + 2] = Z0 + 10 - rand() * 115;
    dustSpeed[i] = 0.1 + rand() * 0.35;
  }
  var dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  var dot = document.createElement("canvas"); dot.width = dot.height = 64;
  var dg = dot.getContext("2d"), grad = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,240,200,1)"); grad.addColorStop(0.4, "rgba(255,210,130,.5)"); grad.addColorStop(1, "rgba(255,200,120,0)");
  dg.fillStyle = grad; dg.fillRect(0, 0, 64, 64);
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.16, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd38a })));

  /* ---------- Camera path: entrance → colonnade → temple → through the door ---------- */
  function V(x, y, z) { return new THREE.Vector3(x, y, z); }
  var posCurve = new THREE.CatmullRomCurve3([V(0, 8, 36), V(0, 5.4, 16), V(1.8, 4.6, -4), V(-1.8, 4.6, -24), V(1.8, 4.8, -44), V(0, 5.2, -62), V(0, 5.8, -78), V(0, 6, -92), V(0, 6, -97.6)]);
  var lookCurve = new THREE.CatmullRomCurve3([V(0, 6.5, 0), V(0, 5.4, -10), V(-0.6, 5, -30), V(0.6, 5, -50), V(0, 5.6, -70), V(0, 6.5, -95), V(0, 6, -98), V(0, 6, -110), V(0, 6, -120)]);

  var pos = new THREE.Vector3(), look = new THREE.Vector3();
  var target = 0, current = 0, mx = 0, my = 0;

  function measure() {
    var r = section.getBoundingClientRect();
    var sticky = section.firstElementChild.offsetHeight;
    var travel = Math.max(1, section.offsetHeight - sticky);
    target = Math.min(1, Math.max(0, -r.top / travel));
  }
  function place(p) {
    posCurve.getPointAt(p, pos); lookCurve.getPointAt(p, look);
    camera.position.set(pos.x + mx * 1.2 * (1 - p), pos.y - my * 0.6 * (1 - p), pos.z);
    camera.lookAt(look);
    sun.position.set(pos.x + 26, 38, pos.z + 6);
    sun.target.position.set(pos.x, 0, pos.z - 18);
  }
  function ui(p) {
    var f = Math.min(1, Math.max(0, (p - 0.86) / 0.14));
    flash.style.opacity = (f * f).toFixed(3);
    hint.style.opacity = Math.max(0, 1 - p * 8).toFixed(3);
    enter.style.opacity = (p > 0.6 && p < 0.9 ? Math.min((p - 0.6) / 0.1, (0.9 - p) / 0.06, 1) : 0).toFixed(3);
    bar.style.transform = "scaleY(" + p.toFixed(4) + ")";
    num.textContent = ROMAN[Math.min(5, Math.floor(p * 6))];
  }
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 72 : 55;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", function () { resize(); measure(); if (reduced) { place(current); renderer.render(scene, camera); } });

  if (reduced) {
    section.classList.add("is-reduced");
    place(0.05); ui(0); renderer.render(scene, camera);
    return;
  }

  window.addEventListener("scroll", measure, { passive: true });
  window.addEventListener("pointermove", function (e) { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; }, { passive: true });
  measure(); current = target;

  /* Render only while the section is on screen */
  var onScreen = true, raf = 0, last = performance.now();
  function frame(now) {
    raf = 0;
    if (!onScreen || document.hidden) return;
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    var t = now / 1000;
    current += (target - current) * Math.min(1, dt * 3.4);
    var p = Math.min(1, Math.max(0, current));
    place(p); ui(p);
    var arr = dustGeo.attributes.position.array;
    for (var i = 0; i < dustCount; i++) {
      arr[i * 3 + 1] += dustSpeed[i] * dt;
      arr[i * 3] += Math.sin(t * 0.5 + i) * 0.002;
      if (arr[i * 3 + 1] > 12) arr[i * 3 + 1] = 0;
    }
    dustGeo.attributes.position.needsUpdate = true;
    glow.intensity = 1.2 + Math.sin(t * 1.6) * 0.25 + p * 1.2;
    doorMat.color.setHSL(0.11, 1, 0.82 + Math.sin(t * 1.6) * 0.03 + p * 0.1);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) { resize(); start(); }
    }, { rootMargin: "200px 0px" }).observe(section);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
  start();
})();
