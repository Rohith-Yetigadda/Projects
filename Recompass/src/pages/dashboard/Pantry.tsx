import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import {
  Package,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ChefHat,
  Search,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check
} from "lucide-react";
import { classifyFoodWithAI, FOOD_CATEGORIES } from "@/lib/geminiClassifier";

export type PantryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold?: number;
  updatedAt?: string;
};

export type StockStatus = "in_stock" | "low_stock" | "depleted";

/**
 * Universal, unit-aware stock status evaluation.
 * Evaluates mathematically by unit context.
 */
export function getStockStatus(item: PantryItem): StockStatus {
  const qty = Number(item.quantity) || 0;
  if (qty <= 0) return "depleted";

  const unit = (item.unit || "").toLowerCase().trim();
  const category = (item.category || "").toLowerCase().trim();

  // If user set an explicit custom threshold on this item:
  if (item.lowStockThreshold && item.lowStockThreshold > 0) {
    return qty <= item.lowStockThreshold ? "low_stock" : "in_stock";
  }

  // 1. Packaged bulk/containers (jar, bottle, pack, box, tub, can)
  // 1 whole container (e.g. 1 jar of Peanut Butter, 1 bottle of oil, 1 pack of bread) is fully in stock.
  if (["jar", "bottle", "pack", "packs", "box", "boxes", "tub", "can", "cans"].includes(unit)) {
    return "in_stock";
  }

  // 2. Spices: Indian hostel/dorm spice packets are small 10-15rs sachets (20g-50g)
  // Low on stock only when nearly finished (<= 15g, or <= 0.015kg)
  if (category === "spices") {
    if (unit === "g") {
      return qty <= 15 ? "low_stock" : "in_stock";
    }
    if (unit === "kg") {
      return qty <= 0.015 ? "low_stock" : "in_stock";
    }
    return qty <= 1 ? "low_stock" : "in_stock";
  }

  // 3. Measured weight/volume: (g, kg, ml, l) for staples
  if (unit === "g") {
    return qty <= 50 ? "low_stock" : "in_stock";
  }
  if (unit === "kg" || unit === "l") {
    return qty < 0.2 ? "low_stock" : "in_stock";
  }
  if (unit === "ml") {
    return qty <= 100 ? "low_stock" : "in_stock";
  }

  // 4. Portions / Scoops: (scoop, scoops, serving, servings)
  if (["scoop", "scoops", "serving", "servings"].includes(unit)) {
    return qty <= 2 ? "low_stock" : "in_stock";
  }

  // 5. Counted individual pieces: (pcs, eggs, bananas, etc.)
  // Only low when down to the final single piece
  if (qty <= 1) {
    return "low_stock";
  }

  return "in_stock";
}

/**
 * Smart, unit-aware stepper increment.
 * e.g. 10g for spices, 50g for grams, 100ml for liquids, 1 for discrete items (scoop, pcs, jar, pack).
 */
export function getSmartStep(unit: string, category?: string): number {
  const u = (unit || "").toLowerCase().trim();
  const c = (category || "").toLowerCase().trim();
  if (c === "spices" && u === "g") return 10;
  if (u === "g") return 50;
  if (u === "ml") return 100;
  if (u === "kg" || u === "l") return 0.25;
  return 1;
}

const CATEGORIES = [
  "All",
  ...FOOD_CATEGORIES
];

const getCategoryColor = (cat: string) => {
  switch (cat) {
    case "Protein": return "text-orange-400 bg-orange-400/10 border-orange-400/20";
    case "Produce": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "Dairy": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "Snacks": return "text-rose-400 bg-rose-400/10 border-rose-400/20";
    case "Supplements": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
    case "Grains": return "text-yellow-200 bg-yellow-200/10 border-yellow-200/20";
    case "Spices": return "text-orange-300 bg-orange-300/10 border-orange-300/20";
    case "Oils": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    default: return "text-white/60 bg-white/5 border-white/10";
  }
};

const STARTER_STASH: Omit<PantryItem, "id">[] = [
  { name: "Eggs", category: "Protein", quantity: 6, unit: "pcs" },
  { name: "Peanut Butter", category: "Snacks", quantity: 1, unit: "jar" },
  { name: "Rolled Oats", category: "Grains", quantity: 500, unit: "g" },
  { name: "Whey Protein", category: "Supplements", quantity: 15, unit: "scoops" },
  { name: "Milk", category: "Dairy", quantity: 2, unit: "packs" },
  { name: "Bananas", category: "Produce", quantity: 4, unit: "pcs" },
];

export default function Pantry() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  
  // Direct quantity editing state
  const [editingQuantities, setEditingQuantities] = useState<{ [id: string]: string }>({});
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "quantity" | "category">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // New Item State
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newUnit, setNewUnit] = useState("pcs");

  // Notification Toast / Message
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Fetch Pantry from Firestore & Auto-Reclassify any legacy "Other" items with Gemini
  useEffect(() => {
    if (!currentUser) return;
    const fetchPantry = async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid, "pantry", "current"));
        if (snap.exists()) {
          const loaded: PantryItem[] = snap.data().items || [];
          setItems(loaded);

          // Auto-classify any items previously stuck in "Other" (e.g. Chilli Powder)
          const otherItems = loaded.filter(i => i.category === "Other");
          if (otherItems.length > 0) {
            let hasChanges = false;
            const fixed = await Promise.all(
              loaded.map(async (item) => {
                if (item.category === "Other") {
                  const aiResult = await classifyFoodWithAI(item.name, item.quantity, item.unit);
                  if (aiResult && aiResult.category !== "Other") {
                    hasChanges = true;
                    return { ...item, category: aiResult.category };
                  }
                }
                return item;
              })
            );

            if (hasChanges) {
              setItems(fixed);
              await updateDoc(doc(db, "users", currentUser.uid, "pantry", "current"), {
                items: fixed,
                lastUpdated: new Date().toISOString()
              });
            }
          }
        } else {
          await setDoc(doc(db, "users", currentUser.uid, "pantry", "current"), {
            items: [],
            lastUpdated: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("Error fetching pantry:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPantry();
  }, [currentUser]);

  // Save to Firestore
  const savePantry = async (newItems: PantryItem[]) => {
    setItems(newItems);
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid, "pantry", "current"), {
        items: newItems,
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error saving pantry:", err);
    }
  };

  // Add Item Handler with Gemini Flash AI Classifier
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setAddingItem(true);
    const fallbackQty = Math.max(0, parseFloat(newQuantity) || 1);
    
    // AI Classification (handles any typo, language, brand, or regional spice/dish)
    const parsed = await classifyFoodWithAI(newName, fallbackQty, newUnit);

    const existingIndex = items.findIndex(
      i => i.name.toLowerCase() === parsed.name.toLowerCase()
    );

    let updated: PantryItem[];
    if (existingIndex >= 0) {
      updated = items.map((item, idx) => 
        idx === existingIndex 
          ? { ...item, quantity: item.quantity + parsed.quantity, category: parsed.category, updatedAt: new Date().toISOString() }
          : item
      );
      showNotification(`Added +${parsed.quantity} ${parsed.unit} to ${items[existingIndex].name}`);
    } else {
      const newItem: PantryItem = {
        id: Date.now().toString(),
        name: parsed.name,
        category: parsed.category,
        quantity: parsed.quantity,
        unit: parsed.unit,
        updatedAt: new Date().toISOString()
      };
      updated = [newItem, ...items];
      showNotification(`Added "${newItem.name}" (${parsed.quantity} ${parsed.unit}) • ${parsed.category}`);
    }

    savePantry(updated);
    setNewName("");
    setNewQuantity("1");
    setAddingItem(false);
  };

  // Adjust Quantity via Steppers
  const handleAdjustQuantity = (id: string, delta: number) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const nextQty = Math.max(0, Math.round((item.quantity + delta) * 100) / 100);
        return { ...item, quantity: nextQty, updatedAt: new Date().toISOString() };
      }
      return item;
    });
    savePantry(updated);
  };

  // Direct Input Quantity Change (while user is typing)
  const handleQuantityInputChange = (id: string, value: string) => {
    setEditingQuantities(prev => ({ ...prev, [id]: value }));
  };

  // Direct Input Quantity Save (on blur or enter)
  const handleQuantityInputBlur = (id: string) => {
    const val = editingQuantities[id];
    if (val === undefined) return;
    const parsed = Math.max(0, parseFloat(val) || 0);
    const updated = items.map(item => item.id === id ? { ...item, quantity: parsed, updatedAt: new Date().toISOString() } : item);
    savePantry(updated);
    setEditingQuantities(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Update Category on direct badge click
  const handleUpdateCategory = (id: string, newCat: string) => {
    const updated = items.map(item => item.id === id ? { ...item, category: newCat, updatedAt: new Date().toISOString() } : item);
    savePantry(updated);
    showNotification(`Category updated to ${newCat}`);
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    const target = items.find(i => i.id === id);
    savePantry(items.filter(i => i.id !== id));
    if (target) showNotification(`Removed ${target.name} from pantry`);
  };

  // Add Item to Groceries
  const handleAddToGroceries = async (item: PantryItem) => {
    if (!currentUser) return;
    try {
      const snap = await getDoc(doc(db, "users", currentUser.uid, "groceries", "current"));
      const currentGroceries = snap.exists() ? (snap.data().items || []) : [];
      
      const exists = currentGroceries.some(
        (g: any) => g.name.toLowerCase() === item.name.toLowerCase() && !g.purchased
      );

      if (exists) {
        showNotification(`"${item.name}" is already on your shopping list!`);
        return;
      }

      const newGrocery = {
        id: Date.now().toString(),
        name: item.name,
        category: item.category,
        purchased: false,
      };

      await updateDoc(doc(db, "users", currentUser.uid, "groceries", "current"), {
        items: [...currentGroceries, newGrocery],
        lastUpdated: new Date().toISOString()
      });

      showNotification(`Added "${item.name}" to Groceries!`);
    } catch (err) {
      console.error("Error adding to groceries:", err);
      showNotification("Failed to add to groceries.");
    }
  };

  // Restock All Low Stock to Groceries
  const handleRestockAllLow = async () => {
    if (!currentUser) return;
    const lowStockItems = items.filter(i => getStockStatus(i) !== "in_stock");
    if (lowStockItems.length === 0) return;

    try {
      const snap = await getDoc(doc(db, "users", currentUser.uid, "groceries", "current"));
      const currentGroceries = snap.exists() ? (snap.data().items || []) : [];

      const toAdd = lowStockItems
        .filter(item => !currentGroceries.some((g: any) => g.name.toLowerCase() === item.name.toLowerCase() && !g.purchased))
        .map(item => ({
          id: (Date.now() + Math.random() * 1000).toString(),
          name: item.name,
          category: item.category,
          purchased: false
        }));

      if (toAdd.length === 0) {
        showNotification("All low-stock items are already in your shopping list.");
        return;
      }

      await updateDoc(doc(db, "users", currentUser.uid, "groceries", "current"), {
        items: [...currentGroceries, ...toAdd],
        lastUpdated: new Date().toISOString()
      });

      showNotification(`Added ${toAdd.length} low-stock item(s) to Groceries!`);
    } catch (err) {
      console.error("Error restocking low items:", err);
    }
  };

  // Load Starter Stash
  const handleLoadStarterStash = () => {
    const initialized: PantryItem[] = STARTER_STASH.map((s, idx) => ({
      ...s,
      id: `${Date.now()}-${idx}`,
      updatedAt: new Date().toISOString()
    }));
    savePantry([...initialized, ...items]);
    showNotification("Loaded Starter Pantry!");
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  // Summary Metrics (Clean & Accurate)
  const lowStockCount = items.filter(i => getStockStatus(i) !== "in_stock").length;
  const proteinCount = items.filter(i => i.category === "Protein" || i.category === "Supplements").length;

  // Filtered & Sorted Items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesLowStock = filterLowStockOnly ? getStockStatus(item) !== "in_stock" : true;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") {
      cmp = a.name.localeCompare(b.name);
    } else if (sortBy === "quantity") {
      cmp = a.quantity - b.quantity;
    } else if (sortBy === "category") {
      cmp = a.category.localeCompare(b.category);
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-28 md:pb-8">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-18 right-4 md:right-8 z-50 px-4 py-2.5 rounded-2xl bg-white text-black font-semibold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
          <span>{notification}</span>
        </div>
      )}

      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-white/50 mb-2.5">
            <Package className="w-3 h-3 text-orange-400" />
            <span>Food & Ingredient Inventory</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tightest font-sans">
            Pantry
          </h1>
          <p className="text-sm font-normal text-white/45 mt-1.5">
            Track your food inventory, protein staples, and ingredients.
          </p>
        </div>

        {/* Clean Header Action Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/app/cook"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/80 text-xs font-bold uppercase tracking-wider hover:bg-white/[0.08] hover:text-white transition-all shadow-sm"
          >
            <ChefHat className="w-3.5 h-3.5 text-orange-400" />
            <span>Cook AI</span>
          </Link>
          <Link
            to="/app/groceries"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 text-xs font-bold uppercase tracking-wider hover:bg-white/[0.08] hover:text-white transition-all"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Shopping List</span>
          </Link>
        </div>
      </div>

      {/* Compact Minimal Metric Ribbon & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-0.5">
        
        {/* Metric Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs font-semibold text-white/70">
            <strong className="text-white font-sans">{items.length}</strong> items in pantry
          </span>
          <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-orange-400">
            <strong className="text-orange-300 font-sans">{proteinCount}</strong> protein staples
          </span>
          {lowStockCount > 0 ? (
            <button
              onClick={handleRestockAllLow}
              className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>{lowStockCount} {lowStockCount === 1 ? "item" : "items"} low • Restock to Groceries</span>
            </button>
          ) : (
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
              All staples stocked
            </span>
          )}
        </div>

        {/* Compact Search Bar */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-white/35 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter pantry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-52 h-8 pl-8 pr-3 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs font-medium text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-all"
          />
        </div>

      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              activeCategory === category
                ? "bg-white text-black font-bold shadow-sm"
                : "bg-white/[0.02] text-white/45 hover:text-white border border-white/[0.05]"
            }`}
          >
            {category}
          </button>
        ))}
        {lowStockCount > 0 && (
          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 border transition-all flex items-center gap-1 ${
              filterLowStockOnly
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "bg-white/[0.02] border-white/[0.05] text-white/45 hover:text-white"
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Low Stock ({lowStockCount})</span>
          </button>
        )}
      </div>

      {/* Main Pantry Table Bento Container with Integrated Quick-Add Row */}
      <div className="rounded-3xl bg-[#121418] border border-white/[0.06] overflow-hidden shadow-2xl">
        
        {/* Streamlined Quick Add Row with Gemini AI Parsing */}
        <form onSubmit={handleAddItem} className="flex items-center px-4 md:px-5 h-14 border-b border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.02] transition-colors focus-within:bg-white/[0.03] gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
            {addingItem ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : (
              <Plus className="w-4 h-4 text-white/60" />
            )}
          </div>
          
          {/* Main Item Name Input */}
          <input
            type="text"
            placeholder="Add with AI (e.g. Chilli powder, 6 Eggs, Peanut Butter, 500g Oats)..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={addingItem}
            className="flex-1 h-full bg-transparent border-none focus:outline-none text-xs font-medium text-white placeholder:text-white/30 min-w-0"
          />

          {/* Compact Inline Qty Box */}
          <div className="hidden sm:flex items-center gap-1 shrink-0 bg-white/[0.03] border border-white/[0.06] rounded-xl px-2 py-1">
            <span className="text-[10px] text-white/35 font-semibold uppercase">Qty</span>
            <input
              type="number"
              step="any"
              min="0"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              disabled={addingItem}
              className="w-10 bg-transparent border-none text-center text-xs font-bold text-white focus:outline-none"
            />
          </div>

          {/* Tight Custom Unit Dropdown (Chevron tightly hugs label) */}
          <div className="relative shrink-0 flex items-center">
            <select
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              disabled={addingItem}
              className="appearance-none bg-white/[0.04] border border-white/[0.08] hover:border-white/20 text-white/80 text-xs font-semibold rounded-xl pl-2.5 pr-6 py-1.5 focus:outline-none cursor-pointer transition-colors"
            >
              <option value="pcs" className="bg-[#171a20]">pcs</option>
              <option value="jar" className="bg-[#171a20]">jar</option>
              <option value="packs" className="bg-[#171a20]">packs</option>
              <option value="g" className="bg-[#171a20]">g</option>
              <option value="scoops" className="bg-[#171a20]">scoops</option>
              <option value="bottles" className="bg-[#171a20]">bottles</option>
              <option value="servings" className="bg-[#171a20]">servings</option>
            </select>
            <ChevronDown className="w-3 h-3 text-white/40 absolute right-2 pointer-events-none" />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!newName.trim() || addingItem}
            className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-30 hover:bg-white/90 active:scale-[0.98] transition-all shrink-0 flex items-center gap-1.5"
          >
            {addingItem ? (
              <span>AI Adding...</span>
            ) : (
              <span>Add</span>
            )}
          </button>
        </form>

        {/* Table Column Sorting Header */}
        <div className="grid grid-cols-[1fr_110px_160px_65px] md:grid-cols-[1fr_150px_170px_80px] items-center px-5 py-3 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold text-white/35 uppercase tracking-widest">
          <button 
            onClick={() => {
              if (sortBy === "name") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              else { setSortBy("name"); setSortOrder("asc"); }
            }}
            className="flex items-center gap-1 hover:text-white/70 transition-colors justify-start uppercase tracking-widest font-bold"
          >
            <span>Item</span>
            {sortBy === "name" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>
          
          <button 
            onClick={() => {
              if (sortBy === "category") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              else { setSortBy("category"); setSortOrder("asc"); }
            }}
            className="flex items-center gap-1 hover:text-white/70 transition-colors justify-start uppercase tracking-widest font-bold"
          >
            <span>Category</span>
            {sortBy === "category" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>

          <div className="text-center">In Stock</div>
          <div className="text-right pr-2">Actions</div>
        </div>

        {/* Table Body */}
        <div className="flex flex-col divide-y divide-white/[0.04]">
          {sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
                <Package className="w-6 h-6 text-white/30" />
              </div>
              <h3 className="text-xs font-bold text-white mb-1">
                {items.length === 0 ? "Your pantry is empty" : "No matching items found"}
              </h3>
              <p className="text-[11px] text-white/40 max-w-sm mb-4">
                {items.length === 0
                  ? "Track staples like eggs, oats, and protein powder to get AI hostel recipes."
                  : "Try clearing your filter or search."}
              </p>

              {items.length === 0 && (
                <button
                  onClick={handleLoadStarterStash}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-white/90 active:scale-[0.98] transition-all shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                  <span>Load Starter Pantry</span>
                </button>
              )}
            </div>
          ) : (
            sortedItems.map(item => {
              const status = getStockStatus(item);
              const isLow = status === "low_stock";
              const isDepleted = status === "depleted";
              const step = getSmartStep(item.unit, item.category);

              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-[1fr_110px_160px_65px] md:grid-cols-[1fr_150px_170px_80px] items-center px-5 min-h-[50px] transition-colors hover:bg-white/[0.02] ${
                    isDepleted ? "bg-rose-500/[0.02] opacity-60" : isLow ? "bg-amber-500/[0.02]" : ""
                  }`}
                >
                  {/* Name Col */}
                  <div className="min-w-0 pr-3 flex items-center gap-2">
                    <span className="text-xs md:text-sm font-semibold text-white truncate font-sans">
                      {item.name}
                    </span>
                    {isLow && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[9px] font-bold text-amber-400 uppercase tracking-wider shrink-0">
                        Low Stock
                      </span>
                    )}
                    {isDepleted && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-[9px] font-bold text-rose-400 uppercase tracking-wider shrink-0">
                        Depleted
                      </span>
                    )}
                  </div>

                  {/* Category Col (Interactive Dynamic Centered Badge) */}
                  <div className="flex items-center justify-start">
                    <div className="relative inline-flex items-center">
                      <div
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider border transition-all pointer-events-none select-none ${getCategoryColor(item.category)}`}
                      >
                        <span className="text-center">{item.category}</span>
                        <ChevronDown className="w-2.5 h-2.5 opacity-40 shrink-0" />
                      </div>
                      <select
                        value={item.category}
                        onChange={(e) => handleUpdateCategory(item.id, e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-center"
                        title="Click to change category"
                      >
                        {FOOD_CATEGORIES.map(cat => (
                          <option key={cat} value={cat} className="bg-[#171a20] text-white py-1">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quantity Stepper & Direct Editable Input */}
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => handleAdjustQuantity(item.id, -step)}
                      className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all shrink-0"
                      title={`Decrease by ${step} ${item.unit}`}
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <div className="flex items-center">
                      <input
                        type="number"
                        step={step}
                        min="0"
                        value={editingQuantities[item.id] !== undefined ? editingQuantities[item.id] : item.quantity}
                        onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                        onBlur={() => handleQuantityInputBlur(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        className={`h-7 px-1 text-center font-bold text-xs md:text-sm bg-white/[0.04] border border-white/[0.08] focus:border-white/40 focus:bg-white/[0.08] rounded-lg outline-none transition-all ${
                          (item.unit === "g" || item.unit === "ml") ? "w-16" : "w-11"
                        } ${isDepleted ? "text-rose-400" : isLow ? "text-amber-400" : "text-white"}`}
                        title="Click to directly type quantity"
                      />
                      <span className="text-[10px] text-white/40 ml-1.5 font-medium min-w-[24px] text-left">
                        {item.unit}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAdjustQuantity(item.id, step)}
                      className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all shrink-0"
                      title={`Increase by ${step} ${item.unit}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Action Col */}
                  <div className="flex items-center justify-end gap-1.5 pr-2">
                    <button
                      onClick={() => handleAddToGroceries(item)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
                      title="Add to Groceries list"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
