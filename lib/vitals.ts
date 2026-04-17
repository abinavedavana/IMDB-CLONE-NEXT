import type { Metric } from "web-vitals";

export function reportWebVitals(metric: Metric) {
  const body = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    url: typeof window !== "undefined" ? window.location.href : "",
    timestamp: Date.now(),
  };

  console.log("[WebVital]", body);

  // Send to analytics endpoint (fire and forget)
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/vitals", JSON.stringify(body));
  }
}

export function trackError(error: Error, context?: string) {
  console.error(`[Telemetry Error]${context ? ` [${context}]` : ""}`, {
    message: error.message,
    stack: error.stack,
    url: typeof window !== "undefined" ? window.location.href : "",
    timestamp: Date.now(),
  });
}