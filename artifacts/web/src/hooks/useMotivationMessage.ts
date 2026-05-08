import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/utils/api";

interface MotivationMessage {
  id: string;
  content: string;
  source: "system" | "human";
  createdAt: string;
}

export function useMotivationMessage() {
  const { data, isLoading, refetch } = useQuery<MotivationMessage>({
    queryKey: ["motivation-message"],
    queryFn: () => fetchApi<MotivationMessage>("/messages/random"),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return { message: data ?? null, isLoading, refetch };
}
