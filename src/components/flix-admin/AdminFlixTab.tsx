import React, { useCallback, useEffect, useState } from "react";
import { Flame, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCents } from "@/lib/flix";
import { getAdminUserId } from "@/lib/storeAdmin";

type FlixAdminAction = <T = any>(action: string, params?: Record<string, unknown>) => Promise<T>;

async function flixAdmin<T = any>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error("Admin session expired. Please sign in again.");
  const { data, error } = await supabase.functions.invoke("flix-admin", {
    body: { action, adminUserId, ...params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

const EMPTY_TITLE = {
  name: "",
  logline: "",
  description: "",
  genres: "",
  rating: "TV-MA",
  year: new Date().getFullYear(),
  duration_minutes: 60,
  cast_members: "",
  tags: "",
  poster_url: "",
  backdrop_url: "",
  poster_mobile_url: "",
  backdrop_mobile_url: "",
  trailer_url: "",
  video_url: "",
  featured: false,
  featured_order: 0,
  is_original: false,
  status: "draft",
};

type TitleForm = typeof EMPTY_TITLE & { id?: string };

const AdminFlixTab: React.FC = () => {
  const [view, setView] = useState<"overview" | "titles" | "subs" | "earnings" | "payouts">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [titles, setTitles] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [editing, setEditing] = useState<TitleForm | null>(null);
  const [saving, setSaving] = useState(false);

  const call: FlixAdminAction = flixAdmin;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (view === "overview") setOverview(await call("overview"));
      if (view === "titles") setTitles((await call("listTitles")).titles);
      if (view === "subs") setSubs((await call("listSubscriptions")).subscriptions);
      if (view === "earnings") setEarnings((await call("listEarnings")).earnings);
      if (view === "payouts") setPayouts((await call("listPayouts")).payouts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  const saveTitle = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      await call("saveTitle", {
        title: {
          ...editing,
          genres: editing.genres.split(",").map((g: string) => g.trim()).filter(Boolean),
          cast_members: editing.cast_members.split(",").map((c: string) => c.trim()).filter(Boolean),
          tags: editing.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
          year: Number(editing.year),
          duration_minutes: Number(editing.duration_minutes),
          featured_order: Number(editing.featured_order),
        },
      });
      setEditing(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const VIEWS = [
    { key: "overview", label: "Overview" },
    { key: "titles", label: "Titles" },
    { key: "subs", label: "Subscribers" },
    { key: "earnings", label: "Earnings" },
    { key: "payouts", label: "Payouts" },
  ] as const;

  return (
    <div className="text-white">
      <div className="flex items-center gap-3 mb-6">
        <Flame className="text-[#FF4D1A] fill-[#FFB020]" size={26} />
        <h2 className="text-2xl font-black">FlameFlix</h2>
        <div className="ml-auto flex gap-2 flex-wrap">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${view === v.key ? "bg-[#FF4D1A] text-white" : "bg-[#141416] text-[#A1A1A1] hover:text-white"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {loading && <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#FF4D1A]" size={32} /></div>}

      {!loading && view === "overview" && overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ["Active Subscribers", overview.subscribers],
            ["MRR", formatCents(overview.mrr_cents)],
            ["Earnings Paid Out Pool", formatCents(overview.earnings_total_cents)],
            ["Pending Payouts", overview.pending_payouts],
            ["Monthly Subs", overview.monthly],
            ["Annual Subs", overview.annual],
            ["Live Titles", overview.live_titles],
            ["Draft Titles", overview.draft_titles],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-[#141416] border border-[#2A2A2A] rounded-xl p-5">
              <p className="text-2xl font-black">{value}</p>
              <p className="text-[#A1A1A1] text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && view === "titles" && (
        <div>
          <button
            onClick={() => setEditing({ ...EMPTY_TITLE })}
            className="mb-4 flex items-center gap-2 bg-[#FF4D1A] hover:bg-[#ff5d30] text-white font-bold px-4 py-2 rounded-md"
          >
            <Plus size={16} /> Add Title
          </button>
          <div className="space-y-2">
            {titles.map((t) => (
              <div key={t.id} className="flex items-center gap-4 bg-[#141416] border border-[#2A2A2A] rounded-lg p-3">
                <img src={t.poster_url} alt="" className="w-10 h-14 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{t.name} {t.is_original && <span className="text-[#FFB020] text-xs">ORIGINAL</span>}</p>
                  <p className="text-[#A1A1A1] text-xs truncate">{(t.genres || []).join(" · ")} — {t.status}</p>
                </div>
                <select
                  value={t.status}
                  onChange={async (e) => {
                    await call("setTitleStatus", { title_id: t.id, status: e.target.value });
                    load();
                  }}
                  className="bg-[#0B0B0D] border border-[#2A2A2A] rounded px-2 py-1 text-sm"
                  aria-label={`Status for ${t.name}`}
                >
                  <option value="live">Live</option>
                  <option value="draft">Draft</option>
                </select>
                <button
                  onClick={() =>
                    setEditing({
                      ...t,
                      genres: (t.genres || []).join(", "),
                      cast_members: (t.cast_members || []).join(", "),
                      tags: (t.tags || []).join(", "),
                    })
                  }
                  className="p-2 text-[#A1A1A1] hover:text-white"
                  aria-label={`Edit ${t.name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete "${t.name}"?`)) return;
                    await call("deleteTitle", { title_id: t.id });
                    load();
                  }}
                  className="p-2 text-[#A1A1A1] hover:text-red-400"
                  aria-label={`Delete ${t.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && view === "subs" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#A1A1A1] border-b border-[#2A2A2A]">
                <th className="py-2 pr-4">User</th><th className="py-2 pr-4">Plan</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Referred By</th><th className="py-2">Since</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-b border-[#2A2A2A]/50">
                  <td className="py-2 pr-4 font-semibold">{s.username}</td>
                  <td className="py-2 pr-4 capitalize">{s.plan}</td>
                  <td className="py-2 pr-4">{formatCents(s.amount_cents)}</td>
                  <td className="py-2 pr-4">{s.status}{s.is_demo ? " (demo)" : ""}</td>
                  <td className="py-2 pr-4">{s.referral_code || "—"}</td>
                  <td className="py-2">{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!subs.length && <p className="text-[#A1A1A1] py-8 text-center">No subscriptions yet.</p>}
        </div>
      )}

      {!loading && view === "earnings" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#A1A1A1] border-b border-[#2A2A2A]">
                <th className="py-2 pr-4">Earner</th><th className="py-2 pr-4">Subscriber</th><th className="py-2 pr-4">Level</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4">Status</th><th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e) => (
                <tr key={e.id} className="border-b border-[#2A2A2A]/50">
                  <td className="py-2 pr-4 font-semibold">{e.earner}</td>
                  <td className="py-2 pr-4">{e.subscriber}</td>
                  <td className="py-2 pr-4">{e.level === 1 ? "Direct 10%" : "Override 5%"}</td>
                  <td className="py-2 pr-4">{formatCents(e.amount_cents)}</td>
                  <td className="py-2 pr-4">{e.status}</td>
                  <td className="py-2">{new Date(e.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!earnings.length && <p className="text-[#A1A1A1] py-8 text-center">No earnings yet.</p>}
        </div>
      )}

      {!loading && view === "payouts" && (
        <div className="space-y-2">
          {payouts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-4 bg-[#141416] border border-[#2A2A2A] rounded-lg p-4">
              <div className="flex-1">
                <p className="font-bold">{p.username} — {formatCents(p.amount_cents)}</p>
                <p className="text-[#A1A1A1] text-xs">{new Date(p.created_at).toLocaleString()}</p>
              </div>
              <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${p.status === "paid" ? "bg-green-500/20 text-green-400" : p.status === "declined" ? "bg-red-500/20 text-red-400" : "bg-[#FFB020]/20 text-[#FFB020]"}`}>
                {p.status}
              </span>
              {p.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={async () => { await call("updatePayout", { payout_id: p.id, status: "paid" }); load(); }}
                    className="bg-green-600 hover:bg-green-500 text-white text-sm font-bold px-4 py-1.5 rounded"
                  >
                    Mark Paid
                  </button>
                  <button
                    onClick={async () => { await call("updatePayout", { payout_id: p.id, status: "declined" }); load(); }}
                    className="bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-4 py-1.5 rounded"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))}
          {!payouts.length && <p className="text-[#A1A1A1] py-8 text-center">No payout requests yet.</p>}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Edit title">
          <div className="bg-[#141416] border border-[#2A2A2A] rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black mb-4">{editing.id ? "Edit Title" : "Add Title"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  ["name", "Name"], ["logline", "Logline"], ["genres", "Genres (comma separated)"],
                  ["cast_members", "Cast (comma separated)"], ["tags", "Tags (comma separated)"],
                  ["poster_url", "Poster URL — Portrait 2:3 · 600×900 px"],
                  ["backdrop_url", "Backdrop URL — Landscape 16:9 · 1920×1080 px"],
                  ["poster_mobile_url", "Poster Mobile URL — Portrait 2:3 · 400×600 px (optional)"],
                  ["backdrop_mobile_url", "Backdrop Mobile URL — Landscape 16:9 · 780×440 px (optional)"],
                  ["trailer_url", "Trailer URL (mp4)"], ["video_url", "Video URL (mp4)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm sm:col-span-2">
                  <span className="text-[#A1A1A1]">{label}</span>
                  <input
                    value={(editing as any)[key]}
                    onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                    className="mt-1 w-full bg-[#0B0B0D] border border-[#2A2A2A] rounded px-3 py-2 text-white"
                  />
                </label>
              ))}
              <label className="block text-sm">
                <span className="text-[#A1A1A1]">Description</span>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="mt-1 w-full bg-[#0B0B0D] border border-[#2A2A2A] rounded px-3 py-2 text-white"
                  rows={3}
                />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="block text-sm">
                  <span className="text-[#A1A1A1]">Year</span>
                  <input type="number" value={editing.year} onChange={(e) => setEditing({ ...editing, year: Number(e.target.value) })} className="mt-1 w-full bg-[#0B0B0D] border border-[#2A2A2A] rounded px-3 py-2 text-white" />
                </label>
                <label className="block text-sm">
                  <span className="text-[#A1A1A1]">Minutes</span>
                  <input type="number" value={editing.duration_minutes} onChange={(e) => setEditing({ ...editing, duration_minutes: Number(e.target.value) })} className="mt-1 w-full bg-[#0B0B0D] border border-[#2A2A2A] rounded px-3 py-2 text-white" />
                </label>
                <label className="block text-sm">
                  <span className="text-[#A1A1A1]">Rating</span>
                  <select value={editing.rating} onChange={(e) => setEditing({ ...editing, rating: e.target.value })} className="mt-1 w-full bg-[#0B0B0D] border border-[#2A2A2A] rounded px-3 py-2 text-white">
                    {["G", "PG", "PG-13", "R", "TV-14", "TV-MA"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </label>
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-6 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} /> Featured
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editing.is_original} onChange={(e) => setEditing({ ...editing, is_original: e.target.checked })} /> FlameFlix Original
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-[#A1A1A1]">Status</span>
                  <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="bg-[#0B0B0D] border border-[#2A2A2A] rounded px-2 py-1 text-white">
                    <option value="live">Live</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveTitle} disabled={saving || !editing.name} className="flex items-center gap-2 bg-[#FF4D1A] hover:bg-[#ff5d30] disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-md">
                {saving && <Loader2 size={16} className="animate-spin" />} Save
              </button>
              <button onClick={() => setEditing(null)} className="text-[#A1A1A1] hover:text-white font-semibold px-4">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFlixTab;
