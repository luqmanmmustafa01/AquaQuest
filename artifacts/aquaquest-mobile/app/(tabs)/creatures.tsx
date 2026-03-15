"use no memo";
import { CurrencyHeader } from "@/components/CurrencyHeader";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const _rawDomain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const BASE_URL = _rawDomain
  ? _rawDomain.startsWith("http") ? _rawDomain : `https://${_rawDomain}`
  : "";
const { width: SCREEN_W } = Dimensions.get("window");

const RARITY_CONFIG: Record<string, { color: string; label: string; glowHex: string }> = {
  common:    { color: "#9CA3AF", label: "Common",    glowHex: "#9CA3AF" },
  rare:      { color: "#3B82F6", label: "Rare",      glowHex: "#3B82F6" },
  epic:      { color: "#A855F7", label: "Epic",       glowHex: "#A855F7" },
  legendary: { color: "#F59E0B", label: "Legendary",  glowHex: "#F59E0B" },
  mythical:  { color: "#EF4444", label: "Mythical",   glowHex: "#EF4444" },
};

const RARITY_ORDER = ["mythical", "legendary", "epic", "rare", "common"];
const FILTER_TABS = ["all", "common", "rare", "epic", "legendary", "mythical"];

interface FishData {
  id: number;
  name: string;
  rarity: string;
  description: string;
  emoji: string;
  isFeatured: boolean;
}

interface SummonResult {
  fish: FishData;
  isDuplicate: boolean;
  stardustEarned: number;
}

interface CollectionEntry extends FishData {
  fishId: number;
  obtainedAt: string;
  isCompanion: boolean;
}

interface CollectionData {
  fish: CollectionEntry[];
  stardust: number;
  epicPity: number;
  legendaryPity: number;
  totalSummons: number;
}

function RarityBadge({ rarity }: { rarity: string }) {
  const cfg = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common;
  return (
    <View style={[styles.rarityBadge, { backgroundColor: cfg.color + "22", borderColor: cfg.color + "55" }]}>
      <Text style={[styles.rarityText, { color: cfg.color }]}>{cfg.label.toUpperCase()}</Text>
    </View>
  );
}

function SummonAnimation({ results, totalStardustEarned, onClose }: {
  results: SummonResult[];
  totalStardustEarned: number;
  onClose: () => void;
}) {
  const [phase, setPhase] = React.useState<"chest" | "burst" | "cards">("chest");
  const chestScale = React.useRef(new Animated.Value(0.4)).current;
  const chestOpacity = React.useRef(new Animated.Value(0)).current;
  const chestRotate = React.useRef(new Animated.Value(0)).current;
  const burstScale = React.useRef(new Animated.Value(0)).current;
  const burstOpacity = React.useRef(new Animated.Value(0)).current;
  const cardAnimations = React.useRef(
    results.map(() => ({
      translateY: new Animated.Value(-100),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.6),
    }))
  ).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(chestScale, { toValue: 1, damping: 10, stiffness: 150, useNativeDriver: true }),
      Animated.timing(chestOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    const shakeTimeout = setTimeout(() => {
      Animated.sequence([
        Animated.timing(chestRotate, { toValue: -8, duration: 80, useNativeDriver: true }),
        Animated.timing(chestRotate, { toValue: 8, duration: 80, useNativeDriver: true }),
        Animated.timing(chestRotate, { toValue: -8, duration: 80, useNativeDriver: true }),
        Animated.timing(chestRotate, { toValue: 8, duration: 80, useNativeDriver: true }),
        Animated.timing(chestRotate, { toValue: -4, duration: 60, useNativeDriver: true }),
        Animated.timing(chestRotate, { toValue: 4, duration: 60, useNativeDriver: true }),
        Animated.timing(chestRotate, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }, 400);

    const burstTimeout = setTimeout(() => {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Animated.parallel([
        Animated.timing(chestOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(chestScale, { toValue: 2.5, duration: 250, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(burstOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(burstOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
        ]),
        Animated.timing(burstScale, { toValue: 4, duration: 550, useNativeDriver: true }),
      ]).start();
      setPhase("burst");
    }, 1100);

    const cardsTimeout = setTimeout(() => {
      setPhase("cards");
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const anims = Array.isArray(cardAnimations) ? cardAnimations : [];
      anims.forEach((anim, i) => {
        setTimeout(() => {
          Animated.parallel([
            Animated.spring(anim.translateY, { toValue: 0, damping: 15, stiffness: 200, useNativeDriver: true }),
            Animated.timing(anim.opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.spring(anim.scale, { toValue: 1, damping: 14, stiffness: 200, useNativeDriver: true }),
          ]).start();
        }, i * 80);
      });
    }, 1700);

    return () => {
      clearTimeout(shakeTimeout);
      clearTimeout(burstTimeout);
      clearTimeout(cardsTimeout);
    };
  }, []);

  const rotateDeg = chestRotate.interpolate({ inputRange: [-10, 10], outputRange: ["-10deg", "10deg"] });

  return (
    <View style={styles.animOverlay}>
      {phase === "chest" && (
        <Animated.View style={{ alignItems: "center", gap: 20, opacity: chestOpacity, transform: [{ scale: chestScale }, { rotate: rotateDeg }] }}>
          <Text style={{ fontSize: 100, lineHeight: 120 }}>🎁</Text>
          <Text style={styles.openingText}>Opening...</Text>
        </Animated.View>
      )}

      <Animated.View
        pointerEvents="none"
        style={[styles.burstCircle, { opacity: burstOpacity, transform: [{ scale: burstScale }] }]}
      />

      {phase === "cards" && (
        <View style={{ flex: 1, width: "100%" }}>
          <ScrollView
            contentContainerStyle={styles.cardsContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cardsGrid}>
              {Array.isArray(results) && results.map((result, i) => {
                const cfg = RARITY_CONFIG[result.fish.rarity] ?? RARITY_CONFIG.common;
                const anim = Array.isArray(cardAnimations) && cardAnimations[i] ? cardAnimations[i] : null;
                const isSingle = results.length === 1;
                return (
                  <Animated.View
                    key={i}
                    style={[
                      isSingle ? styles.singleCard : styles.multiCard,
                      {
                        borderColor: cfg.color + "55",
                        backgroundColor: cfg.color + "18",
                        shadowColor: cfg.color,
                        shadowOpacity: 0.5,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: 8,
                        opacity: anim ? anim.opacity : 1,
                        transform: anim ? [{ translateY: anim.translateY }, { scale: anim.scale }] : [],
                      },
                    ]}
                  >
                    {result.isDuplicate && (
                      <View style={styles.dupBadge}>
                        <Text style={styles.dupText}>+10✨</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: isSingle ? 72 : 40 }}>{result.fish.emoji}</Text>
                    <RarityBadge rarity={result.fish.rarity} />
                    <Text style={[styles.fishNameCard, { color: cfg.color }]}>{result.fish.name}</Text>
                    {isSingle && (
                      <Text style={styles.fishDescCard} numberOfLines={3}>{result.fish.description}</Text>
                    )}
                  </Animated.View>
                );
              })}
            </View>

            {totalStardustEarned > 0 && (
              <View style={styles.stardustBanner}>
                <Text style={styles.stardustBannerText}>✨ {totalStardustEarned} Stardust from duplicates</Text>
              </View>
            )}

            <TouchableOpacity style={styles.continueBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function BannerCard({ bannerKey, title, subtitle, featuredFish, isLoading, onPull }: {
  bannerKey: "main" | "featured";
  title: string;
  subtitle: string;
  featuredFish: FishData | null;
  isLoading: boolean;
  onPull: (banner: "main" | "featured", count: 1 | 10, currency: "tickets" | "coins") => void;
}) {
  const isFeatured = bannerKey === "featured";
  const accent = isFeatured ? "#A855F7" : Colors.teal;

  return (
    <View style={[styles.bannerCard, { borderColor: accent + "44" }]}>
      <View style={styles.bannerHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>{title}</Text>
          <Text style={[styles.bannerSub, { color: accent }]}>{subtitle}</Text>
        </View>
        <Text style={{ fontSize: 28 }}>{isFeatured ? "🌀" : "🌊"}</Text>
      </View>

      {featuredFish && (
        <View style={[styles.featuredFishRow, { borderColor: accent + "33" }]}>
          <Text style={{ fontSize: 32 }}>{featuredFish.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.featuredFishName}>{featuredFish.name}</Text>
            <RarityBadge rarity={featuredFish.rarity} />
          </View>
          {isFeatured && (
            <View style={[styles.boostedTag, { backgroundColor: accent + "22", borderColor: accent + "55" }]}>
              <Text style={[styles.boostedText, { color: accent }]}>Boosted</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.ratesRow}>
        <Text style={styles.rateItem}>⚪ 60%</Text>
        <Text style={styles.rateItem}>🔵 25%</Text>
        <Text style={styles.rateItem}>🟣 12%</Text>
        <Text style={[styles.rateItem, isFeatured && { color: "#F59E0B", fontFamily: "Inter_600SemiBold" }]}>
          🟡 {isFeatured ? "5%" : "2.75%"}
        </Text>
        <Text style={styles.rateItem}>🔴 0.25%</Text>
      </View>

      <View style={styles.pullBtns}>
        <TouchableOpacity
          disabled={isLoading}
          onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPull(bannerKey, 1, "tickets"); }}
          style={[styles.pullBtn, { backgroundColor: accent }]}
          activeOpacity={0.82}
        >
          <Text style={styles.pullBtnText}>1x 🎟️ 1 Ticket</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={isLoading}
          onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPull(bannerKey, 1, "coins"); }}
          style={[styles.pullBtnOutline, { borderColor: accent + "55" }]}
          activeOpacity={0.82}
        >
          <Text style={styles.pullBtnText}>1x 🪙 100</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={isLoading}
          onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPull(bannerKey, 10, "tickets"); }}
          style={[styles.pullBtn, { backgroundColor: accent }]}
          activeOpacity={0.82}
        >
          <Text style={styles.pullBtnText}>10x 🎟️ 8 Tickets</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={isLoading}
          onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPull(bannerKey, 10, "coins"); }}
          style={[styles.pullBtnOutline, { borderColor: accent + "55" }]}
          activeOpacity={0.82}
        >
          <Text style={styles.pullBtnText}>10x 🪙 800</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FishCollectionCard({ fish }: { fish: CollectionEntry }) {
  const cfg = RARITY_CONFIG[fish.rarity] ?? RARITY_CONFIG.common;
  return (
    <View style={[styles.fishCard, { borderColor: cfg.color + "44", backgroundColor: cfg.color + "14" }]}>
      <Text style={{ fontSize: 36 }}>{fish.emoji}</Text>
      <RarityBadge rarity={fish.rarity} />
      <Text style={[styles.fishName, { color: cfg.color }]} numberOfLines={2}>{fish.name}</Text>
    </View>
  );
}

export default function CreaturesScreen() {
  "use no memo";
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [collection, setCollection] = React.useState<CollectionData | null>(null);
  const [pool, setPool] = React.useState<FishData[]>([]);
  const [filter, setFilter] = React.useState("all");
  const [pulling, setPulling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [summonModalVisible, setSummonModalVisible] = React.useState(false);
  const [summonResults, setSummonResults] = React.useState<SummonResult[]>([]);
  const [totalStardust, setTotalStardust] = React.useState(0);
  const [shopMsg, setShopMsg] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadingCollection, setLoadingCollection] = React.useState(true);

  const fetchCollection = React.useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/ocean-summon/collection`);
      if (res.ok) setCollection(await res.json());
    } catch (_) {}
    setLoadingCollection(false);
  }, []);

  const fetchPool = React.useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/ocean-summon/pool`);
      if (res.ok) setPool(await res.json());
    } catch (_) {}
  }, []);

  React.useEffect(() => {
    fetchCollection();
    fetchPool();
  }, [fetchCollection, fetchPool]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCollection();
    setRefreshing(false);
  };

  const featuredFish = Array.isArray(pool)
    ? (pool.find((f) => f.isFeatured) ?? pool.find((f) => f.rarity === "legendary") ?? null)
    : null;
  const mainHighlight = Array.isArray(pool)
    ? (pool.find((f) => f.rarity === "mythical") ?? null)
    : null;

  const handlePull = async (banner: "main" | "featured", count: 1 | 10, currency: "tickets" | "coins") => {
    setError(null);
    setPulling(true);
    try {
      const res = await fetch(`${BASE_URL}/api/ocean-summon/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banner, count, currency }),
      });
      if (!res.ok) {
        let errMsg = `Request failed (${res.status})`;
        try { const e = await res.json(); errMsg = e.error ?? errMsg; } catch (_) {}
        setError(errMsg);
        setPulling(false);
        return;
      }
      const data = await res.json();
      setSummonResults(Array.isArray(data.results) ? data.results : []);
      setTotalStardust(data.totalStardustEarned ?? 0);
      setSummonModalVisible(true);
    } catch (_) {
      setError("Network error. Please try again.");
    }
    setPulling(false);
  };

  const handleCloseSummon = () => {
    setSummonModalVisible(false);
    fetchCollection();
  };

  const handleStardustShop = async () => {
    setShopMsg(null);
    try {
      const res = await fetch(`${BASE_URL}/api/ocean-summon/stardust-shop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy_ticket" }),
      });
      if (!res.ok) {
        let errMsg = `Request failed (${res.status})`;
        try { const e = await res.json(); errMsg = e.error ?? errMsg; } catch (_) {}
        setShopMsg(errMsg);
        return;
      }
      const data = await res.json();
      setShopMsg(data.message ?? "Done.");
      fetchCollection();
    } catch (_) { setShopMsg("Network error."); }
  };

  const filteredFish = Array.isArray(collection?.fish)
    ? collection!.fish
        .filter((f) => filter === "all" || f.rarity === filter)
        .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity))
    : [];

  const numColumns = 3;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <CurrencyHeader />

      <Modal visible={summonModalVisible} animationType="fade" statusBarTranslucent>
        <SummonAnimation
          results={summonResults}
          totalStardustEarned={totalStardust}
          onClose={handleCloseSummon}
        />
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}
        contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }}
      >
        <View style={styles.headerBar}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={styles.screenTitle}>Aquarium</Text>
              <Text style={styles.screenSub}>Summon & collect ocean creatures</Text>
            </View>
            {collection && (
              <View style={styles.stardustBadge}>
                <Text style={styles.stardustBadgeText}>✨ {collection.stardust}</Text>
              </View>
            )}
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌊 Ocean Summon</Text>
          {pulling && <ActivityIndicator color={Colors.teal} style={{ marginBottom: 10 }} />}
          <BannerCard
            bannerKey="main"
            title="Ocean Depths"
            subtitle="All rarities available"
            featuredFish={mainHighlight}
            isLoading={pulling}
            onPull={handlePull}
          />
          <View style={{ height: 12 }} />
          <BannerCard
            bannerKey="featured"
            title="Tidal Surge"
            subtitle="Boosted Legendary rate"
            featuredFish={featuredFish}
            isLoading={pulling}
            onPull={handlePull}
          />

          {collection && (
            <View style={styles.pityRow}>
              <Text style={styles.pityText}>Total: {collection.totalSummons} summons</Text>
              <Text style={styles.pityText}>🟣 Epic pity {collection.epicPity}/50</Text>
              <Text style={styles.pityText}>🟡 Legend {collection.legendaryPity}/100</Text>
            </View>
          )}
        </View>

        <View style={[styles.section, styles.shopSection]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <View>
              <Text style={styles.sectionTitle}>🛒 Stardust Shop</Text>
              <Text style={styles.shopSub}>100 ✨ Stardust → 1 🎟️ Spin Ticket</Text>
            </View>
            <TouchableOpacity
              onPress={handleStardustShop}
              disabled={!collection || (collection?.stardust ?? 0) < 100}
              style={[styles.shopBtn, { opacity: !collection || (collection?.stardust ?? 0) < 100 ? 0.4 : 1 }]}
              activeOpacity={0.8}
            >
              <Text style={styles.shopBtnText}>Exchange</Text>
            </TouchableOpacity>
          </View>
          {shopMsg && (
            <Text style={[styles.shopMsg, { color: shopMsg.toLowerCase().includes("not") || shopMsg.toLowerCase().includes("error") ? "#F87171" : "#34D399" }]}>
              {shopMsg}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <Text style={styles.sectionTitle}>
              ⭐ My Collection {collection ? `(${collection.fish.length})` : ""}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 8, paddingRight: 16 }}>
              {FILTER_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setFilter(tab)}
                  style={[styles.filterTab, filter === tab && styles.filterTabActive]}
                >
                  <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
                    {tab === "all" ? "All" : RARITY_CONFIG[tab]?.label ?? tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {loadingCollection ? (
            <ActivityIndicator color={Colors.teal} style={{ paddingVertical: 40 }} />
          ) : filteredFish.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 48 }}>🐚</Text>
              <Text style={styles.emptyTitle}>
                {collection?.fish.length === 0 ? "No fish yet" : `No ${filter} fish`}
              </Text>
              <Text style={styles.emptyBody}>
                {collection?.fish.length === 0 ? "Use Ocean Summon to build your collection!" : "Try a different filter"}
              </Text>
            </View>
          ) : (
            <View style={styles.fishGrid}>
              {filteredFish.map((fish) => (
                <FishCollectionCard key={fish.id} fish={fish} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDim,
  },
  screenTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.textPrimary, letterSpacing: -0.4 },
  screenSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  stardustBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  stardustBadgeText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#F59E0B" },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  shopSection: {
    marginTop: 4,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDim,
  },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginBottom: 12 },
  errorBox: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  errorText: { color: "#F87171", fontSize: 13, fontFamily: "Inter_400Regular" },
  rarityBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  rarityText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  bannerCard: {
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "#041520",
    padding: 16,
    gap: 12,
  },
  bannerHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bannerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  bannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  featuredFishRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  featuredFishName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, marginBottom: 4 },
  boostedTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  boostedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  ratesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rateItem: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textDim },
  pullBtns: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pullBtn: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  pullBtnOutline: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  pullBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  pityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDim,
  },
  pityText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textDim },
  shopSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  shopBtn: {
    backgroundColor: "#92400E",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  shopBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  shopMsg: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 6 },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderDim,
    backgroundColor: "transparent",
  },
  filterTabActive: { backgroundColor: "rgba(14,116,144,0.2)", borderColor: Colors.teal },
  filterTabText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textTransform: "capitalize" },
  filterTabTextActive: { color: Colors.teal, fontFamily: "Inter_600SemiBold" },
  fishGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fishCard: {
    width: (SCREEN_W - 52) / 3,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  fishName: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyWrap: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 48, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, marginTop: 6 },
  emptyBody: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center" },
  animOverlay: {
    flex: 1,
    backgroundColor: "rgba(4,10,22,0.97)",
    alignItems: "center",
    justifyContent: "center",
  },
  openingText: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.teal, letterSpacing: 1 },
  burstCircle: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  cardsContainer: { alignItems: "center", paddingVertical: 30, paddingHorizontal: 16 },
  cardsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginBottom: 20 },
  singleCard: {
    width: 200,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  multiCard: {
    width: (SCREEN_W - 64) / 3,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  fishNameCard: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
  fishDescCard: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center", lineHeight: 18 },
  dupBadge: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "#F59E0B",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dupText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#000" },
  stardustBanner: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    marginBottom: 16,
  },
  stardustBannerText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#F59E0B" },
  continueBtn: {
    backgroundColor: Colors.teal,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 8,
  },
  continueBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
});
