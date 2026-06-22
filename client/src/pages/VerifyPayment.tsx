import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ArrowUpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TIER_LABELS: Record<string, string> = {
  lite: "Lite ($0.50)",
  pro: "Pro ($1.00)",
  max: "Max ($2.50)",
};

type VerifyResponse = {
  status: string;
  tier: string | null;
  amount: number | null;
  analysisId?: number | null;
};

export default function VerifyPayment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");

  const { data, isLoading, error } = useQuery<VerifyResponse>({
    queryKey: [buildUrl(api.payments.verify.path, { sessionId: sessionId || "" })],
    enabled: !!sessionId,
    retry: 3,
  });

  const isUpgrade = !!(data?.analysisId);

  useEffect(() => {
    if (data?.status === "paid") {
      if (data.analysisId) {
        localStorage.setItem("pending_upgrade", JSON.stringify({
          analysisId: data.analysisId,
          tier: data.tier,
          sessionId,
        }));
        toast({
          title: "Analysis Upgraded!",
          description: `Upgraded to ${data.tier ? TIER_LABELS[data.tier] ?? data.tier : "next tier"}.`,
        });
      } else {
        (async () => {
          let qty = 1;
          try {
            const qtyRes = await fetch(`/api/payment-quantity/${sessionId}`);
            qty = qtyRes.ok ? ((await qtyRes.json()).quantity ?? 1) : 1;
            const raw = localStorage.getItem("asof_sessions");
            const existing: Array<{ id: string; tier: string }> = raw ? JSON.parse(raw) : [];
            const newSessions: Array<{ id: string; tier: string }> = [];
            for (let i = 0; i < qty; i++) {
              newSessions.push({ id: `${sessionId!}__${i}`, tier: data.tier ?? "lite" });
            }
            const allSessions = [...newSessions, ...existing];
            localStorage.setItem("asof_sessions", JSON.stringify(allSessions));
            localStorage.setItem("stripe_session_id", allSessions[0].id);
            if (data.tier) localStorage.setItem("purchased_tier", data.tier);
          } catch {}
          toast({
            title: "Payment Successful",
            description: qty > 1 ? `${qty} credits added — ready to analyze.` : "You can now run your analysis.",
          });
        })();
      }
    }
  }, [data, sessionId, toast]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <XCircle className="w-12 h-12 text-destructive" />
              <h2 className="text-xl font-semibold">Missing Session ID</h2>
              <p className="text-muted-foreground">No payment session was found.</p>
              <Button onClick={() => setLocation("/")}>Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            {isLoading ? (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <h2 className="text-xl font-semibold">Verifying Payment...</h2>
                <p className="text-muted-foreground">Please wait while we confirm your transaction.</p>
              </>
            ) : data?.status === "paid" ? (
              <>
                {isUpgrade
                  ? <ArrowUpCircle className="w-12 h-12 text-purple-400" />
                  : <CheckCircle2 className="w-12 h-12 text-green-500" />}
                <h2 className="text-xl font-semibold">
                  {isUpgrade ? "Analysis Upgraded!" : "Payment Confirmed!"}
                </h2>
                <p className="text-muted-foreground">
                  {isUpgrade
                    ? `Upgraded to ${data.tier ? (data.tier.charAt(0).toUpperCase() + data.tier.slice(1)) : "next tier"}${data.amount ? ` — you paid $${(data.amount / 100).toFixed(2)}` : ""}.`
                    : data.tier && TIER_LABELS[data.tier]
                    ? `Your ${TIER_LABELS[data.tier]} plan is now active.`
                    : data.amount
                    ? `Your $${(data.amount / 100).toFixed(2)} payment was successful.`
                    : "Your payment was successful."}
                </p>
                <Button
                  data-testid="button-go-home"
                  className="w-full"
                  onClick={() => setLocation("/")}
                >
                  {isUpgrade ? "View Upgraded Analysis" : "Run Analysis Now"}
                </Button>
              </>
            ) : (
              <>
                <XCircle className="w-12 h-12 text-destructive" />
                <h2 className="text-xl font-semibold">Verification Failed</h2>
                <p className="text-muted-foreground">
                  {error instanceof Error ? error.message : "We couldn't verify your payment status."}
                </p>
                <Button onClick={() => setLocation("/")}>Try Again</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
