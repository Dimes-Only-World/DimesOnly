import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Facebook, Instagram, MessageSquare, Copy, HelpCircle, Download, LinkIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";


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
      "Want to actually get paid for recruiting baddies that got hot photos and videos?\n\n" +
      "Watch this quick video first:\n" +
      "https://dimesonlyworld.s3.us-east-2.amazonaws.com/Exs+Commercial(1)+(1).webm\n\n" +
      "If it hits different… click the link below and lock in your free account right now.\n" +
      "Spots are limited before the app officially launches.\n" +
      "It’s 100% free to join — zero risk, nothing to lose.\n" +
      "Don’t sleep on this one. Can you find Dimes Only right now? If so join, it will pay serious EASY money!\n\n";
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

  const handleCopyLink = useCallback(async () => {
    const ok = await copyToClipboard(shareLink);
    if (ok) toast({ title: "Copied!", description: "Your referral link is ready to share." });
  }, [shareLink, copyToClipboard, toast]);

  const handleCopyMessage = useCallback(async () => {
    const ok = await copyToClipboard(shareMessage);
    if (ok) toast({ title: "Copied!", description: "Your share message is ready to paste." });
  }, [shareMessage, copyToClipboard, toast]);

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
    <div className="w-full max-w-none px-0 md:px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-primary">
          Share Your Link & Grow Your Network
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Invite friends, fans, and business contacts to join Dimes Only World. You earn referral commissions when they
          sign up and participate.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Promo Video */}
        <Card className="border border-border">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Download className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-primary">Download Promo Video</h3>
              <p className="text-sm text-muted-foreground">
                Save the video to send through your favorite messaging app.
              </p>
            </div>
            <Button asChild className="w-full">
              <a
                href="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Exs+Commercial.webm"
                download="DimesOnly-Promo.webm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Video
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Referral Link */}
        <Card className="border border-border">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <LinkIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-primary">Your Referral Link</h3>
              <p className="text-sm text-muted-foreground">Copy and share your personal link anywhere.</p>
            </div>
            <div className="flex items-center gap-3 w-full">
              <div className="shrink-0 p-2 bg-background rounded border border-border">
                <QRCodeSVG value={shareLink} size={88} level="M" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="p-2 bg-muted rounded border border-border text-sm font-mono break-all text-muted-foreground text-left">
                  {shareLink}
                </div>
                <p className="text-xs text-muted-foreground text-left">Scan the code to join — no typing needed.</p>
              </div>
              <Button onClick={handleCopyLink} size="icon" variant="outline" aria-label="Copy referral link">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button onClick={handleCopyLink} className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              Copy Referral Link
            </Button>

          </CardContent>
        </Card>
      </div>

      {/* Share Message */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5" />
            Ready-to-Send Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Copy this pre-written message and paste it into any app. It already includes your personal referral link.
          </p>
          <div className="p-4 bg-muted rounded-lg border border-border">
            <p className="text-sm whitespace-pre-line text-foreground">{shareMessage}</p>
          </div>
          <Button onClick={handleCopyMessage} className="w-full sm:w-auto">
            <Copy className="w-4 h-4 mr-2" />
            Copy Message
          </Button>
        </CardContent>
      </Card>

      {/* Share Buttons */}
      <Card className="border border-border" id="referral-link-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="w-5 h-5" />
            Share Instantly
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click a button to share your referral link directly. On mobile, your device's share sheet will open.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button onClick={handleNativeShare} variant="outline" className="w-full">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button onClick={handleFacebookShare} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Facebook className="w-4 h-4 mr-2" />
              Facebook
            </Button>
            <Button onClick={handleInstagramShare} className="w-full bg-pink-600 hover:bg-pink-700 text-white">
              <Instagram className="w-4 h-4 mr-2" />
              Instagram
            </Button>
            <Button onClick={handleSmsShare} variant="outline" className="w-full">
              <MessageSquare className="w-4 h-4 mr-2" />
              Contacts
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button onClick={handleWhatsAppShare} className="w-full bg-green-500 hover:bg-green-600 text-white">
              WhatsApp
            </Button>
            <Button onClick={handleTelegramShare} className="w-full bg-blue-400 hover:bg-blue-500 text-white">
              Telegram
            </Button>
            <Button onClick={handleXShare} className="w-full bg-sky-600 hover:bg-sky-700 text-white">
              X
            </Button>
            <Button onClick={handleEmailShare} className="w-full bg-red-500 hover:bg-red-600 text-white">
              Email
            </Button>
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

            <AccordionItem value="dimes-tip-structure">
              <AccordionTrigger className="text-left font-semibold">Dimes Tip Structure</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-sm leading-relaxed">
                  <p className="font-semibold">Dimes Tip Structure – Dimes Only World</p>
                  <p>
                    When a tip is sent on the platform, it is split across the tipped member, the referrer of the tipped
                    member, and the referrer of the tipper. This rewards the network that helped both sides join.
                  </p>

                  <div>
                    <p className="font-semibold">How a Tip Is Distributed</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <span className="font-medium">40% to the tipped female</span> — This appears on Dimes profiles
                        and is the core reward for the member receiving the tip.
                      </li>
                      <li>
                        <span className="font-medium">10% to the referrer of the tipped female</span> — The person who
                        originally referred the tipped member receives an override from that activity.
                      </li>
                      <li>
                        <span className="font-medium">5% to the person who referred the tipper</span> — The person who
                        brought the tipper onto the platform also earns a small override.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold">Key Points</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>The 40% tipped amount is shown only on Dimes profiles.</li>
                      <li>Referral overrides are paid automatically when the tip clears.</li>
                      <li>This structure encourages members to refer both tippers and recipients.</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="referrals-direct-overrides">
              <AccordionTrigger className="text-left font-semibold">Referrals Direct &amp; Overrides</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-sm leading-relaxed">
                  <p className="font-semibold">Referrals Direct &amp; Overrides – Dimes Only World</p>
                  <p>
                    The referral program pays you on two levels: a direct commission when you personally refer someone,
                    and an override when the people you referred bring in others.
                  </p>

                  <div>
                    <p className="font-semibold">Commission Rates</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <span className="font-medium">20% Direct</span> — Earned when someone you refer joins or spends
                        money on the platform.
                      </li>
                      <li>
                        <span className="font-medium">10% Override</span> — Earned when the person you referred brings in
                        someone else and that person spends money.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold">Qualifying Referral Activity</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Memberships — monthly, annual, and plus upgrades.</li>
                      <li>Car rentals — booked and paid through the platform.</li>
                      <li>Car purchases — handled on a case-by-case scenario.</li>
                      <li>Purchases — clothes, ticket sales, and other platform transactions.</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold">Key Points</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Both direct and override commissions can be earned at the same time.</li>
                      <li>Commissions are calculated from the qualifying transaction amount.</li>
                      <li>Specific purchase types may be handled case-by-case based on seller agreements.</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="merchant-product-sales">
              <AccordionTrigger className="text-left font-semibold">Members Merchant Product Sale</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-sm leading-relaxed">
                  <p className="font-semibold">Members Merchant Product Sale – Dimes Only World</p>
                  <p>
                    Members can post items they own and sell them directly through the platform. When your item sells, you
                    keep the majority of the final invoice while your referrer also earns a small override.
                  </p>

                  <div>
                    <p className="font-semibold">How It Works</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <span className="font-medium">You earn 70%</span> — The seller keeps 70% of the final invoice when
                        their item sells.
                      </li>
                      <li>
                        <span className="font-medium">Your referrer earns 10%</span> — The person who referred you to the
                        platform receives a 10% override from the sale.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold">What Can Be Sold</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Clothing, accessories, and personal items.</li>
                      <li>Event tickets and experiences.</li>
                      <li>Other approved member-owned products.</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold">Key Points</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>All items must follow platform guidelines and approval rules.</li>
                      <li>The 70% seller payout is calculated from the final invoice amount.</li>
                      <li>Your referrer's 10% override is paid automatically when the sale completes.</li>
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
