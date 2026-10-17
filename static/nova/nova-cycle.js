/* NOVA — engineering cycle ring. Replaces the original Lottie: reads which phase the
   engineering script is showing (each phase panel's opacity) and draws a live DBTL ring. */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".eng-block").forEach(function (block) {
    var host = block.querySelector(".eng-lottie");
    if (!host) return;
    var phases = Array.prototype.slice.call(block.querySelectorAll(".eng-phase:not([data-phase='intro'])"));
    var intro = block.querySelector(".eng-phase[data-phase='intro']");
    var names = phases.map(function (p) { var h = p.querySelector("h4"); return h ? h.textContent.trim() : ""; });
    var cv = document.createElement("canvas"); cv.className = "nv-cycle"; host.appendChild(cv);
    var ctx = cv.getContext("2d");
    var pos = 0, glow = [0, 0, 0, 0], visible = true, t0 = performance.now();
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { rootMargin: "100px" }).observe(host);

    function opacityOf(el) { if (!el) return 0; var o = parseFloat(el.style.opacity); return isNaN(o) ? (getComputedStyle(el).opacity * 1) : o; }
    function draw(now) {
      requestAnimationFrame(draw);
      if (!visible) return;
      var dpr = Math.min(devicePixelRatio || 1, 2), w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      var t = (now - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2, R = Math.min(w, h) * .34;
      // which phase is on screen
      var ops = phases.map(opacityOf), introOn = opacityOf(intro) > .5, best = 0, sum = 0, acc = 0;
      ops.forEach(function (o, i) { if (o > ops[best]) best = i; sum += o; acc += o * i; });
      var target = introOn || sum < .05 ? -0.5 : acc / Math.max(sum, .0001);
      pos += (target - pos) * (reduced ? 1 : .08);
      // rings
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(190,225,255,.18)";
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * .15);
      ctx.setLineDash([2, 10]); ctx.strokeStyle = "rgba(168,230,255,.25)";
      ctx.beginPath(); ctx.arc(0, 0, R * .72, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      ctx.setLineDash([]);
      // ticks
      for (var k = 0; k < 60; k++) {
        var ta = k / 60 * Math.PI * 2, r1 = R + 8, r2 = R + (k % 15 === 0 ? 18 : 12);
        ctx.strokeStyle = "rgba(190,225,255," + (k % 15 === 0 ? .4 : .12) + ")";
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(ta) * r1, cy + Math.sin(ta) * r1); ctx.lineTo(cx + Math.cos(ta) * r2, cy + Math.sin(ta) * r2); ctx.stroke();
      }
      // comet along the ring up to the current position
      var ang = function (p) { return -Math.PI / 2 + p * Math.PI / 2; };
      if (pos > -0.45) {
        var a1 = ang(pos), a0 = a1 - Math.PI * .7;
        var grad = ctx.createConicGradient ? ctx.createConicGradient(a0, cx, cy) : null;
        if (grad) { grad.addColorStop(0, "rgba(255,106,61,0)"); grad.addColorStop(.35, "rgba(255,140,90,.9)"); grad.addColorStop(.351, "rgba(255,106,61,0)"); ctx.strokeStyle = grad; }
        else ctx.strokeStyle = "rgba(255,140,90,.8)";
        ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
        var hx = cx + Math.cos(a1) * R, hy = cy + Math.sin(a1) * R;
        var hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 26); hg.addColorStop(0, "rgba(255,230,210,1)"); hg.addColorStop(.25, "rgba(255,120,70,.6)"); hg.addColorStop(1, "rgba(255,106,61,0)");
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, 26, 0, Math.PI * 2); ctx.fill();
      }
      // nodes + labels
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      names.forEach(function (n, i) {
        var on = !introOn && i === best && sum > .05 ? 1 : 0;
        glow[i] += (on - glow[i]) * .12;
        var a = ang(i), nx = cx + Math.cos(a) * R, ny = cy + Math.sin(a) * R;
        ctx.fillStyle = "rgba(5,7,11,1)"; ctx.beginPath(); ctx.arc(nx, ny, 9 + glow[i] * 5, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = glow[i] > .5 ? "rgba(255,140,90,1)" : "rgba(190,225,255,.55)"; ctx.stroke();
        if (glow[i] > .02) { ctx.fillStyle = "rgba(255,106,61," + glow[i] + ")"; ctx.beginPath(); ctx.arc(nx, ny, 4 + glow[i] * 2 + Math.sin(t * 6) * glow[i], 0, Math.PI * 2); ctx.fill(); }
        var lx = cx + Math.cos(a) * (R + 40), ly = cy + Math.sin(a) * (R + 40);
        ctx.font = "500 11px ui-monospace, Menlo, monospace";
        ctx.fillStyle = "rgba(232,240,245," + (.4 + glow[i] * .6) + ")";
        ctx.fillText(n.toUpperCase(), lx, ly);
      });
      // centre readout
      ctx.font = "200 " + Math.round(R * .34) + "px NovaSans, Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(232,240,245,.92)";
      var label = introOn || sum < .05 ? (intro && intro.querySelector("h4") ? intro.querySelector("h4").textContent.trim() : "") : names[best];
      if (label.length > 10) ctx.font = "200 " + Math.round(R * .17) + "px NovaSans, Inter, system-ui, sans-serif";
      ctx.fillText(label, cx, cy);
    }
    requestAnimationFrame(draw);
  });
})();
