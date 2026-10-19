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
  ArrowRight,
  AlertTriangle,
  Wallet
} from "lucide-react";
import { classifyFoodWithAI, fastClassifyFood, migrateFoodCategory } from "@/lib/geminiClassifier";
import { getCachedData, setCachedData } from "@/lib/dataCache";
import { CategoryDropdown } from "@/components/ui/CategoryDropdown";
import { getStockStatus, type PantryItem } from "./Pantry";

type GroceryItem = {
  id: string;
  name: string;
  category: string;
  purchased: boolean;
};

export default function Groceries() {
  const { currentUser, userProfile } = useAuth();
  const cachedItems = getCachedData<GroceryItem[]>("grocery_items");
  const [items, setItems] = useState<GroceryItem[]>(cachedItems || []);
  const [loading, setLoading] = useState(!cachedItems);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [lowPantryItems, setLowPantryItems] = useState<PantryItem[]>([]);

  const [sortBy, setSortBy] = useState<"name" | "category">(() => {
    try {
      const saved = localStorage.getItem("groceries_sort_by");
      if (saved === "name" || saved === "category") return saved;
    } catch {}
    return "category";
  });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    try {
      const saved = localStorage.getItem("groceries_sort_order");
      if (saved === "asc" || saved === "desc") return saved;
    } catch {}
    return "asc";
  });

  // Persist sort preference
  useEffect(() => {
    try {
      localStorage.setItem("groceries_sort_by", sortBy);
      localStorage.setItem("groceries_sort_order", sortOrder);
    } catch {}
  }, [sortBy, sortOrder]);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    const fetchGroceries = async () => {
      try {
        const [snap, pantrySnap] = await Promise.all([
          getDoc(doc(db, "users", currentUser.uid, "groceries", "current")),
          getDoc(doc(db, "users", currentUser.uid, "pantry", "current"))
        ]);
        if (!isMounted) return;
        if (snap.exists()) {
          const loaded: GroceryItem[] = snap.data().items || [];
          let hadMigrations = false;
          const migrated: GroceryItem[] = loaded.map(item => {
            const newCat = migrateFoodCategory(item.name, item.category);
            if (newCat !== item.category) {
              hadMigrations = true;
              return { ...item, category: newCat };
            }
            return item;
          });
          setItems(migrated);
          setCachedData("grocery_items", migrated);
          if (hadMigrations && currentUser) {
            updateDoc(doc(db, "users", currentUser.uid, "groceries", "current"), {
              items: migrated,
              lastUpdated: new Date().toISOString()
            }).catch(console.error);
          }
        } else {
          await setDoc(doc(db, "users", currentUser.uid, "groceries", "current"), {
            items: [],
            lastUpdated: new Date().toISOString()
          });
          setCachedData("grocery_items", []);
        }

        if (pantrySnap.exists()) {
          const pItems: PantryItem[] = pantrySnap.data().items || [];
          const low = pItems.filter(p => getStockStatus(p) !== "in_stock");
          setLowPantryItems(low);
        }
      } catch (err) {
        console.error("Error fetching groceries & pantry:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchGroceries();
    return () => { isMounted = false; };
  }, [currentUser]);

  // Restock all low-stock pantry items to Groceries
  const handleAddLowPantryToGroceries = () => {
    const unadded = lowPantryItems.filter(
      p => !items.some(g => g.name.toLowerCase() === p.name.toLowerCase() && !g.purchased)
    );
    if (unadded.length === 0) return;

    const toAdd = unadded.map(p => ({
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      name: p.name,
      category: p.category || "Other",
      purchased: false,
    }));
    const updated = [...items, ...toAdd];
    saveItems(updated);
    showNotification(`Added ${toAdd.length} low-stock item(s) from Pantry to Groceries!`);
  };

  const saveItems = async (newItems: GroceryItem[]) => {
    setItems(newItems);
    setCachedData("grocery_items", newItems);
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

  // Instant 0ms Add Item Handler with Fast Classification
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    
    const inputStr = newItem.trim();
    // Fast synchronous classification (<1ms)
    const parsed = fastClassifyFood(inputStr);

    const addedId = Date.now().toString();
    const item: GroceryItem = {
      id: addedId,
      name: parsed.name || inputStr,
      category: parsed.category,
      purchased: false,
    };

    const updated = [...items, item];
    saveItems(updated);
    setNewItem("");
    setAddingItem(false);
    showNotification(`Added "${item.name}" • ${item.category}`);

    // Background AI refinement if ambiguous
    if (parsed.category === "Other") {
      classifyFoodWithAI(inputStr).then(aiResult => {
        if (aiResult && aiResult.category !== "Other") {
          setItems(prev => {
            const refined = prev.map(it => it.id === addedId ? { ...it, category: aiResult.category, name: aiResult.name || it.name } : it);
            setCachedData("grocery_items", refined);
            if (currentUser) {
              updateDoc(doc(db, "users", currentUser.uid, "groceries", "current"), {
                items: refined,
                lastUpdated: new Date().toISOString()
              }).catch(console.error);
            }
            return refined;
          });
        }
      }).catch(console.error);
    }
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
        const classified = fastClassifyFood(pItem.name);
        const addQty = classified.quantity || 1;
        const addUnit = classified.unit || "pcs";
        const cat = pItem.category && pItem.category !== "Other" ? pItem.category : classified.category;

        const existingIdx = updatedPantry.findIndex(
          p => p.name.toLowerCase() === pItem.name.toLowerCase()
        );
        if (existingIdx >= 0) {
          updatedPantry[existingIdx] = {
            ...updatedPantry[existingIdx],
            quantity: (updatedPantry[existingIdx].quantity || 0) + addQty,
            updatedAt: new Date().toISOString()
          };
        } else {
          updatedPantry.push({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
            name: pItem.name,
            category: cat,
            quantity: addQty,
            unit: addUnit,
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

      const classified = fastClassifyFood(item.name);
      const addQty = classified.quantity || 1;
      const addUnit = classified.unit || "pcs";
      const cat = item.category && item.category !== "Other" ? item.category : classified.category;

      let updatedPantry = [...currentPantry];
      const existingIdx = updatedPantry.findIndex(
        p => p.name.toLowerCase() === item.name.toLowerCase()
      );
      if (existingIdx >= 0) {
        updatedPantry[existingIdx] = {
          ...updatedPantry[existingIdx],
          quantity: (updatedPantry[existingIdx].quantity || 0) + addQty,
          updatedAt: new Date().toISOString()
        };
      } else {
        updatedPantry.push({
          id: Date.now().toString(),
          name: item.name,
          category: cat,
          quantity: addQty,
          unit: addUnit,
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
  const unaddedLowPantry = lowPantryItems.filter(
    p => !items.some(g => g.name.toLowerCase() === p.name.toLowerCase() && !g.purchased)
  );

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
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-2 sm:pb-4">
      
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
            <span>Shopping & Restock List</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tightest font-sans">
            Groceries
          </h1>
          <p className="text-sm font-normal text-white/45 mt-1.5">
            {pendingCount === 0 ? "All items purchased and stocked." : pendingCount === 1 ? "1 item remaining on shopping list" : `${pendingCount} items remaining on shopping list`}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/app/profile"
            title="Edit Monthly Food & Grocery Budget in Profile"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all text-xs font-bold shadow-sm"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>₹{userProfile?.budget ? Number(userProfile.budget).toLocaleString('en-IN') : "3,000"}/mo Budget</span>
          </Link>

          <Link
            to="/app/pantry"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/80 text-xs font-bold uppercase tracking-wider hover:bg-white/[0.08] hover:text-white transition-all shadow-sm"
          >
            <Package className="w-3.5 h-3.5 text-orange-400" />
            <span>Pantry</span>
          </Link>

          {purchasedCount > 0 && (
            <button 
              onClick={clearPurchased}
              className="inline-flex items-center px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.02] text-white/50 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 text-xs font-bold uppercase tracking-wider transition-all"
            >
              Clear Purchased
            </button>
          )}
        </div>
      </div>

      {/* Pantry Restock Suggestion Banner */}
      {unaddedLowPantry.length > 0 && (
        <div className="rounded-3xl bg-amber-500/[0.08] border border-amber-500/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                <span>Pantry Restock Suggestions</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {unaddedLowPantry.length} low in hostel
                </span>
              </p>
              <p className="text-[11px] text-white/50 mt-0.5">
                {unaddedLowPantry.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(" • ")}
              </p>
            </div>
          </div>
          <button
            onClick={handleAddLowPantryToGroceries}
            className="h-9 px-4 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-white/90 active:scale-[0.98] transition-all shadow-sm shrink-0 self-end sm:self-auto flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add All to Groceries</span>
          </button>
        </div>
      )}

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
            className="h-9 px-4 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-white/90 active:scale-[0.98] transition-all flex items-center gap-2 shrink-0 shadow-sm"
          >
            <span>Transfer to Pantry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Table Bento Container */}
      <div className="rounded-3xl bg-[#121418] border border-white/[0.06] overflow-hidden shadow-2xl">
        
        {/* Quick Add Row */}
        <form onSubmit={handleAddItem} className="flex items-center px-3.5 sm:px-5 h-13 sm:h-14 border-b border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.02] transition-colors focus-within:bg-white/[0.03] gap-2.5 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
            {addingItem ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : (
              <Plus className="w-4 h-4 text-white/60" />
            )}
          </div>
          <input 
            type="text" 
            placeholder="Add grocery item (e.g. Chilli powder, Greek Yogurt, Eggs)..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            disabled={addingItem}
            className="flex-1 min-w-0 bg-transparent border-none focus:outline-none text-xs sm:text-sm font-medium text-white placeholder:text-white/30"
          />
          <button 
            type="submit" 
            disabled={!newItem.trim() || addingItem}
            className="h-8 px-4 rounded-xl bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-30 hover:bg-white/90 active:scale-[0.98] transition-all shrink-0 shadow-sm"
          >
            {addingItem ? "Adding..." : "Add"}
          </button>
        </form>

        {/* Table Column Sorting Header (Visible on ALL Devices & Screens) */}
        <div className="grid grid-cols-[32px_1fr_105px_36px] sm:grid-cols-[48px_1fr_160px_48px] items-center px-3 sm:px-4 py-2.5 sm:py-3 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold text-white/40 uppercase tracking-widest">
          <div className="text-center">Status</div>
          <button 
            onClick={() => handleSort("name")}
            className="flex items-center gap-1 hover:text-white transition-colors justify-start uppercase tracking-widest font-bold"
          >
            <span>Item</span>
            {sortBy === "name" ? (sortOrder === "asc" ? <ChevronUp className="w-3 h-3 text-white" /> : <ChevronDown className="w-3 h-3 text-white" />) : <span className="text-white/20 text-[9px]">↕</span>}
          </button>
          <button 
            onClick={() => handleSort("category")}
            className="flex items-center gap-1 hover:text-white transition-colors justify-start uppercase tracking-widest font-bold"
          >
            <span>Category</span>
            {sortBy === "category" ? (sortOrder === "asc" ? <ChevronUp className="w-3 h-3 text-white" /> : <ChevronDown className="w-3 h-3 text-white" />) : <span className="text-white/20 text-[9px]">↕</span>}
          </button>
          <div className="text-center">Del</div>
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
                className={`group grid grid-cols-[32px_1fr_105px_36px] sm:grid-cols-[48px_1fr_160px_48px] items-center px-3 sm:px-4 min-h-[50px] transition-colors hover:bg-white/[0.02] ${
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
                <div className={`text-xs sm:text-sm font-semibold truncate pr-2 ${
                  item.purchased ? "text-white/40 line-through" : "text-white"
                }`}>
                  {item.name}
                </div>
                
                {/* Category Badge Col */}
                <div className="flex items-center justify-start min-w-0">
                  <CategoryDropdown
                    category={item.category}
                    onChange={(newCat) => handleUpdateCategory(item.id, newCat)}
                  />
                </div>
                
                {/* Actions Col */}
                <div className="flex items-center justify-center gap-1">
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
