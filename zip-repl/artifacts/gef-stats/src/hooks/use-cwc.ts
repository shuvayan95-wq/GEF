import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

export type CwcCrew = {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  region: string | null;
  country: string | null;
  founded: string | null;
  founder: string | null;
  captain: string | null;
  manager: string | null;
  ownerInvestor: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  story: string | null;
  powerRanking: number | null;
  currentDivision: string | null;
  currentFanbase: number | null;
  totalMarketValue: string | null;
  totalWageBill: string | null;
  rosterSize: number | null;
  cwcTitles: number | null;
  ccTitles: number | null;
  leagueTitles: number | null;
  superCupTitles: number | null;
  overallWins: number | null;
  overallDraws: number | null;
  overallLosses: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CwcPlayer = {
  id: number;
  crewId: number;
  realName: string;
  ign: string | null;
  nationality: string | null;
  age: number | null;
  efootballId: string | null;
  whatsappNumber: string | null;
  jerseyNumber: number | null;
  position: string | null;
  imageUrl: string | null;
  joinedCrew: string | null;
  contractUntil: string | null;
  marketValue: string | null;
  wage: string | null;
  playerRating: number | null;
  bio: string | null;
  matchesPlayed: number | null;
  wins: number | null;
  losses: number | null;
  goalsScored: number | null;
  goalsConceded: number | null;
  averageRating: string | null;
  currentForm: string | null;
  isActive: boolean;
  isArchived: boolean;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CwcTrophy = {
  id: number;
  crewId: number;
  name: string;
  timesWon: number;
  winningSeasons: string[];
  iconType: string | null;
  createdAt: string;
};

export type CwcPlayerAward = {
  id: number;
  playerId: number;
  awardName: string;
  timesWon: number;
  seasons: string | null;
  createdAt: string;
};

export type CrewHQData = {
  crew: CwcCrew;
  players: CwcPlayer[];
  trophies: CwcTrophy[];
  awards: CwcPlayerAward[];
};

// -- Queries --

export function useGetCwcCrews() {
  return useQuery({
    queryKey: ["cwc-crews"],
    queryFn: async (): Promise<CwcCrew[]> => {
      const res = await fetch(getApiUrl("/api/cwc/crews"));
      if (!res.ok) throw new Error("Failed to fetch crews");
      return res.json();
    },
  });
}

export function useGetAllCwcCrews() {
  return useQuery({
    queryKey: ["cwc-crews-all"],
    queryFn: async (): Promise<CwcCrew[]> => {
      const res = await fetch(getApiUrl("/api/cwc/crews/all"));
      if (!res.ok) throw new Error("Failed to fetch all crews");
      return res.json();
    },
  });
}

export function useGetCwcCrewHQ(idOrSlug: string) {
  return useQuery({
    queryKey: ["cwc-crew-hq", idOrSlug],
    queryFn: async (): Promise<CrewHQData> => {
      const res = await fetch(getApiUrl(`/api/cwc/crews/${idOrSlug}`));
      if (!res.ok) {
        if (res.status === 404) throw new Error("Crew not found");
        throw new Error("Failed to fetch crew HQ data");
      }
      return res.json();
    },
    enabled: !!idOrSlug,
  });
}

export function useGetCwcPlayers(crewId?: number) {
  return useQuery({
    queryKey: ["cwc-players", crewId],
    queryFn: async (): Promise<CwcPlayer[]> => {
      const url = crewId 
        ? getApiUrl(`/api/cwc/players?crewId=${crewId}`)
        : getApiUrl("/api/cwc/players");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch players");
      return res.json();
    },
  });
}

export function useGetCwcTrophies(crewId?: number) {
  return useQuery({
    queryKey: ["cwc-trophies", crewId],
    queryFn: async (): Promise<CwcTrophy[]> => {
      if (!crewId) return [];
      const res = await fetch(getApiUrl(`/api/cwc/trophies/${crewId}`));
      if (!res.ok) throw new Error("Failed to fetch trophies");
      return res.json();
    },
    enabled: !!crewId,
  });
}

export function useGetCwcPlayerAwards(playerId?: number) {
  return useQuery({
    queryKey: ["cwc-player-awards", playerId],
    queryFn: async (): Promise<CwcPlayerAward[]> => {
      if (!playerId) return [];
      const res = await fetch(getApiUrl(`/api/cwc/player-awards/${playerId}`));
      if (!res.ok) throw new Error("Failed to fetch player awards");
      return res.json();
    },
    enabled: !!playerId,
  });
}

// -- Mutations --

async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(getApiUrl("/api/upload"), {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload image");
  const data = await res.json();
  return data.url;
}

export function useUploadImage() {
  return useMutation({
    mutationFn: uploadFile,
  });
}

export function useCreateCwcCrew() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<CwcCrew>) => {
      const res = await fetch(getApiUrl("/api/cwc/crews"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create crew");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cwc-crews"] });
      queryClient.invalidateQueries({ queryKey: ["cwc-crews-all"] });
    },
  });
}

export function useUpdateCwcCrew() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CwcCrew> }) => {
      const res = await fetch(getApiUrl(`/api/cwc/crews/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update crew");
      return res.json();
    },
    onSuccess: (updatedCrew) => {
      queryClient.invalidateQueries({ queryKey: ["cwc-crews"] });
      queryClient.invalidateQueries({ queryKey: ["cwc-crews-all"] });
      queryClient.invalidateQueries({ queryKey: ["cwc-crew-hq", updatedCrew.slug] });
      queryClient.invalidateQueries({ queryKey: ["cwc-crew-hq", String(updatedCrew.id)] });
    },
  });
}

export function useDeleteCwcCrew() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`/api/cwc/crews/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete crew");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cwc-crews"] });
      queryClient.invalidateQueries({ queryKey: ["cwc-crews-all"] });
    },
  });
}

export function useCreateCwcPlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<CwcPlayer>) => {
      const res = await fetch(getApiUrl("/api/cwc/players"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create player");
      return res.json();
    },
    onSuccess: (player) => {
      queryClient.invalidateQueries({ queryKey: ["cwc-players"] });
      queryClient.invalidateQueries({ queryKey: ["cwc-crew-hq"] });
    },
  });
}

export function useUpdateCwcPlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CwcPlayer> }) => {
      const res = await fetch(getApiUrl(`/api/cwc/players/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update player");
      return res.json();
    },
    onSuccess: (player) => {
      queryClient.invalidateQueries({ queryKey: ["cwc-players"] });
      queryClient.invalidateQueries({ queryKey: ["cwc-crew-hq"] });
    },
  });
}

export function useDeleteCwcPlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`/api/cwc/players/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete player");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cwc-players"] });
      queryClient.invalidateQueries({ queryKey: ["cwc-crew-hq"] });
    },
  });
}

export function useCreateCwcTrophy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<CwcTrophy>) => {
      const res = await fetch(getApiUrl("/api/cwc/trophies"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create trophy");
      return res.json();
    },
    onSuccess: (trophy) => {
      queryClient.invalidateQueries({ queryKey: ["cwc-trophies"] });
      queryClient.invalidateQueries({ queryKey: ["cwc-crew-hq"] });
    },
  });
}

export function useUpdateCwcTrophy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CwcTrophy> }) => {
      const res = await fetch(getApiUrl(`/api/cwc/trophies/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update trophy");
      return res.json();
    },
    onSuccess: (trophy) => {
      queryClient.invalidateQueries({ queryKey: ["cwc-trophies"] });
      queryClient.invalidateQueries({ queryKey: ["cwc-crew-hq"] });
    },
  });
}

export function useDeleteCwcTrophy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`/api/cwc/trophies/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete trophy");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cwc-trophies"] });
      queryClient.invalidateQueries({ queryKey: ["cwc-crew-hq"] });
    },
  });
}

export function useCreateCwcPlayerAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<CwcPlayerAward>) => {
      const res = await fetch(getApiUrl("/api/cwc/player-awards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create award");
      return res.json();
    },
    onSuccess: (award) => {
      queryClient.invalidateQueries({ queryKey: ["cwc-player-awards"] });
      queryClient.invalidateQueries({ queryKey: ["cwc-crew-hq"] });
    },
  });
}

export function useUpdateCwcPlayerAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CwcPlayerAward> }) => {
      const res = await fetch(getApiUrl(`/api/cwc/player-awards/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update award");
      return res.json();
    },
    onSuccess: (award) => {
      queryClient.invalidateQueries({ queryKey: ["cwc-player-awards"] });
      queryClient.invalidateQueries({ queryKey: ["cwc-crew-hq"] });
    },
  });
}

export function useDeleteCwcPlayerAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`/api/cwc/player-awards/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete award");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cwc-player-awards"] });
      queryClient.invalidateQueries({ queryKey: ["cwc-crew-hq"] });
    },
  });
}
