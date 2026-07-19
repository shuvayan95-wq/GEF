import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

export interface CaptainSession {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  teamId: number;
  teamName: string | null;
  teamLogoUrl: string | null;
  status: string;
  lastLoginAt?: string | null;
}

async function fetchCaptainMe(): Promise<CaptainSession | null> {
  const res = await fetch(getApiUrl("/api/captain/me"), { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.captain ?? null;
}

export function useCaptainAuth() {
  const queryClient = useQueryClient();

  const { data: captain, isLoading } = useQuery<CaptainSession | null>({
    queryKey: ["captain-me"],
    queryFn: fetchCaptainMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const res = await fetch(getApiUrl("/api/captain/login"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["captain-me"] }),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(getApiUrl("/api/captain/logout"), { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["captain-me"], null);
      queryClient.invalidateQueries({ queryKey: ["captain-me"] });
      window.location.href = "/captain/login";
    },
  });

  return {
    captain,
    isAuthenticated: !!captain,
    isLoading,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
  };
}
