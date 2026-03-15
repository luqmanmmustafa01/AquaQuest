import { useState, useCallback, useEffect, useRef } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { Flame, Dumbbell, ChevronDown, ChevronUp, Check, RefreshCw, Sparkles, Moon, Trophy, Clock, Zap, History, Timer, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
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

type QuizForm = {
  age: string;
  height: string;
  weight: string;
  goal: string;
  experienceLevel: string;
  workoutDays: string[];
  liftingCapacity: string;
  injuries: string;
};

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

const GOAL_OPTIONS = ["Build Muscle", "Lose Weight", "Improve Endurance", "Get Stronger", "Improve Flexibility", "Stay Active"];
const EXP_OPTIONS = [
  { value: "beginner", label: "Beginner", desc: "< 1 year of training" },
  { value: "intermediate", label: "Intermediate", desc: "1–3 years of training" },
  { value: "advanced", label: "Advanced", desc: "3+ years of training" },
];
const WORKOUT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WORKOUT_DAYS_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const INJURY_CHIPS = ["Knee", "Shoulder", "Lower Back", "Wrist", "Hip", "Ankle", "Neck", "Elbow"];

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMuscleClass(m?: string) {
  return MUSCLE_COLORS[m ?? ""] ?? "text-primary bg-primary/10 border-primary/30";
}

function parseRestSeconds(rest: string): number {
  const m = rest.match(/(\d+)/);
  if (!m) return 60;
  const n = parseInt(m[1]);
  return rest.toLowerCase().includes("min") ? n * 60 : n;
}

function ExerciseCard({
  exercise, dayIndex, planId, logs, onToggle, onRegenerate, weight, onWeightChange,
}: {
  exercise: Exercise; dayIndex: number; planId: number;
  logs: { exerciseName: string; completed: boolean }[];
  onToggle: (name: string, completed: boolean) => void;
  onRegenerate: (name: string, muscleGroup?: string) => void;
  weight: string;
  onWeightChange: (name: string, weight: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [completedSets, setCompletedSets] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const done = logs.find((l) => l.exerciseName === exercise.name)?.completed ?? false;
  const totalSets = typeof exercise.sets === "number" ? exercise.sets : (parseInt(String(exercise.sets)) || 1);
  const isTimeBased = /second|minute|\bmin\b|\bsec\b|hold/i.test(exercise.reps ?? "");

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  useEffect(() => {
    if (done && completedSets < totalSets) setCompletedSets(totalSets);
    if (!done && completedSets >= totalSets) setCompletedSets(0);
  }, [done, totalSets]);

  const startRestTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const secs = parseRestSeconds(exercise.rest);
    setRestTimer(secs);
    timerRef.current = setInterval(() => {
      setRestTimer((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const skipTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestTimer(null);
  };

  const handleSetTap = (setIndex: number) => {
    if (setIndex < completedSets) {
      const newCompleted = setIndex;
      setCompletedSets(newCompleted);
      if (done) onToggle(exercise.name, false);
      skipTimer();
    } else if (setIndex === completedSets) {
      const newCompleted = setIndex + 1;
      setCompletedSets(newCompleted);
      if (newCompleted >= totalSets) onToggle(exercise.name, true);
      startRestTimer();
    }
  };

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
        {/* Per-set bubbles */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
          <div className="flex gap-1 flex-wrap justify-center">
            {Array.from({ length: totalSets }).map((_, i) => (
              <button
                key={i}
                onClick={() => handleSetTap(i)}
                className={cn(
                  "w-6 h-6 rounded-full border-2 text-[10px] font-bold flex items-center justify-center transition-all",
                  i < completedSets
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : i === completedSets
                    ? "border-primary text-primary hover:bg-primary/10"
                    : "border-border/40 text-muted-foreground/40 hover:border-border"
                )}
              >
                {i < completedSets ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">{completedSets}/{totalSets}</span>
        </div>

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

          {/* Rest timer */}
          <AnimatePresence>
            {restTimer !== null && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2 mt-2"
              >
                <Timer className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                <span className="text-teal-400 font-bold text-sm tabular-nums">Rest: {restTimer}s</span>
                <div className="flex-1 h-1 bg-border/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-400 rounded-full transition-all duration-1000"
                    style={{ width: `${(restTimer / parseRestSeconds(exercise.rest)) * 100}%` }}
                  />
                </div>
                <button onClick={skipTimer} className="text-[11px] text-muted-foreground hover:text-white transition-colors">skip</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Weight / Duration input */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {isTimeBased ? "Duration:" : "Weight used:"}
            </span>
            <Input
              className="h-6 w-28 text-xs px-2 bg-transparent border-border/30 text-white placeholder:text-muted-foreground/50"
              placeholder={isTimeBased ? "e.g. 45 sec" : "e.g. 50lbs"}
              value={weight}
              onChange={(e) => onWeightChange(exercise.name, e.target.value)}
            />
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

const QUIZ_STEPS = [
  { key: "age", title: "How old are you?", sub: null, optional: false },
  { key: "height", title: "What's your height?", sub: null, optional: false },
  { key: "weight", title: "What's your body weight?", sub: null, optional: false },
  { key: "goal", title: "What's your fitness goal?", sub: null, optional: false },
  { key: "experienceLevel", title: "What's your experience level?", sub: null, optional: false },
  { key: "workoutDays", title: "Which days do you want to train?", sub: "Optional – the AI will make all other days Rest days", optional: true },
  { key: "liftingCapacity", title: "What weights do you have access to?", sub: "Optional – helps the AI tailor exercises to your equipment", optional: true },
  { key: "injuries", title: "Any injuries or restrictions?", sub: "Optional – describe what to avoid and the AI will work around it", optional: true },
];

function ProfileQuiz({
  initialForm,
  onSave,
  onClose,
  saving,
}: {
  initialForm: QuizForm;
  onSave: (form: QuizForm) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<QuizForm>(initialForm);
  const total = QUIZ_STEPS.length;
  const current = QUIZ_STEPS[step];

  const canAdvance = () => {
    if (current.optional) return true;
    switch (step) {
      case 0: return form.age !== "" && !isNaN(Number(form.age)) && Number(form.age) > 0;
      case 1: return form.height.trim() !== "";
      case 2: return form.weight.trim() !== "";
      case 3: return form.goal.trim() !== "";
      case 4: return true;
      default: return true;
    }
  };

  const goNext = () => { if (step < total - 1) setStep((s) => s + 1); };
  const goBack = () => { if (step > 0) setStep((s) => s - 1); };

  const renderContent = () => {
    switch (step) {
      case 0:
        return (
          <Input
            type="number" autoFocus min={1} max={120}
            placeholder="e.g. 28"
            value={form.age}
            onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && canAdvance() && goNext()}
            className="text-center text-2xl h-14 bg-[#0A1628] border-primary/30 text-white"
          />
        );
      case 1:
        return (
          <Input
            autoFocus placeholder="5'10&quot; or 178cm"
            value={form.height}
            onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && canAdvance() && goNext()}
            className="text-center text-xl h-14 bg-[#0A1628] border-primary/30 text-white"
          />
        );
      case 2:
        return (
          <Input
            autoFocus placeholder="170lbs or 77kg"
            value={form.weight}
            onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && canAdvance() && goNext()}
            className="text-center text-xl h-14 bg-[#0A1628] border-primary/30 text-white"
          />
        );
      case 3:
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g}
                  onClick={() => { setForm((f) => ({ ...f, goal: g })); setTimeout(goNext, 180); }}
                  className={cn(
                    "p-3 rounded-xl border text-sm font-semibold transition-all text-left",
                    form.goal === g ? "border-primary bg-primary/20 text-white" : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-white"
                  )}
                >{g}</button>
              ))}
            </div>
            <Input
              placeholder="Or type your own goal..."
              value={GOAL_OPTIONS.includes(form.goal) ? "" : form.goal}
              onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
              className="bg-[#0A1628] border-border/30 text-sm text-white"
            />
          </div>
        );
      case 4:
        return (
          <div className="flex flex-col gap-3">
            {EXP_OPTIONS.map((e) => (
              <button
                key={e.value}
                onClick={() => { setForm((f) => ({ ...f, experienceLevel: e.value })); setTimeout(goNext, 180); }}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all",
                  form.experienceLevel === e.value
                    ? "border-primary bg-primary/20 shadow-[0_0_12px_rgba(14,116,144,0.3)]"
                    : "border-border/50 bg-card/50 hover:border-primary/40"
                )}
              >
                <div className="font-bold text-white">{e.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{e.desc}</div>
              </button>
            ))}
          </div>
        );
      case 5:
        return (
          <div>
            <div className="grid grid-cols-7 gap-1.5">
              {WORKOUT_DAYS.map((day, i) => (
                <button
                  key={day}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      workoutDays: f.workoutDays.includes(day)
                        ? f.workoutDays.filter((d) => d !== day)
                        : [...f.workoutDays, day],
                    }))
                  }
                  className={cn(
                    "py-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1",
                    form.workoutDays.includes(day)
                      ? "border-primary bg-primary/20 text-white shadow-[0_0_10px_rgba(14,116,144,0.25)]"
                      : "border-border/40 bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-white"
                  )}
                >
                  {WORKOUT_DAYS_ABBR[i]}
                </button>
              ))}
            </div>
            {form.workoutDays.length > 0 && (
              <p className="text-xs text-primary/80 mt-3 text-center">
                {form.workoutDays.length} training day{form.workoutDays.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>
        );
      case 6:
        return (
          <Input
            autoFocus
            placeholder="e.g. Dumbbells up to 50lbs, barbell, bodyweight only"
            value={form.liftingCapacity}
            onChange={(e) => setForm((f) => ({ ...f, liftingCapacity: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && goNext()}
            className="h-14 bg-[#0A1628] border-primary/30 text-white"
          />
        );
      case 7:
        return (
          <div className="space-y-3">
            <textarea
              autoFocus
              rows={4}
              placeholder={"e.g. Torn ACL in left knee – avoid deep squats and lunges; shoulder impingement – no overhead pressing"}
              value={form.injuries}
              onChange={(e) => setForm((f) => ({ ...f, injuries: e.target.value }))}
              className="w-full rounded-xl border border-primary/30 bg-[#0A1628] text-white px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
            />
            <div className="flex flex-wrap gap-1.5">
              {INJURY_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      injuries: f.injuries
                        ? f.injuries.trimEnd() + (f.injuries.endsWith(",") ? " " : ", ") + chip.toLowerCase()
                        : chip.toLowerCase(),
                    }))
                  }
                  className="text-xs px-3 py-1 rounded-lg border border-border/40 text-muted-foreground hover:border-primary/40 hover:text-white transition-colors"
                >
                  + {chip}
                </button>
              ))}
            </div>
            {form.injuries && (
              <div className="flex items-center gap-2 text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                The AI will avoid movements that aggravate these areas.
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-panel rounded-3xl p-7 w-full max-w-md border border-border/50"
      >
        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={cn("h-1 flex-1 rounded-full transition-all duration-300", i <= step ? "bg-primary" : "bg-border/40")}
            />
          ))}
        </div>

        {/* Step label */}
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          Step {step + 1} of {total}
          {current.optional && <span className="text-primary/60">(optional)</span>}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-1">{current.title}</h2>
        {current.sub && <p className="text-sm text-muted-foreground mb-5">{current.sub}</p>}
        {!current.sub && <div className="mb-5" />}

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
            className="min-h-[130px]"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 mt-7">
          <button
            onClick={step === 0 ? onClose : goBack}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border/50 text-muted-foreground hover:text-white hover:border-border transition-all text-sm font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < total - 1 ? (
            <button
              onClick={goNext}
              disabled={!canAdvance()}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm transition-all",
                canAdvance()
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-card/50 text-muted-foreground cursor-not-allowed"
              )}
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onSave(form)}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary to-teal-500 text-white font-bold transition-all hover:opacity-90"
            >
              {saving ? <Spinner className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Profile"}
            </button>
          )}
        </div>
      </motion.div>
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
  const [quizSaving, setQuizSaving] = useState(false);
  const [completionBanner, setCompletionBanner] = useState<null | { coins: number; gems: number; spinTickets: number; workoutStreak: number }>(null);
  const [quizForm, setQuizForm] = useState<QuizForm>({ age: "", height: "", weight: "", goal: "", experienceLevel: "beginner", workoutDays: [], liftingCapacity: "", injuries: "" });
  const [exerciseWeights, setExerciseWeights] = useState<Record<string, string>>({});

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

  const openProfileQuiz = () => {
    if (profile) {
      const p = profile as any;
      setQuizForm({
        age: String(p.age ?? ""),
        height: p.height ?? "",
        weight: p.weight ?? "",
        goal: p.goal ?? "",
        experienceLevel: p.experienceLevel ?? "beginner",
        workoutDays: Array.isArray(p.workoutDays) ? p.workoutDays : [],
        liftingCapacity: p.liftingCapacity ?? "",
        injuries: Array.isArray(p.injuries) ? p.injuries.join(", ") : (p.injuries ?? ""),
      });
    } else {
      setQuizForm({ age: "", height: "", weight: "", goal: "", experienceLevel: "beginner", workoutDays: [], liftingCapacity: "", injuries: "" });
    }
    setProfileOpen(true);
  };

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

  const handleSaveQuiz = async (form: QuizForm) => {
    setQuizSaving(true);
    try {
      await saveProfile({
        data: {
          age: parseInt(form.age),
          height: form.height,
          weight: form.weight,
          goal: form.goal,
          experienceLevel: form.experienceLevel as any,
          workoutDays: form.workoutDays,
          liftingCapacity: form.liftingCapacity || undefined,
          injuries: form.injuries ? [form.injuries] : [],
        } as any,
      });
      await queryClient.invalidateQueries({ queryKey: getGetWorkoutProfileQueryKey() });
      setProfileOpen(false);
    } catch { alert("Failed to save profile"); }
    finally { setQuizSaving(false); }
  };

  const handleWeightChange = useCallback((name: string, w: string) => {
    setExerciseWeights((prev) => ({ ...prev, [name]: w }));
  }, []);

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
            <button onClick={() => setCompletionBanner(null)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">✕</button>
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
          <Button variant="ghost" onClick={openProfileQuiz} className="gap-2">
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
          <Button onClick={openProfileQuiz}>Set Up Profile</Button>
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
                      weight={exerciseWeights[ex.name] ?? ""}
                      onWeightChange={handleWeightChange}
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

      {/* Quiz Modal */}
      {profileOpen && (
        <ProfileQuiz
          initialForm={quizForm}
          onSave={handleSaveQuiz}
          onClose={() => setProfileOpen(false)}
          saving={quizSaving}
        />
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
