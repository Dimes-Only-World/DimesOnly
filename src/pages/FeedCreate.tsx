import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Image as ImageIcon, Video, X, ArrowLeft } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

type PostType = "photo" | "reel";

export default function FeedCreate() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [postType, setPostType] = useState<PostType>("photo");
  const [visibility, setVisibility] = useState<"public" | "money_circle">("public");
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPick = () => fileInputRef.current?.click();

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (postType === "reel") {
      const v = list[0];
      if (!v) return;
      if (!v.type.startsWith("video/")) {
        toast({ title: "Please pick a video file", variant: "destructive" });
        return;
      }
      // duration check
      const el = document.createElement("video");
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        if (el.duration > 61) {
          toast({ title: "Reels must be 60 seconds or less", variant: "destructive" });
        } else {
          setFiles([v]);
        }
      };
      el.src = URL.createObjectURL(v);
    } else {
      const photos = list.filter((f) => f.type.startsWith("image/")).slice(0, 10);
      setFiles(photos);
    }
  };

  const removeFile = (i: number) => setFiles((f) => f.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!user?.id) return;
    if (files.length === 0) {
      toast({ title: "Add at least one photo or video", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: post, error: postErr } = await supabase
        .from("feed_posts")
        .insert({
          user_id: user.id,
          post_type: postType,
          caption: caption.trim() || null,
          visibility,
        })
        .select()
        .single();
      if (postErr) throw postErr;

      const bucket = postType === "reel" ? "feed-videos" : "feed-photos";
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() || (postType === "reel" ? "mp4" : "jpg");
        const path = `${user.id}/${post.id}/${i}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
        if (upErr) throw upErr;
        await supabase.from("feed_post_media").insert({
          post_id: post.id,
          media_type: postType === "reel" ? "video" : "photo",
          storage_bucket: bucket,
          storage_path: path,
          display_order: i,
        });
      }

      toast({ title: "Posted!" });
      navigate("/feed");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to post", description: e?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Create</h1>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <RadioGroup
            value={postType}
            onValueChange={(v) => {
              setPostType(v as PostType);
              setFiles([]);
            }}
            className="grid grid-cols-2 gap-3"
          >
            <label
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                postType === "photo" ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              <RadioGroupItem value="photo" className="sr-only" />
              <ImageIcon className="w-5 h-5" /> <span className="font-semibold">Photo Post</span>
            </label>
            <label
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                postType === "reel" ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              <RadioGroupItem value="reel" className="sr-only" />
              <Video className="w-5 h-5" /> <span className="font-semibold">Short Reel</span>
            </label>
          </RadioGroup>

          <div
            onClick={onPick}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={postType === "reel" ? "video/*" : "image/*"}
              multiple={postType === "photo"}
              className="hidden"
              onChange={onFiles}
            />
            {files.length === 0 ? (
              <p className="text-muted-foreground">
                Tap to select {postType === "reel" ? "a video (max 60s)" : "photos"}
              </p>
            ) : (
              <p className="text-foreground font-semibold">
                {files.length} file{files.length > 1 ? "s" : ""} selected — tap to replace
              </p>
            )}
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative aspect-square bg-muted rounded overflow-hidden">
                  {f.type.startsWith("video/") ? (
                    import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Image as ImageIcon, Video, X, ArrowLeft } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

type PostType = "photo" | "reel";

export default function FeedCreate() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [postType, setPostType] = useState<PostType>("photo");
  const [visibility, setVisibility] = useState<"public" | "money_circle">("public");
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPick = () => fileInputRef.current?.click();

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (postType === "reel") {
      const v = list[0];
      if (!v) return;
      if (!v.type.startsWith("video/")) {
        toast({ title: "Please pick a video file", variant: "destructive" });
        return;
      }
      // duration check
      const el = document.createElement("video");
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        if (el.duration > 61) {
          toast({ title: "Reels must be 60 seconds or less", variant: "destructive" });
        } else {
          setFiles([v]);
        }
      };
      el.src = URL.createObjectURL(v);
    } else {
      const photos = list.filter((f) => f.type.startsWith("image/")).slice(0, 10);
      setFiles(photos);
    }
  };

  const removeFile = (i: number) => setFiles((f) => f.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!user?.id) return;
    if (files.length === 0) {
      toast({ title: "Add at least one photo or video", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: post, error: postErr } = await supabase
        .from("feed_posts")
        .insert({
          user_id: user.id,
          post_type: postType,
          caption: caption.trim() || null,
          visibility,
        })
        .select()
        .single();
      if (postErr) throw postErr;

      const bucket = postType === "reel" ? "feed-videos" : "feed-photos";
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() || (postType === "reel" ? "mp4" : "jpg");
        const path = `${user.id}/${post.id}/${i}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
        if (upErr) throw upErr;
        await supabase.from("feed_post_media").insert({
          post_id: post.id,
          media_type: postType === "reel" ? "video" : "photo",
          storage_bucket: bucket,
          storage_path: path,
          display_order: i,
        });
      }

      toast({ title: "Posted!" });
      navigate("/feed");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to post", description: e?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Create</h1>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <RadioGroup
            value={postType}
            onValueChange={(v) => {
              setPostType(v as PostType);
              setFiles([]);
            }}
            className="grid grid-cols-2 gap-3"
          >
            <label
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                postType === "photo" ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              <RadioGroupItem value="photo" className="sr-only" />
              <ImageIcon className="w-5 h-5" /> <span className="font-semibold">Photo Post</span>
            </label>
            <label
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                postType === "reel" ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              <RadioGroupItem value="reel" className="sr-only" />
              <Video className="w-5 h-5" /> <span className="font-semibold">Short Reel</span>
            </label>
          </RadioGroup>

          <div
            onClick={onPick}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={postType === "reel" ? "video/*" : "image/*"}
              multiple={postType === "photo"}
              className="hidden"
              onChange={onFiles}
            />
            {files.length === 0 ? (
              <p className="text-muted-foreground">
                Tap to select {postType === "reel" ? "a video (max 60s)" : "photos"}
              </p>
            ) : (
              <p className="text-foreground font-semibold">
                {files.length} file{files.length > 1 ? "s" : ""} selected — tap to replace
              </p>
            )}
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative aspect-square bg-muted rounded overflow-hidden">
                  {f.type.startsWith("video/") ? (
                    <video src={URL.createObjectURL(f)} className="w-full h-full object-cover" / controlsList="nodownload" disablePictureInPicture disableRemotePlayback>
                  ) : (
                    <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="absolute top-1 right-1 bg-black/70 rounded-full p-1"
                    aria-label="Remove"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Say something…"
              rows={4}
              maxLength={2000}
            />
          </div>

          <div>
            <Label>Visibility</Label>
            <RadioGroup
              value={visibility}
              onValueChange={(v) => setVisibility(v as any)}
              className="grid grid-cols-2 gap-3 mt-2"
            >
              <label
                className={`p-3 rounded-lg border-2 cursor-pointer text-center ${
                  visibility === "public" ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <RadioGroupItem value="public" className="sr-only" />
                <div className="font-semibold">Public</div>
                <div className="text-xs text-muted-foreground">Everyone can see</div>
              </label>
              <label
                className={`p-3 rounded-lg border-2 cursor-pointer text-center ${
                  visibility === "money_circle" ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <RadioGroupItem value="money_circle" className="sr-only" />
                <div className="font-semibold">Money Circle Only</div>
                <div className="text-xs text-muted-foreground">Referral network only</div>
              </label>
            </RadioGroup>
          </div>

          <Button
            onClick={submit}
            disabled={submitting || files.length === 0}
            className="w-full bg-gradient-to-r from-primary to-pink-600 h-12 text-base"
          >
            {submitting ? "Posting…" : "Share Post"}
          </Button>
        </div>
      </div>
    </AuthGuard>
  );
}

                  ) : (
                    <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="absolute top-1 right-1 bg-black/70 rounded-full p-1"
                    aria-label="Remove"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Say something…"
              rows={4}
              maxLength={2000}
            />
          </div>

          <div>
            <Label>Visibility</Label>
            <RadioGroup
              value={visibility}
              onValueChange={(v) => setVisibility(v as any)}
              className="grid grid-cols-2 gap-3 mt-2"
            >
              <label
                className={`p-3 rounded-lg border-2 cursor-pointer text-center ${
                  visibility === "public" ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <RadioGroupItem value="public" className="sr-only" />
                <div className="font-semibold">Public</div>
                <div className="text-xs text-muted-foreground">Everyone can see</div>
              </label>
              <label
                className={`p-3 rounded-lg border-2 cursor-pointer text-center ${
                  visibility === "money_circle" ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <RadioGroupItem value="money_circle" className="sr-only" />
                <div className="font-semibold">Money Circle Only</div>
                <div className="text-xs text-muted-foreground">Referral network only</div>
              </label>
            </RadioGroup>
          </div>

          <Button
            onClick={submit}
            disabled={submitting || files.length === 0}
            className="w-full bg-gradient-to-r from-primary to-pink-600 h-12 text-base"
          >
            {submitting ? "Posting…" : "Share Post"}
          </Button>
        </div>
      </div>
    </AuthGuard>
  );
}
