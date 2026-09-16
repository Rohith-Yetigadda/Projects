import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, collection, query, orderBy, limit, getDocs, addDoc, setDoc, serverTimestamp, where, writeBatch, Timestamp, deleteDoc } from "firebase/firestore";
import { Send, Compass, Sparkles, User as UserIcon, ImagePlus, X, History, Plus, MessageSquare, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { id?: string; role: "user" | "model"; text: string; image?: string; createdAt?: any };
type ChatSession = { id: string; title: string; updatedAt: any };

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
  const { userProfile, currentUser } = useAuth();
  
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
          loadedMsgs.push({ id: d.id, role: data.role, text: data.text || "", image: data.image || undefined, createdAt: data.createdAt });
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

  // 3. Load Context
  useEffect(() => {
    if (!currentUser) return;
    const loadCtx = async () => {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

      const logSnap = await getDoc(doc(db, "users", currentUser.uid, "logs", today));
      const logData = logSnap.exists() ? logSnap.data() : null;

      const menuSnap = await getDocs(query(collection(db, "users", currentUser.uid, "menus"), orderBy("uploadedAt","desc"), limit(1)));
      let menuStr = "No menu uploaded.";
      if (!menuSnap.empty) {
        const ext = menuSnap.docs[0].data().extractedData;
        const todayMenu = ext?.find((d:any) => d.day === dayName) || ext?.[0];
        if (todayMenu) menuStr = JSON.stringify(todayMenu);
      }

      const pData = `Goal: ${userProfile?.goal}\nWeight: ${userProfile?.weight}kg\nTargets: ${JSON.stringify(userProfile?.targetOverrides || "Auto")}`;
      const lData = logData ? `Logged today: ${JSON.stringify(logData.totals)}` : "Nothing logged yet.";
      
      setContextStr(`You are Compass, a highly intelligent, practical AI nutrition assistant for an Indian student. You have access to their profile, what they ate today, and what the mess is serving today.

PROFILE:
${pData}

TODAY'S LOG:
${lData}

TODAY'S MENU:
${menuStr}

AGENTIC CAPABILITIES (CRITICAL):
You have the power to make changes in the app. If the user asks you to log a meal, update their weight, change their goal, or add items to their groceries, you MUST output a JSON command block at the end of your message.
Format:
\`\`\`command
{
  "action": "LOG_MEAL" | "UPDATE_GOAL" | "UPDATE_WEIGHT" | "ADD_GROCERIES",
  "data": { ... }
}
\`\`\`

EXAMPLES:
- User: "I just ate 2 chapatis for lunch."
  Response: "Got it, I've logged 2 chapatis for lunch." + \`\`\`command
  {"action":"LOG_MEAL","data":{"foodName":"2 chapatis","mealType":"lunch","calories":240,"protein":7,"carbs":44,"fats":4}}
  \`\`\`

- User: "Add milk and eggs to my grocery list."
  Response: "I've added milk and eggs to your groceries." + \`\`\`command
  {"action":"ADD_GROCERIES","data":{"items":[{"name":"Milk","category":"Dairy"},{"name":"Eggs","category":"Protein"}]}}
  \`\`\`

- User: "Set my goal to bulk"
  Response: "Updated your goal to bulk." + \`\`\`command
- User: "I am now 22 years old and 180cm tall."
  Response: "I've updated your profile details." + \`\`\`command
  {"action":"UPDATE_PROFILE","data":{"age":22,"height":180}}
  \`\`\`

- User: "Clear everything I ate today"
  Response: "I've wiped today's food logs." + \`\`\`command
  {"action":"CLEAR_TODAY_LOGS","data":{}}
  \`\`\`

Valid actions: 
- "LOG_MEAL" (mealType must be "breakfast", "lunch", "dinner", or "snacks")
- "UPDATE_GOAL" (data: { "goal": "fat_loss" | "muscle_gain" | "recomp" | "maintain" })
- "UPDATE_WEIGHT" (data: { "weight": number })
- "UPDATE_PROFILE" (data: { "age"?: number, "height"?: number, "name"?: string })
- "UPDATE_TARGETS" (data: { "calories": number, "protein": number, "carbs": number, "fats": number })
- "CLEAR_TODAY_LOGS" (data: {})
- "ADD_GROCERIES" (data: { "items": Array<{name: string, category: "Protein"|"Dairy"|"Produce"|"Snacks"|"Supplements"|"Grains"|"Spices"|"Oils"|"Other"}> })
- "REMOVE_GROCERIES" (data: { "items": string[] })
- "CLEAR_GROCERIES" (data: {})
- "CHECK_GROCERIES" (data: { "items": string[] })

Instructions: Be concise. Estimate macros accurately. If the user asks you to take ANY action in the app (add/remove/clear/update/log/check/uncheck), ALWAYS output the \`\`\`command block to execute it. Do not tell the user to do it manually. You have absolute, full permission to manage their groceries, logs, targets, and profile.`);
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
        setSessions(prev => [{ id: targetSessionId, ...newSession, updatedAt: new Date() }, ...prev]);
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
        message: text,
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
      
      let sysMessages = [];
      for (const cmd of commands) {
        try {
          if (cmd.action === "LOG_MEAL") {
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
            const logRef = doc(db, "users", currentUser.uid, "logs", today);
            const logSnap = await getDoc(logRef);
            const d = logSnap.exists() ? logSnap.data() : { breakfast: [], lunch: [], dinner: [], snacks: [] };
            
            const mealType = cmd.data.mealType || "snacks";
            const entry = {
              id: Date.now().toString(),
              name: cmd.data.foodName,
              quantity: cmd.data.quantity || "1 serving",
              calories: cmd.data.calories,
              protein: cmd.data.protein,
              carbs: cmd.data.carbs,
              fats: cmd.data.fats,
              loggedAt: new Date().toISOString()
            };
            
            d[mealType] = [...(d[mealType] || []), entry];
            const all = [...(d.breakfast||[]), ...(d.lunch||[]), ...(d.dinner||[]), ...(d.snacks||[])];
            d.totals = all.reduce((a:any,i:any)=>({
              calories: a.calories + i.calories,
              protein: a.protein + i.protein,
              carbs: a.carbs + i.carbs,
              fats: a.fats + i.fats
            }), { calories:0, protein:0, carbs:0, fats:0 });
            
            await setDoc(logRef, { ...d, date: today });
            sysMessages.push(`✅ *Successfully logged ${entry.quantity} of ${entry.name} to ${mealType}.*`);
          }
          
          if (cmd.action === "UPDATE_GOAL") {
            await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), { goal: cmd.data.goal }, { merge: true });
            sysMessages.push(`✅ *Goal successfully updated to ${cmd.data.goal}.*`);
          }
          
          if (cmd.action === "UPDATE_WEIGHT") {
            await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), { weight: cmd.data.weight }, { merge: true });
            sysMessages.push(`🎯 *Weight successfully updated to ${cmd.data.weight}kg.*`);
          }

          if (cmd.action === "UPDATE_PROFILE") {
            const updates: any = {};
            if (cmd.data.age) updates.age = cmd.data.age;
            if (cmd.data.height) updates.height = cmd.data.height;
            if (cmd.data.name) updates.name = cmd.data.name;
            await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), updates, { merge: true });
            sysMessages.push(`👤 *Profile details updated.*`);
          }

          if (cmd.action === "UPDATE_TARGETS") {
            await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), { 
              targetOverrides: {
                enabled: true,
                calories: cmd.data.calories,
                protein: cmd.data.protein,
                carbs: cmd.data.carbs,
                fats: cmd.data.fats
              }
            }, { merge: true });
            sysMessages.push(`🎯 *Daily macro targets manually overridden to ${cmd.data.calories} kcal.*`);
          }

          if (cmd.action === "CLEAR_TODAY_LOGS") {
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
            await setDoc(doc(db, "users", currentUser.uid, "logs", today), { 
              breakfast: [], lunch: [], dinner: [], snacks: [],
              totals: { calories: 0, protein: 0, carbs: 0, fats: 0 }
            }, { merge: true });
            sysMessages.push(`🗑️ *Cleared all food logs for today.*`);
          }

          if (cmd.action === "CHECK_GROCERIES") {
            const itemsToCheck: string[] = cmd.data.items || [];
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
                sysMessages.push(`✅ *Checked off ${itemsToCheck.length} items from your list.*`);
              }
            }
          }

          if (cmd.action === "ADD_GROCERIES") {
            const itemsToAdd: any[] = cmd.data.items || [];
            if (itemsToAdd.length > 0) {
              const grocRef = doc(db, "users", currentUser.uid, "groceries", "current");
              const grocSnap = await getDoc(grocRef);
              let currentItems = grocSnap.exists() ? grocSnap.data().items || [] : [];
              
              const newGroceryItems = itemsToAdd.map(itemObj => {
                // Support both string arrays (fallback) and the new object format
                const name = typeof itemObj === "string" ? itemObj : itemObj.name;
                const aiCategory = typeof itemObj === "string" ? null : itemObj.category;
                
                const lower = name.toLowerCase();
                let category = aiCategory || "Other";
                
                // Fallback auto-categorization only if AI didn't provide a valid one
                if (!aiCategory) {
                  if (lower.includes("chicken") || lower.includes("egg") || lower.includes("whey") || lower.includes("meat") || lower.includes("fish") || lower.includes("mutton") || lower.includes("soya") || lower.includes("paneer")) category = "Protein";
                  else if (lower.includes("milk") || lower.includes("cheese") || lower.includes("yogurt") || lower.includes("curd") || lower.includes("ghee") || lower.includes("butter")) category = "Dairy";
                  else if (lower.includes("apple") || lower.includes("banana") || lower.includes("spinach") || lower.includes("veg") || lower.includes("tomato") || lower.includes("onion") || lower.includes("potato") || lower.includes("fruit")) category = "Produce";
                  else if (lower.includes("bar") || lower.includes("chips") || lower.includes("snack") || lower.includes("biscuit") || lower.includes("cookie") || lower.includes("oat") || lower.includes("pasta") || lower.includes("bread")) category = "Snacks";
                  else if (lower.includes("creatine") || lower.includes("vitamin") || lower.includes("protein")) category = "Supplements";
                  else if (lower.includes("rice") || lower.includes("wheat") || lower.includes("atta") || lower.includes("flour") || lower.includes("dal") || lower.includes("lentil")) category = "Grains";
                  else if (lower.includes("cumin") || lower.includes("turmeric") || lower.includes("chili") || lower.includes("salt") || lower.includes("pepper") || lower.includes("spice") || lower.includes("garlic") || lower.includes("ginger")) category = "Spices";
                  else if (lower.includes("oil")) category = "Oils";
                }

                return {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  name: name,
                  category,
                  purchased: false
                };
              });
              
              const existingNames = new Set(currentItems.map((i:any) => i.name.toLowerCase()));
              const filteredNew = newGroceryItems.filter(i => !existingNames.has(i.name.toLowerCase()));
              
              await setDoc(grocRef, {
                items: [...currentItems, ...filteredNew],
                lastUpdated: new Date().toISOString()
              }, { merge: true });

              sysMessages.push(`🛒 *Added ${filteredNew.length} items to your shopping list.*`);
            }
          }

          if (cmd.action === "CLEAR_GROCERIES") {
            const grocRef = doc(db, "users", currentUser.uid, "groceries", "current");
            await setDoc(grocRef, {
              items: [],
              lastUpdated: new Date().toISOString()
            }, { merge: true });
            sysMessages.push(`🗑️ *Cleared your entire grocery list.*`);
          }

          if (cmd.action === "REMOVE_GROCERIES") {
            const itemsToRemove: string[] = cmd.data.items || [];
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
                sysMessages.push(`🗑️ *Removed ${currentItems.length - filtered.length} items from your grocery list.*`);
              }
            }
          }
        } catch(e) {
          console.error("Command failed", e);
        }
      }

      if (sysMessages.length > 0) {
        rawText += "\n\n" + sysMessages.join("\n");
      }

      const modelMsg: Message = { role: "model", text: rawText };
      setMessages(prev => [...prev, modelMsg]);

      // 4. Save model response to Firestore
      await addDoc(msgsRef, {
        role: modelMsg.role,
        text: modelMsg.text,
        image: null,
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
    <div className="max-w-3xl mx-auto min-h-full flex flex-col relative pb-32 md:pb-28 animate-in fade-in duration-500">
      
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
      <header className="sticky top-0 z-30 bg-black pt-4 pb-4 -mt-4 md:-mt-6 -mx-4 px-4 md:-mx-6 md:px-6 mb-8 border-b border-white/10 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] shrink-0">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Compass AI</h1>
            <p className="text-muted-foreground font-medium text-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" /> Powered by Gemini
            </p>
          </div>
        </div>
        
        {/* History Toggle Button */}
        <button onClick={() => setShowHistory(true)} className="w-10 h-10 rounded-full glass flex items-center justify-center text-white/70 hover:text-white transition-colors relative">
          <History className="w-5 h-5" />
          {sessions.length > 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black" />}
        </button>
      </header>

      <div className="flex-1 space-y-6">
        {messages.length === 0 && (
          <div className="glass-card rounded-3xl p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-bold text-white leading-snug">
              Hey, {userProfile?.name?.split(" ")[0] || "there"}.<br/>
              <span className="text-white/60">Upload a plate photo or ask me anything about your diet. I'll remember this conversation.</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => handleSend(s)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white/80 hover:bg-white/10 transition-colors text-left">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-auto ${m.role === "user" ? "bg-emerald-500/20" : "bg-white"}`}>
                {m.role === "user" ? <UserIcon className="w-4 h-4 text-emerald-400" /> : <Compass className="w-4 h-4 text-black" />}
              </div>
              <div className={`p-4 rounded-2xl space-y-2 ${m.role === "user" ? "bg-emerald-500/10 border border-emerald-500/20 text-white rounded-tr-sm" : "glass border-white/10 text-white/90 rounded-tl-sm"}`}>
                {m.image && <img src={m.image} alt="User upload" className="rounded-xl max-h-48 object-cover shadow-lg" />}
                {m.text && (
                  <div className="text-sm md:text-base leading-relaxed break-words">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-4 mb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-3 mb-2 text-emerald-400" {...props} />,
                        h4: ({node, ...props}) => <h4 className="text-base font-bold mt-2 mb-1" {...props} />,
                        p: ({node, ...props}) => <p className="mb-3 whitespace-pre-wrap last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="marker:text-emerald-500" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-emerald-300" {...props} />,
                        em: ({node, ...props}) => <em className="italic opacity-90" {...props} />,
                        hr: ({node, ...props}) => <hr className="border-white/10 my-4" {...props} />,
                        a: ({node, ...props}) => <a className="text-blue-400 underline" target="_blank" rel="noopener noreferrer" {...props} />
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full shrink-0 bg-white flex items-center justify-center mt-auto">
                <Compass className="w-4 h-4 text-black animate-spin" />
              </div>
              <div className="p-4 rounded-2xl glass border-white/10 rounded-tl-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse delay-75" />
                <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse delay-150" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} className="h-4" />
      </div>

      <div className="fixed bottom-[88px] md:bottom-6 left-0 md:left-72 right-0 px-4 md:px-0 z-40 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto relative">
          
          {selectedImage && (
            <div className="absolute -top-24 left-4 p-2 glass-card rounded-xl border border-white/20 shadow-2xl animate-in fade-in zoom-in-95 duration-200 group">
              <img src={selectedImage} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
              <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="glass-card rounded-2xl p-2 flex items-end gap-2 shadow-2xl border-white/20 relative bg-black/95 backdrop-blur-3xl">
            <input type="file" accept="image/*" ref={fileRef} onChange={handleImagePick} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors mb-1 ml-1">
              <ImagePlus className="w-5 h-5" />
            </button>
            
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
              placeholder="Ask anything or upload a meal..."
              className="flex-1 bg-transparent border-0 resize-none max-h-32 min-h-[44px] p-3 text-white placeholder-white/40 focus:outline-none focus:ring-0 text-sm"
              rows={1}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={(!input.trim() && !selectedImage) || loading}
              className="w-11 h-11 shrink-0 bg-white rounded-xl flex items-center justify-center text-black disabled:opacity-50 disabled:bg-white/20 disabled:text-white transition-colors mb-1 mr-1"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}