/* Shared helpers for the /design-N prototypes. Exposes window.DZ. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;

  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  /* Renderer sized to the window, pixel ratio capped for performance. */
  function renderer(canvas, opts) {
    opts = opts || {};
    var r = new THREE.WebGLRenderer({ canvas: canvas, antialias: !coarse, alpha: !!opts.alpha, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    r.setSize(window.innerWidth, window.innerHeight, false);
    if (opts.clear !== undefined) r.setClearColor(opts.clear, opts.alpha ? 0 : 1);
    r.outputEncoding = THREE.sRGBEncoding;
    return r;
  }

  /* rAF loop that stops while the tab is hidden; fn(time, dt). Returns {stop}. */
  function loop(fn) {
    var running = true, last = performance.now(), id;
    function tick(now) {
      if (!running) return;
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      fn(now / 1000, dt);
      id = requestAnimationFrame(tick);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(id); }
      else if (running) { last = performance.now(); id = requestAnimationFrame(tick); }
    });
    id = requestAnimationFrame(tick);
    return { stop: function () { running = false; cancelAnimationFrame(id); } };
  }

  function onResize(cb) {
    var t;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(cb, 80); });
  }

  /* Wrap text into lines/words/chars spans; keeps text readable for screen readers. */
  function split(el, mode) {
    if (!el || el.dataset.dzSplit) return [];
    el.dataset.dzSplit = "1";
    var text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    var words = text.split(/\s+/);
    var out = [];
    el.textContent = "";
    words.forEach(function (w, i) {
      var word = document.createElement("span");
      word.className = "dz-word";
      word.setAttribute("aria-hidden", "true");
      if (mode === "chars") {
        Array.prototype.forEach.call(w, function (ch) {
          var c = document.createElement("span");
          c.className = "dz-char";
          c.textContent = ch;
          word.appendChild(c);
          out.push(c);
        });
      } else {
        word.textContent = w;
        out.push(word);
      }
      el.appendChild(word);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    return out;
  }

  /* Ring + dot cursor that grows over interactive elements. */
  function cursor(color) {
    if (coarse || reduced) return;
    var ring = document.createElement("div"), dot = document.createElement("div");
    ring.className = "dz-cursor"; dot.className = "dz-cursor-dot";
    if (color) { ring.style.color = color; dot.style.color = color; }
    document.body.appendChild(ring); document.body.appendChild(dot);
    var x = -100, y = -100, rx = x, ry = y;
    window.addEventListener("pointermove", function (e) { x = e.clientX; y = e.clientY; }, { passive: true });
    document.addEventListener("pointerover", function (e) {
      ring.classList.toggle("is-hover", !!e.target.closest("a, button, [data-hover]"));
    });
    loop(function () {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
      dot.style.transform = "translate3d(" + x + "px," + y + "px,0)";
    });
    return { ring: ring, dot: dot };
  }

  /* Elements drift toward the pointer while hovered. */
  function magnetic(selector, strength) {
    if (coarse || reduced) return;
    strength = strength || 0.35;
    document.querySelectorAll(selector).forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var b = el.getBoundingClientRect();
        var dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
        gsap.to(el, { x: dx * strength, y: dy * strength, duration: 0.4, ease: "power3.out" });
      });
      el.addEventListener("pointerleave", function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, .4)" });
      });
    });
  }

  /* Decode-style text reveal. */
  function scramble(el, duration) {
    var final = el.dataset.text || el.textContent;
    el.dataset.text = final;
    if (reduced) { el.textContent = final; return; }
    var glyphs = "!<>-_\\/[]{}—=+*^?#01";
    var start = performance.now();
    duration = (duration || 0.9) * 1000;
    (function step(now) {
      var p = Math.min((now - start) / duration, 1);
      var n = Math.floor(final.length * p);
      var s = final.slice(0, n);
      for (var i = n; i < final.length; i++) s += final[i] === " " ? " " : glyphs[(Math.random() * glyphs.length) | 0];
      el.textContent = s;
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  /* Seeded random so procedural scenes look the same each load. */
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  }

  /* 3D simplex noise (Ashima Arts, MIT) for shaders. */
  var GLSL_NOISE = [
    "vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}",
    "vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}",
    "vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}",
    "vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}",
    "float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);",
    "vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;",
    "vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;",
    "i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));",
    "float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);",
    "vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);",
    "vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;",
    "vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);",
    "vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;",
    "vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;",
    "return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}"
  ].join("\n");

  window.DZ = {
    reduced: reduced, coarse: coarse, webgl: hasWebGL(),
    renderer: renderer, loop: loop, onResize: onResize,
    GLSL_NOISE: GLSL_NOISE,
    split: split, cursor: cursor, magnetic: magnetic, scramble: scramble, rng: rng
  };
})();
