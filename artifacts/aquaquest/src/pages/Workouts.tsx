import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetWorkoutProfile,
  useSaveWorkoutProfile,
  useGenerateWorkoutPlan,
  useGetWorkoutPlans,
  useLogExercise,
  useGetWorkoutLogs,
  getGetWorkoutProfileQueryKey,
  getGetWorkoutPlansQueryKey,
  getGetWorkoutLogsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Flame, Dumbbell, ChevronDown, ChevronUp, Check, RefreshCw, Sparkles, Moon, Trophy, Clock, Zap, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

type Exercise = {
  name: string;
  muscleGroup?: string;
  sets: number;
  reps: string;
  rest: string;
  formGuide?: string[];
  notes?: string;
};

type WorkoutDay = { day: string; focus: string; exercises: Exercise[] };

const MUSCLE_COLORS: Record<string, string> = {
  Chest: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  Back: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  Shoulders: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  Biceps: "text-green-400 bg-green-400/10 border-green-400/30",
  Triceps: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  Legs: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  Core: "text-teal-400 bg-teal-400/10 border-teal-400/30",
  Glutes: "text-pink-400 bg-pink-400/10 border-pink-400/30",
  Cardio: "text-red-400 bg-red-400/10 border-red-400/30",
};

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMuscleClass(m?: string) {
  return MUSCLE_COLORS[m ?? ""] ?? "text-primary bg-primary/10 border-primary/30";
}

function ExerciseCard({
  exercise, dayIndex, planId, logs, onToggle, onRegenerate,
}: {
  exercise: Exercise; dayIndex: number; planId: number;
  logs: { exerciseName: string; completed: boolean }[];
  onToggle: (name: string, completed: boolean) => void;
  onRegenerate: (name: string, muscleGroup?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const done = logs.find((l) => l.exerciseName === exercise.name)?.completed ?? false;

  const handleRegen = async () => {
    setRegenerating(true);
    await onRegenerate(exercise.name, exercise.muscleGroup);
    setRegenerating(false);
  };

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-200",
      done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/50 bg-card/60 hover:border-primary/30"
    )}>
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(exercise.name, !done)}
          className={cn(
            "w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
            done ? "bg-emerald-500 border-emerald-500" : "border-border hover:border-primary"
          )}
        >
          {done && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h4 className={cn("font-bold text-base", done ? "line-through text-muted-foreground" : "text-white")}>
              {exercise.name}
            </h4>
            <div className="flex items-center gap-2">
              {exercise.muscleGroup && (
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-md border", getMuscleClass(exercise.muscleGroup))}>
                  {exercise.muscleGroup}
                </span>
              )}
              <button
                onClick={handleRegen}
                disabled={regenerating}
                title="Regenerate this exercise"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", regenerating && "animate-spin")} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-1.5 text-xs">
            <span className="text-blue-300 font-semibold">{exercise.sets} sets × {exercise.reps}</span>
            <span className="text-muted-foreground">{exercise.rest} rest</span>
          </div>

          {exercise.notes && !expanded && (
            <p className="text-xs text-muted-foreground/70 mt-1 italic">{exercise.notes}</p>
          )}
        </div>

        {exercise.formGuide && exercise.formGuide.length > 0 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && exercise.formGuide && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/30"
          >
            <div className="px-4 py-3 bg-background/30">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Form Guide</p>
              <ol className="space-y-1.5">
                {exercise.formGuide.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-muted-foreground">
                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              {exercise.notes && (
                <p className="text-xs text-muted-foreground/70 mt-2 italic border-t border-border/20 pt-2">{exercise.notes}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Workouts() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"plan" | "history">("plan");
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const d = new Date().getDay();
    return (d + 6) % 7;
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [completionBanner, setCompletionBanner] = useState<null | { coins: number; gems: number; spinTickets: number; workoutStreak: number }>(null);
  const [form, setForm] = useState({ age: "", height: "", weight: "", goal: "", experienceLevel: "beginner" });

  const { data: profile, isLoading: profileLoading } = useGetWorkoutProfile({ query: { retry: false } });
  const { data: plans } = useGetWorkoutPlans();
  const latestPlan = Array.isArray(plans) && plans.length > 0 ? plans[plans.length - 1] : null;
  const { data: logs, refetch: refetchLogs } = useGetWorkoutLogs(
    latestPlan?.id ?? 0, { query: { enabled: !!latestPlan } }
  );

  const { mutateAsync: saveProfile } = useSaveWorkoutProfile();
  const { mutateAsync: generatePlan } = useGenerateWorkoutPlan();
  const { mutateAsync: logExercise } = useLogExercise();

  const [completions, setCompletions] = useState<{ planId: number; dayIndex: number; dayName: string | null; dayFocus: string | null; exercisesCompleted: number; completedAt: string }[]>([]);
  const [planData, setPlanData] = useState<WorkoutDay[] | null>(null);

  useEffect(() => {
    if (latestPlan) {
      setPlanData(latestPlan.plan as WorkoutDay[]);
      fetchCompletions();
    }
  }, [latestPlan?.id]);

  const fetchCompletions = async () => {
    try {
      const res = await fetch(`${BASE}/api/workouts/completions`);
      if (res.ok) setCompletions(await res.json());
    } catch { }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generatePlan({});
      setPlanData(result.plan as WorkoutDay[]);
      await queryClient.invalidateQueries({ queryKey: getGetWorkoutPlansQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetWorkoutLogsQueryKey(latestPlan?.id ?? 0) });
      setSelectedDay((new Date().getDay() + 6) % 7);
    } catch { alert("Failed to generate plan. Please try again."); }
    finally { setGenerating(false); }
  };

  const handleToggle = async (exerciseName: string, completed: boolean) => {
    if (!latestPlan) return;
    await logExercise({ data: { workoutPlanId: latestPlan.id, dayIndex: selectedDay, exerciseName, completed } });
    await refetchLogs();
  };

  const handleCompleteDay = async () => {
    if (!latestPlan || !planData) return;
    const day = planData[selectedDay];
    try {
      const res = await fetch(`${BASE}/api/workouts/complete-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: latestPlan.id, dayIndex: selectedDay,
          dayName: day.day, dayFocus: day.focus,
          exercisesCompleted: day.exercises.length,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.alreadyCompleted) setCompletionBanner(data);
        await fetchCompletions();
        await queryClient.invalidateQueries({ queryKey: getGetWorkoutProfileQueryKey() });
      }
    } catch { }
  };

  const handleRegenerate = async (exerciseName: string, muscleGroup?: string) => {
    if (!latestPlan || !planData) return;
    const day = planData[selectedDay];
    try {
      const res = await fetch(`${BASE}/api/workouts/regenerate-exercise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: latestPlan.id, dayIndex: selectedDay, exerciseName, muscleGroup, dayFocus: day.focus }),
      });
      if (res.ok) {
        const data = await res.json();
        const newPlan = planData.map((d, i) =>
          i === selectedDay ? { ...d, exercises: d.exercises.map((ex) => ex.name === exerciseName ? { ...data.exercise } : ex) } : d
        );
        setPlanData(newPlan);
        await queryClient.invalidateQueries({ queryKey: getGetWorkoutPlansQueryKey() });
      }
    } catch { }
  };

  const handleSaveProfile = async () => {
    try {
      await saveProfile({ data: { age: parseInt(form.age), height: form.height, weight: form.weight, goal: form.goal, experienceLevel: form.experienceLevel as any } });
      await queryClient.invalidateQueries({ queryKey: getGetWorkoutProfileQueryKey() });
      setProfileOpen(false);
    } catch { alert("Failed to save profile"); }
  };

  if (profileLoading) return <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8 text-primary" /></div>;

  const allLogs = Array.isArray(logs) ? logs : [];
  const dayLogs = allLogs.filter((l) => l.dayIndex === selectedDay);
  const currentDay = planData?.[selectedDay];
  const isRestDay = !currentDay || currentDay.exercises.length === 0 || currentDay.focus.toLowerCase().includes("rest");
  const allChecked = !isRestDay && currentDay!.exercises.length > 0 &&
    currentDay!.exercises.every((ex) => dayLogs.find((l) => l.exerciseName === ex.name)?.completed);
  const isDayCompleted = (idx: number) => completions.some((c) => c.planId === latestPlan?.id && c.dayIndex === idx);
  const isCurrentPlanDayCompleted = isDayCompleted(selectedDay);
  const streak = (profile as any)?.workoutStreak ?? 0;
  const today = (new Date().getDay() + 6) % 7;

  return (
    <div className="space-y-8 pb-20">
      {/* Completion Banner */}
      <AnimatePresence>
        {completionBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 glass-panel rounded-2xl p-5 border border-primary/40 shadow-[0_0_30px_rgba(14,116,144,0.4)] max-w-xs"
          >
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="font-bold text-white mb-1">Workout Complete!</h3>
              <div className="flex justify-center gap-4 text-sm mt-2">
                <span className="text-yellow-500 font-bold">+200 XP</span>
                <span className="text-yellow-400 font-bold">🪙 +50</span>
                <span className="text-blue-400 font-bold">💎 +3</span>
                <span className="text-purple-400 font-bold">🎟️ +2</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">Streak: {completionBanner.workoutStreak} days 🔥</div>
            </div>
            <button onClick={() => setCompletionBanner(null)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2 flex items-center gap-3">
            <Dumbbell className="w-8 h-8 text-primary" /> Workouts
          </h1>
          <p className="text-muted-foreground">AI-powered personalized training plans.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => { if (profile) setForm({ age: String((profile as any).age), height: (profile as any).height, weight: (profile as any).weight, goal: (profile as any).goal, experienceLevel: (profile as any).experienceLevel }); setProfileOpen(true); }} className="gap-2">
            Profile
          </Button>
          {profile && (
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? <Spinner className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />} {latestPlan ? "Regenerate Plan" : "Generate Plan"}
            </Button>
          )}
        </div>
      </div>

      {/* Streak + Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 glass-panel rounded-2xl px-5 py-3 border border-primary/20">
          <Flame className="w-6 h-6 text-orange-400" />
          <div>
            <div className="text-2xl font-bold text-orange-400">{streak}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Day Streak</div>
          </div>
        </div>
        <div className="flex gap-1 p-1 bg-card/50 rounded-xl border border-border/50">
          {(["plan", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn("px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all flex items-center gap-2", tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}
            >
              {t === "history" ? <History className="w-3.5 h-3.5" /> : <Dumbbell className="w-3.5 h-3.5" />}
              {t === "plan" ? "Workout Plan" : "History"}
            </button>
          ))}
        </div>
      </div>

      {tab === "history" ? (
        <HistoryTab completions={completions} />
      ) : !profile ? (
        <div className="py-20 text-center glass-panel rounded-3xl border-dashed">
          <Dumbbell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Set Up Your Profile</h3>
          <p className="text-muted-foreground mb-6">Tell us about yourself so we can generate a personalized 7-day AI workout plan.</p>
          <Button onClick={() => setProfileOpen(true)}>Set Up Profile</Button>
        </div>
      ) : !planData ? (
        <div className="py-20 text-center glass-panel rounded-3xl border-dashed">
          <Sparkles className="w-12 h-12 text-primary/50 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Ready to Train?</h3>
          <p className="text-muted-foreground mb-6">Generate your personalized 7-day AI workout plan.</p>
          <Button onClick={handleGenerate} disabled={generating}>{generating ? <Spinner className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}Generate Workout Plan</Button>
        </div>
      ) : (
        <>
          {/* 7-Day Card Row */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {planData.map((day, idx) => {
              const isRest = day.exercises.length === 0 || day.focus.toLowerCase().includes("rest");
              const isToday = idx === today;
              const isSelected = idx === selectedDay;
              const completed = isDayCompleted(idx);
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(idx)}
                  className={cn(
                    "flex-shrink-0 w-16 flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all duration-200",
                    isSelected && !isToday ? "border-primary/60 bg-primary/10 shadow-[0_0_12px_rgba(14,116,144,0.3)]" :
                    isToday ? "border-primary bg-primary/20 shadow-[0_0_20px_rgba(14,116,144,0.5)] ring-2 ring-primary/30" :
                    "border-border/40 bg-card/40 hover:border-primary/30 hover:bg-primary/5"
                  )}
                >
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", isToday || isSelected ? "text-primary" : "text-muted-foreground")}>
                    {DAY_ABBR[idx]}
                  </span>
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", isToday ? "bg-primary" : "bg-white/5")}>
                    {completed ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : isRest ? (
                      <Moon className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Dumbbell className={cn("w-4 h-4", isToday ? "text-white" : "text-muted-foreground")} />
                    )}
                  </div>
                  <span className={cn("text-[9px] text-center leading-tight px-1", isToday || isSelected ? "text-primary" : "text-muted-foreground/60")}>
                    {isRest ? "Rest" : day.focus.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Day */}
          {currentDay && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{currentDay.day}</h2>
                  <p className="text-muted-foreground">{currentDay.focus}</p>
                </div>
                {!isRestDay && (
                  <div className="text-sm text-muted-foreground">
                    {dayLogs.filter((l) => l.completed).length}/{currentDay.exercises.length} done
                  </div>
                )}
              </div>

              {isRestDay ? (
                <div className="glass-panel rounded-2xl p-8 text-center border-border/30">
                  <Moon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-white font-semibold">Rest Day</p>
                  <p className="text-muted-foreground text-sm mt-1">Recovery is part of the plan. Stay hydrated!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentDay.exercises.map((ex) => (
                    <ExerciseCard
                      key={ex.name}
                      exercise={ex}
                      dayIndex={selectedDay}
                      planId={latestPlan!.id}
                      logs={dayLogs}
                      onToggle={handleToggle}
                      onRegenerate={handleRegenerate}
                    />
                  ))}

                  {allChecked && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <button
                        onClick={handleCompleteDay}
                        disabled={isCurrentPlanDayCompleted}
                        className={cn(
                          "w-full py-4 rounded-2xl font-bold text-lg transition-all",
                          isCurrentPlanDayCompleted
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                            : "bg-gradient-to-r from-primary to-teal-500 text-white shadow-[0_0_20px_rgba(14,116,144,0.5)] hover:shadow-[0_0_30px_rgba(14,116,144,0.7)] hover:scale-[1.01] active:scale-[0.99]"
                        )}
                      >
                        {isCurrentPlanDayCompleted ? (
                          <span className="flex items-center justify-center gap-2">
                            <Trophy className="w-5 h-5" /> Day Completed!
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Zap className="w-5 h-5" /> Complete Workout — +200 XP 🪙+50 💎+3 🎟️+2
                          </span>
                        )}
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Profile Modal */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-3xl p-6 w-full max-w-md border border-border/50 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Your Profile</h2>
              <button onClick={() => setProfileOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div><Label>Age</Label><Input value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} type="number" placeholder="28" /></div>
              <div><Label>Height</Label><Input value={form.height} onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))} placeholder="5'10&quot; or 178cm" /></div>
              <div><Label>Weight</Label><Input value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} placeholder="170lbs or 77kg" /></div>
              <div><Label>Fitness Goal</Label><Input value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} placeholder="Build muscle, Lose weight..." /></div>
              <div>
                <Label>Experience Level</Label>
                <select
                  value={form.experienceLevel}
                  onChange={(e) => setForm((f) => ({ ...f, experienceLevel: e.target.value }))}
                  className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setProfileOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveProfile}>Save Profile</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ completions }: { completions: { id?: number; planId: number; dayIndex: number; dayName: string | null; dayFocus: string | null; exercisesCompleted: number; completedAt: string }[] }) {
  if (completions.length === 0) {
    return (
      <div className="py-20 text-center glass-panel rounded-3xl border-dashed">
        <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No completed workouts yet</h3>
        <p className="text-muted-foreground">Complete a workout day to see your history here.</p>
      </div>
    );
  }

  const sorted = [...completions].reverse();

  return (
    <div className="space-y-3">
      {sorted.map((c, i) => (
        <div key={c.id ?? i} className="glass-panel rounded-2xl p-4 border border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-bold text-white">{c.dayName ?? `Day ${c.dayIndex + 1}`}</h4>
              <p className="text-sm text-muted-foreground">{c.dayFocus}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Dumbbell className="w-3.5 h-3.5" />{c.exercisesCompleted} exercises
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 mt-0.5">
              <Clock className="w-3 h-3" />{format(new Date(c.completedAt), "MMM d, yyyy · h:mm a")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
