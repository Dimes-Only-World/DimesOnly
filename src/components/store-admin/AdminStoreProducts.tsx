import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { storeAdmin, centsToInput, inputToCents } from "@/lib/storeAdmin";
import { money, StoreProduct, StoreVariant } from "@/lib/store";
import { Plus, Trash2, Archive, Pencil } from "lucide-react";

const emptyProduct = {
  id: "", name: "", slug: "", description: "", category: "women",
  price: "", compare_at: "", tags: "", featured: false, published: true, images: "",
};

const AdminStoreProducts: React.FC = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<typeof emptyProduct | null>(null);
  const [variantsFor, setVariantsFor] = useState<StoreProduct | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await storeAdmin<{ products: StoreProduct[] }>("listProducts");
      setProducts(res.products || []);
      const paths = (res.products || []).flatMap((p) => p.image_paths || []).filter((p) => !p.startsWith("/") && !p.startsWith("http"));
      if (paths.length) {
        const s = await storeAdmin<{ urls: Record<string, string> }>("signImages", { paths });
        setSigned(s.urls || {});
      }
    } catch (e) {
      toast({ title: "Could not load products", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const imgSrc = (p: StoreProduct) => {
    const path = p.image_paths?.[0];
    if (!path) return "";
    return path.startsWith("/") || path.startsWith("http") ? path : signed[path] || "";
  };

  const openNew = () => setEditing({ ...emptyProduct });
  const openEdit = (p: StoreProduct) => setEditing({
    id: p.id, name: p.name, slug: p.slug, description: p.description || "", category: p.category,
    price: centsToInput(p.price_cents), compare_at: centsToInput(p.compare_at_cents),
    tags: (p.tags || []).join(", "), featured: !!p.featured, published: p.published !== false,
    images: (p.image_paths || []).join(", "),
  });

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await storeAdmin("saveProduct", {
        product: {
          id: editing.id || undefined,
          name: editing.name,
          slug: editing.slug || editing.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          description: editing.description,
          category: editing.category,
          price_cents: inputToCents(editing.price),
          compare_at_cents: editing.compare_at ? inputToCents(editing.compare_at) : null,
          image_paths: editing.images.split(",").map((s) => s.trim()).filter(Boolean),
          tags: editing.tags.split(",").map((s) => s.trim()).filter(Boolean),
          featured: editing.featured,
          published: editing.published,
        },
      });
      toast({ title: "Product saved" });
      setEditing(null);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const archive = async (p: StoreProduct) => {
    try {
      await storeAdmin("archiveProduct", { product_id: p.id, archived: !p.archived });
      load();
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const uploadImage = async (file: File) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const path = `products/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "-")}`;
    await storeAdmin("uploadImage", { data: base64, path, content_type: file.type });
    setEditing((prev) => prev ? { ...prev, images: prev.images ? `${prev.images}, ${path}` : path } : prev);
    toast({ title: "Image uploaded" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Clothing Catalog</CardTitle>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />New product</Button>
      </CardHeader>
      <CardContent>
        {loading ? <p>Loading…</p> : (
          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-lg border p-3">
                {imgSrc(p) && <img src={imgSrc(p)} alt={p.name} loading="lazy" className="h-16 w-14 rounded object-cover" />}
                <div className="min-w-[180px] flex-1">
                  <p className="font-medium">{p.name}{p.archived && <span className="ml-2 text-xs text-red-600">archived</span>}</p>
                  <p className="text-sm text-gray-500">{p.category} · {money(p.price_cents)} · {(p.store_variants || []).reduce((a, v) => a + v.stock, 0)} in stock</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setVariantsFor(p)}>Variants ({p.store_variants?.length || 0})</Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => archive(p)}><Archive className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Input placeholder="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <Input placeholder="Slug (auto if blank)" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
              <Textarea placeholder="Description" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              <div className="grid grid-cols-3 gap-3">
                <select className="rounded-md border px-3 py-2" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                  {["women", "men", "accessories"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <Input placeholder="Price" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
                <Input placeholder="Compare at" value={editing.compare_at} onChange={(e) => setEditing({ ...editing, compare_at: e.target.value })} />
              </div>
              <Input placeholder="Tags (comma separated)" value={editing.tags} onChange={(e) => setEditing({ ...editing, tags: e.target.value })} />
              <Input placeholder="Image paths (comma separated)" value={editing.images} onChange={(e) => setEditing({ ...editing, images: e.target.value })} />
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              <div className="flex gap-6 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} /> Featured
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} /> Published
                </label>
              </div>
              <Button disabled={saving} onClick={save}>{saving ? "Saving…" : "Save product"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <VariantDialog product={variantsFor} onClose={() => { setVariantsFor(null); load(); }} />
    </Card>
  );
};

const VariantDialog: React.FC<{ product: StoreProduct | null; onClose: () => void }> = ({ product, onClose }) => {
  const { toast } = useToast();
  const [variants, setVariants] = useState<StoreVariant[]>([]);
  const [draft, setDraft] = useState({ size: "", color: "", stock: "0", sku: "" });
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => { setVariants(product?.store_variants || []); }, [product]);

  useEffect(() => {
    const paths = (product?.store_variants || [])
      .map((v) => v.image_path)
      .filter((p): p is string => !!p && !p.startsWith("/") && !p.startsWith("http"));
    if (!paths.length) { setSigned({}); return; }
    storeAdmin<{ urls: Record<string, string> }>("signImages", { paths })
      .then((r) => setSigned(r.urls || {}))
      .catch(() => setSigned({}));
  }, [product]);

  const colors = [...new Set(variants.map((v) => v.color))];
  const colorImage = (c: string) => variants.find((v) => v.color === c && v.image_path)?.image_path || "";
  const preview = (p: string) => (p.startsWith("/") || p.startsWith("http") ? p : signed[p] || "");

  const uploadColorImage = async (c: string, file: File) => {
    if (!product) return;
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const path = `variants/${product.slug}-${c.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.jpg`;
      await storeAdmin("uploadImage", { data: base64, path, content_type: file.type });
      await storeAdmin("setColorImage", { product_id: product.id, color: c, image_path: path });
      setVariants((prev) => prev.map((v) => v.color === c ? { ...v, image_path: path } : v));
      const s = await storeAdmin<{ urls: Record<string, string> }>("signImages", { paths: [path] });
      setSigned((prev) => ({ ...prev, ...(s.urls || {}) }));
      toast({ title: `${c} photo saved` });
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const clearColorImage = async (c: string) => {
    if (!product) return;
    await storeAdmin("setColorImage", { product_id: product.id, color: c, image_path: null });
    setVariants((prev) => prev.map((v) => v.color === c ? { ...v, image_path: null } : v));
  };

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); } catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };

  const adjust = (v: StoreVariant, delta: number) => run(async () => {
    const res = await storeAdmin<{ stock: number }>("adjustStock", { variant_id: v.id, delta, reason: "manual adjustment" });
    setVariants((prev) => prev.map((x) => x.id === v.id ? { ...x, stock: res.stock } : x));
  });

  const addVariant = () => run(async () => {
    if (!product) return;
    await storeAdmin("saveVariant", { variant: { product_id: product.id, size: draft.size, color: draft.color, stock: Number(draft.stock) || 0, sku: draft.sku } });
    toast({ title: "Variant added" });
    setDraft({ size: "", color: "", stock: "0", sku: "" });
    onClose();
  });

  const removeVariant = (v: StoreVariant) => run(async () => {
    await storeAdmin("deleteVariant", { variant_id: v.id });
    setVariants((prev) => prev.filter((x) => x.id !== v.id));
  });

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>{product?.name} — sizes & stock</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {variants.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded border p-2 text-sm">
              <span className="w-28">{v.size} · {v.color}</span>
              <Button size="sm" variant="outline" onClick={() => adjust(v, -1)}>-</Button>
              <span className="w-10 text-center">{v.stock}</span>
              <Button size="sm" variant="outline" onClick={() => adjust(v, 1)}>+</Button>
              <Button size="sm" variant="outline" onClick={() => adjust(v, 10)}>+10</Button>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => removeVariant(v)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          <Input placeholder="Size" value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })} />
          <Input placeholder="Color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
          <Input placeholder="Stock" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
          <Button onClick={addVariant}>Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminStoreProducts;
