'use strict';
/* Bình Minh Bộ Tộc — chiến thuật theo lượt trên lưới hex 15x15 (kinh tế: dân làng là quân cờ, khai thác theo chuyến) */

// ---------- Hằng số & dữ liệu ----------
const N = 15, S = 27, SQ3 = Math.sqrt(3);
const W = Math.ceil(S * SQ3 * (N + 0.5)) + 12, H = Math.ceil(S * 1.5 * (N - 1) + 2 * S) + 12;
const OX = S * SQ3 / 2 + 6, OY = S + 6;
const PLAINS = 0, FOREST = 1, HILLS = 2, MOUNTAIN = 3, STONE = 4, EMPTY = 5, BERRY = 6, DEER = 7, ELEPHANT = 8, WOODLOT = 9;
const TERRAIN = [
  { name: 'Đồng bằng', cost: 1, color: '#8fbf5a', def: 0 },
  { name: 'Rừng', cost: 2, color: '#4c8a43', def: 1 },
  { name: 'Mỏ vàng', cost: 2, color: '#c9a646', def: 1 },
  { name: 'Núi đá', cost: Infinity, color: '#6f7178', def: 0 },
  { name: 'Mỏ đá', cost: 2, color: '#a3a7b0', def: 1 },
  { name: 'Đất trống', cost: 1, color: '#a9cc7a', def: 0 },
  { name: 'Bụi quả dâu', cost: 1, color: '#7fb85a', def: 0 },
  { name: 'Đàn hươu', cost: 1, color: '#9cc46a', def: 0 },
  { name: 'Đàn voi', cost: 1, color: '#9cc46a', def: 0 },
  { name: 'Bãi gỗ nhỏ', cost: 1, color: '#93bd6c', def: 0 },
];
const MINE_RES = { [FOREST]: 'wood', [HILLS]: 'gold', [STONE]: 'stone', [BERRY]: 'food', [DEER]: 'food', [ELEPHANT]: 'food', [WOODLOT]: 'wood' }; // loại mỏ có trữ lượng
const AMT = { [FOREST]: 400, [HILLS]: 400, [STONE]: 400, [BERRY]: 400, [DEER]: 500, [ELEPHANT]: 800, [WOODLOT]: 75 };
let MINE_CAP = 3, LOAD = 10, FARM_LOAD = 15, FARM_AMT = 300, POP_MAX = 40, AGE_COST = 500, AGE_TURNS = 5; // chỉnh được ở màn hình Quản trị
const RES_ICON = { food: '🍖', wood: '🪵', stone: '🪨', gold: '🪙' }, RES_ICON_TXT = RES_ICON; // emoji (dùng cho chữ vẽ trên canvas)
const RES_NAME = { food: 'Thức ăn', wood: 'Gỗ', stone: 'Đá', gold: 'Vàng' };
const AGES = { 1: 'Đời 1 · Đồ Đá', 2: 'Đời 2 · Công Cụ' };

const UNITS = {
  vil: { name: 'Dân làng', icon: '👷', cls: 'vil', hp: 6, atk: 3, def: 0, mp: 2, range: 1, vision: 1, cost: { food: 50 }, turns: 1, age: 1, at: 'city', desc: 'Khai thác, xây dựng, dò bản đồ, săn thú. Đánh được nhưng yếu, Máu thấp.' },
  club: { name: 'Lính chùy', icon: '🔨', cls: 'inf', hp: 10, atk: 3, def: 2, mp: 2, range: 1, vision: 2, cost: { food: 50 }, turns: 2, age: 1, at: 'barracks', desc: 'Bộ binh cơ bản.' },
  axe: { name: 'Lính rìu', icon: '🪓', cls: 'inf', hp: 12, atk: 4, def: 2, mp: 2, range: 1, vision: 2, cost: { food: 50 }, turns: 2, age: 2, at: 'barracks', desc: 'Bộ binh mạnh hơn Lính chùy.' },
  spear: { name: 'Lính giáo', icon: '🔱', cls: 'spear', hp: 12, atk: 4, def: 3, mp: 2, range: 1, vision: 2, cost: { food: 60, gold: 40 }, turns: 2, age: 2, at: 'barracks', desc: 'x2 sát thương lên Kỵ binh.' },
  archer: { name: 'Cung thủ', icon: '🏹', cls: 'archer', hp: 8, atk: 3, def: 1, mp: 2, range: 2, vision: 2, cost: { food: 40, wood: 20 }, turns: 2, age: 2, at: 'range', desc: 'Trong trận bắn xa 3 ô (Đá tảng chặn; trên Đồi +1 sát thương); yếu khi bị áp sát.' },
  cav: { name: 'Kỵ binh', icon: '🐎', cls: 'cav', hp: 14, atk: 5, def: 2, mp: 4, range: 1, vision: 3, cost: { food: 70, gold: 80 }, turns: 3, age: 2, at: 'stable', desc: 'Nhanh, x1.5 lên Cung thủ; sợ Lính giáo.' },
};
// Chỉ số riêng trên bàn cờ trận đánh (chỉnh được ở Quản trị): init = Tốc độ (ai cao đi trước),
// bmp = Di chuyển mỗi lượt trong trận, brange = Tầm đánh trong trận (1 = cận chiến)
const INIT = { cav: 8, archer: 6, inf: 5, spear: 4, vil: 3 };
for (const d of Object.values(UNITS)) Object.assign(d, { init: INIT[d.cls], bmp: d.mp + 1, brange: d.range > 1 ? 3 : 1 });
const BUILDINGS = {
  house: { name: 'Nhà dân', icon: '🏠', cost: { wood: 30 }, turns: 1, hp: 20, age: 1, desc: '+4 chỗ dân số' },
  granary: { name: 'Kho thực phẩm', icon: '🌾', cost: { wood: 120 }, turns: 2, hp: 30, age: 1, drop: 'food', desc: 'Điểm trả Thức ăn — đặt sát mỏ quả, hươu, voi, ruộng; xây được ngoài lãnh thổ' },
  storage: { name: 'Kho tài nguyên', icon: '📦', cost: { wood: 120 }, turns: 2, hp: 30, age: 1, drop: 'mine', desc: 'Điểm trả Gỗ/Đá/Vàng và thịt hươu, voi — đặt sát mỏ; xây được ngoài lãnh thổ' },
  barracks: { name: 'Nhà lính', icon: '⚔️', cost: { wood: 175 }, turns: 3, hp: 40, age: 1, desc: 'Huấn luyện bộ binh' },
  market: { name: 'Chợ', icon: '🏪', cost: { wood: 150 }, turns: 3, hp: 40, age: 2, desc: 'Nâng cấp khai thác. Cần có Chợ mới xây được Ruộng lúa' },
  farm: { name: 'Ruộng lúa', icon: '🌱', cost: { wood: 75 }, turns: 1, hp: 10, age: 2, req: 'market', desc: `1 dân, ${FARM_LOAD} Thức ăn/chuyến, cạn sau ${FARM_AMT}` },
  range: { name: 'Trường bắn cung', icon: '🎯', cost: { wood: 175 }, turns: 3, hp: 40, age: 2, desc: 'Huấn luyện Cung thủ' },
  stable: { name: 'Chuồng ngựa', icon: '🐴', cost: { wood: 150 }, turns: 3, hp: 40, age: 2, desc: 'Huấn luyện Kỵ binh' },
};
// Nâng cấp (nghiên cứu một lần tại một loại nhà, giữ mãi kể cả khi nhà bị phá).
// atk/def: cộng chỉ số theo loại quân; load: cộng mỗi chuyến theo tài nguyên; farmAmt: cộng trữ lượng mỗi Ruộng lúa; upgrade: đổi loại quân.
const TECHS = {
  axe: { name: 'Rìu đồng', icon: '🪓', at: 'barracks', age: 2, cost: { food: 100 }, turns: 2, upgrade: ['club', 'axe'], desc: 'Mọi Lính chùy thành Lính rìu; Nhà lính bán Lính rìu thay Lính chùy' },
  tool: { name: 'Rèn công cụ', icon: '🔨', at: 'storage', age: 2, cost: { food: 100, stone: 40 }, turns: 3, atk: { club: 1, axe: 1, spear: 1, cav: 1 }, desc: '+1 Công: Lính chùy, Lính rìu, Lính giáo, Kỵ binh' },
  armInf: { name: 'Giáp da bộ binh', icon: '🛡️', at: 'storage', age: 2, cost: { food: 75 }, turns: 2, def: { club: 1, axe: 1, spear: 1 }, desc: '+1 Thủ: Lính chùy, Lính rìu, Lính giáo' },
  armArc: { name: 'Giáp da cung thủ', icon: '🎽', at: 'storage', age: 2, cost: { food: 100 }, turns: 2, def: { archer: 1 }, desc: '+1 Thủ: Cung thủ' },
  armCav: { name: 'Giáp da kỵ binh', icon: '🐎', at: 'storage', age: 2, cost: { food: 125 }, turns: 2, def: { cav: 1 }, desc: '+1 Thủ: Kỵ binh' },
  wood: { name: 'Chế gỗ', icon: '🪚', at: 'market', age: 2, cost: { food: 120, wood: 75 }, turns: 2, load: { wood: 2 }, desc: '+2 Gỗ mỗi chuyến' },
  farm: { name: 'Thuần hóa', icon: '🐄', at: 'market', age: 2, cost: { food: 200, wood: 50 }, turns: 3, farmAmt: 100, desc: 'Mỗi Ruộng lúa chứa thêm 100 Thức ăn (cả ruộng đang có)' },
  stone: { name: 'Khai đá', icon: '⛏️', at: 'market', age: 2, cost: { food: 100, wood: 50 }, turns: 2, load: { stone: 2 }, desc: '+2 Đá mỗi chuyến' },
  gold: { name: 'Khai vàng', icon: '🪙', at: 'market', age: 2, cost: { food: 120, wood: 100 }, turns: 2, load: { gold: 2 }, desc: '+2 Vàng mỗi chuyến' },
};
for (const d of Object.values(TECHS)) d.ico = d.icon;
// ---------- Ảnh (icon) ----------
// Mỗi hình có một tên file cố định trong thư mục assets/: units/<loại quân>, buildings/<loại công trình>,
// buildings/city1 (Nhà chính đời 1), buildings/city2 (đời 2), buildings/site (công trường), res/<food|wood|stone|gold>.
// Game thử <tên>.png trước, rồi <tên>.svg; không có file nào thì dùng emoji như cũ.
const ICON_EMOJI = { 'buildings/city1': '🛖', 'buildings/city2': '🏘️', 'buildings/site': '🚧',
  'animals/deer': '🦌', 'animals/elephant': '🐘', 'animals/deer_dead': '🦴', 'animals/elephant_dead': '🦴' }; // thú hoang và xác
for (const [k, d] of Object.entries(UNITS)) ICON_EMOJI['units/' + k] = d.icon;
for (const [k, d] of Object.entries(BUILDINGS)) ICON_EMOJI['buildings/' + k] = d.icon;
for (const [k, e] of Object.entries(RES_ICON)) ICON_EMOJI['res/' + k] = e;
const IMG = {}; // ảnh đã nạp xong: tên -> Image
function loadIcons() {
  let redraw = 0;
  for (const key of Object.keys(ICON_EMOJI)) {
    const exts = ['png', 'svg'], im = new Image();
    const next = () => { const e = exts.shift(); if (e) im.src = `assets/${key}.${e}`; };
    im.onload = () => { IMG[key] = im; clearTimeout(redraw); redraw = setTimeout(() => { if (G) renderUI(); }, 50); };
    im.onerror = next;
    next();
  }
}
// HTML: thẻ <img> nếu có ảnh, không thì emoji
const ico = key => (IMG[key] ? `<img class="ic" src="${IMG[key].src}" alt="">` : ICON_EMOJI[key] || '');
const resIco = k => ico('res/' + k);
for (const [k, d] of Object.entries(UNITS)) Object.defineProperty(d, 'ico', { get: () => ico('units/' + k) });
for (const [k, d] of Object.entries(BUILDINGS)) Object.defineProperty(d, 'ico', { get: () => ico('buildings/' + k) });
// Canvas: vẽ ảnh vừa khung size×size tâm (x, y), không có thì vẽ emoji
function drawIcon(g, key, x, y, size) {
  const im = IMG[key];
  if (im) { g.drawImage(im, x - size / 2, y - size / 2, size, size); return; }
  g.font = `${Math.round(size * 0.8)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#fff'; g.fillText(ICON_EMOJI[key] || '?', x, y + 1);
}
loadIcons();
const QUEUE_MAX = 5; // số mục tối đa trong hàng chờ của một công trình
const AGE_REQ = ['granary', 'storage', 'barracks']; // cần 2 loại khác nhau để lên Đời 2
// ---------- Cấu hình kinh tế (dành cho người quản lý trò chơi) ----------
const UNIT_FIELDS = [['food', '🍖 Thức ăn', 0], ['wood', '🪵 Gỗ', 0], ['gold', '🪙 Vàng', 0], ['turns', 'Số lượt', 1], ['hp', 'Máu', 1], ['atk', 'Công', 0], ['def', 'Thủ', 0], ['mp', 'Di chuyển', 1], ['init', 'Tốc độ (trận)', 1], ['bmp', 'Di chuyển (trận)', 1], ['brange', 'Tầm (trận)', 1]];
const BLD_FIELDS = [['wood', '🪵 Gỗ', 0], ['stone', '🪨 Đá', 0], ['gold', '🪙 Vàng', 0], ['turns', 'Số lượt xây', 1], ['hp', 'Máu', 1]];
const TECH_FIELDS = [['food', '🍖 Thức ăn', 0], ['wood', '🪵 Gỗ', 0], ['stone', '🪨 Đá', 0], ['gold', '🪙 Vàng', 0], ['turns', 'Số lượt', 1]];
const CFG_GROUPS = [ // [khóa, tiêu đề, [[trường, nhãn, giá trị nhỏ nhất]]]
  ['start', 'Khởi đầu ván', [['food', '🍖 Thức ăn', 0], ['wood', '🪵 Gỗ', 0], ['stone', '🪨 Đá', 0], ['gold', '🪙 Vàng', 0], ['villagers', 'Số dân làng', 1]]],
  ['gather', 'Khai thác', [['load', 'Mỗi chuyến mang về', 1], ['farmLoad', 'Mỗi chuyến từ Ruộng lúa', 1], ['mineCap', 'Số dân tối đa mỗi ô mỏ', 1]]],
  ['amounts', 'Trữ lượng mỗi ô', [['forest', 'Rừng (Gỗ)', 1], ['woodlot', 'Bãi gỗ nhỏ (Gỗ)', 1], ['gold', 'Mỏ vàng', 1], ['stone', 'Mỏ đá', 1], ['berry', 'Bụi quả dâu', 1], ['deer', 'Đàn hươu', 1], ['elephant', 'Đàn voi', 1], ['farm', 'Ruộng lúa', 1]]],
  ['pop', 'Dân số', [['base', 'Chỗ từ Nhà chính', 1], ['perHouse', 'Chỗ mỗi Nhà dân', 1], ['max', 'Trần dân số', 1]]],
  ['age', 'Lên Đời Công Cụ', [['food', '🍖 Thức ăn', 0], ['turns', 'Số lượt', 1]]],
  ['city', 'Nhà chính', [['hp', 'Máu', 1]]],
  ['home', 'Tài nguyên quanh Nhà chính (trong 4 ô)', [ // trường thứ tư là giá trị lớn nhất
    ['berry', 'Số bãi dâu', 0, 4], ['animalMin', 'Bãi động vật: ít nhất', 0, 3], ['animalMax', 'Bãi động vật: nhiều nhất', 0, 3], ['elephantPct', 'Tỉ lệ bãi là voi (%)', 0, 100],
    ['forest', 'Số cụm rừng', 0, 5], ['forestMin', 'Ô mỗi cụm rừng: ít nhất', 1, 4], ['forestMax', 'Ô mỗi cụm rừng: nhiều nhất', 1, 4],
    ['gold', 'Số bãi vàng', 0, 3], ['goldMin', 'Ô mỗi bãi vàng: ít nhất', 1, 3], ['goldMax', 'Ô mỗi bãi vàng: nhiều nhất', 1, 3], ['stone', 'Số mỏ đá (1 ô)', 0, 3],
    ['woodlotMin', 'Bãi gỗ nhỏ (cách nhà 1–2 ô): ít nhất', 0, 4], ['woodlotMax', 'Bãi gỗ nhỏ (cách nhà 1–2 ô): nhiều nhất', 0, 4]]],
];
function defaultCfg() { // chụp lại giá trị gốc trong mã nguồn
  const c = {
    start: { food: 200, wood: 200, stone: 150, gold: 0, villagers: 3 },
    gather: { load: 10, farmLoad: 15, mineCap: 3 },
    amounts: { forest: 400, woodlot: 75, gold: 400, stone: 400, berry: 400, deer: 500, elephant: 800, farm: 300 },
    cfgVer: 2, // 2: dân làng có Công (bản cũ luôn ép Công dân = 0)
    pop: { base: 4, perHouse: 4, max: 40 }, age: { food: 500, turns: 5 }, city: { hp: 80 }, units: {}, buildings: {}, techs: {},
    home: { berry: 2, animalMin: 1, animalMax: 2, elephantPct: 25, forest: 3, forestMin: 2, forestMax: 3, gold: 1, goldMin: 1, goldMax: 2, stone: 1, woodlotMin: 1, woodlotMax: 2 },
  };
  for (const [id, d] of Object.entries(UNITS)) c.units[id] = { food: d.cost.food || 0, wood: d.cost.wood || 0, gold: d.cost.gold || 0, turns: d.turns, hp: d.hp, atk: d.atk, def: d.def, mp: d.mp, init: d.init, bmp: d.bmp, brange: d.brange };
  for (const [id, d] of Object.entries(BUILDINGS)) c.buildings[id] = { wood: d.cost.wood || 0, stone: d.cost.stone || 0, gold: d.cost.gold || 0, turns: d.turns, hp: d.hp };
  for (const [id, d] of Object.entries(TECHS)) c.techs[id] = { food: d.cost.food || 0, wood: d.cost.wood || 0, stone: d.cost.stone || 0, gold: d.cost.gold || 0, turns: d.turns };
  return c;
}
const DEFAULT_CFG = defaultCfg();
let CFG = JSON.parse(JSON.stringify(DEFAULT_CFG));
function cfgFields() { // danh sách phẳng mọi ô cấu hình: [đường dẫn, giá trị nhỏ nhất, giá trị lớn nhất (nếu có)]
  const out = [];
  for (const [g, , fields] of CFG_GROUPS) for (const [f, , min, max] of fields) out.push([[g, f], min, max]);
  for (const id in DEFAULT_CFG.units) for (const [f, , min] of UNIT_FIELDS) out.push([['units', id, f], id === 'vil' && f === 'atk' ? 0 : min]);
  for (const id in DEFAULT_CFG.buildings) for (const [f, , min] of BLD_FIELDS) out.push([['buildings', id, f], min]);
  for (const id in DEFAULT_CFG.techs) for (const [f, , min] of TECH_FIELDS) out.push([['techs', id, f], min]);
  return out;
}
const cfgGet = (o, path) => path.reduce((a, k) => (a == null ? undefined : a[k]), o);
function sanitizeCfg(src) { // chỉ nhận các trường đã biết, số nguyên trong khoảng hợp lệ; thiếu thì lấy mặc định
  const out = JSON.parse(JSON.stringify(DEFAULT_CFG)), legacy = !(src && src.cfgVer >= 2);
  for (const [path, min, max] of cfgFields()) {
    if (legacy && path.join('.') === 'units.vil.atk') continue; // cấu hình cũ lưu Công dân = 0 do bị ép: dùng mặc định mới
    const v = Number(cfgGet(src, path));
    if (!Number.isFinite(v)) continue;
    let o = out; for (const k of path.slice(0, -1)) o = o[k];
    o[path[path.length - 1]] = Math.max(min, Math.min(max == null ? 99999 : max, Math.round(v)));
  }
  for (const k of ['animal', 'forest', 'gold', 'woodlot']) if (out.home[k + 'Max'] < out.home[k + 'Min']) out.home[k + 'Max'] = out.home[k + 'Min']; // "nhiều nhất" không được nhỏ hơn "ít nhất"
  return out;
}
function applyCfg(cfg) { // đưa cấu hình vào các bảng dữ liệu của game
  CFG = cfg;
  LOAD = cfg.gather.load; FARM_LOAD = cfg.gather.farmLoad; MINE_CAP = cfg.gather.mineCap; FARM_AMT = cfg.amounts.farm;
  POP_MAX = cfg.pop.max; AGE_COST = cfg.age.food; AGE_TURNS = cfg.age.turns;
  Object.assign(AMT, { [FOREST]: cfg.amounts.forest, [HILLS]: cfg.amounts.gold, [STONE]: cfg.amounts.stone, [BERRY]: cfg.amounts.berry, [DEER]: cfg.amounts.deer, [ELEPHANT]: cfg.amounts.elephant, [WOODLOT]: cfg.amounts.woodlot });
  const cost = (o, keys) => { const c = {}; for (const k of keys) if (o[k] > 0) c[k] = o[k]; return c; };
  for (const [id, u] of Object.entries(cfg.units)) Object.assign(UNITS[id], { cost: cost(u, ['food', 'wood', 'gold']), turns: u.turns, hp: u.hp, atk: u.atk, def: u.def, mp: u.mp, init: u.init, bmp: u.bmp, brange: u.brange });
  for (const [id, b] of Object.entries(cfg.buildings)) Object.assign(BUILDINGS[id], { cost: cost(b, ['wood', 'stone', 'gold']), turns: b.turns, hp: b.hp });
  for (const [id, t] of Object.entries(cfg.techs)) Object.assign(TECHS[id], { cost: cost(t, ['food', 'wood', 'stone', 'gold']), turns: t.turns });
  BUILDINGS.house.desc = `+${cfg.pop.perHouse} chỗ dân số`;
  BUILDINGS.farm.desc = `1 dân, ${FARM_LOAD} Thức ăn/chuyến, cạn sau ${FARM_AMT}`;
}
try { const saved = localStorage.getItem('cfg'); if (saved) applyCfg(sanitizeCfg(JSON.parse(saved))); } catch (e) { /* cấu hình hỏng: dùng mặc định */ }
function homeText() { // mô tả tài nguyên quanh nhà theo cấu hình hiện tại
  const h = CFG.home, rng = (a, b) => (a === b ? a : `${a}–${b}`);
  return `${h.berry} bãi dâu, ${rng(h.animalMin, h.animalMax)} bãi động vật, ${h.forest} cụm rừng (${rng(h.forestMin, h.forestMax)} ô), ${h.gold} bãi vàng, ${h.stone} mỏ đá; và ${rng(h.woodlotMin, h.woodlotMax)} bãi gỗ nhỏ sát nhà (cách 1–2 ô)`;
}
const cfgChanged = () => JSON.stringify(CFG) !== JSON.stringify(DEFAULT_CFG);


// ---------- Hình học hex (odd-r, đỉnh nhọn) ----------
const idx = (c, r) => r * N + c;
const AXL = [], CEN = [], NB = [];
for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
  AXL.push({ q: c - ((r - (r & 1)) >> 1), r });
  CEN.push({ x: OX + S * SQ3 * (c + 0.5 * (r & 1)), y: OY + S * 1.5 * r });
}
function fromAx(q, r) {
  const c = q + ((r - (r & 1)) >> 1);
  return (c >= 0 && r >= 0 && c < N && r < N) ? idx(c, r) : -1;
}
for (let i = 0; i < N * N; i++) {
  const a = AXL[i];
  NB.push([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].map(d => fromAx(a.q + d[0], a.r + d[1])).filter(j => j >= 0));
}
function D(i, j) {
  const a = AXL[i], b = AXL[j], dq = a.q - b.q, dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}
function within(i, rad) { const o = []; for (let j = 0; j < N * N; j++) if (D(i, j) <= rad) o.push(j); return o; }
const mirror = i => fromAx(8 - AXL[i].q, 14 - AXL[i].r);
const rnd = n => Math.floor(Math.random() * n);
const sleep = ms => window.__fast ? Promise.resolve() : new Promise(r => setTimeout(r, ms));
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
let tacticalOn = true;
try { tacticalOn = localStorage.getItem('tac') !== '0'; } catch (e) { /* bỏ qua */ }

// ---------- Trạng thái ----------
let G = null, sel = null, selReach = new Map(), selTargets = new Map(), selAtk = new Set(), hoverRange = null, hover = -1, placing = null, selPick = null, selB = null, tab = 'eco', logOpen = false;
const floaters = [];

function genMap(depth = 0) { // depth >= 2: cấu hình quanh nhà không xếp vừa, chấp nhận bản đồ đặt được nhiều nhất có thể
  let out = null;
  const H = CFG.home, strict = depth < 2;
  for (let attempt = 0; attempt < 300; attempt++) {
    const t = new Array(N * N).fill(EMPTY), used = new Set();
    // rải `count` cụm, mỗi cụm minS..maxS ô. loose: ô gốc chỉ cần trống và không kề mỏ cùng loại (dùng ở vùng quanh nhà, nơi chật chỗ)
    const place = (type, count, minS, maxS, pool, withSite, loose) => {
      const inPool = new Set(pool);
      for (let k = 0; k < count; k++) {
        const seeds = shuffle(pool.filter(i => !used.has(i) && (loose ? NB[i].every(n => t[n] !== type) : NB[i].every(n => !used.has(n)))));
        if (!seeds.length) return;
        const cells = [seeds[0]], size = minS + rnd(maxS - minS + 1);
        while (cells.length < size) {
          const opts = NB[cells[rnd(cells.length)]].filter(n => !cells.includes(n) && !used.has(n) && inPool.has(n));
          if (!opts.length) break;
          cells.push(opts[rnd(opts.length)]);
        }
        for (const c of cells) { t[c] = type; used.add(c); }
        if (withSite) { // chừa một ô Đất trống kề bên để đặt kho
          const sites = NB[cells[0]].filter(k => !used.has(k) && inPool.has(k));
          if (sites.length) { const k = sites[rnd(sites.length)]; t[k] = EMPTY; used.add(k); }
        }
      }
    };
    const ps = idx(3, 11);
    used.add(ps);
    // bãi gỗ nhỏ nằm sát nhà (cách 1–2 ô), thấy ngay từ đầu ván
    const lots = H.woodlotMin + rnd(H.woodlotMax - H.woodlotMin + 1);
    for (const j of shuffle(within(ps, 2).filter(j => j !== ps && mirror(j) >= 0)).slice(0, lots)) { t[j] = WOODLOT; used.add(j); }
    for (const j of NB[ps]) used.add(j); // phần còn lại của vòng sát Nhà chính luôn là Đất trống
    // Trong bán kính 4 ô quanh mỗi Nhà chính luôn có: 2 bãi dâu, 1–2 bãi động vật, 3 cụm Rừng (mỗi cụm 2–3 ô), 1 bãi Vàng, 1 mỏ Đá.
    // Chỉ dùng ô có ô đối xứng (và hàng xóm cũng vậy) để bên địch nhận đúng như thế.
    const home = within(ps, 4).filter(j => D(ps, j) >= 2 && Math.floor(j / N) > 7 && mirror(j) >= 0 && NB[j].every(k => mirror(k) >= 0));
    const homeFar = home.filter(j => D(ps, j) >= 3);
    place(FOREST, H.forest, H.forestMin, H.forestMax, home);
    place(BERRY, H.berry, 1, 1, homeFar, true, true);
    const animals = H.animalMin + rnd(H.animalMax - H.animalMin + 1);
    const homeEdge = homeFar.filter(j => D(ps, j) >= 4); // voi ở rìa vùng nhà (cách 4 ô) để dân mới sinh không bị húc ngay
    for (let k = 0; k < animals; k++) { const ele = Math.random() * 100 < H.elephantPct; place(ele ? ELEPHANT : DEER, 1, 1, 1, ele ? homeEdge : homeFar, true, true); }
    place(HILLS, H.gold, H.goldMin, H.goldMax, home, false, true); place(STONE, H.stone, 1, 1, home, false, true);
    if (strict) { // kiểm tra đã đặt đủ theo cấu hình; thiếu thì sinh lại bản đồ
      const cnt = t0 => within(ps, 4).filter(j => t[j] === t0).length, forestCells = within(ps, 4).filter(j => t[j] === FOREST);
      const seenF = new Set(); let clusters = 0, wrongSize = false;
      for (const f of forestCells) {
        if (seenF.has(f)) continue;
        clusters++; let size = 0; const st = [f]; seenF.add(f);
        while (st.length) { size++; for (const k of NB[st.pop()]) if (t[k] === FOREST && !seenF.has(k)) { seenF.add(k); st.push(k); } }
        if (size < H.forestMin || size > H.forestMax) wrongSize = true;
      }
      if (cnt(BERRY) !== H.berry || cnt(DEER) + cnt(ELEPHANT) !== animals || clusters !== H.forest || wrongSize
        || cnt(HILLS) < H.gold * H.goldMin || cnt(HILLS) > H.gold * H.goldMax || cnt(STONE) !== H.stone || within(ps, 2).filter(j => t[j] === WOODLOT).length !== lots) continue;
    }
    const half = []; for (let i = 0; i < N * N; i++) { const r = Math.floor(i / N), c = i % N; if ((r > 7 || (r === 7 && c > 7)) && D(i, ps) > 4) half.push(i); }
    // tài nguyên ở vùng ngoài (cách cả hai Nhà chính ít nhất 5 ô): phải đi dò mới thấy
    const as0 = mirror(ps), wild = half.filter(i => D(i, as0) >= 5);
    place(BERRY, 1, 1, 1, wild, true); place(DEER, 1, 1, 1, wild, true); place(ELEPHANT, 1, 1, 1, wild, true);
    place(FOREST, 2, 2, 3, wild.filter(i => D(i, ps) >= 6 && D(i, as0) >= 6)); // cách xa để không dính vào cụm rừng quanh nhà
    place(HILLS, 3, 1, 2, wild); place(STONE, 1, 1, 1, wild); place(MOUNTAIN, 3, 2, 3, wild);
    // đối xứng tâm để hai bên cân bằng
    for (let i = 0; i < N * N; i++) {
      const r = Math.floor(i / N), c = i % N;
      if (r > 7 || (r === 7 && c > 7)) { const m = mirror(i); if (m >= 0) t[m] = t[i]; }
    }
    const as = mirror(ps);
    out = { t, ps, as };
    const seen = new Set([ps]), q = [ps];
    while (q.length) { const i = q.shift(); for (const n of NB[i]) if (!seen.has(n) && isFinite(TERRAIN[t[n]].cost)) { seen.add(n); q.push(n); } }
    if (seen.has(as)) return out;
    out = null;
  }
  return genMap(depth + 1);
}

// Chế độ bản đồ, chọn ở màn hình bắt đầu (áp dụng cho ván mới):
//  dark  = bản đồ tối: phải cho dân/quân đi khám phá mới thấy địa hình;
//  light = bản đồ sáng: thấy sẵn toàn bộ địa hình và tài nguyên. Nhà, Nhà chính và quân địch vẫn chỉ hiện
//          khi đã khám phá / đang nhìn thấy, như bản đồ tối. Ô ngoài tầm nhìn vẫn phủ sương mờ.
const MAP_MODES = {
  dark: { name: '🌑 Bản đồ tối', desc: 'Phải đi khám phá mới thấy địa hình và tài nguyên.' },
  light: { name: '☀️ Bản đồ sáng', desc: 'Thấy sẵn toàn bộ địa hình và tài nguyên; nhà và quân địch vẫn phải tìm.' },
};
let mapMode = 'dark';
try { if (MAP_MODES[localStorage.getItem('mapMode')]) mapMode = localStorage.getItem('mapMode'); } catch (e) { /* bỏ qua */ }
function setMapMode(m) {
  if (!MAP_MODES[m]) return;
  mapMode = m;
  try { localStorage.setItem('mapMode', m); } catch (e) { /* bỏ qua */ }
}
// p có biết địa hình ô i không (đã khám phá, hoặc ván bản đồ sáng)
const known = (p, i) => !!(G.reveal || p.explored[i]);

function mkPlayer(id, ci) {
  return {
    id, name: id ? 'Địch' : 'Bạn', color: id ? '#d0453a' : '#2f6fde',
    res: { food: CFG.start.food, wood: CFG.start.wood, stone: CFG.start.stone, gold: CFG.start.gold }, age: 1, tech: {},
    city: { i: ci, hp: CFG.city.hp, maxHp: CFG.city.hp, queue: [], terr: within(ci, 3).filter(j => j !== ci) },
    explored: new Uint8Array(N * N), visible: new Uint8Array(N * N), ai: { attacking: false, wave: 4 },
  };
}

function newGame() {
  const m = genMap();
  G = { turn: 1, t: m.t, players: [], units: [], uid: 1, log: [], over: null, busy: false, amt: m.t.map(x => AMT[x] || 0), bld: {}, reveal: mapMode === 'light' };
  G.players.push(mkPlayer(0, m.ps), mkPlayer(1, m.as));
  for (const p of G.players) for (let k = 0; k < CFG.start.villagers; k++) spawn(p, 'vil', p.city.i);
  for (const p of G.players) updateVision(p);
  placing = null; sel = null; selPick = null; selB = null; tab = 'eco'; selReach.clear(); selTargets.clear(); floaters.length = 0;
  log(`Trong vòng 4 ô quanh Nhà chính có ${homeText()} — nhưng lúc đầu bạn chỉ thấy 2 ô. Hãy cho dân đi dò, rồi dựng kho sát mỏ.`, 'info');
  document.getElementById('overlay').classList.remove('show');
  renderUI(); saveGame(); // ván mới thay bản lưu cũ
}

// ---------- Lưu ván ----------
// Tự lưu vào bộ nhớ trình duyệt (localStorage 'save') đầu mỗi lượt của bạn và khi đóng/ẩn trang.
// Không lưu giữa lượt địch hay giữa trận đánh: khi đó giữ bản lưu gần nhất.
const SAVE_KEY = 'save', SAVE_VER = 1;
function saveGame() {
  if (!G || G.busy || G.over || B) return;
  try {
    const data = { ...G, players: G.players.map(p => ({ ...p, explored: Array.from(p.explored), visible: Array.from(p.visible) })) };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_VER, n: N, at: Date.now(), G: data }));
  } catch (err) { /* bộ nhớ đầy hoặc bị chặn: bỏ qua, game vẫn chơi được */ }
}
function readSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    return s && s.v === SAVE_VER && s.n === N && s.G && !s.G.over ? s : null;
  } catch (err) { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* bỏ qua */ } }
function loadGame() {
  const s = readSave(); if (!s) return false;
  G = s.G; G.busy = false;
  for (const p of G.players) { p.explored = Uint8Array.from(p.explored); p.visible = Uint8Array.from(p.visible); p.tech = p.tech || {}; } // bản lưu trước khi có nâng cấp: coi như chưa có
  placing = null; sel = null; selPick = null; selB = null; tab = 'eco'; selReach = new Map(); selTargets = new Map(); selAtk = new Set(); floaters.length = 0;
  for (const p of G.players) updateVision(p);
  log('Đã tải ván đã lưu.', 'info');
  document.getElementById('overlay').classList.remove('show');
  renderUI();
  return true;
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveGame(); });
window.addEventListener('pagehide', saveGame);

// ---------- Tiện ích ----------
function log(msg, cls = '') { G.log.push({ t: G.turn, msg, cls }); if (G.log.length > 60) G.log.shift(); }
function floater(i, text, color) { floaters.push({ i, text, color, t0: performance.now() }); }
const unitAt = i => G.units.find(u => u.i === i);
const unitsAt = i => G.units.filter(u => u.i === i);
const cityAt = i => G.players.find(p => p.city.i === i);
const isVil = u => u.type === 'vil';
const ARMY_MAX = 5; // số lính tối đa trong một đạo (cùng đứng một ô)
const armyAt = (i, owner) => G.units.filter(u => u.i === i && !isVil(u) && (owner == null || u.owner === owner));
const TRAINS = { barracks: ['club', 'axe', 'spear'], range: ['archer'], stable: ['cav'] };
const ust = u => UNITS[u.type];
// ---------- Nâng cấp: hiệu ứng ----------
const hasTech = (p, id) => !!(p && p.tech && p.tech[id]);
function techSum(p, key, sub) { // cộng dồn hiệu ứng `key` (atk/def/load) cho loại quân hoặc tài nguyên `sub`
  let s = 0;
  if (p && p.tech) for (const id in p.tech) { const e = TECHS[id] && TECHS[id][key]; if (e && e[sub]) s += e[sub]; }
  return s;
}
const atkBonus = x => techSum(G.players[x.owner], 'atk', x.type); // x: quân trên bản đồ hoặc quân cờ trong trận (đều có owner, type)
const defBonus = x => techSum(G.players[x.owner], 'def', x.type);
const atkOf = x => UNITS[x.type].atk + atkBonus(x);
const defOf = x => UNITS[x.type].def + defBonus(x);
const withBonus = (v, b) => (b ? `${v + b} (+${b})` : `${v}`); // "4 (+1)"
const farmAmtOf = p => FARM_AMT + (hasTech(p, 'farm') ? TECHS.farm.farmAmt : 0);
// Quân một nhà đang bán: Nhà lính bán Lính rìu thay Lính chùy sau khi có Rìu đồng
const trainList = (p, bid) => (TRAINS[bid] || []).filter(id => UNITS[id].age <= p.age && (id === 'club' ? !hasTech(p, 'axe') : id === 'axe' ? hasTech(p, 'axe') : true));
const techQueued = (p, id) => bldOf(p).some(b => b.queue.some(x => x.kind === 'tech' && x.id === id));
const myUnits = pid => G.units.filter(u => u.owner === pid);
const bldOf = p => Object.values(G.bld).filter(b => b.owner === p.id);
const countBld = (p, id, doneOnly) => bldOf(p).filter(b => b.id === id && (!doneOnly || b.done)).length;
const isMeat = i => G.t[i] === DEER || G.t[i] === ELEPHANT;
const isMine = i => !!MINE_RES[G.t[i]] && G.amt[i] > 0;
function costStr(cost) { return Object.entries(cost).map(([k, v]) => resIco(k) + v).join(' '); }
function canAfford(p, cost) { return Object.entries(cost).every(([k, v]) => p.res[k] >= v); }
function pay(p, cost, sign = -1) { for (const k in cost) p.res[k] += sign * cost[k]; }

function updateVision(p) {
  p.visible.fill(0);
  const see = (i, r) => { for (const j of within(i, r)) { p.visible[j] = 1; p.explored[j] = 1; } };
  see(p.city.i, 2);
  for (const b of bldOf(p)) if (b.done) see(b.tile, 1);
  for (const u of G.units) if (u.owner === p.id) see(u.i, ust(u).vision + (G.t[u.i] === HILLS ? 2 : 0));
}
function canSee(pid, u) {
  if (u.owner === pid) return true;
  const p = G.players[pid];
  if (!p.visible[u.i]) return false;
  if (G.t[u.i] !== FOREST) return true;
  return D(p.city.i, u.i) <= 1 || G.units.some(o => o.owner === pid && D(o.i, u.i) <= 1); // rừng che giấu quân
}

// ---------- Dân số, khai thác, công trình ----------
const popCap = p => Math.min(POP_MAX, CFG.pop.base + CFG.pop.perHouse * countBld(p, 'house', true));
function popUsed(p) {
  let n = myUnits(p.id).length;
  n += p.city.queue.filter(x => x.kind === 'unit').length;
  for (const b of bldOf(p)) n += b.queue.filter(x => x.kind === 'unit').length; // nghiên cứu không tốn chỗ dân số
  return n;
}
const ageReq = p => AGE_REQ.filter(id => countBld(p, id, true) > 0).length;

// Khoảng cách (số lượt mỗi chuyến) từ ô tới điểm trả gần nhất của loại tài nguyên
function dropDist(p, i, res) {
  let d = D(i, p.city.i);
  const want = res === 'food' ? 'granary' : 'storage', meat = isMeat(i); // thịt hươu, voi trả được cả về Kho tài nguyên
  for (const b of bldOf(p)) if (b.done && (b.id === want || (meat && b.id === 'storage'))) d = Math.min(d, D(i, b.tile));
  return Math.max(1, d);
}
// Dân đứng ở ô này sẽ khai thác gì? null nếu không khai thác được
// Thú hoang còn sống/đã chết. Voi có Máu (G.ahp), phải hạ xong mới xẻ thịt được; hươu chết ngay khi có người vào ô.
const ELEPHANT_HP = 9, HUNT_DMG = 3; // 9 Máu, mỗi đòn của dân 3 → ít nhất 3 đòn
const isDead = i => !!(G.dead && G.dead[i]) && (G.t[i] === DEER || G.t[i] === ELEPHANT);
const eleHp = i => (G.ahp && G.ahp[i] != null ? G.ahp[i] : ELEPHANT_HP);
const liveElephant = i => G.t[i] === ELEPHANT && !isDead(i);
function killAnimal(i) { G.dead = G.dead || {}; G.dead[i] = true; if (G.ahp) delete G.ahp[i]; }
function gatherAt(p, i) {
  if (liveElephant(i)) return null; // voi còn sống: phải săn hạ trước
  const b = G.bld[i];
  if (b) return b.id === 'farm' && b.done && b.owner === p.id ? { res: 'food', load: FARM_LOAD, d: dropDist(p, i, 'food'), farm: b } : null;
  if (isMine(i)) { const res = MINE_RES[G.t[i]]; return { res, load: LOAD + techSum(p, 'load', res), d: dropDist(p, i, res) }; }
  return null;
}
const gatherInfo = (p, u) => isVil(u) && u.build == null ? gatherAt(p, u.i) : null;
const tileCap = i => (G.bld[i] ? (G.bld[i].id === 'farm' ? 1 : 0) : isMine(i) ? MINE_CAP : 0);
// Đơn vị còn cần người chơi ra lệnh?
function needsOrders(u) {
  if (u.mp <= 0 || u.attacked || u.goto != null) return false;
  if (!isVil(u)) return true;
  if (liveElephant(u.i)) return false; // đang săn voi
  return u.build == null && !gatherAt(G.players[u.owner], u.i);
}
function incomeEst(p) { // ước tính thu nhập mỗi lượt
  const inc = { food: 0, wood: 0, stone: 0, gold: 0 };
  for (const u of myUnits(p.id)) { const g = gatherInfo(p, u); if (g) inc[g.res] += g.load / g.d; }
  for (const k in inc) inc[k] = Math.round(inc[k]);
  return inc;
}

function spawn(p, type, from) { // tìm ô trống gần `from` nhất
  const seen = new Set([from]), q = [from];
  while (q.length) {
    const i = q.shift();
    for (const n of NB[i]) {
      if (seen.has(n) || !isFinite(TERRAIN[G.t[n]].cost) || cityAt(n)) continue;
      seen.add(n);
      if (!unitAt(n) && !G.bld[n]) {
        const d = UNITS[type], u = { id: G.uid++, owner: p.id, type, i: n, hp: d.hp, mp: d.mp, moved: false, attacked: false, build: null, goto: null, trip: 0, stuck: 0 };
        G.units.push(u); return u;
      }
      q.push(n);
    }
  }
  return null;
}
// Lãnh thổ xây dựng: vùng quanh Nhà chính (city.terr, rộng ra khi lên đời) cộng thêm TERR_BLD ô quanh mỗi công trình
// đã xây xong của mình. Phần mở rộng không lấn vào vùng quanh Nhà chính địch.
const TERR_BLD = 2;
function terrOf(p) {
  const s = new Set(p.city.terr), foe = G.players[1 - p.id].city;
  for (const b of Object.values(G.bld)) if (b.owner === p.id && b.done)
    for (const j of within(b.tile, TERR_BLD)) if (j !== foe.i && j !== p.city.i && !foe.terr.includes(j)) s.add(j);
  return s;
}
const freeSites = p => [...terrOf(p)].filter(i => G.t[i] === EMPTY && !G.bld[i] && !unitAt(i));
function buildSites(p, id) { // kho đặt được trên mọi ô Đất trống đã khám phá (trừ lãnh thổ địch); công trình khác chỉ trong lãnh thổ
  if (!BUILDINGS[id].drop) return freeSites(p);
  const foe = terrOf(G.players[1 - p.id]), out = [];
  for (let i = 0; i < N * N; i++) if (p.explored[i] && G.t[i] === EMPTY && !G.bld[i] && !unitAt(i) && !foe.has(i)) out.push(i);
  return out;
}
function startBuild(p, u, id, tile) {
  const d = BUILDINGS[id];
  if (!u || !isVil(u) || d.age > p.age || (d.req && !countBld(p, d.req, true)) || !canAfford(p, d.cost) || !buildSites(p, id).includes(tile)) return false;
  pay(p, d.cost);
  G.bld[tile] = { tile, owner: p.id, id, hp: Math.ceil(d.hp / 2), max: d.hp, prog: 0, need: d.turns, done: false, queue: [], amt: id === 'farm' ? farmAmtOf(p) : 0 };
  u.build = tile; u.goto = null;
  return true;
}
function destroyBld(tile) {
  delete G.bld[tile];
  for (const u of G.units) if (u.build === tile) u.build = null;
}
// Huấn luyện: where = 'city' hoặc ô của công trình
function queueOf(p, where) { return where === 'city' ? p.city : (G.bld[where] && G.bld[where].owner === p.id && G.bld[where].done ? G.bld[where] : null); }
function train(p, where, id) {
  const q = queueOf(p, where), d = UNITS[id];
  if (!q || q.queue.length >= QUEUE_MAX || d.age > p.age || d.at !== (where === 'city' ? 'city' : q.id)) return false;
  if (where !== 'city' && !trainList(p, q.id).includes(id)) return false;
  if (!canAfford(p, d.cost) || popUsed(p) >= popCap(p)) return false;
  pay(p, d.cost); q.queue.push({ kind: 'unit', id, left: d.turns });
  return true;
}
// Nghiên cứu: xếp chung hàng chờ với huấn luyện; mỗi nâng cấp chỉ ở một nơi một lúc
function canResearch(p, where, id) {
  const q = queueOf(p, where), t = TECHS[id];
  return !!(q && t && where !== 'city' && q.id === t.at && t.age <= p.age && !hasTech(p, id) && !techQueued(p, id) && q.queue.length < QUEUE_MAX);
}
function research(p, where, id) {
  if (!canResearch(p, where, id) || !canAfford(p, TECHS[id].cost)) return false;
  const t = TECHS[id];
  pay(p, t.cost); queueOf(p, where).queue.push({ kind: 'tech', id, left: t.turns, paid: { ...t.cost } });
  return true;
}
function finishTech(p, id) {
  const t = TECHS[id];
  p.tech = p.tech || {}; p.tech[id] = true;
  if (t.farmAmt) for (const b of bldOf(p)) if (b.id === 'farm') b.amt += t.farmAmt; // ruộng đang có cũng được cộng
  if (t.upgrade) {
    const [from, to] = t.upgrade, gain = UNITS[to].hp - UNITS[from].hp;
    for (const u of myUnits(p.id)) if (u.type === from) { u.type = to; u.hp = Math.max(1, u.hp + gain); } // giữ nguyên phần Máu đã mất
  }
}
function startAge(p) {
  const c = p.city;
  if (p.age !== 1 || c.queue.some(x => x.kind === 'age') || c.queue.length >= QUEUE_MAX || ageReq(p) < 2 || p.res.food < AGE_COST) return false;
  p.res.food -= AGE_COST; c.queue.push({ kind: 'age', id: 'age2', left: AGE_TURNS });
  return true;
}
function cancelTrain(p, where) {
  const q = queueOf(p, where); if (!q || !q.queue.length) return;
  const it = q.queue.pop(); // hủy mục xếp sau cùng
  if (it.kind === 'age') p.res.food += AGE_COST;
  else if (it.kind === 'tech') pay(p, it.paid || TECHS[it.id].cost, 1);
  else pay(p, UNITS[it.id].cost, 1);
}

function economy(p) {
  const c = p.city, me = p.id === 0;
  // 0) săn voi: mỗi quân/dân đứng trên ô voi còn sống đánh 1 đòn (dân 3, lính theo Công, ít nhất 3)
  for (const u of myUnits(p.id)) {
    if (!liveElephant(u.i) || u.build != null) continue;
    const dmg = Math.max(HUNT_DMG, atkOf(u)); // theo Công (dân 3), ít nhất HUNT_DMG
    G.ahp = G.ahp || {}; G.ahp[u.i] = eleHp(u.i) - dmg;
    if (me || G.players[0].visible[u.i]) floater(u.i, `🐘 -${dmg}`, '#ffb347');
    if (G.ahp[u.i] <= 0) { killAnimal(u.i); if (me) log('🐘 Đã hạ được voi! Dân đứng trên ô bắt đầu xẻ thịt từ lượt sau.', 'good'); }
  }
  // 1) khai thác theo chuyến
  for (const u of myUnits(p.id)) {
    const g = gatherInfo(p, u);
    if (!g) { u.trip = 0; continue; }
    if (++u.trip < g.d) continue;
    u.trip = 0;
    let amt = g.load;
    if (g.farm) {
      amt = Math.min(amt, g.farm.amt); g.farm.amt -= amt;
      if (g.farm.amt <= 0) { destroyBld(u.i); if (me) log('Một Ruộng lúa đã cạn, ô trở lại Đất trống.', 'info'); }
    } else if (MINE_RES[G.t[u.i]]) {
      amt = Math.min(amt, G.amt[u.i]); G.amt[u.i] -= amt;
      if (G.amt[u.i] <= 0) {
        if (me) log(`${TERRAIN[G.t[u.i]].name} đã cạn và trở thành Đất trống.`, 'info');
        G.t[u.i] = EMPTY; for (const k of ['dead', 'ahp']) if (G[k]) delete G[k][u.i]; // xóa dấu vết con thú
      }
    }
    p.res[g.res] += amt;
    if (me) floater(u.i, `+${amt}${RES_ICON_TXT[g.res]}`, '#fff');
  }
  // 2) xây dựng: cần một dân được giao việc đứng kề công trình
  for (const b of bldOf(p)) {
    if (b.done) continue;
    const workers = G.units.filter(u => u.owner === p.id && u.build === b.tile && D(u.i, b.tile) <= 1).length;
    if (!workers) continue;
    b.prog = Math.min(b.need, b.prog + workers); // mỗi dân đứng kề góp 1 lượt công
    if (b.prog >= b.need) {
      b.done = true; b.hp = b.max;
      for (const u of G.units) if (u.build === b.tile) u.build = null;
      if (me) log(`Xây xong: ${BUILDINGS[b.id].name}.`, 'good');
    }
  }
  // 3) huấn luyện và lên đời
  for (const q of [c, ...bldOf(p).filter(b => b.done)]) {
    const it = q.queue[0];
    if (!it || --it.left > 0) continue;
    if (it.kind === 'age') {
      p.age = 2; c.terr = within(c.i, 4).filter(j => j !== c.i); q.queue.shift();
      log(me ? 'Bạn đã tiến lên Đời Công Cụ! Lãnh thổ mở rộng; mở Chợ, Ruộng lúa, Trường bắn cung, Chuồng ngựa, quân mới và các nâng cấp.' : 'Địch đã tiến lên Đời Công Cụ!', me ? 'good' : 'bad');
    } else if (it.kind === 'tech') {
      finishTech(p, it.id); q.queue.shift();
      if (me) log(`Nghiên cứu xong: ${TECHS[it.id].name}. ${TECHS[it.id].desc}.`, 'good'); // nghiên cứu của địch không báo
    } else if (spawn(p, it.id === 'club' && hasTech(p, 'axe') ? 'axe' : it.id, q === c ? c.i : q.tile)) { // Lính chùy xếp hàng trước khi có Rìu đồng ra thành Lính rìu
      if (me) log(`Huấn luyện xong: ${UNITS[it.id === 'club' && hasTech(p, 'axe') ? 'axe' : it.id].name}.`, 'good');
      q.queue.shift();
    } else it.left = 1; // chưa có chỗ đứng: chờ lượt sau
  }
  if (c.hp < c.maxHp) c.hp++;
  updateVision(p);
}

// ---------- Di chuyển & chiến đấu ----------
function blockedBld(u, n) { // công trình chặn đường, trừ dân vào Ruộng lúa của mình
  const b = G.bld[n];
  return !!b && !(b.id === 'farm' && b.done && b.owner === u.owner && isVil(u));
}
function canPass(u, n) {
  if (!isFinite(TERRAIN[G.t[n]].cost) || cityAt(n)) return false;
  const b = G.bld[n];
  if (b && b.owner !== u.owner) return false; // công trình địch chặn đường; công trình mình đi xuyên qua được (nhưng không dừng lại)
  return !G.units.some(o => o.i === n && o.owner !== u.owner);
}
function canStop(u, n, size = 1) {
  if (!canPass(u, n) || blockedBld(u, n)) return false;
  const occ = unitsAt(n).filter(o => o !== u);
  if (!occ.length) return true;
  if (isVil(u)) return occ.every(isVil) && isMine(n) && occ.length < MINE_CAP; // tối đa 3 dân chung một ô mỏ
  return occ.every(o => !isVil(o)) && occ.length + size <= ARMY_MAX; // lính nhập đạo, tối đa 5
}
function reach(u, humanFog, grp = [u]) { // grp: cả đạo cùng đi, theo quân chậm nhất
  const best = new Map([[u.i, 0]]), q = [[u.i, 0]], p = G.players[u.owner], mp = Math.min(...grp.map(m => m.mp));
  while (q.length) {
    q.sort((a, b) => a[1] - b[1]);
    const [i, c] = q.shift();
    if (c > best.get(i)) continue;
    for (const n of NB[i]) {
      if (!canPass(u, n) || (humanFog && !known(p, n))) continue;
      const nc = c + TERRAIN[G.t[n]].cost;
      if (nc <= mp && nc < (best.has(n) ? best.get(n) : Infinity)) { best.set(n, nc); q.push([n, nc]); }
    }
  }
  best.delete(u.i);
  for (const i of [...best.keys()]) if (!canStop(u, i, grp.length)) best.delete(i);
  return best; // ô đích -> chi phí MP
}
// Khoảng cách đường bộ (theo MP) tới goal, bỏ qua quân. u: tính theo phe của đơn vị này.
// breakWalls: coi công trình địch là đi qua được với giá cao, để tìm đường "phá tường" khi bị vây kín.
function distMap(goal, u, breakWalls) {
  const dm = new Float32Array(N * N).fill(Infinity), q = [[goal, 0]]; dm[goal] = 0;
  while (q.length) {
    q.sort((a, b) => a[1] - b[1]);
    const [i, c] = q.shift(); if (c > dm[i]) continue;
    for (const n of NB[i]) {
      let tc = TERRAIN[G.t[n]].cost; if (!isFinite(tc) || cityAt(n)) continue;
      const b = G.bld[n];
      if (b && !(u && b.owner === u.owner)) { if (!breakWalls) continue; tc += 8; }
      if (c + tc < dm[n]) { dm[n] = c + tc; q.push([n, c + tc]); }
    }
  }
  return dm;
}
function moveGroup(grp, dest, cost) {
  for (const m of grp) { m.i = dest; m.mp -= cost; m.moved = true; m.trip = 0; }
  if (G.t[dest] === DEER && !isDead(dest)) { // vào hẳn ô hươu: hạ được hươu, xẻ thịt được ngay
    killAnimal(dest);
    if (G.players[0].visible[dest] || grp[0].owner === 0) floater(dest, '🦌 bị hạ', '#ffe9a8');
  }
  if (G.scare) delete G.scare[dest];
  for (const n of NB[dest]) if (G.t[n] === DEER && !isDead(n) && !unitsAt(n).length) { // hươu sát bên hoảng: sang lượt mới mới chạy
    G.scare = G.scare || {}; G.scare[n] = dest;
    if (grp[0].owner === 0) floater(n, '🦌 hoảng', '#ffe9a8');
  }
  updateVision(G.players[grp[0].owner]);
}

// ---------- Thú hoang ----------
// Hươu: khi một dân hoặc đạo quân dừng sát bên, hươu hoảng (G.scare[ô hươu] = ô người đứng);
// cuối vòng (sang lượt mới) hươu chạy 1 ô ngược hướng với người đó (lệch tối đa 60° nếu ô thẳng bị chặn).
// Dùng để lùa hươu về gần Nhà chính. Hươu đang có dân đứng săn trên ô thì không chạy.
const HEX_DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const ELEPHANT_DMG = 3; // voi húc dân mất bao nhiêu Máu mỗi lượt
// Hươu và voi đều có 1 MP mỗi vòng: hươu bị lùa chạy tối đa 1 ô/vòng, voi tiến tối đa 1 ô/vòng.
// G.wildUsed: các ô có thú đã dùng MP trong vòng này (xóa ở cuối vòng, trong wildlifeTurn).
const ANIMAL_MP = 1;
const CARCASS_ROT = 20; // xác hươu/voi mất bấy nhiêu thịt mỗi lượt (cuối vòng), không tính phần dân xẻ
const wildSpent = i => !!(G.wildUsed && G.wildUsed[i]);
// thú chỉ đi vào ô đất trống hoặc đồng bằng không có ai, không có công trình (ô thú rời đi thành đất trống)
const wildFree = i => i >= 0 && (G.t[i] === EMPTY || G.t[i] === PLAINS) &&!unitsAt(i).length && !G.bld[i] && !cityAt(i);
function moveAnimal(from, to) {
  if (G.ahp && G.ahp[from] != null) { G.ahp[to] = G.ahp[from]; delete G.ahp[from]; } // Máu voi đi theo con voi
  if (G.dead) delete G.dead[to];
  G.t[to] = G.t[from]; G.amt[to] = G.amt[from]; G.t[from] = EMPTY; G.amt[from] = 0;
  G.wildUsed = G.wildUsed || {}; delete G.wildUsed[from]; G.wildUsed[to] = true; // đã đi 1 ô = hết MP trong vòng này
  for (const u of G.units) if (u.goto === from) u.goto = to; // dân đang đi tới con thú thì đi theo chỗ mới
}
function deerFlee(i, from) {
  if (isDead(i) || unitsAt(i).length || wildSpent(i)) return false; // đã chết, đang bị săn, hoặc đã chạy 1 ô trong vòng này
  const a = AXL[i], b = AXL[from], k = HEX_DIRS.findIndex(([dq, dr]) => dq === a.q - b.q && dr === a.r - b.r);
  if (k < 0) return false;
  for (const kk of [k, (k + 1) % 6, (k + 5) % 6]) {
    const to = fromAx(a.q + HEX_DIRS[kk][0], a.r + HEX_DIRS[kk][1]);
    if (wildFree(to)) {
      moveAnimal(i, to);
      if (G.players[0].visible[i] || G.players[0].visible[to]) floater(to, '🦌 chạy', '#ffe9a8');
      return true;
    }
  }
  return false;
}
// Voi: cuối mỗi vòng (sau lượt cả hai bên), voi còn sống hành động 1 lần:
//  - đang bị săn (có người đứng trên ô): húc lại một người trên ô, ưu tiên dân làng;
//  - không bị săn: dân gần nhất đứng sát bên thì húc; cách 2 ô thì tiến 1 ô lại sát (hết MP, vòng sau mới húc).
//    Voi không đuổi quân lính. Voi đuổi theo dân không giới hạn quãng đường (lúc đầu ván luôn cách Nhà chính từ 4 ô trở lên).
function wildlifeTurn() {
  // hươu bị lùa: chạy ngược hướng người đã làm nó hoảng; người đó đã đi chỗ khác thì chạy khỏi người khác còn đứng sát bên
  const scare = G.scare || {}; G.scare = {};
  for (const k of Object.keys(scare)) {
    const i = +k; if (G.t[i] !== DEER || isDead(i)) continue;
    let from = scare[k];
    if (!(D(from, i) === 1 && unitsAt(from).length)) from = NB[i].find(n => unitsAt(n).length);
    if (from != null) deerFlee(i, from);
  }
  // xác hươu, xác voi tự thối rữa: mất CARCASS_ROT thịt mỗi lượt, dù có dân xẻ hay không
  for (let i = 0; i < N * N; i++) {
    if (!isDead(i) || G.amt[i] <= 0) continue;
    G.amt[i] = Math.max(0, G.amt[i] - CARCASS_ROT);
    if (G.amt[i] <= 0) {
      if (G.players[0].explored[i]) log(`Xác ${G.t[i] === DEER ? 'hươu' : 'voi'} đã thối rữa hết, ô trở thành Đất trống.`, 'info');
      G.t[i] = EMPTY; for (const k of ['dead', 'ahp']) if (G[k]) delete G[k][i];
    }
  }
  for (let i = 0; i < N * N; i++) {
    if (!liveElephant(i) || G.amt[i] <= 0 || wildSpent(i)) continue; // voi vừa đi 1 ô thì hết MP
    const onTile = unitsAt(i);
    let prey, at = i;
    if (onTile.length) { const pool = onTile.some(isVil) ? onTile.filter(isVil) : onTile; prey = pool[Math.floor(Math.random() * pool.length)]; }
    else {
      prey = G.units.filter(u => isVil(u) && D(u.i, i) <= 2).sort((a, b) => D(a.i, i) - D(b.i, i) || Math.random() - 0.5)[0];
      if (!prey) continue;
      if (D(prey.i, i) === 2) { // dùng 1 MP để tiến lại sát; vòng sau mới húc được
        const step = NB[i].filter(n => wildFree(n) && D(n, prey.i) === 1); // ô trống kề cả voi lẫn dân (thẳng hay chéo đều được)
        if (step.length) {
          at = step[Math.floor(Math.random() * step.length)]; moveAnimal(i, at);
          if (prey.owner === 0) log('🐘 Voi đang tiến lại sát dân làng của bạn! Vòng sau nó sẽ húc nếu dân còn đứng cạnh.', 'bad');
        }
        continue;
      }
    }
    prey.hp -= ELEPHANT_DMG;
    const seen = G.players[0].visible[at] || prey.owner === 0;
    if (seen) floater(prey.i, '-' + ELEPHANT_DMG, '#ff5a4a');
    const who = `${isVil(prey) ? 'dân làng' : UNITS[prey.type].name} ${prey.owner === 0 ? 'của bạn' : 'địch'}`;
    if (prey.hp <= 0) {
      killUnit(prey);
      if (seen) log(`🐘 Voi húc chết một ${who}!`, prey.owner === 0 ? 'bad' : 'good');
    } else if (prey.owner === 0) log(prey.i === at ? `🐘 Voi chống trả, húc ${who} (-${ELEPHANT_DMG} Máu). Voi còn ${eleHp(at)}/${ELEPHANT_HP} Máu.`
      : `🐘 Voi húc ${who} (-${ELEPHANT_DMG} Máu). Đứng sát voi là bị húc; vào hẳn ô voi để săn, hoặc tránh ra xa.`, 'bad');
  }
  G.wildUsed = {}; // sang vòng mới: hươu và voi có lại 1 MP
  for (const p of G.players) updateVision(p);
}
function moveUnit(u, dest, cost) { moveGroup([u], dest, cost); }
function walk(u, goal, grp = [u]) { // tự đi về phía goal bằng MP còn lại
  if (Math.min(...grp.map(m => m.mp)) <= 0) return false;
  const dm = distMap(goal, u); let to = -1, bd = dm[u.i], bc = 0;
  for (const [i, c] of reach(u, u.owner === 0, grp)) if (dm[i] < bd - 1e-6) { bd = dm[i]; to = i; bc = c; }
  if (to < 0) return false;
  moveGroup(grp, to, bc); return true;
}
function autoMoves(pid) { // cuối lượt: thợ xây đi tới công trường, đơn vị/đạo có lệnh đi tiếp
  const done = new Set();
  for (const u of myUnits(pid)) {
    if (u.build != null) {
      const b = G.bld[u.build];
      if (!b || b.done) u.build = null; else if (D(u.i, u.build) > 1) walk(u, u.build);
      continue;
    }
    if (u.goto == null || done.has(u)) continue;
    const grp = isVil(u) ? [u] : armyAt(u.i, pid).filter(m => m.goto === u.goto); // cả đạo đi cùng nhau
    for (const m of grp) done.add(m);
    const moved = u.i !== u.goto && walk(u, u.goto, grp);
    for (const m of grp) {
      if (m.i === m.goto) { m.goto = null; m.stuck = 0; }
      else if (!moved && m.mp > 0) { if (++m.stuck >= 2) { m.goto = null; m.stuck = 0; } }
      else m.stuck = 0;
    }
  }
}
// Mục tiêu có thể tấn công: key -> {tgt, pos, cost, i}
// Mục tiêu đạo có thể tấn công (phải đứng kề): key -> {tgt, pos, cost, i}
function attackTargets(grp, rc) {
  const out = new Map(), u = grp[0];
  if (grp.some(m => m.attacked) || !grp.some(m => ust(m).atk > 0)) return out;
  const me = G.players[u.owner], enemy = G.players[1 - u.owner], cands = [], seen = new Set();
  for (const e of G.units) {
    if (e.owner === u.owner || seen.has(e.i) || !canSee(u.owner, e)) continue;
    seen.add(e.i);
    cands.push(isVil(e) ? { key: 'v' + e.i, i: e.i, tgt: { vils: e.i } } : { key: 'a' + e.i, i: e.i, tgt: { army: e.i } });
  }
  for (const b of bldOf(enemy)) if (me.visible[b.tile]) cands.push({ key: 'b' + b.tile, i: b.tile, tgt: { b } });
  if (me.explored[enemy.city.i]) cands.push({ key: 'c', i: enemy.city.i, tgt: { city: enemy } });
  for (const cd of cands) {
    let pos = -1, cost = Infinity;
    if (D(u.i, cd.i) === 1) { pos = u.i; cost = 0; }
    else for (const [i, c] of rc) if (D(i, cd.i) === 1 && c < cost) { pos = i; cost = c; }
    if (pos >= 0) out.set(cd.key, { tgt: cd.tgt, pos, cost, i: cd.i });
  }
  return out;
}
// Tầm đánh trên bản đồ lớn: mọi đòn đều cận chiến, nên là các ô kề vị trí hiện tại hoặc kề một ô đi tới được.
// Bỏ ô Đá tảng và ô có quân/công trình/Nhà chính của chính phe đó.
function atkZone(u, grp, mv, full) {
  const out = new Set();
  if (!grp.some(m => ust(m).atk > 0) || (!full && grp.some(m => m.attacked))) return out;
  for (const s of [u.i, ...mv.keys()]) for (const n of NB[s]) {
    if (n === u.i || mv.has(n) || !isFinite(TERRAIN[G.t[n]].cost) && !cityAt(n)) continue;
    const c = cityAt(n), b = G.bld[n];
    if ((c && c.id === u.owner) || (b && b.owner === u.owner) || G.units.some(o => o.i === n && o.owner === u.owner)) continue;
    out.add(n);
  }
  return out;
}
// Tầm của một đạo/đơn vị khi rê chuột: full = tính với MP đầy (xem trước lượt tới, dùng cho quân địch hoặc quân đã đi)
function rangeOf(u, full) {
  const grp = isVil(u) ? [u] : armyAt(u.i, u.owner), save = grp.map(m => m.mp);
  if (full) for (const m of grp) m.mp = ust(m).mp;
  const mv = reach(u, u.owner === 0, grp);
  if (full) grp.forEach((m, k) => { m.mp = save[k]; });
  return { mv, atk: atkZone(u, grp, mv, full) };
}
function dmgCore(att, dType, df, k, rand) { // att: quân đánh (có type, owner); dType = null khi mục tiêu là công trình; df đã gồm Thủ từ nâng cấp
  const a = UNITS[att.type], d = dType && UNITS[dType]; let m = 1;
  if (d) {
    if (a.cls === 'spear' && d.cls === 'cav') m = 2;
    else if (a.cls === 'cav' && d.cls === 'archer') m = 1.5;
    else if (a.range === 1 && d.cls === 'archer') m = 1.25;
  }
  const r = rand ? 0.85 + Math.random() * 0.3 : 1;
  return Math.max(1, Math.round(atkOf(att) * m * 2 * k * r) - df);
}
function calcDmg(att, tgt, k, rand) {
  if (tgt.u) return dmgCore(att, tgt.u.type, defOf(tgt.u) + TERRAIN[G.t[tgt.u.i]].def, k, rand);
  return dmgCore(att, null, 1, k, rand);
}
function retalDmg(att, tgt, dist, rand) {
  if (tgt.b) return 0;
  if (tgt.city) return dist === 1 ? 2 : 0;
  const d = UNITS[tgt.u.type];
  if (d.atk <= 0) return 0;
  if (dist === 1) return calcDmg(tgt.u, { u: att }, d.cls === 'archer' ? 0.4 : 0.6, rand);
  return d.range >= dist ? calcDmg(tgt.u, { u: att }, 0.5, rand) : 0;
}
function killUnit(u) {
  G.units = G.units.filter(x => x !== u);
  if (sel === u) { sel = null; selReach.clear(); selTargets.clear(); selAtk.clear(); }
}
function strike(u, tgt) { // một đòn đánh lên dân làng, công trình hoặc Nhà chính (không phản đòn)
  const ti = tgt.u ? tgt.u.i : tgt.b ? tgt.b.tile : tgt.city.city.i;
  const tname = tgt.u ? UNITS[tgt.u.type].name : tgt.b ? BUILDINGS[tgt.b.id].name : 'Nhà chính', who = u.owner ? 'Địch' : 'Bạn';
  const dmg = calcDmg(u, tgt, 1, true), cls = u.owner ? 'bad' : 'good';
  floater(ti, '-' + dmg, '#ff5a4a');
  const msg = `${who}: ${UNITS[u.type].name} đánh ${tname} (-${dmg})`;
  if (tgt.u) {
    tgt.u.hp -= dmg;
    if (tgt.u.hp <= 0) { killUnit(tgt.u); log(msg + ' — tiêu diệt!', cls); return; }
  } else if (tgt.b) {
    tgt.b.hp -= dmg;
    if (tgt.b.hp <= 0) { destroyBld(tgt.b.tile); log(msg + ' — công trình bị phá hủy!', cls); for (const p of G.players) updateVision(p); return; }
  } else {
    tgt.city.city.hp -= dmg;
    if (tgt.city.city.hp <= 0) { tgt.city.city.hp = 0; log(msg + ' — nhà chính sụp đổ!', cls); gameOver(u.owner, 'Nhà chính đối phương đã bị tiêu diệt.'); return; }
  }
  log(msg + '.', u.owner ? 'bad' : '');
}
function groupAttack(grp, tgt) { // cả đạo đánh dân làng / công trình / Nhà chính: mỗi thành viên một đòn
  const hitters = grp.filter(m => ust(m).atk > 0);
  for (const m of grp) { m.mp = 0; m.attacked = true; m.goto = null; }
  if (tgt.vils != null) {
    for (const m of hitters) {
      const v = G.units.find(x => x.i === tgt.vils && x.owner !== m.owner && isVil(x));
      if (!v) break;
      strike(m, { u: v });
    }
    return;
  }
  for (const m of hitters) {
    if (G.over || (tgt.b && !G.bld[tgt.b.tile])) break;
    strike(m, tgt);
  }
  if (tgt.city && !G.over) { // Nhà chính phản đòn lên một thành viên ngẫu nhiên
    const alive = grp.filter(m => G.units.includes(m)), v = alive[rnd(alive.length)];
    if (v) {
      v.hp -= 2; floater(v.i, '-2', '#ffb347');
      log(`Nhà chính phản đòn ${UNITS[v.type].name} ${v.owner ? 'địch' : 'của bạn'} (-2)${v.hp <= 0 ? ' — tử trận' : ''}.`, v.owner ? 'good' : 'bad');
      if (v.hp <= 0) killUnit(v);
    }
  }
}
function refreshUnits(pid) {
  for (const u of G.units) if (u.owner === pid) {
    const s = ust(u);
    if (!u.moved && !u.attacked && u.hp < s.hp) u.hp = Math.min(s.hp, u.hp + 2);
    u.mp = s.mp; u.moved = false; u.attacked = false;
  }
}
function gameOver(winner, reason) {
  if (G.over) return;
  G.over = { winner, reason }; clearSave(); // ván đã xong: không còn gì để tiếp tục
  const o = document.getElementById('overlay');
  o.innerHTML = `<div class="modal"><h1>${winner === 0 ? '🏆 Chiến thắng!' : '💀 Thất bại'}</h1>
    <p>${winner === 0 ? 'Bộ tộc của bạn đã làm chủ vùng đất.' : 'Bộ tộc của bạn đã bị khuất phục.'} ${reason}</p>
    <p class="muted">Kết thúc ở lượt ${G.turn}.</p>
    <button class="btn primary" data-act="menu">Chơi ván mới</button></div>`;
  o.classList.add('show');
}

// ---------- AI (chơi đúng luật như người) ----------
function aiSite(p, score, pool) { // ô Đất trống có điểm cao nhất
  let best = -1, bs = -Infinity;
  for (const i of pool || freeSites(p)) { const s = score(i); if (s > bs) { bs = s; best = i; } }
  return best < 0 ? null : { tile: best, score: bs };
}
function aiDropSite(p, kind) { // chỗ đặt kho: kề nhiều ô tài nguyên đang phải đi xa nhất
  return aiSite(p, i => {
    let s = 0;
    for (const n of NB[i]) {
      if (!known(p, n) || G.bld[n]) continue;
      if (isMine(n) && ((MINE_RES[G.t[n]] === 'food') === (kind === 'granary') || (kind === 'storage' && isMeat(n)))) {
        const d = dropDist(p, n, kind === 'granary' ? 'food' : 'wood');
        if (d >= 2) s += (d - 1) * MINE_CAP;
      }
    }
    return s - D(i, p.city.i) * 0.01;
  }, buildSites(p, kind).filter(i => D(i, p.city.i) <= 8));
}
function aiFoodLeft(p) { // tổng Thức ăn tự nhiên (quả, hươu, voi) AI biết, trong 7 ô quanh Nhà chính
  let s = 0;
  for (let i = 0; i < N * N; i++) if (known(p, i) && isMine(i) && MINE_RES[G.t[i]] === 'food' && D(i, p.city.i) <= 7) s += G.amt[i];
  return s;
}
function aiResearch(p, mil, vills) { // mỗi lượt bắt đầu tối đa 1 nâng cấp: mục đầu tiên đủ điều kiện, còn đủ tiền mua một lính sau khi trả
  if (p.age < 2) return;
  const n = t => mil.filter(u => u.type === t).length, inf = hasTech(p, 'axe') ? 'axe' : 'club';
  const armor = [['armInf', n('club') + n('axe') + n('spear')], ['armArc', n('archer')], ['armCav', n('cav')]].sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const order = [
    ['axe', n('club') >= 2 || countBld(p, 'barracks', true) > 0], // có Lính chùy, hoặc có Nhà lính (sắp mua bộ binh)
    ['tool', true],
    ['farm', countBld(p, 'farm', true) >= 2],
    ['gold', vills.some(v => aiResOf(p, v) === 'gold')],
    ['wood', true],
    ...armor.map(id => [id, true]),
    ['stone', true],
  ];
  const reserve = UNITS[inf].cost;
  for (const [id, cond] of order) {
    if (!cond || hasTech(p, id) || techQueued(p, id)) continue;
    const t = TECHS[id], b = bldOf(p).find(x => x.id === t.at && x.done && !x.queue.length);
    if (!b) continue;
    const need = { ...t.cost }; for (const k in reserve) need[k] = (need[k] || 0) + reserve[k];
    if (!canAfford(p, need)) continue;
    if (research(p, b.tile, id)) return;
  }
}
function aiPickBuilding(p, vills) {
  const wood = p.res.wood, any = id => countBld(p, id, false), room = popCap(p) - popUsed(p);
  const near = min => aiSite(p, i => (D(i, p.city.i) >= min ? -D(i, p.city.i) : -99));
  if (room <= 2 && popCap(p) < POP_MAX && wood >= 30 && !bldOf(p).some(b => b.id === 'house' && !b.done)) { const s = near(2); if (s) return ['house', s.tile]; }
  if (any('granary') < 4 && wood >= 120) { const s = aiDropSite(p, 'granary'); if (s && s.score >= 6) return ['granary', s.tile]; } // thức ăn ở xa: ưu tiên đặt kho sát mỏ
  if (!any('storage') && wood >= 120) { const s = aiDropSite(p, 'storage') || near(2); if (s) return ['storage', s.tile]; }
  if (!any('barracks') && vills >= 5) { // để dành Gỗ cho Nhà lính đầu tiên trước khi xây thứ khác
    if (wood < 175) return null;
    const s = near(2); if (s) return ['barracks', s.tile];
  }
  if (!any('granary') && vills >= 6 && wood >= 120) { const s = aiDropSite(p, 'granary') || near(2); if (s) return ['granary', s.tile]; }
  if (p.age >= 2) {
    if (!any('market') && countBld(p, 'granary', true) && aiFoodLeft(p) < 600) { // đồ ăn quanh nhà sắp cạn: xây Chợ để trồng Ruộng lúa
      if (wood < 150) return null;
      const s = near(2); if (s) return ['market', s.tile];
    }
    if (countBld(p, 'market', true) && any('farm') < 8 && wood >= 75) { const s = aiSite(p, i => (dropDist(p, i, 'food') === 1 ? 1 : -99)); if (s && s.score > 0) return ['farm', s.tile]; }
    if (!any('range') && wood >= 175) { const s = near(2); if (s) return ['range', s.tile]; }
    if (!any('stable') && wood >= 150) { const s = near(2); if (s) return ['stable', s.tile]; }
  }
  if (any('storage') < 4 && wood >= 150) { const s = aiDropSite(p, 'storage'); if (s && s.score >= 3) return ['storage', s.tile]; }
  if (any('granary') < 3 && wood >= 150) { const s = aiDropSite(p, 'granary'); if (s && s.score >= 2) return ['granary', s.tile]; }
  if (any('barracks') < 3 && (wood >= 400 || (p.res.food > 600 && wood >= 175))) { const s = near(2); if (s) return ['barracks', s.tile]; }
  return null;
}
function aiResOf(p, v) { // dân này đang (hoặc sắp) khai thác loại gì
  if (v.build != null) return null;
  const g = gatherAt(p, v.goto != null ? v.goto : v.i);
  return g ? g.res : null;
}
function aiBalance(p, vills) { // tỉ lệ dân mong muốn theo lượng tồn kho, và số dân hiện có theo loại
  const share = p.age === 1 ? { food: 0.5, wood: 0.5, gold: 0 } : { food: 0.4, wood: 0.35, gold: 0.25 };
  if (p.res.food > 500) share.food *= 0.5;
  if (p.res.wood < 150) share.wood *= 1.6;
  if (p.res.gold > 300) share.gold *= 0.4;
  const sum = share.food + share.wood + share.gold, cnt = { food: 0, wood: 0, gold: 0 }, total = Math.max(1, vills.length);
  for (const k in share) share[k] /= sum;
  for (const v of vills) { const r = aiResOf(p, v); if (r in cnt) cnt[r]++; }
  const gap = {}; for (const k in share) gap[k] = share[k] - cnt[k] / total; // dương = đang thiếu dân
  return { share, gap };
}
function aiAssignVillager(p, u, vills, avoid) {
  const { share, gap } = aiBalance(p, vills);
  const order = Object.keys(share).filter(k => share[k] > 0 && k !== avoid).sort((a, b) => gap[b] - gap[a]);
  for (const res of order) {
    let best = -1, bc = Infinity;
    for (let i = 0; i < N * N; i++) {
      if (!known(p, i) || D(i, p.city.i) > 7 || liveElephant(i)) continue; // AI chưa biết săn voi (dễ bị húc), chỉ lấy xác voi đã chết
      const g = gatherAt(p, i); if (!g || g.res !== res) continue;
      const assigned = vills.filter(v => v !== u && (v.goto === i || (v.goto == null && v.i === i))).length;
      if (assigned >= tileCap(i) || G.units.some(e => e.i === i && e.owner !== p.id)) continue;
      const c = g.d * 4 + D(u.i, i) - (g.farm ? 1 : 0);
      if (c < bc) { bc = c; best = i; }
    }
    if (best >= 0) { u.scout = false; if (best !== u.i) { u.goto = best; walk(u, best); if (u.i === best) u.goto = null; } return; }
    if (res === order[0] && !vills.some(v => v !== u && v.scout && v.goto != null)) { // không biết nguồn nào của loại đang cần nhất: cử 1 dân đi dò
      let tgt = -1, td = Infinity;
      for (let i = 0; i < N * N; i++) if (!p.explored[i] && isFinite(TERRAIN[G.t[i]].cost) && D(i, p.city.i) <= 10 && D(i, u.i) < td) { td = D(i, u.i); tgt = i; }
      if (tgt >= 0) { u.scout = true; u.goto = tgt; walk(u, tgt); if (u.i === tgt) u.goto = null; return; }
    }
  }
}
function aiEconomy(p) {
  const c = p.city, mine = myUnits(p.id), vills = mine.filter(isVil), mil = mine.filter(u => !isVil(u));
  const canAge = p.age === 1 && ageReq(p) >= 2, saving = canAge && vills.length >= 8;
  const threat = G.units.some(u => u.owner !== p.id && !isVil(u) && canSee(p.id, u) && D(u.i, c.i) <= 5);
  // Nhà chính: lên đời hoặc ra dân
  if (!c.queue.length) {
    if (saving && p.res.food >= AGE_COST) startAge(p);
    else if (vills.length < (p.age === 1 ? 10 : 16) && (!saving || p.res.food >= AGE_COST + 60)) train(p, 'city', 'vil');
  }
  // Nâng cấp (trước khi mua quân, để Nhà lính rảnh còn kịp nghiên cứu Rìu đồng)
  aiResearch(p, mil, vills);
  // Quân đội
  let queued = bldOf(p).reduce((a, b) => a + b.queue.filter(x => x.kind === 'unit').length, 0);
  const wantMil = Math.min(22, 2 + Math.floor(G.turn / 6));
  for (const b of bldOf(p)) {
    if (!b.done || b.queue.length || !['barracks', 'range', 'stable'].includes(b.id)) continue;
    if (!threat && (mil.length + queued >= wantMil || (saving && p.res.food < AGE_COST + 100))) break;
    const n = t => mil.filter(u => u.type === t).length;
    const inf = hasTech(p, 'axe') ? 'axe' : 'club';
    const id = b.id === 'range' ? 'archer' : b.id === 'stable' ? 'cav' : p.age < 2 ? 'club' : (p.res.gold >= 40 && n('spear') <= n(inf) ? 'spear' : inf);
    if (b.id === 'range' && n('archer') * 3 > mil.length + 2) continue;
    if (train(p, b.tile, id)) queued++;
  }
  // Xây dựng: 1–2 công trường cùng lúc
  if (bldOf(p).filter(b => !b.done).length < (vills.length >= 8 ? 2 : 1)) {
    const plan = aiPickBuilding(p, vills.length);
    if (plan) {
      const w = vills.filter(v => v.build == null).sort((a, b) => D(a.i, plan[1]) - D(b.i, plan[1]))[0];
      if (w && startBuild(p, w, plan[0], plan[1]) && D(w.i, plan[1]) > 1) walk(w, plan[1]);
    }
  }
  // Thỉnh thoảng xét lại dân đang phải đi quá xa
  if (G.turn % 8 === 0) for (const v of vills) { const g = gatherInfo(p, v); if (g && g.d >= 3 && v.goto == null) aiAssignVillager(p, v, vills); }
  for (const v of vills) if (v.build == null && v.goto == null && !gatherAt(p, v.i)) aiAssignVillager(p, v, vills);
  // Cân lại: nếu một loại thừa dân rõ rệt, chuyển 1 dân (người đang đi xa nhất) sang loại đang thiếu
  const { gap } = aiBalance(p, vills), over = Object.keys(gap).sort((a, b) => gap[a] - gap[b])[0];
  if (gap[over] < -0.15) {
    const v = vills.filter(x => x.goto == null && aiResOf(p, x) === over).sort((a, b) => gatherAt(p, b.i).d - gatherAt(p, a.i).d)[0];
    if (v) aiAssignVillager(p, v, vills, over);
  }
}
const armyPower = list => list.reduce((a, m) => a + m.hp * (atkOf(m) + defOf(m)), 0);
async function aiArmy(grp, p, ctx) {
  const human = G.players[0], home = p.city.i, u = grp[0];
  const marching = grp.length >= 4 || (D(u.i, home) > 5 && grp.length >= 2); // đạo đủ đông mới kéo đi
  const rc = reach(u, false, grp);
  let best = null, bs = 0;
  for (const t of attackTargets(grp, rc).values()) {
    let s;
    if (t.tgt.army != null) {
      const ratio = armyPower(grp) / Math.max(1, armyPower(armyAt(t.i, 0))), nearHome = D(t.i, home) <= 5;
      if (ratio < (nearHome ? 0.6 : 0.9)) continue; // không lao vào trận quá bất lợi
      s = 10 * ratio + (nearHome ? 5 : 0);
    } else if (t.tgt.vils != null) s = 8;
    else { if (!marching) continue; s = t.tgt.city ? 6 : 3; }
    if (s > bs) { bs = s; best = t; }
  }
  if (best) {
    const show = human.visible[u.i] || human.visible[best.pos] || human.visible[best.i];
    if (best.pos !== u.i) moveGroup(grp, best.pos, best.cost);
    if (show) await sleep(180);
    if (best.tgt.army != null) {
      const def = armyAt(best.i, 0);
      if (tacticalOn) await askDefense(grp, def); else simBattle(grp, def);
    } else groupAttack(grp, best.tgt);
    if (show) await sleep(220);
    return;
  }
  let dm = null;
  // Ưu tiên gom quân: đạo chưa đủ 4 lính tìm đạo bạn chưa đầy ở gần để nhập vào, trước cả việc đuổi địch
  const mates = grp.length >= 4 ? [] : [...new Set(myUnits(p.id).filter(m => !isVil(m) && m.i !== u.i && D(m.i, u.i) <= 6).map(m => m.i))]
    .map(t => ({ t, n: armyAt(t, p.id).length })).filter(a => a.n + grp.length <= ARMY_MAX && (a.n > grp.length || (a.n === grp.length && a.t < u.i)))
    .sort((a, b) => b.n - a.n || D(u.i, a.t) - D(u.i, b.t));
  if (mates.length) dm = distMap(mates[0].t, u);
  else if (ctx.threats.length) dm = distMap(ctx.threats.slice().sort((a, b) => D(u.i, a) - D(u.i, b))[0], u);
  else if (marching) dm = ctx.dmEnemy;
  else if (D(u.i, home) > 3) dm = ctx.dmHome;
  else return;
  let to = -1, bd = dm[u.i], bc = 0;
  for (const [i, c] of rc) if (dm[i] < bd - 1e-6) { bd = dm[i]; to = i; bc = c; }
  if (to >= 0) {
    const show = human.visible[u.i] || human.visible[to];
    moveGroup(grp, to, bc);
    if (show) await sleep(110);
  }
}
async function aiTurn() {
  const p = G.players[1], human = G.players[0];
  refreshUnits(1); updateVision(p);
  aiEconomy(p);
  const ctx = {
    dmHome: distMap(p.city.i, { owner: p.id }), dmEnemy: distMap(human.city.i, { owner: p.id }, true), // tìm đường tới Nhà chính địch, phá công trình chắn lối nếu cần
    threats: [...new Set(G.units.filter(u => u.owner === 0 && !isVil(u) && canSee(1, u) && D(u.i, p.city.i) <= 5).map(u => u.i))],
  };
  // Tách quân: lính còn ≤ 35% Máu rời đạo (đạo phải còn người ở lại), lui về gần nhà rồi đứng yên hồi máu tới khi đầy
  for (const m of myUnits(1)) {
    if (isVil(m)) continue;
    if (m.rest && m.hp >= ust(m).hp) m.rest = false;
    if (!m.rest && canSplit(m) && m.hp <= ust(m).hp * 0.35 && armyAt(m.i, 1).some(o => o !== m && o.hp > ust(o).hp * 0.35)) m.rest = true;
  }
  for (const m of myUnits(1).filter(x => x.rest && canSplit(x))) {
    if (D(m.i, p.city.i) <= 2) continue; // đã về tới nhà: đứng yên để hồi máu
    const rc = reach(m, false, [m]); let to = -1, bd = ctx.dmHome[m.i], bc = 0;
    for (const [i, c] of rc) if (!armyAt(i, 1).length && ctx.dmHome[i] < bd - 1e-6) { bd = ctx.dmHome[i]; to = i; bc = c; }
    if (to >= 0) moveUnit(m, to, bc);
  }
  const tiles = [...new Set(myUnits(1).filter(u => !isVil(u) && !u.rest).map(u => u.i))];
  for (const t of tiles) {
    if (G.over) return;
    const grp = armyAt(t, 1).filter(m => !m.rest);
    if (!grp.length) continue; // đạo này đã nhập vào đạo khác
    ctx.threats = ctx.threats.filter(i => armyAt(i, 0).length);
    await aiArmy(grp, p, ctx);
  }
}

// ---------- Vòng lượt ----------
async function endTurn() {
  if (!G || G.busy || G.over) return;
  G.busy = true; placing = null; select(null); renderUI();
  autoMoves(0); economy(G.players[0]);
  if (!G.over) await aiTurn();
  if (!G.over) { autoMoves(1); economy(G.players[1]); wildlifeTurn(); }
  if (!G.over) { G.turn++; refreshUnits(0); updateVision(G.players[0]); }
  G.busy = false; renderUI(); saveGame();
}

// ---------- Điều khiển ----------
// Luật tách quân: chọn một hoặc vài lính trong đạo (selPick) rồi bấm ô sáng để đưa họ ra thành đạo mới,
// hoặc bấm vòng đỏ để chỉ nhóm đó giao chiến. Lính đã đánh hoặc hết MP trong lượt thì không tách đi được.
const canSplit = m => m.mp > 0 && !m.attacked;
const selGroup = () => {
  if (!sel) return [];
  if (isVil(sel)) return [sel];
  const st = armyAt(sel.i, sel.owner);
  return selPick ? st.filter(m => selPick.includes(m.id)) : st;
};
function select(u, pick = null) { // pick: id các lính được tách khỏi đạo (null = cả đạo)
  sel = u; selReach = new Map(); selTargets = new Map(); selAtk = new Set(); selPick = null;
  if (u) selB = null;
  if (u && !isVil(u) && pick) {
    const st = armyAt(u.i, u.owner), ids = pick.filter(id => st.some(m => m.id === id && canSplit(m)));
    if (ids.length && ids.length < st.length) { selPick = ids; sel = st.find(m => m.id === ids[0]); }
  }
  if (sel) { const grp = selGroup(); selReach = reach(sel, true, grp); selTargets = attackTargets(grp, selReach); selAtk = atkZone(sel, grp, selReach); }
}
function togglePick(id) { // bấm "Tách" trên một lính: thêm/bớt lính đó khỏi nhóm tách
  if (!sel || isVil(sel)) return;
  const st = armyAt(sel.i, 0), cur = selPick ? [...selPick] : [], k = cur.indexOf(id);
  if (k >= 0) cur.splice(k, 1); else cur.push(id);
  select(st.find(m => m.id === cur[0]) || sel, cur);
}
function splitHalf() { // tách đôi: đưa nửa số lính còn MP ra thành đạo mới
  if (!sel || isVil(sel)) return;
  const st = armyAt(sel.i, 0), free = st.filter(canSplit);
  const ids = free.slice(free.length - Math.min(free.length, Math.floor(st.length / 2))).map(m => m.id);
  if (ids.length) select(st.find(m => m.id === ids[0]), ids);
}
function targetKeyAt(i) {
  const e = G.units.find(x => x.i === i && x.owner === 1 && canSee(0, x));
  if (e) return (isVil(e) ? 'v' : 'a') + i;
  const b = G.bld[i];
  if (b && b.owner === 1 && G.players[0].visible[i]) return 'b' + i;
  if (G.players[1].city.i === i) return 'c';
  return null;
}
function onTileClick(i) {
  if (!G || G.busy || G.over || i < 0) return;
  const me = G.players[0];
  if (placing) { // đang chọn chỗ đặt công trình
    const pl = placing, u = G.units.find(x => x.id === pl.uid); placing = null;
    if (startBuild(me, u, pl.id, i)) {
      log(`Khởi công ${BUILDINGS[pl.id].name}.`, 'info');
      if (D(u.i, i) > 1) walk(u, i);
      select(null);
    }
    renderUI(); return;
  }
  if (sel) {
    const key = targetKeyAt(i), grp = selGroup(), u = sel;
    if (key && selTargets.has(key)) {
      const t = selTargets.get(key);
      if (t.tgt.army != null) { // đạo đấu đạo: mở trận
        if (tacticalOn) { askBattle(grp, t); return; }
        if (t.pos !== u.i) moveGroup(grp, t.pos, t.cost);
        simBattle(grp, armyAt(t.i, 1)); renderUI(); return;
      }
      if (t.pos !== u.i) moveGroup(grp, t.pos, t.cost);
      groupAttack(grp, t.tgt);
      select(G.units.includes(u) ? u : null); renderUI(); return;
    }
    if (selReach.has(i)) { // đi (hoặc nhập vào đạo đang đứng ở ô đó)
      for (const m of grp) { m.goto = null; m.build = null; }
      moveGroup(grp, i, selReach.get(i)); select(u); renderUI(); return;
    }
  }
  const own = unitsAt(i).filter(o => o.owner === 0);
  if (own.length) {
    if (isVil(own[0])) select(own[(own.indexOf(sel) + 1) % own.length]); // bấm lại để đổi dân trong cùng ô
    else select(own.includes(sel) ? sel : own[0]); // bấm ô là chọn cả đạo (hủy nhóm tách nếu có)
    renderUI(); return;
  }
  const ob = G.bld[i], oc = cityAt(i);
  if ((oc && oc.id === 0) || (ob && ob.owner === 0 && !(sel && isVil(sel) && !ob.done))) { // bấm công trình của mình: chọn nó
    selectBld(oc ? 'city' : i); renderUI(); return;
  }
  if (sel) {
    const u = sel, b = G.bld[i], grp = selGroup();
    if (isVil(u) && b && b.owner === 0 && !b.done) { // giao việc xây tiếp công trình dang dở
      u.build = i; u.goto = null; if (D(u.i, i) > 1) walk(u, i);
      select(null); renderUI(); return;
    }
    if (known(me, i) && isFinite(TERRAIN[G.t[i]].cost) && !cityAt(i) && !blockedBld(u, i)) { // lệnh đi xa, tự đi tiếp các lượt sau
      for (const m of grp) { m.goto = i; m.build = null; }
      walk(u, i, grp);
      for (const m of grp) if (m.i === i) m.goto = null;
      select(u); renderUI(); return;
    }
  }
  select(null); selB = null; renderUI();
}
function nextUnit() { // mỗi đạo chỉ tính một lần
  const list = myUnits(0).filter(needsOrders).filter(u => isVil(u) || armyAt(u.i, 0).find(needsOrders) === u);
  if (!list.length) return;
  const cur = sel && !isVil(sel) ? armyAt(sel.i, 0).find(needsOrders) : sel;
  select(list[(list.indexOf(cur) + 1) % list.length]); renderUI();
}

const cv = document.getElementById('cv'), ctx2 = cv.getContext('2d'), tip = document.getElementById('tip');
cv.width = W * 2; cv.height = H * 2; cv.style.aspectRatio = `${W}/${H}`;
function tileFromEvent(e) {
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
  let best = -1, bd = S * S;
  for (let i = 0; i < N * N; i++) { const dx = CEN[i].x - x, dy = CEN[i].y - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
  return best;
}
cv.addEventListener('click', e => onTileClick(tileFromEvent(e)));
cv.addEventListener('contextmenu', e => { e.preventDefault(); if (G && !G.busy) { placing = null; select(null); selB = null; renderUI(); } });
cv.addEventListener('mouseleave', () => { hover = -1; tip.style.display = 'none'; });
cv.addEventListener('mousemove', e => {
  if (!G) return;
  hover = tileFromEvent(e);
  const html = hover >= 0 ? tipHtml(hover) : '';
  if (!html) { tip.style.display = 'none'; return; }
  const wr = cv.parentElement.getBoundingClientRect();
  tip.innerHTML = html; tip.style.display = 'block';
  let x = e.clientX - wr.left + 16, y = e.clientY - wr.top + 16;
  if (x + 250 > wr.width) x -= 270;
  if (y + tip.offsetHeight > wr.height) y -= tip.offsetHeight + 24;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
});
document.addEventListener('keydown', e => {
  if (!G || document.getElementById('overlay').classList.contains('show')) return;
  if (e.key === 'Enter') { e.preventDefault(); endTurn(); }
  else if (e.key === 'n' || e.key === 'N' || e.key === 'Tab') { e.preventDefault(); if (!G.busy) nextUnit(); }
  else if (e.key === 'Escape') { placing = null; select(null); selB = null; renderUI(); }
  else if ((e.key === 'h' || e.key === 'H') && !G.busy) { selectBld('city'); renderUI(); }
  else if (['1', '2', '3'].includes(e.key)) { tab = ['eco', 'mil', 'tech'][+e.key - 1]; renderUI(); }
  else if (e.key === 'm' || e.key === 'M') toggleMini();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const [act, a, c] = b.dataset.act.split(':');
  if (act === 'start') { newGame(); return; }
  if (act === 'menu') { showMenu(); return; }
  if (act === 'continue') { if (!loadGame()) showMenu(); return; }
  if (act === 'help') { showHelp(); return; }
  if (act === 'close') { document.getElementById('overlay').classList.remove('show'); return; }
  if (act === 'mini') { toggleMini(); return; }
  if (act === 'admin') { showAdmin(); return; }
  if (act === 'cfg') { adminAct(a); return; }
  if (act === 'unselb') { selB = null; renderUI(); return; }
  if (act === 'mapmode') { setMapMode(a); showMenu(); return; }
  if (act === 'tac') {
    tacticalOn = !tacticalOn;
    try { localStorage.setItem('tac', tacticalOn ? '1' : '0'); } catch (err) { /* bỏ qua */ }
    if (G) renderUI();
    return;
  }
  if (act === 'bt') { battleChoice(a); return; }
  if (act === 'b') { battleAct(a); return; }
  if (!G || G.busy || G.over) return;
  const me = G.players[0], where = a === 'city' ? 'city' : +a;
  if (act === 'end') { endTurn(); return; }
  if (act === 'next') { nextUnit(); return; }
  if (act === 'sel') { const u = G.units.find(x => x.id === +a && x.owner === 0); if (u) select(u); }
  else if (act === 'pick') togglePick(+a);
  else if (act === 'splithalf') splitHalf();
  else if (act === 'unpick' && sel) select(sel);
  else if (act === 'selb') selectBld(a === 'city' ? 'city' : +a);
  else if (act === 'tab') tab = a;
  else if (act === 'logtoggle') logOpen = !logOpen;
  else if (act === 'train') train(me, where, c);
  else if (act === 'age') { if (startAge(me)) log('Bắt đầu tiến lên Đời Công Cụ.', 'info'); }
  else if (act === 'canceltrain') cancelTrain(me, where);
  else if (act === 'research') research(me, where, c);
  else if (act === 'techgo') { const b = bldOf(me).find(x => x.id === a && x.done); if (b) selectBld(b.tile); }
  else if (act === 'bld') { if (sel && isVil(sel)) placing = { id: a, uid: sel.id }; }
  else if (act === 'unplace') placing = null;
  else if (act === 'stop' && sel) { for (const m of selGroup()) { m.goto = null; m.build = null; } }
  renderUI();
});

function tipHtml(i) {
  const me = G.players[0];
  if (!known(me, i)) return 'Vùng chưa khám phá';
  // bản đồ sáng: ô chưa khám phá chỉ cho biết địa hình, tài nguyên; nhà và Nhà chính địch ở đó vẫn bị giấu
  const T = TERRAIN[G.t[i]], b = me.explored[i] ? G.bld[i] : null, c = me.explored[i] ? cityAt(i) : null;
  let h = `<b>${T.name}</b> · ${isFinite(T.cost) ? T.cost + ' MP' : 'không thể đi qua'}${T.def ? ' · +' + T.def + ' Thủ' : ''}`;
  if (c) h = `<b>Nhà chính ${c.id ? 'địch' : 'của bạn'}</b>` + (me.visible[i] || !c.id ? `<br>Máu ${c.city.hp}/${c.city.maxHp}` : '');
  if (b) {
    h += `<br>${BUILDINGS[b.id].ico} <b>${BUILDINGS[b.id].name}</b> của ${b.owner ? 'địch' : 'bạn'} · Máu ${b.hp}/${b.max}`;
    if (!b.done) h += `<br><span class="warn">Đang xây ${b.prog}/${b.need} lượt${b.owner === 0 && !G.units.some(u => u.build === i) ? ' — chưa có dân xây (chọn dân rồi bấm vào đây)' : ''}</span>`;
    if (!b.done && b.owner === 0) h += `<br><span class="muted">👷 ${G.units.filter(u => u.build === i).length} dân đang xây · chọn thêm dân rồi bấm vào đây để xây nhanh hơn</span>`;
    if (b.id === 'farm' && b.done) h += `<br>Còn ${b.amt} ${resIco('food')}`;
  } else if (G.t[i] === EMPTY && terrOf(me).has(i)) h +=`<br><span class="muted">Có thể đặt công trình tại đây</span>`;
  if (G.t[i] === DEER) h += isDead(i) ? `<br><span class="warn">🦴 Xác hươu: dân vào ô này để xẻ thịt. Xác thối rữa mất ${CARCASS_ROT} thịt mỗi lượt.</span>`
    : `<br><span class="muted">🦌 ${ANIMAL_MP} MP/vòng${G.scare && G.scare[i] != null ? ' · <b>đang hoảng</b>, sang lượt mới sẽ chạy' : ''}. Dừng quân hoặc dân sát bên là hươu hoảng, sang lượt mới hươu chạy 1 ô ngược hướng: lùa hươu về gần Nhà chính rồi cho dân vào hẳn ô hươu để hạ và xẻ thịt.</span>`;
  if (G.t[i] === ELEPHANT) h += isDead(i) ? `<br><span class="warn">🦴 Xác voi: dân vào ô này để xẻ thịt. Xác thối rữa mất ${CARCASS_ROT} thịt mỗi lượt.</span>`
    : `<br><span class="warn">🐘 Máu voi <b>${eleHp(i)}/${ELEPHANT_HP}</b> · ${ANIMAL_MP} MP/vòng. Dân đứng trên ô voi mỗi lượt đánh ${HUNT_DMG} (ít nhất ${Math.ceil(ELEPHANT_HP / HUNT_DMG)} đòn mới hạ được), hạ xong mới xẻ thịt. Cuối mỗi vòng voi dùng ${ANIMAL_MP} MP: húc lại một người trên ô; nếu không ai săn thì húc dân làng đứng sát bên (-${ELEPHANT_DMG} Máu), hoặc tiến 1 ô lại gần dân cách 2 ô (vòng sau mới húc).</span>`;
  if (MINE_RES[G.t[i]]) h += `<br>Trữ lượng còn: <b>${G.amt[i]}</b> ${resIco(MINE_RES[G.t[i]])}`;
  const g = gatherAt(me, i);
  if (g) {
    const n = unitsAt(i).filter(u => u.owner === 0 && isVil(u)).length;
    h += `<br>Khai thác: ${resIco(g.res)}${g.load} mỗi chuyến · <b>${g.d} lượt/chuyến</b><br><span class="muted">👷 ${n}/${tileCap(i)} dân · đặt kho gần hơn để rút ngắn chuyến</span>`;
  }
  const us = unitsAt(i).filter(u => canSee(0, u));
  if (us.length > 1 && !isVil(us[0])) h += `<hr style="border-color:#445;margin:4px 0"><b>Đạo quân ×${us.length}</b> (${us[0].owner ? 'địch' : 'bạn'})`;
  for (const u of us.slice(0, 5)) {
    const s = ust(u);
    h += `<hr style="border-color:#445;margin:4px 0"><b>${s.ico} ${s.name}</b> (${u.owner ? 'địch' : 'bạn'})<br>Máu ${u.hp}/${s.hp}` + (s.atk ? ` · Công ${withBonus(s.atk, atkBonus(u))} · Thủ ${withBonus(s.def, defBonus(u))}` : ' · không chiến đấu');
  }
  if (us.length && !G.busy) {
    const u0 = us[0], own = u0.owner === 0, armed = us.some(u => ust(u).atk > 0);
    if (!own) h += `<br><span class="muted">Viền cam: địch đi tới được ở lượt của nó${armed ? ' · đỏ: ô nó đánh tới được' : ''}</span>`;
    else if (!(sel && selGroup().includes(u0))) h += `<br><span class="muted">Viền trắng: tầm đi${armed ? ' · đỏ: tầm đánh' : ''}${u0.mp <= 0 ? ' (lượt sau)' : ''}</span>`;
  }
  if (sel && selAtk.has(i) && !targetKeyAt(i)) h += `<br><span class="muted">Trong tầm đánh của quân đang chọn</span>`;
  const key = sel ? targetKeyAt(i) : null;
  if (key && selTargets.has(key)) {
    const t = selTargets.get(key);
    const grp = selGroup(), hit = grp.filter(m => ust(m).atk > 0).length;
    h += `<br><span class="warn">⚔ ${t.tgt.army != null ? `Giao chiến: ${grp.length} quân ta đấu ${armyAt(i, 1).length} quân địch` : `${hit} đòn đánh`}</span>`;
  }
  return h;
}

// ---------- Giao diện ----------
// Hàng chờ mua của một nhà: mục đang làm (thanh tiến độ) và các mục xếp sau
function queueProgressHtml(where, q) {
  const item = x => (x.kind === 'age' ? { ico: '⬆️', name: 'Lên Đời Công Cụ', turns: AGE_TURNS } : x.kind === 'tech' ? TECHS[x.id] : UNITS[x.id]);
  if (!q.queue.length) return '<div class="muted">Chưa mua gì. Bấm một mục bên dưới để mua.</div>';
  const cur = q.queue[0], d = item(cur), rest = q.queue.slice(1);
  return `<div class="row"><span>${d.ico} ${d.name}</span><span>còn ${cur.left} lượt</span></div>
    <div class="bar prod"><i style="width:${Math.min(100, (1 - cur.left / d.turns) * 100)}%"></i></div>
    ${rest.length ? `<div class="tags">Chờ (${rest.length}/${QUEUE_MAX - 1}): ${rest.map(x => `<span>${item(x).ico} ${item(x).name}</span>`).join('')}</div>` : ''}
    <button class="opt" data-act="canceltrain:${where}">✖ Hủy mục cuối hàng chờ (hoàn lại tài nguyên)</button>`;
}
// Nút mua quân của một nhà, kèm chỉ số của quân đó
function trainOptsHtml(p, where, q, opts) {
  const full = popUsed(p) >= popCap(p), qfull = q.queue.length >= QUEUE_MAX;
  return opts.map(id => {
    const d = UNITS[id];
    const st = `❤${d.hp} · ⚔${withBonus(d.atk, techSum(p, 'atk', id))} · 🛡${withBonus(d.def, techSum(p, 'def', id))} · ${d.mp} MP${d.range > 1 ? ` · tầm ${d.range}` : ''}`;
    const note = full ? '⚠ Hết chỗ dân số — xây thêm Nhà dân' : qfull ? `Hàng chờ đã đầy (${QUEUE_MAX})` : q.queue.length ? 'Bấm để xếp thêm vào hàng chờ' : d.desc;
    return `<button class="opt" data-act="train:${where}:${id}" ${canAfford(p, d.cost) && !full && !qfull ? '' : 'disabled'}>${d.ico} ${d.name}<span class="c">${costStr(d.cost)} · ${d.turns} lượt</span><span class="d">${st}<br>${note}</span></button>`;
  }).join('');
}
// Nút nghiên cứu của một nhà: đã xong ✅, đang nghiên cứu (ở đây hoặc nhà khác cùng loại), khóa theo đời, hoặc mua được
function techState(p, id) {
  const t = TECHS[id];
  if (hasTech(p, id)) return { done: true, txt: '✅ Đã nghiên cứu' };
  for (const b of bldOf(p)) { const k = b.queue.findIndex(x => x.kind === 'tech' && x.id === id); if (k >= 0) return { busy: true, txt: k ? '⏳ Đang chờ trong hàng' : `⏳ Đang nghiên cứu · còn ${b.queue[k].left} lượt` }; }
  if (t.age > p.age) return { locked: true, txt: '🔒 Cần Đời Công Cụ' };
  return { txt: '' };
}
function techOptsHtml(p, where, b) {
  return Object.entries(TECHS).filter(([, t]) => t.at === b.id).map(([id, t]) => {
    const st = techState(p, id), qfull = b.queue.length >= QUEUE_MAX;
    const ok = !st.txt && !qfull && canAfford(p, t.cost);
    const note = st.txt || (qfull ? `Hàng chờ đã đầy (${QUEUE_MAX})` : '');
    return `<button class="opt${st.done ? ' on' : ''}" data-act="research:${where}:${id}" ${ok ? '' : 'disabled'}>${t.ico} ${t.name}<span class="c">${st.done ? '✅' : `${costStr(t.cost)} · ${t.turns} lượt`}</span><span class="d">${t.desc}${note ? '<br>' + note : ''}</span></button>`;
  }).join('');
}
function techTabHtml(p) { // tab Kỹ thuật: 9 nâng cấp chia theo nhà, bấm để mở nhà đó
  let h = '';
  for (const at of ['storage', 'market', 'barracks']) {
    const has = bldOf(p).some(b => b.id === at && b.done), list = Object.entries(TECHS).filter(([, t]) => t.at === at);
    h += `<div class="card"><h3>⬆️ Nâng cấp · ${BUILDINGS[at].ico} ${BUILDINGS[at].name}</h3>${list.map(([id, t]) => {
      const st = techState(p, id);
      return `<button class="opt${st.done ? ' on' : ''}" data-act="techgo:${at}" ${has ? '' : 'disabled'}>${t.ico} ${t.name}<span class="c">${st.done ? '✅ xong' : st.busy ? st.txt : st.locked ? '🔒 Đời 2' : 'chưa có'}</span><span class="d">${t.desc}</span></button>`;
    }).join('')}${has ? '' : `<div class="muted">Chưa có ${BUILDINGS[at].name}${BUILDINGS[at].age > p.age ? ' (mở ở Đời Công Cụ)' : ''}. Xây một nhà để nghiên cứu.</div>`}</div>`;
  }
  return h;
}
function unitStatus(p, u) {
  if (!isVil(u)) return u.goto != null ? '🚩 đang hành quân' : u.attacked ? '⚪ đã đánh' : u.mp > 0 ? `🟢 còn ${u.mp} MP` : '⚪ hết MP';
  if (u.build != null && G.bld[u.build]) { const b = G.bld[u.build]; return `🔨 xây ${BUILDINGS[b.id].name} ${b.prog}/${b.need}${D(u.i, u.build) > 1 ? ' (đang tới)' : ''}`; }
  if (u.goto != null) return '🚩 đang di chuyển';
  if (u.attacked) return '⚪ đã đánh lượt này';
  if (liveElephant(u.i)) return `🗡 đang săn voi (voi còn ${eleHp(u.i)}/${ELEPHANT_HP} Máu)`;
  const g = gatherAt(p, u.i);
  return g ? `⛏ ${resIco(g.res)} ${g.d} lượt/chuyến` : '🟢 rảnh';
}
function selectBld(x) { select(null); selB = x; } // x: 'city' hoặc ô của công trình
function ageUnlocks(age) { // những gì một đời mở khóa
  const b = Object.values(BUILDINGS).filter(d => d.age === age).map(d => `${d.ico} ${d.name}`);
  const u = Object.values(UNITS).filter(d => d.age === age).map(d => `${d.ico} ${d.name}`);
  return `<div class="tags">${[...b, ...u].map(x => `<span>${x}</span>`).join('')}</div>`;
}
function renderUI() {
  const me = G.players[0], c = me.city, inc = incomeEst(me);
  if (selB != null && selB !== 'city' && !(G.bld[selB] && G.bld[selB].owner === 0)) selB = null;
  const all = myUnits(0), vills = all.filter(isVil), army = all.filter(u => !isVil(u));
  const stacks = [...new Set(army.map(u => u.i))].map(t => armyAt(t, 0));
  const idleV = vills.filter(needsOrders).length, idleA = stacks.filter(st => st.some(needsOrders)).length, idle = idleV + idleA;
  const stat = k => `<span class="stat" title="${RES_NAME[k]} (ước tính thu mỗi lượt)">${resIco(k)} <b>${me.res[k]}</b><small>+${inc[k]}</small></span>`;
  document.getElementById('top').innerHTML = `
    <span class="stat">Lượt <b>${G.turn}</b></span>
    <span class="stat age">${AGES[me.age]}</span>
    ${stat('food')}${stat('wood')}${stat('stone')}${stat('gold')}
    <span class="stat" title="Dân số đang dùng / giới hạn (dân làng + quân). Mỗi Nhà dân +${CFG.pop.perHouse}, tối đa ${POP_MAX}">👥 <b>${popUsed(me)}/${popCap(me)}</b></span>
    <span class="spacer"></span>
    <button class="btn" data-act="tac" title="Khi hai đạo quân giao chiến: hỏi chọn Chỉ huy trực tiếp, hay luôn tính tự động">⚔ Trận đánh: ${tacticalOn ? 'Hỏi' : 'Tự động'}</button>
    <button class="btn" data-act="admin" title="Cấu hình giá và hệ thống kinh tế (dành cho người quản lý trò chơi)">⚙ Quản trị</button>
    <button class="btn" data-act="mini" title="Ẩn/hiện bản đồ con (phím M)">🗺 Bản đồ con: ${miniOn ? 'Hiện' : 'Ẩn'}</button>
    <button class="btn" data-act="help">Hướng dẫn</button>
    <button class="btn${idle ? ' attn' : ''}" data-act="next" ${idle ? '' : 'disabled'}>Đơn vị rảnh (N) · ${idle}</button>
    <button class="btn primary" data-act="end" ${G.busy ? 'disabled' : ''}>${G.busy ? 'Địch đang đi…' : 'Kết thúc lượt (Enter)'}</button>`;

  // ----- 1) Đang chọn: đổi theo thứ vừa bấm trên bản đồ -----
  const hint = '<div class="muted">Ô sáng: đi ngay · Ô xa: tự đi nhiều lượt · Chuột phải/Esc: bỏ chọn</div>';
  let h = '';
  if (sel && isVil(sel)) {
    const s = ust(sel), freeN = freeSites(me).length;
    h += `<div class="card ctx"><h3>${s.ico} ${s.name}</h3>
      <div class="row"><span>Máu ${sel.hp}/${s.hp}</span><span>Di chuyển ${sel.mp}/${s.mp}</span></div>
      <div class="muted">${unitStatus(me, sel)} — ${s.desc}</div>${hint}
      ${sel.goto != null || sel.build != null ? '<button class="opt" data-act="stop">✋ Dừng việc đang làm</button>' : ''}`;
    h += placing ? `<div class="place">📍 Bấm một ô <b>Đất trống</b> viền vàng để đặt ${BUILDINGS[placing.id].name}${BUILDINGS[placing.id].drop ? ' (kho đặt được cả ngoài lãnh thổ)' : ''}. <button class="btn" data-act="unplace">Hủy</button></div>`
      : `<h3 style="margin-top:8px">🔨 Xây dựng</h3>`;
    for (const [id, d] of Object.entries(BUILDINGS)) {
      const locked = d.age > me.age, needs = d.req && !countBld(me, d.req, true);
      const desc = id === 'farm' ? `1 dân, ${FARM_LOAD} Thức ăn/chuyến, cạn sau ${farmAmtOf(me)}${hasTech(me, 'farm') ? ' (nhờ Thuần hóa)' : ''}` : d.desc;
      h += `<button class="opt" data-act="bld:${id}" ${!locked && !needs && canAfford(me, d.cost) && (freeN || d.drop) ? '' : 'disabled'}>${d.ico} ${d.name}<span class="c">${costStr(d.cost)} · ${d.turns} lượt</span><span class="d">${locked ? '🔒 Cần Đời Công Cụ' : needs ? `🔒 Cần xây xong ${BUILDINGS[d.req].name}` : desc}</span></button>`;
    }
    h += `</div>`;
  } else if (sel) {
    const grp = selGroup(), stack = armyAt(sel.i, 0), picking = !!selPick;
    h += `<div class="card ctx"><h3>⚔ Đạo quân · ${stack.length}/${ARMY_MAX}${picking ? ` <small class="muted">· đang tách ${grp.length} lính</small>` : ''}</h3>
      <div class="muted">${picking ? 'Nhóm tách' : 'Cả đạo'} còn ${Math.min(...grp.map(m => m.mp))} MP (theo quân chậm nhất) · ${unitStatus(me, sel)}</div>
      <div class="legend"><span><i class="lg mv"></i>Tầm đi: ${selReach.size} ô</span><span><i class="lg atk"></i>Tầm đánh: ${selAtk.size} ô${selTargets.size ? ` · ${selTargets.size} mục tiêu` : ''}</span></div>
      ${stack.map(m => {
        const s = ust(m), on = picking && selPick.includes(m.id), why = m.attacked ? 'đã đánh' : m.mp <= 0 ? 'hết MP' : '';
        const btn = stack.length > 1 ? (why ? `<span class="muted">${why}</span>` : `<button class="btn sm${on ? ' primary' : ''}" data-act="pick:${m.id}" title="Chọn lính này vào nhóm tách">${on ? '☑' : '☐'} Tách</button>`) : '';
        return `<div class="row mem${on ? ' on' : ''}"><span>${s.ico} ${s.name} · ❤${m.hp}/${s.hp} · ⚔${withBonus(s.atk, atkBonus(m))} 🛡${withBonus(s.def, defBonus(m))} · ${m.mp} MP</span>${btn}</div>`;
      }).join('')}
      ${stack.length > 1 ? `<div class="row" style="gap:6px;justify-content:flex-start">${picking ? '<button class="btn sm" data-act="unpick">✖ Hủy tách</button>' : `<button class="btn sm" data-act="splithalf" ${stack.filter(canSplit).length ? '' : 'disabled'}>✂ Tách đôi</button>`}</div>` : ''}
      <div class="muted">${picking ? `Đang tách ${grp.length} lính khỏi đạo: bấm ô sáng để đưa họ ra thành đạo mới, hoặc bấm vòng đỏ để chỉ nhóm này giao chiến. Phần còn lại đứng yên.`
        : `Đi vào ô có đạo của mình để nhập (tối đa ${ARMY_MAX}). Đứng kề địch rồi bấm vòng đỏ để giao chiến.${stack.length > 1 ? ' Bấm “Tách” trên từng lính (hoặc “Tách đôi”) để chia đạo.' : ''}`}</div>${hint}
      ${grp.some(m => m.goto != null) ? '<button class="opt" data-act="stop">✋ Dừng hành quân</button>' : ''}</div>`;
  } else if (selB != null) {
    // Đang chọn một nhà: chỉ hiện quân mua ở nhà này, hàng chờ mua và nâng cấp của nhà này (ẩn tab tổng quan và nhật ký)
    const isCity = selB === 'city', b = isCity ? null : G.bld[selB], d = isCity ? null : BUILDINGS[b.id];
    const where = isCity ? 'city' : b.tile, q = isCity ? c : b;
    const trains = isCity ? ['vil'] : b.done && TRAINS[b.id] ? trainList(me, b.id) : [];
    h += `<div class="card ctx"><div class="row"><h3>${isCity ? '🏠 Nhà chính' : `${d.ico} ${d.name}`}</h3><button class="btn sm" data-act="unselb" title="Bỏ chọn (Esc)">✖ Đóng</button></div>
      <div class="row"><span>Máu ${isCity ? `${c.hp}/${c.maxHp}` : `${b.hp}/${b.max}`}</span><span>${isCity ? `Dân số ${popUsed(me)}/${popCap(me)}` : b.done ? 'Hoạt động' : `Đang xây ${b.prog}/${b.need}`}</span></div>
      ${isCity ? '' : `<div class="muted">${d.desc}${b.id === 'farm' && b.done ? ` · còn ${b.amt} ${resIco('food')}` : ''}</div>`}</div>`;
    if (!isCity && !b.done) {
      const n = G.units.filter(u => u.build === b.tile).length;
      h += `<div class="card"><h3>🚧 Đang xây</h3><div class="bar prod"><i style="width:${b.prog / b.need * 100}%"></i></div><div class="${n ? 'muted' : 'place'}">👷 ${n} dân đang xây. Chọn một dân rồi bấm vào công trình này để ${n ? 'cùng xây cho nhanh' : 'bắt đầu xây'}.</div></div>`;
    } else {
      if (trains.length || q.queue.length) {
        h += `<div class="card"><h3>⏳ Hàng chờ${q.queue.length ? ` · ${q.queue.length}/${QUEUE_MAX}` : ''}</h3>${queueProgressHtml(where, q)}</div>`;
        if (trains.length) h += `<div class="card"><h3>🧑 Quân mua tại đây</h3>${trainOptsHtml(me, where, q, trains)}</div>`;
      }
      let up = '';
      if (isCity && me.age === 1 && !c.queue.some(x => x.kind === 'age')) {
        const req = ageReq(me);
        up += `<button class="opt" data-act="age" ${req >= 2 && me.res.food >= AGE_COST ? '' : 'disabled'}>⬆️ Lên Đời Công Cụ<span class="c">🍖${AGE_COST} · ${AGE_TURNS} lượt</span><span class="d">Cần 2 trong 3: Kho thực phẩm, Kho tài nguyên, Nhà lính (đang có ${req}/2)</span></button>`;
      }
      if (!isCity) up += techOptsHtml(me, where, b);
      h += `<div class="card"><h3>⬆️ Nâng cấp</h3>${up || '<div class="muted">Hiện chưa có nâng cấp nào tại nhà này.</div>'}</div>`;
    }
    document.getElementById('side').innerHTML = h;
    return;
  } else {
    h += `<div class="card ctx"><h3>Chưa chọn gì</h3><div class="muted">Bấm một đơn vị hoặc công trình trên bản đồ để xem lệnh của nó.<br><b>H</b>: Nhà chính · <b>N</b>: đơn vị rảnh kế tiếp · <b>1 2 3</b>: đổi tab</div></div>`;
  }

  // ----- 2) Ba tab tổng quan -----
  const tabBtn = (id, label, n) => `<button class="tab${tab === id ? ' on' : ''}" data-act="tab:${id}">${label}${n ? ` <i>${n}</i>` : ''}</button>`;
  h += `<div class="tabs">${tabBtn('eco', '💰 Kinh tế', idleV)}${tabBtn('mil', '⚔ Quân sự', idleA)}${tabBtn('tech', '🔧 Kỹ thuật', 0)}</div>`;
  const unitRow = (u, label, on) => { const ready = (isVil(u) ? [u] : armyAt(u.i, 0)).some(needsOrders); return `<button class="opt unit ${ready ? 'ready' : 'spent'}${on ? ' on' : ''}" data-act="sel:${u.id}">${label}<span class="c">${unitStatus(me, u)}</span></button>`; };
  const qIcons = q => (q.queue.length ? q.queue.map(x => (x.kind === 'age' ? '⬆️' : x.kind === 'tech' ? TECHS[x.id].ico : UNITS[x.id].ico)).join('') + ` · còn ${q.queue[0].left} lượt` : 'rảnh');
  const mine = bldOf(me);
  if (tab === 'eco') {
    h += `<div class="card"><h3>Thu nhập mỗi lượt (ước tính)</h3>
      <div class="tags">${Object.keys(inc).map(k => `<span>${resIco(k)} +${inc[k]}</span>`).join('')}<span>👥 ${popUsed(me)}/${popCap(me)}</span></div>
      <button class="opt${selB === 'city' ? ' on' : ''}" data-act="selb:city">🏠 Nhà chính<span class="c">${qIcons(c)}</span></button></div>`;
    h += `<div class="card"><h3>👷 Dân làng · ${vills.length} (${idleV} rảnh)</h3>${vills.map(u => unitRow(u, `${ust(u).ico} Dân làng · ❤${u.hp}/${ust(u).hp}`, u === sel)).join('') || '<div class="muted">Không còn dân làng. Bấm Nhà chính để mua.</div>'}</div>`;
    const sites = mine.filter(b => !b.done), eco = mine.filter(b => b.done && !TRAINS[b.id]);
    if (sites.length) h += `<div class="card"><h3>🚧 Đang xây</h3>${sites.map(b => `<button class="opt${selB === b.tile ? ' on' : ''}" data-act="selb:${b.tile}">${BUILDINGS[b.id].ico} ${BUILDINGS[b.id].name}<span class="c">${b.prog}/${b.need}${G.units.some(u => u.build === b.tile) ? '' : ' · ⚠ chưa có dân xây'}</span></button>`).join('')}</div>`;
    if (eco.length) { const cnt = {}; for (const b of eco) cnt[b.id] = (cnt[b.id] || 0) + 1; h += `<div class="card"><h3>Công trình kinh tế</h3><div class="tags">${Object.entries(cnt).map(([id, n]) => `<span>${BUILDINGS[id].ico} ${BUILDINGS[id].name} ×${n}</span>`).join('')}</div></div>`; }
  } else if (tab === 'mil') {
    h += `<div class="card"><h3>⚔ Đạo quân · ${stacks.length} đạo, ${army.length} lính</h3>${stacks.map(st => unitRow(st[0], `Đạo ×${st.length} ${st.map(m => ust(m).ico).join('')}`, st.includes(sel))).join('') || '<div class="muted">Chưa có quân.</div>'}</div>`;
    const tb = mine.filter(b => b.done && TRAINS[b.id]);
    h += `<div class="card"><h3>Nhà huấn luyện</h3>${tb.map(b => `<button class="opt${selB === b.tile ? ' on' : ''}" data-act="selb:${b.tile}">${BUILDINGS[b.id].ico} ${BUILDINGS[b.id].name}<span class="c">${qIcons(b)}</span></button>`).join('') || '<div class="muted">Chưa có. Chọn một dân làng rồi xây Nhà lính.</div>'}
      <div class="muted" style="margin-top:4px">Bấm một nhà để mua quân của nhà đó.</div></div>`;
  } else {
    const req = AGE_REQ.map(id => `<span>${countBld(me, id, true) ? '✅' : '⬜'} ${BUILDINGS[id].name}</span>`).join('');
    const aging = c.queue.find(x => x.kind === 'age');
    h += `<div class="card"><h3>Kỷ nguyên: ${AGES[me.age]}</h3>`;
    if (me.age === 1) h += `<div class="muted">Lên Đời Công Cụ: 🍖${AGE_COST}, ${AGE_TURNS} lượt, cần 2 trong 3 công trình:</div><div class="tags">${req}</div>
      ${aging ? `<div class="place" style="margin-top:6px">⬆️ Đang lên đời — còn ${aging.left} lượt.</div>` : `<button class="opt" data-act="selb:city">🏠 Mở Nhà chính để lên đời<span class="c">${ageReq(me)}/2 · 🍖${me.res.food}/${AGE_COST}</span></button>`}`;
    else h += `<div class="muted">Bạn đã ở đời cao nhất của phiên bản này.</div>`;
    h += `</div><div class="card"><h3>Đời 1 · Đồ Đá mở khóa</h3>${ageUnlocks(1)}</div><div class="card"><h3>Đời 2 · Công Cụ mở khóa</h3>${ageUnlocks(2)}<div class="muted" style="margin-top:4px">Và lãnh thổ rộng thêm 1 vòng.</div></div>
`;
    h += techTabHtml(me);
  }
  // ----- 3) Nhật ký thu gọn được -----
  const last = G.log[G.log.length - 1];
  h += `<div class="card"><h3 class="fold" data-act="logtoggle">${logOpen ? '▾' : '▸'} Nhật ký</h3><div id="log">${logOpen ? G.log.slice().reverse().map(l => `<div class="${l.cls}">[${l.t}] ${l.msg}</div>`).join('') : (last ? `<div class="${last.cls}">[${last.t}] ${last.msg}</div>` : '')}</div></div>`;
  document.getElementById('side').innerHTML = h;
}

function showMenu() {
  const o = document.getElementById('overlay');
  o.innerHTML = `<div class="modal"><h1>Bình Minh Bộ Tộc</h1>
    <div class="muted">Chiến thuật theo lượt · bản đồ hex 15×15 · 1 người chơi đấu 1 AI · Đời Đồ Đá → Đời Công Cụ</div>
    <h2>Khởi đầu</h2>
    <ul><li>${CFG.start.villagers} dân làng, 🍖${CFG.start.food} 🪵${CFG.start.wood} 🪨${CFG.start.stone} 🪙${CFG.start.gold}, một Nhà chính. Trong vòng 4 ô quanh nhà luôn có ${homeText()}.</li><li>Dân làng là quân cờ: bạn tự đưa họ đi khai thác, xây dựng, dò bản đồ.</li></ul>
    <h2>Điều kiện thắng</h2>
    <ul><li>Tiêu diệt Nhà chính đối phương.</li></ul>
    <h2>Bản đồ ván mới</h2>
    <div class="civs">${Object.entries(MAP_MODES).map(([k, m]) => `<button class="civ${mapMode === k ? ' on' : ''}" data-act="mapmode:${k}"><b>${m.name}</b><span class="muted">${m.desc}</span></button>`).join('')}</div>
    ${(() => { // nút tiếp tục khi có ván đã lưu (ván đang chơi dở trên trang này cũng được tự lưu)
      saveGame(); const s = readSave(); if (!s) return '';
      const d = new Date(s.at), when = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} ${d.getDate()}/${d.getMonth() + 1}`;
      return `<p><button class="btn primary" data-act="continue">▶ Tiếp tục ván (Lượt ${s.G.turn} · ${AGES[s.G.players[0].age]} · ${s.G.reveal ? 'bản đồ sáng' : 'bản đồ tối'})</button> <span class="muted">lưu lúc ${when}</span></p>
        <p class="muted">Bắt đầu ván mới sẽ thay ván đang lưu.</p>`;
    })()}
    <p><button class="btn${readSave() ? '' : ' primary'}" data-act="start">Bắt đầu ván mới</button> <button class="btn" data-act="help">Hướng dẫn</button> <button class="btn" data-act="admin">⚙ Quản trị kinh tế</button></p>
    ${cfgChanged() ? '<p class="muted">⚙ Đang dùng cấu hình kinh tế đã chỉnh (khác mặc định).</p>' : ''}</div>`;
  o.classList.add('show');
}
function showHelp() {
  const o = document.getElementById('overlay');
  o.innerHTML = `<div class="modal"><h1>Hướng dẫn</h1>
    <h2>Điều khiển</h2><ul>
      <li>Bấm vào đơn vị của bạn để chọn; bấm ô sáng để đi ngay; bấm một ô xa để đơn vị tự đi tiếp qua nhiều lượt.</li>
      <li>Bấm địch, công trình địch hoặc Nhà chính địch có vòng đỏ để tấn công (phải đứng kề; quân tự áp sát nếu trong tầm đi).</li>
      <li>Bấm một công trình của bạn để xem và dùng lệnh của nó: Nhà chính mua dân và lên đời, nhà huấn luyện mua quân. <b>H</b> chọn nhanh Nhà chính; <b>1 2 3</b> đổi tab Kinh tế / Quân sự / Kỹ thuật.</li>
      <li>Nhiều dân đứng chung một ô: bấm lại vào ô để đổi sang dân kế tiếp.</li>
      <li><b>Lưu ván:</b> game tự lưu đầu mỗi lượt của bạn và khi bạn đóng hoặc chuyển khỏi trang. Mở lại trang rồi bấm <b>▶ Tiếp tục ván</b>. Bản lưu nằm trong trình duyệt của máy này; mỗi lúc chỉ giữ một ván.</li>
      <li><b>Enter</b>: kết thúc lượt · <b>N</b>: đơn vị rảnh kế tiếp · <b>Esc</b>/chuột phải: bỏ chọn · <b>M</b>: ẩn/hiện bản đồ con.</li>
      <li>Bản đồ con ở góc dưới trái: ngôi sao vàng nhấp nháy là Nhà chính của bạn; Nhà chính địch hiện ngôi sao đỏ khi bạn đã dò ra. Chấm xanh/đỏ là đơn vị, ô vuông là công trình.</li></ul>
    <h2>Khai thác</h2><ul>
      <li>Đưa dân vào ô tài nguyên là dân tự khai thác, tối đa ${MINE_CAP} dân/ô: Rừng ${AMT[FOREST]} Gỗ, Bãi gỗ nhỏ ${AMT[WOODLOT]} Gỗ, Mỏ vàng ${AMT[HILLS]}, Mỏ đá ${AMT[STONE]}, Bụi quả dâu ${AMT[BERRY]}, Đàn hươu ${AMT[DEER]} thịt, Đàn voi ${AMT[ELEPHANT]} thịt. Phần còn lại của bản đồ là Đất trống: đi lại và xây dựng được.</li>
      <li><b>Lùa hươu:</b> hươu có 1 MP mỗi vòng. Dân hoặc đạo quân dừng sát bên đàn hươu thì hươu hoảng; khi sang lượt mới hươu chạy 1 ô ngược hướng (nếu ô đó trống, không thì lệch sang ô chéo bên cạnh). Mỗi lượt lùa được 1 ô. Đứng phía bên kia để lùa hươu về sát Nhà chính hoặc Kho, mỗi chuyến sẽ ngắn hơn. Dân hoặc quân vào hẳn ô hươu là hạ được hươu ngay (ô hiện xác hươu) và dân xẻ thịt được luôn. Xác hươu, xác voi thối rữa mất ${CARCASS_ROT} thịt mỗi lượt (ngoài phần dân xẻ), nên hạ xong nên cho dân xẻ ngay.</li>
      <li><b>Voi dữ:</b> voi có 1 MP mỗi vòng và chỉ hành động sau khi lượt chơi kết thúc (sau lượt của cả bạn và địch). Mỗi vòng voi chỉ làm <b>một</b> việc: dân làng đứng sát bên thì húc (-${ELEPHANT_DMG} Máu); dân cách 2 ô (thẳng hay chéo) thì tiến 1 ô lại sát, vòng sau mới húc — bạn có một lượt để rút dân ra xa hoặc cho vào hẳn ô voi để săn. Voi không đuổi quân lính. Voi bám theo dân bao xa cũng được, kể cả vào tận làng, nên đừng dắt voi về nhà. Lúc đầu ván voi luôn cách Nhà chính ít nhất 4 ô.</li>
      <li><b>Săn voi:</b> voi có ${ELEPHANT_HP} Máu. Dân vào hẳn ô voi (tối đa ${MINE_CAP} dân), mỗi lượt mỗi dân đánh ${HUNT_DMG} — cần ít nhất ${Math.ceil(ELEPHANT_HP / HUNT_DMG)} đòn. Lính đứng trên ô voi cũng đánh được, mỗi lần trừ đúng bằng Công của lính (ít nhất ${HUNT_DMG}). Trong lúc bị săn, cuối mỗi vòng voi húc lại một người trên ô. Voi chết thì ô hiện xác voi, dân đứng đó xẻ thịt từ lượt sau. 3 dân vào cùng lúc thì hạ voi trong 1 lượt.</li>
      <li>Trong vòng 4 ô quanh mỗi Nhà chính luôn có ${homeText()}. Tầm nhìn ban đầu chỉ 2 ô nên phải cho dân đi dò. Vùng ngoài còn thêm mỏ. Kho đặt được cả ngoài lãnh thổ, nên hãy dựng kho sát mỏ.</li>
      <li>Mỗi chuyến mang về ${LOAD}. <b>Số lượt một chuyến = khoảng cách tới Nhà chính hoặc kho gần nhất.</b> Kề kho: ${LOAD}/lượt; cách 3 ô: ${LOAD} mỗi 3 lượt.</li>
      <li>Kho tài nguyên nhận Gỗ/Đá/Vàng và cả thịt hươu, voi; Kho thực phẩm nhận mọi loại Thức ăn (quả, thịt, lúa) — đặt sát mỏ để khai thác nhanh gấp nhiều lần.</li>
      <li>Mỏ cạn sẽ thành Đất trống. Ruộng lúa (Đời 2, cần có Chợ) cho ${FARM_LOAD}/chuyến và cạn sau ${FARM_AMT} (Thuần hóa ở Chợ: +${TECHS.farm.farmAmt}).</li>
      <li>Nâng cấp (Đời 2): Kho tài nguyên tăng Công/Thủ cho quân, Chợ tăng khai thác, Nhà lính có Rìu đồng. Nâng cấp xếp chung hàng chờ với quân và giữ mãi kể cả khi nhà bị phá.</li></ul>
    <h2>Xây dựng và dân số</h2><ul>
      <li>Chọn một dân → chọn công trình ở cột phải → bấm ô Đất trống viền vàng trong lãnh thổ. Lãnh thổ gồm vùng quanh Nhà chính và ${TERR_BLD} ô quanh mỗi công trình đã xây xong của bạn (kể cả kho dựng ngoài xa), nhưng không lấn vào vùng quanh Nhà chính địch. Dân tự đi tới và xây khi đứng kề công trình. Chọn thêm dân rồi bấm vào công trình dang dở để cùng xây: mỗi dân góp 1 lượt công mỗi lượt.</li>
      <li>Dân số tính chung dân và quân: Nhà chính ${CFG.pop.base} chỗ, mỗi Nhà dân +${CFG.pop.perHouse}, tối đa ${POP_MAX}.</li>
      <li>Lên Đời Công Cụ tại Nhà chính: 🍖${AGE_COST}, ${AGE_TURNS} lượt, cần 2 trong 3 công trình Kho thực phẩm / Kho tài nguyên / Nhà lính. Lãnh thổ rộng thêm 1 vòng.</li>
      <li>Công trình có Máu và bị phá được. Công trình địch chặn đường; công trình của mình thì đi xuyên qua được nhưng không dừng lại trên đó. Không có chi phí duy trì.</li></ul>
    <h2>Quân đội</h2><ul>
      <li>Nhà lính: Lính chùy (Đời 1), Lính rìu, Lính giáo (Đời 2) · Trường bắn cung: Cung thủ · Chuồng ngựa: Kỵ binh. Mỗi công trình huấn luyện 1 đơn vị một lúc, xếp hàng chờ được tối đa ${QUEUE_MAX} mục (Nhà chính xếp được nhiều dân liên tiếp).</li>
      <li>Tầm nhìn: Nhà chính 2 ô, công trình 1 ô, dân làng 1 ô, lính 2 ô, Kỵ binh 3 ô. Muốn thấy xa phải cho đơn vị đi dò.</li>
      <li>Lính giáo x2 lên Kỵ binh · Kỵ binh x1.5 lên Cung thủ · Cung thủ bắn xa 3 ô trong trận (không bắn xuyên Đá tảng; đứng trên Đồi +1 sát thương), yếu khi bị áp sát.</li>
      <li><b>Đạo quân:</b> tối đa ${ARMY_MAX} lính đứng chung một ô. Đi lính vào ô có lính mình để nhập đạo; bấm ô là chọn cả đạo; cả đạo đi theo quân chậm nhất.</li>
      <li><b>Tầm đi và tầm đánh:</b> chọn quân thì ô viền trắng là chỗ đi tới được trong lượt này, ô viền đỏ là chỗ đánh tới được (trên bản đồ lớn mọi đòn đều cận chiến: phải đứng kề, nên tầm đánh là các ô kề tầm đi). Rê chuột lên quân địch để thấy vùng cam (nó đi tới được) và vùng đỏ (nó đánh tới được) ở lượt của nó; rê lên quân mình đã hết MP để xem tầm lượt sau.</li>
      <li><b>Tách quân:</b> ở cột phải, bấm <b>☐ Tách</b> trên một hoặc vài lính (hoặc <b>✂ Tách đôi</b>), rồi bấm ô sáng để nhóm đó ra thành đạo mới — hoặc bấm vòng đỏ để chỉ nhóm đó giao chiến, phần còn lại đứng yên. Nhóm tách đi theo lính chậm nhất trong nhóm; lính đã đánh hoặc hết MP trong lượt thì không tách được. Hai đạo nhập lại bằng cách đi vào cùng ô (tối đa ${ARMY_MAX}). AI cũng theo luật này: nó tách lính bị thương nặng về nhà nghỉ hồi máu.</li>
      <li>Rừng, Mỏ vàng, Mỏ đá: +1 Thủ; Rừng che giấu quân. Đơn vị đứng yên một lượt hồi 2 Máu.</li>
      <li>Dân làng có Công ${UNITS.vil.atk}, Thủ ${UNITS.vil.def}, ${UNITS.vil.hp} Máu: chọn dân rồi bấm vòng đỏ để đánh dân, quân, công trình hay Nhà chính địch đứng kề (đánh đạo quân thì mở trận đánh, dân có Tốc độ ${UNITS.vil.init}, đi sau cùng). Dân yếu và không phản đòn khi bị đánh trên bản đồ, nên vẫn cần lính bảo vệ.</li></ul>
    <h2>Trận đánh thủ công</h2><ul>
      <li>Hai đạo đứng kề nhau mới giao chiến, và chỉ hai đạo đó vào trận. Bạn được chọn <b>Chỉ huy trực tiếp</b> hoặc <b>Tự động</b> — kể cả khi địch tấn công bạn. Tự động là máy đánh thay cả trận theo đúng luật bàn cờ.</li>
      <li>Trên bàn cờ, các quân đi theo thứ tự Tốc độ: Kỵ binh 8 · Cung thủ 6 · Bộ binh 5 · Lính giáo 4. Tối đa 6 hiệp; đạo tấn công hết lượt và đứng nguyên chỗ sau trận.</li>
      <li>Đánh dân làng, công trình và Nhà chính luôn tính tự động.</li></ul>
    <p><button class="btn primary" data-act="${G ? 'close' : 'menu'}">Đóng</button></p></div>`;
  o.classList.add('show');
}

// ---------- Trận đánh giữa hai đạo quân (Tactical Battle) ----------
function makeGrid(cols, rows, size, ox, oy) {
  const ax = [], cen = [], nb = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    ax.push({ q: c - ((r - (r & 1)) >> 1), r });
    cen.push({ x: ox + size * SQ3 * (c + 0.5 * (r & 1)), y: oy + size * 1.5 * r });
  }
  const from = (q, r) => { const c = q + ((r - (r & 1)) >> 1); return c >= 0 && r >= 0 && c < cols && r < rows ? r * cols + c : -1; };
  for (const a of ax) nb.push([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].map(d => from(a.q + d[0], a.r + d[1])).filter(j => j >= 0));
  const dist = (i, j) => { const a = ax[i], b = ax[j], dq = a.q - b.q, dr = a.r - b.r; return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2; };
  return { n: cols * rows, cols, rows, cen, nb, dist };
}
const BS = 30, BCOLS = 9, BROWS = 7, BMAXR = 6;
const BG = makeGrid(BCOLS, BROWS, BS, BS * SQ3 / 2 + 6, BS + 6);
const BWd = Math.ceil(BS * SQ3 * (BCOLS + 0.5)) + 12, BHt = Math.ceil(BS * 1.5 * (BROWS - 1) + 2 * BS) + 12;
const BT = [
  { name: 'Đất trống', cost: 1, def: 0, t: EMPTY }, { name: 'Rừng', cost: 2, def: 1, t: FOREST },
  { name: 'Đồi', cost: 2, def: 1, t: HILLS }, { name: 'Đá tảng', cost: Infinity, def: 0, t: MOUNTAIN },
];
let B = null, pending = null, bctx = null;

// Tạo trạng thái trận: att = đạo tấn công (bên trái), def = đạo phòng thủ (bên phải)
function newBattle(att, def) {
  const terr = new Array(BG.n).fill(0), pieces = [];
  for (let i = 0; i < BG.n; i++) {
    const col = i % BCOLS; if (col < 2 || col > 6) continue; // chừa chỗ dàn quân
    const wt = G.t[col <= 3 ? att[0].i : def[0].i], r = Math.random();
    terr[i] = wt === FOREST ? (r < 0.38 ? 1 : r < 0.42 ? 3 : 0) : (wt === HILLS || wt === STONE) ? (r < 0.32 ? 2 : r < 0.4 ? 3 : 0) : (r < 0.08 ? 1 : r < 0.13 ? 3 : 0);
  }
  [att, def].forEach((list, side) => list.slice(0, BROWS).forEach((x, j, arr) => {
    const row = Math.round((j + 0.5) * BROWS / arr.length - 0.5), ranged = UNITS[x.type].brange > 1;
    const col = side === 0 ? (ranged ? 0 : 1) : (ranged ? BCOLS - 1 : BCOLS - 2);
    pieces.push({ u: x, owner: x.owner, side, type: x.type, cell: row * BCOLS + col, hp: x.hp, max: ust(x).hp, mp: 0, defend: false, moved: false, alive: true });
  }));
  return { pieces, terr, round: 1, order: [], oi: -1, cur: null, reach: new Map(), targets: new Map(), phase: 'ai', auto: false, sim: false, log: [], fl: [], hover: -1, result: null, done: null };
}
// Đánh tự động: máy điều khiển cả hai bên theo đúng luật bàn cờ, trả kết quả ngay
function simBattle(att, def) {
  if (!att.length || !def.length) return null;
  B = newBattle(att, def); B.sim = true; bOrder();
  for (let guard = 0; guard < 600 && bAdvance(); guard++) bAiCore(B.cur);
  if (B.phase !== 'done') bFinish(-1);
  const r = B.result; B = null;
  return r;
}
// Đánh thủ công: trả về Promise kết thúc khi người chơi đóng màn hình trận
function startBattle(att, def) {
  B = newBattle(att, def);
  const o = document.getElementById('overlay');
  o.innerHTML = `<div class="modal battle"><div id="bhead"></div><div class="brow"><div class="bmap"><canvas id="bcv"></canvas><div id="bhover" class="muted">&nbsp;</div></div><div id="bside"></div></div></div>`;
  o.classList.add('show');
  const bcv = document.getElementById('bcv');
  bcv.width = BWd * 2; bcv.height = BHt * 2; bcv.style.aspectRatio = `${BWd}/${BHt}`;
  bctx = bcv.getContext('2d');
  const cellAt = ev => {
    const r = bcv.getBoundingClientRect(), x = (ev.clientX - r.left) * BWd / r.width, y = (ev.clientY - r.top) * BHt / r.height;
    let best = -1, bd = BS * BS;
    for (let i = 0; i < BG.n; i++) { const dx = BG.cen[i].x - x, dy = BG.cen[i].y - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
    return best;
  };
  bcv.addEventListener('click', ev => bClick(cellAt(ev)));
  bcv.addEventListener('mouseleave', () => { if (B) B.hover = -1; });
  bcv.addEventListener('mousemove', ev => { if (!B) return; B.hover = cellAt(ev); document.getElementById('bhover').innerHTML = bHoverHtml(B.hover) || '&nbsp;'; });
  bOrder();
  return new Promise(res => { B.done = res; bNext(); });
}
function armyList(arr, cls) { return arr.map(x => `<span class="${cls}">${UNITS[x.type].ico} ${UNITS[x.type].name} · ${x.hp}/${ust(x).hp}</span>`).join(''); }
function askBattle(grp, t) { // người chơi tấn công một đạo địch
  pending = { kind: 'attack', grp, t };
  const o = document.getElementById('overlay');
  o.innerHTML = `<div class="modal"><h1>⚔ Giao chiến</h1>
    <p class="muted">Đạo của bạn tấn công đạo địch tại ô ${TERRAIN[G.t[t.i]].name}. Trận kéo dài tối đa ${BMAXR} hiệp. “Tự động” để máy đánh thay cả trận theo cùng luật.</p>
    <h2>Đạo của bạn (tấn công)</h2><div class="order">${armyList(grp, 'ally')}</div>
    <h2>Đạo địch (phòng thủ)</h2><div class="order">${armyList(armyAt(t.i, 1), 'foe')}</div>
    <p style="margin-top:14px"><button class="btn primary" data-act="bt:manual">Chỉ huy trực tiếp</button>
    <button class="btn" data-act="bt:auto">Tự động</button> <button class="btn" data-act="bt:cancel">Hủy</button></p></div>`;
  o.classList.add('show');
}
function askDefense(att, def) { // địch tấn công một đạo của bạn: dừng lượt địch chờ bạn chọn
  return new Promise(res => {
    pending = { kind: 'defense', att, def, res };
    const o = document.getElementById('overlay');
    o.innerHTML = `<div class="modal"><h1>⚠ Địch tấn công!</h1>
      <p class="muted">Một đạo địch đánh vào đạo của bạn tại ô ${TERRAIN[G.t[def[0].i]].name}. Trận kéo dài tối đa ${BMAXR} hiệp.</p>
      <h2>Đạo địch (tấn công)</h2><div class="order">${armyList(att, 'foe')}</div>
      <h2>Đạo của bạn (phòng thủ)</h2><div class="order">${armyList(def, 'ally')}</div>
      <p style="margin-top:14px"><button class="btn primary" data-act="bt:manual">Chỉ huy phòng thủ</button>
      <button class="btn" data-act="bt:auto">Tự động</button></p></div>`;
    o.classList.add('show');
  });
}
function battleChoice(a) { // xử lý nút trên hai hộp thoại trên
  const pd = pending; pending = null;
  document.getElementById('overlay').classList.remove('show');
  if (!pd) return;
  if (pd.kind === 'defense') {
    const att = pd.att.filter(u => G.units.includes(u)), def = pd.def.filter(u => G.units.includes(u));
    if (a === 'manual' && att.length && def.length) startBattle(att, def).then(pd.res);
    else { simBattle(att, def); pd.res(); }
    return;
  }
  const grp = pd.grp.filter(u => G.units.includes(u)), def = armyAt(pd.t.i, 1);
  if (a === 'cancel' || !grp.length || !def.length) return;
  if (pd.t.pos !== grp[0].i) moveGroup(grp, pd.t.pos, pd.t.cost);
  if (a === 'manual') startBattle(grp, def); else { simBattle(grp, def); renderUI(); }
}
const bPieceAt = cell => B.pieces.find(p => p.alive && p.cell === cell);
const bRange = p => UNITS[p.type].brange;
// Đường bắn trong trận: bắn xa (cách hơn 1 ô) bị ô Đá tảng nằm giữa chặn. Lấy mẫu dọc đoạn nối tâm hai ô; địa hình cố định suốt trận nên lưu lại.
function bLos(a, b) {
  if (BG.dist(a, b) <= 1) return true;
  B.los = B.los || new Map();
  const key = Math.min(a, b) * BG.n + Math.max(a, b);
  if (B.los.has(key)) return B.los.get(key);
  const A = BG.cen[a], C = BG.cen[b], steps = BG.dist(a, b) * 6;
  let ok = true;
  for (let k = 1; k < steps && ok; k++) {
    const x = A.x + (C.x - A.x) * k / steps, y = A.y + (C.y - A.y) * k / steps;
    let best = -1, bd = Infinity;
    for (let i = 0; i < BG.n; i++) { const dx = BG.cen[i].x - x, dy = BG.cen[i].y - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
    if (best !== a && best !== b && B.terr[best] === 3) ok = false; // 3 = Đá tảng
  }
  B.los.set(key, ok);
  return ok;
}
const bHillShot = a => UNITS[a.type].brange > 1 && B.terr[a.cell] === 2; // Cung thủ đứng trên Đồi: +1 sát thương
const bName = p => `${UNITS[p.type].name} ${p.owner ? 'địch' : 'ta'}`;
const bHuman = p => p.owner === 0 && !B.auto && !B.sim;
function bOrder() { B.order = B.pieces.filter(p => p.alive).sort((a, b) => UNITS[b.type].init - UNITS[a.type].init || a.side - b.side); }
function bReach(p) {
  const best = new Map([[p.cell, 0]]), q = [[p.cell, 0]];
  while (q.length) {
    q.sort((a, b) => a[1] - b[1]);
    const [i, c] = q.shift(); if (c > best.get(i)) continue;
    for (const n of BG.nb[i]) {
      const tc = BT[B.terr[n]].cost; if (!isFinite(tc)) continue;
      const o = bPieceAt(n); if (o && o.side !== p.side) continue;
      const nc = c + tc;
      if (nc <= p.mp && nc < (best.has(n) ? best.get(n) : Infinity)) { best.set(n, nc); q.push([n, nc]); }
    }
  }
  for (const i of [...best.keys()]) if (bPieceAt(i)) best.delete(i);
  return best;
}
function bTargets(p, rc) { // quân địch -> {d, pos, cost}
  const out = new Map(), R = bRange(p);
  for (const d of B.pieces) {
    if (!d.alive || d.side === p.side) continue;
    let pos = -1, cost = Infinity, pd = -1;
    const consider = (i, c) => { const ds = BG.dist(i, d.cell); if (ds <= R && bLos(i, d.cell) && (ds > pd || (ds === pd && c < cost))) { pos = i; cost = c; pd = ds; } };
    consider(p.cell, 0);
    if (pos < 0 || pd < R) for (const [i, c] of rc) consider(i, c);
    if (pos >= 0) out.set(d, { d, pos, cost });
  }
  return out;
}
function bDmg(a, d, k, rand) { return dmgCore(a, d.type, defOf(d) + BT[B.terr[d.cell]].def + (d.defend ? 2 : 0), k, rand) + (bHillShot(a) ? 1 : 0); }
function bRet(a, d, dist, rand) {
  if (dist === 1) return bDmg(d, a, UNITS[d.type].cls === 'archer' ? 0.4 : 0.6, rand);
  return bRange(d) >= dist && bLos(d.cell, a.cell) ? bDmg(d, a, 0.5, rand) : 0;
}
function bAttack(a, d) {
  const dist = BG.dist(a.cell, d.cell), dmg = bDmg(a, d, 1, true), now = performance.now();
  d.hp -= dmg; B.fl.push({ cell: d.cell, text: '-' + dmg, color: '#ff5a4a', t0: now });
  let msg = `${bName(a)} đánh ${bName(d)} (-${dmg})`;
  if (d.hp <= 0) { d.hp = 0; d.alive = false; msg += ' — tiêu diệt!'; }
  else {
    const r = bRet(a, d, dist, true);
    if (r > 0) {
      a.hp -= r; B.fl.push({ cell: a.cell, text: '-' + r, color: '#ffb347', t0: now }); msg += `, phản đòn (-${r})`;
      if (a.hp <= 0) { a.hp = 0; a.alive = false; msg += ', tử trận'; }
    }
  }
  B.log.push({ msg: msg.endsWith('!') ? msg : msg + '.', cls: a.owner ? 'bad' : 'good' });
}
// Tầm đánh trong trận: các ô cách vị trí hiện tại hoặc một ô đi tới được không quá Tầm (cận chiến 1, cung 3),
// trừ ô đi tới được, ô Đá tảng và ô có quân cùng phe; bắn xa không xuyên qua Đá tảng
function bAtkZone(p, rc) {
  const out = new Set(), R = bRange(p);
  for (let i = 0; i < BG.n; i++) {
    if (i === p.cell || rc.has(i) || !isFinite(BT[B.terr[i]].cost)) continue;
    const o = bPieceAt(i); if (o && o.side === p.side) continue;
    if ((BG.dist(p.cell, i) <= R && bLos(p.cell, i)) || [...rc.keys()].some(c => BG.dist(c, i) <= R && bLos(c, i))) out.add(i);
  }
  return out;
}
function bRangeOf(p) { // tầm của một quân ở lượt kế của nó (MP đầy), dùng khi rê chuột
  const save = p.mp; p.mp = UNITS[p.type].bmp;
  const mv = bReach(p); p.mp = save;
  return { mv, atk: bAtkZone(p, mv) };
}
function bOptions() { B.reach = bReach(B.cur); B.targets = bTargets(B.cur, B.reach); B.atk = bAtkZone(B.cur, B.reach); }
// Chuyển sang quân kế tiếp theo Tốc độ; trả về false nếu trận đã kết thúc
function bAdvance() {
  if (!B || B.phase === 'done') return false;
  const alive = s => B.pieces.some(p => p.alive && p.side === s);
  if (!alive(1)) { bFinish(0); return false; }
  if (!alive(0)) { bFinish(1); return false; }
  B.oi++;
  if (B.oi >= B.order.length) { B.round++; if (B.round > BMAXR) { bFinish(-1); return false; } bOrder(); B.oi = 0; }
  const p = B.order[B.oi];
  if (!p.alive) return bAdvance();
  B.cur = p; p.defend = false; p.moved = false; p.mp = UNITS[p.type].bmp; B.reach = new Map(); B.targets = new Map();
  B.undo = { cell: p.cell, mp: p.mp }; // chỗ đứng đầu lượt: cho phép đi lại khi chưa đánh
  return true;
}
function bAiCore(p) { // máy đi một lượt cho quân p
  const rc = bReach(p), tgs = bTargets(p, rc); let best = null, bs = 0;
  for (const t of tgs.values()) {
    const dmg = bDmg(p, t.d, 1, false), ret = bRet(p, t.d, BG.dist(t.pos, t.d.cell), false);
    const s = dmg * 2 + (dmg >= t.d.hp ? 8 : 0) - ret * 1.5 - (ret >= p.hp ? 10 : 0);
    if (s > bs) { bs = s; best = t; }
  }
  if (best) { p.cell = best.pos; bAttack(p, best.d); return; }
  if (tgs.size) { p.defend = true; return; } // chỉ có đòn đánh bất lợi: thủ tại chỗ
  const foes = B.pieces.filter(x => x.alive && x.side !== p.side), R = bRange(p);
  const metric = c => Math.min(...foes.map(f => Math.abs(BG.dist(c, f.cell) - R))) * 10 - BT[B.terr[c]].def;
  let to = -1, bm = metric(p.cell);
  for (const c of rc.keys()) { const m = metric(c); if (m < bm) { bm = m; to = c; } }
  if (to >= 0) p.cell = to; else p.defend = true;
}
async function bNext() {
  if (!B || B.phase === 'done') return;
  if (!bAdvance()) return;
  const p = B.cur;
  if (!bHuman(p)) {
    B.phase = 'ai'; renderBattleUI();
    await sleep(420); if (!B || B.phase === 'done') return;
    bAiCore(p); renderBattleUI();
    await sleep(320);
    return bNext();
  }
  B.phase = 'player'; bOptions(); renderBattleUI();
}
function bClick(cell) {
  if (!B || B.phase !== 'player' || cell < 0) return;
  const p = B.cur, d = bPieceAt(cell);
  if (d && B.targets.has(d)) {
    const t = B.targets.get(d);
    if (t.pos !== p.cell) { p.cell = t.pos; p.mp -= t.cost; p.moved = true; }
    B.phase = 'ai'; B.reach = new Map(); B.targets = new Map();
    bAttack(p, d); renderBattleUI(); bNext(); return;
  }
  if (B.reach.has(cell)) { p.mp -= B.reach.get(cell); p.cell = cell; p.moved = true; bOptions(); renderBattleUI(); }
}
async function battleAct(a) {
  if (!B) return;
  if (a === 'close') {
    if (B.phase !== 'done') return;
    const done = B.done; B = null;
    document.getElementById('overlay').classList.remove('show'); renderUI();
    if (done) done();
    return;
  }
  if (B.phase !== 'player') return;
  const p = B.cur;
  if (a === 'pass') { if (!p.moved) p.defend = true; B.phase = 'ai'; bNext(); }
  else if (a === 'undo') { if (p.moved && B.undo) { p.cell = B.undo.cell; p.mp = B.undo.mp; p.moved = false; bOptions(); renderBattleUI(); } }
  else if (a === 'retreat') bFinish('retreat');
  else if (a === 'auto') { B.auto = true; B.phase = 'ai'; bAiCore(p); renderBattleUI(); await sleep(320); bNext(); }
}
function bFinish(kind) { // 0: bên công thắng · 1: bên thủ thắng · -1: hết hiệp · 'retreat': người chơi rút
  B.phase = 'done'; B.reach = new Map(); B.targets = new Map();
  const lost = [0, 0];
  for (const p of B.pieces) {
    if (!p.alive) { lost[p.owner]++; if (G.units.includes(p.u)) killUnit(p.u); continue; }
    p.u.hp = p.hp;
    if (p.side === 0) { p.u.attacked = true; p.u.mp = 0; p.u.moved = true; p.u.goto = null; } // đạo tấn công hết lượt, đứng nguyên chỗ
  }
  for (const pl of G.players) updateVision(pl);
  const winner = kind === 0 || kind === 1 ? B.pieces.find(p => p.side === kind).owner : -1;
  const head = kind === 'retreat' ? 'Bạn đã ra lệnh rút lui.' : kind === -1 ? `Hết ${BMAXR} hiệp — hai bên thu quân.`
    : winner === 0 ? '🏆 Thắng trận! Đạo địch đã bị tiêu diệt.' : '💀 Bại trận. Đạo quân của ta đã bị tiêu diệt.';
  B.result = `${head} Ta mất ${lost[0]}, địch mất ${lost[1]} đơn vị.`;
  log(`Trận đánh${B.sim ? ' (tự động)' : ''}: ${B.result}`, winner === 0 ? 'good' : winner === 1 ? 'bad' : 'info');
  select(null); renderUI(); renderBattleUI();
}
function bHoverHtml(cell) {
  if (cell < 0 || !B) return '';
  const T = BT[B.terr[cell]], d = bPieceAt(cell);
  let h = `${T.name}${isFinite(T.cost) ? ' · ' + T.cost + ' MP' : ' · không thể đi qua, chặn đường bắn'}${T.def ? ' · +' + T.def + ' Thủ' : ''}${T.t === HILLS ? ' · Cung thủ đứng đây +1 sát thương' : ''}`;
  if (d) {
    const s = UNITS[d.type];
    h += ` — <b>${s.ico} ${bName(d)}</b> Máu ${d.hp}/${d.max} · Công ${withBonus(s.atk, atkBonus(d))} · Thủ ${withBonus(s.def, defBonus(d))}${d.defend ? '+2' : ''} · Tốc độ ${s.init} · Di chuyển ${s.bmp} · Tầm ${bRange(d)}`;
    if (d !== B.cur && B.phase !== 'done') h += ` · <span class="muted">${d.owner ? 'viền cam: nó đi tới được, đỏ: nó đánh tới được (lượt kế của nó)' : 'nét đứt: tầm của quân này ở lượt kế'}</span>`;
    if (B.phase === 'player' && B.targets.has(d)) {
      const t = B.targets.get(d);
      h += ` · <span style="color:#ffb37a">⚔ gây ~${bDmg(B.cur, d, 1, false)}, nhận ~${bRet(B.cur, d, BG.dist(t.pos, d.cell), false)}</span>`;
    }
  }
  return h;
}
function renderBattleUI() {
  if (!B || B.sim || !document.getElementById('bhead')) return;
  const p = B.cur, done = B.phase === 'done', mine = B.phase === 'player';
  const youAttack = B.pieces.some(x => x.side === 0 && x.owner === 0);
  document.getElementById('bhead').innerHTML = `<h1>⚔ Trận đánh <small class="muted">Hiệp ${Math.min(B.round, BMAXR)}/${BMAXR} · bạn ${youAttack ? 'tấn công (bên trái)' : 'phòng thủ (bên phải)'}</small></h1>
    <div class="order">Thứ tự theo Tốc độ: ${B.order.map((x, k) => x.alive ? (k === B.oi && !done ? `<span class="${x.owner ? 'foe' : 'ally'} cur">▶ ${UNITS[x.type].ico} ${UNITS[x.type].name} ${UNITS[x.type].init}</span>` : `<span class="${x.owner ? 'foe' : 'ally'}${k < B.oi ? ' done' : ''}">${UNITS[x.type].ico} ${UNITS[x.type].init}</span>`) : '').join('')}</div>`;
  let h = '';
  if (done) h += `<div class="card"><h3>Kết quả</h3><p>${B.result}</p><button class="btn primary" data-act="b:close">Về bản đồ</button></div>`;
  else if (p) {
    const s = UNITS[p.type];
    h += `<div class="card bcur ${p.owner ? 'foe' : 'ally'}"><div class="bturn">▶ ${mine ? 'Lượt của bạn' : p.owner ? 'Lượt của địch' : 'Quân ta tự đi'}</div><h3>${s.ico} ${bName(p)}</h3>
      <div class="row"><span>Máu ${p.hp}/${p.max}</span><span>Di chuyển ${p.mp}</span></div>
      <div class="row"><span>Công ${withBonus(s.atk, atkBonus(p))} · Thủ ${withBonus(s.def, defBonus(p))}</span><span>Tầm ${bRange(p)} · Tốc độ ${s.init}</span></div>
      ${mine ? `<div class="legend"><span><i class="lg mv"></i>Tầm đi: ${B.reach.size} ô</span><span><i class="lg atk"></i>Tầm đánh: ${(B.atk || []).size || 0} ô${B.targets.size ? ` · ${B.targets.size} mục tiêu` : ''}</span></div>` : ''}
      <div class="muted">${mine ? 'Lượt của bạn: bấm ô sáng để di chuyển, bấm địch có vòng đỏ để tấn công. Rê chuột lên quân địch để xem tầm của nó.' : (p.owner ? 'Địch đang hành động…' : 'Quân ta tự hành động…')}</div>
      ${mine && p.moved ? '<button class="opt" data-act="b:undo">↩ Đi lại (về chỗ đứng đầu lượt, hoàn lại Di chuyển)</button>' : ''}
      <button class="opt" data-act="b:pass" ${mine ? '' : 'disabled'}>🛡️ ${p.moved ? 'Kết thúc lượt đơn vị này' : 'Phòng thủ (+2 Thủ tới lượt sau)'}</button>
      <button class="opt" data-act="b:auto" ${mine ? '' : 'disabled'}>⏩ Tự động đánh nốt trận</button>
      <button class="opt" data-act="b:retreat" ${mine ? '' : 'disabled'}>🏳️ Rút lui (kết thúc trận ngay)</button></div>`;
  }
  h += `<div class="card"><h3>Diễn biến</h3><div id="log">${B.log.slice(-8).reverse().map(l => `<div class="${l.cls}">${l.msg}</div>`).join('') || '<div class="muted">Hai bên dàn trận…</div>'}</div></div>`;
  document.getElementById('bside').innerHTML = h;
}
function drawBattle() {
  const g = bctx; if (!g || B.sim) return;
  g.setTransform(2, 0, 0, 2, 0, 0);
  g.fillStyle = '#0b0c10'; g.fillRect(0, 0, BWd, BHt);
  for (let i = 0; i < BG.n; i++) {
    const { x, y } = BG.cen[i], t = BT[B.terr[i]].t;
    hexPath(g, x, y, BS - 0.5); g.fillStyle = TERRAIN[t].color; g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.stroke();
    drawDeco(g, t, x, y);
  }
  // xem trước tầm của quân dưới chuột (ở lượt kế của nó); địch: cam/đỏ, quân ta: nét đứt trắng/đỏ
  const hp = B.hover >= 0 && B.phase !== 'done' ? bPieceAt(B.hover) : null, all = () => true;
  if (hp && hp !== B.cur) {
    const key = `${B.hover}|${B.round}|${B.oi}|${B.pieces.map(x => x.alive ? x.cell : -1).join(',')}`;
    if (!B.hr || B.hr.key !== key) B.hr = { key, ...bRangeOf(hp) };
  }
  const showHover = hp && hp !== B.cur && B.hr;
  if (showHover && B.phase !== 'player') drawRange(g, B.hr.mv.keys(), B.hr.atk, hp.owner ? 'bfoe' : 'bpeek', BG.cen, BS, all);
  if (B.phase === 'player') {
    drawRange(g, B.reach.keys(), B.atk || [], 'bsel', BG.cen, BS, all);
    if (showHover) drawRange(g, B.hr.mv.keys(), B.hr.atk, hp.owner ? 'bfoeLine' : 'bpeekLine', BG.cen, BS, all);
  }
  const cur = B.cur && B.cur.alive && B.phase !== 'done' ? B.cur : null, pulse = (Math.sin(performance.now() / 260) + 1) / 2;
  if (cur) { // quân đang tới lượt: ô sáng nhấp nháy + khung vàng
    const { x, y } = BG.cen[cur.cell];
    hexPath(g, x, y, BS - 2); g.fillStyle = `rgba(255,210,31,${0.18 + pulse * 0.22})`; g.fill();
    g.strokeStyle = '#ffd21f'; g.lineWidth = 2; g.stroke();
    cornerFrame(g, x, y, BS);
  }
  const acted = new Set(B.phase === 'done' ? [] : B.order.slice(0, Math.max(0, B.oi))); // quân đã đi trong hiệp này: vẽ mờ
  for (const p of B.pieces) {
    if (!p.alive) continue;
    const { x, y } = BG.cen[p.cell];
    drawToken(g, x, y - 2, G.players[p.owner].color, 'units/' + p.type, p.hp, p.max, acted.has(p), p === cur ? 16 : 14);
    if (p.defend) { g.font = '13px "Segoe UI Emoji", sans-serif'; g.fillText('🛡️', x + 14, y - 15); }
  }
  if (cur) { // mũi tên nhún trên đầu quân đang tới lượt
    const { x, y } = BG.cen[cur.cell], ay = y - BS - 4 - pulse * 5;
    g.beginPath(); g.moveTo(x - 8, ay - 9); g.lineTo(x + 8, ay - 9); g.lineTo(x, ay + 1); g.closePath();
    g.fillStyle = '#ffd21f'; g.fill(); g.strokeStyle = '#000'; g.lineWidth = 2; g.stroke();
  }
  if (B.phase === 'player') for (const t of B.targets.values()) { g.beginPath(); g.arc(BG.cen[t.d.cell].x, BG.cen[t.d.cell].y - 2, BS - 8, 0, Math.PI * 2); g.strokeStyle = '#ff3b2f'; g.lineWidth = 3; g.stroke(); }
  if (B.hover >= 0) { hexPath(g, BG.cen[B.hover].x, BG.cen[B.hover].y, BS - 1.5); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5; g.stroke(); }
  const now = performance.now();
  g.font = 'bold 17px "Segoe UI", sans-serif'; g.textAlign = 'center';
  for (let k = B.fl.length - 1; k >= 0; k--) {
    const f = B.fl[k], a = (now - f.t0) / 1100;
    if (a >= 1) { B.fl.splice(k, 1); continue; }
    const { x, y } = BG.cen[f.cell];
    g.globalAlpha = 1 - a; g.lineWidth = 3; g.strokeStyle = '#000';
    g.strokeText(f.text, x, y - 16 - a * 24); g.fillStyle = f.color; g.fillText(f.text, x, y - 16 - a * 24);
    g.globalAlpha = 1;
  }
}

// ---------- Vẽ ----------
// khung 4 góc vàng quanh ô đang chọn
function cornerFrame(g, x, y, size) {
  const h = size * 0.78, L = size * 0.38;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const cx = x + sx * h, cy = y + sy * h;
    g.moveTo(cx, cy - sy * L); g.lineTo(cx, cy); g.lineTo(cx - sx * L, cy);
  }
  g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 6; g.stroke();
  g.strokeStyle = '#ffd21f'; g.lineWidth = 3; g.stroke();
  g.restore();
}
function hexPath(g, x, y, r) {
  g.beginPath();
  for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 30); g[k ? 'lineTo' : 'moveTo'](x + r * Math.cos(a), y + r * Math.sin(a)); }
  g.closePath();
}
// Vẽ tầm di chuyển (mv) và tầm đánh (atk). mode: sel = quân đang chọn · peek = rê chuột lên quân mình
// · foe = rê chuột lên quân địch · foeLine = như foe nhưng chỉ viền (khi đang chọn quân mình)
const RANGE_STYLE = {
  // ô đi được của quân mình tô xanh nhạt; tầm đánh chỉ vẽ viền đỏ nằm phía trong ô (không tô, không che địa hình)
  sel: { mv: ['rgba(190,230,255,.22)', 'rgba(225,245,255,.9)'], glow: 'rgba(200,235,255,.5)', atk: [null, '#ff3b2f'], dash: [], alw: 2.5 },
  peek: { mv: ['rgba(190,230,255,.12)', 'rgba(225,245,255,.6)'], glow: 'rgba(200,235,255,.28)', atk: [null, 'rgba(255,70,55,.8)'], dash: [4, 3], alw: 2 },
  foe: { mv: ['rgba(255,150,40,.2)', 'rgba(255,170,60,.85)'], atk: [null, 'rgba(255,50,50,.9)'], dash: [4, 3], alw: 2.5 },
  foeLine: { mv: [null, 'rgba(255,170,60,.8)'], atk: [null, 'rgba(255,60,60,.85)'], dash: [3, 3], alw: 2 },
  peekLine: { mv: [null, 'rgba(170,225,255,.8)'], atk: [null, 'rgba(255,80,60,.8)'], dash: [3, 3], alw: 2 },
  // màn trận nền sáng: màu đậm và nét dày hơn
  bsel: { mv: ['rgba(150,210,255,.3)', 'rgba(235,248,255,.95)'], glow: 'rgba(120,195,255,.6)', atk: [null, '#e8141a'], dash: [], lw: 2, alw: 3 },
  bpeek: { mv: ['rgba(150,210,255,.18)', 'rgba(235,248,255,.75)'], glow: 'rgba(120,195,255,.38)', atk: [null, '#e8141a'], dash: [5, 3], lw: 2, alw: 3 },
  bfoe: { mv: ['rgba(255,170,0,.4)', '#ff9500'], atk: [null, '#e8141a'], dash: [5, 3], lw: 2.5, alw: 3 },
  bfoeLine: { mv: [null, '#ff9500'], atk: [null, '#a3000a'], dash: [5, 3], lw: 3, alw: 3 },
  bpeekLine: { mv: [null, '#1f8fe6'], atk: [null, '#a3000a'], dash: [5, 3], lw: 3, alw: 3 },
};
function drawRange(g, mv, atk, mode, cen = CEN, size = S, show = i => known(G.players[0], i)) {
  const st = RANGE_STYLE[mode];
  g.save(); g.setLineDash(st.dash);
  for (const [set, [fill, line], lw, glow] of [[mv, st.mv, st.lw || 1.5, st.glow], [atk, st.atk, st.alw || st.lw || 1.5]]) for (const i of set) {
    if (!show(i)) continue;
    if (glow) { // ô sáng mờ: phủ màu nhạt, viền sáng loang vào trong, nét viền mảnh rõ ở mép
      const { x, y } = cen[i];
      g.save(); g.setLineDash([]); hexPath(g, x, y, size - 1); g.clip();
      g.fillStyle = fill; g.fill();
      g.strokeStyle = glow; g.lineWidth = size * 0.45; g.stroke();
      g.restore();
      hexPath(g, x, y, size - 2); g.lineWidth = lw; g.strokeStyle = line; g.stroke();
      continue;
    }
    g.lineWidth = lw;
    hexPath(g, cen[i].x, cen[i].y, fill ? size - 3 : size - 3 - lw); // viền đỏ nằm hẳn trong ô
    if (fill) { g.fillStyle = fill; g.fill(); }
    g.strokeStyle = line; g.stroke();
  }
  g.restore();
}
function drawDeco(g, t, x, y, i) {
  if (t === FOREST) {
    g.fillStyle = '#265c2a';
    for (const [dx, dy] of [[-9, 4], [6, 7], [-1, -7]]) { g.beginPath(); g.moveTo(x + dx, y + dy - 9); g.lineTo(x + dx - 6, y + dy + 4); g.lineTo(x + dx + 6, y + dy + 4); g.fill(); }
  } else if (t === HILLS) { // mỏ vàng: gò đất và quặng vàng
    g.strokeStyle = '#8a6a1c'; g.lineWidth = 2;
    for (const [dx, dy] of [[-7, 4], [7, 7]]) { g.beginPath(); g.arc(x + dx, y + dy, 8, Math.PI, 0); g.stroke(); }
    g.fillStyle = '#ffe36b';
    for (const [dx, dy] of [[-8, -6], [4, -9], [9, -1]]) { g.beginPath(); g.arc(x + dx, y + dy, 2.6, 0, Math.PI * 2); g.fill(); }
  } else if (t === MOUNTAIN) {
    g.fillStyle = '#4b4d53'; g.beginPath(); g.moveTo(x, y - 15); g.lineTo(x - 15, y + 11); g.lineTo(x + 15, y + 11); g.fill();
    g.fillStyle = '#f0f0f0'; g.beginPath(); g.moveTo(x, y - 15); g.lineTo(x - 5, y - 6); g.lineTo(x + 5, y - 6); g.fill();
  } else if (t === STONE) { // mỏ đá: các tảng đá
    g.fillStyle = '#6c7078'; g.strokeStyle = '#4c4f56'; g.lineWidth = 1;
    for (const [dx, dy, r] of [[-7, 4, 7], [7, 6, 6], [1, -7, 6]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); g.fill(); g.stroke(); }
  } else if (t === WOODLOT) { // bãi gỗ nhỏ: vài cây con và gốc cây
    g.fillStyle = '#3f7d3a';
    for (const [dx, dy] of [[-7, 2], [6, -3]]) { g.beginPath(); g.moveTo(x + dx, y + dy - 8); g.lineTo(x + dx - 5, y + dy + 3); g.lineTo(x + dx + 5, y + dy + 3); g.fill(); }
    g.fillStyle = '#8a5a2b';
    for (const [dx, dy] of [[2, 8], [-9, 9], [10, 7]]) { g.beginPath(); g.arc(x + dx, y + dy, 2.6, 0, Math.PI * 2); g.fill(); }
  } else if (t === BERRY) { // bụi quả dâu
    g.fillStyle = '#2f7a35';
    for (const [dx, dy, r] of [[-6, 3, 9], [7, 4, 8], [0, -6, 8]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#e0304a';
    for (const [dx, dy] of [[-8, 1], [-3, 7], [5, 1], [9, 7], [-2, -8], [3, -4]]) { g.beginPath(); g.arc(x + dx, y + dy, 2.3, 0, Math.PI * 2); g.fill(); }
  } else if (t === DEER || t === ELEPHANT) { // i: chỉ số ô trên bản đồ lớn (để biết thú còn sống hay đã thành xác)
    const dead = i != null && isDead(i), name = t === DEER ? 'deer' : 'elephant';
    drawIcon(g, `animals/${name}${dead ? '_dead' : ''}`, x, y, 30);
    if (i != null && t === ELEPHANT && !dead && eleHp(i) < ELEPHANT_HP) hpBar(g, x, y + 15, 24, eleHp(i) / ELEPHANT_HP); // voi bị thương
  } else if (t === EMPTY) {
    g.fillStyle = 'rgba(70,110,40,.45)';
    for (const [dx, dy] of [[-8, -4], [5, 6], [9, -7], [-3, 9]]) { g.beginPath(); g.arc(x + dx, y + dy, 1.6, 0, Math.PI * 2); g.fill(); }
  }
}
function hpBar(g, x, y, w, f) {
  f = Math.max(0, Math.min(1, f));
  g.fillStyle = '#111'; g.fillRect(x - w / 2, y, w, 4);
  g.fillStyle = f > 0.5 ? '#5fd35a' : f > 0.25 ? '#e8c33a' : '#e8503a'; g.fillRect(x - w / 2, y, w * f, 4);
}
function drawToken(g, x, y, color, key, hp, maxHp, dim, r) { // key: tên ảnh, vd 'units/club'
  g.globalAlpha = dim ? 0.5 : 1;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = color; g.fill();
  g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
  drawIcon(g, key, x, y, r * 1.6);
  g.globalAlpha = 1;
  hpBar(g, x, y + r + 2, r * 2, hp / maxHp);
}
function badge(g, x, y, text, bg) {
  g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fillStyle = bg; g.fill();
  g.font = 'bold 9px "Segoe UI", "Segoe UI Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#fff'; g.fillText(text, x, y + 0.5);
}
function draw() {
  requestAnimationFrame(draw);
  if (B) drawBattle();
  drawMini();
  const g = ctx2;
  g.setTransform(2, 0, 0, 2, 0, 0);
  g.fillStyle = '#0b0c10'; g.fillRect(0, 0, W, H);
  if (!G) return;
  const me = G.players[0];
  for (let i = 0; i < N * N; i++) {
    const { x, y } = CEN[i];
    hexPath(g, x, y, S - 0.5);
    if (!known(me, i)) { g.fillStyle = '#050507'; g.fill(); g.strokeStyle = '#15161c'; g.lineWidth = 1; g.stroke(); continue; }
    g.fillStyle = TERRAIN[G.t[i]].color; g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.stroke();
    drawDeco(g, G.t[i], x, y, i);
  }
  // lãnh thổ
  for (const p of G.players) {
    if (!me.explored[p.city.i]) continue;
    g.strokeStyle = p.color; g.lineWidth = 1.5; g.globalAlpha = 0.45;
    for (const i of terrOf(p)) if (me.explored[i]) { hexPath(g, CEN[i].x, CEN[i].y, S - 3); g.stroke(); }
    g.globalAlpha = 1;
  }
  // công trình
  for (const b of Object.values(G.bld)) {
    const i = b.tile; if (!me.explored[i]) continue;
    const { x, y } = CEN[i];
    g.globalAlpha = b.done ? (b.id === 'farm' ? 0.85 : 1) : 0.6;
    g.fillStyle = b.id === 'farm' ? '#7a9a3a' : '#2a2f3b'; g.strokeStyle = G.players[b.owner].color; g.lineWidth = 2;
    g.beginPath(); g.rect(x - 13, y - 13, 26, 26); g.fill(); g.stroke();
    drawIcon(g, b.done ? 'buildings/' + b.id : 'buildings/site', x, y, 22);
    g.globalAlpha = 1;
    if (me.visible[i] || b.owner === 0) { if (!b.done) hpBar(g, x, y + 15, 26, b.prog / b.need); else if (b.hp < b.max) hpBar(g, x, y + 15, 26, b.hp / b.max); }
  }
  // sương mù xám
  for (let i = 0; i < N * N; i++) if (known(me, i) && !me.visible[i]) { hexPath(g, CEN[i].x, CEN[i].y, S - 0.5); g.fillStyle = 'rgba(18,20,28,.58)'; g.fill(); }
  // đánh dấu lựa chọn
  if (selB != null) { const bi = selB === 'city' ? me.city.i : selB; hexPath(g, CEN[bi].x, CEN[bi].y, S - 2); g.strokeStyle = '#ffe14a'; g.lineWidth = 3; g.stroke(); }
  // xem trước tầm của quân dưới chuột (địch: vùng nó có thể đi/đánh tới ở lượt của nó)
  const hu = hover >= 0 && !G.busy && !placing ? G.units.find(u => u.i === hover && canSee(0, u)) : null;
  if (hu && !(sel && selGroup().includes(hu))) {
    const key = `${hover}|${G.turn}|${G.units.map(u => u.i + ':' + u.mp).join(',')}`;
    if (!hoverRange || hoverRange.key !== key) hoverRange = { key, ...rangeOf(hu, hu.owner !== 0 || hu.mp <= 0) };
    if (!sel) drawRange(g, hoverRange.mv.keys(), hoverRange.atk, hu.owner ? 'foe' : 'peek');
  }
  if (sel) {
    drawRange(g, selReach.keys(), selAtk, 'sel');
    if (hu && hu.owner !== 0) drawRange(g, hoverRange.mv.keys(), hoverRange.atk, 'foeLine'); // đang chọn quân mình: chỉ viền vùng địch để không che
    cornerFrame(g, CEN[sel.i].x, CEN[sel.i].y, S);
    const dest = sel.build != null ? sel.build : sel.goto;
    if (dest != null) { g.font = '15px "Segoe UI Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🚩', CEN[dest].x + 12, CEN[dest].y - 12); }
  }
  if (placing) for (const i of buildSites(me, placing.id)) {
    hexPath(g, CEN[i].x, CEN[i].y, S - 3); g.fillStyle = 'rgba(255,225,74,.35)'; g.fill(); g.strokeStyle = '#ffe14a'; g.lineWidth = 3; g.stroke();
  }
  // nhà chính
  for (const p of G.players) {
    const c = p.city; if (!me.explored[c.i]) continue;
    const { x, y } = CEN[c.i];
    drawToken(g, x, y - 2, p.color, p.age >= 2 ? 'buildings/city2' : 'buildings/city1', me.visible[c.i] || p.id === 0 ? c.hp : c.maxHp, c.maxHp, false, 16);
  }
  // đơn vị (gộp theo ô vì dân có thể đứng chung ô mỏ)
  const groups = new Map();
  for (const u of G.units) if (canSee(0, u)) { if (!groups.has(u.i)) groups.set(u.i, []); groups.get(u.i).push(u); }
  for (const [i, list] of groups) {
    const u = list.includes(sel) ? sel : list[0], { x, y } = CEN[i], s = ust(u);
    const mine = u.owner === 0, ready = mine && list.some(needsOrders), spent = mine && !isVil(u) && (u.attacked || u.mp <= 0);
    drawToken(g, x, y - 2, G.players[u.owner].color, 'units/' + u.type, u.hp, s.hp, spent, 12);
    if (ready && !G.busy) { // vòng xanh nhấp nháy: còn chờ lệnh
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260);
      g.beginPath(); g.arc(x, y - 2, 15.5 + pulse * 2, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = 5.5; g.stroke();
      g.strokeStyle = `rgba(150,255,90,${0.7 + 0.3 * pulse})`; g.lineWidth = 3; g.stroke();
    } else if (spent) badge(g, x + 10, y - 12, '✓', '#555b6b');
    else if (mine && isVil(u)) badge(g, x + 10, y - 12, u.build != null ? '🔨' : u.goto != null ? '➜' : '⛏', '#3d4660');
    if (list.length > 1) badge(g, x - 11, y - 12, '×' + list.length, '#1d2230');
  }
  if (sel) for (const t of selTargets.values()) { g.beginPath(); g.arc(CEN[t.i].x, CEN[t.i].y - 2, S - 7, 0, Math.PI * 2); g.strokeStyle = '#ff3b2f'; g.lineWidth = 3; g.stroke(); }
  if (hover >= 0) { hexPath(g, CEN[hover].x, CEN[hover].y, S - 1.5); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5; g.stroke(); }
  // số bay (sát thương, tài nguyên thu về)
  const now = performance.now();
  g.font = 'bold 14px "Segoe UI", "Segoe UI Emoji", sans-serif'; g.textAlign = 'center';
  for (let k = floaters.length - 1; k >= 0; k--) {
    const f = floaters[k], a = (now - f.t0) / 1300;
    if (a >= 1) { floaters.splice(k, 1); continue; }
    if (!me.visible[f.i]) continue;
    g.globalAlpha = 1 - a; g.lineWidth = 3; g.strokeStyle = '#000';
    g.strokeText(f.text, CEN[f.i].x, CEN[f.i].y - 14 - a * 22); g.fillStyle = f.color; g.fillText(f.text, CEN[f.i].x, CEN[f.i].y - 14 - a * 22);
    g.globalAlpha = 1;
  }
}

// ---------- Quản trị kinh tế ----------
function showAdmin(note) {
  const inp = (path, min) => `<input type="number" min="${min}" max="99999" step="1" data-cfg="${path.join('.')}" value="${cfgGet(CFG, path)}"${cfgGet(CFG, path) !== cfgGet(DEFAULT_CFG, path) ? ' class="chg"' : ''}>`;
  let h = `<div class="modal admin"><h1>⚙ Quản trị kinh tế</h1>
    <div class="muted">Dành cho người quản lý trò chơi. Giá, thời gian và chỉ số áp dụng ngay sau khi lưu; tài nguyên khởi đầu, số dân đầu ván, trữ lượng mỏ, Máu Nhà chính và tài nguyên quanh Nhà chính áp dụng từ <b>ván mới</b>. Nếu đặt quá nhiều mỏ quanh nhà so với chỗ trống, game sẽ đặt nhiều nhất có thể. Cấu hình được lưu trên trình duyệt này. Ô viền vàng là giá trị khác mặc định.</div>
    ${note ? `<div class="place" style="margin-top:8px">${note}</div>` : ''}`;
  h += '<div class="cfggrid">';
  for (const [g, title, fields] of CFG_GROUPS)
    h += `<div class="card"><h3>${title}</h3>${fields.map(([f, label, min, max]) => `<label class="cfgrow"><span>${label}${max != null ? ` <small class="muted">(${min}–${max})</small>` : ''}</span>${inp([g, f], min)}</label>`).join('')}</div>`;
  h += '</div>';
  const table = (title, key, defs, fields) => `<h2>${title}</h2><div class="cfgscroll"><table class="cfg"><tr><th></th>${fields.map(f => `<th>${f[1]}</th>`).join('')}</tr>${
    Object.keys(DEFAULT_CFG[key]).map(id => `<tr><td>${defs[id].ico} ${defs[id].name}</td>${fields.map(([f, , min]) => `<td>${inp([key, id, f], min)}</td>`).join('')}</tr>`).join('')}</table></div>`;
  h += table('Giá và chỉ số đơn vị', 'units', UNITS, UNIT_FIELDS) + table('Giá công trình', 'buildings', BUILDINGS, BLD_FIELDS) + table('Giá nâng cấp', 'techs', TECHS, TECH_FIELDS);
  h += `<p style="margin-top:14px"><button class="btn primary" data-act="cfg:save">Lưu cấu hình</button>
    <button class="btn" data-act="cfg:reset">Khôi phục mặc định</button>
    <button class="btn" data-act="cfg:export">Xuất JSON</button>
    <button class="btn" data-act="cfg:import">Nhập JSON</button>
    <button class="btn" data-act="cfg:close">Đóng</button></p>
    <textarea id="cfgjson" rows="4" spellcheck="false" placeholder="Bấm “Xuất JSON” để lấy cấu hình hiện tại ở đây, hoặc dán JSON vào rồi bấm “Nhập JSON”."></textarea></div>`;
  const o = document.getElementById('overlay');
  o.innerHTML = h; o.classList.add('show');
}
function readAdminForm() { // đọc các ô đang nhập thành một cấu hình hợp lệ
  const raw = JSON.parse(JSON.stringify(CFG));
  for (const el of document.querySelectorAll('[data-cfg]')) {
    const path = el.dataset.cfg.split('.'); let o = raw;
    for (const k of path.slice(0, -1)) o = o[k];
    o[path[path.length - 1]] = el.value === '' ? NaN : Number(el.value);
  }
  return sanitizeCfg(raw);
}
function saveCfg(cfg) {
  applyCfg(cfg);
  try { if (cfgChanged()) localStorage.setItem('cfg', JSON.stringify(cfg)); else localStorage.removeItem('cfg'); } catch (e) { return false; }
  return true;
}
function adminAct(a) {
  if (a === 'close') { if (G && !G.over) { document.getElementById('overlay').classList.remove('show'); renderUI(); } else showMenu(); return; }
  if (a === 'save') { const ok = saveCfg(readAdminForm()); showAdmin(ok ? '✅ Đã lưu. Giá mới áp dụng ngay; các mục khởi đầu áp dụng từ ván mới.' : '⚠ Đã áp dụng cho phiên này nhưng không lưu được vào trình duyệt.'); return; }
  if (a === 'reset') { saveCfg(JSON.parse(JSON.stringify(DEFAULT_CFG))); showAdmin('↩ Đã khôi phục toàn bộ về mặc định.'); return; }
  const box = document.getElementById('cfgjson');
  if (a === 'export') { box.value = JSON.stringify(readAdminForm(), null, 1); box.select(); return; }
  if (a === 'import') {
    let data;
    try { data = JSON.parse(box.value); } catch (e) { showAdmin('⚠ JSON không hợp lệ — chưa thay đổi gì.'); return; }
    if (!data || typeof data !== 'object') { showAdmin('⚠ JSON không hợp lệ — chưa thay đổi gì.'); return; }
    saveCfg(sanitizeCfg(data)); showAdmin('✅ Đã nhập và lưu cấu hình. Giá trị thiếu hoặc sai được thay bằng mặc định.');
  }
}

// ---------- Bản đồ con ----------
const MINI_K = 0.3, mini = document.getElementById('mini'), mctx = mini.getContext('2d');
let miniOn = true;
try { miniOn = localStorage.getItem('mini') !== '0'; } catch (e) { /* bỏ qua */ }
mini.width = Math.round(W * MINI_K) * 2; mini.height = Math.round(H * MINI_K) * 2;
mini.style.width = Math.round(W * MINI_K) + 'px'; mini.style.height = Math.round(H * MINI_K) + 'px';
function toggleMini() {
  miniOn = !miniOn;
  try { localStorage.setItem('mini', miniOn ? '1' : '0'); } catch (e) { /* bỏ qua */ }
  if (G) renderUI();
}
function star(g, x, y, r, fill) {
  g.beginPath();
  for (let k = 0; k < 10; k++) { const a = Math.PI / 5 * k - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; g[k ? 'lineTo' : 'moveTo'](x + rr * Math.cos(a), y + rr * Math.sin(a)); }
  g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = 1; g.strokeStyle = '#000'; g.stroke();
}
function drawMini() {
  const show = miniOn && !!G;
  mini.style.display = show ? 'block' : 'none';
  if (!show) return;
  const g = mctx, me = G.players[0], k = MINI_K;
  g.setTransform(2, 0, 0, 2, 0, 0);
  g.fillStyle = '#07080b'; g.fillRect(0, 0, W * k, H * k);
  for (let i = 0; i < N * N; i++) {
    if (!known(me, i)) continue;
    hexPath(g, CEN[i].x * k, CEN[i].y * k, S * k);
    g.fillStyle = TERRAIN[G.t[i]].color; g.fill();
    if (!me.visible[i]) { g.fillStyle = 'rgba(10,12,18,.55)'; g.fill(); }
  }
  for (const b of Object.values(G.bld)) if (me.explored[b.tile]) {
    g.fillStyle = G.players[b.owner].color; g.fillRect(CEN[b.tile].x * k - 3, CEN[b.tile].y * k - 3, 6, 6);
  }
  for (const u of G.units) if (canSee(0, u)) {
    g.beginPath(); g.arc(CEN[u.i].x * k, CEN[u.i].y * k, isVil(u) ? 2.2 : 3, 0, Math.PI * 2);
    g.fillStyle = u.owner ? '#ff6a5c' : '#6fb1ff'; g.fill();
  }
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
  for (const p of G.players) {
    if (!me.explored[p.city.i]) continue;
    const x = CEN[p.city.i].x * k, y = CEN[p.city.i].y * k;
    if (p.id === 0) { g.beginPath(); g.arc(x, y, 9 + pulse * 4, 0, Math.PI * 2); g.strokeStyle = `rgba(255,225,74,${0.9 - pulse * 0.5})`; g.lineWidth = 2; g.stroke(); }
    star(g, x, y, 7.5, p.id ? '#ff4a3a' : '#ffe14a');
  }
}

showMenu();
requestAnimationFrame(draw);
