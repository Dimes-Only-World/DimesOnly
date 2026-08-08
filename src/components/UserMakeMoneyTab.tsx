import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Facebook, Instagram, MessageSquare, Copy, HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

      {/* Q&A Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Q&amp;A
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="residual">
              <AccordionTrigger className="text-left font-semibold">Residual Income</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-sm leading-relaxed">
                  <p className="font-semibold">Residual Income Mechanics – Dimes Only World</p>
                  <p>
                    Residual income means you continue earning money from work or connections you already made, even
                    when you're not actively working.
                  </p>
                  <p>Here's how it works on Dimes Only World:</p>

                  <div>
                    <p className="font-semibold">1. Referral Commissions (Money Circle)</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>You refer someone → you earn 20% of what they spend or generate (direct referral).</li>
                      <li>That person refers someone else → you earn 10% on the second level.</li>
                      <li>
                        These commissions can pay you repeatedly whenever people in your network tip, upgrade, or
                        generate revenue.
                      </li>
                      <li>This is classic residual income: you build the network once, then earn ongoing overrides.</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold">2. Profit Sharing (Plus Memberships)</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        Limited positions (Silver Plus, Diamond Plus, Elite Plus) give members a share of the company's
                        profits.
                      </li>
                      <li>Payments are made quarterly.</li>
                      <li>
                        Once you hold a Plus position, you can receive ongoing profit-share payments as long as you
                        remain an active member in good standing and the company is profitable.
                      </li>
                      <li>This is residual because the income is tied to company performance.</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold">3. Network Effect (Money Circle + Overrides)</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        The bigger and more active your Money Circle becomes, the more residual income potential you
                        have.
                      </li>
                      <li>
                        You don't have to personally participate every time someone in your downline generates money —
                        the system pays the override automatically.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold">Simple Example</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>You refer 10 members.</li>
                      <li>They become active and start tipping, upgrading, or referring others.</li>
                      <li>You earn 20% on their direct activity.</li>
                      <li>When they refer people, you earn 10% on that second level.</li>
                      <li>If you hold a Plus membership, you also receive quarterly profit-share distributions.</li>
                    </ul>
                    <p className="mt-2">
                      Over time, this creates income that can continue even on days you're not working.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="profit-sharing">
              <AccordionTrigger className="text-left font-semibold">Profit Sharing</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-sm leading-relaxed">
                  <p className="font-semibold">Profit Sharing Explained – Dimes Only World</p>
                  <p>
                    Profit sharing at Dimes Only World means a portion of the company's profits is distributed to
                    members who hold special "Plus" positions.
                  </p>

                  <div>
                    <p className="font-semibold">How It Works</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>
                        <span className="font-medium">The Company Makes a Profit</span> — Dimes Only World generates
                        revenue from memberships, upgrades, tips, referrals, club owner fees, and other activity.
                      </li>
                      <li>
                        <span className="font-medium">A Percentage Goes to the Profit-Share Pool</span> — A set portion
                        of the company's profits is allocated to the profit-sharing group (the Plus members).
                      </li>
                      <li>
                        <span className="font-medium">The Pool Is Divided Among Qualified Members</span> — Split among
                        people holding eligible positions (Silver Plus, Diamond Plus, or Elite Plus).
                      </li>
                      <li>
                        <span className="font-medium">Payments Are Made Quarterly</span> — Members receive their share
                        every quarter, as long as they remain active and in good standing.
                      </li>
                    </ol>
                  </div>

                  <div>
                    <p className="font-semibold mb-2">Membership Tiers &amp; Profit Share</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs md:text-sm border rounded">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2">Membership</th>
                            <th className="p-2">Max Annual Profit Share</th>
                            <th className="p-2">Paid</th>
                            <th className="p-2">Who It's For</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="p-2">Silver Plus</td>
                            <td className="p-2">Up to $75,000/year</td>
                            <td className="p-2">Quarterly</td>
                            <td className="p-2">General members / early joiners</td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Diamond Plus</td>
                            <td className="p-2">Up to $125,000/year</td>
                            <td className="p-2">Quarterly</td>
                            <td className="p-2">Performers</td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Elite Plus</td>
                            <td className="p-2">Up to $200,000/year</td>
                            <td className="p-2">Quarterly</td>
                            <td className="p-2">Business / Club Owners</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2">
                      These amounts are maximums. Actual payouts depend on the company's real profits and how many
                      people are in each group.
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold">Important Points</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Profit sharing is not a guaranteed salary. It comes from actual company profits.</li>
                      <li>
                        Positions are limited. Early members who upgrade lock in better positions before they fill up.
                      </li>
                      <li>You must stay an active member in good standing to continue receiving distributions.</li>
                      <li>
                        This is separate from referral commissions (the 20% / 10% overrides). You can earn both.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold">Simple Example</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Company makes strong profits in a quarter.</li>
                      <li>A percentage of those profits goes into the profit-share pool.</li>
                      <li>That pool is divided among all active Plus members according to their tier.</li>
                      <li>You receive your portion as a quarterly payment.</li>
                    </ul>
                  </div>

                  <p className="font-medium">
                    In short: Referral commissions pay you from your network's activity. Profit sharing pays you from
                    the overall success of Dimes Only World.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="referral-commissions">
              <AccordionTrigger className="text-left font-semibold">Referral Commissions Explained</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-sm leading-relaxed">
                  <p className="font-semibold">Referral Commissions Explained – Dimes Only World</p>
                  <p>
                    Referral commissions (also called overrides) are how you earn money from people you bring into the
                    platform and from the people they bring in.
                  </p>

                  <div>
                    <p className="font-semibold">How It Works</p>

                    <div>
                      <p className="font-medium">1. Direct Referral – 20%</p>
                      <p>
                        When you refer someone and they join or spend money (membership, upgrade, tips, etc.), you earn
                        20% of what they generate. This is your direct override.
                      </p>
                    </div>

                    <div>
                      <p className="font-medium">2. Second-Level Referral – 10%</p>
                      <p>
                        When the person you referred brings in someone else, you earn 10% on that second-level
                        activity. You get paid even though you didn't directly refer the second person.
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold">Example</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>You refer Sarah. Sarah upgrades and spends $500 → you earn $100 (20%).</li>
                      <li>Sarah refers Mike. Mike spends $300 → you earn $30 (10%).</li>
                      <li>You continue earning these percentages whenever people in your network generate revenue.</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold">Key Points</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Commissions are paid on qualifying activity (memberships, upgrades, tips, etc.).</li>
                      <li>You can earn both direct (20%) and second-level (10%) overrides at the same time.</li>
                      <li>
                        This creates residual income — you build your network once and can keep earning from it.
                      </li>
                      <li>
                        The system is designed so the more active your Money Circle becomes, the more you can earn in
                        overrides.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold">Difference From Profit Sharing</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Referral commissions = paid from the activity of people in your network.</li>
                      <li>Profit sharing = paid from the company's overall profits (only for Plus members).</li>
                      <li>You can earn both at the same time.</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>

  );
};

export default UserMakeMoneyTab;
