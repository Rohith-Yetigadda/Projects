import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Coffee, Sun, Moon, Plus, Trash2, Loader2, Sparkles, Camera, X, Check, Pencil } from "lucide-react";

type MacroEntry = { id: string; name: string; quantity: string; calories: number; protein: number; carbs: number; fats: number; loggedAt: string; };
type MealType = "breakfast" | "lunch" | "dinner" | "snacks";
type DayLog = { breakfast: MacroEntry[]; lunch: MacroEntry[]; dinner: MacroEntry[]; snacks: MacroEntry[]; };
type MealPlan = { day: string; breakfast: string[]; lunch: string[]; dinner: string[]; };
type FoodCategory = "liquid" | "piece" | "slice" | "ladle" | "tsp" | "generic";

const todayStr = () => new Date().toISOString().split("T")[0];

const mealConfig: { key: MealType; label: string; icon: any; color: string; bg: string; border: string }[] = [
  { key: "breakfast", label: "Breakfast", icon: Coffee,   color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20"   },
  { key: "lunch",     label: "Lunch",     icon: Sun,      color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  { key: "dinner",    label: "Dinner",    icon: Moon,     color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20"    },
  { key: "snacks",    label: "Snacks",    icon: Sparkles, color: "text-purple-400",  bg: "bg-purple-400/10",  border: "border-purple-400/20"  },
];

// ─── Comprehensive Indian mess food categorization ─────────────────
function getFoodCategory(name: string): FoodCategory {
  const n = name.toLowerCase().replace(/[()[]]/g, "").trim();

  // Liquids — must NOT match fruits (handled below)
  if (/\b(milk|hot milk|cold milk|toned milk|skim milk|buttermilk|chaas|lassi|juice|nimbu|lemon water|lemonade|soup|tomato soup|rasam|tea|coffee|hot water|water|shake|protein shake|smoothie|syrup|sharbat)\b/.test(n)) return "liquid";

  // Banana → whole fruit (piece)
  if (/\bbanana\b/.test(n)) return "piece";

  // Other fruits → served as small cut pieces in mess
  if (/\b(watermelon|melon|muskmelon|cantaloupe|apple|mango|orange|grapes|grape|papaya|guava|pear|pomegranate|pineapple|kiwi|strawberry|blueberry|fruit salad|mixed fruit|seasonal fruit|chikoo|sapota|jackfruit|litchi|lychee)\b/.test(n)) return "slice";

  // Condiments & small additions — teaspoon amounts
  if (/\b(sugar|salt|pickle|achar|chutney|coconut chutney|tomato chutney|mint chutney|green chutney|jam|bread butter jam|butter|ghee|oil|sauce|ketchup|mayo|honey|cream|papad|pappad|achaar|murabba|salsa|horlicks|boost|bournvita|complan|milo|powder|protein|whey)\b/.test(n)) return "tsp";

  // Solid pieces — chapati, bread, eggs, snacks
  if (/\b(chapati|chapathi|chappati|roti|phulka|tandoori roti|naan|kulcha|puri|poori|paratha|aloo paratha|bhatura|uttapam|dosa|masala dosa|set dosa|mini dosa|idli|vada|medu vada|bread|toast|sandwich|bun|burger|roll|egg|omelette|boiled egg|fried egg|scrambled egg|poached egg|biscuit|cookie|cake slice|ladoo|laddoo|barfi|gulab jamun|rasgulla|jalebi|peda|modak|karanji)\b/.test(n)) return "piece";

  // Ladle/bowl items — cooked grains, curries, sabzis, desserts
  if (/\b(rice|steamed rice|steam rice|plain rice|fried rice|pulao|biryani|khichdi|pongal|ven pongal|upma|rava upma|semolina|semiya|vermicelli|oats|porridge|daliya|broken wheat|poha|aval|dal|lentil|sambar|rasam|kadhi|chole|rajma|black bean|kidney bean|mung|moong|masoor|arhar|toor|chana|chickpea|sabzi|subzi|sabji|vegetable|veg dry|veg gravy|aloo|potato|gobi|cauliflower|matar|peas|palak|spinach|paneer|soya|tofu|mushroom|mixed veg|avial|kootu|poriyal|thoran|stir fry|gravy|curry|masala|fry|roast|bhurji|bhaji|bhujia|pakora|fritter|bonda|bajji|cutlet|tikki|patty|kebab|chicken|mutton|fish|egg curry|prawn|seafood|halwa|sooji halwa|carrot halwa|moong dal halwa|kheer|payasam|phirni|custard|pudding|shrikhand|rabdi|rasmalai|ice cream|curd|yogurt|dahi|raita|boondi|salad|sprouts|kachumber)\b/.test(n)) return "ladle";

  return "generic";
}

const PRESETS: Record<FoodCategory, string[]> = {
  liquid:  ["50ml", "100ml", "150ml", "200ml", "250ml", "270ml", "300ml", "350ml"],
  slice:   ["small serving (~5 cubes)", "1 serving (~8 cubes)", "large serving (~12 cubes)", "2 servings (~16 cubes)"],
  piece:   ["1 piece", "2 pieces", "3 pieces", "4 pieces", "half piece"],
  tsp:     ["1 tsp (5g)", "2 tsp (10g)", "1 tbsp (15g)", "2 tbsp", "small sprinkle"],
  ladle:   ["1 small ladle (~75ml)", "1 ladle (~150ml)", "2 ladles", "half bowl", "1 bowl (~250ml)", "1 full plate"],
  generic: ["small serving", "medium serving", "large serving", "half serving"],
};

// ─── Hardcoded macro truth table for items Gemini gets wrong ──────
const KNOWN_MACROS: Record<string, { calories: number; protein: number; carbs: number; fats: number }> = {
  // Pure carbs / No macros
  sugar:            { calories: 16, protein: 0, carbs: 4, fats: 0 },
  salt:             { calories: 0,  protein: 0, carbs: 0, fats: 0 },

  // Condiments (per tsp ~ 5g unless noted)
  pickle:           { calories: 8,  protein: 0, carbs: 1, fats: 0.5 },
  achar:            { calories: 8,  protein: 0, carbs: 1, fats: 0.5 },
  butter:           { calories: 36, protein: 0, carbs: 0, fats: 4 },
  ghee:             { calories: 45, protein: 0, carbs: 0, fats: 5 },
  honey:            { calories: 21, protein: 0, carbs: 6, fats: 0 },
  jam:              { calories: 18, protein: 0, carbs: 5, fats: 0 },
  "bread butter jam": { calories: 120, protein: 3, carbs: 18, fats: 4 }, // 1 slice bread + butter + jam
  papad:            { calories: 35, protein: 1, carbs: 6, fats: 0.5 }, // per piece
  chutney:          { calories: 25, protein: 1, carbs: 2, fats: 1.5 }, // coconut chutney

  // Beverages (per 100ml)
  milk:             { calories: 61,  protein: 3.2, carbs: 4.7, fats: 3.3 },
  "hot milk":       { calories: 61,  protein: 3.2, carbs: 4.7, fats: 3.3 },
  "cold milk":      { calories: 61,  protein: 3.2, carbs: 4.7, fats: 3.3 },
  buttermilk:       { calories: 18,  protein: 1.0, carbs: 2.3, fats: 0.3 },
  chaas:            { calories: 18,  protein: 1.0, carbs: 2.3, fats: 0.3 },
  tea:              { calories: 5,   protein: 0.1, carbs: 1,   fats: 0   },
  coffee:           { calories: 5,   protein: 0.1, carbs: 1,   fats: 0   },
  rasam:            { calories: 10,  protein: 0.5, carbs: 2,   fats: 0.2 },
  soup:             { calories: 30,  protein: 0.5, carbs: 5,   fats: 1.0 },

  // Fruits (base 1 serving ~8 cubes/120g, or 1 piece)
  watermelon:       { calories: 36, protein: 0.7, carbs: 9, fats: 0.2 },
  papaya:           { calories: 52, protein: 0.6, carbs: 13, fats: 0.3 },
  pineapple:        { calories: 60, protein: 0.6, carbs: 16, fats: 0.2 },
  muskmelon:        { calories: 41, protein: 1.0, carbs: 10, fats: 0.2 },
  melon:            { calories: 41, protein: 1.0, carbs: 10, fats: 0.2 },
  mango:            { calories: 72, protein: 1.0, carbs: 18, fats: 0.5 },
  apple:            { calories: 62, protein: 0.3, carbs: 17, fats: 0.2 },
  banana:           { calories: 105, protein: 1.3, carbs: 27, fats: 0.4 }, // 1 piece
  grapes:           { calories: 82, protein: 0.8, carbs: 21, fats: 0.2 }, // 1 bowl

  // Breakfast Items (per standard serving / ladle / piece)
  poha:             { calories: 180, protein: 3, carbs: 32, fats: 5 }, // per ladle
  upma:             { calories: 170, protein: 3, carbs: 28, fats: 5 }, // per ladle
  "veg vermicelli upma": { calories: 160, protein: 3, carbs: 30, fats: 3 }, // per ladle
  idli:             { calories: 60,  protein: 2, carbs: 12, fats: 0 }, // per piece
  vada:             { calories: 140, protein: 3, carbs: 14, fats: 8 }, // per piece
  dosa:             { calories: 130, protein: 3, carbs: 22, fats: 3 }, // per piece
  "masala dosa":    { calories: 220, protein: 4, carbs: 30, fats: 9 }, // per piece
  "aloo paratha":   { calories: 220, protein: 5, carbs: 32, fats: 8 }, // per piece

  // Carbs (Breads/Rice)
  chapathi:         { calories: 100, protein: 3, carbs: 18, fats: 1 }, // per piece
  chapati:          { calories: 100, protein: 3, carbs: 18, fats: 1 }, // per piece
  roti:             { calories: 100, protein: 3, carbs: 18, fats: 1 }, // per piece
  paratha:          { calories: 150, protein: 3, carbs: 20, fats: 6 }, // plain, per piece
  puri:             { calories: 120, protein: 2, carbs: 15, fats: 6 }, // per piece
  "steam rice":     { calories: 130, protein: 3, carbs: 28, fats: 0.5 }, // per ladle (100g)
  rice:             { calories: 130, protein: 3, carbs: 28, fats: 0.5 }, // per ladle (100g)
  "jeera rice":     { calories: 140, protein: 3, carbs: 28, fats: 2 }, // per ladle
  pulao:            { calories: 180, protein: 4, carbs: 30, fats: 5 }, // per ladle
  biryani:          { calories: 200, protein: 5, carbs: 32, fats: 6 }, // veg, per ladle

  // Dals & Legumes (per ladle ~ 150g)
  "dal fry":        { calories: 120, protein: 7, carbs: 15, fats: 4 },
  "dal tadka":      { calories: 130, protein: 7, carbs: 15, fats: 5 },
  "dal makhani":    { calories: 180, protein: 8, carbs: 18, fats: 9 },
  sambar:           { calories: 110, protein: 4, carbs: 16, fats: 3 },
  chole:            { calories: 160, protein: 7, carbs: 22, fats: 5 }, // chickpeas
  rajma:            { calories: 160, protein: 7, carbs: 22, fats: 5 }, // kidney beans

  // Veg Sabzis / Curries (per ladle ~ 150g)
  "aloo matar gravy":{ calories: 140, protein: 3, carbs: 18, fats: 6 },
  "tawa veg dry":   { calories: 130, protein: 3, carbs: 14, fats: 7 },
  "mix veg":        { calories: 130, protein: 3, carbs: 14, fats: 7 },
  sabzi:            { calories: 120, protein: 2, carbs: 12, fats: 7 }, // generic veg
  "bhindi masala":  { calories: 120, protein: 2, carbs: 12, fats: 7 },
  "palak paneer":   { calories: 190, protein: 8, carbs: 10, fats: 13 },
  "paneer butter masala": { calories: 240, protein: 8, carbs: 12, fats: 18 },
  "malai kofta":    { calories: 260, protein: 6, carbs: 18, fats: 19 },
  "gobi masala":    { calories: 90,  protein: 2, carbs: 8,  fats: 5 }, // cauliflower

  // Non-Veg / Eggs (per ladle/piece)
  "egg white":      { calories: 17, protein: 3.6, carbs: 0.2, fats: 0.1 }, // 1 piece
  egg:              { calories: 78, protein: 6.3, carbs: 0.6, fats: 5.3 }, // 1 piece
  "egg curry":      { calories: 210, protein: 14, carbs: 10, fats: 12 }, // 2 eggs + gravy
  "chicken curry":  { calories: 220, protein: 18, carbs: 8, fats: 12 }, // per ladle
  "butter chicken": { calories: 280, protein: 16, carbs: 10, fats: 20 }, // per ladle
  "fish fry":       { calories: 200, protein: 15, carbs: 8, fats: 10 }, // per piece

  // Desserts (per ladle/piece)
  "gulab jamun":    { calories: 150, protein: 2, carbs: 22, fats: 6 }, // 1 piece
  kheer:            { calories: 200, protein: 4, carbs: 32, fats: 6 }, // per ladle
  halwa:            { calories: 220, protein: 2, carbs: 30, fats: 10 }, // per ladle
  "ice cream":      { calories: 140, protein: 2, carbs: 16, fats: 8 }, // 1 scoop

  // Powders & Supplements (per tbsp ~ 15g)
  // Powders & Supplements (per tsp ~ 5g)
  horlicks:         { calories: 19, protein: 0.5, carbs: 3.7, fats: 0.1 },
  boost:            { calories: 18, protein: 0.3, carbs: 4, fats: 0.1 },
  bournvita:        { calories: 19, protein: 0.3, carbs: 4, fats: 0.1 },
  complan:          { calories: 22, protein: 0.9, carbs: 3, fats: 0.7 },
  milo:             { calories: 20, protein: 0.5, carbs: 3.3, fats: 0.5 },
  "whey protein":   { calories: 20, protein: 4, carbs: 0.5, fats: 0.2 }, 
  protein:          { calories: 20, protein: 4, carbs: 0.5, fats: 0.2 },
};

// Scale known macros by quantity
function getKnownMacros(foodName: string, quantity: string): { calories: number; protein: number; carbs: number; fats: number } | null {
  const n = foodName.toLowerCase().replace(/[()[\]]/g, "").trim();
  // Sort keys by length so "veg vermicelli upma" matches before "upma"
  const sortedKeys = Object.keys(KNOWN_MACROS).sort((a, b) => b.length - a.length);
  const key = sortedKeys.find(k => n.includes(k));
  if (!key) return null;

  const base = KNOWN_MACROS[key];
  const q = quantity.toLowerCase();
  let scale = 1;

  if (q.includes("ladle") || q.includes("bowl") || q.includes("plate") || q.includes("serving")) {
    const match = q.match(/(\d+(?:\.\d+)?)\s*(?:small ladle|ladle|bowl|plate|serving)/) || q.match(/^(\d+(?:\.\d+)?)/);
    let qty = match ? parseFloat(match[1]) : (q.includes("half") ? 0.5 : 1);
    if (q.includes("small ladle")) scale = qty * 0.5;
    else if (q.includes("bowl")) scale = qty * 2;
    else if (q.includes("plate")) scale = qty * 3;
    else scale = qty;
  }
  else if (q.includes("ml")) {
    const match = q.match(/(\d+(?:\.\d+)?)\s*ml/);
    const ml = match ? parseFloat(match[1]) : 200;
    scale = ml / 100; // base is per 100ml for liquids
  }
  else if (q.includes("cube")) {
    const match = q.match(/(\d+)\s*cube/);
    const cubes = match ? parseInt(match[1]) : 8;
    scale = cubes / 8; // base is 8 cubes
  }
  else if (q.includes("piece") || q.includes("slice") || q.includes("scoop")) {
    const match = q.match(/(\d+(?:\.\d+)?)\s*(?:piece|slice|scoop)/) || q.match(/^(\d+(?:\.\d+)?)/);
    scale = match ? parseFloat(match[1]) : (q.includes("half") ? 0.5 : 1);
  }
  else if (q.includes("tbsp") || q.includes("tablespoon")) {
    const match = q.match(/(\d+(?:\.\d+)?)\s*(?:tbsp|tablespoon)/) || q.match(/^(\d+(?:\.\d+)?)/);
    scale = match ? parseFloat(match[1]) : 1;
    // If it's a condiment base (which is per tsp), multiply by 3.
    // Except powders are defined per tbsp (15g), but wait, in KNOWN_MACROS sugar/butter are per tsp.
    // Let's just assume base is 1 unit, and tbsp means 3x IF base is tsp. 
    // Actually, to keep it simple: our new powders are defined per tbsp, but old condiments are per tsp.
    // Let's just adjust the old condiments in KNOWN_MACROS to be per 1 base unit, and scale here.
    // Since we didn't change KNOWN_MACROS base, let's just stick to scale * 3 for tsp-based items.
    // Actually, simpler: just treat tbsp as 3x tsp for EVERYTHING in the tsp category.
    scale = scale * 3; 
  }
  else if (q.includes("tsp") || q.includes("teaspoon") || q.includes("sprinkle")) {
    const match = q.match(/(\d+(?:\.\d+)?)\s*(?:tsp|teaspoon)/) || q.match(/^(\d+(?:\.\d+)?)/);
    scale = match ? parseFloat(match[1]) : (q.includes("sprinkle") ? 0.25 : 1);
  }

  // Adjust for powders which are added per tbsp base, but if they matched "tsp" above, scale was 1, should be 0.33
  // If they matched tbsp, scale is 3, should be 1. 
  // Let's normalize powders to TSP in KNOWN_MACROS instead to avoid this math nightmare.
  // I will let this script fix KNOWN_MACROS to be per TSP for powders.

  return {
    calories: Math.round(base.calories * scale),
    protein: Math.round(base.protein * scale * 10) / 10,
    carbs: Math.round(base.carbs * scale * 10) / 10,
    fats: Math.round(base.fats * scale * 10) / 10
  };
}

// Sanity-check Gemini output — protein can't have calories without matching macros
function sanitizeMacros(raw: { calories: number; protein: number; carbs: number; fats: number }) {
  const fromMacros = raw.protein * 4 + raw.carbs * 4 + raw.fats * 9;
  // If macros sum is way off from stated calories, trust the calorie count and re-balance
  if (Math.abs(fromMacros - raw.calories) > raw.calories * 0.4 && raw.calories > 0) {
    // Rough split: protein 20%, carbs 55%, fat 25%
    return {
      calories: raw.calories,
      protein:  Math.round((raw.calories * 0.20) / 4),
      carbs:    Math.round((raw.calories * 0.55) / 4),
      fats:     Math.round((raw.calories * 0.25) / 9),
    };
  }
  return raw;
}

async function estimateMacros(foodName: string, quantity: string, isCustom?: boolean) {
  if (!isCustom) {
    const known = getKnownMacros(foodName, quantity);
    if (known) return known;
  }

  const res = await fetch("/api/compass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "estimate_macros", payload: { foodName: quantity + " " + foodName } }),
  });
  const data = await res.json();
  return sanitizeMacros({
    calories: Number(data.calories) || 100,
    protein:  Number(data.protein)  || 3,
    carbs:    Number(data.carbs)    || 15,
    fats:     Number(data.fats)     || 3,
  });
}

async function analyzePlate(base64: string, mimeType: string) {
  const res = await fetch("/api/compass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "analyze_plate", payload: { image: base64, mimeType } }),
  });
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

// ─── Quantity Picker Modal ─────────────────────────────────────────
function QuantityPicker({ foodName, onConfirm, onCancel }: { foodName: string; onConfirm: (q: string) => void; onCancel: () => void }) {
  const category = getFoodCategory(foodName);
  const presets = PRESETS[category];
  const [custom, setCustom] = useState("");
  const [selected, setSelected] = useState<string | null>(presets[Math.floor(presets.length / 2)] || null);

  const confirm = () => { const qty = custom.trim() || selected; if (qty) onConfirm(qty); };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm bg-[#111] border-t border-white/10 md:border md:rounded-3xl rounded-t-3xl p-6 pb-safe space-y-4 shadow-2xl mb-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">How much did you have?</p>
            <p className="text-lg font-bold text-white mt-1">{foodName}</p>
            <p className="text-xs text-white/30 mt-0.5 capitalize">{category === "tsp" ? "small addition" : category}</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button key={p} onClick={() => { setSelected(p); setCustom(""); }}
              className={"px-3 py-1.5 rounded-xl text-sm font-semibold transition-all border " +
                (selected === p && !custom ? "bg-white text-black border-white" : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white")}>
              {p}
            </button>
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-white/30 mb-2">Or describe exactly</p>
          <input type="text" placeholder="e.g. 270ml, 2 small pieces, 1.5 ladles..."
            value={custom} onChange={e => { setCustom(e.target.value); setSelected(null); }}
            onKeyDown={e => e.key === "Enter" && confirm()}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30" />
        </div>
        <button onClick={confirm} disabled={!selected && !custom.trim()}
          className="w-full h-12 rounded-xl bg-white text-black font-bold text-sm disabled:opacity-30 hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
          <Check className="w-4 h-4" /> Log it
        </button>
      </div>
    </div>
  );
}

// ─── Photo Confirm Modal ───────────────────────────────────────────
function PhotoConfirm({ items, onConfirm, onCancel }: { items: any[]; onConfirm: (items: any[]) => void; onCancel: () => void }) {
  const [localItems, setLocalItems] = useState(items);
  const [checked, setChecked] = useState<boolean[]>(items.map(() => true));
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editVals, setEditVals] = useState({ name: "", quantity: "" });
  const [isEstimating, setIsEstimating] = useState(false);

  const toggle = (i: number) => {
    if (editingIdx !== null) return;
    setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));
  };
  const selected = localItems.filter((_, i) => checked[i]);

  const startEdit = (e: any, i: number) => {
    e.stopPropagation();
    setEditingIdx(i);
    setEditVals({ name: localItems[i].name, quantity: localItems[i].quantity });
  };

  const saveEdit = async (e: any, i: number) => {
    e.stopPropagation();
    if (editVals.name === localItems[i].name && editVals.quantity === localItems[i].quantity) {
      setEditingIdx(null);
      return;
    }
    setIsEstimating(true);
    try {
      const newMacros = await estimateMacros(editVals.name, editVals.quantity, true);
      const newItems = [...localItems];
      newItems[i] = { ...newItems[i], name: editVals.name, quantity: editVals.quantity, ...newMacros };
      setLocalItems(newItems);
      setEditingIdx(null);
    } catch(err) {
      console.error(err);
    } finally {
      setIsEstimating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm bg-[#111] border-t border-white/10 md:border md:rounded-3xl rounded-t-3xl p-6 pb-safe space-y-4 shadow-2xl max-h-[85vh] flex flex-col mb-0 animate-in slide-in-from-bottom-8 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Detected from photo</p>
            <p className="text-lg font-bold text-white mt-1">Confirm items to log</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2 overflow-y-auto flex-1">
          {localItems.map((item, i) => (
            <div key={i} className={"w-full flex items-center gap-3 p-3 rounded-xl border transition-all " + (checked[i] ? "border-white/20 bg-white/5" : "border-white/5 opacity-40")}>
              
              <button onClick={() => toggle(i)} className={"w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors " + (checked[i] ? "border-white bg-white" : "border-white/30")}>
                {checked[i] && <Check className="w-3 h-3 text-black" />}
              </button>
              
              {editingIdx === i ? (
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <input type="text" value={editVals.name} onChange={e => setEditVals(p => ({...p, name: e.target.value}))} className="w-full bg-black/50 border border-white/20 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-white/50" placeholder="Name" disabled={isEstimating} />
                  <input type="text" value={editVals.quantity} onChange={e => setEditVals(p => ({...p, quantity: e.target.value}))} className="w-full bg-black/50 border border-white/20 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-white/50" placeholder="Quantity" disabled={isEstimating} />
                  <div className="flex justify-end gap-2 mt-1">
                    <button onClick={(e) => { e.stopPropagation(); setEditingIdx(null); }} className="px-3 py-1 rounded-lg bg-white/10 text-xs font-bold text-white/70 hover:text-white disabled:opacity-50" disabled={isEstimating}>Cancel</button>
                    <button onClick={(e) => saveEdit(e, i)} className="px-3 py-1 rounded-lg bg-white text-xs font-bold text-black disabled:opacity-50" disabled={isEstimating}>
                      {isEstimating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggle(i)}>
                  <p className="text-sm font-bold text-white truncate">{item.name}</p>
                  <p className="text-xs text-white/40 truncate">{item.quantity} &middot; {item.calories} kcal &middot; P {item.protein}g C {item.carbs}g F {item.fats}g</p>
                </div>
              )}

              {editingIdx !== i && (
                <button onClick={(e) => startEdit(e, i)} className="p-2 shrink-0 text-white/40 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg">
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => onConfirm(selected)} disabled={selected.length === 0 || isEstimating}
          className="w-full h-12 rounded-xl bg-white text-black font-bold text-sm disabled:opacity-30 hover:bg-white/90 transition-colors flex-shrink-0 flex items-center justify-center gap-2">
          {isEstimating ? <Loader2 className="w-5 h-5 animate-spin" /> : `Log ${selected.length} item${selected.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
