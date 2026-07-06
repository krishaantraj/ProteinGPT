import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ProteinGPT" },
      { name: "description", content: "Sign in to ProteinGPT to save your chat history, track favourite protein powders and get personalised recommendations tailored to your fitness goals and budget." },
      { property: "og:title", content: "Sign in — ProteinGPT" },
      { property: "og:description", content: "Sign in to ProteinGPT to save your chat history and personalised protein recommendations." },
      { property: "og:url", content: "https://proteingpt.lovable.app/auth" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://proteingpt.lovable.app/auth" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setError(null);
    setInfo(null);
    if (!email || !password) {
      setError("Please fill in both fields.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) {
          setError(e.message);
          return;
        }
        sessionStorage.removeItem("proteingpt-guest");
        navigate({ to: "/", replace: true });
      } else {
        const { error: e } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (e) {
          setError(e.message);
          return;
        }
        setInfo("Account created! Check your email to confirm, then sign in.");
        setMode("login");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-bg-secondary border border-border rounded-2xl p-6 space-y-5">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center font-display font-extrabold text-bg-primary text-2xl">
            S
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-lg">ShopMind</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-muted text-accent">
              ProteinGPT
            </span>
          </div>
        </div>

        <h1 className="text-center font-display font-bold text-xl">
          {mode === "login" ? "Sign in to ProteinGPT" : "Create your ProteinGPT account"}
        </h1>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {info && (
          <div className="text-xs text-accent bg-accent-muted border border-accent/30 rounded-lg px-3 py-2">
            {info}
          </div>
        )}

        <div className="space-y-2">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handle()}
            className="w-full bg-bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
          />
        </div>

        <button
          onClick={handle}
          disabled={loading}
          className="w-full bg-accent hover:bg-accent-soft disabled:opacity-50 text-bg-primary font-semibold text-sm py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <div className="text-center text-xs text-text-secondary">
          {mode === "login" ? "No account?" : "Already have one?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setInfo(null);
            }}
            className="text-accent hover:underline"
          >
            {mode === "login" ? "Sign up free" : "Sign in"}
          </button>
        </div>

        <div className="pt-2 border-t border-border">
          <button
            onClick={() => {
              sessionStorage.setItem("proteingpt-guest", "true");
              navigate({ to: "/", replace: true });
            }}
            className="w-full text-[11px] text-text-muted hover:text-accent transition-colors text-center"
          >
            Continue without account →
          </button>
        </div>
      </div>
    </div>
  );
}
