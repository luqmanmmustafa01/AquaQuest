import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import {
  useGetWorkoutProfile,
  useSaveWorkoutProfile,
  useGenerateWorkoutPlan,
  useGetWorkoutPlans,
  useLogExercise,
  useGetWorkoutLogs,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";

const _rawDomain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const BASE_URL = _rawDomain
  ? _rawDomain.startsWith("http") ? _rawDomain : `https://${_rawDomain}`
  : "";
const isIOS = Platform.OS === "ios";

type ExperienceLevel = "beginner" | "intermediate" | "advanced";

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

type Completion = {
  id: number;
  planId: number;
  dayIndex: number;
  dayName: string | null;
  dayFocus: string | null;
  exercisesCompleted: number;
  completedAt: string;
};

type QuizForm = {
  age: string;
  height: string;
  weight: string;
  goal: string;
  experienceLevel: ExperienceLevel;
  liftingCapacity: string;
  injuries: string[];
};

const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const GOAL_OPTIONS = ["Build Muscle", "Lose Weight", "Improve Endurance", "Get Stronger", "Improve Flexibility", "Stay Active"];
const EXP_OPTIONS: { value: ExperienceLevel; label: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", desc: "< 1 year of training" },
  { value: "intermediate", label: "Intermediate", desc: "1–3 years of training" },
  { value: "advanced", label: "Advanced", desc: "3+ years of training" },
];
const INJURY_OPTIONS = ["Knee", "Shoulder", "Lower Back", "Wrist", "Hip", "Ankle", "Neck", "Elbow"];

const MUSCLE_COLORS: Record<string, string> = {
  Chest: "#3B82F6", Back: "#A855F7", Shoulders: "#F59E0B",
  Biceps: "#22C88A", Triceps: "#10B981", Legs: "#F97316",
  Core: "#0E7490", Glutes: "#EC4899", Cardio: "#EF4444",
};

function getMuscleColor(m?: string): string {
  return MUSCLE_COLORS[m ?? ""] ?? Colors.teal;
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
  exercise: Exercise;
  dayIndex: number;
  planId: number;
  logs: { exerciseName: string; completed: boolean }[];
  onToggle: (name: string, completed: boolean) => void;
  onRegenerate: (name: string, muscleGroup?: string) => void;
  weight: string;
  onWeightChange: (name: string, weight: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerProgress = useRef(new Animated.Value(1)).current;
  const done = logs.find((l) => l.exerciseName === exercise.name)?.completed ?? false;
  const mc = getMuscleColor(exercise.muscleGroup);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startRestTimer = (totalSecs: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestTimer(totalSecs);
    timerProgress.setValue(1);
    Animated.timing(timerProgress, { toValue: 0, duration: totalSecs * 1000, useNativeDriver: false }).start();
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
    timerProgress.stopAnimation();
    setRestTimer(null);
  };

  const handleRegen = async () => {
    setRegenerating(true);
    await onRegenerate(exercise.name, exercise.muscleGroup);
    setRegenerating(false);
  };

  const handleToggle = (name: string, completed: boolean) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    onToggle(name, completed);
    if (completed) startRestTimer(parseRestSeconds(exercise.rest));
    else skipTimer();
  };

  return (
    <View style={[styles.exCard, done && styles.exCardDone]}>
      <View style={styles.exCardTop}>
        <Pressable
          style={[styles.exCheckbox, done && { backgroundColor: Colors.success, borderColor: Colors.success }]}
          onPress={() => handleToggle(exercise.name, !done)}
        >
          {done && (isIOS
            ? <SymbolView name="checkmark" size={11} tintColor={Colors.navy} />
            : <Ionicons name="checkmark" size={11} color={Colors.navy} />
          )}
        </Pressable>

        <View style={styles.exInfo}>
          <Text style={[styles.exName, done && styles.exNameDone]}>{exercise.name}</Text>
          <View style={styles.exMeta}>
            <Text style={styles.exReps}>{exercise.sets} × {exercise.reps}</Text>
            <Text style={styles.exRest}>• {exercise.rest} rest</Text>
          </View>

          {/* Rest timer */}
          {restTimer !== null && (
            <View style={styles.restTimerRow}>
              <Ionicons name="timer-outline" size={13} color={Colors.teal} />
              <Text style={styles.restTimerText}>Rest: {restTimer}s</Text>
              <View style={styles.restTimerBar}>
                <Animated.View style={[styles.restTimerFill, { width: timerProgress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) as any }]} />
              </View>
              <Pressable onPress={skipTimer}>
                <Text style={styles.skipText}>skip</Text>
              </Pressable>
            </View>
          )}

          {/* Weight input */}
          <View style={styles.weightRow}>
            <Text style={styles.weightLabel}>Weight used:</Text>
            <TextInput
              style={styles.weightInput}
              placeholder="e.g. 50lbs"
              placeholderTextColor={Colors.textDim}
              value={weight}
              onChangeText={(v) => onWeightChange(exercise.name, v)}
            />
          </View>
        </View>

        <View style={styles.exActions}>
          {exercise.muscleGroup && (
            <View style={[styles.muscleTag, { borderColor: mc + "55", backgroundColor: mc + "18" }]}>
              <Text style={[styles.muscleTagText, { color: mc }]}>{exercise.muscleGroup}</Text>
            </View>
          )}
          <Pressable onPress={handleRegen} disabled={regenerating} style={styles.regenIconBtn}>
            {regenerating
              ? <ActivityIndicator size={12} color={Colors.teal} />
              : (isIOS
                ? <SymbolView name="arrow.clockwise" size={13} tintColor={Colors.textDim} />
                : <Ionicons name="refresh" size={13} color={Colors.textDim} />
              )}
          </Pressable>
          {Array.isArray(exercise.formGuide) && exercise.formGuide.length > 0 && (
            <Pressable onPress={() => setExpanded((e) => !e)} style={styles.expandBtn}>
              {isIOS
                ? <SymbolView name={expanded ? "chevron.up" : "chevron.down"} size={13} tintColor={Colors.textDim} />
                : <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={13} color={Colors.textDim} />
              }
            </Pressable>
          )}
        </View>
      </View>

      {expanded && Array.isArray(exercise.formGuide) && exercise.formGuide.length > 0 && (
        <View style={styles.formGuide}>
          <Text style={styles.formGuideTitle}>Form Guide</Text>
          {exercise.formGuide.map((step, i) => (
            <View key={i} style={styles.formStep}>
              <View style={styles.formStepNum}>
                <Text style={styles.formStepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.formStepText}>{step}</Text>
            </View>
          ))}
          {exercise.notes && <Text style={styles.formNotes}>{exercise.notes}</Text>}
        </View>
      )}
    </View>
  );
}

const QUIZ_STEPS = [
  { key: "age", title: "How old are you?", sub: null as string | null, optional: false },
  { key: "height", title: "What's your height?", sub: null, optional: false },
  { key: "weight", title: "What's your body weight?", sub: null, optional: false },
  { key: "goal", title: "What's your fitness goal?", sub: null, optional: false },
  { key: "experienceLevel", title: "What's your experience level?", sub: null, optional: false },
  { key: "liftingCapacity", title: "What weights do you have access to?", sub: "Optional – helps the AI tailor exercises", optional: true },
  { key: "injuries", title: "Any injuries or restrictions?", sub: "Optional – these areas will be avoided", optional: true },
];

function ProfileQuiz({
  visible,
  initialForm,
  onSave,
  onClose,
  saving,
}: {
  visible: boolean;
  initialForm: QuizForm;
  onSave: (form: QuizForm) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<QuizForm>(initialForm);
  const total = QUIZ_STEPS.length;
  const current = QUIZ_STEPS[step];

  useEffect(() => {
    if (visible) { setStep(0); setForm(initialForm); }
  }, [visible]);

  const canAdvance = () => {
    if (current.optional) return true;
    switch (step) {
      case 0: return form.age !== "" && !isNaN(Number(form.age)) && Number(form.age) > 0;
      case 1: return form.height.trim() !== "";
      case 2: return form.weight.trim() !== "";
      case 3: return form.goal.trim() !== "";
      default: return true;
    }
  };

  const goNext = () => { if (step < total - 1) setStep((s) => s + 1); };
  const goBack = () => { if (step > 0) setStep((s) => s - 1); };

  const toggleInjury = (inj: string) => {
    setForm((f) => ({
      ...f,
      injuries: f.injuries.includes(inj) ? f.injuries.filter((i) => i !== inj) : [...f.injuries, inj],
    }));
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <TextInput
            style={[styles.quizInput, { textAlign: "center", fontSize: 28 }]}
            placeholder="e.g. 28"
            placeholderTextColor={Colors.textDim}
            keyboardType="numeric"
            value={form.age}
            onChangeText={(v) => setForm((f) => ({ ...f, age: v }))}
            autoFocus
          />
        );
      case 1:
        return (
          <TextInput
            style={[styles.quizInput, { textAlign: "center", fontSize: 20 }]}
            placeholder={"5'10\" or 178cm"}
            placeholderTextColor={Colors.textDim}
            value={form.height}
            onChangeText={(v) => setForm((f) => ({ ...f, height: v }))}
            autoFocus
          />
        );
      case 2:
        return (
          <TextInput
            style={[styles.quizInput, { textAlign: "center", fontSize: 20 }]}
            placeholder="170lbs or 77kg"
            placeholderTextColor={Colors.textDim}
            value={form.weight}
            onChangeText={(v) => setForm((f) => ({ ...f, weight: v }))}
            autoFocus
          />
        );
      case 3:
        return (
          <View>
            <View style={styles.goalGrid}>
              {GOAL_OPTIONS.map((g) => (
                <Pressable
                  key={g}
                  style={[styles.goalBtn, form.goal === g && styles.goalBtnActive]}
                  onPress={() => { setForm((f) => ({ ...f, goal: g })); setTimeout(goNext, 180); }}
                >
                  <Text style={[styles.goalBtnText, form.goal === g && styles.goalBtnTextActive]}>{g}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.quizInput, { marginTop: 10, fontSize: 14 }]}
              placeholder="Or type your own goal..."
              placeholderTextColor={Colors.textDim}
              value={GOAL_OPTIONS.includes(form.goal) ? "" : form.goal}
              onChangeText={(v) => setForm((f) => ({ ...f, goal: v }))}
            />
          </View>
        );
      case 4:
        return (
          <View style={{ gap: 10 }}>
            {EXP_OPTIONS.map((e) => (
              <Pressable
                key={e.value}
                style={[styles.expBtn, form.experienceLevel === e.value && styles.expBtnActive]}
                onPress={() => { setForm((f) => ({ ...f, experienceLevel: e.value })); setTimeout(goNext, 180); }}
              >
                <Text style={[styles.expBtnLabel, form.experienceLevel === e.value && { color: Colors.white }]}>{e.label}</Text>
                <Text style={styles.expBtnDesc}>{e.desc}</Text>
              </Pressable>
            ))}
          </View>
        );
      case 5:
        return (
          <TextInput
            style={[styles.quizInput, { fontSize: 14 }]}
            placeholder="e.g. Dumbbells up to 50lbs, barbell, bodyweight"
            placeholderTextColor={Colors.textDim}
            value={form.liftingCapacity}
            onChangeText={(v) => setForm((f) => ({ ...f, liftingCapacity: v }))}
            autoFocus
          />
        );
      case 6:
        return (
          <View>
            <View style={styles.injuryGrid}>
              {INJURY_OPTIONS.map((inj) => (
                <Pressable
                  key={inj}
                  style={[styles.injuryBtn, form.injuries.includes(inj) && styles.injuryBtnActive]}
                  onPress={() => toggleInjury(inj)}
                >
                  <Text style={[styles.injuryBtnText, form.injuries.includes(inj) && styles.injuryBtnTextActive]}>{inj}</Text>
                </Pressable>
              ))}
            </View>
            {form.injuries.length > 0 && (
              <View style={styles.injuryNote}>
                <Ionicons name="warning-outline" size={13} color="#F59E0B" />
                <Text style={styles.injuryNoteText}>AI will avoid: {form.injuries.join(", ")}</Text>
              </View>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.quizOverlay}>
        <View style={styles.quizCard}>
          {/* Progress dots */}
          <View style={styles.quizProgress}>
            {Array.from({ length: total }).map((_, i) => (
              <View key={i} style={[styles.quizDot, i <= step && styles.quizDotActive]} />
            ))}
          </View>

          {/* Step label */}
          <Text style={styles.quizStepLabel}>
            Step {step + 1} of {total}{current.optional ? " (optional)" : ""}
          </Text>

          {/* Title */}
          <Text style={styles.quizTitle}>{current.title}</Text>
          {current.sub && <Text style={styles.quizSub}>{current.sub}</Text>}

          {/* Content */}
          <View style={styles.quizContent}>{renderStepContent()}</View>

          {/* Navigation */}
          <View style={styles.quizNav}>
            <Pressable style={styles.quizBackBtn} onPress={step === 0 ? onClose : goBack}>
              <Ionicons name="arrow-back" size={16} color={Colors.textDim} />
              <Text style={styles.quizBackText}>{step === 0 ? "Cancel" : "Back"}</Text>
            </Pressable>
            {step < total - 1 ? (
              <Pressable
                style={[styles.quizNextBtn, !canAdvance() && { opacity: 0.4 }]}
                onPress={goNext}
                disabled={!canAdvance()}
              >
                <Text style={styles.quizNextText}>Next</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.navy} />
              </Pressable>
            ) : (
              <Pressable
                style={[styles.quizNextBtn, saving && { opacity: 0.6 }]}
                onPress={() => onSave(form)}
                disabled={saving}
              >
                {saving ? <ActivityIndicator size={14} color={Colors.navy} /> : null}
                <Text style={styles.quizNextText}>{saving ? "Saving..." : "Save Profile"}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function WorkoutsScreen() {
  "use no memo";
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"plan" | "history">("plan");
  const [selectedDay, setSelectedDay] = useState<number>(() => (new Date().getDay() + 6) % 7);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [quizSaving, setQuizSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [planData, setPlanData] = useState<WorkoutDay[] | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerData, setBannerData] = useState<{ workoutStreak: number } | null>(null);
  const [quizForm, setQuizForm] = useState<QuizForm>({ age: "", height: "", weight: "", goal: "", experienceLevel: "beginner", liftingCapacity: "", injuries: [] });
  const [exerciseWeights, setExerciseWeights] = useState<Record<string, string>>({});

  const { data: profile, refetch: refetchProfile } = useGetWorkoutProfile();
  const { data: plans, refetch: refetchPlans } = useGetWorkoutPlans();
  const latestPlan = Array.isArray(plans) && plans.length > 0 ? plans[plans.length - 1] : null;
  const { data: logs, refetch: refetchLogs } = useGetWorkoutLogs(
    latestPlan?.id ?? 0,
    { query: { enabled: !!latestPlan } }
  );

  const { mutateAsync: saveProfile } = useSaveWorkoutProfile();
  const { mutateAsync: generatePlan } = useGenerateWorkoutPlan();
  const { mutateAsync: logExercise } = useLogExercise();

  useEffect(() => {
    if (latestPlan) {
      setPlanData(latestPlan.plan as WorkoutDay[]);
      fetchCompletions();
    }
  }, [latestPlan?.id]);

  const fetchCompletions = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/workouts/completions`);
      if (res.ok) setCompletions(await res.json());
    } catch { }
  };

  const openProfileQuiz = () => {
    if (profile) {
      const p = profile as any;
      setQuizForm({
        age: String(p.age ?? ""),
        height: p.height ?? "",
        weight: p.weight ?? "",
        goal: p.goal ?? "",
        experienceLevel: p.experienceLevel ?? "beginner",
        liftingCapacity: p.liftingCapacity ?? "",
        injuries: Array.isArray(p.injuries) ? p.injuries : [],
      });
    } else {
      setQuizForm({ age: "", height: "", weight: "", goal: "", experienceLevel: "beginner", liftingCapacity: "", injuries: [] });
    }
    setProfileModalVisible(true);
  };

  const handleGenerate = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGenerating(true);
    try {
      const result = await generatePlan({});
      setPlanData(result.plan as WorkoutDay[]);
      await refetchPlans();
      await refetchLogs();
      setSelectedDay((new Date().getDay() + 6) % 7);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to generate workout plan. Please try again.");
    } finally { setGenerating(false); }
  }, [generatePlan, refetchPlans, refetchLogs]);

  const handleToggleExercise = useCallback(async (exerciseName: string, completed: boolean) => {
    if (!latestPlan) return;
    try {
      await logExercise({ data: { workoutPlanId: latestPlan.id, dayIndex: selectedDay, exerciseName, completed } });
      await refetchLogs();
      if (completed && Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert("Error", "Failed to log exercise"); }
  }, [latestPlan, logExercise, refetchLogs, selectedDay]);

  const handleRegenerate = useCallback(async (exerciseName: string, muscleGroup?: string) => {
    if (!latestPlan || !planData) return;
    const day = planData[selectedDay];
    try {
      const res = await fetch(`${BASE_URL}/api/workouts/regenerate-exercise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: latestPlan.id, dayIndex: selectedDay, exerciseName, muscleGroup, dayFocus: day.focus }),
      });
      if (res.ok) {
        const data = await res.json();
        const newPlan = planData.map((d, i) =>
          i === selectedDay ? { ...d, exercises: d.exercises.map((ex) => ex.name === exerciseName ? data.exercise : ex) } : d
        );
        setPlanData(newPlan);
        await refetchPlans();
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch { Alert.alert("Error", "Failed to regenerate exercise"); }
  }, [latestPlan, planData, selectedDay, refetchPlans]);

  const handleCompleteDay = useCallback(async () => {
    if (!latestPlan || !planData) return;
    const day = planData[selectedDay];
    try {
      const res = await fetch(`${BASE_URL}/api/workouts/complete-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: latestPlan.id, dayIndex: selectedDay, dayName: day.day, dayFocus: day.focus, exercisesCompleted: day.exercises.length }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.alreadyCompleted) {
          setBannerData({ workoutStreak: data.workoutStreak });
          setShowBanner(true);
          setTimeout(() => setShowBanner(false), 4000);
          await fetchCompletions();
          await refetchProfile();
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch { Alert.alert("Error", "Failed to complete workout"); }
  }, [latestPlan, planData, selectedDay, refetchProfile]);

  const handleSaveQuiz = useCallback(async (form: QuizForm) => {
    if (!form.age || !form.height || !form.weight || !form.goal) {
      Alert.alert("Missing fields", "Please fill in the required fields.");
      return;
    }
    setQuizSaving(true);
    try {
      await saveProfile({
        data: {
          age: parseInt(form.age),
          height: form.height,
          weight: form.weight,
          goal: form.goal,
          experienceLevel: form.experienceLevel,
          liftingCapacity: form.liftingCapacity || undefined,
          injuries: form.injuries,
        } as any,
      });
      await refetchProfile();
      setProfileModalVisible(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert("Error", "Failed to save profile"); }
    finally { setQuizSaving(false); }
  }, [saveProfile, refetchProfile]);

  const handleWeightChange = useCallback((name: string, w: string) => {
    setExerciseWeights((prev) => ({ ...prev, [name]: w }));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchPlans(), refetchLogs(), fetchCompletions()]);
    setRefreshing(false);
  }, [refetchProfile, refetchPlans, refetchLogs]);

  const allLogs = Array.isArray(logs) ? logs : [];
  const dayLogs = allLogs.filter((l) => l.dayIndex === selectedDay);
  const currentDay = planData?.[selectedDay];
  const isRestDay = !currentDay || currentDay.exercises.length === 0 || currentDay.focus.toLowerCase().includes("rest");
  const allChecked = !isRestDay && currentDay!.exercises.length > 0 &&
    currentDay!.exercises.every((ex) => dayLogs.find((l) => l.exerciseName === ex.name)?.completed);
  const isDayCompleted = (idx: number) => completions.some((c) => c.planId === latestPlan?.id && c.dayIndex === idx);
  const isCurrentCompleted = isDayCompleted(selectedDay);
  const streak = (profile as any)?.workoutStreak ?? 0;
  const today = (new Date().getDay() + 6) % 7;

  return (
    <View style={[styles.container, { paddingTop: topInset + 44 }]}>
      {/* Completion Banner */}
      {showBanner && bannerData && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>🎉 Workout Complete!</Text>
          <Text style={styles.bannerRewards}>+200 XP  🪙+50  💎+3  🎟️+2</Text>
          <Text style={styles.bannerStreak}>🔥 {bannerData.workoutStreak} day streak!</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Workouts</Text>
          <Text style={styles.subtitle}>AI-powered training</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={16} color="#FB923C" />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
          <Pressable style={styles.iconBtn} onPress={openProfileQuiz}>
            {isIOS ? <SymbolView name="person.fill" size={16} tintColor={Colors.teal} /> : <Ionicons name="person" size={16} color={Colors.teal} />}
          </Pressable>
          {!!profile && !!planData && (
            <Pressable style={styles.iconBtn} onPress={handleGenerate} disabled={generating}>
              {generating ? <ActivityIndicator size={14} color={Colors.teal} /> : (isIOS ? <SymbolView name="arrow.clockwise" size={16} tintColor={Colors.teal} /> : <Ionicons name="refresh" size={16} color={Colors.teal} />)}
            </Pressable>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(["plan", "history"] as const).map((t) => (
          <Pressable key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t === "plan" ? "Workout Plan" : "History"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "history" ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}>
          {completions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color={Colors.textDim} />
              <Text style={styles.emptyTitle}>No completed workouts yet</Text>
              <Text style={styles.emptyBody}>Complete a workout day to see your history here.</Text>
            </View>
          ) : (
            [...completions].reverse().map((c) => (
              <View key={c.id} style={styles.historyCard}>
                <View style={styles.historyIcon}>
                  <Ionicons name="trophy" size={20} color={Colors.success} />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyDay}>{c.dayName ?? `Day ${c.dayIndex + 1}`}</Text>
                  <Text style={styles.historyFocus}>{c.dayFocus}</Text>
                  <Text style={styles.historyDate}>{new Date(c.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyExCount}>{c.exercisesCompleted}</Text>
                  <Text style={styles.historyExLabel}>exercises</Text>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      ) : !profile ? (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={56} color={Colors.teal} />
          <Text style={styles.emptyTitle}>Set Up Your Profile</Text>
          <Text style={styles.emptyBody}>Tell us about yourself so we can generate a personalized 7-day AI workout plan.</Text>
          <Pressable style={styles.primaryBtn} onPress={openProfileQuiz}>
            <Text style={styles.primaryBtnText}>Set Up Profile</Text>
          </Pressable>
        </View>
      ) : !planData ? (
        <View style={styles.emptyState}>
          <Ionicons name="sparkles-outline" size={56} color={Colors.teal} />
          <Text style={styles.emptyTitle}>Ready to Train?</Text>
          <Text style={styles.emptyBody}>Generate your personalized 7-day AI workout plan based on your profile.</Text>
          <Pressable style={[styles.primaryBtn, generating && { opacity: 0.6 }]} onPress={handleGenerate} disabled={generating}>
            {generating ? <ActivityIndicator color={Colors.navy} /> : <Text style={styles.primaryBtnText}>Generate Workout Plan</Text>}
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}>
          {/* 7-Day Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayRow} contentContainerStyle={styles.dayRowContent}>
            {planData.map((day, idx) => {
              const isRest = day.exercises.length === 0 || day.focus.toLowerCase().includes("rest");
              const isToday = idx === today;
              const isSelected = idx === selectedDay;
              const completed = isDayCompleted(idx);
              return (
                <Pressable
                  key={idx}
                  onPress={() => setSelectedDay(idx)}
                  style={[styles.dayPill, isSelected && !isToday && styles.dayPillSelected, isToday && styles.dayPillToday]}
                >
                  <Text style={[styles.dayPillAbbr, (isToday || isSelected) && styles.dayPillAbbrActive]}>{DAY_ABBR[idx]}</Text>
                  {completed ? (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                  ) : isRest ? (
                    <Ionicons name="moon" size={22} color={Colors.textDim} />
                  ) : (
                    <Ionicons name="barbell" size={20} color={isToday ? Colors.white : Colors.textDim} />
                  )}
                  <Text style={[styles.dayPillFocus, (isToday || isSelected) && styles.dayPillFocusActive]} numberOfLines={1}>
                    {isRest ? "Rest" : day.focus.split(" ")[0]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {currentDay && (
            <>
              <View style={styles.dayTitle}>
                <View>
                  <Text style={styles.dayTitleText}>{currentDay.day}</Text>
                  <Text style={styles.dayFocusText}>{currentDay.focus}</Text>
                </View>
                {!isRestDay && (
                  <Text style={styles.dayProgress}>{dayLogs.filter((l) => l.completed).length}/{currentDay.exercises.length} done</Text>
                )}
              </View>

              {isRestDay ? (
                <View style={styles.restCard}>
                  <Ionicons name="moon" size={32} color={Colors.textDim} />
                  <Text style={styles.restTitle}>Rest Day</Text>
                  <Text style={styles.restBody}>Recovery is part of the plan. Stay hydrated!</Text>
                </View>
              ) : (
                <>
                  {currentDay.exercises.map((ex) => (
                    <ExerciseCard
                      key={ex.name}
                      exercise={ex}
                      dayIndex={selectedDay}
                      planId={latestPlan!.id}
                      logs={dayLogs}
                      onToggle={handleToggleExercise}
                      onRegenerate={handleRegenerate}
                      weight={exerciseWeights[ex.name] ?? ""}
                      onWeightChange={handleWeightChange}
                    />
                  ))}

                  {allChecked && (
                    <Pressable
                      style={[styles.completeBtn, isCurrentCompleted && styles.completeBtnDone]}
                      onPress={handleCompleteDay}
                      disabled={isCurrentCompleted}
                    >
                      {isCurrentCompleted ? (
                        <Text style={styles.completeBtnText}>🏆 Day Completed!</Text>
                      ) : (
                        <Text style={styles.completeBtnText}>⚡ Complete Workout · +200 XP  🪙+50  💎+3  🎟️+2</Text>
                      )}
                    </Pressable>
                  )}
                </>
              )}
            </>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <ProfileQuiz
        visible={profileModalVisible}
        initialForm={quizForm}
        onSave={handleSaveQuiz}
        onClose={() => setProfileModalVisible(false)}
        saving={quizSaving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  banner: { position: "absolute", top: 60, left: 16, right: 16, zIndex: 50, backgroundColor: "#0E7490CC", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: Colors.teal + "66" },
  bannerTitle: { color: Colors.white, fontWeight: "700", fontSize: 16, marginBottom: 4 },
  bannerRewards: { color: Colors.white, fontSize: 14, marginBottom: 2 },
  bannerStreak: { color: Colors.teal, fontSize: 13 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 8 },
  headerLeft: {},
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 28, fontWeight: "800", color: Colors.white },
  subtitle: { fontSize: 13, color: Colors.textDim, marginTop: 1 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FB923C22", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#FB923C44" },
  streakText: { color: "#FB923C", fontWeight: "700", fontSize: 15 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.teal + "18", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.teal + "33" },
  tabRow: { flexDirection: "row", marginHorizontal: 20, marginBottom: 4, backgroundColor: "#FFFFFF0D", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#FFFFFF10" },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabBtnActive: { backgroundColor: Colors.teal },
  tabBtnText: { color: Colors.textDim, fontWeight: "600", fontSize: 13 },
  tabBtnTextActive: { color: Colors.navy },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingVertical: 60 },
  emptyTitle: { color: Colors.white, fontSize: 20, fontWeight: "700", marginTop: 16, textAlign: "center" },
  emptyBody: { color: Colors.textDim, fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },
  primaryBtn: { marginTop: 24, backgroundColor: Colors.teal, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  primaryBtnText: { color: Colors.navy, fontWeight: "700", fontSize: 15 },
  dayRow: { marginBottom: 12 },
  dayRowContent: { gap: 8 },
  dayPill: { width: 62, paddingVertical: 10, borderRadius: 16, alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#FFFFFF18", backgroundColor: "#FFFFFF08" },
  dayPillSelected: { borderColor: Colors.teal + "99", backgroundColor: Colors.teal + "1A" },
  dayPillToday: { borderColor: Colors.teal, backgroundColor: Colors.teal + "33" },
  dayPillAbbr: { fontSize: 10, fontWeight: "700", color: Colors.textDim, textTransform: "uppercase", letterSpacing: 0.5 },
  dayPillAbbrActive: { color: Colors.teal },
  dayPillFocus: { fontSize: 9, color: Colors.textDim + "88", textAlign: "center" },
  dayPillFocusActive: { color: Colors.teal + "BB" },
  dayTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  dayTitleText: { fontSize: 22, fontWeight: "700", color: Colors.white },
  dayFocusText: { fontSize: 13, color: Colors.textDim, marginTop: 2 },
  dayProgress: { fontSize: 13, color: Colors.textDim },
  restCard: { backgroundColor: "#FFFFFF08", borderRadius: 16, padding: 32, alignItems: "center", borderWidth: 1, borderColor: "#FFFFFF10" },
  restTitle: { color: Colors.white, fontWeight: "700", fontSize: 16, marginTop: 10 },
  restBody: { color: Colors.textDim, fontSize: 13, marginTop: 4, textAlign: "center" },
  exCard: { backgroundColor: "#FFFFFF0A", borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: "#FFFFFF15" },
  exCardDone: { backgroundColor: "#10B98108", borderColor: "#10B98130" },
  exCardTop: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  exCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#FFFFFF33", alignItems: "center", justifyContent: "center", marginTop: 1 },
  exInfo: { flex: 1 },
  exName: { color: Colors.white, fontWeight: "700", fontSize: 15 },
  exNameDone: { color: Colors.textDim, textDecorationLine: "line-through" },
  exMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  exReps: { color: "#93C5FD", fontWeight: "600", fontSize: 12 },
  exRest: { color: Colors.textDim, fontSize: 12 },
  restTimerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  restTimerText: { color: Colors.teal, fontWeight: "700", fontSize: 12 },
  restTimerBar: { flex: 1, height: 3, backgroundColor: "#FFFFFF15", borderRadius: 2, overflow: "hidden" },
  restTimerFill: { height: "100%", backgroundColor: Colors.teal, borderRadius: 2 },
  skipText: { color: Colors.textDim, fontSize: 11 },
  weightRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  weightLabel: { color: Colors.textDim, fontSize: 11 },
  weightInput: { color: Colors.white, fontSize: 12, borderWidth: 1, borderColor: "#FFFFFF20", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, minWidth: 80, backgroundColor: "transparent" },
  exActions: { alignItems: "flex-end", gap: 6 },
  muscleTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  muscleTagText: { fontSize: 9, fontWeight: "700" },
  regenIconBtn: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  expandBtn: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  formGuide: { borderTopWidth: 1, borderTopColor: "#FFFFFF10", padding: 14 },
  formGuideTitle: { color: Colors.teal, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  formStep: { flexDirection: "row", gap: 8, marginBottom: 6 },
  formStepNum: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.teal + "33", alignItems: "center", justifyContent: "center", marginTop: 1 },
  formStepNumText: { color: Colors.teal, fontSize: 9, fontWeight: "700" },
  formStepText: { flex: 1, color: Colors.textDim, fontSize: 12, lineHeight: 17 },
  formNotes: { color: Colors.textDim + "88", fontSize: 11, fontStyle: "italic", marginTop: 8 },
  completeBtn: { marginTop: 8, backgroundColor: Colors.teal, borderRadius: 16, padding: 16, alignItems: "center" },
  completeBtnDone: { backgroundColor: Colors.success + "22", borderWidth: 1, borderColor: Colors.success + "44" },
  completeBtnText: { color: Colors.navy, fontWeight: "700", fontSize: 14 },
  historyCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF08", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#FFFFFF10", gap: 12 },
  historyIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.success + "18", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.success + "33" },
  historyInfo: { flex: 1 },
  historyDay: { color: Colors.white, fontWeight: "700", fontSize: 14 },
  historyFocus: { color: Colors.textDim, fontSize: 12, marginTop: 2 },
  historyDate: { color: Colors.textDim + "77", fontSize: 11, marginTop: 2 },
  historyRight: { alignItems: "flex-end" },
  historyExCount: { color: Colors.white, fontWeight: "700", fontSize: 18 },
  historyExLabel: { color: Colors.textDim, fontSize: 11 },
  // Quiz styles
  quizOverlay: { flex: 1, backgroundColor: "#00000099", justifyContent: "flex-end" },
  quizCard: { backgroundColor: Colors.navy, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40, borderWidth: 1, borderColor: "#FFFFFF15" },
  quizProgress: { flexDirection: "row", gap: 5, marginBottom: 20 },
  quizDot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "#FFFFFF20" },
  quizDotActive: { backgroundColor: Colors.teal },
  quizStepLabel: { color: Colors.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  quizTitle: { color: Colors.white, fontSize: 22, fontWeight: "800", marginBottom: 6 },
  quizSub: { color: Colors.textDim, fontSize: 13, marginBottom: 16 },
  quizContent: { minHeight: 140, justifyContent: "center" },
  quizInput: { backgroundColor: "#FFFFFF0A", borderWidth: 1, borderColor: Colors.teal + "55", borderRadius: 12, padding: 14, color: Colors.white, fontSize: 16 },
  goalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  goalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#FFFFFF20", backgroundColor: "#FFFFFF08" },
  goalBtnActive: { borderColor: Colors.teal, backgroundColor: Colors.teal + "25" },
  goalBtnText: { color: Colors.textDim, fontWeight: "600", fontSize: 13 },
  goalBtnTextActive: { color: Colors.white },
  expBtn: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#FFFFFF18", backgroundColor: "#FFFFFF08" },
  expBtnActive: { borderColor: Colors.teal, backgroundColor: Colors.teal + "20" },
  expBtnLabel: { color: Colors.textDim, fontWeight: "700", fontSize: 15 },
  expBtnDesc: { color: Colors.textDim + "88", fontSize: 12, marginTop: 2 },
  injuryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  injuryBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: "#FFFFFF20", backgroundColor: "#FFFFFF08" },
  injuryBtnActive: { borderColor: "#EF444499", backgroundColor: "#EF444418" },
  injuryBtnText: { color: Colors.textDim, fontWeight: "600", fontSize: 13 },
  injuryBtnTextActive: { color: "#F87171" },
  injuryNote: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F59E0B10", borderWidth: 1, borderColor: "#F59E0B33", borderRadius: 10, padding: 10, marginTop: 10 },
  injuryNoteText: { color: "#F59E0B", fontSize: 12, flex: 1 },
  quizNav: { flexDirection: "row", gap: 10, marginTop: 24 },
  quizBackBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#FFFFFF20" },
  quizBackText: { color: Colors.textDim, fontWeight: "600", fontSize: 14 },
  quizNextBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: Colors.teal, paddingVertical: 14, borderRadius: 12 },
  quizNextText: { color: Colors.navy, fontWeight: "700", fontSize: 15 },
});
