/**
 * Everyday foods with standard nutrition (per 100 g, based on USDA values) and real serving sizes.
 * These show first in search so "egg" finds eggs and "rice" finds rice, even offline.
 * Row: [name, aliases, kcal, protein, carbs, fat, servings as [label, grams]...]
 */
type Row = [string, string, number, number, number, number, ...[string, number][]];

const ROWS: Row[] = [
  // Eggs
  ['Egg, whole (boiled or raw)', 'eggs hard boiled', 143, 12.6, 0.7, 9.5, ['1 large', 50], ['1 medium', 44], ['1 extra large', 56]],
  ['Egg, scrambled', 'eggs', 149, 10, 1.6, 11, ['1 large egg', 61], ['2 large eggs', 122]],
  ['Egg, fried', 'eggs over easy', 196, 13.6, 0.8, 14.8, ['1 large', 46]],
  ['Egg whites', 'egg white liquid', 52, 10.9, 0.7, 0.2, ['1 large egg white', 33], ['1 cup', 243], ['3 tbsp (liquid)', 46]],
  ['Egg yolk', 'eggs', 322, 15.9, 3.6, 26.5, ['1 large', 17]],
  // Grains and starches
  ['White rice, cooked', 'rice jasmine long grain', 130, 2.7, 28.2, 0.3, ['1 cup', 158], ['1/2 cup', 79]],
  ['Brown rice, cooked', 'rice', 112, 2.3, 23.5, 0.8, ['1 cup', 195], ['1/2 cup', 98]],
  ['White rice, uncooked', 'rice dry', 365, 7.1, 80, 0.7, ['1/4 cup dry', 46], ['1 cup dry', 185]],
  ['Fried rice', 'rice chinese', 170, 4, 24, 6.5, ['1 cup', 198]],
  ['Quinoa, cooked', '', 120, 4.4, 21.3, 1.9, ['1 cup', 185]],
  ['Pasta, cooked', 'spaghetti noodles penne', 158, 5.8, 30.9, 0.9, ['1 cup', 140], ['2 cups', 280]],
  ['Pasta, dry', 'spaghetti noodles uncooked', 371, 13, 75, 1.5, ['2 oz dry', 56]],
  ['Oats, rolled (dry)', 'oatmeal old fashioned', 379, 13.2, 67.7, 6.5, ['1/2 cup dry', 40], ['1 cup dry', 81]],
  ['Oatmeal, cooked with water', 'oats porridge', 71, 2.5, 12, 1.5, ['1 cup', 234]],
  ['White bread', 'toast', 266, 7.6, 49, 3.3, ['1 slice', 27], ['2 slices', 54]],
  ['Whole wheat bread', 'toast wheat', 252, 12.4, 42.7, 3.5, ['1 slice', 32], ['2 slices', 64]],
  ['Bagel, plain', '', 257, 10, 50.5, 1.6, ['1 bagel', 105]],
  ['Flour tortilla', 'wrap burrito', 304, 8.1, 50, 7.7, ['1 tortilla (8 in)', 49], ['1 tortilla (10 in)', 72]],
  ['Corn tortilla', 'taco', 218, 5.7, 44.6, 2.9, ['1 tortilla', 26]],
  ['Pancake', 'pancakes', 227, 6.4, 28.3, 9.7, ['1 medium (5 in)', 40], ['3 medium', 120]],
  ['Potato, baked with skin', 'potatoes', 93, 2.5, 21, 0.1, ['1 medium', 173]],
  ['Sweet potato, baked', 'potatoes yam', 90, 2, 20.7, 0.2, ['1 medium', 114]],
  ['French fries', 'fries', 312, 3.4, 41, 15, ['Small order', 71], ['Medium order', 111], ['Large order', 150]],
  // Meat and protein
  ['Chicken breast, cooked (skinless)', 'grilled baked roasted', 165, 31, 0, 3.6, ['1 breast', 172], ['4 oz', 113], ['3 oz', 85]],
  ['Chicken thigh, cooked (skinless)', 'chicken', 209, 26, 0, 10.9, ['1 thigh', 52], ['4 oz', 113]],
  ['Chicken breast, raw', 'chicken', 120, 22.5, 0, 2.6, ['4 oz', 113], ['8 oz', 227]],
  ['Chicken nuggets', 'tenders fast food', 256, 15, 16, 15, ['4 pieces', 64], ['6 pieces', 96], ['10 pieces', 160]],
  ['Ground beef 80/20, cooked', 'hamburger burger meat', 272, 27.3, 0, 17.4, ['3 oz', 85], ['4 oz', 113]],
  ['Ground beef 90/10, cooked', 'lean hamburger', 217, 26, 0, 11.7, ['3 oz', 85], ['4 oz', 113]],
  ['Ground turkey 93/7, cooked', 'turkey', 203, 27, 0, 10.4, ['3 oz', 85], ['4 oz', 113]],
  ['Steak, sirloin, cooked', 'beef', 207, 30, 0, 9, ['3 oz', 85], ['6 oz', 170], ['8 oz', 227]],
  ['Salmon, cooked', 'fish', 206, 22, 0, 12.4, ['1 fillet', 154], ['4 oz', 113]],
  ['Tuna, canned in water (drained)', 'fish', 116, 25.5, 0, 0.8, ['1 can', 142], ['3 oz', 85]],
  ['Shrimp, cooked', 'prawns', 99, 24, 0.2, 0.3, ['3 oz', 85], ['10 large', 55]],
  ['Bacon, cooked', 'pork', 541, 37, 1.4, 42, ['1 slice', 8], ['3 slices', 24]],
  ['Turkey breast, deli sliced', 'lunch meat', 104, 17.1, 4.2, 1.7, ['1 slice', 28], ['2 oz', 56]],
  ['Pork chop, cooked', 'pork', 231, 26, 0, 13, ['1 chop', 145]],
  ['Tofu, firm', '', 144, 17.3, 2.8, 8.7, ['1/2 cup', 126]],
  ['Black beans, cooked', 'beans', 132, 8.9, 23.7, 0.5, ['1/2 cup', 86], ['1 cup', 172]],
  ['Whey protein powder', 'protein scoop', 387, 77, 10, 5, ['1 scoop', 31]],
  ['Protein shake, ready to drink', 'premier fairlife', 49, 9.2, 1.5, 0.9, ['1 bottle (11 fl oz)', 325]],
  ['Protein bar', '', 333, 33, 37, 12, ['1 bar', 60]],
  // Dairy
  ['Milk, 2%', 'reduced fat', 50, 3.3, 4.8, 2, ['1 cup', 244]],
  ['Milk, whole', '', 61, 3.2, 4.8, 3.3, ['1 cup', 244]],
  ['Milk, skim', 'fat free nonfat', 34, 3.4, 5, 0.1, ['1 cup', 245]],
  ['Greek yogurt, plain nonfat', 'yoghurt', 59, 10.3, 3.6, 0.4, ['1 container', 170], ['1 cup', 245]],
  ['Cheddar cheese', 'cheese', 403, 24.9, 1.3, 33.1, ['1 slice', 28], ['1/4 cup shredded', 28]],
  ['Mozzarella, part skim', 'cheese string', 254, 24, 2.8, 16, ['1 oz', 28], ['1 string cheese', 28]],
  ['Cottage cheese, 2%', 'cheese', 81, 10.5, 4.8, 2.3, ['1/2 cup', 113], ['1 cup', 226]],
  ['Butter', '', 717, 0.9, 0.1, 81, ['1 tbsp', 14], ['1 pat', 5]],
  ['Ice cream, vanilla', '', 207, 3.5, 24, 11, ['1/2 cup', 66], ['1 cup', 132]],
  // Fruit
  ['Banana', 'bananas', 89, 1.1, 22.8, 0.3, ['1 medium', 118], ['1 large', 136], ['1 small', 101]],
  ['Apple', 'apples', 52, 0.3, 13.8, 0.2, ['1 medium', 182], ['1 small', 149]],
  ['Orange', 'oranges', 47, 0.9, 11.8, 0.1, ['1 medium', 131]],
  ['Strawberries', 'berries', 32, 0.7, 7.7, 0.3, ['1 cup halves', 152]],
  ['Blueberries', 'berries', 57, 0.7, 14.5, 0.3, ['1 cup', 148]],
  ['Grapes', '', 69, 0.7, 18, 0.2, ['1 cup', 151]],
  ['Avocado', 'guacamole', 160, 2, 8.5, 14.7, ['1/2 avocado', 75], ['1 avocado', 150]],
  // Vegetables
  ['Broccoli, cooked', 'vegetables', 35, 2.4, 7.2, 0.4, ['1 cup', 156]],
  ['Spinach, raw', 'salad greens', 23, 2.9, 3.6, 0.4, ['1 cup', 30]],
  ['Green beans, cooked', 'vegetables', 35, 1.9, 7.9, 0.3, ['1 cup', 125]],
  ['Carrots, raw', 'carrot baby', 41, 0.9, 9.6, 0.2, ['1 medium', 61], ['10 baby carrots', 100]],
  ['Corn', 'sweet corn', 96, 3.4, 21, 1.5, ['1 ear', 90], ['1/2 cup', 82]],
  ['Mixed salad (no dressing)', 'lettuce greens', 17, 1.2, 3.3, 0.2, ['2 cups', 85]],
  // Fats, nuts, extras
  ['Peanut butter', 'pb', 588, 25, 20, 50, ['2 tbsp', 32], ['1 tbsp', 16]],
  ['Almonds', 'nuts', 579, 21, 21.6, 49.9, ['1 oz (about 23)', 28]],
  ['Olive oil', 'oil', 884, 0, 0, 100, ['1 tbsp', 13.5], ['1 tsp', 4.5]],
  ['Hummus', '', 166, 7.9, 14.3, 9.6, ['2 tbsp', 30]],
  ['Mayonnaise', 'mayo', 680, 1, 0.6, 75, ['1 tbsp', 14]],
  ['Ketchup', '', 101, 1, 27, 0.1, ['1 tbsp', 17]],
  ['Ranch dressing', 'dressing', 430, 1.3, 6, 44, ['2 tbsp', 30]],
  ['Honey', '', 304, 0.3, 82, 0, ['1 tbsp', 21]],
  // Meals and snacks
  ['Cheese pizza', 'pizza slice', 266, 11.4, 33, 10, ['1 slice (14 in)', 107], ['1 slice (12 in)', 80]],
  ['Pepperoni pizza', 'pizza slice', 290, 12, 32, 12, ['1 slice (14 in)', 111]],
  ['Cheeseburger', 'burger fast food', 263, 13, 26, 12, ['1 burger', 114]],
  ['Chocolate chip cookie', 'cookies', 488, 5, 64, 24, ['1 cookie', 16], ['1 large cookie', 40]],
  ['Potato chips', 'chips', 536, 7, 53, 35, ['1 oz', 28], ['1 small bag', 28]],
  ['Granola bar', '', 471, 10, 64, 20, ['1 bar', 24]],
  // Drinks
  ['Coca-Cola', 'coke soda pop', 42, 0, 10.6, 0, ['1 can (12 fl oz)', 355], ['1 bottle (20 fl oz)', 591]],
  ['Orange juice', 'oj', 45, 0.7, 10.4, 0.2, ['1 cup', 248]],
  ['Gatorade', 'sports drink', 26, 0, 6.4, 0, ['1 bottle (20 fl oz)', 591]],
  ['Coffee, black', '', 1, 0.1, 0, 0, ['1 cup', 237]],
  ['Beer', 'light beer', 43, 0.5, 3.6, 0, ['1 can (12 fl oz)', 356]],
];

export type CommonFood = { name: string; aliases: string; per100: { kcal: number; protein: number; carbs: number; fat: number }; servings: { label: string; grams: number }[] };

export const COMMON_FOODS: CommonFood[] = ROWS.map(([name, aliases, kcal, protein, carbs, fat, ...servs]) => ({
  name, aliases, per100: { kcal, protein, carbs, fat },
  servings: (servs as [string, number][]).map(([l, g]) => ({ label: `${l} (${Math.round(g)} g)`, grams: g })),
}));

/** Every word of the search must start a word in the name or aliases ("egg" matches "Egg whites", not "Eggplant parm") */
export function matchCommon(query: string): CommonFood[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return [];
  const scored: { f: CommonFood; s: number }[] = [];
  for (const [i, f] of COMMON_FOODS.entries()) {
    const nameWords = f.name.toLowerCase().split(/[^a-z0-9]+/);
    const allWords = [...nameWords, ...f.aliases.toLowerCase().split(/\s+/)];
    if (!words.every((w) => allWords.some((x) => x.startsWith(w) || (w.endsWith('s') && x.startsWith(w.slice(0, -1)))))) continue;
    const inName = words.filter((w) => nameWords.some((x) => x.startsWith(w))).length;
    // list order is most-common-first, so it breaks ties
    scored.push({ f, s: (nameWords[0].startsWith(words[0]) ? 0 : 2) + (words.length - inName) * 3 + i / 1000 });
  }
  return scored.sort((a, b) => a.s - b.s).map((x) => x.f).slice(0, 8);
}
