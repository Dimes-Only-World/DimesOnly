import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Share2, Facebook, Instagram, Phone, Copy, Send } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import ReferralCard from "./ReferralCard";
import ReferralFilters from "./ReferralFilters";

interface User {
  id: string;
  username: string;
  city?: string;
  state?: string;
  created_at: string;
  profile_photo?: string;
  banner_photo?: string;
  front_page_photo?: string;
}

const UserMakeMoneyTab: React.FC = () => {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<User[]>([]);
  const [filteredReferrals, setFilteredReferrals] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [usernameFilter, setUsernameFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [actualUsername, setActualUsername] = useState<string>("");
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const itemsPerPage = 100;

  const referralUsername = actualUsername;

  // 💬 Share message
  const shareMessage = useMemo(
    () =>
      `Everyone who joins before the app is released will be compensated up to $10,000 to $22,500 a month or more for life just for joining early. There is more money than that to be made on your own. This will be historic.

Strippers and Exotic Females Must Be Approved
Load up your sexiest 3 videos and pics to get approved. If you get approved, you will get an email. I will text you on the platform from now on until the app is released.
Set up your account and see if you get approved. 
Add Nude content = $74,000 a year
Add x-rated content = $114,000 a year
Refer Dimes & People = Overrides $$$$ for Life

Males and normal females are approved automatically.
Refer Dimes & People = Overrides $$$$ For Life

This is only a peek at the money you can make.
Any questions? If not, click the link now before positions are gone.
https://www.DimesOnly.World/?ref=${referralUsername}`,
    [referralUsername]
  );

  const shareLink = useMemo(
    () => `https://www.DimesOnly.World/?ref=${referralUsername}`,
    [referralUsername]
  );

  // ✅ Fetch actual username
  const fetchActualUserData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (data?.username && data.username !== actualUsername)
        setActualUsername(String(data.username));
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, [user?.id, actualUsername]);

  // ✅ Fetch referrals
  const fetchReferrals = useCallback(async () => {
    if (!referralUsername) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, username, city, state, created_at, profile_photo, banner_photo, front_page_photo"
        )
        .eq("referred_by", referralUsername)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReferrals((data as User[]) || []);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      toast({
        title: "Error",
        description: "Failed to load referrals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [referralUsername, toast]);

  // ✅ Filter referrals
  const filterReferrals = useCallback(() => {
    let filtered = referrals;
    if (usernameFilter)
      filtered = filtered.filter((r) =>
        r.username.toLowerCase().includes(usernameFilter.toLowerCase())
      );
    if (cityFilter)
      filtered = filtered.filter((r) =>
        r.city?.toLowerCase().includes(cityFilter.toLowerCase())
      );
    if (stateFilter)
      filtered = filtered.filter((r) =>
        r.state?.toLowerCase().includes(stateFilter.toLowerCase())
      );
    setFilteredReferrals(filtered);
    setCurrentPage(1);
  }, [referrals, usernameFilter, cityFilter, stateFilter]);

  // Fetch and filter logic
  useEffect(() => {
    if (user?.id) fetchActualUserData();
  }, [user?.id, fetchActualUserData]);

  useEffect(() => {
    if (referralUsername) fetchReferrals();
  }, [referralUsername, fetchReferrals]);

  useEffect(() => {
    filterReferrals();
  }, [filterReferrals]);

  // ✅ Share handlers
  const handleCopyMessage = useCallback(() => {
    navigator.clipboard.writeText(shareMessage);
    toast({ title: "Message copied to clipboard!" });
  }, [shareMessage, toast]);

  const handleFacebookShare = useCallback(() => {
    navigator.clipboard.writeText(shareMessage);
    window.open("https://facebook.com", "_blank");
    toast({ title: "Copied! Paste it on Facebook." });
  }, [shareMessage, toast]);

  const handleInstagramShare = useCallback(() => {
    navigator.clipboard.writeText(shareMessage);
    window.open("https://instagram.com", "_blank");
    toast({ title: "Copied! Paste it on Instagram." });
  }, [shareMessage, toast]);

  const handleContactsShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: "Check out DimesOnly",
        text: shareMessage,
      });
    } else {
      navigator.clipboard.writeText(shareMessage);
      toast({ title: "Message copied to share with contacts!" });
    }
  }, [shareMessage, toast]);

  // ✅ Pagination
  const paginatedReferrals = useMemo(
    () =>
      filteredReferrals.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [filteredReferrals, currentPage, itemsPerPage]
  );
  const totalPages = Math.ceil(filteredReferrals.length / itemsPerPage);

  if (!user)
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">
            Please log in to view earning opportunities.
          </p>
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
        <h3 className="text-xl font-bold mb-2">The message below you will share to get your followers until the app is released.</h3>
        <h3 className="text-xl font-bold mb-2">ALL THE LINKS WILL MAXIMIZE YOUR FOLLOWERS.</h3>
        <h3 className="text-xl font-bold mb-2">Click Copy - Instagram - Facebook - Contacts below message to share</h3>
        <p className="text-gray-700 whitespace-pre-line mb-4">{shareMessage}</p>

        <a
          href="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Commercial+for+Dimes+Final+(1).mp4"
          download="CommercialForDimes.mp4"
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
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded border">
              <p className="text-sm font-mono break-all">{shareLink}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-8 gap-2">
              <Button onClick={handleCopyMessage} variant="outline">
                <Copy className="w-4 h-4 mr-2" /> Copy
              </Button>
              <Button
                onClick={handleFacebookShare}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Facebook className="w-4 h-4 mr-2" /> Facebook
              </Button>
              <Button
                onClick={handleInstagramShare}
                className="bg-pink-600 hover:bg-pink-700 text-white"
              >
                <Instagram className="w-4 h-4 mr-2" /> Instagram
              </Button>
              <Button onClick={handleContactsShare} variant="outline">
                <Phone className="w-4 h-4 mr-2" /> Contacts
              </Button>
              {/* WhatsApp */}
  <Button
    as="a"
    href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
    target="_blank"
    className="bg-green-500 hover:bg-green-600 text-white"
  >
    WhatsApp
  </Button>

  {/* Telegram */}
  <Button
    as="a"
    href={`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareMessage)}`}
    target="_blank"
    className="bg-blue-400 hover:bg-blue-500 text-white"
  >
    Telegram
  </Button>

  {/* X (Twitter) */}
  <Button
    as="a"
    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`}
    target="_blank"
    className="bg-sky-600 hover:bg-sky-700 text-white"
  >
    X
  </Button>

  {/* Email */}
  <Button
    as="a"
    href={`mailto:?subject=Check this out&body=${encodeURIComponent(shareMessage)}`}
    target="_blank"
    className="bg-red-500 hover:bg-red-600 text-white"
  >
    Email
  </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Section */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold">
              Your Referrals ({filteredReferrals.length})
            </h2>
            {actualUsername && (
              <p className="text-sm text-gray-600">
                Checking referrals for: {actualUsername}
              </p>
            )}
          </div>
          <Button onClick={fetchReferrals} variant="outline" disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>

        <ReferralFilters
          usernameFilter={usernameFilter}
          cityFilter={cityFilter}
          stateFilter={stateFilter}
          onUsernameChange={setUsernameFilter}
          onCityChange={setCityFilter}
          onStateChange={setStateFilter}
        />
      </div>

      {/* Referral List */}
      {loading ? (
        <div className="text-center py-8">Loading referrals...</div>
      ) : filteredReferrals.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-600 mb-4">
            NO REFERRALS YET?
          </h2>
          <p className="text-gray-500">
            Share your link to get your first referral!
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {paginatedReferrals.map((referral) => (
              <ReferralCard key={referral.id} user={referral} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserMakeMoneyTab;
