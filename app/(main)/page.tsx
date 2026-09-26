import { createClient } from "@/lib/supabase/server";
import { MoleListInteractive, type MoleWithAnalyses } from "@/components/mole-list-interactive";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();

  const { data: rawMoles } = await supabase
    .from("moles")
    .select("id, label, body_location, created_at, photo_analyses(id, risk_score, created_at, image_path, sharpness_score)")
    .order("created_at", { ascending: false });

  const moles: MoleWithAnalyses[] = (rawMoles ?? []).map((m: any) => ({
    ...m,
    photo_analyses: (m.photo_analyses ?? []).sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  }));

  // Fetch signed URLs for latest photos in parallel for instant thumbnails
  const thumbEntries = await Promise.all(
    moles
      .filter((m) => m.photo_analyses && m.photo_analyses.length > 0 && m.photo_analyses[0].image_path)
      .map(async (m) => {
        try {
          const { data } = await supabase.storage
            .from("mole-photos")
            .createSignedUrl(m.photo_analyses![0].image_path, 3600);
          return [m.id, data?.signedUrl ?? null] as const;
        } catch {
          return [m.id, null] as const;
        }
      })
  );

  const thumbnails: Record<string, string | null> = Object.fromEntries(thumbEntries);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <MoleListInteractive moles={moles} thumbnails={thumbnails} />
    </main>
  );
}
