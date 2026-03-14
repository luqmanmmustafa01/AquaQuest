import { useGetCreatures } from "@workspace/api-client-react";
import { Card, Badge, Loader } from "@/components/ui";
import { formatDepth } from "@/lib/utils";
import { Fish, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function Creatures() {
  const { data: creatures, isLoading } = useGetCreatures();

  if (isLoading) return <Loader />;

  const rarityColors: Record<string, "default" | "success" | "warning" | "danger" | "purple"> = {
    common: "default",
    uncommon: "success",
    rare: "warning", // Actually Rare should maybe be blue but we use warning/danger for simplicity. Let's map it.
    epic: "purple",
    legendary: "danger" // We use danger(red/orange) for legendary to make it pop, or purple.
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="border-b border-border/50 pb-6">
        <h1 className="text-4xl font-display font-bold text-white mb-2 flex items-center gap-3">
          <Fish className="w-8 h-8 text-accent" /> Compendium
        </h1>
        <p className="text-muted-foreground">Catalog of discovered deep sea lifeforms.</p>
      </div>

      {(!creatures || creatures.length === 0) ? (
        <div className="py-20 text-center glass-panel rounded-3xl border-dashed">
          <div className="w-20 h-20 bg-background/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
            <Fish className="w-10 h-10 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-xl font-display font-bold text-foreground mb-2">No discoveries yet</h3>
          <p className="text-muted-foreground">Dive deeper to find mysterious creatures.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {creatures.map((creature) => (
            <Card key={creature.id} className="relative overflow-hidden group hover:bg-card/90 transition-colors p-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[50px] group-hover:bg-primary/20 transition-colors" />
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-background to-card border border-border/50 flex items-center justify-center text-4xl shadow-inner shadow-black/50">
                    {creature.emoji}
                  </div>
                  <Badge variant={rarityColors[creature.rarity] || "default"}>
                    {creature.rarity}
                  </Badge>
                </div>
                
                <h3 className="text-xl font-display font-bold text-white mb-1">{creature.name}</h3>
                <p className="text-xs text-primary font-mono uppercase tracking-widest mb-4">{creature.species}</p>
                
                <p className="text-sm text-muted-foreground mb-6 line-clamp-3 min-h-[60px]">
                  {creature.description}
                </p>
                
                <div className="grid grid-cols-2 gap-2 text-xs font-medium bg-background/50 rounded-xl p-3 border border-border/50">
                  <div className="flex flex-col gap-1 text-muted-foreground">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-accent" /> Depth</span>
                    <span className="text-foreground">{formatDepth(creature.depthFound)}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-primary" /> Discovered</span>
                    <span className="text-foreground">{format(new Date(creature.discoveredAt), 'MMM yyyy')}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
