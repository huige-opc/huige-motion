// 印刷管线（可复用模块）：纸张、分版网点、multiply 叠印、套印错位、套准规/裁切线/色标。
// 约定：所有随机都用种子（U.rng）；纸张和网点版应缓存（PAINT.cached / P.plate），不要逐帧重筛。
// 用法：加载顺序 util.js → paint.js → print.js；API 见 references/print-separation.md。
(() => {
const { clamp, rng } = U;
const P = window.PRINT = {};
const W = 1920, H = 1080;

// ---------- 颜色与纯函数（可在 Node 里单测，不需要 canvas） ----------
P.hex = (h) => {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
};
P.rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
// 归一化 0..1 的 multiply；中间调是油墨自己叠出来的
P.multiply = (a, b) => [clamp(a[0]) * clamp(b[0]), clamp(a[1]) * clamp(b[1]), clamp(a[2]) * clamp(b[2])];
// Bayer 阈值矩阵，n 必须是 2 的幂；返回值 0..1
P.bayer = (n = 4) => {
  const build = (k) => {
    if (k === 1) return [[0]];
    const m = build(k / 2), s = m.length, out = Array.from({ length: k }, () => Array(k).fill(0));
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const v = m[y][x] * 4;
      out[y][x] = v; out[y][x + s] = v + 2; out[y + s][x] = v + 3; out[y + s][x + s] = v + 1;
    }
    return out;
  };
  return build(n).map((row) => row.map((v) => v / (n * n)));
};
P.BAYER4 = P.bayer(4);
P.BAYER8 = P.bayer(8);
// 覆盖率 → 网点半径（像素）；sqrt 让面积随覆盖率线性增长
P.dotRadius = (coverage, cell = 8, maxDot = 0.62) => cell * maxDot * Math.sqrt(clamp(coverage));
// 用阈值矩阵判断某点是否落墨（不旋转；screen() 用圆点半径，不依赖它）
P.screenPoint = (coverage, x, y, cell = 8, matrix = P.BAYER8) => {
  const n = matrix.length;
  return clamp(coverage) > matrix[Math.floor(y / cell) % n][Math.floor(x / cell) % n];
};
// 每块版的套印错位：同一 seed 可复现，范围 ±amount
P.misregOffset = (i, amount = 1, seed = 1) => {
  const r = rng(seed * 1000 + i * 17);
  return { dx: (r() - 0.5) * 2 * amount, dy: (r() - 0.5) * 2 * amount };
};

// ---------- 纸张 ----------
// base: 底色；mottle: 低频斑块；tooth: 每像素细粒；fibers: 纤维短线数量；seed: 固定纹理
P.paper = (w = W, h = H, opt = {}) => {
  const { base = '#F3EEE5', mottle = 0.55, tooth = 0.22, fibers = 1800, seed = 11 } = opt;
  const key = `printpaper_${w}x${h}_${base}_${seed}_${mottle}_${tooth}_${fibers}`;
  return PAINT.cached(key, w, h, (g) => {
    const b = P.hex(base), r = rng(seed);
    g.fillStyle = P.rgb(b); g.fillRect(0, 0, w, h);
    // 低频斑块：小图放大，overlay 只改明暗、不把纸洗灰
    const m = P.canvas(48, 27), mi = m.getContext('2d').createImageData(48, 27);
    for (let i = 0; i < 48 * 27; i++) { const v = 128 + (r() - .5) * 56; mi.data[i * 4] = mi.data[i * 4 + 1] = mi.data[i * 4 + 2] = v; mi.data[i * 4 + 3] = 255; }
    m.getContext('2d').putImageData(mi, 0, 0);
    g.globalCompositeOperation = 'overlay'; g.imageSmoothingEnabled = true;
    g.globalAlpha = mottle; g.drawImage(m, 0, 0, w, h);
    // 每像素细粒：可平铺 tile
    const t = P.canvas(256, 256), ti = t.getContext('2d').createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) { const v = 128 + (r() - .5) * 16; ti.data[i * 4] = ti.data[i * 4 + 1] = ti.data[i * 4 + 2] = v; ti.data[i * 4 + 3] = 255; }
    t.getContext('2d').putImageData(ti, 0, 0);
    g.globalAlpha = tooth; g.fillStyle = g.createPattern(t, 'repeat'); g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // 纤维：横向/纵向短线，压得很低
    g.strokeStyle = P.rgb(b.map((v) => Math.max(0, v - 70))); g.lineWidth = 1; g.globalAlpha = .025;
    for (let i = 0; i < fibers; i++) {
      const x = r() * w, y = r() * h, len = 6 + r() * 22;
      g.beginPath(); g.moveTo(x, y); if (r() < .5) g.lineTo(x + len, y); else g.lineTo(x, y + len); g.stroke();
    }
    g.globalAlpha = 1;
  });
};

// ---------- 分版与网点 ----------
P.canvas = (w = W, h = H) => PAINT.canvas(w, h);
// 画一张覆盖率遮罩：draw(ctx,w,h) 用白色/任意颜色画形状，透明背景；默认按 alpha 取覆盖率
P.mask = (w = W, h = H, draw) => {
  const c = P.canvas(w, h); const g = c.getContext('2d');
  const ret = draw ? draw(g, w, h) : null;
  return ret && ret.width ? ret : c;
};
// 把覆盖率遮罩筛成一块油墨版（透明底 + ink 色圆点）。source: alpha | luma；angle 单位为弧度
P.screen = (mask, opt = {}) => {
  const { cell = 8, angle = Math.PI / 4, ink = '#14161A', gain = 1, invert = false, maxDot = 0.62, source = 'alpha' } = opt;
  const w = mask.width, h = mask.height;
  const sd = mask.getContext('2d').getImageData(0, 0, w, h).data;
  const out = P.canvas(w, h), g = out.getContext('2d');
  g.fillStyle = ink;
  const ca = Math.cos(angle), sa = Math.sin(angle), R = Math.hypot(w, h);
  g.beginPath();
  for (let v = -R; v < R; v += cell) for (let u = -R; u < R; u += cell) {
    const x = w / 2 + u * ca - v * sa, y = h / 2 + u * sa + v * ca;
    if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue;
    const ix = clamp(x | 0, 0, w - 1), iy = clamp(y | 0, 0, h - 1), i = (iy * w + ix) * 4;
    let a = source === 'luma' ? (sd[i] * .3 + sd[i + 1] * .59 + sd[i + 2] * .11) / 255 : sd[i + 3] / 255;
    if (invert) a = 1 - a;
    const rr = P.dotRadius(a * gain, cell, maxDot);
    if (rr < 0.4) continue;
    g.moveTo(x + rr, y); g.arc(x, y, rr, 0, Math.PI * 2);
  }
  g.fill();
  return out;
};
// 缓存的版：key 必须唯一（同一形状/参数只筛一次）；draw(ctx,w,h) 画覆盖率
P.plate = (key, w, h, draw, opt = {}) => PAINT.cached(`printplate_${key}`, w, h, (g) => {
  const mask = P.mask(w, h, draw);
  g.drawImage(P.screen(mask, opt), 0, 0);
});

// ---------- 叠印 ----------
// paper 可以是 canvas 或颜色；plates: [{ canvas, dx=0, dy=0, alpha=1, mode='multiply' }]
P.overprint = (paper, plates, opt = {}) => {
  const w = paper.width || opt.w || W, h = paper.height || opt.h || H;
  const out = P.canvas(w, h), g = out.getContext('2d');
  if (typeof paper === 'string') { g.fillStyle = paper; g.fillRect(0, 0, w, h); }
  else g.drawImage(paper, 0, 0);
  for (const pl of plates || []) {
    if (!pl) continue;
    const src = pl.canvas || pl;
    if (!src || !src.width) continue;
    g.save();
    g.globalCompositeOperation = pl.mode || opt.mode || 'multiply';
    g.globalAlpha = pl.alpha ?? 1;
    g.drawImage(src, pl.dx || 0, pl.dy || 0);
    g.restore();
  }
  return out;
};
P.misregister = (src, dx = 0, dy = 0) => {
  const out = P.canvas(src.width, src.height);
  out.getContext('2d').drawImage(src, dx, dy);
  return out;
};

// ---------- 版面家具 ----------
P.regMark = (g, x, y, opt = {}) => {
  const { size = 9, ink = '#14161A', cyan = '#00A6C8', magenta = '#E8467C', alpha = 1 } = opt;
  g.save(); g.globalAlpha = alpha; g.strokeStyle = ink; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(x - size, y); g.lineTo(x + size, y); g.moveTo(x, y - size); g.lineTo(x, y + size); g.stroke();
  g.beginPath(); g.arc(x, y, size * .55, 0, Math.PI * 2); g.stroke();
  g.globalAlpha = alpha * .8;
  g.strokeStyle = cyan; g.beginPath(); g.moveTo(x - size * 1.6, y); g.lineTo(x - size * 1.1, y); g.stroke();
  g.strokeStyle = magenta; g.beginPath(); g.moveTo(x + size * 1.1, y); g.lineTo(x + size * 1.6, y); g.stroke();
  g.restore();
};
P.cropMarks = (g, w, h, opt = {}) => {
  const { margin = 36, size = 14, ink = '#14161A', alpha = .55 } = opt;
  g.save(); g.globalAlpha = alpha; g.strokeStyle = ink; g.lineWidth = 1;
  const pts = [[margin, margin, 1, 1], [w - margin, margin, -1, 1], [margin, h - margin, 1, -1], [w - margin, h - margin, -1, -1]];
  for (const [x, y, sx, sy] of pts) {
    g.beginPath(); g.moveTo(x + sx * size, y); g.lineTo(x, y); g.lineTo(x, y + sy * size); g.stroke();
  }
  g.restore();
};
// 色标条：按顺序铺小色块，带细墨边；用于印刷/riso 版面
P.colorBar = (g, x, y, colors, opt = {}) => {
  const { cell = 32, height = 18, gap = 2, ink = '#14161A', alpha = 1 } = opt;
  g.save(); g.globalAlpha = alpha; g.strokeStyle = ink; g.lineWidth = 1;
  (colors || []).forEach((c, i) => {
    const cx = x + i * cell;
    g.fillStyle = c; g.fillRect(cx, y, cell - gap, height);
    g.strokeRect(cx + .5, y + .5, cell - gap - 1, height - 1);
  });
  g.restore();
};
})();
