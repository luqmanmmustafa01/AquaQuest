import { CurrencyHeader } from "@/components/CurrencyHeader";
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
import { useGetCreatures } from "@workspace/api-client-react";
import Colors from "@/constants/colors";

const isIOS = Platform.OS === "ios";

const RARITY_CONFIG: Record<string, { color: string; label: string; sfIcon: string; ioIcon: string }> = {
  legendary: { color: Colors.legendary, label: "Legendary", sfIcon: "star.fill", ioIcon: "star" },
  epic: { color: Colors.epic, label: "Epic", sfIcon: "sparkles", ioIcon: "sparkles" },
  rare: { color: Colors.rare, label: "Rare", sfIcon: "diamond.fill", ioIcon: "diamond" },
  uncommon: { color: Colors.uncommon, label: "Uncommon", sfIcon: "leaf.fill", ioIcon: "leaf" },
  common: { color: Colors.common, label: "Common", sfIcon: "circle.fill", ioIcon: "ellipse" },
};

function CreatureCard({ creature, index }: { creature: any; index: number }) {
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      scale.value = withSpring(1, { damping: 14 });
      opacity.value = withSpring(1);
    }, index * 50);
    return () => clearTimeout(timeout);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const cfg = RARITY_CONFIG[creature.rarity] ?? RARITY_CONFIG.common;

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.cardHeader}>
        <View style={[styles.rarityBadge, { backgroundColor: cfg.color + "22", borderColor: cfg.color + "55" }]}>
          {isIOS ? (
            <SymbolView name={cfg.sfIcon} tintColor={cfg.color} size={12} />
          ) : (
            <Ionicons name={cfg.ioIcon as any} size={12} color={cfg.color} />
          )}
          <Text style={[styles.rarityText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <View style={styles.depthTag}>
          {isIOS ? (
            <SymbolView name="arrow.down.circle" tintColor={Colors.textDim} size={13} />
          ) : (
            <Ionicons name="arrow-down-circle" size={13} color={Colors.textDim} />
          )}
          <Text style={styles.depthTagText}>{creature.depthFound}m</Text>
        </View>
      </View>

      <Text style={styles.creatureName}>{creature.name}</Text>
      <Text style={styles.creatureSpecies}>{creature.species}</Text>
      <Text style={styles.creatureDesc} numberOfLines={3}>
        {creature.description}
      </Text>

      <View style={styles.cardFooter}>
        {isIOS ? (
          <SymbolView name="calendar" tintColor={Colors.textDim} size={12} />
        ) : (
          <Ionicons name="calendar-outline" size={12} color={Colors.textDim} />
        )}
        <Text style={styles.discoveredText}>
          {new Date(creature.discoveredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function CreaturesScreen() {
  "use no memo";
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { data: _creatures, isLoading, refetch } = useGetCreatures();
  const creatures = Array.isArray(_creatures) ? _creatures : [];
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const rarityOrder = ["legendary", "epic", "rare", "uncommon", "common"];
  const sorted = [...creatures].sort(
    (a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
  );

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <CurrencyHeader />
      <View style={[styles.headerBar, { paddingTop: 12 }]}>
        <Text style={styles.screenTitle}>Sea Creatures</Text>
        <Text style={styles.screenSub}>{creatures.length} discovered</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.teal} size="large" />
        </View>
      ) : creatures.length === 0 ? (
        <View style={styles.emptyWrap}>
          {isIOS ? (
            <SymbolView name="fish" tintColor={Colors.textDim} size={52} />
          ) : (
            <Ionicons name="fish-outline" size={52} color={Colors.textDim} />
          )}
          <Text style={styles.emptyTitle}>No Creatures Yet</Text>
          <Text style={styles.emptyBody}>Complete quests to discover sea creatures</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100,
            gap: 12,
          }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item, index }) => <CreatureCard creature={item} index={index} />}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!sorted.length}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.teal}
            />
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
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    marginTop: 8,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  card: {
    flex: 1,
    backgroundColor: Colors.navyCard,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  rarityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rarityText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  depthTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  depthTagText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textDim,
  },
  creatureName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginTop: 4,
  },
  creatureSpecies: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.teal,
    marginBottom: 2,
  },
  creatureDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  discoveredText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textDim,
  },
});
