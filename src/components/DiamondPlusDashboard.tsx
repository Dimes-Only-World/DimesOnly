import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Crown,
  DollarSign,
  Users,
  Camera,
  Calendar,
  MessageCircle,
  Trophy,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/types";

interface DiamondPlusDashboardProps {
  userData: Tables<"users">;
}

const DiamondPlusDashboard: React.FC<DiamondPlusDashboardProps> = ({
  userData,
}) => {
  const [quarterlyData, setQuarterlyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuarterlyData();
  }, [userData.id]);

  const fetchQuarterlyData = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

      // Fetch quarterly requirements
      const { data: requirements, error: reqError } = await supabase
        .from("quarterly_requirements")
        .select("*")
        .eq("user_id", userData.id)
        .eq("year", currentYear)
        .eq("quarter", currentQuarter)
        .single();

      if (reqError && reqError.code !== "PGRST116") {
        console.error("Error fetching requirements:", reqError);
      }

      setQuarterlyData(
        requirements || {
          quarter: currentQuarter,
          year: currentYear,
          weekly_referrals_required: 7,
          weekly_content_required: 7,
          events_required: 1,
          weekly_messages_required: 7,
          guaranteed_payout: 6250,
          current_referrals: 0,
          current_content: 0,
          current_events: 0,
          current_messages: 0,
        }
      );
    } catch (error) {
      console.error("Error fetching quarterly data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-48 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!userData.diamond_plus_active) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-6 text-center">
          <Crown className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Diamond Plus Required
          </h3>
          <p className="text-yellow-700">
            This section is only available for Diamond Plus members.
          </p>
        </CardContent>
      </Card>
    );
  }

  const weeksInQuarter = 13;
  const calculateProgress = (current: number, required: number) => {
    const total = required * weeksInQuarter;
    return Math.min((current / total) * 100, 100);
  };

  const calculateDeductions = () => {
    if (!quarterlyData) return 0;

    let deductions = 0;

    // Referral deductions
    const referralShortfall = Math.max(
      0,
      quarterlyData.weekly_referrals_required * weeksInQuarter -
        quarterlyData.current_referrals
    );
    deductions += referralShortfall * 28.27;

    // Content deductions
    const contentShortfall = Math.max(
      0,
      quarterlyData.weekly_content_required * weeksInQuarter -
        quarterlyData.current_content
    );
    deductions += contentShortfall * 14.14;

    // Event deductions
    const eventShortfall = Math.max(
      0,
      quarterlyData.events_required - quarterlyData.current_events
    );
    deductions += eventShortfall * 500;

    // Message deductions
    const messageShortfall = Math.max(
      0,
      quarterlyData.weekly_messages_required * weeksInQuarter -
        quarterlyData.current_messages
    );
    deductions += messageShortfall * 28.27;

    return deductions;
  };

  const totalDeductions = calculateDeductions();
  const estimatedPayout = Math.max(
    0,
    quarterlyData.guaranteed_payout - totalDeductions
  );

  return (
    <div className="space-y-6">
      {/* Diamond Plus Status */}
      <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-6 h-6" />
            Diamond Plus Membership
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">$25,000</div>
              <div className="text-sm opacity-90">Annual Guarantee</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                ${estimatedPayout.toLocaleString()}
              </div>
              <div className="text-sm opacity-90">Current Quarter Estimate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">Q{quarterlyData.quarter}</div>
              <div className="text-sm opacity-90">Current Quarter</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quarterly Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />Q{quarterlyData.quarter}{" "}
            {quarterlyData.year} Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Referrals */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Weekly Referrals</span>
              </div>
              <Badge
                variant={
                  quarterlyData.current_referrals >=
                  quarterlyData.weekly_referrals_required * weeksInQuarter
                    ? "default"
                    : "destructive"
                }
              >
                {quarterlyData.current_referrals} /{" "}
                {quarterlyData.weekly_referrals_required * weeksInQuarter}
              </Badge>
            </div>
            <Progress
              value={calculateProgress(
                quarterlyData.current_referrals,
                quarterlyData.weekly_referrals_required
              )}
              className="h-2"
            />
            <p className="text-xs text-gray-600">
              7 referrals per week × 13 weeks = 91 total required
            </p>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Weekly Content</span>
              </div>
              <Badge
                variant={
                  quarterlyData.current_content >=
                  quarterlyData.weekly_content_required * weeksInQuarter
                    ? "default"
                    : "destructive"
                }
              >
                {quarterlyData.current_content} /{" "}
                {quarterlyData.weekly_content_required * weeksInQuarter}
              </Badge>
            </div>
            <Progress
              value={calculateProgress(
                quarterlyData.current_content,
                quarterlyData.weekly_content_required
              )}
              className="h-2"
            />
            <p className="text-xs text-gray-600">
              7 photos/videos per week × 13 weeks = 91 total required
            </p>
          </div>

          {/* Events */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-green-600" />
                <span className="font-medium">Event Participation</span>
              </div>
              <Badge
                variant={
                  quarterlyData.current_events >= quarterlyData.events_required
                    ? "default"
                    : "destructive"
                }
              >
                {quarterlyData.current_events} / {quarterlyData.events_required}
              </Badge>
            </div>
            <Progress
              value={
                (quarterlyData.current_events / quarterlyData.events_required) *
                100
              }
              className="h-2"
            />
            <p className="text-xs text-gray-600">
              1 event per month × 3 months = 3 total required
            </p>
          </div>

          {/* Messages */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-pink-600" />
                <span className="font-medium">Weekly Messages</span>
              </div>
              <Badge
                variant={
                  quarterlyData.current_messages >=
                  quarterlyData.weekly_messages_required * weeksInQuarter
                    ? "default"
                    : "destructive"
                }
              >
                {quarterlyData.current_messages} /{" "}
                {quarterlyData.weekly_messages_required * weeksInQuarter}
              </Badge>
            </div>
            <Progress
              value={calculateProgress(
                quarterlyData.current_messages,
                quarterlyData.weekly_messages_required
              )}
              className="h-2"
            />
            <p className="text-xs text-gray-600">
              7 messages to new users per week × 13 weeks = 91 total required
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payout Calculation */}
      <Card
        className={
          totalDeductions > 0
            ? "border-orange-200 bg-orange-50"
            : "border-green-200 bg-green-50"
        }
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Current Quarter Payout Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Guaranteed Quarterly Amount:</span>
              <span className="font-semibold">
                ${quarterlyData.guaranteed_payout?.toLocaleString()}
              </span>
            </div>
            {totalDeductions > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Estimated Deductions:</span>
                <span className="font-semibold">
                  -${totalDeductions.toLocaleString()}
                </span>
              </div>
            )}
            <hr />
            <div className="flex justify-between text-lg font-bold">
              <span>Estimated Payout:</span>
              <span
                className={
                  estimatedPayout === quarterlyData.guaranteed_payout
                    ? "text-green-600"
                    : "text-orange-600"
                }
              >
                ${estimatedPayout.toLocaleString()}
              </span>
            </div>
            {totalDeductions === 0 ? (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>On track for full quarterly payout!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Complete requirements to avoid deductions</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agreement Status */}
      <Card>
        <CardHeader>
          <CardTitle>Agreement Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">
              Agreement Signed & Active
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Your Diamond Plus membership agreement is active. Continue meeting
            quarterly requirements to maintain your $25,000 annual guarantee.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DiamondPlusDashboard;
