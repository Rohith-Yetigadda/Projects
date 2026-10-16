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
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Check
} from "lucide-react";

export type PantryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold?: number;
  updatedAt?: string;
};

const CATEGORIES = [
  "All",
  "Protein",
  "Dairy",
  "Produce",
  "Grains",
  "Snacks",
  "Supplements",
  "Spices",
  "Oils",
  "Other"
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
  { name: "Eggs", category: "Protein", quantity: 6, unit: "pcs", lowStockThreshold: 2 },
  { name: "Peanut Butter", category: "Snacks", quantity: 1, unit: "jar", lowStockThreshold: 1 },
  { name: "Rolled Oats", category: "Grains", quantity: 500, unit: "g", lowStockThreshold: 100 },
  { name: "Whey Protein", category: "Supplements", quantity: 15, unit: "scoops", lowStockThreshold: 5 },
  { name: "Milk", category: "Dairy", quantity: 2, unit: "packs", lowStockThreshold: 1 },
  { name: "Bananas", category: "Produce", quantity: 4, unit: "pcs", lowStockThreshold: 2 },
];

export default function Pantry() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
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
  const [newCategory, setNewCategory] = useState("Auto");

  // Notification Toast / Message
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Fetch Pantry from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const fetchPantry = async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid, "pantry", "current"));
        if (snap.exists()) {
          setItems(snap.data().items || []);
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

  // Auto-detect category from name
  const detectCategory = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes("chicken") || lower.includes("egg") || lower.includes("fish") || lower.includes("mutton") || lower.includes("soya") || lower.includes("tofu") || lower.includes("tuna")) return "Protein";
    if (lower.includes("milk") || lower.includes("cheese") || lower.includes("yogurt") || lower.includes("curd") || lower.includes("paneer") || lower.includes("butter") || lower.includes("ghee")) return "Dairy";
    if (lower.includes("apple") || lower.includes("banana") || lower.includes("spinach") || lower.includes("veg") || lower.includes("tomato") || lower.includes("onion") || lower.includes("potato") || lower.includes("fruit") || lower.includes("berries")) return "Produce";
    if (lower.includes("bar") || lower.includes("chips") || lower.includes("snack") || lower.includes("biscuit") || lower.includes("cookie") || lower.includes("peanut butter") || lower.includes("nuts") || lower.includes("almond")) return "Snacks";
    if (lower.includes("whey") || lower.includes("creatine") || lower.includes("vitamin") || lower.includes("supplement") || lower.includes("bcaa") || lower.includes("omega")) return "Supplements";
    if (lower.includes("rice") || lower.includes("wheat") || lower.includes("atta") || lower.includes("dal") || lower.includes("lentil") || lower.includes("oat") || lower.includes("pasta") || lower.includes("bread") || lower.includes("quinoa")) return "Grains";
    if (lower.includes("cumin") || lower.includes("turmeric") || lower.includes("chili") || lower.includes("salt") || lower.includes("pepper") || lower.includes("spice") || lower.includes("garlic") || lower.includes("ginger") || lower.includes("masala")) return "Spices";
    if (lower.includes("oil")) return "Oils";
    return "Other";
  };

  // Add Item Handler
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const parsedQty = Math.max(0, parseFloat(newQuantity) || 1);
    const category = newCategory === "Auto" ? detectCategory(newName) : newCategory;

    const existingIndex = items.findIndex(
      i => i.name.toLowerCase() === newName.trim().toLowerCase()
    );

    let updated: PantryItem[];
    if (existingIndex >= 0) {
      // Increase existing item count
      updated = items.map((item, idx) => 
        idx === existingIndex 
          ? { ...item, quantity: item.quantity + parsedQty, updatedAt: new Date().toISOString() }
          : item
      );
      showNotification(`Added +${parsedQty} ${newUnit} to existing ${items[existingIndex].name}`);
    } else {
      const newItem: PantryItem = {
        id: Date.now().toString(),
        name: newName.trim(),
        category,
        quantity: parsedQty,
        unit: newUnit,
        lowStockThreshold: parsedQty <= 2 ? 1 : Math.max(1, Math.floor(parsedQty * 0.2)),
        updatedAt: new Date().toISOString()
      };
      updated = [newItem, ...items];
      showNotification(`Added ${newItem.name} (${parsedQty} ${newUnit}) to pantry`);
    }

    savePantry(updated);
    setNewName("");
    setNewQuantity("1");
    setNewCategory("Auto");
  };

  // Adjust Quantity
  const handleAdjustQuantity = (id: string, delta: number) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const nextQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: nextQty, updatedAt: new Date().toISOString() };
      }
      return item;
    });
    savePantry(updated);
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
      
      // Check if already in groceries
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
    const lowStockItems = items.filter(i => i.quantity <= (i.lowStockThreshold || 1));
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
    showNotification("Loaded Starter Dorm Stash!");
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  // Summary Metrics
  const totalItems = items.length;
  const lowStockCount = items.filter(i => i.quantity <= (i.lowStockThreshold || 1)).length;
  const proteinStaplesCount = items.filter(i => i.category === "Protein" || i.category === "Supplements").length;

  // Filtered & Sorted Items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesLowStock = filterLowStockOnly ? item.quantity <= (item.lowStockThreshold || 1) : true;
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
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-28 md:pb-8">
      
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
            <span>Room & Dorm Inventory</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tightest font-sans">
            Dorm Pantry
          </h1>
          <p className="text-sm font-normal text-white/45 mt-1.5">
            Keep track of what's stocked in your room to plan meals and prevent over-buying.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/app/cook"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold uppercase tracking-wider hover:bg-orange-500/30 transition-all shadow-sm"
          >
            <ChefHat className="w-3.5 h-3.5 text-orange-400" />
            <span>Cook with Compass</span>
          </Link>
          <Link
            to="/app/groceries"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 text-xs font-bold uppercase tracking-wider hover:bg-white/[0.08] hover:text-white transition-all"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Groceries</span>
          </Link>
        </div>
      </div>

      {/* Top Bento Metrics (3 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* Card 1: Total Stash */}
        <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40 mb-3">
            <span className="text-[10px] font-bold tracking-widest uppercase">Stocked Items</span>
            <div className="w-7 h-7 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-white/70" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tightest font-sans">
              {totalItems}
            </div>
            <p className="text-[11px] text-white/40 mt-1">Available in dorm stash</p>
          </div>
        </div>

        {/* Card 2: Low Stock Warning */}
        <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40 mb-3">
            <span className="text-[10px] font-bold tracking-widest uppercase">Low Stock Alert</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold tracking-tightest font-sans ${lowStockCount > 0 ? "text-amber-400" : "text-white"}`}>
                {lowStockCount}
              </span>
              {lowStockCount > 0 && (
                <button
                  onClick={handleRestockAllLow}
                  className="text-[10px] font-bold text-amber-300 hover:text-amber-200 underline uppercase tracking-wider"
                >
                  Restock All
                </button>
              )}
            </div>
            <p className="text-[11px] text-white/40 mt-1">
              {lowStockCount === 0 ? "All items sufficiently stocked" : "Items needing restock"}
            </p>
          </div>
        </div>

        {/* Card 3: High-Protein Staples */}
        <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40 mb-3">
            <span className="text-[10px] font-bold tracking-widest uppercase">Protein Staples</span>
            <div className="w-7 h-7 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-orange-400 tracking-tightest font-sans">
              {proteinStaplesCount}
            </div>
            <p className="text-[11px] text-white/40 mt-1">Protein & supplement staples</p>
          </div>
        </div>

      </div>

      {/* Quick Add Bento Dock */}
      <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 shadow-2xl">
        <div className="text-xs font-bold text-white tracking-tight uppercase mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 text-orange-400" />
            Quick Add To Stash
          </span>
          <span className="text-[10px] font-semibold text-white/30 lowercase">
            auto-categorizes smart foods
          </span>
        </div>

        <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          {/* Item Name */}
          <div className="sm:col-span-5 relative">
            <input
              type="text"
              placeholder="Item name (e.g. Eggs, Whey, Greek Yogurt, Oats)..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-all"
            />
          </div>

          {/* Quantity */}
          <div className="sm:col-span-2">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="Qty"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="w-full h-11 px-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-all"
            />
          </div>

          {/* Unit Selector */}
          <div className="sm:col-span-2">
            <select
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="w-full h-11 px-3 rounded-2xl bg-[#171a20] border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-white/20 transition-all cursor-pointer"
            >
              <option value="pcs">pcs</option>
              <option value="scoops">scoops</option>
              <option value="servings">servings</option>
              <option value="packs">packs</option>
              <option value="jar">jar</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="bottles">bottles</option>
            </select>
          </div>

          {/* Category Selector */}
          <div className="sm:col-span-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full h-11 px-3 rounded-2xl bg-[#171a20] border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-white/20 transition-all cursor-pointer"
            >
              <option value="Auto">Auto Detect</option>
              {CATEGORIES.filter(c => c !== "All").map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <div className="sm:col-span-1">
            <button
              type="submit"
              disabled={!newName.trim()}
              className="w-full h-11 rounded-2xl bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-30 hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center shadow-sm"
              title="Add item"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </div>

      {/* Filter, Search & Category Chips */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-white/35 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search pantry items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-all"
            />
          </div>

          {/* Low Stock Toggle & Sorters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                filterLowStockOnly
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-white/[0.02] border-white/[0.08] text-white/50 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Low Stock Only</span>
            </button>

            {/* Sort Toggle */}
            <button
              onClick={() => {
                if (sortBy === "name") setSortBy("quantity");
                else if (sortBy === "quantity") setSortBy("category");
                else setSortBy("name");
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/[0.02] border border-white/[0.08] text-white/60 hover:text-white transition-all flex items-center gap-1"
            >
              <span>Sort: {sortBy}</span>
            </button>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="w-8 h-8 rounded-full bg-white/[0.02] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white transition-all"
              title="Toggle sort direction"
            >
              {sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                activeCategory === category
                  ? "bg-white text-black font-bold shadow-sm"
                  : "bg-white/[0.03] text-white/50 hover:text-white border border-white/[0.06]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Main Pantry List / Table Container */}
      <div className="rounded-3xl bg-[#121418] border border-white/[0.06] overflow-hidden shadow-2xl">
        
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_130px_150px_90px] md:grid-cols-[1fr_180px_170px_110px] items-center px-5 py-3.5 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold text-white/35 uppercase tracking-widest">
          <div>Item Name</div>
          <div>Category</div>
          <div className="text-center">In Stash</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Items Rows */}
        <div className="flex flex-col divide-y divide-white/[0.04]">
          {sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-14 h-14 rounded-3xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
                <Package className="w-7 h-7 text-white/30" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                {items.length === 0 ? "Your dorm pantry is empty" : "No matching items found"}
              </h3>
              <p className="text-xs text-white/40 max-w-sm mb-5">
                {items.length === 0
                  ? "Track staples like eggs, oats, and protein powder to get AI hostel recipes."
                  : "Try clearing your filters or search terms."}
              </p>

              {items.length === 0 && (
                <button
                  onClick={handleLoadStarterStash}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-white/90 active:scale-[0.98] transition-all shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                  <span>Load Starter Dorm Stash</span>
                </button>
              )}
            </div>
          ) : (
            sortedItems.map(item => {
              const isLow = item.quantity <= (item.lowStockThreshold || 1);
              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-[1fr_130px_150px_90px] md:grid-cols-[1fr_180px_170px_110px] items-center px-5 py-3.5 transition-colors hover:bg-white/[0.02] ${
                    isLow ? "bg-amber-500/[0.02]" : ""
                  }`}
                >
                  {/* Name & Low Warning */}
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs md:text-sm font-semibold text-white truncate font-sans">
                        {item.name}
                      </span>
                      {isLow && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[9px] font-bold text-amber-400 uppercase tracking-wider shrink-0">
                          {item.quantity === 0 ? "Depleted" : "Low Stock"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Category Badge */}
                  <div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider border ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleAdjustQuantity(item.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <div className="min-w-[56px] text-center">
                      <span className={`text-xs md:text-sm font-bold tracking-tight font-sans ${isLow ? "text-amber-400" : "text-white"}`}>
                        {item.quantity}
                      </span>
                      <span className="text-[10px] text-white/40 ml-1 font-medium">
                        {item.unit}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAdjustQuantity(item.id, 1)}
                      className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
                      title="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Quick Action Icons */}
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Add to Groceries */}
                    <button
                      onClick={() => handleAddToGroceries(item)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
                      title="Add to Groceries list"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
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

      {/* Dorm Chef Helper Banner */}
      {items.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
              <ChefHat className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ready to make something?</h4>
              <p className="text-xs text-white/50 mt-0.5">
                Generate 3 high-protein hostel recipes using ingredients you currently have in this stash.
              </p>
            </div>
          </div>
          <Link
            to="/app/cook"
            className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-white/90 active:scale-[0.98] transition-all flex items-center gap-2 shrink-0 shadow-md"
          >
            <span>Cook with Compass</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

    </div>
  );
}
