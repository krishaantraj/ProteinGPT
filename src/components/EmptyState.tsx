import { useState } from "react";
import type { UserPrefs } from "@/types/product";

interface Props {
  onPick: (q: string) => void;
  onPrefsSet: (prefs: UserPrefs) => void;
}

const SUGGESTIONS = [
  "Best whey under ₹2000 for beginners",
  "High protein isolate for cutting",
  "Vegan protein with digestive enzymes",
  "Compare MuscleBlaze Biozyme vs ON Gold Standard",
];

const STEPS = [
  {
    id: "goal",
    question: "What's your primary goal?",
    emoji: "🎯",
    options: [
      { label: "Build Muscle", value: "muscle", emoji: "💪" },
      { label: "Lean / Cut", value: "cutting", emoji: "✂️" },
      { label: "Weight Gain", value: "bulk", emoji: "📈" },
      { label: "General Fitness", value: "general", emoji: "🏃" },
    ],
  },
  {
    id: "budget",
    question: "What's your monthly budget?",
    emoji: "💰",
    options: [
      { label: "Under ₹1,500", value: "1500", emoji: "🪙" },
      { label: "₹1,500 – ₹3,000", value: "3000", emoji: "💵" },
      { label: "₹3,000 – ₹6,000", value: "6000", emoji: "💳" },
      { label: "No limit", value: "any", emoji: "🤑" },
    ],
  },
  {
    id: "experience",
    question: "Your gym experience level?",
    emoji: "🏋️",
    options: [
      { label: "Beginner (< 1 yr)", value: "beginner", emoji: "🌱" },
      { label: "Intermediate (1–3 yr)", value: "intermediate", emoji: "⚡" },
      { label: "Advanced (3+ yr)", value: "advanced", emoji: "🔥" },
    ],
  },
  {
    id: "diet",
    question: "Any diet preference?",
    emoji: "🥗",
    options: [
      { label: "No preference", value: "any", emoji: "🍽️" },
      { label: "Vegetarian", value: "vegetarian", emoji: "🌿" },
      { label: "Vegan", value: "vegan", emoji: "🌱" },
    ],
  },
];

export function EmptyState({ onPick, onPrefsSet }: Props) {
  const [step, setStep] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const startQuestionnaire = () => setStep(0);
  const skipAll = () => {
    setStep(null);
    onPrefsSet({ goal: "general", budget: "any", experience: "intermediate", proteinMin: 0, vegan: false });
  };

  const answer = (value: string) => {
    const newAnswers = { ...answers, [STEPS[step!].id]: value };
    setAnswers(newAnswers);
    if (step! < STEPS.length - 1) {
      setStep(step! + 1);
    } else {
      const prefs: UserPrefs = {
        goal: newAnswers.goal || "general",
        budget: newAnswers.budget || "any",
        experience: newAnswers.experience || "intermediate",
        proteinMin: newAnswers.experience === "advanced" ? 27 : newAnswers.experience === "intermediate" ? 24 : 20,
        vegan: newAnswers.diet === "vegan",
      };
      onPrefsSet(prefs);
      setStep(null);
      const parts: string[] = ["Show me protein powders"];
      if (prefs.goal === "muscle") parts.push("for muscle building");
      else if (prefs.goal === "cutting") parts.push("for lean cutting");
      else if (prefs.goal === "bulk") parts.push("mass gainer weight gain");
      if (prefs.budget !== "any") parts.push(`under ${prefs.budget}`);
      if (prefs.vegan) parts.push("vegan");
      if (prefs.experience === "beginner") parts.push("beginner easy digest");
      onPick(parts.join(" "));
    }
  };

  const skipStep = () => {
    if (step! < STEPS.length - 1) setStep(step! + 1);
    else skipAll();
  };

  if (step !== null) {
    const current = STEPS[step];
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <div className="flex gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-all ${
                  i <= step ? "bg-accent" : "bg-bg-card"
                }`}
              />
            ))}
          </div>
          <div className="text-4xl mb-3 text-center">{current.emoji}</div>
          <h2 className="font-display font-bold text-xl md:text-2xl text-text-primary mb-6 text-center">
            {current.question}
          </h2>
          <div className="flex flex-col gap-2 mb-6">
            {current.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => answer(opt.value)}
                className="flex items-center gap-3 w-full text-left bg-bg-card border border-border hover:border-accent hover:bg-accent-muted transition-all rounded-xl px-4 py-3 text-text-secondary hover:text-text-primary focus-orange"
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-sm">{opt.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => (step > 0 ? setStep(step - 1) : setStep(null))}
              aria-label="Go back to the previous questionnaire step"
              className="text-text-muted hover:text-text-secondary transition-colors"
            >
              ← Back
            </button>
            <button onClick={skipStep} aria-label="Skip this questionnaire step" className="text-text-muted hover:text-text-secondary transition-colors">
              Skip this →
            </button>
            <button onClick={skipAll} aria-label="Skip the entire questionnaire and start chatting" className="text-text-muted hover:text-text-secondary transition-colors">
              Skip all & chat →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
      <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center font-display font-extrabold text-bg-primary text-4xl mb-6 pulse-glow">
        S
      </div>
      <h1 className="font-display font-bold text-2xl md:text-3xl text-text-primary mb-2 text-center">
        ProteinGPT — Your AI Assistant for Protein Powders in India
      </h1>
      <p className="text-sm text-text-secondary text-center max-w-md mb-6">
        Describe your goal, budget, or brand — I'll find the best options.
      </p>

      <button
        onClick={startQuestionnaire}
        className="bg-accent hover:bg-accent-soft text-bg-primary font-semibold text-sm rounded-full px-5 py-2.5 transition-colors focus-orange mb-2"
      >
        🎯 Personalise my search
      </button>
      <p className="text-[11px] text-text-muted mb-6">
        4 quick questions · Takes 20 seconds ·{" "}
        <button onClick={skipAll} className="underline hover:text-text-secondary transition-colors">
          Skip and explore freely
        </button>
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-xl">
        {[
          { icon: "🧠", label: "Natural language intent parsing" },
          { icon: "📊", label: "Personalised value scoring" },
          { icon: "🔍", label: "RAG product retrieval" },
          { icon: "⚡", label: "Live filter search" },
        ].map((f) => (
          <span
            key={f.label}
            className="inline-flex items-center gap-1 text-[11px] text-text-secondary bg-bg-card border border-border rounded-full px-2.5 py-1"
          >
            <span>{f.icon}</span>
            {f.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-xl">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left text-sm bg-bg-card border border-border hover:border-accent hover:bg-accent-muted transition-all rounded-xl px-4 py-3 text-text-secondary hover:text-text-primary focus-orange"
          >
            "{s}"
          </button>
        ))}
      </div>
    </div>
  );
}
