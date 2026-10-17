/* Design 1 — Stoa. Scroll walks the camera through a procedural marble colonnade. */
(function () {
  "use strict";
  var body = document.body;
  var canvas = document.getElementById("d1-stage");

  /* ---------- DOM motion ---------- */
  var titleChars = DZ.split(document.getElementById("d1-title"), "chars");
  if (!DZ.reduced) {
    gsap.from(titleChars, { yPercent: 110, rotateX: -80, opacity: 0, duration: 1.2, ease: "expo.out", stagger: 0.035, delay: 0.2 });
    gsap.from(".d1-kicker, .d1-tagline, .d1-cue", { y: 20, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.12, delay: 0.7 });
    gsap.utils.toArray(".d1-plaque").forEach(function (el) {
      gsap.from(el, { y: 80, opacity: 0, rotateX: 12, transformPerspective: 900, duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 80%" } });
    });
    gsap.from(".d1-nav", { y: 60, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.08,
      scrollTrigger: { trigger: ".d1-plaques", start: "top 85%" } });
    gsap.to(".d1-cloud-a", { xPercent: -60, yPercent: -80, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });
    gsap.to(".d1-cloud-b", { xPercent: 70, yPercent: -120, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });
    gsap.to(".d1-cloud-c", { yPercent: -260, opacity: 0, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });
  }

  /* Roman numeral tracker */
  var num = document.getElementById("d1-num"), bar = document.getElementById("d1-bar");
  document.querySelectorAll("[data-num]").forEach(function (sec) {
    ScrollTrigger.create({ trigger: sec, start: "top 55%", end: "bottom 55%",
      onToggle: function (s) { if (s.isActive) num.textContent = sec.dataset.num; } });
  });
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: function (s) { bar.style.transform = "scaleY(" + s.progress + ")"; } });

  if (!DZ.webgl) { body.classList.add("no-webgl"); canvas.style.display = "none"; return; }

  /* ---------- Three.js scene ---------- */
  var rand = DZ.rng(7);
  var renderer = DZ.renderer(canvas, { clear: 0xf1e6d2 });
  var useShadows = !DZ.coarse;
  renderer.shadowMap.enabled = useShadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf1e6d2);
  scene.fog = new THREE.Fog(0xf1e6d2, 18, 105);

  var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);

  /* Procedural marble */
  function marbleTexture(size, base, veins, repeat) {
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var g = c.getContext("2d");
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    var img = g.getImageData(0, 0, size, size), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var n = (rand() - 0.5) * 14;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    for (var v = 0; v < veins; v++) {
      g.strokeStyle = "rgba(120,105,90," + (0.05 + rand() * 0.12) + ")";
      g.lineWidth = 0.5 + rand() * 1.6;
      g.beginPath();
      var x = rand() * size, y = rand() * size;
      g.moveTo(x, y);
      for (var s = 0; s < 6; s++) {
        g.bezierCurveTo(x + (rand() - .5) * size * .5, y + (rand() - .5) * size * .5,
          x + (rand() - .5) * size * .5, y + (rand() - .5) * size * .5,
          x += (rand() - .5) * size * .4, y += (rand() - .3) * size * .4);
      }
      g.stroke();
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (repeat) t.repeat.set(repeat, repeat);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  function floorTexture() {
    var size = 1024, tiles = 4, c = document.createElement("canvas");
    c.width = c.height = size;
    var g = c.getContext("2d"), step = size / tiles;
    for (var y = 0; y < tiles; y++) for (var x = 0; x < tiles; x++) {
      var light = (x + y) % 2 === 0;
      g.fillStyle = light ? "#f3ece0" : "#e3d6c1";
      g.fillRect(x * step, y * step, step, step);
    }
    g.strokeStyle = "rgba(150,120,85,.35)"; g.lineWidth = 3;
    for (var i = 0; i <= tiles; i++) {
      g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, size); g.stroke();
      g.beginPath(); g.moveTo(0, i * step); g.lineTo(size, i * step); g.stroke();
    }
    var veins = marbleTexture(512, "rgba(0,0,0,0)", 40).image;
    g.globalAlpha = 0.6; g.drawImage(veins, 0, 0, size, size);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(26, 26);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  var marble = new THREE.MeshStandardMaterial({ map: marbleTexture(512, "#f6f1e8", 26, 1), roughness: 0.42, metalness: 0 });
  var marbleWarm = new THREE.MeshStandardMaterial({ map: marbleTexture(512, "#efe4d2", 26, 1), roughness: 0.5, metalness: 0 });
  var gold = new THREE.MeshStandardMaterial({ color: 0xc89b4b, roughness: 0.3, metalness: 0.85 });

  /* Fluted, tapered shaft */
  function shaftGeometry(h) {
    var g = new THREE.CylinderGeometry(0.74, 0.88, h, 120, 12, false);
    var p = g.attributes.position, v = new THREE.Vector3();
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      var r = Math.hypot(v.x, v.z);
      if (r < 0.01) continue;
      var a = Math.atan2(v.z, v.x);
      var flute = Math.pow(Math.max(0, Math.cos(a * 20)), 0.6) * 0.055;
      var entasis = 1 + Math.sin((v.y / h + 0.5) * Math.PI) * 0.025;
      var k = (1 - flute) * entasis;
      p.setXYZ(i, v.x * k, v.y, v.z * k);
    }
    g.computeVertexNormals();
    return g;
  }

  var H = 9;
  var geo = {
    plinth: new THREE.BoxGeometry(2.4, 0.4, 2.4),
    torus: new THREE.TorusGeometry(0.98, 0.16, 16, 64),
    shaft: shaftGeometry(H),
    neck: new THREE.TorusGeometry(0.8, 0.07, 10, 64),
    echinus: new THREE.CylinderGeometry(1.2, 0.78, 0.5, 64),
    abacus: new THREE.BoxGeometry(2.5, 0.34, 2.5)
  };

  function column(scale) {
    var c = new THREE.Group();
    function add(g, m, y, rotX) {
      var mesh = new THREE.Mesh(g, m);
      mesh.position.y = y;
      if (rotX) mesh.rotation.x = rotX;
      mesh.castShadow = useShadows; mesh.receiveShadow = useShadows;
      c.add(mesh); return mesh;
    }
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

  /* Floor */
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.32, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -40;
  floor.receiveShadow = useShadows;
  scene.add(floor);

  /* Two colonnades with an entablature and roof beams */
  var Z0 = 12, Z1 = -76, STEP = 7, X = 5.2;
  for (var z = Z0; z >= Z1; z -= STEP) {
    [-X, X].forEach(function (x) {
      var col = column(1);
      col.position.set(x, 0, z);
      scene.add(col);
    });
    var beam = new THREE.Mesh(new THREE.BoxGeometry(X * 2 + 2.4, 0.45, 0.6), marbleWarm);
    beam.position.set(0, TOP + 1.6, z);
    beam.castShadow = useShadows;
    scene.add(beam);
  }
  var len = Z0 - Z1 + 3, midZ = (Z0 + Z1) / 2;
  [-X, X].forEach(function (x) {
    var arch = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, len), marble);
    arch.position.set(x, TOP + 0.45, midZ);
    var frieze = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, len), marbleWarm);
    frieze.position.set(x, TOP + 1.3, midZ);
    var cornice = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.32, len + 0.6), marble);
    cornice.position.set(x, TOP + 1.86, midZ);
    var band = new THREE.Mesh(new THREE.BoxGeometry(2.66, 0.08, len), gold);
    band.position.set(x, TOP + 0.92, midZ);
    [arch, frieze, cornice, band].forEach(function (m) { m.castShadow = useShadows; m.receiveShadow = useShadows; scene.add(m); });
  });

  /* Temple facade at the end */
  var temple = new THREE.Group();
  temple.position.set(0, 0, -98);
  for (var s = 0; s < 3; s++) {
    var stepMesh = new THREE.Mesh(new THREE.BoxGeometry(26 - s * 1.6, 0.5, 10 - s * 1.2), marbleWarm);
    stepMesh.position.y = 0.25 + s * 0.5;
    stepMesh.receiveShadow = stepMesh.castShadow = useShadows;
    temple.add(stepMesh);
  }
  for (var k = 0; k < 6; k++) {
    var tc = column(1.25);
    tc.position.set(-9.5 + k * 3.8, 1.5, 2);
    temple.add(tc);
  }
  var tTop = 1.5 + TOP * 1.25;
  var arch2 = new THREE.Mesh(new THREE.BoxGeometry(23, 1.3, 4), marble);
  arch2.position.set(0, tTop + 0.65, 2);
  temple.add(arch2);
  var tri = new THREE.Shape();
  tri.moveTo(-12, 0); tri.lineTo(12, 0); tri.lineTo(0, 4.4); tri.lineTo(-12, 0);
  var ped = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 3, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.2, bevelSegments: 2 }), marble);
  ped.position.set(0, tTop + 1.3, 0.8);
  temple.add(ped);
  var inner = new THREE.Shape();
  inner.moveTo(-10, 0.5); inner.lineTo(10, 0.5); inner.lineTo(0, 3.7); inner.lineTo(-10, 0.5);
  var tymp = new THREE.Mesh(new THREE.ShapeGeometry(inner), gold);
  tymp.position.set(0, tTop + 1.3, 4.05);
  temple.add(tymp);
  var cella = new THREE.Mesh(new THREE.BoxGeometry(19, tTop - 1.5, 6), marbleWarm);
  cella.position.set(0, 1.5 + (tTop - 1.5) / 2, -3);
  temple.add(cella);
  var door = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a8 }));
  door.position.set(0, 5.5, 0.02);
  temple.add(door);
  scene.add(temple);
  temple.traverse(function (o) { if (o.isMesh) { o.castShadow = useShadows; o.receiveShadow = useShadows; } });

  /* Light */
  scene.add(new THREE.HemisphereLight(0xfff4e2, 0xb39a7a, 0.75));
  var sun = new THREE.DirectionalLight(0xffe7c2, 1.25);
  sun.position.set(26, 38, 10);
  sun.castShadow = useShadows;
  if (useShadows) {
    sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera;
    sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 120;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
  }
  scene.add(sun); scene.add(sun.target);
  var glow = new THREE.PointLight(0xffc77a, 1.4, 40, 2);
  glow.position.set(0, 6, -92);
  scene.add(glow);

  /* Golden dust */
  var dustCount = DZ.coarse ? 500 : 1400;
  var dustPos = new Float32Array(dustCount * 3), dustSpeed = new Float32Array(dustCount);
  for (var i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (rand() - 0.5) * 16;
    dustPos[i * 3 + 1] = rand() * 12;
    dustPos[i * 3 + 2] = Z0 + 10 - rand() * 115;
    dustSpeed[i] = 0.1 + rand() * 0.35;
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  var dotCanvas = document.createElement("canvas");
  dotCanvas.width = dotCanvas.height = 64;
  var dg = dotCanvas.getContext("2d"), grad = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,240,200,1)"); grad.addColorStop(0.4, "rgba(255,210,130,.5)"); grad.addColorStop(1, "rgba(255,200,120,0)");
  dg.fillStyle = grad; dg.fillRect(0, 0, 64, 64);
  var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.16, map: new THREE.CanvasTexture(dotCanvas), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, color: 0xffd38a
  }));
  scene.add(dust);

  /* Camera path */
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  var posCurve = new THREE.CatmullRomCurve3([V(0, 8, 36), V(0, 5.4, 16), V(1.8, 4.6, -4), V(-1.8, 4.6, -24), V(1.8, 4.8, -44), V(0, 5.2, -62), V(0, 6.5, -72), V(0, 7.4, -76)]);
  var lookCurve = new THREE.CatmullRomCurve3([V(0, 6.5, 0), V(0, 5.4, -10), V(-0.6, 5, -30), V(0.6, 5, -50), V(0, 5.6, -70), V(0, 8, -92), V(0, 8.6, -98), V(0, 9, -98)]);

  var target = 0, current = 0, mouseX = 0, mouseY = 0;
  if (!DZ.reduced) {
    ScrollTrigger.create({ trigger: "#d1-main", start: "top top", end: "bottom bottom", onUpdate: function (s) { target = s.progress; } });
    window.addEventListener("pointermove", function (e) {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }

  var look = new THREE.Vector3(), pos = new THREE.Vector3();
  function place(p) {
    posCurve.getPointAt(p, pos);
    lookCurve.getPointAt(p, look);
    camera.position.set(pos.x + mouseX * 1.2, pos.y - mouseY * 0.6, pos.z);
    camera.lookAt(look);
    sun.position.set(pos.x + 26, 38, pos.z + 6);
    sun.target.position.set(pos.x, 0, pos.z - 18);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = camera.aspect < 0.8 ? 72 : 55;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }
  resize();
  DZ.onResize(function () { resize(); if (DZ.reduced) renderer.render(scene, camera); });

  if (DZ.reduced) { place(0.05); renderer.render(scene, camera); return; }

  DZ.loop(function (t, dt) {
    current += (target - current) * Math.min(1, dt * 3.2);
    place(Math.min(Math.max(current, 0), 1));
    var arr = dustGeo.attributes.position.array;
    for (var i = 0; i < dustCount; i++) {
      arr[i * 3 + 1] += dustSpeed[i] * dt;
      arr[i * 3] += Math.sin(t * 0.5 + i) * 0.002;
      if (arr[i * 3 + 1] > 12) arr[i * 3 + 1] = 0;
    }
    dustGeo.attributes.position.needsUpdate = true;
    glow.intensity = 1.2 + Math.sin(t * 1.6) * 0.25;
    renderer.render(scene, camera);
  });
})();
