import type { LiveHeatDetail } from "@/types/live.types";

export function MaterialConsumption({ detail }: { detail: LiveHeatDetail }) {
  const recipe = detail.recipe;
  const keys = ["HM", "DRI", "CPC", "LIME", "DOLO"] as const;

  return (
    <div className="rounded-xl border border-border/70 bg-muted/15 p-4">
      <p className="text-label mb-3">Material summary</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {keys.map((key) => (
          <div key={key} className="rounded-md bg-background/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">{key}</p>
            <p className="font-mono font-medium">{Number(recipe[key] ?? 0).toFixed(1)}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Bucket {recipe.Bucket ?? 12} · T°C {recipe.T_C ?? 120}</p>
    </div>
  );
}
