import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useGetQuests } from "@workspace/api-client-react";
import { useGetCreatures } from "@workspace/api-client-react";
import { useGetAchievements } from "@workspace/api-client-react";
import Colors from "@/constants/colors";

const isIOS = Platform.OS === "ios";

function StatCard({
  icon,
  sfName,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: string;
  sfName: string;
  label: string;
  value: string | number;
  color: string;
  delay?: number;
}) {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 14 });
      opacity.value = withTiming(1, { duration: 350 });
    }, delay);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.statCard, animStyle]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + "22" }]}>
        {isIOS ? (
          <SymbolView name={sfName} tintColor={color} size={22} />
        ) : (
          <Ionicons name={icon as any} size={22} color={color} />
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

function QuestRow({ quest }: { quest: any }) {
  const diffColor: Record<string, string> = {
    easy: Colors.success,
    medium: Colors.warning,
    hard: Colors.danger,
    legendary: Colors.legendary,
  };
  const color = diffColor[quest.difficulty] ?? Colors.teal;
  return (
    <View style={styles.questRow}>
      <View style={[styles.questDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.questRowTitle} numberOfLines={1}>
          {quest.title}
        </Text>
        <Text style={styles.questRowSub}>
          {quest.xpReward} XP · {quest.depthLevel}m depth
        </Text>
      </View>
      <View style={[styles.questBadge, { borderColor: color + "55" }]}>
        <Text style={[styles.questBadgeText, { color }]}>
          {quest.difficulty}
        </Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { data: quests = [], isLoading: qLoading } = useGetQuests();
  const { data: creatures = [], isLoading: cLoading } = useGetCreatures();
  const { data: achievements = [], isLoading: aLoading } = useGetAchievements();

  const pulse = useSharedValue(1);
  React.useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.06, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const active = quests.filter((q) => q.status === "active");
  const completed = quests.filter((q) => q.status === "completed");
  const totalXP = completed.reduce((s, q) => s + q.xpReward, 0);
  const unlockedAch = achievements.filter((a) => a.unlockedAt);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topInset + 12,
          paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100,
          paddingHorizontal: 20,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.heroTitle}>Explorer</Text>
          </View>
          <Animated.View style={pulseStyle}>
            <LinearGradient
              colors={[Colors.teal, Colors.tealLight]}
              style={styles.depthBadge}
            >
              {isIOS ? (
                <SymbolView name="water.waves" tintColor="#fff" size={16} />
              ) : (
                <MaterialCommunityIcons name="waves" size={16} color="#fff" />
              )}
              <Text style={styles.depthBadgeText}>Depth Diver</Text>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Stats Grid */}
        {qLoading || cLoading || aLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.teal} />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard icon="flash" sfName="bolt.fill" label="Total XP" value={totalXP.toLocaleString()} color={Colors.teal} delay={0} />
            <StatCard icon="map" sfName="map.fill" label="Active" value={active.length} color={Colors.warning} delay={60} />
            <StatCard icon="checkmark-circle" sfName="checkmark.circle.fill" label="Done" value={completed.length} color={Colors.success} delay={120} />
            <StatCard icon="fish" sfName="fish.fill" label="Creatures" value={creatures.length} color={Colors.epic} delay={180} />
            <StatCard icon="trophy" sfName="trophy.fill" label="Achievements" value={unlockedAch.length} color={Colors.legendary} delay={240} />
            <StatCard icon="location" sfName="location.fill" label="Max Depth" value={`${Math.max(0, ...quests.map((q) => q.depthLevel))}m`} color={Colors.tealLight} delay={300} />
          </View>
        )}

        {/* Active Quests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            {isIOS ? (
              <SymbolView name="map.fill" tintColor={Colors.teal} size={18} />
            ) : (
              <Feather name="map" size={18} color={Colors.teal} />
            )}
            <Text style={styles.sectionTitle}>Active Quests</Text>
          </View>
          {active.length === 0 ? (
            <View style={styles.emptySmall}>
              {isIOS ? (
                <SymbolView name="map" tintColor={Colors.textDim} size={28} />
              ) : (
                <Feather name="map" size={28} color={Colors.textDim} />
              )}
              <Text style={styles.emptyText}>No active quests</Text>
            </View>
          ) : (
            active.slice(0, 4).map((q) => <QuestRow key={q.id} quest={q} />)
          )}
        </View>

        {/* Recent Creatures */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            {isIOS ? (
              <SymbolView name="fish.fill" tintColor={Colors.epic} size={18} />
            ) : (
              <Ionicons name="fish" size={18} color={Colors.epic} />
            )}
            <Text style={styles.sectionTitle}>Recent Discoveries</Text>
          </View>
          {creatures.length === 0 ? (
            <View style={styles.emptySmall}>
              <Text style={styles.emptyText}>No creatures found yet</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              {creatures.slice(0, 6).map((c) => {
                const rarityColor: Record<string, string> = {
                  legendary: Colors.legendary,
                  epic: Colors.epic,
                  rare: Colors.rare,
                  uncommon: Colors.uncommon,
                  common: Colors.common,
                };
                const rc = rarityColor[c.rarity] ?? Colors.textDim;
                return (
                  <View key={c.id} style={styles.creatureChip}>
                    <View style={[styles.creatureChipDot, { backgroundColor: rc }]} />
                    <Text style={styles.creatureChipName} numberOfLines={1}>{c.name}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  heroTitle: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  depthBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  depthBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  loadingRow: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "30.5%",
    backgroundColor: Colors.navyCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  section: {
    backgroundColor: Colors.navyCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  questRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 2,
  },
  questDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  questRowTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  questRowSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  questBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  questBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "capitalize",
  },
  emptySmall: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
  },
  creatureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: Colors.navySurface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.borderDim,
  },
  creatureChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  creatureChipName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
    maxWidth: 100,
  },
});
