import React, { useState, useCallback } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  useGetWorkoutProfile,
  useSaveWorkoutProfile,
  useGenerateWorkoutPlan,
  useGetWorkoutPlans,
  useLogExercise,
  useGetWorkoutLogs,
} from "@workspace/api-client-react";
import Colors from "@/constants/colors";

const isIOS = Platform.OS === "ios";

type ExperienceLevel = "beginner" | "intermediate" | "advanced";

const EXP_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const GOAL_OPTIONS = [
  "Build muscle",
  "Lose weight",
  "Improve endurance",
  "Increase strength",
  "Improve flexibility",
  "Athletic performance",
  "General fitness",
  "Other",
];

function ExerciseRow({
  exercise,
  dayIndex,
  planId,
  logs,
  onToggle,
}: {
  exercise: { name: string; sets: number; reps: string; rest: string; notes?: string };
  dayIndex: number;
  planId: number;
  logs: { exerciseName: string; completed: boolean }[];
  onToggle: (name: string, completed: boolean) => void;
}) {
  const log = logs.find((l) => l.exerciseName === exercise.name);
  const done = log?.completed ?? false;

  return (
    <Pressable
      style={styles.exerciseRow}
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync();
        onToggle(exercise.name, !done);
      }}
    >
      <View style={[styles.checkbox, done && styles.checkboxDone]}>
        {done &&
          (isIOS ? (
            <SymbolView name="checkmark" size={12} tintColor={Colors.navy} />
          ) : (
            <Ionicons name="checkmark" size={12} color={Colors.navy} />
          ))}
      </View>
      <View style={styles.exerciseInfo}>
        <Text style={[styles.exerciseName, done && styles.exerciseNameDone]}>{exercise.name}</Text>
        <Text style={styles.exerciseMeta}>
          {exercise.sets} sets · {exercise.reps} reps · {exercise.rest} rest
        </Text>
        {exercise.notes ? <Text style={styles.exerciseNotes}>{exercise.notes}</Text> : null}
      </View>
    </Pressable>
  );
}

function DayCard({
  day,
  dayIndex,
  planId,
  logs,
  onToggle,
}: {
  day: { day: string; focus: string; exercises: { name: string; sets: number; reps: string; rest: string; notes?: string }[] };
  dayIndex: number;
  planId: number;
  logs: { dayIndex: number; exerciseName: string; completed: boolean }[];
  onToggle: (dayIndex: number, exerciseName: string, completed: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(dayIndex === 0);
  const dayLogs = logs.filter((l) => l.dayIndex === dayIndex);
  const completedCount = day.exercises.filter(
    (e) => dayLogs.find((l) => l.exerciseName === e.name)?.completed
  ).length;
  const allDone = completedCount === day.exercises.length;

  return (
    <View style={[styles.dayCard, allDone && styles.dayCardDone]}>
      <Pressable
        style={styles.dayHeader}
        onPress={() => {
          if (Platform.OS !== "web") Haptics.selectionAsync();
          setExpanded((e) => !e);
        }}
      >
        <View style={styles.dayHeaderLeft}>
          <View style={[styles.dayBadge, allDone && styles.dayBadgeDone]}>
            <Text style={[styles.dayBadgeText, allDone && styles.dayBadgeTextDone]}>{day.day.slice(0, 3)}</Text>
          </View>
          <View>
            <Text style={styles.dayName}>{day.day}</Text>
            <Text style={styles.dayFocus}>{day.focus}</Text>
          </View>
        </View>
        <View style={styles.dayHeaderRight}>
          <Text style={styles.dayProgress}>
            {completedCount}/{day.exercises.length}
          </Text>
          {isIOS ? (
            <SymbolView
              name={expanded ? "chevron.up" : "chevron.down"}
              size={14}
              tintColor={Colors.textDim}
            />
          ) : (
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={Colors.textDim}
            />
          )}
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.exerciseList}>
          {day.exercises.map((ex) => (
            <ExerciseRow
              key={ex.name}
              exercise={ex}
              dayIndex={dayIndex}
              planId={planId}
              logs={dayLogs}
              onToggle={(name, completed) => onToggle(dayIndex, name, completed)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function WorkoutsScreen() {
  "use no memo";
  const insets = useSafeAreaInsets();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [form, setForm] = useState({
    age: "",
    height: "",
    weight: "",
    goal: "",
    goalCustom: "",
    experienceLevel: "beginner" as ExperienceLevel,
  });
  const [goalDropdownOpen, setGoalDropdownOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

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

  const handleSaveProfile = useCallback(async () => {
    if (!form.age || !form.height || !form.weight || !form.goal) {
      Alert.alert("Missing fields", "Please fill in all required fields.");
      return;
    }
    try {
      await saveProfile({
        data: {
          age: parseInt(form.age),
          height: form.height,
          weight: form.weight,
          goal: form.goal,
          experienceLevel: form.experienceLevel,
        },
      });
      await refetchProfile();
      setProfileModalVisible(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to save profile");
    }
  }, [form, saveProfile, refetchProfile]);

  const handleGenerate = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGenerating(true);
    try {
      await generatePlan({});
      await refetchPlans();
      await refetchLogs();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to generate workout plan. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [generatePlan, refetchPlans, refetchLogs]);

  const handleToggleExercise = useCallback(
    async (dayIndex: number, exerciseName: string, completed: boolean) => {
      if (!latestPlan) return;
      try {
        await logExercise({
          data: {
            workoutPlanId: latestPlan.id,
            dayIndex,
            exerciseName,
            completed,
          },
        });
        await refetchLogs();
        if (completed && Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Alert.alert("Error", "Failed to log exercise");
      }
    },
    [latestPlan, logExercise, refetchLogs]
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchPlans(), refetchLogs()]);
    setRefreshing(false);
  }, [refetchProfile, refetchPlans, refetchLogs]);

  const hasProfile = !!profile;
  const hasPlan = !!latestPlan;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Workouts</Text>
          <Text style={styles.subtitle}>AI-powered personalized training</Text>
        </View>
        <Pressable
          style={styles.profileBtn}
          onPress={() => {
            if (profile) {
              setForm({
                age: String(profile.age),
                height: profile.height,
                weight: profile.weight,
                goal: profile.goal,
                experienceLevel: profile.experienceLevel as ExperienceLevel,
              });
            }
            setProfileModalVisible(true);
          }}
        >
          {isIOS ? (
            <SymbolView name="person.fill" size={18} tintColor={Colors.teal} />
          ) : (
            <Ionicons name="person" size={18} color={Colors.teal} />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}
      >
        {!hasProfile ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              {isIOS ? (
                <SymbolView name="figure.strengthtraining.traditional" size={48} tintColor={Colors.teal} />
              ) : (
                <Ionicons name="barbell" size={48} color={Colors.teal} />
              )}
            </View>
            <Text style={styles.emptyTitle}>Set Up Your Profile</Text>
            <Text style={styles.emptyBody}>
              Tell us about yourself so we can generate a personalized 7-day workout plan using AI.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => setProfileModalVisible(true)}>
              <Text style={styles.primaryBtnText}>Set Up Profile</Text>
            </Pressable>
          </View>
        ) : !hasPlan ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              {isIOS ? (
                <SymbolView name="sparkles" size={48} tintColor={Colors.teal} />
              ) : (
                <Ionicons name="sparkles" size={48} color={Colors.teal} />
              )}
            </View>
            <Text style={styles.emptyTitle}>Ready to Train?</Text>
            <Text style={styles.emptyBody}>
              Generate your personalized 7-day AI workout plan based on your profile.
            </Text>
            <Pressable
              style={[styles.primaryBtn, generating && styles.primaryBtnDisabled]}
              onPress={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator color={Colors.navy} />
              ) : (
                <Text style={styles.primaryBtnText}>Generate Workout Plan</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planTitle}>Your 7-Day Plan</Text>
                <Text style={styles.planDate}>
                  Generated {new Date(latestPlan.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Pressable
                style={[styles.regenBtn, generating && styles.primaryBtnDisabled]}
                onPress={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator color={Colors.teal} size="small" />
                ) : isIOS ? (
                  <SymbolView name="arrow.clockwise" size={16} tintColor={Colors.teal} />
                ) : (
                  <Ionicons name="refresh" size={16} color={Colors.teal} />
                )}
              </Pressable>
            </View>

            {(latestPlan.plan as { day: string; focus: string; exercises: { name: string; sets: number; reps: string; rest: string; notes?: string }[] }[]).map((day, idx) => (
              <DayCard
                key={idx}
                day={day}
                dayIndex={idx}
                planId={latestPlan.id}
                logs={(Array.isArray(logs) ? logs : []) as { dayIndex: number; exerciseName: string; completed: boolean }[]}
                onToggle={handleToggleExercise}
              />
            ))}

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      <Modal visible={profileModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Profile</Text>
              <Pressable onPress={() => setProfileModalVisible(false)}>
                {isIOS ? (
                  <SymbolView name="xmark.circle.fill" size={24} tintColor={Colors.textDim} />
                ) : (
                  <Ionicons name="close-circle" size={24} color={Colors.textDim} />
                )}
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 28"
                placeholderTextColor={Colors.textDim}
                keyboardType="numeric"
                value={form.age}
                onChangeText={(v) => setForm((f) => ({ ...f, age: v }))}
              />

              <Text style={styles.fieldLabel}>Height</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5'10&quot; or 178cm"
                placeholderTextColor={Colors.textDim}
                value={form.height}
                onChangeText={(v) => setForm((f) => ({ ...f, height: v }))}
              />

              <Text style={styles.fieldLabel}>Weight</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 170lbs or 77kg"
                placeholderTextColor={Colors.textDim}
                value={form.weight}
                onChangeText={(v) => setForm((f) => ({ ...f, weight: v }))}
              />

              <Text style={styles.fieldLabel}>Fitness Goal</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Build muscle, Lose weight, Improve endurance"
                placeholderTextColor={Colors.textDim}
                value={form.goal}
                onChangeText={(v) => setForm((f) => ({ ...f, goal: v }))}
              />

              <Text style={styles.fieldLabel}>Experience Level</Text>
              <View style={styles.expRow}>
                {EXP_LEVELS.map((l) => (
                  <Pressable
                    key={l.value}
                    style={[
                      styles.expChip,
                      form.experienceLevel === l.value && styles.expChipActive,
                    ]}
                    onPress={() => setForm((f) => ({ ...f, experienceLevel: l.value }))}
                  >
                    <Text
                      style={[
                        styles.expChipText,
                        form.experienceLevel === l.value && styles.expChipTextActive,
                      ]}
                    >
                      {l.label}
                    </Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 28, fontWeight: "700", color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textDim, marginTop: 2 },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.navySurface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.tealDim + "44",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary, textAlign: "center", marginBottom: 10 },
  emptyBody: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  primaryBtn: {
    backgroundColor: Colors.teal,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 200,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: Colors.white, fontWeight: "700", fontSize: 15 },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  planTitle: { fontSize: 20, fontWeight: "700", color: Colors.textPrimary },
  planDate: { fontSize: 12, color: Colors.textDim, marginTop: 2 },
  regenBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.navySurface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCard: {
    backgroundColor: Colors.navyCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderDim,
    marginBottom: 10,
    overflow: "hidden",
  },
  dayCardDone: { borderColor: Colors.success + "55" },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dayHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  dayHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.tealDim + "55",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadgeDone: { backgroundColor: Colors.success + "22", borderColor: Colors.success + "55" },
  dayBadgeText: { fontSize: 12, fontWeight: "700", color: Colors.teal },
  dayBadgeTextDone: { color: Colors.success },
  dayName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  dayFocus: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  dayProgress: { fontSize: 12, color: Colors.textDim },
  exerciseList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDim,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDim,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  exerciseNameDone: { color: Colors.textDim, textDecorationLine: "line-through" },
  exerciseMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  exerciseNotes: { fontSize: 11, color: Colors.textDim, marginTop: 3, fontStyle: "italic" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: Colors.navyMid,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: Colors.textPrimary },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: Colors.navySurface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 15,
    marginBottom: 16,
  },
  expRow: { flexDirection: "row", gap: 8 },
  expChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderDim,
    alignItems: "center",
    backgroundColor: Colors.navySurface,
  },
  expChipActive: { borderColor: Colors.teal, backgroundColor: Colors.teal + "22" },
  expChipText: { fontSize: 13, color: Colors.textDim, fontWeight: "600" },
  expChipTextActive: { color: Colors.teal },
});
