import { supabaseAdmin } from "@/lib/supabase";

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface MemorySession {
  moleId: string;
  userId?: string | null;
  expiresAt: number;
}

// In-memory fallback across requests within the same server process
declare global {
  // eslint-disable-next-line no-var
  var _activeProbeSession: MemorySession | undefined;
}

/**
 * Registers a mole as the currently active target for spectral probe readings.
 * Called when a user views or starts a scan session on /mole/[id].
 */
export async function setActiveProbeSession(moleId: string, userId?: string | null): Promise<void> {
  const expiresAtDate = new Date(Date.now() + SESSION_TTL_MS);

  // 1. Update in-memory fallback
  globalThis._activeProbeSession = {
    moleId,
    userId,
    expiresAt: expiresAtDate.getTime(),
  };

  // 2. Persist to Supabase probe_sessions table (best-effort if table exists)
  try {
    await supabaseAdmin.from("probe_sessions").insert({
      mole_id: moleId,
      user_id: userId ?? null,
      expires_at: expiresAtDate.toISOString(),
    });
  } catch {
    // If the table hasn't been created yet, in-memory fallback handles it
  }
}

/**
 * Resolves the currently active mole ID for an incoming probe reading.
 * Checks the database first, then falls back to memory.
 */
export async function resolveActiveProbeMoleId(): Promise<string | null> {
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabaseAdmin
      .from("probe_sessions")
      .select("mole_id")
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.mole_id) {
      return data.mole_id;
    }
  } catch {
    // Table may not exist yet, proceed to memory fallback
  }

  // Check in-memory fallback
  const mem = globalThis._activeProbeSession;
  if (mem && mem.expiresAt > Date.now()) {
    return mem.moleId;
  }

  // Fallback: get the most recently created or updated mole in database
  try {
    const { data: latestMole } = await supabaseAdmin
      .from("moles")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestMole?.id) {
      return latestMole.id;
    }
  } catch {
    // Return null
  }

  return null;
}
