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
  withTiming,
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

const DIFF_CONFIG: Record<Difficulty, { color: string; label: string }> = {
  easy: { color: Colors.success, label: "Easy" },
  medium: { color: Colors.warning, label: "Medium" },
  hard: { color: Colors.danger, label: "Hard" },
  legendary: { color: Colors.legendary, label: "Legendary" },
};

const STATUS_CONFIG: Record<Status, { color: string; sfIcon: string; ioIcon: string }> = {
  active: { color: Colors.teal, sfIcon: "play.fill", ioIcon: "play" },
  completed: { color: Colors.success, sfIcon: "checkmark.circle.fill", ioIcon: "checkmark-circle" },
  failed: { color: Colors.danger, sfIcon: "xmark.circle.fill", ioIcon: "close-circle" },
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

function QuestCard({ quest, index, onStatusChange, onDelete }: {
  quest: any;
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

  const dc = DIFF_CONFIG[quest.difficulty as Difficulty] ?? DIFF_CONFIG.easy;
  const sc = STATUS_CONFIG[quest.status as Status] ?? STATUS_CONFIG.active;

  const nextStatus: Record<Status, Status> = {
    active: "completed",
    completed: "failed",
    failed: "active",
  };

  return (
    <Animated.View style={[styles.questCard, animStyle]}>
      <View style={styles.questCardTop}>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <View style={[styles.badge, { backgroundColor: dc.color + "22", borderColor: dc.color + "55" }]}>
            <Text style={[styles.badgeText, { color: dc.color }]}>{dc.label}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: sc.color + "22", borderColor: sc.color + "55" }]}>
            {isIOS ? (
              <SymbolView name={sc.sfIcon} tintColor={sc.color} size={10} />
            ) : (
              <Ionicons name={sc.ioIcon as any} size={10} color={sc.color} />
            )}
            <Text style={[styles.badgeText, { color: sc.color, textTransform: "capitalize" }]}>{quest.status}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert("Delete Quest", "Remove this quest?", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => onDelete(quest.id) },
            ]);
          }}
          hitSlop={12}
        >
          {isIOS ? (
            <SymbolView name="trash" tintColor={Colors.danger + "99"} size={16} />
          ) : (
            <Ionicons name="trash-outline" size={16} color={Colors.danger + "99"} />
          )}
        </Pressable>
      </View>

      <Text style={styles.questTitle}>{quest.title}</Text>
      <Text style={styles.questDesc} numberOfLines={2}>{quest.description}</Text>

      <View style={styles.questMeta}>
        <View style={styles.metaItem}>
          {isIOS ? (
            <SymbolView name="bolt.fill" tintColor={Colors.teal} size={13} />
          ) : (
            <Ionicons name="flash" size={13} color={Colors.teal} />
          )}
          <Text style={styles.metaText}>{quest.xpReward} XP</Text>
        </View>
        <View style={styles.metaItem}>
          {isIOS ? (
            <SymbolView name="arrow.down.circle.fill" tintColor={Colors.textDim} size={13} />
          ) : (
            <Ionicons name="arrow-down-circle" size={13} color={Colors.textDim} />
          )}
          <Text style={styles.metaText}>{quest.depthLevel}m</Text>
        </View>
      </View>

      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onStatusChange(quest.id, nextStatus[quest.status as Status]);
        }}
        style={({ pressed }) => [styles.statusBtn, { opacity: pressed ? 0.75 : 1, borderColor: sc.color + "55" }]}
      >
        {isIOS ? (
          <SymbolView name="arrow.triangle.2.circlepath" tintColor={sc.color} size={14} />
        ) : (
          <Ionicons name="refresh" size={14} color={sc.color} />
        )}
        <Text style={[styles.statusBtnText, { color: sc.color }]}>
          Mark as {nextStatus[quest.status as Status]}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function CreateQuestModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [xpReward, setXpReward] = useState("100");
  const [depthLevel, setDepthLevel] = useState("50");
  const { mutateAsync: createQuest, isPending } = useCreateQuest();
  const insets = useSafeAreaInsets();

  const isValid = title.trim().length > 0 && description.trim().length > 0;

  const handleCreate = async () => {
    if (!isValid) return;
    try {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await createQuest({
        data: {
          title: title.trim(),
          description: description.trim(),
          difficulty,
          xpReward: parseInt(xpReward) || 100,
          depthLevel: parseInt(depthLevel) || 50,
        },
      });
      setTitle(""); setDescription(""); setDifficulty("easy"); setXpReward("100"); setDepthLevel("50");
      onCreated();
      onClose();
    } catch (e) {
      Alert.alert("Error", "Failed to create quest");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Quest</Text>
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
              placeholder="Enter quest name..."
              placeholderTextColor={Colors.textDim}
              returnKeyType="next"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the quest..."
              placeholderTextColor={Colors.textDim}
              multiline
              numberOfLines={4}
              returnKeyType="default"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Difficulty</Text>
            <View style={styles.diffRow}>
              {(Object.keys(DIFF_CONFIG) as Difficulty[]).map((d) => (
                <Pressable
                  key={d}
                  onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync(); setDifficulty(d); }}
                  style={[styles.diffBtn, difficulty === d && { backgroundColor: DIFF_CONFIG[d].color + "30", borderColor: DIFF_CONFIG[d].color }]}
                >
                  <Text style={[styles.diffBtnText, { color: difficulty === d ? DIFF_CONFIG[d].color : Colors.textDim }]}>
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
              <Text style={styles.formLabel}>Depth (m)</Text>
              <TextInput
                style={styles.input}
                value={depthLevel}
                onChangeText={setDepthLevel}
                keyboardType="numeric"
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
                <Text style={styles.createBtnText}>Create Quest</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function QuestsScreen() {
  "use no memo";
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { data: _quests, isLoading, refetch } = useGetQuests();
  const quests = Array.isArray(_quests) ? _quests : [];
  const { mutateAsync: updateQuest } = useUpdateQuest();
  const { mutateAsync: deleteQuest } = useDeleteQuest();
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const filtered = filter === "all" ? quests : quests.filter((q) => q.status === filter);

  const handleStatusChange = async (id: number, status: Status) => {
    try {
      await updateQuest({ id, data: { status } });
      refetch();
    } catch { }
  };

  const handleDelete = async (id: number) => {
    try {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await deleteQuest({ id });
      refetch();
    } catch { }
  };

  const filterBtnScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: filterBtnScale.value }] }));

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>Quests</Text>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingTop: 12 }}
        >
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
            padding: 16,
            gap: 12,
            paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100,
          }}
          renderItem={({ item, index }) => (
            <QuestCard
              quest={item}
              index={index}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          )}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filtered.length}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {isIOS ? (
                <SymbolView name="map" tintColor={Colors.textDim} size={52} />
              ) : (
                <Ionicons name="map-outline" size={52} color={Colors.textDim} />
              )}
              <Text style={styles.emptyTitle}>No {filter === "all" ? "" : filter + " "}quests</Text>
              <Text style={styles.emptyBody}>
                {filter === "all" ? "Tap + to create your first quest" : "Try a different filter"}
              </Text>
            </View>
          }
        />
      )}

      <CreateQuestModal
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
    paddingHorizontal: 20,
    paddingBottom: 12,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderDim,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textTransform: "capitalize",
  },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: {
    paddingTop: 60,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    marginTop: 8,
    textTransform: "capitalize",
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  questCard: {
    backgroundColor: Colors.navyCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  questCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  questTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  questDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  questMeta: {
    flexDirection: "row",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 2,
  },
  statusBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.navy,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderDim,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  formSection: { gap: 8, marginBottom: 16 },
  formRow: { flexDirection: "row", gap: 12 },
  formLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.navySurface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: Colors.textPrimary,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: "top",
    paddingTop: 13,
  },
  diffRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  diffBtn: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderDim,
    alignItems: "center",
  },
  diffBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  createBtn: {
    backgroundColor: Colors.teal,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
  },
  createBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
