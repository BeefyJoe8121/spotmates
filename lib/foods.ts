/**
 * Food search, MyFitnessPal style: search a food database, then pick a serving size and how many servings.
 * Main source: USDA FoodData Central (generic foods, restaurant and branded items).
 * Backup source: Open Food Facts (packaged foods), used if USDA is unavailable or rate-limited.
 */
export type Serving = { label: string; grams: number };
export type FoodResult = {
  id: string;
  name: string;
  brand?: string;
  source: 'usda' | 'off';
  per100: { kcal: number; protein: number; carbs: number; fat: number };
  servings: Serving[];
};
/** A food added to a meal */
export type FoodItem = {
  name: string; brand?: string; serving: string; grams: number; qty: number;
  kcal: number; protein: number; carbs: number; fat: number;
};

// Free key from fdc.nal.usda.gov/api-key-signup raises the limit from 30 to 1,000 searches an hour.
const USDA_KEY = process.env.EXPO_PUBLIC_USDA_KEY || 'DEMO_KEY';

const r1 = (n: number) => Math.round(n * 10) / 10;
const titleCase = (s: string) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()) : s.charAt(0).toUpperCase() + s.slice(1);

export function macrosFor(food: FoodResult, grams: number, qty: number) {
  const k = (grams * qty) / 100;
  return {
    kcal: Math.round(food.per100.kcal * k),
    protein: r1(food.per100.protein * k),
    carbs: r1(food.per100.carbs * k),
    fat: r1(food.per100.fat * k),
  };
}

function baseServings(extra: Serving[]): Serving[] {
  const all = [...extra, { label: '100 g', grams: 100 }, { label: '1 oz (28 g)', grams: 28.35 }, { label: '1 g', grams: 1 }];
  const seen = new Set<string>();
  return all.filter((s) => s.grams > 0 && !seen.has(s.label.toLowerCase()) && seen.add(s.label.toLowerCase())).slice(0, 14);
}

// ---------- USDA ----------
function usdaNutrient(f: any, ids: number[]): number | null {
  for (const id of ids) {
    const n = (f.foodNutrients ?? []).find((x: any) => x.nutrientId === id || Number(x.nutrientNumber) === id);
    if (n && typeof n.value === 'number') return n.value;
  }
  return null;
}
function fromUsda(f: any): FoodResult | null {
  const protein = usdaNutrient(f, [1003, 203]) ?? 0;
  const fat = usdaNutrient(f, [1004, 204]) ?? 0;
  const carbs = usdaNutrient(f, [1005, 205]) ?? 0;
  const kcal = usdaNutrient(f, [1008, 208, 2047, 2048]) ?? protein * 4 + carbs * 4 + fat * 9;
  if (!f.description) return null;
  const extra: Serving[] = [];
  const unit = String(f.servingSizeUnit ?? '').toLowerCase();
  if (f.servingSize && (unit === 'g' || unit === 'grm' || unit === 'ml' || unit === 'mlt')) {
    const g = Number(f.servingSize);
    const house = f.householdServingFullText ? titleCase(String(f.householdServingFullText)) : '1 serving';
    extra.push({ label: `${house} (${Math.round(g)} g)`, grams: g });
  }
  (f.foodMeasures ?? [])
    .filter((m: any) => m && m.gramWeight > 0 && m.disseminationText && !/quantity not specified/i.test(m.disseminationText))
    .sort((a: any, b: any) => (a.rank ?? 99) - (b.rank ?? 99))
    .forEach((m: any) => extra.push({ label: `${m.disseminationText} (${Math.round(m.gramWeight)} g)`, grams: m.gramWeight }));
  return {
    id: `usda-${f.fdcId}`,
    name: titleCase(String(f.description)),
    brand: f.brandName || f.brandOwner ? titleCase(String(f.brandName || f.brandOwner)) : undefined,
    source: 'usda',
    per100: { kcal, protein, carbs, fat },
    servings: baseServings(extra),
  };
}
async function searchUsda(query: string, signal?: AbortSignal): Promise<FoodResult[]> {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(USDA_KEY)}&query=${encodeURIComponent(query)}&pageSize=30` +
    `&dataType=${encodeURIComponent('Survey (FNDDS)')}&dataType=Branded&dataType=${encodeURIComponent('SR Legacy')}&dataType=Foundation`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(res.status === 429 ? 'rate' : `usda ${res.status}`);
  const json = await res.json();
  return (json.foods ?? []).map(fromUsda).filter(Boolean) as FoodResult[];
}

// ---------- Open Food Facts ----------
function fromOff(p: any): FoodResult | null {
  const n = p.nutriments ?? {};
  const name = p.product_name || p.generic_name;
  if (!name) return null;
  const protein = Number(n.proteins_100g) || 0, carbs = Number(n.carbohydrates_100g) || 0, fat = Number(n.fat_100g) || 0;
  const kcal = Number(n['energy-kcal_100g']) || (Number(n.energy_100g) ? Number(n.energy_100g) / 4.184 : protein * 4 + carbs * 4 + fat * 9);
  const extra: Serving[] = [];
  const sq = Number(p.serving_quantity);
  if (sq > 0) extra.push({ label: `${p.serving_size ? titleCase(String(p.serving_size)) : '1 serving'}${/\d\s*g\b/i.test(String(p.serving_size)) ? '' : ` (${Math.round(sq)} g)`}`, grams: sq });
  return {
    id: `off-${p.code || p._id || name}`,
    name: titleCase(String(name)),
    brand: p.brands ? String(p.brands).split(',')[0].trim() : undefined,
    source: 'off',
    per100: { kcal, protein, carbs, fat },
    servings: baseServings(extra),
  };
}
async function searchOff(query: string, signal?: AbortSignal): Promise<FoodResult[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=25` +
    `&fields=code,product_name,generic_name,brands,serving_size,serving_quantity,nutriments`;
  const res = await fetch(url, { signal, headers: { 'User-Agent': 'SpotMates/1.0 (friends fitness app)' } });
  if (!res.ok) throw new Error(`off ${res.status}`);
  const json = await res.json();
  return (json.products ?? []).map(fromOff).filter(Boolean) as FoodResult[];
}

export async function searchFoods(query: string, signal?: AbortSignal): Promise<{ results: FoodResult[]; note?: string }> {
  const q = query.trim();
  if (!q) return { results: [] };
  try {
    const results = await searchUsda(q, signal);
    if (results.length) return { results };
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    const off = await searchOff(q, signal).catch(() => [] as FoodResult[]);
    return { results: off, note: e?.message === 'rate' ? 'The main food database is busy, so these results come from Open Food Facts.' : undefined };
  }
  return { results: await searchOff(q, signal).catch(() => []) };
}

/** Rebuild a searchable result from a food you've logged before */
export function fromRecent(item: FoodItem): FoodResult {
  const g = item.grams * item.qty || 100;
  const scale = 100 / g;
  return {
    id: `recent-${item.name}-${item.serving}`,
    name: item.name, brand: item.brand, source: 'usda',
    per100: { kcal: item.kcal * scale, protein: item.protein * scale, carbs: item.carbs * scale, fat: item.fat * scale },
    servings: baseServings([{ label: item.serving, grams: item.grams }]),
  };
}

// Hand-off between the food search screen and the meal logger
type Listener = (f: FoodItem) => void;
let listener: Listener | null = null;
export const foodBus = {
  listen(fn: Listener) { listener = fn; return () => { if (listener === fn) listener = null; }; },
  emit(f: FoodItem) { listener?.(f); },
};
