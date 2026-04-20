import { useState, useEffect } from "react";
import "./App.css";

const API_KEY = "35df10ee70c7b3c20841e7afbe274ae2";

export default function App() {
  const [city, setCity] = useState("Munnar");
  const [search, setSearch] = useState("");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("metric");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!city) return;

    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${unit}`
        );

        if (!res.ok) throw new Error("City not found");

        const data = await res.json();
        setWeather(data);

        setHistory((prev) => {
          const updated = [city, ...prev.filter((c) => c !== city)];
          return updated.slice(0, 3);
        });
      } catch (err) {
        setError(err.message);
        setWeather(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [city, unit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (search.trim()) {
      setCity(search.trim());
      setSearch("");
    }
  };

  const toggleUnit = () => {
    setUnit((prev) =>
      prev === "metric" ? "imperial" : "metric"
    );
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="fog"></div>

      <main className="app">
        {weather && !loading && (
          <section className="card">
            <div className="top">
              <div>
                <div className="temp">
                  {Math.round(weather.main.temp)}°
                </div>
                <div className="info">
                  <h1>{weather.name}</h1>
                  <p className="condition">
                    {weather.weather[0].description}
                  </p>
                  <p className="time">
                    {formatTime(weather.dt)}
                  </p>
                </div>
              </div>

              <img
                className="icon"
                src={
                  weather?.weather?.[0]?.icon
                    ? `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`
                    : ""
                }
                alt=""
              />
            </div>

            <div className="details">
              <div>
                <span>Feels Like</span>
                <strong>
                  {Math.round(weather.main.feels_like)}°
                </strong>
              </div>
              <div>
                <span>Humidity</span>
                <strong>{weather.main.humidity}%</strong>
              </div>
              <div>
                <span>Wind</span>
                <strong>
                  {weather.wind.speed}{" "}
                  {unit === "metric" ? "m/s" : "mph"}
                </strong>
              </div>
              <div>
                <span>Pressure</span>
                <strong>{weather.main.pressure} hPa</strong>
              </div>
            </div>
          </section>
        )}

        {loading && <p>Loading...</p>}
        {error && <p>{error}</p>}

        <form className="search" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter a place..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <button className="toggle" onClick={toggleUnit}>
          Switch to {unit === "metric" ? "°F" : "°C"}
        </button>

        {history.length > 0 && (
          <ul>
            {history.map((item, index) => (
              <li key={index} onClick={() => setCity(item)}>
                {item}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}