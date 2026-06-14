import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Signal } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import type { CodeAnalysis } from "@shared/schema";

// Validated input type for the run mutation
type RunAutomationInput = z.infer<typeof api.automation.run.input>;

function getOwnerParams(): string {
  const params = new URLSearchParams();
  // Send ALL fingerprints ever used on this browser
  try {
    const fps: string[] = JSON.parse(localStorage.getItem("asof_fps") ?? "[]");
    fps.forEach(fp => { if (fp) params.append("fingerprint", fp); });
  } catch {
    const fp = localStorage.getItem("asof_fp");
    if (fp) params.append("fingerprint", fp);
  }
  // Send all session IDs (used and unused)
  try {
    const raw = localStorage.getItem("asof_sessions");
    const sessions: { id: string }[] = raw ? JSON.parse(raw) : [];
    sessions.forEach(s => { if (s.id) params.append("sessionId", s.id); });
  } catch { /* ignore */ }
  return params.toString();
}

export function useCodeAnalyses() {
  const rawFps = localStorage.getItem("asof_fps") ?? localStorage.getItem("asof_fp") ?? "";
  const rawSessions = localStorage.getItem("asof_sessions") ?? "";

  return useQuery<CodeAnalysis[]>({
    queryKey: ['/api/code-analyses', rawFps, rawSessions],
    queryFn: async () => {
      const qs = getOwnerParams();
      if (!qs) return [];
      const res = await fetch(`/api/code-analyses?${qs}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 5000,
    enabled: !!rawFps || !!rawSessions,
  });
}

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
        let body: any = {};
        try { body = await res.json(); } catch {}
        if (res.status === 400) throw new Error(body.message || "Validation failed");
        if (res.status === 401) throw new Error(body.message || "Payment required");
        if (res.status === 500) throw new Error(body.message || "Internal server error");
        throw new Error(body.message || "Failed to run automation");
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
