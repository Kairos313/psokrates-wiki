/* NOVA — inner-page hero. Aurora fog, frost, and one object that belongs to the page:
   the team's own models (Socrates, book, balance, agora map) or a procedural project
   object (fusion peptide chain, hydrogel bead with bacteria, engineering cycle ring). */
(function () {
  "use strict";
  var hero = document.querySelector(".nv-hero[data-hero]");
  if (!hero || !window.NVGL) return;
  var canvas = hero.querySelector(".nv-hero-canvas");
  var slug = document.body.getAttribute("data-page") || "page";
  var base = (window.NV && NV.base) || "static/";
  var OBJ = {
    description: "peptide", model: "peptide", software: "peptide",
    experiments: "bead", results: "bead",
    engineering: "cycle",
    notebook: "book", contribution: "book",
    "safety-and-security": "balance",
    "human-practices": "map",
    education: "socrates", team: "socrates", members: "socrates"
  };
  var kind = OBJ[slug] || "peptide";
  var warm = /human|education|team|members|notebook|contribution|safety/.test(slug);

  var gl = NVGL.create(canvas, { fov: 34, exposure: 1.1, observe: hero });
  var scene = gl.scene, camera = gl.camera;
  camera.position.set(0, .4, 12);
  var env = NVGL.envTexture(gl.renderer, warm);
  scene.environment = env;

  /* aurora backdrop */
  var fog = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false,
    uniforms: { uTime: { value: 0 }, uA: { value: new THREE.Color(warm ? 0x2a1614 : 0x0d2c44) }, uB: { value: new THREE.Color(warm ? 0xff8a5c : 0x6cc8f0) }, uP: { value: new THREE.Vector2() }, uScroll: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
    fragmentShader: ["uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec2 uP; uniform float uScroll; varying vec2 vUv;", NVGL.NOISE,
      "void main(){ vec2 p = vUv*vec2(2.2,1.2); float n = snoise(vec3(p*1.2 + uP*.15, uTime*.05)); float n2 = snoise(vec3(p*3. - vec2(0., uTime*.04), 3.));",
      " float band = smoothstep(.15,.9, 1. - abs(vUv.y - .62 - n*.18)*2.6); vec3 col = mix(vec3(.012,.018,.03), uA, smoothstep(-.4,1.,n)*.9);",
      " col += uB*band*(.14 + n2*.05)*(1. - uScroll*.8); col *= 1. - smoothstep(.3,1.1,length(vUv - vec2(.5,.55))*1.2)*.7; gl_FragColor = vec4(col,1.); }"].join("\n")
  }));
  fog.renderOrder = -1; fog.frustumCulled = false; scene.add(fog);

  /* frost */
  var seed = 7; for (var i = 0; i < slug.length; i++) seed = (seed * 31 + slug.charCodeAt(i)) % 2147483647;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var P = NVGL.coarse ? 400 : 1000, pos = new Float32Array(P * 3), sp = new Float32Array(P);
  for (var k = 0; k < P; k++) { pos[k * 3] = (rnd() - .5) * 26; pos[k * 3 + 1] = (rnd() - .5) * 16; pos[k * 3 + 2] = (rnd() - .5) * 10; sp[k] = .1 + rnd() * .4; }
  var pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  var dots = new THREE.Points(pg, new THREE.PointsMaterial({ size: .05, map: NVGL.dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: warm ? 0xffd2bf : 0xcdeeff, opacity: .7 }));
  scene.add(dots);

  /* lighting: neutral key, cool fill, narrow rim */
  var key = new THREE.DirectionalLight(0xfff1e0, 1.5); key.position.set(-4, 6, 6); scene.add(key);
  var rim = new THREE.DirectionalLight(warm ? 0xff9a6c : 0x8fd8ff, 1.2); rim.position.set(5, 2, -5); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x9ab4c8, 0x1a1410, .5));

  var holder = new THREE.Group(); scene.add(holder);
  var spinBoost = 0, animate = function () {};

  function glb(file, size, yOff) {
    if (!THREE.GLTFLoader) return;
    new THREE.GLTFLoader().load(base + file, function (g) {
      g.scene.traverse(function (o) { if (o.isMesh) { o.material.envMap = env; o.material.envMapIntensity = .6; } });
      var box = new THREE.Box3().setFromObject(g.scene), s = size / Math.max(box.max.y - box.min.y, box.max.x - box.min.x);
      g.scene.scale.setScalar(s); g.scene.position.y = -((box.min.y + box.max.y) / 2) * s + (yOff || 0);
      holder.add(g.scene);
    });
  }
  function peptide() {
    var SEGS = [[12, 0xff6a3d], [8, 0x4fb8ee], [5, 0x2fd896], [7, 0xffc23d]], N = 32, res = [], g = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ roughness: .45, metalness: 0, envMap: env, envMapIntensity: .35 });
    var geo = new THREE.SphereGeometry(.2, 24, 16), inst = new THREE.InstancedMesh(geo, mat, N), c = new THREE.Color(), idx = 0;
    SEGS.forEach(function (sg) { for (var q = 0; q < sg[0]; q++) { c.setHex(sg[1]); inst.setColorAt(idx++, c); } });
    var bond = new THREE.CylinderGeometry(.05, .05, 1, 8); bond.translate(0, .5, 0); bond.rotateX(Math.PI / 2);
    var bonds = new THREE.InstancedMesh(bond, new THREE.MeshStandardMaterial({ color: 0xcfe2ee, roughness: .4, envMap: env, envMapIntensity: .4 }), N - 1);
    g.add(inst); g.add(bonds); holder.add(g);
    for (var r = 0; r < N; r++) res.push(new THREE.Vector3());
    var d = new THREE.Object3D(), v = new THREE.Vector3(), z = new THREE.Vector3(0, 0, 1);
    animate = function (t) {
      for (var r = 0; r < N; r++) {
        var u = r / (N - 1), a = u * Math.PI * 5 + t * .4;
        res[r].set(Math.cos(a) * 1.4, (u - .5) * 5.2, Math.sin(a) * 1.4 + Math.sin(u * 7 + t) * .2);
        d.position.copy(res[r]); d.rotation.set(0, 0, 0); d.scale.setScalar(1); d.updateMatrix(); inst.setMatrixAt(r, d.matrix);
      }
      for (var b = 0; b < N - 1; b++) { v.subVectors(res[b + 1], res[b]); var L = v.length(); d.position.copy(res[b]); d.quaternion.setFromUnitVectors(z, v.normalize()); d.scale.set(1, 1, L); d.updateMatrix(); bonds.setMatrixAt(b, d.matrix); }
      inst.instanceMatrix.needsUpdate = true; bonds.instanceMatrix.needsUpdate = true;
    };
  }
  function bead() {
    var g = new THREE.Group();
    var gel = new THREE.Mesh(new THREE.SphereGeometry(2, 96, 64), new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: .28, transmission: NVGL.coarse ? 0 : .78, transparent: true, opacity: NVGL.coarse ? .35 : 1, clearcoat: .5, envMap: env, envMapIntensity: .9 }));
    g.add(gel);
    var prof = []; for (var q = 0; q <= 8; q++) { var a = -Math.PI / 2 + q / 8 * Math.PI / 2; prof.push(new THREE.Vector2(Math.cos(a) * .09, Math.sin(a) * .09 - .18)); } for (q = 0; q <= 8; q++) { var a2 = q / 8 * Math.PI / 2; prof.push(new THREE.Vector2(Math.cos(a2) * .09, Math.sin(a2) * .09 + .18)); }
    var rods = new THREE.InstancedMesh(new THREE.LatheGeometry(prof, 16), new THREE.MeshPhysicalMaterial({ color: 0xb8c98f, roughness: .62, envMap: env, envMapIntensity: .6 }), 40), d = new THREE.Object3D(), data = [];
    for (var r = 0; r < 40; r++) data.push({ p: new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).normalize().multiplyScalar(rnd() * 1.4), ax: new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).normalize(), ph: rnd() * 6 });
    g.add(rods); holder.add(g);
    animate = function (t) {
      for (var r = 0; r < 40; r++) { var o = data[r]; d.position.copy(o.p).addScaledVector(o.ax, Math.sin(t * .6 + o.ph) * .04); d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), o.ax); d.updateMatrix(); rods.setMatrixAt(r, d.matrix); }
      rods.instanceMatrix.needsUpdate = true; gel.rotation.y = t * .1;
    };
  }
  function cycle() {
    // four stations of the engineering cycle on a ring, with a light travelling between them
    var g = new THREE.Group(); g.rotation.x = .45; g.scale.setScalar(.72);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, .03, 12, 200), new THREE.MeshStandardMaterial({ color: 0x9fe3ff, emissive: 0x2a5a70, roughness: .3, envMap: env }));
    ring.rotation.x = Math.PI / 2; g.add(ring);
    var stations = [];
    for (var q = 0; q < 4; q++) {
      var a = q / 4 * Math.PI * 2, st = new THREE.Mesh(new THREE.CylinderGeometry(.42, .5, .5, 6), new THREE.MeshPhysicalMaterial({ color: 0xd8e4ec, roughness: .55, clearcoat: .3, envMap: env, envMapIntensity: .6 }));
      st.position.set(Math.cos(a) * 2.4, 0, Math.sin(a) * 2.4); g.add(st); stations.push(st);
    }
    var orb = new THREE.Mesh(new THREE.SphereGeometry(.16, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffb08f }));
    var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: NVGL.dotTexture("rgba(255,240,220,1)", "rgba(255,120,70,.5)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(1.4, 1.4, 1); g.add(orb); g.add(halo); holder.add(g);
    var light = new THREE.PointLight(0xff9a6c, 1.6, 6); g.add(light);
    animate = function (t) {
      var a = t * .5, ph = (a / (Math.PI / 2)) % 4;
      orb.position.set(Math.cos(a) * 2.4, .45, Math.sin(a) * 2.4); halo.position.copy(orb.position); light.position.copy(orb.position);
      stations.forEach(function (st, i) { var near = Math.max(0, 1 - Math.abs(((ph - i + 4) % 4) - .0) * 1.2); st.position.y = near * .25; st.material.emissive = st.material.emissive || new THREE.Color(); st.material.emissive.setRGB(near * .5, near * .2, near * .1); });
      g.rotation.y = t * .08;
    };
  }

  if (kind === "socrates") glb("testing/3D_socrates_small.glb", 5.4, -.2);
  else if (kind === "book") glb("testing/3D_book_small.glb", 4.6);
  else if (kind === "balance") glb("testing/3D_balance_small.glb", 4.8);
  else if (kind === "map") { glb("testing/map_small.glb", 4.6); holder.rotation.x = .5; }
  else if (kind === "bead") bead();
  else if (kind === "cycle") cycle();
  else peptide();

  /* hover: the object answers the cursor with a turn */
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), over = false;
  hero.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
    ray.setFromCamera(ndc, camera);
    var hit = ray.intersectObject(holder, true).length > 0;
    if (hit && !over && window.NV && NV.blip) NV.blip(820);
    over = hit; hero.style.cursor = hit ? "grab" : "";
  });

  var titleEl = hero.querySelector(".nv-hero-title"), baseY = 0;
  gl.onResize = function (w) {
    var long = titleEl && titleEl.textContent.length > 18;
    // phones: the object owns the upper band of the hero, the words sit beneath it
    var h = canvas.clientHeight || innerHeight, upper = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 12 * (1 - 2 * .27);
    holder.position.x = w > 900 ? (long ? 4.9 : 3.6) : 0;
    baseY = w > 900 ? (long ? .9 : .5) : upper;
    holder.scale.setScalar(w > 900 ? (long ? .72 : .92) : Math.min(.5, .5 * (h / 700)));
  };
  gl.onResize(canvas.clientWidth);

  gl.onFrame(function (t, dt) {
    var sc = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / hero.offsetHeight));
    fog.material.uniforms.uTime.value = t; fog.material.uniforms.uScroll.value = sc; fog.material.uniforms.uP.value.set(gl.pointer.sx, gl.pointer.sy);
    spinBoost += ((over ? 1 : 0) - spinBoost) * .05;
    holder.rotation.y += dt * (.12 + spinBoost * .9);
    holder.rotation.z = -gl.pointer.sx * .06;
    holder.position.y = baseY + sc * 2.5 + Math.sin(t * .6) * .08;
    animate(t, dt);
    var arr = pg.attributes.position.array;
    for (var j = 0; j < P; j++) { arr[j * 3 + 1] += sp[j] * dt * .35; if (arr[j * 3 + 1] > 8) arr[j * 3 + 1] = -8; }
    pg.attributes.position.needsUpdate = true;
    camera.position.x = gl.pointer.sx * .5; camera.position.y = .4 + gl.pointer.sy * .3; camera.lookAt(0, 0, 0);
  });
  gl.start();
})();
