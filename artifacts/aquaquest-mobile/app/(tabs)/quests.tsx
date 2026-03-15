import { CurrencyHeader } from "@/components/CurrencyHeader";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  useGetQuests,
  useCreateQuest,
  useUpdateQuest,
  useDeleteQuest,
} from "@workspace/api-client-react";
import Colors from "@/constants/colors";

const isIOS = Platform.OS === "ios";

type Difficulty = "easy" | "medium" | "hard" | "legendary";
type Status = "active" | "completed" | "failed";
type Category = "fitness" | "wellness" | "productivity";
type GoalType = "daily" | "weekly" | "long_term";

const DIFF_CONFIG: Record<Difficulty, { color: string; label: string }> = {
  easy:      { color: Colors.success,   label: "Easy" },
  medium:    { color: Colors.warning,   label: "Medium" },
  hard:      { color: Colors.danger,    label: "Hard" },
  legendary: { color: Colors.legendary, label: "Legendary" },
};

const STATUS_CONFIG: Record<Status, { color: string; sfIcon: string; ioIcon: string }> = {
  active:    { color: Colors.teal,    sfIcon: "play.fill",          ioIcon: "play" },
  completed: { color: Colors.success, sfIcon: "checkmark.circle.fill", ioIcon: "checkmark-circle" },
  failed:    { color: Colors.danger,  sfIcon: "xmark.circle.fill",  ioIcon: "close-circle" },
};

const CAT_CONFIG: Record<Category, { label: string; color: string }> = {
  fitness:      { label: "Fitness",      color: "#0E7490" },
  wellness:     { label: "Wellness",     color: "#7C3AED" },
  productivity: { label: "Productivity", color: "#D97706" },
};

const TYPE_LABELS: Record<GoalType, string> = {
  daily: "Daily", weekly: "Weekly", long_term: "Long-term",
};

function FilterChip({ label, active, color, onPress }: { label: string; active: boolean; color?: string; onPress: () => void }) {
  const c = active ? (color ?? Colors.teal) : Colors.textDim;
  return (
    <Pressable
      onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync(); onPress(); }}
      style={[styles.chip, active && { borderColor: (color ?? Colors.teal) + "66", backgroundColor: (color ?? Colors.teal) + "18" }]}
    >
      <Text style={[styles.chipText, { color: c }]}>{label}</Text>
    </Pressable>
  );
}

function GoalCard({ goal, index, onStatusChange, onDelete }: {
  goal: any;
  index: number;
  onStatusChange: (id: number, status: Status) => void;
  onDelete: (id: number) => void;
}) {
  const scale = useSharedValue(0.94);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    const t = setTimeout(() => {
      scale.value = withSpring(1, { damping: 14 });
      opacity.value = withSpring(1);
    }, index * 40);
    return () => clearTimeout(t);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const dc = DIFF_CONFIG[goal.difficulty as Difficulty] ?? DIFF_CONFIG.easy;
  const sc = STATUS_CONFIG[goal.status as Status] ?? STATUS_CONFIG.active;
  const cat = CAT_CONFIG[goal.category as Category] ?? CAT_CONFIG.fitness;
  const goalType: GoalType = goal.goalType ?? "daily";
  const streak: number = goal.streak ?? 0;
  const progress: number = Math.min(goal.progress ?? 0, 100);

  const nextStatus: Record<Status, Status> = {
    active: "completed", completed: "failed", failed: "active",
  };

  return (
    <Animated.View style={[styles.goalCard, animStyle]}>
      <View style={styles.goalCardTop}>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {/* Category badge */}
          <View style={[styles.badge, { backgroundColor: cat.color + "22", borderColor: cat.color + "55" }]}>
            <Text style={[styles.badgeText, { color: cat.color }]}>{cat.label}</Text>
          </View>
          {/* Difficulty badge */}
          <View style={[styles.badge, { backgroundColor: dc.color + "22", borderColor: dc.color + "55" }]}>
            <Text style={[styles.badgeText, { color: dc.color }]}>{dc.label}</Text>
          </View>
          {/* Status badge */}
          <View style={[styles.badge, { backgroundColor: sc.color + "22", borderColor: sc.color + "55" }]}>
            {isIOS ? (
              <SymbolView name={sc.sfIcon} tintColor={sc.color} size={9} />
            ) : (
              <Ionicons name={sc.ioIcon as any} size={9} color={sc.color} />
            )}
            <Text style={[styles.badgeText, { color: sc.color, textTransform: "capitalize" }]}>{goal.status}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {/* Type label */}
          <Text style={styles.typeLabel}>{TYPE_LABELS[goalType]}</Text>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert("Delete Goal", "Remove this goal?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => onDelete(goal.id) },
              ]);
            }}
            hitSlop={12}
          >
            {isIOS ? (
              <SymbolView name="trash" tintColor={Colors.danger + "99"} size={15} />
            ) : (
              <Ionicons name="trash-outline" size={15} color={Colors.danger + "99"} />
            )}
          </Pressable>
        </View>
      </View>

      <Text style={styles.goalTitle}>{goal.title}</Text>
      {!!goal.description && (
        <Text style={styles.goalDesc} numberOfLines={2}>{goal.description}</Text>
      )}

      {/* Progress bar for long-term goals */}
      {goalType === "long_term" && (
        <View style={styles.progressWrap}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={[styles.progressPct, { color: cat.color }]}>{progress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: cat.color }]} />
          </View>
        </View>
      )}

      {/* Streak for daily/weekly */}
      {(goalType === "daily" || goalType === "weekly") && (
        <View style={styles.streakRow}>
          {isIOS ? (
            <SymbolView name="flame.fill" tintColor={cat.color} size={14} />
          ) : (
            <Ionicons name="flame" size={14} color={cat.color} />
          )}
          <Text style={[styles.streakCount, { color: cat.color }]}>{streak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
      )}

      <View style={styles.goalMeta}>
        <View style={styles.metaItem}>
          {isIOS ? (
            <SymbolView name="bolt.fill" tintColor={Colors.teal} size={13} />
          ) : (
            <Ionicons name="flash" size={13} color={Colors.teal} />
          )}
          <Text style={styles.metaText}>{goal.xpReward} XP</Text>
        </View>
        {!!goal.targetDate && (
          <View style={styles.metaItem}>
            {isIOS ? (
              <SymbolView name="calendar" tintColor={Colors.textDim} size={13} />
            ) : (
              <Ionicons name="calendar-outline" size={13} color={Colors.textDim} />
            )}
            <Text style={styles.metaText}>
              {new Date(goal.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Text>
          </View>
        )}
      </View>

      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onStatusChange(goal.id, nextStatus[goal.status as Status]);
        }}
        style={({ pressed }) => [styles.statusBtn, { opacity: pressed ? 0.75 : 1, borderColor: sc.color + "55" }]}
      >
        {isIOS ? (
          <SymbolView name="arrow.triangle.2.circlepath" tintColor={sc.color} size={14} />
        ) : (
          <Ionicons name="refresh" size={14} color={sc.color} />
        )}
        <Text style={[styles.statusBtnText, { color: sc.color }]}>
          Mark as {nextStatus[goal.status as Status]}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function CreateGoalModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [category, setCategory] = useState<Category>("fitness");
  const [goalType, setGoalType] = useState<GoalType>("daily");
  const [xpReward, setXpReward] = useState("100");
  const [targetDate, setTargetDate] = useState("");
  const { mutateAsync: createGoal, isPending } = useCreateQuest();
  const insets = useSafeAreaInsets();

  const isValid = title.trim().length > 0;

  const handleCreate = async () => {
    if (!isValid) return;
    try {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await createGoal({
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          difficulty,
          category,
          goalType,
          xpReward: parseInt(xpReward) || 100,
          targetDate: targetDate || undefined,
        },
      });
      setTitle(""); setDescription(""); setDifficulty("easy"); setCategory("fitness");
      setGoalType("daily"); setXpReward("100"); setTargetDate("");
      onCreated();
      onClose();
    } catch {
      Alert.alert("Error", "Failed to create goal");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Goal</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            {isIOS ? (
              <SymbolView name="xmark.circle.fill" tintColor={Colors.textDim} size={28} />
            ) : (
              <Ionicons name="close-circle" size={28} color={Colors.textDim} />
            )}
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Run 5km every day"
              placeholderTextColor={Colors.textDim}
              returnKeyType="next"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Description <Text style={{ color: Colors.textDim, textTransform: "none" }}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="What does completing this goal look like?"
              placeholderTextColor={Colors.textDim}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Category selector */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Category</Text>
            <View style={styles.selectorRow}>
              {(Object.keys(CAT_CONFIG) as Category[]).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync(); setCategory(c); }}
                  style={[styles.selectorBtn, category === c && {
                    backgroundColor: CAT_CONFIG[c].color + "30",
                    borderColor: CAT_CONFIG[c].color,
                  }]}
                >
                  <Text style={[styles.selectorBtnText, { color: category === c ? CAT_CONFIG[c].color : Colors.textDim }]}>
                    {CAT_CONFIG[c].label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Type selector */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Type</Text>
            <View style={styles.selectorRow}>
              {(["daily", "weekly", "long_term"] as GoalType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync(); setGoalType(t); }}
                  style={[styles.selectorBtn, goalType === t && {
                    backgroundColor: Colors.teal + "30",
                    borderColor: Colors.teal,
                  }]}
                >
                  <Text style={[styles.selectorBtnText, { color: goalType === t ? Colors.teal : Colors.textDim }]}>
                    {TYPE_LABELS[t]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Difficulty selector */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Difficulty</Text>
            <View style={styles.selectorRow}>
              {(Object.keys(DIFF_CONFIG) as Difficulty[]).map((d) => (
                <Pressable
                  key={d}
                  onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync(); setDifficulty(d); }}
                  style={[styles.selectorBtn, difficulty === d && {
                    backgroundColor: DIFF_CONFIG[d].color + "30",
                    borderColor: DIFF_CONFIG[d].color,
                  }]}
                >
                  <Text style={[styles.selectorBtnText, { color: difficulty === d ? DIFF_CONFIG[d].color : Colors.textDim }]}>
                    {DIFF_CONFIG[d].label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formSection, { flex: 1 }]}>
              <Text style={styles.formLabel}>XP Reward</Text>
              <TextInput
                style={styles.input}
                value={xpReward}
                onChangeText={setXpReward}
                keyboardType="numeric"
                placeholderTextColor={Colors.textDim}
              />
            </View>
            <View style={[styles.formSection, { flex: 1 }]}>
              <Text style={styles.formLabel}>Target Date <Text style={{ color: Colors.textDim, textTransform: "none" }}>(opt)</Text></Text>
              <TextInput
                style={styles.input}
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textDim}
              />
            </View>
          </View>

          <Pressable
            onPress={handleCreate}
            disabled={!isValid || isPending}
            style={({ pressed }) => [
              styles.createBtn,
              { opacity: !isValid || isPending ? 0.5 : pressed ? 0.85 : 1 },
            ]}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                {isIOS ? (
                  <SymbolView name="plus.circle.fill" tintColor="#fff" size={18} />
                ) : (
                  <Ionicons name="add-circle" size={18} color="#fff" />
                )}
                <Text style={styles.createBtnText}>Create Goal</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function GoalsScreen() {
  "use no memo";
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { data: _goals, isLoading, refetch } = useGetQuests();
  const goals = Array.isArray(_goals) ? _goals : [];
  const { mutateAsync: updateGoal } = useUpdateQuest();
  const { mutateAsync: deleteGoal } = useDeleteQuest();
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [catFilter, setCatFilter] = useState<"all" | Category>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const filtered = goals.filter((g) => {
    const statusOk = filter === "all" || g.status === filter;
    const catOk = catFilter === "all" || g.category === catFilter;
    return statusOk && catOk;
  });

  // Streak counters per category
  const getMaxStreak = (cat: Category) =>
    Math.max(0, ...goals.filter(g => g.category === cat && g.status === "active").map(g => (g as any).streak ?? 0));

  const handleStatusChange = async (id: number, status: Status) => {
    try { await updateGoal({ id, data: { status } }); refetch(); } catch { }
  };
  const handleDelete = async (id: number) => {
    try {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await deleteGoal({ id }); refetch();
    } catch { }
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <CurrencyHeader />
      <View style={[styles.headerBar, { paddingTop: 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>Goals</Text>
            <Text style={styles.screenSub}>{filtered.length} {filter === "all" ? "total" : filter}</Text>
          </View>
          <Pressable
            onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowCreate(true); }}
            style={styles.addBtn}
          >
            {isIOS ? (
              <SymbolView name="plus" tintColor="#fff" size={18} />
            ) : (
              <Ionicons name="add" size={20} color="#fff" />
            )}
          </Pressable>
        </View>

        {/* Streak counters */}
        <View style={styles.streakRow}>
          {(["fitness", "wellness", "productivity"] as Category[]).map((cat) => {
            const cfg = CAT_CONFIG[cat];
            const streak = getMaxStreak(cat);
            const active = catFilter === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync(); setCatFilter(active ? "all" : cat); }}
                style={[styles.streakCard, { borderColor: cfg.color + (active ? "99" : "33"), backgroundColor: cfg.color + (active ? "22" : "0d") }]}
              >
                {isIOS ? (
                  <SymbolView name="flame.fill" tintColor={cfg.color} size={14} />
                ) : (
                  <Ionicons name="flame" size={14} color={cfg.color} />
                )}
                <Text style={[styles.streakCount, { color: cfg.color }]}>{streak}</Text>
                <Text style={[styles.streakLabel, { color: cfg.color + "bb" }]}>{cfg.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Status + category filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
          <FilterChip label="All" active={filter === "all"} onPress={() => setFilter("all")} />
          <FilterChip label="Active" active={filter === "active"} color={Colors.teal} onPress={() => setFilter("active")} />
          <FilterChip label="Completed" active={filter === "completed"} color={Colors.success} onPress={() => setFilter("completed")} />
          <FilterChip label="Failed" active={filter === "failed"} color={Colors.danger} onPress={() => setFilter("failed")} />
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.teal} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            padding: 16, gap: 12,
            paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100,
          }}
          renderItem={({ item, index }) => (
            <GoalCard
              goal={item}
              index={index}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          )}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {isIOS ? (
                <SymbolView name="target" tintColor={Colors.textDim} size={52} />
              ) : (
                <Ionicons name="radio-button-on-outline" size={52} color={Colors.textDim} />
              )}
              <Text style={styles.emptyTitle}>No {filter === "all" ? "" : filter + " "}goals</Text>
              <Text style={styles.emptyBody}>
                {filter === "all" ? "Tap + to create your first goal" : "Try a different filter"}
              </Text>
            </View>
          }
        />
      )}

      <CreateGoalModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => refetch()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  headerBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDim,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  screenTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  screenSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.teal,
    alignItems: "center", justifyContent: "center",
  },
  streakRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 2,
  },
  streakCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 2,
  },
  streakCount: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  streakLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: Colors.borderDim,
  },
  chipText: {
    fontSize: 13, fontFamily: "Inter_500Medium", textTransform: "capitalize",
  },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { paddingTop: 60, alignItems: "center", gap: 12, paddingHorizontal: 40 },
  emptyTitle: {
    fontSize: 20, fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary, marginTop: 8, textTransform: "capitalize",
  },
  emptyBody: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, textAlign: "center",
  },
  goalCard: {
    backgroundColor: Colors.navyCard,
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  goalCardTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  typeLabel: {
    fontSize: 10, fontFamily: "Inter_500Medium",
    color: Colors.textDim,
    textTransform: "uppercase", letterSpacing: 0.3,
  },
  goalTitle: {
    fontSize: 16, fontFamily: "Inter_700Bold",
    color: Colors.textPrimary, letterSpacing: -0.2,
  },
  goalDesc: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, lineHeight: 19,
  },
  progressWrap: { gap: 5 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textDim },
  progressPct: { fontSize: 11, fontFamily: "Inter_700Bold" },
  progressTrack: {
    height: 5, backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 99, overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 99 },
  goalMeta: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  statusBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, borderWidth: 1, borderRadius: 10,
    paddingVertical: 9, marginTop: 2,
  },
  statusBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  // Modal
  modalContainer: {
    flex: 1, backgroundColor: Colors.navy,
    paddingHorizontal: 20, paddingTop: 16,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.borderDim,
    alignSelf: "center", marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  formSection: { gap: 8, marginBottom: 14 },
  formRow: { flexDirection: "row", gap: 12 },
  formLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.navySurface, borderWidth: 1,
    borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    color: Colors.textPrimary, fontFamily: "Inter_400Regular", fontSize: 15,
  },
  textarea: { minHeight: 80, textAlignVertical: "top", paddingTop: 12 },
  selectorRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  selectorBtn: {
    flex: 1, minWidth: 70, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.borderDim, alignItems: "center",
  },
  selectorBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  createBtn: {
    backgroundColor: Colors.teal, borderRadius: 14, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, marginTop: 8, marginBottom: 20,
  },
  createBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
