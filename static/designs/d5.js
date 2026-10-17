/* Design 5 — Kinetic. Editorial motion + an iridescent noise blob that moves between sections. */
(function () {
  "use strict";
  var body = document.body;
  var canvas = document.getElementById("d5-stage");
  var velocity = 0;

  /* ---------- Typography motion ---------- */
  DZ.cursor();
  DZ.magnetic(".d5-round", 0.3);
  DZ.magnetic(".d5-menu a", 0.4);

  var words = DZ.split(document.getElementById("d5-big"), "words");
  if (!DZ.reduced) {
    gsap.from(".d5-hero .d5-row", { yPercent: 105, rotate: 3, duration: 1.5, ease: "expo.out", stagger: 0.12, delay: 0.1 });
    gsap.from(".d5-meta span, .d5-tagline, .d5-hero .d5-round", { opacity: 0, y: 20, duration: 1, stagger: 0.08, delay: 0.7 });
    gsap.to(words, { opacity: 1, stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: ".d5-manifesto", start: "top 70%", end: "bottom 60%", scrub: true } });
    gsap.from(".d5-stat-n", { yPercent: 100, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: ".d5-stats", start: "top 80%" } });
    gsap.from(".d5-tile", { y: 60, opacity: 0, scale: 0.96, duration: 0.9, ease: "power3.out", stagger: 0.06, scrollTrigger: { trigger: ".d5-bento", start: "top 85%" } });
    gsap.from(".d5-outro .d5-row", { yPercent: 105, duration: 1.2, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: ".d5-outro", start: "top 70%" } });

    // horizontal chapters
    var strip = document.querySelector(".d5-strip");
    var dist = function () { return Math.max(0, strip.scrollWidth - window.innerWidth); };
    var hTween = gsap.to(strip, { x: function () { return -dist(); }, ease: "none",
      scrollTrigger: { trigger: ".d5-chapters-pin", pin: true, start: "top top", end: function () { return "+=" + dist(); }, scrub: 0.6, invalidateOnRefresh: true } });
    gsap.utils.toArray(".d5-card-art").forEach(function (el) {
      gsap.fromTo(el, { backgroundPosition: "0% 0%" }, { backgroundPosition: "30% 20%", ease: "none",
        scrollTrigger: { trigger: el, containerAnimation: hTween, start: "left right", end: "right left", scrub: true } });
    });

    // marquee speed follows scroll velocity; skew follows too
    var rows = gsap.utils.toArray(".d5-marquee-row"), offs = [0, -50];
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: function (s) { velocity = s.getVelocity(); } });
    var skewTo = gsap.quickTo(".d5-card, .d5-stat-n", "skewX", { duration: 0.5, ease: "power3" });
    gsap.ticker.add(function (time, dt) {
      var boost = 1 + Math.min(Math.abs(velocity) / 300, 8);
      var dir = velocity < 0 ? -1 : 1;
      rows.forEach(function (row, i) {
        var sp = (i ? -1 : 1) * 0.0035 * boost * dir * dt;
        offs[i] -= sp;
        if (offs[i] <= -50) offs[i] += 50;
        if (offs[i] > 0) offs[i] -= 50;
        row.style.transform = "translate3d(" + offs[i] + "%,0,0)";
      });
      skewTo(Math.max(-10, Math.min(10, -velocity / 250)));
      velocity *= 0.9;
    });
  } else {
    words.forEach(function (w) { w.style.opacity = 1; });
  }

  document.querySelectorAll(".d5-tile").forEach(function (el) {
    el.addEventListener("pointerenter", function (e) {
      var b = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - b.left) + "px");
      el.style.setProperty("--my", (e.clientY - b.top) + "px");
    });
  });
  document.querySelector(".d5-hero .d5-round").addEventListener("click", function (e) {
    e.preventDefault(); document.getElementById("d5-manifesto").scrollIntoView({ behavior: DZ.reduced ? "auto" : "smooth" });
  });

  if (!DZ.webgl) { canvas.style.display = "none"; return; }

  /* ---------- Iridescent blob ---------- */
  var renderer = DZ.renderer(canvas, { alpha: true });
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.z = 6;

  var uniforms = { uTime: { value: 0 }, uAmp: { value: 0.2 }, uFreq: { value: 1.0 }, uMouse: { value: new THREE.Vector2() } };
  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: [
      "uniform float uTime; uniform float uAmp; uniform float uFreq; uniform vec2 uMouse;",
      "varying vec3 vN; varying vec3 vV; varying float vD;",
      DZ.GLSL_NOISE,
      "float f(vec3 p){ return snoise(p*uFreq + vec3(0., 0., uTime*.35)) + .35*snoise(p*uFreq*2.3 - uTime*.2); }",
      "void main(){",
      "  vec3 p = position;",
      "  float d = f(normalize(p) + vec3(uMouse*.3, 0.));",
      "  vec3 disp = p + normal * d * uAmp;",
      "  // approximate normal from neighbouring samples",
      "  vec3 t = normalize(cross(normal, vec3(0.,1.,.001)));",
      "  vec3 b = normalize(cross(normal, t));",
      "  float e = .02;",
      "  vec3 p1 = (p + t*e); p1 += normalize(p1) * f(normalize(p1) + vec3(uMouse*.3,0.)) * uAmp;",
      "  vec3 p2 = (p + b*e); p2 += normalize(p2) * f(normalize(p2) + vec3(uMouse*.3,0.)) * uAmp;",
      "  vec3 n = normalize(cross(p1 - disp, p2 - disp));",
      "  if (dot(n, normal) < 0.) n = -n;",
      "  vec4 w = modelMatrix * vec4(disp, 1.);",
      "  vN = normalize(mat3(modelMatrix) * n);",
      "  vV = normalize(cameraPosition - w.xyz);",
      "  vD = d;",
      "  gl_Position = projectionMatrix * viewMatrix * w;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vD;",
      "vec3 pal(float t){ return .5 + .5*cos(6.28318*(vec3(1.,1.,1.)*t + vec3(.0,.33,.67))); }",
      "void main(){",
      "  vec3 n = normalize(vN);",
      "  float fr = pow(1. - max(dot(n, vV), 0.), 1.6);",
      "  vec3 film = pal(fr*1.1 + vD*.45 + uTime*.04);",
      "  vec3 base = mix(vec3(1., .32, .12), film, .55 + fr*.45);",
      "  vec3 L = normalize(vec3(-.4, .8, .6));",
      "  float spec = pow(max(dot(reflect(-L, n), vV), 0.), 48.);",
      "  float diff = .55 + .45*max(dot(n, L), 0.);",
      "  vec3 col = base*diff + spec*.9 + fr*.25;",
      "  gl_FragColor = vec4(col, 1.);",
      "}"
    ].join("\n")
  });
  var blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1, DZ.coarse ? 40 : 90), mat);
  scene.add(blob);

  var home = { xf: 0.42, yf: -0.08, s: 1.15 };
  var state = Object.assign({}, home);
  var keys = [
    { el: ".d5-manifesto", xf: 0.78, yf: 0.18, s: 0.6, p: 0 },
    { el: ".d5-index", xf: -0.66, yf: 0.62, s: 0.42, p: 0 },
    { el: ".d5-outro", xf: 0.5, yf: -0.42, s: 0.72, p: 0 }
  ];
  if (!DZ.reduced) {
    keys.forEach(function (k) {
      ScrollTrigger.create({ trigger: k.el, start: "top bottom", end: "top 20%", onUpdate: function (st) { k.p = st.progress; } });
    });
  }
  function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function computeState() {
    var x = home.xf, y = home.yf, sc = home.s;
    keys.forEach(function (k) {
      var e = ease(k.p);
      x += (k.xf - x) * e; y += (k.yf - y) * e; sc += (k.s - sc) * e;
    });
    state.xf += (x - state.xf) * 0.08; state.yf += (y - state.yf) * 0.08; state.s += (sc - state.s) * 0.08;
  }

  var mx = 0, my = 0;
  window.addEventListener("pointermove", function (e) { mx = e.clientX / window.innerWidth - .5; my = e.clientY / window.innerHeight - .5; }, { passive: true });

  var halfH = 1, halfW = 1, mobile = false;
  function layout() {
    mobile = window.innerWidth < 760;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }
  layout();
  function place() {
    var k = mobile ? 0.55 : 1;
    blob.position.set(state.xf * halfW * k, state.yf * halfH, 0);
    blob.scale.setScalar(state.s * (mobile ? 0.75 : 1) * Math.min(1, halfW / 1.6));
  }
  DZ.onResize(function () { layout(); if (DZ.reduced) { place(); renderer.render(scene, camera); } });

  if (DZ.reduced) { place(); renderer.render(scene, camera); return; }

  var amp = 0.2;
  DZ.loop(function (t, dt) {
    uniforms.uTime.value = t;
    var targetAmp = 0.18 + Math.min(Math.abs(velocity) / 5000, 0.3);
    amp += (targetAmp - amp) * Math.min(1, dt * 3);
    uniforms.uAmp.value = amp;
    uniforms.uMouse.value.x += (mx - uniforms.uMouse.value.x) * 0.05;
    uniforms.uMouse.value.y += (my - uniforms.uMouse.value.y) * 0.05;
    computeState();
    place();
    blob.rotation.y += dt * 0.15 + mx * 0.01;
    blob.rotation.x += (my * 0.6 - blob.rotation.x) * 0.04;
    renderer.render(scene, camera);
  });
})();
