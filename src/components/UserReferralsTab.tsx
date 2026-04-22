import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import ReferralCard from "./ReferralCard";
import ReferralFilters from "./ReferralFilters";
import DirectMessageModal from "./DirectMessageModal";

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

const UserReferralsTab: React.FC = () => {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<User[]>([]);
  const [filteredReferrals, setFilteredReferrals] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [usernameFilter, setUsernameFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [actualUsername, setActualUsername] = useState<string>("");
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedRecipientUsername, setSelectedRecipientUsername] = useState<string | null>(null);
  const itemsPerPage = 100;

  const fetchActualUserData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      if (data?.username) setActualUsername(String(data.username));
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, [user?.id]);

  const fetchReferrals = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_my_referrals");
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
  }, [user?.id, toast]);

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

  useEffect(() => {
    if (user?.id) fetchActualUserData();
  }, [user?.id, fetchActualUserData]);

  useEffect(() => {
    if (user?.id) fetchReferrals();
  }, [user?.id, fetchReferrals]);

  useEffect(() => {
    filterReferrals();
  }, [filterReferrals]);

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
          <p className="text-gray-500">Please log in to view your referrals.</p>
        </CardContent>
      </Card>
    );

  return (
    <div className="w-full max-w-none px-0 md:px-4">
      <div className="mb-4" id="full-money-circle">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold">Your Referrals ({filteredReferrals.length})</h2>
            {actualUsername && (
              <p className="text-sm text-gray-600">Checking referrals for: {actualUsername}</p>
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

      {loading ? (
        <div className="text-center py-8">Loading referrals...</div>
      ) : filteredReferrals.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-600 mb-4">NO REFERRALS YET?</h2>
          <p className="text-gray-500">Share your link to get your first referral!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {paginatedReferrals.map((referral) => (
              <ReferralCard
                key={referral.id}
                user={referral}
                onImageClick={() => {}}
                onMessage={(userId) => {
                  const ref = referrals.find((r) => r.id === userId);
                  if (ref) {
                    setSelectedRecipientUsername(ref.username);
                    setIsMessageModalOpen(true);
                  }
                }}
              />
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

      <DirectMessageModal
        isOpen={isMessageModalOpen}
        onClose={() => {
          setIsMessageModalOpen(false);
          setSelectedRecipientUsername(null);
        }}
        recipientUsername={selectedRecipientUsername}
      />
    </div>
  );
};

export default UserReferralsTab;
