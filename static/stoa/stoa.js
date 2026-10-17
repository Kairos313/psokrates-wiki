/* STOA — site-wide behaviour: nav state, active links, reading layout + TOC, progress, back-to-top. */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nav = document.getElementById("igem-navbar");

  /* ---------- Lazy 3D scenes: load three.js + a scene script only where a page needs it ---------- */
  var self = document.currentScript && document.currentScript.src;
  var base = self ? self.replace(/stoa\/stoa\.js(\?.*)?$/, "") : "static/";
  var scenes = [
    { test: ".edu-hero", script: "stoa/stoa-cave.js" },
    { test: ".eng-hero", script: "stoa/stoa-tholos.js" }
  ];
  function load(src, cb) {
    var s = document.createElement("script");
    s.src = base + src; s.async = false; s.onload = cb || null;
    document.body.appendChild(s);
  }
  var wanted = scenes.filter(function (sc) { return document.querySelector(sc.test); });
  if (wanted.length) {
    var go = function () { wanted.forEach(function (sc) { load(sc.script); }); };
    if (typeof THREE === "undefined") load("vendor/three.min.js", go); else go();
  }
  var numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];

  /* ---------- Active page in the menu ---------- */
  function clean(path) { return path.replace(/index\.html$/, "").replace(/\/+$/, "").split("/").pop() || "home"; }
  var here = clean(location.pathname);
  if (nav) {
    nav.querySelectorAll("a[href]").forEach(function (a) {
      var target = clean(new URL(a.getAttribute("href"), location.href).pathname);
      if (a.getAttribute("href") === "#" || target !== here) return;
      a.classList.add("is-current");
      a.setAttribute("aria-current", "page");
      var parent = a.closest(".dropdown");
      if (parent) {
        var toggle = parent.querySelector(".igem-nav-link");
        if (toggle) toggle.classList.add("is-current");
      }
    });
  }

  /* ---------- Back to top ---------- */
  var top = document.createElement("button");
  top.type = "button";
  top.className = "stoa-top";
  top.setAttribute("aria-label", "Back to top");
  top.innerHTML = "&uarr;";
  top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }); });
  document.body.appendChild(top);

  /* ---------- Reading layout on pages that use the portico header ---------- */
  var portico = document.querySelector(".stoa-portico");
  var container = portico ? portico.parentNode.querySelector(":scope > .container") : null;
  var progress = null, pillars = [], tocLinks = [];

  if (portico && container) {
    var main = document.createElement("div");
    main.className = "stoa-read-main";
    while (container.firstChild) main.appendChild(container.firstChild);
    container.appendChild(main);
    container.classList.add("stoa-read");

    var heads = Array.prototype.filter.call(main.querySelectorAll("h2"), function (h) { return h.textContent.trim(); });
    if (heads.length >= 2) {
      var used = {};
      var items = heads.map(function (h, i) {
        if (!h.id) {
          var base = h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
          var id = base, n = 2;
          while (used[id] || document.getElementById(id)) id = base + "-" + n++;
          h.id = id;
        }
        used[h.id] = true;
        return { id: h.id, text: h.textContent.trim(), n: numerals[i] || String(i + 1) };
      });
      function list() {
        var ol = document.createElement("ol");
        items.forEach(function (it) {
          var li = document.createElement("li"), a = document.createElement("a");
          a.href = "#" + it.id;
          var num = document.createElement("span"); num.className = "stoa-toc-n"; num.textContent = it.n;
          var txt = document.createElement("span"); txt.textContent = it.text;
          a.appendChild(num); a.appendChild(txt);
          li.appendChild(a); ol.appendChild(li);
        });
        return ol;
      }
      var aside = document.createElement("aside");
      aside.className = "stoa-toc";
      aside.setAttribute("aria-label", "On this page");
      var title = document.createElement("p"); title.className = "stoa-toc-title"; title.textContent = "On this page";
      aside.appendChild(title); aside.appendChild(list());
      container.insertBefore(aside, main);

      var details = document.createElement("details");
      details.className = "stoa-toc-mobile";
      var summary = document.createElement("summary"); summary.textContent = "On this page";
      details.appendChild(summary); details.appendChild(list());
      main.insertBefore(details, main.firstChild);
      details.addEventListener("click", function (e) { if (e.target.closest("a")) details.open = false; });

      tocLinks = Array.prototype.slice.call(aside.querySelectorAll("a"));
      var byId = {};
      tocLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
      if ("IntersectionObserver" in window) {
        var visible = {};
        var spy = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
          var current = null;
          for (var i = 0; i < heads.length; i++) { if (heads[i].getBoundingClientRect().top < window.innerHeight * 0.35) current = heads[i].id; }
          if (!current) current = heads[0].id;
          tocLinks.forEach(function (a) { a.classList.toggle("is-active", a === byId[current]); });
        }, { rootMargin: "0px 0px -60% 0px", threshold: [0, 1] });
        heads.forEach(function (h) { spy.observe(h); });
      }
    } else {
      container.classList.add("no-toc");
    }

    progress = document.createElement("div");
    progress.className = "stoa-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.appendChild(progress);

    pillars = Array.prototype.slice.call(portico.querySelectorAll(".stoa-portico-pillar"));

    if (!reduced && "IntersectionObserver" in window) {
      var blocks = main.querySelectorAll(":scope > *, :scope > .row > [class*='col']");
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -8% 0px" });
      Array.prototype.forEach.call(blocks, function (el) {
        if (el.classList.contains("row") || el.classList.contains("stoa-toc-mobile")) return;
        el.classList.add("stoa-reveal"); io.observe(el);
      });
    }
  }

  /* ---------- Scroll-spy for the team's own side indexes (Description, Education) ---------- */
  var ownIndex = document.querySelector(".desc-index, .edu-index");
  var ownLinks = [], ownTargets = [];
  if (ownIndex) {
    Array.prototype.forEach.call(ownIndex.querySelectorAll('a[href^="#"]'), function (a) {
      var t = document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1)));
      if (t) { ownLinks.push(a); ownTargets.push(t); }
    });
  }
  function spyOwn() {
    if (!ownLinks.length) return;
    var current = 0;
    for (var i = 0; i < ownTargets.length; i++) { if (ownTargets[i].getBoundingClientRect().top < window.innerHeight * 0.35) current = i; }
    ownLinks.forEach(function (a, i) { a.classList.toggle("is-active", i === current); });
  }

  /* ---------- Scroll-driven bits (one rAF per scroll) ---------- */
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle("is-scrolled", y > 8);
    top.classList.toggle("is-visible", y > window.innerHeight * 1.2);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    }
    spyOwn();
    if (pillars.length && !reduced && y < window.innerHeight * 1.2) {
      pillars[0].style.transform = "translate3d(" + (-y * 0.12) + "px," + (y * 0.18) + "px,0)";
      if (pillars[1]) pillars[1].style.transform = "translate3d(" + (y * 0.12) + "px," + (y * 0.18) + "px,0) scaleX(-1)";
    }
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
})();
