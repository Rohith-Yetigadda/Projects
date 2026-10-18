import { useState, useEffect, useRef } from "react";
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
  CheckCircle2,
  X,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react";
import type { PantryItem, StockStatus } from "./Pantry";
import { getStockStatus } from "./Pantry";
import { getRecipePantryImpact, applyPantryDeductions, type PantryDeduction } from "@/lib/pantryDeduction";
import { setCachedData } from "@/lib/dataCache";

type Recipe = {
  id: string;
  title: string;
  tag?: string;
  time: string;
  method: string;
  difficulty: string;
  gearSettings?: string;
  ingredients: string[];
  pantryDeductions?: PantryDeduction[];
  instructions: string[];
  hostelHack: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
};

const STANDARD_COOKING_METHODS = [
  { id: "any", label: "Any (Hostel)", icon: Zap },
  { id: "induction", label: "Induction Cooktop", icon: Flame },
  { id: "microwave", label: "Microwave", icon: Flame },
  { id: "kettle", label: "Electric Kettle", icon: Flame },
  { id: "sandwich_toaster", label: "Sandwich Toaster / Grill", icon: Flame },
  { id: "pan_tawa", label: "Pan / Tawa", icon: Flame },
  { id: "air_fryer", label: "Air Fryer", icon: Zap },
  { id: "no-cook", label: "No-Cook / Shake", icon: Sparkles },
];

export type CookingSkillLevel = "beginner" | "intermediate" | "masterchef";

const COOKING_SKILL_LEVELS = [
  {
    id: "beginner" as CookingSkillLevel,
    label: "Beginner / Zero-Effort",
    subtitle: "Foolproof 1-kettle / 1-bowl recipes, dump & heat, minimal prep",
    badge: "5-8 mins • Zero skill needed",
    icon: Flame,
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10"
  },
  {
    id: "intermediate" as CookingSkillLevel,
    label: "Intermediate / Comfortable",
    subtitle: "Standard pan/induction cooking, sautéing, balanced seasoning",
    badge: "10-15 mins • Standard cooking",
    icon: ChefHat,
    color: "text-orange-400",
    border: "border-orange-500/30",
    bg: "bg-orange-500/10"
  },
  {
    id: "masterchef" as CookingSkillLevel,
    label: "Hostel Masterchef",
    subtitle: "Complex flavor layering, gourmet hacks, restaurant-style textures",
    badge: "15-25 mins • Gourmet creativity",
    icon: Sparkles,
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10"
  }
];

export default function Cook() {
  const { currentUser, userProfile } = useAuth();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [customIngredient, setCustomIngredient] = useState("");
  
  // Equipment & Skill States
  const [selectedMethods, setSelectedMethods] = useState<string[]>(["any"]);
  const [customGearList, setCustomGearList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("recompass_custom_gear");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newCustomGear, setNewCustomGear] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<CookingSkillLevel>("intermediate");
  
  const [loadingPantry, setLoadingPantry] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    try {
      const saved = localStorage.getItem("recompass_generated_recipes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>(() => {
    try {
      const saved = localStorage.getItem("recompass_saved_recipes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeRecipeTab, setActiveRecipeTab] = useState<"generated" | "saved">("generated");
  const [activeMobileCardIndex, setActiveMobileCardIndex] = useState(0);
  const [mobileViewMode, setMobileViewMode] = useState<"carousel" | "list">("carousel");
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({});

  const recipesSectionRef = useRef<HTMLDivElement>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Synergy States: Auto-deduct & Low-Stock Alerts
  const [autoDeductPantry, setAutoDeductPantry] = useState(true);
  const [restockAlertItems, setRestockAlertItems] = useState<{ id: string; name: string; quantity: number; unit: string; category: string; status: StockStatus }[] | null>(null);
  const [addedToGroceries, setAddedToGroceries] = useState(false);
  const [addingToGroceries, setAddingToGroceries] = useState(false);

  // Meal logging states
  const [loggingRecipeId, setLoggingRecipeId] = useState<string | null>(null);
  const [loggedStatus, setLoggedStatus] = useState<{ [recipeId: string]: string }>({});

  // Recipe helpers: save for later, expand steps, clear
  const toggleSaveRecipe = (recipe: Recipe) => {
    setSavedRecipes(prev => {
      const exists = prev.some(r => r.id === recipe.id || r.title.toLowerCase() === recipe.title.toLowerCase());
      let updated: Recipe[];
      if (exists) {
        updated = prev.filter(r => r.id !== recipe.id && r.title.toLowerCase() !== recipe.title.toLowerCase());
      } else {
        updated = [recipe, ...prev];
      }
      try {
        localStorage.setItem("recompass_saved_recipes", JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to persist saved recipes", e);
      }
      return updated;
    });
  };

  const isRecipeSaved = (recipeId: string, title: string) => {
    return savedRecipes.some(r => r.id === recipeId || r.title.toLowerCase() === title.toLowerCase());
  };

  const toggleInstructions = (recipeId: string) => {
    setExpandedInstructions(prev => ({
      ...prev,
      [recipeId]: !prev[recipeId]
    }));
  };

  const handleClearGeneratedRecipes = () => {
    setRecipes([]);
    try {
      localStorage.removeItem("recompass_generated_recipes");
    } catch {}
  };

  const scrollToRecipeIndex = (index: number) => {
    setActiveMobileCardIndex(index);
    if (carouselContainerRef.current) {
      const container = carouselContainerRef.current;
      const cards = container.querySelectorAll<HTMLElement>("[data-recipe-card]");
      if (cards[index]) {
        cards[index].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  };

  const handleCarouselScroll = () => {
    if (!carouselContainerRef.current) return;
    const container = carouselContainerRef.current;
    const cards = container.querySelectorAll<HTMLElement>("[data-recipe-card]");
    if (!cards || cards.length === 0) return;
    const containerCenter = container.getBoundingClientRect().left + container.offsetWidth / 2;
    let closestIndex = 0;
    let closestDist = Infinity;
    cards.forEach((card, idx) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const dist = Math.abs(containerCenter - cardCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = idx;
      }
    });
    setActiveMobileCardIndex(closestIndex);
  };

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

  const handleSelectAll = () => {
    setSelectedIngredients(pantryItems.map(i => i.name));
  };

  const handleDeselectAll = () => {
    setSelectedIngredients([]);
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

  // Cooking Method Selection & Custom Gear Handlers
  const toggleMethod = (id: string) => {
    if (id === "any") {
      setSelectedMethods(["any"]);
      return;
    }
    const withoutAny = selectedMethods.filter(m => m !== "any");
    if (withoutAny.includes(id)) {
      const remaining = withoutAny.filter(m => m !== id);
      setSelectedMethods(remaining.length === 0 ? ["any"] : remaining);
    } else {
      setSelectedMethods([...withoutAny, id]);
    }
  };

  const handleAddCustomGear = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCustomGear.trim();
    if (!trimmed) return;
    if (!customGearList.includes(trimmed)) {
      const updated = [...customGearList, trimmed];
      setCustomGearList(updated);
      try { localStorage.setItem("recompass_custom_gear", JSON.stringify(updated)); } catch {}
      const withoutAny = selectedMethods.filter(m => m !== "any");
      setSelectedMethods([...withoutAny, trimmed]);
    }
    setNewCustomGear("");
  };

  const handleRemoveCustomGear = (gear: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customGearList.filter(g => g !== gear);
    setCustomGearList(updated);
    try { localStorage.setItem("recompass_custom_gear", JSON.stringify(updated)); } catch {}
    const remainingSelected = selectedMethods.filter(m => m !== gear);
    setSelectedMethods(remainingSelected.length === 0 ? ["any"] : remainingSelected);
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
      const effectiveMethods = selectedMethods.includes("any")
        ? ["any standard hostel equipment", ...customGearList]
        : selectedMethods;

      // Prepare detailed pantry inventory for Gemini so it knows the exact units (g, ml, pcs, packs, jar)
      const selectedPantryData = selectedIngredients.map(name => {
        const found = pantryItems.find(p => p.name.toLowerCase() === name.toLowerCase());
        return found
          ? { id: found.id, name: found.name, quantity: found.quantity, unit: found.unit, category: found.category }
          : { id: name, name, quantity: 1, unit: "pcs", category: "Other" };
      });

      const res = await fetch("/api/compass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_recipes",
          payload: {
            ingredients: selectedIngredients,
            pantryItems: selectedPantryData,
            goal: userProfile?.goal || "high protein nutrition",
            methods: effectiveMethods,
            skillLevel: selectedSkill
          }
        })
      });

      const data = await res.json();

      let received: Recipe[] = [];
      if (Array.isArray(data)) {
        received = data;
      } else if (data.recipes && Array.isArray(data.recipes)) {
        received = data.recipes;
      } else {
        throw new Error("Invalid recipe format returned from AI.");
      }

      setRecipes(received);
      setActiveRecipeTab("generated");
      setActiveMobileCardIndex(0);
      try {
        localStorage.setItem("recompass_generated_recipes", JSON.stringify(received));
      } catch (err) {
        console.warn("Failed to persist recipes to localStorage:", err);
      }

      // Auto-scroll down to first row of generated recipes
      setTimeout(() => {
        recipesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
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
        const impacts = getRecipePantryImpact(recipe.ingredients, pantryItems, recipe.pantryDeductions);
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-semibold text-white/50 hover:text-white transition-colors"
              >
                Select All
              </button>
              <span className="text-white/20">•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-[11px] font-semibold text-white/50 hover:text-white transition-colors"
              >
                Clear
              </button>
              <span className="text-[11px] font-medium text-orange-400/80 ml-1">
                ({selectedIngredients.length} selected)
              </span>
            </div>
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
                    type="button"
                    onClick={() => toggleIngredient(item.name)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all flex items-center gap-2 ${
                      isSelected
                        ? "bg-orange-500/15 border-orange-500/40 text-white font-semibold shadow-[0_0_12px_rgba(249,115,22,0.15)] hover:bg-orange-500/20"
                        : "bg-white/[0.02] text-white/50 border-white/[0.06] hover:text-white/80 hover:border-white/15"
                    }`}
                  >
                    <span>{item.name}</span>
                    <span className={`text-[10px] font-mono ${isSelected ? "text-orange-300/80 font-medium" : "text-white/35"}`}>
                      ({item.quantity} {item.unit})
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-orange-400 stroke-[3]" />}
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

        {/* Step 2: Hostel Cooking Gear + Custom Appliances */}
        <div className="border-t border-white/[0.06] pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white">2</span>
              Hostel Cooking Gear
            </h3>
            <span className="text-[11px] font-medium text-white/40">
              {selectedMethods.includes("any")
                ? customGearList.length > 0
                  ? `Any gear allowed (includes ${customGearList.length} custom)`
                  : "Any gear allowed"
                : `${selectedMethods.length} gear selected`}
            </span>
          </div>

          {/* Preset Gear Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STANDARD_COOKING_METHODS.map(method => {
              const Icon = method.icon;
              const isSelected = selectedMethods.includes(method.id);
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => toggleMethod(method.id)}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[66px] ${
                    isSelected
                      ? "bg-orange-500/15 border-orange-500/40 text-orange-300 shadow-[0_0_12px_rgba(249,115,22,0.12)]"
                      : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="w-4 h-4" />
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </div>
                  <span className="text-xs font-bold tracking-tight mt-2">{method.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Gear Chips & Input */}
          <div className="mt-3.5 pt-3 border-t border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Custom / Dorm Appliances</span>
            </div>

            {customGearList.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2.5">
                {customGearList.map(gear => {
                  const isDirectlySelected = selectedMethods.includes(gear);
                  const isAnySelected = selectedMethods.includes("any");
                  const isActive = isDirectlySelected || isAnySelected;
                  return (
                    <button
                      key={gear}
                      type="button"
                      onClick={() => toggleMethod(gear)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${
                        isDirectlySelected
                          ? "bg-orange-500/15 border-orange-500/40 text-orange-200"
                          : isAnySelected
                          ? "bg-orange-500/10 border-orange-500/25 text-orange-300/80 hover:bg-orange-500/20"
                          : "bg-white/[0.02] text-white/50 border-white/[0.06] hover:text-white"
                      }`}
                      title={isAnySelected ? `Auto-included in 'Any' (click to isolate)` : `Click to select`}
                    >
                      <span>{gear}</span>
                      {isActive && <Check className="w-3 h-3 text-orange-400 stroke-[3]" />}
                      <span
                        onClick={(e) => handleRemoveCustomGear(gear, e)}
                        className="ml-1 text-white/30 hover:text-rose-400 transition-colors p-0.5"
                        title="Remove custom gear"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <form onSubmit={handleAddCustomGear} className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                placeholder="+ Add custom gear (e.g. Rice Cooker, Hot Plate, Egg Boiler)..."
                value={newCustomGear}
                onChange={(e) => setNewCustomGear(e.target.value)}
                className="flex-1 h-9 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-all"
              />
              <button
                type="submit"
                disabled={!newCustomGear.trim()}
                className="h-9 px-3.5 rounded-xl bg-white/[0.06] text-white/80 hover:text-white text-xs font-semibold disabled:opacity-30 border border-white/[0.08] transition-all shrink-0"
              >
                Add Gear
              </button>
            </form>
          </div>
        </div>

        {/* Step 3: Cooking Skill Level */}
        <div className="border-t border-white/[0.06] pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white">3</span>
              Your Cooking Skill & Effort Level
            </h3>
            <span className="text-[11px] font-medium text-white/40">
              Personalizes recipe prep & techniques
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {COOKING_SKILL_LEVELS.map(skill => {
              const Icon = skill.icon;
              const isSelected = selectedSkill === skill.id;
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => setSelectedSkill(skill.id)}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? `${skill.bg} ${skill.border} shadow-[0_0_15px_rgba(249,115,22,0.1)]`
                      : "bg-white/[0.02] border-white/[0.06] hover:border-white/15"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                        isSelected ? `${skill.bg} ${skill.border}` : "bg-white/[0.03] border-white/[0.06]"
                      }`}>
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? skill.color : "text-white/40"}`} />
                      </div>
                      <span className={`text-xs font-bold tracking-tight ${isSelected ? "text-white" : "text-white/70"}`}>
                        {skill.label}
                      </span>
                    </div>
                    {isSelected && <Check className={`w-4 h-4 ${skill.color}`} strokeWidth={2.5} />}
                  </div>

                  <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                    {skill.subtitle}
                  </p>

                  <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border self-start ${
                    isSelected ? `${skill.bg} ${skill.border} ${skill.color}` : "bg-white/[0.02] border-white/[0.06] text-white/35"
                  }`}>
                    {skill.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Trigger Action & Synergy Settings */}
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
                <span>Generating Recipes...</span>
              </>
            ) : (
              <>
                <ChefHat className="w-4 h-4" />
                <span>Generate Recipes</span>
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

      {/* Generated & Saved Recipes Section */}
      {(recipes.length > 0 || savedRecipes.length > 0) && (
        <div ref={recipesSectionRef} className="space-y-4 pt-4 scroll-mt-6">
          {/* Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setActiveRecipeTab("generated");
                  setActiveMobileCardIndex(0);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeRecipeTab === "generated"
                    ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20"
                    : "bg-white/[0.04] text-white/60 hover:text-white border border-white/[0.06]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generated Recipes ({recipes.length})</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setActiveRecipeTab("saved");
                  setActiveMobileCardIndex(0);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeRecipeTab === "saved"
                    ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20"
                    : "bg-white/[0.04] text-white/60 hover:text-white border border-white/[0.06]"
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Saved for Later ({savedRecipes.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {/* Mobile View Mode Toggle */}
              <div className="flex md:hidden items-center bg-white/[0.04] p-0.5 rounded-xl border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setMobileViewMode("carousel")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    mobileViewMode === "carousel"
                      ? "bg-orange-500 text-black"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  Swipe
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewMode("list")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    mobileViewMode === "list"
                      ? "bg-orange-500 text-black"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  List
                </button>
              </div>

              {activeRecipeTab === "generated" && recipes.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearGeneratedRecipes}
                  className="text-[11px] text-white/40 hover:text-rose-400 transition-colors flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/[0.06] hover:border-rose-500/30"
                  title="Clear current generated recipes"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Subheader info */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight font-sans">
                {activeRecipeTab === "generated" ? "Suggested High-Protein Recipes" : "Your Saved Cookbook"}
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                {activeRecipeTab === "generated"
                  ? `Tailored for ${selectedSkill.toUpperCase()} skill • ${selectedMethods.includes("any") ? "All hostel & dorm gear" : selectedMethods.join(", ")}`
                  : "Meals you bookmarked to cook again anytime"}
              </p>
            </div>
          </div>

          {/* If Saved tab is selected but empty */}
          {activeRecipeTab === "saved" && savedRecipes.length === 0 && (
            <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-8 text-center max-w-md mx-auto my-6">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto mb-3">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">No Saved Recipes Yet</h3>
              <p className="text-xs text-white/50 leading-relaxed mb-4">
                Tap the bookmark icon on any recipe to save it here for later. You can access and log your favorite meals anytime!
              </p>
              {recipes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveRecipeTab("generated")}
                  className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white text-white hover:text-black font-bold text-xs transition-all border border-white/10"
                >
                  Browse Generated Recipes
                </button>
              )}
            </div>
          )}

          {/* If Generated tab is empty */}
          {activeRecipeTab === "generated" && recipes.length === 0 && (
            <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-8 text-center max-w-md mx-auto my-6">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto mb-3">
                <ChefHat className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">No Recipes Generated Yet</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Select your ingredients above and tap "Generate Recipes" to create custom high-protein hostel meals.
              </p>
            </div>
          )}

          {/* Mobile Recipe Carousel Navigator (shows when carousel mode is active on mobile) */}
          {((activeRecipeTab === "generated" && recipes.length > 0) || (activeRecipeTab === "saved" && savedRecipes.length > 0)) && (
            <div className={`md:hidden ${mobileViewMode === "carousel" ? "flex" : "hidden"} items-center justify-between bg-white/[0.02] border border-white/[0.06] p-2 rounded-2xl`}>
              <button
                type="button"
                onClick={() => scrollToRecipeIndex(Math.max(0, activeMobileCardIndex - 1))}
                disabled={activeMobileCardIndex === 0}
                className="p-1.5 rounded-xl bg-white/[0.04] text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {(activeRecipeTab === "generated" ? recipes : savedRecipes).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToRecipeIndex(idx)}
                    className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center shrink-0 ${
                      activeMobileCardIndex === idx
                        ? "bg-orange-500 text-black scale-110 shadow-sm"
                        : "bg-white/[0.04] text-white/40 hover:text-white"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const maxIdx = (activeRecipeTab === "generated" ? recipes : savedRecipes).length - 1;
                  scrollToRecipeIndex(Math.min(maxIdx, activeMobileCardIndex + 1));
                }}
                disabled={activeMobileCardIndex >= (activeRecipeTab === "generated" ? recipes : savedRecipes).length - 1}
                className="p-1.5 rounded-xl bg-white/[0.04] text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Recipes Display: Desktop Grid + Mobile Swipeable Carousel or List */}
          {((activeRecipeTab === "generated" && recipes.length > 0) || (activeRecipeTab === "saved" && savedRecipes.length > 0)) && (
            <div
              ref={carouselContainerRef}
              onScroll={handleCarouselScroll}
              className={
                mobileViewMode === "carousel"
                  ? "flex md:grid md:grid-cols-3 overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar scroll-smooth -mx-4 px-4 md:mx-0 md:px-0"
                  : "grid grid-cols-1 md:grid-cols-3 gap-4"
              }
            >
              {(activeRecipeTab === "generated" ? recipes : savedRecipes).map(recipe => {
                const impacts = getRecipePantryImpact(recipe.ingredients, pantryItems, recipe.pantryDeductions);
                const saved = isRecipeSaved(recipe.id, recipe.title);
                const isExpanded = expandedInstructions[recipe.id] ?? false;

                return (
                  <div
                    key={recipe.id}
                    data-recipe-card
                    id={`recipe-card-${recipe.id}`}
                    className={`rounded-3xl bg-[#121418] border border-white/[0.06] p-5 flex flex-col justify-between hover:border-white/15 transition-all shadow-xl ${
                      mobileViewMode === "carousel"
                        ? "w-[86vw] max-w-[360px] sm:w-[75vw] md:w-auto md:max-w-none shrink-0 snap-center"
                        : ""
                    }`}
                  >
                    <div>
                      {/* Header: Badge Pills + Save for Later Button */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {recipe.tag && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                              {recipe.tag}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {recipe.time}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-white/60 uppercase tracking-wider">
                            {recipe.method}
                          </span>
                        </div>

                        {/* Save for Later Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSaveRecipe(recipe);
                          }}
                          className={`p-2 rounded-xl border transition-all shrink-0 ${
                            saved
                              ? "bg-orange-500/15 border-orange-500/40 text-orange-400 shadow-sm shadow-orange-500/10"
                              : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white hover:border-white/20"
                          }`}
                          title={saved ? "Saved to your cookbook" : "Save for later"}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-orange-400" : ""}`} />
                        </button>
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

                      {/* Collapsible Step-by-Step Instructions */}
                      <div className="space-y-1.5 mb-4">
                        <button
                          type="button"
                          onClick={() => toggleInstructions(recipe.id)}
                          className="w-full flex items-center justify-between text-[10px] font-bold text-white/50 uppercase tracking-widest hover:text-white/80 transition-colors py-1 group"
                        >
                          <span className="flex items-center gap-1.5">
                            <span>Instructions ({recipe.instructions.length} steps)</span>
                            <span className="text-[9px] lowercase font-normal text-white/30 group-hover:text-white/50">
                              {isExpanded ? "(collapse)" : "(tap to expand)"}
                            </span>
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-white/40" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                          )}
                        </button>

                        {isExpanded ? (
                          <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                            <ol className="text-xs text-white/70 space-y-2">
                              {recipe.instructions.map((step, idx) => (
                                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                                  <span className="text-[10px] font-bold text-white/30 shrink-0 mt-0.5">{idx + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>

                            {recipe.hostelHack && (
                              <div className="p-3 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                                <Lightbulb className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                                <div className="min-w-0">
                                  <span className="font-bold text-[10px] uppercase tracking-wider block text-amber-400">Hostel Hack</span>
                                  <p className="text-[11px] text-amber-200/80 leading-relaxed mt-0.5">{recipe.hostelHack}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={() => toggleInstructions(recipe.id)}
                            className="text-[11px] text-white/40 hover:text-white/70 cursor-pointer line-clamp-2 italic bg-white/[0.02] p-2.5 rounded-2xl border border-white/[0.04] transition-colors"
                          >
                            1. {recipe.instructions[0]} <span className="text-orange-400/80 font-normal">→ view all steps</span>
                          </div>
                        )}
                      </div>
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
          )}

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
