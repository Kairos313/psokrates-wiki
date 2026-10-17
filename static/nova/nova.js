/* NOVA — global behaviour: loader, cursor, scramble, header clock, menu, grain, sound,
   page transitions, reading layout + contents, reveals and lazy 3D scene loading. */
(function () {
  "use strict";
  var doc = document, html = doc.documentElement, body = doc.body;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var self = doc.currentScript && doc.currentScript.src;
  var BASE = self ? self.replace(/nova\/nova\.js(\?.*)?$/, "") : "static/";
  var NV = window.NV = { reduced: reduced, coarse: coarse, base: BASE };

  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function lstore(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- Scramble text ---------- */
  var GLYPHS = "▖▗▘▙▚▛▜▝▞▟░▒/\\<>_-=+*#%01";
  function scramble(el, dur) {
    var final = el.dataset.text || el.textContent;
    el.dataset.text = final;
    if (reduced) { el.textContent = final; return; }
    var start = performance.now(); dur = dur || 600;
    (function step(now) {
      var p = Math.min((now - start) / dur, 1), n = Math.floor(final.length * p), s = final.slice(0, n);
      for (var i = n; i < final.length; i++) s += final[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = s;
      if (p < 1) requestAnimationFrame(step); else el.textContent = final;
    })(start);
  }
  NV.scramble = scramble;
  doc.querySelectorAll("[data-scramble]").forEach(function (el) {
    var host = el.closest("a, button") || el;
    host.addEventListener("pointerenter", function () { scramble(el, 450); });
  });

  /* ---------- Split titles into characters ---------- */
  function split(el) {
    if (el.dataset.splitDone) return [];
    el.dataset.splitDone = "1";
    var text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    var chars = [];
    text.split(/(\s+)/).forEach(function (word) {
      if (/^\s+$/.test(word)) { el.appendChild(doc.createTextNode(" ")); return; }
      var w = doc.createElement("span"); w.style.display = "inline-block"; w.style.whiteSpace = "nowrap"; w.setAttribute("aria-hidden", "true");
      Array.prototype.forEach.call(word, function (ch) {
        var c = doc.createElement("span"); c.className = "nv-char"; c.textContent = ch; w.appendChild(c); chars.push(c);
      });
      el.appendChild(w);
    });
    return chars;
  }
  NV.split = split;
  function introChars(chars, delay) {
    if (reduced) return;
    chars.forEach(function (c, i) {
      c.style.opacity = "0"; c.style.transform = "translateY(60%) rotateX(-70deg)"; c.style.filter = "blur(8px)";
      c.style.transition = "opacity .8s var(--nv-ease), transform .9s var(--nv-ease), filter .8s var(--nv-ease)";
      c.style.transitionDelay = (delay + Math.min(i * 0.028, 0.38 * i / Math.max(1, chars.length - 1))) + "s";
    });
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      chars.forEach(function (c) { c.style.opacity = "1"; c.style.transform = "none"; c.style.filter = "none"; });
    }); });
  }
  NV.introChars = introChars;

  /* ---------- Loader ---------- */
  var loader = doc.getElementById("nv-loader");
  var ready = new Promise(function (resolve) {
    if (!loader || html.classList.contains("nova-seen") || reduced) { if (loader) loader.remove(); resolve(); return; }
    var count = doc.getElementById("nv-count"), shown = 0, loaded = false, t0 = performance.now();
    var name = loader.querySelector("[data-scramble]");
    if (name) scramble(name, 1200);
    if (doc.readyState === "complete") loaded = true;
    window.addEventListener("load", function () { loaded = true; });
    var last = t0;
    (function tick(now) {
      var dt = Math.min(.1, (now - last) / 1000); last = now;
      var target = loaded ? 100 : Math.min(92, (now - t0) / 22);
      shown += (target - shown) * (1 - Math.exp(-5 * dt)) + (loaded ? 36 * dt : 0);
      if (shown > 100) shown = 100;
      count.textContent = String(Math.floor(shown)).padStart(3, "0");
      if (shown >= 100 && now - t0 > 1400) {
        loader.classList.add("is-done");
        store("nova-seen", "1");
        // reveal what is underneath while the loader is still lifting, so the two motions overlap
        setTimeout(resolve, 450);
        setTimeout(function () { loader.remove(); }, 1200);
      } else requestAnimationFrame(tick);
    })(t0);
  });
  NV.ready = ready;

  /* ---------- Custom pages: promote their own header to a full-screen Nova hero ---------- */
  var customHero = doc.querySelector(".desc-hero, .edu-hero, .eng-hero, .roster-hero");
  var customLayout = !!doc.querySelector(".desc-layout, .edu-layout, .eng-page, .roster-page, .nv-orbit");
  if (customHero) {
    customHero.classList.add("nv-hero", "nv-hero-custom");
    customHero.setAttribute("data-hero", "");
    var cv = doc.createElement("canvas"); cv.className = "nv-hero-canvas"; cv.setAttribute("aria-hidden", "true");
    customHero.insertBefore(cv, customHero.firstChild);
    var inner = doc.createElement("div"); inner.className = "nv-hero-inner";
    Array.prototype.slice.call(customHero.childNodes).forEach(function (n) { if (n !== cv) inner.appendChild(n); });
    customHero.appendChild(inner);
    var h1 = inner.querySelector("h1");
    if (h1) { h1.classList.add("nv-hero-title"); h1.setAttribute("data-split", ""); }
    var meta = doc.createElement("div"); meta.className = "nv-hero-meta"; meta.setAttribute("aria-hidden", "true");
    meta.innerHTML = "<span>iGEM 2026</span><span class=\"nv-scrollcue\">Scroll</span>"; customHero.appendChild(meta);
  }

  /* ---------- Hero title intro ---------- */
  var heroTitle = doc.querySelector(".nv-hero-title[data-split]");
  if (heroTitle) { var hc = split(heroTitle); ready.then(function () { introChars(hc, 0.1); }); }

  /* ---------- Cursor ---------- */
  if (!coarse && !reduced) {
    html.classList.add("nova-cursor-on");
    var cur = doc.createElement("div"); cur.className = "nv-cursor"; cur.setAttribute("aria-hidden", "true");
    cur.innerHTML = '<div class="nv-cursor-ring"><span class="nv-cursor-label"></span></div><div class="nv-cursor-dot"></div>';
    body.appendChild(cur);
    var ring = cur.firstChild, dot = cur.lastChild, label = ring.firstChild;
    var mx = -100, my = -100, rx = mx, ry = my;
    window.addEventListener("pointermove", function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    doc.addEventListener("pointerdown", function () { cur.classList.add("is-down"); });
    doc.addEventListener("pointerup", function () { cur.classList.remove("is-down"); });
    doc.addEventListener("pointerover", function (e) {
      var t = e.target.closest("[data-cursor], a, button, summary, [role=button]");
      var lab = t && t.getAttribute("data-cursor");
      cur.classList.toggle("is-label", !!lab);
      cur.classList.toggle("is-hover", !!t && !lab);
      if (lab) label.textContent = lab;
    });
    doc.addEventListener("pointerleave", function () { mx = my = -100; });
    var lastT = performance.now();
    (function loop(now) {
      var k = 1 - Math.exp(-10.5 * Math.min(.1, ((now || lastT) - lastT) / 1000)); lastT = now || lastT;
      rx += (mx - rx) * k; ry += (my - ry) * k;
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- Magnetic buttons ---------- */
  function magnetic(el, k) {
    if (coarse || reduced) return;
    el.addEventListener("pointermove", function (e) {
      var b = el.getBoundingClientRect();
      el.style.transform = "translate(" + (e.clientX - b.left - b.width / 2) * k + "px," + (e.clientY - b.top - b.height / 2) * k + "px)";
    });
    el.addEventListener("pointerleave", function () { el.style.transition = "transform .6s var(--nv-ease)"; el.style.transform = ""; setTimeout(function () { el.style.transition = ""; }, 600); });
  }
  NV.magnetic = magnetic;
  doc.querySelectorAll(".nv-audio, .nv-menu-btn, [data-magnetic]").forEach(function (el) { magnetic(el, 0.25); });

  /* ---------- Header: scrolled state, clock, frame counter ---------- */
  var header = doc.getElementById("nv-header"), clock = doc.getElementById("nv-clock"), frame = doc.getElementById("nv-frame");
  function tickClock() {
    var d = new Date(Date.now() + (8 * 60 + new Date().getTimezoneOffset()) * 60000);
    if (clock) clock.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) { return String(n).padStart(2, "0"); }).join(":");
  }
  tickClock(); setInterval(tickClock, 1000);

  /* ---------- Menu ---------- */
  var menu = doc.getElementById("nv-menu"), menuBtn = doc.getElementById("nv-menu-btn");
  if (menu && menuBtn) {
    menu.querySelectorAll(".nv-menu-link").forEach(function (a, i) { a.style.setProperty("--i", i); });
    var setMenu = function (open) {
      html.classList.toggle("nv-menu-open", open);
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.querySelector(".nv-menu-btn-label").textContent = open ? "Close" : "Menu";
      if (open) { menu.removeAttribute("hidden"); var first = menu.querySelector("a"); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 400); }
      else setTimeout(function () { if (!html.classList.contains("nv-menu-open")) menu.setAttribute("hidden", ""); }, 900);
    };
    menuBtn.addEventListener("click", function () { setMenu(!html.classList.contains("nv-menu-open")); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && html.classList.contains("nv-menu-open")) { setMenu(false); menuBtn.focus(); } });
    // menu backdrop: drifting ice particles
    var mc = menu.querySelector(".nv-menu-canvas");
    if (mc && !reduced) {
      var mctx = mc.getContext("2d"), pts = [];
      for (var i = 0; i < 140; i++) pts.push({ x: Math.random(), y: Math.random(), z: Math.random(), v: 0.0002 + Math.random() * 0.0006 });
      (function draw() {
        if (html.classList.contains("nv-menu-open")) {
          var w = mc.width = mc.clientWidth * Math.min(devicePixelRatio, 2), h = mc.height = mc.clientHeight * Math.min(devicePixelRatio, 2);
          mctx.clearRect(0, 0, w, h);
          pts.forEach(function (p) {
            p.y -= p.v; if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
            var r = (0.6 + p.z * 1.8) * Math.min(devicePixelRatio, 2);
            mctx.fillStyle = "rgba(168,230,255," + (0.15 + p.z * 0.5) + ")";
            mctx.beginPath(); mctx.arc(p.x * w, p.y * h, r, 0, 6.283); mctx.fill();
          });
        }
        requestAnimationFrame(draw);
      })();
    }
  }

  /* ---------- Active page ---------- */
  function slugOf(href) { try { var p = new URL(href, location.href).pathname.replace(/index\.html$/, "").replace(/\/+$/, ""); return p.split("/").pop() || "home"; } catch (e) { return ""; } }
  var here = slugOf(location.href);
  doc.querySelectorAll(".nv-menu-link").forEach(function (a) { if (slugOf(a.href) === here) a.classList.add("is-current"); });

  /* ---------- Grain: one fine noise tile, jittered with CSS ---------- */
  var grain = doc.getElementById("nv-grain");
  if (grain) {
    var gc = doc.createElement("canvas"); gc.width = gc.height = 180;
    var g = gc.getContext("2d"), id = g.createImageData(180, 180);
    for (var k = 0; k < id.data.length; k += 4) { var v = Math.random() * 255; id.data[k] = id.data[k + 1] = id.data[k + 2] = v; id.data[k + 3] = 255; }
    g.putImageData(id, 0, 0);
    grain.style.backgroundImage = "url(" + gc.toDataURL() + ")";
  }

  /* ---------- Soundtrack (off until the visitor turns it on) ----------
     "Ancient Harp for Study Aid" by KonstantinPazuzuStudio (Jamendo, CC BY 3.0, found via Openverse),
     trimmed to loop and levelled to -20 LUFS. Credited in the footer. */
  var audioBtn = doc.getElementById("nv-audio"), music = null, fadeRaf = 0;
  function fadeTo(target, ms, done) {
    cancelAnimationFrame(fadeRaf);
    var from = music.volume, t0 = performance.now();
    (function step(now) {
      var k = Math.min(1, (now - t0) / ms);
      music.volume = Math.max(0, Math.min(1, from + (target - from) * k));
      if (k < 1) fadeRaf = requestAnimationFrame(step); else if (done) done();
    })(t0);
  }
  function startAudio() {
    if (!music) {
      music = new Audio(BASE + "nova/audio/ancient-harp.mp3");
      music.loop = true; music.preload = "auto"; music.volume = 0;
      NV.audio = { el: music };
    }
    var pr = music.play(); if (pr && pr.catch) pr.catch(function () {});
    fadeTo(.9, 2200);
  }
  function stopAudio() { if (music) fadeTo(0, 700, function () { music.pause(); }); }
  doc.addEventListener("visibilitychange", function () {
    if (!music) return;
    if (doc.hidden) music.pause();
    else if (audioBtn.getAttribute("aria-pressed") === "true") { var pr = music.play(); if (pr && pr.catch) pr.catch(function () {}); }
  });
  NV.blip = function () {};   // no interface sounds: the music is the only audio
  if (audioBtn) {
    var setAudio = function (on) {
      audioBtn.setAttribute("aria-pressed", on ? "true" : "false");
      audioBtn.querySelector(".nv-audio-label").textContent = on ? "Sound on" : "Sound off";
      lstore("nova-audio", on ? "1" : "0");
      if (on) startAudio(); else stopAudio();
    };
    audioBtn.addEventListener("click", function () { setAudio(audioBtn.getAttribute("aria-pressed") !== "true"); });
    if (lstore("nova-audio") === "1") {
      // the visitor had sound on last time, but browsers only allow audio after a gesture:
      // the button keeps showing the true (off) state until the first click or key anywhere else
      var once = function (e) {
        window.removeEventListener("pointerdown", once, true); window.removeEventListener("keydown", once, true);
        if (e && e.target && e.target.closest && e.target.closest("#nv-audio")) return;   // the button's own click decides
        setAudio(true);
      };
      window.addEventListener("pointerdown", once, true); window.addEventListener("keydown", once, true);
    }
    doc.addEventListener("pointerenter", function (e) { if (e.target.closest && e.target.closest(".nv-menu-link, .stoa-pager-link, [data-blip]")) NV.blip(1200 + Math.random() * 400); }, true);
  }

  /* ---------- Page transitions: crystalline shutter ---------- */
  var wipe = doc.getElementById("nv-wipe"), wipeCanvas = doc.getElementById("nv-wipe-canvas"), wipeLabel = doc.getElementById("nv-wipe-label");
  function shards(dir, done) {
    if (!wipe || reduced) { html.classList.remove("nv-arriving"); done && done(); return; }
    var c = wipeCanvas, ctx = c.getContext("2d"), dpr = Math.min(devicePixelRatio, 2);
    var w = c.width = innerWidth * dpr, h = c.height = innerHeight * dpr, cols = 14, t0 = performance.now(), dur = 560, token = (shards.token = (shards.token || 0) + 1);
    wipe.classList.add("is-on", "is-drawing");
    (function draw(now) {
      var p = Math.min((now - t0) / dur, 1);
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < cols; i++) {
        var local = Math.min(1, Math.max(0, p * 1.6 - i / cols * 0.6));
        var e = 1 - Math.pow(1 - local, 3);
        var cover = dir === "in" ? e : 1 - e;
        var x0 = i / cols * w, cw = w / cols + 1, hh = cover * h * 1.15, skew = (i % 2 ? 1 : -1) * 0.06 * h * Math.min(1, cover * 4);
        if (cover <= 0) continue;
        ctx.fillStyle = i % 3 === 0 ? "#0c141d" : "#05070b";
        ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + cw, 0); ctx.lineTo(x0 + cw, hh + skew); ctx.lineTo(x0, hh - skew); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(168,230,255," + (0.25 * cover) + ")"; ctx.lineWidth = dpr; ctx.beginPath(); ctx.moveTo(x0, hh - skew); ctx.lineTo(x0 + cw, hh + skew); ctx.stroke();
      }
      if (token !== shards.token) return;
      if (p < 1) requestAnimationFrame(draw);
      else { wipe.classList.remove("is-drawing"); if (dir === "out") { ctx.clearRect(0, 0, w, h); wipe.classList.remove("is-on"); html.classList.remove("nv-arriving"); } done && done(); }
    })(t0);
  }
  if (store("nova-transition")) { store("nova-transition", ""); try { sessionStorage.removeItem("nova-transition"); } catch (e) {} shards("out"); }
  doc.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank" || a.hasAttribute("download")) return;
    var url; try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    if (/\.(pdf|zip|png|jpe?g|svg|mp4)$/i.test(url.pathname)) return;
    e.preventDefault();
    if (wipeLabel) { wipeLabel.textContent = (a.textContent || "").trim().slice(0, 40) || "Loading"; scramble(wipeLabel, 500); }
    store("nova-transition", "1");
    shards("in", function () { location.href = url.href; });
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted && wipe) { shards.token = (shards.token || 0) + 1; wipe.classList.remove("is-on", "is-drawing"); html.classList.remove("nv-arriving"); } });

  /* ---------- Reading layout + contents for pages with the standard hero ---------- */
  var hero = doc.querySelector(".nv-hero[data-hero]");
  var container = doc.querySelector(".nv-container");
  if (hero && container && !customLayout && !body.classList.contains("nv-no-read")) {
    var main = doc.createElement("div"); main.className = "nv-read-main";
    while (container.firstChild) main.appendChild(container.firstChild);
    var wrap = doc.createElement("div"); wrap.className = "nv-read";
    wrap.appendChild(main); container.appendChild(wrap);
    var heads = Array.prototype.filter.call(main.querySelectorAll("h2"), function (h) { return h.textContent.trim(); });
    if (heads.length >= 2) {
      var used = {};
      var items = heads.map(function (h, i) {
        if (!h.id) { var b = h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "s", id = b, n = 2; while (used[id] || doc.getElementById(id)) id = b + "-" + n++; h.id = id; }
        used[h.id] = 1; return { id: h.id, text: h.textContent.trim(), n: String(i + 1).padStart(2, "0") };
      });
      var mk = function () { var ol = doc.createElement("ol"); items.forEach(function (it) { var li = doc.createElement("li"), a = doc.createElement("a"); a.href = "#" + it.id; a.innerHTML = '<span class="nv-toc-n">' + it.n + "</span><span></span>"; a.lastChild.textContent = it.text; li.appendChild(a); ol.appendChild(li); }); return ol; };
      var aside = doc.createElement("aside"); aside.className = "nv-toc"; aside.setAttribute("aria-label", "On this page");
      aside.innerHTML = '<p class="nv-label">[ On this page ]</p>'; aside.appendChild(mk()); wrap.insertBefore(aside, main);
      var det = doc.createElement("details"); det.className = "nv-toc-mobile"; det.innerHTML = "<summary>On this page</summary>"; det.appendChild(mk()); main.insertBefore(det, main.firstChild);
      var links = aside.querySelectorAll("a");
      var spy = function () { var cur = 0; heads.forEach(function (h, i) { if (h.getBoundingClientRect().top < innerHeight * 0.35) cur = i; }); links.forEach(function (a, i) { a.classList.toggle("is-active", i === cur); }); };
      window.addEventListener("scroll", spy, { passive: true }); spy();
    } else wrap.classList.add("no-toc");
    if (!reduced && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
      Array.prototype.forEach.call(main.children, function (el) { if (el.tagName !== "DETAILS") { el.classList.add("nv-reveal"); io.observe(el); } });
    }
  }

  /* ---------- Generic reveal hook ---------- */
  if (!reduced && "IntersectionObserver" in window) {
    var rio = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); rio.unobserve(e.target); } }); }, { rootMargin: "0px 0px -10% 0px" });
    doc.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("nv-reveal"); rio.observe(el); });
  }

  /* ---------- Footer giant wordmark ---------- */
  var footer = doc.querySelector(".site-footer");
  if (footer) {
    var giant = doc.createElement("span"); giant.className = "nv-footer-giant"; giant.setAttribute("aria-hidden", "true"); giant.textContent = "CUHK-HongKong-SBS";
    footer.appendChild(giant);
  }

  /* ---------- Scroll-spy for the long-read pages' own indexes ---------- */
  var ownIdx = doc.querySelector(".desc-index, .edu-index"), ownLinks = [], ownTargets = [];
  if (ownIdx) ownIdx.querySelectorAll('a[href^="#"]').forEach(function (a) { var t = doc.getElementById(decodeURIComponent(a.getAttribute("href").slice(1))); if (t) { ownLinks.push(a); ownTargets.push(t); } });
  function spyOwn() { if (!ownLinks.length) return; var c = 0; ownTargets.forEach(function (t, i) { if (t.getBoundingClientRect().top < innerHeight * .35) c = i; }); ownLinks.forEach(function (a, i) { a.classList.toggle("is-active", i === c); }); }

  /* ---------- Scroll: header state + frame counter ---------- */
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY || 0;
    if (header) header.classList.toggle("is-scrolled", y > 10);
    if (frame) frame.textContent = String(Math.floor(y / 6)).padStart(4, "0");
    spyOwn();
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Lazy 3D: three.js + page scenes ---------- */
  function load(src, cb) { var s = doc.createElement("script"); s.src = BASE + src; s.async = false; if (cb) s.onload = cb; body.appendChild(s); }
  NV.load = load;
  var scenes = [];
  if (doc.querySelector("[data-nova-home]")) scenes.push("vendor/GLTFLoader.js", "nova/data/home-data.js", "nova/nova-gl.js", "nova/nova-body.js", "nova/nova-home.js");
  else if (hero) scenes.push("vendor/GLTFLoader.js", "nova/nova-gl.js", "nova/nova-hero.js");
  if (doc.querySelector(".eng-lottie")) scenes.push("nova/nova-cycle.js");
  doc.querySelectorAll("[data-nova-scene]").forEach(function (el) { var s = "nova/" + el.getAttribute("data-nova-scene") + ".js"; if (scenes.indexOf("nova/nova-gl.js") < 0) scenes.push("nova/nova-gl.js"); if (scenes.indexOf(s) < 0) scenes.push(s); });
  if (scenes.length) {
    var hasGL = false; try { var tc = doc.createElement("canvas"); hasGL = !!(tc.getContext("webgl") || tc.getContext("experimental-webgl")); } catch (e) {}
    if (hasGL) { var go = function () { scenes.forEach(function (s) { load(s); }); }; if (typeof THREE === "undefined") load("vendor/three.min.js", go); else go(); }
    else { html.classList.add("nv-no-webgl"); if (doc.querySelector("[data-nova-home]")) { load("nova/data/home-data.js", function () { load("nova/nova-home.js"); }); } }
  }
  /* ---------- Greek numerals for section markers: [ 02 ] → [ Β′ ] ---------- */
  var GN = ["", "Α", "Β", "Γ", "Δ", "Ε", "Ϛ", "Ζ", "Η", "Θ", "Ι"];
  doc.querySelectorAll(".nv-label").forEach(function (el) {
    var tn = el.firstChild; if (!tn || tn.nodeType !== 3) return;
    var m = /^\s*\[\s*0?(\d{1,2})\s*\]/.exec(tn.nodeValue); if (!m || !GN[+m[1]]) return;
    var rest = tn.nodeValue.slice(m[0].length), num = doc.createElement("span");
    num.className = "nv-gnum"; num.textContent = GN[+m[1]] + "ʹ"; num.title = m[1];
    tn.nodeValue = rest;
    el.insertBefore(doc.createTextNode("[ "), tn); el.insertBefore(num, tn); el.insertBefore(doc.createTextNode(" ]"), tn);
  });

  /* ---------- Team: statues unveil as they scroll in and turn toward the cursor ---------- */
  var heroes = Array.prototype.slice.call(doc.querySelectorAll(".roster-card"));
  if (heroes.length) {
    if (!reduced && "IntersectionObserver" in window) {
      var unveil = new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target, k = +el.getAttribute("data-k") || 0;
          unveil.unobserve(el);
          setTimeout(function () { el.classList.add("nv-unveiled"); setTimeout(function () { el.classList.remove("nv-unveil", "nv-unveiled"); }, 1300); }, k * 90);
        });
      }, { rootMargin: "0px 0px -8% 0px" });
      heroes.forEach(function (c) {
        var sib = Array.prototype.indexOf.call(c.parentNode.children, c);
        c.setAttribute("data-k", sib % 6); c.classList.add("nv-unveil"); unveil.observe(c);
      });
    }
    if (!coarse) heroes.forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var b = c.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
        c.classList.add("is-tilting");
        c.style.setProperty("--ry", ((x - .5) * 14).toFixed(2) + "deg"); c.style.setProperty("--rx", ((.5 - y) * 10).toFixed(2) + "deg");
        c.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); c.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      });
      c.addEventListener("pointerleave", function () {
        c.classList.remove("is-tilting");
        ["--rx", "--ry"].forEach(function (v) { c.style.setProperty(v, "0deg"); }); c.style.setProperty("--mx", "50%"); c.style.setProperty("--my", "30%");
      });
    });
  }
})();
