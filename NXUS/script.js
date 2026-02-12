/* =========================================================
   0. CLEAN URL & CONFIG
========================================================= */
const path = window.location.pathname;
if (path.endsWith(".html")) {
    let newPath = path.slice(0, -5);
    if (newPath === "/index") newPath = "/";
    window.history.replaceState({}, document.title, newPath);
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- YOUR FIREBASE KEYS (Restored) ---
const firebaseConfig = {
  apiKey: "AIzaSyDYX7PzWDY20xtgUHi9alqI7WcxzvFE6Ao",
  authDomain: "nxus-tracker.firebaseapp.com",
  projectId: "nxus-tracker",
  storageBucket: "nxus-tracker.firebasestorage.app",
  messagingSenderId: "1093056988911",
  appId: "1:1093056988911:web:426a5a5b7cd2a0d36ffd1a",
  measurementId: "G-S758JXL79M"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
let currentUser = null;

// =========================================================
// 1. STATE & UTILS
// =========================================================
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const NOW = new Date();
let currentMonth = NOW.getMonth();
const yearInput = document.getElementById("yearInput"); // Matches HTML ID
if (yearInput) yearInput.value = NOW.getFullYear();

let habits = [];
let isEditMode = false;
let needsScrollToToday = true;
let lastAddedHabitIndex = -1;

const getDays = (y, m) => new Date(y, m + 1, 0).getDate();
const debounce = (func, wait) => {
    let timeout;
    return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
};

// =========================================================
// 2. AUTH & MENU LOGIC
// =========================================================
const authContainer = document.getElementById("auth-container");
const appContainer = document.getElementById("app-container");
const loginBtn = document.getElementById("loginBtn");

if (loginBtn) loginBtn.onclick = () => signInWithPopup(auth, provider);

// Profile Menu
const userPic = document.getElementById("userPic");
const userDropdown = document.getElementById("userDropdown");

if (userPic) {
    userPic.onclick = (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle("active");
    };
}
window.onclick = () => userDropdown?.classList.remove("active");

// Menu Actions
document.getElementById("menuLogoutBtn").onclick = () => { if(confirm("Sign out?")) signOut(auth); };
document.getElementById("menuEditBtn").onclick = () => { document.getElementById("editToggle").click(); userDropdown.classList.remove("active"); };

document.getElementById("menuExportBtn").onclick = () => {
    const dataStr = JSON.stringify(habits, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nxus_backup_${yearInput.value}_${currentMonth+1}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    userDropdown.classList.remove("active");
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authContainer.classList.add("hidden");
        appContainer.classList.remove("hidden");
        // Update Profile
        document.getElementById("userPic").src = user.photoURL;
        document.getElementById("menuUserName").textContent = user.displayName || "User";
        document.getElementById("menuUserEmail").textContent = user.email;
        
        loadHabits();
    } else {
        currentUser = null;
        authContainer.classList.remove("hidden");
        appContainer.classList.add("hidden");
    }
});

// =========================================================
// 3. DATA PERSISTENCE
// =========================================================
async function loadHabits() {
    if (!currentUser) return;
    const y = parseInt(yearInput.value) || NOW.getFullYear();
    const docRef = doc(db, "users", currentUser.uid, "monthly_data", `${y}-${currentMonth}`);
    
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            habits = snap.data().habits || [];
        } else {
            habits = []; // Start fresh if empty
        }
        needsScrollToToday = true;
        update();
    } catch(e) { console.error(e); }
}

async function save() {
    if (!currentUser) return;
    const y = parseInt(yearInput.value) || NOW.getFullYear();
    await setDoc(doc(db, "users", currentUser.uid, "monthly_data", `${y}-${currentMonth}`), { habits }, { merge: true });
}
const debouncedSave = debounce(save, 1000);

// =========================================================
// 4. RENDER & LOGIC
// =========================================================
// Dropdown Logic for Month Selector
const monthDropdown = document.getElementById("monthDropdown");
if(monthDropdown) {
    // Simple month selector implementation
    monthDropdown.innerHTML = `<div class="dropdown-button" id="currMonthBtn">${monthNames[currentMonth]}</div>`;
    document.getElementById("currMonthBtn").onclick = () => {
        // Toggle a simple menu or just cycle month for simplicity in this snippet
        currentMonth++; if(currentMonth>11) { currentMonth=0; yearInput.value++; }
        loadHabits();
    };
}

function update() {
    // Update Month Display
    const btn = document.getElementById("currMonthBtn");
    if(btn) btn.textContent = monthNames[currentMonth];
    
    renderHeader();
    renderHabits();
    updateStats();
    renderGraph();
    handleMobileLayout();
    if(window.lucide) lucide.createIcons();
}

function renderHeader() {
    const dayHeader = document.getElementById("dayHeader");
    const y = parseInt(yearInput.value) || NOW.getFullYear();
    const days = getDays(y, currentMonth);
    const today = NOW.getDate();
    const isThisMonth = currentMonth === NOW.getMonth() && y === NOW.getFullYear();
    
    let html = `<th>Habit</th>`;
    if(isEditMode) html += `<th>Type</th><th>Imp</th><th>Goal</th>`;
    for(let d=1; d<=days; d++) {
        html += `<th class="${isThisMonth && d===today ? 'today-col' : ''}">${d}</th>`;
    }
    html += isEditMode ? `<th>Actions</th>` : `<th>%</th>`;
    dayHeader.innerHTML = html;
}

function renderHabits() {
    const habitBody = document.getElementById("habitBody");
    habitBody.innerHTML = "";
    const y = parseInt(yearInput.value) || NOW.getFullYear();
    const days = getDays(y, currentMonth);
    const today = NOW.getDate();
    const isThisMonth = currentMonth === NOW.getMonth() && y === NOW.getFullYear();

    habits.forEach((h, i) => {
        if(!h.days || h.days.length !== days) {
            // Resize days array if month changes
            const newDays = Array(days).fill(false);
            if(h.days) h.days.forEach((v,k) => { if(k<days) newDays[k]=v; });
            h.days = newDays;
        }

        const tr = document.createElement("tr");
        if(i === lastAddedHabitIndex) {
            tr.classList.add("row-enter-anim");
            setTimeout(()=> tr.classList.remove("row-enter-anim"), 500);
            if(i===lastAddedHabitIndex) lastAddedHabitIndex = -1;
        }

        // Name
        const nameTd = document.createElement("td");
        nameTd.contentEditable = isEditMode;
        nameTd.textContent = h.name;
        nameTd.oninput = () => { h.name = nameTd.textContent; debouncedSave(); };
        tr.appendChild(nameTd);

        if(isEditMode) {
            // Type
            const typeTd = document.createElement("td");
            const tSel = document.createElement("select");
            tSel.innerHTML = `<option value="positive">Pos</option><option value="negative">Neg</option>`;
            tSel.value = h.type || "positive";
            tSel.onchange = (e) => { h.type=e.target.value; save(); update(); };
            typeTd.appendChild(tSel); tr.appendChild(typeTd);

            // Weight
            const wTd = document.createElement("td");
            const wSel = document.createElement("select");
            wSel.innerHTML = `<option value="1">Low</option><option value="2">Med</option><option value="3">High</option>`;
            wSel.value = h.weight || 2;
            wSel.onchange = (e) => { h.weight=parseInt(e.target.value); save(); update(); };
            wTd.appendChild(wSel); tr.appendChild(wTd);

            // Goal
            const gTd = document.createElement("td");
            const gIn = document.createElement("input");
            gIn.type="number"; gIn.className="goal-input"; gIn.value=h.goal||28;
            gIn.oninput = (e) => { h.goal=parseInt(e.target.value); debouncedSave(); updateStats(); };
            gTd.appendChild(gIn); tr.appendChild(gTd);
        }

        // Checkboxes
        for(let d=0; d<days; d++) {
            const td = document.createElement("td");
            if(isThisMonth && (d+1)===today) td.classList.add("today-col");
            
            const cb = document.createElement("input");
            cb.type="checkbox";
            cb.checked = h.days[d];
            if(h.type==="negative") cb.classList.add("neg-habit");

            const isFuture = y > NOW.getFullYear() || (y===NOW.getFullYear() && currentMonth > NOW.getMonth()) || (isThisMonth && (d+1)>today);
            if(isFuture) { cb.disabled=true; cb.classList.add("future-day"); }
            else {
                td.style.cursor="pointer";
                td.onclick = (e) => { if(e.target!==cb) { cb.checked=!cb.checked; cb.dispatchEvent(new Event('change')); }};
            }

            cb.onchange = () => { h.days[d]=cb.checked; save(); updateStats(); renderGraph(false); };
            td.appendChild(cb);
            tr.appendChild(td);
        }

        // End Column
        const endTd = document.createElement("td");
        if(isEditMode) {
            const btn = document.createElement("button");
            btn.innerHTML = "X"; btn.style.color="red"; btn.className="toggle-edit-btn";
            btn.onclick = () => { if(confirm("Delete?")) { habits.splice(i,1); save(); update(); }};
            endTd.appendChild(btn);
        } else {
            const done = h.days.filter(Boolean).length;
            const pct = Math.round((done / (h.goal||days)) * 100);
            endTd.innerHTML = `<div class="progress-bar"><div class="progress-fill" style="width:${Math.min(pct,100)}%"></div></div>`;
        }
        tr.appendChild(endTd);
        habitBody.appendChild(tr);
    });

    scrollToToday();
}

function scrollToToday() {
    if(!needsScrollToToday) return;
    setTimeout(() => {
        const wrapper = document.querySelector(".table-wrapper");
        const todayHeader = document.querySelector(".today-col");
        if(wrapper && todayHeader) {
            const scrollPos = todayHeader.offsetLeft - 200;
            wrapper.scrollTo({ left: Math.max(0, scrollPos), behavior: "smooth" });
            needsScrollToToday = false;
        }
    }, 200);
}

// =========================================================
// 5. WEIGHTED STREAK LOGIC
// =========================================================
function updateStats() {
    const y = parseInt(yearInput.value) || NOW.getFullYear();
    const isThisMonth = currentMonth === NOW.getMonth() && y === NOW.getFullYear();
    const todayIdx = isThisMonth ? NOW.getDate() - 1 : (habits[0]?.days.length - 1 || 0);
    
    // Rings
    let earned=0, totalPoss=0;
    habits.forEach(h => {
        const w = h.weight || 2;
        const daysPassed = todayIdx + 1;
        if(h.type==="positive") {
            const checks = h.days.slice(0, daysPassed).filter(Boolean).length;
            earned += (checks/daysPassed)*w;
        } else {
            const slips = h.days.slice(0, daysPassed).filter(Boolean).length;
            earned += ((daysPassed-slips)/daysPassed)*w;
        }
        totalPoss += w;
    });
    const eff = totalPoss ? Math.round((earned/totalPoss)*100) : 0;
    setRing("efficiencyPct", "path-efficiency", eff);

    // --- NEW WEIGHTED STREAK ---
    let streak = 0;
    // Step A: Yesterday backwards
    for (let d = todayIdx - 1; d >= 0; d--) {
        let dailyScore = 0, totalPossibleToday = 0;
        habits.forEach(h => { 
            const w = Number(h.weight) || 2;
            if (h.type === "positive") {
                totalPossibleToday += w;
                if(h.days[d]) dailyScore += w; 
            } else {
                if(h.days[d]) dailyScore -= w; 
            }
        });
        const threshold = totalPossibleToday * 0.3; // 30% Requirement
        if (dailyScore >= threshold && dailyScore > 0) streak++; else break;
    }
    // Step B: Today
    let todayScore = 0, todayPossible = 0;
    habits.forEach(h => { 
        const w = Number(h.weight) || 2;
        if (h.type === "positive") {
            todayPossible += w;
            if(h.days[todayIdx]) todayScore += w; 
        } else {
            if(h.days[todayIdx]) todayScore -= w;
        }
    });
    if (todayScore >= (todayPossible * 0.3) && todayScore > 0) streak++;

    document.getElementById("streakValue").textContent = streak;
    
    // Mobile Streak Update
    const mobileStreak = document.querySelector(".streak-info.mobile-view .streak-count");
    if(mobileStreak) mobileStreak.innerHTML = `<i data-lucide="flame" class="streak-icon"></i> ${streak}`;

    // Update Counter
    const todayDone = habits.filter(h => h.days[todayIdx] && h.type==="positive").length;
    document.getElementById("completed").textContent = todayDone;
    document.getElementById("total").textContent = habits.length;
}

function setRing(textId, pathId, pct) {
    const text = document.getElementById(textId);
    const path = document.getElementById(pathId);
    if(text) text.textContent = pct + "%";
    if(path) {
        const r = path.getAttribute("r");
        const c = 2 * Math.PI * r;
        path.style.strokeDasharray = `${c} ${c}`;
        path.style.strokeDashoffset = c - (pct/100)*c;
    }
}

// =========================================================
// 6. GRAPH & MOBILE
// =========================================================
function renderGraph(isFullRebuild = true) {
    const svg = document.getElementById("activityGraph");
    if (!svg) return;
    const y = parseInt(yearInput.value) || NOW.getFullYear();
    const totalDays = getDays(y, currentMonth);
    const width = svg.parentElement.offsetWidth || 600;
    const height = 150;
    
    // Scores
    const scores = [];
    for(let d=0; d<totalDays; d++) {
        let s = 0;
        habits.forEach(h => { if(h.days[d]) s += (h.type==="positive"?1:-1); });
        scores.push(s);
    }

    const max = Math.max(...scores, 1);
    const min = Math.min(...scores, 0);
    const range = max - min || 1;
    const pad = 20;
    const drawH = height - (pad*2);
    
    const mapY = (val) => height - pad - ((val - min)/range)*drawH;
    const zeroY = mapY(0);
    
    let dPath = "";
    const step = (width-20)/(totalDays-1);
    scores.forEach((val, i) => {
        const x = 10 + i*step;
        const yPos = mapY(val);
        if(i===0) dPath += `M ${x} ${yPos}`; else dPath += ` L ${x} ${yPos}`;
    });

    svg.innerHTML = `
        <line x1="0" y1="${zeroY}" x2="${width}" y2="${zeroY}" stroke="rgba(255,255,255,0.1)" stroke-dasharray="4 4"/>
        <path d="${dPath}" fill="none" stroke="#63e6a4" stroke-width="2"/>
        <path d="${dPath} L ${width-10} ${height} L 10 ${height} Z" fill="rgba(99,230,164,0.1)" stroke="none"/>
    `;
}

function handleMobileLayout() {
    const isMobile = window.innerWidth <= 768;
    const streakInfo = document.querySelector(".streak-info");
    const header = document.querySelector(".top");
    if(isMobile && streakInfo && header) {
        header.appendChild(streakInfo);
        streakInfo.classList.add("mobile-view");
    }
}

// =========================================================
// 7. BUTTONS & ACTIONS
// =========================================================
document.getElementById("editToggle").onclick = () => {
    isEditMode = !isEditMode;
    document.getElementById("editToggle").classList.toggle("active-edit");
    update();
};

document.getElementById("addHabit").onclick = () => {
    const days = getDays(parseInt(yearInput.value), currentMonth);
    habits.push({ name: "New Habit", type: "positive", weight: 2, goal: days, days: Array(days).fill(false) });
    isEditMode = true;
    lastAddedHabitIndex = habits.length - 1;
    document.getElementById("editToggle").classList.add("active-edit");
    save(); update();
};

const syncBtn = document.getElementById("syncBtn");
if (syncBtn) {
    syncBtn.onclick = async () => {
        if (!confirm("Sync from last month?")) return;
        const icon = syncBtn.querySelector("i");
        icon.classList.add("spin");
        try {
            const y = parseInt(yearInput.value) || NOW.getFullYear();
            let prevM = currentMonth - 1; let prevY = y;
            if (prevM < 0) { prevM = 11; prevY = y - 1; }
            const prevRef = doc(db, "users", currentUser.uid, "monthly_data", `${prevY}-${prevM}`);
            const prevSnap = await getDoc(prevRef);

            if (prevSnap.exists()) {
                const prevData = prevSnap.data();
                const daysInCurrentMonth = getDays(y, currentMonth);
                habits = prevData.habits.map((prevHabit, index) => {
                    const currentHabit = habits[index];
                    let daysToKeep = (currentHabit && currentHabit.days) ? currentHabit.days : Array(daysInCurrentMonth).fill(false);
                    if(daysToKeep.length !== daysInCurrentMonth) {
                         // Fix array length mismatch
                         const fixed = Array(daysInCurrentMonth).fill(false);
                         daysToKeep.forEach((v, k) => { if(k<daysInCurrentMonth) fixed[k]=v; });
                         daysToKeep = fixed;
                    }
                    return {
                        name: prevHabit.name,
                        type: prevHabit.type || "positive",
                        weight: prevHabit.weight || 2,
                        goal: prevHabit.goal || 28,
                        days: daysToKeep
                    };
                });
                await save(); update();
            } else { alert("No previous data."); }
        } catch (e) { console.error(e); } 
        finally { setTimeout(() => icon.classList.remove("spin"), 1000); }
    };
}

// Resizing
window.addEventListener("resize", debounce(() => { renderGraph(); handleMobileLayout(); }, 100));