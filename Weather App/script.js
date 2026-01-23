const form = document.querySelector(".search");
const input = document.querySelector(".search input");

const tempEl = document.querySelector(".temp-value");
const cityEl = document.querySelector(".city");
const conditionEl = document.querySelector(".condition");
const timeEl = document.querySelector(".time");
const iconEl = document.querySelector(".icon");

const feelsLikeEl = document.getElementById("feelsLike");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const visibilityEl = document.getElementById("visibility");
const uvEl = document.getElementById("uv");
const pressureEl = document.getElementById("pressure");

const DEFAULT_CITY = "Munnar";

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = input.value.trim();
  if (city) {
    fetchWeather(city);
    input.value = "";
  }
});

function formatDateTime(localtime) {
  const date = new Date(localtime.replace(" ", "T"));
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

async function fetchWeather(city) {
  const url = `https://api.weatherapi.com/v1/current.json?key=228d7b78898d4a65924151337262301&q=${city}&aqi=yes`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    tempEl.innerText = Math.round(data.current.temp_c);
    cityEl.innerText = data.location.name;
    conditionEl.innerText = data.current.condition.text;
    timeEl.innerText = formatDateTime(data.location.localtime);

    iconEl.src = "https:" + data.current.condition.icon;

    feelsLikeEl.innerText = `${Math.round(data.current.feelslike_c)}°`;
    humidityEl.innerText = `${data.current.humidity}%`;
    windEl.innerText = `${data.current.wind_kph} km/h`;
    visibilityEl.innerText = `${data.current.vis_km} km`;
    uvEl.innerText = data.current.uv;
    pressureEl.innerText = `${data.current.pressure_mb} hPa`;
  } catch (err) {
    alert("Location not found");
  }
}

fetchWeather(DEFAULT_CITY);
