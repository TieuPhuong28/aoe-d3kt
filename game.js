'use strict';
/* Đế chế D3KT — chiến thuật theo lượt trên lưới hex 15x15 (kinh tế: dân làng là quân cờ, khai thác theo chuyến) */

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
let MINE_CAP = 3, LOAD = 10, FARM_LOAD = 15, FARM_AMT = 300, POP_MAX = 40; // chỉnh được ở màn hình Quản trị
const RES_ICON = { food: '🍖', wood: '🪵', stone: '🪨', gold: '🪙' }, RES_ICON_TXT = RES_ICON; // emoji (dùng cho chữ vẽ trên canvas)
const RES_NAME = { food: 'Thức ăn', wood: 'Gỗ', stone: 'Đá', gold: 'Vàng' };
const AGES = { 1: 'Đời 1 · Đồ Đá', 2: 'Đời 2 · Công Cụ', 3: 'Đời 3 · Đồ Đồng' };
// Lên đời tại Nhà chính: giá, số lượt, cần xây xong `need` loại trong `req`, bán kính lãnh thổ mới, Máu Nhà chính cộng thêm (chỉnh được ở Quản trị)
const AGE_UP = {
  2: { name: 'Đời Công Cụ', cost: { food: 500 }, turns: 5, req: ['granary', 'storage', 'barracks'], need: 2, rad: 4, cityHp: 0 },
  3: { name: 'Đời Đồ Đồng', cost: { food: 800, gold: 200 }, turns: 6, req: ['market', 'range', 'stable'], need: 2, rad: 5, cityHp: 40 },
};
const MAX_AGE = 3;

const UNITS = {
  vil: { name: 'Dân làng', icon: '👷', cls: 'vil', hp: 6, atk: 3, def: 0, mp: 2, range: 1, vision: 1, cost: { food: 50 }, turns: 1, age: 1, at: 'city', desc: 'Khai thác, xây dựng, dò bản đồ, săn thú. Đánh được nhưng yếu, Máu thấp.' },
  club: { name: 'Lính chùy', icon: '🔨', cls: 'inf', hp: 10, atk: 3, def: 2, mp: 2, range: 1, vision: 2, cost: { food: 50 }, turns: 2, age: 1, at: 'barracks', desc: 'Bộ binh cơ bản.' },
  axe: { name: 'Lính rìu', icon: '🪓', cls: 'inf', hp: 12, atk: 4, def: 2, mp: 2, range: 1, vision: 2, cost: { food: 50 }, turns: 2, age: 2, at: 'barracks', desc: 'Bộ binh mạnh hơn Lính chùy.' },
  spear: { name: 'Lính giáo', icon: '🔱', cls: 'spear', hp: 12, atk: 4, def: 3, mp: 2, range: 1, vision: 2, cost: { food: 60, gold: 40 }, turns: 2, age: 2, at: 'barracks', desc: 'x2 sát thương lên Kỵ binh.' },
  archer: { name: 'Cung thủ', icon: '🏹', cls: 'archer', hp: 8, atk: 3, def: 1, mp: 2, range: 2, vision: 2, cost: { food: 40, wood: 20 }, turns: 2, age: 2, at: 'range', desc: 'Trong trận bắn xa 3 ô (Đá tảng chặn; trên Đồi +1 sát thương); yếu khi bị áp sát.' },
  cav: { name: 'Kỵ binh', icon: '🐎', cls: 'cav', hp: 14, atk: 5, def: 2, mp: 4, range: 1, vision: 3, cost: { food: 70, gold: 80 }, turns: 3, age: 2, at: 'stable', desc: 'Nhanh, x1.5 lên Cung thủ; sợ Lính giáo.' },
  // Đời 3 · Đồ Đồng: 4 quân có được bằng nâng cấp quân Đời 2, và Xe chiến mua thẳng
  sword: { name: 'Kiếm sĩ', icon: '🗡️', cls: 'inf', hp: 15, atk: 5, def: 3, mp: 2, range: 1, vision: 2, cost: { food: 60, gold: 20 }, turns: 2, age: 3, at: 'barracks', siege: 1.5, desc: 'Bộ binh Đồ Đồng. x1.5 sát thương lên công trình và Nhà chính.' },
  pike: { name: 'Lính trường thương', icon: '🔱', cls: 'spear', hp: 15, atk: 5, def: 3, mp: 2, range: 1, vision: 2, cost: { food: 60, gold: 40 }, turns: 2, age: 3, at: 'barracks', desc: 'x2 sát thương lên Kỵ binh và Xe chiến.' },
  archer2: { name: 'Cung thủ đồng', icon: '🏹', cls: 'archer', hp: 10, atk: 4, def: 1, mp: 2, range: 2, vision: 3, cost: { food: 40, wood: 30 }, turns: 2, age: 3, at: 'range', desc: 'Cung thủ Đồ Đồng, nhìn xa 3 ô. Trong trận bắn xa 3 ô; yếu khi bị áp sát.' },
  hcav: { name: 'Kỵ binh nặng', icon: '🐎', cls: 'cav', hp: 18, atk: 6, def: 3, mp: 4, range: 1, vision: 3, cost: { food: 70, gold: 80 }, turns: 3, age: 3, at: 'stable', desc: 'Kỵ binh mặc giáp đồng. x1.5 lên Cung thủ; sợ Lính giáo.' },
  chariot: { name: 'Xe chiến', icon: '🛞', cls: 'chariot', hp: 18, atk: 4, def: 3, mp: 3, range: 1, vision: 2, cost: { food: 60, wood: 60 }, turns: 3, age: 3, at: 'stable', desc: 'Không tốn Vàng. x2 lên Cung thủ; bị Lính giáo x2.' },
};
// Chỉ số riêng trên bàn cờ trận đánh (chỉnh được ở Quản trị): init = Tốc độ (ai cao đi trước),
// bmp = Di chuyển mỗi lượt trong trận, brange = Tầm đánh trong trận (1 = cận chiến)
const INIT = { cav: 8, archer: 6, chariot: 6, inf: 5, spear: 4, vil: 3 };
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
// req: phải nghiên cứu xong nâng cấp này trước (cây kỹ thuật mở khóa dần).
const INF = ['club', 'axe', 'sword', 'spear', 'pike'], ARC = ['archer', 'archer2'], CAV = ['cav', 'hcav', 'chariot'];
const MELEE = [...INF, ...CAV];
const each = (ids, v) => Object.fromEntries(ids.map(id => [id, v]));
const TECHS = {
  axe: { name: 'Rìu đồng', icon: '🪓', at: 'barracks', age: 2, cost: { food: 100 }, turns: 2, upgrade: ['club', 'axe'], desc: 'Mọi Lính chùy thành Lính rìu; Nhà lính bán Lính rìu thay Lính chùy' },
  tool: { name: 'Rèn công cụ', icon: '🔨', at: 'storage', age: 2, cost: { food: 100, stone: 40 }, turns: 3, atk: each(MELEE, 1), desc: '+1 Công: mọi quân cận chiến (bộ binh, kỵ binh, Xe chiến)' },
  armInf: { name: 'Giáp da bộ binh', icon: '🛡️', at: 'storage', age: 2, cost: { food: 75 }, turns: 2, def: each(INF, 1), desc: '+1 Thủ: bộ binh (chùy, rìu, giáo, Kiếm sĩ, trường thương)' },
  armArc: { name: 'Giáp da cung thủ', icon: '🎽', at: 'storage', age: 2, cost: { food: 100 }, turns: 2, def: each(ARC, 1), desc: '+1 Thủ: Cung thủ' },
  armCav: { name: 'Giáp da kỵ binh', icon: '🐎', at: 'storage', age: 2, cost: { food: 125 }, turns: 2, def: each(CAV, 1), desc: '+1 Thủ: Kỵ binh, Xe chiến' },
  wood: { name: 'Chế gỗ', icon: '🪚', at: 'market', age: 2, cost: { food: 120, wood: 75 }, turns: 2, load: { wood: 2 }, desc: '+2 Gỗ mỗi chuyến' },
  farm: { name: 'Thuần hóa', icon: '🐄', at: 'market', age: 2, cost: { food: 200, wood: 50 }, turns: 3, farmAmt: 100, desc: 'Mỗi Ruộng lúa chứa thêm 100 Thức ăn (cả ruộng đang có)' },
  stone: { name: 'Khai đá', icon: '⛏️', at: 'market', age: 2, cost: { food: 100, wood: 50 }, turns: 2, load: { stone: 2 }, desc: '+2 Đá mỗi chuyến' },
  gold: { name: 'Khai vàng', icon: '🪙', at: 'market', age: 2, cost: { food: 120, wood: 100 }, turns: 2, load: { gold: 2 }, desc: '+2 Vàng mỗi chuyến' },
  // ----- Đời 3 · Đồ Đồng -----
  sword: { name: 'Kiếm đồng', icon: '🗡️', at: 'barracks', age: 3, req: 'axe', cost: { food: 140, gold: 50 }, turns: 3, upgrade: ['axe', 'sword'], desc: 'Mọi Lính rìu thành Kiếm sĩ; Nhà lính bán Kiếm sĩ' },
  pike: { name: 'Giáo dài', icon: '🔱', at: 'barracks', age: 3, cost: { food: 120, gold: 60 }, turns: 3, upgrade: ['spear', 'pike'], desc: 'Mọi Lính giáo thành Lính trường thương' },
  archer2: { name: 'Cung đồng', icon: '🏹', at: 'range', age: 3, cost: { food: 120, wood: 80 }, turns: 3, upgrade: ['archer', 'archer2'], desc: 'Mọi Cung thủ thành Cung thủ đồng' },
  arrow: { name: 'Mũi tên đồng', icon: '🎯', at: 'range', age: 3, req: 'archer2', cost: { food: 100, wood: 50, gold: 40 }, turns: 2, atk: each(ARC, 1), desc: '+1 Công: Cung thủ' },
  hcav: { name: 'Ngựa chiến', icon: '🐎', at: 'stable', age: 3, cost: { food: 150, gold: 100 }, turns: 3, upgrade: ['cav', 'hcav'], desc: 'Mọi Kỵ binh thành Kỵ binh nặng' },
  yoke: { name: 'Ách đồng', icon: '🛞', at: 'stable', age: 3, cost: { food: 100, wood: 100 }, turns: 2, atk: { chariot: 1 }, def: { chariot: 1 }, desc: '+1 Công, +1 Thủ: Xe chiến' },
  bronze: { name: 'Rèn đồng', icon: '⚒️', at: 'storage', age: 3, req: 'tool', cost: { food: 150, gold: 60 }, turns: 3, atk: each(MELEE, 1), desc: '+1 Công nữa: mọi quân cận chiến' },
  brInf: { name: 'Giáp đồng bộ binh', icon: '🛡️', at: 'storage', age: 3, req: 'armInf', cost: { food: 125, gold: 50 }, turns: 3, def: each(INF, 1), desc: '+1 Thủ nữa: bộ binh' },
  brArc: { name: 'Giáp đồng cung thủ', icon: '🎽', at: 'storage', age: 3, req: 'armArc', cost: { food: 125, gold: 50 }, turns: 3, def: each(ARC, 1), desc: '+1 Thủ nữa: Cung thủ' },
  brCav: { name: 'Giáp đồng kỵ binh', icon: '🐎', at: 'storage', age: 3, req: 'armCav', cost: { food: 150, gold: 60 }, turns: 3, def: each(CAV, 1), desc: '+1 Thủ nữa: Kỵ binh, Xe chiến' },
  wood2: { name: 'Cưa đồng', icon: '🪚', at: 'market', age: 3, req: 'wood', cost: { food: 150, wood: 100 }, turns: 3, load: { wood: 3 }, desc: '+3 Gỗ mỗi chuyến nữa' },
  stone2: { name: 'Đục đồng', icon: '⛏️', at: 'market', age: 3, req: 'stone', cost: { food: 150, wood: 80 }, turns: 3, load: { stone: 3 }, desc: '+3 Đá mỗi chuyến nữa' },
  gold2: { name: 'Đào sâu', icon: '🪙', at: 'market', age: 3, req: 'gold', cost: { food: 180, wood: 120 }, turns: 3, load: { gold: 3 }, desc: '+3 Vàng mỗi chuyến nữa' },
};
// ---------- Đế chế (theo dữ liệu AoE1 Rise of Rome, xem phong-van/2026-11-19-ke-hoach-de-che.md) ----------
// bonus: lợi thế có tác dụng — kind 'cost': giá các quân trong `units` nhân `mul` (làm tròn).
// ban: id quân / nâng cấp của game mà đế chế không có. later: đặc điểm game chưa có, chỉ hiện chữ.
// ai: gợi ý cho AI — vil: số dân mục tiêu cộng thêm mỗi đời.
const CIVS = {
  none: { name: 'Không đế chế', arch: '', desc: 'Không có lợi thế riêng.', bonus: [], ban: [], later: [] },
  shang: {
    name: 'Shang', arch: 'Châu Á', desc: 'Dân làng rẻ, kinh tế khởi đầu nhanh.',
    bonus: [{ kind: 'cost', units: ['vil'], mul: 0.7, txt: 'Dân làng rẻ hơn 30% (🍖50 → 🍖35)' }],
    ban: [],
    later: ['Tường Máu ×2 (game chưa có Tường)', 'Không có: Voi chiến, Voi bắn cung, Phalanx, Long Sword, Legion, Centurion, thuyền chiến, một số công nghệ Đời Đồ Sắt'],
    ai: { vil: 2 },
  },
  sumerian: {
    name: 'Sumerian', arch: 'Ai Cập', desc: 'Ruộng lúa gấp đôi, dân làng khỏe.',
    bonus: [
      { kind: 'farmAmt', pct: 1, txt: 'Ruộng lúa chứa gấp đôi Thức ăn' },
      { kind: 'hp', units: ['vil'], mul: 1.6, txt: 'Dân làng Máu ×1,6 (6 → 10)' },
    ],
    ban: ['cav', 'hcav', 'archer2', 'arrow'],
    banTxt: 'Không có Kỵ binh, Kỵ binh nặng, Cung đồng (nên cũng không có Mũi tên đồng)',
    later: ['Quân công thành đánh nhanh hơn (game chưa có công thành)', 'Không có: Balista, Helepolis, Legion, Cataphract, voi, thuyền chiến lớn, một số công nghệ Đời Đồ Sắt'],
  },
  yamato: {
    name: 'Yamato', arch: 'Châu Á', desc: 'Kỵ binh rẻ, dân làng đi nhanh.',
    bonus: [
      { kind: 'cost', units: ['cav', 'hcav'], mul: 0.75, txt: 'Kỵ binh, Kỵ binh nặng rẻ hơn 25%' },
      { kind: 'mp', units: ['vil'], add: 1, txt: 'Dân làng +1 Di chuyển (2 → 3)' },
    ],
    ban: ['chariot', 'yoke'],
    banTxt: 'Không có Xe chiến (nên cũng không có Ách đồng)',
    later: ['Thuyền Máu +30% (game chưa có Thuyền)', 'Không có: Tháp canh nâng cấp, Thầy tu nâng cao, Broad Sword, Long Sword, Legion, voi, lạc đà, máy bắn đá lớn'],
  },
  roman: {
    name: 'Roman', arch: 'La Mã', desc: 'Công trình rẻ, Kiếm sĩ đánh mạnh.',
    bonus: [
      { kind: 'bcost', blds: ['house', 'granary', 'storage', 'barracks', 'market', 'farm', 'range', 'stable'], mul: 0.85, txt: 'Mọi công trình rẻ hơn 15%' },
      { kind: 'atk', units: ['sword'], mul: 1.2, txt: 'Kiếm sĩ +20% Công (5 → 6)' },
    ],
    ban: ['hcav'],
    banTxt: 'Không có Ngựa chiến (Kỵ binh nặng)',
    later: ['Tháp canh rẻ hơn 50% (game chưa có Tháp)', 'Không có: Composite Bow, Irrigation, Cataphract, voi, lạc đà, kỵ cung, xe cung, một số công nghệ Đền và Đời Đồ Sắt'],
  },
  greek: {
    name: 'Greek', arch: 'Hy Lạp', desc: 'Lính giáo cơ động.',
    bonus: [{ kind: 'mp', units: ['spear', 'pike'], add: 1, txt: 'Lính giáo, Lính trường thương +1 Di chuyển (2 → 3)' }],
    ban: ['archer2', 'arrow', 'chariot', 'yoke'],
    banTxt: 'Không có Cung đồng, Mũi tên đồng, Xe chiến, Ách đồng',
    later: ['Thuyền chiến chạy nhanh hơn (game chưa có Thuyền)', 'Không có: Composite Bow, Broad Sword, Long Sword, Legion, Metallurgy, Cataphract, voi, lạc đà, kỵ cung, xe cung, một số công nghệ Đền'],
  },
  egyptian: {
    name: 'Egyptian', arch: 'Ai Cập', desc: 'Khai thác Vàng giỏi, Xe chiến bền.',
    bonus: [
      { kind: 'load', res: ['gold'], pct: 0.4, txt: 'Dân đào Vàng +40% mỗi chuyến (10 → 14): mang nhiều hơn và đào nhanh hơn' }, // AoE1: mang +2 (+20%) và tốc độ làm việc +0.2 (+20%), gộp vào mỗi chuyến
      { kind: 'hp', units: ['chariot'], mul: 1.33, txt: 'Xe chiến Máu ×1,33 (18 → 24)' },
    ],
    ban: ['cav', 'hcav'],
    banTxt: 'Không có Kỵ binh, Kỵ binh nặng',
    later: ['Thầy tu bắn xa và nhìn xa hơn (game chưa có Thầy tu)', 'Không có: Coinage, Siege Craft, Bronze Shield, Broad Sword, Long Sword, Phalanx, Legion, máy bắn đá lớn, Balista, Helepolis, kỵ cung'],
  },
  palmyra: {
    name: 'Palmyra', arch: 'La Mã', desc: 'Dân làng đắt nhưng giỏi việc, có giáp.',
    bonus: [
      { kind: 'cost', units: ['vil'], mul: 1.5, txt: 'Dân làng đắt hơn 50% (🍖50 → 🍖75)' },
      { kind: 'load', res: ['food', 'wood', 'gold', 'stone', 'farm'], pct: 0.2, txt: 'Dân khai thác mọi tài nguyên +20% mỗi chuyến (10 → 12, Ruộng 15 → 18)' },
      { kind: 'def', units: ['vil'], add: 1, txt: 'Dân làng +1 Thủ (0 → 1)' },
    ],
    ban: [],
    later: ['Cống nạp không mất phí (game chưa có Cống nạp)', 'Lạc đà chạy nhanh hơn 25% (game chưa có Lạc đà)', 'Không có: Plow, Irrigation, Craftsmanship, Coinage, Long Sword, Legion, Centurion, Metallurgy, Cataphract, công nghệ Đền, thuyền lớn'],
  },
  minoan: {
    name: 'Minoan', arch: 'Hy Lạp', desc: 'Ruộng lúa bền, Cung thủ đồng bắn xa.',
    bonus: [
      { kind: 'farmAmt', pct: 0.24, txt: 'Ruộng lúa chứa thêm 24% Thức ăn (300 → 372)' },
      { kind: 'brange', units: ['archer2'], add: 1, txt: 'Cung thủ đồng +1 Tầm trong trận (3 → 4)' },
      { kind: 'vision', units: ['archer2'], add: 1, txt: 'Cung thủ đồng +1 Tầm nhìn (3 → 4)' },
    ],
    ban: ['hcav', 'chariot', 'yoke'],
    banTxt: 'Không có Ngựa chiến (Kỵ binh nặng), Xe chiến, Ách đồng',
    later: ['Mọi thuyền rẻ hơn 30% (game chưa có Thuyền)', 'Không có: Tháp canh nâng cấp, Fortifications, Legion, Cataphract, voi, kỵ cung, xe cung, công nghệ Đền'],
  },
  hittite: {
    name: 'Hittite', arch: 'Babylon', desc: 'Cung thủ đánh mạnh.',
    bonus: [{ kind: 'atk', units: ['archer', 'archer2'], add: 1, txt: 'Cung thủ +1 Công (3 → 4)' }],
    ban: ['archer2', 'arrow', 'hcav'],
    banTxt: 'Không có Cung đồng, Mũi tên đồng, Ngựa chiến (Kỵ binh nặng)',
    later: ['Quân công thành Máu ×2 (game chưa có công thành)', 'Thuyền chiến bắn xa, nhìn xa +4 (game chưa có Thuyền)', 'Không có: Long Sword, Legion, Cataphract, Balista, Helepolis, Slinger, Medicine, công nghệ Đền, thuyền'],
  },
  phoenician: {
    name: 'Phoenician', arch: 'Hy Lạp', desc: 'Đốn gỗ giỏi.',
    bonus: [{ kind: 'load', res: ['wood'], pct: 0.5, txt: 'Dân đốn Gỗ +50% mỗi chuyến (10 → 15): mang nhiều hơn và đốn nhanh hơn' }], // AoE1: mang +3 (+30%) và tốc độ làm việc +0.2 (+20%)
    ban: ['hcav'],
    banTxt: 'Không có Ngựa chiến (Kỵ binh nặng)',
    later: ['Voi chiến, Voi bắn cung rẻ hơn 25% (game chưa có Voi)', 'Thuyền bắn đá đánh nhanh hơn (game chưa có Thuyền)', 'Không có: Architecture, Chain Mail, Metallurgy, Siege Craft, máy bắn đá lớn, Balista, Helepolis, Cataphract, kỵ cung'],
  },
  persian: {
    name: 'Persian', arch: 'Babylon', desc: 'Săn bắn giỏi.',
    bonus: [{ kind: 'load', res: ['meat'], pct: 0.6, txt: 'Dân săn thịt (hươu, voi) +60% mỗi chuyến (10 → 16): mang nhiều hơn và làm nhanh hơn' }], // AoE1 Hunter: mang +3 (+30%), tốc độ làm việc +0.3 (+30%)
    ban: ['spear', 'pike', 'chariot', 'yoke', 'wood2'],
    banTxt: 'Không có Lính giáo, Lính trường thương, Xe chiến, Ách đồng, Cưa đồng',
    later: ['Voi chiến, Voi bắn cung chạy nhanh hơn (game chưa có Voi)', 'Trireme đánh nhanh hơn (game chưa có Thuyền)', 'Không có: Plow, Wheel, Craftsmanship, Coinage, Siege Craft, Aristocracy, Balista, Helepolis, máy bắn đá lớn'],
  },
  carthage: {
    name: 'Carthage', arch: 'La Mã', desc: 'Lính giáo bền.',
    bonus: [{ kind: 'hp', units: ['spear', 'pike'], mul: 1.25, txt: 'Lính giáo, Lính trường thương Máu ×1,25 (12 → 15, 15 → 19)' }],
    ban: ['chariot', 'yoke'],
    banTxt: 'Không có Xe chiến, Ách đồng',
    later: ['Voi chiến, Voi bắn cung Máu ×1,25 (game chưa có Voi)', 'Thuyền vận tải nhanh hơn, Fire Galley đánh mạnh hơn (game chưa có Thuyền)', 'Không có: Fortifications, Chain Mail, Metallurgy, Siege Craft, Composite Bow, Legion, Cataphract, máy bắn đá lớn, công nghệ Đền'],
  },
  macedonian: {
    name: 'Macedonian', arch: 'La Mã', desc: 'Lính giáo chịu tên tốt, quân nhìn xa.',
    bonus: [
      { kind: 'defArc', units: ['spear', 'pike'], add: 2, txt: 'Lính giáo, Lính trường thương +2 Thủ trước Cung thủ' },
      { kind: 'vision', units: ['vil', 'club', 'axe', 'sword', 'spear', 'pike', 'cav', 'hcav'], add: 1, txt: 'Dân làng, bộ binh, Kỵ binh +1 Tầm nhìn' },
    ],
    ban: ['chariot', 'yoke'],
    banTxt: 'Không có Xe chiến, Ách đồng',
    later: ['Quân công thành rẻ hơn 50% (game chưa có công thành)', 'Thuyền đánh cá, buôn, vận tải nhìn xa +2 (game chưa có Thuyền)', 'Không có: Đền và mọi công nghệ Đền, Wheel, Nobility, Engineering, Craftsmanship, Siege Craft, Fortifications, Long Sword, Legion, máy bắn đá lớn'],
  },
  babylonian: {
    name: 'Babylonian', arch: 'Babylon', desc: 'Khai thác Đá giỏi.',
    bonus: [{ kind: 'load', res: ['stone'], pct: 0.5, txt: 'Dân đào Đá +50% mỗi chuyến (10 → 15): mang nhiều hơn và đào nhanh hơn' }], // AoE1 Stone Miner: mang +3 (+30%), tốc độ làm việc +0.2 (+20%)
    ban: ['hcav'],
    banTxt: 'Không có Ngựa chiến (Kỵ binh nặng)',
    later: ['Tường, Tháp canh Máu ×2 (game chưa có Tường, Tháp)', 'Thầy tu hồi sức nhanh hơn (game chưa có Thầy tu)', 'Không có: Chain Mail, Metallurgy, Phalanx, Tower Shield, Iron Shield, Cataphract, voi, Balista, Helepolis, thuyền lớn'],
  },
  assyrian: {
    name: 'Assyrian', arch: 'Ai Cập', desc: 'Cung thủ bắn nhanh, dân làng đi nhanh.',
    bonus: [
      { kind: 'atk', units: ['archer', 'archer2'], mul: 1.27, txt: 'Cung thủ +27% Công (3 → 4)' }, // AoE1: thời gian giữa 2 đòn 1.4 → 1.1
      { kind: 'mp', units: ['vil'], add: 1, txt: 'Dân làng +1 Di chuyển (2 → 3)' },
    ],
    ban: ['archer2', 'arrow', 'yoke'],
    banTxt: 'Không có Cung đồng, Mũi tên đồng, Ách đồng',
    later: ['Kỵ cung, Xe cung bắn nhanh hơn (game chưa có)', 'Không có: Architecture, Alchemy, Engineering, Nobility, Aristocracy, Chain Mail, Bronze Shield, Phalanx, Slinger, voi, thuyền lớn'],
  },
  choson: {
    name: 'Choson', arch: 'Châu Á', desc: 'Kiếm sĩ rất bền.',
    bonus: [{ kind: 'hp', units: ['sword'], mul: 1.5, txt: 'Kiếm sĩ Máu ×1,5 (15 → 23)' }], // AoE1: Long Swordsman, Legion Máu +80 (×2); áp cho Kiếm sĩ, giảm còn ×1,5 vì Kiếm sĩ của game rẻ (chốt 2026-11-19)
    ban: ['chariot', 'yoke'],
    banTxt: 'Không có Xe chiến, Ách đồng',
    later: ['Thầy tu rẻ hơn 32% (game chưa có Thầy tu)', 'Tháp canh bắn xa, nhìn xa +2 (game chưa có Tháp)', 'Không có: Composite Bow, Chain Mail, Phalanx, Engineering, Nobility, Aristocracy, Alchemy, Iron Shield, Tower Shield, voi, lạc đà, máy bắn đá lớn'],
  },
};
const CIV_PICK = ['shang', 'sumerian', 'yamato', 'roman', 'greek', 'egyptian', 'palmyra', 'minoan', 'hittite', 'phoenician', 'persian', 'carthage', 'macedonian', 'babylonian', 'assyrian', 'choson']; // các đế chế đã làm, chọn được ở Ván mới
const civOf = p => CIVS[(p && p.civ) || 'none'] || CIVS.none;
function unitCost(p, id) { // giá quân sau bonus đế chế
  const base = UNITS[id].cost, out = { ...base };
  for (const b of civOf(p).bonus) if (b.kind === 'cost' && b.units.includes(id)) for (const k in out) out[k] = Math.round(out[k] * b.mul);
  return out;
}
function bldCost(p, id) { // giá công trình sau bonus đế chế
  const out = { ...BUILDINGS[id].cost };
  for (const b of civOf(p).bonus) if (b.kind === 'bcost' && b.blds.includes(id)) for (const k in out) out[k] = Math.round(out[k] * b.mul);
  return out;
}
// Công cộng thêm theo đế chế: phần tăng theo tỉ lệ của Công gốc (Công 5, ×1.2 → +1)
// mul: theo tỉ lệ của Công gốc; add: cộng thẳng
const civAtk = (p, id) => civOf(p).bonus.reduce((a, b) => a + (b.kind === 'atk' && b.units.includes(id) ? (b.add || 0) + (b.mul ? Math.round(UNITS[id].atk * (b.mul - 1)) : 0) : 0), 0);
const civBanned = (p, id) => civOf(p).ban.includes(id);
function unitHp(p, id) { // Máu tối đa của loại quân sau bonus đế chế
  let hp = UNITS[id].hp;
  for (const b of civOf(p).bonus) if (b.kind === 'hp' && b.units.includes(id)) hp = Math.round(hp * (b.mul || 1)) + (b.add || 0);
  return hp;
}
const maxHp = x => unitHp(G.players[x.owner], x.type); // x: quân trên bản đồ hoặc quân cờ trong trận
const civMpAdd = (p, id) => civOf(p).bonus.reduce((a, b) => a + (b.kind === 'mp' && b.units.includes(id) ? b.add : 0), 0);
const unitMp = (p, id) => UNITS[id].mp + civMpAdd(p, id); // Di chuyển tối đa trên bản đồ
const maxMp = x => unitMp(G.players[x.owner], x.type);
const bmpOf = x => UNITS[x.type].bmp + civMpAdd(G.players[x.owner], x.type); // Di chuyển trong trận
// thêm mỗi chuyến theo tỉ lệ của mức gốc. keys: loại việc — 'food'/'wood'/'gold'/'stone' (mỏ), thêm 'meat' (thịt hươu, voi)
// hoặc 'berry' (quả) cho Thức ăn; 'farm' (Ruộng lúa, gốc FARM_LOAD). Mỗi bonus tính một lần nếu khớp bất kỳ key nào.
function civLoad(p, ...keys) {
  const base = keys[0] === 'farm' ? FARM_LOAD : LOAD;
  return civOf(p).bonus.reduce((a, b) => a + (b.kind === 'load' && keys.some(k => b.res.includes(k)) ? Math.round(base * b.pct) : 0), 0);
}
const civAdd = (p, kind, id) => civOf(p).bonus.reduce((a, b) => a + (b.kind === kind && b.units.includes(id) ? b.add : 0), 0); // cộng thẳng: 'vision' tầm nhìn, 'brange' tầm trong trận, 'defArc' Thủ trước Cung thủ
const civDef = (p, id) => civOf(p).bonus.reduce((a, b) => a + (b.kind === 'def' && b.units.includes(id) ? b.add : 0), 0); // Thủ cộng thêm
const civFarmPct = p => civOf(p).bonus.reduce((a, b) => a + (b.kind === 'farmAmt' ? b.pct : 0), 0);
// Loại quân hiện tại của một dòng quân sau các nâng cấp đã có: club → axe → sword
function lineOf(p, id) {
  for (let k = 0; k < 4; k++) {
    const e = Object.entries(TECHS).find(([tid, t]) => t.upgrade && t.upgrade[0] === id && hasTech(p, tid));
    if (!e) break;
    id = e[1].upgrade[1];
  }
  return id;
}
// ---------- Ảnh (icon) ----------
// Mỗi hình có một tên file cố định trong thư mục assets/: units/<loại quân>, buildings/<loại công trình>,
// buildings/city1 (Nhà chính đời 1), buildings/city2 (đời 2), buildings/site (công trường), res/<food|wood|stone|gold>.
// Game thử <tên>.png trước, rồi <tên>.svg; không có file nào thì dùng emoji như cũ.
const ICON_EMOJI = { 'buildings/city1': '🛖', 'buildings/city2': '🏘️', 'buildings/city3': '🏯', 'buildings/site': '🚧',
  'animals/deer': '🦌', 'animals/elephant': '🐘', 'animals/deer_dead': '🦴', 'animals/elephant_dead': '🦴' }; // thú hoang và xác
for (const [k, d] of Object.entries(UNITS)) ICON_EMOJI['units/' + k] = d.icon;
for (const [k, d] of Object.entries(BUILDINGS)) ICON_EMOJI['buildings/' + k] = d.icon;
for (const [k, e] of Object.entries(RES_ICON)) ICON_EMOJI['res/' + k] = e;
for (const [k, d] of Object.entries(TECHS)) ICON_EMOJI['tech/' + k] = d.icon; // icon nâng cấp: assets/tech/<mã>.svg
Object.assign(ICON_EMOJI, { 'ui/atk': '⚔', 'ui/def': '🛡', 'ui/range': '🏹', 'ui/mp': '👣', 'ui/hp': '❤' }); // icon chỉ số
const IMG = {}; // ảnh đã nạp xong: tên -> Image
function loadIcons() {
  let redraw = 0;
  for (const key of Object.keys(ICON_EMOJI)) {
    const exts = ['png', 'svg'], im = new Image();
    const next = () => { const e = exts.shift(); if (e) im.src = `assets/${key}.${e}`; };
    im.onload = () => {
      IMG[key] = im; clearTimeout(redraw); redraw = setTimeout(() => { if (G) renderUI(); }, 50);
      if (key.startsWith('units/') && /\.svg$/.test(im.src)) fetch(im.src).then(r => r.text()).then(t => { SVG_SRC[key] = t; }).catch(() => {}); // để đổi màu áo theo phe
    };
    im.onerror = next;
    next();
  }
}
// Ảnh đơn vị SVG tô áo bằng TEAM_KEY (màu phe Bạn); phe khác: thay chuỗi màu trong mã SVG rồi nạp thành ảnh riêng.
// Nếu không đọc được mã SVG (mở bằng file://) hoặc ảnh là PNG thì dùng ảnh gốc; vòng màu dưới chân vẫn cho biết phe.
const TEAM_KEY = ['#2f6fde', '#1f4fa8'], SVG_SRC = {}, TEAM_IMG = {};
const darken = (hex, k) => '#' + [1, 3, 5].map(j => Math.round(parseInt(hex.slice(j, j + 2), 16) * k).toString(16).padStart(2, '0')).join('');
function teamImg(key, color) {
  if (color.toLowerCase() === TEAM_KEY[0] || !SVG_SRC[key]) return IMG[key];
  const k = key + color;
  if (!TEAM_IMG[k]) {
    TEAM_IMG[k] = new Image();
    TEAM_IMG[k].src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SVG_SRC[key].split(TEAM_KEY[0]).join(color).split(TEAM_KEY[1]).join(darken(color, 0.68)));
  }
  return TEAM_IMG[k].complete && TEAM_IMG[k].naturalWidth ? TEAM_IMG[k] : IMG[key];
}
// HTML: thẻ <img> nếu có ảnh, không thì emoji
const ico = key => (IMG[key] ? `<img class="ic" src="${IMG[key].src}" alt="">` : ICON_EMOJI[key] || '');
const resIco = k => ico('res/' + k);
for (const [k, d] of Object.entries(UNITS)) Object.defineProperty(d, 'ico', { get: () => ico('units/' + k) });
for (const [k, d] of Object.entries(BUILDINGS)) Object.defineProperty(d, 'ico', { get: () => ico('buildings/' + k) });
for (const [k, d] of Object.entries(TECHS)) Object.defineProperty(d, 'ico', { get: () => ico('tech/' + k) });
// Canvas: vẽ ảnh vừa khung size×size tâm (x, y), không có thì vẽ emoji
function drawIcon(g, key, x, y, size) {
  const im = IMG[key];
  if (im) { g.drawImage(im, x - size / 2, y - size / 2, size, size); return; }
  g.font = `${Math.round(size * 0.8)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#fff'; g.fillText(ICON_EMOJI[key] || '?', x, y + 1);
}
loadIcons();
const QUEUE_MAX = 5; // số mục tối đa trong hàng chờ của một công trình
// ---------- Cấu hình kinh tế (dành cho người quản lý trò chơi) ----------
const UNIT_FIELDS = [['food', '🍖 Thức ăn', 0], ['wood', '🪵 Gỗ', 0], ['gold', '🪙 Vàng', 0], ['turns', 'Số lượt', 1], ['hp', 'Máu', 1], ['atk', 'Công', 0], ['def', 'Thủ', 0], ['mp', 'Di chuyển', 1], ['init', 'Tốc độ (trận)', 1], ['bmp', 'Di chuyển (trận)', 1], ['brange', 'Tầm (trận)', 1]];
const BLD_FIELDS = [['wood', '🪵 Gỗ', 0], ['stone', '🪨 Đá', 0], ['gold', '🪙 Vàng', 0], ['turns', 'Số lượt xây', 1], ['hp', 'Máu', 1]];
const TECH_FIELDS = [['food', '🍖 Thức ăn', 0], ['wood', '🪵 Gỗ', 0], ['stone', '🪨 Đá', 0], ['gold', '🪙 Vàng', 0], ['turns', 'Số lượt', 1]];
const AI_FIELDS = [['gather', 'Khai thác (%)', 10, 400], ['bonus', 'Tài nguyên thêm đầu ván (mỗi loại)', 0], ['march', 'Gom đủ bao nhiêu lính mới kéo đi đánh', 1, 20]];
// Độ khó AI: "chấp" bằng tốc độ khai thác, tài nguyên thêm đầu ván, cỡ đạo quân đi đánh; Rất khó thấy toàn bản đồ. Số chỉnh trong Quản trị.
const DIFFS = {
  easy: { name: 'Dễ', key: 'aiEasy', desc: 'AI khai thác chậm, gom đông mới đi đánh.' },
  normal: { name: 'Thường', key: 'aiNormal', desc: 'AI chơi bình thường.' },
  hard: { name: 'Khó', key: 'aiHard', desc: 'AI khai thác nhanh hơn, có thêm tài nguyên, đánh sớm.' },
  vhard: { name: 'Rất khó', key: 'aiVhard', desc: 'Như Khó nhưng mạnh hơn, và AI thấy toàn bộ bản đồ.', omni: true },
};
const CFG_GROUPS = [ // [khóa, tiêu đề, [[trường, nhãn, giá trị nhỏ nhất]]]
  ['aiEasy', 'AI · Dễ', AI_FIELDS], ['aiNormal', 'AI · Thường', AI_FIELDS], ['aiHard', 'AI · Khó', AI_FIELDS], ['aiVhard', 'AI · Rất khó (thấy toàn bản đồ)', AI_FIELDS],
  ['start', 'Khởi đầu ván', [['food', '🍖 Thức ăn', 0], ['wood', '🪵 Gỗ', 0], ['stone', '🪨 Đá', 0], ['gold', '🪙 Vàng', 0], ['villagers', 'Số dân làng', 1]]],
  ['gather', 'Khai thác', [['load', 'Mỗi chuyến mang về', 1], ['farmLoad', 'Mỗi chuyến từ Ruộng lúa', 1], ['mineCap', 'Số dân tối đa mỗi ô mỏ', 1]]],
  ['amounts', 'Trữ lượng mỗi ô', [['forest', 'Rừng (Gỗ)', 1], ['woodlot', 'Bãi gỗ nhỏ (Gỗ)', 1], ['gold', 'Mỏ vàng', 1], ['stone', 'Mỏ đá', 1], ['berry', 'Bụi quả dâu', 1], ['deer', 'Đàn hươu', 1], ['elephant', 'Đàn voi', 1], ['farm', 'Ruộng lúa', 1]]],
  ['pop', 'Dân số', [['base', 'Chỗ từ Nhà chính', 1], ['perHouse', 'Chỗ mỗi Nhà dân', 1], ['max', 'Trần dân số', 1]]],
  ['age', 'Lên Đời Công Cụ', [['food', '🍖 Thức ăn', 0], ['turns', 'Số lượt', 1]]],
  ['age3', 'Lên Đời Đồ Đồng', [['food', '🍖 Thức ăn', 0], ['gold', '🪙 Vàng', 0], ['turns', 'Số lượt', 1], ['cityHp', 'Máu Nhà chính cộng thêm', 0]]],
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
    pop: { base: 4, perHouse: 4, max: 40 }, age: { food: 500, turns: 5 }, age3: { food: 800, gold: 200, turns: 6, cityHp: 40 }, city: { hp: 80 }, units: {},
    aiEasy: { gather: 75, bonus: 0, march: 6 }, aiNormal: { gather: 100, bonus: 0, march: 4 }, aiHard: { gather: 125, bonus: 100, march: 3 }, aiVhard: { gather: 150, bonus: 200, march: 3 }, buildings: {}, techs: {},
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
  POP_MAX = cfg.pop.max;
  Object.assign(AMT, { [FOREST]: cfg.amounts.forest, [HILLS]: cfg.amounts.gold, [STONE]: cfg.amounts.stone, [BERRY]: cfg.amounts.berry, [DEER]: cfg.amounts.deer, [ELEPHANT]: cfg.amounts.elephant, [WOODLOT]: cfg.amounts.woodlot });
  const cost = (o, keys) => { const c = {}; for (const k of keys) if (o[k] > 0) c[k] = o[k]; return c; };
  Object.assign(AGE_UP[2], { cost: cost(cfg.age, ['food']), turns: cfg.age.turns });
  Object.assign(AGE_UP[3], { cost: cost(cfg.age3, ['food', 'gold']), turns: cfg.age3.turns, cityHp: cfg.age3.cityHp });
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
let focusId = null; // lính đang xem chỉ số trong đạo/đoàn (null = lính được chọn)
let G = null, sel = null, selReach = new Map(), selTargets = new Map(), selAtk = new Set(), hoverRange = null, hover = -1, placing = null, selPick = null, selB = null, techOpen = false; // techOpen: cửa sổ cây kỹ thuật đang mở
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
// Lựa chọn ván mới: đời bắt đầu (cả hai bên) và độ khó AI, nhớ trên trình duyệt
let startAgeSel = 1, diffSel = 'normal';
try { const a = +localStorage.getItem('startAge'); if (a >= 1 && a <= 3) startAgeSel = a; if (DIFFS[localStorage.getItem('diff')]) diffSel = localStorage.getItem('diff'); } catch (e) { /* bỏ qua */ }
function setStartAge(n) { n = +n; if (!(n >= 1 && n <= MAX_AGE)) return; startAgeSel = n; try { localStorage.setItem('startAge', n); } catch (e) { /* bỏ qua */ } }
function setDiff(k) { if (!DIFFS[k]) return; diffSel = k; try { localStorage.setItem('diff', k); } catch (e) { /* bỏ qua */ } }
// Đế chế: của bạn ('none' hoặc id trong CIV_PICK) và của AI (thêm 'random' = ngẫu nhiên trong CIV_PICK)
let civSel = 'none', aiCivSel = 'random';
try { const c = localStorage.getItem('civ'), a = localStorage.getItem('aiCiv'); if (c === 'random' || c === 'none' || CIV_PICK.includes(c)) civSel = c; if (a === 'random' || a === 'none' || CIV_PICK.includes(a)) aiCivSel = a; } catch (e) { /* bỏ qua */ }
function setCiv(k, ai) { if (!(k === 'none' || k === 'random' || CIV_PICK.includes(k))) return; if (ai) aiCivSel = k; else civSel = k; try { localStorage.setItem(ai ? 'aiCiv' : 'civ', k); } catch (e) { /* bỏ qua */ } }
const civTip = c => [...c.bonus.map(b => '✔ ' + b.txt), ...(c.banTxt ? ['🚫 ' + c.banTxt] : []), ...c.later.map(x => '… ' + x)].join('<br>') || c.desc;
const gDiff = () => DIFFS[(G && G.diff) || 'normal'] || DIFFS.normal; // ván cũ chưa có độ khó: Thường
const aiCfg = () => CFG[gDiff().key];
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
  G = { turn: 1, t: m.t, players: [], units: [], uid: 1, log: [], over: null, busy: false, amt: m.t.map(x => AMT[x] || 0), bld: {}, reveal: mapMode === 'light', diff: diffSel, startAge: startAgeSel };
  G.players.push(mkPlayer(0, m.ps), mkPlayer(1, m.as));
  const pickCiv = k => (k === 'random' ? CIV_PICK[rnd(CIV_PICK.length)] : k); // Ngẫu nhiên: một trong các đế chế đã làm
  G.players[0].civ = pickCiv(civSel); G.players[1].civ = pickCiv(aiCivSel);
  for (const p of G.players) for (let n = 2; n <= Math.min(G.startAge, MAX_AGE); n++) { // bắt đầu ở đời cao: chỉ đổi đời, lãnh thổ và Máu Nhà chính theo đời
    const a = AGE_UP[n], c = p.city; p.age = n; c.terr = within(c.i, a.rad).filter(j => j !== c.i);
    if (a.cityHp) { c.maxHp += a.cityHp; c.hp += a.cityHp; }
  }
  const bonus = aiCfg().bonus; for (const k in G.players[1].res) G.players[1].res[k] += bonus;
  for (const p of G.players) for (let k = 0; k < CFG.start.villagers; k++) spawn(p, 'vil', p.city.i);
  for (const p of G.players) updateVision(p);
  placing = null; sel = null; selPick = null; selB = null; techOpen = false; selReach.clear(); selTargets.clear(); floaters.length = 0;
  if (civSel === 'random') log(`🎲 Đế chế của bạn (ngẫu nhiên): ${civOf(G.players[0]).name} — ${civOf(G.players[0]).bonus.map(b => b.txt).join('; ')}.`, 'info');
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
  placing = null; sel = null; selPick = null; selB = null; techOpen = false; selReach = new Map(); selTargets = new Map(); selAtk = new Set(); floaters.length = 0;
  for (const p of G.players) updateVision(p);
  log('Đã tải ván đã lưu.', 'info');
  document.getElementById('overlay').classList.remove('show');
  renderUI();
  return true;
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveGame(); });
window.addEventListener('pagehide', saveGame);

// ---------- Tiện ích ----------
function log(msg, cls = '') { G.log.push({ t: G.turn, msg, cls }); if (G.log.length > 60) G.log.shift(); if (cls === 'good' || cls === 'bad' || cls === 'warn') toast(msg, cls); }
// Thông báo nổi góc trên bản đồ (việc tốt/xấu), tự tắt sau 5 giây, bấm để tắt; không bị che khi rê chuột như nhật ký
function toast(msg, cls) {
  const box = document.getElementById('toasts'); if (!box) return;
  const el = document.createElement('div'); el.className = 'toast ' + cls; el.innerHTML = msg; box.prepend(el);
  while (box.children.length > 4) box.lastChild.remove();
  const bye = () => { el.classList.add('out'); setTimeout(() => el.remove(), 350); };
  el.onclick = bye; setTimeout(bye, 5000);
}
function floater(i, text, color) { floaters.push({ i, text, color, t0: performance.now() }); }
const unitAt = i => G.units.find(u => u.i === i);
const unitsAt = i => G.units.filter(u => u.i === i);
const cityAt = i => G.players.find(p => p.city.i === i);
const isVil = u => u.type === 'vil';
const ARMY_MAX = 5; // số lính tối đa trong một đạo (cùng đứng một ô)
const armyAt = (i, owner) => G.units.filter(u => u.i === i && !isVil(u) && (owner == null || u.owner === owner));
// Đoàn dân: các dân cùng phe đứng chung một ô (tối đa bằng số dân mỗi ô mỏ), đi và làm việc cùng nhau như một đạo
const vilsAt = (i, owner) => G.units.filter(u => u.i === i && isVil(u) && (owner == null || u.owner === owner));
const groupAt = u => (isVil(u) ? vilsAt : armyAt)(u.i, u.owner);
const TRAINS = { barracks: ['club', 'spear'], range: ['archer'], stable: ['cav', 'chariot'] }; // dòng quân gốc; quân thật = lineOf()
const ust = u => UNITS[u.type];
// ---------- Nâng cấp: hiệu ứng ----------
const hasTech = (p, id) => !!(p && p.tech && p.tech[id]);
function techSum(p, key, sub) { // cộng dồn hiệu ứng `key` (atk/def/load) cho loại quân hoặc tài nguyên `sub`
  let s = 0;
  if (p && p.tech) for (const id in p.tech) { const e = TECHS[id] && TECHS[id][key]; if (e && e[sub]) s += e[sub]; }
  return s;
}
const atkBonus = x => techSum(G.players[x.owner], 'atk', x.type) + civAtk(G.players[x.owner], x.type); // x: quân trên bản đồ hoặc quân cờ trong trận (đều có owner, type)
const defBonus = x => techSum(G.players[x.owner], 'def', x.type) + civDef(G.players[x.owner], x.type);
const atkOf = x => UNITS[x.type].atk + atkBonus(x);
const defOf = x => UNITS[x.type].def + defBonus(x);
const withBonus = (v, b) => (b ? `${v + b} (+${b})` : `${v}`); // "4 (+1)"
const farmAmtOf = p => Math.round(FARM_AMT * (1 + civFarmPct(p))) + (hasTech(p, 'farm') ? TECHS.farm.farmAmt : 0);
// Quân một nhà đang bán: bản nâng cấp mới nhất của từng dòng (Nhà lính bán Lính rìu thay Lính chùy sau khi có Rìu đồng…)
const trainList = (p, bid) => (TRAINS[bid] || []).filter(id => UNITS[id].age <= p.age).map(id => lineOf(p, id)).filter(id => !civBanned(p, id));
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
  if (p.id === 1 && gDiff().omni) { p.visible.fill(1); p.explored.fill(1); return; } // AI Rất khó thấy toàn bộ bản đồ
  p.visible.fill(0);
  const see = (i, r) => { for (const j of within(i, r)) { p.visible[j] = 1; p.explored[j] = 1; } };
  see(p.city.i, 2);
  for (const b of bldOf(p)) if (b.done) see(b.tile, 1);
  for (const u of G.units) if (u.owner === p.id) see(u.i, ust(u).vision + civAdd(p, 'vision', u.type) + (G.t[u.i] === HILLS ? 2 : 0));
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
const nextAge = p => AGE_UP[p.age + 1] || null; // thông tin lên đời kế tiếp, null nếu đã ở đời cao nhất
const ageReq = p => { const a = nextAge(p); return a ? a.req.filter(id => countBld(p, id, true) > 0).length : 0; };
const ageOfItem = it => +String(it.id).slice(3) || 2; // mục hàng chờ 'age2' / 'age3'

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
  if (b) return b.id === 'farm' && b.done && b.owner === p.id ? { res: 'food', load: FARM_LOAD + civLoad(p, 'farm'), d: dropDist(p, i, 'food'), farm: b } : null;
  if (isMine(i)) { const res = MINE_RES[G.t[i]]; return { res, load: LOAD + techSum(p, 'load', res) + civLoad(p, res, ...(res === 'food' ? [isMeat(i) ? 'meat' : 'berry'] : [])), d: dropDist(p, i, res) }; }
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
        const d = UNITS[type], u = { id: G.uid++, owner: p.id, type, i: n, hp: unitHp(p, type), mp: unitMp(p, type), moved: false, attacked: false, build: null, goto: null, trip: 0, stuck: 0 };
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
  if (!u || !isVil(u) || d.age > p.age || (d.req && !countBld(p, d.req, true)) || !canAfford(p, bldCost(p, id)) || !buildSites(p, id).includes(tile)) return false;
  pay(p, bldCost(p, id));
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
  const cost = unitCost(p, id);
  if (!canAfford(p, cost) || popUsed(p) >= popCap(p)) return false;
  pay(p, cost); q.queue.push({ kind: 'unit', id, left: d.turns, paid: { ...cost } });
  return true;
}
// Nghiên cứu: xếp chung hàng chờ với huấn luyện; mỗi nâng cấp chỉ ở một nơi một lúc
function canResearch(p, where, id) {
  const q = queueOf(p, where), t = TECHS[id];
  return !!(q && t && where !== 'city' && !civBanned(p, id) && q.id === t.at && t.age <= p.age && (!t.req || hasTech(p, t.req)) && !hasTech(p, id) && !techQueued(p, id) && q.queue.length < QUEUE_MAX);
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
    const [from, to] = t.upgrade, gain = unitHp(p, to) - unitHp(p, from);
    for (const u of myUnits(p.id)) if (u.type === from) { u.type = to; u.hp = Math.max(1, u.hp + gain); } // giữ nguyên phần Máu đã mất
  }
}
function startAge(p) {
  const c = p.city;
  const a = nextAge(p);
  if (!a || c.queue.some(x => x.kind === 'age') || c.queue.length >= QUEUE_MAX || ageReq(p) < a.need || !canAfford(p, a.cost)) return false;
  pay(p, a.cost); c.queue.push({ kind: 'age', id: 'age' + (p.age + 1), left: a.turns, paid: { ...a.cost } });
  return true;
}
function cancelTrain(p, where, k) { // k: vị trí mục trong hàng chờ (không có thì hủy mục cuối)
  const q = queueOf(p, where); if (!q || !q.queue.length) return;
  if (!(k >= 0 && k < q.queue.length)) k = q.queue.length - 1;
  const it = q.queue.splice(k, 1)[0];
  if (it.kind === 'age') pay(p, it.paid || AGE_UP[ageOfItem(it)].cost, 1);
  else if (it.kind === 'tech') pay(p, it.paid || TECHS[it.id].cost, 1);
  else pay(p, it.paid || unitCost(p, it.id), 1);
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
      if (g.farm.amt <= 0) { destroyBld(u.i); if (me) log('🌱 Một Ruộng lúa đã cạn, ô trở lại Đất trống. Dân ở đó đang rảnh.', 'warn'); }
    } else if (MINE_RES[G.t[u.i]]) {
      amt = Math.min(amt, G.amt[u.i]); G.amt[u.i] -= amt;
      if (G.amt[u.i] <= 0) {
        if (me) log(`${RES_ICON_TXT[g.res]} ${TERRAIN[G.t[u.i]].name} đã cạn và trở thành Đất trống. Dân ở đó đang rảnh.`, 'warn');
        G.t[u.i] = EMPTY; for (const k of ['dead', 'ahp']) if (G[k]) delete G[k][u.i]; // xóa dấu vết con thú
      }
    }
    p.res[g.res] += me ? amt : Math.round(amt * aiCfg().gather / 100); // AI khai thác theo độ khó
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
      const n = ageOfItem(it), a = AGE_UP[n];
      p.age = n; c.terr = within(c.i, a.rad).filter(j => j !== c.i); q.queue.shift();
      if (a.cityHp) { c.maxHp += a.cityHp; c.hp += a.cityHp; }
      log(me ? `Bạn đã tiến lên ${a.name}! Lãnh thổ mở rộng${a.cityHp ? `, Nhà chính +${a.cityHp} Máu` : ''}; mở ${ageUnlockNames(n)}.` : `Địch đã tiến lên ${a.name}!`, me ? 'good' : 'bad');
      if (me) ageBanner(n);
    } else if (it.kind === 'tech') {
      finishTech(p, it.id); q.queue.shift();
      if (me) log(`Nghiên cứu xong: ${TECHS[it.id].name}. ${TECHS[it.id].desc}.`, 'good'); // nghiên cứu của địch không báo
    } else if (spawn(p, lineOf(p, it.id), q === c ? c.i : q.tile)) { // quân xếp hàng trước khi nâng cấp xong thì ra bản đã nâng cấp
      if (me) log(`Huấn luyện xong: ${UNITS[lineOf(p, it.id)].name}.`, 'good');
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
  if (isVil(u)) return occ.every(isVil) && occ.length + size <= (G.bld[n] ? 1 : MINE_CAP); // đoàn dân tối đa MINE_CAP (Ruộng lúa: 1 dân)
  if (!occ.length) return true;
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
    const grp = groupAt(u).filter(m => m.goto === u.goto && m.build == null); // cả đạo / đoàn dân đi cùng nhau
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
  if (full) for (const m of grp) m.mp = maxMp(m);
  const mv = reach(u, u.owner === 0, grp);
  if (full) grp.forEach((m, k) => { m.mp = save[k]; });
  return { mv, atk: atkZone(u, grp, mv, full) };
}
function dmgCore(att, dType, df, k, rand) { // att: quân đánh (có type, owner); dType = null khi mục tiêu là công trình; df đã gồm Thủ từ nâng cấp
  const a = UNITS[att.type], d = dType && UNITS[dType]; let m = 1;
  if (d) {
    if (a.cls === 'spear' && (d.cls === 'cav' || d.cls === 'chariot')) m = 2;
    else if (a.cls === 'chariot' && d.cls === 'archer') m = 2;
    else if (a.cls === 'cav' && d.cls === 'archer') m = 1.5;
    else if (a.range === 1 && d.cls === 'archer') m = 1.25;
  } else if (a.siege) m = a.siege; // Kiếm sĩ phá công trình nhanh hơn
  const r = rand ? 0.85 + Math.random() * 0.3 : 1;
  return Math.max(1, Math.round(atkOf(att) * m * 2 * k * r) - df);
}
// Thủ của mục tiêu trước một quân đánh: thêm Thủ riêng trước Cung thủ theo đế chế ('defArc', Macedonian)
const defVs = (att, tgt) => defOf(tgt) + (UNITS[att.type].cls === 'archer' ? civAdd(G.players[tgt.owner], 'defArc', tgt.type) : 0);
function calcDmg(att, tgt, k, rand) {
  if (tgt.u) return dmgCore(att, tgt.u.type, defVs(att, tgt.u) + TERRAIN[G.t[tgt.u.i]].def, k, rand);
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
    if (!u.moved && !u.attacked && u.hp < maxHp(u)) u.hp = Math.min(maxHp(u), u.hp + 2);
    u.mp = maxMp(u); u.moved = false; u.attacked = false;
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
  const n = t => mil.filter(u => u.type === t).length, inf = lineOf(p, 'club');
  const nIn = ids => mil.filter(u => ids.includes(u.type)).length, cntInf = nIn(INF), cntArc = nIn(ARC), cntCav = nIn(CAV);
  const armor = [['armInf', cntInf], ['armArc', cntArc], ['armCav', cntCav]].sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const armor3 = { armInf: 'brInf', armArc: 'brArc', armCav: 'brCav' };
  const order = [
    ['axe', n('club') >= 2 || countBld(p, 'barracks', true) > 0], // có Lính chùy, hoặc có Nhà lính (sắp mua bộ binh)
    ['tool', true],
    ['farm', countBld(p, 'farm', true) >= 2],
    ['gold', vills.some(v => aiResOf(p, v) === 'gold')],
    ['wood', true],
    ...armor.map(id => [id, true]),
    ['stone', true],
    // Đời 3: nâng cấp quân theo loại đang có nhiều, rồi rèn đồng, giáp đồng, khai thác
    ['sword', cntInf > 0 || countBld(p, 'barracks', true) > 0],
    ['bronze', true],
    ['pike', n('spear') > 0],
    ['hcav', n('cav') > 0],
    ['archer2', cntArc > 0],
    ['yoke', n('chariot') >= 2],
    ...armor.map(id => [armor3[id], true]),
    ['gold2', vills.some(v => aiResOf(p, v) === 'gold')],
    ['arrow', cntArc >= 2],
    ['wood2', true],
    ['stone2', true],
  ];
  const reserve = unitCost(p, inf);
  for (const [id, cond] of order) {
    const t = TECHS[id];
    if (!cond || t.age > p.age || (t.req && !hasTech(p, t.req)) || hasTech(p, id) || techQueued(p, id)) continue;
    const b = bldOf(p).find(x => x.id === t.at && x.done && !x.queue.length);
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
  const share = p.age === 1 ? { food: 0.5, wood: 0.5, gold: 0 } : p.age === 2 ? { food: 0.4, wood: 0.35, gold: 0.25 } : { food: 0.3, wood: 0.35, gold: 0.35 }; // Đời 3 cần nhiều Gỗ (Xe chiến) và Vàng (nâng cấp)
  if (p.res.food > 500) share.food *= p.res.food > 1500 ? 0.25 : 0.5;
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
  const na = nextAge(p), canAge = !!na && ageReq(p) >= na.need, saving = canAge && vills.length >= (p.age === 1 ? 8 : 14);
  const ageFood = na ? na.cost.food || 0 : 0;
  const threat = G.units.some(u => u.owner !== p.id && !isVil(u) && canSee(p.id, u) && D(u.i, c.i) <= 5);
  // Nhà chính: lên đời hoặc ra dân
  if (!c.queue.length) {
    if (saving && canAfford(p, na.cost)) startAge(p);
    else if (vills.length < [0, 10, 16, 20][p.age] + ((civOf(p).ai || {}).vil || 0) && (!saving || p.res.food >= ageFood + 60)) train(p, 'city', 'vil');
  }
  // Nâng cấp (trước khi mua quân, để Nhà lính rảnh còn kịp nghiên cứu Rìu đồng)
  aiResearch(p, mil, vills);
  // Quân đội
  let queued = bldOf(p).reduce((a, b) => a + b.queue.filter(x => x.kind === 'unit').length, 0);
  const wantMil = Math.min(22, 2 + Math.floor(G.turn / 6));
  for (const b of bldOf(p)) {
    if (!b.done || b.queue.length || !['barracks', 'range', 'stable'].includes(b.id)) continue;
    if (!threat && (mil.length + queued >= wantMil || (saving && p.res.food < ageFood + 100))) break;
    const n = t => mil.filter(u => u.type === t).length;
    const inf = lineOf(p, 'club'), spear = lineOf(p, 'spear'), arc = lineOf(p, 'archer'), cav = lineOf(p, 'cav');
    // Xe chiến (không tốn Vàng) khi thấy nhiều Cung thủ địch hoặc đang thiếu Vàng
    const foeArc = G.units.filter(u => u.owner !== p.id && UNITS[u.type].cls === 'archer' && canSee(p.id, u)).length;
    const inf2 = civBanned(p, spear) ? inf : spear; // đế chế không có Lính giáo: mua bộ binh thường
    const stableId = !civBanned(p, 'chariot') && (civBanned(p, cav) || (p.age >= 3 && (foeArc >= 2 || p.res.gold < (unitCost(p, cav).gold || 0) + 30))) ? 'chariot' : cav;
    const id = b.id === 'range' ? arc : b.id === 'stable' ? stableId : p.age < 2 ? inf : (p.res.gold >= (unitCost(p, inf2).gold || 0) && n(inf2) <= n(inf) ? inf2 : inf);
    if (b.id === 'range' && n(arc) * 3 > mil.length + 2) continue;
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
  const march = aiCfg().march, marching = grp.length >= march || (D(u.i, home) > 5 && grp.length >= 2); // đạo đủ đông mới kéo đi
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
  const mates = grp.length >= march ? [] : [...new Set(myUnits(p.id).filter(m => !isVil(m) && m.i !== u.i && D(m.i, u.i) <= 6).map(m => m.i))]
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
    if (m.rest && m.hp >= maxHp(m)) m.rest = false;
    if (!m.rest && canSplit(m) && m.hp <= maxHp(m) * 0.35 && armyAt(m.i, 1).some(o => o !== m && o.hp > maxHp(o) * 0.35)) m.rest = true;
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
  const st = groupAt(sel);
  return selPick ? st.filter(m => selPick.includes(m.id)) : st;
};
function select(u, pick = null) { // pick: id các lính được tách khỏi đạo (null = cả đạo)
  sel = u; selReach = new Map(); selTargets = new Map(); selAtk = new Set(); selPick = null;
  if (u) { selB = null; ensureVisible(u.i); }
  if (u && pick) {
    const st = groupAt(u), ids = pick.filter(id => st.some(m => m.id === id && canSplit(m)));
    if (ids.length && ids.length < st.length) { selPick = ids; sel = st.find(m => m.id === ids[0]); }
  }
  if (sel) { const grp = selGroup(); selReach = reach(sel, true, grp); selTargets = attackTargets(grp, selReach); selAtk = atkZone(sel, grp, selReach); }
}
function togglePick(id) { // bấm "Tách" trên một lính: thêm/bớt lính đó khỏi nhóm tách
  if (!sel) return;
  const st = groupAt(sel), cur = selPick ? [...selPick] : [], k = cur.indexOf(id);
  if (k >= 0) cur.splice(k, 1); else cur.push(id);
  select(st.find(m => m.id === cur[0]) || sel, cur);
}
function splitHalf() { // tách đôi: đưa nửa số lính còn MP ra thành đạo mới
  if (!sel) return;
  const st = groupAt(sel), free = st.filter(canSplit);
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
      const crew = (pl.crew || [pl.uid]).map(id => G.units.find(x => x.id === id)).filter(m => m && G.units.includes(m));
      for (const m of crew) { m.build = i; m.goto = null; }
      if (D(u.i, i) > 1) walk(u, i, crew.filter(m => m.i === u.i));
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
    select(own.includes(sel) ? sel : own[0]); // bấm ô là chọn cả đạo / đoàn dân (hủy nhóm tách nếu có)
    renderUI(); return;
  }
  const ob = G.bld[i], oc = cityAt(i);
  if ((oc && oc.id === 0) || (ob && ob.owner === 0 && !(sel && isVil(sel) && !ob.done))) { // bấm công trình của mình: chọn nó
    selectBld(oc ? 'city' : i); renderUI(); return;
  }
  if (sel) {
    const u = sel, b = G.bld[i], grp = selGroup();
    if (isVil(u) && b && b.owner === 0 && !b.done) { // giao việc xây tiếp công trình dang dở (cả đoàn)
      for (const m of grp) { m.build = i; m.goto = null; }
      if (D(u.i, i) > 1) walk(u, i, grp);
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
  const list = myUnits(0).filter(needsOrders).filter(u => groupAt(u).find(needsOrders) === u);
  if (!list.length) return;
  const cur = sel ? groupAt(sel).find(needsOrders) : sel;
  select(list[(list.indexOf(cur) + 1) % list.length]); renderUI();
}

const cv = document.getElementById('cv'), ctx2 = cv.getContext('2d');
// ---------- Phóng to bản đồ ----------
// Bản đồ vừa khung ở 100%; phóng thì khung bản đồ cuộn được (kéo chuột, thanh cuộn, bấm bản đồ con).
// RES: số điểm ảnh canvas cho mỗi đơn vị tọa độ, tăng theo tỷ lệ phóng để hình vẫn nét (tối đa 3 cho đỡ nặng).
const ZOOMS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3], mapwrap = document.getElementById('mapwrap');
let zoom = 1, RES = 0;
try { const z = +localStorage.getItem('zoom'); if (ZOOMS.includes(z)) zoom = z; } catch (e) { /* bỏ qua */ }
// (px, py): điểm trên màn hình giữ nguyên chỗ khi đổi tỷ lệ (mặc định giữa khung)
function applyZoom(px, py) {
  const r = mapwrap.getBoundingClientRect(), cr = cv.getBoundingClientRect();
  if (px == null) { px = r.left + r.width / 2; py = r.top + r.height / 2; }
  const fx = cr.width ? (px - cr.left) / cr.width : 0.5, fy = cr.height ? (py - cr.top) / cr.height : 0.5;
  const fit = Math.min(r.width / W, r.height / H), cw = Math.floor(W * fit * zoom), ch = Math.floor(H * fit * zoom);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  const res = Math.min(3, Math.max(2, Math.ceil(fit * zoom * (window.devicePixelRatio || 1) * 2) / 2)); // điểm ảnh thật trên mỗi đơn vị, làm tròn 0.5
  if (res !== RES) { RES = res; cv.width = Math.round(W * RES); cv.height = Math.round(H * RES); TILE_CACHE.clear(); } // chỉ gọi sau khi cả file đã chạy (ResizeObserver, cuối file)
  mapwrap.scrollLeft = fx * cw - (px - r.left);
  mapwrap.scrollTop = fy * ch - (py - r.top);
}
function setZoom(z, px, py) {
  if (!ZOOMS.includes(z) || z === zoom) return;
  zoom = z;
  try { localStorage.setItem('zoom', String(z)); } catch (e) { /* bỏ qua */ }
  applyZoom(px, py);
  if (G) renderUI();
}
const zoomStep = (d, px, py) => setZoom(ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + d))], px, py);
// đưa ô i vào giữa khung nếu nó đang nằm ngoài phần nhìn thấy
function ensureVisible(i) {
  if (i == null || zoom === 1) return;
  const r = mapwrap.getBoundingClientRect(), cr = cv.getBoundingClientRect();
  const x = cr.left + CEN[i].x / W * cr.width, y = cr.top + CEN[i].y / H * cr.height, m = 40;
  if (x < r.left + m || x > r.right - m) mapwrap.scrollLeft += x - (r.left + r.width / 2);
  if (y < r.top + m || y > r.bottom - m) mapwrap.scrollTop += y - (r.top + r.height / 2);
}
new ResizeObserver(() => applyZoom()).observe(mapwrap);
cv.addEventListener('wheel', e => { e.preventDefault(); zoomStep(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY); }, { passive: false });
// kéo chuột trái để di chuyển bản đồ đã phóng; kéo xong thì không tính là bấm ô
let drag = null, dragged = false;
cv.addEventListener('pointerdown', e => { if (e.button === 0) { drag = { x: e.clientX, y: e.clientY, sl: mapwrap.scrollLeft, st: mapwrap.scrollTop }; dragged = false; } });
window.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!dragged && Math.hypot(dx, dy) < 6) return;
  dragged = true; cv.classList.add('grab');
  mapwrap.scrollLeft = drag.sl - dx; mapwrap.scrollTop = drag.st - dy;
});
window.addEventListener('pointerup', () => { drag = null; cv.classList.remove('grab'); });
function tileFromEvent(e) {
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
  let best = -1, bd = S * S;
  for (let i = 0; i < N * N; i++) { const dx = CEN[i].x - x, dy = CEN[i].y - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
  return best;
}
cv.addEventListener('click', e => { if (dragged) { dragged = false; return; } onTileClick(tileFromEvent(e)); });
cv.addEventListener('contextmenu', e => { e.preventDefault(); if (G && !G.busy) { placing = null; select(null); selB = null; renderUI(); } });
// Rê chuột: thông tin ô hiện ở cột "Ô dưới chuột" của bảng dưới đáy (không che bản đồ)
cv.addEventListener('mouseleave', () => { hover = -1; renderInfo(); });
cv.addEventListener('mousemove', e => {
  if (!G) return;
  const i = tileFromEvent(e);
  if (i !== hover) { hover = i; renderInfo(); }
});
document.addEventListener('keydown', e => {
  if (!G || document.getElementById('overlay').classList.contains('show')) return;
  if (e.key === 'Enter') { e.preventDefault(); endTurn(); }
  else if (e.key === 'n' || e.key === 'N' || e.key === 'Tab') { e.preventDefault(); if (!G.busy) nextUnit(); }
  else if (e.key === 'Escape' && techOpen) { techOpen = false; renderUI(); }
  else if (e.key === 'Escape') { placing = null; select(null); selB = null; renderUI(); }
  else if ((e.key === 'h' || e.key === 'H') && !G.busy) { selectBld('city'); renderUI(); }
  else if (e.key === 't' || e.key === 'T') { techOpen = !techOpen; renderUI(); }
  else if (e.key === 'm' || e.key === 'M') toggleMini();
  else if (e.key === 'b' || e.key === 'B') togglePanel();
  else if (e.key === '+' || e.key === '=') zoomStep(1);
  else if (e.key === '-' || e.key === '_') zoomStep(-1);
  else if (e.key === '0') setZoom(1);
});
const ttEl = document.createElement('div'); ttEl.id = 'tt'; document.body.appendChild(ttEl);
document.addEventListener('mouseover', e => {
  const t = e.target.closest && e.target.closest('[data-tt]');
  if (!t) { ttEl.classList.remove('show'); return; }
  ttEl.innerHTML = t.dataset.tt; ttEl.classList.add('show');
  const r = t.getBoundingClientRect(), w = ttEl.offsetWidth, h = ttEl.offsetHeight;
  let y = r.top - h - 6; if (y < 4) y = r.bottom + 6;
  ttEl.style.left = Math.max(4, Math.min(innerWidth - w - 4, r.left + r.width / 2 - w / 2)) + 'px'; ttEl.style.top = y + 'px';
});
document.addEventListener('mousedown', () => ttEl.classList.remove('show'));
document.addEventListener('mouseover', e => {
  const t = e.target.closest && e.target.closest('[data-tip]'); if (!t) return;
  const box = t.closest('.card') && t.closest('.card').querySelector('.bdesc'); if (box) { box.innerHTML = t.dataset.tip; box.classList.remove('muted'); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'zoomsel') setZoom(+e.target.value);
  if (e.target.dataset.civsel) { setCiv(e.target.value, e.target.dataset.civsel === 'ai'); showMenu(); } // droplist đế chế ở Ván mới
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
  if (act === 'panel') { togglePanel(); return; }
  if (act === 'zoom') { zoomStep(+a); return; }
  if (act === 'admin') { showAdmin(); return; }
  if (act === 'cfg') { adminAct(a); return; }
  if (act === 'unselb') { selB = null; renderUI(); return; }
  if (act === 'mapmode') { setMapMode(a); showMenu(); return; }
  if (act === 'startage') { setStartAge(a); showMenu(); return; }
  if (act === 'diff') { setDiff(a); showMenu(); return; }
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
  else if (act === 'focus') focusId = +a;
  else if (act === 'splithalf') splitHalf();
  else if (act === 'unpick' && sel) select(sel);
  else if (act === 'selb') selectBld(a === 'city' ? 'city' : +a);
  else if (act === 'techwin') techOpen = !techOpen;
  else if (act === 'train') train(me, where, c);
  else if (act === 'age') { const na = nextAge(me); if (startAge(me)) log(`Bắt đầu tiến lên ${na.name}.`, 'info'); }
  else if (act === 'canceltrain') cancelTrain(me, where, c == null ? null : +c);
  else if (act === 'research') research(me, where, c);
  else if (act === 'techgo') { const b = bldOf(me).find(x => x.id === a && x.done); if (b) { selectBld(b.tile); techOpen = false; } }
  else if (act === 'bld') { if (sel && isVil(sel)) placing = { id: a, uid: sel.id, crew: selGroup().map(m => m.id) }; }
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
    h += `<hr style="border-color:#445;margin:4px 0"><b>${s.ico} ${s.name}</b> (${u.owner ? 'địch' : 'bạn'})<br>Máu ${u.hp}/${maxHp(u)}` + (s.atk ? ` · Công ${withBonus(s.atk, atkBonus(u))} · Thủ ${withBonus(s.def, defBonus(u))}` : ' · không chiến đấu');
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
  const item = x => (x.kind === 'age' ? { ico: '⬆️', name: 'Lên ' + AGE_UP[ageOfItem(x)].name, turns: AGE_UP[ageOfItem(x)].turns } : x.kind === 'tech' ? TECHS[x.id] : UNITS[x.id]);
  // ô đầu: đang làm (thanh tiến độ, số lượt còn); các ô sau: đang chờ, mục giống nhau liền nhau gộp thành ×N; ô gạch: chỗ trống
  const pic = x => (x.kind === 'unit' ? bigIco('units/' + x.id) : x.kind === 'tech' ? bigIco('tech/' + x.id) : '<span class="em">⬆️</span>');
  const slots = [];
  q.queue.forEach((x, k) => {
    const last = slots[slots.length - 1];
    if (last && last.k0 > 0 && last.x.kind === x.kind && last.x.id === x.id) { last.n++; last.k = k; } else slots.push({ x, n: 1, k0: k, k });
  });
  const cells = slots.map(sl => {
    const d = item(sl.x), cur = sl.k0 === 0;
    const tip = `<b>${d.name}</b>${sl.n > 1 ? ` ×${sl.n}` : ''}<br>${cur ? `Đang làm · còn ${sl.x.left}/${d.turns} lượt` : 'Đang chờ'}<br><i>Bấm để hủy${sl.n > 1 ? ' 1 mục' : ''}, hoàn lại tài nguyên</i>`;
    return `<button class="qslot ${sl.x.kind}${cur ? ' cur' : ' wait'}" data-act="canceltrain:${where}:${sl.k}" data-tt="${attrEsc(tip)}">${pic(sl.x)}`
      + (cur ? `<span class="ql">${sl.x.left}</span><span class="qbar"><i style="width:${Math.min(100, (1 - sl.x.left / d.turns) * 100)}%"></i></span>` : '')
      + (sl.n > 1 ? `<b class="qn">×${sl.n}</b>` : '') + '</button>';
  }).join('');
  const empty = '<span class="qslot empty"></span>'.repeat(Math.max(0, QUEUE_MAX - q.queue.length));
  return `<div class="qrow">${cells}${empty}</div><div class="muted qhelp">${q.queue.length ? 'Bấm ô để hủy, hoàn tiền.' : 'Chưa mua gì.'}</div>`;
}
// Nút mua quân của một nhà, kèm chỉ số của quân đó
function trainOptsHtml(p, where, q, opts) {
  const full = popUsed(p) >= popCap(p), qfull = q.queue.length >= QUEUE_MAX;
  return '<div class="tgrid">' + opts.map(id => {
    const d = UNITS[id], cost = unitCost(p, id), n = q.queue.filter(x => x.kind === 'unit' && x.id === id).length, poor = !canAfford(p, cost);
    const st = `❤${unitHp(p, id)} · ⚔${withBonus(d.atk, techSum(p, 'atk', id) + civAtk(p, id))} · 🛡${withBonus(d.def, techSum(p, 'def', id) + civDef(p, id))} · ${unitMp(p, id)} MP${d.range > 1 ? ` · tầm ${d.range}` : ''}`;
    const note = full ? '⚠ Hết chỗ dân số — xây thêm Nhà dân' : qfull ? `Hàng chờ đã đầy (${QUEUE_MAX})` : poor ? '⚠ Chưa đủ tài nguyên' : n ? `Đang chờ ${n} — bấm để xếp thêm` : 'Bấm để mua';
    const cut = JSON.stringify(cost) !== JSON.stringify(d.cost) ? ` <s class="muted">${costStr(d.cost)}</s> <span class="muted">(${civOf(p).name})</span>` : '';
    const tip = `<b>${d.name}</b><br>${costStr(cost)}${cut} · ${d.turns} lượt<br>${st}<br>${d.desc}<br><i>${note}</i>`;
    return `<span class="tt-w" data-tt="${attrEsc(tip)}"><button class="tic unit${poor || full || qfull ? ' poor' : ' ready'}" data-act="train:${where}:${id}" ${!poor && !full && !qfull ? '' : 'disabled'}>${bigIco('units/' + id)}${n ? `<b class="qn">×${n}</b>` : ''}</button></span>`;
  }).join('') + '</div>';
}
// Nút nghiên cứu của một nhà: đã xong ✅, đang nghiên cứu (ở đây hoặc nhà khác cùng loại), khóa theo đời, hoặc mua được
function techState(p, id) {
  const t = TECHS[id];
  if (hasTech(p, id)) return { done: true, txt: '✅ Đã nghiên cứu' };
  for (const b of bldOf(p)) { const k = b.queue.findIndex(x => x.kind === 'tech' && x.id === id); if (k >= 0) return { busy: true, txt: k ? '⏳ Đang chờ trong hàng' : `⏳ Đang nghiên cứu · còn ${b.queue[k].left} lượt` }; }
  if (civBanned(p, id)) return { locked: true, txt: `🚫 ${civOf(p).name} không có` };
  if (t.age > p.age) return { locked: true, txt: '🔒 Cần ' + AGE_UP[t.age].name };
  if (t.req && !hasTech(p, t.req)) return { locked: true, txt: '🔒 Cần ' + TECHS[t.req].name };
  return { txt: '' };
}
const techCat = t => (t.at === 'market' ? 'eco' : t.at === 'storage' ? 'arm' : 'mil'); // màu nền ô: kinh tế / giáp & rèn / quân sự
function techOptsHtml(p, where, b) { // bảng của một nhà: chia theo đời, hiện cả nâng cấp còn khóa kèm lý do
  let h = '';
  for (const age of [2, 3]) {
    const list = Object.entries(TECHS).filter(([, t]) => t.at === b.id && t.age === age);
    if (!list.length) continue;
    h += `<div class="tage"><div class="tsub">${AGES[age]}</div><div class="tgrid">` + list.map(([id, t]) => {
      const st = techState(p, id), qfull = b.queue.length >= QUEUE_MAX, poor = !st.txt && !canAfford(p, t.cost);
      const ok = !st.txt && !qfull && !poor;
      const note = st.txt || (qfull ? `Hàng chờ đã đầy (${QUEUE_MAX})` : poor ? '⚠ Chưa đủ tài nguyên' : 'Bấm để nghiên cứu');
      const cls = st.done ? 'done' : st.busy ? 'busy' : st.locked ? 'locked' : poor ? 'poor' : 'ready';
      const tip = `<b>${t.name}</b><br>${costStr(t.cost)} · ${t.turns} lượt<br>${t.desc}<br><i>${note}</i>`;
      return `<span class="tt-w" data-tt="${attrEsc(tip)}"><button class="tic ${techCat(t)} ${cls}" data-act="research:${where}:${id}" ${ok ? '' : 'disabled'}>${bigIco('tech/' + id)}</button></span>`;
    }).join('') + '</div></div>';
  }
  return h ? `<div class="tages">${h}</div>` : '';
}
// Cây kỹ thuật: mỗi nhà một khối; mỗi hàng là một nhánh (nâng cấp gốc → nâng cấp nó mở khóa), cột theo đời
const TECH_AT = ['barracks', 'range', 'stable', 'storage', 'market'];
function techNode(p, id, has) {
  const t = TECHS[id], st = techState(p, id);
  const cls = st.done ? 'done' : st.busy ? 'busy' : st.locked ? 'locked' : canAfford(p, t.cost) ? 'ready' : 'poor';
  const sub = st.done ? '✅ Đã xong' : st.txt || `${costStr(t.cost)} · ${t.turns} lượt`;
  return `<button class="tnode ${cls}" data-act="techgo:${t.at}" ${has ? '' : 'disabled'} title="${t.desc}"><span class="tn">${t.ico} ${t.name}</span><small>${sub}</small></button>`;
}
function techChains(at) { // mỗi hàng: [ô Đời 2, ô Đời 3, ô Đời 3 mở tiếp]
  const ids = Object.keys(TECHS).filter(id => TECHS[id].at === at), kid = id => ids.find(j => TECHS[j].req === id) || null;
  return ids.filter(id => !TECHS[id].req).map(id => (TECHS[id].age === 2 ? [id, kid(id), null] : [null, id, kid(id)]));
}
function techTabHtml(p) {
  let h = '';
  for (const at of TECH_AT) {
    const has = bldOf(p).some(b => b.id === at && b.done), bd = BUILDINGS[at];
    const cells = r => r.map((id, k) => (k ? `<div class="tarrow">${id && r[k - 1] ? '→' : ''}</div>` : '') + (id ? techNode(p, id, has) : '<div class="tnode empty"></div>')).join('');
    h += `<div class="card wide tcard"><h3>${bd.ico} ${bd.name}${has ? '' : ' <small class="muted">· chưa xây</small>'}</h3>
      <div class="ttree"><div class="th">Đời 2</div><div></div><div class="th">Đời 3</div><div></div><div class="th"></div>${techChains(at).map(cells).join('')}</div>
      ${has ? '' : `<div class="muted">Xây ${bd.name}${bd.age > p.age ? ` (mở ở ${AGE_UP[bd.age].name})` : ''} để nghiên cứu. Bấm vào ô nâng cấp để mở nhà đó.</div>`}</div>`;
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
function selectBld(x) { select(null); selB = x; ensureVisible(x === 'city' ? G.players[0].city.i : x); } // x: 'city' hoặc ô của công trình
function ageUnlockList(age) { // những gì một đời mở khóa
  const up = new Set(Object.values(TECHS).filter(t => t.upgrade).map(t => t.upgrade[1]));
  const b = Object.values(BUILDINGS).filter(d => d.age === age).map(d => `${d.ico} ${d.name}`);
  const u = Object.entries(UNITS).filter(([, d]) => d.age === age).map(([id, d]) => `${d.ico} ${d.name}${up.has(id) ? ' (nâng cấp)' : ''}`);
  const n = Object.values(TECHS).filter(t => t.age === age).length;
  return [...b, ...u, ...(n ? [`⬆️ ${n} nâng cấp`] : [])];
}
const ageUnlocks = age => `<div class="tags">${ageUnlockList(age).map(x => `<span>${x}</span>`).join('')}</div>`;
const ageUnlockNames = age => ageUnlockList(age).map(x => x.replace(/<[^>]+>/g, '').trim()).join(', ');
function ageBanner(n) { // băng rôn giữa màn hình khi bạn lên đời, tự tắt sau 4,5 giây
  if (window.__fast) return;
  const el = document.createElement('div');
  el.className = 'agebanner a' + n;
  el.innerHTML = `<div class="t">⬆️ Bước vào ${AGES[n]}</div><div class="tags">${ageUnlockList(n).map(x => `<span>${x}</span>`).join('')}</div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}
function renderUI() {
  const me = G.players[0], c = me.city, inc = incomeEst(me);
  if (selB != null && selB !== 'city' && !(G.bld[selB] && G.bld[selB].owner === 0)) selB = null;
  const all = myUnits(0), vills = all.filter(isVil), army = all.filter(u => !isVil(u));
  const stacks = [...new Set(army.map(u => u.i))].map(t => armyAt(t, 0));
  const idleV = vills.filter(needsOrders).length, idleA = stacks.filter(st => st.some(needsOrders)).length, idle = idleV + idleA;
  const stat = k => `<span class="stat" title="${RES_NAME[k]} (ước tính thu mỗi lượt)">${resIco(k)} <b>${me.res[k]}</b>${inc[k] ? `<small>+${inc[k]}</small>` : ''}</span>`;
  document.getElementById('top').innerHTML = `
    <span class="stat">Lượt <b>${G.turn}</b></span>
    <span class="stat age a${me.age}" title="Kỷ nguyên hiện tại (${me.age}/${MAX_AGE})">${AGES[me.age].split(' · ').map((s, k) => (k ? `<span class="wide"> · ${s}</span>` : s)).join('')}<span class="pips">${[1, 2, 3].map(n => (n <= me.age ? '●' : '○')).join('')}</span></span>
    ${G.players.some(p => p.civ && p.civ !== 'none') ? G.players.map(p => { const c = civOf(p); return `<span class="stat civb" style="border-color:${p.color}" data-tt="${attrEsc(`<b>${p.name}: ${c.name}</b>${c.arch ? ' · ' + c.arch : ''}<br>${civTip(c)}`)}">${p.id ? '⚑' : '★'} <b>${c.name}</b></span>`; }).join('') : ''}
    ${stat('food')}${stat('wood')}${stat('stone')}${stat('gold')}
    <span class="stat" title="Dân số đang dùng / giới hạn (dân làng + quân). Mỗi Nhà dân +${CFG.pop.perHouse}, tối đa ${POP_MAX}">👥 <b>${popUsed(me)}/${popCap(me)}</b></span>
    <span class="spacer"></span>
    <select id="zoomsel" title="Tỷ lệ bản đồ — hoặc con lăn chuột, phím + − 0; kéo chuột để di chuyển khi đã phóng to">${ZOOMS.map(z => `<option value="${z}"${z === zoom ? ' selected' : ''}>🔍 ${Math.round(z * 100)}%</option>`).join('')}</select>
    <button class="btn tog${tacticalOn ? ' on' : ''}" data-act="tac" title="Trận đánh: ${tacticalOn ? 'SÁNG = hỏi chọn Chỉ huy trực tiếp mỗi khi giao chiến' : 'TỐI = luôn tính tự động'} (bấm để đổi)">⚔</button>
    <button class="btn tog${miniOn ? ' on' : ''}" data-act="mini" title="Bản đồ con: ${miniOn ? 'đang hiện' : 'đang ẩn'} (bấm hoặc phím M)">🗺</button>
    <button class="btn" data-act="admin" title="Quản trị: cấu hình giá và hệ thống kinh tế">⚙</button>
    <button class="btn" data-act="help" title="Hướng dẫn">?</button>
    <button class="btn${idle ? ' attn' : ''}" data-act="next" ${idle ? '' : 'disabled'} title="Chọn đơn vị rảnh kế tiếp (phím N)">Rảnh · ${idle}</button>
    <button class="btn primary" data-act="end" ${G.busy ? 'disabled' : ''} title="Kết thúc lượt (Enter)">${G.busy ? 'Địch đi…' : '<span class="wide">Kết thúc lượt </span><span class="narrow">Xong </span>⏎'}</button>`;

  // ----- 1) Đang chọn: đổi theo thứ vừa bấm trên bản đồ -----
  const hint = '<div class="muted">Ô sáng: đi ngay · Ô xa: tự đi nhiều lượt · Chuột phải/Esc: bỏ chọn</div>';
  const unitRow = (u, label, on) => { const ready = (isVil(u) ? [u] : armyAt(u.i, 0)).some(needsOrders); return `<button class="opt unit ${ready ? 'ready' : 'spent'}${on ? ' on' : ''}" data-act="sel:${u.id}">${label}<span class="c">${unitStatus(me, u)}</span></button>`; };
  // Thanh dọc: danh sách dân làng và đạo quân để chọn nhanh
  const lists = `<div class="card"><h3>👷 Dân làng · ${vills.length} (${idleV} rảnh)</h3>${vills.map(u => unitRow(u, `${ust(u).ico} Dân làng · ❤${u.hp}/${maxHp(u)}`, u === sel)).join('') || '<div class="muted">Không còn dân làng. Bấm Nhà chính để mua.</div>'}</div>
    <div class="card"><h3>⚔ Đạo quân · ${stacks.length} đạo, ${army.length} lính</h3>${stacks.map(st => unitRow(st[0], `Đạo ×${st.length} ${st.map(m => ust(m).ico).join('')}`, st.includes(sel))).join('') || '<div class="muted">Chưa có quân.</div>'}</div>`;
  let h = '', cmd = '';
  if (sel && isVil(sel)) {
    const s = ust(sel), freeN = freeSites(me).length, grp = selGroup(), crew = vilsAt(sel.i, 0), picking = !!selPick;
    if (crew.length > 1) { // đoàn dân: ô chỉ số người đang xem + chân dung từng người, tách được như đạo quân
      const f = crew.find(m => m.id === focusId) || sel;
      h += `<div class="card ctx"><h3>${s.ico} Đoàn dân · ${crew.length}/${MINE_CAP}${picking ? ` <small class="muted">· đang tách ${grp.length} dân</small>` : ''}</h3>
        ${statBlock(f)}
        <div class="mports">${crew.map(m => mportHtml(m, f, picking)).join('')}</div>
        <div class="muted">${picking ? 'Nhóm tách' : 'Cả đoàn'} còn ${Math.min(...grp.map(m => m.mp))} MP · ${unitStatus(me, sel)}</div>
        <div class="row" style="gap:6px;justify-content:flex-start">${picking ? '<button class="btn sm" data-act="unpick">✖ Hủy tách</button>' : `<button class="btn sm" data-act="splithalf" ${crew.filter(canSplit).length ? '' : 'disabled'}>✂ Tách đôi</button>`}</div>
        <div class="muted">${picking ? `Bấm ô sáng để đưa ${grp.length} dân đã chọn ra thành đoàn mới; phần còn lại đứng yên.` : `Cả đoàn đi, khai thác và xây cùng nhau. Đi vào ô có dân mình để nhập đoàn (tối đa ${MINE_CAP}; Ruộng lúa chỉ 1 dân).`}</div>${hint}
        ${grp.some(m => m.goto != null || m.build != null) ? '<button class="opt" data-act="stop">✋ Dừng việc đang làm</button>' : ''}`;
    } else h += `<div class="card ctx">${statBlock(sel)}
      <div class="muted">${unitStatus(me, sel)} — ${s.desc}</div>${hint}
      ${sel.goto != null || sel.build != null ? '<button class="opt" data-act="stop">✋ Dừng việc đang làm</button>' : ''}`;
    h += `</div>`;
    cmd += `<div class="card"><h3>🔨 Xây dựng</h3>` + (placing ? `<div class="place">📍 Bấm một ô <b>Đất trống</b> viền vàng để đặt ${BUILDINGS[placing.id].name}${BUILDINGS[placing.id].drop ? ' (kho đặt được cả ngoài lãnh thổ)' : ''}. <button class="btn" data-act="unplace">Hủy</button></div>` : '') + '<div class="bgrid">';
    for (const [id, d] of Object.entries(BUILDINGS)) {
      const locked = d.age > me.age, needs = d.req && !countBld(me, d.req, true);
      const desc = id === 'farm' ? `1 dân, ${FARM_LOAD + civLoad(me, 'farm')} Thức ăn/chuyến, cạn sau ${farmAmtOf(me)}${hasTech(me, 'farm') ? ' (nhờ Thuần hóa)' : ''}` : d.desc;
      const why = locked ? '🔒 Cần ' + AGE_UP[d.age].name : needs ? `🔒 Cần xây xong ${BUILDINGS[d.req].name}` : desc;
      const bc = bldCost(me, id), bcut = JSON.stringify(bc) !== JSON.stringify(d.cost) ? ` <s class="muted">${costStr(d.cost)}</s> <span class="muted">(${civOf(me).name})</span>` : '';
      const tip = `<b>${d.name}</b> · ${costStr(bc)}${bcut} · ${d.turns} lượt<br>${why}`;
      cmd += `<span class="bt-w" data-tip="${attrEsc(tip)}"><button class="bt${locked || needs ? ' lock' : ''}${placing && placing.id === id ? ' on' : ''}" data-act="bld:${id}" ${!locked && !needs && canAfford(me, bc) && (freeN || d.drop) ? '' : 'disabled'}>${bigIco('buildings/' + id)}<i>${d.name}</i><small>${costStr(bc)}</small></button></span>`;
    }
    cmd += `</div><div class="bdesc muted">Rê chuột lên một nhà để xem mô tả.</div></div>`;
  } else if (sel) {
    const grp = selGroup(), stack = armyAt(sel.i, 0), picking = !!selPick;
    const f = stack.find(m => m.id === focusId) || sel;
    h += `<div class="card ctx"><h3>⚔ Đạo quân · ${stack.length}/${ARMY_MAX}${picking ? ` <small class="muted">· đang tách ${grp.length} lính</small>` : ''}</h3>
      ${statBlock(f)}
      ${stack.length > 1 ? `<div class="mports">${stack.map(m => mportHtml(m, f, picking)).join('')}</div>` : ''}
      <div class="muted">${picking ? 'Nhóm tách' : 'Cả đạo'} còn ${Math.min(...grp.map(m => m.mp))} MP (theo quân chậm nhất) · ${unitStatus(me, sel)}</div>
      <div class="legend"><span><i class="lg mv"></i>Tầm đi: ${selReach.size} ô</span><span><i class="lg atk"></i>Tầm đánh: ${selAtk.size} ô${selTargets.size ? ` · ${selTargets.size} mục tiêu` : ''}</span></div>
      ${stack.length > 1 ? `<div class="row" style="gap:6px;justify-content:flex-start">${picking ? '<button class="btn sm" data-act="unpick">✖ Hủy tách</button>' : `<button class="btn sm" data-act="splithalf" ${stack.filter(canSplit).length ? '' : 'disabled'}>✂ Tách đôi</button>`}</div>` : ''}
      <div class="muted">${picking ? `Đang tách ${grp.length} lính khỏi đạo: bấm ô sáng để đưa họ ra thành đạo mới, hoặc bấm vòng đỏ để chỉ nhóm này giao chiến. Phần còn lại đứng yên.`
        : `Đi vào ô có đạo của mình để nhập (tối đa ${ARMY_MAX}). Đứng kề địch rồi bấm vòng đỏ để giao chiến.${stack.length > 1 ? ' Bấm chân dung để xem chỉ số từng lính; bấm ☐ trên chân dung (hoặc “Tách đôi”) để chia đạo.' : ''}`}</div>${hint}
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
      cmd += `<div class="card"><h3>🚧 Đang xây</h3><div class="bar prod"><i style="width:${b.prog / b.need * 100}%"></i></div><div class="${n ? 'muted' : 'place'}">👷 ${n} dân đang xây. Chọn một dân rồi bấm vào công trình này để ${n ? 'cùng xây cho nhanh' : 'bắt đầu xây'}.</div></div>`;
    } else {
      if (trains.length || q.queue.length) {
        cmd += `<div class="card"><h3>⏳ Hàng chờ${q.queue.length ? ` · ${q.queue.length}/${QUEUE_MAX}` : ''}</h3>${queueProgressHtml(where, q)}</div>`;
        if (trains.length) cmd += `<div class="card"><h3>🧑 Quân mua tại đây</h3>${trainOptsHtml(me, where, q, trains)}</div>`;
      }
      let up = '';
      const na = nextAge(me);
      if (isCity && na && !c.queue.some(x => x.kind === 'age')) {
        const req = ageReq(me), list = na.req.map(id => `${countBld(me, id, true) ? '✅' : '⬜'} ${BUILDINGS[id].name}`).join(', ');
        up += `<button class="opt" data-act="age" ${req >= na.need && canAfford(me, na.cost) ? '' : 'disabled'}>⬆️ Lên ${na.name}<span class="c">${costStr(na.cost)} · ${na.turns} lượt</span><span class="d">Cần ${na.need} trong ${na.req.length}: ${list} (đang có ${req}/${na.need}). Lãnh thổ bán kính ${na.rad}${na.cityHp ? `, Nhà chính +${na.cityHp} Máu` : ''}</span></button>`;
      }
      if (!isCity) up += techOptsHtml(me, where, b);
      cmd += `<div class="card wide"><h3>⬆️ Nâng cấp</h3>${up || '<div class="muted">Hiện chưa có nâng cấp nào tại nhà này.</div>'}</div>`;
    }
    paintPanels(h, cmd, isCity ? 'buildings/city' + Math.min(me.age, MAX_AGE) : b.done ? 'buildings/' + b.id : 'buildings/site', '', lists);
    return;
  }
  // Dân làng / đạo quân đang chọn: thông tin và lệnh lên thanh dọc; thanh ngang dưới giữ tổng quan nhà và nâng cấp
  let side = lists;
  if (sel) { side = h + cmd + lists; h = ''; cmd = ''; }
  else side = `<div class="card ctx"><h3>Chưa chọn quân</h3><div class="muted">Bấm một dân làng hoặc đạo quân (trên bản đồ hoặc danh sách dưới đây) để xem thông tin và ra lệnh. <b>N</b>: đơn vị rảnh kế tiếp.</div></div>` + lists;
  // Chưa chọn nhà: dãy nút công trình để chọn nhanh (nhà cùng loại gộp một nút, ưu tiên nhà đang có hàng chờ)
  const qbtn = (to, key, label, badge) => `<button class="qbt" data-act="selb:${to}" title="${label}">${bigIco(key)}${badge ? `<b>${badge}</b>` : ''}</button>`;
  const grp = {};
  for (const b of bldOf(me)) (grp[b.done ? b.id : 'site'] ||= []).push(b);
  h = `<h3>🏠 Công trình <small class="muted">· bấm để mua quân, nâng cấp</small></h3><div class="qb">`
    + qbtn('city', 'buildings/city' + Math.min(me.age, MAX_AGE), 'Nhà chính (phím H)', c.queue.length ? '⏳' + c.queue.length : '')
    + Object.entries(grp).map(([k, list]) => {
      const busy = list.find(b => b.queue && b.queue.length), b = busy || list[0];
      return qbtn(b.tile, 'buildings/' + k, (k === 'site' ? 'Đang xây' : BUILDINGS[k].name) + (list.length > 1 ? ` ×${list.length}` : ''), (list.length > 1 ? '×' + list.length : '') + (busy ? '⏳' + busy.queue.length : ''));
    }).join('') + '</div>';

  paintPanels(h, cmd, null, '', side);
}
const attrEsc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
// ảnh lớn của một khóa (công trình/đơn vị), không có ảnh thì dùng emoji
const bigIco = key => (IMG[key] ? `<img src="${IMG[key].src}" alt="">` : `<span class="em">${ICON_EMOJI[key] || ''}</span>`);
const hpCol = r => (r > 0.6 ? '#4caf50' : r > 0.3 ? '#e0b030' : '#d33');
// Ô chỉ số một quân: chân dung + thanh máu bên trái, cột chỉ số icon bên phải (phần cộng từ nâng cấp ghi +N)
function statBlock(u) {
  const s = ust(u), ab = atkBonus(u), db = defBonus(u), r = u.hp / maxHp(u);
  const row = (k, v, b, t) => `<div data-tt="${t}">${ico('ui/' + k)}<b>${v}</b>${b ? `<em>+${b}</em>` : ''}</div>`;
  return `<div class="ustat"><div class="uport">${bigIco('units/' + u.type)}<div class="hpb"><i style="width:${r * 100}%;background:${hpCol(r)}"></i></div><small>${u.hp}/${maxHp(u)}</small></div>
    <div class="srows"><div class="sname">${s.name}</div>${row('atk', s.atk, ab, 'Công')}${row('def', s.def, db, 'Thủ')}${s.range > 1 ? row('range', s.range, 0, 'Tầm đánh') : ''}${row('mp', `${u.mp}/${maxMp(u)}`, 0, 'Di chuyển còn lại / tối đa')}</div></div>`;
}
// Chân dung nhỏ một lính trong đạo: bấm để xem chỉ số; ô ☐ góc trên để chọn vào nhóm tách
function mportHtml(m, f, picking) {
  const s = ust(m), on = picking && selPick.includes(m.id), why = m.attacked ? 'đã đánh' : m.mp <= 0 ? 'hết MP' : '';
  const tip = `<b>${s.name}</b> · ❤${m.hp}/${maxHp(m)} · ${m.mp} MP${why ? '<br><i>' + why + '</i>' : ''}`;
  return `<div class="mport${m === f ? ' cur' : ''}${on ? ' on' : ''}${why ? ' spent' : ''}"><button class="mp-pic" data-act="focus:${m.id}" data-tt="${attrEsc(tip)}">${bigIco('units/' + m.type)}<span class="hpm"><span style="width:${m.hp / maxHp(m) * 100}%;background:${hpCol(m.hp / maxHp(m))}"></span></span></button>`
    + (why ? '' : `<button class="mp-pick" data-act="pick:${m.id}" data-tt="Chọn vào nhóm tách">${on ? '☑' : '☐'}</button>`) + '</div>';
}
const portraitHtml = key => (key ? (IMG[key] ? `<img class="portrait" src="${IMG[key].src}" alt="">` : `<span class="portrait">${ICON_EMOJI[key] || ''}</span>`) : '');
// Bảng dưới đáy (nhà & nâng cấp). h: thẻ công trình đang chọn (cột trái, kèm ảnh key); cmd: các thẻ lệnh xếp ngang; top: hàng tab
// side: thanh dọc bên phải (dân làng & đạo quân)
// Cửa sổ cây kỹ thuật (chỉ để xem): kỷ nguyên, những gì mỗi đời mở khóa, cây nâng cấp. Mở/đóng bằng nút trên thanh dọc hoặc phím T
function techWinHtml(me) {
  const c = me.city, na = nextAge(me), aging = c.queue.find(x => x.kind === 'age');
  const steps = [1, 2, 3].map(n => `<span class="astep${n < me.age ? ' done' : n === me.age ? ' cur' : ''}">${AGES[n].split('· ')[1]}</span>`).join('<i>→</i>');
  let o = `<div class="card"><h3>Kỷ nguyên: ${AGES[me.age]}</h3><div class="asteps">${steps}</div>`;
  if (na) {
    const req = na.req.map(id => `<span>${countBld(me, id, true) ? '✅' : '⬜'} ${BUILDINGS[id].name}</span>`).join('');
    o += `<div class="muted">Lên ${na.name}: ${costStr(na.cost)}, ${na.turns} lượt, cần ${na.need} trong ${na.req.length} công trình:</div><div class="tags">${req}</div>
      ${aging ? `<div class="place" style="margin-top:6px">⬆️ Đang lên đời — còn ${aging.left} lượt.</div>` : `<div class="muted" style="margin-top:4px">Bấm Nhà chính (phím H) để lên đời · ${ageReq(me)}/${na.need} công trình.</div>`}`;
  } else o += '<div class="muted">Bạn đã ở đời cao nhất của phiên bản này.</div>';
  o += '</div>' + [1, 2, 3].map(n => `<div class="card${n === 3 ? ' bronze' : ''}${n > me.age ? ' dim' : ''}"><h3>${AGES[n]} mở khóa</h3>${ageUnlocks(n)}${n > 1 ? `<div class="muted" style="margin-top:4px">Lãnh thổ bán kính ${AGE_UP[n].rad}${AGE_UP[n].cityHp ? `, Nhà chính +${AGE_UP[n].cityHp} Máu` : ''}.</div>` : ''}</div>`).join('');
  return `<div class="twhead"><h2>🔧 Kỹ thuật</h2><span class="muted">Chỉ để xem · muốn nghiên cứu thì bấm vào nhà tương ứng</span><button class="btn sm" data-act="techwin" title="Đóng (T hoặc Esc)">✖ Đóng</button></div>
    <div class="twages">${o}</div><div class="twtree">${techTabHtml(me)}</div>`;
}
function renderTechWin() {
  const w = document.getElementById('techwin'); if (!w) return;
  w.classList.toggle('show', !!(G && techOpen));
  if (G && techOpen) { const sc = w.scrollTop; w.innerHTML = techWinHtml(G.players[0]); w.scrollTop = sc; }
}
function paintPanels(h, cmd, key, top = '', side = '') {
  side = `<button class="btn techbtn${techOpen ? ' on' : ''}" data-act="techwin" title="Xem cây kỹ thuật (phím T)">🔧 Kỹ thuật <small>· T</small></button>` + side;
  renderTechWin();
  document.getElementById('selbox').innerHTML = portraitHtml(key) + h;
  document.getElementById('cmdbox').innerHTML = top + `<div class="cards">${cmd}</div>`;
  document.getElementById('side').innerHTML = side;
  renderInfo();
}
// Cột "Ô dưới chuột" của bảng dưới: thông tin ô dưới chuột; khi không rê chuột trên bản đồ thì hiện nhật ký
function renderInfo() {
  const box = document.getElementById('infobox');
  if (!G) { box.innerHTML = ''; return; }
  if (hover >= 0) { box.innerHTML = `<h3>🔍 Ô dưới chuột</h3><div class="tipbody">${tipHtml(hover)}</div>`; return; }
  box.innerHTML = `<h3>📜 Nhật ký</h3><div id="log">${G.log.slice().reverse().map(l => `<div class="${l.cls}">[${l.t}] ${l.msg}</div>`).join('') || '<div class="muted">Chưa có gì.</div>'}</div>`;
}

function showMenu() {
  const o = document.getElementById('overlay');
  saveGame(); const sv = readSave(); // ván đang chơi dở trên trang này cũng được tự lưu
  const civLine = k => { const c = CIVS[k]; return (c.bonus.length ? c.bonus.map(x => x.txt).join(' · ') : c.desc) + (c.banTxt ? `<br>🚫 ${c.banTxt}` : ''); };
  // một hàng chọn: nhãn bên trái, các nút gọn bên phải, dưới là mô tả của lựa chọn đang bật
  const row = (label, act, opts, cur, desc) => `<div class="ngrow"><div class="nglab">${label}</div><div class="ngopt">
    <div class="seg">${opts.map(([k, t]) => `<button class="${String(cur) === String(k) ? 'on' : ''}" data-act="${act}:${k}">${t}</button>`).join('')}</div>
    <div class="ngdesc">${desc}</div></div></div>`;
  const civDrop = (label, who, cur, rndTxt) => `<div class="ngrow"><div class="nglab">${label}</div><div class="ngopt">
    <select class="ngsel" data-civsel="${who}">${[['random', '🎲 Ngẫu nhiên'], ['none', 'Không đế chế'], ...CIV_PICK.map(k => [k, `${CIVS[k].name} · ${CIVS[k].arch}`])].map(([k, t]) => `<option value="${k}"${cur === k ? ' selected' : ''}>${t}</option>`).join('')}</select>
    <div class="ngdesc">${cur === 'random' ? rndTxt : civLine(cur)}</div></div></div>`;
  const dc = CFG[DIFFS[diffSel].key];
  const cont = sv ? (() => {
    const d = new Date(sv.at), when = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} ${d.getDate()}/${d.getMonth() + 1}`, p0 = sv.G.players[0];
    return `<div class="ngcont"><button class="btn primary big" data-act="continue">▶ Tiếp tục ván</button>
      <span class="muted">Lượt ${sv.G.turn} · ${AGES[p0.age]} · ${civOf(p0).name} · AI ${(DIFFS[sv.G.diff] || DIFFS.normal).name}<br>lưu lúc ${when}</span></div>`;
  })() : '';
  o.innerHTML = `<div class="modal menu"><h1>Đế chế D3KT</h1>
    <div class="muted">Chiến thuật theo lượt, 1 người đấu 1 AI. Hạ Nhà chính đối phương để thắng.</div>
    ${cont}
    <h2>Ván mới</h2>
    ${civDrop('Đế chế của bạn', 'me', civSel, 'Game chọn ngẫu nhiên một đế chế cho bạn khi bắt đầu ván.')}
    ${civDrop('Đế chế đối thủ', 'ai', aiCivSel, 'Máy chọn ngẫu nhiên một trong các đế chế đã có.')}
    ${row('Độ khó', 'diff', Object.entries(DIFFS).map(([k, d]) => [k, d.name]), diffSel, `${DIFFS[diffSel].desc} Khai thác ${dc.gather}%${dc.bonus ? `, +${dc.bonus} mỗi tài nguyên` : ''}, đi đánh khi đủ ${dc.march} lính.`)}
    ${row('Bắt đầu ở', 'startage', [1, 2, 3].map(n => [n, AGES[n].split(' · ')[1]]), startAgeSel, startAgeSel === 1 ? 'Đi từ đầu, như bình thường.' : `Cả hai bên ở ${AGES[startAgeSel]}: lãnh thổ bán kính ${AGE_UP[startAgeSel].rad}${startAgeSel === 3 ? `, Nhà chính +${AGE_UP[3].cityHp} Máu` : ''}.`)}
    ${row('Bản đồ', 'mapmode', [['dark', '🌑 Tối'], ['light', '☀️ Sáng']], mapMode, MAP_MODES[mapMode].desc)}
    <div class="muted ngstart">Khởi đầu: ${CFG.start.villagers} dân làng, 🍖${CFG.start.food} 🪵${CFG.start.wood} 🪨${CFG.start.stone} 🪙${CFG.start.gold} và một Nhà chính.${cfgChanged() ? ' ⚙ Đang dùng cấu hình đã chỉnh ở Quản trị.' : ''}</div>
    <div class="ngfoot"><button class="btn${sv ? '' : ' primary'} big" data-act="start">Bắt đầu ván mới</button>
      <span class="spacer"></span><button class="btn" data-act="help">Hướng dẫn</button><button class="btn" data-act="admin">⚙ Quản trị</button></div>
    ${sv ? '<div class="muted ngwarn">Bắt đầu ván mới sẽ thay ván đang lưu.</div>' : ''}</div>`;
  o.classList.add('show');
}
function showHelp() {
  const o = document.getElementById('overlay');
  o.innerHTML = `<div class="modal"><h1>Hướng dẫn</h1>
    <h2>Điều khiển</h2><ul>
      <li>Bấm vào đơn vị của bạn để chọn; bấm ô sáng để đi ngay; bấm một ô xa để đơn vị tự đi tiếp qua nhiều lượt.</li>
      <li>Bấm địch, công trình địch hoặc Nhà chính địch có vòng đỏ để tấn công (phải đứng kề; quân tự áp sát nếu trong tầm đi).</li>
      <li>Bấm một công trình của bạn để xem và dùng lệnh của nó: Nhà chính mua dân và lên đời, nhà huấn luyện mua quân. <b>H</b> chọn nhanh Nhà chính; <b>T</b> mở/đóng cửa sổ Kỹ thuật (nút 🔧 trên cùng thanh dọc bên phải).</li>
      <li>Nhiều dân đứng chung một ô: bấm lại vào ô để đổi sang dân kế tiếp.</li>
      <li><b>Ván mới:</b> ở menu chọn <b>Đời bắt đầu</b> (cả hai bên cùng đời; chỉ đổi đời, lãnh thổ và Máu Nhà chính theo đời, dân và tài nguyên như mục Khởi đầu), <b>Độ khó AI</b> (Dễ · Thường · Khó · Rất khó: AI khai thác nhanh/chậm hơn, có thêm tài nguyên, đi đánh sớm/muộn; Rất khó thấy toàn bộ bản đồ) và <b>Bản đồ</b> sáng/tối. Game nhớ lựa chọn cho lần sau; ván đã lưu giữ độ khó của nó. Các con số chỉnh trong ⚙ Quản trị, tab Ván mới.</li>
      <li><b>Lưu ván:</b> game tự lưu đầu mỗi lượt của bạn và khi bạn đóng hoặc chuyển khỏi trang. Mở lại trang rồi bấm <b>▶ Tiếp tục ván</b>. Bản lưu nằm trong trình duyệt của máy này; mỗi lúc chỉ giữ một ván.</li>
      <li><b>Enter</b>: kết thúc lượt · <b>N</b>: đơn vị rảnh kế tiếp · <b>Esc</b>/chuột phải: bỏ chọn · <b>M</b>: ẩn/hiện bản đồ con.</li>
      <li>Bản đồ con ở góc dưới trái: ngôi sao vàng nhấp nháy là Nhà chính của bạn; Nhà chính địch hiện ngôi sao đỏ khi bạn đã dò ra. Chấm xanh/đỏ là đơn vị, ô vuông là công trình.</li></ul>
    <h2>Đế chế</h2><ul>
      <li>Chọn đế chế cho bạn và cho AI ở màn hình Ván mới. Mỗi đế chế có lợi thế riêng, lấy theo AoE1; rê chuột vào huy hiệu đế chế trên thanh trên cùng để xem.</li>
      ${CIV_PICK.map(k => `<li><b>${CIVS[k].name}</b>: ${CIVS[k].bonus.map(b => b.txt).join('; ')}.</li>`).join('')}</ul>
    <h2>Khai thác</h2><ul>
      <li><b>Đoàn dân:</b> đi một dân vào ô có dân mình là nhập đoàn (tối đa ${MINE_CAP}). Bấm ô là chọn cả đoàn: cả đoàn đi, khai thác và xây cùng nhau; tách bằng nút “Tách” như đạo quân.</li>
      <li>Đưa dân vào ô tài nguyên là dân tự khai thác, tối đa ${MINE_CAP} dân/ô: Rừng ${AMT[FOREST]} Gỗ, Bãi gỗ nhỏ ${AMT[WOODLOT]} Gỗ, Mỏ vàng ${AMT[HILLS]}, Mỏ đá ${AMT[STONE]}, Bụi quả dâu ${AMT[BERRY]}, Đàn hươu ${AMT[DEER]} thịt, Đàn voi ${AMT[ELEPHANT]} thịt. Phần còn lại của bản đồ là Đất trống: đi lại và xây dựng được.</li>
      <li><b>Lùa hươu:</b> hươu có 1 MP mỗi vòng. Dân hoặc đạo quân dừng sát bên đàn hươu thì hươu hoảng; khi sang lượt mới hươu chạy 1 ô ngược hướng (nếu ô đó trống, không thì lệch sang ô chéo bên cạnh). Mỗi lượt lùa được 1 ô. Đứng phía bên kia để lùa hươu về sát Nhà chính hoặc Kho, mỗi chuyến sẽ ngắn hơn. Dân hoặc quân vào hẳn ô hươu là hạ được hươu ngay (ô hiện xác hươu) và dân xẻ thịt được luôn. Xác hươu, xác voi thối rữa mất ${CARCASS_ROT} thịt mỗi lượt (ngoài phần dân xẻ), nên hạ xong nên cho dân xẻ ngay.</li>
      <li><b>Voi dữ:</b> voi có 1 MP mỗi vòng và chỉ hành động sau khi lượt chơi kết thúc (sau lượt của cả bạn và địch). Mỗi vòng voi chỉ làm <b>một</b> việc: dân làng đứng sát bên thì húc (-${ELEPHANT_DMG} Máu); dân cách 2 ô (thẳng hay chéo) thì tiến 1 ô lại sát, vòng sau mới húc — bạn có một lượt để rút dân ra xa hoặc cho vào hẳn ô voi để săn. Voi không đuổi quân lính. Voi bám theo dân bao xa cũng được, kể cả vào tận làng, nên đừng dắt voi về nhà. Lúc đầu ván voi luôn cách Nhà chính ít nhất 4 ô.</li>
      <li><b>Săn voi:</b> voi có ${ELEPHANT_HP} Máu. Dân vào hẳn ô voi (tối đa ${MINE_CAP} dân), mỗi lượt mỗi dân đánh ${HUNT_DMG} — cần ít nhất ${Math.ceil(ELEPHANT_HP / HUNT_DMG)} đòn. Lính đứng trên ô voi cũng đánh được, mỗi lần trừ đúng bằng Công của lính (ít nhất ${HUNT_DMG}). Trong lúc bị săn, cuối mỗi vòng voi húc lại một người trên ô. Voi chết thì ô hiện xác voi, dân đứng đó xẻ thịt từ lượt sau. 3 dân vào cùng lúc thì hạ voi trong 1 lượt.</li>
      <li>Trong vòng 4 ô quanh mỗi Nhà chính luôn có ${homeText()}. Tầm nhìn ban đầu chỉ 2 ô nên phải cho dân đi dò. Vùng ngoài còn thêm mỏ. Kho đặt được cả ngoài lãnh thổ, nên hãy dựng kho sát mỏ.</li>
      <li>Mỗi chuyến mang về ${LOAD}. <b>Số lượt một chuyến = khoảng cách tới Nhà chính hoặc kho gần nhất.</b> Kề kho: ${LOAD}/lượt; cách 3 ô: ${LOAD} mỗi 3 lượt.</li>
      <li>Kho tài nguyên nhận Gỗ/Đá/Vàng và cả thịt hươu, voi; Kho thực phẩm nhận mọi loại Thức ăn (quả, thịt, lúa) — đặt sát mỏ để khai thác nhanh gấp nhiều lần.</li>
      <li>Mỏ cạn sẽ thành Đất trống. Ruộng lúa (Đời 2, cần có Chợ) cho ${FARM_LOAD}/chuyến và cạn sau ${FARM_AMT} (Thuần hóa ở Chợ: +${TECHS.farm.farmAmt}).</li>
      <li>Nâng cấp (Đời 2, Đời 3): Kho tài nguyên tăng Công/Thủ cho quân, Chợ tăng khai thác, Nhà lính / Trường bắn cung / Chuồng ngựa đổi quân lên bản mạnh hơn. Nâng cấp xếp chung hàng chờ với quân và giữ mãi kể cả khi nhà bị phá.</li>
      <li><b>Cây kỹ thuật</b> (cửa sổ 🔧 Kỹ thuật, phím T, chỉ để xem): nhiều nâng cấp Đời 3 chỉ mở khi đã xong nâng cấp trước nó trong cùng nhánh, ví dụ Rèn công cụ → Rèn đồng, Giáp da → Giáp đồng, Rìu đồng → Kiếm đồng, Khai vàng → Đào sâu. Ô xanh: đã xong · vàng: đang nghiên cứu · viền sáng: mua được · xám 🔒: còn khóa (ghi rõ cần gì).</li></ul>
    <h2>Xây dựng và dân số</h2><ul>
      <li>Chọn một dân → chọn công trình ở bảng lệnh dưới đáy → bấm ô Đất trống viền vàng trong lãnh thổ. Lãnh thổ gồm vùng quanh Nhà chính và ${TERR_BLD} ô quanh mỗi công trình đã xây xong của bạn (kể cả kho dựng ngoài xa), nhưng không lấn vào vùng quanh Nhà chính địch. Dân tự đi tới và xây khi đứng kề công trình. Chọn thêm dân rồi bấm vào công trình dang dở để cùng xây: mỗi dân góp 1 lượt công mỗi lượt.</li>
      <li>Dân số tính chung dân và quân: Nhà chính ${CFG.pop.base} chỗ, mỗi Nhà dân +${CFG.pop.perHouse}, tối đa ${POP_MAX}.</li>
${[2, 3].map(n => { const a = AGE_UP[n]; return `      <li>Lên ${a.name} tại Nhà chính: ${costStr(a.cost)}, ${a.turns} lượt (Nhà chính không ra dân trong lúc đó), cần ${a.need} trong ${a.req.length} công trình ${a.req.map(id => BUILDINGS[id].name).join(' / ')}. Lãnh thổ quanh Nhà chính bán kính ${a.rad}${a.cityHp ? `, Nhà chính +${a.cityHp} Máu` : ''}.</li>`; }).join('\n')}
      <li>Công trình có Máu và bị phá được. Công trình địch chặn đường; công trình của mình thì đi xuyên qua được nhưng không dừng lại trên đó. Không có chi phí duy trì.</li></ul>
    <h2>Quân đội</h2><ul>
      <li>Nhà lính: Lính chùy (Đời 1), Lính rìu, Lính giáo (Đời 2), Kiếm sĩ, Lính trường thương (Đời 3) · Trường bắn cung: Cung thủ, Cung thủ đồng · Chuồng ngựa: Kỵ binh, Kỵ binh nặng, Xe chiến. Mỗi công trình huấn luyện 1 đơn vị một lúc, xếp hàng chờ được tối đa ${QUEUE_MAX} mục (Nhà chính xếp được nhiều dân liên tiếp).</li>
      <li>Tầm nhìn: Nhà chính 2 ô, công trình 1 ô, dân làng 1 ô, lính 2 ô, Kỵ binh 3 ô. Muốn thấy xa phải cho đơn vị đi dò.</li>
      <li><b>Đời 3 · Đồ Đồng:</b> Kiếm đồng biến Lính rìu thành Kiếm sĩ (x1.5 lên công trình), Giáo dài: Lính giáo → Lính trường thương, Cung đồng: Cung thủ → Cung thủ đồng, Ngựa chiến: Kỵ binh → Kỵ binh nặng. Nâng cấp xong thì mọi quân cũ cùng loại đổi ngay (giữ phần Máu đã mất) và nhà chỉ bán quân mới. Chuồng ngựa bán thêm Xe chiến (không tốn Vàng, x2 lên Cung thủ).</li>
      <li>Rê chuột lên một đạo quân để thấy nhãn ⚔+N 🛡+N: phần Công / Thủ đang được cộng nhờ nâng cấp.</li>
      <li>Lính giáo x2 lên Kỵ binh và Xe chiến · Xe chiến x2 lên Cung thủ · Kỵ binh x1.5 lên Cung thủ · Cung thủ bắn xa 3 ô trong trận (không bắn xuyên Đá tảng; đứng trên Đồi +1 sát thương), yếu khi bị áp sát.</li>
      <li><b>Đạo quân:</b> tối đa ${ARMY_MAX} lính đứng chung một ô. Đi lính vào ô có lính mình để nhập đạo; bấm ô là chọn cả đạo; cả đạo đi theo quân chậm nhất.</li>
      <li><b>Phóng to bản đồ:</b> lăn chuột trên bản đồ, nút − / + hoặc chọn tỷ lệ (100%–300%) trên thanh trên cùng, phím <b>+ − 0</b>. Khi đã phóng to: kéo chuột để di chuyển, hoặc bấm vào bản đồ con để nhảy tới chỗ đó (khung trắng là phần đang thấy).</li>
      <li><b>Tầm đi và tầm đánh:</b> chọn quân thì ô viền trắng là chỗ đi tới được trong lượt này, ô viền đỏ là chỗ đánh tới được (trên bản đồ lớn mọi đòn đều cận chiến: phải đứng kề, nên tầm đánh là các ô kề tầm đi). Rê chuột lên quân địch để thấy vùng cam (nó đi tới được) và vùng đỏ (nó đánh tới được) ở lượt của nó; rê lên quân mình đã hết MP để xem tầm lượt sau.</li>
      <li><b>Tách quân:</b> ở khung "Đang chọn" dưới đáy (góc trái), bấm <b>☐ Tách</b> trên một hoặc vài lính (hoặc <b>✂ Tách đôi</b>), rồi bấm ô sáng để nhóm đó ra thành đạo mới — hoặc bấm vòng đỏ để chỉ nhóm đó giao chiến, phần còn lại đứng yên. Nhóm tách đi theo lính chậm nhất trong nhóm; lính đã đánh hoặc hết MP trong lượt thì không tách được. Hai đạo nhập lại bằng cách đi vào cùng ô (tối đa ${ARMY_MAX}). AI cũng theo luật này: nó tách lính bị thương nặng về nhà nghỉ hồi máu.</li>
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
    pieces.push({ u: x, owner: x.owner, side, type: x.type, cell: row * BCOLS + col, hp: x.hp, max: maxHp(x), mp: 0, defend: false, moved: false, alive: true });
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
function armyList(arr, cls) { return arr.map(x => `<span class="${cls}">${UNITS[x.type].ico} ${UNITS[x.type].name} · ${x.hp}/${maxHp(x)}</span>`).join(''); }
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
const bRange = p => UNITS[p.type].brange + civAdd(G.players[p.owner], 'brange', p.type);
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
function bDmg(a, d, k, rand) { return dmgCore(a, d.type, defVs(a, d) + BT[B.terr[d.cell]].def + (d.defend ? 2 : 0), k, rand) + (bHillShot(a) ? 1 : 0); }
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
  const save = p.mp; p.mp = bmpOf(p);
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
  B.cur = p; p.defend = false; p.moved = false; p.mp = bmpOf(p); B.reach = new Map(); B.targets = new Map();
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
    h += ` — <b>${s.ico} ${bName(d)}</b> Máu ${d.hp}/${d.max} · Công ${withBonus(s.atk, atkBonus(d))} · Thủ ${withBonus(s.def, defBonus(d))}${d.defend ? '+2' : ''} · Tốc độ ${s.init} · Di chuyển ${bmpOf(d)} · Tầm ${bRange(d)}`;
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
  g.clearRect(0, 0, BWd, BHt);
  for (let i = 0; i < BG.n; i++) {
    const { x, y } = BG.cen[i], t = BT[B.terr[i]].t;
    drawTile(g, t, x, y, BS, i, true);
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
    drawToken(g, x, y - 2, G.players[p.owner].color, 'units/' + p.type, p.hp, p.max, acted.has(p), p === cur ? 16 : 14, p.side === 1);
    if (p.cell === B.hover) bonusTags(g, x, y + 17, p);
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
// ---------- Họa tiết địa hình ----------
// Mỗi loại ô được vẽ sẵn (vài biến thể) vào một canvas phụ rồi dán lên bản đồ, nên vẽ chi tiết mà không tốn công mỗi khung hình.
// Ánh sáng chiếu từ trên-trái: mặt sáng ở trái/trên, bóng đổ sang phải/dưới. Cây và núi được nhô lên trên mép ô một chút (nhìn chếch 3/4).
const TILE_VARIANTS = 4, TILE_CACHE = new Map();
function mulberry(seed) {
  return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// màu nền cỏ/đất: [chính, mảng sáng, mảng tối, khóm cỏ]
const GROUND = {
  [PLAINS]: ['#8dbb55', '#a9cf6c', '#749f43', '#5d8735'],
  [EMPTY]: ['#a3c672', '#bcd88d', '#8aad5a', '#6f9445'],
  [FOREST]: ['#5f8d43', '#76a453', '#4c7535', '#3c5f2a'],
  [WOODLOT]: ['#8cb563', '#a6cb7b', '#739b4d', '#5d833d'],
  [BERRY]: ['#89b85b', '#a2cd74', '#719d47', '#5a8438'],
  [DEER]: ['#98c165', '#b3d47f', '#7fa84f', '#668d3e'],
  [ELEPHANT]: ['#a7b866', '#c0cb83', '#8d9d50', '#74843f'],
  [HILLS]: ['#93b45c', '#abc875', '#7a9a49', '#62803a'],
  [STONE]: ['#98b067', '#b0c47f', '#7f9852', '#677e42'],
  [MOUNTAIN]: ['#8c8a76', '#a5a28c', '#73715f', '#5c5a4b'],
  hill: ['#8dbb55', '#a9cf6c', '#749f43', '#5d8735'],
};
const LEAF = [['#22461a', '#346a26', '#4f8e36', '#7db450'], ['#26491a', '#3b7228', '#5a9a3a', '#8ec05a'], ['#34481a', '#516b24', '#71903a', '#a3bb5c']];
const ROCK_GREY = ['#4f535b', '#7d828b', '#aeb3ba'], ROCK_BROWN = ['#5a4631', '#836c50', '#a99171'];
function blob(g, x, y, rx, ry, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
function poly(g, pts, col) { g.beginPath(); pts.forEach(([x, y], k) => g[k ? 'lineTo' : 'moveTo'](x, y)); g.closePath(); if (col) { g.fillStyle = col; g.fill(); } }
const shade = (g, x, y, rx, ry) => blob(g, x, y, rx, ry, 'rgba(18,28,8,.36)');
function paintGround(g, r, pal, rand, tufts) {
  g.save(); hexPath(g, 0, 0, r); g.clip();
  g.fillStyle = pal[0]; g.fillRect(-r, -r, 2 * r, 2 * r);
  for (let n = 0; n < 7; n++) { // mảng màu loang
    g.globalAlpha = 0.32;
    blob(g, (rand() - 0.5) * 1.7 * r, (rand() - 0.5) * 1.7 * r, r * (0.22 + rand() * 0.3), r * (0.13 + rand() * 0.18), rand() < 0.5 ? pal[1] : pal[2]);
  }
  g.globalAlpha = 0.6;
  for (let n = 0; n < r * 2.4; n++) { g.fillStyle = rand() < 0.5 ? pal[1] : pal[2]; g.fillRect((rand() - 0.5) * 2 * r, (rand() - 0.5) * 2 * r, 0.9, 0.9); } // đốm nhỏ
  g.globalAlpha = 1; g.strokeStyle = pal[3]; g.lineWidth = 0.8; g.lineCap = 'round';
  for (let n = 0; n < tufts; n++) { // khóm cỏ
    const x = (rand() - 0.5) * 1.5 * r, y = (rand() - 0.5) * 1.4 * r, h = 2 + rand() * 2.5;
    g.beginPath(); g.moveTo(x - 1.6, y - h * 0.75); g.lineTo(x, y); g.lineTo(x + 1.6, y - h * 0.75); g.moveTo(x, y); g.lineTo(x + 0.2, y - h); g.stroke();
  }
  const vg = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.15, 0, 0, r * 1.15); // sáng giữa-trên, tối dần ra mép
  vg.addColorStop(0, 'rgba(255,250,215,.13)'); vg.addColorStop(0.6, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.24)');
  g.fillStyle = vg; g.fillRect(-r, -r, 2 * r, 2 * r);
  g.restore();
}
function patch(g, r, x, y, rx, ry, c0, c1) { // mảng đất dưới mỏ
  g.save(); hexPath(g, 0, 0, r); g.clip();
  const gr = g.createRadialGradient(x - rx * 0.3, y - ry * 0.3, 1, x, y, rx);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}
function leafyTree(g, x, y, s, pal) { // (x, y): gốc cây
  shade(g, x + s * 0.5, y + s * 0.05, s * 0.95, s * 0.36);
  g.fillStyle = '#56381c'; g.fillRect(x - s * 0.11, y - s * 0.75, s * 0.22, s * 0.8);
  g.fillStyle = '#7d5531'; g.fillRect(x - s * 0.11, y - s * 0.75, s * 0.08, s * 0.8);
  const cy = y - s * 1.3;
  blob(g, x + s * 0.05, cy + s * 0.12, s * 0.82, s * 0.68, pal[0]);
  for (const [dx, dy, rr] of [[-0.38, 0.06, 0.46], [0.36, 0.1, 0.44], [0, -0.3, 0.52]]) blob(g, x + dx * s, cy + dy * s, rr * s, rr * s * 0.9, pal[1]);
  for (const [dx, dy, rr] of [[-0.3, -0.16, 0.32], [0.1, -0.42, 0.3]]) blob(g, x + dx * s, cy + dy * s, rr * s, rr * s * 0.85, pal[2]);
  blob(g, x - s * 0.33, cy - s * 0.32, s * 0.14, s * 0.11, pal[3]); blob(g, x - s * 0.03, cy - s * 0.56, s * 0.12, s * 0.09, pal[3]);
}
function pineTree(g, x, y, s) {
  shade(g, x + s * 0.45, y + s * 0.05, s * 0.75, s * 0.3);
  g.fillStyle = '#56381c'; g.fillRect(x - s * 0.08, y - s * 0.45, s * 0.16, s * 0.5);
  for (let k = 0; k < 3; k++) {
    const by = y - s * (0.3 + k * 0.55), w = s * (0.72 - k * 0.17), h = s * (0.9 - k * 0.08);
    poly(g, [[x, by - h], [x - w, by], [x + w, by]], '#1d4524');
    poly(g, [[x, by - h], [x - w, by], [x - w * 0.1, by + s * 0.04]], '#2f6a34');
    poly(g, [[x, by - h], [x - w * 0.55, by - h * 0.35], [x - w * 0.15, by - h * 0.25]], '#4d8f4a');
  }
}
function rock(g, x, y, s, cols, rand) {
  shade(g, x + s * 0.35, y + s * 0.42, s * 1.05, s * 0.45);
  const pts = [];
  for (let k = 0; k < 7; k++) { const a = Math.PI * 2 * k / 7 + rand() * 0.45, rr = s * (0.8 + rand() * 0.3); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.72]); }
  poly(g, pts, cols[0]);
  g.save(); poly(g, pts); g.clip();
  poly(g, pts.map(([px, py]) => [x + (px - x) * 0.84 - s * 0.1, y + (py - y) * 0.8 - s * 0.14]), cols[1]);
  poly(g, [[x - s * 0.7, y - s * 0.1], [x - s * 0.2, y - s * 0.62], [x + s * 0.3, y - s * 0.55], [x - s * 0.05, y - s * 0.12]], cols[2]);
  g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x + s * 0.1, y - s * 0.3); g.lineTo(x + s * 0.25, y + s * 0.1); g.lineTo(x + s * 0.15, y + s * 0.35); g.stroke();
  g.restore();
  poly(g, pts); g.strokeStyle = 'rgba(20,16,10,.5)'; g.lineWidth = 0.8; g.stroke();
}
function nugget(g, x, y, s) {
  poly(g, [[x - s, y], [x - s * 0.3, y - s * 0.8], [x + s * 0.8, y - s * 0.5], [x + s, y + s * 0.3], [x, y + s * 0.7]], '#8f620b');
  poly(g, [[x - s * 0.7, y - s * 0.1], [x - s * 0.25, y - s * 0.6], [x + s * 0.55, y - s * 0.35], [x + s * 0.4, y + s * 0.2], [x - s * 0.1, y + s * 0.3]], '#f2c12e');
  blob(g, x - s * 0.25, y - s * 0.28, s * 0.22, s * 0.16, '#fff3b0');
}
function sparkle(g, x, y, s) {
  g.strokeStyle = 'rgba(255,250,210,.95)'; g.lineWidth = 0.8; g.beginPath();
  g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke();
}
function bush(g, x, y, s, rand) {
  shade(g, x + s * 0.35, y + s * 0.1, s * 1.05, s * 0.4);
  blob(g, x, y - s * 0.45, s, s * 0.72, '#21491d');
  for (const [dx, dy, rr] of [[-0.45, -0.4, 0.5], [0.4, -0.38, 0.5], [0, -0.75, 0.5]]) blob(g, x + dx * s, y + dy * s, rr * s, rr * s * 0.85, '#326c2a');
  for (const [dx, dy, rr] of [[-0.35, -0.7, 0.3], [0.1, -0.95, 0.26]]) blob(g, x + dx * s, y + dy * s, rr * s, rr * s * 0.8, '#4c8d38');
  for (let n = 0; n < 7; n++) {
    const bx = x + (rand() - 0.5) * 1.6 * s, by = y - s * 0.45 + (rand() - 0.5) * 1.1 * s;
    blob(g, bx, by, s * 0.15, s * 0.15, '#7c0f22'); blob(g, bx - s * 0.02, by - s * 0.02, s * 0.12, s * 0.12, '#d8253f');
    blob(g, bx - s * 0.05, by - s * 0.06, s * 0.04, s * 0.04, '#ffc0c8');
  }
}
function stump(g, x, y, s) {
  shade(g, x + s * 0.4, y + s * 0.2, s * 0.9, s * 0.4);
  g.fillStyle = '#5e3e20'; g.fillRect(x - s * 0.6, y - s * 0.5, s * 1.2, s * 0.6);
  blob(g, x, y + s * 0.1, s * 0.6, s * 0.28, '#5e3e20');
  blob(g, x, y - s * 0.5, s * 0.6, s * 0.28, '#d2a46a');
  g.strokeStyle = '#9a6c3c'; g.lineWidth = 0.6; g.beginPath(); g.ellipse(x, y - s * 0.5, s * 0.33, s * 0.15, 0, 0, Math.PI * 2); g.stroke();
}
function log_(g, x, y, s) { // khúc gỗ nằm
  shade(g, x + s * 0.3, y + s * 0.35, s * 1.4, s * 0.35);
  g.fillStyle = '#6b4626'; g.fillRect(x - s * 1.2, y - s * 0.3, s * 2.2, s * 0.6);
  g.fillStyle = '#87603a'; g.fillRect(x - s * 1.2, y - s * 0.3, s * 2.2, s * 0.2);
  blob(g, x + s, y, s * 0.24, s * 0.3, '#d2a46a');
}
function peak(g, x, base, w, h, rand) { // một đỉnh núi đá
  const ax = x + (rand() - 0.5) * w * 0.3, ay = base - h;
  const L = [x - w, base], R = [x + w, base], M = [ax + w * 0.12, base];
  poly(g, [[ax, ay], L, R], '#5a564c');
  poly(g, [[ax, ay], L, M, [ax + w * 0.05, ay + h * 0.45]], '#8f8a7c');
  poly(g, [[ax, ay], [x - w * 0.55, base - h * 0.35], [ax - w * 0.1, ay + h * 0.4]], '#aaa596');
  const sn = h * 0.3; // tuyết trên đỉnh
  poly(g, [[ax, ay], [ax - sn * 0.75, ay + sn], [ax - sn * 0.3, ay + sn * 0.75], [ax, ay + sn * 1.05], [ax + sn * 0.35, ay + sn * 0.7], [ax + sn * 0.7, ay + sn * 0.95]], '#eef0f1');
  poly(g, [[ax, ay], [ax + sn * 0.35, ay + sn * 0.7], [ax + sn * 0.7, ay + sn * 0.95]], '#c4c9cf');
  g.strokeStyle = 'rgba(30,28,22,.45)'; g.lineWidth = 0.7; poly(g, [[ax, ay], L, R]); g.stroke();
}
function mound(g, x, y, w, h) { // gò đồi cỏ (bàn cờ trận)
  shade(g, x + w * 0.25, y + h * 0.1, w * 1.05, h * 0.45);
  const gr = g.createLinearGradient(x - w, y - h, x + w, y);
  gr.addColorStop(0, '#b4d47c'); gr.addColorStop(0.55, '#7ea64b'); gr.addColorStop(1, '#55782f');
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, w, h, 0, Math.PI, 0); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(40,60,20,.45)'; g.lineWidth = 0.8; g.stroke();
}
function paintTile(g, t, r, rand, v) {
  const k = r / 27, objs = [], add = (y, f) => objs.push([y, f]);
  const slots = (list, n) => shuffleR(list.slice(), rand).slice(0, n).map(([x, y]) => [(x + (rand() - 0.5) * 3) * k, (y + (rand() - 0.5) * 3) * k]);
  paintGround(g, r, GROUND[t], rand, t === PLAINS ? 16 : t === MOUNTAIN ? 3 : t === EMPTY ? 7 : 10);
  if (t === FOREST) {
    for (const [x, y] of slots([[-11, 9], [9, 11], [-2, 1], [12, -3], [-13, -4], [1, -10], [-6, 14]], 5 + (v & 1))) {
      const s = (8 + rand() * 3) * k;
      add(y, rand() < (v < 2 ? 0.25 : 0.6) ? () => pineTree(g, x, y, s * 1.15) : () => leafyTree(g, x, y, s, LEAF[Math.floor(rand() * 3)]));
    }
  } else if (t === WOODLOT) {
    for (const [x, y] of slots([[-8, 4], [8, 0], [0, -8]], 2)) { const s = 6.5 * k; add(y, () => leafyTree(g, x, y, s, LEAF[1])); }
    for (const [x, y] of slots([[-2, 11], [-12, 10], [11, 9]], 2)) add(y, () => stump(g, x, y, 3.2 * k));
    const lx = (v & 1 ? 4 : -4) * k; add(14 * k, () => log_(g, lx, 14 * k, 3 * k));
  } else if (t === BERRY) {
    for (const [x, y] of slots([[-9, 6], [8, 8], [0, -4], [-10, -7], [10, -5]], 3 + (v & 1))) add(y, () => bush(g, x, y, (6.5 + rand() * 1.5) * k, rand));
  } else if (t === HILLS) { // mỏ vàng: mảng đất, đá nâu có vân vàng
    patch(g, r, 0, 3 * k, 19 * k, 13 * k, '#b58d55', '#7d6136');
    for (const [x, y] of slots([[-8, 2], [7, 6], [0, -6], [10, -4]], 3)) {
      const s = (5.5 + rand() * 2) * k;
      add(y, () => { rock(g, x, y, s, ROCK_BROWN, rand); nugget(g, x - s * 0.15, y - s * 0.15, s * 0.42); nugget(g, x + s * 0.4, y + s * 0.15, s * 0.3); });
    }
    for (const [x, y] of slots([[-3, 11], [12, 8], [-13, 7], [3, 3]], 3)) add(y + 1, () => nugget(g, x, y, 2 * k));
    add(99, () => { sparkle(g, -6 * k, -6 * k, 2.2 * k); sparkle(g, 8 * k, -1 * k, 1.8 * k); });
  } else if (t === STONE) { // mỏ đá: các tảng đá xám
    patch(g, r, 0, 3 * k, 19 * k, 13 * k, '#b4b0a2', '#8a8576');
    for (const [x, y] of slots([[-8, 3], [8, 6], [0, -6], [11, -4], [-12, -3]], 4)) add(y, () => rock(g, x, y, (5 + rand() * 2.5) * k, ROCK_GREY, rand));
    for (const [x, y] of slots([[-3, 12], [12, 10], [-13, 9], [4, 2]], 3)) add(y + 1, () => rock(g, x, y, 1.6 * k, ROCK_GREY, rand));
  } else if (t === MOUNTAIN) {
    add(0, () => {
      peak(g, (v & 1 ? 11 : -11) * k, 10 * k, 10 * k, 17 * k, rand);
      peak(g, (v & 1 ? -3 : 3) * k, 14 * k, 17 * k, 31 * k, rand);
      peak(g, (v & 1 ? -14 : 13) * k, 17 * k, 8 * k, 12 * k, rand);
    });
  } else if (t === 'hill') {
    add(0, () => { mound(g, -6 * k, 4 * k, 13 * k, 10 * k); mound(g, 8 * k, 11 * k, 11 * k, 8 * k); });
  } else if (t === EMPTY || t === DEER || t === ELEPHANT) {
    for (let n = 0; n < (t === EMPTY ? 3 : 1); n++) { // hoa nhỏ và sỏi
      const x = (rand() - 0.5) * 30 * k, y = (rand() - 0.5) * 28 * k, c = ['#fff6d8', '#ffe066', '#f0a8d0'][Math.floor(rand() * 3)];
      add(y, () => { for (let a = 0; a < 4; a++) blob(g, x + Math.cos(a * 1.57) * 1.1, y + Math.sin(a * 1.57) * 1.1, 0.9, 0.9, c); blob(g, x, y, 0.6, 0.6, '#c8902a'); });
    }
    if (t === EMPTY) for (let n = 0; n < 2; n++) { const x = (rand() - 0.5) * 28 * k, y = (rand() - 0.5) * 26 * k; add(y, () => rock(g, x, y, 1.5 * k, ROCK_GREY, rand)); }
  }
  objs.sort((a, b) => a[0] - b[0]);
  for (const [, f] of objs) f();
  hexPath(g, 0, 0, r - 0.5); g.strokeStyle = 'rgba(20,30,10,.3)'; g.lineWidth = 1; g.stroke(); // đường lưới ô
}
function shuffleR(a, rand) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const FOG = 'rgba(18,20,28,.58)';
function tileArt(t, r, v, fog) { // fog: bản đã phủ sương (gồm cả phần cây/núi nhô ra ngoài ô)
  const key = t + '|' + r + '|' + v + (fog ? '|f' : '');
  let c = TILE_CACHE.get(key); if (c) return c;
  const top = Math.ceil(r * 1.55), pad = 2, w = 2 * r + 2 * pad, h = top + r + pad;
  c = document.createElement('canvas'); c.width = Math.ceil(w * RES); c.height = Math.ceil(h * RES);
  const g = c.getContext('2d');
  if (fog) {
    g.drawImage(tileArt(t, r, v), 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = FOG; g.fillRect(0, 0, c.width, c.height);
  } else {
    g.scale(RES, RES); g.translate(w / 2, top);
    paintTile(g, t, r, mulberry((typeof t === 'number' ? t : 97) * 7919 + v * 104729 + r * 31), v);
  }
  Object.assign(c, { ox: w / 2, oy: top, lw: w, lh: h });
  TILE_CACHE.set(key, c); return c;
}
// Vẽ cả ô địa hình tâm (x, y) cỡ r. i: chỉ số ô trên bản đồ lớn (biết thú còn sống hay đã thành xác); battle: ô trên bàn cờ trận
function drawTile(g, t, x, y, r, i, battle, fog) {
  const art = battle && t === HILLS ? 'hill' : t, seed = ((i == null ? 0 : i) + (battle ? 53 : 0)) * 2654435761 >>> 0;
  const c = tileArt(art, r, (seed >>> 7) % TILE_VARIANTS, fog);
  g.drawImage(c, x - c.ox, y - c.oy, c.lw, c.lh);
  if (!battle && (t === DEER || t === ELEPHANT)) {
    const dead = i != null && isDead(i), name = t === DEER ? 'deer' : 'elephant';
    shade(g, x + 3, y + 10, 11, 3.5);
    drawIcon(g, `animals/${name}${dead ? '_dead' : ''}`, x, y, 30);
    if (i != null && t === ELEPHANT && !dead && eleHp(i) < ELEPHANT_HP) hpBar(g, x, y + 15, 24, eleHp(i) / ELEPHANT_HP); // voi bị thương
  }
}
// Công trình: nền màu phe dưới chân, ảnh (assets/buildings/*.svg) và cờ phe. size: cỡ ảnh; big: Nhà chính (cờ to hơn)
const BLD_SIZE = { house: 34, farm: 50 }; // cỡ ảnh riêng từng loại công trình trên bản đồ; loại khác dùng 44
function drawBuilding(g, x, y, key, color, size, flag, big) {
  g.save();
  g.beginPath(); g.ellipse(x, y + 10, size * 0.4, size * 0.13, 0, 0, Math.PI * 2);
  g.globalAlpha = 0.35; g.fillStyle = color; g.fill();
  g.globalAlpha = 0.9; g.lineWidth = 1.5; g.strokeStyle = color; g.stroke();
  g.restore();
  if (IMG[key]) g.drawImage(IMG[key], x - size / 2, y + 14 - size * 0.9, size, size);
  else drawIcon(g, key, x, y, size * 0.5);
  if (!flag) return;
  const fx = x + size * (big ? 0.36 : 0.4), top = y - size * (big ? 0.62 : 0.55), wave = Math.sin(performance.now() / 400 + x) * 1.2;
  g.strokeStyle = '#3a2614'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(fx, y + 6); g.lineTo(fx, top); g.stroke();
  const fw = big ? 11 : 8, fh = big ? 7 : 5.5;
  g.beginPath(); g.moveTo(fx, top); g.quadraticCurveTo(fx + fw / 2, top - 1.5 + wave, fx + fw, top + fh / 2 + wave); g.quadraticCurveTo(fx + fw / 2, top + fh + wave, fx, top + fh); g.closePath();
  g.fillStyle = color; g.fill(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1; g.stroke();
}
function hpBar(g, x, y, w, f) {
  f = Math.max(0, Math.min(1, f));
  g.fillStyle = '#111'; g.fillRect(x - w / 2, y, w, 4);
  g.fillStyle = f > 0.5 ? '#5fd35a' : f > 0.25 ? '#e8c33a' : '#e8503a'; g.fillRect(x - w / 2, y, w * f, 4);
}
// Đơn vị: người/ngựa đứng trên vòng màu phe, áo tô màu phe. key: tên ảnh, vd 'units/club'; dim: đã hết lượt (vẽ mờ)
function drawToken(g, x, y, color, key, hp, maxHp, dim, r, flip) { // flip: quay mặt sang trái (phe địch)
  const im = teamImg(key, color), fy = y + r * 0.7; // fy: mặt đất dưới chân
  g.save(); g.globalAlpha = dim ? 0.5 : 1;
  if (!im) { // chưa có ảnh: vòng tròn màu phe + emoji như cũ
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = color; g.fill();
    g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
    drawIcon(g, key, x, y, r * 1.6);
  } else {
    g.beginPath(); g.ellipse(x, fy, r * 0.95, r * 0.36, 0, 0, Math.PI * 2);
    g.globalAlpha *= 0.5; g.fillStyle = color; g.fill();
    g.globalAlpha = dim ? 0.5 : 1; g.lineWidth = 1.6; g.strokeStyle = color; g.stroke();
    const size = r * 2.7;
    if (flip) { g.translate(x, 0); g.scale(-1, 1); g.drawImage(im, -size / 2, fy - size * 0.9, size, size); } else g.drawImage(im, x - size / 2, fy - size * 0.9, size, size);
  }
  g.restore();
  hpBar(g, x, y + r * 1.1 + 1, r * 1.8, hp / maxHp);
}
// Nhãn nâng cấp dưới thanh Máu khi rê chuột: ⚔+N (đỏ) và 🛡+N (xanh); mặt nào chưa được cộng thì không vẽ
function bonusTags(g, x, y, u) {
  const tags = [[atkBonus(u), '⚔', '#b3261e'], [defBonus(u), '🛡', '#1f5fae']].filter(t => t[0] > 0).map(([v, ic, bg]) => [`${ic}+${v}`, bg]);
  if (!tags.length) return;
  g.save(); g.font = 'bold 9px "Segoe UI", "Segoe UI Emoji", sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
  const ws = tags.map(([t]) => g.measureText(t).width + 8), gap = 3, total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
  let cx = x - total / 2;
  tags.forEach(([t, bg], k) => {
    const w = ws[k];
    g.beginPath(); g.roundRect ? g.roundRect(cx, y, w, 12, 4) : g.rect(cx, y, w, 12);
    g.fillStyle = bg; g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#fff'; g.fillText(t, cx + w / 2, y + 6.5);
    cx += w + gap;
  });
  g.restore();
}
function badge(g, x, y, text, bg) {
  g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fillStyle = bg; g.fill();
  g.font = 'bold 9px "Segoe UI", "Segoe UI Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#fff'; g.fillText(text, x, y + 0.5);
}
// ô trong sương được vẽ sẵn bản tối; ô có công trình hoặc thú thì vẫn phủ sương sau cùng để che cả chúng
const fogTile = (me, i) => !me.visible[i] && !G.bld[i] && G.t[i] !== DEER && G.t[i] !== ELEPHANT;
function draw() {
  requestAnimationFrame(draw);
  if (B) drawBattle();
  drawMini();
  const g = ctx2;
  g.setTransform(RES, 0, 0, RES, 0, 0);
  g.clearRect(0, 0, W, H); // nền trong suốt: thấy nền của khung bản đồ (style.css)
  if (!G) return;
  const me = G.players[0];
  for (let i = 0; i < N * N; i++) {
    const { x, y } = CEN[i];
    hexPath(g, x, y, S - 0.5);
    if (!known(me, i)) { g.fillStyle = '#050507'; g.fill(); g.strokeStyle = '#15161c'; g.lineWidth = 1; g.stroke(); continue; }
    drawTile(g, G.t[i], x, y, S, i, false, fogTile(me, i));
  }
  // lãnh thổ
  for (const p of G.players) {
    if (!me.explored[p.city.i]) continue;
    g.strokeStyle = p.color; g.lineWidth = 1.5; g.globalAlpha = 0.45;
    for (const i of terrOf(p)) if (me.explored[i]) { hexPath(g, CEN[i].x, CEN[i].y, S - 3); g.stroke(); }
    g.globalAlpha = 1;
  }
  // công trình
  for (const b of Object.values(G.bld).sort((a, c) => a.tile - c.tile)) { // hàng dưới vẽ sau, che hàng trên
    const i = b.tile; if (!me.explored[i]) continue;
    const { x, y } = CEN[i];
    drawBuilding(g, x, y, b.done ? 'buildings/' + b.id : 'buildings/site', G.players[b.owner].color, BLD_SIZE[b.done ? b.id : 'site'] || 44, b.done && b.id !== 'farm');
    if (me.visible[i] || b.owner === 0) { if (!b.done) hpBar(g, x, y + 15, 26, b.prog / b.need); else if (b.hp < b.max) hpBar(g, x, y + 15, 26, b.hp / b.max); }
  }
  // sương mù xám
  for (let i = 0; i < N * N; i++) if (known(me, i) && !me.visible[i] && !fogTile(me, i)) { hexPath(g, CEN[i].x, CEN[i].y, S - 0.5); g.fillStyle = FOG; g.fill(); }
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
    drawBuilding(g, x, y, 'buildings/city' + Math.min(p.age, MAX_AGE), p.color, p.age >= 3 ? 58 : 54, true, true);
    const hp = me.visible[c.i] || p.id === 0 ? c.hp : c.maxHp;
    if (hp < c.maxHp) hpBar(g, x, y + 17, 30, hp / c.maxHp);
  }
  // đơn vị (gộp theo ô vì dân có thể đứng chung ô mỏ)
  const groups = new Map();
  for (const u of G.units) if (canSee(0, u)) { if (!groups.has(u.i)) groups.set(u.i, []); groups.get(u.i).push(u); }
  for (const [i, list] of groups) {
    const u = list.includes(sel) ? sel : list[0], { x, y } = CEN[i], s = ust(u);
    const mine = u.owner === 0, ready = mine && list.some(needsOrders), spent = mine && !isVil(u) && (u.attacked || u.mp <= 0);
    drawToken(g, x, y - 2, G.players[u.owner].color, 'units/' + u.type, u.hp, maxHp(u), spent, 12, u.owner !== 0);
    if (i === hover && !isVil(u)) bonusTags(g, x, y + 13, u);
    if (ready && !G.busy) { // vòng xanh nhấp nháy: còn chờ lệnh
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260);
      g.beginPath(); g.ellipse(x, y - 2 + 12 * 0.7, 13 + pulse * 2, 5.5 + pulse, 0, 0, Math.PI * 2); // vòng dưới chân
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
// Màn Quản trị chia tab. Mọi tab nằm sẵn trong trang (chỉ ẩn/hiện) nên số đang sửa dở ở tab khác không mất khi đổi tab.
// Ô viền vàng: khác mặc định (rê chuột để xem mặc định). Ô tìm nhanh lọc trên mọi tab.
const ADMIN_TABS = [
  ['game', '🎮 Ván mới', 'Khởi đầu ván, Nhà chính, tài nguyên quanh nhà và độ khó AI. Áp dụng từ ván mới.'],
  ['eco', '💰 Kinh tế', 'Khai thác, trữ lượng mỗi ô, dân số.'],
  ['age', '⬆️ Lên đời', 'Giá và thời gian lên Đời Công Cụ, Đời Đồ Đồng.'],
  ['units', '⚔ Quân', 'Giá và chỉ số đơn vị, chia theo đời.'],
  ['bld', '🏠 Công trình', 'Giá, thời gian xây, Máu công trình, chia theo đời.'],
  ['techs', '🔧 Nâng cấp', 'Giá và thời gian nghiên cứu, chia theo nhà.'],
  ['backup', '💾 Sao lưu', 'Xuất/nhập cấu hình dạng JSON, khôi phục mặc định.'],
];
const ADMIN_GROUPS = { game: ['start', 'city', 'home', 'aiEasy', 'aiNormal', 'aiHard', 'aiVhard'], eco: ['gather', 'amounts', 'pop'], age: ['age', 'age3'] };
let adminTab = 'game';
function showAdmin(note) {
  const inp = (path, min) => { const v = cfgGet(CFG, path), d = cfgGet(DEFAULT_CFG, path); return `<input type="number" min="${min}" max="99999" step="1" data-cfg="${path.join('.')}" data-def="${d}" value="${v}" title="Mặc định: ${d}"${v !== d ? ' class="chg"' : ''}>`; };
  const cards = keys => '<div class="cfggrid">' + keys.map(g => CFG_GROUPS.find(x => x[0] === g)).map(([g, title, fields]) =>
    `<div class="card"><h3>${title}</h3>${fields.map(([f, label, min, max]) => `<label class="cfgrow" data-q="${attrEsc((title + ' ' + label).toLowerCase())}"><span>${label}${max != null ? ` <small class="muted">(${min}–${max})</small>` : ''}</span>${inp([g, f], min)}</label>`).join('')}</div>`).join('') + '</div>';
  const table = (key, defs, fields, sections) => sections.filter(([, ids]) => ids.length).map(([title, ids]) => `<h3 class="admsec">${title}</h3><div class="cfgscroll"><table class="cfg"><tr><th></th>${fields.map(f => `<th>${f[1]}</th>`).join('')}</tr>${
    ids.map(id => `<tr data-q="${attrEsc((defs[id].name + ' ' + title.replace(/<[^>]*>/g, '')).toLowerCase())}"><td>${defs[id].ico} ${defs[id].name}${key === 'techs' ? ` <small class="muted">· Đời ${defs[id].age}</small>` : ''}</td>${fields.map(([f, , min]) => `<td>${inp([key, id, f], min)}</td>`).join('')}</tr>`).join('')}</table></div>`).join('');
  const byAge = (key, defs) => [1, 2, 3].map(n => [AGES[n], Object.keys(DEFAULT_CFG[key]).filter(id => Math.min(3, Math.max(1, defs[id].age || 1)) === n)]);
  const techSecs = [...new Set(Object.values(TECHS).map(t => t.at))].map(at => [`${BUILDINGS[at].ico} ${BUILDINGS[at].name}`, Object.keys(DEFAULT_CFG.techs).filter(id => TECHS[id].at === at).sort((x, y) => TECHS[x].age - TECHS[y].age)]);
  const body = {
    game: cards(ADMIN_GROUPS.game), eco: cards(ADMIN_GROUPS.eco), age: cards(ADMIN_GROUPS.age),
    units: table('units', UNITS, UNIT_FIELDS, byAge('units', UNITS)),
    bld: table('buildings', BUILDINGS, BLD_FIELDS, byAge('buildings', BUILDINGS)),
    techs: table('techs', TECHS, TECH_FIELDS, techSecs),
    backup: `<div class="card" style="margin-top:10px"><h3>Xuất / nhập JSON</h3><div class="muted">Bấm “Xuất JSON” để lấy cấu hình hiện tại (gồm cả số đang sửa chưa lưu), hoặc dán JSON vào rồi bấm “Nhập JSON”.</div>
      <textarea id="cfgjson" rows="8" spellcheck="false"></textarea>
      <p><button class="btn" data-act="cfg:export">Xuất JSON</button> <button class="btn" data-act="cfg:import">Nhập JSON</button></p></div>
      <div class="card"><h3>Khôi phục mặc định</h3><div class="muted">Đưa toàn bộ cấu hình (mọi tab) về giá trị gốc và lưu luôn.</div><p><button class="btn" data-act="cfg:reset">↩ Khôi phục toàn bộ mặc định</button></p></div>`,
  };
  const h = `<div class="modal admin"><div class="admtop"><h1>⚙ Quản trị</h1><input id="admq" type="search" placeholder="🔍 Tìm nhanh (vd: kiếm, vàng, voi…)" autocomplete="off"></div>
    <div class="muted">Giá, thời gian và chỉ số áp dụng ngay sau khi lưu; các mục ở tab Ván mới áp dụng từ <b>ván mới</b>. Cấu hình lưu trên trình duyệt này. Ô viền vàng: khác mặc định (rê chuột để xem mặc định).</div>
    ${note ? `<div class="place" style="margin-top:8px">${note}</div>` : ''}
    <div class="admtabs">${ADMIN_TABS.map(([k, t]) => `<button class="tab${k === adminTab ? ' on' : ''}" data-act="cfg:tab-${k}" data-tab="${k}">${t}<i class="admn"></i></button>`).join('')}</div>
    <div class="admbody">${ADMIN_TABS.map(([k, , d]) => `<section class="admpane${k === adminTab ? ' on' : ''}" data-pane="${k}"><div class="muted admdesc">${d}</div>${body[k]}</section>`).join('')}<div class="admnone muted">Không có mục nào khớp.</div></div>
    <div class="admfoot"><span class="muted" id="admchg"></span><button class="btn" data-act="cfg:close">Đóng</button><button class="btn primary" data-act="cfg:save">💾 Lưu cấu hình</button></div></div>`;
  const o = document.getElementById('overlay');
  o.innerHTML = h; o.classList.add('show');
  const m = o.querySelector('.modal.admin');
  m.addEventListener('input', e => {
    if (e.target.id === 'admq') { adminFilter(); return; }
    if (e.target.dataset.cfg) { e.target.classList.toggle('chg', e.target.value !== e.target.dataset.def); adminCount(); }
  });
  adminCount();
}
function adminCount() { // số ô khác mặc định trên mỗi tab
  let all = 0;
  for (const pane of document.querySelectorAll('.admpane')) {
    const n = pane.querySelectorAll('input.chg').length; all += n;
    const t = document.querySelector(`.admtabs [data-tab="${pane.dataset.pane}"] .admn`); if (t) t.textContent = n || '';
  }
  const c = document.getElementById('admchg'); if (c) c.textContent = all ? `${all} ô khác mặc định` : 'Đang dùng toàn bộ mặc định';
}
function adminFilter() { // gõ tìm: hiện mọi tab, chỉ giữ dòng khớp
  const q = document.getElementById('admq').value.trim().toLowerCase(), m = document.querySelector('.modal.admin');
  m.classList.toggle('searching', !!q);
  let hits = 0;
  for (const r of m.querySelectorAll('[data-q]')) { const ok = !q || r.dataset.q.includes(q); r.classList.toggle('nohit', !ok); if (ok && q) hits++; }
  for (const el of m.querySelectorAll('.cfggrid .card, .cfgscroll')) el.classList.toggle('nohit', !!q && !el.querySelector('[data-q]:not(.nohit)'));
  for (const el of m.querySelectorAll('h3.admsec')) el.classList.toggle('nohit', !!q && el.nextElementSibling.classList.contains('nohit'));
  m.classList.toggle('nohits', !!q && !hits);
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
  if (a.startsWith('tab-')) { // đổi tab: chỉ ẩn/hiện, không vẽ lại để giữ số đang sửa
    adminTab = a.slice(4);
    for (const el of document.querySelectorAll('.admtabs .tab')) el.classList.toggle('on', el.dataset.tab === adminTab);
    for (const el of document.querySelectorAll('.admpane')) el.classList.toggle('on', el.dataset.pane === adminTab);
    return;
  }
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
const MINI_K = 0.19, mini = document.getElementById('mini'), mctx = mini.getContext('2d');
let miniOn = true;
try { miniOn = localStorage.getItem('mini') !== '0'; } catch (e) { /* bỏ qua */ }
mini.width = Math.round(W * MINI_K) * 2; mini.height = Math.round(H * MINI_K) * 2;
mini.style.width = Math.round(W * MINI_K) + 'px'; mini.style.height = Math.round(H * MINI_K) + 'px';
// Thu gọn / mở bảng điều khiển dưới đáy (nhớ lựa chọn); bản đồ tự giãn theo chỗ trống
let panelOn = true;
try { panelOn = localStorage.getItem('panel') !== '0'; } catch (e) { /* bỏ qua */ }
function togglePanel(on = !panelOn) {
  panelOn = on;
  try { localStorage.setItem('panel', on ? '1' : '0'); } catch (e) { /* bỏ qua */ }
  document.getElementById('bottom').classList.toggle('collapsed', !on);
  document.getElementById('bottomtoggle').textContent = on ? '▾ Thu gọn' : '▴ Mở bảng';
}
togglePanel(panelOn);
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
  mini.parentElement.style.display = show ? '' : 'none';
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
  if (zoom > 1) { // khung trắng: phần bản đồ đang thấy
    const r = mapwrap.getBoundingClientRect(), cr = cv.getBoundingClientRect(), cl = v => Math.max(0, Math.min(1, v));
    const x0 = cl((r.left - cr.left) / cr.width), x1 = cl((r.right - cr.left) / cr.width), y0 = cl((r.top - cr.top) / cr.height), y1 = cl((r.bottom - cr.top) / cr.height);
    g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.strokeRect(x0 * W * k, y0 * H * k, (x1 - x0) * W * k, (y1 - y0) * H * k);
  }
}
mini.addEventListener('click', e => { // bấm bản đồ con: đưa chỗ đó vào giữa khung
  const r = mini.getBoundingClientRect();
  mapwrap.scrollLeft = (e.clientX - r.left) / r.width * cv.offsetWidth - mapwrap.clientWidth / 2;
  mapwrap.scrollTop = (e.clientY - r.top) / r.height * cv.offsetHeight - mapwrap.clientHeight / 2;
});

applyZoom();
showMenu();
requestAnimationFrame(draw);
