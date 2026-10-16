import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import {
  Plus,
  Check,
  Trash2,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Package,
  ArrowRight
} from "lucide-react";
import { classifyFoodWithAI, FOOD_CATEGORIES } from "@/lib/geminiClassifier";

type GroceryItem = {
  id: string;
  name: string;
  category: string;
  purchased: boolean;
};

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

export default function Groceries() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState("");

  const [sortBy, setSortBy] = useState<"name" | "category">("category");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    if (!currentUser) return;
    const fetchGroceries = async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid, "groceries", "current"));
        if (snap.exists()) {
          const loaded: GroceryItem[] = snap.data().items || [];
          setItems(loaded);

          // Auto-reclassify any items previously stuck in "Other" with Gemini AI
          const otherItems = loaded.filter(i => i.category === "Other");
          if (otherItems.length > 0) {
            let hasChanges = false;
            const fixed = await Promise.all(
              loaded.map(async (item) => {
                if (item.category === "Other") {
                  const aiResult = await classifyFoodWithAI(item.name);
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
              await updateDoc(doc(db, "users", currentUser.uid, "groceries", "current"), {
                items: fixed,
                lastUpdated: new Date().toISOString()
              });
            }
          }
        } else {
          await setDoc(doc(db, "users", currentUser.uid, "groceries", "current"), {
            items: [],
            lastUpdated: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("Error fetching groceries:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroceries();
  }, [currentUser]);

  const saveItems = async (newItems: GroceryItem[]) => {
    setItems(newItems);
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid, "groceries", "current"), {
        items: newItems,
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error saving groceries:", err);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    
    setAddingItem(true);
    const inputStr = newItem.trim();
    const parsed = await classifyFoodWithAI(inputStr);

    const item: GroceryItem = {
      id: Date.now().toString(),
      name: parsed.name || inputStr,
      category: parsed.category,
      purchased: false,
    };

    saveItems([...items, item]);
    setNewItem("");
    setAddingItem(false);
    showNotification(`Added "${item.name}" • ${item.category}`);
  };

  const handleUpdateCategory = (id: string, newCat: string) => {
    const updated = items.map(item => item.id === id ? { ...item, category: newCat } : item);
    saveItems(updated);
    showNotification(`Category updated to ${newCat}`);
  };

  const togglePurchased = (id: string) => {
    const updated = items.map(item => item.id === id ? { ...item, purchased: !item.purchased } : item);
    saveItems(updated);
  };

  const deleteItem = (id: string) => {
    saveItems(items.filter(item => item.id !== id));
  };

  const clearPurchased = () => {
    saveItems(items.filter(item => !item.purchased));
  };

  // Transfer all purchased items to Pantry
  const transferPurchasedToPantry = async () => {
    if (!currentUser) return;
    const purchasedItems = items.filter(i => i.purchased);
    if (purchasedItems.length === 0) return;

    try {
      const snap = await getDoc(doc(db, "users", currentUser.uid, "pantry", "current"));
      const currentPantry = snap.exists() ? (snap.data().items || []) : [];

      let updatedPantry = [...currentPantry];
      purchasedItems.forEach(pItem => {
        const existingIdx = updatedPantry.findIndex(
          p => p.name.toLowerCase() === pItem.name.toLowerCase()
        );
        if (existingIdx >= 0) {
          updatedPantry[existingIdx] = {
            ...updatedPantry[existingIdx],
            quantity: (updatedPantry[existingIdx].quantity || 0) + 1,
            updatedAt: new Date().toISOString()
          };
        } else {
          updatedPantry.push({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
            name: pItem.name,
            category: pItem.category || "Other",
            quantity: 1,
            unit: "pcs",
            lowStockThreshold: 1,
            updatedAt: new Date().toISOString()
          });
        }
      });

      await updateDoc(doc(db, "users", currentUser.uid, "pantry", "current"), {
        items: updatedPantry,
        lastUpdated: new Date().toISOString()
      });

      // Remove purchased from groceries
      const remainingGroceries = items.filter(i => !i.purchased);
      await saveItems(remainingGroceries);
      showNotification(`Transferred ${purchasedItems.length} purchased item(s) to Pantry!`);
    } catch (err) {
      console.error("Error transferring to pantry:", err);
      showNotification("Failed to transfer to pantry.");
    }
  };

  // Transfer a single item to Pantry
  const transferSingleToPantry = async (item: GroceryItem) => {
    if (!currentUser) return;
    try {
      const snap = await getDoc(doc(db, "users", currentUser.uid, "pantry", "current"));
      const currentPantry = snap.exists() ? (snap.data().items || []) : [];

      let updatedPantry = [...currentPantry];
      const existingIdx = updatedPantry.findIndex(
        p => p.name.toLowerCase() === item.name.toLowerCase()
      );
      if (existingIdx >= 0) {
        updatedPantry[existingIdx] = {
          ...updatedPantry[existingIdx],
          quantity: (updatedPantry[existingIdx].quantity || 0) + 1,
          updatedAt: new Date().toISOString()
        };
      } else {
        updatedPantry.push({
          id: Date.now().toString(),
          name: item.name,
          category: item.category || "Other",
          quantity: 1,
          unit: "pcs",
          lowStockThreshold: 1,
          updatedAt: new Date().toISOString()
        });
      }

      await updateDoc(doc(db, "users", currentUser.uid, "pantry", "current"), {
        items: updatedPantry,
        lastUpdated: new Date().toISOString()
      });

      saveItems(items.filter(i => i.id !== item.id));
      showNotification(`Transferred "${item.name}" to Pantry!`);
    } catch (err) {
      console.error("Error transferring single item to pantry:", err);
    }
  };

  const handleSort = (field: "name" | "category") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  );

  const pendingCount = items.filter(i => !i.purchased).length;
  const purchasedCount = items.filter(i => i.purchased).length;

  const sortedItems = [...items].sort((a, b) => {
    if (a.purchased !== b.purchased) return a.purchased ? 1 : -1;

    let comparison = 0;
    if (sortBy === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === "category") {
      comparison = a.category.localeCompare(b.category);
      if (comparison === 0) comparison = a.name.localeCompare(b.name);
    }

    return sortOrder === "asc" ? comparison : -comparison;
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

      {/* Editorial Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-white/50 mb-2.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Pantry & Groceries</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tightest font-sans">
            Shopping List
          </h1>
          <p className="text-sm font-normal text-white/45 mt-1.5">
            {pendingCount === 0 ? "All items purchased and stocked." : `${pendingCount} items remaining to purchase`}
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/app/pantry"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 text-xs font-bold uppercase tracking-wider hover:bg-white/[0.08] hover:text-white transition-all"
          >
            <Package className="w-3.5 h-3.5 text-orange-400" />
            <span>Pantry</span>
          </Link>

          {purchasedCount > 0 && (
            <button 
              onClick={clearPurchased}
              className="text-xs font-semibold text-white/40 hover:text-rose-400 px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] hover:bg-rose-500/10 hover:border-rose-500/20 transition-all"
            >
              Clear Purchased
            </button>
          )}
        </div>
      </div>

      {/* Transfer Purchased to Pantry CTA Banner */}
      {purchasedCount > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                {purchasedCount} {purchasedCount === 1 ? "item" : "items"} purchased
              </p>
              <p className="text-xs text-white/50 mt-0.5">
                Transfer purchased groceries straight into your pantry.
              </p>
            </div>
          </div>
          <button
            onClick={transferPurchasedToPantry}
            className="px-4 py-2 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-white/90 active:scale-[0.98] transition-all flex items-center gap-2 shrink-0 shadow-sm"
          >
            <span>Transfer to Pantry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Table Bento Container */}
      <div className="rounded-3xl bg-[#121418] border border-white/[0.06] overflow-hidden shadow-2xl">
        
        {/* Quick Add Row */}
        <form onSubmit={handleAddItem} className="flex items-center px-5 h-14 border-b border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.02] transition-colors focus-within:bg-white/[0.03] gap-3">
          <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
            {addingItem ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : (
              <Plus className="w-4 h-4 text-white/60" />
            )}
          </div>
          <input 
            type="text" 
            placeholder="Add grocery item with AI (e.g. Chilli powder, Greek Yogurt, Eggs)..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            disabled={addingItem}
            className="w-full h-full bg-transparent border-none focus:outline-none text-xs font-medium text-white placeholder:text-white/30"
          />
          <button 
            type="submit" 
            disabled={!newItem.trim() || addingItem}
            className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-30 hover:bg-white/90 active:scale-[0.98] transition-all shrink-0"
          >
            {addingItem ? "AI Adding..." : "Add"}
          </button>
        </form>

        {/* Table Column Sorting Header */}
        <div className="grid grid-cols-[48px_1fr_130px_90px] md:grid-cols-[64px_1fr_180px_110px] items-center px-4 py-3 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold text-white/35 uppercase tracking-widest">
          <div className="text-center">Status</div>
          <button 
            onClick={() => handleSort("name")}
            className="flex items-center gap-1 hover:text-white/70 transition-colors justify-start uppercase tracking-widest font-bold"
          >
            <span>Item</span>
            {sortBy === "name" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>
          <button 
            onClick={() => handleSort("category")}
            className="flex items-center gap-1 hover:text-white/70 transition-colors justify-start uppercase tracking-widest font-bold"
          >
            <span>Category</span>
            {sortBy === "category" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>
          <div className="text-right pr-2">Actions</div>
        </div>

        {/* Table Body */}
        <div className="flex flex-col divide-y divide-white/[0.04]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/30">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
                <ShoppingCart className="w-6 h-6 text-white/30" />
              </div>
              <p className="text-xs font-semibold tracking-wide text-white/40">Your grocery list is empty</p>
            </div>
          ) : (
            sortedItems.map(item => (
              <div 
                key={item.id} 
                className={`group grid grid-cols-[48px_1fr_130px_90px] md:grid-cols-[64px_1fr_180px_110px] items-center px-4 min-h-[52px] transition-colors hover:bg-white/[0.02] ${
                  item.purchased ? "bg-black/20 opacity-60" : ""
                }`}
              >
                {/* Checkbox Col */}
                <div className="flex justify-center">
                  <button 
                    onClick={() => togglePurchased(item.id)}
                    className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                      item.purchased 
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                        : "border-white/20 hover:border-white/40 bg-transparent"
                    }`}
                  >
                    {item.purchased && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                </div>
                
                {/* Item Name Col */}
                <div className={`text-xs md:text-sm font-medium truncate pr-4 ${
                  item.purchased ? "text-white/40 line-through" : "text-white/90"
                }`}>
                  {item.name}
                </div>
                
                {/* Category Badge Col (Interactive Clickable Badge) */}
                <div className="relative inline-flex items-center">
                  <select
                    value={item.category}
                    onChange={(e) => handleUpdateCategory(item.id, e.target.value)}
                    className={`appearance-none cursor-pointer pl-2.5 pr-5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider border focus:outline-none transition-all ${getCategoryColor(item.category)}`}
                    title="Click to change category"
                  >
                    {FOOD_CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-[#171a20] text-white py-1">
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 pointer-events-none opacity-40" />
                </div>
                
                {/* Actions Col */}
                <div className="flex items-center justify-end gap-1.5 pr-2">
                  {/* Single Transfer to Pantry */}
                  {item.purchased && (
                    <button
                      onClick={() => transferSingleToPantry(item)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                      title="Move directly to Pantry"
                    >
                      <Package className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button 
                    onClick={() => deleteItem(item.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
