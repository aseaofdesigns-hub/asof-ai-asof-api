import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VerifyPayment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");

  const tierLabels: Record<string, { label: string; price: string }> = {
    lite: { label: "Lite", price: "$0.50" },
    pro: { label: "Pro", price: "$1.00" },
    max: { label: "Max", price: "$2.50" },
  };

  const { data, isLoading, error } = useQuery<{ status: string; tier: string | null; amount: number | null }>({
    queryKey: [buildUrl(api.payments.verify.path, { sessionId: sessionId || "" })],
    enabled: !!sessionId,
    retry: 3,
  });

  useEffect(() => {
    if (data?.status === "paid") {
      localStorage.setItem("stripe_session_id", sessionId!);
      toast({
        title: "Payment Successful",
        description: "You can now run your automation.",
      });
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
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <h2 className="text-xl font-semibold">Payment Confirmed!</h2>
                <p className="text-muted-foreground">
                  {data?.tier && tierLabels[data.tier]
                    ? `Your ${tierLabels[data.tier].price} ${tierLabels[data.tier].label} plan payment was successful.`
                    : data?.amount
                    ? `Your $${(data.amount / 100).toFixed(2)} payment was successful.`
                    : "Your payment was successful."}
                </p>
                <Button className="w-full" onClick={() => setLocation("/")}>
                  Run Automation Now
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
