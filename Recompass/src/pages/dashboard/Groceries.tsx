import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ShoppingCart, Plus, Check, Search, Sparkles, Trash2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type GroceryItem = {
  id: string;
  name: string;
  category: string;
  purchased: boolean;
};

type GroceryList = {
  items: GroceryItem[];
  lastUpdated: string;
};

const CATEGORIES = ["Produce", "Protein", "Dairy", "Snacks", "Supplements", "Other"];

export default function Groceries() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "ai">("list");

  useEffect(() => {
    if (!currentUser) return;
    const fetchGroceries = async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid, "groceries", "current"));
        if (snap.exists()) {
          setItems(snap.data().items || []);
        } else {
          // Initialize empty list
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
    
    // Simple category guessing
    const lower = newItem.toLowerCase();
    let category = "Other";
    if (lower.includes("chicken") || lower.includes("egg") || lower.includes("whey") || lower.includes("meat")) category = "Protein";
    else if (lower.includes("milk") || lower.includes("cheese") || lower.includes("yogurt") || lower.includes("paneer")) category = "Dairy";
    else if (lower.includes("apple") || lower.includes("banana") || lower.includes("spinach") || lower.includes("veg")) category = "Produce";
    else if (lower.includes("bar") || lower.includes("chips") || lower.includes("biscuit")) category = "Snacks";
    else if (lower.includes("creatine") || lower.includes("vitamin")) category = "Supplements";

    const item: GroceryItem = {
      id: Date.now().toString(),
      name: newItem.trim(),
      category,
      purchased: false
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

  // Group pending items by category
  const groupedPending = pendingItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Groceries</h1>
          <p className="text-white/40 text-sm font-medium">{pendingItems.length} items to buy</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <ShoppingCart className="w-6 h-6 text-emerald-400" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 rounded-2xl bg-white/5 border border-white/10">
        <button 
          onClick={() => setActiveTab("list")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-white text-black shadow-md' : 'text-white/50 hover:text-white'}`}
        >
          My List
        </button>
        <button 
          onClick={() => setActiveTab("ai")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-emerald-500/70 hover:text-emerald-400'}`}
        >
          <Sparkles className="w-4 h-4" /> AI Sync
        </button>
      </div>

      {activeTab === "ai" ? (
        <div className="glass-card rounded-3xl p-8 text-center border-emerald-500/20 mt-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Smart Grocery Sync</h3>
          <p className="text-white/50 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
            Compass AI will automatically generate your shopping list based on your upcoming meal plan and macro goals.
          </p>
          <Link to="/app/compass" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            Plan with Compass <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6 mt-4">
          {/* Add Item Form */}
          <form onSubmit={handleAddItem} className="relative">
            <input 
              type="text" 
              placeholder="Add an item... (e.g., Eggs, Whey Protein)"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              className="w-full h-14 pl-12 pr-14 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <button 
              type="submit"
              disabled={!newItem.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center disabled:opacity-30 disabled:hover:bg-white hover:bg-white/90 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>

          {/* Pending Items grouped by Category */}
          {pendingItems.length === 0 ? (
            <div className="text-center py-12 glass rounded-3xl border-dashed border-2 border-white/10">
              <ShoppingCart className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-white/40 font-medium">Your shopping list is empty.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPending).map(([category, catItems]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2">{category}</h3>
                  <div className="space-y-2">
                    {catItems.map((item: GroceryItem) => (
                      <div key={item.id} className="group flex items-center gap-3 p-3 rounded-2xl glass hover:bg-white/10 border border-white/5 transition-all">
                        <button 
                          onClick={() => togglePurchased(item.id)}
                          className="w-6 h-6 shrink-0 rounded-full border-2 border-white/20 flex items-center justify-center hover:border-white/50 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5 opacity-0 text-white transition-opacity group-hover:opacity-30" />
                        </button>
                        <span className="flex-1 text-sm font-semibold text-white">{item.name}</span>
                        <button 
                          onClick={() => deleteItem(item.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 text-white/30 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Purchased Items */}
          {purchasedItems.length > 0 && (
            <div className="pt-6 space-y-3 border-t border-white/10">
              <div className="flex items-center justify-between px-2 mb-1">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Checked Off</h3>
                <button onClick={clearPurchased} className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest transition-colors">Clear All</button>
              </div>
              <div className="space-y-2 opacity-50">
                {purchasedItems.map((item: GroceryItem) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl glass border border-white/5">
                    <button 
                      onClick={() => togglePurchased(item.id)}
                      className="w-6 h-6 shrink-0 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                    <span className="flex-1 text-sm font-medium text-white line-through decoration-white/30">{item.name}</span>
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
