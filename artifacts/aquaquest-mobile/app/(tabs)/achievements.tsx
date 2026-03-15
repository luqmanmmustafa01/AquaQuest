import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  RefreshControl,
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
import { useGetAchievements } from "@workspace/api-client-react";
import Colors from "@/constants/colors";

const isIOS = Platform.OS === "ios";

const CATEGORY_CONFIG: Record<string, { color: string; sfIcon: string; ioIcon: string }> = {
  exploration: { color: Colors.teal, sfIcon: "location.fill", ioIcon: "location" },
  combat: { color: Colors.danger, sfIcon: "bolt.fill", ioIcon: "flash" },
  collection: { color: Colors.epic, sfIcon: "square.grid.2x2.fill", ioIcon: "grid" },
  social: { color: Colors.uncommon, sfIcon: "person.2.fill", ioIcon: "people" },
};

function AchievementItem({ achievement, index }: { achievement: any; index: number }) {
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

  const cfg = CATEGORY_CONFIG[achievement.category] ?? CATEGORY_CONFIG.exploration;
  const unlocked = !!achievement.unlockedAt;

  return (
    <Animated.View style={[styles.item, !unlocked && styles.itemLocked, animStyle]}>
      <View style={[styles.iconWrap, { backgroundColor: unlocked ? cfg.color + "22" : Colors.navySurface, borderColor: unlocked ? cfg.color + "44" : Colors.borderDim }]}>
        <Text style={[styles.iconText, !unlocked && { opacity: 0.35 }]}>{achievement.icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemTitle, !unlocked && styles.textLocked]}>{achievement.title}</Text>
          {unlocked ? (
            <View style={[styles.catBadge, { backgroundColor: cfg.color + "22", borderColor: cfg.color + "44" }]}>
              {isIOS ? (
                <SymbolView name={cfg.sfIcon} tintColor={cfg.color} size={11} />
              ) : (
                <Ionicons name={cfg.ioIcon as any} size={11} color={cfg.color} />
              )}
            </View>
          ) : (
            <View style={styles.lockedBadge}>
              {isIOS ? (
                <SymbolView name="lock.fill" tintColor={Colors.textDim} size={13} />
              ) : (
                <Ionicons name="lock-closed" size={13} color={Colors.textDim} />
              )}
            </View>
          )}
        </View>
        <Text style={[styles.itemDesc, !unlocked && styles.textLocked]} numberOfLines={2}>
          {achievement.description}
        </Text>
        {unlocked && achievement.unlockedAt && (
          <View style={styles.dateRow}>
            {isIOS ? (
              <SymbolView name="checkmark.seal.fill" tintColor={Colors.success} size={12} />
            ) : (
              <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
            )}
            <Text style={styles.dateText}>
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function AchievementsScreen() {
  "use no memo";
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { data: _achievements, isLoading, refetch } = useGetAchievements();
  const achievements = _achievements ?? [];
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const unlocked = achievements.filter((a) => a.unlockedAt);
  const locked = achievements.filter((a) => !a.unlockedAt);
  const sorted = [...unlocked, ...locked];

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: topInset + 12 }]}>
        <Text style={styles.screenTitle}>Achievements</Text>
        <Text style={styles.screenSub}>
          {unlocked.length} / {achievements.length} unlocked
        </Text>
      </View>

      {unlocked.length > 0 && (
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round((unlocked.length / achievements.length) * 100)}%` as any },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {Math.round((unlocked.length / achievements.length) * 100)}% complete
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.teal} size="large" />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100,
            gap: 10,
          }}
          renderItem={({ item, index }) => (
            <AchievementItem achievement={item} index={index} />
          )}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!sorted.length}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.teal}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {isIOS ? (
                <SymbolView name="trophy" tintColor={Colors.textDim} size={52} />
              ) : (
                <Ionicons name="trophy-outline" size={52} color={Colors.textDim} />
              )}
              <Text style={styles.emptyTitle}>No Achievements</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  headerBar: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDim,
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
  progressWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDim,
  },
  progressBg: {
    height: 5,
    backgroundColor: Colors.navySurface,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.teal,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: {
    paddingTop: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    marginTop: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: Colors.navyCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemLocked: {
    opacity: 0.55,
    borderColor: Colors.borderDim,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconText: {
    fontSize: 24,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  textLocked: { color: Colors.textSecondary },
  catBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedBadge: { width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  itemDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.success,
  },
});
