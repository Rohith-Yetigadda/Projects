import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Plus, Check, Sparkles, X, ShoppingCart, Beef, Apple, Milk, Cookie, Pill, Package2 } from "lucide-react";

type GroceryItem = {
  id: string;
  name: string;
  category: string;
  purchased: boolean;
};

const getCategoryIcon = (cat: string) => {
  switch (cat) {
    case "Protein": return <Beef className="w-5 h-5 text-blue-400" />;
    case "Produce": return <Apple className="w-5 h-5 text-emerald-400" />;
    case "Dairy": return <Milk className="w-5 h-5 text-amber-400" />;
    case "Snacks": return <Cookie className="w-5 h-5 text-rose-400" />;
    case "Supplements": return <Pill className="w-5 h-5 text-purple-400" />;
    default: return <Package2 className="w-5 h-5 text-white/40" />;
  }
};

export default function Groceries() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const fetchGroceries = async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid, "groceries", "current"));
        if (snap.exists()) {
          setItems(snap.data().items || []);
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

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    
    const lower = newItem.toLowerCase();
    let category = "Other";
    if (lower.includes("chicken") || lower.includes("egg") || lower.includes("whey") || lower.includes("meat")) category = "Protein";
    else if (lower.includes("milk") || lower.includes("cheese") || lower.includes("yogurt") || lower.includes("paneer")) category = "Dairy";
    else if (lower.includes("apple") || lower.includes("banana") || lower.includes("spinach") || lower.includes("veg")) category = "Produce";
    else if (lower.includes("bar") || lower.includes("chips") || lower.includes("snack")) category = "Snacks";
    else if (lower.includes("creatine") || lower.includes("vitamin")) category = "Supplements";

    const item: GroceryItem = {
      id: Date.now().toString(),
      name: newItem.trim(),
      category,
      purchased: false,
    };

    saveItems([...items, item]);
    setNewItem("");
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

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
    </div>
  );

  const pendingItems = items.filter(i => !i.purchased);
  const purchasedItems = items.filter(i => i.purchased);

  const groupedPending = pendingItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  return (
    <div className="w-full max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-28 md:pb-12 space-y-10 px-2 md:px-6">
      
      {/* Header & Global Input */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-4 md:pt-8 border-b border-white/5 pb-8">
        <div className="flex-1">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-2">Groceries</h1>
          <p className="text-base font-medium text-white/40">
            {pendingItems.length === 0 ? "You're all stocked up." : `${pendingItems.length} items on your list`}
          </p>
        </div>

        <div className="flex-1 max-w-xl w-full flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleAddItem} className="relative flex-1 group">
            <button 
              type="submit"
              disabled={!newItem.trim()}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white/30 group-focus-within:text-white transition-colors disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
            </button>
            <input 
              type="text" 
              placeholder="Quick add item..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 text-white text-base placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all"
            />
          </form>
          <button 
            onClick={() => {
              setIsSyncing(true);
              setTimeout(() => setIsSyncing(false), 1000);
            }}
            className="h-14 px-6 rounded-2xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all border border-emerald-500/20 text-sm font-bold flex items-center justify-center gap-2 shrink-0"
          >
            {isSyncing ? <div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Sync
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      {items.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center opacity-30 border border-dashed border-white/10 rounded-3xl mx-4">
          <ShoppingCart className="w-16 h-16 mb-4" />
          <p className="text-xl font-medium text-white">Your list is empty</p>
          <p className="text-sm mt-2">Add items manually or sync with your meal plan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          
          {/* Render each category as a masonry-style block */}
          {Object.entries(groupedPending).map(([category, catItems]) => (
            <div key={category} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  {getCategoryIcon(category)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{category}</h3>
                  <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{catItems.length} Items</p>
                </div>
              </div>
              
              <div className="space-y-1">
                {catItems.map((item) => (
                  <div key={item.id} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.04] transition-colors -mx-3">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => togglePurchased(item.id)}
                        className="w-6 h-6 shrink-0 rounded-full border-2 border-white/20 hover:border-emerald-400 flex items-center justify-center transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 opacity-0 text-emerald-400 transition-opacity" />
                      </button>
                      <span className="text-base font-semibold text-white/90">{item.name}</span>
                    </div>
                    <button 
                      onClick={() => deleteItem(item.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/0 group-hover:text-white/30 hover:!text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Purchased Items Card (always at the end if items exist) */}
          {purchasedItems.length > 0 && (
            <div className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-4 opacity-70">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Check className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Checked Off</h3>
                    <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{purchasedItems.length} Items</p>
                  </div>
                </div>
                <button 
                  onClick={clearPurchased} 
                  className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-3 py-1.5 rounded-lg"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-1">
                {purchasedItems.map((item) => (
                  <div key={item.id} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.04] transition-colors -mx-3">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => togglePurchased(item.id)}
                        className="w-6 h-6 shrink-0 rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                      <span className="text-base font-medium text-white/40 line-through decoration-white/20">{item.name}</span>
                    </div>
                    <button 
                      onClick={() => deleteItem(item.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/0 group-hover:text-white/30 hover:!text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}
