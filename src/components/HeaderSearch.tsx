import React, { useEffect, useRef, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Search, X, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { siteSearch, type SiteSearchResult } from "@/lib/siteSearch.functions";

type UserHit = { id: string; username: string; profile_photo?: string | null };

const iconBtn =
  "relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-slate-900/90 text-amber-300 shadow-lg shadow-black/40 transition-colors hover:border-amber-300 hover:text-amber-200 active:scale-95";

/** Search icon: "@name" finds members instantly; anything else gets an AI answer with links. */
const HeaderSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserHit[]>([]);
  const [ai, setAi] = useState<SiteSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const isUser = q.trim().startsWith("@");
  useEffect(() => {
    if (!isUser) { setUsers([]); return; }
    const name = q.trim().slice(1);
    if (!name) { setUsers([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("public_user_profiles")
        .select("id, username, profile_photo").ilike("username", `%${name}%`).limit(10);
      setUsers((data as any) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, isUser]);

  const runAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUser || !q.trim()) return;
    setLoading(true); setError(""); setAi(null);
    try {
      const words = q.replace(/[^a-z0-9_ ]/gi, " ").split(/\s+/).filter((w) => w.length >= 3).slice(0, 3);
      let usernames: string[] = [];
      if (words.length) {
        const { data } = await supabase.from("public_user_profiles").select("username")
          .or(words.map((w) => `username.ilike.%${w}%`).join(",")).limit(5);
        usernames = ((data as any[]) || []).map((u) => u.username).filter(Boolean);
      }
      const r = await siteSearch({ data: { query: q.trim(), usernames } });
      if (r.error) setError(r.error); else setAi(r);
    } catch {
      setError("Search is unavailable right now.");
    } finally {
      setLoading(false);
    }
  };

  const close = () => { setOpen(false); setQ(""); setAi(null); setUsers([]); setError(""); };

  return (
    <>
      <button type="button" aria-label="Search" className={iconBtn} onClick={() => setOpen(true)}>
        <Search className="h-6 w-6" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/70 p-3 pt-16" onClick={close}>
          <div className="w-full max-w-xl rounded-2xl border border-amber-400/30 bg-slate-900 text-slate-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={runAi} className="flex items-center gap-2 border-b border-amber-400/20 p-3">
              <Search className="h-5 w-5 shrink-0 text-amber-300" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setAi(null); setError(""); }}
                placeholder="Search anything, or @username"
                enterKeyHint="search"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-500"
              />
              <button type="button" aria-label="Close" onClick={close} className="rounded-md p-1.5 text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </form>
            <div className="max-h-[65vh] overflow-y-auto p-3 text-sm">
              {isUser ? (
                users.length ? users.map((u) => (
                  <Link key={u.id} to={`/profile/${encodeURIComponent(u.username)}`} onClick={close}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/5">
                    {u.profile_photo
                      ? <img src={u.profile_photo} alt="" className="h-10 w-10 rounded-full object-cover" />
                      : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/20 font-bold text-amber-300">{u.username[0]?.toUpperCase()}</span>}
                    <span className="font-medium">@{u.username}</span>
                  </Link>
                )) : <p className="p-2 text-slate-400">{q.trim().length > 1 ? "No members found." : "Type a username after @"}</p>
              ) : loading ? (
                <p className="flex items-center gap-2 p-2 text-slate-300"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</p>
              ) : error ? (
                <p className="p-2 text-red-400">{error}</p>
              ) : ai ? (
                <div className="space-y-3 p-1">
                  <p className="flex gap-2 leading-relaxed"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{ai.answer}</p>
                  {ai.links.map((l) => (
                    <Link key={l.path} to={l.path} onClick={close}
                      className="flex items-center justify-between rounded-lg border border-amber-400/20 px-3 py-2 text-amber-200 hover:bg-amber-400/10">
                      {l.label} <ArrowRight className="h-4 w-4" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="p-2 text-slate-400">Press Enter to ask — e.g. "how do I get paid" or "rent a car". Use @ to find members.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/** Two overlapping chat bubbles, like YouTube's messages icon. */
export const MessagesIconLink: React.FC = () => (
  <Link to="/dashboard/messages" aria-label="Messages" className={iconBtn}>
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <path d="M3 4h12v9H8l-3 3v-3H3z" />
      <path d="M15 8h6v9h-2v3l-3-3h-5v-4" />
    </svg>
  </Link>
);

export default HeaderSearch;
