import { Link, useNavigate } from "@tanstack/react-router";
import { LogIn, LogOut, Package, Moon, Sun, Monitor } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeContext, type ThemeMode } from "@/lib/theme-context";

const PLATFORMS = [
  { name: "All", color: "#FF6B35" },
  { name: "Amazon", color: "#FF9900" },
  { name: "Flipkart", color: "#2874F0" },
  { name: "Nutrabay", color: "#00B5AD" },
  { name: "HealthKart", color: "#E31E25" },
  { name: "MuscleBlaze", color: "#FF6B35" },
  { name: "BeastLife", color: "#1A1A2E" },
];

interface Props {
  platform: string;
  onPlatformChange: (p: string) => void;
  productCount: number;
}

export function Navbar({ platform, onPlatformChange, productCount }: Props) {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { theme, setTheme } = useContext(ThemeContext);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const themeIcons = { dark: Moon, light: Sun, system: Monitor };
  const ThemeIcon = themeIcons[theme];
  const nextTheme: Record<ThemeMode, ThemeMode> = { dark: "light", light: "system", system: "dark" };
  const themeLabel: Record<ThemeMode, string> = { dark: "Dark", light: "Light", system: "System" };

  return (
    <header className="sticky top-0 z-30 h-12 w-full border-b border-border bg-bg-primary/95 backdrop-blur flex items-center px-3 gap-4">
      <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="ProteinGPT home">
        <span className="sr-only">ProteinGPT Home</span>
        {/* ProteinGPT Logo — protein helix + lightning bolt */}
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" aria-hidden="true" focusable="false">
          <rect width="32" height="32" rx="7" fill="#FF6B35" />
          <path d="M10 7v18M10 7h6.5a4.5 4.5 0 0 1 0 9H10" stroke="#0F1624" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M20 13l-3.5 5h3l-1.5 5 4-6h-3l1-4z" fill="#FFE8DC" stroke="#0F1624" strokeWidth="0.8" strokeLinejoin="round" />
        </svg>
        <span className="font-display font-bold text-[17px] text-text-primary">ProteinGPT</span>
      </Link>

      <div className="hidden md:flex items-center gap-1 mx-auto bg-bg-secondary border border-border rounded-full p-1">
        {PLATFORMS.map((p) => {
          const active = p.name === platform;
          return (
            <button
              key={p.name}
              onClick={() => onPlatformChange(p.name)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all focus-orange ${
                active
                  ? "bg-accent text-bg-primary"
                  : "text-text-secondary hover:text-text-primary hover:-translate-y-px"
              }`}
            >
              {p.name !== "All" && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
              )}
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
        <button
          onClick={() => setTheme(nextTheme[theme])}
          title={`Theme: ${themeLabel[theme]} (click to change)`}
          aria-label={`Switch theme (current: ${themeLabel[theme]})`}
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors focus-orange rounded-md px-2 py-1"
        >
          <ThemeIcon className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">{themeLabel[theme]}</span>
        </button>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted">
          <Package className="w-3.5 h-3.5" />
          {productCount} products
        </div>
        {userEmail ? (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-text-secondary truncate max-w-[100px]">
              {userEmail.split("@")[0]}
            </span>
            <button
              onClick={signOut}
              title="Sign out"
              className="w-8 h-8 rounded-full bg-bg-input border border-border flex items-center justify-center text-text-muted hover:text-accent transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate({ to: "/auth" })}
            title="Sign in"
            className="w-8 h-8 rounded-full bg-bg-input border border-border flex items-center justify-center text-text-muted hover:text-accent transition-colors"
            aria-label="Sign in"
          >
            <LogIn className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
