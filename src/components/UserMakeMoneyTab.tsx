import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Facebook, Instagram, MessageSquare, Copy } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const UserMakeMoneyTab: React.FC = () => {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [actualUsername, setActualUsername] = useState<string>("");

  const referralUsername = actualUsername;

  const shareLink = useMemo(
    () => `https://www.DimesOnly.World/?ref=${encodeURIComponent(referralUsername || "")}`,
    [referralUsername],
  );

  const shareMessage = useMemo(() => {
    const base =
      "Men and Sexy Ladies Needed Now!\n\n" +
      "https://dimesonlyworld.s3.us-east-2.amazonaws.com/Exs+Commercial.webm\n" +
      "Watch Video Above:\nIf you are interested, click my link below and sign up now!\nSpots are limited!\nMales needed to:\n";
    return `${base}${shareLink}`;
  }, [shareLink]);

  const fetchActualUserData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from("users").select("username").eq("id", user.id).single();
      if (error) throw error;
      if (data?.username) setActualUsername(String(data.username));
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) fetchActualUserData();
  }, [user?.id, fetchActualUserData]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#referral-link") {
      const t = setTimeout(() => {
        document.getElementById("referral-link-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(t);
    }
  }, []);

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          toast({ title: "Message copied to clipboard!" });
          return true;
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          const successful = document.execCommand("copy");
          document.body.removeChild(ta);
          if (successful) {
            toast({ title: "Message copied to clipboard!" });
            return true;
          }
          throw new Error("Fallback copy failed");
        }
      } catch (err) {
        console.warn("Copy failed:", err);
        toast({ title: "Could not copy to clipboard", description: "Please copy manually." });
        return false;
      }
    },
    [toast],
  );

  const handleWhatsAppShare = useCallback(async () => {
    await copyToClipboard(shareMessage);
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, "_blank");
  }, [shareMessage, copyToClipboard]);

  const handleTelegramShare = useCallback(async () => {
    await copyToClipboard(shareMessage);
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareMessage)}`,
      "_blank",
    );
  }, [shareMessage, shareLink, copyToClipboard]);

  const handleXShare = useCallback(async () => {
    await copyToClipboard(shareMessage);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`, "_blank");
  }, [shareMessage, copyToClipboard]);

  const handleEmailShare = useCallback(async () => {
    await copyToClipboard(shareMessage);
    window.open(
      `mailto:?subject=${encodeURIComponent("Check this out")}&body=${encodeURIComponent(shareMessage)}`,
      "_blank",
    );
  }, [shareMessage, copyToClipboard]);

  const handleCopyMessage = useCallback(async () => {
    await copyToClipboard(shareMessage);
  }, [shareMessage, copyToClipboard]);

  const handleFacebookShare = useCallback(async () => {
    await copyToClipboard(shareMessage);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`, "_blank");
  }, [shareMessage, shareLink, copyToClipboard]);

  const handleInstagramShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out DimesOnly",
          text: shareMessage,
          url: shareLink,
        });
      } catch (err) {
        await copyToClipboard(shareMessage);
        window.open("https://www.instagram.com", "_blank");
      }
    } else {
      await copyToClipboard(shareMessage);
      window.open("https://www.instagram.com", "_blank");
    }
  }, [shareMessage, shareLink, copyToClipboard]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out DimesOnly",
          text: shareMessage,
          url: shareLink,
        });
      } catch (err) {
        await copyToClipboard(shareMessage);
      }
    } else {
      await copyToClipboard(shareMessage);
    }
  }, [shareMessage, shareLink, copyToClipboard]);

  const handleSmsShare = useCallback(() => {
    const smsUrl = `sms:?body=${encodeURIComponent(shareMessage)}`;
    window.location.href = smsUrl;
  }, [shareMessage]);

  if (!user)
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">Please log in to view earning opportunities.</p>
        </CardContent>
      </Card>
    );

  return (
    <div className="w-full max-w-none px-0 md:px-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-purple-600 mb-2">
          SHARE YOUR LINK AND GET YOUR FIRST REFERRAL NOW!
        </h2>
      </div>

      {/* Download + Share Section */}
      <div className="flex flex-col items-center p-4 text-center mb-8">
        <h3 className="text-xl font-bold mb-2">
          The message below you will share to get your followers until the app is released.
        </h3>
        <h3 className="text-xl font-bold mb-2">ALL THE LINKS WILL MAXIMIZE YOUR FOLLOWERS.</h3>
        <h3 className="text-xl font-bold mb-2">Click Copy - Instagram - Facebook - Contacts below message to share</h3>
        <p className="text-gray-700 whitespace-pre-line mb-4">{shareMessage}</p>

        <a
          href="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Exs+Commercial.webm"
          download="Exs+Commercial.webm"
          className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition mb-3"
        >
          📥 Download Promo Video To Send
        </a>

        <a
          href={shareLink}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
        >
          Click for Your Referral Link
        </a>
      </div>

      {/* Share Buttons */}
      <Card className="mb-8" id="referral-link-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded border flex items-center justify-between gap-2">
              <p className="text-sm font-mono break-all flex-1">{shareLink}</p>
              <Button onClick={handleCopyMessage} variant="ghost" size="sm" className="shrink-0">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button onClick={handleNativeShare} variant="outline">
                <Share2 className="w-4 h-4 mr-2" /> Share
              </Button>
              <Button onClick={handleFacebookShare} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Facebook className="w-4 h-4 mr-2" /> Facebook
              </Button>
              <Button onClick={handleInstagramShare} className="bg-pink-600 hover:bg-pink-700 text-white">
                <Instagram className="w-4 h-4 mr-2" /> Instagram
              </Button>
              <Button onClick={handleSmsShare} variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" /> Contacts
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button onClick={handleWhatsAppShare} className="bg-green-500 hover:bg-green-600 text-white">
                WhatsApp
              </Button>
              <Button onClick={handleTelegramShare} className="bg-blue-400 hover:bg-blue-500 text-white">
                Telegram
              </Button>
              <Button onClick={handleXShare} className="bg-sky-600 hover:bg-sky-700 text-white">
                X
              </Button>
              <Button onClick={handleEmailShare} className="bg-red-500 hover:bg-red-600 text-white">
                Email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserMakeMoneyTab;
