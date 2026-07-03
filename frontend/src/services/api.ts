import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("devsync_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        localStorage.removeItem("devsync_token");
        localStorage.removeItem("devsync_user");
        window.location.href = "/auth";
      }

      const message = data?.error || data?.message || "An error occurred";
      return Promise.reject(new Error(message));
    }

    if (error.request) {
      return Promise.reject(new Error("Network error. Please check your connection."));
    }

    return Promise.reject(error);
  },
);

// Token management
export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem("devsync_token", token);
  } else {
    localStorage.removeItem("devsync_token");
  }
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem("devsync_token");
};

// Health check
export interface HealthStatus {
  status: string;
  components?: Record<string, { status: string }>;
}

export const checkHealth = async (): Promise<HealthStatus> => {
  const { data } = await api.get<HealthStatus>("/actuator/health");
  return data;
};

// Metrics
export interface MetricMeasurement {
  name: string;
  measurements: Array<{ statistic: string; value: number }>;
}

export interface SystemMetrics {
  memoryUsed: number;
  memoryMax: number;
  threads: number;
  uptime: number;
  cpuUsage: number | null;
  allocatedMemory: number;
}

const METRICS_NAMES = [
  "jvm.memory.used",
  "jvm.memory.max",
  "jvm.threads.live",
  "process.uptime",
  "system.cpu.usage",
  "jvm.gc.memory.allocated",
] as const;

export const fetchMetrics = async (): Promise<SystemMetrics | null> => {
  try {
    const results = await Promise.all(
      METRICS_NAMES.map((name) =>
        api.get<MetricMeasurement>(`/actuator/metrics/${name}`).then((r) => r.data),
      ),
    );

    const findValue = (data: MetricMeasurement, statistic: string) =>
      data.measurements.find((m) => m.statistic === statistic)?.value ?? 0;

    return {
      memoryUsed: findValue(results[0], "VALUE"),
      memoryMax: findValue(results[1], "VALUE"),
      threads: findValue(results[2], "VALUE"),
      uptime: findValue(results[3], "VALUE"),
      cpuUsage: results[4]?.measurements[0]?.value ?? null,
      allocatedMemory: findValue(results[5], "COUNT"),
    };
  } catch {
    return null;
  }
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

export const formatUptime = (seconds: number): string => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
};

export default api;
