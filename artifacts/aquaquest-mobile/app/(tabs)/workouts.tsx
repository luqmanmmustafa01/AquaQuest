import { CurrencyHeader } from "@/components/CurrencyHeader";
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
  FlatList,
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

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN ?? "";
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

const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EXP_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const MUSCLE_COLORS: Record<string, string> = {
  Chest: "#3B82F6",
  Back: "#A855F7",
  Shoulders: "#F59E0B",
  Biceps: "#22C88A",
  Triceps: "#10B981",
  Legs: "#F97316",
  Core: "#0E7490",
  Glutes: "#EC4899",
  Cardio: "#EF4444",
};

function getMuscleColor(m?: string): string {
  return MUSCLE_COLORS[m ?? ""] ?? Colors.teal;
}

function ExerciseCard({
  exercise, dayIndex, planId, logs, onToggle, onRegenerate,
}: {
  exercise: Exercise;
  dayIndex: number;
  planId: number;
  logs: { exerciseName: string; completed: boolean }[];
  onToggle: (name: string, completed: boolean) => void;
  onRegenerate: (name: string, muscleGroup?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const done = logs.find((l) => l.exerciseName === exercise.name)?.completed ?? false;
  const mc = getMuscleColor(exercise.muscleGroup);

  const handleRegen = async () => {
    setRegenerating(true);
    await onRegenerate(exercise.name, exercise.muscleGroup);
    setRegenerating(false);
  };

  return (
    <View style={[styles.exCard, done && styles.exCardDone]}>
      <View style={styles.exCardTop}>
        <Pressable
          style={[styles.exCheckbox, done && { backgroundColor: Colors.success, borderColor: Colors.success }]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.selectionAsync();
            onToggle(exercise.name, !done);
          }}
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

export default function WorkoutsScreen() {
  "use no memo";
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"plan" | "history">("plan");
  const [selectedDay, setSelectedDay] = useState<number>(() => (new Date().getDay() + 6) % 7);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [planData, setPlanData] = useState<WorkoutDay[] | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerData, setBannerData] = useState<{ workoutStreak: number } | null>(null);
  const [form, setForm] = useState({ age: "", height: "", weight: "", goal: "", experienceLevel: "beginner" as ExperienceLevel });

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

  const handleSaveProfile = useCallback(async () => {
    if (!form.age || !form.height || !form.weight || !form.goal) {
      Alert.alert("Missing fields", "Please fill in all required fields.");
      return;
    }
    try {
      await saveProfile({ data: { age: parseInt(form.age), height: form.height, weight: form.weight, goal: form.goal, experienceLevel: form.experienceLevel } });
      await refetchProfile();
      setProfileModalVisible(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert("Error", "Failed to save profile"); }
  }, [form, saveProfile, refetchProfile]);

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CurrencyHeader />

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
          {/* Streak */}
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={16} color="#FB923C" />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
          {/* Profile Button */}
          <Pressable
            style={styles.iconBtn}
            onPress={() => {
              if (profile) setForm({ age: String((profile as any).age), height: (profile as any).height, weight: (profile as any).weight, goal: (profile as any).goal, experienceLevel: (profile as any).experienceLevel });
              setProfileModalVisible(true);
            }}
          >
            {isIOS ? <SymbolView name="person.fill" size={16} tintColor={Colors.teal} /> : <Ionicons name="person" size={16} color={Colors.teal} />}
          </Pressable>
          {/* Regenerate Button */}
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
        /* ─── HISTORY ─── */
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
        /* ─── NO PROFILE ─── */
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={56} color={Colors.teal} />
          <Text style={styles.emptyTitle}>Set Up Your Profile</Text>
          <Text style={styles.emptyBody}>Tell us about yourself so we can generate a personalized 7-day AI workout plan.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => setProfileModalVisible(true)}>
            <Text style={styles.primaryBtnText}>Set Up Profile</Text>
          </Pressable>
        </View>
      ) : !planData ? (
        /* ─── NO PLAN ─── */
        <View style={styles.emptyState}>
          <Ionicons name="sparkles-outline" size={56} color={Colors.teal} />
          <Text style={styles.emptyTitle}>Ready to Train?</Text>
          <Text style={styles.emptyBody}>Generate your personalized 7-day AI workout plan based on your profile.</Text>
          <Pressable style={[styles.primaryBtn, generating && { opacity: 0.6 }]} onPress={handleGenerate} disabled={generating}>
            {generating ? <ActivityIndicator color={Colors.navy} /> : <Text style={styles.primaryBtnText}>Generate Workout Plan</Text>}
          </Pressable>
        </View>
      ) : (
        /* ─── PLAN ─── */
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
                  style={[
                    styles.dayPill,
                    isSelected && !isToday && styles.dayPillSelected,
                    isToday && styles.dayPillToday,
                  ]}
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

          {/* Selected Day Details */}
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

      {/* Profile Modal */}
      <Modal visible={profileModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Profile</Text>
              <Pressable onPress={() => setProfileModalVisible(false)}>
                {isIOS ? <SymbolView name="xmark.circle.fill" size={24} tintColor={Colors.textDim} /> : <Ionicons name="close-circle" size={24} color={Colors.textDim} />}
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput style={styles.input} placeholder="e.g. 28" placeholderTextColor={Colors.textDim} keyboardType="numeric" value={form.age} onChangeText={(v) => setForm((f) => ({ ...f, age: v }))} />
              <Text style={styles.fieldLabel}>Height</Text>
              <TextInput style={styles.input} placeholder="5'10&quot; or 178cm" placeholderTextColor={Colors.textDim} value={form.height} onChangeText={(v) => setForm((f) => ({ ...f, height: v }))} />
              <Text style={styles.fieldLabel}>Weight</Text>
              <TextInput style={styles.input} placeholder="170lbs or 77kg" placeholderTextColor={Colors.textDim} value={form.weight} onChangeText={(v) => setForm((f) => ({ ...f, weight: v }))} />
              <Text style={styles.fieldLabel}>Fitness Goal</Text>
              <TextInput style={styles.input} placeholder="Build muscle, Lose weight…" placeholderTextColor={Colors.textDim} value={form.goal} onChangeText={(v) => setForm((f) => ({ ...f, goal: v }))} />
              <Text style={styles.fieldLabel}>Experience Level</Text>
              <View style={styles.expRow}>
                {EXP_LEVELS.map((l) => (
                  <Pressable key={l.value} style={[styles.expChip, form.experienceLevel === l.value && styles.expChipActive]} onPress={() => setForm((f) => ({ ...f, experienceLevel: l.value }))}>
                    <Text style={[styles.expChipText, form.experienceLevel === l.value && styles.expChipTextActive]}>{l.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={[styles.primaryBtn, { marginTop: 24, marginBottom: 8 }]} onPress={handleSaveProfile}>
                <Text style={styles.primaryBtnText}>Save Profile</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  banner: {
    backgroundColor: Colors.navyCard,
    borderWidth: 1,
    borderColor: Colors.teal + "66",
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    alignItems: "center",
  },
  bannerTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  bannerRewards: { fontSize: 14, color: Colors.teal, fontWeight: "600" },
  bannerStreak: { fontSize: 12, color: Colors.textDim, marginTop: 4 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: {},
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 28, fontWeight: "700", color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textDim, marginTop: 2 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.navySurface,
    borderWidth: 1,
    borderColor: "#FB923C44",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  streakText: { fontSize: 15, fontWeight: "700", color: "#FB923C" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.navySurface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: Colors.navyCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderDim,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  tabBtnActive: { backgroundColor: Colors.teal },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: Colors.textDim },
  tabBtnTextActive: { color: Colors.white },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary, textAlign: "center", marginTop: 16, marginBottom: 10 },
  emptyBody: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  primaryBtn: {
    backgroundColor: Colors.teal, paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 12, alignItems: "center", minWidth: 200,
  },
  primaryBtnText: { color: Colors.white, fontWeight: "700", fontSize: 15 },
  dayRow: { marginBottom: 16 },
  dayRowContent: { paddingHorizontal: 0, gap: 10, paddingBottom: 4 },
  dayPill: {
    width: 64, alignItems: "center", gap: 4, paddingVertical: 10,
    backgroundColor: Colors.navyCard, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderDim,
  },
  dayPillSelected: { borderColor: Colors.teal + "88", backgroundColor: Colors.teal + "18" },
  dayPillToday: { borderColor: Colors.teal, backgroundColor: Colors.teal + "33", borderWidth: 2 },
  dayPillAbbr: { fontSize: 10, fontWeight: "700", color: Colors.textDim, textTransform: "uppercase", letterSpacing: 0.5 },
  dayPillAbbrActive: { color: Colors.teal },
  dayPillFocus: { fontSize: 9, color: Colors.textDim, textAlign: "center" },
  dayPillFocusActive: { color: Colors.teal },
  dayTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 },
  dayTitleText: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary },
  dayFocusText: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  dayProgress: { fontSize: 12, color: Colors.textDim },
  restCard: {
    alignItems: "center", padding: 40,
    backgroundColor: Colors.navyCard,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.borderDim,
  },
  restTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary, marginTop: 12 },
  restBody: { fontSize: 13, color: Colors.textDim, textAlign: "center", marginTop: 6 },
  exCard: {
    backgroundColor: Colors.navyCard,
    borderRadius: 14, borderWidth: 1,
    borderColor: Colors.borderDim, marginBottom: 10,
    overflow: "hidden",
  },
  exCardDone: { borderColor: Colors.success + "44" },
  exCardTop: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 10 },
  exCheckbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  exInfo: { flex: 1 },
  exName: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  exNameDone: { color: Colors.textDim, textDecorationLine: "line-through" },
  exMeta: { flexDirection: "row", gap: 4, marginTop: 3, alignItems: "center" },
  exReps: { fontSize: 12, color: Colors.tealLight, fontWeight: "600" },
  exRest: { fontSize: 12, color: Colors.textDim },
  exActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  muscleTag: {
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  muscleTagText: { fontSize: 10, fontWeight: "700" },
  regenIconBtn: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: Colors.navySurface,
    alignItems: "center", justifyContent: "center",
  },
  expandBtn: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: Colors.navySurface,
    alignItems: "center", justifyContent: "center",
  },
  formGuide: {
    padding: 14, borderTopWidth: 1, borderTopColor: Colors.borderDim,
    backgroundColor: Colors.navy + "88",
  },
  formGuideTitle: {
    fontSize: 11, fontWeight: "700", color: Colors.teal,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  formStep: { flexDirection: "row", gap: 10, marginBottom: 8 },
  formStepNum: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.teal + "33",
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
  },
  formStepNumText: { fontSize: 10, fontWeight: "700", color: Colors.teal },
  formStepText: { fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  formNotes: { fontSize: 11, color: Colors.textDim, fontStyle: "italic", marginTop: 6 },
  completeBtn: {
    backgroundColor: Colors.teal, borderRadius: 14,
    padding: 16, alignItems: "center", marginTop: 8,
    shadowColor: Colors.teal, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  completeBtnDone: { backgroundColor: Colors.success + "22", shadowOpacity: 0 },
  completeBtnText: { fontSize: 14, fontWeight: "700", color: Colors.white, textAlign: "center" },
  historyCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.navyCard, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderDim,
    padding: 14, marginBottom: 10,
  },
  historyIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.success + "18",
    borderWidth: 1, borderColor: Colors.success + "44",
    alignItems: "center", justifyContent: "center",
  },
  historyInfo: { flex: 1 },
  historyDay: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  historyFocus: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  historyDate: { fontSize: 11, color: Colors.textDim, marginTop: 3 },
  historyRight: { alignItems: "flex-end" },
  historyExCount: { fontSize: 20, fontWeight: "700", color: Colors.teal },
  historyExLabel: { fontSize: 10, color: Colors.textDim },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: Colors.navyMid, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, maxHeight: "85%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: Colors.textPrimary },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: Colors.navySurface, borderWidth: 1,
    borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    color: Colors.textPrimary, fontSize: 15, marginBottom: 16,
  },
  expRow: { flexDirection: "row", gap: 8 },
  expChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.borderDim,
    alignItems: "center", backgroundColor: Colors.navySurface,
  },
  expChipActive: { borderColor: Colors.teal, backgroundColor: Colors.teal + "22" },
  expChipText: { fontSize: 13, color: Colors.textDim, fontWeight: "600" },
  expChipTextActive: { color: Colors.teal },
});
