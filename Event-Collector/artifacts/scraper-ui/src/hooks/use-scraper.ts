import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/scraper-api";

// --- Types ---
export interface ConcertEvent {
  id: number;
  title: string;
  date: string | null;
  venue: string | null;
  link: string | null;
  source: string | null;
  image_url: string | null;
  image_path: string | null;
  image_local_url: string | null;
}

export interface EventsResponse {
  total: number;
  offset: number;
  limit: number;
  events: ConcertEvent[];
}

export interface Site {
  site_name: string;
  venue: string | null;
  url: string | null;
  filename: string;
}

export interface RunStatus {
  running: boolean;
  last_run: string | null;
  message: string;
}

// --- Hooks ---

export function useEvents(params: { search?: string; site?: string; venue?: string; limit?: number; offset?: number }) {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.append("search", params.search);
  if (params.site) queryParams.append("site", params.site);
  if (params.venue) queryParams.append("venue", params.venue);
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.offset) queryParams.append("offset", params.offset.toString());

  const url = `${API_BASE}/events?${queryParams.toString()}`;

  return useQuery({
    queryKey: ["events", params],
    queryFn: async (): Promise<EventsResponse> => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });
}

export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: async (): Promise<{ sites: Site[] }> => {
      const res = await fetch(`${API_BASE}/sites`);
      if (!res.ok) throw new Error("Failed to fetch sites");
      return res.json();
    },
  });
}

export function useScraperStatus() {
  return useQuery({
    queryKey: ["scraper-status"],
    queryFn: async (): Promise<RunStatus> => {
      const res = await fetch(`${API_BASE}/run/status`);
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
    // Poll every 2 seconds to keep UI updated when running
    refetchInterval: (query) => (query.state.data?.running ? 2000 : 10000),
  });
}

export function useRunScraper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (site?: string) => {
      const res = await fetch(`${API_BASE}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: site || null }),
      });
      if (!res.ok) {
        if (res.status === 409) throw new Error("Парсер уже запущен");
        throw new Error("Ошибка запуска парсера");
      }
      return res.json();
    },
    onSuccess: () => {
      // Instantly refresh status
      queryClient.invalidateQueries({ queryKey: ["scraper-status"] });
    },
  });
}

export interface CreateSitePayload {
  site_name: string;
  venue: string;
  url: string;
  rate_limit_seconds?: number;
  // HTML mode
  type?: null | "json_api";
  list_selector?: string;
  fields?: {
    title: string[];
    date?: string[];
    link?: string[];
    image?: string[];
    description?: string[];
  };
  // JSON API mode
  json_fields?: {
    title: string;
    date?: string;
    link?: string;
    image?: string;
    description?: string;
  };
}

export function useSiteConfig(site_name: string | null) {
  return useQuery({
    queryKey: ["site-config", site_name],
    queryFn: async (): Promise<Record<string, unknown>> => {
      const res = await fetch(`${API_BASE}/sites/${site_name}`);
      if (!res.ok) throw new Error("Не удалось загрузить конфиг");
      return res.json();
    },
    enabled: !!site_name,
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSitePayload) => {
      const res = await fetch(`${API_BASE}/sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Ошибка при создании сайта");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}

export function useUpdateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ site_name, payload }: { site_name: string; payload: CreateSitePayload }) => {
      const res = await fetch(`${API_BASE}/sites/${site_name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Ошибка при сохранении конфига");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      queryClient.invalidateQueries({ queryKey: ["site-config", vars.site_name] });
    },
  });
}

export function useDeleteSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (site_name: string) => {
      const res = await fetch(`${API_BASE}/sites/${site_name}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Ошибка при удалении сайта");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}

export function useSiteLogs(site: string, enabled: boolean) {
  return useQuery({
    queryKey: ["logs", site],
    queryFn: async (): Promise<string> => {
      const res = await fetch(`${API_BASE}/logs/${site}?lines=100`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.text();
    },
    enabled,
    refetchInterval: enabled ? 3000 : false,
  });
}
