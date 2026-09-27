"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface DeviceRow {
  id: string;
  last_seen_at: string | null;
  rssi: number | null;
  uptime_ms: number | null;
  status: "idle" | "sending" | "cooldown" | "wifi_reset" | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  idle:       { label: "Ожидает нажатия",  color: "text-slate-500",   icon: "○" },
  sending:    { label: "Передаёт данные",  color: "text-sky-700",     icon: "↑" },
  cooldown:   { label: "Пауза между замерами", color: "text-amber-700",  icon: "⏳" },
  wifi_reset: { label: "Сброс Wi-Fi…",    color: "text-rose-700",    icon: "↺" },
};


// Device is considered online if last heartbeat arrived within the last 30 seconds
const ONLINE_THRESHOLD_MS = 30_000;

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

function formatUptime(ms: number | null): string {
  if (ms === null) return "";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

function rssiLabel(rssi: number | null): string {
  if (rssi === null) return "";
  if (rssi >= -60) return "Отличный сигнал";
  if (rssi >= -70) return "Хороший сигнал";
  if (rssi >= -80) return "Слабый сигнал";
  return "Очень слабый сигнал";
}

export function DeviceStatusBadge() {
  const [device, setDevice] = useState<DeviceRow | null | undefined>(undefined);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    supabase
      .from("devices")
      .select("id, last_seen_at, rssi, uptime_ms")
      .eq("id", "pen-probe")
      .maybeSingle()
      .then(({ data }) => {
        setDevice(data as DeviceRow | null);
        if (data) setOnline(isOnline(data.last_seen_at));
      });

    // Real-time subscription: device heartbeats update the row
    const channel = supabase
      .channel("device-status-badge")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "devices", filter: "id=eq.pen-probe" },
        (payload) => {
          const row = payload.new as DeviceRow;
          setDevice(row);
          setOnline(isOnline(row.last_seen_at));
        }
      )
      .subscribe();

    // Re-evaluate online status every 10s (heartbeat can expire while page open)
    const ticker = setInterval(() => {
      setDevice((prev) => {
        if (prev) setOnline(isOnline(prev.last_seen_at));
        return prev;
      });
    }, 10_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(ticker);
    };
  }, []);

  // Loading
  if (device === undefined) return null;

  // Device row doesn't exist yet — probe was never connected
  if (device === null) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
        <span>Зонд ещё не подключался к сети</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs transition-colors ${
        online
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      {/* Status dot + label + firmware status */}
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            online ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
          }`}
        />
        <span
          className={`font-semibold ${
            online ? "text-emerald-800" : "text-slate-500"
          }`}
        >
          {online ? "Зонд онлайн" : "Зонд офлайн"}
        </span>

        {/* Firmware status pill — only show when online */}
        {online && device.status && STATUS_LABELS[device.status] && (() => {
          const s = STATUS_LABELS[device.status!]!;
          return (
            <span className={`inline-flex items-center gap-1 font-medium ${s.color}`}>
              <span aria-hidden="true">{s.icon}</span>
              {s.label}
            </span>
          );
        })()}
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-3 text-[10px] text-slate-500 shrink-0">
        {online && device.rssi !== null && (
          <span title={`RSSI: ${device.rssi} dBm`}>
            📶 {rssiLabel(device.rssi)}
          </span>
        )}
        {online && device.uptime_ms !== null && (
          <span title="Время работы с момента включения">
            ⏱ {formatUptime(device.uptime_ms)}
          </span>
        )}
        {!online && device.last_seen_at && (
          <span>
            Был{" "}
            {new Date(device.last_seen_at).toLocaleString("ru-RU", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

