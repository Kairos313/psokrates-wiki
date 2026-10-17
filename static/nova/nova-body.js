/* NOVA — realistic human figure for the "types of psoriasis" section.
   Mesh: Blender Studio "Human Base Meshes" (CC0), realistic male body.
   The figure wears plain athletic shorts and short hair (both done on the mesh itself),
   and a skin shader grows each type's lesions on the matching regions: raised plaques with
   silvery scale and cracks, droplet papules, smooth glossy fold patches, pustules on palms
   and soles, swollen joints and fingers with nail pitting, and whole-body redness with peeling.
   Two lesion slots let one type dissolve while the next one grows. */
(function () {
  "use strict";
  if (typeof THREE === "undefined") return;

  // Region bits (per vertex)
  var R = { SCALP: 1, NAILS: 2, ELBOW_KNEE: 4, LOWBACK: 8, TRUNK_LIMBS: 16, FOLDS: 32, PALMS_SOLES: 64, JOINTS: 128, ALL: 256 };
  // Visual styles understood by the shader
  var STYLE = { PLAQUE: 0, GUTTATE: 1, INVERSE: 2, PUSTULAR: 3, NAIL: 4, ARTHRITIS: 5, ERYTHRO: 6 };
  // Type name → regions + style (names come from the original page's data)
  var RULES = [
    { re: /scalp/i, mask: R.SCALP, style: STYLE.PLAQUE },
    { re: /erythro/i, mask: R.ALL, style: STYLE.ERYTHRO },
    { re: /inverse/i, mask: R.FOLDS, style: STYLE.INVERSE },
    { re: /plaque/i, mask: R.ELBOW_KNEE | R.LOWBACK | R.SCALP, style: STYLE.PLAQUE },
    { re: /guttate/i, mask: R.TRUNK_LIMBS, style: STYLE.GUTTATE },
    { re: /arthritis/i, mask: R.JOINTS | R.NAILS, style: STYLE.ARTHRITIS },
    { re: /pustular/i, mask: R.PALMS_SOLES, style: STYLE.PUSTULAR },
    { re: /nail/i, mask: R.NAILS, style: STYLE.NAIL }
  ];

  var GLSL_UTIL = [
    "vec3 hash3(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453123); }",
    // nearest and second-nearest feature distance, plus a random id for the nearest cell
    "vec3 voro(vec3 x){ vec3 p = floor(x), f = fract(x); float d1 = 8., d2 = 8., id = 0.;",
    "  for(int k=-1;k<=1;k++) for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec3 b = vec3(float(i),float(j),float(k)); vec3 h = hash3(p + b); vec3 r = b - f + h; float d = dot(r,r);",
    "    if (d < d1) { d2 = d1; d1 = d; id = h.x; } else if (d < d2) d2 = d; }",
    "  return vec3(sqrt(d1), sqrt(d2), id); }",
    "float fbm(vec3 p){ float a = .5, s = 0.; for(int i=0;i<4;i++){ s += a*snoise(p); p *= 2.03; a *= .5; } return s; }",
    "float maxc(vec3 v){ return max(v.x, max(v.y, v.z)); }"
  ].join("\n");

  /* Lesion looks. Each returns colour + coverage, and writes height (mm) and roughness.
     w = how strongly this vertex belongs to the type's regions, k = growth 0..1. */
  var GLSL_LESION = [
    "vec4 lesion(float st, float w, float k, vec3 p, vec3 J, vec3 skin, out float hh, out float rr){",
    "  hh = 0.; rr = .5; if (k < .002 || w < .01) return vec4(0.);",
    "  if (st < .5) {",            // plaque: well-demarcated raised red plaque under thick silvery scale
    "    float n = fbm(p*7.)*.8 + snoise(p*23.)*.2;",
    "    float s = w*.95 + n - 1.02 + k*.42;",
    "    float a = smoothstep(0., .03, s);",
    "    float core = smoothstep(.04, .3, s);",
    "    vec3 vo = voro(p*vec3(120.,150.,120.) + fbm(p*40.)*.8);",
    "    float crack = (1. - smoothstep(.0, .05 + .05*vo.z, vo.y - vo.x)) * smoothstep(.1, .5, core);",
    "    float layer = smoothstep(-.35, .35, fbm(p*55.) + core*.8);",
    "    float flake = core * layer * (1. - crack) * (.6 + .4*vo.z) * smoothstep(.2, .7, k);",
    "    vec3 ery = mix(vec3(.52,.09,.07), vec3(.36,.055,.05), core);",
    "    vec3 sil = mix(vec3(.58,.55,.52), vec3(.8,.79,.76), vo.z) * (.85 + .2*snoise(p*300.));",
    "    hh = a*.6 + flake*.55 - crack*.3; rr = mix(.48, .95, flake);",
    "    return vec4(mix(ery, sil, min(1., flake*1.15)), a);",
    "  } else if (st < 1.5) {",    // guttate: scattered drop-like salmon papules with fine scale
    "    vec3 vo = voro(p*30.);",
    "    float pick = step(.3, fract(vo.z*7.31)) * smoothstep(.3, .6, w);",
    "    float rad = (.2 + .22*fract(vo.z*13.7)) * smoothstep(0., .7, k);",
    "    float a = (1. - smoothstep(rad*.72, rad, vo.x)) * pick;",
    "    float c0 = 1. - smoothstep(0., rad*.65, vo.x);",
    "    float fine = smoothstep(.35, .9, snoise(p*420.)*.5 + .5) * c0;",
    "    hh = a*.35 + fine*.15; rr = mix(.55, .85, fine);",
    "    return vec4(mix(vec3(.6,.1,.075), vec3(.66,.6,.55), fine*.5), a);",
    "  } else if (st < 2.5) {",    // inverse: smooth, glossy, sharply bordered red in skin folds, no scale
    "    float s = w + fbm(p*6.)*.3 - 1.05 + k*.62;",
    "    float a = smoothstep(0., .1, s) * .92;",
    "    hh = a*.06; rr = .24;",
    "    return vec4(mix(vec3(.6,.09,.08), vec3(.45,.055,.05), smoothstep(0., .3, s)), a);",
    "  } else if (st < 3.5) {",    // pustular: erythema studded with sterile yellow pustules and older brown spots
    "    float base = smoothstep(.15, .7, w) * smoothstep(0., .4, k);",
    "    vec3 c = mix(vec3(.5,.11,.085), vec3(.42,.15,.08), fbm(p*30.)*.5 + .5);",
    "    vec3 vo = voro(p*140.); float kind = fract(vo.z*9.1);",
    "    float d = vo.x / max(.001, .32*smoothstep(.15, 1., k));",
    "    float pus = (1. - smoothstep(.75, 1., d)) * step(.42, kind) * base;",
    "    float mac = (1. - smoothstep(.55, .95, d)) * step(kind, .18) * base;",
    "    c = mix(c, vec3(.24,.09,.045), mac*.8);",
    "    c = mix(c, mix(vec3(.80,.66,.28), vec3(.93,.87,.62), clamp(1. - d, 0., 1.)), pus);",
    "    hh = pus*sqrt(max(0., 1. - d*d))*.9 + base*.05; rr = mix(.5, .16, pus);",
    "    return vec4(c, base*.92);",
    "  } else if (st < 5.5) {",    // nails / arthritis: swollen flushed joints and fingers, pitted lifted nails
    "    float flush = clamp(J.x*1.3, 0., 1.)*.7 + J.y*.45; if (st < 4.5) flush = 0.;",
    "    vec3 c = vec3(.47,.11,.10);",
    "    float nail = smoothstep(.62, .92, J.z);",
    "    vec3 vo = voro(p*520.);",
    "    float pit = (1. - smoothstep(.12, .22, vo.x)) * step(.5, vo.z) * nail;",
    "    vec3 nc = mix(vec3(.62,.48,.42), vec3(.66,.55,.36), .6);",
    "    float a = max(flush, nail) * smoothstep(0., .6, k);",
    "    c = mix(c, nc, nail); c *= 1. - pit*.55;",
    "    hh = -pit*.12; rr = mix(.45, .3, nail);",
    "    return vec4(c, a);",
    "  }",                          // erythrodermic: near-total redness, a few spared islands, fine peeling
    "  float n = fbm(p*4.)*.5 + .5;",
    "  float spare = smoothstep(.68, .74, fbm(p*3. + 7.)*.5 + .5);",
    "  float a = k * (1. - spare*.9) * w;",
    "  vec3 c = mix(vec3(.54,.1,.075), vec3(.64,.17,.12), n);",
    "  vec3 vo = voro(p*90.); float crack = 1. - smoothstep(0., .07, vo.y - vo.x);",
    "  float peel = smoothstep(.72, .95, vo.z) * (1. - crack) * smoothstep(.4, 1., k) * smoothstep(-.1, .4, fbm(p*12.));",
    "  hh = peel*.25; rr = mix(.45, .8, peel);",
    "  return vec4(mix(c, vec3(.74,.67,.6), peel*.4), a);",
    "}"
  ].join("\n");

  /* Smooth anatomical weights. Landmarks are measured from the mesh, then each vertex gets a
     0..1 weight per region (gaussian falloff), packed into vec3 attributes:
     aW0 = (scalp, nails, elbow/knee), aW1 = (lower back, trunk/limbs, folds), aW2 = (palms/soles, joints, all),
     aX = (hair, shorts, fingers). */
  function computeMasks(geo) {
    var pos = geo.attributes.position, nor = geo.attributes.normal, n = pos.count, i;
    var box = new THREE.Box3().setFromBufferAttribute(pos), H = box.max.y - box.min.y, S = 1.7 / H;
    var zMax = -9, zMin = 9;
    for (i = 0; i < n; i++) { var yy = pos.getY(i) / H; if (yy > .9 && yy < .94 && Math.abs(pos.getX(i)) < .02) { zMax = Math.max(zMax, pos.getZ(i)); zMin = Math.min(zMin, pos.getZ(i)); } }
    var front = Math.abs(zMax) > Math.abs(zMin) ? 1 : -1;
    function P(j) { return new THREE.Vector3(pos.getX(j) * S, pos.getY(j) / H, pos.getZ(j) * front * S); }
    function centroid(test) { var c = new THREE.Vector3(), k = 0; for (var j = 0; j < n; j++) { var p = P(j); if (test(p)) { c.add(p); k++; } } return k ? c.multiplyScalar(1 / k) : null; }
    function centroidN(test) { var c = new THREE.Vector3(), k = 0; for (var j = 0; j < n; j++) { var p = P(j); if (test(p, nor.getY(j))) { c.add(p); k++; } } return k ? c.multiplyScalar(1 / k) : null; }
    var handMinY = 9; for (i = 0; i < n; i++) { var q = P(i); if (Math.abs(q.x) > .26 && q.y > .3 && q.y < .55) handMinY = Math.min(handMinY, q.y); }
    var L = {};
    [-1, 1].forEach(function (sd) {
      var k = sd < 0 ? "L" : "R";
      L["elbow" + k] = centroid(function (p) { return p.x * sd > .14 && p.y > .62 && p.y < .655; });
      L["knee" + k] = centroid(function (p) { return p.x * sd > 0 && p.x * sd < .2 && p.y > .28 && p.y < .31; });
      L["hand" + k] = centroid(function (p) { return p.x * sd > .26 && p.y > .3 && p.y < .5; });
      L["tip" + k] = centroid(function (p) { return p.x * sd > .26 && p.y > .3 && p.y < handMinY + .03; });
      L["wrist" + k] = centroid(function (p) { return p.x * sd > .26 && p.y > .5 && p.y < .53; });
      L["ankle" + k] = centroid(function (p) { return p.x * sd > 0 && p.x * sd < .2 && p.y > .04 && p.y < .06; });
      L["sole" + k] = centroid(function (p) { return p.x * sd > 0 && p.x * sd < .2 && p.y < .015; });
      L["armpit" + k] = centroidN(function (p, ny) { return p.x * sd > .12 && p.x * sd < .22 && p.y > .68 && p.y < .8 && ny < -.3; });
      L["groin" + k] = centroid(function (p) { return p.x * sd > .03 && p.x * sd < .1 && p.y > .48 && p.y < .51; });
      L["chest" + k] = centroidN(function (p, ny) { return p.x * sd > .04 && p.x * sd < .13 && p.y > .64 && p.y < .74 && p.z > .02 && ny < -.2; });
    });
    L.crown = centroid(function (p) { return p.y > .985; });
    L.back = centroid(function (p) { return Math.abs(p.x) < .1 && p.y > .57 && p.y < .62; });
    var W0 = new Float32Array(n * 3), W1 = new Float32Array(n * 3), W2 = new Float32Array(n * 3), X = new Float32Array(n * 3), mask = new Float32Array(n);
    function g(p, c, r) { if (!c) return 0; var d2 = p.distanceToSquared(c); return Math.exp(-d2 / (r * r)); }
    for (i = 0; i < n; i++) {
      var p = P(i), nz = nor.getZ(i) * front, nx = nor.getX(i), ax = Math.abs(p.x), sd = p.x < 0 ? "L" : "R";
      var isHand = ax > .26 && p.y > .3 && p.y < .53;
      var scalp = p.y > .9 ? Math.max(g(p, L.crown, .085), (p.y > .93 && nz < .3 ? .9 : 0) * (p.y > .955 || nz < -.2 ? 1 : .4)) : 0;
      var nails = isHand ? g(p, L["tip" + sd], .035) : 0;
      nails = Math.max(nails, p.y < .03 ? g(p, new THREE.Vector3(p.x, 0, (L["sole" + sd] ? L["sole" + sd].z : 0) + .1), .04) : 0);
      var elbow = g(p, L["elbow" + sd], .085) * ss(.35, -.35, nz);
      var knee = g(p, L["knee" + sd], .09) * ss(-.35, .35, nz);
      var lowback = g(p, L.back, .12) * ss(.15, -.45, nz);
      var trunk = (ax < .19 && p.y > .5 && p.y < .86) || (ax > .14 && p.y > .62 && p.y < .84) || (ax < .2 && p.y > .3 && p.y < .5) ? 1 : 0;
      var folds = Math.max(g(p, L["armpit" + sd], .06), g(p, L["groin" + sd], .065), g(p, L["chest" + sd], .03) * ss(.1, -.4, nor.getY(i)));
      var palms = isHand ? ss(0, -.6, nx * Math.sign(p.x)) * g(p, L["hand" + sd], .07) * 1.4 : 0;
      palms = Math.max(Math.min(1, palms), p.y < .025 ? 1 - p.y / .025 : 0);
      var joints = Math.max(g(p, L["elbow" + sd], .055), g(p, L["knee" + sd], .06), g(p, L["wrist" + sd], .035), g(p, L["ankle" + sd], .04), isHand && p.y > handMinY + .03 && p.y < handMinY + .075 ? .8 : 0);
      // short hair: the hairline sits high at the forehead, above the ears at the sides, low at the nape
      var line = lerp(.952, .965, ss(.2, .7, nz)); line = lerp(line, .905, ss(-.15, -.6, nz));
      var hair = p.y > .88 ? ss(line - .004, line + .006, p.y) : 0;
      // plain athletic shorts from mid-thigh to the waist (hands hang beside them and stay bare)
      var shorts = ax < .235 && !isHand ? ss(.398, .41, p.y) * (1 - ss(.578, .588, p.y)) : 0;
      var fingers = isHand ? ss(handMinY + .065, handMinY + .035, p.y) : 0;
      W0[i * 3] = Math.min(1, scalp); W0[i * 3 + 1] = nails; W0[i * 3 + 2] = Math.max(elbow, knee);
      W1[i * 3] = lowback; W1[i * 3 + 1] = trunk; W1[i * 3 + 2] = folds;
      W2[i * 3] = palms; W2[i * 3 + 1] = joints; W2[i * 3 + 2] = 1;
      X[i * 3] = hair; X[i * 3 + 1] = shorts; X[i * 3 + 2] = fingers;
      var m = 0, vals = [scalp, nails, Math.max(elbow, knee), lowback, trunk, folds, palms, joints];
      vals.forEach(function (v, b) { if (v > .35 && shorts < .5) m |= (1 << b); });
      mask[i] = m | (shorts < .5 ? 256 : 0);
    }
    geo.setAttribute("aW0", new THREE.BufferAttribute(W0, 3));
    geo.setAttribute("aW1", new THREE.BufferAttribute(W1, 3));
    geo.setAttribute("aW2", new THREE.BufferAttribute(W2, 3));
    geo.setAttribute("aX", new THREE.BufferAttribute(X, 3));
    geo.setAttribute("aMask", new THREE.BufferAttribute(mask, 1));
    geo.userData.landmarks = L; geo.userData.scale = S; geo.userData.H = H; geo.userData.front = front;
  }
  function ss(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Under the shorts the anatomy is flattened and smoothed into a plain fabric surface. */
  function dressShorts(geo) {
    var pos = geo.attributes.position, X = geo.attributes.aX, idx = geo.index, n = pos.count, H = geo.userData.H, front = geo.userData.front, i, it;
    // 1) push the groin front back to a smooth panel level with the thighs
    for (i = 0; i < n; i++) {
      var y = pos.getY(i) / H, x = pos.getX(i) / H, z = pos.getZ(i) * front / H;
      if (Math.abs(x) < .05 && y > .42 && y < .555) {
        var zc = .056 + .022 * ss(.42, .55, y), f = ss(.05, .03, Math.abs(x));
        if (z > zc) pos.setZ(i, (zc + (z - zc) * (1 - f * .9)) * H * front);
      }
    }
    // 2) relax the cloth region (Laplacian smoothing weighted by the shorts mask)
    if (idx) {
      var nb = new Array(n); for (i = 0; i < n; i++) nb[i] = [];
      var a = idx.array;
      for (i = 0; i < a.length; i += 3) { var v0 = a[i], v1 = a[i + 1], v2 = a[i + 2]; nb[v0].push(v1, v2); nb[v1].push(v0, v2); nb[v2].push(v0, v1); }
      var P = pos.array, tmp = new Float32Array(P.length);
      for (it = 0; it < 10; it++) {
        tmp.set(P);
        for (i = 0; i < n; i++) {
          var w = X.getY(i); if (w < .01 || !nb[i].length) continue;
          var sx = 0, sy = 0, sz = 0, L = nb[i];
          for (var j = 0; j < L.length; j++) { sx += tmp[L[j] * 3]; sy += tmp[L[j] * 3 + 1]; sz += tmp[L[j] * 3 + 2]; }
          var k = .5 * w;
          P[i * 3] += (sx / L.length - P[i * 3]) * k; P[i * 3 + 1] += (sy / L.length - P[i * 3 + 1]) * k; P[i * 3 + 2] += (sz / L.length - P[i * 3 + 2]) * k;
        }
      }
      pos.needsUpdate = true;
      // fresh normals for the dressed area only (keeps the original seams elsewhere)
      var copy = geo.clone(); copy.computeVertexNormals();
      var cn = copy.attributes.normal, on = geo.attributes.normal;
      for (i = 0; i < n; i++) { var ww = Math.min(1, X.getY(i) * 1.5); if (ww > 0) { var nx = lerp(on.getX(i), cn.getX(i), ww), ny = lerp(on.getY(i), cn.getY(i), ww), nz = lerp(on.getZ(i), cn.getZ(i), ww), l = Math.hypot(nx, ny, nz) || 1; on.setXYZ(i, nx / l, ny / l, nz / l); } }
      on.needsUpdate = true; copy.dispose();
    }
  }

  /* Where each type lives on the body: weighted centre, radius and mean surface normal,
     so the camera can frame it automatically. */
  function regionWeight(geo, rule, i) {
    var m = rule.mask, w0 = geo.attributes.aW0, w1 = geo.attributes.aW1, w2 = geo.attributes.aW2, w = 0;
    var vals = [w0.getX(i), w0.getY(i), w0.getZ(i), w1.getX(i), w1.getY(i), w1.getZ(i), w2.getX(i), w2.getY(i), w2.getZ(i)];
    for (var b = 0; b < 9; b++) if (m & (1 << b)) w = Math.max(w, vals[b]);
    return w * (1 - geo.attributes.aX.getY(i));
  }
  function regionInfo(geo, rule, opts) {
    opts = opts || {};
    geo.userData.regions = geo.userData.regions || {};
    var key = rule.mask + ":" + rule.style + ":" + (opts.key || ""); if (geo.userData.regions[key]) return geo.userData.regions[key];
    var pos = geo.attributes.position, nor = geo.attributes.normal, n = pos.count, c = new THREE.Vector3(), nm = new THREE.Vector3(), sw = 0, i, H = geo.userData.H;
    var ok = function (j) { return regionWeight(geo, rule, j) >= .4 && (!opts.filter || opts.filter(pos.getX(j) / H, pos.getY(j) / H, pos.getZ(j) / H)); };
    for (i = 0; i < n; i++) { if (!ok(i)) continue; var w = regionWeight(geo, rule, i); c.x += pos.getX(i) * w; c.y += pos.getY(i) * w; c.z += pos.getZ(i) * w; nm.x += nor.getX(i) * w; nm.y += nor.getY(i) * w; nm.z += nor.getZ(i) * w; sw += w; }
    if (!sw) return null;
    c.multiplyScalar(1 / sw);
    var r = 0, cnt = 0, d = [];
    for (i = 0; i < n; i++) { if (!ok(i)) continue; d.push(Math.hypot(pos.getX(i) - c.x, pos.getY(i) - c.y, pos.getZ(i) - c.z)); }
    d.sort(function (a, b) { return a - b; }); r = d[Math.floor(d.length * .92)] || .1; cnt = d.length;
    var info = { center: c, radius: r, normal: nm.lengthSq() > 1e-6 ? nm.normalize() : new THREE.Vector3(0, 0, 1), count: cnt };
    geo.userData.regions[key] = info;
    return info;
  }

  function material(opts) {
    var detail = opts && opts.detail != null ? opts.detail : 1;
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uA0: { value: new THREE.Vector3() }, uA1: { value: new THREE.Vector3() }, uA2: { value: new THREE.Vector3() }, uStyleA: { value: 0 }, uKA: { value: 0 },
        uB0: { value: new THREE.Vector3() }, uB1: { value: new THREE.Vector3() }, uB2: { value: new THREE.Vector3() }, uStyleB: { value: 0 }, uKB: { value: 0 },
        uH0: { value: new THREE.Vector3() }, uH1: { value: new THREE.Vector3() }, uH2: { value: new THREE.Vector3() }, uHover: { value: 0 },
        uSkin: { value: new THREE.Color(.40, .235, .16) }, uBump: { value: .0031 }, uDetail: { value: detail }, uFade: { value: 1 }
      },
      vertexShader: [
        "uniform float uStyleA; uniform float uKA; uniform float uStyleB; uniform float uKB;",
        "uniform vec3 uA0; uniform vec3 uA1; uniform vec3 uA2; uniform vec3 uB0; uniform vec3 uB1; uniform vec3 uB2; uniform vec3 uH0; uniform vec3 uH1; uniform vec3 uH2;",
        "attribute vec3 aW0; attribute vec3 aW1; attribute vec3 aW2; attribute vec3 aX;",
        "varying vec3 vObj; varying vec3 vN; varying vec3 vView; varying vec3 vW; varying vec3 vX; varying vec3 vJ;",
        "float mx(vec3 a, vec3 b, vec3 c){ return max(max(max(a.x,a.y),a.z), max(max(max(b.x,b.y),b.z), max(max(c.x,c.y),c.z))); }",
        "float swell(float st, float k){ return (st > 4.5 && st < 5.5) ? k : 0.; }",
        "void main(){",
        "  float wa = mx(aW0*uA0, aW1*uA1, aW2*uA2), wb = mx(aW0*uB0, aW1*uB1, aW2*uB2), wh = mx(aW0*uH0, aW1*uH1, aW2*uH2);",
        "  vW = vec3(wa, wb, wh); vX = aX; vJ = vec3(aW2.y, aX.z, aW0.y);",
        "  float sw = max(swell(uStyleA, uKA), swell(uStyleB, uKB));",
        "  vec3 p = position + normal * (aX.y*.004 + sw*(aW2.y*.004 + aX.z*.0035));",
        "  vObj = position; vec4 mv = modelViewMatrix*vec4(p,1.); vView = -mv.xyz; vN = normalize(normalMatrix*normal);",
        "  gl_Position = projectionMatrix*mv; }"
      ].join("\n"),
      fragmentShader: [
        "uniform float uTime; uniform float uStyleA; uniform float uKA; uniform float uStyleB; uniform float uKB; uniform float uHover;",
        "uniform vec3 uSkin; uniform float uBump; uniform float uDetail; uniform float uFade;",
        "varying vec3 vObj; varying vec3 vN; varying vec3 vView; varying vec3 vW; varying vec3 vX; varying vec3 vJ;",
        NVGL.NOISE, GLSL_UTIL, GLSL_LESION,
        "vec3 bumpN(vec3 surf, vec3 n, float h){ vec3 sx = dFdx(surf), sy = dFdy(surf); vec3 r1 = cross(sy, n), r2 = cross(n, sx); float det = dot(sx, r1);",
        "  vec2 dh = vec2(dFdx(h), dFdy(h)); vec3 grad = sign(det)*(dh.x*r1 + dh.y*r2); return normalize(abs(det)*n - grad); }",
        "float ggx(vec3 N, vec3 H, float r){ float a = r*r, a2 = a*a, d = max(dot(N,H),0.); float q = d*d*(a2 - 1.) + 1.; return a2/(3.14159*q*q); }",
        "void main(){",
        "  if (uFade < .999) { vec2 q = floor(gl_FragCoord.xy); float d = fract(52.9829189*fract(dot(q, vec2(.06711056,.00583715)))); if (d > uFade) discard; }",
        "  vec3 p = vObj, V = normalize(vView), N0 = normalize(vN);",
        "  if (!gl_FrontFacing) N0 = -N0;",
        "  float fw = length(fwidth(p));",
        "  // skin: tone variation, fine relief and pores that fade out with distance (no shimmer)",
        "  float tone = fbm(p*3.)*.5 + .5;",
        "  vec3 col = uSkin * mix(vec3(.94,1.,1.04), vec3(1.07,.95,.9), tone);",
        "  float poreF = 1. - smoothstep(.15, .6, fw*600.);",
        "  float h = (snoise(p*vec3(260.,90.,260.))*.03 - (1. - smoothstep(.0, .35, voro(p*620.).x))*.05) * poreF * uDetail;",
        "  float rough = .52 + .08*snoise(p*40.); float spec = 1.;",
        "  // short hair",
        "  float hair = smoothstep(.1, .9, vX.x + snoise(p*140.)*.22 + snoise(p*520.)*.12);",
        "  float strand = snoise(vec3(p.x*1100., p.y*260., p.z*1100.))*.5 + .5;",
        "  col = mix(col, vec3(.035,.022,.015)*(.6 + .8*strand), hair*.9); rough = mix(rough, .58, hair); h += hair*strand*.06*poreF;",
        "  // lesions: slot A dissolving, slot B growing",
        "  float ha, ra, hb, rb;",
        "  vec4 la = lesion(uStyleA, vW.x, uKA, p, vJ, col, ha, ra);",
        "  vec4 lb = lesion(uStyleB, vW.y, uKB, p, vJ, col, hb, rb);",
        "  float hm = 1. - .35*hair;",
        "  col = mix(col, la.rgb, la.a*hm); rough = mix(rough, ra, la.a); h += ha*la.a;",
        "  col = mix(col, lb.rgb, lb.a*hm); rough = mix(rough, rb, lb.a); h += hb*lb.a;",
        "  // athletic shorts: charcoal knit with a waistband and an ember side stripe",
        "  float cl = step(.01, vX.y) * smoothstep(.4*1.69, .403*1.69, p.y) * (1. - smoothstep(.585*1.69, .588*1.69, p.y));",
        "  if (cl > 0.) {",
        "    float knit = (sin(p.x*1400. + sin(p.y*700.)*.6)*.5 + .5)*(sin(p.y*1400.)*.5 + .5);",
        "    vec3 cc = vec3(.03,.033,.038)*(.85 + .3*knit*poreF);",
        "    float band = smoothstep(.555*1.69, .56*1.69, p.y);",
        "    cc = mix(cc, vec3(.06,.062,.068), band);",
        "    float hem = 1. - smoothstep(.0, .012, p.y - .4*1.69);",
        "    cc *= 1. - hem*.35;",
        "    col = mix(col, cc, cl); rough = mix(rough, .9, cl); spec = mix(spec, .25, cl); h = mix(h, knit*.04*poreF - band*.05, cl);",
        "  }",
        "  vec3 N = bumpN(-vView, N0, h*uBump);",
        "  // lighting in view space: warm key, cool fill, back rim, sky/ground ambient; red-shifted wrap for subsurface",
        "  vec3 Lk = normalize(vec3(-.45,.6,.68)), Lf = normalize(vec3(.75,.05,.55)), Lr = normalize(vec3(.35,.45,-.85));",
        "  vec3 wr = vec3(.5,.28,.22) * (1. - cl);",
        "  vec3 dk = clamp((vec3(dot(N,Lk)) + wr)/(1. + wr), 0., 1.); dk *= dk;",
        "  vec3 df = clamp((vec3(dot(N,Lf)) + wr)/(1. + wr), 0., 1.);",
        "  vec3 amb = mix(vec3(.05,.04,.035), vec3(.13,.15,.19), N.y*.5 + .5);",
        "  vec3 diff = col*(dk*vec3(1.6,1.5,1.38) + df*vec3(.28,.33,.42) + amb);",
        "  float fres = .028 + .972*pow(1. - max(dot(N,V),0.), 5.);",
        "  vec3 Hk = normalize(Lk + V); float nlk = max(dot(N,Lk), 0.);",
        "  float sp = (ggx(N, Hk, clamp(rough, .08, 1.))*.85 + ggx(N, Hk, clamp(rough*.55, .06, 1.))*.15) * fres * nlk * spec;",
        "  float rim = pow(1. - max(dot(N,V),0.), 2.6) * smoothstep(-.2, .6, dot(N, Lr));",
        "  vec3 lit = diff + vec3(1.,.95,.9)*sp*1.4 + vec3(.55,.75,1.)*rim*.5*(1. - .6*cl) + col*vec3(.9,.2,.12)*(1. - dk.g)*dk.r*.18;",
        "  // hover: a cool scan sweeps the region under the cursor",
        "  float scan = smoothstep(.96, 1., sin(p.y*90. - uTime*4.)*.5 + .5);",
        "  float hw = smoothstep(.3, .8, vW.z) * uHover * (1. - cl);",
        "  lit += vec3(.3,.65,1.)*hw*(.035 + .08*scan + .22*pow(1. - max(dot(N,V),0.), 2.5));",
        "  gl_FragColor = vec4(lit, 1.);",
        "  #include <tonemapping_fragment>",
        "  #include <encodings_fragment>",
        "}"
      ].join("\n"),
      extensions: { derivatives: true }
    });
  }

  function bits(rule) { var m = rule ? rule.mask : 0; return function (b) { return m & (1 << b) ? 1 : 0; }; }
  function setMask(v0, v1, v2, rule) { var bit = bits(rule); v0.set(bit(0), bit(1), bit(2)); v1.set(bit(3), bit(4), bit(5)); v2.set(bit(6), bit(7), bit(8)); }

  window.NovaBody = {
    rules: RULES,
    REGIONS: R,
    load: function (url, opts, cb) {
      new THREE.GLTFLoader().load(url, function (g) {
        var mesh = null;
        g.scene.traverse(function (o) { if (o.isMesh && !mesh) mesh = o; });
        var geo = mesh.geometry;
        geo.computeBoundingBox();
        var bb = geo.boundingBox, cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
        geo.translate(-cx, -bb.min.y, -cz);
        if (!geo.attributes.normal) geo.computeVertexNormals();
        computeMasks(geo);
        dressShorts(geo);
        geo.computeBoundingSphere();
        var mat = material(opts);
        var body = new THREE.Mesh(geo, mat);
        cb({ mesh: body, material: mat, height: bb.max.y - bb.min.y });
      });
    },
    styleFor: function (name) {
      for (var i = 0; i < RULES.length; i++) if (RULES[i].re.test(name)) return RULES[i];
      return null;
    },
    regionInfo: regionInfo,
    regionWeight: regionWeight,
    // move the growing lesion to the dissolving slot and start a new one
    show: function (mat, rule) {
      var u = mat.uniforms;
      u.uA0.value.copy(u.uB0.value); u.uA1.value.copy(u.uB1.value); u.uA2.value.copy(u.uB2.value);
      u.uStyleA.value = u.uStyleB.value; u.uKA.value = u.uKB.value;
      setMask(u.uB0.value, u.uB1.value, u.uB2.value, rule); u.uStyleB.value = rule ? rule.style : 0; u.uKB.value = 0;
    },
    hover: function (mat, rule) { setMask(mat.uniforms.uH0.value, mat.uniforms.uH1.value, mat.uniforms.uH2.value, rule); }
  };
})();
