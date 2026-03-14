import { useGetQuests, useGetCreatures, useGetAchievements } from "@workspace/api-client-react";
import { Card, Badge, Loader, Button } from "@/components/ui";
import { formatDepth, formatXP } from "@/lib/utils";
import { Trophy, Fish, Swords, Target, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: quests, isLoading: questsLoading } = useGetQuests();
  const { data: creatures, isLoading: creaturesLoading } = useGetCreatures();
  const { data: achievements, isLoading: achievementsLoading } = useGetAchievements();

  if (questsLoading || creaturesLoading || achievementsLoading) return <Loader />;

  const activeQuests = quests?.filter(q => q.status === 'active') || [];
  const completedQuests = quests?.filter(q => q.status === 'completed') || [];
  
  const totalXP = completedQuests.reduce((sum, q) => sum + q.xpReward, 0);
  const maxDepth = Math.max(0, ...completedQuests.map(q => q.depthLevel));

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border-primary/20 shadow-[0_0_40px_rgba(14,116,144,0.15)] group">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/deep-ocean-hero.png`} 
            alt="Deep Ocean Hero" 
            className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628] via-[#0A1628]/40 to-transparent" />
        </div>
        
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="max-w-xl">
            <Badge variant="purple" className="mb-4 animate-pulse">Status: Submerged</Badge>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4 leading-tight text-glow">
              Explore the <br/><span className="text-primary">Abyssal Depths</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Track your exploration, catalog mysterious sea creatures, and earn achievements as you dive deeper into the unknown.
            </p>
            <Link href="/quests" className="inline-block">
              <Button size="lg" className="w-full md:w-auto gap-2 group/btn">
                Dive In <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          
          {/* Stats widget floating on hero */}
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="bg-background/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <p className="text-3xl font-display font-bold text-white">{formatXP(totalXP)}</p>
              <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mt-1">Total XP</p>
            </div>
            <div className="bg-background/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-3">
                <Target className="w-6 h-6 text-accent" />
              </div>
              <p className="text-3xl font-display font-bold text-white">{formatDepth(maxDepth)}</p>
              <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mt-1">Max Depth</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Quests Panel */}
        <Card className="col-span-1 md:col-span-2 flex flex-col hover:border-primary/30 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold flex items-center gap-2">
              <Swords className="text-primary w-6 h-6" /> Active Quests
            </h2>
            <Link href="/quests" className="text-sm text-primary hover:underline font-medium flex items-center">
              View All
            </Link>
          </div>
          <div className="space-y-4 flex-1">
            {activeQuests.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background/30 rounded-xl border border-dashed border-border">
                <Swords className="w-12 h-12 text-muted-foreground mb-3 opacity-20" />
                <p className="text-muted-foreground">No active quests.</p>
                <Link href="/quests" className="mt-4 inline-block"><Button variant="secondary" size="sm">Start a Quest</Button></Link>
              </div>
            ) : (
              activeQuests.slice(0, 3).map(quest => (
                <div key={quest.id} className="p-4 rounded-xl bg-background/50 border border-border/50 hover:bg-background/80 transition-colors flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{quest.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{quest.description}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={quest.difficulty === 'hard' || quest.difficulty === 'legendary' ? 'danger' : 'default'}>
                      {quest.difficulty}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Discovery Summary */}
        <div className="space-y-6">
          <Card className="hover:border-primary/30 transition-colors duration-300">
            <h3 className="text-lg font-display font-bold flex items-center gap-2 mb-4">
              <Fish className="text-accent w-5 h-5" /> Recent Discoveries
            </h3>
            {creatures?.slice(0, 3).map(c => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <span className="text-2xl">{c.emoji}</span>
                <div>
                  <p className="font-medium text-sm text-white">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.species}</p>
                </div>
              </div>
            )) || <p className="text-sm text-muted-foreground">No discoveries yet.</p>}
          </Card>

          <Card className="hover:border-primary/30 transition-colors duration-300">
            <h3 className="text-lg font-display font-bold flex items-center gap-2 mb-4">
              <Trophy className="text-yellow-500 w-5 h-5" /> Top Achievements
            </h3>
            {achievements?.slice(0, 3).map(a => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p className="font-medium text-sm text-white">{a.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{a.category}</p>
                </div>
              </div>
            )) || <p className="text-sm text-muted-foreground">No achievements yet.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
