/* =========================================================
   0. FIREBASE IMPORTS & CONFIG
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

/* =========================================================
   1. UTILS & SETUP
========================================================= */
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const NOW = new Date();
let currentMonth = NOW.getMonth();
const yearInput = document.getElementById("year");
if (yearInput) yearInput.value = NOW.getFullYear();

const debounce = (func, wait) => {
  let timeout;
  return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
};

const getDays = (y, m) => new Date(y, m + 1, 0).getDate();

let habits = [];
let isEditMode = false;
let needsScrollToToday = true;
let lastAddedHabitIndex = -1;

/* =========================================================
   2. AUTH & MENU LOGIC (NEW)
========================================================= */
const authContainer = document.getElementById("auth-container");
const appContainer = document.getElementById("app-container");
const loginBtn = document.getElementById("loginBtn");

if (loginBtn) loginBtn.onclick = () => signInWithPopup(auth, provider);

// Profile Menu Logic
const userPic = document.getElementById("userPic");
const userDropdown = document.getElementById("userDropdown");

if (userPic) {
    userPic.onclick = (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle("active");
    };
}
window.onclick = () => userDropdown?.classList.remove("active");

// Menu Buttons
document.getElementById("menuLogoutBtn").onclick = () => { if(confirm("Sign out?")) signOut(auth); };
document.getElementById("menuEditBtn").onclick = () => { 
    // Toggle edit mode via the logic you already have
    const settingsBtn = document.querySelector(".toggle-edit-btn");
    if(settingsBtn) settingsBtn.click();
    else { isEditMode = !isEditMode; closeAllDropdowns(); update(); }
    userDropdown.classList.remove("active"); 
};
document.getElementById("menuExportBtn").onclick = () => {
    const dataStr = JSON.stringify(habits, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nxus_backup_${yearInput.value}_${currentMonth+1}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    userDropdown.classList.remove("active");
};

// Auth Listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authContainer.style.display = "none"; // Hide Login
    appContainer.style.display = "block"; // Show App
    
    // Update Profile
    document.getElementById("userPic").src = user.photoURL;
    document.getElementById("menuUserName").textContent = user.displayName || "User";
    document.getElementById("menuUserEmail").textContent = user.email;

    loadHabits();
    update();     
  } else {
    authContainer.style.display = "flex";
    appContainer.style.display = "none";
  }
});

/* =========================================================
   3. DATA PERSISTENCE
========================================================= */
const loadHabits = async () => {
  if (!currentUser) return;
  const y = parseInt(yearInput.value) || NOW.getFullYear();
  const docRef = doc(db, "users", currentUser.uid, "monthly_data", `${y}-${currentMonth}`);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) { habits = snap.data().habits || []; } 
    else { habits = []; }
    needsScrollToToday = true; 
    update();
  } catch (e) { console.error(e); }
};

const save = async () => {
  if (!currentUser) return;
  const y = parseInt(yearInput.value) || NOW.getFullYear();
  await setDoc(doc(db, "users", currentUser.uid, "monthly_data", `${y}-${currentMonth}`), { habits }, { merge: true });
};
const debouncedSave = debounce(() => save(), 1000);

/* =========================================================
   4. RENDER LOGIC (YOUR ORIGINAL CODE)
========================================================= */
document.addEventListener("click", (e) => { if (!e.target.closest(".dropdown-menu")) closeAllDropdowns(); });
window.addEventListener('scroll', closeAllDropdowns, true);

function closeAllDropdowns() {
    document.querySelectorAll(".dropdown-menu").forEach(el => el.remove());
    document.querySelectorAll(".dropdown-button").forEach(btn => btn.classList.remove("active-dropdown-btn"));
}

function makeDropdown(el, options, selectedIndex, onChange) {
    if (!el) return;
    el.innerHTML = "";
    const btn = document.createElement("div"); btn.className = "dropdown-button";
    const val = options[selectedIndex]?.value;
    if (val === "positive") btn.classList.add("badge-pos");
    else if (val === "negative") btn.classList.add("badge-neg");
    else if (val === 1) btn.classList.add("badge-imp-low");
    else if (val === 2) btn.classList.add("badge-imp-med");
    else if (val === 3) btn.classList.add("badge-imp-high");

    const label = document.createElement("span"); label.textContent = options[selectedIndex]?.label || "Select";
    btn.appendChild(label);

    btn.onclick = (e) => {
        e.stopPropagation();
        if (btn.classList.contains("active-dropdown-btn")) { closeAllDropdowns(); return; }
        closeAllDropdowns(); btn.classList.add("active-dropdown-btn");

        const menu = document.createElement("div"); menu.className = "dropdown-menu"; 
        options.forEach((opt) => {
            const item = document.createElement("div"); item.className = "dropdown-item"; item.innerHTML = opt.label;
            if(opt.label === "High") item.style.color = "#f87171"; 
            else if(opt.label === "Medium") item.style.color = "#facc15"; 
            else if(opt.label === "Low") item.style.color = "#4fd1ff"; 
            else if(opt.label === "Positive") item.style.color = "#63e6a4"; 
            else if(opt.label === "Negative") item.style.color = "#ef4444"; 

            item.onclick = (evt) => {
                evt.stopPropagation(); label.textContent = opt.label; 
                onChange(opt.value); closeAllDropdowns();
            };
            menu.appendChild(item);
        });
        document.body.appendChild(menu);
        const rect = btn.getBoundingClientRect();
        menu.style.position = "fixed"; menu.style.top = `${rect.bottom + 6}px`; menu.style.left = `${rect.left}px`;
        requestAnimationFrame(() => { menu.classList.add("open"); menu.style.visibility = ""; });
    };
    el.appendChild(btn);
}

function renderHeader() {
  const dayHeader = document.getElementById("dayHeader");
  const y = parseInt(yearInput.value) || NOW.getFullYear();
  const days = getDays(y, currentMonth);
  const today = NOW.getDate();
  const isThisMonth = currentMonth === NOW.getMonth() && y === NOW.getFullYear();

  dayHeader.innerHTML = "";
  const nameTh = document.createElement("th");
  nameTh.innerHTML = `<div class="sticky-header-content" style="display:flex;align-items:center;gap:8px;"><button class="toggle-edit-btn">${isEditMode ? '<i data-lucide="check" style="width:16px;"></i>' : '<i data-lucide="settings-2" style="width:16px;"></i>'}</button><span>Habit</span></div>`;
  nameTh.querySelector("button").onclick = (e) => { e.stopPropagation(); isEditMode=!isEditMode; closeAllDropdowns(); update(); };
  dayHeader.appendChild(nameTh);

  if (isEditMode) { ["Type", "Imp", "Goal"].forEach((t) => { const th = document.createElement("th"); th.textContent = t; dayHeader.appendChild(th); }); }

  for (let d = 1; d <= days; d++) {
    const th = document.createElement("th"); th.textContent = d; th.id = `header-day-${d}`;
    if (isThisMonth && d === today) th.classList.add("today-col");
    dayHeader.appendChild(th);
  }
  const endTh = document.createElement("th"); endTh.textContent = isEditMode ? "Actions" : ""; endTh.style.minWidth = isEditMode ? "90px" : "auto";
  dayHeader.appendChild(endTh);
}

function renderHabits() {
  const habitBody = document.getElementById("habitBody"); habitBody.innerHTML = "";
  const y = parseInt(yearInput.value) || NOW.getFullYear();
  const days = getDays(y, currentMonth);
  const today = NOW.getDate();
  const isThisMonth = currentMonth === NOW.getMonth() && y === NOW.getFullYear();
  closeAllDropdowns();

  habits.forEach((h, i) => {
    if (!h.days || h.days.length !== days) {
      const newDays = Array(days).fill(false);
      if (h.days) h.days.forEach((v, idx) => { if (idx < days) newDays[idx] = v; });
      h.days = newDays;
    }

    const tr = document.createElement("tr");
    if (i === lastAddedHabitIndex) { tr.classList.add("row-enter-anim"); setTimeout(() => { tr.classList.remove("row-enter-anim"); if(i === lastAddedHabitIndex) lastAddedHabitIndex = -1; }, 500); }

    const nameTd = document.createElement("td");
    nameTd.contentEditable = isEditMode; nameTd.textContent = h.name; nameTd.style.cursor = isEditMode ? "text" : "default";
    nameTd.oninput = () => { h.name = nameTd.textContent; debouncedSave(); };
    nameTd.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); nameTd.blur(); } };
    tr.appendChild(nameTd);

    if (isEditMode) {
      const typeTd = document.createElement("td"); const tDD = document.createElement("div"); tDD.className = "dropdown";
      makeDropdown(tDD, [{ label: "Positive", value: "positive" }, { label: "Negative", value: "negative" }], h.type === "negative" ? 1 : 0, (v) => { h.type = v; save(); update(); });
      typeTd.appendChild(tDD); tr.appendChild(typeTd);

      const impTd = document.createElement("td"); const iDD = document.createElement("div"); iDD.className = "dropdown";
      makeDropdown(iDD, [{ label: "Low", value: 1 }, { label: "Medium", value: 2 }, { label: "High", value: 3 }], (h.weight || 2) - 1, (v) => { h.weight = v; save(); update(); });
      impTd.appendChild(iDD); tr.appendChild(impTd);

      const goalTd = document.createElement("td"); const gIn = document.createElement("input");
      gIn.type = "number"; gIn.className = "goal-input"; gIn.value = h.goal || 28;
      gIn.oninput = (e) => { h.goal = +e.target.value; debouncedSave(); updateStats(); if (!isEditMode) updateProgress(tr, h); };
      goalTd.appendChild(gIn); tr.appendChild(goalTd);
    }

    for (let d = 0; d < days; d++) {
      const td = document.createElement("td");
      if (isThisMonth && d + 1 === today) td.classList.add("today-col");
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = h.days[d];
      if (h.type === "negative") cb.classList.add("neg-habit");
      
      const isFuture = y > NOW.getFullYear() || (y === NOW.getFullYear() && currentMonth > NOW.getMonth()) || (isThisMonth && d > NOW.getDate() - 1);
      if (isFuture) { cb.classList.add("future-day"); cb.disabled = true; td.classList.add("disabled-cell"); }
      else {
          td.style.cursor="pointer";
          td.onclick = (e) => { if (e.target !== cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); } };
      }

      cb.onchange = () => { h.days[d] = cb.checked; save(); updateStats(); if (!isEditMode) updateProgress(tr, h); renderGraph(false); };
      td.appendChild(cb); tr.appendChild(td);
    }

    const endTd = document.createElement("td");
    if (isEditMode) {
      const btnDel = document.createElement("button"); btnDel.className = "toggle-edit-btn"; btnDel.innerHTML = `<i data-lucide="trash-2" style="width:14px;"></i>`; btnDel.style.color = "#ef4444";
      btnDel.onclick = (e) => { if (confirm("Delete?")) { habits.splice(i, 1); save(); update(); } };
      endTd.appendChild(btnDel);
    } else {
      endTd.innerHTML = `<div class="progress-bar"><div class="progress-fill"></div></div>`;
      setTimeout(() => updateProgress(tr, h), 0);
    }
    tr.appendChild(endTd); habitBody.appendChild(tr);
  });
  scrollToToday();
}

function updateProgress(tr, h) {
  const done = h.days.filter(Boolean).length;
  let pct = h.type==="positive" ? (done/(h.goal||28))*100 : ((h.days.length-done)/h.days.length)*100;
  const fill = tr.querySelector(".progress-fill");
  if (fill) fill.style.width = Math.min(pct,100) + "%";
}

function scrollToToday() {
    if (!needsScrollToToday) return;
    setTimeout(() => {
        const wrapper = document.querySelector(".table-wrapper");
        const todayHeader = document.querySelector(".today-col");
        if (wrapper && todayHeader) {
            wrapper.scrollTo({ left: Math.max(0, todayHeader.offsetLeft - 200), behavior: "smooth" });
            needsScrollToToday = false;
        }
    }, 200);
}

/* =========================================================
   5. GRAPH RENDERING (YOUR SVG LOGIC)
========================================================= */
function renderGraph(isFullRebuild = true) {
  const svg = document.getElementById("activityGraph");
  if (!svg) return;
  const y = parseInt(yearInput.value) || NOW.getFullYear();
  const totalDaysInMonth = getDays(y, currentMonth);
  
  // Calculate Scores
  let dataPoints = [];
  for (let d = 0; d < totalDaysInMonth; d++) {
    let dailyScore = 0; let posCount = 0; let negCount = 0;
    habits.forEach((h) => {
      if (h.days[d]) {
        if (h.type === "positive") { dailyScore += 1; posCount++; }
        else { dailyScore -= 1; negCount++; }
      }
    });
    dataPoints.push({ score: dailyScore, pos: posCount, neg: negCount });
  }

  // Draw Logic
  const container = svg.parentElement;
  let tooltip = container.querySelector(".graph-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div"); tooltip.className = "graph-tooltip";
    tooltip.innerHTML = `<span class="tooltip-date"></span><div class="tooltip-stats"></div>`;
    container.appendChild(tooltip);
  }

  const width = container.getBoundingClientRect().width || 600; const height = 150;
  const topPad = 30; const bottomPad = 20; const graphHeight = height - bottomPad;
  
  // Dynamic Scaling
  const scores = dataPoints.map(d => d.score);
  const maxVal = Math.max(...scores, 1); const minVal = Math.min(...scores, 0); 
  const range = maxVal - minVal || 1;
  const mapY = (val) => graphHeight - ((val - minVal) / range) * (graphHeight - topPad);
  const zeroY = mapY(0);

  const step = (width-30)/(totalDaysInMonth-1);
  let dPath = "";
  const points = dataPoints.map((d, i) => {
      const x = 15 + i*step; const y = mapY(d.score);
      if(i===0) dPath += `M ${x} ${y}`;
      else {
          const prevX = 15 + (i-1)*step; const prevY = mapY(dataPoints[i-1].score);
          const cp1x = prevX + (x-prevX)*0.5; const cp2x = x - (x-prevX)*0.5;
          dPath += ` C ${cp1x} ${prevY}, ${cp2x} ${y}, ${x} ${y}`;
      }
      return {x,y, ...d, day:i+1, index:i};
  });

  const dArea = `${dPath} L ${points[points.length-1].x} ${graphHeight} L ${points[0].x} ${graphHeight} Z`;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.width = "100%";
  svg.innerHTML = `
    <defs><linearGradient id="gradient-area" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#63e6a4" stop-opacity="0.3"/><stop offset="100%" stop-color="#63e6a4" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" y1="${zeroY}" x2="${width}" y2="${zeroY}" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="4 4" />
    <path class="graph-area" d="${dArea}" pointer-events="none" />
    <path class="graph-path" d="${dPath}" pointer-events="none" />
    <g id="dotsGroup"></g>
    <circle id="activeDot" cx="0" cy="0" />
    <rect class="graph-overlay" width="${width}" height="${height}" />
  `;
  
  const dotsGroup = svg.getElementById('dotsGroup');
  points.forEach((p, i) => {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("class", "graph-dot"); dot.setAttribute("r", "3");
      dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y);
      if (i > (NOW.getDate()-1)) dot.style.display="none"; 
      dotsGroup.appendChild(dot);
  });
  
  initGraphEvents(svg, tooltip, points);
}

function initGraphEvents(svg, tooltip, points) {
    const overlay = svg.querySelector(".graph-overlay");
    const activeDot = svg.getElementById("activeDot");
    const dateEl = tooltip.querySelector(".tooltip-date");
    const statsEl = tooltip.querySelector(".tooltip-stats");
    let isPinned = false;

    const updateView = (relX) => {
        let closest = points[0]; let minDiff = Infinity;
        for (let p of points) { const diff = Math.abs(relX - p.x); if (diff < minDiff) { minDiff = diff; closest = p; } }
        activeDot.setAttribute("cx", closest.x); activeDot.setAttribute("cy", closest.y); activeDot.classList.add("is-active");
        
        dateEl.textContent = `${monthNames[currentMonth].substring(0,3)} ${closest.day}`;
        statsEl.innerHTML = closest.score > 0 ? `<span class="stat-item" style="color:#63e6a4">+${closest.score}</span>` : `<span class="stat-item" style="color:#ef4444">${closest.score}</span>`;
        tooltip.style.opacity = "1";
        tooltip.style.left = `${closest.x - 30}px`; tooltip.style.top = `${closest.y - 50}px`;
    };

    overlay.addEventListener("mousemove", (e) => { if(!isPinned) updateView(e.offsetX); });
    overlay.addEventListener("click", () => isPinned=!isPinned);
    overlay.addEventListener("mouseleave", () => { if(!isPinned) { tooltip.style.opacity="0"; activeDot.classList.remove("is-active"); }});
}

/* =========================================================
   6. UPDATES & STATS (WEIGHTED LOGIC ADDED HERE)
========================================================= */
function updateStats() {
    const y = parseInt(yearInput.value) || NOW.getFullYear();
    const isThisMonth = currentMonth === NOW.getMonth() && y === NOW.getFullYear();
    const todayIdx = isThisMonth ? NOW.getDate() - 1 : (habits[0]?.days.length - 1 || 0);
    
    let earned=0, totalPoss=0, todayDone=0, todayTotal=0, negTotal=0, todaySlips=0, momentumSum=0;
    
    habits.forEach(h => {
        const w = Number(h.weight) || 2;
        const daysPassed = todayIdx + 1;
        if(h.type==="positive") {
            const checks = h.days.slice(0, daysPassed).filter(Boolean).length;
            earned += (checks/daysPassed)*w;
            todayTotal++; if(h.days[todayIdx]) todayDone++;
        } else {
            const slips = h.days.slice(0, daysPassed).filter(Boolean).length;
            earned += ((daysPassed-slips)/daysPassed)*w;
            negTotal++; if(h.days[todayIdx]) todaySlips++;
        }
        totalPoss += w;
    });

    const eff = totalPoss ? Math.round((earned/totalPoss)*100) : 0;
    const todayPerf = ((todayDone + (negTotal - todaySlips)) / (todayTotal + negTotal || 1)) * 100;
    setRing("ring-efficiency", eff); setRing("ring-normalized", todayPerf); setRing("ring-momentum", Math.round(eff)); // Simplified momemtum

    document.querySelector(".gradient-text").innerText = eff + "%";

    // --- WEIGHTED STREAK LOGIC ---
    let streak = 0;
    // Step A: Yesterday backwards
    for (let d = todayIdx - 1; d >= 0; d--) {
        let dailyScore = 0, totalPossibleToday = 0;
        habits.forEach(h => { 
            const w = Number(h.weight) || 2;
            if (h.type === "positive") { totalPossibleToday += w; if(h.days[d]) dailyScore += w; } 
            else { if(h.days[d]) dailyScore -= w; }
        });
        const threshold = totalPossibleToday * 0.3; // 30% Requirement
        if (dailyScore >= threshold && dailyScore > 0) streak++; else break;
    }
    // Step B: Today
    let todayScore = 0, totalPossibleToday = 0;
    habits.forEach(h => { 
        const w = Number(h.weight) || 2;
        if (h.type === "positive") { totalPossibleToday += w; if(h.days[todayIdx]) todayScore += w; } 
        else { if(h.days[todayIdx]) todayScore -= w; }
    });
    if (todayScore >= (totalPossibleToday * 0.3) && todayScore > 0) streak++;

    document.getElementById("streakValue").textContent = streak;
    const mobileStreak = document.querySelector(".streak-info.mobile-view .streak-count");
    if(mobileStreak) mobileStreak.innerHTML = `<i data-lucide="flame" class="streak-icon"></i> ${streak}`;

    // Footer Stats
    const footerC = document.querySelector(".counter");
    if(footerC) footerC.innerHTML = `Today: <span style="color:var(--green)">${todayDone}/${todayTotal}</span>`;
}

function setRing(id, pct) {
  const path = document.getElementById(id.replace("ring-", "path-"));
  const text = document.getElementById(id.replace("ring-", "") + "Pct");
  if(!path) return;
  const r = path.getAttribute("r"); const circ = 2 * Math.PI * r;
  path.style.strokeDasharray = `${circ} ${circ}`; path.style.strokeDashoffset = circ - (pct / 100) * circ;
  text.textContent = Math.round(pct) + "%";
}

function handleMobileLayout() {
  const isMobile = window.innerWidth <= 768;
  const streakInfo = document.querySelector(".streak-info");
  const header = document.querySelector(".top");
  if (isMobile && streakInfo && header) { header.appendChild(streakInfo); streakInfo.classList.add("mobile-view"); }
}

makeDropdown(document.getElementById("monthDropdown"), monthNames.map((m, i) => ({ label: m, value: i })), currentMonth, (m) => { currentMonth = m; needsScrollToToday = true; loadHabits(); update(); });

document.getElementById("addHabit").onclick = () => {
  lastAddedHabitIndex = habits.length; 
  habits.push({ name: "New Habit", type: "positive", weight: 2, goal: 28, days: Array(getDays(yearInput.value, currentMonth)).fill(false) });
  save(); isEditMode = true; update();
  setTimeout(() => { const rows = document.querySelectorAll("#habitBody tr"); const lastRow = rows[rows.length - 1]; if (lastRow) { const nameCell = lastRow.querySelector("td:first-child"); if (nameCell) { nameCell.focus(); document.execCommand('selectAll', false, null); } lastRow.scrollIntoView({ behavior: "smooth", block: "center" }); } }, 100);
};

window.addEventListener("resize", debounce(() => { renderGraph(); handleMobileLayout(); }, 100));
yearInput.addEventListener("input", () => { loadHabits(); update(); });

const qEl = document.getElementById("dailyQuote"); if(qEl) qEl.innerText = ["Consistency is key.", "Focus on the process.", "Small wins matter."][Math.floor(Math.random()*3)];

function update() { renderHeader(); renderHabits(); updateStats(); renderGraph(); handleMobileLayout(); if(window.lucide) lucide.createIcons(); }