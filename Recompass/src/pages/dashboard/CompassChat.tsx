import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Send, Loader2, Compass, Sparkles, User as UserIcon } from "lucide-react";

type Message = { role: "user" | "model"; parts: string };

export default function CompassChat() {
  const { userProfile, currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextStr, setContextStr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load Context
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

      const pData = `Goal: ${userProfile?.goal}\nWeight: ${userProfile?.weight}kg`;
      const lData = logData ? `Logged so far today: ${JSON.stringify(logData.totals)}` : "Nothing logged yet today.";
      
      setContextStr(`System Instructions: You are Compass, a snarky but extremely helpful AI nutritionist for an Indian student eating at a college mess. You have access to their profile, what they ate today, and what the mess is serving today.\n\nPROFILE:\n${pData}\n\nTODAY'S LOG:\n${lData}\n\nTODAY'S MENU:\n${menuStr}`);
    };
    loadCtx();
  }, [currentUser, userProfile]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;
    
    const newMsgs = [...messages, { role: "user" as const, parts: text.trim() }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/compass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", message: text, history: messages, context: contextStr })
      });
      const data = await res.json();
      setMessages([...newMsgs, { role: "model", parts: data.response || "Something went wrong." }]);
    } catch (e) {
      setMessages([...newMsgs, { role: "model", parts: "Network error connecting to AI." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Am I hitting my protein goal today?",
    "What's the healthiest option for dinner?",
    "Can I fit a Gulab Jamun into my calories?"
  ];

  return (
    <div className="max-w-3xl mx-auto min-h-[80vh] flex flex-col relative pb-28 md:pb-24 animate-in fade-in duration-500">
      
      {/* Header */}
      <header className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
          <Compass className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Compass AI</h1>
          <p className="text-muted-foreground font-medium text-sm flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" /> Powered by Gemini
          </p>
        </div>
      </header>

      {/* Chat History */}
      <div className="flex-1 space-y-6">
        {messages.length === 0 && (
          <div className="glass-card rounded-3xl p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-bold text-white leading-snug">
              Hey, {userProfile?.name?.split(" ")[0] || "there"}.<br/>
              <span className="text-white/60">I have your menu and your daily log open. What do you need?</span>
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
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${m.role === "user" ? "bg-emerald-500/20" : "bg-white"}`}>
                {m.role === "user" ? <UserIcon className="w-4 h-4 text-emerald-400" /> : <Compass className="w-4 h-4 text-black" />}
              </div>
              <div className={`p-4 rounded-2xl ${m.role === "user" ? "bg-emerald-500/10 border border-emerald-500/20 text-white rounded-tr-sm" : "glass border-white/10 text-white/90 rounded-tl-sm"}`}>
                <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{m.parts}</p>
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full shrink-0 bg-white flex items-center justify-center">
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

      {/* Input Box - Fixed relative to container or window */}
      <div className="fixed bottom-[88px] md:bottom-6 left-0 right-0 px-4 md:px-0 z-40 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <div className="glass-card rounded-2xl p-2 flex items-end gap-2 shadow-2xl border-white/20 relative">
            <div className="absolute -top-10 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent border-0 resize-none max-h-32 min-h-[44px] p-3 text-white placeholder-white/40 focus:outline-none focus:ring-0 text-sm"
              rows={1}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || loading}
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