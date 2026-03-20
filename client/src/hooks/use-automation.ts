import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Signal } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Validated input type for the run mutation
type RunAutomationInput = z.infer<typeof api.automation.run.input>;

export function useSignals() {
  return useQuery({
    queryKey: [api.automation.list.path],
    queryFn: async () => {
      const res = await fetch(api.automation.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch signals");
      return api.automation.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });
}

export function useRunAutomation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: RunAutomationInput) => {
      const res = await fetch(api.automation.run.path, {
        method: api.automation.run.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.automation.run.responses[400].parse(await res.json());
          throw new Error(error.message || "Validation failed");
        }
        if (res.status === 500) {
          const error = api.automation.run.responses[500].parse(await res.json());
          throw new Error(error.message || "Internal server error");
        }
        throw new Error("Failed to run automation");
      }

      return api.automation.run.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.automation.list.path] });
      toast({
        title: "Automation Complete",
        description: `${data.data.assumption_verdict} — ${(data.data.assumption_confidence * 100).toFixed(0)}% confidence`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Automation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
