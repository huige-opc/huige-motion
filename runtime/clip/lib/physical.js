// 物理取色（可复用模块）：黑体温度、薄膜干涉、谱线 → CIE 1931 → sRGB。
// 纯数学，无 canvas 依赖；可在浏览器或 Node（stub window）里跑。
// 用法：const LUT = PHYSICAL.lut(96, 20, 780); 把结果烘进项目，不要逐帧积分。
// 模型与边界见 references/physical-colour.md。
(() => {
const P = window.PHYSICAL = {};
const h = 6.62607015e-34, c = 2.99792458e8, k = 1.380649e-23;
const DEFAULTS = P.DEFAULTS = { n: 1.462, ns: 3.5, n0: 1 };

// CIE 1931 2° 配色函数：Wyman/Sloan/Shirley 2013 多瓣高斯拟合，380–780 nm 足够用
const lobe = (x, mu, s1, s2) => { const t = x - mu, s = t < 0 ? s1 : s2; return Math.exp(-0.5 * (t / s) ** 2); };
P.cmf = (nm) => [
  1.056 * lobe(nm, 599.8, 37.9, 31.0) + 0.362 * lobe(nm, 442.0, 16.0, 26.7) - 0.065 * lobe(nm, 501.1, 20.4, 26.2),
  0.821 * lobe(nm, 568.8, 46.9, 40.5) + 0.286 * lobe(nm, 530.9, 16.3, 31.1),
  1.217 * lobe(nm, 437.0, 11.8, 36.0) + 0.681 * lobe(nm, 459.0, 26.0, 13.8),
];

// 普朗克谱辐射（任意单位；只用于积分取色，T 单位 K，波长 nm）
P.planck = (nm, T) => {
  const l = nm * 1e-9;
  return (2 * h * c * c / l ** 5) / (Math.exp(h * c / (l * k * T)) - 1);
};

// 单层薄膜反射率（正入射；n0 空气 / n 膜 / ns 基底），波长与厚度单位 nm
P.thinFilm = (nm, dNm, opt = {}) => {
  const { n = DEFAULTS.n, ns = DEFAULTS.ns, n0 = DEFAULTS.n0 } = opt;
  const l = nm * 1e-9, d = dNm * 1e-9;
  const delta = 2 * Math.PI * n * d / l;
  const r1 = (n0 - n) / (n0 + n), r2 = (n - ns) / (n + ns);
  const cos = Math.cos(2 * delta), sin = -Math.sin(2 * delta);
  const numRe = r1 + r2 * cos, numIm = r2 * sin;
  const denRe = 1 + r1 * r2 * cos, denIm = r1 * r2 * sin;
  return (numRe ** 2 + numIm ** 2) / (denRe ** 2 + denIm ** 2);
};

// 光谱函数 f(nm) 对 CIE 配色函数积分，返回原始 XYZ 与 Y 归一化后的值
P.integrate = (f, opt = {}) => {
  const { from = 380, to = 780, step = 5 } = opt;
  let X = 0, Y = 0, Z = 0, W = 0;
  for (let nm = from; nm <= to; nm += step) {
    const v = f(nm), [x, y, z] = P.cmf(nm);
    X += v * x; Y += v * y; Z += v * z; W += y;
  }
  if (!(W > 0) || !(Y > 0)) return { X: 0, Y: 0, Z: 0, x: 0, y: 0, z: 0 };
  return { X, Y, Z, x: X / W, y: Y / W, z: Z / W };
};

const encode = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
P.encode = (v) => encode(Math.max(0, v));

// XYZ（Y 已归一）→ sRGB；mode: 'max' 保持色相、把最亮通道拉到 gain（展示用）
//                         'y' 保留物理亮度（Y=1 时通常很暗）
//                         'clip' 直接编码并裁到 0..1
P.xyzToSrgb = (xyz, opt = {}) => {
  const { mode = 'max', gain = 1 } = opt;
  let [r, g, b] = [
    3.2406 * xyz[0] - 1.5372 * xyz[1] - 0.4986 * xyz[2],
    -0.9689 * xyz[0] + 1.8758 * xyz[1] + 0.0415 * xyz[2],
    0.0557 * xyz[0] - 0.2040 * xyz[1] + 1.0570 * xyz[2],
  ].map((v) => Math.max(0, v));
  if (mode === 'max') {
    const m = Math.max(r, g, b, 1e-6);
    r = r / m * gain; g = g / m * gain; b = b / m * gain;
  } else if (mode === 'y') { r *= gain; g *= gain; b *= gain; }
  return [encode(Math.min(1, r)), encode(Math.min(1, g)), encode(Math.min(1, b))];
};

// 薄膜厚度 → RGB（0..1）。默认 max 归一，保证每一圈都看得见；物理亮度用 mode:'y'
P.thinFilmColour = (dNm, opt = {}) => {
  const { mode = 'max', gain = 1, n = DEFAULTS.n, ns = DEFAULTS.ns, n0 = DEFAULTS.n0 } = opt;
  const v = P.integrate((nm) => P.thinFilm(nm, dNm, { n, ns, n0 }));
  return P.xyzToSrgb([v.x, v.y, v.z], { mode, gain });
};

// 黑体温度 → RGB（0..1）；2000K 橙红、6500K 近白、12000K 蓝
P.planckColour = (T, opt = {}) => {
  const { mode = 'max', gain = 1 } = opt;
  const v = P.integrate((nm) => P.planck(nm, T));
  return P.xyzToSrgb([v.x, v.y, v.z], { mode, gain });
};

// 一条谱线（默认 2 nm 宽）→ RGB；单色光大多在 sRGB 外，会裁，适合做光/线/点，不适合大面积平铺
P.spectralColour = (nm, opt = {}) => {
  const { width = 2, mode = 'max', gain = 1 } = opt;
  const v = P.integrate((l) => Math.exp(-0.5 * ((l - nm) / width) ** 2));
  return P.xyzToSrgb([v.x, v.y, v.z], { mode, gain });
};

P.toHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');

// 批量 LUT：一次算好、烘进项目；默认 96 档 20–780 nm
P.lut = (n = 96, d0 = 20, d1 = 780, opt = {}) =>
  Array.from({ length: n }, (_, i) => {
    const rgb = P.thinFilmColour(d0 + (i * (d1 - d0)) / Math.max(1, n - 1), opt);
    return opt.format === 'rgb' ? rgb : P.toHex(rgb);
  });

// 黑体温度条：默认 2000–12000 K
P.blackbodyLut = (n = 64, t0 = 2000, t1 = 12000, opt = {}) =>
  Array.from({ length: n }, (_, i) => {
    const rgb = P.planckColour(t0 + (i * (t1 - t0)) / Math.max(1, n - 1), opt);
    return opt.format === 'rgb' ? rgb : P.toHex(rgb);
  });
})();
