import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ShoppingCart, Plus, Check, Search, Sparkles, Trash2, ArrowRight, Package, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";

type GroceryItem = {
  id: string;
  name: string;
  category: string;
  purchased: boolean;
};

const CATEGORIES = ["Produce", "Protein", "Dairy", "Snacks", "Supplements", "Other"];

export default function Groceries() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");

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

  const groupedPending = pendingItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  const progress = items.length === 0 ? 0 : Math.round((purchasedItems.length / items.length) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-28 md:pb-8">
      
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-2">Groceries</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-emerald-400" />
            {pendingItems.length > 0 ? `${pendingItems.length} items remaining on your list` : "Your shopping list is all clear."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass-card rounded-2xl px-6 py-3 flex items-center gap-4 border-white/5">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-widest text-white/40">Progress</span>
              <span className="text-xl font-bold text-white">{progress}%</span>
            </div>
            <div className="w-12 h-12 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="40" className="stroke-white/10" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="40" 
                  className="stroke-emerald-400 transition-all duration-1000 ease-out" 
                  strokeWidth="8" strokeLinecap="round" fill="none" 
                  strokeDasharray={251.2} strokeDashoffset={251.2 - (progress / 100) * 251.2} 
                />
              </svg>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: The Shopping List */}
        <div className="lg:col-span-8 space-y-6">
          {/* Add Item Form */}
          <form onSubmit={handleAddItem} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <input 
                type="text" 
                placeholder="What do you need? (e.g., Eggs, Whey Protein)"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className="w-full h-16 pl-14 pr-16 rounded-2xl glass border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all shadow-lg text-lg font-medium"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-white/30" />
              <button 
                type="submit"
                disabled={!newItem.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center disabled:opacity-30 disabled:hover:bg-white hover:bg-white/90 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </form>

          {/* Pending Items Grouped */}
          {pendingItems.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center border-white/5 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <ShoppingCart className="w-10 h-10 text-white/20" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">You're all stocked up</h3>
              <p className="text-white/40 font-medium max-w-sm mx-auto">Add items manually above, or sync your meal plan using Compass AI.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(groupedPending).map(([category, catItems]) => (
                <div key={category} className="glass-card rounded-3xl p-6 border-white/5 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400">{category}</h3>
                    <span className="text-xs font-bold text-white/30 px-2 py-1 rounded-lg bg-white/5">{catItems.length}</span>
                  </div>
                  <div className="space-y-3 flex-1">
                    {catItems.map((item: GroceryItem) => (
                      <div key={item.id} className="group flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
                        <button 
                          onClick={() => togglePurchased(item.id)}
                          className="w-7 h-7 shrink-0 rounded-full border-2 border-white/20 flex items-center justify-center hover:border-emerald-400 transition-colors"
                        >
                          <Check className="w-4 h-4 opacity-0 text-emerald-400 transition-opacity group-hover:opacity-30" />
                        </button>
                        <span className="flex-1 text-base font-semibold text-white">{item.name}</span>
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
            <div className="pt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <Check className="w-4 h-4" /> Checked Off
                </h3>
                <button onClick={clearPurchased} className="text-xs font-bold text-red-400 hover:text-red-300 uppercase tracking-widest px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors">
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-60">
                {purchasedItems.map((item: GroceryItem) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl glass border border-white/5">
                    <button 
                      onClick={() => togglePurchased(item.id)}
                      className="w-7 h-7 shrink-0 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                    </button>
                    <span className="flex-1 text-base font-medium text-white line-through decoration-white/30">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI & Ecosystem Panels */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Smart Sync Card */}
          <div className="relative group overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-blue-500/10 to-transparent opacity-80" />
            <div className="glass-card relative p-8 border-white/10 h-full flex flex-col items-start">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <Sparkles className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">AI List Sync</h3>
              <p className="text-white/60 font-medium mb-8 leading-relaxed">
                Let Compass AI scan your upcoming meal plan and macro targets to instantly generate your entire shopping list.
              </p>
              <Link to="/app/compass" className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] mt-auto group-hover:scale-[1.02]">
                Generate List <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Pantry Link Card */}
          <Link to="/app/pantry" className="glass-card rounded-3xl p-6 flex items-center gap-5 border-white/5 hover:bg-white/5 transition-all group cursor-pointer block">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6 text-white/50 group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-bold text-white">Check Pantry</h4>
              <p className="text-sm text-white/40 mt-1 font-medium">See what you already own.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors group-hover:translate-x-1" />
          </Link>

        </div>

      </div>
    </div>
  );
}
