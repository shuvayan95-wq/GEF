import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthMe, adminLogin, adminLogout, getGetAuthMeQueryKey } from "@workspace/api-client-react";
import type { LoginRequest } from "@workspace/api-client-react/src/generated/api.schemas";

export function useAppAuth() {
  const queryClient = useQueryClient();

  const { data: session, isLoading, error } = useQuery({
    queryKey: getGetAuthMeQueryKey(),
    queryFn: () => getAuthMe(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => adminLogin(credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => adminLogout(),
    onSuccess: () => {
      queryClient.setQueryData(getGetAuthMeQueryKey(), null);
      queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
      window.location.href = '/';
    },
  });

  return {
    session,
    isAuthenticated: !!session?.isAdmin,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
  };
}
