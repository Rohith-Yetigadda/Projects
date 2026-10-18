/**
 * Centralized Nutrition & Macro Calculator for Recompass
 * Single source of truth across Profile, Home, DailyLog, and Progress.
 */

export type FitnessGoal = "fat_loss" | "muscle_gain" | "recomp" | "maintain";

export interface UserVitals {
  weight?: number | string;
  height?: number | string;
  age?: number | string;
  gender?: "male" | "female" | string;
  activity?: "sedentary" | "light" | "moderate" | "very_active" | string;
  goal?: FitnessGoal | string;
  targetOverrides?: {
    enabled?: boolean;
    calories?: number | string;
    protein?: number | string;
    carbs?: number | string;
    fats?: number | string;
  };
}

export interface CalculatedTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  bmr: number;
  tdee: number;
  isCustom: boolean;
}

export function calculateMacroTargets(profile: UserVitals | null | undefined): CalculatedTargets {
  // 1. If manual override is explicitly enabled
  if (profile?.targetOverrides?.enabled) {
    const calories = Number(profile.targetOverrides.calories) || 2000;
    const protein = Number(profile.targetOverrides.protein) || 120;
    const carbs = Number(profile.targetOverrides.carbs) || 200;
    const fats = Number(profile.targetOverrides.fats) || 60;

    return {
      calories: Math.max(800, Math.round(calories)),
      protein: Math.max(30, Math.round(protein)),
      carbs: Math.max(20, Math.round(carbs)),
      fats: Math.max(15, Math.round(fats)),
      bmr: 1600,
      tdee: calories,
      isCustom: true,
    };
  }

  // 2. Parse biometric parameters
  const weight = Math.max(35, parseFloat(String(profile?.weight || 70)) || 70);
  const height = Math.max(120, parseFloat(String(profile?.height || 170)) || 170);
  const age = Math.max(14, parseFloat(String(profile?.age || 21)) || 21);
  const isFemale = profile?.gender === "female";

  // Mifflin-St Jeor Equation
  const bmr = isFemale
    ? (10 * weight) + (6.25 * height) - (5 * age) - 161
    : (10 * weight) + (6.25 * height) - (5 * age) + 5;

  let activityMultiplier = 1.45; // Default active student (walking campus, hostel life)
  if (profile?.activity === "sedentary") activityMultiplier = 1.2;
  else if (profile?.activity === "light") activityMultiplier = 1.375;
  else if (profile?.activity === "moderate") activityMultiplier = 1.55;
  else if (profile?.activity === "very_active") activityMultiplier = 1.725;

  const tdee = bmr * activityMultiplier;
  const rawGoal = (profile?.goal || "maintain").toLowerCase();

  let targetCals = tdee;
  let targetProtein = weight * 1.6;

  if (rawGoal.includes("muscle")) {
    // Hypertrophy surplus: +300 kcal, 2.2g/kg protein
    targetCals = tdee + 300;
    targetProtein = weight * 2.2;
  } else if (rawGoal.includes("recomp")) {
    // Body Recomposition: Slight deficit (-100 kcal) with MAXIMAL protein (2.2g/kg)
    // to drive muscle protein synthesis while mobilizing fat stores
    targetCals = Math.max(1200, tdee - 100);
    targetProtein = weight * 2.2;
  } else if (rawGoal.includes("fat") || rawGoal.includes("lose")) {
    // Fat Loss deficit: -350 kcal, 2.0g/kg protein (prevent muscle loss during deficit)
    targetCals = Math.max(1200, tdee - 350);
    targetProtein = weight * 2.0;
  } else {
    // Maintenance: 100% TDEE, 1.6g/kg protein
    targetCals = tdee;
    targetProtein = weight * 1.6;
  }

  const finalCalories = Math.round(targetCals);
  const finalProtein = Math.round(targetProtein);
  const finalFats = Math.max(25, Math.round((finalCalories * 0.25) / 9));
  const remainingMacroCalories = Math.max(0, finalCalories - (finalProtein * 4) - (finalFats * 9));
  const finalCarbs = Math.max(30, Math.round(remainingMacroCalories / 4));

  return {
    calories: finalCalories,
    protein: finalProtein,
    carbs: finalCarbs,
    fats: finalFats,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    isCustom: false,
  };
}
