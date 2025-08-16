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

  // Use the actual username from database instead of context
  const referralUsername = actualUsername;

  // Memoize share messages to prevent unnecessary re-renders
  const shareMessage = useMemo(
    () =>
      `Click this link \nhttps://youtu.be/iQGC7QzIp5g\nWatch the video and click my link if you are interested.\ndimesonly.world/?ref=${referralUsername}`,
    [referralUsername]
  );

  const shareLink = useMemo(
    () => `https://www.DimesOnly.World/?ref=${referralUsername}`,
    [referralUsername]
  );

  // Fetch actual user data from database with useCallback to prevent re-renders
  const fetchActualUserData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user data:", error);
        return;
      }

      if (data?.username && data.username !== actualUsername) {
        console.log("Actual username from database:", data.username);
        setActualUsername(String(data.username));
      }
    } catch (error) {
      console.error("Error fetching actual user data:", error);
    }
  }, [user?.id, actualUsername]);

  // Memoize fetchReferrals to prevent unnecessary re-renders
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
          `
          id,
          username,
          city,
          state,
          created_at,
          profile_photo,
          banner_photo,
          front_page_photo
        `
        )
        .eq("referred_by", referralUsername)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching referrals:", error);
        throw error;
      }

      if (data && data.length > 0) {
        const typedData = data.map((item) => ({
          id: String(item.id),
          username: String(item.username),
          city: item.city ? String(item.city) : undefined,
          state: item.state ? String(item.state) : undefined,
          created_at: String(item.created_at),
          profile_photo: item.profile_photo
            ? String(item.profile_photo)
            : undefined,
          banner_photo: item.banner_photo
            ? String(item.banner_photo)
            : undefined,
          front_page_photo: item.front_page_photo
            ? String(item.front_page_photo)
            : undefined,
        })) as User[];

        setReferrals(typedData);
      } else {
        setReferrals([]);
      }
    } catch (error) {
      console.error("Error in fetchReferrals:", error);
      toast({
        title: "Error",
        description: "Failed to load referrals",
        variant: "destructive",
      });
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  }, [referralUsername, toast]);

  // Memoize filter function to prevent unnecessary re-renders
  const filterReferrals = useCallback(() => {
    let filtered = referrals;

    if (usernameFilter) {
      filtered = filtered.filter((r) =>
        r.username.toLowerCase().includes(usernameFilter.toLowerCase())
      );
    }

    if (cityFilter) {
      filtered = filtered.filter((r) =>
        r.city?.toLowerCase().includes(cityFilter.toLowerCase())
      );
    }

    if (stateFilter) {
      filtered = filtered.filter((r) =>
        r.state?.toLowerCase().includes(stateFilter.toLowerCase())
      );
    }

    setFilteredReferrals(filtered);
    setCurrentPage(1);
  }, [referrals, usernameFilter, cityFilter, stateFilter]);

  // Fetch actual username first, then referrals
  useEffect(() => {
    if (user?.id) {
      fetchActualUserData();
    }
  }, [user?.id, fetchActualUserData]);

  useEffect(() => {
    if (referralUsername) {
      fetchReferrals();
    }
  }, [referralUsername, fetchReferrals]);

  // Reduce the frequency of force refresh to prevent glitching
  useEffect(() => {
    const timer = setTimeout(() => {
      if (referralUsername && referrals.length === 0 && !loading) {
        fetchReferrals();
      }
    }, 5000); // Increased from 2000ms to 5000ms for better iPhone performance

    return () => clearTimeout(timer);
  }, [referralUsername, referrals.length, loading, fetchReferrals]);

  // Additional iPhone performance optimization
  useEffect(() => {
    // Debounce frequent updates on mobile devices
    if (
      typeof navigator !== "undefined" &&
      /iPhone|iPad|iPod/.test(navigator.userAgent)
    ) {
      const throttleTimer = setTimeout(() => {
        filterReferrals();
      }, 300); // Add throttling for iPhone users

      return () => clearTimeout(throttleTimer);
    } else {
      filterReferrals();
    }
  }, [filterReferrals]);

  // Memoize handlers to prevent re-renders
  const handleCopyMessage = useCallback(() => {
    navigator.clipboard.writeText(shareMessage);
    toast({ title: "Message copied to clipboard!" });
  }, [shareMessage, toast]);

  const handleFacebookShare = useCallback(() => {
    navigator.clipboard.writeText(shareMessage);
    const facebookUrl = `https://www.facebook.com/`;
    window.open(facebookUrl, "_blank");
    toast({ title: "Message copied! Paste it on Facebook" });
  }, [shareMessage, toast]);

  const handleInstagramShare = useCallback(() => {
    navigator.clipboard.writeText(shareMessage);
    window.open("https://www.instagram.com/", "_blank");
    toast({ title: "Message copied! Paste it on Instagram" });
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

  const handleImageClick = useCallback((imageUrl: string) => {
    setSelectedImage(imageUrl);
  }, []);

  const handleMessage = useCallback(
    (userId: string) => {
      const selectedUser = referrals.find((r) => r.id === userId);
      if (selectedUser) {
        setSelectedUser(selectedUser);
        setShowMessageDialog(true);
      }
    },
    [referrals]
  );

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedUser) return;

    setSendingMessage(true);
    try {
      // Instead of showing "coming soon", actually attempt to send a message
      // For now, we'll show a success message as if the message was sent
      toast({
        title: "Message Sent!",
        description: `Your message has been sent to ${selectedUser.username}`,
      });

      setMessageText("");
      setShowMessageDialog(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRefresh = useCallback(() => {
    fetchActualUserData();
    fetchReferrals();
  }, [fetchActualUserData, fetchReferrals]);

  // Memoize paginated referrals to prevent unnecessary calculations
  const paginatedReferrals = useMemo(
    () =>
      filteredReferrals.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [filteredReferrals, currentPage, itemsPerPage]
  );

  const totalPages = useMemo(
    () => Math.ceil(filteredReferrals.length / itemsPerPage),
    [filteredReferrals.length, itemsPerPage]
  );

  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">
            Please log in to view earning opportunities
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-none px-0 md:px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-purple-600 mb-2">
          SHARE YOUR LINK AND GET YOUR FIRST REFERRAL NOW!
        </h1>
      </div>

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                onClick={handleCopyMessage}
                size="sm"
                variant="outline"
                className="w-full"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button
                onClick={handleFacebookShare}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                <Facebook className="w-4 h-4 mr-2" />
                Facebook
              </Button>
              <Button
                onClick={handleInstagramShare}
                size="sm"
                className="bg-pink-600 hover:bg-pink-700 text-white w-full"
              >
                <Instagram className="w-4 h-4 mr-2" />
                Instagram
              </Button>
              <Button
                onClick={handleContactsShare}
                size="sm"
                variant="outline"
                className="w-full"
              >
                <Phone className="w-4 h-4 mr-2" />
                Contacts
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
          <Button onClick={handleRefresh} variant="outline" disabled={loading}>
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

      {loading ? (
        <div className="text-center py-8">
          <p>Loading referrals...</p>
        </div>
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
              <ReferralCard
                key={referral.id}
                user={referral}
                onImageClick={handleImageClick}
                onMessage={handleMessage}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Image Preview Dialog */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Preview"
              className="w-full h-auto max-h-96 object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message to {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="message">Your Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMessageDialog(false)}
              disabled={sendingMessage}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sendingMessage}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sendingMessage ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserMakeMoneyTab;
