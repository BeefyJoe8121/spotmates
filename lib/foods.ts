/**
 * Food search, MyFitnessPal style: search a food database, then pick a serving size and how many servings.
 * Main source: USDA FoodData Central (generic foods, restaurant and branded items).
 * Backup source: Open Food Facts (packaged foods), used if USDA is unavailable or rate-limited.
 */
import { matchCommon } from './commonFoods';

export type Serving = { label: string; grams: number };
export type FoodResult = {
  id: string;
  name: string;
  brand?: string;
  source: 'usda' | 'off' | 'common';
  /** Plain foods (not a brand-name product) */
  generic?: boolean;
  /** 0 basic ingredient, 1 prepared dish, 2 brand-name product */
  tier?: number;
  per100: { kcal: number; protein: number; carbs: number; fat: number };
  servings: Serving[];
};
/** A food added to a meal */
export type FoodItem = {
  name: string; brand?: string; serving: string; grams: number; qty: number;
  kcal: number; protein: number; carbs: number; fat: number;
};

// USDA key: set EXPO_PUBLIC_USDA_KEY in expo.dev → Environment variables (preview) for 1,000 searches an hour.
// Without it the shared DEMO_KEY allows 30 an hour.
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
    generic: f.dataType !== 'Branded',
    tier: f.dataType === 'Branded' ? 2 : /Survey/.test(String(f.dataType)) ? 1 : 0,
    name: titleCase(String(f.description)),
    brand: f.brandName || f.brandOwner ? titleCase(String(f.brandName || f.brandOwner)) : undefined,
    source: 'usda',
    per100: { kcal, protein, carbs, fat },
    servings: baseServings(extra),
  };
}
async function searchUsda(query: string, signal?: AbortSignal): Promise<FoodResult[]> {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(USDA_KEY)}&query=${encodeURIComponent(query)}&pageSize=50&requireAllWords=true` +
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

/** Look up a packaged food by its barcode: Open Food Facts first, then USDA's branded foods */
export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<FoodResult | null> {
  const digits = code.replace(/\D/g, '');
  if (!digits) return null;
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${digits}.json?fields=code,product_name,generic_name,brands,serving_size,serving_quantity,nutriments`, { signal, headers: { 'User-Agent': 'SpotMates/1.0 (friends fitness app)' } });
    if (res.ok) {
      const json = await res.json();
      const f = json.status === 1 && json.product ? fromOff({ ...json.product, code: digits }) : null;
      if (f && (f.per100.kcal || f.per100.protein || f.per100.carbs || f.per100.fat)) return f;
    }
  } catch (e: any) { if (e?.name === 'AbortError') throw e; }
  // UPC-A barcodes are 12 digits; EAN-13 adds a leading 0
  const variants = [...new Set([digits, digits.replace(/^0+/, ''), digits.length === 12 ? `0${digits}` : digits])];
  for (const v of variants) {
    try {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(USDA_KEY)}&query=${v}&dataType=Branded&pageSize=5`;
      const res = await fetch(url, { signal });
      if (!res.ok) continue;
      const json = await res.json();
      const hit = (json.foods ?? []).find((f: any) => String(f.gtinUpc ?? '').replace(/^0+/, '') === v.replace(/^0+/, ''));
      if (hit) return fromUsda(hit);
    } catch (e: any) { if (e?.name === 'AbortError') throw e; }
  }
  return null;
}

/** Everyday foods from the built-in list, instantly and without using the internet */
export function commonResults(query: string): FoodResult[] {
  return matchCommon(query).map((f) => ({ id: `common-${f.name}`, name: f.name, source: 'common' as const, generic: true, per100: f.per100, servings: baseServings(f.servings) }));
}

/** Put the food you most likely meant first: plain foods before brands and candy, names that start with your words, shorter names */
const TREATS = /\b(candy|candies|chocolate|cake|cookie|pie|cereal|baby|snack|frosting|nog)\b/;
function rank(results: FoodResult[], query: string): FoodResult[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const askedForTreat = TREATS.test(query.toLowerCase());
  const score = (r: FoodResult) => {
    const name = r.name.toLowerCase();
    const nameWords = name.split(/[^a-z0-9]+/).filter(Boolean);
    let s = (r.tier ?? (r.generic ? 1 : 2)) === 2 ? 6 : (r.tier ?? 1) * 2;
    if (nameWords[0]?.startsWith(words[0] ?? '')) s -= 4;
    s -= words.filter((w) => nameWords.some((x) => x === w || x === `${w}s` || `${x}s` === w)).length * 3;
    s += words.filter((w) => !nameWords.some((x) => x.startsWith(w))).length * 5;
    s += Math.min(6, nameWords.length * 0.5);
    if (!askedForTreat && TREATS.test(name)) s += 8;
    return s;
  };
  const seen = new Set<string>();
  return results
    .map((r) => ({ r, s: score(r) }))
    .sort((a, b) => a.s - b.s)
    .map((x) => x.r)
    .filter((r) => { const k = `${r.name}|${r.brand ?? ''}`.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 30);
}

const cache = new Map<string, { results: FoodResult[]; note?: string }>();

/** Database search (USDA, then Open Food Facts as a backup), ranked, cached per search */
export async function searchFoods(query: string, signal?: AbortSignal): Promise<{ results: FoodResult[]; note?: string }> {
  const q = query.trim().toLowerCase();
  if (!q) return { results: [] };
  const hit = cache.get(q);
  if (hit) return hit;
  let out: { results: FoodResult[]; note?: string };
  try {
    const results = await searchUsda(q, signal);
    out = { results: rank(results.length ? results : await searchOff(q, signal).catch(() => []), q) };
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    const off = await searchOff(q, signal).catch(() => [] as FoodResult[]);
    out = { results: rank(off, q), note: e?.message === 'rate' ? 'The main food database hit its hourly limit, so more results come from Open Food Facts.' : undefined };
  }
  cache.set(q, out);
  return out;
}

/** Rebuild a searchable result from a food you've logged before */
export function fromRecent(item: FoodItem): FoodResult {
  const g = item.grams * item.qty || 100;
  const scale = 100 / g;
  return {
    id: `recent-${item.name}-${item.serving}`,
    name: item.name, brand: item.brand, source: 'usda',
    per100: { kcal: item.kcal * scale, protein: item.protein * scale, carbs: item.carbs * scale, fat: item.fat * scale },
    // Quick adds have no weight: treat the whole entry as one 100 g "serving" so the numbers stay right
    servings: item.grams > 0 ? baseServings([{ label: item.serving, grams: item.grams }]) : [{ label: '1 serving', grams: g / item.qty }],
  };
}

// Hand-off between the food search screen and the meal logger
type Listener = (f: FoodItem) => void;
let listener: Listener | null = null;
export const foodBus = {
  listen(fn: Listener) { listener = fn; return () => { if (listener === fn) listener = null; }; },
  emit(f: FoodItem) { listener?.(f); },
};
