// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- PASTE YOUR FIREBASE CONFIG HERE ---
// (The code starting with "const firebaseConfig = { ... }")
const firebaseConfig = {
  // ... paste your keys here ...
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ==========================================
// 2. STATE & VARIABLES
// ==========================================
let currentUser = null;
let habits = [];
let isEditMode = false;
let lastAddedHabitIndex = -1;

const NOW = new Date();
let currentMonth = NOW.getMonth();
const yearInput = document.getElementById("yearInput");

// ==========================================
// 3. AUTHENTICATION
// ==========================================
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authContainer = document.getElementById("auth-container");
const appContainer = document.getElementById("app-container");

if (loginBtn) loginBtn.onclick = () => signInWithPopup(auth, provider);
if (logoutBtn) logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authContainer.classList.add("hidden");
    appContainer.classList.remove("hidden");
    document.getElementById("userPic").src = user.photoURL;
    loadData();
  } else {
    currentUser = null;
    authContainer.classList.remove("hidden");
    appContainer.classList.add("hidden");
  }
});

// ==========================================
// 4. DATE NAVIGATION
// ==========================================
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const monthDisplay = document.getElementById("currentMonthDisplay");

document.getElementById("prevMonth").onclick = () => changeMonth(-1);
document.getElementById("nextMonth").onclick = () => changeMonth(1);

function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth < 0) {
    currentMonth = 11;
    yearInput.value--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    yearInput.value++;
  }
  loadData();
}

function getDays(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

// ==========================================
// 5. DATA LOADING & SAVING
// ==========================================
async function loadData() {
  if (!currentUser) return;
  updateHeader();

  const y = parseInt(yearInput.value) || NOW.getFullYear();
  const docId = `${y}-${currentMonth}`;
  const docRef = doc(db, "users", currentUser.uid, "monthly_data", docId);

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      habits = snap.data().habits || [];
    } else {
      // New month? Try to copy previous month's habits (without checks)
      // Or just start empty
      habits = [];
    }
    update();
  } catch (e) {
    console.error("Load error:", e);
  }
}

let saveTimeout;
function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(save, 1000);
}

async function save() {
  if (!currentUser) return;
  const y = parseInt(yearInput.value) || NOW.getFullYear();
  const docId = `${y}-${currentMonth}`;
  await setDoc(doc(db, "users", currentUser.uid, "monthly_data", docId), {
    habits,
  });
}

function update() {
  renderHabits();
  updateStats();
  renderGraph();
  lucide.createIcons();
}

function updateHeader() {
  monthDisplay.textContent = monthNames[currentMonth];
}

// ==========================================
// 6. RENDERING HABITS (THE CORE)
// ==========================================
function renderHabits() {
  const habitBody = document.getElementById("habitBody");
  const headerRow = document.getElementById("headerRow");
  habitBody.innerHTML = "";

  const y = parseInt(yearInput.value) || NOW.getFullYear();
  const days = getDays(y, currentMonth);
  const today = NOW.getDate();
  const isThisMonth =
    currentMonth === NOW.getMonth() && y === NOW.getFullYear();

  // Render Header Days
  let headerHTML = `<th style="width: 140px; text-align: left; padding-left: 12px;">
                        <i data-lucide="list-todo" style="width: 14px; vertical-align: middle; margin-right: 6px; opacity: 0.5;"></i>Habit
                      </th>`;

  if (isEditMode) {
    headerHTML += `<th>Type</th><th>Imp</th><th>Goal</th>`;
  }

  for (let d = 1; d <= days; d++) {
    const isToday = isThisMonth && d === today;
    headerHTML += `<th class="${isToday ? "today-col" : ""}">${d}</th>`;
  }

  if (isEditMode) headerHTML += `<th>Actions</th>`;
  else headerHTML += `<th>%</th>`;

  headerRow.innerHTML = headerHTML;

  // Render Habit Rows
  habits.forEach((h, i) => {
    // Fix days array length if month changes size
    if (!h.days || h.days.length !== days) {
      const newDays = Array(days).fill(false);
      if (h.days)
        h.days.forEach((v, k) => {
          if (k < days) newDays[k] = v;
        });
      h.days = newDays;
    }

    const tr = document.createElement("tr");
    if (i === lastAddedHabitIndex) {
      tr.classList.add("row-enter-anim");
      setTimeout(() => tr.classList.remove("row-enter-anim"), 500);
      if (i === lastAddedHabitIndex) lastAddedHabitIndex = -1;
    }

    // --- NAME CELL (Editable) ---
    const nameTd = document.createElement("td");
    nameTd.contentEditable = isEditMode;
    nameTd.textContent = h.name;
    nameTd.style.cursor = isEditMode ? "text" : "default";

    nameTd.oninput = () => {
      h.name = nameTd.textContent;
      debouncedSave();
    };
    nameTd.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        nameTd.blur();
      }
    };
    tr.appendChild(nameTd);

    // --- SETTINGS CELLS (Edit Mode) ---
    if (isEditMode) {
      // Type
      const typeTd = document.createElement("td");
      const typeSel = document.createElement("select");
      typeSel.innerHTML = `<option value="positive">Pos</option><option value="negative">Neg</option>`;
      typeSel.value = h.type || "positive";
      typeSel.onchange = (e) => {
        h.type = e.target.value;
        save();
        update();
      };
      typeTd.appendChild(typeSel);
      tr.appendChild(typeTd);

      // Importance
      const impTd = document.createElement("td");
      const impSel = document.createElement("select");
      impSel.innerHTML = `<option value="1">Low</option><option value="2">Med</option><option value="3">High</option>`;
      impSel.value = h.weight || 2;
      impSel.onchange = (e) => {
        h.weight = parseInt(e.target.value);
        save();
        update();
      };
      impTd.appendChild(impSel);
      tr.appendChild(impTd);

      // Goal
      const goalTd = document.createElement("td");
      const gIn = document.createElement("input");
      gIn.type = "number";
      gIn.className = "goal-input";
      gIn.value = h.goal || 28;
      gIn.onchange = (e) => {
        h.goal = parseInt(e.target.value);
        save();
        updateStats();
      };
      goalTd.appendChild(gIn);
      tr.appendChild(goalTd);
    }

    // --- CHECKBOX CELLS ---
    for (let d = 0; d < days; d++) {
      const td = document.createElement("td");
      const isToday = isThisMonth && d + 1 === today;
      if (isToday) td.classList.add("today-col");

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = h.days[d];

      // Future Day Logic
      const isFuture =
        y > NOW.getFullYear() ||
        (y === NOW.getFullYear() && currentMonth > NOW.getMonth()) ||
        (isThisMonth && d + 1 > today);

      if (isFuture) {
        cb.disabled = true;
        cb.style.opacity = "0.3";
      } else {
        // "Fat Finger" Click Logic
        td.style.cursor = "pointer";
        td.onclick = (e) => {
          if (e.target !== cb) {
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event("change"));
          }
        };
      }

      cb.onchange = () => {
        h.days[d] = cb.checked;
        save();
        updateStats();
        renderGraph();
      };

      td.appendChild(cb);
      tr.appendChild(td);
    }

    // --- END CELL (Actions or Progress) ---
    const endTd = document.createElement("td");
    if (isEditMode) {
      const btnDel = document.createElement("button");
      btnDel.innerHTML = `<i data-lucide="trash-2" style="width:14px;"></i>`;
      btnDel.className = "icon-btn";
      btnDel.style.borderColor = "var(--red)";
      btnDel.style.color = "var(--red)";
      btnDel.onclick = () => {
        if (confirm("Delete habit?")) {
          habits.splice(i, 1);
          save();
          update();
        }
      };
      endTd.appendChild(btnDel);
    } else {
      const done = h.days.filter(Boolean).length;
      const pct = Math.round((done / (h.goal || days)) * 100);
      endTd.innerHTML = `<span style="font-size:11px; color:var(--text-muted);">${pct}%</span>`;
    }
    tr.appendChild(endTd);
    habitBody.appendChild(tr);
  });
}

// ==========================================
// 7. STATS & GRAPH
// ==========================================
function updateStats() {
  // Basic math for rings
  const flatHabits = habits.length ? habits : [];
  let totalChecks = 0;
  let totalPossible = 0;

  // Today Stats
  const y = parseInt(yearInput.value) || NOW.getFullYear();
  const todayIdx = NOW.getDate() - 1;
  const isThisMonth =
    currentMonth === NOW.getMonth() && y === NOW.getFullYear();

  let todayDone = 0;
  let todayTotal = habits.length;

  flatHabits.forEach((h) => {
    const doneCount = h.days.filter(Boolean).length;
    totalChecks += doneCount;
    totalPossible += h.goal || 28;
    if (isThisMonth && h.days[todayIdx]) todayDone++;
  });

  const eff = totalPossible
    ? Math.round((totalChecks / totalPossible) * 100)
    : 0;
  const todayPct = todayTotal ? Math.round((todayDone / todayTotal) * 100) : 0;

  setRing("efficiencyRing", eff);
  document.getElementById("efficiencyVal").textContent = eff + "%";
  setRing("todayRing", todayPct);
  document.getElementById("todayVal").textContent = todayPct + "%";

  // Simple Momentum (Average of efficiency + today)
  const mom = Math.round((eff + todayPct) / 2);
  setRing("momentumRing", mom);
  document.getElementById("momentumVal").textContent = mom + "%";

  // Update Text Footer
  document.getElementById("todayProgressText").textContent =
    `Today: ${todayDone}/${todayTotal} done`;
}

function setRing(id, pct) {
  const ring = document.getElementById(id);
  const radius = ring.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (pct / 100) * circumference;
  ring.style.strokeDashoffset = offset;
}

// Activity Graph (Simple Canvas Draw)
function renderGraph() {
  const canvas = document.getElementById("activityChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.parentElement.offsetWidth;
  const h = 100;
  canvas.width = w;
  canvas.height = h;

  const days = getDays(parseInt(yearInput.value), currentMonth);
  const data = [];

  for (let d = 0; d < days; d++) {
    let score = 0;
    habits.forEach((habit) => {
      if (habit.days[d]) score++;
    });
    data.push(score);
  }

  ctx.clearRect(0, 0, w, h);
  if (data.length < 2) return;

  // Draw Line
  ctx.beginPath();
  const step = w / (days - 1);
  const maxVal = Math.max(...data, 1); // Avoid div by zero

  data.forEach((val, i) => {
    const x = i * step;
    const y = h - (val / maxVal) * (h - 10);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#4ade80";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Fill Gradient
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fillStyle = "rgba(74, 222, 128, 0.1)";
  ctx.fill();
}

// ==========================================
// 8. BUTTON LOGIC (ADD, EDIT, SYNC)
// ==========================================

// EDIT MODE TOGGLE
document.getElementById("editToggle").onclick = () => {
  isEditMode = !isEditMode;
  const btn = document.getElementById("editToggle");
  btn.classList.toggle("active-edit");
  update();
};

// ADD HABIT
document.getElementById("addHabit").onclick = () => {
  lastAddedHabitIndex = habits.length;
  const days = getDays(parseInt(yearInput.value), currentMonth);
  habits.push({
    name: "New Habit",
    type: "positive",
    weight: 2,
    goal: days,
    days: Array(days).fill(false),
  });

  isEditMode = true; // Auto-enter edit mode
  document.getElementById("editToggle").classList.add("active-edit");

  save();
  update();

  // Auto-focus the new habit name
  setTimeout(() => {
    const rows = document.querySelectorAll("#habitBody tr");
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
      const cell = lastRow.querySelector("td");
      cell.focus();
      document.execCommand("selectAll", false, null);
      lastRow.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 100);
};

// SMART SYNC
const syncBtn = document.getElementById("syncBtn");
if (syncBtn) {
  syncBtn.onclick = async () => {
    if (
      !confirm(
        "🔄 Update settings from last month?\n\nThis will update habit names/goals to match the previous month.\n\n✅ SAFE: Your current checkmarks for this month will be KEPT.",
      )
    )
      return;

    const icon = syncBtn.querySelector("i");
    icon.classList.add("spin");

    try {
      const y = parseInt(yearInput.value) || NOW.getFullYear();
      let prevM = currentMonth - 1;
      let prevY = y;
      if (prevM < 0) {
        prevM = 11;
        prevY = y - 1;
      }

      const prevRef = doc(
        db,
        "users",
        currentUser.uid,
        "monthly_data",
        `${prevY}-${prevM}`,
      );
      const prevSnap = await getDoc(prevRef);

      if (prevSnap.exists()) {
        const prevData = prevSnap.data();
        const daysInCurrentMonth = getDays(y, currentMonth);

        habits = prevData.habits.map((prevHabit, index) => {
          const currentHabit = habits[index];
          let safeDays =
            currentHabit && currentHabit.days && currentHabit.days.length > 0
              ? currentHabit.days
              : Array(daysInCurrentMonth).fill(false);

          if (safeDays.length !== daysInCurrentMonth) {
            const fixed = Array(daysInCurrentMonth).fill(false);
            safeDays.forEach((v, k) => {
              if (k < daysInCurrentMonth) fixed[k] = v;
            });
            safeDays = fixed;
          }

          return {
            name: prevHabit.name,
            type: prevHabit.type || "positive",
            weight: prevHabit.weight || 2,
            goal: prevHabit.goal || 28,
            days: safeDays,
          };
        });

        await save();
        update();
      } else {
        alert("No previous month data found.");
      }
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setTimeout(() => icon.classList.remove("spin"), 1000);
    }
  };
}
