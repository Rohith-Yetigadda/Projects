import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, Check, Loader2, ImagePlus, ChevronRight, Plus, FileText, Sparkles, Coffee, Sun, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";

type MealPlan = {
  day: string;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
};

type FileItem = {
  preview: string;       // data URL for preview (image) or empty for pdf
  base64: string;        // raw base64 (no prefix)
  mimeType: string;
  name: string;
  isPdf: boolean;
};

// Client-side sanitization ensuring food items never carry hardcoded portion/quantity suffixes
function cleanFoodName(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\s*[-–—:]\s*\d+\s*(?:pc|pcs|nos|no|g|gm|gms|ml|cup|cups|plate|plates|bowl|bowls)?$/i, "")
    .replace(/\s*\(\s*\d+\s*(?:pc|pcs|nos|no|g|gm|gms|ml|cup|cups|plate|plates|bowl|bowls)?\s*\)$/i, "")
    .replace(/\s+\d+\s*(?:pc|pcs|nos|no|g|gm|gms|ml)\s*$/i, "")
    .replace(/^\s*[-*•]\s*/, "")
    .trim();
}

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MenuUpload() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [files, setFiles] = useState<FileItem[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedMenu, setExtractedMenu] = useState<MealPlan[] | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | "all">(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    setError("");

    Array.from(selected).forEach(file => {
      const isPdf = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");
      if (!isPdf && !isImage) {
        setError("Only image files and PDFs are supported.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(",")[1];
        setFiles(prev => [...prev, {
          preview: isPdf ? "" : dataUrl,
          base64,
          mimeType: file.type,
          name: file.name,
          isPdf,
        }]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processMenu = async () => {
    if (files.length === 0) return;
    setIsExtracting(true);
    setError("");

    try {
      const res = await fetch("/api/compass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extract_menu",
          payload: {
            files: files.map(f => ({ base64: f.base64, mimeType: f.mimeType }))
          }
        })
      });

      if (!res.ok) {
        let errStr = "Failed to extract menu.";
        try {
          const errData = await res.json();
          errStr = errData.details || errData.error || errStr;
        } catch(e) {
           errStr += ` Server status: ${res.status}`;
        }
        throw new Error(errStr);
      }
      
      const data = await res.json();
      if (data.menu && Array.isArray(data.menu)) {
        // Run cleaning rule to eliminate any "-1pc" or portion string from food titles
        const cleaned: MealPlan[] = data.menu.map((d: MealPlan) => ({
          day: d.day || "Unknown",
          breakfast: (d.breakfast || []).map(cleanFoodName).filter(Boolean),
          lunch: (d.lunch || []).map(cleanFoodName).filter(Boolean),
          dinner: (d.dinner || []).map(cleanFoodName).filter(Boolean),
        }));
        setExtractedMenu(cleaned);
        setSelectedDayIndex(0);
      } else {
        throw new Error("Could not parse menu data properly.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while reading the menu.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleItemChange = (dayIndex: number, meal: "breakfast" | "lunch" | "dinner", itemIndex: number, value: string) => {
    if (!extractedMenu) return;
    const newMenu = [...extractedMenu];
    newMenu[dayIndex][meal][itemIndex] = value;
    setExtractedMenu(newMenu);
  };

  const handleAddItem = (dayIndex: number, meal: "breakfast" | "lunch" | "dinner") => {
    if (!extractedMenu) return;
    const newMenu = [...extractedMenu];
    newMenu[dayIndex][meal].push("");
    setExtractedMenu(newMenu);
  };

  const handleRemoveItem = (dayIndex: number, meal: "breakfast" | "lunch" | "dinner", itemIndex: number) => {
    if (!extractedMenu) return;
    const newMenu = [...extractedMenu];
    newMenu[dayIndex][meal].splice(itemIndex, 1);
    setExtractedMenu(newMenu);
  };

  const confirmMenu = async () => {
    if (!currentUser || !extractedMenu) return;
    setIsExtracting(true);
    try {
      const menuId = new Date().toISOString().split("T")[0];
      // Final pass to ensure clean names
      const finalized = extractedMenu.map(d => ({
        day: d.day,
        breakfast: d.breakfast.map(cleanFoodName).filter(Boolean),
        lunch: d.lunch.map(cleanFoodName).filter(Boolean),
        dinner: d.dinner.map(cleanFoodName).filter(Boolean),
      }));

      // Immediately classify every item in the whole menu with Gemini in 1 batch call
      const allUniqueDishes = Array.from(new Set(
        finalized.flatMap(d => [...d.breakfast, ...d.lunch, ...d.dinner])
      ));

      let portionProfiles: Record<string, any> = {};
      try {
        const portionRes = await fetch("/api/compass", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "batch_classify_food_portions", payload: { foods: allUniqueDishes } }),
        });
        if (portionRes.ok) {
          const pData = await portionRes.json();
          if (pData && typeof pData === "object" && !pData.error) {
            portionProfiles = pData;
            // Also store directly in localStorage for instant 0ms access in Daily Log
            for (const name in pData) {
              const clean = cleanFoodName(name).toLowerCase();
              try { localStorage.setItem("recompass_portion_v5_" + clean, JSON.stringify(pData[name])); } catch {}
            }
          }
        }
      } catch (e) {
        console.warn("Failed to pre-classify menu portions upon upload:", e);
      }

      await setDoc(doc(db, "users", currentUser.uid, "menus", menuId), {
        startDate: new Date().toISOString(),
        status: "confirmed",
        uploadedAt: new Date().toISOString(),
        extractedData: finalized,
        portionProfiles,
      });
      navigate("/app/week");
    } catch (err: any) {
      setError("Failed to save menu.");
    } finally {
      setIsExtracting(false);
    }
  };

  if (extractedMenu) {
    const visiblePlans = selectedDayIndex === "all" 
      ? extractedMenu.map((p, idx) => ({ plan: p, realIdx: idx }))
      : [{ plan: extractedMenu[selectedDayIndex] || extractedMenu[0], realIdx: typeof selectedDayIndex === "number" ? selectedDayIndex : 0 }];

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-2 sm:pb-4">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-emerald-400 mb-2.5">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>AI Extraction Complete</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tightest font-sans">Review Mess Menu</h1>
            <p className="text-sm font-normal text-white/45 mt-1.5">
              Food names cleaned of hardcoded quantity suffixes. Review each day before confirming.
            </p>
          </div>
        </header>

        {/* Day Selector Pill Tabs to drastically reduce mobile scrolling */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {extractedMenu.map((plan, idx) => {
            const isSelected = selectedDayIndex === idx;
            const shortName = DAYS_SHORT[idx] || plan.day.slice(0, 3);
            return (
              <button
                key={plan.day + idx}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all shrink-0 ${
                  isSelected
                    ? "bg-white text-black shadow-md"
                    : "bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                {shortName}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSelectedDayIndex("all")}
            className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all shrink-0 ${
              selectedDayIndex === "all"
                ? "bg-white text-black shadow-md"
                : "bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            All Days
          </button>
        </div>

        {/* Meal cards for the active day(s) */}
        <div className="space-y-6">
          {visiblePlans.map(({ plan, realIdx }) => (
            <div key={plan.day + realIdx} className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 sm:p-7 space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <h2 className="text-base font-extrabold text-white tracking-tight">{plan.day}</h2>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  {plan.breakfast.length + plan.lunch.length + plan.dinner.length} items logged
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { key: "breakfast" as const, label: "Breakfast", icon: Coffee, color: "text-amber-400" },
                  { key: "lunch" as const, label: "Lunch", icon: Sun, color: "text-emerald-400" },
                  { key: "dinner" as const, label: "Dinner", icon: Moon, color: "text-blue-400" },
                ].map(meal => {
                  const Icon = meal.icon;
                  const items = plan[meal.key];
                  return (
                    <div key={meal.key} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${meal.color}`} />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">{meal.label}</h3>
                      </div>

                      <div className="space-y-2">
                        {items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex items-center gap-2 group">
                            <Input
                              value={item}
                              onChange={(e) => handleItemChange(realIdx, meal.key, itemIdx, e.target.value)}
                              className="bg-white/[0.03] border-white/[0.08] text-sm text-white font-medium h-9 rounded-xl focus:border-white/30"
                              placeholder="Food item name..."
                            />
                            <button
                              onClick={() => handleRemoveItem(realIdx, meal.key, itemIdx)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Remove item"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        <button
                          onClick={() => handleAddItem(realIdx, meal.key)}
                          className="w-full py-2 rounded-xl border border-dashed border-white/10 hover:border-white/25 text-white/40 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mt-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add item
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Mobile & Desktop Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0c]/90 backdrop-blur-2xl border-t border-white/[0.08] z-30 flex items-center justify-between gap-4 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setExtractedMenu(null)}
            className="text-white/60 hover:text-white text-xs uppercase tracking-wider font-bold rounded-full px-5"
          >
            Start Over
          </Button>
          <Button
            onClick={confirmMenu}
            disabled={isExtracting}
            className="bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full px-7 h-11 hover:bg-white/90 active:scale-[0.99] transition-all shadow-xl"
          >
            {isExtracting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving Schedule...</>
            ) : (
              <><Check className="w-4 h-4 mr-2 text-emerald-600 stroke-[3]" /> Confirm Menu</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-2 sm:pb-4">
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-white/50 mb-2.5">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Mess Timetable Parser</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tightest font-sans">Upload Mess Menu</h1>
        <p className="text-sm font-normal text-white/45 mt-1.5">
          Upload photo or PDF of your hostel or campus mess schedule. Gemini AI will automatically extract dishes and remove quantity suffixes.
        </p>
      </header>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-400 font-semibold text-xs border border-rose-500/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {files.map((file, i) => (
          <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden group bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
            {file.isPdf ? (
              <div className="flex flex-col items-center justify-center gap-2 p-3 text-center">
                <FileText className="w-10 h-10 text-white/60" />
                <span className="text-xs text-white/60 font-medium truncate w-full text-center px-2">{file.name}</span>
                <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">PDF</span>
              </div>
            ) : (
              <img src={file.preview} alt={`Menu page ${i + 1}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            )}
            <button
              onClick={() => removeFile(i)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center hover:bg-rose-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/10 hover:border-white/30 hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-3 text-white/40 hover:text-white"
        >
          <ImagePlus className="w-7 h-7" />
          <div className="text-center">
            <span className="text-xs font-bold block">Add Document</span>
            <span className="text-[10px] text-white/30">Photo or PDF</span>
          </div>
        </button>
      </div>

      <input
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      <div className="flex justify-end pt-4 border-t border-white/[0.06]">
        <Button
          onClick={processMenu}
          disabled={files.length === 0 || isExtracting}
          className="w-full sm:w-auto bg-white text-black font-bold h-12 px-8 rounded-full hover:bg-white/90 active:scale-[0.99] transition-all text-xs uppercase tracking-wider shadow-lg disabled:opacity-40"
        >
          {isExtracting ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Extracting weekly menu with Gemini AI...</>
          ) : (
            <>Extract Weekly Menu <ChevronRight className="w-4 h-4 ml-2" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
