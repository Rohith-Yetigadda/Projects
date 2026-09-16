import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Plus, Trash2, ArrowUpRight, Sparkles, AlertCircle, ShoppingCart } from "lucide-react";

type GroceryItem = {
  id: string;
  name: string;
  category: string;
  purchased: boolean;
  source: "Manual" | "AI Sync";
};

const getCategoryColor = (cat: string) => {
  switch (cat) {
    case "Protein": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "Produce": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "Dairy": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "Snacks": return "text-rose-400 bg-rose-400/10 border-rose-400/20";
    case "Supplements": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
    default: return "text-white/70 bg-white/5 border-white/10";
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
    else if (lower.includes("bar") || lower.includes("chips") || lower.includes("biscuit")) category = "Snacks";
    else if (lower.includes("creatine") || lower.includes("vitamin")) category = "Supplements";

    const item: GroceryItem = {
      id: Date.now().toString(),
      name: newItem.trim(),
      category,
      purchased: false,
      source: "Manual"
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

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
    </div>
  );

  const purchasedCount = items.filter(i => i.purchased).length;
  const totalCount = items.length;
  const progress = totalCount === 0 ? 0 : Math.round((purchasedCount / totalCount) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-28 md:pb-8">
      
      {/* NXUS-Style Top Bar */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <div className="flex gap-3">
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/60 tracking-wider">
            {new Date().getFullYear()}
          </div>
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/60 tracking-wider">
            {new Date().toLocaleString('default', { month: 'long' })}
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1 mb-1">
            <ArrowUpRight className="w-3 h-3"/> ACQUIRED
          </div>
          <div className="text-5xl md:text-6xl font-black text-white leading-none tracking-tighter">
            {progress}<span className="text-3xl text-white/50">%</span>
          </div>
          <div className="text-xs font-bold text-emerald-500/70 mt-1 flex items-center gap-1">
            {purchasedCount} / {totalCount} items
          </div>
        </div>
      </div>

      {/* Mini Stats Row */}
      <div className="flex flex-wrap items-center gap-8 mb-10 px-2">
        {["Protein", "Produce", "Dairy"].map(cat => {
          const catItems = items.filter(i => i.category === cat);
          const catPurchased = catItems.filter(i => i.purchased).length;
          const catTotal = catItems.length;
          const catProg = catTotal === 0 ? 0 : Math.round((catPurchased / catTotal) * 100);
          
          return (
            <div key={cat} className="flex items-center gap-4">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 absolute inset-0">
                  <circle cx="50" cy="50" r="40" className="stroke-white/5" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="40" 
                    className={`transition-all duration-1000 ease-out ${catProg === 100 ? 'stroke-emerald-400' : 'stroke-blue-400'}`} 
                    strokeWidth="8" strokeLinecap="round" fill="none" 
                    strokeDasharray={251.2} strokeDashoffset={251.2 - (catProg / 100) * 251.2} 
                  />
                </svg>
                <span className="text-[10px] font-bold text-white font-mono">{catProg}%</span>
              </div>
              <span className="text-xs font-bold text-white/50 tracking-wider uppercase">{cat}</span>
            </div>
          );
        })}
      </div>

      {/* Data Grid Table (NXUS Style) */}
      <div className="rounded-xl border border-white/5 bg-[#0a0a0a] overflow-hidden shadow-2xl">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h3 className="text-sm font-bold text-white/80 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-white/40" /> List Overview
          </h3>
          <button 
            onClick={() => {
              setIsSyncing(true);
              setTimeout(() => setIsSyncing(false), 1000);
            }}
            className="px-4 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition-all flex items-center gap-2"
          >
            {isSyncing ? <div className="w-3 h-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Sync AI
          </button>
        </div>

        {/* Table Container (Scrollable on Mobile) */}
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-bold text-white/30 uppercase tracking-widest bg-black/40">
              <div className="col-span-1 text-center">Buy</div>
              <div className="col-span-5">Item</div>
              <div className="col-span-3">Category</div>
              <div className="col-span-2">Source</div>
              <div className="col-span-1 text-right">Act</div>
            </div>

            {/* Add Item Row */}
            <form onSubmit={handleAddItem} className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 items-center bg-white/[0.01] hover:bg-white/[0.03] transition-colors focus-within:bg-white/[0.03]">
              <div className="col-span-1 flex justify-center">
                <Plus className="w-4 h-4 text-white/20" />
              </div>
              <div className="col-span-11">
                <input 
                  type="text" 
                  placeholder="Quick add item..."
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  className="w-full bg-transparent border-none text-sm font-medium text-white focus:outline-none placeholder:text-white/20"
                />
              </div>
              <button type="submit" className="hidden" />
            </form>

            {/* Table Rows */}
            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-white/20">
                  <AlertCircle className="w-8 h-8 mb-3 opacity-50" />
                  <p className="text-xs font-bold tracking-widest uppercase">No Data Found</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {/* Sort items: pending first, then purchased */}
                  {[...items].sort((a, b) => (a.purchased === b.purchased ? 0 : a.purchased ? 1 : -1)).map((item, idx) => (
                    <div 
                      key={item.id} 
                      className={`grid grid-cols-12 gap-4 px-6 py-3 items-center border-b border-white/5 transition-colors hover:bg-white/[0.02] ${item.purchased ? 'opacity-40 bg-black/20' : ''}`}
                    >
                      <div className="col-span-1 flex justify-center">
                        <button 
                          onClick={() => togglePurchased(item.id)}
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${item.purchased ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-white/20 hover:border-white/40'}`}
                        >
                          {item.purchased && <svg viewBox="0 0 14 14" className="w-3 h-3 fill-current"><path d="M5.5 10.5L2 7l1.4-1.4 2.1 2.1 5.1-5.1L12 4l-6.5 6.5z"/></svg>}
                        </button>
                      </div>
                      <div className={`col-span-5 text-sm font-medium ${item.purchased ? 'text-white/50 line-through' : 'text-white/90'}`}>
                        {item.name}
                      </div>
                      <div className="col-span-3">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${getCategoryColor(item.category)}`}>
                          {item.category}
                        </span>
                      </div>
                      <div className="col-span-2 text-xs font-medium text-white/30 flex items-center gap-1.5">
                        {item.source === 'AI Sync' ? <Sparkles className="w-3 h-3 text-emerald-500/50" /> : <div className="w-1 h-1 rounded-full bg-white/20" />}
                        {item.source}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button 
                          onClick={() => deleteItem(item.id)}
                          className="w-6 h-6 rounded flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
