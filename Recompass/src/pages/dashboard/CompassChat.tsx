import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, collection, query, orderBy, limit, getDocs, addDoc, setDoc, serverTimestamp, where, writeBatch, Timestamp, deleteDoc } from "firebase/firestore";
import { Send, Compass, User as UserIcon, ImagePlus, X, History, Plus, MessageSquare, Trash2 } from "lucide-react";
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
      
      setContextStr(`You are Compass, a highly intelligent, practical AI nutrition assistant for an Indian student. You have access to their profile, what they ate today, and what the mess is serving today.

PROFILE:
${pData}

TODAY'S LOGGED FOOD:
${lData}

TODAY'S MENU:
${menuStr}

AGENTIC CAPABILITIES (CRITICAL):
You have the power to make changes in the app. If the user asks you to log a meal, modify/update an existing logged item, delete an item, update their weight, change their goal, or manage groceries, you MUST output a JSON command block at the end of your message.
Format:
\`\`\`command
{
  "action": "LOG_MEAL" | "UPDATE_MEAL" | "REMOVE_MEAL" | "UPDATE_GOAL" | "UPDATE_WEIGHT" | "UPDATE_PROFILE" | "CLEAR_TODAY_LOGS" | "ADD_GROCERIES" | "REMOVE_GROCERIES" | "CHECK_GROCERIES",
  "data": { ... }
}
\`\`\`

EXAMPLES:
- User: "I had more chicken in that biryani I logged for breakfast, it had 4 chicken pieces with 40g protein and 750 cals, update it."
  Response: "I've updated your breakfast Chicken Biryani with the extra chicken pieces and recalculated macros." + \`\`\`command
  {"action":"UPDATE_MEAL","data":{"mealType":"breakfast","foodName":"CHICKEN BIRYANI","updatedName":"CHICKEN BIRYANI (4 PCS CHICKEN)","quantity":"1 bowl + 4 chicken pieces","calories":750,"protein":40,"carbs":65,"fats":22}}
  \`\`\`

- User: "Delete the biryani from my breakfast"
  Response: "I've removed Chicken Biryani from your breakfast log." + \`\`\`command
  {"action":"REMOVE_MEAL","data":{"mealType":"breakfast","foodName":"CHICKEN BIRYANI"}}
  \`\`\`

- User: "I just ate 2 chapatis for lunch."
  Response: "Got it, I've logged 2 chapatis for lunch." + \`\`\`command
  {"action":"LOG_MEAL","data":{"foodName":"CHAPATI","quantity":"2 pieces","mealType":"lunch","calories":240,"protein":7,"carbs":44,"fats":4}}
  \`\`\`

- User: "Add milk and eggs to my grocery list."
  Response: "I've added milk and eggs to your groceries." + \`\`\`command
  {"action":"ADD_GROCERIES","data":{"items":[{"name":"Milk","category":"Dairy"},{"name":"Eggs","category":"Protein"}]}}
  \`\`\`

- User: "Set my goal to bulk"
  Response: "Updated your goal to bulk." + \`\`\`command
  {"action":"UPDATE_GOAL","data":{"goal":"muscle_gain"}}
  \`\`\`

- User: "Clear everything I ate today"
  Response: "I've wiped today's food logs." + \`\`\`command
  {"action":"CLEAR_TODAY_LOGS","data":{}}
  \`\`\`

Valid actions: 
- "LOG_MEAL" (data: { "mealType": "breakfast"|"lunch"|"dinner"|"snacks", "foodName": UPPERCASE string, "quantity": string, "calories": number, "protein": number, "carbs": number, "fats": number })
- "UPDATE_MEAL" (data: { "mealType": "breakfast"|"lunch"|"dinner"|"snacks", "foodName": string to search and replace, "updatedName"?: string, "quantity"?: string, "calories": number, "protein": number, "carbs": number, "fats": number })
- "REMOVE_MEAL" (data: { "mealType": "breakfast"|"lunch"|"dinner"|"snacks", "foodName": string to match and delete })
- "UPDATE_GOAL" (data: { "goal": "fat_loss" | "muscle_gain" | "recomp" | "maintain" })
- "UPDATE_WEIGHT" (data: { "weight": number })
- "UPDATE_PROFILE" (data: { "age"?: number, "height"?: number, "name"?: string })
- "UPDATE_TARGETS" (data: { "calories": number, "protein": number, "carbs": number, "fats": number })
- "CLEAR_TODAY_LOGS" (data: {})
- "ADD_GROCERIES" (data: { "items": Array<{name: string, category: "Protein"|"Dairy"|"Produce"|"Snacks"|"Supplements"|"Grains"|"Spices"|"Oils"|"Other"}> })
- "REMOVE_GROCERIES" (data: { "items": string[] })
- "CLEAR_GROCERIES" (data: {})
- "CHECK_GROCERIES" (data: { "items": string[] })

Instructions: Be concise. Estimate macros accurately. If the user tells you about food they ate, or asks to modify/correct a logged item, ALWAYS calculate the accurate macros and emit the command block. You have complete permission to manage their meals, groceries, and targets.
If the user shares an image:
- If the image contains a food plate, snack, meal, or beverage: identify the items, estimate portions & macros, and if they ask to log it (or if they just sent a photo of their meal), log it.
- If the image DOES NOT contain any food or drink (e.g. selfie, room, car, object, furniture, electronics, screenshot, pet, document): clearly inform the user that no food was detected in the photo and ask them to share a picture of their plate or describe what they ate.`);
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

          if (cmd.action === "UPDATE_MEAL") {
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
            const logRef = doc(db, "users", currentUser.uid, "logs", today);
            const logSnap = await getDoc(logRef);
            if (logSnap.exists()) {
              const d = logSnap.data();
              const mealType = cmd.data.mealType || "lunch";
              const targetName = (cmd.data.foodName || "").toLowerCase().trim();
              const currentItems = d[mealType] || [];
              
              let matched = false;
              const updatedName = (cmd.data.updatedName || cmd.data.foodName || "MEAL").toUpperCase();
              const updated = currentItems.map((item: any) => {
                const lowerItemName = (item.name || "").toLowerCase();
                if (!matched && (lowerItemName.includes(targetName) || targetName.includes(lowerItemName) || (cmd.data.id && item.id === cmd.data.id))) {
                  matched = true;
                  return {
                    ...item,
                    name: updatedName,
                    quantity: cmd.data.quantity || item.quantity,
                    calories: Math.max(0, Math.round(Number(cmd.data.calories) || item.calories)),
                    protein: Math.max(0, Math.round((Number(cmd.data.protein) ?? item.protein) * 10) / 10),
                    carbs: Math.max(0, Math.round((Number(cmd.data.carbs) ?? item.carbs) * 10) / 10),
                    fats: Math.max(0, Math.round((Number(cmd.data.fats) ?? item.fats) * 10) / 10),
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
              sysMessages.push(`🔄 *Updated "${updatedName}" in ${mealType}: ${cmd.data.calories} kcal, ${cmd.data.protein}g protein, ${cmd.data.carbs}g carbs, ${cmd.data.fats}g fats.*`);
            }
          }

          if (cmd.action === "REMOVE_MEAL") {
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
            const logRef = doc(db, "users", currentUser.uid, "logs", today);
            const logSnap = await getDoc(logRef);
            if (logSnap.exists()) {
              const d = logSnap.data();
              const mealType = cmd.data.mealType || "lunch";
              const targetName = (cmd.data.foodName || "").toLowerCase().trim();
              
              let removed = false;
              d[mealType] = (d[mealType] || []).filter((item: any) => {
                const lowerItemName = (item.name || "").toLowerCase();
                if (!removed && (lowerItemName.includes(targetName) || targetName.includes(lowerItemName) || (cmd.data.id && item.id === cmd.data.id))) {
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
              sysMessages.push(`🗑️ *Removed "${cmd.data.foodName}" from ${mealType}.*`);
            }
          }
          
          if (cmd.action === "UPDATE_GOAL") {
            await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), { goal: cmd.data.goal }, { merge: true });
            sysMessages.push(`✅ *Goal successfully updated to ${cmd.data.goal}.*`);
          }
          
          if (cmd.action === "UPDATE_WEIGHT") {
            await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), { weight: cmd.data.weight }, { merge: true });
            sysMessages.push(`🎯 *Weight successfully updated to ${cmd.data.weight}kg.*`);
            await refreshProfile();
          }

          if (cmd.action === "UPDATE_PROFILE") {
            const updates: any = {};
            if (cmd.data.age) updates.age = cmd.data.age;
            if (cmd.data.height) updates.height = cmd.data.height;
            if (cmd.data.name) updates.name = cmd.data.name;
            await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), updates, { merge: true });
            sysMessages.push(`👤 *Profile details updated.*`);
            await refreshProfile();
          }

          if (cmd.action === "UPDATE_TARGETS") {
            // Provide fallbacks in case AI doesn't send all macros
            await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), { 
              targetOverrides: {
                enabled: true,
                calories: cmd.data.calories || userProfile?.targetOverrides?.calories || 2000,
                protein: cmd.data.protein || userProfile?.targetOverrides?.protein || 120,
                carbs: cmd.data.carbs || userProfile?.targetOverrides?.carbs || 200,
                fats: cmd.data.fats || userProfile?.targetOverrides?.fats || 60
              }
            }, { merge: true });
            sysMessages.push(`🎯 *Daily macro targets manually overridden to ${cmd.data.calories} kcal.*`);
            await refreshProfile();
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
      <header className="sticky top-0 z-30 bg-[#0a0b0e]/90 backdrop-blur-xl pt-4 pb-4 -mt-4 md:-mt-6 -mx-4 px-4 md:-mx-6 md:px-6 mb-8 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
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
          className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-all relative"
        >
          <History className="w-4 h-4" />
          {sessions.length > 0 && <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full" />}
        </button>
      </header>

      <div className="flex-1 space-y-6">
        {messages.length === 0 && (
          <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-6 md:p-8 space-y-6">
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight leading-snug">
              Hey, {userProfile?.name?.split(" ")[0] || "there"}.<br/>
              <span className="text-white/45 font-normal text-sm">Upload a plate photo or ask me anything about your nutritional targets.</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => handleSend(s)} 
                  className="px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white transition-all text-left"
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
        <div ref={endRef} className="h-40 md:h-32 shrink-0" />
      </div>

      <div className="fixed bottom-[76px] md:bottom-6 left-0 md:left-64 right-0 px-4 md:px-0 z-40 pointer-events-none">
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