import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useThreads } from "@/hooks/useThreads";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProteinGPT — Your AI Assistant for Protein Powders in India" },
      { name: "description", content: "AI assistant comparing 124+ protein powders in India by price, protein, and certifications across Amazon, Flipkart, Nutrabay and more." },
      { property: "og:title", content: "ProteinGPT — Your AI Assistant for Protein Powders in India" },
      { property: "og:description", content: "Compare whey, plant-based and casein powders in India by price, protein and certifications — powered by AI." },
      { property: "og:url", content: "https://proteingpt.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://proteingpt.lovable.app/" },
    ],
  }),
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  const { threads, createThread } = useThreads();

  useEffect(() => {
    // Find newest non-seed thread, else create a new one
    const real = threads.find((t) => !t.id.startsWith("seed-"));
    if (real) {
      navigate({ to: "/chat/$threadId", params: { threadId: real.id }, replace: true });
    } else {
      const t = createThread();
      navigate({ to: "/chat/$threadId", params: { threadId: t.id }, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center font-display font-extrabold text-bg-primary text-xl pulse-glow">
        S
      </div>
    </div>
  );
}
