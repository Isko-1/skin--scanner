// MagicUI components import `cn` from here by convention. A one-liner
// covers our actual usage (conditional class joining) — no need to pull
// in clsx + tailwind-merge for that (ponytail rung 6).
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
