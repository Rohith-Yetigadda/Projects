const seatContainer = document.getElementById("seatContainer");
const countEl = document.getElementById("count");
const totalEl = document.getElementById("total");
const bookBtn = document.getElementById("bookBtn");
const resetBtn = document.getElementById("resetBtn");
const messageEl = document.getElementById("message");

/* Theatre configuration */
const ROWS = 16; // A to P
const SEATS_PER_ROW = 20;

/* Pricing by row (front -> back) */
const ROW_PRICES = {
  A: 180, B: 180, C: 180, D: 180, E: 180,           // Silver
  F: 250, G: 250, H: 250, I: 250, J: 250, K: 250,   // Gold
  L: 330, M: 330, N: 330, O: 330, P: 330            // Platinum 
};

let selectedSeats = [];
let bookedSeats = JSON.parse(localStorage.getItem("bookedSeats")) || [];

/* Helper: add tier header */
function addTierHeader(text) {
  const header = document.createElement("div");
  header.className = "tier-header";
  header.textContent = text;
  seatContainer.appendChild(header);
}

/* Create seat layout */
let seatIndex = 1;

for (let r = 0; r < ROWS; r++) {
  const rowName = String.fromCharCode(65 + r);

  if (rowName === "A") addTierHeader("SILVER (₹180)");
  if (rowName === "F") addTierHeader("GOLD (₹250)");
  if (rowName === "L") addTierHeader("PLATINUM (₹330)");

  const row = document.createElement("div");
  row.className = "row";

  const rowLabel = document.createElement("div");
  rowLabel.className = "row-label";
  rowLabel.textContent = rowName;

  const seatsWrap = document.createElement("div");
  seatsWrap.className = "seats";

  /* Seat blocks: 5 - 10 - 5 */
  const blocks = [
    { size: 5, className: "small" },
    { size: 10, className: "large" },
    { size: 5, className: "small" }
  ];

  let seatNumberInRow = 1;

  blocks.forEach(blockInfo => {
    const block = document.createElement("div");
    block.className = `seat-block ${blockInfo.className}`;

    for (let i = 0; i < blockInfo.size; i++) {
      const seat = document.createElement("div");
      seat.className = "seat";

      seat.textContent = seatNumberInRow;
      seat.dataset.seatNumber = seatIndex;
      seat.dataset.row = rowName;

      if (bookedSeats.includes(seatIndex)) {
        seat.classList.add("booked");
      }

      block.appendChild(seat);
      seatIndex++;
      seatNumberInRow++;
    }

    seatsWrap.appendChild(block);
  });

  row.appendChild(rowLabel);
  row.appendChild(seatsWrap);
  seatContainer.appendChild(row);
}

/* Seat selection */
seatContainer.addEventListener("click", function (e) {
  if (!e.target.classList.contains("seat")) return;
  if (e.target.classList.contains("booked")) return;

  const seatId = Number(e.target.dataset.seatNumber);

  if (selectedSeats.includes(seatId)) {
    selectedSeats = selectedSeats.filter(id => id !== seatId);
    e.target.classList.remove("selected");
  } else {
    selectedSeats.push(seatId);
    e.target.classList.add("selected");
  }

  updateSummary();
});

/* Update summary & pricing */
function updateSummary() {
  countEl.textContent = selectedSeats.length;

  let total = 0;
  selectedSeats.forEach(id => {
    const seat = document.querySelector(`.seat[data-seat-number="${id}"]`);
    total += ROW_PRICES[seat.dataset.row];
  });

  totalEl.textContent = total;
  bookBtn.disabled = selectedSeats.length === 0;
}

/* Book seats */
bookBtn.addEventListener("click", function () {
  bookedSeats.push(...selectedSeats);
  localStorage.setItem("bookedSeats", JSON.stringify(bookedSeats));

  selectedSeats.forEach(id => {
    const seat = document.querySelector(`.seat[data-seat-number="${id}"]`);
    seat.classList.remove("selected");
    seat.classList.add("booked");
  });

  selectedSeats = [];
  updateSummary();

  messageEl.textContent = "Seats booked successfully!";
  setTimeout(() => messageEl.textContent = "", 3000);
});

/* Reset booking */
resetBtn.addEventListener("click", function () {
  localStorage.removeItem("bookedSeats");
  bookedSeats = [];
  selectedSeats = [];

  document.querySelectorAll(".seat").forEach(seat => {
    seat.classList.remove("booked", "selected");
  });

  updateSummary();

  messageEl.textContent = "Booking reset.";
  setTimeout(() => messageEl.textContent = "", 2000);
});
