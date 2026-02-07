/* =========================================================
   0. FIREBASE IMPORTS & CONFIG
========================================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDYX7PzWDY20xtgUHi9alqI7WcxzvFE6Ao",
  authDomain: "nxus-tracker.firebaseapp.com",
  projectId: "nxus-tracker",
  storageBucket: "nxus-tracker.firebasestorage.app",
  messagingSenderId: "1093056988911",
  appId: "1:1093056988911:web:426a5a5b7cd2a0d36ffd1a",
  measurementId: "G-S758JXL79M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let currentUser = null;

/* =========================================================
   1. UTILS & SETUP
========================================================= */
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const NOW = new Date();
let currentMonth = NOW.getMonth();
const yearInput = document.getElementById("year");
if (yearInput) yearInput.value = NOW.getFullYear();

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

const getDays = (y, m) => new Date(y, m + 1, 0).getDate();

// Variables
let habits = [];
let isEditMode = false;
let needsScrollToToday = true;
let lastAddedHabitIndex = -1;

/* =========================================================
   2. DATA PERSISTENCE (FIRESTORE)
========================================================= */
const loadHabits = async () => {
  if (!currentUser) return; // Wait for auth

  const y = parseInt(yearInput.value) || NOW.getFullYear();
  const docId = `${y}-${currentMonth}`; // e.g. "2026-1"
  const docRef = doc(db, "users", currentUser.uid, "monthly_data", docId);

  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Restore habits from cloud
      habits = data.habits.map((h) => ({
        name: h.name,
        type: h.type || "positive",
        weight: h.weight || 2,
        goal: h.goal || 28,
        // Ensure days array matches current month length
        days: h.days || [] 
      }));
    } else {
        // If no data for this month, start empty (or you could copy previous month here)
        habits = [];
    }
    // Refresh UI after loading
    update();
  } catch (e) {
    console.error("Error loading document: ", e);
  }
};

const save = async () => {
  if (!currentUser) return;

  const y = parseInt(yearInput.value) || NOW.getFullYear();
  const docId = `${y}-${currentMonth}`;
  const docRef = doc(db, "users", currentUser.uid, "monthly_data", docId);

  try {
    // Save the entire habits array to Firestore
    await setDoc(docRef, { habits: habits }, { merge: true });
    console.log("Saved to cloud.");
  } catch (e) {
    console.error("Error saving document: ", e);
  }
};

const debouncedSave = debounce(() => save(), 1000);

/* =========================================================
   3. SMART DROPDOWNS
========================================================= */
document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown-menu")) {
        closeAllDropdowns();
    }
});

window.addEventListener('scroll', closeAllDropdowns, true);

function closeAllDropdowns() {
    document.querySelectorAll(".dropdown-menu").forEach(el => el.remove());
    document.querySelectorAll(".dropdown-button").forEach(btn => {
        btn.classList.remove("active-dropdown-btn");
    });
}

function makeDropdown(el, options, selectedIndex, onChange) {
    if (!el) return;
    el.innerHTML = "";
    const btn = document.createElement("div");
    btn.className = "dropdown-button";
    
    const val = options[selectedIndex]?.value;
    if (val === "positive") btn.classList.add("badge-pos");
    else if (val === "negative") btn.classList.add("badge-neg");
    else if (val === 1) btn.classList.add("badge-imp-low");
    else if (val === 2) btn.classList.add("badge-imp-med");
    else if (val === 3) btn.classList.add("badge-imp-high");

    const label = document.createElement("span");
    label.textContent = options[selectedIndex]?.label || "Select";
    btn.appendChild(label);

    btn.onclick = (e) => {
        e.stopPropagation();
        if (btn.classList.contains("active-dropdown-btn")) {
            closeAllDropdowns();
            return;
        }
        closeAllDropdowns();
        btn.classList.add("active-dropdown-btn");

        const menu = document.createElement("div");
        menu.className = "dropdown-menu"; 

        options.forEach((opt) => {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.innerHTML = opt.label;
            
            if(opt.label === "High") item.style.color = "#f87171"; 
            else if(opt.label === "Medium") item.style.color = "#facc15"; 
            else if(opt.label === "Low") item.style.color = "#4fd1ff"; 
            else if(opt.label === "Positive") item.style.color = "#63e6a4"; 
            else if(opt.label === "Negative") item.style.color = "#ef4444"; 

            item.onclick = (evt) => {
                evt.stopPropagation();
                label.textContent = opt.label; 
                onChange(opt.value);
                closeAllDropdowns();
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        const rect = btn.getBoundingClientRect();
        menu.style.visibility = "hidden";
        menu.style.display = "block";
        const menuHeight = menu.scrollHeight;
        const menuWidth = menu.scrollWidth;
        
        const spaceBelow = window.innerHeight - rect.bottom;
        let topPos = rect.bottom + 6;
        let leftPos = rect.left;
        let transformOrigin = "top left";

        if (spaceBelow < menuHeight && rect.top > menuHeight) {
            topPos = rect.top - menuHeight - 6;
            transformOrigin = "bottom left";
        }

        if (leftPos + menuWidth > window.innerWidth - 10) {
            leftPos = rect.right - menuWidth;
            transformOrigin = transformOrigin.replace("left", "right");
        }

        menu.style.position = "fixed";
        menu.style.top = `${topPos}px`;
        menu.style.left = `${leftPos}px`;
        menu.style.minWidth = `${Math.max(rect.width, 120)}px`;
        menu.style.transformOrigin = transformOrigin;
        menu.style.zIndex = "999999";
        
        requestAnimationFrame(() => {
             menu.classList.add("open");
             menu.style.visibility = ""; 
        });
    };

    el.appendChild(btn);
}

/* =========================================================
   4. RENDER LOGIC
========================================================= */
function renderHeader() {
  const dayHeader = document.getElementById("dayHeader");
  if (!dayHeader) return;
  
  const y = parseInt(yearInput.value) || NOW.getFullYear();
  const days = getDays(y, currentMonth);
  const today = NOW.getDate();
  const isThisMonth = currentMonth === NOW.getMonth() && y === NOW.getFullYear();

  dayHeader.innerHTML = "";
  const nameTh = document.createElement("th");
  const wrapper = document.createElement("div");
  wrapper.className = "sticky-header-content";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "8px";
  wrapper.style.justifyContent = "flex-start";

  const settingsBtn = document.createElement("button");
  settingsBtn.className = "toggle-edit-btn";
  settingsBtn.style.width = "auto";
  settingsBtn.style.padding = "0 8px";
  settingsBtn.innerHTML = isEditMode
    ? `<i data-lucide="check" style="width:16px;"></i>`
    : `<i data-lucide="settings-2" style="width:16px;"></i>`;

  settingsBtn.onclick = (e) => {
    e.stopPropagation();
    isEditMode = !isEditMode;
    closeAllDropdowns();
    update(); 
  };

  const labelSpan = document.createElement("span");
  labelSpan.textContent = "Habit";
  wrapper.appendChild(settingsBtn);
  wrapper.appendChild(labelSpan);
  nameTh.appendChild(wrapper);
  dayHeader.appendChild(nameTh);

  if (isEditMode) {
    ["Type", "Imp", "Goal"].forEach((t) => {
      const th = document.createElement("th");
      th.textContent = t;
      dayHeader.appendChild(th);
    });
  }

  for (let d = 1; d <= days; d++) {
    const th = document.createElement("th");
    th.textContent = d;
    th.id = `header-day-${d}`;
    if (isThisMonth && d === today) th.classList.add("today-col");
    dayHeader.appendChild(th);
  }

  const endTh = document.createElement("th");
  endTh.textContent = isEditMode ? "Actions" : "";
  endTh.style.minWidth = isEditMode ? "90px" : "auto";
  dayHeader.appendChild(endTh);
}

function renderHabits() {
  const habitBody = document.getElementById("habitBody");
  if (!habitBody) return;
  habitBody.innerHTML = "";
  
  const y = parseInt(yearInput.value) || NOW.getFullYear();
  const days = getDays(y, currentMonth);
  const today = NOW.getDate();
  const isThisMonth = currentMonth === NOW.getMonth() && y === NOW.getFullYear();

  closeAllDropdowns();

  habits.forEach((h, i) => {
    // Ensure days array is correct length
    if (!h.days || h.days.length !== days) {
      const newDays = Array(days).fill(false);
      if (h.days) h.days.forEach((val, idx) => { if (idx < days) newDays[idx] = val; });
      h.days = newDays;
    }

    const tr = document.createElement("tr");
    if (i === lastAddedHabitIndex) {
        tr.classList.add("row-enter-anim");
        setTimeout(() => { 
            tr.classList.remove("row-enter-anim"); 
            if(i === lastAddedHabitIndex) lastAddedHabitIndex = -1; 
        }, 500);
    }

    const nameTd = document.createElement("td");
    nameTd.contentEditable = isEditMode;
    nameTd.textContent = h.name; 
    nameTd.style.cursor = isEditMode ? "text" : "default";
    nameTd.oninput = () => { h.name = nameTd.textContent; debouncedSave(); };
    tr.appendChild(nameTd);

    if (isEditMode) {
      const typeTd = document.createElement("td");
      const tDD = document.createElement("div"); tDD.className = "dropdown";
      makeDropdown(tDD, 
        [{ label: "Positive", value: "positive" }, { label: "Negative", value: "negative" }], 
        h.type === "negative" ? 1 : 0, 
        (v) => { h.type = v; save(); update(); }
      );
      typeTd.appendChild(tDD); tr.appendChild(typeTd);

      const impTd = document.createElement("td");
      const iDD = document.createElement("div"); iDD.className = "dropdown";
      makeDropdown(iDD, 
        [{ label: "Low", value: 1 }, { label: "Medium", value: 2 }, { label: "High", value: 3 }], 
        (h.weight || 2) - 1, 
        (v) => { h.weight = v; save(); update(); }
      );
      impTd.appendChild(iDD); tr.appendChild(impTd);

      const goalTd = document.createElement("td");
      const gIn = document.createElement("input");
      gIn.type = "number"; gIn.className = "goal-input"; gIn.value = h.goal || 28;
      gIn.oninput = (e) => { h.goal = +e.target.value; debouncedSave(); updateStats(); if (!isEditMode) updateProgress(tr, h); };
      goalTd.appendChild(gIn); tr.appendChild(goalTd);
    }

    for (let d = 0; d < days; d++) {
      const td = document.createElement("td");
      const isToday = isThisMonth && d + 1 === today;
      if (isToday) td.classList.add("today-col");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = h.days[d];
      if (h.type === "negative") cb.classList.add("neg-habit");
      
      const isFuture = y > NOW.getFullYear() || (y === NOW.getFullYear() && currentMonth > NOW.getMonth()) || (isThisMonth && d > NOW.getDate() - 1);
      if (isFuture) { cb.classList.add("future-day"); cb.disabled = true; }

      cb.onchange = () => { 
          h.days[d] = cb.checked; 
          save(); // Trigger cloud save
          updateStats(); 
          if (!isEditMode) updateProgress(tr, h); 
          renderGraph(false); 
      };
      td.appendChild(cb);
      tr.appendChild(td);
    }

    const endTd = document.createElement("td");
    if (isEditMode) {
      const actionWrap = document.createElement("div");
      actionWrap.style.display = "flex"; actionWrap.style.gap = "4px"; actionWrap.style.justifyContent = "center";
      
      const btnUp = document.createElement("button"); btnUp.className = "toggle-edit-btn"; btnUp.innerHTML = `<i data-lucide="arrow-up" style="width:14px;"></i>`; btnUp.disabled = i === 0;
      btnUp.onclick = (e) => { e.stopPropagation(); [habits[i], habits[i - 1]] = [habits[i - 1], habits[i]]; save(); update(); };
      
      const btnDown = document.createElement("button"); btnDown.className = "toggle-edit-btn"; btnDown.innerHTML = `<i data-lucide="arrow-down" style="width:14px;"></i>`; btnDown.disabled = i === habits.length - 1;
      btnDown.onclick = (e) => { e.stopPropagation(); [habits[i], habits[i + 1]] = [habits[i + 1], habits[i]]; save(); update(); };
      
      const btnDel = document.createElement("button"); btnDel.className = "toggle-edit-btn"; btnDel.innerHTML = `<i data-lucide="trash-2" style="width:14px;"></i>`; btnDel.style.color = "#ef4444";
      btnDel.onclick = (e) => { 
          if (confirm("Delete?")) { 
              const row = btnDel.closest("tr");
              row.classList.add("row-exit-anim"); 
              setTimeout(() => {
                  habits.splice(i, 1); 
                  save(); 
                  update(); 
              }, 400); 
          } 
      };

      actionWrap.append(btnUp, btnDown, btnDel);
      endTd.appendChild(actionWrap);
    } else {
      endTd.innerHTML = `<div class="progress-bar"><div class="progress-fill"></div></div>`;
      setTimeout(() => updateProgress(tr, h), 0);
    }
    tr.appendChild(endTd);
    habitBody.appendChild(tr);
  });
  
  scrollToToday();
}

function updateProgress(tr, h) {
  const done = h.days.filter(Boolean).length;
  let pct = 0;
  if (h.type === "positive") {
    const target = h.goal || h.days.length;
    pct = (done / target) * 100;
  } else {
    pct = ((h.days.length - done) / h.days.length) * 100;
  }
  if (pct > 100) pct = 100;
  const fill = tr.querySelector(".progress-fill");
  if (fill) fill.style.width = pct + "%";
}

function scrollToToday() {
    if (!needsScrollToToday) return;
    const isMobile = window.innerWidth <= 768;
    const y = parseInt(yearInput.value) || NOW.getFullYear();
    const isThisMonth = currentMonth === NOW.getMonth() && y === NOW.getFullYear();
    if (isMobile && isThisMonth && !isEditMode) {
        const today = NOW.getDate();
        if (today > 2) {
            const wrapper = document.querySelector(".table-wrapper");
            const todayHeader = document.getElementById(`header-day-${today}`);
            const firstHeader = document.querySelector("th:first-child");
            if (wrapper && todayHeader && firstHeader) {
                const stickyWidth = firstHeader.offsetWidth;
                const targetPos = todayHeader.offsetLeft - stickyWidth;
                wrapper.scrollTo({ left: targetPos, behavior: "smooth" });
            }
        }
    }
    needsScrollToToday = false; 
}

/* =========================================================
   6. GRAPH RENDERING
========================================================= */
function renderGraph(isFullRebuild = true) {
  const svg = document.getElementById("activityGraph");
  if (!svg) return;
  const y = parseInt(yearInput.value) || NOW.getFullYear();
  const totalDaysInMonth = getDays(y, currentMonth);
  const now = new Date();
  const viewDate = new Date(y, currentMonth, 1);
  const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
  let maxDotIndex = -1; 
  if (viewDate.getTime() < currentDate.getTime()) maxDotIndex = totalDaysInMonth - 1;
  else if (viewDate.getTime() === currentDate.getTime()) maxDotIndex = now.getDate() - 1;

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

  const container = svg.parentElement;
  let tooltip = container.querySelector(".graph-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "graph-tooltip";
    tooltip.innerHTML = `<span class="tooltip-date"></span><div class="tooltip-stats"></div>`;
    container.appendChild(tooltip);
  }

  const width = container.getBoundingClientRect().width || 600;
  const height = 150;
  let xPositions = [];
  const padding = 15;
  const drawWidth = width - (padding * 2);
  for (let d = 0; d < totalDaysInMonth; d++) { xPositions.push(padding + (d / (totalDaysInMonth - 1)) * drawWidth); }
  const topPad = 30; const bottomPad = 20;
  const graphHeight = height - bottomPad;
  const maxVal = Math.max(...dataPoints.map(d => d.score), 5);
  const pxPerUnit = (graphHeight - topPad) / (maxVal || 1);
  const mapY = (val) => graphHeight - val * pxPerUnit;

  const points = dataPoints.map((d, i) => ({ x: xPositions[i], y: mapY(d.score), val: d.score, pos: d.pos, neg: d.neg, day: i + 1, index: i }));
  if (points.length < 2) return;

  let dPath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length; i++) {
    if (i < points.length - 1) {
        const p0 = points[Math.max(i - 1, 0)]; const p1 = points[i]; const p2 = points[i + 1]; const p3 = points[Math.min(i + 2, points.length - 1)];
        const cp1x = p1.x + (p2.x - p0.x) * 0.15; const cp1y = p1.y + (p2.y - p0.y) * 0.15;
        const cp2x = p2.x - (p3.x - p1.x) * 0.15; const cp2y = p2.y - (p3.y - p1.y) * 0.15;
        dPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
  }
  const dArea = `${dPath} L ${points[points.length - 1].x} ${graphHeight} L ${points[0].x} ${graphHeight} Z`;

  const existingPath = svg.querySelector('.graph-path');
  if (!existingPath || isFullRebuild) {
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.style.width = "100%";
      svg.innerHTML = `
        <defs>
            <linearGradient id="gradient-area" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#63e6a4" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#63e6a4" stop-opacity="0"/>
            </linearGradient>
        </defs>
        <line x1="0" y1="${graphHeight}" x2="${width}" y2="${graphHeight}" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
        <path class="graph-area" d="${dArea}" pointer-events="none" />
        <path class="graph-path" d="${dPath}" pointer-events="none" />
        <g id="dotsGroup"></g>
        <circle id="activeDot" cx="0" cy="0" />
        <rect class="graph-overlay" width="${width}" height="${height}" />
      `;
      initGraphEvents(svg, tooltip);
  } else {
      existingPath.setAttribute('d', dPath);
      svg.querySelector('.graph-area').setAttribute('d', dArea);
      const overlay = svg.querySelector('.graph-overlay');
      if(overlay) overlay.setAttribute('width', width);
  }

  const dotsGroup = svg.getElementById('dotsGroup');
  const existingDots = dotsGroup.querySelectorAll('.graph-dot');
  if (existingDots.length !== totalDaysInMonth) {
      dotsGroup.innerHTML = ''; 
      points.forEach((p, i) => {
          const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          dot.setAttribute("class", "graph-dot");
          dot.setAttribute("r", "3");
          dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y);
          if (i > maxDotIndex) dot.style.display = "none";
          dotsGroup.appendChild(dot);
      });
  } else {
      points.forEach((p, i) => {
          const dot = existingDots[i];
          dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y);
          if (i > maxDotIndex) dot.style.display = "none"; else dot.style.display = "block";
      });
  }
  svg._dataPoints = points; svg._maxDotIndex = maxDotIndex;
}

function initGraphEvents(svg, tooltip) {
    const overlay = svg.querySelector(".graph-overlay");
    const activeDot = svg.getElementById("activeDot");
    const dateEl = tooltip.querySelector(".tooltip-date");
    const statsEl = tooltip.querySelector(".tooltip-stats");
    let isPinned = false;

    const updateView = (relX, relY) => {
        const points = svg._dataPoints || [];
        const maxDotIndex = svg._maxDotIndex || -1;
        let closest = points[0]; let minDiff = Infinity;
        for (let p of points) { const diff = Math.abs(relX - p.x); if (diff < minDiff) { minDiff = diff; closest = p; } }

        if (closest) {
            if (Math.abs(relY - closest.y) > 50 && !isPinned) { handleLeave(); return; }
            activeDot.setAttribute("cx", closest.x); activeDot.setAttribute("cy", closest.y);
            if (closest.index <= maxDotIndex) activeDot.classList.add("is-active"); else activeDot.classList.remove("is-active");

            const monthName = monthNames[currentMonth].substring(0, 3);
            dateEl.textContent = `${monthName} ${closest.day}`;
            let html = ``;
            if (closest.pos > 0 || closest.neg === 0) html += `<span class="stat-item" style="color:var(--green)">${closest.pos} done</span>`;
            if (closest.neg > 0) html += `<span class="stat-item" style="color:#ef4444">${closest.neg} slip</span>`;
            if (closest.pos === 0 && closest.neg === 0) html = `<span class="stat-item" style="color:var(--muted)">No activity</span>`;
            statsEl.innerHTML = html;

            tooltip.style.opacity = "1";
            const tipWidth = tooltip.offsetWidth || 100; const tipHeight = tooltip.offsetHeight || 60; const width = svg.parentElement.offsetWidth; 
            let leftPos = closest.x - (tipWidth / 2); if (leftPos < 10) leftPos = 10; if (leftPos + tipWidth > width - 10) leftPos = width - tipWidth - 10;
            let topPos = closest.y - tipHeight - 15; if (topPos < 0) topPos = closest.y + 20;
            tooltip.style.left = `${leftPos}px`; tooltip.style.top = `${topPos}px`;
        }
    };
    const handleMove = (e) => {
        if (isPinned) return;
        const rect = svg.getBoundingClientRect();
        let clientX = e.clientX; let clientY = e.clientY;
        if (e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
        updateView(clientX - rect.left, clientY - rect.top);
    };
    const handleClick = (e) => { e.preventDefault(); isPinned = !isPinned; if (!isPinned) handleLeave(); else { const rect = svg.getBoundingClientRect(); updateView(e.clientX - rect.left, e.clientY - rect.top); } };
    const handleLeave = () => { if (!isPinned) { tooltip.style.opacity = "0"; activeDot.classList.remove("is-active"); } };

    overlay.addEventListener("mousemove", handleMove); overlay.addEventListener("touchmove", handleMove, { passive: false });
    overlay.addEventListener("click", handleClick); overlay.addEventListener("mouseleave", handleLeave);
}

/* =========================================================
   7. UPDATES & INIT
========================================================= */
function updateStats() {
    const y = parseInt(yearInput.value) || NOW.getFullYear();
    const isThisMonth = currentMonth === NOW.getMonth() && y === NOW.getFullYear();
    const todayIdx = isThisMonth ? NOW.getDate() - 1 : (habits[0]?.days.length - 1 || 0);
    
    let earnedSoFar = 0, totalPossibleSoFar = 0, todayDone = 0, todayTotal = 0, todaySlips = 0, negTotal = 0, momentumSum = 0;
    let totalHabitsDone = 0; 
    
    habits.forEach((h) => {
        const w = Number(h.weight) || 2;
        const daysPassed = todayIdx + 1;
        const checks = h.days.slice(0, daysPassed).filter(Boolean).length;
        if (h.type === "positive") { earnedSoFar += (checks/daysPassed)*w; totalHabitsDone += checks; } 
        else { const slips = h.days.slice(0, daysPassed).filter(Boolean).length; earnedSoFar += ((daysPassed-slips)/daysPassed)*w; }
        totalPossibleSoFar += w;
        if (h.type === "positive") { todayTotal++; if(h.days[todayIdx]) todayDone++; } else { negTotal++; if(h.days[todayIdx]) todaySlips++; }
        let recentScore = 0;
        for(let i=0; i<3; i++) { const idx = todayIdx - i; if(idx >= 0) { const success = h.type==="positive" ? h.days[idx] : !h.days[idx]; if(success) recentScore++; } }
        momentumSum += (recentScore/3);
    });
    
    const efficiencyPct = totalPossibleSoFar ? (earnedSoFar/totalPossibleSoFar)*100 : 0;
    const todayPerf = ((todayDone + (negTotal - todaySlips)) / (todayTotal + negTotal || 1)) * 100;
    const momPct = habits.length ? (momentumSum / habits.length) * 100 : 0;
    setRing("ring-efficiency", efficiencyPct); setRing("ring-normalized", todayPerf); setRing("ring-momentum", momPct);
    
    const totalPotentialChecks = (todayIdx + 1) * habits.length;
    const monthlyProgress = totalPotentialChecks > 0 ? (totalHabitsDone / totalPotentialChecks) * 100 : 0;
    const gradText = document.querySelector(".headline .gradient-text");
    if(gradText) gradText.innerText = Math.round(monthlyProgress) + "%";

    let streak = 0;
    for (let d = todayIdx; d >= 0; d--) { let score = 0; habits.forEach(h => { if(h.days[d]) score += h.type==="positive"?1:-1; }); if(score > 0) streak++; else break; }
    const streakEl = document.getElementById("streakValue"); if(streakEl) streakEl.innerText = streak;
    const headerStreak = document.querySelector(".streak-info.mobile-view .streak-count");
    if(headerStreak && window.lucide) { headerStreak.innerHTML = `<i data-lucide="flame" class="streak-icon"></i> ${streak}`; lucide.createIcons(); }

    const scoreEl = document.getElementById("todaySummary");
    let todayNet = 0; habits.forEach(h => { if(h.days[todayIdx]) todayNet += h.type==="positive"?1:-1; });
    if(scoreEl) scoreEl.innerText = `${todayNet>0?"+":""}${todayNet} Net Score`;
    
    const heatGrid = document.getElementById("streakHeatmap");
    if(heatGrid) {
        heatGrid.innerHTML = "";
        for(let i=0; i<14; i++) {
            const dIdx = todayIdx - 13 + i; const div = document.createElement("div"); div.className="heat-box";
            if(dIdx >= 0) {
                let s=0; habits.forEach(h => { if(h.days[dIdx]) s+= h.type==="positive"?1:-1; });
                if(s>0) { const inten = s/habits.length; if(inten<0.4) div.classList.add("active-low"); else if(inten<0.8) div.classList.add("active-med"); else div.classList.add("active-high"); }
            }
            heatGrid.appendChild(div);
        }
    }
    const footerC = document.querySelector(".counter");
    if(footerC) {
        const slipT = negTotal > 0 ? `<span style="opacity:0.3; margin:0 6px">|</span> <span style="color:#ef4444">${todaySlips}/${negTotal}</span> slips` : ``;
        footerC.innerHTML = `Today: <span style="color:var(--green)">${todayDone}/${todayTotal}</span> done ${slipT}`;
    }
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
  const quote = document.getElementById("dailyQuote");
  const heatmap = document.getElementById("streakHeatmap");
  const header = document.querySelector(".top");
  const graphSection = document.querySelector(".today-focus");
  const analyticsSection = document.querySelector(".analytics");
  const streakWidget = document.querySelector(".streak-widget");
  let ringsWrapper = document.getElementById("mobileRingsWrapper");
  if (!ringsWrapper) { ringsWrapper = document.createElement("div"); ringsWrapper.id = "mobileRingsWrapper"; ringsWrapper.className = "rings-container-mobile"; }

  if (isMobile) {
    if (streakInfo && streakInfo.parentElement !== header) { header.appendChild(streakInfo); streakInfo.classList.add("mobile-view"); }
    if (quote && quote.previousElementSibling !== graphSection) { if(graphSection && graphSection.parentNode) { graphSection.parentNode.insertBefore(quote, graphSection.nextSibling); quote.classList.add("mobile-view"); } }
    const rings = document.querySelectorAll(".ring-block");
    rings.forEach(ring => { if(ring.parentElement !== ringsWrapper) ringsWrapper.appendChild(ring); });
    if (ringsWrapper.parentElement !== analyticsSection) { if(analyticsSection) analyticsSection.insertBefore(ringsWrapper, analyticsSection.firstChild); }
    if (heatmap && heatmap.parentElement !== analyticsSection) { if(analyticsSection) analyticsSection.appendChild(heatmap); heatmap.classList.add("mobile-view"); }
  } else {
    if (streakWidget) {
      if (streakInfo && streakInfo.parentElement !== streakWidget) { streakInfo.classList.remove("mobile-view"); streakWidget.insertBefore(streakInfo, streakWidget.firstChild); }
      if (quote && quote.parentElement !== streakWidget) { quote.classList.remove("mobile-view"); streakWidget.insertBefore(quote, streakWidget.children[1]); }
      if (heatmap && heatmap.parentElement !== streakWidget) { heatmap.classList.remove("mobile-view"); streakWidget.appendChild(heatmap); }
      const rings = document.querySelectorAll(".ring-block");
      rings.forEach(ring => { if(ring.parentElement !== analyticsSection) analyticsSection.insertBefore(ring, streakWidget); });
      if (ringsWrapper.parentElement) ringsWrapper.remove();
    }
  }
}

function update() { renderHeader(); renderHabits(); updateStats(); renderGraph(); handleMobileLayout(); if(window.lucide) lucide.createIcons(); }

// INIT
makeDropdown(document.getElementById("monthDropdown"), monthNames.map((m, i) => ({ label: m, value: i })), currentMonth, (m) => { currentMonth = m; needsScrollToToday = true; loadHabits(); update(); });

document.getElementById("addHabit").onclick = () => {
  lastAddedHabitIndex = habits.length; 
  habits.push({ name: "New Habit", type: "positive", weight: 2, goal: 28, days: Array(getDays(yearInput.value, currentMonth)).fill(false) });
  save(); 
  update();
};

window.addEventListener("resize", debounce(() => { renderGraph(); handleMobileLayout(); }, 100));
yearInput.addEventListener("input", () => { loadHabits(); update(); });

const quotes = ["Consistency is key.", "Focus on the process.", "Small wins matter.", "Day one or one day.", "Keep showing up.", "Progress, not perfection.", "Show up daily.", "Little by little."];
const qEl = document.getElementById("dailyQuote"); if(qEl) qEl.innerText = quotes[Math.floor(Math.random()*quotes.length)];

// Logout Logic
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        signOut(auth).then(() => {
            console.log("User signed out");
            window.location.href = "login.html";
        }).catch((error) => {
            console.error("Sign out error", error);
        });
    });
}

// AUTH STATE LISTENER (The main entry point)
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log("User connected:", user.email);
    
    // REVEAL THE DASHBOARD
    const appContainer = document.querySelector(".app");
    if (appContainer) appContainer.style.display = "block";

    loadHabits(); // Load data from cloud
    update();     // Render UI
  } else {
    // If not logged in, force them to login page
    window.location.href = "login.html";
  }
});