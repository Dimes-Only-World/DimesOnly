import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Play, RefreshCw, CheckCircle, Trash2, Settings } from "lucide-react";

const SUPABASE_URL = "https://qkcuykpndrolrewwnkwb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY3V5a3BuZHJvbHJld3dua3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzODIwNzAsImV4cCI6MjA2NDk1ODA3MH0.gamp40tIrDSMaI5_YMIrn3qCR-oVdx__YtvBl75yOJs";

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  users?: any[];
  expected?: {
    grossAmount: number;
    paypalFee: number;
    netAmount: number;
    performerShare: number;
    referrerShare: number;
    jackpotContribution: number;
    companyShare: number;
    ticketsGenerated: number;
  };
  summary?: {
    performerBalance: number;
    referrerBalance: number;
    totalTransactions: number;
    totalTickets: number;
  };
  transactions?: any[];
  weeklyEarnings?: any[];
  tickets?: any[];
  ticketCodes?: string[];
}

export const AdminTipAllocationTest = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState("10");
  const [result, setResult] = useState<TestResult | null>(null);

  const callTestFunction = async (action: string, amount?: number): Promise<TestResult> => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/test-tip-allocation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action, tipAmount: amount }),
    });
    return response.json();
  };

  const handleSetup = async () => {
    setLoading("setup");
    try {
      const result = await callTestFunction("setup");
      setResult(result);
      if (result.success) {
        toast({ title: "Setup Complete", description: result.message });
      } else {
        toast({ title: "Setup Failed", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleTest = async () => {
    setLoading("test");
    try {
      const amount = parseFloat(tipAmount);
      if (isNaN(amount) || amount < 1) {
        toast({ title: "Invalid Amount", description: "Enter a valid tip amount (min $1)", variant: "destructive" });
        return;
      }
      const result = await callTestFunction("test", amount);
      setResult(result);
      if (result.success) {
        toast({ title: "Test Tip Sent", description: result.message });
      } else {
        toast({ title: "Test Failed", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleVerify = async () => {
    setLoading("verify");
    try {
      const result = await callTestFunction("verify");
      setResult(result);
      if (result.success) {
        toast({ title: "Verification Complete", description: "Results loaded" });
      } else {
        toast({ title: "Verify Failed", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleCleanup = async () => {
    setLoading("cleanup");
    try {
      const result = await callTestFunction("cleanup");
      setResult(result);
      if (result.success) {
        toast({ title: "Cleanup Complete", description: result.message });
      } else {
        toast({ title: "Cleanup Failed", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Tip Allocation Test Environment
        </CardTitle>
        <CardDescription>
          Test and verify the tip allocation system with dummy accounts. 
          Uses test_tipper → test_performer (referred by test_referrer).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button onClick={handleSetup} disabled={loading !== null} variant="outline" className="w-full">
            {loading === "setup" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
            1. Setup
          </Button>
          
          <div className="flex gap-2">
            <Input 
              type="number" 
              value={tipAmount} 
              onChange={(e) => setTipAmount(e.target.value)}
              placeholder="Amt"
              className="w-full sm:w-20"
              min="1"
            />
            <Button onClick={handleTest} disabled={loading !== null} className="flex-1">
              {loading === "test" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              2. Test
            </Button>
          </div>
          
          <Button onClick={handleVerify} disabled={loading !== null} variant="secondary">
            {loading === "verify" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            3. Verify
          </Button>
          
          <Button onClick={handleCleanup} disabled={loading !== null} variant="destructive">
            {loading === "cleanup" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Cleanup
          </Button>
        </div>

        {/* Expected Allocation Display */}
        {result?.expected && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Expected Allocation (${result.expected.grossAmount} tip):</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>PayPal Fee: <span className="font-mono">${result.expected.paypalFee.toFixed(2)}</span></div>
              <div>Net Amount: <span className="font-mono">${result.expected.netAmount.toFixed(2)}</span></div>
              <div>Performer (20%): <span className="font-mono text-green-600">${result.expected.performerShare.toFixed(2)}</span></div>
              <div>Referrer (10%): <span className="font-mono text-blue-600">${result.expected.referrerShare.toFixed(2)}</span></div>
              <div>Jackpot (25%): <span className="font-mono text-purple-600">${result.expected.jackpotContribution.toFixed(2)}</span></div>
              <div>Company: <span className="font-mono text-orange-600">${result.expected.companyShare.toFixed(2)}</span></div>
              <div>Tickets: <span className="font-mono">{result.expected.ticketsGenerated}</span></div>
            </div>
            {result.ticketCodes && result.ticketCodes.length > 0 && (
              <div className="mt-2">
                <span className="text-sm">Ticket Codes: </span>
                <span className="font-mono text-sm">{result.ticketCodes.join(", ")}</span>
              </div>
            )}
          </div>
        )}

        {/* Verification Results */}
        {result?.summary && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Actual Results:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>Performer Balance: <span className="font-mono text-green-600">${Number(result.summary.performerBalance).toFixed(2)}</span></div>
              <div>Referrer Balance: <span className="font-mono text-blue-600">${Number(result.summary.referrerBalance).toFixed(2)}</span></div>
              <div>Total Transactions: <span className="font-mono">{result.summary.totalTransactions}</span></div>
              <div>Total Tickets: <span className="font-mono">{result.summary.totalTickets}</span></div>
            </div>
          </div>
        )}

        {/* User Details */}
        {result?.users && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Test Users:</h4>
            <div className="space-y-1 text-sm font-mono">
              {result.users.map((user: any) => (
                <div key={user.id || user.username} className="flex justify-between">
                  <span>{user.username}</span>
                  <span>
                    {user.tips_earned !== undefined && `tips: $${Number(user.tips_earned).toFixed(2)}`}
                    {user.referral_fees !== undefined && ` | ref: $${Number(user.referral_fees).toFixed(2)}`}
                    {user.referred_by && ` | by: ${user.referred_by}`}
                    {user.status && ` [${user.status}]`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions Detail */}
        {result?.transactions && result.transactions.length > 0 && (
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <h4 className="font-semibold mb-2">Transactions:</h4>
            <table className="text-xs w-full">
              <thead>
                <tr className="text-left">
                  <th className="pr-2">Amount</th>
                  <th className="pr-2">Performer</th>
                  <th className="pr-2">Referrer</th>
                  <th className="pr-2">Commission</th>
                  <th className="pr-2">Tickets</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {result.transactions.map((tx: any) => (
                  <tr key={tx.id}>
                    <td className="pr-2">${Number(tx.tip_amount).toFixed(2)}</td>
                    <td className="pr-2">{tx.tipped_username}</td>
                    <td className="pr-2">{tx.referrer_username || "-"}</td>
                    <td className="pr-2">${Number(tx.referrer_commission || 0).toFixed(2)}</td>
                    <td className="pr-2">{tx.tickets_generated}</td>
                    <td>{tx.payment_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Error Display */}
        {result?.error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            <strong>Error:</strong> {result.error}
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Workflow:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>Setup</strong> - Creates/resets test_tipper, test_performer, test_referrer accounts</li>
            <li><strong>Test</strong> - Sends a simulated tip and processes allocations</li>
            <li><strong>Verify</strong> - Shows actual database balances to confirm allocations</li>
            <li><strong>Cleanup</strong> - Removes test transactions (keeps accounts)</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminTipAllocationTest;
