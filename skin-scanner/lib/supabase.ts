import { createClient } from "@supabase/supabase-js";

// Browser/client-side client — respects RLS via the logged-in user's session.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side client for API routes — service role bypasses RLS, so only
// use it after you've checked the caller owns the mole_id yourself.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type ClassProbs = Record<string, number>;

export type PhotoAnalysis = {
  id: string;
  mole_id: string;
  image_path: string;
  sharpness_score: number;
  class_probs: ClassProbs;
  risk_score: number;
  created_at: string;
};
