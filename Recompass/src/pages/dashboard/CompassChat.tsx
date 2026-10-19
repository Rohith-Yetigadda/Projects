import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, collection, query, orderBy, limit, getDocs, addDoc, setDoc, serverTimestamp, where, writeBatch, Timestamp, deleteDoc } from "firebase/firestore";
import {
  Send, Compass, User as UserIcon, ImagePlus, X, History, Plus, MessageSquare, Trash2,
  UtensilsCrossed, Package, ShoppingCart, Target, ChefHat, Bookmark, Sparkles
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clearCachedData } from "@/lib/dataCache";
import { getLocalDateStr } from "@/lib/dateUtils";
import { getStockStatus } from "@/pages/dashboard/Pantry";
import { fastClassifyFood } from "@/lib/geminiClassifier";

export type AgentAction = {
  id: string;
  type: string;
  title: string;
  description: string;
  store: "nutrition" | "pantry" | "groceries" | "profile" | "menu" | "staples";
  status: "success" | "error";
  details?: Record<string, any>;
};

type Message = {
  id?: string;
  role: "user" | "model";
  text: string;
  image?: string;
  actions?: AgentAction[];
  createdAt?: any;
};

type ChatSession = { id: string; title: string; updatedAt: any };

function AgentActionCard({ action }: { action: AgentAction }) {
  const iconConfig = {
    nutrition: { icon: UtensilsCrossed, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
    pantry:    { icon: Package,         color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20"    },
    groceries: { icon: ShoppingCart,    color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20"   },
    profile:   { icon: Target,          color: "text-purple-400",  bg: "bg-purple-400/10",  border: "border-purple-400/20"  },
    menu:      { icon: ChefHat,         color: "text-rose-400",    bg: "bg-rose-400/10",    border: "border-rose-400/20"    },
    staples:   { icon: Bookmark,        color: "text-amber-300",   bg: "bg-amber-300/10",   border: "border-amber-300/20"   },
  }[action.store] || { icon: Sparkles, color: "text-white/70", bg: "bg-white/[0.05]", border: "border-white/[0.08]" };

  const Icon = iconConfig.icon;

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-3 flex items-start gap-3 shadow-md mt-2.5 transition-all hover:bg-white/[0.05] animate-in fade-in zoom-in-95 duration-200">
      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border ${iconConfig.bg} ${iconConfig.border}`}>
        <Icon className={`w-4 h-4 ${iconConfig.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-white tracking-tight">{action.title}</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Verified
          </span>
        </div>
        <p className="text-[11px] text-white/60 font-sans mt-0.5 leading-relaxed">{action.description}</p>
      </div>
    </div>
  );
}

const compressImage = (dataUrl: string, maxWidth = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.7)); 
    };
    img.src = dataUrl;
  });
};

export default function CompassChat() {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  
  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextStr, setContextStr] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Image State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // 1. Load Sessions on Mount
  useEffect(() => {
    if (!currentUser) return;
    const loadSessions = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoTs = Timestamp.fromDate(thirtyDaysAgo);

        const sessionsRef = collection(db, "users", currentUser.uid, "compass_sessions");
        
        // Clean old sessions
        const oldQuery = query(sessionsRef, where("updatedAt", "<", thirtyDaysAgoTs));
        const oldSnap = await getDocs(oldQuery);
        if (!oldSnap.empty) {
          const batch = writeBatch(db);
          oldSnap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }

        // Load valid sessions
        const recentQuery = query(sessionsRef, where("updatedAt", ">=", thirtyDaysAgoTs), orderBy("updatedAt", "desc"));
        const recentSnap = await getDocs(recentQuery);
        
        const loadedSessions: ChatSession[] = [];
        recentSnap.docs.forEach(d => {
          loadedSessions.push({ id: d.id, ...d.data() } as ChatSession);
        });
        
        setSessions(loadedSessions);
        if (loadedSessions.length > 0) {
          setCurrentSessionId(loadedSessions[0].id);
        } else {
          setIsInitializing(false); // No sessions yet
        }
      } catch (e) {
        console.error("Error loading sessions:", e);
        setIsInitializing(false);
      }
    };
    loadSessions();
  }, [currentUser]);

  // 2. Load Messages when Session Changes
  useEffect(() => {
    if (!currentUser || !currentSessionId) {
      if (!currentSessionId) setIsInitializing(false);
      return;
    }
    
    const loadMessages = async () => {
      setIsInitializing(true);
      try {
        const msgsRef = collection(db, "users", currentUser.uid, "compass_sessions", currentSessionId, "messages");
        const q = query(msgsRef, orderBy("createdAt", "asc"));
        const snap = await getDocs(q);
        
        const loadedMsgs: Message[] = [];
        snap.docs.forEach(d => {
          const data = d.data();
          loadedMsgs.push({
            id: d.id,
            role: data.role,
            text: data.text || "",
            image: data.image || undefined,
            actions: data.actions || undefined,
            createdAt: data.createdAt
          });
        });
        setMessages(loadedMsgs);
      } catch (e) {
        console.error("Error loading messages:", e);
      } finally {
        setIsInitializing(false);
      }
    };
    loadMessages();
  }, [currentUser, currentSessionId]);

  // 3. Load Context for Omniscient AI Agent
  useEffect(() => {
    if (!currentUser) return;
    const loadCtx = async () => {
      const today = getLocalDateStr();
      const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

      // Daily Logs
      const logSnap = await getDoc(doc(db, "users", currentUser.uid, "logs", today));
      const logData = logSnap.exists() ? logSnap.data() : null;

      // Weekly Menu
      const menuSnap = await getDocs(query(collection(db, "users", currentUser.uid, "menus"), orderBy("uploadedAt","desc"), limit(1)));
      let menuStr = "No menu uploaded.";
      let fullWeeklyMenu: any[] = [];
      if (!menuSnap.empty) {
        fullWeeklyMenu = menuSnap.docs[0].data().extractedData || [];
        const todayMenu = fullWeeklyMenu.find((d:any) => d.day === dayName) || fullWeeklyMenu[0];
        if (todayMenu) menuStr = JSON.stringify(todayMenu);
      }

      // Parallelize Pantry, Groceries, and Staples fetches for instant response
      const [pantrySnap, grocSnap, staplesSnap] = await Promise.all([
        getDoc(doc(db, "users", currentUser.uid, "pantry", "current")),
        getDoc(doc(db, "users", currentUser.uid, "groceries", "current")),
        getDocs(collection(db, "users", currentUser.uid, "staples"))
      ]);

      const pantryItems = pantrySnap.exists() ? (pantrySnap.data().items || []) : [];
      const pantryStr = pantryItems.length > 0
        ? pantryItems.map((p: any) => `${p.name}: ${p.quantity} ${p.unit} (${p.category})`).join(", ")
        : "No items currently logged in pantry.";

      const grocItems = grocSnap.exists() ? (grocSnap.data().items || []) : [];
      const grocStr = grocItems.length > 0
        ? grocItems.map((g: any) => `${g.name} (${g.category})${g.purchased ? " [Purchased]" : ""}`).join(", ")
        : "No grocery items currently on list.";

      const staplesList: any[] = [];
      staplesSnap.docs.forEach(d => staplesList.push({ id: d.id, ...d.data() }));
      const staplesStr = staplesList.length > 0
        ? staplesList.map((s: any) => `${s.name} (${s.mealType}): ${s.calories} kcal, P:${s.protein}g, C:${s.carbs}g, F:${s.fats}g`).join("; ")
        : "No custom staples saved.";

      const pData = `Goal: ${userProfile?.goal || "maintain"}\nWeight: ${userProfile?.weight || 70}kg\nTargets: ${JSON.stringify(userProfile?.targetOverrides || "Auto Calculated")}`;
      
      const formatMealItems = (items: any[]) => {
        if (!items || items.length === 0) return "None";
        return items.map((i: any) => `${i.name} (${i.quantity || "1 serving"} - ${i.calories} kcal, P:${i.protein}g, C:${i.carbs}g, F:${i.fats}g)`).join(", ");
      };

      const lData = logData ? `
Breakfast: ${formatMealItems(logData.breakfast)}
Lunch: ${formatMealItems(logData.lunch)}
Dinner: ${formatMealItems(logData.dinner)}
Snacks: ${formatMealItems(logData.snacks)}
Totals Today: ${JSON.stringify(logData.totals || { calories: 0, protein: 0, carbs: 0, fats: 0 })}
` : "Nothing logged yet today.";
      
      setContextStr(`You are Compass, the omniscient and authoritative full-stack AI agent for Recompass. You have full system-level CRUD access across EVERY store in this app:
1. DAILY LOGS: What they ate today or on past dates.
2. STAPLES: Reusable custom meals & recipes saved forever.
3. MESS MENU: The weekly mess dining schedule.
4. PANTRY: Live kitchen stock & quantities.
5. GROCERIES: Active shopping list.
6. PROFILE & TARGETS: Goals, bodyweight, and macro overrides.

PROFILE:
${pData}

TODAY'S LOGGED FOOD (${today}):
${lData}

TODAY'S MESS MENU (${dayName}):
${menuStr}

SAVED USER STAPLES:
${staplesStr}

PANTRY INVENTORY:
${pantryStr}

GROCERY LIST:
${grocStr}

AGENTIC CAPABILITIES (CRITICAL):
You have absolute authority to mutate any data in the app. Whenever the user asks you to log, edit, delete, restock, transfer, save, or adjust anything, you MUST output a JSON command block at the end of your response. Never output raw emoji tags; the UI transforms your commands into hardware-accelerated action badges.

Format:
\`\`\`command
{
  "action": "<ACTION_NAME>",
  "data": { ... }
}
\`\`\`

SUPPORTED ACTIONS:
- "LOG_MEAL": Log item to today (data: { mealType: "breakfast"|"lunch"|"dinner"|"snacks", foodName: string, quantity: string, calories: number, protein: number, carbs: number, fats: number })
- "UPDATE_MEAL": Modify item in today's log (data: { mealType: string, foodName: string to find, updatedName?: string, quantity?: string, calories: number, protein: number, carbs: number, fats: number })
- "REMOVE_MEAL": Delete item from today (data: { mealType: string, foodName: string })
- "CLEAR_TODAY_LOGS": Wipe all meals for today (data: {})
- "LOG_DATE_MEAL": Log food to a specific past/future date (data: { date: "YYYY-MM-DD", mealType: string, foodName: string, quantity: string, calories: number, protein: number, carbs: number, fats: number })
- "REMOVE_DATE_MEAL": Remove food from a date (data: { date: "YYYY-MM-DD", mealType: string, foodName: string })
- "CLEAR_DATE_LOGS": Wipe food logs for a date (data: { date: "YYYY-MM-DD" })
- "ADD_STAPLE": Save reusable recurring meal/shake (data: { name: string, recipe: string, mealType?: "breakfast"|"lunch"|"dinner"|"snacks"|"any", calories: number, protein: number, carbs: number, fats: number })
- "REMOVE_STAPLE": Delete a staple recipe (data: { name: string })
- "LOG_STAPLE": 1-tap log an existing staple to today (data: { stapleName: string, mealType: string })
- "ADD_PANTRY": Restock kitchen (data: { name: string, quantity: number, unit?: string, category?: "Protein"|"Dairy"|"Produce"|"Snacks"|"Supplements"|"Grains"|"Spices"|"Oils"|"Spreads"|"Other" })
- "CONSUME_PANTRY": Deduct kitchen stock (data: { name: string, quantity: number })
- "UPDATE_PANTRY": Edit stock or category (data: { name: string, quantity: number, unit?: string, category?: string })
- "REMOVE_PANTRY": Delete pantry item (data: { name: string })
- "CLEAR_PANTRY": Empty pantry (data: {})
- "RESTOCK_LOW_TO_GROCERIES": Auto-transfer low pantry items to groceries (data: {})
- "ADD_GROCERIES": Add items to shopping list (data: { items: Array<{ name: string, category: "Protein"|"Dairy"|"Produce"|"Snacks"|"Supplements"|"Grains"|"Spices"|"Oils"|"Spreads"|"Other" }> | string[] })
- "REMOVE_GROCERIES": Remove items from list (data: { items: string[] })
- "CHECK_GROCERIES": Mark items bought (data: { items: string[] })
- "UNCHECK_GROCERIES": Unmark items (data: { items: string[] })
- "CLEAR_GROCERIES": Empty grocery list (data: {})
- "TRANSFER_GROCERIES_TO_PANTRY": Move bought grocery items into pantry inventory (data: {})
- "UPDATE_MENU_ITEM": Update mess menu items (data: { day: string, mealType: "breakfast"|"lunch"|"dinner", dishes: string[] })
- "ADD_MENU_ITEM": Add dish to mess menu (data: { day: string, mealType: "breakfast"|"lunch"|"dinner", dish: string })
- "REMOVE_MENU_ITEM": Remove dish from mess menu (data: { day: string, mealType: "breakfast"|"lunch"|"dinner", dish: string })
- "UPDATE_GOAL": Set fitness goal (data: { goal: "fat_loss" | "muscle_gain" | "recomp" | "maintain" })
- "UPDATE_WEIGHT": Log bodyweight (data: { weight: number })
- "UPDATE_TARGETS": Override daily calorie/macro goals (data: { calories: number, protein: number, carbs: number, fats: number })
- "RESET_TARGETS": Reset overrides back to automatic calculation (data: {})
- "UPDATE_PROFILE": Update vitals (data: { age?: number, height?: number, name?: string })

Instructions:
1. Always calculate accurate macros using your nutritional intelligence. Never use fake placeholders.
2. If the user tells you about food they ate, ALWAYS calculate macros and emit LOG_MEAL or UPDATE_MEAL.
3. If the user mentions groceries, pantry, staples, or profile changes, emit the corresponding command.
4. If an image is attached, inspect it:
   - If it contains a food plate, meal, snack, or drink: classify items, estimate macros, and log them if requested.
   - If it contains NO food/drink (selfie, room, objects, pets, documents): politely explain that no food was detected and ask for a picture of their meal.`);
    };
    loadCtx();
  }, [currentUser, userProfile]);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const res = evt.target?.result as string;
      const compressed = await compressImage(res);
      setMimeType("image/jpeg");
      setSelectedImage(compressed);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setShowHistory(false);
  };

  const createNewSession = async () => {
    if (!currentUser) return;
    setMessages([]);
    setCurrentSessionId(null);
  };

  const deleteSession = async (e: React.MouseEvent, id: string | null) => {
    e.stopPropagation();
    if (!id || !currentUser) return;
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "compass_sessions", id));
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
        createNewSession();
      }
    } catch(err) {
      console.error(err);
    }
  };

  const switchSession = (id: string) => {
    if (id === currentSessionId) return;
    setCurrentSessionId(id);
    setShowHistory(false);
  };

  const handleSend = async (text: string) => {
    if ((!text.trim() && !selectedImage) || loading || !currentUser) return;
    
    let base64 = "";
    if (selectedImage) {
      base64 = selectedImage.includes(",") ? selectedImage.split(",")[1] : selectedImage;
    }

    const userMsg: Message = { role: "user", text: text.trim(), image: selectedImage || undefined };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setSelectedImage(null);
    setLoading(true);

    try {
      // Create session if it doesn't exist
      let targetSessionId = currentSessionId;
      if (!targetSessionId) {
        const sessionRef = doc(collection(db, "users", currentUser.uid, "compass_sessions"));
        targetSessionId = sessionRef.id;
        const newSession = {
          title: text.substring(0, 30) + (text.length > 30 ? "..." : "") || "Photo Analysis",
          updatedAt: serverTimestamp()
        };
        await setDoc(sessionRef, newSession);
        
        setCurrentSessionId(targetSessionId);
        setSessions(prev => [{ id: targetSessionId as string, ...newSession, updatedAt: new Date() }, ...prev]);
      } else {
        // Update existing session timestamp
        await setDoc(doc(db, "users", currentUser.uid, "compass_sessions", targetSessionId), {
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      // 1. Save user message to Firestore
      const msgsRef = collection(db, "users", currentUser.uid, "compass_sessions", targetSessionId, "messages");
      await addDoc(msgsRef, {
        role: userMsg.role,
        text: userMsg.text,
        image: userMsg.image || null,
        createdAt: serverTimestamp()
      });

      // 2. Format history for API (strip images)
      const apiHistory = messages.map(m => ({
        role: m.role,
        text: m.text || "Attached an image."
      }));

      // 3. Call AI
      const payload = {
        message: text.trim() || (base64 ? "Please analyze this attached photo." : ""),
        history: apiHistory,
        context: contextStr,
        images: base64 ? [{ base64, mimeType }] : []
      };

      const res = await fetch("/api/compass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", payload })
      });
      const data = await res.json();
      let rawText = data.text || "Something went wrong.";
      
      // Parse Commands
      const commandRegex = /\`\`\`command\n([\s\S]*?)\n\`\`\`/g;
      const commands = [];
      let match;
      while ((match = commandRegex.exec(rawText)) !== null) {
        try { commands.push(JSON.parse(match[1])); } catch (e) {}
      }
      
      // Remove commands from visible text
      rawText = rawText.replace(/\`\`\`command\n[\s\S]*?\n\`\`\`/g, '').trim();
      
      const executedActions: AgentAction[] = [];
      const createActionId = () => "act_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 4);

      for (const cmd of commands) {
        try {
          const actionType = cmd.action;
          const actionData = cmd.data || {};

          // 1. LOG_MEAL
          if (actionType === "LOG_MEAL") {
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
            const logRef = doc(db, "users", currentUser.uid, "logs", today);
            const logSnap = await getDoc(logRef);
            const d = logSnap.exists() ? logSnap.data() : { breakfast: [], lunch: [], dinner: [], snacks: [] };
            
            const mealType = actionData.mealType || "snacks";
            const foodName = (actionData.foodName || "MEAL").toUpperCase();
            const quantity = actionData.quantity || "1 serving";
            const calories = Math.max(0, Math.round(Number(actionData.calories) || 0));
            const protein  = Math.max(0, Math.round((Number(actionData.protein) || 0) * 10) / 10);
            const carbs    = Math.max(0, Math.round((Number(actionData.carbs) || 0) * 10) / 10);
            const fats     = Math.max(0, Math.round((Number(actionData.fats) || 0) * 10) / 10);

            const entry = {
              id: Date.now().toString(),
              name: foodName,
              quantity,
              calories,
              protein,
              carbs,
              fats,
              loggedAt: new Date().toISOString()
            };
            
            d[mealType] = [...(d[mealType] || []), entry];
            const all = [...(d.breakfast || []), ...(d.lunch || []), ...(d.dinner || []), ...(d.snacks || [])];
            d.totals = all.reduce((a: any, i: any) => ({
              calories: a.calories + i.calories,
              protein: a.protein + i.protein,
              carbs: a.carbs + i.carbs,
              fats: a.fats + i.fats
            }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
            
            await setDoc(logRef, { ...d, date: today });
            clearCachedData("daily_log_" + today);
            
            executedActions.push({
              id: createActionId(),
              type: "LOG_MEAL",
              title: "Meal Logged to Daily Intake",
              description: `${quantity} of ${foodName} logged to ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} (${calories} kcal • P: ${protein}g, C: ${carbs}g, F: ${fats}g)`,
              store: "nutrition",
              status: "success",
              details: entry
            });
          }

          // 2. UPDATE_MEAL
          if (actionType === "UPDATE_MEAL") {
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
            const logRef = doc(db, "users", currentUser.uid, "logs", today);
            const logSnap = await getDoc(logRef);
            if (logSnap.exists()) {
              const d = logSnap.data();
              const mealType = actionData.mealType || "lunch";
              const targetName = (actionData.foodName || "").toLowerCase().trim();
              const currentItems = d[mealType] || [];
              
              let matched = false;
              const updatedName = (actionData.updatedName || actionData.foodName || "MEAL").toUpperCase();
              const calories = Math.max(0, Math.round(Number(actionData.calories) || 0));
              const protein  = Math.max(0, Math.round((Number(actionData.protein) || 0) * 10) / 10);
              const carbs    = Math.max(0, Math.round((Number(actionData.carbs) || 0) * 10) / 10);
              const fats     = Math.max(0, Math.round((Number(actionData.fats) || 0) * 10) / 10);

              const updated = currentItems.map((item: any) => {
                const lowerItemName = (item.name || "").toLowerCase();
                if (!matched && (lowerItemName.includes(targetName) || targetName.includes(lowerItemName) || (actionData.id && item.id === actionData.id))) {
                  matched = true;
                  return {
                    ...item,
                    name: updatedName,
                    quantity: actionData.quantity || item.quantity,
                    calories: calories || item.calories,
                    protein: protein || item.protein,
                    carbs: carbs || item.carbs,
                    fats: fats || item.fats,
                    updatedAt: new Date().toISOString()
                  };
                }
                return item;
              });

              d[mealType] = updated;
              const all = [...(d.breakfast || []), ...(d.lunch || []), ...(d.dinner || []), ...(d.snacks || [])];
              d.totals = all.reduce((a: any, i: any) => ({
                calories: a.calories + i.calories,
                protein: a.protein + i.protein,
                carbs: a.carbs + i.carbs,
                fats: a.fats + i.fats
              }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

              await setDoc(logRef, { ...d, date: today });
              clearCachedData("daily_log_" + today);

              executedActions.push({
                id: createActionId(),
                type: "UPDATE_MEAL",
                title: "Meal Record Updated",
                description: `Updated "${updatedName}" in ${mealType} (${calories} kcal • P: ${protein}g, C: ${carbs}g)`,
                store: "nutrition",
                status: "success",
                details: actionData
              });
            }
          }

          // 3. REMOVE_MEAL
          if (actionType === "REMOVE_MEAL") {
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
            const logRef = doc(db, "users", currentUser.uid, "logs", today);
            const logSnap = await getDoc(logRef);
            if (logSnap.exists()) {
              const d = logSnap.data();
              const mealType = actionData.mealType || "lunch";
              const targetName = (actionData.foodName || "").toLowerCase().trim();
              
              let removed = false;
              d[mealType] = (d[mealType] || []).filter((item: any) => {
                const lowerItemName = (item.name || "").toLowerCase();
                if (!removed && (lowerItemName.includes(targetName) || targetName.includes(lowerItemName) || (actionData.id && item.id === actionData.id))) {
                  removed = true;
                  return false;
                }
                return true;
              });

              const all = [...(d.breakfast || []), ...(d.lunch || []), ...(d.dinner || []), ...(d.snacks || [])];
              d.totals = all.reduce((a: any, i: any) => ({
                calories: a.calories + i.calories,
                protein: a.protein + i.protein,
                carbs: a.carbs + i.carbs,
                fats: a.fats + i.fats
              }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

              await setDoc(logRef, { ...d, date: today });
              clearCachedData("daily_log_" + today);

              executedActions.push({
                id: createActionId(),
                type: "REMOVE_MEAL",
                title: "Food Item Deleted",
                description: `Removed "${actionData.foodName}" from ${mealType}`,
                store: "nutrition",
                status: "success",
                details: actionData
              });
            }
          }

          // 4. CLEAR_TODAY_LOGS
          if (actionType === "CLEAR_TODAY_LOGS") {
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
            await setDoc(doc(db, "users", currentUser.uid, "logs", today), { 
              breakfast: [], lunch: [], dinner: [], snacks: [],
              totals: { calories: 0, protein: 0, carbs: 0, fats: 0 }
            }, { merge: true });
            clearCachedData("daily_log_" + today);

            executedActions.push({
              id: createActionId(),
              type: "CLEAR_TODAY_LOGS",
              title: "Daily Nutrition Logs Cleared",
              description: "Cleared all meals and reset calories & macros to 0",
              store: "nutrition",
              status: "success"
            });
          }

          // 5. LOG_DATE_MEAL (Any past/future date)
          if (actionType === "LOG_DATE_MEAL") {
            const targetDate = actionData.date || getLocalDateStr();
            const logRef = doc(db, "users", currentUser.uid, "logs", targetDate);
            const logSnap = await getDoc(logRef);
            const d = logSnap.exists() ? logSnap.data() : { breakfast: [], lunch: [], dinner: [], snacks: [] };
            
            const mealType = actionData.mealType || "lunch";
            const foodName = (actionData.foodName || "MEAL").toUpperCase();
            const quantity = actionData.quantity || "1 serving";
            const calories = Math.max(0, Math.round(Number(actionData.calories) || 0));
            const protein  = Math.max(0, Math.round((Number(actionData.protein) || 0) * 10) / 10);
            const carbs    = Math.max(0, Math.round((Number(actionData.carbs) || 0) * 10) / 10);
            const fats     = Math.max(0, Math.round((Number(actionData.fats) || 0) * 10) / 10);

            const entry = {
              id: Date.now().toString(),
              name: foodName,
              quantity,
              calories,
              protein,
              carbs,
              fats,
              loggedAt: new Date().toISOString()
            };

            d[mealType] = [...(d[mealType] || []), entry];
            const all = [...(d.breakfast || []), ...(d.lunch || []), ...(d.dinner || []), ...(d.snacks || [])];
            d.totals = all.reduce((a: any, i: any) => ({
              calories: a.calories + i.calories,
              protein: a.protein + i.protein,
              carbs: a.carbs + i.carbs,
              fats: a.fats + i.fats
            }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

            await setDoc(logRef, { ...d, date: targetDate });
            clearCachedData("daily_log_" + targetDate);

            executedActions.push({
              id: createActionId(),
              type: "LOG_DATE_MEAL",
              title: "Historical Food Record Logged",
              description: `${entry.quantity} of ${entry.name} logged to ${mealType} on ${targetDate}`,
              store: "nutrition",
              status: "success",
              details: entry
            });
          }

          // 6. REMOVE_DATE_MEAL
          if (actionType === "REMOVE_DATE_MEAL") {
            const targetDate = actionData.date || getLocalDateStr();
            const logRef = doc(db, "users", currentUser.uid, "logs", targetDate);
            const logSnap = await getDoc(logRef);
            if (logSnap.exists()) {
              const d = logSnap.data();
              const mealType = actionData.mealType || "lunch";
              const targetName = (actionData.foodName || "").toLowerCase().trim();
              d[mealType] = (d[mealType] || []).filter((item: any) => !item.name.toLowerCase().includes(targetName));

              const all = [...(d.breakfast || []), ...(d.lunch || []), ...(d.dinner || []), ...(d.snacks || [])];
              d.totals = all.reduce((a: any, i: any) => ({
                calories: a.calories + i.calories,
                protein: a.protein + i.protein,
                carbs: a.carbs + i.carbs,
                fats: a.fats + i.fats
              }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

              await setDoc(logRef, { ...d, date: targetDate });
              clearCachedData("daily_log_" + targetDate);

              executedActions.push({
                id: createActionId(),
                type: "REMOVE_DATE_MEAL",
                title: "Historical Food Record Removed",
                description: `Removed "${actionData.foodName}" from ${targetDate}`,
                store: "nutrition",
                status: "success"
              });
            }
          }

          // 7. CLEAR_DATE_LOGS
          if (actionType === "CLEAR_DATE_LOGS") {
            const targetDate = actionData.date || getLocalDateStr();
            await setDoc(doc(db, "users", currentUser.uid, "logs", targetDate), {
              breakfast: [], lunch: [], dinner: [], snacks: [],
              totals: { calories: 0, protein: 0, carbs: 0, fats: 0 }
            }, { merge: true });
            clearCachedData("daily_log_" + targetDate);

            executedActions.push({
              id: createActionId(),
              type: "CLEAR_DATE_LOGS",
              title: "Historical Log Cleared",
              description: `Cleared all nutrition logs for ${targetDate}`,
              store: "nutrition",
              status: "success"
            });
          }

          // 8. ADD_STAPLE
          if (actionType === "ADD_STAPLE") {
            const stapleId = "staple_" + Date.now();
            const staple = {
              id: stapleId,
              name: (actionData.name || "Custom Recipe").trim(),
              recipe: (actionData.recipe || actionData.name || "").trim(),
              mealType: actionData.mealType || "any",
              calories: Math.max(0, Math.round(Number(actionData.calories) || 0)),
              protein: Math.max(0, Math.round((Number(actionData.protein) || 0) * 10) / 10),
              carbs: Math.max(0, Math.round((Number(actionData.carbs) || 0) * 10) / 10),
              fats: Math.max(0, Math.round((Number(actionData.fats) || 0) * 10) / 10),
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, "users", currentUser.uid, "staples", stapleId), staple);
            clearCachedData("user_staples");

            executedActions.push({
              id: createActionId(),
              type: "ADD_STAPLE",
              title: "Custom Staple Saved",
              description: `Saved "${staple.name}" (${staple.calories} kcal • P: ${staple.protein}g)`,
              store: "staples",
              status: "success",
              details: staple
            });
          }

          // 9. REMOVE_STAPLE
          if (actionType === "REMOVE_STAPLE") {
            const targetName = (actionData.name || "").toLowerCase().trim();
            const staplesSnap = await getDocs(collection(db, "users", currentUser.uid, "staples"));
            let deleted = false;
            for (const d of staplesSnap.docs) {
              const data = d.data();
              if (data.name?.toLowerCase().includes(targetName) || d.id === actionData.id) {
                await deleteDoc(d.ref);
                deleted = true;
                break;
              }
            }
            if (deleted) {
              clearCachedData("user_staples");
              executedActions.push({
                id: createActionId(),
                type: "REMOVE_STAPLE",
                title: "Custom Staple Deleted",
                description: `Removed "${actionData.name}" from your staples library`,
                store: "staples",
                status: "success"
              });
            }
          }

          // 10. LOG_STAPLE (1-tap log staple by name)
          if (actionType === "LOG_STAPLE") {
            const targetName = (actionData.stapleName || actionData.name || "").toLowerCase().trim();
            const mealType = actionData.mealType || "snacks";
            const staplesSnap = await getDocs(collection(db, "users", currentUser.uid, "staples"));
            const matchDoc = staplesSnap.docs.find(d => d.data().name?.toLowerCase().includes(targetName));
            if (matchDoc) {
              const s = matchDoc.data();
              const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
              const logRef = doc(db, "users", currentUser.uid, "logs", today);
              const logSnap = await getDoc(logRef);
              const d = logSnap.exists() ? logSnap.data() : { breakfast: [], lunch: [], dinner: [], snacks: [] };

              const entry = {
                id: Date.now().toString(),
                name: s.name.toUpperCase(),
                quantity: s.recipe || "1 serving",
                calories: s.calories,
                protein: s.protein,
                carbs: s.carbs,
                fats: s.fats,
                loggedAt: new Date().toISOString()
              };

              d[mealType] = [...(d[mealType] || []), entry];
              const all = [...(d.breakfast || []), ...(d.lunch || []), ...(d.dinner || []), ...(d.snacks || [])];
              d.totals = all.reduce((a: any, i: any) => ({
                calories: a.calories + i.calories,
                protein: a.protein + i.protein,
                carbs: a.carbs + i.carbs,
                fats: a.fats + i.fats
              }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

              await setDoc(logRef, { ...d, date: today });
              clearCachedData("daily_log_" + today);

              executedActions.push({
                id: createActionId(),
                type: "LOG_STAPLE",
                title: "Staple Recipe Logged",
                description: `Logged "${s.name}" to ${mealType} (${s.calories} kcal • P: ${s.protein}g)`,
                store: "staples",
                status: "success",
                details: entry
              });
            }
          }

          // 11. ADD_PANTRY
          if (actionType === "ADD_PANTRY") {
            const name = actionData.name;
            if (name) {
              const classified = fastClassifyFood(name);
              let category = actionData.category && actionData.category !== "Other" ? actionData.category : classified.category;
              let unit = actionData.unit || classified.unit || "pcs";
              if (unit === "jar" || unit === "bottle") unit = "g";
              const quantity = Number(actionData.quantity) || classified.quantity || 1;

              const pantryRef = doc(db, "users", currentUser.uid, "pantry", "current");
              const pantrySnap = await getDoc(pantryRef);
              let currentItems = pantrySnap.exists() ? pantrySnap.data().items || [] : [];
              
              const existingIdx = currentItems.findIndex(
                (p: any) => p.name.toLowerCase() === name.toLowerCase()
              );
              
              if (existingIdx >= 0) {
                currentItems[existingIdx] = {
                  ...currentItems[existingIdx],
                  quantity: (currentItems[existingIdx].quantity || 0) + quantity,
                  updatedAt: new Date().toISOString()
                };
              } else {
                currentItems.push({
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  name,
                  category,
                  quantity,
                  unit,
                  lowStockThreshold: 1,
                  updatedAt: new Date().toISOString()
                });
              }
              
              await setDoc(pantryRef, { items: currentItems, lastUpdated: new Date().toISOString() }, { merge: true });
              clearCachedData("user_pantry");

              executedActions.push({
                id: createActionId(),
                type: "ADD_PANTRY",
                title: "Pantry Restocked",
                description: `Added ${quantity} ${unit} of "${name}" to pantry inventory`,
                store: "pantry",
                status: "success"
              });
            }
          }

          // 12. CONSUME_PANTRY
          if (actionType === "CONSUME_PANTRY") {
            const name = actionData.name;
            const quantity = Number(actionData.quantity) || 1;
            if (name) {
              const pantryRef = doc(db, "users", currentUser.uid, "pantry", "current");
              const pantrySnap = await getDoc(pantryRef);
              if (pantrySnap.exists()) {
                let currentItems = pantrySnap.data().items || [];
                const existingIdx = currentItems.findIndex(
                  (p: any) => p.name.toLowerCase() === name.toLowerCase()
                );
                if (existingIdx >= 0) {
                  const newQty = Math.max(0, (currentItems[existingIdx].quantity || 0) - quantity);
                  currentItems[existingIdx] = {
                    ...currentItems[existingIdx],
                    quantity: newQty,
                    updatedAt: new Date().toISOString()
                  };
                  await setDoc(pantryRef, { items: currentItems, lastUpdated: new Date().toISOString() }, { merge: true });
                  clearCachedData("user_pantry");

                  executedActions.push({
                    id: createActionId(),
                    type: "CONSUME_PANTRY",
                    title: "Pantry Inventory Deducted",
                    description: `Used ${quantity} ${currentItems[existingIdx].unit || 'pcs'} of "${name}" (Remaining: ${newQty})`,
                    store: "pantry",
                    status: "success"
                  });
                }
              }
            }
          }

          // 13. UPDATE_PANTRY
          if (actionType === "UPDATE_PANTRY") {
            const name = (actionData.name || "").toLowerCase().trim();
            const pantryRef = doc(db, "users", currentUser.uid, "pantry", "current");
            const pantrySnap = await getDoc(pantryRef);
            if (pantrySnap.exists()) {
              let currentItems = pantrySnap.data().items || [];
              const idx = currentItems.findIndex((p: any) => p.name.toLowerCase().includes(name));
              if (idx >= 0) {
                currentItems[idx] = {
                  ...currentItems[idx],
                  ...(actionData.quantity !== undefined ? { quantity: Number(actionData.quantity) } : {}),
                  ...(actionData.unit ? { unit: actionData.unit } : {}),
                  ...(actionData.category ? { category: actionData.category } : {}),
                  updatedAt: new Date().toISOString()
                };
                await setDoc(pantryRef, { items: currentItems, lastUpdated: new Date().toISOString() }, { merge: true });
                clearCachedData("user_pantry");

                executedActions.push({
                  id: createActionId(),
                  type: "UPDATE_PANTRY",
                  title: "Pantry Item Updated",
                  description: `Updated "${currentItems[idx].name}" (${currentItems[idx].quantity} ${currentItems[idx].unit})`,
                  store: "pantry",
                  status: "success"
                });
              }
            }
          }

          // 14. REMOVE_PANTRY
          if (actionType === "REMOVE_PANTRY") {
            const name = (actionData.name || "").toLowerCase().trim();
            const pantryRef = doc(db, "users", currentUser.uid, "pantry", "current");
            const pantrySnap = await getDoc(pantryRef);
            if (pantrySnap.exists()) {
              let currentItems = pantrySnap.data().items || [];
              const filtered = currentItems.filter((p: any) => !p.name.toLowerCase().includes(name));
              await setDoc(pantryRef, { items: filtered, lastUpdated: new Date().toISOString() }, { merge: true });
              clearCachedData("user_pantry");

              executedActions.push({
                id: createActionId(),
                type: "REMOVE_PANTRY",
                title: "Pantry Item Deleted",
                description: `Removed "${actionData.name}" from pantry`,
                store: "pantry",
                status: "success"
              });
            }
          }

          // 15. CLEAR_PANTRY
          if (actionType === "CLEAR_PANTRY") {
            const pantryRef = doc(db, "users", currentUser.uid, "pantry", "current");
            await setDoc(pantryRef, { items: [], lastUpdated: new Date().toISOString() }, { merge: true });
            clearCachedData("user_pantry");

            executedActions.push({
              id: createActionId(),
              type: "CLEAR_PANTRY",
              title: "Pantry Emptied",
              description: "Cleared all items from pantry inventory",
              store: "pantry",
              status: "success"
            });
          }

          // 16. RESTOCK_LOW_TO_GROCERIES
          if (actionType === "RESTOCK_LOW_TO_GROCERIES") {
            const pantryRef = doc(db, "users", currentUser.uid, "pantry", "current");
            const pantrySnap = await getDoc(pantryRef);
            if (pantrySnap.exists()) {
              const pantryItems = pantrySnap.data().items || [];
              const lowItems = pantryItems.filter((p: any) => getStockStatus(p) !== "in_stock");
              if (lowItems.length > 0) {
                const grocRef = doc(db, "users", currentUser.uid, "groceries", "current");
                const grocSnap = await getDoc(grocRef);
                const currentGroc = grocSnap.exists() ? grocSnap.data().items || [] : [];
                const existingNames = new Set(currentGroc.map((i: any) => i.name.toLowerCase()));
                
                const toAdd = lowItems
                  .filter((p: any) => !existingNames.has(p.name.toLowerCase()))
                  .map((p: any) => ({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name: p.name,
                    category: p.category || "Produce",
                    purchased: false
                  }));

                await setDoc(grocRef, { items: [...currentGroc, ...toAdd], lastUpdated: new Date().toISOString() }, { merge: true });

                executedActions.push({
                  id: createActionId(),
                  type: "RESTOCK_LOW_TO_GROCERIES",
                  title: "Low Stock Restock Triggered",
                  description: `Transferred ${toAdd.length} low-stock items from pantry to grocery list`,
                  store: "groceries",
                  status: "success"
                });
              }
            }
          }

          // 17. ADD_GROCERIES
          if (actionType === "ADD_GROCERIES") {
            const itemsToAdd: any[] = actionData.items || [];
            if (itemsToAdd.length > 0) {
              const grocRef = doc(db, "users", currentUser.uid, "groceries", "current");
              const grocSnap = await getDoc(grocRef);
              let currentItems = grocSnap.exists() ? grocSnap.data().items || [] : [];
              
              const newGroceryItems = itemsToAdd.map(itemObj => {
                const name = typeof itemObj === "string" ? itemObj : itemObj.name;
                const classified = fastClassifyFood(name);
                const aiCategory = (typeof itemObj === "object" && itemObj.category && itemObj.category !== "Other")
                  ? itemObj.category
                  : classified.category;
                return {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  name,
                  category: aiCategory,
                  purchased: false
                };
              });
              
              const existingNames = new Set(currentItems.map((i: any) => i.name.toLowerCase()));
              const filteredNew = newGroceryItems.filter(i => !existingNames.has(i.name.toLowerCase()));
              
              await setDoc(grocRef, {
                items: [...currentItems, ...filteredNew],
                lastUpdated: new Date().toISOString()
              }, { merge: true });

              executedActions.push({
                id: createActionId(),
                type: "ADD_GROCERIES",
                title: "Grocery Shopping List Updated",
                description: `Added ${filteredNew.length} items to your shopping list`,
                store: "groceries",
                status: "success"
              });
            }
          }

          // 18. REMOVE_GROCERIES
          if (actionType === "REMOVE_GROCERIES") {
            const itemsToRemove: string[] = actionData.items || [];
            if (itemsToRemove.length > 0) {
              const grocRef = doc(db, "users", currentUser.uid, "groceries", "current");
              const grocSnap = await getDoc(grocRef);
              if (grocSnap.exists()) {
                const currentItems = grocSnap.data().items || [];
                const lowerToRemove = new Set(itemsToRemove.map(i => i.toLowerCase()));
                const filtered = currentItems.filter((item: any) => !lowerToRemove.has(item.name.toLowerCase()));
                
                await setDoc(grocRef, {
                  items: filtered,
                  lastUpdated: new Date().toISOString()
                }, { merge: true });

                executedActions.push({
                  id: createActionId(),
                  type: "REMOVE_GROCERIES",
                  title: "Grocery Items Removed",
                  description: `Removed ${currentItems.length - filtered.length} items from your shopping list`,
                  store: "groceries",
                  status: "success"
                });
              }
            }
          }

          // 19. CHECK_GROCERIES
          if (actionType === "CHECK_GROCERIES") {
            const itemsToCheck: string[] = actionData.items || [];
            if (itemsToCheck.length > 0) {
              const grocRef = doc(db, "users", currentUser.uid, "groceries", "current");
              const grocSnap = await getDoc(grocRef);
              if (grocSnap.exists()) {
                const currentItems = grocSnap.data().items || [];
                const lowerToCheck = new Set(itemsToCheck.map(i => i.toLowerCase()));
                const updated = currentItems.map((item: any) => 
                  lowerToCheck.has(item.name.toLowerCase()) ? { ...item, purchased: true } : item
                );
                await setDoc(grocRef, { items: updated, lastUpdated: new Date().toISOString() }, { merge: true });

                executedActions.push({
                  id: createActionId(),
                  type: "CHECK_GROCERIES",
                  title: "Groceries Marked Purchased",
                  description: `Marked ${itemsToCheck.length} items as bought`,
                  store: "groceries",
                  status: "success"
                });
              }
            }
          }

          // 20. UNCHECK_GROCERIES
          if (actionType === "UNCHECK_GROCERIES") {
            const itemsToUncheck: string[] = actionData.items || [];
            if (itemsToUncheck.length > 0) {
              const grocRef = doc(db, "users", currentUser.uid, "groceries", "current");
              const grocSnap = await getDoc(grocRef);
              if (grocSnap.exists()) {
                const currentItems = grocSnap.data().items || [];
                const lowerToUncheck = new Set(itemsToUncheck.map(i => i.toLowerCase()));
                const updated = currentItems.map((item: any) => 
                  lowerToUncheck.has(item.name.toLowerCase()) ? { ...item, purchased: false } : item
                );
                await setDoc(grocRef, { items: updated, lastUpdated: new Date().toISOString() }, { merge: true });

                executedActions.push({
                  id: createActionId(),
                  type: "UNCHECK_GROCERIES",
                  title: "Groceries Unchecked",
                  description: `Unchecked ${itemsToUncheck.length} items on shopping list`,
                  store: "groceries",
                  status: "success"
                });
              }
            }
          }

          // 21. CLEAR_GROCERIES
          if (actionType === "CLEAR_GROCERIES") {
            const grocRef = doc(db, "users", currentUser.uid, "groceries", "current");
            await setDoc(grocRef, { items: [], lastUpdated: new Date().toISOString() }, { merge: true });

            executedActions.push({
              id: createActionId(),
              type: "CLEAR_GROCERIES",
              title: "Grocery List Cleared",
              description: "Emptied your entire shopping list",
              store: "groceries",
              status: "success"
            });
          }

          // 22. TRANSFER_GROCERIES_TO_PANTRY
          if (actionType === "TRANSFER_GROCERIES_TO_PANTRY") {
            const grocRef = doc(db, "users", currentUser.uid, "groceries", "current");
            const pantryRef = doc(db, "users", currentUser.uid, "pantry", "current");
            const [grocSnap, pantrySnap] = await Promise.all([getDoc(grocRef), getDoc(pantryRef)]);
            
            if (grocSnap.exists()) {
              const grocItems = grocSnap.data().items || [];
              const purchased = grocItems.filter((i: any) => i.purchased);
              const remainingGroc = grocItems.filter((i: any) => !i.purchased);
              
              if (purchased.length > 0) {
                let pantryItems = pantrySnap.exists() ? pantrySnap.data().items || [] : [];
                for (const item of purchased) {
                  const idx = pantryItems.findIndex((p: any) => p.name.toLowerCase() === item.name.toLowerCase());
                  if (idx >= 0) {
                    pantryItems[idx].quantity = (pantryItems[idx].quantity || 0) + 1;
                  } else {
                    pantryItems.push({
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                      name: item.name,
                      category: item.category || "Produce",
                      quantity: 1,
                      unit: "pcs",
                      lowStockThreshold: 1,
                      updatedAt: new Date().toISOString()
                    });
                  }
                }

                await Promise.all([
                  setDoc(pantryRef, { items: pantryItems, lastUpdated: new Date().toISOString() }, { merge: true }),
                  setDoc(grocRef, { items: remainingGroc, lastUpdated: new Date().toISOString() }, { merge: true }),
                ]);
                clearCachedData("user_pantry");

                executedActions.push({
                  id: createActionId(),
                  type: "TRANSFER_GROCERIES_TO_PANTRY",
                  title: "Purchased Groceries Moved to Pantry",
                  description: `Transferred ${purchased.length} bought items into your kitchen pantry inventory`,
                  store: "pantry",
                  status: "success"
                });
              }
            }
          }

          // 23. UPDATE_MENU_ITEM
          if (actionType === "UPDATE_MENU_ITEM") {
            const day = actionData.day;
            const mealType = actionData.mealType as "breakfast" | "lunch" | "dinner";
            const dishes = actionData.dishes || [];
            
            const menuSnap = await getDocs(query(collection(db, "users", currentUser.uid, "menus"), orderBy("uploadedAt", "desc"), limit(1)));
            if (!menuSnap.empty && day && mealType) {
              const docSnap = menuSnap.docs[0];
              const extracted = docSnap.data().extractedData || [];
              const dayIndex = extracted.findIndex((d: any) => d.day?.toLowerCase() === day?.toLowerCase());
              if (dayIndex >= 0) {
                extracted[dayIndex][mealType] = dishes;
                await setDoc(docSnap.ref, { extractedData: extracted }, { merge: true });
                clearCachedData("weekly_menu_" + day);

                executedActions.push({
                  id: createActionId(),
                  type: "UPDATE_MENU_ITEM",
                  title: "Mess Menu Updated",
                  description: `Updated ${day} ${mealType} dishes in weekly mess schedule`,
                  store: "menu",
                  status: "success"
                });
              }
            }
          }

          // 24. ADD_MENU_ITEM
          if (actionType === "ADD_MENU_ITEM") {
            const day = actionData.day;
            const mealType = actionData.mealType as "breakfast" | "lunch" | "dinner";
            const dish = actionData.dish;
            
            const menuSnap = await getDocs(query(collection(db, "users", currentUser.uid, "menus"), orderBy("uploadedAt", "desc"), limit(1)));
            if (!menuSnap.empty && day && mealType && dish) {
              const docSnap = menuSnap.docs[0];
              const extracted = docSnap.data().extractedData || [];
              const dayIndex = extracted.findIndex((d: any) => d.day?.toLowerCase() === day?.toLowerCase());
              if (dayIndex >= 0) {
                const current = extracted[dayIndex][mealType] || [];
                if (!current.includes(dish)) {
                  extracted[dayIndex][mealType] = [...current, dish];
                  await setDoc(docSnap.ref, { extractedData: extracted }, { merge: true });
                  clearCachedData("weekly_menu_" + day);

                  executedActions.push({
                    id: createActionId(),
                    type: "ADD_MENU_ITEM",
                    title: "Dish Added to Mess Menu",
                    description: `Added "${dish}" to ${day} ${mealType}`,
                    store: "menu",
                    status: "success"
                  });
                }
              }
            }
          }

          // 25. REMOVE_MENU_ITEM
          if (actionType === "REMOVE_MENU_ITEM") {
            const day = actionData.day;
            const mealType = actionData.mealType as "breakfast" | "lunch" | "dinner";
            const dish = actionData.dish?.toLowerCase();
            
            const menuSnap = await getDocs(query(collection(db, "users", currentUser.uid, "menus"), orderBy("uploadedAt", "desc"), limit(1)));
            if (!menuSnap.empty && day && mealType && dish) {
              const docSnap = menuSnap.docs[0];
              const extracted = docSnap.data().extractedData || [];
              const dayIndex = extracted.findIndex((d: any) => d.day?.toLowerCase() === day?.toLowerCase());
              if (dayIndex >= 0) {
                const current = extracted[dayIndex][mealType] || [];
                extracted[dayIndex][mealType] = current.filter((item: string) => !item.toLowerCase().includes(dish));
                await setDoc(docSnap.ref, { extractedData: extracted }, { merge: true });
                clearCachedData("weekly_menu_" + day);

                executedActions.push({
                  id: createActionId(),
                  type: "REMOVE_MENU_ITEM",
                  title: "Dish Removed from Mess Menu",
                  description: `Removed "${actionData.dish}" from ${day} ${mealType}`,
                  store: "menu",
                  status: "success"
                });
              }
            }
          }

          // 26. UPDATE_GOAL
          if (actionType === "UPDATE_GOAL") {
            await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), { goal: actionData.goal }, { merge: true });
            await refreshProfile();
            executedActions.push({
              id: createActionId(),
              type: "UPDATE_GOAL",
              title: "Fitness Target Updated",
              description: `Goal updated to ${actionData.goal.replace('_', ' ').toUpperCase()}`,
              store: "profile",
              status: "success"
            });
          }
          
          // 27. UPDATE_WEIGHT
          if (actionType === "UPDATE_WEIGHT") {
            await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), { weight: Number(actionData.weight) }, { merge: true });
            await refreshProfile();
            executedActions.push({
              id: createActionId(),
              type: "UPDATE_WEIGHT",
              title: "Bodyweight Logged",
              description: `Current weight recorded as ${actionData.weight} kg`,
              store: "profile",
              status: "success"
            });
          }

          // 28. UPDATE_PROFILE
          if (actionType === "UPDATE_PROFILE") {
            const updates: any = {};
            if (actionData.age) updates.age = Number(actionData.age);
            if (actionData.height) updates.height = Number(actionData.height);
            if (actionData.name) updates.name = actionData.name;
            if (actionData.gender) updates.gender = actionData.gender;
            if (actionData.activityLevel) updates.activityLevel = actionData.activityLevel;
            await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), updates, { merge: true });
            await refreshProfile();
            executedActions.push({
              id: createActionId(),
              type: "UPDATE_PROFILE",
              title: "Profile Biometrics Synchronized",
              description: "Updated user profile vitals and biometrics",
              store: "profile",
              status: "success"
            });
          }

          // 29. UPDATE_TARGETS
          if (actionType === "UPDATE_TARGETS") {
            await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), { 
              targetOverrides: {
                enabled: true,
                calories: Number(actionData.calories) || userProfile?.targetOverrides?.calories || 2000,
                protein: Number(actionData.protein) || userProfile?.targetOverrides?.protein || 120,
                carbs: Number(actionData.carbs) || userProfile?.targetOverrides?.carbs || 200,
                fats: Number(actionData.fats) || userProfile?.targetOverrides?.fats || 60
              }
            }, { merge: true });
            await refreshProfile();
            executedActions.push({
              id: createActionId(),
              type: "UPDATE_TARGETS",
              title: "Daily Macro Targets Locked",
              description: `Daily targets overridden: ${actionData.calories} kcal (P: ${actionData.protein}g, C: ${actionData.carbs}g, F: ${actionData.fats}g)`,
              store: "profile",
              status: "success"
            });
          }

          // 30. RESET_TARGETS
          if (actionType === "RESET_TARGETS") {
            await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), { 
              targetOverrides: { enabled: false }
            }, { merge: true });
            await refreshProfile();
            executedActions.push({
              id: createActionId(),
              type: "RESET_TARGETS",
              title: "Dynamic Targets Restored",
              description: "Switched back to automatic BMR / TDEE macro calculation",
              store: "profile",
              status: "success"
            });
          }
        } catch(e) {
          console.error("[Compass Command Error]", e);
        }
      }

      // Purge any legacy emoji markdown lines from text
      const cleanDisplayText = rawText
        .replace(/^(?:✅|🔄|🗑️|🛒|📦|🎯|👤)\s*\*.*?\*\s*$/gm, "")
        .trim();

      const modelMsg: Message = { role: "model", text: cleanDisplayText, actions: executedActions };
      setMessages(prev => [...prev, modelMsg]);

      // 4. Save model response to Firestore
      await addDoc(msgsRef, {
        role: modelMsg.role,
        text: modelMsg.text,
        image: null,
        actions: executedActions,
        createdAt: serverTimestamp()
      });

    } catch (e) {
      setMessages(prev => [...prev, { role: "model", text: "Network error connecting to AI." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Am I hitting my protein goal today?",
    "What's the healthiest option for dinner?",
    "Can I fit a Gulab Jamun into my calories?"
  ];

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Compass className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col relative animate-in fade-in duration-500">
      
      {/* Session History Modal Overlay */}
      {showHistory && (
        <div className="fixed inset-0 md:left-72 z-50 flex justify-center bg-black/80 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl h-full flex flex-col bg-[#0a0a0a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><History className="w-5 h-5 text-emerald-400" /> Chat History</h2>
              <button onClick={() => setShowHistory(false)} className="w-8 h-8 flex items-center justify-center rounded-full glass hover:bg-white/20 text-white"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <button onClick={startNewChat} className="w-full glass bg-emerald-500/10 border-emerald-500/20 py-4 rounded-xl flex items-center justify-center gap-2 mb-6 font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors shadow-lg">
                <Plus className="w-5 h-5" /> Start New Chat
              </button>
              
              <div className="space-y-2">
                {sessions.length === 0 && <p className="text-white/40 text-center mt-10">No previous chats found.</p>}
                {sessions.map(s => (
                  <div key={s.id} className={`w-full text-left p-4 rounded-xl transition-all flex items-center justify-between group ${s.id === currentSessionId ? 'bg-white/10 border border-white/20 shadow-md' : 'hover:bg-white/5 border border-transparent'}`}>
                    <button onClick={() => switchSession(s.id)} className="flex-1 min-w-0 flex items-center gap-3">
                      <MessageSquare className={`w-5 h-5 shrink-0 ${s.id === currentSessionId ? 'text-white' : 'text-white/40'}`} />
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`truncate font-semibold ${s.id === currentSessionId ? 'text-white' : 'text-white/70'}`}>{s.title}</p>
                      </div>
                    </button>
                    <button onClick={(e) => deleteSession(e, s.id)} className="shrink-0 w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400 text-white/40 border border-white/5 ml-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="flex items-center justify-between pb-4 mb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center shadow-sm shrink-0">
            <Compass className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-sans">Compass AI</h1>
            <p className="text-white/40 font-medium text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Nutrition Intelligence</span>
            </p>
          </div>
        </div>
        
        {/* History Toggle Button */}
        <button 
          onClick={() => setShowHistory(true)} 
          className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
          title="Chat History"
        >
          <History className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 space-y-6">
        {messages.length === 0 && (
          <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-6 md:p-8 space-y-6">
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight leading-snug">
              Hey, {userProfile?.name?.split(" ")[0] || "there"}.<br/>
              <span className="text-white/45 font-normal text-sm">Upload a plate photo or ask me anything about your nutritional targets.</span>
            </h2>
            <div className="flex gap-2 overflow-x-auto sm:flex-wrap pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
              {suggestions.map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => handleSend(s)} 
                  className="px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white transition-all text-left whitespace-nowrap shrink-0 sm:shrink sm:whitespace-normal"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-auto ${m.role === "user" ? "bg-white/[0.08] text-white" : "bg-white text-black shadow-sm"}`}>
                {m.role === "user" ? <UserIcon className="w-4 h-4" /> : <Compass className="w-4 h-4 stroke-[2]" />}
              </div>
              <div className={`p-4 rounded-3xl space-y-2 ${
                m.role === "user" 
                  ? "bg-white/[0.08] border border-white/[0.1] text-white rounded-br-md" 
                  : "bg-[#121418] border border-white/[0.06] text-white/90 rounded-bl-md shadow-sm"
              }`}>
                {m.image && <img src={m.image} alt="User upload" className="rounded-2xl max-h-48 object-cover shadow-lg border border-white/10" />}
                {m.text && (
                  <div className="text-xs md:text-sm leading-relaxed break-words font-sans">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-3 mb-1 text-white tracking-tight" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-3 mb-1 text-white tracking-tight" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-bold mt-2 mb-1 text-white tracking-tight" {...props} />,
                        h4: ({node, ...props}) => <h4 className="text-sm font-bold mt-2 mb-1 text-white" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2.5 whitespace-pre-wrap last:mb-0 text-white/85" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1 text-white/80" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-white/80" {...props} />,
                        li: ({node, ...props}) => <li className="marker:text-white/40" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                        em: ({node, ...props}) => <em className="italic opacity-90" {...props} />,
                        hr: ({node, ...props}) => <hr className="border-white/[0.06] my-3" {...props} />,
                        a: ({node, ...props}) => <a className="text-blue-400 underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Hardware-Accelerated Luxury Agent Action Badges */}
                {m.actions && m.actions.length > 0 && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-white/[0.06]">
                    {m.actions.map(act => (
                      <AgentActionCard key={act.id} action={act} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full shrink-0 bg-white flex items-center justify-center mt-auto shadow-sm">
                <Compass className="w-4 h-4 text-black animate-spin" />
              </div>
              <div className="p-4 rounded-3xl bg-[#121418] border border-white/[0.06] rounded-bl-md flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse delay-75" />
                <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse delay-150" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} className="h-16 lg:h-12 shrink-0" />
      </div>

      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 left-0 lg:left-64 right-0 px-4 lg:px-0 z-40 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto relative">
          
          {selectedImage && (
            <div className="absolute -top-24 left-4 p-2 rounded-2xl bg-[#121418] border border-white/20 shadow-2xl animate-in fade-in zoom-in-95 duration-200 group">
              <img src={selectedImage} alt="Preview" className="w-16 h-16 object-cover rounded-xl" />
              <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="rounded-full p-2 flex items-center gap-2 shadow-2xl border border-white/[0.08] bg-[#121418]/90 backdrop-blur-2xl">
            <input type="file" accept="image/*" ref={fileRef} onChange={handleImagePick} className="hidden" />
            <button 
              onClick={() => fileRef.current?.click()} 
              className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors ml-1"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
              placeholder="Ask anything or upload a meal..."
              className="flex-1 bg-transparent border-0 resize-none max-h-32 min-h-[38px] py-2 px-1 text-white placeholder-white/35 focus:outline-none focus:ring-0 text-xs font-sans"
              rows={1}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={(!input.trim() && !selectedImage) || loading}
              className="w-9 h-9 shrink-0 bg-white rounded-full flex items-center justify-center text-black disabled:opacity-40 disabled:bg-white/20 disabled:text-white transition-all mr-1 shadow-sm"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}