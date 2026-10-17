/* NOVA — homepage director. One fixed WebGL stage; each <section data-act> drives an act.
   All words on the page come from the original homepage; every visual here is procedural. */
(function () {
  "use strict";
  var root = document.querySelector("[data-nova-home]");
  if (!root) return;
  var webgl = (function () { try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); } catch (e) { return false; } })();
  if (!window.NVGL || typeof THREE === "undefined" || !webgl) { htmlFallback(); return; }

  /* Without WebGL the words still have to be readable: the types become a plain list
     and the patient voices a quote you can step through. */
  function htmlFallback() {
    var Dx = window.NOVA_HOME || { voices: [], types: [] };
    document.documentElement.classList.add("nv-no-gl");
    var ul = document.getElementById("nh-types-list"), nm = document.getElementById("nh-types-name"), tx = document.getElementById("nh-types-text");
    function pick(i) { if (nm) nm.textContent = Dx.types[i].name; if (tx) tx.textContent = Dx.types[i].text; ul.querySelectorAll("button").forEach(function (b, j) { b.classList.toggle("is-active", j === i); }); }
    if (ul && Dx.types.length) {
      Dx.types.forEach(function (ty, i) { var li = document.createElement("li"), b = document.createElement("button"); b.type = "button"; b.textContent = ty.name; b.addEventListener("click", function () { pick(i); }); li.appendChild(b); ul.appendChild(li); });
      pick(0);
    }
    var q = document.getElementById("nh-quote"), n = Dx.voices.length, at = 0;
    if (q && n) {
      q.innerHTML = '<span class="nh-quote-n"></span><span class="nh-quote-t"></span>';
      var show = function () { q.querySelector(".nh-quote-n").textContent = "[ " + String(at + 1).padStart(2, "0") + " / " + String(n).padStart(2, "0") + " ]"; q.querySelector(".nh-quote-t").textContent = Dx.voices[at]; };
      var nav = document.createElement("div"); nav.className = "nh-quote-nav";
      ["\u2190", "\u2192"].forEach(function (ch, d) { var b = document.createElement("button"); b.type = "button"; b.textContent = ch; b.setAttribute("aria-label", d ? "Next" : "Previous"); b.addEventListener("click", function () { at = (at + (d ? 1 : n - 1)) % n; show(); }); nav.appendChild(b); });
      q.classList.add("is-on"); show(); q.appendChild(nav);
    }
  }
  var D = window.NOVA_HOME || { voices: [], types: [] };
  var canvas = document.getElementById("nh-stage");
  var COARSE = NVGL.coarse, REDUCED = NVGL.reduced;
  if (REDUCED) document.documentElement.classList.add("nv-reduced");

  var gl = NVGL.create(canvas, { fov: 40, exposure: 1.12, observe: root });
  var scene = gl.scene, camera = gl.camera, renderer = gl.renderer;
  var env = NVGL.envTexture(renderer, false);
  scene.environment = env;
  scene.fog = new THREE.FogExp2(0x05070b, 0.045);
  var seed = 42;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  // frame-rate independent easing: the same feel at 30, 60 or 120 fps
  function ease(lambda, dt) { return 1 - Math.exp(-lambda * dt); }
  function damp(x, target, lambda, dt) { return x + (target - x) * ease(lambda, dt); }
  var invalidate = function () {};
  /* Cross-fade an act's objects with scroll instead of switching them on at full strength.
     Opaque materials go translucent only while fading (depth writes stay on). */
  function actFade(group, s, dt) {
    var u = group.userData, target = typeof s === "number" ? s : s.f;
    u.fade = REDUCED ? target : damp(u.fade || 0, target, 7, dt);
    var a = u.fade;
    group.traverse(function (o) {
      var ms = o.material; if (!ms) return; if (!Array.isArray(ms)) ms = [ms];
      for (var q = 0; q < ms.length; q++) {
        var m = ms[q], md = m.userData;
        if (md.fadeBase === undefined) { md.fadeBase = m.opacity; md.fadeOpaque = !m.transparent; }
        m.opacity = md.fadeBase * a;
        if (md.fadeOpaque) m.transparent = a < .995;
      }
    });
    return a;
  }
  var V3 = THREE.Vector3;
  var projected = new V3();

  /* ---------- Sections → act state ---------- */
  var sections = Array.prototype.slice.call(root.querySelectorAll("[data-act]"));
  var S = {};
  sections.forEach(function (el) { S[el.getAttribute("data-act")] = { el: el, v: 0, p: 0, pin: el.hasAttribute("data-pin") }; });
  // section positions are measured once (and again on resize), then every act reads one
  // lightly smoothed scroll value, so nothing forces layout inside the animation frame
  var bounds = {}, smoothY = scrollY, needMeasure = true, vhC = innerHeight;
  function cacheBounds() {
    vhC = innerHeight;
    sections.forEach(function (el) { var r = el.getBoundingClientRect(); bounds[el.getAttribute("data-act")] = { top: r.top + scrollY, h: r.height }; });
    needMeasure = false;
  }
  window.addEventListener("resize", function () { needMeasure = true; });
  window.addEventListener("pageshow", function () { needMeasure = true; smoothY = scrollY; });
  if (window.ResizeObserver) new ResizeObserver(function () { needMeasure = true; }).observe(root);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { needMeasure = true; });
  function measure(dt) {
    if (needMeasure) cacheBounds();
    var y = scrollY;
    smoothY = REDUCED || !dt || Math.abs(y - smoothY) > vhC * 2.5 ? y : damp(smoothY, y, 16, dt);
    var vh = vhC;
    sections.forEach(function (el) {
      var k = el.getAttribute("data-act"), s = S[k], b = bounds[k], top = b.top - smoothY, bottom = top + b.h;
      s.v = clamp((Math.min(bottom, vh) - Math.max(top, 0)) / vh, 0, 1);
      s.p = s.pin ? clamp(-top / Math.max(1, b.h - vh), 0, 1) : clamp((vh - top) / (vh + b.h), 0, 1);
      s.f = 0; s.c = 0;
    });
    /* One scene at a time, like a film cut: while two sections share the screen the outgoing
       act fades out fully, the camera travels across the gap, then the incoming act fades in.
       f = how present an act's objects are, c = its share of the camera. */
    for (var i = 0; i < order.length; i++) {
      var a = S[order[i]]; if (a.v <= 0) continue;
      var nb = S[order[i + 1]];
      if (nb && nb.v > 0) {
        var tt = nb.v / (a.v + nb.v), cm = smooth(.28, .72, tt);
        a.f = 1 - smooth(.08, .44, tt); nb.f = smooth(.56, .92, tt);
        a.c = 1 - cm; nb.c = cm;
      } else { a.f = i === order.length - 1 ? smooth(.45, .85, a.v) : 1; a.c = 1; }
      break;
    }
  }
  var order = sections.map(function (el) { return el.getAttribute("data-act"); });

  /* ---------- Backdrop: aurora + frost ---------- */
  var bgU = { uTime: { value: 0 }, uA: { value: new THREE.Color(0x0d2c44) }, uB: { value: new THREE.Color(0x6cc8f0) }, uP: { value: new THREE.Vector2() }, uDim: { value: 0 } };
  var backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false, uniforms: bgU,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
    fragmentShader: ["uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec2 uP; uniform float uDim; varying vec2 vUv;", NVGL.NOISE,
      "void main(){ vec2 p = vUv*vec2(2.2,1.2); float n = snoise(vec3(p*1.1 + uP*.12, uTime*.04)); float n2 = snoise(vec3(p*2.6, uTime*.03 + 7.));",
      " float band = smoothstep(.2, .95, 1. - abs(vUv.y - .7 - n*.16)*2.4);",
      " vec3 col = mix(vec3(.01,.014,.024), uA, smoothstep(-.5, 1., n)*.8) + uB*band*(.16 + n2*.05);",
      " col *= 1. - smoothstep(.35, 1.2, length(vUv - vec2(.5,.5))*1.25)*.75; col *= 1. - uDim*.7; gl_FragColor = vec4(col, 1.); }"].join("\n")
  }));
  backdrop.frustumCulled = false; backdrop.renderOrder = -10;
  scene.add(backdrop);
  var palettes = {
    hero: [0x0d2c44, 0x6cc8f0], clock: [0x0c1d2c, 0x6cc8f0], armor: [0x2a0f0c, 0xff6a3d], types: [0x101a26, 0x8fd8ff], story: [0x14100c, 0xc79a6a],
    voices: [0x050816, 0x4a6fd1], balance: [0x0c1720, 0x9fe3ff], hmw: [0x0a1622, 0x6cc8f0], solution: [0x07141d, 0x6cc8f0], hub: [0x0d2c44, 0xa8e6ff]
  };
  var tmpA = new THREE.Color(), tmpB = new THREE.Color();

  var FROST = COARSE ? 600 : 1600, fpos = new Float32Array(FROST * 3), fsp = new Float32Array(FROST);
  for (var i = 0; i < FROST; i++) { fpos[i * 3] = (rnd() - .5) * 40; fpos[i * 3 + 1] = (rnd() - .5) * 24; fpos[i * 3 + 2] = (rnd() - .5) * 30 - 4; fsp[i] = .1 + rnd() * .5; }
  var frostG = new THREE.BufferGeometry(); frostG.setAttribute("position", new THREE.BufferAttribute(fpos, 3));
  var dotTex = NVGL.dotTexture();
  var frost = new THREE.Points(frostG, new THREE.PointsMaterial({ size: .07, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xcdeeff, opacity: .8 }));
  scene.add(frost);

  var keyLight = new THREE.DirectionalLight(0xcfeeff, 1.4); keyLight.position.set(-6, 10, 8); scene.add(keyLight);
  var rimLight = new THREE.DirectionalLight(0x6cc8f0, .8); rimLight.position.set(8, 2, -6); scene.add(rimLight);
  scene.add(new THREE.AmbientLight(0x1a2a3a, .55));

  /* ======================================================================
     ACT: the skin field (hero → armour). Instanced hexagonal ice scales.
     ====================================================================== */
  var field = new THREE.Group(); scene.add(field);
  var COLS = COARSE ? 30 : 54, ROWS = COARSE ? 24 : 34, HEXR = .5;
  var hexGeo = new THREE.LatheGeometry([[0, 0], [HEXR * .95, 0], [HEXR * .95, .86], [HEXR * .8, 1], [0, 1]].map(function (q) { return new THREE.Vector2(q[0], q[1]); }), 6); hexGeo.computeVertexNormals();
  var hexMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .72, clearcoat: .15, clearcoatRoughness: .5, envMap: env, envMapIntensity: .7 });
  var hexCount = COLS * ROWS;
  var hexes = new THREE.InstancedMesh(hexGeo, hexMat, hexCount);
  hexes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  var hexData = [], dummy = new THREE.Object3D(), col = new THREE.Color();
  for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
    var x = (c - COLS / 2) * HEXR * 1.74 + (r % 2 ? HEXR * .87 : 0), z = (r - ROWS / 2) * HEXR * 1.5;
    var k = hexData.length;
    hexData.push({ x: x, z: z, n: rnd(), lift: 0, tilt: rnd() * 6.283, crack: rnd(), rot: (rnd() - .5) * .25, sx: .9 + rnd() * .16 });
    col.setHSL(.04 + rnd() * .03, .28 + rnd() * .1, .13 + rnd() * .08); hexes.setColorAt(k, col);
  }
  field.add(hexes);
  // ember glow beneath the scales (visible through cracks)
  var magmaU = { uTime: { value: 0 }, uK: { value: 0 } };
  var magma = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.ShaderMaterial({
    uniforms: magmaU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: ["uniform float uTime; uniform float uK; varying vec2 vUv;", NVGL.NOISE,
      "void main(){ float n = snoise(vec3(vUv*vec2(9.,6.), uTime*.15)); float vein = smoothstep(.0,.08, .08 - abs(n));",
      " vec3 c = vec3(1.,.36,.18)*vein*1.6 + vec3(.6,.12,.05)*smoothstep(-.2,.9,n)*.5; gl_FragColor = vec4(c*uK, 1.); }"].join("\n")
  }));
  magma.rotation.x = -Math.PI / 2; magma.position.y = -.05; field.add(magma);
  var emberLight = new THREE.PointLight(0xff6a3d, 0, 18, 2); emberLight.position.set(0, 1.2, 2); field.add(emberLight);
  var plane = new THREE.Plane(new V3(0, 1, 0), 0), ray = new THREE.Raycaster(), hitP = new V3(), ndc = new THREE.Vector2(), hoverP = new V3(999, 0, 999), hoverK = 0;
  window.addEventListener("pointermove", function (e) { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)); }, { passive: true });

  function updateField(t, dt, heroV, armorK) {
    var pres = actFade(field, Math.max(heroV, armorK), dt);
    field.visible = pres > .01;
    if (!field.visible) return;
    // the armour keeps its broken shape while it fades out towards the body
    if (S.armor && S.armor.v > 0 && S.types && S.types.v > 0) armorK = 1;
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hitP)) { hoverP.lerp(hitP, ease(16, dt)); hoverK = damp(hoverK, 1, 3, dt); }
    var calm = 1 - armorK, liftK = ease(7.5, dt);
    for (var k = 0; k < hexCount; k++) {
      var h = hexData[k];
      var dx = h.x - hoverP.x, dz = h.z - hoverP.z, d2 = dx * dx + dz * dz;
      var push = Math.exp(-d2 / 3.2) * hoverK * calm;
      var wave = Math.sin(t * 1.4 + h.x * .45 + h.z * .3) * .06 + Math.sin(t * .7 + h.n * 6) * .04;
      var rough = armorK * (.12 + h.n * .3);
      h.lift += (push * .55 - h.lift) * liftK;
      var height = .22 + wave * calm + rough + h.lift;
      dummy.position.set(h.x + dx * push * .08, 0, h.z + dz * push * .08);
      var tl = armorK * (.18 + h.crack * .32) + push * .12;
      dummy.position.y = armorK * (h.n * .35);
      dummy.rotation.set(Math.cos(h.tilt) * tl, h.rot + h.tilt * armorK * .15, Math.sin(h.tilt) * tl);
      var sc2 = h.sx * (1 + armorK * (.12 + h.crack * .12));
      dummy.scale.set(sc2, height * (1 - armorK * .45), sc2);
      dummy.updateMatrix(); hexes.setMatrixAt(k, dummy.matrix);
    }
    hexes.instanceMatrix.needsUpdate = true;
    hexMat.color.setRGB(lerp(1, 2.4, armorK), lerp(1, 2.25, armorK), lerp(1, 2.2, armorK)); hexMat.roughness = lerp(.72, .9, armorK);
    magmaU.uK.value = armorK * pres; magmaU.uTime.value = t;
    emberLight.intensity = armorK * pres * 5;
    field.position.y = -1.5 - (1 - pres) * .8;
  }

  /* ======================================================================
     ACT: the clock — calm 28-day stack vs. a frantic 3-day heap.
     ====================================================================== */
  var clockG = new THREE.Group(); scene.add(clockG);
  var cellGeo = new THREE.SphereGeometry(.155, 20, 12); cellGeo.scale(1, .5, 1);
  var cellMatA = new THREE.MeshPhysicalMaterial({ color: 0xd8c2b4, roughness: .68, clearcoat: .2, envMap: env, envMapIntensity: .6 });
  var cellMatB = new THREE.MeshPhysicalMaterial({ color: 0xe0a58e, roughness: .65, clearcoat: .2, envMap: env, envMapIntensity: .6, emissive: 0x4a1006, emissiveIntensity: .45 });
  var CELLS = COARSE ? 270 : 540;
  function makeStack(mat, x) {
    var m = new THREE.InstancedMesh(cellGeo, mat, CELLS); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.position.x = x; clockG.add(m);
    var cells = []; for (var q = 0; q < CELLS; q++) cells.push({ alive: false, y: 0, x: 0, z: 0, r: 0, life: 0, vx: 0, vz: 0 });
    return { mesh: m, cells: cells, acc: 0, slot: 0 };
  }
  var stackA = makeStack(cellMatA, -.62), stackB = makeStack(cellMatB, .62);
  [-.62, .62].forEach(function (bx2, bi) { // basal layer each stack rises from
    var basal = new THREE.Mesh(new THREE.BoxGeometry(1.1, .2, 1.1), new THREE.MeshPhysicalMaterial({ color: bi ? 0x8a4a3c : 0x7a6258, roughness: .8, envMap: env, envMapIntensity: .4 }));
    basal.position.set(bx2, -3.45, 0); clockG.add(basal);
  });
  function updateStack(st, t, dt, rate, speed, chaos) {
    st.acc += dt * rate;
    while (st.acc > 1) {
      st.acc -= 1;
      for (var cell = 0; cell < 9; cell++) {   // one layer of 3 × 3 cells
        var c = st.cells[st.slot = (st.slot + 1) % CELLS]; c.alive = true; c.life = 0; c.y = -3.2; c.top = 0;
        var gx = (cell % 3) - 1, gz = ((cell / 3) | 0) - 1;
        c.x = gx * .3 + (rnd() - .5) * chaos * .28; c.z = gz * .3 + (rnd() - .5) * chaos * .28; c.r = (rnd() - .5) * chaos; c.vx = (rnd() - .5) * chaos * .6; c.vz = (rnd() - .5) * chaos * .6;
      }
    }
    for (var q = 0; q < CELLS; q++) {
      var c2 = st.cells[q];
      if (!c2.alive) { dummy.scale.setScalar(0); dummy.updateMatrix(); st.mesh.setMatrixAt(q, dummy.matrix); continue; }
      c2.life += dt; c2.y += dt * speed;
      var fade;
      if (chaos > .3) {                 // psoriasis side: cells jam and heap at the surface
        if (c2.y > 2.2) { c2.top = (c2.top || 0) + dt; c2.y = 2.2 + c2.top * .25; c2.x += c2.vx * dt * 2.2; c2.z += c2.vz * dt * 2.2; }
        fade = 1 - smooth(3, 4.2, c2.top || 0);
      } else {                          // healthy side: orderly layers, shed at the surface
        c2.top = 0; fade = 1 - smooth(2.0, 2.6, c2.y);
      }
      if (fade <= 0) { c2.alive = false; c2.top = 0; }
      dummy.position.set(c2.x, c2.y, c2.z); dummy.rotation.set(c2.r, c2.r * 2, c2.r);
      dummy.scale.setScalar(Math.max(0, fade)); dummy.updateMatrix(); st.mesh.setMatrixAt(q, dummy.matrix);
    }
    st.mesh.instanceMatrix.needsUpdate = true;
  }
  for (var pw = 0; pw < 600; pw++) { updateStack(stackA, pw / 30, 1 / 30, 1.25, .26, .02); updateStack(stackB, pw / 30, 1 / 30, 1.25, .26, .02); }
  var clockEl = S.clock && S.clock.el, counted = { a: false, b: false };
  function countUp(el) {
    var to = +el.getAttribute("data-count-to"), t0 = performance.now();
    (function step(now) { var p = clamp((now - t0) / 1400, 0, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(t0);
  }
  function updateClock(t, dt, s) {
    clockG.visible = actFade(clockG, s, dt) > .01;
    if (!clockG.visible) return;
    var phaseB = s.p > .45;
    if (clockEl) clockEl.setAttribute("data-phase", phaseB ? "b" : "a");
    if (s.v > .5 && !counted.a) { counted.a = true; countUp(clockEl.querySelector(".nh-clock-a [data-count-to]")); }
    if (phaseB && !counted.b) { counted.b = true; countUp(clockEl.querySelector(".nh-clock-b [data-count-to]")); }
    updateStack(stackA, t, dt, 1.25, .26, .02);
    updateStack(stackB, t, dt, phaseB ? 7 : 1.25, phaseB ? 1.6 : .26, phaseB ? .8 : .02);
    clockG.position.y = (1 - clockG.userData.fade) * -1.5;
    clockG.rotation.y = gl.pointer.sx * .25;
  }

  /* ======================================================================
     ACT: types — a realistic human figure (CC0 base mesh, dressed in plain shorts).
     Hovering a type (or a part of the body) previews where it appears; choosing it grows
     that type's lesions while the camera flies round to frame the affected region.
     ====================================================================== */
  var bodyG = new THREE.Group(); scene.add(bodyG); bodyG.visible = false;
  var body = null, bodyMat = null, BSCALE = 3.1, bodyFade = 0;
  var list = document.getElementById("nh-types-list"), tName = document.getElementById("nh-types-name"), tText = document.getElementById("nh-types-text");
  var typesEl = S.types && S.types.el;
  var selected = -1, focused = false, previewList = -1, previewBody = -1, bodyHover = 0;
  // where to look from for each type (body space, +z = front) and which part of the region to frame
  var VIEW = [
    { re: /scalp/i, dir: [.25, .62, -.75], pad: 2.1 },
    { re: /erythro/i, whole: true, dir: [.25, .06, 1] },
    { re: /inverse/i, dir: [.62, -.1, .78], pad: 2.6, filter: function (x, y) { return x > 0 && y > .6; } },
    { re: /plaque/i, whole: true, dir: [-.3, .06, -1] },
    { re: /guttate/i, dir: [.18, .06, 1], pad: 1.02 },
    { re: /arthritis/i, dir: [.9, .15, .42], pad: 1.25, filter: function (x, y) { return x > .14 && y > .3 && y < .505; } },
    { re: /pustular/i, dir: [-.25, .05, 1], pad: 1.5, filter: function (x, y) { return x > .14 && y > .2; } }
  ];
  function viewFor(name) { for (var q = 0; q < VIEW.length; q++) if (VIEW[q].re.test(name)) return VIEW[q]; return { whole: true, dir: [0, .06, 1] }; }
  // camera rig: target point, distance and direction (as yaw/pitch so moves swing round the figure)
  var rig = { tx: 0, ty: 2.6, tz: 0, d: 11, yaw: .15, pitch: .06 }, want = { tx: 0, ty: 2.6, tz: 0, d: 11, yaw: .15, pitch: .06 };
  var orbit = { yaw: 0, pitch: 0, v: 0 };
  function anglesOf(dir) { var v = new V3().fromArray(dir).normalize(); return { yaw: Math.atan2(v.x, v.z), pitch: Math.asin(clamp(v.y, -1, 1)) }; }
  function frameFor(i) {
    var g = body.geometry, H = g.userData.H, ty = D.types[i], f = viewFor(ty ? ty.name : ""), rule = ty && NovaBody.styleFor(ty.name), info = null;
    if (focused && !f.whole && rule) info = NovaBody.regionInfo(g, rule, { filter: f.filter, key: f.filter ? "f" + i : "" });
    var c = info ? info.center : new V3(0, H * .5, 0), r = info ? Math.max(info.radius, H * .05) * (f.pad || 1.2) : H * .53;
    var a = anglesOf(focused ? f.dir : [.15, .06, 1]);
    want.tx = c.x * BSCALE; want.ty = c.y * BSCALE; want.tz = c.z * BSCALE; want.r = r * BSCALE; want.yaw = a.yaw; want.pitch = a.pitch;
  }
  function setButtons() {
    if (!list) return;
    list.querySelectorAll("button").forEach(function (b, j) { b.classList.toggle("is-active", j === selected); b.setAttribute("aria-pressed", j === selected ? "true" : "false"); });
  }
  // commit a type: copy, lesions, and (when asked) a close-up of its region
  function select(i, focus) {
    if (!D.types[i]) return;
    var again = i === selected;
    focused = focus ? !(again && focused) : false;
    selected = i; setButtons();
    tName.textContent = D.types[i].name; tText.textContent = D.types[i].text;
    if (bodyMat && !again) NovaBody.show(bodyMat, NovaBody.styleFor(D.types[i].name));
    if (body && body.isMesh) { frameFor(i); orbit.yaw = orbit.pitch = 0; }
    if (window.NV && NV.blip) NV.blip(700 + i * 90);
    invalidate();
  }
  if (list) {
    D.types.forEach(function (ty, i) {
      var li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.textContent = ty.name; b.setAttribute("aria-pressed", "false"); b.setAttribute("data-cursor", "Show");
      b.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") previewList = i; });
      b.addEventListener("pointerleave", function () { if (previewList === i) previewList = -1; });
      b.addEventListener("click", function () { select(i, true); });
      li.appendChild(b); list.appendChild(li);
    });
  }
  function loadBody() {
    if (body || !window.NovaBody || !THREE.GLTFLoader) return;
    body = true;
    NovaBody.load(NV.base + "nova/models/human-body.glb", { detail: COARSE ? .6 : 1 }, function (b) {
      body = b.mesh; bodyMat = b.material;
      body.rotation.y = body.geometry.userData.front < 0 ? Math.PI : 0;
      body.scale.setScalar(BSCALE);
      bodyG.add(body);
      bodyMat.uniforms.uFade.value = 0;
      var sel = selected >= 0 ? selected : 0; selected = -1; select(sel, focused);
      // start from the full-figure framing without a fly-in
      rig.tx = want.tx; rig.ty = want.ty; rig.tz = want.tz; rig.d = fitDist(want.r); rig.yaw = want.yaw; rig.pitch = want.pitch;
      invalidate();
    });
  }
  /* framing: the region is fitted into the part of the screen that is free of text */
  function typesAnchor() {
    var w = innerWidth, h = innerHeight;
    if (w > 860) return { x: .36, y: 0, fw: .58, fh: .9 };       // right of the type list
    return { x: 0, y: .44, fw: .94, fh: .44 };                  // phone: upper half, list below
  }
  function fitDist(r) {
    var an = typesAnchor(), v = THREE.MathUtils.degToRad(camera.fov) / 2;
    var th = Math.tan(v) * an.fh, tw = Math.tan(v) * camera.aspect * an.fw;
    return r / Math.sin(Math.atan(Math.min(th, tw)));
  }
  // picking: interpolate the region weights of the hit triangle, prefer the most specific type
  var bodyRay = new THREE.Raycaster(), triA = new V3(), triB = new V3(), triC = new V3(), bary = new V3(), hitL = new V3();
  var PRIORITY = [1, 6, 0, 5, 2, 7, 3, 4]; // nails, palms/soles, scalp, folds, elbow/knee, joints, lower back, trunk
  function bitToType(bit) {
    var best = -1, bestSize = 99;
    D.types.forEach(function (ty, i) {
      var r = NovaBody.styleFor(ty.name); if (!r || !(r.mask & (1 << bit))) return;
      var size = 0, m = r.mask; while (m) { size += m & 1; m >>= 1; }
      if (size < bestSize) { bestSize = size; best = i; }
    });
    return best;
  }
  function overText(x, y) { var el = document.elementFromPoint(x, y); return !!(el && el.closest && el.closest(".nh-types-copy, a, button, .nv-header, .nv-menu")); }
  function pickAt(nx, ny) {
    if (!body || !body.isMesh) return -1;
    bodyRay.setFromCamera({ x: nx, y: ny }, camera);
    var hit = bodyRay.intersectObject(body, false)[0];
    if (!hit) return -1;
    var g = body.geometry, f = hit.face, pa = g.attributes.position;
    triA.fromBufferAttribute(pa, f.a); triB.fromBufferAttribute(pa, f.b); triC.fromBufferAttribute(pa, f.c);
    body.worldToLocal(hitL.copy(hit.point));
    THREE.Triangle.getBarycoord(hitL, triA, triB, triC, bary);
    var X = g.attributes.aX, cloth = X.getY(f.a) * bary.x + X.getY(f.b) * bary.y + X.getY(f.c) * bary.z;
    if (cloth > .5) return -1;
    var A = [g.attributes.aW0, g.attributes.aW1, g.attributes.aW2], wts = [];
    for (var b = 0; b < 8; b++) { var at = A[(b / 3) | 0], comp = ["getX", "getY", "getZ"][b % 3]; wts[b] = at[comp](f.a) * bary.x + at[comp](f.b) * bary.y + at[comp](f.c) * bary.z; }
    for (var q = 0; q < PRIORITY.length; q++) if (wts[PRIORITY[q]] > .35) { var ti = bitToType(PRIORITY[q]); if (ti >= 0) return ti; }
    return -1;
  }
  // a small label follows the cursor over the figure
  var tip = document.createElement("div"); tip.className = "nh-body-tip"; tip.setAttribute("aria-hidden", "true");
  if (typesEl) typesEl.appendChild(tip);
  var pickTick = 0, lastX = 0, lastY = 0, mouseIn = false;
  window.addEventListener("pointermove", function (e) { lastX = e.clientX; lastY = e.clientY; mouseIn = e.pointerType === "mouse"; }, { passive: true });
  // drag to orbit (horizontal swipes on touch; vertical swipes keep scrolling the page)
  var drag = null;
  function typesLive() { return S.types && S.types.v > .6 && body && body.isMesh; }
  window.addEventListener("pointerdown", function (e) {
    if (!typesLive() || overText(e.clientX, e.clientY)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, t: performance.now(), moved: false, horiz: e.pointerType === "mouse" };
  });
  window.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 7) { drag.moved = true; if (!drag.horiz) drag.horiz = Math.abs(dx) > Math.abs(dy) * 1.2; }
    if (drag.moved && drag.horiz) {
      var step = (e.clientX - drag.lx) / innerWidth * 5.5, now = performance.now();
      orbit.yaw += step; orbit.v = step / Math.max(.008, (now - drag.t) / 1000); drag.t = now;
      if (e.pointerType === "mouse") orbit.pitch = clamp(orbit.pitch - (e.movementY || 0) / innerHeight * 2, -.5, .6);
    }
    drag.lx = e.clientX; invalidate();
  }, { passive: true });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var d = drag; drag = null;
    if (e && e.type === "pointerup" && !d.moved && typesLive()) {
      var ti = pickAt(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1));
      if (ti >= 0) select(ti, true);
    }
  }
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", function (e) { if (drag && drag.moved && drag.horiz) return; drag = null; });

  var dirTmp = new V3(), focusTmp = new V3(), wasLive = false;
  function updateBody(t, dt, s) {
    if (s.v > .001 || (S.voices && S.voices.v > .3) || (S.armor && S.armor.v > .3)) loadBody();   // load a screen early
    var ready = body && body.isMesh;
    bodyFade = REDUCED ? s.f : damp(bodyFade, ready ? s.f : 0, 9, dt);
    bodyG.visible = ready && bodyFade > .01;
    if (!bodyG.visible) { previewBody = -1; return; }
    var u = bodyMat.uniforms;
    u.uTime.value = t; u.uFade.value = bodyFade;
    u.uKB.value = REDUCED ? 1 : Math.min(1, u.uKB.value + dt * .75);
    u.uKA.value = REDUCED ? 0 : Math.max(0, u.uKA.value - dt * 1.6);
    // hover preview: the type under the list cursor, else the body part under the cursor
    if (++pickTick % 3 === 0) {
      var live = s.v > .6 && mouseIn && !drag && !overText(lastX, lastY);
      previewBody = live ? pickAt(lastX / innerWidth * 2 - 1, -(lastY / innerHeight * 2 - 1)) : -1;
      tip.classList.toggle("is-on", previewBody >= 0);
      if (previewBody >= 0) { tip.textContent = D.types[previewBody].name; tip.style.transform = "translate(" + (lastX + 18) + "px," + (lastY - 10) + "px)"; }
    }
    var pv = previewList >= 0 ? previewList : previewBody;
    if (pv >= 0) NovaBody.hover(bodyMat, NovaBody.styleFor(D.types[pv].name));
    bodyHover = damp(bodyHover, pv >= 0 ? 1 : 0, 10, dt); u.uHover.value = bodyHover;
    if (typesEl) typesEl.style.cursor = previewBody >= 0 ? "pointer" : "";
    // orbit inertia, then ease the offsets home once the user lets go
    if (!drag) { orbit.yaw += orbit.v * dt; orbit.v *= Math.exp(-4 * dt); }
    var k = REDUCED ? 1 : 1 - Math.exp(-3.2 * dt);
    rig.tx += (want.tx - rig.tx) * k; rig.ty += (want.ty - rig.ty) * k; rig.tz += (want.tz - rig.tz) * k;
    var dy = Math.atan2(Math.sin(want.yaw - rig.yaw), Math.cos(want.yaw - rig.yaw));
    rig.yaw += dy * k; rig.pitch += (want.pitch - rig.pitch) * k;
    rig.d = Math.exp(lerp(Math.log(rig.d), Math.log(fitDist(want.r || 5)), k));
    bodyG.position.set(0, -2.6 + (1 - bodyFade) * -.35, 0);
    var yaw = rig.yaw + orbit.yaw + body.rotation.y, pitch = clamp(rig.pitch + orbit.pitch, -.6, 1.2);
    dirTmp.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    focusTmp.set(rig.tx, rig.ty, rig.tz).applyAxisAngle(new V3(0, 1, 0), body.rotation.y).add(bodyG.position);
    cams.types[0].copy(focusTmp).addScaledVector(dirTmp, rig.d);
    cams.types[1].copy(focusTmp);
    var an = typesAnchor(); screenAnchor.types.x = an.x; screenAnchor.types.y = an.y;
    wasLive = s.v > .6;
  }

  /* ======================================================================
     ACT: story — the team's leather book (3D_book_small.glb) as a quiet historical
     artifact beside the timeline; it turns slowly as the dates advance.
     ====================================================================== */
  var bookG = new THREE.Group(); scene.add(bookG); bookG.visible = false;
  var book = null;
  function loadBook() {
    if (book || !THREE.GLTFLoader) return;
    book = true;
    new THREE.GLTFLoader().load(NV.base + "testing/3D_book_small.glb", function (g) {
      g.scene.traverse(function (o) { if (o.isMesh) { o.material.envMap = env; o.material.envMapIntensity = .5; o.material.roughness = Math.max(.6, o.material.roughness || .6); } });
      g.scene.scale.setScalar(2.4);
      book = g.scene; bookG.add(book);
    });
    var warm = new THREE.SpotLight(0xffd2a0, 2.6, 30, .55, .7, 1.5); warm.position.set(-4, 5, 7); warm.target.position.set(0, 0, 0);
    bookG.add(warm); bookG.add(warm.target);
    var cool = new THREE.PointLight(0x7fc8ff, 1.2, 14); cool.position.set(3, 1, -3); bookG.add(cool);
  }
  var track = document.getElementById("nh-track"), trackBar = document.getElementById("nh-track-bar");
  var dust = (function () {
    var N2 = 400, pp = new Float32Array(N2 * 3); for (var q = 0; q < N2; q++) { pp[q * 3] = (rnd() - .5) * 6; pp[q * 3 + 1] = (rnd() - .5) * 5; pp[q * 3 + 2] = (rnd() - .5) * 4; }
    var g6 = new THREE.BufferGeometry(); g6.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    var m6 = new THREE.Points(g6, new THREE.PointsMaterial({ size: .035, map: dotTex, transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd9a8 }));
    bookG.add(m6); return m6;
  })();
  function updateStory(t, dt, s) {
    if (track) {
      var dist = Math.max(0, track.scrollWidth - innerWidth);
      track.style.transform = "translate3d(" + (-s.p * dist).toFixed(1) + "px,0,0)";
      if (trackBar) trackBar.style.transform = "scaleX(" + s.p.toFixed(4) + ")";
    }
    if (s.v > .001 || (S.types && S.types.v > .4)) loadBook();
    bookG.visible = !!(book && book.isObject3D) && actFade(bookG, s, dt) > .01;
    if (!bookG.visible) return;
    bookG.position.set(innerWidth > 860 ? 4.4 : 0, -.4 + (1 - bookG.userData.fade) * -1.2, -2.5);
    book.rotation.y = -.5 + s.p * Math.PI * .9 + gl.pointer.sx * .2;
    book.rotation.x = .08 + Math.sin(t * .4) * .03;
    dust.rotation.y = t * .03;
  }

  /* ======================================================================
     ACT: voices — a constellation; each star holds a patient's words.
     ====================================================================== */
  var starG = new THREE.Group(); scene.add(starG);
  var NS = D.voices.length, starPos = [], spos = new Float32Array(NS * 3), ssize = new Float32Array(NS);
  for (var v2 = 0; v2 < NS; v2++) {
    var ang = v2 / NS * Math.PI * 2 * 1.618 + rnd(), rad = 2.2 + rnd() * 4.2;
    var p3 = new V3(Math.cos(ang) * rad * 1.5 + 2.5, Math.sin(ang) * rad * .7, (rnd() - .5) * 4);
    starPos.push(p3); p3.toArray(spos, v2 * 3); ssize[v2] = 1;
  }
  var starGeo = new THREE.BufferGeometry(); starGeo.setAttribute("position", new THREE.BufferAttribute(spos, 3)); starGeo.setAttribute("aSize", new THREE.BufferAttribute(ssize, 1));
  var starU = { uTime: { value: 0 }, uPix: { value: renderer.getPixelRatio() }, uHot: { value: -1 }, uV: { value: 0 } };
  var stars = new THREE.Points(starGeo, new THREE.ShaderMaterial({
    uniforms: starU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: "uniform float uTime; uniform float uPix; uniform float uHot; uniform float uV; attribute float aSize; varying float vHot; void main(){ vHot = 0.; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = (14. + sin(uTime*2. + position.x*3.)*3.) * aSize * uPix * uV * (12. / -mv.z); gl_Position = projectionMatrix*mv; }",
    fragmentShader: "varying float vHot; void main(){ vec2 c = gl_PointCoord - .5; float d = length(c); float core = smoothstep(.12, 0., d); float halo = smoothstep(.5, 0., d)*.35; float spike = (smoothstep(.04,0.,abs(c.x))+smoothstep(.04,0.,abs(c.y)))*smoothstep(.5,.0,d)*.5; gl_FragColor = vec4(vec3(1.,.95,.85)*(core + halo + spike), core + halo + spike); }"
  }));
  starG.add(stars);
  var linePos = [];
  starPos.forEach(function (a, ia) {
    var near = starPos.map(function (b, ib) { return { ib: ib, d: a.distanceTo(b) }; }).filter(function (o) { return o.ib !== ia; }).sort(function (x, y) { return x.d - y.d; }).slice(0, 2);
    near.forEach(function (o) { if (o.ib > ia || true) { linePos.push(a.x, a.y, a.z, starPos[o.ib].x, starPos[o.ib].y, starPos[o.ib].z); } });
  });
  var lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
  var lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x8fb8ff, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false }));
  starG.add(lines);
  lines.visible = false; // no invented relationships between voices
  var quote = document.getElementById("nh-quote"), hot = -1, starBtns = [];
  var voicesPin = S.voices && S.voices.el.querySelector(".nh-pin");
  if (voicesPin && quote) {
    quote.innerHTML = '<span class="nh-quote-n"></span><span class="nh-quote-t"></span>';
    for (var vb = 0; vb < NS; vb++) {
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "nh-star"; btn.setAttribute("aria-label", "Patient voice " + (vb + 1)); btn.setAttribute("data-cursor", "Read");
      (function (i) { var pick = function () { setVoice(i, true); }; btn.addEventListener("pointerenter", pick); btn.addEventListener("focus", pick); btn.addEventListener("click", pick); })(vb);
      voicesPin.appendChild(btn); starBtns.push(btn);
    }
  }
  function setVoice(i, user) {
    if (i === hot) return;
    if (hot >= 0) { ssize[hot] = 1; starBtns[hot] && starBtns[hot].classList.remove("is-active"); }
    hot = i; ssize[hot] = 2.6; starGeo.attributes.aSize.needsUpdate = true;
    if (starBtns[hot]) { starBtns[hot].classList.add("is-active"); starBtns[hot].setAttribute("aria-pressed", "true"); }
    // cross-fade the words rather than swapping them in place
    var qn = quote.querySelector(".nh-quote-n"), qt = quote.querySelector(".nh-quote-t");
    clearTimeout(quote._swap); quote.classList.add("is-swap");
    quote._swap = setTimeout(function () {
      qn.textContent = "[ " + String(i + 1).padStart(2, "0") + " / " + String(NS).padStart(2, "0") + " ]";
      qt.textContent = D.voices[i]; quote.classList.remove("is-swap");
    }, quote.classList.contains("is-on") ? 180 : 0);
    quote.classList.add("is-on");
    if (user && window.NV && NV.blip) NV.blip(1500);
  }
  if (NS && quote) setVoice(0, false);
  function updateVoices(t, dt, s) {
    starG.visible = s.f > .01;
    starU.uV.value = s.f; starU.uTime.value = t;
    if (!starG.visible) return;
    starG.rotation.y = Math.sin(t * .05) * .12 + gl.pointer.sx * .06; starG.rotation.x = gl.pointer.sy * .04;
    projectQueue.push(function () {
      starG.updateMatrixWorld();
      for (var q = 0; q < NS; q++) {
        projected.copy(starPos[q]).applyMatrix4(starG.matrixWorld).project(camera);
        var px = (projected.x + 1) / 2 * innerWidth, py = (1 - projected.y) / 2 * innerHeight;
        if (starBtns[q]) starBtns[q].style.transform = "translate(" + (px - 22).toFixed(1) + "px," + (py - 22).toFixed(1) + "px)";
      }
    });
  }

  /* ======================================================================
     ACT: balance — the team's own marble scale (3D_balance_small.glb), split into a
     fixed base, a pivoting beam and two hanging pans. An "Antidote" vial and a "Venom"
     vial (as in the original balance animation) — the scale tips toward harm as you read.
     ====================================================================== */
  var balG = new THREE.Group(); scene.add(balG); balG.visible = false;
  var tmpPan = new V3();
  var bal = null, BAL_PIVOT = new V3(0, .615, 0), BAL_HOOK = .65, balTilt = 0, balVel = 0, balH = 5;
  // the words on the weights are taken from the two paragraphs of this section
  var BAL_GOOD = "relief", BAL_HARMS = ["serious side effects", "skin atrophy", "immunosuppression", "treatment resistance", "toxicity", "frequent relapse"];
  var balEl = S.balance && S.balance.el, balTagBox = balEl && balEl.querySelector(".nh-bal-tags"), balTags = [];
  if (balTagBox) [BAL_GOOD].concat(BAL_HARMS).forEach(function (w, k) { var el = document.createElement("span"); el.className = "nh-bal-tag" + (k ? "" : " is-good"); el.textContent = w; balTagBox.appendChild(el); balTags.push(el); });
  function vialLabel(text, color) {
    var c = document.createElement("canvas"); c.width = 512; c.height = 128;
    var g2 = c.getContext("2d");
    g2.fillStyle = "#efe6d2"; g2.fillRect(0, 0, 512, 128);
    g2.strokeStyle = "#5a4630"; g2.lineWidth = 6; g2.strokeRect(10, 10, 492, 108);
    g2.fillStyle = color; g2.font = "600 62px Georgia, 'Times New Roman', serif"; g2.textAlign = "center"; g2.textBaseline = "middle";
    g2.fillText(text, 256, 68);
    var t2 = new THREE.CanvasTexture(c); t2.encoding = THREE.sRGBEncoding; t2.anisotropy = 8;
    return t2;
  }
  function makeVial(liquid, label, labelColor) {
    var v = new THREE.Group();
    var glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .08, metalness: 0, transmission: NVGL.coarse ? 0 : .55, transparent: true, opacity: NVGL.coarse ? .3 : .75, clearcoat: 1, envMap: env, envMapIntensity: 2.2 });
    var pts = [[0, 0], [.16, 0], [.18, .02], [.18, .36], [.12, .44], [.07, .48], [.07, .56], [.09, .58], [.09, .6], [0, .6]].map(function (q) { return new THREE.Vector2(q[0], q[1]); });
    var glassMesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), glassM); glassMesh.renderOrder = 2; glassM.depthWrite = false; v.add(glassMesh);
    var liq = new THREE.Mesh(new THREE.CylinderGeometry(.165, .165, .3, 40), new THREE.MeshPhysicalMaterial({ color: liquid, emissive: liquid, emissiveIntensity: 1.6, roughness: .2, clearcoat: 1, envMap: env }));
    liq.position.y = .17; v.add(liq);
    var cork = new THREE.Mesh(new THREE.CylinderGeometry(.075, .065, .08, 20), new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: .9 }));
    cork.position.y = .63; v.add(cork);
    var lab = new THREE.Mesh(new THREE.CylinderGeometry(.183, .183, .12, 48, 1, true, -Math.PI * .45, Math.PI * .9), new THREE.MeshStandardMaterial({ map: vialLabel(label, labelColor), roughness: .7 }));
    lab.position.y = .2; v.add(lab);
    return v;
  }
  function loadBalance() {
    if (bal || !THREE.GLTFLoader) return;
    bal = true;
    new THREE.GLTFLoader().load(NV.base + "testing/3D_balance_small.glb", function (gltf) {
      var src = null; gltf.scene.traverse(function (o) { if (o.isMesh && !src) src = o; });
      var geo = src.geometry, P = geo.attributes.position, I = geo.index.array;
      var parts = { base: [], beam: [], left: [], right: [] };
      for (var f = 0; f < I.length; f += 3) {
        var a = I[f], b = I[f + 1], c = I[f + 2];
        var cx = (P.getX(a) + P.getX(b) + P.getX(c)) / 3, cy = (P.getY(a) + P.getY(b) + P.getY(c)) / 3;
        var ax2 = Math.abs(cx), isBeam = ax2 > .07 && (cy > .56 || (cy > .46 && ax2 < .58));
        var key = isBeam ? "beam" : (ax2 > .3 && cy > -.33 && cy <= .56 ? (cx < 0 ? "left" : "right") : "base");
        parts[key].push(a, b, c);
      }
      var mat = src.material;
      mat.envMap = env; mat.envMapIntensity = 1.1;
      function part(list) { var g3 = new THREE.BufferGeometry(); for (var k in geo.attributes) g3.setAttribute(k, geo.attributes[k]); g3.setIndex(list); return new THREE.Mesh(g3, mat); }
      var root2 = new THREE.Group();
      var baseM = part(parts.base);
      var beamPivot = new THREE.Group(); beamPivot.position.copy(BAL_PIVOT);
      var beamM = part(parts.beam); beamM.position.copy(BAL_PIVOT).negate(); beamPivot.add(beamM);
      var hangL = new THREE.Group(), hangR = new THREE.Group();
      hangL.add(part(parts.left)); hangR.add(part(parts.right));
      var vA = makeVial(0x3fbf7a, "ANTIDOTE", "#1f6b43"), vV = makeVial(0xd23a2a, "VENOM", "#8a1c12");
      vA.scale.setScalar(.62); vA.position.set(-BAL_HOOK, -.3, 0); hangL.add(vA);
      vV.scale.setScalar(.62); vV.position.set(BAL_HOOK, -.3, 0); hangR.add(vV);
      // weights: a gold "relief" coin for the antidote, dark bronze weights for each harm in the text
      var coinGeo = new THREE.CylinderGeometry(.075, .075, .036, 32);
      var goldM = new THREE.MeshPhysicalMaterial({ color: 0xd6b46a, metalness: .85, roughness: .3, clearcoat: .6, envMap: env, envMapIntensity: 1.4 });
      var bronzeM = new THREE.MeshPhysicalMaterial({ color: 0x4a3226, metalness: .7, roughness: .45, envMap: env, envMapIntensity: 1, emissive: 0x2a0800, emissiveIntensity: .4 });
      var relief = new THREE.Mesh(coinGeo, goldM); relief.userData = { pan: hangL, x: -BAL_HOOK + .14, y: -.3 + .018, at: .04, good: true };
      hangL.add(relief);
      var harms = BAL_HARMS.map(function (w, k) {
        var m = new THREE.Mesh(coinGeo, bronzeM);
        m.userData = { pan: hangR, x: BAL_HOOK + (k % 2 ? .13 : -.13), y: -.3 + .018 + Math.floor(k / 2) * .038, at: .14 + k * .115 };
        hangR.add(m); return m;
      });
      root2.add(baseM, beamPivot, hangL, hangR);
      root2.scale.setScalar(2.5);
      // centre the whole scale on its own bounds so nothing is cropped
      var bb = new THREE.Box3().setFromObject(root2), cy = (bb.min.y + bb.max.y) / 2;
      root2.position.y = -cy; balH = bb.max.y - bb.min.y;
      balG.add(root2);
      bal = { root: root2, pivot: beamPivot, left: hangL, right: hangR, relief: relief, harms: harms };
    });
    var spot = new THREE.SpotLight(0xfff1dc, 2.2, 30, .5, .6, 1.5); spot.position.set(-3, 8, 6); spot.target.position.set(0, 0, 0);
    balG.add(spot); balG.add(spot.target);
    var rimB = new THREE.PointLight(0x9fe3ff, 1.4, 20); rimB.position.set(4, 2, -4); balG.add(rimB);
  }
  function updateBalance(t, dt, s) {
    if (s.v > .001 || (S.voices && S.voices.v > .4)) loadBalance();
    balG.visible = !!(bal && bal.root) && actFade(balG, s, dt) > .01;
    if (!balG.visible) return;
    // reading progress: relief first tips it toward the antidote, then each harm drops into the venom pan
    var p = s.p, landed = 0;
    if (balEl) balEl.setAttribute("data-phase", p < .47 ? "0" : "1");
    function drop(m) {
      var u = m.userData, k = clamp((p - u.at) / .07, 0, 1), fall = 1 - k * k;   // falls under "gravity", lands at k = 1
      m.visible = p > u.at - .005;
      m.position.set(u.x, u.y + fall * 1.4 + Math.sin(k * Math.PI) * .0, 0);
      m.rotation.set(fall * 2.2, 0, fall * 1.3);
      return k >= 1 ? 1 : k * .3;
    }
    var good = drop(bal.relief);
    bal.harms.forEach(function (m) { landed += drop(m); });
    var want = good * .09 - landed * .058 + Math.sin(t * .9) * .006;
    var a = balTilt - want; balVel += (-a * 60 - balVel * 9) * dt; balTilt += balVel * dt;   // damped spring, frame-rate independent
    bal.pivot.rotation.z = balTilt;
    // labels sit beside their weights
    projectQueue.push(function () {
      [bal.relief].concat(bal.harms).forEach(function (m, k) {
        var el = balTags[k]; if (!el) return;
        m.getWorldPosition(projected); projected.project(camera);
        var x = (projected.x + 1) / 2 * innerWidth, y = (1 - projected.y) / 2 * innerHeight;
        // labels hang in a column under their pan, clear of the paragraphs
        var row = k ? (k - 1) : 0, pan = k ? bal.right : bal.left;
        pan.getWorldPosition(tmpPan); tmpPan.x += (k ? 1 : -1) * BAL_HOOK * 2.5; tmpPan.y -= 1.05; tmpPan.project(camera);
        var px = (tmpPan.x + 1) / 2 * innerWidth, py = (1 - tmpPan.y) / 2 * innerHeight;
        var lx = px - el.offsetWidth / 2, ly = py + 18 + row * 24;
        el.style.transform = "translate(" + lx.toFixed(1) + "px," + ly.toFixed(1) + "px)";
        el.classList.toggle("is-on", m.visible && clamp((p - m.userData.at) / .07, 0, 1) > .6 && balG.userData.fade > .5);
      });
    });
    [[bal.left, -BAL_HOOK], [bal.right, BAL_HOOK]].forEach(function (h) {
      var hx = h[1], ry = Math.sin(balTilt) * hx, rx = Math.cos(balTilt) * hx;
      h[0].position.set(rx - hx, ry, 0);
      h[0].rotation.z = Math.sin(t * 1.3 + hx) * .01;
    });
    balG.position.set(0, -.6 + (1 - balG.userData.fade) * -.6, -1.5);
    balG.rotation.y = gl.pointer.sx * .2 + Math.sin(t * .2) * .05;
  }

  /* ======================================================================
     ACT: how might we — a vortex of frost that gathers toward a point.
     ====================================================================== */
  var VX = COARSE ? 1500 : 4000, vpos = new Float32Array(VX * 3), vdat = [];
  for (var q2 = 0; q2 < VX; q2++) vdat.push({ a: rnd() * 6.283, r: 1 + rnd() * 9, y: (rnd() - .5) * 2, s: .2 + rnd() * .8 });
  var vortexG = new THREE.BufferGeometry(); vortexG.setAttribute("position", new THREE.BufferAttribute(vpos, 3));
  var vortex = new THREE.Points(vortexG, new THREE.PointsMaterial({ size: .07, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xa8e6ff }));
  scene.add(vortex);
  var hmwEl = document.getElementById("nh-hmw"), hmwWords = [];
  if (hmwEl) {
    // wrap each word for a reading reveal, keeping the original markup and highlight spans
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (w) { if (!w) return; if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(w)); else { var sp = document.createElement("span"); sp.className = "w"; sp.textContent = w; frag.appendChild(sp); hmwWords.push(sp); } });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) wrap(n);
      });
    })(hmwEl);
  }
  function updateHmw(t, dt, s) {
    vortex.visible = s.f > .01;
    var n = Math.floor(clamp((s.p - .18) / .5, 0, 1) * hmwWords.length);
    hmwWords.forEach(function (w, i) { w.style.opacity = i < n ? 1 : .45; });
    if (!vortex.visible) return;
    var gather = smooth(.3, .9, s.p);
    for (var q = 0; q < VX; q++) {
      var d = vdat[q], a = d.a + t * d.s * .3, rr = d.r * (1 - gather * .85);
      vpos[q * 3] = Math.cos(a) * rr + 3; vpos[q * 3 + 1] = d.y * (1 - gather) + Math.sin(a * 3 + t) * .2; vpos[q * 3 + 2] = Math.sin(a) * rr - 4;
    }
    vortexG.attributes.position.needsUpdate = true;
    vortex.material.opacity = s.f;
  }

  /* ======================================================================
     ACT: solution — staged to the project description:
     A. a hydrogel bead of L. plantarum resting on a psoriatic plaque, releasing peptide
     B. one fusion peptide as an amino-acid bead chain:
        IL-23R antagonist · TACE-cleavable linker (cut site glows) · LKEKK (5) · DRTTLTN (7)
     C. TACE cuts the linker → LKEKK reaches a macrophage → the antagonist docks on IL-23R (D1–D3)
     ====================================================================== */
  var solG = new THREE.Group(); scene.add(solG);
  var tagEls = Array.prototype.slice.call(root.querySelectorAll(".nh-tag")), stepEls = Array.prototype.slice.call(root.querySelectorAll(".nh-step"));
  var solEl = S.solution && S.solution.el, solBar = document.getElementById("nh-sol-bar");
  function capsuleGeo(r, len, seg) { var pts = []; for (var q = 0; q <= 8; q++) { var a = -Math.PI / 2 + q / 8 * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r - len / 2)); } for (q = 0; q <= 8; q++) { var a2 = q / 8 * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a2) * r, Math.sin(a2) * r + len / 2)); } return new THREE.LatheGeometry(pts, seg || 20); }

  /* --- A. plaque slab + hydrogel bead + bacteria --- */
  var sceneA = new THREE.Group(); solG.add(sceneA);
  var plaqueU = { uTime: { value: 0 } };
  var slabGeo = new THREE.PlaneGeometry(9, 6, 180, 120); slabGeo.rotateX(-Math.PI / 2);
  var slab = new THREE.Mesh(slabGeo, new THREE.ShaderMaterial({
    uniforms: plaqueU, extensions: { derivatives: true },
    vertexShader: ["varying vec3 vP; varying float vPl;", NVGL.NOISE,
      "void main(){ vec3 p = position; float r = length(p.xz*vec2(.32,.42)); float pl = smoothstep(1.05, .55, r + snoise(p*1.4)*.18); vPl = pl;",
      " p.y += pl*(.12 + snoise(p*7.)*.035) + snoise(p*2.)*.04; vP = p; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }"].join("\n"),
    fragmentShader: ["varying vec3 vP; varying float vPl;", NVGL.NOISE,
      "void main(){ vec3 N = normalize(cross(dFdx(vP), dFdy(vP)));",
      " vec3 skin = vec3(.55,.36,.28) * (1. + snoise(vP*30.)*.05); vec3 red = vec3(.55,.16,.13);",
      " float flake = smoothstep(.2,.6, snoise(vP*26.)*.5+snoise(vP*70.)*.5) * vPl;",
      " vec3 c = mix(skin, red, vPl); c = mix(c, vec3(.85,.84,.8), flake*.8);",
      " float l = clamp(dot(N, normalize(vec3(-.4,1.,.6)))*.5+.55, 0., 1.);",
      " float fade = 1. - smoothstep(2.6, 4.4, length(vP.xz*vec2(.75,1.)));",
      " gl_FragColor = vec4(c*l*fade, 1.);",
      " #include <tonemapping_fragment>\n #include <encodings_fragment>\n }"].join("\n")
  }));
  slab.position.y = -2.05; sceneA.add(slab);
  var gelU = { uTime: { value: 0 } };
  var beadGeo = new THREE.SphereGeometry(1.75, 96, 64);
  var beadMat = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: .28, metalness: 0, transmission: NVGL.coarse ? 0 : .78, transparent: true, opacity: NVGL.coarse ? .35 : 1, clearcoat: .5, clearcoatRoughness: .35, envMap: env, envMapIntensity: .9, side: THREE.DoubleSide });
  beadMat.onBeforeCompile = function (sh) {
    sh.uniforms.uTime = gelU.uTime;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;\n" + NVGL.NOISE)
      .replace("#include <begin_vertex>", "vec3 transformed = position + normal * snoise(position*1.3 + uTime*.35)*.07;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <dithering_fragment>", "#include <dithering_fragment>\nfloat fr = pow(1. - abs(dot(normalize(normal), normalize(vViewPosition))), 2.); gl_FragColor.rgb += vec3(.5,.8,1.)*fr*.18;");
  };
  var bead = new THREE.Mesh(beadGeo, beadMat); bead.position.y = -.2; bead.scale.y = .86; sceneA.add(bead);
  var bacGeo = capsuleGeo(.075, .34, 16);
  var bacMat = new THREE.MeshPhysicalMaterial({ color: 0xb8c98f, roughness: .62, clearcoat: .15, envMap: env, envMapIntensity: .6 });
  var CH = NVGL.coarse ? 10 : 18, bacs = [], bacteria = new THREE.InstancedMesh(bacGeo, bacMat, CH * 3); var nb = 0;
  for (var c2 = 0; c2 < CH; c2++) {
    var len = 1 + (rnd() * 3 | 0) % 3, cpos = new V3(rnd() - .5, rnd() - .5, rnd() - .5).normalize().multiplyScalar(rnd() * 1.05), axis = new V3(rnd() - .5, rnd() - .5, rnd() - .5).normalize();
    for (var k2 = 0; k2 < len && nb < CH * 3; k2++) bacs.push({ c: cpos, ax: axis, off: (k2 - (len - 1) / 2) * .5, ph: rnd() * 6, id: nb++ });
  }
  bacteria.count = nb; bead.add(bacteria);
  var SEC = NVGL.coarse ? 90 : 180, secPos = new Float32Array(SEC * 3), secDat = [];
  for (var s3 = 0; s3 < SEC; s3++) secDat.push({ from: rnd() * bacs.length | 0, t: rnd(), d: new V3(rnd() - .5, -rnd() * .8 - .2, rnd() - .5).normalize() });
  var secG = new THREE.BufferGeometry(); secG.setAttribute("position", new THREE.BufferAttribute(secPos, 3));
  var secretion = new THREE.Points(secG, new THREE.PointsMaterial({ size: .09, map: NVGL.dotTexture("rgba(255,240,220,1)", "rgba(255,140,90,.6)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sceneA.add(secretion);
  var gelGlow = new THREE.PointLight(0x9fe3ff, 1.2, 8, 2); gelGlow.position.set(0, .2, 0); sceneA.add(gelGlow);

  /* --- B. the fusion peptide as an amino-acid bead chain --- */
  var sceneB = new THREE.Group(); solG.add(sceneB);
  var SEGS = [ { n: 12, col: 0xff6a3d, name: "antagonist" }, { n: 8, col: 0x4fb8ee, name: "linker" }, { n: 5, col: 0x2fd896, name: "lkekk" }, { n: 7, col: 0xffc23d, name: "drttltn" } ];
  var NRES = SEGS.reduce(function (a, g4) { return a + g4.n; }, 0), CUT = 12 + 4; // cleavage between linker residues 4 and 5
  var resGeo = new THREE.SphereGeometry(.17, 24, 16), res = new THREE.InstancedMesh(resGeo, new THREE.MeshStandardMaterial({ roughness: .45, metalness: 0, envMap: env, envMapIntensity: .35 }), NRES);
  var bondGeo = new THREE.CylinderGeometry(.045, .045, 1, 10); bondGeo.translate(0, .5, 0); bondGeo.rotateX(Math.PI / 2);
  var bonds = new THREE.InstancedMesh(bondGeo, new THREE.MeshPhysicalMaterial({ color: 0xcfe2ee, roughness: .3, clearcoat: .6, envMap: env }), NRES - 1);
  var resSeg = [], idx2 = 0, colTmp = new THREE.Color();
  SEGS.forEach(function (g5, si) { for (var q = 0; q < g5.n; q++) { resSeg.push(si); colTmp.setHex(g5.col); res.setColorAt(idx2++, colTmp); } });
  sceneB.add(res); sceneB.add(bonds);
  var cutGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: NVGL.dotTexture("rgba(255,255,255,1)", "rgba(120,220,255,.6)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  cutGlow.scale.set(.9, .9, 1); sceneB.add(cutGlow);
  var resPos = []; for (var r3 = 0; r3 < NRES; r3++) resPos.push(new V3());
  // anchors used for labels
  var anchors = { antagonist: new THREE.Object3D(), linker: new THREE.Object3D(), lkekk: new THREE.Object3D() };
  Object.keys(anchors).forEach(function (k) { sceneB.add(anchors[k]); });
  // TACE: an enzyme with an active-site cleft
  var taceGeo = new THREE.SphereGeometry(.85, 72, 48), tp = taceGeo.attributes.position, tv = new V3();
  for (var q2 = 0; q2 < tp.count; q2++) { tv.fromBufferAttribute(tp, q2); var ang = Math.atan2(tv.y, tv.x); var cleft = Math.max(0, 1 - Math.abs(ang + Math.PI / 2) / .55) * (tv.z > -.4 ? 1 : 0); tv.multiplyScalar(1 + (Math.sin(tv.x * 7) * Math.cos(tv.y * 6) * Math.sin(tv.z * 5)) * .08 - cleft * .45); tp.setXYZ(q2, tv.x, tv.y, tv.z); }
  taceGeo.computeVertexNormals();
  var tace = new THREE.Mesh(taceGeo, new THREE.MeshPhysicalMaterial({ color: 0xffa070, emissive: 0x5a1a06, emissiveIntensity: .5, roughness: .4, clearcoat: .7, envMap: env, flatShading: false }));
  sceneB.add(tace);
  var flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: NVGL.dotTexture("rgba(255,255,255,1)", "rgba(255,180,120,.7)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  flash.scale.set(2.5, 2.5, 1); sceneB.add(flash);

  /* --- C targets: macrophage + IL-23R in a lipid bilayer --- */
  var macro = new THREE.Group(); sceneB.add(macro);
  var macGeo = new THREE.SphereGeometry(1.1, 96, 64), mpp = macGeo.attributes.position, mvv = new V3();
  for (var mq = 0; mq < mpp.count; mq++) { mvv.fromBufferAttribute(mpp, mq); var nn0 = mvv.clone().normalize(); var lobe0 = Math.pow(Math.max(0, Math.sin(nn0.x * 3.1 + 1.) * Math.cos(nn0.y * 2.6) * Math.sin(nn0.z * 2.2 + .5)), 1.5); mvv.multiplyScalar(1 + lobe0 * .45 + Math.sin(nn0.x * 9) * Math.sin(nn0.y * 8) * .02); mpp.setXYZ(mq, mvv.x, mvv.y, mvv.z); }
  macGeo.computeVertexNormals();
  var macro_mem = new THREE.Mesh(macGeo, new THREE.MeshPhysicalMaterial({ color: 0xe2b49c, emissive: 0x3a140c, emissiveIntensity: .25, roughness: .65, clearcoat: .2, envMap: env, envMapIntensity: .6 }));
  macro.add(macro_mem);
  var CYT = 70, cytPos = new Float32Array(CYT * 3), cytDat = [];
  for (var q3 = 0; q3 < CYT; q3++) cytDat.push({ d: new V3(rnd() - .5, rnd() - .5, rnd() - .5).normalize(), t: rnd() });
  var cytG = new THREE.BufferGeometry(); cytG.setAttribute("position", new THREE.BufferAttribute(cytPos, 3));
  var cytos = new THREE.Points(cytG, new THREE.PointsMaterial({ size: .1, map: NVGL.dotTexture("rgba(230,255,250,1)", "rgba(120,240,200,.6)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  macro.add(cytos);
  var receptor = new THREE.Group(); sceneB.add(receptor);
  var recMat = new THREE.MeshPhysicalMaterial({ color: 0xc8d4e0, emissive: 0x1a2632, emissiveIntensity: .4, roughness: .35, clearcoat: .8, envMap: env });
  [[0, .95, .42], [.08, .3, .38], [-.05, -.32, .36]].forEach(function (d) { var lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), recMat); lobe.scale.set(d[2], d[2] * .82, d[2]); lobe.position.set(d[0], d[1], 0); receptor.add(lobe); });
  var tm = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 1.1, 16), recMat); tm.position.y = -1.05; receptor.add(tm);
  var heads = new THREE.InstancedMesh(new THREE.SphereGeometry(.1, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0x9fd8f0, roughness: .3, clearcoat: .5, envMap: env }), 2 * 26 * 14), hi = 0;
  for (var lay = 0; lay < 2; lay++) for (var gx = 0; gx < 26; gx++) for (var gz = 0; gz < 14; gz++) { var mxp = (gx - 12.5) * .14 + (gz % 2) * .1, mzp = (gz - 6.5) * .14; dummy.position.set(mxp, (lay ? -1.3 : -.78) - (mxp * mxp + mzp * mzp) * .1, mzp); dummy.scale.setScalar(.72); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); heads.setMatrixAt(hi++, dummy.matrix); }
  receptor.add(heads);
  var SIG = 60, sigPos = new Float32Array(SIG * 3), sigDat = [];
  for (var q4 = 0; q4 < SIG; q4++) sigDat.push({ t: rnd(), x: (rnd() - .5) * 2.2, z: (rnd() - .5) * 1.4 });
  var sigG = new THREE.BufferGeometry(); sigG.setAttribute("position", new THREE.BufferAttribute(sigPos, 3));
  var signals = new THREE.Points(sigG, new THREE.PointsMaterial({ size: .12, map: NVGL.dotTexture("rgba(255,230,200,1)", "rgba(255,90,40,.6)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  receptor.add(signals);

  function placeTag(el, obj, show) {
    if (!el) return;
    obj.getWorldPosition(projected); projected.y += .55; projected.project(camera);
    el.style.transform = "translate(" + ((projected.x + 1) / 2 * innerWidth - el.offsetWidth / 2).toFixed(1) + "px," + ((1 - projected.y) / 2 * innerHeight - 40).toFixed(1) + "px)";
    el.style.opacity = show ? 1 : 0;
  }
  var taceRest = new V3(), solLook = new V3(), tmpV = new V3(), qa = new THREE.Quaternion(), zAxis = new V3(0, 0, 1);
  function updateSolution(t, dt, s) {
    var p = s.p;
    if (solEl) solEl.setAttribute("data-stage", p < .55 ? "1" : "2");
    var step = p < .55 ? -1 : Math.min(3, Math.floor((p - .55) / .1125));
    stepEls.forEach(function (el, i) { el.classList.toggle("is-active", i === step); });
    if (solBar) solBar.style.transform = "scaleX(" + p.toFixed(4) + ")";
    solG.visible = actFade(solG, s, dt) > .01;
    if (!solG.visible) { tagEls.forEach(function (el) { el.style.opacity = 0; }); return; }
    var wide = innerWidth > 860;
    solG.position.set(wide ? 2.2 : 0, (1 - solG.userData.fade) * -.8, 0);

    // A. bead on the plaque
    var aK = 1 - smooth(.24, .36, p);
    sceneA.visible = aK > .01;
    if (sceneA.visible) {
      gelU.uTime.value = t; plaqueU.uTime.value = t;
      sceneA.scale.setScalar(.9 + aK * .1); sceneA.position.set(0, -(1 - aK) * 2, -(1 - aK) * 4);
      bead.rotation.y = t * .12;
      for (var q = 0; q < bacs.length; q++) {
        var b = bacs[q];
        tmpV.copy(b.c).addScaledVector(b.ax, b.off + Math.sin(t * .8 + b.ph) * .03);
        dummy.position.copy(tmpV); qa.setFromUnitVectors(new V3(0, 1, 0), b.ax); dummy.quaternion.copy(qa);
        dummy.rotateZ(Math.sin(t * .6 + b.ph) * .1); dummy.scale.setScalar(1); dummy.updateMatrix(); bacteria.setMatrixAt(b.id, dummy.matrix);
      }
      bacteria.instanceMatrix.needsUpdate = true;
      for (var q1 = 0; q1 < SEC; q1++) {
        var sd = secDat[q1]; sd.t += dt * .16; if (sd.t > 1) { sd.t = 0; sd.from = rnd() * bacs.length | 0; }
        var src = bacs[sd.from], bx = src.c.x + src.ax.x * src.off, by = src.c.y + src.ax.y * src.off - .2, bz = src.c.z + src.ax.z * src.off;
        secPos[q1 * 3] = bx + sd.d.x * sd.t * 2.6; secPos[q1 * 3 + 1] = by + sd.d.y * sd.t * 2.2; secPos[q1 * 3 + 2] = bz + sd.d.z * sd.t * 2.6;
      }
      secG.attributes.position.needsUpdate = true;
    }

    // B/C. peptide chain
    var bK = smooth(.3, .42, p);
    sceneB.visible = bK > .01;
    var cut = smooth(.66, .72, p), part = smooth(.72, .86, p);
    if (sceneB.visible) {
      sceneB.scale.setScalar(bK);
      sceneB.rotation.y = Math.sin(t * .25) * .18 + gl.pointer.sx * .25; sceneB.rotation.x = gl.pointer.sy * .1;
      // chain path: a soft, breathing coil; after the cut each fragment travels to its target
      var dockM = smooth(.77, .85, p), dockR = smooth(.88, .95, p);
      receptor.position.set(-2.4, -1.9, 0); macro.position.set(2.2, -1.0, -.3);
      var dockL = new V3(receptor.position.x + .1, receptor.position.y + 1.38, .1), dockRt = new V3(macro.position.x - 1.05, macro.position.y + 1.05, .2);
      for (var r = 0; r < NRES; r++) {
        var u = r / (NRES - 1), x = (u - .5) * 5.6;
        var y = .7 + Math.sin(u * 9 + t * .9) * .22 + Math.sin(u * 3.1 - t * .5) * .15;
        var z = Math.cos(u * 9 + t * .9) * .22;
        tmpV.set(x, y, z);
        if (r < CUT) {
          tmpV.x -= cut * .3 + part * .9; tmpV.y += part * .3;
          var refL = (4 / (NRES - 1) - .5) * 5.6 - cut * .3 - part * .9;
          tmpV.x += (dockL.x - refL) * dockR; tmpV.y += (dockL.y - (.7 + part * .3)) * dockR * (1 - Math.abs(r - 4) * .01);
        } else {
          tmpV.x += cut * .3 + part * .9; tmpV.y -= part * .3;
          var refR = (22 / (NRES - 1) - .5) * 5.6 + cut * .3 + part * .9;
          tmpV.x += (dockRt.x - refR) * dockM; tmpV.y += (dockRt.y - (.7 - part * .3)) * dockM;
        }
        resPos[r].copy(tmpV);
        dummy.position.copy(resPos[r]); dummy.rotation.set(0, 0, 0);
        var glow = resSeg[r] === 1 && (r === CUT - 1 || r === CUT) ? 1.25 : 1;
        dummy.scale.setScalar(glow); dummy.updateMatrix(); res.setMatrixAt(r, dummy.matrix);
      }
      res.instanceMatrix.needsUpdate = true;
      for (var r2 = 0; r2 < NRES - 1; r2++) {
        var a = resPos[r2], b2 = resPos[r2 + 1];
        tmpV.subVectors(b2, a); var L = tmpV.length();
        dummy.position.copy(a); qa.setFromUnitVectors(zAxis, tmpV.normalize()); dummy.quaternion.copy(qa);
        dummy.scale.set(1, 1, r2 === CUT - 1 ? L * (1 - cut) : L); dummy.updateMatrix(); bonds.setMatrixAt(r2, dummy.matrix);
      }
      bonds.instanceMatrix.needsUpdate = true;
      cutGlow.position.copy(resPos[CUT - 1]).lerp(resPos[CUT], .5);
      cutGlow.material.opacity = (.55 + Math.sin(t * 5) * .25) * (1 - cut);
      anchors.antagonist.position.copy(resPos[5]); anchors.linker.position.copy(cutGlow.position); anchors.lkekk.position.copy(resPos[22]);
      // TACE approaches, clamps the cut site, then backs away
      var tIn = smooth(.55, .65, p), tOut = smooth(.72, .8, p);
      tace.visible = tIn > .01;
      if (tOut < .01) taceRest.copy(cutGlow.position);
      tace.position.copy(taceRest).add(tmpV.set(tOut * .4, lerp(3, .78, tIn) + tOut * .9, -tOut * .8));
      tace.rotation.set(0, t * .2, 0); tace.scale.setScalar(Math.max(.001, tIn * (1 - tOut * .25)));
      flash.position.copy(cutGlow.position); flash.material.opacity = Math.max(0, 1 - Math.abs(p - .69) / .03) * .9;
      // macrophage receives LKEKK and answers with cytokines
      var mK = smooth(.76, .84, p);
      macro.visible = mK > .01; macro.scale.setScalar(mK);
      macro.rotation.y = t * .15; macro_mem.scale.setScalar(1 + Math.sin(t * 1.2) * .015);
      for (var q6 = 0; q6 < CYT; q6++) { var cd = cytDat[q6]; cd.t += dt * .35; if (cd.t > 1) cd.t = 0; var rr = 1.3 + cd.t * 2.2 * smooth(.8, .88, p); cytPos[q6 * 3] = cd.d.x * rr; cytPos[q6 * 3 + 1] = cd.d.y * rr; cytPos[q6 * 3 + 2] = cd.d.z * rr; }
      cytG.attributes.position.needsUpdate = true; cytos.material.opacity = smooth(.8, .88, p);
      // receptor: the antagonist docks onto D1; downstream signals fade out
      var rK = smooth(.86, .92, p);
      receptor.visible = rK > .01; receptor.scale.setScalar(rK);
      var stop = smooth(.92, .99, p);
      for (var q7 = 0; q7 < SIG; q7++) { var sg = sigDat[q7]; sg.t += dt * .5 * (1 - stop * .6); if (sg.t > 1) sg.t = 0; sigPos[q7 * 3] = sg.x * (1 - sg.t * .3); sigPos[q7 * 3 + 1] = -1.7 - sg.t * 1.6; sigPos[q7 * 3 + 2] = sg.z; }
      sigG.attributes.position.needsUpdate = true; signals.material.opacity = 1 - stop * .7;
    }
    // camera: hold the bead, then the construct, then each target in the order of the text
    // keyframes in the order of the text, blended with overlapping smootherstep windows
    var bx = solG.position.x, shift = wide ? 1 : 0;
    var KEYS = [[0, bx - shift, -.5, 10], [.26, bx - shift, -.5, 10], [.36, bx - shift * .5, .4, 9.2], [.74, bx - shift * .5, .4, 9.2],
      [.81, bx + 2.2 - shift * .9, -.5, 9.2], [.86, bx + 2.2 - shift * .9, -.5, 9.2], [.91, bx - 2.4 + shift * 1.2, -.9, 9.2], [.95, bx - 2.4 + shift * 1.2, -.9, 9.2], [1, bx, -.6, 12.5]];
    var ki = 0; while (ki < KEYS.length - 2 && p > KEYS[ki + 1][0]) ki++;
    var k0 = KEYS[ki], k1 = KEYS[ki + 1], uu = clamp((p - k0[0]) / Math.max(.0001, k1[0] - k0[0]), 0, 1); uu = uu * uu * uu * (uu * (uu * 6 - 15) + 10);
    solLook.set(lerp(k0[1], k1[1], uu), lerp(k0[2], k1[2], uu), 0);
    var solZ = lerp(k0[3], k1[3], uu);
    cams.solution[1].lerp(solLook, REDUCED ? 1 : ease(4, dt));
    cams.solution[0].set(cams.solution[1].x, cams.solution[1].y + 1.1, damp(cams.solution[0].z, solZ, 4, dt));
    screenAnchor.solution.y = innerWidth > 860 ? 0 : (p < .55 ? -.36 : .4);
    projectQueue.push(function () {
      placeTag(tagEls[0], anchors.antagonist, bK > .9 && p < .86);
      placeTag(tagEls[1], anchors.linker, bK > .9 && p < .7);
      placeTag(tagEls[2], anchors.lkekk, bK > .9 && p < .86);
    });
  }

  /* ======================================================================
     ACT: hub — the team's agora map (map_small.glb). Each door matches a landmark:
     arena → Human Practices, people → Engineering cycle, building → Lab, garden → Education.
     ====================================================================== */
  var hubG = new THREE.Group(); scene.add(hubG); hubG.visible = false;
  var map = null, pins = [], hubCards = Array.prototype.slice.call(root.querySelectorAll(".nh-hub-card")), hubHot = -1;
  var LANDMARKS = [[-.145, .04, .36], [.36, .04, .29], [.1, .07, -.46], [-.32, .05, 0]]; // map space (x, y, z)
  function loadMap() {
    if (map || !THREE.GLTFLoader) return;
    map = true;
    new THREE.GLTFLoader().load(NV.base + "testing/map_small.glb", function (g) {
      g.scene.traverse(function (o) { if (o.isMesh) { o.material.envMap = env; o.material.envMapIntensity = .4; } });
      var holder = new THREE.Group(); holder.add(g.scene); holder.scale.setScalar(5.4); holder.rotation.y = -Math.PI / 2;
      hubG.add(holder); map = holder;
      LANDMARKS.forEach(function (L, i) {
        var pin = new THREE.Group(); pin.position.set(L[0], L[1], L[2]);
        var beam = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .28, 8), new THREE.MeshBasicMaterial({ color: 0xffb08f, transparent: true, opacity: .7 })); beam.position.y = .14; pin.add(beam);
        var dotS = new THREE.Sprite(new THREE.SpriteMaterial({ map: NVGL.dotTexture("rgba(255,255,255,1)", "rgba(255,140,90,.7)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        dotS.position.y = .3; dotS.scale.set(.09, .09, 1); pin.add(dotS);
        var hit = new THREE.Mesh(new THREE.SphereGeometry(.075, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = .26; hit.userData.i = i; pin.add(hit);
        pin.userData = { dot: dotS, beam: beam, hit: hit, k: 0 };
        holder.add(pin); pins.push(pin);
      });
    });
    var sun = new THREE.DirectionalLight(0xfff0dc, 1.2); sun.position.set(-4, 8, 5); hubG.add(sun);
  }
  hubCards.forEach(function (el, i) {
    el.addEventListener("pointermove", function (e) { var b = el.getBoundingClientRect(); el.style.setProperty("--mx", (e.clientX - b.left) + "px"); el.style.setProperty("--my", (e.clientY - b.top) + "px"); });
    el.addEventListener("pointerenter", function () { hubHot = i; });
    el.addEventListener("focus", function () { hubHot = i; });
    el.addEventListener("pointerleave", function () { if (hubHot === i) hubHot = -1; });
  });
  var hubRay = new THREE.Raycaster();
  // each pin carries a label naming the page its door opens
  var hubEl = S.hub && S.hub.el, pinTags = hubCards.map(function (card) {
    var el = document.createElement("span"), lab = card.querySelector(".nh-hub-label");
    el.className = "nh-pin-tag"; el.setAttribute("aria-hidden", "true");
    el.innerHTML = "<i>Enter</i>" + (lab ? lab.textContent.trim() : "") + " <b>&#8599;</b>";
    if (hubEl) hubEl.appendChild(el);
    return el;
  });
  // clicking (or tapping) a pin opens its page; ray from the actual click point
  var hubOver = -1;
  window.addEventListener("click", function (e) {
    if (!S.hub || !hubG.visible || (hubG.userData.fade || 0) < .3 || !pins.length || e.target.closest("a, button, .nv-header, .nv-menu")) return;
    hubRay.setFromCamera({ x: e.clientX / innerWidth * 2 - 1, y: -(e.clientY / innerHeight * 2 - 1) }, camera);
    var hit = hubRay.intersectObjects(pins.map(function (p2) { return p2.userData.hit; }), false)[0];
    var i = hit ? hit.object.userData.i : hubOver;
    if (i >= 0 && hubCards[i]) { e.preventDefault(); hubCards[i].click(); }
  });
  function updateHub(t, dt, s) {
    if (s.v > .001 || (S.solution && S.solution.p > .6)) loadMap();
    hubG.visible = !!(map && map.isObject3D) && actFade(hubG, s, dt) > .01;
    if (!hubG.visible) return;
    hubG.position.set(0, -3.6 + (1 - hubG.userData.fade) * -1.2, -1);
    map.rotation.y = -Math.PI / 2 + gl.pointer.sx * .08;
    // hovering a pin lights its door, hovering a door lights its pin
    hubRay.setFromCamera(ndc, camera);
    var over = hubRay.intersectObjects(pins.map(function (p2) { return p2.userData.hit; }), false)[0];
    // a door card drawn over the map wins: pins only answer where nothing else is under the cursor
    if (over && gl.pointer.cx != null) { var under = document.elementFromPoint(gl.pointer.cx, gl.pointer.cy); if (under && under.closest && under.closest(".nh-hub-card, a, button")) over = null; }
    var active = over ? over.object.userData.i : hubHot;
    hubOver = over ? over.object.userData.i : -1;
    if (hubEl) hubEl.style.cursor = over ? "pointer" : "";
    projectQueue.push(function () {
      pins.forEach(function (pin, i) {
        var el = pinTags[i]; if (!el) return;
        pin.userData.dot.getWorldPosition(projected); projected.project(camera);
        var x = (projected.x + 1) / 2 * innerWidth, y = (1 - projected.y) / 2 * innerHeight;
        el.style.transform = "translate(" + (x - el.offsetWidth / 2).toFixed(1) + "px," + (y - el.offsetHeight - 26).toFixed(1) + "px)";
        el.classList.toggle("is-on", i === active && hubG.userData.fade > .5);
      });
    });
    hubCards.forEach(function (el, i) { el.classList.toggle("is-lit", i === active); });
    pins.forEach(function (pin, i) {
      var u = pin.userData; u.k = damp(u.k, i === active ? 1 : 0, 7.5, dt);
      var pulse = 1 + Math.sin(t * 3 + i) * .08;
      u.dot.scale.setScalar((.09 + u.k * .08) * pulse); u.beam.scale.y = 1 + u.k * .6; u.beam.material.opacity = .45 + u.k * .5;
    });
  }

  /* ---------- Camera choreography ---------- */
  var projectQueue = [];
  var cams = {
    hero: [new V3(0, 7.5, 10.5), new V3(0, -1, -1)], clock: [new V3(-.9, 1.2, 13.6), new V3(-.9, .3, 0)], armor: [new V3(0, 5.5, 8.5), new V3(0, -1.2, -.5)],
    types: [new V3(0, .4, 11), new V3(0, .2, 0)], story: [new V3(0, .2, 11), new V3(1.2, -.2, -2)], voices: [new V3(0, 0, 13), new V3(1.5, 0, 0)],
    balance: [new V3(0, .2, 9.5), new V3(0, -.6, -1.5)], hmw: [new V3(0, 2.5, 9), new V3(3, 0, -4)], solution: [new V3(0, .6, 9.5), new V3(innerWidth > 860 ? 1.6 : 0, 0, 0)], hub: [new V3(0, 3.4, 9.5), new V3(0, -2.6, -1)]
  };
  var camPos = new V3(0, 7.5, 10.5), camLook = new V3(0, -1, -1), wantPos = new V3(), wantLook = new V3();
  /* Where each act's subject sits on screen (NDC offset) and how far the camera backs off.
     On phones the 3D gets its own band of the screen so it never sits under the words. */
  var screenAnchor = {}, ANCHOR_COMPACT = { clock: [0, -.4, 1.3], story: [0, .5, 1.5], balance: [0, -.3, 1.55], hub: [0, .48, 1.45], solution: [0, -.36, 1.3], voices: [0, .15, 1.1] };
  Object.keys(S).forEach(function (k) { screenAnchor[k] = { x: 0, y: 0, z: 1 }; });
  function layoutAnchors() {
    var compact = innerWidth <= 860;
    Object.keys(screenAnchor).forEach(function (k) {
      if (k === "types") return;
      var a = compact && ANCHOR_COMPACT[k]; screenAnchor[k].x = a ? a[0] : 0; if (k !== "solution") screenAnchor[k].y = a ? a[1] : 0; screenAnchor[k].z = a ? a[2] : 1;
    });
    cams.solution[1].x = compact ? 0 : 1.6;
    cams.clock[0].x = cams.clock[1].x = compact ? 0 : -.9;
  }
  layoutAnchors(); window.addEventListener("resize", layoutAnchors);
  var anc = { x: 0, y: 0, z: 1 }, ancW = { x: 0, y: 0, z: 1 }, viewOn = false;

  gl.onFrame(function (t, dt) {
    projectQueue.length = 0;
    measure(dt);
    // acts first (they move their camera targets), then the shared camera
    var heroV = S.hero ? S.hero.f : 0, armorK = S.armor ? S.armor.f : 0;
    updateField(t, dt, heroV, armorK);
    if (S.clock) updateClock(t, dt, S.clock);
    if (S.types) updateBody(t, dt, S.types);
    if (S.story) updateStory(t, dt, S.story);
    if (S.voices) updateVoices(t, dt, S.voices);
    if (S.balance) updateBalance(t, dt, S.balance);
    if (S.hmw) updateHmw(t, dt, S.hmw);
    if (S.solution) updateSolution(t, dt, S.solution);
    if (S.hub) updateHub(t, dt, S.hub);
    // weights
    var total = 0; wantPos.set(0, 0, 0); wantLook.set(0, 0, 0); ancW.x = ancW.y = 0; ancW.z = 0;
    tmpA.setRGB(0, 0, 0); tmpB.setRGB(0, 0, 0);
    Object.keys(S).forEach(function (k) {
      var w = S[k].c; if (w <= 0) return; total += w;
      wantPos.addScaledVector(cams[k][0], w); wantLook.addScaledVector(cams[k][1], w);
      var a = screenAnchor[k]; ancW.x += a.x * w; ancW.y += a.y * w; ancW.z += a.z * w;
      var pal = palettes[k]; tmpA.add(new THREE.Color(pal[0]).multiplyScalar(w)); tmpB.add(new THREE.Color(pal[1]).multiplyScalar(w));
    });
    if (total > 0) { wantPos.divideScalar(total); wantLook.divideScalar(total); tmpA.multiplyScalar(1 / total); tmpB.multiplyScalar(1 / total); ancW.x /= total; ancW.y /= total; ancW.z /= total; }
    else { ancW.z = 1; wantPos.copy(cams.hub[0]); wantLook.copy(cams.hub[1]); }
    var ek = REDUCED ? 1 : ease(4.5, dt);
    camPos.lerp(wantPos, ek); camLook.lerp(wantLook, ek);
    anc.x = lerp(anc.x, ancW.x, ek); anc.y = lerp(anc.y, ancW.y, ek); anc.z = lerp(anc.z, ancW.z, ek);
    var par = (1 - (S.types ? S.types.c : 0)) * (COARSE ? 0 : 1);
    wantPos.copy(camPos).sub(camLook).multiplyScalar(anc.z).add(camLook);
    camera.position.set(wantPos.x + gl.pointer.sx * .5 * par, wantPos.y + gl.pointer.sy * .3 * par, wantPos.z);
    camera.lookAt(camLook);
    // shift the projection so the subject lands in its screen band
    var W = innerWidth, Hh = innerHeight;
    if (Math.abs(anc.x) + Math.abs(anc.y) > .002) { camera.setViewOffset(W, Hh, -anc.x * W / 2, anc.y * Hh / 2, W, Hh); viewOn = true; }
    else if (viewOn) { camera.clearViewOffset(); viewOn = false; }
    camera.updateMatrixWorld(true);
    bgU.uA.value.lerp(tmpA, ek); bgU.uB.value.lerp(tmpB, ek);
    bgU.uTime.value = t; bgU.uP.value.set(gl.pointer.sx, gl.pointer.sy);
    // frost drift
    var fa = frostG.attributes.position.array;
    for (var q = 0; q < FROST; q++) { fa[q * 3 + 1] += fsp[q] * dt * .35; if (fa[q * 3 + 1] > 12) fa[q * 3 + 1] = -12; }
    frostG.attributes.position.needsUpdate = true;
    if (projectQueue.length) projectQueue.forEach(function (f) { f(); });
  });

  /* Hero intro: wordmark rises once the loader lifts */
  var wm = root.querySelector(".nh-wordmark img");
  if (wm && !REDUCED) {
    wm.style.opacity = "0"; wm.style.transform = "translateY(40px) scale(.96)"; wm.style.filter += " blur(12px)";
    (window.NV && NV.ready ? NV.ready : Promise.resolve()).then(function () {
      wm.style.transition = "opacity 1.6s var(--nv-ease), transform 1.8s var(--nv-ease), filter 1.6s var(--nv-ease)";
      requestAnimationFrame(function () { wm.style.opacity = ".95"; wm.style.transform = "none"; wm.style.filter = "invert(1) grayscale(1) brightness(1.7)"; });
    });
  }

  if (REDUCED) {
    var queued = false, render = function () { queued = false; measure(); for (var i = 0; i < gl.frames.length; i++) gl.frames[i](3, 1 / 60); renderer.render(scene, camera); };
    invalidate = function () { if (!queued) { queued = true; requestAnimationFrame(render); } };
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);
    render(); setTimeout(invalidate, 1500); setTimeout(invalidate, 4000);
  } else gl.start();
})();
