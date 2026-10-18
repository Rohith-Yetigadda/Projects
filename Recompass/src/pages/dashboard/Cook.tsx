import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import {
  ChefHat,
  Sparkles,
  Flame,
  Clock,
  Package,
  Check,
  BookOpen,
  Lightbulb,
  Zap,
  Info,
  ShoppingCart,
  AlertTriangle,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import type { PantryItem, StockStatus } from "./Pantry";
import { getStockStatus } from "./Pantry";
import { getRecipePantryImpact, applyPantryDeductions } from "@/lib/pantryDeduction";
import { setCachedData } from "@/lib/dataCache";

type Recipe = {
  id: string;
  title: string;
  time: string;
  method: string;
  difficulty: string;
  ingredients: string[];
  instructions: string[];
  hostelHack: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
};

const COOKING_METHODS = [
  { id: "any", label: "Any (Hostel)", icon: Zap },
  { id: "microwave", label: "Microwave", icon: Flame },
  { id: "kettle", label: "Electric Kettle", icon: Flame },
  { id: "induction", label: "Induction", icon: Flame },
  { id: "no-cook", label: "No-Cook / Shake", icon: Sparkles },
];

export default function Cook() {
  const { currentUser, userProfile } = useAuth();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [customIngredient, setCustomIngredient] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("any");
  
  const [loadingPantry, setLoadingPantry] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Synergy States: Auto-deduct & Low-Stock Alerts
  const [autoDeductPantry, setAutoDeductPantry] = useState(true);
  const [restockAlertItems, setRestockAlertItems] = useState<{ id: string; name: string; quantity: number; unit: string; category: string; status: StockStatus }[] | null>(null);
  const [addedToGroceries, setAddedToGroceries] = useState(false);
  const [addingToGroceries, setAddingToGroceries] = useState(false);

  // Meal logging states
  const [loggingRecipeId, setLoggingRecipeId] = useState<string | null>(null);
  const [loggedStatus, setLoggedStatus] = useState<{ [recipeId: string]: string }>({});

  // 1. Fetch Pantry Items
  useEffect(() => {
    if (!currentUser) return;
    const fetchPantry = async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid, "pantry", "current"));
        if (snap.exists()) {
          const items: PantryItem[] = snap.data().items || [];
          const stocked = items.filter(i => i.quantity > 0);
          setPantryItems(stocked);
          // By default, select all available stocked items
          setSelectedIngredients(stocked.map(i => i.name));
        }
      } catch (err) {
        console.error("Error fetching pantry for recipes:", err);
      } finally {
        setLoadingPantry(false);
      }
    };
    fetchPantry();
  }, [currentUser]);

  // Toggle ingredient selection
  const toggleIngredient = (name: string) => {
    if (selectedIngredients.includes(name)) {
      setSelectedIngredients(selectedIngredients.filter(i => i !== name));
    } else {
      setSelectedIngredients([...selectedIngredients, name]);
    }
  };

  // Add custom ingredient
  const handleAddCustomIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIngredient.trim()) return;
    const name = customIngredient.trim();
    if (!selectedIngredients.includes(name)) {
      setSelectedIngredients([...selectedIngredients, name]);
    }
    setCustomIngredient("");
  };

  // Generate Recipes
  const handleGenerateRecipes = async () => {
    if (selectedIngredients.length === 0) {
      setErrorMsg("Please select at least 1 ingredient from your pantry.");
      return;
    }

    setGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/compass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_recipes",
          payload: {
            ingredients: selectedIngredients,
            goal: userProfile?.goal || "high protein nutrition",
            method: selectedMethod
          }
        })
      });

      const data = await res.json();

      if (Array.isArray(data)) {
        setRecipes(data);
      } else if (data.recipes && Array.isArray(data.recipes)) {
        setRecipes(data.recipes);
      } else {
        throw new Error("Invalid recipe format returned from AI.");
      }
    } catch (err: any) {
      console.error("Error generating recipes:", err);
      setErrorMsg("Failed to generate recipes. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Add Low-Stock Pantry Items to Groceries
  const handleAddLowStockToGroceries = async () => {
    if (!currentUser || !restockAlertItems || restockAlertItems.length === 0) return;
    setAddingToGroceries(true);
    try {
      const snap = await getDoc(doc(db, "users", currentUser.uid, "groceries", "current"));
      const currentGroceries: any[] = snap.exists() ? (snap.data().items || []) : [];

      let updated = [...currentGroceries];
      let addedCount = 0;
      restockAlertItems.forEach(item => {
        const exists = updated.some(g => g.name.toLowerCase() === item.name.toLowerCase() && !g.purchased);
        if (!exists) {
          updated.push({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
            name: item.name,
            category: item.category || "Other",
            purchased: false
          });
          addedCount++;
        }
      });

      await setDoc(doc(db, "users", currentUser.uid, "groceries", "current"), {
        items: updated,
        lastUpdated: new Date().toISOString()
      });
      setCachedData("grocery_items", updated);
      setAddedToGroceries(true);
    } catch (gErr) {
      console.error("Error adding low stock items to groceries:", gErr);
    } finally {
      setAddingToGroceries(false);
    }
  };

  // Direct Log Meal to Today's Daily Log & Auto-Deduct from Pantry
  const handleLogMeal = async (recipe: Recipe) => {
    if (!currentUser) return;
    setLoggingRecipeId(recipe.id);

    try {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const currentHour = new Date().getHours();
      
      // Smart infer meal type based on hour
      let mealType = "snacks";
      if (currentHour >= 6 && currentHour < 11) mealType = "breakfast";
      else if (currentHour >= 11 && currentHour < 16) mealType = "lunch";
      else if (currentHour >= 18 && currentHour < 23) mealType = "dinner";

      const logRef = doc(db, "users", currentUser.uid, "logs", today);
      const logSnap = await getDoc(logRef);

      const logData = logSnap.exists()
        ? logSnap.data()
        : { breakfast: [], lunch: [], dinner: [], snacks: [], totals: { calories: 0, protein: 0, carbs: 0, fats: 0 } };

      const mealEntry = {
        id: Date.now().toString(),
        name: recipe.title.toUpperCase(),
        quantity: "1 serving",
        calories: Math.round(recipe.macros.calories || 0),
        protein: Math.round(recipe.macros.protein || 0),
        carbs: Math.round(recipe.macros.carbs || 0),
        fats: Math.round(recipe.macros.fats || 0)
      };

      const updatedMealList = [...(logData[mealType] || []), mealEntry];
      logData[mealType] = updatedMealList;

      // Recalculate totals
      const allMeals = [
        ...(logData.breakfast || []),
        ...(logData.lunch || []),
        ...(logData.dinner || []),
        ...(logData.snacks || [])
      ];

      logData.totals = allMeals.reduce(
        (acc: any, item: any) => ({
          calories: acc.calories + (Number(item.calories) || 0),
          protein: acc.protein + (Number(item.protein) || 0),
          carbs: acc.carbs + (Number(item.carbs) || 0),
          fats: acc.fats + (Number(item.fats) || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );

      await setDoc(logRef, logData);

      // Handle Pantry Deductions & Low-Stock Alerts
      let deductedSummary = "";
      if (autoDeductPantry && pantryItems.length > 0) {
        const impacts = getRecipePantryImpact(recipe.ingredients, pantryItems);
        const updatedPantry = applyPantryDeductions(pantryItems, impacts);
        
        // Find items that are now low stock or depleted
        const newlyLowOrDepleted = updatedPantry.filter(p => {
          const status = getStockStatus(p);
          const impact = impacts.find(imp => imp.matchedItem?.id === p.id);
          return impact && impact.deductQuantity > 0 && (status === "low_stock" || status === "depleted");
        });

        try {
          await setDoc(doc(db, "users", currentUser.uid, "pantry", "current"), {
            items: updatedPantry,
            lastUpdated: new Date().toISOString()
          });
          setCachedData("pantry_items", updatedPantry);
          setPantryItems(updatedPantry.filter(i => i.quantity > 0)); // Update in-memory state

          const deductedCount = impacts.filter(i => i.matchedItem && i.deductQuantity > 0).length;
          if (deductedCount > 0) {
            deductedSummary = ` • Deducted ${deductedCount} item${deductedCount > 1 ? "s" : ""}`;
          }

          if (newlyLowOrDepleted.length > 0) {
            setRestockAlertItems(newlyLowOrDepleted.map(p => ({
              id: p.id,
              name: p.name,
              quantity: p.quantity,
              unit: p.unit,
              category: p.category,
              status: getStockStatus(p)
            })));
            setAddedToGroceries(false);
          }
        } catch (pErr) {
          console.error("Error updating pantry on recipe log:", pErr);
        }
      }

      setLoggedStatus(prev => ({ ...prev, [recipe.id]: `Logged to ${mealType.toUpperCase()}${deductedSummary}` }));
    } catch (err) {
      console.error("Error logging recipe meal:", err);
    } finally {
      setLoggingRecipeId(null);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 md:pb-6">
      
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-white/50 mb-2.5">
            <ChefHat className="w-3 h-3 text-orange-400" />
            <span>Student AI Chef</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tightest font-sans">
            Cook with Pantry
          </h1>
          <p className="text-sm font-normal text-white/45 mt-1.5">
            Pick ingredients from your pantry to generate high-protein hostel meals in seconds.
          </p>
        </div>

        <Link
          to="/app/pantry"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 text-xs font-bold uppercase tracking-wider hover:bg-white/[0.08] hover:text-white transition-all self-start sm:self-auto"
        >
          <Package className="w-3.5 h-3.5" />
          <span>Manage Pantry</span>
        </Link>
      </div>

      {/* Main Ingredient Selector Bento */}
      <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-6 shadow-2xl space-y-6">
        
        {/* Step 1: Pick Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white">1</span>
              Select Available Ingredients
            </h3>
            <span className="text-[11px] font-medium text-white/40">
              {selectedIngredients.length} selected
            </span>
          </div>

          {loadingPantry ? (
            <div className="py-6 flex items-center justify-center text-white/30 text-xs">
              Loading your pantry...
            </div>
          ) : pantryItems.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <p className="text-xs font-semibold text-white/80">Your pantry is empty</p>
                <p className="text-[11px] text-white/40 mt-0.5">Add items in your Pantry or type custom ingredients below.</p>
              </div>
              <Link
                to="/app/pantry"
                className="px-4 py-1.5 rounded-full bg-white text-black font-bold text-[11px] uppercase tracking-wider hover:bg-white/90 transition-all shrink-0"
              >
                Stock Pantry
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pantryItems.map(item => {
                const isSelected = selectedIngredients.includes(item.name);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleIngredient(item.name)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all flex items-center gap-2 ${
                      isSelected
                        ? "bg-white text-black border-white shadow-sm font-bold"
                        : "bg-white/[0.03] text-white/60 border-white/[0.06] hover:text-white hover:border-white/20"
                    }`}
                  >
                    <span>{item.name}</span>
                    <span className={`text-[10px] ${isSelected ? "text-black/60 font-semibold" : "text-white/40"}`}>
                      ({item.quantity} {item.unit})
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Add custom ingredient form */}
          <form onSubmit={handleAddCustomIngredient} className="mt-3 flex items-center gap-2 max-w-md">
            <input
              type="text"
              placeholder="+ Add any extra ingredient (e.g. Sriracha, Mayo, Maggi)..."
              value={customIngredient}
              onChange={(e) => setCustomIngredient(e.target.value)}
              className="flex-1 h-9 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-all"
            />
            <button
              type="submit"
              disabled={!customIngredient.trim()}
              className="h-9 px-3 rounded-xl bg-white/[0.06] text-white/80 hover:text-white text-xs font-semibold disabled:opacity-30 border border-white/[0.08] transition-all"
            >
              Add
            </button>
          </form>
        </div>

        {/* Step 2: Pick Cooking Method */}
        <div className="border-t border-white/[0.06] pt-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white">2</span>
            Hostel Cooking Gear
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {COOKING_METHODS.map(method => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[64px] ${
                    isSelected
                      ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                      : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:border-white/15"
                  }`}
                >
                  <Icon className="w-4 h-4 mb-2" />
                  <span className="text-xs font-bold tracking-tight">{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Trigger Action & Synergy Settings */}
        <div className="border-t border-white/[0.06] pt-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-xs text-white/40 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>Goal: <strong className="text-white capitalize">{userProfile?.goal?.replace(/_/g, " ") || "Balanced Nutrition"}</strong></span>
            </div>

            <button
              type="button"
              onClick={() => setAutoDeductPantry(!autoDeductPantry)}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all flex items-center gap-2 self-start ${
                autoDeductPantry
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/60"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Auto-deduct Pantry: <strong>{autoDeductPantry ? "ON" : "OFF"}</strong></span>
            </button>
          </div>

          <button
            onClick={handleGenerateRecipes}
            disabled={generating || selectedIngredients.length === 0}
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-white/90 active:scale-[0.98] disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                <span>Cooking with Compass AI...</span>
              </>
            ) : (
              <>
                <ChefHat className="w-4 h-4" />
                <span>Generate Hostel Recipes</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Generated Recipes Grid */}
      {recipes.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight font-sans">
              Suggested High-Protein Recipes
            </h2>
            <span className="text-xs font-semibold text-white/40">
              {recipes.length} recipes created
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recipes.map(recipe => {
              const impacts = getRecipePantryImpact(recipe.ingredients, pantryItems);
              return (
              <div
                key={recipe.id}
                className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 flex flex-col justify-between hover:border-white/15 transition-all shadow-xl"
              >
                <div>
                  {/* Badge Pills */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {recipe.time}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-white/60 uppercase tracking-wider">
                      {recipe.method}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-white/60 uppercase tracking-wider">
                      {recipe.difficulty}
                    </span>
                  </div>

                  {/* Recipe Title */}
                  <h3 className="text-base font-extrabold text-white tracking-tight font-sans mb-3 leading-snug">
                    {recipe.title}
                  </h3>

                  {/* Macros Row */}
                  <div className="grid grid-cols-4 gap-1 p-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] mb-4 text-center">
                    <div>
                      <div className="text-sm font-extrabold text-white font-sans tracking-tight">
                        {recipe.macros.calories}
                      </div>
                      <div className="text-[9px] font-bold text-white/35 uppercase">Kcal</div>
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-orange-400 font-sans tracking-tight">
                        {recipe.macros.protein}g
                      </div>
                      <div className="text-[9px] font-bold text-white/35 uppercase">Protein</div>
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-cyan-400 font-sans tracking-tight">
                        {recipe.macros.carbs}g
                      </div>
                      <div className="text-[9px] font-bold text-white/35 uppercase">Carbs</div>
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-amber-400 font-sans tracking-tight">
                        {recipe.macros.fats}g
                      </div>
                      <div className="text-[9px] font-bold text-white/35 uppercase">Fat</div>
                    </div>
                  </div>

                  {/* Ingredients with Pantry Stock Impact */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      <span>Ingredients</span>
                      <span className="text-white/30 lowercase">pantry stock</span>
                    </div>
                    <ul className="text-xs text-white/70 space-y-1.5">
                      {impacts.map((imp, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-2 py-0.5 border-b border-white/[0.02] last:border-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-orange-400 font-bold">•</span>
                            <span className="truncate">{imp.ingredientStr}</span>
                          </div>
                          {imp.matchedItem ? (
                            imp.willDeplete ? (
                              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Depletes</span>
                              </span>
                            ) : imp.willBeLowStock || imp.statusAfter === "low_stock" ? (
                              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Low ({imp.remainingQuantity} {imp.matchedItem.unit})</span>
                              </span>
                            ) : (
                              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400/90 border border-emerald-500/20 font-medium">
                                ✓ {imp.remainingQuantity} {imp.matchedItem.unit} left
                              </span>
                            )
                          ) : (
                            <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] text-white/35 border border-white/[0.06]">
                              not stocked
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Step Instructions */}
                  <div className="space-y-1.5 mb-4">
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      Instructions
                    </div>
                    <ol className="text-xs text-white/70 space-y-1.5">
                      {recipe.instructions.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[10px] font-bold text-white/30 shrink-0 mt-0.5">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Hostel Hack */}
                  {recipe.hostelHack && (
                    <div className="p-3 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 text-amber-300 text-xs mb-4 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-bold text-[10px] uppercase tracking-wider block text-amber-400">Hostel Hack</span>
                        <p className="text-[11px] text-amber-200/80 leading-relaxed mt-0.5">{recipe.hostelHack}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Log Meal Button */}
                <div className="pt-3 border-t border-white/[0.06]">
                  {loggedStatus[recipe.id] ? (
                    <div className="w-full py-2.5 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 text-center">
                      <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                      <span className="truncate">{loggedStatus[recipe.id]}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleLogMeal(recipe)}
                      disabled={loggingRecipeId === recipe.id}
                      className="w-full py-2.5 rounded-full bg-white/[0.06] hover:bg-white text-white hover:text-black font-bold text-xs uppercase tracking-wider border border-white/[0.1] hover:border-transparent transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
                    >
                      {loggingRecipeId === recipe.id ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          <span>Logging...</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Log to Today's Meals</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>
              );
            })}
          </div>

          {/* Restock Alert Banner */}
          {restockAlertItems && restockAlertItems.length > 0 && (
            <div className="rounded-3xl bg-amber-500/[0.08] border border-amber-500/20 p-5 mt-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      <span>Pantry Restock Alert</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {restockAlertItems.length} item{restockAlertItems.length > 1 ? "s" : ""} low
                      </span>
                    </h3>
                    <p className="text-xs text-white/50 mt-1">
                      Cooking your meal left these essentials low or depleted:
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {restockAlertItems.map(item => (
                        <span
                          key={item.id}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                            item.quantity <= 0
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                          }`}
                        >
                          <span>{item.name}</span>
                          <span className="text-[10px] opacity-75">
                            ({item.quantity} {item.unit} left • {item.quantity <= 0 ? "Depleted" : "Low"})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {addedToGroceries ? (
                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Added to Groceries</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleAddLowStockToGroceries}
                      disabled={addingToGroceries}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-white/90 active:scale-[0.98] transition-all shadow-md disabled:opacity-40"
                    >
                      {addingToGroceries ? (
                        <>
                          <div className="w-3 h-3 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Add to Grocery List</span>
                        </>
                      )}
                    </button>
                  )}

                  <Link
                    to="/app/groceries"
                    className="p-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
                    title="View Groceries"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
