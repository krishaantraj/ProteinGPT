import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { useThreads } from "@/hooks/useThreads";
import type { FilterState } from "@/types/product";
import proteinData from "@/data/shopmind_protein_kb.json";
import { UserContext } from "@/lib/user-context";
import { getMyAdminStatus, upsertAdminRoleIfNeeded } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/chat/$threadId")({
  head: ({ params }) => {
    const url = `https://proteingpt.lovable.app/chat/${params.threadId}`;
    return {
      meta: [
        { title: "Chat — ProteinGPT" },
        { name: "description", content: "Chat with ProteinGPT to find the perfect protein powder — compare whey, plant-based and casein by price, protein and certifications." },
        { property: "og:title", content: "Chat — ProteinGPT" },
        { property: "og:description", content: "Chat with ProteinGPT to find the perfect protein powder for your goals in India." },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "robots", content: "noindex" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ChatPage,
});

const DEFAULT_FILTERS: FilterState = {
  categories: [],
  minBudget: 0,
  maxBudget: 15000,
  minProtein: 0,
  goals: [],
  certifications: [],
  vegan: false,
  vegetarian: false,
  sortBy: "price_asc",
};

function ChatPage() {
  const { threadId } = useParams({ from: "/chat/$threadId" });
  const navigate = useNavigate();
  const { threads, createThread, deleteThread, renameThread, addMessage, getThread } = useThreads();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [platform, setPlatform] = useState("All");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const isGuest = sessionStorage.getItem("proteingpt-guest") === "true";

    const sync = async (email: string | null) => {
      setUserEmail(email);
      if (!email) {
        setIsAdmin(false);
        if (!isGuest) {
          setAuthChecked(true);
          navigate({ to: "/auth", replace: true });
          return;
        }
        setAuthChecked(true);
        return;
      }
      try {
        try { await upsertAdminRoleIfNeeded(); } catch { /* non-critical */ }
        const res = await getMyAdminStatus();
        setIsAdmin(!!res.isAdmin);
      } catch {
        setIsAdmin(false);
      }
      setAuthChecked(true);
    };
    supabase.auth.getSession().then(({ data }) => sync(data.session?.user?.email ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) =>
      sync(s?.user?.email ?? null),
    );
    return () => subscription.unsubscribe();
  }, [navigate]);


  const thread = useMemo(() => getThread(threadId), [getThread, threadId]);

  useEffect(() => {
    if (!thread) {
      const real = threads.find((t) => !t.id.startsWith("seed-"));
      if (real && real.id !== threadId) {
        navigate({ to: "/chat/$threadId", params: { threadId: real.id }, replace: true });
      } else {
        const t = createThread();
        navigate({ to: "/chat/$threadId", params: { threadId: t.id }, replace: true });
      }
    }
  }, [thread, threadId, threads, navigate, createThread]);

  const handleNewChat = () => {
    const t = createThread();
    navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
  };

  const handleDelete = (id: string) => {
    deleteThread(id);
    if (id === threadId) {
      const remaining = threads.filter((t) => t.id !== id);
      if (remaining.length > 0) {
        navigate({ to: "/chat/$threadId", params: { threadId: remaining[0].id }, replace: true });
      } else {
        navigate({ to: "/", replace: true });
      }
    }
  };

  if (!authChecked) return null;
  if (!thread) return null;

  return (
    <UserContext.Provider value={{ userEmail, isAdmin }}>
      <div className="h-screen bg-bg-primary text-text-primary flex flex-col overflow-hidden">
        <Navbar
          platform={platform}
          onPlatformChange={setPlatform}
          productCount={proteinData.products.length}
        />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar
            filters={filters}
            setFilters={setFilters}
            threads={threads}
            activeThreadId={threadId}
            onNewChat={handleNewChat}
            onDeleteThread={handleDelete}
            onRenameThread={renameThread}
            onClearPlatform={() => setPlatform("All")}
          />
          <ChatArea
            key={threadId}
            thread={thread}
            filters={filters}
            platform={platform}
            onAddMessage={addMessage}
          />
        </div>
      </div>
    </UserContext.Provider>
  );
}
