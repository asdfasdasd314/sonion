/** Client-mirrored tunables from parameter_files/nutrition-dashboard.toml */
export const DASHBOARD_POLL_INTERVAL_MS = 20_000;

export function mealListFingerprint(meals: readonly { id: string }[]): string {
  return `${meals.length}:${meals[0]?.id ?? ""}`;
}
