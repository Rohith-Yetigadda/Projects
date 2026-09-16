export async function fetchImdbData(title) {
  const cacheKey = `imdb_cache_${title}`;
  
  // Try to load from window.storage first
  if (window.storage) {
    try {
      const cached = await window.storage.get(cacheKey, false);
      if (cached && cached.value) {
        return JSON.parse(cached.value);
      }
    } catch (e) {
      console.warn("Error reading from window.storage", e);
    }
  } else {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  // If not cached, fetch from CollectAPI
  try {
    const url = `https://api.collectapi.com/imdb/imdbSearchByName?query=${encodeURIComponent(title)}`;
    const apiKey = import.meta.env.VITE_COLLECT_API_KEY;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "content-type": "application/json",
        "authorization": `apikey ${apiKey}`
      }
    });

    if (!response.ok) throw new Error("API request failed");

    const data = await response.json();
    if (data.success && data.result && data.result.length > 0) {
      const bestMatch = data.result[0]; // Take the first result
      
      // Save to cache
      if (window.storage) {
        try {
          await window.storage.set(cacheKey, JSON.stringify(bestMatch), false);
        } catch (e) {}
      } else {
        localStorage.setItem(cacheKey, JSON.stringify(bestMatch));
      }
      return bestMatch;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch IMDb data for", title, error);
    return null;
  }
}
