import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Coffee, Sun, Moon, Plus, Trash2, Loader2, Sparkles, Camera, X, Check, Pencil, AlertCircle, Bookmark, UtensilsCrossed } from "lucide-react";
import { getCachedData, setCachedData } from "@/lib/dataCache";
import { getLocalDateStr } from "@/lib/dateUtils";
import {
  AppleActivityRing,
  APPLE_FITNESS_MACRO_PALETTES,
  type RingData
} from "@/components/ui/AppleActivityRing";

type MealType = "breakfast" | "lunch" | "dinner" | "snacks";
type MacroEntry = { id: string; name: string; quantity: string; calories: number; protein: number; carbs: number; fats: number; loggedAt: string; };
type DayLog = { breakfast: MacroEntry[]; lunch: MacroEntry[]; dinner: MacroEntry[]; snacks: MacroEntry[]; };
type MealPlan = { day: string; breakfast: string[]; lunch: string[]; dinner: string[]; };

function calcTargets(profile: any) {
  if (profile?.targetOverrides?.enabled) {
    return {
      calories: profile.targetOverrides.calories || 2000,
      protein: profile.targetOverrides.protein || 120,
      carbs: profile.targetOverrides.carbs || 200,
      fats: profile.targetOverrides.fats || 60
    };
  }
  const weight = parseFloat(profile?.weight) || 70;
  const height = parseFloat(profile?.height) || 170;
  const age    = parseFloat(profile?.age)    || 20;
  const bmr    = 10 * weight + 6.25 * height - 5 * age + 5;
  const tdee   = bmr * 1.55;
  const goal   = profile?.goal || "maintain_weight";
  const kcal   = goal.includes("muscle") ? tdee + 300 : goal.includes("lose") ? tdee - 300 : tdee;
  const protein = goal.includes("muscle") ? weight * 2.2 : weight * 1.6;
  const fats    = (kcal * 0.25) / 9;
  const carbs   = (kcal - protein * 4 - fats * 9) / 4;
  return { calories: Math.round(kcal), protein: Math.round(protein), carbs: Math.round(carbs), fats: Math.round(fats) };
}

export type StapleMeal = {
  id: string;
  name: string;
  recipe: string;
  mealType: MealType | "any";
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  createdAt: string;
};

const todayStr = () => getLocalDateStr();

const mealConfig: { key: MealType; label: string; icon: any; color: string; bg: string; border: string }[] = [
  { key: "breakfast", label: "Breakfast", icon: Coffee,   color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20"   },
  { key: "lunch",     label: "Lunch",     icon: Sun,      color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  { key: "dinner",    label: "Dinner",    icon: Moon,     color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20"    },
  { key: "snacks",    label: "Snacks",    icon: Sparkles, color: "text-purple-400",  bg: "bg-purple-400/10",  border: "border-purple-400/20"  },
];

// ─── Food Name Sanitizer (Strips -1pc, 2 nos, etc.) ─────────────────
export function cleanFoodName(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/[-–—]\s*\d+(?:\.\d+)?\s*(?:pc|pcs|nos?|piece|pieces|slice|slices|plate|bowl|cup|glass|ml|g|gm)?$/i, "")
    .replace(/\(\s*\d+(?:\.\d+)?\s*(?:pc|pcs|nos?|piece|pieces|slice|slices|plate|bowl|cup|glass|ml|g|gm)?\s*\)/i, "")
    .replace(/\s+\d+(?:\.\d+)?\s*(?:pc|pcs|nos?|piece|pieces|slice|slices|plate|bowl|cup|glass|ml|g|gm)$/i, "")
    .replace(/^[-,:.]+|[-,:.]+$/g, "")
    .trim();
}

// ─── Dynamic Portion Presets Caching & Inference ────────────────────
const PORTION_PRESETS_CACHE = new Map<string, { category: string; defaultUnit: string; presets: string[] }>();

export function getQuickPortionPresets(foodName: string): { category: string; defaultUnit: string; presets: string[] } {
  const n = cleanFoodName(foodName).toLowerCase();
  
  if (PORTION_PRESETS_CACHE.has(n)) {
    return PORTION_PRESETS_CACHE.get(n)!;
  }

  // Intuitive defaults based on food type
  if (/\b(bananas?|apples?|oranges?|eggs?|boiled eggs?|egg whites?|chapatis?|rotis?|phulkas?|dosas?|idlis?|vadas?|parathas?|puris?|breads?|toasts?|biscuits?|cookies?|samosas?)\b/.test(n)) {
    const res = { category: "piece", defaultUnit: "piece", presets: ["1 piece", "2 pieces", "3 pieces", "4 pieces", "half piece"] };
    PORTION_PRESETS_CACHE.set(n, res);
    return res;
  }
  if (/\b(milks?|teas?|coffees?|buttermilk|chaas|lassis?|juices?|smoothies?|shakes?|water|rasam|soups?)\b/.test(n)) {
    const res = { category: "glass", defaultUnit: "ml", presets: ["100ml", "150ml", "200ml", "250ml", "1 glass (~250ml)", "300ml"] };
    PORTION_PRESETS_CACHE.set(n, res);
    return res;
  }
  if (/\b(dals?|sambars?|curries?|gravy|sabzi|sabjis?|chole|rajma|paneer|chicken curry)\b/.test(n)) {
    const res = { category: "ladle", defaultUnit: "ladle", presets: ["1 small ladle", "1 ladle (~150ml)", "2 ladles", "half bowl", "1 bowl (~200ml)"] };
    PORTION_PRESETS_CACHE.set(n, res);
    return res;
  }
  if (/\b(rices?|pulaos?|biryanis?|khichdis?|pohas?|upmas?|oats|porridge|noodles?|maggi|pasta|salads?|curds?|dahi)\b/.test(n)) {
    const res = { category: "bowl", defaultUnit: "bowl", presets: ["half bowl", "1 bowl (~150g)", "2 bowls", "1 plate", "100g", "200g"] };
    PORTION_PRESETS_CACHE.set(n, res);
    return res;
  }
  if (/\b(watermelons?|melons?|papayas?|pineapples?|mangoes?)\b/.test(n)) {
    const res = { category: "slice", defaultUnit: "serving", presets: ["1 small bowl (~5 cubes)", "1 regular bowl (~8 cubes)", "large bowl (~12 cubes)"] };
    PORTION_PRESETS_CACHE.set(n, res);
    return res;
  }
  if (/\b(whey|protein powder|peanut butter|ghee|butter|honey|jams?|oil|sugar)\b/.test(n)) {
    const res = { category: "scoop", defaultUnit: "serving", presets: ["1 scoop (30g)", "half scoop", "1 tbsp (15g)", "2 tbsp", "1 tsp"] };
    PORTION_PRESETS_CACHE.set(n, res);
    return res;
  }

  // Fallback generic presets
  const res = { category: "portion", defaultUnit: "serving", presets: ["1 serving", "small portion", "regular portion", "large portion", "1 piece", "1 bowl"] };
  PORTION_PRESETS_CACHE.set(n, res);
  return res;
}

// Clean and validate macro values
function sanitizeMacros(raw: { calories: number; protein: number; carbs: number; fats: number }) {
  const calories = Math.max(0, Math.round(Number(raw.calories) || 0));
  const protein  = Math.max(0, Math.round((Number(raw.protein) || 0) * 10) / 10);
  const carbs    = Math.max(0, Math.round((Number(raw.carbs) || 0) * 10) / 10);
  const fats     = Math.max(0, Math.round((Number(raw.fats) || 0) * 10) / 10);
  
  const finalCals = calories > 0 ? calories : Math.round(protein * 4 + carbs * 4 + fats * 9);
  
  return {
    calories: finalCals,
    protein,
    carbs,
    fats,
  };
}

// ─── Pure Gemini Macro Estimation (Zero Hardcoded Truth Table) ────────
async function estimateMacros(foodName: string, quantity: string, _isCustom = false) {
  const cleanedName = cleanFoodName(foodName);
  const queryStr = (quantity ? `${quantity} ${cleanedName}` : cleanedName).trim();
  const cacheKey = "recompass_macros_v2_" + queryStr.toLowerCase();
  
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  const res = await fetch("/api/compass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "estimate_macros", payload: { foodName: queryStr } }),
  });
  const data = await res.json();
  
  if (data.error === "INVALID_FOOD") {
    throw new Error("INVALID_FOOD");
  }

  if (data.parseError || (!data.calories && data.calories !== 0)) {
    console.error("[estimateMacros] AI parse failed, raw:", data.raw || data.text);
    throw new Error("INVALID_FOOD");
  }

  const sanitized = sanitizeMacros({
    calories: Number(data.calories),
    protein:  Number(data.protein) || 0,
    carbs:    Number(data.carbs) || 0,
    fats:     Number(data.fats) || 0,
  });
  
  const result = {
    ...sanitized,
    name: data.name || cleanedName.toUpperCase()
  };

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(result));
  } catch {}

  return result;
}

async function analyzePlate(base64: string, mimeType: string): Promise<{ items: any[]; error?: string }> {
  try {
    const res = await fetch("/api/compass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "analyze_plate", payload: { image: base64, mimeType } }),
    });
    const data = await res.json();
    if (data?.error === "NO_FOOD_DETECTED") {
      return { items: [], error: "NO_FOOD_DETECTED" };
    }
    if (Array.isArray(data)) return { items: data };
    if (Array.isArray(data?.items)) return { items: data.items };
    return { items: [] };
  } catch (err) {
    console.error("[analyzePlate] Error:", err);
    return { items: [], error: "NETWORK_ERROR" };
  }
}

// ─── Dynamic Quantity Picker with Live Gemini Preview ───────────────
function QuantityPicker({ foodName, onConfirm, onCancel }: { foodName: string; onConfirm: (q: string) => void; onCancel: () => void }) {
  const cleaned = cleanFoodName(foodName);
  const portionInfo = getQuickPortionPresets(cleaned);
  const presets = portionInfo.presets;
  const [custom, setCustom] = useState("");
  const [selected, setSelected] = useState<string>(presets[1] || presets[0] || "1 serving");
  const [liveMacros, setLiveMacros] = useState<{ calories: number; protein: number; carbs: number; fats: number } | null>(null);
  const [estimating, setEstimating] = useState(false);

  // Debounced live macro estimation preview
  useEffect(() => {
    const activeQty = custom.trim() || selected;
    if (!activeQty) return;
    let isCurrent = true;
    const timer = setTimeout(async () => {
      setEstimating(true);
      try {
        const macros = await estimateMacros(cleaned, activeQty);
        if (isCurrent) setLiveMacros(macros);
      } catch {
        // Ignore live preview errors
      } finally {
        if (isCurrent) setEstimating(false);
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [cleaned, selected, custom]);

  const confirm = () => {
    const qty = custom.trim() || selected;
    if (qty) onConfirm(qty);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onCancel}>
      <div className="w-full max-w-sm bg-[#121418] border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Select Portion</p>
            <p className="text-base font-bold text-white mt-0.5 capitalize">{cleaned}</p>
            <p className="text-[11px] text-white/40 capitalize">{portionInfo.category} portioning</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Macro Calculation Preview Ribbon */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs">
          <span className="text-white/40 text-[11px] font-medium flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>AI Macro Estimate</span>
          </span>
          {estimating ? (
            <span className="text-[11px] text-white/40 animate-pulse font-mono">Calculating...</span>
          ) : liveMacros ? (
            <div className="flex items-center gap-2 font-mono tabular-nums text-[11px]">
              <span className="font-bold text-white">{liveMacros.calories} kcal</span>
              <span className="text-white/20">&middot;</span>
              <span className="text-[#A1FF00] font-semibold">P {liveMacros.protein}g</span>
              <span className="text-white/20">&middot;</span>
              <span className="text-[#00F0FF] font-semibold">C {liveMacros.carbs}g</span>
              <span className="text-white/20">&middot;</span>
              <span className="text-[#FFD600] font-semibold">F {liveMacros.fats}g</span>
            </div>
          ) : (
            <span className="text-[11px] text-white/40">Select portion below</span>
          )}
        </div>

        {/* Dynamic Portion Presets */}
        <div className="flex flex-wrap gap-2 pt-1">
          {presets.map(p => (
            <button 
              key={p} 
              type="button"
              onClick={() => { setSelected(p); setCustom(""); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                selected === p && !custom 
                  ? "bg-white text-black border-white shadow-sm font-bold scale-[1.02]" 
                  : "bg-white/[0.03] text-white/70 border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <input 
          type="text" 
          placeholder="Or type custom amount (e.g. 150g, 2 pieces)..." 
          value={custom}
          onChange={e => { setCustom(e.target.value); setSelected(""); }}
          onKeyDown={e => e.key === "Enter" && confirm()}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all font-medium" 
        />

        <button 
          onClick={confirm} 
          disabled={!custom.trim() && !selected}
          className="w-full h-11 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider disabled:opacity-30 hover:bg-white/90 active:scale-[0.99] transition-all shadow-sm"
        >
          Confirm Quantity
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
      const newMacros = await estimateMacros(editVals.name, editVals.quantity);
      const newItems = [...localItems];
      newItems[i] = { ...newItems[i], quantity: editVals.quantity, ...newMacros };
      setLocalItems(newItems);
      setEditingIdx(null);
    } catch(err) {
      console.error(err);
    } finally {
      setIsEstimating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md" onClick={onCancel}>
      <div className="w-full max-w-sm bg-[#121418] border border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Plate Recognition</p>
            <p className="text-base font-bold text-white mt-0.5">Confirm Detected Items</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
          {localItems.map((item, i) => (
            <div 
              key={i} 
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                checked[i] 
                  ? "border-white/[0.12] bg-white/[0.04]" 
                  : "border-white/[0.04] bg-transparent opacity-40"
              }`}
            >
              <button 
                onClick={() => toggle(i)} 
                className={`w-5 h-5 rounded-lg border flex-shrink-0 flex items-center justify-center transition-colors ${
                  checked[i] ? "border-white bg-white text-black" : "border-white/20 bg-transparent"
                }`}
              >
                {checked[i] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
              
              {editingIdx === i ? (
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <input 
                    type="text" 
                    value={editVals.name} 
                    onChange={e => setEditVals(p => ({...p, name: e.target.value}))} 
                    className="w-full bg-white/[0.05] border border-white/20 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/40" 
                    placeholder="Food name" 
                    disabled={isEstimating} 
                  />
                  <input 
                    type="text" 
                    value={editVals.quantity} 
                    onChange={e => setEditVals(p => ({...p, quantity: e.target.value}))} 
                    className="w-full bg-white/[0.05] border border-white/20 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/40" 
                    placeholder="Quantity" 
                    disabled={isEstimating} 
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingIdx(null); }} 
                      className="px-3 py-1 rounded-full bg-white/[0.06] text-xs font-semibold text-white/70 hover:text-white" 
                      disabled={isEstimating}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={(e) => saveEdit(e, i)} 
                      className="px-3 py-1 rounded-full bg-white text-xs font-bold text-black" 
                      disabled={isEstimating}
                    >
                      {isEstimating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggle(i)}>
                  <p className="text-xs font-bold text-white truncate">{item.name}</p>
                  <p className="text-[11px] text-white/40 font-sans truncate mt-0.5">
                    {item.quantity ? `${item.quantity} · ` : ""}{item.calories} kcal · P {item.protein}g · C {item.carbs}g · F {item.fats}g
                  </p>
                </div>
              )}

              {editingIdx !== i && (
                <button 
                  onClick={(e) => startEdit(e, i)} 
                  className="p-1.5 shrink-0 text-white/30 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button 
          onClick={() => onConfirm(selected)} 
          disabled={selected.length === 0 || isEstimating}
          className="w-full h-11 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider disabled:opacity-30 hover:bg-white/90 active:scale-[0.99] transition-all flex-shrink-0 flex items-center justify-center gap-2 shadow-sm"
        >
          {isEstimating ? <Loader2 className="w-4 h-4 animate-spin" /> : `Log ${selected.length} item${selected.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

// ─── Edit Logged Item Modal ─────────────────────────────────────────
function EditLogItemModal({
  item,
  mealType,
  onSave,
  onDelete,
  onCancel,
}: {
  item: MacroEntry;
  mealType: MealType;
  onSave: (updated: MacroEntry) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [calories, setCalories] = useState(item.calories.toString());
  const [protein, setProtein] = useState(item.protein.toString());
  const [carbs, setCarbs] = useState(item.carbs.toString());
  const [fats, setFats] = useState(item.fats.toString());
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const query = quantity.trim() ? `${quantity.trim()} ${name.trim()}` : name.trim();
      const macros = await estimateMacros(query, "", true);
      setCalories(macros.calories.toString());
      setProtein(macros.protein.toString());
      setCarbs(macros.carbs.toString());
      setFats(macros.fats.toString());
      if ((macros as any).name) setName((macros as any).name);
    } catch (e) {
      console.error(e);
    } finally {
      setRecalculating(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...item,
      name: name.trim().toUpperCase(),
      quantity: quantity.trim(),
      calories: Math.max(0, parseInt(calories) || 0),
      protein: Math.max(0, parseFloat(protein) || 0),
      carbs: Math.max(0, parseFloat(carbs) || 0),
      fats: Math.max(0, parseFloat(fats) || 0),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md" onClick={onCancel}>
      <div className="w-full max-w-sm bg-[#121418] border border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Edit Food Record</p>
            <p className="text-base font-bold text-white mt-0.5 capitalize">{mealType}</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-1">Item Description</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-1">Portion / Serving</label>
            <input
              type="text"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
              placeholder="e.g. 1 bowl, 2 pieces"
            />
          </div>

          {/* AI Recalculate button */}
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="w-full py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/80 text-xs font-semibold hover:bg-white/[0.08] hover:text-white disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
          >
            {recalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
            Recalculate with AI
          </button>

          {/* Macro inputs */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-2 text-center">
              <label className="text-[9px] font-semibold uppercase text-white/40 block mb-0.5">Kcal</label>
              <input
                type="number"
                value={calories}
                onChange={e => setCalories(e.target.value)}
                className="w-full bg-transparent text-center text-xs font-sans font-bold text-white focus:outline-none"
              />
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-2 text-center">
              <label className="text-[9px] font-semibold uppercase text-orange-400/70 block mb-0.5">Pro (g)</label>
              <input
                type="number"
                value={protein}
                onChange={e => setProtein(e.target.value)}
                className="w-full bg-transparent text-center text-xs font-sans font-bold text-orange-400 focus:outline-none"
              />
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-2 text-center">
              <label className="text-[9px] font-semibold uppercase text-emerald-400/70 block mb-0.5">Carb (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={e => setCarbs(e.target.value)}
                className="w-full bg-transparent text-center text-xs font-sans font-bold text-emerald-400 focus:outline-none"
              />
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-2 text-center">
              <label className="text-[9px] font-semibold uppercase text-blue-400/70 block mb-0.5">Fat (g)</label>
              <input
                type="number"
                value={fats}
                onChange={e => setFats(e.target.value)}
                className="w-full bg-transparent text-center text-xs font-sans font-bold text-blue-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            onClick={onDelete}
            className="px-4 py-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors"
          >
            Delete
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-white/90 active:scale-[0.99] transition-all shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Staple Meal Modal ──────────────────────────────────────────────
function StapleMealModal({
  staple,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: {
  staple: StapleMeal | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (staple: StapleMeal) => void;
  onDelete?: (id: string) => void;
}) {
  const [name, setName] = useState(staple?.name || "");
  const [recipe, setRecipe] = useState(staple?.recipe || "");
  const [mealType, setMealType] = useState<MealType | "any">(staple?.mealType || "any");
  const [calories, setCalories] = useState(staple?.calories !== undefined ? staple.calories.toString() : "");
  const [protein, setProtein] = useState(staple?.protein !== undefined ? staple.protein.toString() : "");
  const [carbs, setCarbs] = useState(staple?.carbs !== undefined ? staple.carbs.toString() : "");
  const [fats, setFats] = useState(staple?.fats !== undefined ? staple.fats.toString() : "");
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (staple) {
      setName(staple.name);
      setRecipe(staple.recipe);
      setMealType(staple.mealType);
      setCalories(staple.calories.toString());
      setProtein(staple.protein.toString());
      setCarbs(staple.carbs.toString());
      setFats(staple.fats.toString());
    } else {
      setName("");
      setRecipe("");
      setMealType("any");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFats("");
    }
    setError(null);
  }, [staple, isOpen]);

  if (!isOpen) return null;

  const handleCalculateWithAI = async () => {
    const query = recipe.trim() || name.trim();
    if (!query) {
      setError("Please describe the ingredients or recipe first.");
      return;
    }
    setIsCalculating(true);
    setError(null);
    try {
      const macros = await estimateMacros(query, "", true);
      setCalories(macros.calories.toString());
      setProtein(macros.protein.toString());
      setCarbs(macros.carbs.toString());
      setFats(macros.fats.toString());
      if (!name.trim() && (macros as any).name) {
        setName((macros as any).name);
      }
    } catch (err: any) {
      console.error("[StapleMealModal] AI estimation error:", err);
      setError(
        err?.message === "INVALID_FOOD"
          ? "Couldn't identify foods in this recipe. Try including specific ingredients & weights (e.g. 50g oats, 250ml milk)."
          : "AI calculation failed. You can enter or adjust the macros manually below."
      );
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("Please provide a name for this custom food.");
      return;
    }
    const finalStaple: StapleMeal = {
      id: staple?.id || ("staple_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6)),
      name: name.trim().toUpperCase(),
      recipe: recipe.trim() || name.trim(),
      mealType,
      calories: Math.max(0, parseInt(calories) || 0),
      protein: Math.max(0, parseFloat(protein) || 0),
      carbs: Math.max(0, parseFloat(carbs) || 0),
      fats: Math.max(0, parseFloat(fats) || 0),
      createdAt: staple?.createdAt || new Date().toISOString(),
    };
    onSave(finalStaple);
  };

  const mealOptions: { key: MealType | "any"; label: string }[] = [
    { key: "any", label: "Any Meal" },
    { key: "breakfast", label: "Breakfast" },
    { key: "lunch", label: "Lunch" },
    { key: "snacks", label: "Snacks" },
    { key: "dinner", label: "Dinner" },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#121418] border border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Custom Food / Recipe</span>
            </div>
            <p className="text-base font-bold text-white">
              {staple ? "Edit Daily Staple" : "New Daily Staple"}
            </p>
            <p className="text-[11px] text-white/40">
              Saved permanently across all weekly menus & loggable in 1 tap.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3.5">
          {/* Recipe / Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Ingredients & Quantities
              </label>
              <span className="text-[10px] text-emerald-400 font-medium">Gemini AI Powered</span>
            </div>
            <textarea
              rows={3}
              value={recipe}
              onChange={e => setRecipe(e.target.value)}
              placeholder="e.g. 1 banana shake with 20g plant protein, 20g peanut butter, 15g honey, 250ml milk"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all resize-none"
            />
            <button
              type="button"
              onClick={handleCalculateWithAI}
              disabled={isCalculating || !recipe.trim()}
              className="mt-1.5 w-full py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculating with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Calculate Nutrition with AI</span>
                </>
              )}
            </button>
          </div>

          {/* Food Name */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-1">
              Food / Shake Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. BANANA PROTEIN SHAKE"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Preferred Meal */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-1.5">
              Preferred Meal Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {mealOptions.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setMealType(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    mealType === opt.key
                      ? "bg-white text-black border-white shadow-sm font-bold"
                      : "bg-white/[0.03] text-white/60 border-white/[0.06] hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Macro Inputs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Nutritional Breakdown (Per Serving)
              </label>
              <span className="text-[10px] text-white/30">Manual override available</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-2.5 text-center">
                <label className="text-[9px] font-semibold uppercase text-white/40 block mb-0.5">Calories</label>
                <input
                  type="number"
                  value={calories}
                  onChange={e => setCalories(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-center text-sm font-sans font-bold text-white focus:outline-none"
                />
                <span className="text-[9px] text-white/30">kcal</span>
              </div>
              <div className="bg-white/[0.02] border border-orange-500/20 rounded-2xl p-2.5 text-center bg-orange-500/[0.02]">
                <label className="text-[9px] font-semibold uppercase text-orange-400 block mb-0.5">Protein</label>
                <input
                  type="number"
                  value={protein}
                  onChange={e => setProtein(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-center text-sm font-sans font-bold text-orange-400 focus:outline-none"
                />
                <span className="text-[9px] text-orange-400/50">grams</span>
              </div>
              <div className="bg-white/[0.02] border border-emerald-500/20 rounded-2xl p-2.5 text-center bg-emerald-500/[0.02]">
                <label className="text-[9px] font-semibold uppercase text-emerald-400 block mb-0.5">Carbs</label>
                <input
                  type="number"
                  value={carbs}
                  onChange={e => setCarbs(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-center text-sm font-sans font-bold text-emerald-400 focus:outline-none"
                />
                <span className="text-[9px] text-emerald-400/50">grams</span>
              </div>
              <div className="bg-white/[0.02] border border-blue-500/20 rounded-2xl p-2.5 text-center bg-blue-500/[0.02]">
                <label className="text-[9px] font-semibold uppercase text-blue-400 block mb-0.5">Fats</label>
                <input
                  type="number"
                  value={fats}
                  onChange={e => setFats(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-center text-sm font-sans font-bold text-blue-400 focus:outline-none"
                />
                <span className="text-[9px] text-blue-400/50">grams</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 pt-2">
          {staple && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(staple.id)}
              className="px-4 py-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white text-xs font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-white/90 active:scale-[0.99] transition-all shadow-sm"
          >
            {staple ? "Update Staple" : "Save Staple"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Daily Staples & Recipes Manager Modal ─────────────────────────
function StaplesManagerModal({
  isOpen,
  onClose,
  staples,
  loading,
  onAddStaple,
  onEditStaple,
  onDeleteStaple,
  onLogStaple,
  loggingKey,
}: {
  isOpen: boolean;
  onClose: () => void;
  staples: StapleMeal[];
  loading?: boolean;
  onAddStaple: () => void;
  onEditStaple: (staple: StapleMeal) => void;
  onDeleteStaple: (id: string) => void;
  onLogStaple: (mealType: MealType, staple: StapleMeal) => void;
  loggingKey: string | null;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[#121418] border border-white/[0.08] rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-[10px] font-bold tracking-wider uppercase text-amber-400 mb-1.5">
              <Bookmark className="w-3 h-3 text-amber-400 fill-amber-400/20" />
              <span>Permanent Custom Foods</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              My Daily Staples
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              Saved permanently across weekly menus &bull; 1-tap log to any meal
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddStaple}
              className="px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-white/90 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Food</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List of staples */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 -mr-1">
          {loading && staples.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/40">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <p className="text-xs">Loading custom staples...</p>
            </div>
          ) : staples.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center space-y-3">
              <p className="text-sm font-medium text-white/60">No daily staples saved yet.</p>
              <p className="text-xs text-white/35 max-w-sm mx-auto leading-relaxed">
                Add your daily protein shakes, custom oats bowls, or recurring snacks once. They stay saved forever, even when you upload a new mess menu.
              </p>
              <button
                onClick={onAddStaple}
                className="mt-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-white/80 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                + Create First Staple
              </button>
            </div>
          ) : (
            staples.map(staple => (
              <div
                key={staple.id}
                className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 flex flex-col justify-between hover:border-white/[0.12] hover:bg-white/[0.03] transition-all group/card"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white group-hover/card:text-amber-300 transition-colors truncate">
                          {staple.name}
                        </p>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/40">
                          {staple.mealType === "any" ? "Any Meal" : staple.mealType}
                        </span>
                      </div>
                      <p className="text-xs text-white/45 mt-1 leading-relaxed">
                        {staple.recipe}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onEditStaple(staple)}
                        title="Edit staple & recipe"
                        className="text-white/30 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteStaple(staple.id)}
                        title="Delete staple"
                        className="text-white/30 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Macro Strip */}
                  <div className="flex items-center gap-2 mt-2.5 text-xs font-sans">
                    <span className="font-bold text-white">
                      {Math.round(staple.calories)} <span className="text-[10px] font-normal text-white/40">kcal</span>
                    </span>
                    <span className="text-orange-400 font-semibold bg-orange-400/10 px-2 py-0.5 rounded-full border border-orange-400/20 text-[11px]">
                      P {staple.protein}g
                    </span>
                    <span className="text-emerald-400 font-semibold bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 text-[11px]">
                      C {staple.carbs}g
                    </span>
                    <span className="text-blue-400 font-semibold bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20 text-[11px]">
                      F {staple.fats}g
                    </span>
                  </div>
                </div>

                {/* 1-Tap Quick Log Actions */}
                <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-white/[0.04]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 mr-1">Log to:</span>
                  {(["breakfast", "lunch", "snacks", "dinner"] as MealType[]).map(mKey => {
                    const isPreferred = staple.mealType === mKey;
                    const isLogging = loggingKey === `${mKey}:${staple.id}`;
                    return (
                      <button
                        key={mKey}
                        onClick={() => onLogStaple(mKey, staple)}
                        disabled={!!loggingKey}
                        title={`1-tap log to ${mKey}`}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${
                          isPreferred
                            ? "bg-amber-400/15 border border-amber-400/30 text-amber-300 hover:bg-amber-400/25 shadow-sm"
                            : "bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.08] hover:text-white"
                        }`}
                      >
                        {isLogging ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Plus className="w-2.5 h-2.5" />
                        )}
                        <span>{mKey === "breakfast" ? "B'fast" : mKey.charAt(0).toUpperCase() + mKey.slice(1)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/[0.06] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/70 hover:text-white text-xs font-semibold transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function DailyLog() {
  const { currentUser, userProfile } = useAuth();
  const { hash } = useLocation();

  const today = todayStr();
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const cachedLog = getCachedData<DayLog>("daily_log_" + today);
  const cachedMenu = getCachedData<MealPlan>("weekly_menu_" + dayName);
  const cachedStaples = getCachedData<StapleMeal[]>("user_staples");

  const [log, setLog]         = useState<DayLog>(cachedLog || { breakfast: [], lunch: [], dinner: [], snacks: [] });
  const [menu, setMenu]       = useState<MealPlan | null>(cachedMenu || null);
  const [loading, setLoading] = useState(!cachedLog);
  const [picker, setPicker]   = useState<{ mealType: MealType; foodName: string; isCustom?: boolean } | null>(null);
  const [estimating, setEstimating] = useState<string | null>(null);
  const [analyzing, setAnalyzing]   = useState<MealType | null>(null);
  const [photoItems, setPhotoItems] = useState<{ mealType: MealType; items: any[] } | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ mealType: MealType; item: MacroEntry } | null>(null);
  const [customInput, setCustomInput]   = useState<{ [k in MealType]?: string }>({});
  const [toast, setToast] = useState<string | null>(null);

  // Active Meal Tab for Mobile Scroll Reduction
  const [activeMealFilter, setActiveMealFilter] = useState<MealType | "all">("all");

  const targets = useMemo(() => calcTargets(userProfile), [userProfile]);

  // Staples / Custom Foods State
  const [staples, setStaples] = useState<StapleMeal[]>(cachedStaples || []);
  const [staplesLoading, setStaplesLoading] = useState(!cachedStaples);
  const [isStaplesManagerOpen, setIsStaplesManagerOpen] = useState(false);
  const [isStapleModalOpen, setIsStapleModalOpen] = useState(false);
  const [editingStaple, setEditingStaple] = useState<StapleMeal | null>(null);
  const [loggingStapleKey, setLoggingStapleKey] = useState<string | null>(null);

  const bfRef  = useRef<HTMLInputElement>(null);
  const lRef   = useRef<HTMLInputElement>(null);
  const dRef   = useRef<HTMLInputElement>(null);
  const snRef  = useRef<HTMLInputElement>(null);
  const fileRefs: Record<MealType, React.RefObject<HTMLInputElement | null>> = { breakfast: bfRef, lunch: lRef, dinner: dRef, snacks: snRef };

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [hash]);

  const loadLog = useCallback(async () => {
    if (!currentUser) return;
    try {
      const snap = await getDoc(doc(db, "users", currentUser.uid, "logs", today));
      if (snap.exists()) {
        const d = snap.data();
        const freshLog = { breakfast: d.breakfast||[], lunch: d.lunch||[], dinner: d.dinner||[], snacks: d.snacks||[] };
        setLog(freshLog);
        setCachedData("daily_log_" + today, freshLog);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser, today]);

  const loadMenu = useCallback(async () => {
    if (!currentUser) return;
    try {
      const snap = await getDocs(query(collection(db, "users", currentUser.uid, "menus"), orderBy("uploadedAt","desc"), limit(1)));
      if (!snap.empty) {
        const ext: MealPlan[] = snap.docs[0].data().extractedData||[];
        const selected = ext.find(d=>d.day===dayName)||ext[0]||null;
        setMenu(selected);
        if (selected) setCachedData("weekly_menu_" + dayName, selected);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser, dayName]);

  const loadStaples = useCallback(async () => {
    if (!currentUser) return;
    try {
      const staplesDocRef = doc(db, "users", currentUser.uid, "staples", "current");
      const snap = await getDoc(staplesDocRef);
      if (snap.exists()) {
        const loaded = snap.data().items || [];
        setStaples(loaded);
        setCachedData("user_staples", loaded);
      } else {
        // Fast instant seed with precomputed AI macros for the user's two exact daily recipes!
        const seededStaples: StapleMeal[] = [
          {
            id: "staple_seed_1",
            name: "BANANA PROTEIN SHAKE",
            recipe: "1 banana shake with 20g plant protein, 20g peanut butter, 15g honey, 250ml milk",
            mealType: "breakfast",
            calories: 530,
            protein: 36,
            carbs: 63,
            fats: 16,
            createdAt: new Date().toISOString(),
          },
          {
            id: "staple_seed_2",
            name: "PROTEIN OATS BOWL",
            recipe: "50g oats with 15g protein powder, 10g honey, 5g chia seeds, 250ml milk",
            mealType: "breakfast",
            calories: 485,
            protein: 33,
            carbs: 61,
            fats: 11,
            createdAt: new Date().toISOString(),
          },
        ];
        setStaples(seededStaples);
        setCachedData("user_staples", seededStaples);
        await setDoc(staplesDocRef, {
          items: seededStaples,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("[loadStaples] Error fetching staples:", err);
    } finally {
      setStaplesLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    Promise.all([loadLog(), loadMenu()]).finally(() => setLoading(false));
    loadStaples();
  }, [loadLog, loadMenu, loadStaples]);

  const persistStaples = async (newStaples: StapleMeal[]) => {
    setCachedData("user_staples", newStaples);
    if (!currentUser) return;
    const staplesDocRef = doc(db, "users", currentUser.uid, "staples", "current");
    await setDoc(staplesDocRef, { items: newStaples, lastUpdated: new Date().toISOString() });
  };

  const handleSaveStaple = async (stapleToSave: StapleMeal) => {
    const exists = staples.some(s => s.id === stapleToSave.id);
    const updated = exists
      ? staples.map(s => s.id === stapleToSave.id ? stapleToSave : s)
      : [stapleToSave, ...staples];
    setStaples(updated);
    await persistStaples(updated);
    setIsStapleModalOpen(false);
    setEditingStaple(null);
    setToast(exists ? `Updated "${stapleToSave.name}"` : `Saved "${stapleToSave.name}" to Daily Staples!`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteStaple = async (id: string) => {
    const updated = staples.filter(s => s.id !== id);
    setStaples(updated);
    await persistStaples(updated);
    setIsStapleModalOpen(false);
    setEditingStaple(null);
    setToast("Staple deleted");
    setTimeout(() => setToast(null), 3000);
  };

  const logStaple = async (targetMeal: MealType, staple: StapleMeal) => {
    const logKey = `${targetMeal}:${staple.id}`;
    setLoggingStapleKey(logKey);
    try {
      const entry: MacroEntry = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        name: staple.name,
        quantity: staple.recipe || "1 serving",
        calories: staple.calories,
        protein: staple.protein,
        carbs: staple.carbs,
        fats: staple.fats,
        loggedAt: new Date().toISOString(),
      };
      const newLog = {
        ...log,
        [targetMeal]: [...(log[targetMeal] || []), entry],
      };
      setLog(newLog);
      await persist(newLog);
      const mealLabel = mealConfig.find(m => m.key === targetMeal)?.label || targetMeal;
      setToast(`Logged ${staple.name} to ${mealLabel}!`);
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error("[logStaple] Error:", err);
      setToast("Failed to log staple. Please try again.");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoggingStapleKey(null);
    }
  };

  // Smooth scroll to hash when loading finishes
  useEffect(() => {
    if (!loading && hash) {
      const el = document.getElementById(hash.replace("#", ""));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [loading, hash]);

  const persist = async (newLog: DayLog) => {
    setCachedData("daily_log_" + today, newLog);
    if (!currentUser) return;
    const all = [...newLog.breakfast,...newLog.lunch,...newLog.dinner,...newLog.snacks];
    const totals = all.reduce((a,i)=>({calories:a.calories+i.calories,protein:a.protein+i.protein,carbs:a.carbs+i.carbs,fats:a.fats+i.fats}),{calories:0,protein:0,carbs:0,fats:0});
    await setDoc(doc(db,"users",currentUser.uid,"logs",today),{...newLog,totals,date:today});
  };

  const updateItem = async (mealType: MealType, updated: MacroEntry) => {
    const newLog = {
      ...log,
      [mealType]: (log[mealType] || []).map(i => i.id === updated.id ? updated : i)
    };
    setLog(newLog);
    await persist(newLog);
    setEditingEntry(null);
  };

  const logWithQuantity = async (mealType: MealType, foodName: string, quantity: string, isCustom = false) => {
    const key = mealType+":"+foodName; setEstimating(key); setPicker(null);
    try {
      const macros = await estimateMacros(foodName, quantity, isCustom);
      const cleanName = (macros as any).name || foodName;
      const { name: _, ...macroValues } = macros as any;
      const entry: MacroEntry = { id: Date.now().toString(), name: cleanName.toUpperCase(), quantity, loggedAt: new Date().toISOString(), ...macroValues };
      const newLog = { ...log, [mealType]: [...(log[mealType]||[]), entry] };
      setLog(newLog); await persist(newLog);
    } catch(e: any){
      console.error("[logWithQuantity] Error:", e);
      if (e?.message === "INVALID_FOOD") {
        setToast("Couldn't recognize that as food. Try being more specific!");
      } else {
        setToast("Something went wrong estimating macros. Try again!");
      }
      setTimeout(() => setToast(null), 3500);
    } finally{setEstimating(null);}
  };

  const removeItem = async (mealType: MealType, id: string) => {
    const newLog = { ...log, [mealType]: log[mealType].filter(i=>i.id!==id) };
    setLog(newLog); await persist(newLog);
  };

  const handlePhotoSelect = (mealType: MealType, file: File) => {
    setAnalyzing(mealType);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result as string;
        const result = await analyzePlate(dataUrl.split(",")[1], file.type);
        if (result.items && result.items.length > 0) {
          setPhotoItems({ mealType, items: result.items });
        } else {
          setToast("No food detected in this photo. Please upload a clear photo of your meal or plate!");
          setTimeout(() => setToast(null), 4500);
        }
      } catch (err) {
        console.error("[handlePhotoSelect] Error:", err);
        setToast("Failed to analyze image. Please try again with a clearer photo!");
        setTimeout(() => setToast(null), 4500);
      } finally {
        setAnalyzing(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmPhotoItems = async (items: any[]) => {
    if (!photoItems) return;
    const { mealType } = photoItems;
    const entries: MacroEntry[] = items.map(item => ({
      id: Date.now().toString()+Math.random(), name: item.name, quantity: item.quantity||"",
      loggedAt: new Date().toISOString(), ...sanitizeMacros({ calories: Number(item.calories)||0, protein: Number(item.protein)||0, carbs: Number(item.carbs)||0, fats: Number(item.fats)||0 }),
    }));
    const newLog = { ...log, [mealType]: [...(log[mealType]||[]), ...entries] };
    setLog(newLog); await persist(newLog); setPhotoItems(null);
  };

  const totals = [...log.breakfast,...log.lunch,...log.dinner,...log.snacks].reduce(
    (a,i)=>({calories:a.calories+i.calories,protein:a.protein+i.protein,carbs:a.carbs+i.carbs,fats:a.fats+i.fats}),
    {calories:0,protein:0,carbs:0,fats:0}
  );

  const ringData: RingData[] = useMemo(() => [
    {
      id: "calories",
      label: "Calories",
      current: totals.calories,
      target: targets.calories,
      unit: "kcal",
      gradientStart: APPLE_FITNESS_MACRO_PALETTES.calories.gradientStart,
      gradientEnd: APPLE_FITNESS_MACRO_PALETTES.calories.gradientEnd,
      trackColor: APPLE_FITNESS_MACRO_PALETTES.calories.trackColor,
    },
    {
      id: "protein",
      label: "Protein",
      current: totals.protein,
      target: targets.protein,
      unit: "g",
      gradientStart: APPLE_FITNESS_MACRO_PALETTES.protein.gradientStart,
      gradientEnd: APPLE_FITNESS_MACRO_PALETTES.protein.gradientEnd,
      trackColor: APPLE_FITNESS_MACRO_PALETTES.protein.trackColor,
    },
    {
      id: "carbs",
      label: "Carbs",
      current: totals.carbs,
      target: targets.carbs,
      unit: "g",
      gradientStart: APPLE_FITNESS_MACRO_PALETTES.carbs.gradientStart,
      gradientEnd: APPLE_FITNESS_MACRO_PALETTES.carbs.gradientEnd,
      trackColor: APPLE_FITNESS_MACRO_PALETTES.carbs.trackColor,
    },
  ], [totals, targets]);

  const caloriesRemaining = targets.calories - totals.calories;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin"/></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-20 md:pb-6">
      {picker && <QuantityPicker foodName={picker.foodName} onConfirm={qty=>logWithQuantity(picker.mealType,picker.foodName,qty,picker.isCustom)} onCancel={()=>setPicker(null)} />}
      {photoItems && <PhotoConfirm items={photoItems.items} onConfirm={confirmPhotoItems} onCancel={()=>setPhotoItems(null)} />}
      {editingEntry && (
        <EditLogItemModal
          item={editingEntry.item}
          mealType={editingEntry.mealType}
          onSave={updated => updateItem(editingEntry.mealType, updated)}
          onDelete={() => {
            removeItem(editingEntry.mealType, editingEntry.item.id);
            setEditingEntry(null);
          }}
          onCancel={() => setEditingEntry(null)}
        />
      )}
      {isStapleModalOpen && (
        <StapleMealModal
          staple={editingStaple}
          isOpen={isStapleModalOpen}
          onClose={() => {
            setIsStapleModalOpen(false);
            setEditingStaple(null);
          }}
          onSave={handleSaveStaple}
          onDelete={handleDeleteStaple}
        />
      )}
      {isStaplesManagerOpen && (
        <StaplesManagerModal
          isOpen={isStaplesManagerOpen}
          onClose={() => setIsStaplesManagerOpen(false)}
          staples={staples}
          loading={staplesLoading}
          onAddStaple={() => {
            setEditingStaple(null);
            setIsStapleModalOpen(true);
          }}
          onEditStaple={staple => {
            setEditingStaple(staple);
            setIsStapleModalOpen(true);
          }}
          onDeleteStaple={handleDeleteStaple}
          onLogStaple={logStaple}
          loggingKey={loggingStapleKey}
        />
      )}

      {/* Custom Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300 max-w-md w-[90%]">
          <div className="bg-amber-500/10 border border-amber-500/25 backdrop-blur-xl rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-2xl">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm font-medium text-amber-200 flex-1 leading-snug">{toast}</p>
            <button onClick={() => setToast(null)} className="text-amber-400/50 hover:text-amber-200 transition-colors ml-1 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Page Title & Staples Trigger */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-white/50 mb-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Daily Intake</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tightest font-sans">
            Nutrition Log
          </h1>
          <p className="text-xs text-white/45 mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        
        <button
          onClick={() => setIsStaplesManagerOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#121418] border border-white/[0.08] hover:border-amber-400/40 hover:bg-white/[0.04] text-white transition-all group active:scale-[0.98]"
          title="Manage permanent custom staples & recipes"
        >
          <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400/20 group-hover:scale-110 transition-transform" />
          <div className="text-left">
            <p className="text-xs font-bold leading-tight flex items-center gap-1.5">
              <span>My Staples</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-400/15 text-amber-300 font-semibold border border-amber-400/20">
                {staples.length}
              </span>
            </p>
            <p className="text-[9px] text-white/40 hidden sm:block">Custom Recipes</p>
          </div>
        </button>
      </div>

      {/* Apple Fitness Activity Rings Overview Card */}
      <div className="rounded-3xl bg-[#121418] border border-white/[0.08] p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
          {/* Apple Rings Visualizer */}
          <div className="shrink-0 flex flex-col items-center justify-center">
            <AppleActivityRing
              rings={ringData}
              size={116}
              strokeWidth={11}
              ringGap={4}
            />
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white/35 mt-2">
              Move &middot; Pro &middot; Carb
            </span>
          </div>

          {/* Calorie & Macro Target Split */}
          <div className="flex-1 w-full space-y-4">
            <div className="flex items-baseline justify-between border-b border-white/[0.06] pb-3">
              <div>
                <p className="text-3xl sm:text-4xl font-black font-sans tracking-tight text-white tabular-nums">
                  {Math.round(totals.calories)}
                  <span className="text-xs sm:text-sm font-normal text-white/40 ml-1">/ {targets.calories} kcal</span>
                </p>
                <p className="text-[10px] uppercase tracking-wider font-bold text-white/40 mt-0.5">Active Energy Logged</p>
              </div>

              <div className="text-right">
                <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-full ${
                  caloriesRemaining < 0
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/25"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                }`}>
                  {caloriesRemaining < 0 ? `+${Math.abs(Math.round(caloriesRemaining))} over` : `${Math.round(caloriesRemaining)} left`}
                </span>
              </div>
            </div>

            {/* Micro Macro Bars */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "Protein", current: totals.protein, target: targets.protein, color: "text-orange-400", bar: "bg-orange-400" },
                { label: "Carbs",   current: totals.carbs,   target: targets.carbs,   color: "text-emerald-400", bar: "bg-emerald-400" },
                { label: "Fats",    current: totals.fats,    target: targets.fats,    color: "text-blue-400",    bar: "bg-blue-400" },
              ].map(m => {
                const pct = Math.min(100, Math.round((m.current / Math.max(1, m.target)) * 100));
                return (
                  <div key={m.label} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white/40 uppercase tracking-wider font-bold text-[9px]">{m.label}</span>
                      <span className="text-[9px] font-mono text-white/40">{pct}%</span>
                    </div>
                    <p className={`text-sm sm:text-base font-extrabold font-sans tabular-nums ${m.color}`}>
                      {Math.round(m.current)}<span className="text-[10px] font-normal text-white/40">/{m.target}g</span>
                    </p>
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Meal Filter Tabs for Frictionless Mobile Browsing */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#121418] border border-white/[0.06] overflow-x-auto no-scrollbar">
        {[
          { key: "all" as const, label: "All Meals", icon: UtensilsCrossed, count: log.breakfast.length + log.lunch.length + log.dinner.length + log.snacks.length },
          { key: "breakfast" as const, label: "Breakfast", icon: Coffee, count: log.breakfast.length },
          { key: "lunch" as const, label: "Lunch", icon: Sun, count: log.lunch.length },
          { key: "dinner" as const, label: "Dinner", icon: Moon, count: log.dinner.length },
          { key: "snacks" as const, label: "Snacks", icon: Sparkles, count: log.snacks.length },
        ].map(tab => {
          const isActive = activeMealFilter === tab.key;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveMealFilter(tab.key)}
              className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-white text-black shadow-md font-bold"
                  : "text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <TabIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-black" : "text-white/50"}`} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? "bg-black/15 text-black" : "bg-white/[0.08] text-white/70"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Meal Sections */}
      {mealConfig
        .filter(({ key }) => activeMealFilter === "all" || activeMealFilter === key)
        .map(({ key, label, icon: Icon, color, bg, border }) => {
        const loggedItems = log[key]||[];
        const menuItems: string[] = key!=="snacks"&&menu ? (menu[key as "breakfast"|"lunch"|"dinner"]||[]) : [];
        const alreadyLogged = new Set(loggedItems.map(i=>i.name));
        const quickChips = menuItems.filter(item=>!alreadyLogged.has(item));
        const mealKcal = loggedItems.reduce((s,i)=>s+i.calories,0);
        const mealStaples = staples.filter(s => s.mealType === "any" || s.mealType === key);

        return (
          <div key={key} id={key} className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 md:p-6 space-y-5 scroll-mt-24 group hover:border-white/[0.12] transition-all">
            {/* Meal Header */}
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${bg} ${border}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-white tracking-tight">{label}</p>
                {mealKcal > 0 && (
                  <p className="text-[11px] font-sans font-medium text-white/40">{Math.round(mealKcal)} kcal</p>
                )}
              </div>
              
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setIsStaplesManagerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:border-amber-400/30 hover:text-white text-xs font-semibold transition-all"
                  title="View & manage daily staples"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Staples</span>
                </button>
                <button 
                  onClick={()=>fileRefs[key].current?.click()} 
                  disabled={analyzing===key}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    analyzing===key 
                      ? "border-white/10 text-white/30 bg-transparent" 
                      : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {analyzing===key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  <span>{analyzing===key ? "Analyzing..." : "Photo"}</span>
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  ref={fileRefs[key]}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(key, f); e.target.value = ""; }}
                />
              </div>
            </div>

            {/* Logged Items List */}
            {loggedItems.length > 0 && (
              <div className="space-y-1 pt-1">
                {loggedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.02] border-b border-white/[0.04] last:border-0 transition-colors group/item">
                    <div
                      onClick={() => setEditingEntry({ mealType: key, item })}
                      className="flex-1 cursor-pointer min-w-0"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-white group-hover/item:text-emerald-400 transition-colors truncate">
                          {item.name}
                        </p>
                        {item.quantity && (
                          <span className="text-[10px] text-white/40 font-medium bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                            {item.quantity}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/40 font-sans mt-0.5">
                        {item.calories} kcal &middot; P {item.protein}g &middot; C {item.carbs}g &middot; F {item.fats}g
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-60 group-hover/item:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStaple({
                            id: "staple_" + Date.now(),
                            name: item.name,
                            recipe: item.quantity ? `${item.quantity} ${item.name}` : item.name,
                            mealType: key,
                            calories: item.calories,
                            protein: item.protein,
                            carbs: item.carbs,
                            fats: item.fats,
                            createdAt: new Date().toISOString(),
                          });
                          setIsStapleModalOpen(true);
                        }}
                        title="Save as permanent daily staple"
                        className="text-white/30 hover:text-amber-400 transition-colors p-1.5 rounded-lg hover:bg-amber-400/10"
                      >
                        <Bookmark className="w-3.5 h-3.5"/>
                      </button>
                      <button
                        onClick={() => setEditingEntry({ mealType: key, item })}
                        title="Edit item or macros"
                        className="text-white/30 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.05]"
                      >
                        <Pencil className="w-3.5 h-3.5"/>
                      </button>
                      <button
                        onClick={() => removeItem(key, item.id)}
                        title="Delete item"
                        className="text-white/30 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Unified Quick Suggestions: Staples + Today's Mess Menu */}
            {(mealStaples.length > 0 || quickChips.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Daily Staples */}
                {mealStaples.map(staple => {
                  const isLogging = loggingStapleKey === `${key}:${staple.id}`;
                  return (
                    <button
                      key={staple.id}
                      onClick={() => logStaple(key, staple)}
                      disabled={!!loggingStapleKey}
                      title={`1-tap log: ${staple.recipe}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 text-xs font-semibold transition-all active:scale-[0.98] shadow-sm"
                    >
                      {isLogging ? (
                        <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-amber-400" />
                      )}
                      <span>{staple.name}</span>
                      <span className="text-[10px] text-amber-300/60 font-normal">({staple.protein}g P)</span>
                    </button>
                  );
                })}

                {/* Mess Menu Chips */}
                {quickChips.map(item => {
                  const chipKey = key + ":" + item; 
                  const isLoading = estimating === chipKey;
                  return (
                    <button 
                      key={item} 
                      onClick={() => setPicker({ mealType: key, foodName: item })} 
                      disabled={!!estimating}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        isLoading 
                          ? "border-white/10 text-white/30" 
                          : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3 text-white/40" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom Input */}
            <div className="flex gap-2 pt-1">
              <input 
                type="text" 
                placeholder="Add custom item or describe what you ate..."
                value={customInput[key]||""}
                onChange={e => setCustomInput(prev => ({...prev, [key]: e.target.value}))}
                onKeyDown={e => {
                  if (e.key === "Enter" && customInput[key]?.trim()) {
                    const text = customInput[key]!.trim();
                    const hasMeasurement = /\d+\s*(g|gm|gms|gram|grams|ml|l|ltr|kg)\b/i.test(text);
                    const hasPortionCount = /\b(\d+|half|one|two|three|four|five)\s*(box|boxes|packet|packets|plate|plates|bowl|bowls|piece|pieces|slice|slices|scoop|scoops|tbsp|tsp|cup|cups|serving|servings)\b/i.test(text);
                    const isComplexMeal = text.length > 25 || text.split(/\s+/).length > 3 || /\b(with|and|from|plus|\+)\b/i.test(text);
                    const isDirectAI = hasMeasurement || hasPortionCount || isComplexMeal;

                    if (isDirectAI) {
                      logWithQuantity(key, text, "", true);
                    } else {
                      setPicker({ mealType: key, foodName: text.toUpperCase(), isCustom: true });
                    }
                    setCustomInput(prev => ({ ...prev, [key]: "" }));
                  }
                }}
                className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-full px-4 py-2.5 text-xs text-white placeholder-white/35 focus:outline-none focus:border-white/25 transition-all"
              />
              <button 
                onClick={() => {
                  if (customInput[key]?.trim()) {
                    const text = customInput[key]!.trim();
                    const hasMeasurement = /\d+\s*(g|gm|gms|gram|grams|ml|l|ltr|kg)\b/i.test(text);
                    const hasPortionCount = /\b(\d+|half|one|two|three|four|five)\s*(box|boxes|packet|packets|plate|plates|bowl|bowls|piece|pieces|slice|slices|scoop|scoops|tbsp|tsp|cup|cups|serving|servings)\b/i.test(text);
                    const isComplexMeal = text.length > 25 || text.split(/\s+/).length > 3 || /\b(with|and|from|plus|\+)\b/i.test(text);
                    const isDirectAI = hasMeasurement || hasPortionCount || isComplexMeal;

                    if (isDirectAI) {
                      logWithQuantity(key, text, "", true);
                    } else {
                      setPicker({ mealType: key, foodName: text.toUpperCase(), isCustom: true });
                    }
                    setCustomInput(prev => ({ ...prev, [key]: "" }));
                  }
                }}
                disabled={!!estimating}
                className="px-5 py-2.5 bg-white text-black rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white/90 active:scale-[0.98] disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-sm"
              >
                {estimating?.startsWith(key + ":") ? <Loader2 className="w-3.5 h-3.5 animate-spin text-black" /> : null}
                <span>Add</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
