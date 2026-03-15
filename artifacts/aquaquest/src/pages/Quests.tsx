import { useState } from "react";
import { 
  useGetQuests, 
  useCreateQuest, 
  useUpdateQuest, 
  useDeleteQuest, 
  getGetQuestsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Badge, Button, Input, Textarea, Select, Label, Modal, Loader } from "@/components/ui";
import { formatXP } from "@/lib/utils";
import { Plus, Check, X, Trash2, Clock, CheckCircle2, XCircle, Target, Flame, BarChart3, Calendar } from "lucide-react";
import { format } from "date-fns";

type Category = "fitness" | "wellness" | "productivity";
type GoalType = "daily" | "weekly" | "long_term";

const CATEGORY_CONFIG: Record<Category, { label: string; color: string; bg: string; border: string }> = {
  fitness:      { label: "Fitness",      color: "#0E7490", bg: "rgba(14,116,144,0.15)", border: "rgba(14,116,144,0.4)" },
  wellness:     { label: "Wellness",     color: "#7C3AED", bg: "rgba(124,58,237,0.15)", border: "rgba(124,58,237,0.4)" },
  productivity: { label: "Productivity", color: "#D97706", bg: "rgba(217,119,6,0.15)",  border: "rgba(217,119,6,0.4)"  },
};

const DIFFICULTY_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "purple"> = {
  easy: "success", medium: "warning", hard: "danger", legendary: "purple",
};

const TYPE_LABELS: Record<GoalType, string> = {
  daily: "Daily", weekly: "Weekly", long_term: "Long-term",
};

export default function Goals() {
  const queryClient = useQueryClient();
  const { data: goals, isLoading } = useGetQuests();
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "failed">("active");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Category>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const createGoal = useCreateQuest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetQuestsQueryKey() });
        setIsCreateModalOpen(false);
      }
    }
  });

  const updateGoal = useUpdateQuest({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetQuestsQueryKey() })
    }
  });

  const deleteGoal = useDeleteQuest({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetQuestsQueryKey() })
    }
  });

  if (isLoading) return <Loader />;

  const allGoals = Array.isArray(goals) ? goals : [];

  const fitnessStreak = Math.max(...allGoals.filter(g => g.category === "fitness" && g.status === "active").map(g => g.streak), 0);
  const wellnessStreak = Math.max(...allGoals.filter(g => g.category === "wellness" && g.status === "active").map(g => g.streak), 0);
  const productivityStreak = Math.max(...allGoals.filter(g => g.category === "productivity" && g.status === "active").map(g => g.streak), 0);

  const filteredGoals = allGoals.filter(g => {
    const statusOk = filter === "all" || g.status === filter;
    const catOk = categoryFilter === "all" || g.category === categoryFilter;
    return statusOk && catOk;
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createGoal.mutate({
      data: {
        title:      fd.get("title") as string,
        description: (fd.get("description") as string) || undefined,
        difficulty: fd.get("difficulty") as any,
        xpReward:   Number(fd.get("xpReward")),
        category:   fd.get("category") as any,
        goalType:   fd.get("goalType") as any,
        targetDate: (fd.get("targetDate") as string) || undefined,
      }
    });
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1 flex items-center gap-2.5">
            <Target className="w-7 h-7 text-primary" /> Goals
          </h1>
          <p className="text-sm text-muted-foreground">Track your Fitness, Wellness, and Productivity goals.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="w-5 h-5" /> New Goal
        </Button>
      </div>

      {/* Streak counters */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { key: "fitness",      label: "Fitness",      streak: fitnessStreak,      color: "#0E7490" },
          { key: "wellness",     label: "Wellness",     streak: wellnessStreak,     color: "#7C3AED" },
          { key: "productivity", label: "Productivity", streak: productivityStreak, color: "#D97706" },
        ] as const).map(({ key, label, streak, color }) => (
          <div
            key={key}
            className="glass-panel rounded-xl px-4 py-2.5 flex items-center gap-3 border cursor-pointer transition-all hover:scale-[1.01]"
            style={{ borderColor: color + "44", background: color + "0d" }}
            onClick={() => setCategoryFilter(categoryFilter === key ? "all" : key)}
          >
            <Flame className="w-4 h-4 shrink-0" style={{ color }} />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold leading-none" style={{ color }}>{streak}</span>
                <span className="text-[10px] text-muted-foreground/60">day streak</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 p-1 bg-card/50 rounded-xl border border-border/50 backdrop-blur-md">
          {(["all", "active", "completed", "failed"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(14,116,144,0.3)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-card/50 rounded-xl border border-border/50 backdrop-blur-md">
          {(["all", "fitness", "wellness", "productivity"] as const).map(c => {
            const cfg = c === "all" ? null : CATEGORY_CONFIG[c];
            const active = categoryFilter === c;
            return (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className="px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
                style={active && cfg
                  ? { color: cfg.color, background: cfg.bg, boxShadow: `0 0 10px ${cfg.color}30` }
                  : active
                  ? { color: "white", background: "rgba(255,255,255,0.1)" }
                  : { color: "var(--muted-foreground)" }
                }
              >
                {c === "all" ? "All" : CATEGORY_CONFIG[c].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Goal cards */}
      {filteredGoals.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border-dashed">
          <div className="w-20 h-20 bg-background/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
            <Target className="w-10 h-10 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-xl font-display font-bold text-foreground mb-2">No goals found</h3>
          <p className="text-muted-foreground">Tap "New Goal" to start tracking your progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredGoals.map((goal) => {
            const cat = CATEGORY_CONFIG[(goal.category as Category) ?? "fitness"];
            const goalType = goal.goalType as GoalType;
            const streak = goal.streak;
            const progress = goal.progress;

            return (
              <Card key={goal.id} className="flex flex-col group relative overflow-hidden hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
                {/* Status bar */}
                <div className={`absolute top-0 left-0 w-full h-1 ${
                  goal.status === "completed" ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" :
                  goal.status === "failed"    ? "bg-rose-500 shadow-[0_0_10px_#f43f5e]" :
                  "bg-primary shadow-[0_0_10px_#0e7490]"
                }`} />

                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category badge */}
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg border"
                      style={{ color: cat.color, background: cat.bg, borderColor: cat.border }}
                    >
                      {cat.label}
                    </span>
                    {/* Difficulty badge */}
                    <Badge variant={DIFFICULTY_VARIANT[goal.difficulty] || "default"}>
                      {goal.difficulty}
                    </Badge>
                  </div>
                  {/* Type badge */}
                  <span className="text-[10px] font-semibold text-muted-foreground/70 bg-white/5 px-2 py-1 rounded-md border border-border/30">
                    {TYPE_LABELS[goalType] ?? goalType}
                  </span>
                </div>

                <h3 className="text-xl font-display font-bold text-white mb-2 group-hover:text-primary transition-colors">
                  {goal.title}
                </h3>
                {goal.description && (
                  <p className="text-muted-foreground text-sm flex-1 mb-4">{goal.description}</p>
                )}

                {/* Progress bar for long-term goals */}
                {goalType === "long_term" && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" /> Progress
                      </span>
                      <span className="font-semibold" style={{ color: cat.color }}>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%`, background: cat.color }}
                      />
                    </div>
                  </div>
                )}

                {/* Streak counter for daily/weekly goals */}
                {(goalType === "daily" || goalType === "weekly") && (
                  <div className="mb-4 flex items-center gap-2">
                    <Flame className="w-4 h-4" style={{ color: cat.color }} />
                    <span className="text-sm font-semibold" style={{ color: cat.color }}>{streak}</span>
                    <span className="text-xs text-muted-foreground">day streak</span>
                  </div>
                )}

                {/* Target date */}
                {goal.targetDate && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                    <Calendar className="w-3 h-3" />
                    <span>Due {format(new Date(goal.targetDate), "MMM d, yyyy")}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-auto">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">XP Reward</span>
                    <span className="font-bold text-yellow-500 text-glow">{formatXP(goal.xpReward)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {goal.status === "active" && (
                      <>
                        <Button
                          size="icon" variant="ghost"
                          className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20"
                          onClick={() => updateGoal.mutate({ id: goal.id, data: { status: "completed" } })}
                          title="Mark Completed"
                        >
                          <Check className="w-5 h-5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
                          onClick={() => updateGoal.mutate({ id: goal.id, data: { status: "failed" } })}
                          title="Mark Failed"
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                    {(goal.status === "completed" || goal.status === "failed") && (
                      <div className="px-3 py-1 rounded-full bg-background flex items-center gap-2 text-sm font-medium border border-border">
                        {goal.status === "completed"
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          : <XCircle className="w-4 h-4 text-rose-500" />}
                        <span className="capitalize">{goal.status}</span>
                      </div>
                    )}
                    <Button
                      size="icon" variant="ghost"
                      className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => { if (confirm("Delete this goal?")) deleteGoal.mutate({ id: goal.id }); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 text-[10px] text-muted-foreground/50 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Added {format(new Date(goal.createdAt), "MMM d, yyyy")}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="New Goal">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <Label htmlFor="title">Goal Title</Label>
            <Input id="title" name="title" required placeholder="e.g. Run 5km every day" />
          </div>
          <div>
            <Label htmlFor="description">Description <span className="text-muted-foreground/60 font-normal">(optional)</span></Label>
            <Textarea id="description" name="description" placeholder="What does completing this goal look like?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select id="category" name="category" required>
                <option value="fitness">Fitness</option>
                <option value="wellness">Wellness</option>
                <option value="productivity">Productivity</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="goalType">Type</Label>
              <Select id="goalType" name="goalType" required>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="long_term">Long-term</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select id="difficulty" name="difficulty" required>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="legendary">Legendary</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="xpReward">XP Reward</Label>
              <Input id="xpReward" name="xpReward" type="number" required min="10" defaultValue="100" placeholder="e.g. 150" />
            </div>
          </div>
          <div>
            <Label htmlFor="targetDate">Target Date <span className="text-muted-foreground/60 font-normal">(optional)</span></Label>
            <Input id="targetDate" name="targetDate" type="date" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createGoal.isPending}>Create Goal</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
