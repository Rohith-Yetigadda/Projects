/**
 * Robust date and meal-time utilities for Recompass.
 * Ensures consistent local timezone handling without UTC day-shift bugs.
 */

export function getLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentUpcomingMeal(): "breakfast" | "lunch" | "dinner" {
  const now = new Date();
  const time = now.getHours() + now.getMinutes() / 60;
  // From midnight (00:00) until 11:00 AM, the next/current meal is Breakfast
  if (time < 11) return "breakfast";
  // From 11:00 AM until 4:30 PM (16.5), the meal is Lunch
  if (time < 16.5) return "lunch";
  // From 4:30 PM until 11:59 PM, the meal is Dinner
  return "dinner";
}

export function getCurrentMealIndex(): number {
  const meal = getCurrentUpcomingMeal();
  if (meal === "breakfast") return 0;
  if (meal === "lunch") return 1;
  return 2;
}
