import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSectionLayout from "@/components/DashboardSectionLayout";
import DashboardMoneyCircle from "@/components/DashboardMoneyCircle";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";

const readStoredUser = (): any | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const MoneyCircle: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [profile, setProfile] = useState<any | null>(user || readStoredUser());

  useEffect(() => {
    if (profile?.id) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setProfile({ id: data.user.id });
    });
  }, [profile?.id]);

  return (
    <DashboardSectionLayout
      title="Money Circle"
      username={profile?.username}
      profilePhoto={profile?.profile_photo || profile?.profilePhoto}
    >
      <div className="text-black [--foreground:0_0%_0%]">
        <DashboardMoneyCircle
          userId={String(profile?.id || "")}
          onViewAll={() => navigate("/dashboard/referrals")}
          onGetLink={() => navigate("/dashboard/make-money#referral-link")}
        />
      </div>
    </DashboardSectionLayout>
  );
};

export default MoneyCircle;
