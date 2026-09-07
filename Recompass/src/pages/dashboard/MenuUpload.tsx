import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, Check, Loader2, ImagePlus, ChevronRight, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type MealPlan = {
  day: string;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
};

export default function MenuUpload() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [images, setImages] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedMenu, setExtractedMenu] = useState<MealPlan[] | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setError("");
    
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are supported right now.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const processMenu = async () => {
    if (images.length === 0) return;
    setIsExtracting(true);
    setError("");

    try {
      const res = await fetch("/api/compass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extract_menu",
          payload: { images }
        })
      });

      if (!res.ok) throw new Error("Failed to extract menu.");
      
      const data = await res.json();
      if (data.menu && Array.isArray(data.menu)) {
        setExtractedMenu(data.menu);
      } else {
        throw new Error("Could not parse menu data properly.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while reading the menu.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleItemChange = (dayIndex: number, meal: 'breakfast' | 'lunch' | 'dinner', itemIndex: number, value: string) => {
    if (!extractedMenu) return;
    const newMenu = [...extractedMenu];
    newMenu[dayIndex][meal][itemIndex] = value;
    setExtractedMenu(newMenu);
  };

  const handleAddItem = (dayIndex: number, meal: 'breakfast' | 'lunch' | 'dinner') => {
    if (!extractedMenu) return;
    const newMenu = [...extractedMenu];
    newMenu[dayIndex][meal].push("");
    setExtractedMenu(newMenu);
  };

  const handleRemoveItem = (dayIndex: number, meal: 'breakfast' | 'lunch' | 'dinner', itemIndex: number) => {
    if (!extractedMenu) return;
    const newMenu = [...extractedMenu];
    newMenu[dayIndex][meal].splice(itemIndex, 1);
    setExtractedMenu(newMenu);
  };

  const confirmMenu = async () => {
    if (!currentUser || !extractedMenu) return;
    setIsExtracting(true);
    try {
      const menuId = new Date().toISOString().split('T')[0]; // Simple ID based on date
      await setDoc(doc(db, "users", currentUser.uid, "menus", menuId), {
        startDate: new Date().toISOString(),
        status: "confirmed",
        uploadedAt: new Date().toISOString(),
        extractedData: extractedMenu
      });
      navigate("/app");
    } catch (err: any) {
      setError("Failed to save menu.");
    } finally {
      setIsExtracting(false);
    }
  };

  if (extractedMenu) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-white">Review Your Menu</h1>
          <p className="text-emerald-400 font-medium mt-1">We found your weekly menu. Please review it before we build your plan.</p>
        </header>

        <div className="space-y-8">
          {extractedMenu.map((dayPlan, dayIndex) => (
            <Card key={dayIndex} className="glass-card border-none text-white p-6 rounded-2xl">
              <h2 className="text-xl font-bold uppercase tracking-wider mb-6 text-white/90 border-b border-white/10 pb-4">{dayPlan.day}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(['breakfast', 'lunch', 'dinner'] as const).map(meal => (
                  <div key={meal} className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-white/50">{meal}</h3>
                    <div className="space-y-2">
                      {dayPlan[meal].map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center gap-2">
                          <Input 
                            value={item}
                            onChange={(e) => handleItemChange(dayIndex, meal, itemIndex, e.target.value)}
                            className="bg-black/40 border-white/5 text-sm h-10"
                          />
                          <button onClick={() => handleRemoveItem(dayIndex, meal, itemIndex)} className="text-white/30 hover:text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => handleAddItem(dayIndex, meal)} className="text-xs font-semibold text-white/50 hover:text-white flex items-center gap-1 mt-2">
                        <Plus className="w-3 h-3" /> Add item
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-4 sticky bottom-4 z-50 bg-black/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10">
          <Button variant="ghost" onClick={() => setExtractedMenu(null)} className="text-white hover:bg-white/10">Start Over</Button>
          <Button onClick={confirmMenu} disabled={isExtracting} className="bg-white text-black font-bold px-8">
            {isExtracting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            Confirm Menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Upload This Week's Menu</h1>
        <p className="text-muted-foreground font-medium">Upload photos of your mess menu. We'll extract the meals and build your nutrition plan.</p>
      </header>

      {error && <div className="p-4 rounded-xl bg-red-500/10 text-red-400 font-semibold text-sm border border-red-500/20">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((img, i) => (
          <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden group bg-white/5 border border-white/10">
            <img src={img} alt={`Menu page ${i + 1}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <button 
              onClick={() => removeImage(i)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-3 text-white/50 hover:text-white"
        >
          <ImagePlus className="w-8 h-8" />
          <span className="text-sm font-semibold">Add Image</span>
        </button>
      </div>

      <input 
        type="file" 
        multiple 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleImageSelect}
      />

      <div className="flex justify-end pt-4 border-t border-white/10">
        <Button 
          onClick={processMenu} 
          disabled={images.length === 0 || isExtracting}
          className="bg-white text-black font-bold h-12 px-8 rounded-xl hover:scale-105 transition-transform"
        >
          {isExtracting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Reading your full weekly menu...
            </>
          ) : (
            <>
              Extract Menu <ChevronRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
