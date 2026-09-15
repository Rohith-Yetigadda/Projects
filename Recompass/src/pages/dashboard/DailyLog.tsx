import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Coffee, Sun, Moon, Plus, Trash2, Loader2, Sparkles, Camera, X, Check } from "lucide-react";

type MacroEntry = { id: string; name: string; quantity: string; calories: number; protein: number; carbs: number; fats: number; loggedAt: string; };
type MealType = "breakfast" | "lunch" | "dinner" | "snacks";
type DayLog = { breakfast: MacroEntry[]; lunch: MacroEntry[]; dinner: MacroEntry[]; snacks: MacroEntry[]; };
type MealPlan = { day: string; breakfast: string[]; lunch: string[]; dinner: string[]; };

const todayStr = () => new Date().toISOString().split("T")[0];

const mealConfig: { key: MealType; label: string; icon: any; color: string; bg: string; border: string; }[] = [
  { key: "breakfast", label: "Breakfast", icon: Coffee,   color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20"   },
  { key: "lunch",     label: "Lunch",     icon: Sun,      color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  { key: "dinner",    label: "Dinner",    icon: Moon,     color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20"    },
  { key: "snacks",    label: "Snacks",    icon: Sparkles, color: "text-purple-400",  bg: "bg-purple-400/10",  border: "border-purple-400/20"  },
];

function getFoodCategory(name: string): "liquid" | "piece" | "ladle" | "generic" {
  const n = name.toLowerCase();
  if (/milk|juice|buttermilk|water|coffee|tea|lassi|raita|soup|chaas|nimbu/.test(n)) return "liquid";
  if (/chapati|chapathi|roti|bread|idli|dosa|vada|puri|paratha|egg|bun/.test(n)) return "piece";
  if (/rice|upma|poha|dal|sabzi|sabji|gravy|curry|paneer|chicken|mutton|fish|sambar|rasam|khichdi|vermicelli/.test(n)) return "ladle";
  return "generic";
}

const QUANTITY_PRESETS: Record<string, string[]> = {
  liquid:  ["50ml", "100ml", "150ml", "200ml", "250ml", "270ml", "300ml", "350ml"],
  piece:   ["1 piece", "2 pieces", "3 pieces", "4 pieces", "half piece"],
  ladle:   ["1 small ladle", "1 ladle", "2 ladles", "half bowl", "1 bowl", "1 full plate"],
  generic: ["small serving", "medium serving", "large serving", "half serving"],
};

async function estimateMacros(foodName: string, quantity: string) {
  const res = await fetch("/api/compass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "estimate_macros", payload: { foodName: quantity + " " + foodName } }),
  });
  const data = await res.json();
  return {
    calories: Number(data.calories) || 100,
    protein:  Number(data.protein)  || 3,
    carbs:    Number(data.carbs)    || 15,
    fats:     Number(data.fats)     || 3,
  };
}

async function analyzePlate(base64: string, mimeType: string): Promise<{ name: string; quantity: string; calories: number; protein: number; carbs: number; fats: number }[]> {
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
function QuantityPicker({ foodName, onConfirm, onCancel }: {
  foodName: string;
  onConfirm: (quantity: string) => void;
  onCancel: () => void;
}) {
  const category = getFoodCategory(foodName);
  const presets = QUANTITY_PRESETS[category];
  const [custom, setCustom] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const confirm = () => {
    const qty = custom.trim() || selected;
    if (qty) onConfirm(qty);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">How much did you have?</p>
            <p className="text-lg font-bold text-white mt-1">{foodName}</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {/* Preset pills */}
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button key={p} onClick={() => { setSelected(p); setCustom(""); }}
              className={"px-3 py-1.5 rounded-xl text-sm font-semibold transition-all border " +
                (selected === p && !custom ? "bg-white text-black border-white" : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white")}>
              {p}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div>
          <p className="text-xs font-semibold text-white/30 mb-2">Or describe exactly</p>
          <input
            type="text"
            placeholder={"e.g. 270ml, 1.5 ladles, 2 small pieces..."}
            value={custom}
            onChange={e => { setCustom(e.target.value); setSelected(null); }}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
          />
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
function PhotoConfirm({ items, onConfirm, onCancel }: {
  items: { name: string; quantity: string; calories: number; protein: number; carbs: number; fats: number }[];
  onConfirm: (items: typeof items) => void;
  onCancel: () => void;
}) {
  const [checked, setChecked] = useState<boolean[]>(items.map(() => true));
  const toggle = (i: number) => setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));
  const selected = items.filter((_, i) => checked[i]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Detected from photo</p>
            <p className="text-lg font-bold text-white mt-1">Confirm items to log</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-2 overflow-y-auto flex-1">
          {items.map((item, i) => (
            <button key={i} onClick={() => toggle(i)}
              className={"w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all " +
                (checked[i] ? "border-white/20 bg-white/5" : "border-white/5 opacity-40")}>
              <div className={"w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors " + (checked[i] ? "border-white bg-white" : "border-white/30")}>
                {checked[i] && <Check className="w-3 h-3 text-black" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{item.name}</p>
                <p className="text-xs text-white/40">{item.quantity} &middot; {item.calories} kcal &middot; P {item.protein}g C {item.carbs}g F {item.fats}g</p>
              </div>
            </button>
          ))}
        </div>

        <button onClick={() => onConfirm(selected)} disabled={selected.length === 0}
          className="w-full h-12 rounded-xl bg-white text-black font-bold text-sm disabled:opacity-30 hover:bg-white/90 transition-colors flex-shrink-0">
          Log {selected.length} item{selected.length !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function DailyLog() {
  const { currentUser } = useAuth();
  const [log, setLog]     = useState<DayLog>({ breakfast: [], lunch: [], dinner: [], snacks: [] });
  const [menu, setMenu]   = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Quantity picker state
  const [picker, setPicker] = useState<{ mealType: MealType; foodName: string } | null>(null);
  const [estimating, setEstimating] = useState<string | null>(null);

  // Photo analysis state
  const [analyzing, setAnalyzing] = useState<MealType | null>(null);
  const [photoItems, setPhotoItems] = useState<{ mealType: MealType; items: any[] } | null>(null);
  const fileRefs: Record<MealType, React.RefObject<HTMLInputElement>> = {
    breakfast: useRef<HTMLInputElement>(null),
    lunch:     useRef<HTMLInputElement>(null),
    dinner:    useRef<HTMLInputElement>(null),
    snacks:    useRef<HTMLInputElement>(null),
  };

  const [customInput, setCustomInput] = useState<{ [k in MealType]?: string }>({});

  const today = todayStr();
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const loadLog = useCallback(async () => {
    if (!currentUser) return;
    const snap = await getDoc(doc(db, "users", currentUser.uid, "logs", today));
    if (snap.exists()) {
      const d = snap.data();
      setLog({ breakfast: d.breakfast || [], lunch: d.lunch || [], dinner: d.dinner || [], snacks: d.snacks || [] });
    }
  }, [currentUser, today]);

  const loadMenu = useCallback(async () => {
    if (!currentUser) return;
    const snap = await getDocs(query(collection(db, "users", currentUser.uid, "menus"), orderBy("uploadedAt", "desc"), limit(1)));
    if (!snap.empty) {
      const extracted: MealPlan[] = snap.docs[0].data().extractedData || [];
      setMenu(extracted.find(d => d.day === dayName) || extracted[0] || null);
    }
  }, [currentUser, dayName]);

  useEffect(() => {
    Promise.all([loadLog(), loadMenu()]).finally(() => setLoading(false));
  }, [loadLog, loadMenu]);

  const persistLog = async (newLog: DayLog) => {
    if (!currentUser) return;
    const all = [...newLog.breakfast, ...newLog.lunch, ...newLog.dinner, ...newLog.snacks];
    const totals = all.reduce((a, i) => ({ calories: a.calories+i.calories, protein: a.protein+i.protein, carbs: a.carbs+i.carbs, fats: a.fats+i.fats }), { calories:0, protein:0, carbs:0, fats:0 });
    await setDoc(doc(db, "users", currentUser.uid, "logs", today), { ...newLog, totals, date: today });
  };

  // Called after quantity is selected
  const logWithQuantity = async (mealType: MealType, foodName: string, quantity: string) => {
    const key = mealType + ":" + foodName;
    setEstimating(key);
    setPicker(null);
    try {
      const macros = await estimateMacros(foodName, quantity);
      const entry: MacroEntry = { id: Date.now().toString(), name: foodName, quantity, loggedAt: new Date().toISOString(), ...macros };
      const newLog = { ...log, [mealType]: [...(log[mealType] || []), entry] };
      setLog(newLog);
      await persistLog(newLog);
    } catch (e) { console.error(e); }
    finally { setEstimating(null); }
  };

  const removeItem = async (mealType: MealType, id: string) => {
    const newLog = { ...log, [mealType]: log[mealType].filter(i => i.id !== id) };
    setLog(newLog);
    await persistLog(newLog);
  };

  const handlePhotoSelect = async (mealType: MealType, file: File) => {
    setAnalyzing(mealType);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(",")[1];
        const mimeType = file.type;
        const items = await analyzePlate(base64, mimeType);
        if (items.length > 0) setPhotoItems({ mealType, items });
        setAnalyzing(null);
      };
      reader.readAsDataURL(file);
    } catch (err) { console.error(err); setAnalyzing(null); }
  };

  const confirmPhotoItems = async (items: any[]) => {
    if (!photoItems) return;
    const { mealType } = photoItems;
    const entries: MacroEntry[] = items.map(item => ({
      id: Date.now().toString() + Math.random(),
      name: item.name,
      quantity: item.quantity || "",
      loggedAt: new Date().toISOString(),
      calories: Number(item.calories) || 0,
      protein:  Number(item.protein)  || 0,
      carbs:    Number(item.carbs)    || 0,
      fats:     Number(item.fats)     || 0,
    }));
    const newLog = { ...log, [mealType]: [...(log[mealType] || []), ...entries] };
    setLog(newLog);
    await persistLog(newLog);
    setPhotoItems(null);
  };

  const totals = [...log.breakfast, ...log.lunch, ...log.dinner, ...log.snacks].reduce(
    (acc, i) => ({ calories: acc.calories+i.calories, protein: acc.protein+i.protein, carbs: acc.carbs+i.carbs, fats: acc.fats+i.fats }),
    { calories:0, protein:0, carbs:0, fats:0 }
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Quantity Picker */}
      {picker && (
        <QuantityPicker
          foodName={picker.foodName}
          onConfirm={qty => logWithQuantity(picker.mealType, picker.foodName, qty)}
          onCancel={() => setPicker(null)}
        />
      )}

      {/* Photo Confirm */}
      {photoItems && (
        <PhotoConfirm
          items={photoItems.items}
          onConfirm={confirmPhotoItems}
          onCancel={() => setPhotoItems(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Daily Log</h1>
          <p className="text-white/40 text-sm font-medium mt-1">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="glass-card rounded-2xl px-4 py-2 text-right">
          <p className="text-2xl font-bold text-white">{Math.round(totals.calories)}</p>
          <p className="text-xs text-white/40 font-medium">kcal logged</p>
        </div>
      </div>

      {/* Macro Strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Protein", value: totals.protein, color: "text-orange-400" },
          { label: "Carbs",   value: totals.carbs,   color: "text-emerald-400" },
          { label: "Fats",    value: totals.fats,    color: "text-blue-400" },
        ].map(m => (
          <div key={m.label} className="glass-card rounded-2xl p-4 text-center">
            <p className={"text-xl font-bold " + m.color}>{Math.round(m.value)}<span className="text-sm font-medium text-white/40">g</span></p>
            <p className="text-xs text-white/40 font-medium mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Meal Sections */}
      {mealConfig.map(({ key, label, icon: Icon, color, bg, border }) => {
        const loggedItems = log[key] || [];
        const menuItems: string[] = key !== "snacks" && menu ? (menu[key as "breakfast"|"lunch"|"dinner"] || []) : [];
        const alreadyLogged = new Set(loggedItems.map(i => i.name));
        const quickChips = menuItems.filter(item => !alreadyLogged.has(item));
        const mealKcal = loggedItems.reduce((s, i) => s + i.calories, 0);

        return (
          <div key={key} className="glass-card rounded-2xl p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={"w-9 h-9 rounded-xl flex items-center justify-center border " + bg + " " + border}>
                <Icon className={"w-4 h-4 " + color} />
              </div>
              <p className="text-sm font-bold text-white">{label}</p>
              <div className="ml-auto flex items-center gap-3">
                {mealKcal > 0 && <span className="text-xs font-bold text-white/30">{Math.round(mealKcal)} kcal</span>}
                {/* Photo log button */}
                <button
                  onClick={() => fileRefs[key].current?.click()}
                  disabled={analyzing === key}
                  className={"flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all " +
                    (analyzing === key ? "border-white/10 text-white/30" : "border-white/10 text-white/50 hover:bg-white/10 hover:text-white")}>
                  {analyzing === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                  {analyzing === key ? "Analyzing..." : "Photo"}
                </button>
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileRefs[key]}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(key, f); e.target.value = ""; }} />
              </div>
            </div>

            {/* Logged items */}
            {loggedItems.length > 0 && (
              <div className="space-y-2">
                {loggedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        {item.quantity && <span className="text-xs text-white/30 font-medium bg-white/5 px-2 py-0.5 rounded-full">{item.quantity}</span>}
                      </div>
                      <p className="text-xs text-white/40 mt-0.5">
                        {item.calories} kcal &middot; P {item.protein}g &middot; C {item.carbs}g &middot; F {item.fats}g
                      </p>
                    </div>
                    <button onClick={() => removeItem(key, item.id)} className="text-white/20 hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick-log chips */}
            {quickChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {quickChips.map(item => {
                  const chipKey = key + ":" + item;
                  const isLoading = estimating === chipKey;
                  return (
                    <button key={item} onClick={() => setPicker({ mealType: key, foodName: item })} disabled={!!estimating}
                      className={"flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all " +
                        (isLoading ? "border-white/10 text-white/30" : "border-white/10 text-white/70 hover:bg-white/10 hover:text-white")}>
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      {item}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom text input */}
            <div className="flex gap-2">
              <input type="text" placeholder="Add custom item..."
                value={customInput[key] || ""}
                onChange={e => setCustomInput(prev => ({ ...prev, [key]: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === "Enter" && customInput[key]?.trim()) {
                    setPicker({ mealType: key, foodName: customInput[key]!.trim() });
                    setCustomInput(prev => ({ ...prev, [key]: "" }));
                  }
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30" />
              <button onClick={() => {
                if (customInput[key]?.trim()) {
                  setPicker({ mealType: key, foodName: customInput[key]!.trim() });
                  setCustomInput(prev => ({ ...prev, [key]: "" }));
                }
              }} className="px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white hover:bg-white/20 transition-colors">
                Add
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
