/* NOVA — Human Practices stakeholder orbit. Seven glass nodes circle a glowing core;
   hovering a node (or its name) brings it forward and opens its note. */
(function () {
  "use strict";
  var host = document.querySelector("[data-nova-scene='nova-orbit']");
  if (!host || !window.NVGL) return;
  var canvas = host.querySelector(".nv-orbit-canvas");
  var buttons = Array.prototype.slice.call(host.querySelectorAll(".nv-orbit-list button"));
  var cards = Array.prototype.slice.call(host.querySelectorAll(".nv-orbit-card"));
  var tags = Array.prototype.slice.call(host.querySelectorAll(".nv-orbit-tag"));
  var N = buttons.length;

  var gl = NVGL.create(canvas, { fov: 36, exposure: 1.15, observe: host });
  var scene = gl.scene, camera = gl.camera;
  var env = NVGL.envTexture(gl.renderer, true);
  scene.environment = env;
  camera.position.set(0, 3.2, 15);
  camera.lookAt(0, 0, 0);

  /* backdrop */
  var bgU = { uTime: { value: 0 } };
  var bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false, uniforms: bgU,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
    fragmentShader: ["uniform float uTime; varying vec2 vUv;", NVGL.NOISE,
      "void main(){ float n = snoise(vec3(vUv*2.4, uTime*.04)); vec3 c = mix(vec3(.012,.016,.026), vec3(.16,.07,.06), smoothstep(-.3, 1., n)*.6);",
      " c += vec3(1.,.42,.24)*.08*smoothstep(.7, 0., length(vUv - vec2(.55,.5))); gl_FragColor = vec4(c, 1.); }"].join("\n")
  }));
  bg.frustumCulled = false; bg.renderOrder = -5; scene.add(bg);

  /* core */
  var core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), NVGL.iceMaterial(env, { rim: 0xffb08f, flat: true, transmission: .3 }));
  scene.add(core);
  var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: NVGL.dotTexture("rgba(255,220,190,1)", "rgba(255,120,70,.35)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(7, 7, 1); scene.add(halo);
  var coreLight = new THREE.PointLight(0xff9a6c, 2.4, 20, 2); scene.add(coreLight);
  scene.add(new THREE.AmbientLight(0x223344, .7));
  var key = new THREE.DirectionalLight(0xcfeeff, 1); key.position.set(-5, 8, 6); scene.add(key);

  /* orbit ring + nodes */
  var ring = new THREE.Group(); ring.rotation.x = .32; scene.add(ring);
  var R = 5.2;
  var orbitLine = new THREE.Mesh(new THREE.TorusGeometry(R, .012, 6, 200), new THREE.MeshBasicMaterial({ color: 0x9fe3ff, transparent: true, opacity: .35 }));
  orbitLine.rotation.x = Math.PI / 2; ring.add(orbitLine);
  var nodeMat = NVGL.iceMaterial(env, { rim: 0x9fe3ff, flat: true });
  var nodes = [], beams = [];
  for (var i = 0; i < N; i++) {
    var g = new THREE.Group(), a = i / N * Math.PI * 2;
    g.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
    for (var k = 0; k < 3; k++) {
      var c = new THREE.Mesh(NVGL.crystalGeometry(500 + i * 31 + k * 7), nodeMat);
      c.scale.set(.45, .55 + k * .2, .45); c.rotation.set((k - 1) * .5, k * 2.1, (k - 1) * .3);
      g.add(c);
    }
    g.userData = { a: a, k: 0 };
    ring.add(g); nodes.push(g);
    var beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), g.position.clone()]);
    var beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: 0xffb08f, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
    ring.add(beam); beams.push(beam);
  }
  /* sparks travelling between core and selected node */
  var SP = 120, spos = new Float32Array(SP * 3), sphase = new Float32Array(SP);
  for (var s = 0; s < SP; s++) sphase[s] = Math.random();
  var spG = new THREE.BufferGeometry(); spG.setAttribute("position", new THREE.BufferAttribute(spos, 3));
  var sparks = new THREE.Points(spG, new THREE.PointsMaterial({ size: .12, map: NVGL.dotTexture("rgba(255,240,220,1)", "rgba(255,140,90,.5)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.add(sparks);

  /* selection */
  var sel = 0, ringTarget = 0, ringAngle = 0, userTouched = false, autoT = 0;
  function select(i, byUser) {
    if (byUser) userTouched = true;
    sel = i;
    buttons.forEach(function (b, j) { b.classList.toggle("is-active", j === i); b.setAttribute("aria-pressed", j === i ? "true" : "false"); });
    cards.forEach(function (cd, j) { cd.hidden = j !== i; if (j === i && window.NV && NV.scramble) { var h = cd.querySelector("h3"); NV.scramble(h, 500); } });
    // rotate the ring so the chosen node faces the viewer
    var want = -nodes[i].userData.a, d = want - ringTarget;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    ringTarget += d;
    if (window.NV && NV.blip) NV.blip(600 + i * 110);
  }
  buttons.forEach(function (b, i) {
    b.addEventListener("pointerenter", function () { select(i, true); });
    b.addEventListener("focus", function () { select(i, true); });
    b.addEventListener("click", function () { select(i, true); });
  });
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
    ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObjects(nodes, true);
    if (hits.length) { var n = hits[0].object.parent; var idx = nodes.indexOf(n); if (idx >= 0 && idx !== sel) select(idx, true); canvas.style.cursor = "pointer"; }
    else canvas.style.cursor = "";
  });
  select(0, false);

  var v = new THREE.Vector3();
  gl.onResize = function (w) { ring.position.x = w > 980 ? 2.2 : 0; core.position.x = halo.position.x = coreLight.position.x = ring.position.x; ring.scale.setScalar(w > 980 ? 1 : .72); };
  gl.onResize(canvas.clientWidth);

  gl.onFrame(function (t, dt) {
    bgU.uTime.value = t;
    if (!userTouched) { autoT += dt; if (autoT > 4) { autoT = 0; select((sel + 1) % N, false); } }
    ringAngle += (ringTarget - ringAngle) * Math.min(1, dt * 2.4);
    ring.rotation.y = ringAngle + Math.sin(t * .2) * .05 + gl.pointer.sx * .15;
    ring.rotation.x = .32 - gl.pointer.sy * .08;
    core.rotation.y = t * .3; core.rotation.x = t * .17;
    var pulse = 1 + Math.sin(t * 2) * .04;
    core.scale.setScalar(pulse); halo.material.opacity = .7 + Math.sin(t * 2) * .15;
    nodes.forEach(function (n, i) {
      var on = i === sel ? 1 : 0;
      n.userData.k += (on - n.userData.k) * .1;
      n.scale.setScalar(1 + n.userData.k * .6);
      n.rotation.y = t * (.3 + i * .05);
      n.position.y = Math.sin(t * .8 + i) * .25;
      beams[i].material.opacity = n.userData.k * .7;
      beams[i].geometry.attributes.position.setXYZ(1, n.position.x, n.position.y, n.position.z);
      beams[i].geometry.attributes.position.needsUpdate = true;
      // label
      n.getWorldPosition(v); v.y += 1.3; v.project(camera);
      var tag = tags[i];
      if (tag) {
        var x = (v.x + 1) / 2 * canvas.clientWidth, y = (1 - v.y) / 2 * canvas.clientHeight;
        tag.style.transform = "translate(" + (x - tag.offsetWidth / 2).toFixed(1) + "px," + y.toFixed(1) + "px)";
        tag.style.opacity = (v.z < 1 ? (.35 + n.userData.k * .65) : 0).toFixed(2);
        tag.classList.toggle("is-active", i === sel);
      }
    });
    var target = nodes[sel].position;
    for (var s2 = 0; s2 < SP; s2++) {
      sphase[s2] += dt * .5; if (sphase[s2] > 1) sphase[s2] -= 1;
      var f = sphase[s2], wob = Math.sin(f * 20 + s2) * .08;
      spos[s2 * 3] = target.x * f + wob; spos[s2 * 3 + 1] = target.y * f + Math.cos(f * 17 + s2) * .08; spos[s2 * 3 + 2] = target.z * f;
    }
    spG.attributes.position.needsUpdate = true;
    camera.position.x = gl.pointer.sx * .8; camera.lookAt(ring.position.x * .5, 0, 0);
  });
  gl.start();
})();
