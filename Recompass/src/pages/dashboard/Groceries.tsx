import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Plus, Check, Sparkles, Trash2, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";

type GroceryItem = {
  id: string;
  name: string;
  category: string;
  purchased: boolean;
};

const getCategoryColor = (cat: string) => {
  switch (cat) {
    case "Protein": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "Produce": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "Dairy": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "Snacks": return "text-rose-400 bg-rose-400/10 border-rose-400/20";
    case "Supplements": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
    case "Grains": return "text-yellow-200 bg-yellow-200/10 border-yellow-200/20";
    case "Spices": return "text-orange-400 bg-orange-400/10 border-orange-400/20";
    case "Oils": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    default: return "text-white/60 bg-white/5 border-white/10";
  }
};

export default function Groceries() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");

  const [sortBy, setSortBy] = useState<"name" | "category">("category");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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
    if (lower.includes("chicken") || lower.includes("egg") || lower.includes("whey") || lower.includes("meat") || lower.includes("fish") || lower.includes("mutton") || lower.includes("soya")) category = "Protein";
    else if (lower.includes("milk") || lower.includes("cheese") || lower.includes("yogurt") || lower.includes("paneer") || lower.includes("curd") || lower.includes("ghee") || lower.includes("butter")) category = "Dairy";
    else if (lower.includes("apple") || lower.includes("banana") || lower.includes("spinach") || lower.includes("veg") || lower.includes("tomato") || lower.includes("onion") || lower.includes("potato") || lower.includes("fruit")) category = "Produce";
    else if (lower.includes("bar") || lower.includes("chips") || lower.includes("snack") || lower.includes("biscuit") || lower.includes("cookie")) category = "Snacks";
    else if (lower.includes("creatine") || lower.includes("vitamin") || lower.includes("protein")) category = "Supplements";
    else if (lower.includes("rice") || lower.includes("wheat") || lower.includes("atta") || lower.includes("flour") || lower.includes("dal") || lower.includes("lentil") || lower.includes("oat") || lower.includes("pasta") || lower.includes("bread")) category = "Grains";
    else if (lower.includes("cumin") || lower.includes("turmeric") || lower.includes("chili") || lower.includes("salt") || lower.includes("pepper") || lower.includes("spice") || lower.includes("garlic") || lower.includes("ginger")) category = "Spices";
    else if (lower.includes("oil")) category = "Oils";

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
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
    </div>
  );

  const pendingCount = items.filter(i => !i.purchased).length;
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
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-8 animate-in fade-in duration-500 pb-32 md:pb-8">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Shopping List</h1>
          <p className="text-sm font-medium text-white/40 mt-1">
            {pendingCount === 0 ? "You're all stocked up." : `${pendingCount} items remaining`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {items.filter(i => i.purchased).length > 0 && (
            <button 
              onClick={clearPurchased}
              className="text-xs font-semibold text-white/30 hover:text-red-400 px-3 py-2 rounded-lg transition-colors"
            >
              Clear Purchased
            </button>
          )}
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-[#050505] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Table Header */}
        <div className="grid grid-cols-[48px_1fr_120px_60px] md:grid-cols-[64px_1fr_200px_100px] items-center px-4 py-3 bg-white/[0.02] border-b border-white/5 text-xs font-bold text-white/30 uppercase tracking-widest">
          <div className="text-center">#</div>
          <button 
            onClick={() => handleSort("name")}
            className="flex items-center gap-1 hover:text-white/60 transition-colors justify-start uppercase tracking-widest font-bold"
          >
            Item Name
            {sortBy === "name" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>
          <button 
            onClick={() => handleSort("category")}
            className="flex items-center gap-1 hover:text-white/60 transition-colors justify-start uppercase tracking-widest font-bold"
          >
            Category
            {sortBy === "category" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>
          <div className="text-center"></div> {/* Blank Action Header */}
        </div>

        {/* Quick Add Row */}
        <form onSubmit={handleAddItem} className="grid grid-cols-[48px_1fr_120px_60px] md:grid-cols-[64px_1fr_200px_100px] items-center px-4 h-14 border-b border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors focus-within:bg-white/[0.03]">
          <div className="flex justify-center">
            <Plus className="w-4 h-4 text-white/20" />
          </div>
          <input 
            type="text" 
            placeholder="Quick add item... (e.g. Eggs, Bananas)"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            className="w-full h-full bg-transparent border-none focus:outline-none text-sm font-medium text-white placeholder:text-white/20"
          />
          <div className="text-xs font-medium text-white/20">--</div>
          <button type="submit" className="hidden" />
        </form>

        {/* Table Body */}
        <div className="flex flex-col">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/20">
              <ShoppingCart className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-semibold tracking-wide">No items in your list</p>
            </div>
          ) : (
            sortedItems.map(item => (
              <div 
                key={item.id} 
                className={`group grid grid-cols-[48px_1fr_120px_60px] md:grid-cols-[64px_1fr_200px_100px] items-center px-4 min-h-[56px] border-b border-white/5 transition-colors hover:bg-white/[0.02] ${item.purchased ? 'bg-black/40 opacity-50' : ''}`}
              >
                {/* Checkbox Col */}
                <div className="flex justify-center">
                  <button 
                    onClick={() => togglePurchased(item.id)}
                    className={`w-4 h-4 md:w-5 md:h-5 rounded flex items-center justify-center border transition-all ${item.purchased ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-white/20 hover:border-emerald-400/50'}`}
                  >
                    {item.purchased && <Check className="w-3 h-3 md:w-3.5 md:h-3.5 stroke-[3]" />}
                  </button>
                </div>
                
                {/* Item Name Col */}
                <div className={`text-sm md:text-[15px] font-medium truncate pr-4 ${item.purchased ? 'text-white/40 line-through' : 'text-white/90'}`}>
                  {item.name}
                </div>
                
                {/* Category Badge Col */}
                <div className="flex items-center">
                  <span className={`px-2 py-1 rounded-md text-[9px] md:text-[10px] font-bold uppercase tracking-widest border ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                </div>
                
                {/* Action Col */}
                <div className="flex justify-center">
                  <button 
                    onClick={() => deleteItem(item.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/0 group-hover:text-white/30 hover:!text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
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
