import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { db } from "@/lib/firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Onboarding() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState({
    goal: "",
    age: "",
    weight: "",
    height: "",
    bodyFat: "",
    diet: "",
    cookingSkill: "",
    budget: "",
  });

  const updateData = (key: string, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const completeOnboarding = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid, "profile", "main"), {
        ...data,
        onboardingComplete: true,
      });
      navigate("/app");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Already done onboarding
  if (userProfile?.onboardingComplete) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            Welcome to Recompass, {userProfile?.name?.split(" ")[0] ?? "User"}!
          </CardTitle>
          <CardDescription>
            Let's personalize your experience — Step {step} of 4
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">What is your primary goal?</h3>
              <Select value={data.goal} onValueChange={(v: string) => updateData("goal", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fat_loss">Lose fat</SelectItem>
                  <SelectItem value="muscle_gain">Build muscle</SelectItem>
                  <SelectItem value="recomp">Body recomposition</SelectItem>
                  <SelectItem value="maintain">Maintain weight</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Your body data</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input
                    type="number"
                    value={data.age}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateData("age", e.target.value)
                    }
                    placeholder="18"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    value={data.weight}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateData("weight", e.target.value)
                    }
                    placeholder="76"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input
                    type="number"
                    value={data.height}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateData("height", e.target.value)
                    }
                    placeholder="175"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Est. Body Fat %</Label>
                  <Input
                    type="number"
                    value={data.bodyFat}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateData("bodyFat", e.target.value)
                    }
                    placeholder="20"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Food &amp; Diet</h3>
              <div className="space-y-2">
                <Label>Diet Type</Label>
                <Select value={data.diet} onValueChange={(v: string) => updateData("diet", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select diet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veg">Vegetarian</SelectItem>
                    <SelectItem value="eggetarian">Eggetarian</SelectItem>
                    <SelectItem value="non_veg">Non-vegetarian</SelectItem>
                    <SelectItem value="vegan">Vegan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cooking Skill</Label>
                <Select
                  value={data.cookingSkill}
                  onValueChange={(v: string) => updateData("cookingSkill", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Cannot cook</SelectItem>
                    <SelectItem value="basic">Very basic</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Comfortable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Weekly Grocery Budget</h3>
              <Select value={data.budget} onValueChange={(v: string) => updateData("budget", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select weekly budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="500">₹500 / week</SelectItem>
                  <SelectItem value="750">₹750 / week</SelectItem>
                  <SelectItem value="1000">₹1,000 / week</SelectItem>
                  <SelectItem value="1500">₹1,500 / week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t p-4">
          <Button variant="outline" onClick={prevStep} disabled={step === 1}>
            Back
          </Button>
          {step < 4 ? (
            <Button onClick={nextStep}>Next</Button>
          ) : (
            <Button onClick={completeOnboarding} disabled={loading}>
              {loading ? "Saving..." : "Complete Setup"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
