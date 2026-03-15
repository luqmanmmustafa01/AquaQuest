import { useGetAchievements } from "@workspace/api-client-react";
import { Card, Badge, Loader } from "@/components/ui";
import { Trophy, Star, Target, Compass, Users } from "lucide-react";
import { format } from "date-fns";

export default function Achievements() {
  const { data: achievements, isLoading } = useGetAchievements();

  if (isLoading) return <Loader />;

  const categoryIcons: Record<string, React.ReactNode> = {
    exploration: <Compass className="w-4 h-4" />,
    combat: <Target className="w-4 h-4" />,
    collection: <Star className="w-4 h-4" />,
    social: <Users className="w-4 h-4" />
  };

  const categoryColors: Record<string, "default" | "success" | "warning" | "danger" | "purple"> = {
    exploration: "success",
    combat: "danger",
    collection: "warning",
    social: "purple"
  };

  return (
    <div className="space-y-5 pb-20">
      <div className="border-b border-border/50 pb-4">
        <h1 className="text-3xl font-display font-bold text-white mb-1 flex items-center gap-2.5">
          <Trophy className="w-7 h-7 text-yellow-500" /> Hall of Fame
        </h1>
        <p className="text-sm text-muted-foreground">Milestones and accolades from your oceanic journey.</p>
      </div>

      {(!achievements || achievements.length === 0) ? (
        <div className="py-20 text-center glass-panel rounded-3xl border-dashed">
          <div className="w-20 h-20 bg-background/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
            <Trophy className="w-10 h-10 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-xl font-display font-bold text-foreground mb-2">No achievements yet</h3>
          <p className="text-muted-foreground">Keep exploring to earn your first accolade.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {achievements.map((achievement) => (
            <Card key={achievement.id} className="relative overflow-hidden group flex items-start gap-5">
              <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${achievement.unlockedAt ? 'bg-yellow-500 shadow-[0_0_15px_#eab308]' : 'bg-muted'} transition-all`} />
              
              <div className={`w-16 h-16 rounded-full shrink-0 flex items-center justify-center text-3xl border-2 ${achievement.unlockedAt ? 'bg-gradient-to-br from-yellow-500/20 to-amber-500/5 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'bg-background border-border opacity-50 grayscale'}`}>
                {achievement.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className={`text-lg font-display font-bold truncate ${achievement.unlockedAt ? 'text-white text-glow' : 'text-muted-foreground'}`}>
                    {achievement.title}
                  </h3>
                </div>
                
                <p className={`text-sm mb-3 ${achievement.unlockedAt ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                  {achievement.description}
                </p>
                
                <div className="flex flex-wrap items-center gap-2 mt-auto">
                  <Badge variant={categoryColors[achievement.category] || "default"} className="flex items-center gap-1.5">
                    {categoryIcons[achievement.category]} {achievement.category}
                  </Badge>
                  
                  {achievement.unlockedAt && (
                    <span className="text-xs font-medium text-yellow-500/80 ml-auto">
                      Unlocked {format(new Date(achievement.unlockedAt), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
