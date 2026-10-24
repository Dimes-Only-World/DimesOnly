import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, Car, Shirt } from "lucide-react";
import { SHORT_FORM_USERNAME_KEY } from "@/lib/joinFlow";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Dimes Only World — FlameFlix, Rentals & Clothing" },
      { name: "description", content: "While you wait, check out FlameFlix, Best Rental Cars and Dimes Clothing." },
      { property: "og:title", content: "Explore Dimes Only World" },
      { property: "og:description", content: "While you wait, check out FlameFlix, Best Rental Cars and Dimes Clothing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const [username, setUsername] = useState("");
  useEffect(() => {
    try {
      setUsername(sessionStorage.getItem(SHORT_FORM_USERNAME_KEY) || "");
    } catch { /* ignore */ }
  }, []);
  const q = username ? `?ref=${encodeURIComponent(username)}` : "";
  const cards = [
    { href: `/flix${q}`, title: "FlameFlix", body: "Premium streaming", Icon: Flame, cls: "from-orange-600 to-red-700" },
    { href: `/rentals${q}`, title: "Best Rental Cars", body: "Rent, lease or own", Icon: Car, cls: "from-red-700 to-zinc-900" },
    { href: `/clothes${q}`, title: "Dimes Clothing", body: "Premium apparel", Icon: Shirt, cls: "from-pink-600 to-purple-900" },
  ];
  return (
    <main className="min-h-screen bg-black text-white px-4 py-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight">
          While you wait, check out <span className="text-orange-500">what else we offer</span>
        </h1>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {cards.map(({ href, title, body, Icon, cls }) => (
            <a key={title} href={href} className={`rounded-2xl bg-gradient-to-br ${cls} border-2 border-yellow-500/60 p-8 flex flex-col items-center gap-3 hover:scale-[1.02] transition-transform`}>
              <Icon className="h-12 w-12 text-yellow-300" />
              <span className="text-2xl font-black">{title}</span>
              <span className="text-sm text-white/80">{body}</span>
            </a>
          ))}
        </div>
        <a href={`/register${q}`} className="mt-10 inline-block rounded-full bg-orange-500 hover:bg-orange-600 px-10 py-4 text-lg font-extrabold">
          Complete Registration Free
        </a>
      </div>
    </main>
  );
}
