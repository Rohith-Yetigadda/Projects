import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Plus, Check, Sparkles, X, ShoppingCart } from "lucide-react";

type GroceryItem = {
  id: string;
  name: string;
  category: string;
  purchased: boolean;
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
    else if (lower.includes("milk") || lower.includes("cheese") || lower.includes("yogurt")) category = "Dairy";
    else if (lower.includes("apple") || lower.includes("banana") || lower.includes("spinach") || lower.includes("veg")) category = "Produce";
    else if (lower.includes("bar") || lower.includes("chips")) category = "Snacks";
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

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500 pb-28 md:pb-12">
      
      {/* Clean, Elegant Header */}
      <div className="flex items-end justify-between mb-8 mt-4 md:mt-8 px-2 md:px-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">Groceries</h1>
          <p className="text-sm font-medium text-white/40">
            {pendingItems.length === 0 ? "You're all stocked up." : `${pendingItems.length} items to pick up`}
          </p>
        </div>
        <button 
          onClick={() => {
            setIsSyncing(true);
            setTimeout(() => setIsSyncing(false), 1000);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 text-sm font-semibold"
        >
          {isSyncing ? <div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span className="hidden sm:inline">AI Sync</span>
        </button>
      </div>

      {/* Input Section */}
      <form onSubmit={handleAddItem} className="mb-10 px-2 md:px-0">
        <div className="relative flex items-center group">
          <button 
            type="submit"
            disabled={!newItem.trim()}
            className="absolute left-4 w-6 h-6 flex items-center justify-center text-white/30 group-focus-within:text-emerald-400 transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            placeholder="Add an item..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            className="w-full h-14 pl-12 pr-4 bg-transparent border-b-2 border-white/10 text-white text-lg placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
      </form>

      {/* List Section */}
      <div className="space-y-8 px-2 md:px-0">
        
        {/* Pending Items */}
        {pendingItems.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center opacity-40">
            <ShoppingCart className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium text-white">Your list is empty</p>
          </div>
        ) : (
          <div className="space-y-1">
            {pendingItems.map((item) => (
              <div 
                key={item.id} 
                className="group flex items-center justify-between p-4 rounded-2xl hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => togglePurchased(item.id)}
                    className="w-6 h-6 shrink-0 rounded-full border-2 border-white/20 hover:border-emerald-400 flex items-center justify-center transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 opacity-0 text-emerald-400 transition-opacity" />
                  </button>
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-white/90">{item.name}</span>
                    <span className="text-xs font-medium text-white/40">{item.category}</span>
                  </div>
                </div>
                <button 
                  onClick={() => deleteItem(item.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/0 group-hover:text-white/30 hover:!text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Purchased Items */}
        {purchasedItems.length > 0 && (
          <div className="pt-8">
            <div className="flex items-center justify-between px-4 mb-4">
              <h3 className="text-sm font-semibold text-white/30">Checked Off</h3>
              <button 
                onClick={clearPurchased} 
                className="text-xs font-semibold text-red-400/70 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="space-y-1">
              {purchasedItems.map((item) => (
                <div 
                  key={item.id} 
                  className="group flex items-center justify-between p-4 rounded-2xl hover:bg-white/[0.02] transition-colors opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => togglePurchased(item.id)}
                      className="w-6 h-6 shrink-0 rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center transition-colors"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                    <span className="text-base font-medium text-white/50 line-through decoration-white/20">{item.name}</span>
                  </div>
                  <button 
                    onClick={() => deleteItem(item.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/0 group-hover:text-white/30 hover:!text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
