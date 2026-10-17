/* NOVA GL — shared three.js toolkit (r128 global THREE). */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;

  var NOISE = [
    "vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}",
    "vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}",
    "float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);",
    "vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;",
    "i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));",
    "float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);",
    "vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);",
    "vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;",
    "vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);",
    "vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;",
    "vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}"
  ].join("\n");

  /* Procedural environment: a dark studio with cool and warm soft boxes, for glassy reflections. */
  function envTexture(renderer, warm) {
    var c = document.createElement("canvas"); c.width = 512; c.height = 256;
    var g = c.getContext("2d");
    var grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, "#1b2a38"); grd.addColorStop(.45, "#070b11"); grd.addColorStop(1, "#020305");
    g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
    function box(x, y, w, h, col, blur) { g.filter = "blur(" + blur + "px)"; g.fillStyle = col; g.fillRect(x, y, w, h); g.filter = "none"; }
    box(60, 40, 120, 60, "#cfeeff", 14);
    box(330, 60, 90, 40, warm ? "#ffb08f" : "#7fd3ff", 16);
    box(0, 118, 512, 6, "#2b4a62", 6);
    box(220, 10, 60, 30, "#ffffff", 10);
    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.encoding = THREE.sRGBEncoding;
    var pm = new THREE.PMREMGenerator(renderer);
    var env = pm.fromEquirectangular(tex).texture;
    tex.dispose(); pm.dispose();
    return env;
  }

  /* Icy crystal: physical glass with a fresnel rim and a faint chromatic edge. */
  function iceMaterial(env, opts) {
    opts = opts || {};
    var m = new THREE.MeshPhysicalMaterial({
      color: opts.color || 0xbfe8ff, metalness: 0, roughness: opts.roughness != null ? opts.roughness : .08,
      transmission: coarse ? 0 : (opts.transmission != null ? opts.transmission : .55), opacity: coarse ? .55 : 1, transparent: true,
      clearcoat: 1, clearcoatRoughness: .08, envMap: env, envMapIntensity: opts.envIntensity || 1.4,
      reflectivity: .6, side: THREE.DoubleSide, flatShading: !!opts.flat
    });
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uRim = { value: new THREE.Color(opts.rim || 0x9fe3ff) };
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uRim;")
        .replace("#include <tonemapping_fragment>", [
          "float fr = pow(1. - abs(dot(normalize(normal), normalize(vViewPosition))), 2.6);",
          "gl_FragColor.rgb += uRim * fr * .45 + vec3(fr*.08, 0., fr*.14);",
          "#include <tonemapping_fragment>"
        ].join("\n"));
    };
    return m;
  }

  /* Crystal geometry: a slightly irregular elongated hexagonal bipyramid. */
  function crystalGeometry(seed) {
    var r = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    var g = new THREE.CylinderGeometry(.32, .38, 1.6, 6, 1, false);
    var p = g.attributes.position, v = new THREE.Vector3();
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (v.y > .7) { v.x *= .25; v.z *= .25; v.y += .35 + r() * .1; }
      if (v.y < -.7) { v.x *= .7; v.z *= .7; }
      v.x += (r() - .5) * .04; v.z += (r() - .5) * .04;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g = g.toNonIndexed(); g.computeVertexNormals();
    return g;
  }

  function dotTexture(inner, outer) {
    var c = document.createElement("canvas"); c.width = c.height = 64;
    var g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, inner || "rgba(255,255,255,1)"); gr.addColorStop(.35, outer || "rgba(168,230,255,.45)"); gr.addColorStop(1, "rgba(168,230,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  /* A renderer bound to a canvas that renders only while on screen. */
  function create(canvas, opts) {
    opts = opts || {};
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !coarse, alpha: !!opts.alpha, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = opts.exposure || 1.1;
    if (!opts.alpha) renderer.setClearColor(opts.clear != null ? opts.clear : 0x05070b, 1);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(opts.fov || 40, 1, .1, 400);
    var api = { renderer: renderer, scene: scene, camera: camera, pointer: { x: 0, y: 0, sx: 0, sy: 0 }, frames: [], visible: true, size: { w: 1, h: 1 } };
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      api.size.w = w; api.size.h = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      if (api.onResize) api.onResize(w, h);
    }
    api.resize = resize;
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;   // no parallax jumps from touch
      api.pointer.x = e.clientX / innerWidth * 2 - 1; api.pointer.y = -(e.clientY / innerHeight * 2 - 1);
      api.pointer.cx = e.clientX; api.pointer.cy = e.clientY;
    }, { passive: true });
    api.onFrame = function (fn) { api.frames.push(fn); };
    var raf = 0, last = performance.now();
    function frame(now) {
      raf = 0;
      if (!api.visible || document.hidden) return;
      var dt = Math.min((now - last) / 1000, .05); last = now;
      var pt = api.pointer, pk = 1 - Math.exp(-3.7 * dt); pt.sx += (pt.x - pt.sx) * pk; pt.sy += (pt.y - pt.sy) * pk;
      for (var i = 0; i < api.frames.length; i++) api.frames[i](now / 1000, dt);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    api.start = function () {
      if (reduced) { for (var i = 0; i < api.frames.length; i++) api.frames[i](3, 0); renderer.render(scene, camera); return; }
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { api.visible = en[0].isIntersecting; if (api.visible) { resize(); api.start(); } }, { rootMargin: "120px 0px" }).observe(opts.observe || canvas);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) api.start(); });
    return api;
  }

  /* Scroll progress of an element through the viewport: 0 when its top meets the viewport bottom, 1 when its bottom meets the top. */
  function progress(el, mode) {
    var r = el.getBoundingClientRect(), vh = innerHeight;
    if (mode === "pin") return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
    return Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
  }

  window.NVGL = { NOISE: NOISE, envTexture: envTexture, iceMaterial: iceMaterial, crystalGeometry: crystalGeometry, dotTexture: dotTexture, create: create, progress: progress, reduced: reduced, coarse: coarse };
})();
