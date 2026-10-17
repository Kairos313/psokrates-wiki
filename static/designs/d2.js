/* Design 2 — Amphora. A procedurally painted black-figure vase turns one panel per section. */
(function () {
  "use strict";
  var body = document.body;
  var canvas = document.getElementById("d2-stage");
  var INK = "#17110c", TERRA = "#c8642f", TERRA_LT = "#d98a52";

  /* ---------- Meander borders ---------- */
  function drawMeander(svg) {
    var w = svg.clientWidth || window.innerWidth, h = 34, u = 34, d = "M0 2 H" + w + " M0 32 H" + w;
    for (var x = 0; x < w; x += u) {
      d += " M" + (x + 4) + " 32 V8 H" + (x + 28) + " V24 H" + (x + 12) + " V16 H" + (x + 20);
    }
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    var path = svg.querySelector("path");
    path.setAttribute("d", d);
    return path;
  }
  var meanders = Array.prototype.map.call(document.querySelectorAll(".d2-meander"), drawMeander);
  DZ.onResize(function () { document.querySelectorAll(".d2-meander").forEach(drawMeander); });

  if (!DZ.reduced) {
    meanders.forEach(function (p, i) {
      var len = p.getTotalLength();
      gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 2.4, ease: "power2.inOut", delay: 0.2 + i * 0.2,
        onComplete: function () { p.style.strokeDasharray = "none"; } });
    });
    var words = DZ.split(document.getElementById("d2-title"), "chars");
    gsap.from(words, { y: 60, opacity: 0, rotate: 8, duration: 1, ease: "back.out(2)", stagger: 0.03, delay: 0.4 });
    gsap.from(".d2-kicker, .d2-tagline, .d2-btn", { y: 24, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.1, delay: 0.9 });
    gsap.utils.toArray(".d2-panel-copy").forEach(function (el) {
      gsap.from(el, { x: -60, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 78%" } });
    });
    gsap.from(".d2-stat", { y: 40, opacity: 0, stagger: 0.12, duration: 0.8, scrollTrigger: { trigger: ".d2-stats", start: "top 75%" } });
    gsap.from(".d2-shard", { y: 120, rotate: function (i) { return (i % 2 ? 1 : -1) * 18; }, opacity: 0, duration: 1.1, ease: "back.out(1.4)", stagger: 0.08,
      scrollTrigger: { trigger: ".d2-shard-grid", start: "top 85%" } });
    DZ.magnetic(".d2-btn", 0.25);
  }
  document.querySelector(".d2-btn").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("d2-panels").scrollIntoView({ behavior: DZ.reduced ? "auto" : "smooth" });
  });

  if (!DZ.webgl) { body.classList.add("no-webgl"); canvas.style.display = "none"; return; }

  /* ---------- Vase texture ---------- */
  var H = 6.55;
  var TW = 2048, TH = 1024;
  function yToPx(y) { return (1 - y / H) * TH; }

  function vaseTexture() {
    var c = document.createElement("canvas");
    c.width = TW; c.height = TH;
    var g = c.getContext("2d");
    g.fillStyle = TERRA; g.fillRect(0, 0, TW, TH);

    // subtle firing variation
    for (var i = 0; i < 60; i++) {
      g.fillStyle = "rgba(" + (Math.random() > .5 ? "255,190,140" : "120,50,20") + ",.05)";
      g.beginPath(); g.arc(Math.random() * TW, Math.random() * TH, 40 + Math.random() * 160, 0, 7); g.fill();
    }
    function band(y0, y1, color) { g.fillStyle = color; g.fillRect(0, yToPx(y1), TW, yToPx(y0) - yToPx(y1)); }

    band(0, 0.62, INK);                              // foot
    // rays rising from the foot
    g.fillStyle = INK;
    for (var x = 0; x < TW; x += 64) {
      g.beginPath(); g.moveTo(x, yToPx(0.62)); g.lineTo(x + 32, yToPx(1.4)); g.lineTo(x + 64, yToPx(0.62)); g.fill();
    }
    band(1.45, 1.55, INK);
    band(1.62, 1.66, INK);
    band(3.92, 3.98, INK);
    band(4.04, 4.1, INK);
    // tongues at the shoulder
    var t0 = yToPx(4.42), t1 = yToPx(4.12);
    for (var tx = 0; tx < TW; tx += 48) {
      g.fillStyle = (tx / 48) % 2 ? INK : "#7a2f12";
      g.beginPath(); g.moveTo(tx + 4, t0); g.lineTo(tx + 44, t0); g.lineTo(tx + 44, (t0 + t1) / 2);
      g.quadraticCurveTo(tx + 24, t1 + 4, tx + 4, (t0 + t1) / 2); g.closePath(); g.fill();
    }
    band(4.42, 6.55, INK);                           // neck + lip
    // meander band on the neck, painted in reserve (terracotta on black)
    var my0 = yToPx(5.62), my1 = yToPx(5.12), mh = my1 - my0;
    g.strokeStyle = TERRA; g.lineWidth = 7; g.lineJoin = "miter";
    g.beginPath(); g.moveTo(0, my0); g.lineTo(TW, my0); g.moveTo(0, my1); g.lineTo(TW, my1); g.stroke();
    for (var mx = 0; mx < TW; mx += mh) {
      var s = mh / 34;
      g.beginPath();
      g.moveTo(mx + 4 * s, my1); g.lineTo(mx + 4 * s, my0 + 8 * s); g.lineTo(mx + 28 * s, my0 + 8 * s);
      g.lineTo(mx + 28 * s, my0 + 24 * s); g.lineTo(mx + 12 * s, my0 + 24 * s); g.lineTo(mx + 12 * s, my0 + 16 * s); g.lineTo(mx + 20 * s, my0 + 16 * s);
      g.stroke();
    }
    // incised lip line
    g.strokeStyle = "rgba(200,100,47,.7)"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, yToPx(6.25)); g.lineTo(TW, yToPx(6.25)); g.stroke();

    // four framed panels centred on u = 0, .25, .5, .75 + palmettes between them
    var letters = ["Α", "Β", "Γ", "Δ"];
    var py0 = yToPx(3.78), py1 = yToPx(1.8), pw = 360;
    function panel(cx, letter) {
      g.fillStyle = INK;
      g.fillRect(cx - pw / 2, py0, pw, py1 - py0);
      g.strokeStyle = TERRA; g.lineWidth = 5;
      g.strokeRect(cx - pw / 2 + 16, py0 + 16, pw - 32, py1 - py0 - 32);
      g.lineWidth = 2;
      g.strokeRect(cx - pw / 2 + 26, py0 + 26, pw - 52, py1 - py0 - 52);
      var cy = (py0 + py1) / 2;
      // laurel wreath
      g.fillStyle = TERRA;
      for (var side = -1; side <= 1; side += 2) {
        for (var k = 0; k < 11; k++) {
          var a = Math.PI / 2 + side * (0.35 + k * 0.23);
          var lx = cx + Math.cos(a) * 118, ly = cy + 10 + Math.sin(a) * 118;
          g.save(); g.translate(lx, ly); g.rotate(a + side * 0.9);
          g.beginPath(); g.ellipse(0, 0, 20, 7, 0, 0, Math.PI * 2); g.fill();
          g.restore();
        }
      }
      g.font = "400 210px Fredericka, Georgia, serif";
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = TERRA_LT;
      g.fillText(letter, cx, cy + 8);
      g.strokeStyle = INK; g.lineWidth = 3;
      g.strokeText(letter, cx, cy + 8);
    }
    function palmette(cx) {
      var cy = (py0 + py1) / 2 + 40;
      g.fillStyle = INK;
      for (var k = -4; k <= 4; k++) {
        g.save(); g.translate(cx, cy); g.rotate(k * 0.26);
        g.beginPath(); g.ellipse(0, -70, 12, 58, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      g.beginPath(); g.arc(cx, cy, 16, 0, 7); g.fill();
      g.strokeStyle = INK; g.lineWidth = 6;
      g.beginPath(); g.moveTo(cx - 70, cy + 60); g.bezierCurveTo(cx - 30, cy + 10, cx + 30, cy + 10, cx + 70, cy + 60); g.stroke();
      g.beginPath(); g.arc(cx - 76, cy + 50, 12, 0, 7); g.arc(cx + 76, cy + 50, 12, 0, 7); g.stroke();
    }
    for (var p = 0; p < 4; p++) {
      panel(p * TW / 4, letters[p]);
      palmette(p * TW / 4 + TW / 8);
    }
    panel(TW, letters[0]); // wrap the seam
    return c;
  }

  /* ---------- Scene ---------- */
  var renderer = DZ.renderer(canvas, { alpha: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.2, 17);

  var texCanvas = vaseTexture();
  var tex = new THREE.CanvasTexture(texCanvas);
  tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.wrapS = THREE.RepeatWrapping;
  // repaint once the display font has loaded so the panel letters use it
  if (document.fonts && document.fonts.load) {
    document.fonts.load("400 40px Fredericka").then(function () {
      var fresh = vaseTexture();
      texCanvas.getContext("2d").drawImage(fresh, 0, 0);
      tex.needsUpdate = true;
    });
  }

  var prof = [[0.01, 0], [0.92, 0], [0.96, 0.14], [0.72, 0.3], [0.54, 0.5], [0.66, 0.72], [1.15, 1.2], [1.62, 1.95], [1.88, 2.75], [1.86, 3.4], [1.58, 4.1], [1.05, 4.6], [0.66, 4.95], [0.6, 5.5], [0.66, 6.05], [0.92, 6.32], [0.98, 6.46], [0.84, 6.55], [0.56, 6.5], [0.5, 6.1]];
  var spline = new THREE.SplineCurve(prof.map(function (p) { return new THREE.Vector2(p[0], p[1]); }));
  var lathe = new THREE.LatheGeometry(spline.getPoints(160), 160);
  var pos = lathe.attributes.position, uv = lathe.attributes.uv;
  for (var i = 0; i < pos.count; i++) uv.setY(i, Math.min(Math.max(pos.getY(i) / H, 0), 1));
  lathe.computeVertexNormals();

  var clay = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.32, side: THREE.DoubleSide });
  var vase = new THREE.Group();
  var vaseMesh = new THREE.Mesh(lathe, clay);
  vaseMesh.position.y = -H / 2;
  vase.add(vaseMesh);

  var handleMat = new THREE.MeshPhysicalMaterial({ color: 0x0d0906, roughness: 0.5, clearcoat: 0.4 });
  [-1, 1].forEach(function (side) {
    var curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.58, 5.55, 0), new THREE.Vector3(side * 1.35, 5.75, 0),
      new THREE.Vector3(side * 1.75, 5.2, 0), new THREE.Vector3(side * 1.6, 4.4, 0), new THREE.Vector3(side * 1.25, 4.05, 0)
    ]);
    var handle = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.12, 16, false), handleMat);
    handle.position.y = -H / 2;
    vase.add(handle);
  });
  scene.add(vase);

  // soft contact shadow
  var sc = document.createElement("canvas"); sc.width = sc.height = 128;
  var sg = sc.getContext("2d"), rg = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, "rgba(40,20,10,.55)"); rg.addColorStop(1, "rgba(40,20,10,0)");
  sg.fillStyle = rg; sg.fillRect(0, 0, 128, 128);
  var shadow = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x6b3a1c, 0.8));
  var key = new THREE.DirectionalLight(0xfff0db, 1.6); key.position.set(-6, 8, 9); scene.add(key);
  var rim = new THREE.DirectionalLight(0xff9a55, 1.6); rim.position.set(7, 3, -6); scene.add(rim);
  var fill = new THREE.PointLight(0xffd7b0, 0.6, 30); fill.position.set(4, -2, 8); scene.add(fill);

  /* ---------- Scroll choreography ---------- */
  var st = { rot: Math.PI * 1.2, y: -1.4, x: 0, s: 1, tilt: 0 };
  var cur = { rot: st.rot, y: st.y, x: 0, s: 1, tilt: 0 };
  var mobile = false, mx = 0, my = 0, heroP = 0, panelP = 0, outroP = 0;

  function layout() {
    mobile = window.innerWidth < 860;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.z = mobile ? 22 : 17;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }
  layout();
  DZ.onResize(function () { layout(); if (DZ.reduced) render(); });

  function smooth(a, b, x) { var t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); }

  function compute() {
    // panels: hold each face, then turn a quarter
    var f = Math.min(Math.max(panelP * 4 - 0.5, 0), 3), k = Math.floor(f), frac = f - k;
    if (k === 3) frac = 0;
    var turned = k + smooth(0.25, 0.75, frac);
    st.rot = (1 - heroP) * Math.PI * 1.2 - turned * Math.PI / 2 - outroP * Math.PI * 0.6;
    st.y = -1.2 * (1 - heroP) + (mobile ? 1.3 : 0) + outroP * 7;
    st.x = mobile ? 0 : (2.9 - (1 - heroP) * 0.4);
    st.s = (mobile ? 0.82 : 1) * (1 - outroP * 0.3);
    st.tilt = outroP * 0.5;
  }

  if (!DZ.reduced) {
    ScrollTrigger.create({ trigger: ".d2-hero", start: "top top", end: "bottom top", scrub: true, onUpdate: function (s) { heroP = s.progress; } });
    ScrollTrigger.create({ trigger: ".d2-panels", start: "top center", end: "bottom center", onUpdate: function (s) { panelP = s.progress; } });
    ScrollTrigger.create({ trigger: ".d2-stats", start: "top bottom", end: "bottom top", onUpdate: function (s) { outroP = s.progress; } });
    window.addEventListener("pointermove", function (e) { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; }, { passive: true });
  } else {
    heroP = 1;
  }

  function apply() {
    vase.rotation.y = cur.rot + mx * 0.25;
    vase.rotation.x = my * 0.08 + cur.tilt;
    vase.rotation.z = -mx * 0.05;
    vase.position.set(cur.x, cur.y, 0);
    vase.scale.setScalar(cur.s);
    shadow.position.set(cur.x, cur.y - H / 2 * cur.s - 0.05, 0);
    shadow.material.opacity = Math.max(0, 1 - outroP * 2);
  }
  function render() { compute(); Object.assign(cur, st); apply(); renderer.render(scene, camera); }

  if (DZ.reduced) { render(); return; }

  DZ.loop(function (t, dt) {
    compute();
    var k = Math.min(1, dt * 4);
    for (var key in st) cur[key] += (st[key] - cur[key]) * k;
    apply();
    vase.position.y += Math.sin(t * 1.1) * 0.06;
    renderer.render(scene, camera);
  });
})();
