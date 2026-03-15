import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { CurrencyHeader } from "@/components/CurrencyHeader";

const _rawDomain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const BASE_URL = _rawDomain
  ? _rawDomain.startsWith("http") ? _rawDomain : `https://${_rawDomain}`
  : "";

/* ─── Hadiths ─── */
const HADITHS = [
  { text: "The best of you are those who learn the Quran and teach it.", narrator: "Bukhari" },
  { text: "None of you truly believes until he loves for his brother what he loves for himself.", narrator: "Bukhari & Muslim" },
  { text: "The strong person is the one who can control himself when he is angry.", narrator: "Bukhari" },
  { text: "Make things easy and do not make them difficult.", narrator: "Bukhari" },
  { text: "Speak good or remain silent.", narrator: "Bukhari & Muslim" },
  { text: "A Muslim is the one from whose tongue and hand the Muslims are safe.", narrator: "Bukhari" },
  { text: "Have mercy on those on earth, and He who is in heaven will have mercy on you.", narrator: "Tirmidhi" },
  { text: "Smiling at your brother is an act of charity.", narrator: "Tirmidhi" },
  { text: "Whoever believes in Allah and the Last Day, let him speak good or remain silent.", narrator: "Bukhari & Muslim" },
  { text: "The best charity is that given when one is healthy and desirous of wealth.", narrator: "Abu Dawud" },
  { text: "Cleanliness is half of faith.", narrator: "Muslim" },
  { text: "Allah expiates sins even for the prick of a thorn.", narrator: "Bukhari" },
  { text: "Feed the hungry, visit the sick, and set free the captives.", narrator: "Bukhari" },
  { text: "The world is a prison for the believer and a paradise for the disbeliever.", narrator: "Muslim" },
  { text: "Whoever removes a worldly grief from a believer, Allah will remove from him one of the griefs of the Day of Resurrection.", narrator: "Muslim" },
  { text: "Tie your camel, then put your trust in Allah.", narrator: "Tirmidhi" },
  { text: "Allah looks at your hearts and your deeds.", narrator: "Muslim" },
  { text: "The most beloved of deeds to Allah are those that are most consistent, even if they are small.", narrator: "Bukhari & Muslim" },
  { text: "Seek knowledge from the cradle to the grave.", narrator: "Ibn Abdil Barr" },
  { text: "He who has been given gratitude has been given much good.", narrator: "Abu Dawud" },
  { text: "Make use of your youth, health, wealth, free time, and life before their opposites.", narrator: "Al-Hakim" },
  { text: "Whoever is not thankful to people is not thankful to Allah.", narrator: "Tirmidhi" },
  { text: "The best of deeds is to bring joy to a fellow Muslim.", narrator: "Tabarani" },
  { text: "Be in the world as though you were a stranger or a wayfarer.", narrator: "Bukhari" },
  { text: "Every act of goodness is charity.", narrator: "Muslim" },
  { text: "Whoever guides someone to a good deed will have a reward similar to the one who does it.", narrator: "Muslim" },
  { text: "The most perfect believer in faith is the one who is best in moral character.", narrator: "Tirmidhi" },
  { text: "Modesty brings nothing except good.", narrator: "Bukhari & Muslim" },
  { text: "Do not belittle any good deed, even meeting your brother with a cheerful face.", narrator: "Muslim" },
  { text: "Allah is beautiful and He loves beauty.", narrator: "Muslim" },
];

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
const DHIKR_ITEMS = ["SubhanAllah", "Alhamdulillah", "Allahu Akbar"] as const;
const SUNNAH_ACTS = [
  "Pray 2 sunnah rak'ahs before Fajr",
  "Read Ayatul Kursi after each prayer",
  "Say Bismillah before eating",
];
const DUA_CATEGORIES = ["personal", "family", "health", "guidance", "gratitude"] as const;

/* ─── API ─── */
const fetchProgress = async (date: string) => {
  const r = await fetch(`${BASE_URL}/api/deen/progress?date=${date}`);
  return r.ok ? r.json() : null;
};
const patchProgress = async ({ date, body }: { date: string; body: object }) => {
  const r = await fetch(`${BASE_URL}/api/deen/progress?date=${date}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
};
const fetchDuas = async () => {
  const r = await fetch(`${BASE_URL}/api/deen/duas`);
  return r.ok ? r.json() : [];
};
const createDua = async (body: object) => {
  const r = await fetch(`${BASE_URL}/api/deen/duas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
};
const removeDua = async (id: number) => {
  await fetch(`${BASE_URL}/api/deen/duas/${id}`, { method: "DELETE" });
};

/* ─── Circular Score ─── */
function ScoreRing({ score }: { score: number }) {
  const size = 120;
  const r = 46;
  const circ = 2 * Math.PI * r;
  const fill = circ - (score / 100) * circ;
  return (
    <View style={{ alignItems: "center" }}>
      {/* Simple progress ring using View borders */}
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <View style={[styles.ringOuter, { borderColor: Colors.teal }]}>
          <View style={[styles.ringInner, { borderColor: score > 50 ? Colors.teal : Colors.navySurface }]}>
            <Text style={styles.ringScore}>{score}%</Text>
            <Text style={styles.ringLabel}>DEEN SCORE</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function DeenScreen() {
  "use no memo";
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const dayOfMonth = new Date().getDate();
  const hadith = HADITHS[(dayOfMonth - 1) % 30];
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  /* Location & Prayer Times */
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      }
    })();
  }, []);

  const { data: prayerData } = useQuery({
    queryKey: ["prayer-times-mobile", coords],
    queryFn: async () => {
      const ts = Math.floor(Date.now() / 1000);
      const url = coords
        ? `https://api.aladhan.com/v1/timings/${ts}?latitude=${coords.lat}&longitude=${coords.lon}&method=2`
        : `https://api.aladhan.com/v1/timingsByCity?city=Mecca&country=Saudi Arabia&method=2`;
      const r = await fetch(url);
      const j = await r.json();
      return j.data as { timings: Record<string, string> };
    },
    staleTime: 60 * 60 * 1000,
  });

  const { data: hijriData } = useQuery({
    queryKey: ["hijri-mobile", today],
    queryFn: async () => {
      const [y, m, d] = today.split("-");
      const r = await fetch(`https://api.aladhan.com/v1/gToH?date=${d}-${m}-${y}`);
      const j = await r.json();
      return j.data?.hijri as { date: string; month: { en: string; number: number }; year: string; designation: { abbreviated: string } };
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  /* Deen progress */
  const { data: progress } = useQuery({ queryKey: ["deen-progress-mobile", today], queryFn: () => fetchProgress(today) });
  const saveMutation = useMutation({
    mutationFn: patchProgress,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deen-progress-mobile", today] }),
  });
  const save = useCallback((body: object) => saveMutation.mutate({ date: today, body }), [saveMutation, today]);

  const [prayers, setPrayers] = useState<string[]>([]);
  const [dhikr, setDhikr] = useState<Record<string, number>>({ SubhanAllah: 0, Alhamdulillah: 0, "Allahu Akbar": 0 });
  const [sunnah, setSunnah] = useState<string[]>([]);
  const [quranPages, setQuranPages] = useState(0);
  const [quranGoal, setQuranGoal] = useState(1);
  const [quranGoalStr, setQuranGoalStr] = useState("1");

  useEffect(() => {
    if (!progress) return;
    const pc = Array.isArray(progress.prayersCompleted) ? progress.prayersCompleted : [];
    const dc = Array.isArray(progress.dhikrCompleted) ? progress.dhikrCompleted : [];
    const sc = Array.isArray(progress.sunnahCompleted) ? progress.sunnahCompleted : [];
    setPrayers(pc);
    setSunnah(sc);
    setQuranPages(progress.quranPages ?? 0);
    const serverCounts: Record<string, number> = { SubhanAllah: 0, Alhamdulillah: 0, "Allahu Akbar": 0 };
    dc.forEach((k: string) => { if (k in serverCounts) serverCounts[k] = 33; });
    setDhikr((prev) =>
      Object.fromEntries(Object.keys(serverCounts).map((k) => [k, serverCounts[k] === 33 ? 33 : (prev[k] ?? 0)]))
    );
  }, [progress]);

  const computeScore = useCallback((p: string[], q: number, d: Record<string, number>, s: string[]) => {
    return Math.round((p.length / 5) * 40 + (q >= quranGoal ? 25 : 0) + (Object.values(d).filter((v) => v >= 33).length / 3) * 20 + (s.length / 3) * 15);
  }, [quranGoal]);

  const score = computeScore(prayers, quranPages, dhikr, sunnah);

  const togglePrayer = (name: string) => {
    const next = prayers.includes(name) ? prayers.filter((p) => p !== name) : [...prayers, name];
    setPrayers(next);
    const streak = next.length === 5 ? (progress?.prayerStreak ?? 0) + 1 : progress?.prayerStreak ?? 0;
    save({ prayersCompleted: next, deenScore: computeScore(next, quranPages, dhikr, sunnah), prayerStreak: streak });
  };

  const tapDhikr = (name: string) => {
    setDhikr((prev) => {
      const cur = prev[name] ?? 0;
      if (cur >= 33) return prev;
      const next = { ...prev, [name]: cur + 1 };
      save({ dhikrCompleted: Object.entries(next).filter(([, v]) => v >= 33).map(([k]) => k), deenScore: computeScore(prayers, quranPages, next, sunnah) });
      return next;
    });
  };

  const resetDhikrItem = (name: string) => {
    setDhikr((prev) => {
      const next = { ...prev, [name]: 0 };
      save({ dhikrCompleted: Object.entries(next).filter(([, v]) => v >= 33).map(([k]) => k), deenScore: computeScore(prayers, quranPages, next, sunnah) });
      return next;
    });
  };

  const toggleSunnah = (act: string) => {
    const next = sunnah.includes(act) ? sunnah.filter((s) => s !== act) : [...sunnah, act];
    setSunnah(next);
    save({ sunnahCompleted: next, deenScore: computeScore(prayers, quranPages, dhikr, next) });
  };

  /* Prayers: highlight next */
  const timings = prayerData?.timings;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const prayerMinutes = PRAYERS.map((p) => {
    const t = timings?.[p];
    if (!t) return Infinity;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  });
  const nextIdx = prayerMinutes.findIndex((m) => m > currentMinutes);
  const highlightIdx = nextIdx === -1 ? 0 : nextIdx;

  /* Duas */
  const { data: duas = [] } = useQuery({ queryKey: ["duas-mobile"], queryFn: fetchDuas });
  const createMutation = useMutation({ mutationFn: createDua, onSuccess: () => qc.invalidateQueries({ queryKey: ["duas-mobile"] }) });
  const deleteMutation = useMutation({ mutationFn: removeDua, onSuccess: () => qc.invalidateQueries({ queryKey: ["duas-mobile"] }) });

  const [showDuaModal, setShowDuaModal] = useState(false);
  const [duaForm, setDuaForm] = useState({ title: "", content: "", category: "personal" });
  const [expandedDua, setExpandedDua] = useState<number | null>(null);

  const submitDua = () => {
    if (!duaForm.title || !duaForm.content) return;
    createMutation.mutate(duaForm);
    setDuaForm({ title: "", content: "", category: "personal" });
    setShowDuaModal(false);
  };

  /* Hijri special */
  const hijriMonth = hijriData ? Number(hijriData.month.number) : 0;
  const isSpecial = hijriMonth === 9 ? "🌙 Ramadan" : hijriMonth === 10 ? "🎉 Eid al-Fitr" : hijriMonth === 12 ? "🎊 Dhul Hijjah" : null;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <CurrencyHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100, gap: 16, padding: 16 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>🕌 Deen</Text>
          {hijriData && (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.hijriDate}>{hijriData.date} {hijriData.designation?.abbreviated}</Text>
              <Text style={styles.hijriMonth}>{hijriData.month.en} {hijriData.year}</Text>
            </View>
          )}
        </View>

        {isSpecial && <View style={styles.specialBanner}><Text style={styles.specialText}>{isSpecial}</Text></View>}

        {/* Deen Score */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌟 Deen Score</Text>
          <ScoreRing score={score} />
          <Text style={styles.scoreSubtitle}>Prayers · Quran · Dhikr · Sunnah</Text>
        </View>

        {/* Daily Hadith */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📖 Hadith of the Day</Text>
          <Text style={styles.hadithText}>"{hadith.text}"</Text>
          <Text style={styles.hadithNarrator}>— {hadith.narrator}</Text>
        </View>

        {/* Prayer Times */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🕌 Prayer Times</Text>
          {!timings ? (
            <ActivityIndicator color={Colors.teal} />
          ) : (
            <View style={styles.prayerGrid}>
              {PRAYERS.map((name, i) => {
                const time = timings[name]?.slice(0, 5) ?? "—";
                const done = prayers.includes(name);
                const isNext = i === highlightIdx;
                return (
                  <TouchableOpacity
                    key={name}
                    onPress={() => togglePrayer(name)}
                    style={[styles.prayerCard, done && styles.prayerCardDone, isNext && !done && styles.prayerCardNext]}
                  >
                    <Text style={[styles.prayerName, done && styles.prayerNameDone]}>{name}</Text>
                    <Text style={[styles.prayerTime, done && styles.prayerTimeDone]}>{time}</Text>
                    <Text style={styles.prayerIcon}>{done ? "✅" : isNext ? "⏰" : "○"}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {prayers.length === 5 && <Text style={styles.xpBadge}>🎉 All prayers complete! +100 XP · Streak: {progress?.prayerStreak ?? 1}</Text>}
        </View>

        {/* Quran Tracker */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📗 Quran Tracker</Text>
          <View style={styles.quranRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Daily Goal (pages)</Text>
              <TextInput
                style={styles.numInput}
                keyboardType="numeric"
                value={quranGoalStr}
                onChangeText={(v) => {
                  setQuranGoalStr(v);
                  const n = parseInt(v, 10);
                  if (!isNaN(n) && n >= 1) setQuranGoal(n);
                }}
                onBlur={() => {
                  const n = parseInt(quranGoalStr, 10);
                  const valid = !isNaN(n) && n >= 1 ? n : 1;
                  setQuranGoal(valid);
                  setQuranGoalStr(String(valid));
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Pages Read Today</Text>
              <TextInput
                style={styles.numInput}
                keyboardType="numeric"
                value={String(quranPages)}
                onChangeText={(v) => {
                  const n = Number(v) || 0;
                  setQuranPages(n);
                  save({ quranPages: n, deenScore: computeScore(prayers, n, dhikr, sunnah) });
                }}
              />
            </View>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (quranPages / quranGoal) * 100)}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>{quranPages} / {quranGoal} page{quranGoal !== 1 ? "s" : ""}</Text>
          {quranPages >= quranGoal && <Text style={styles.xpBadge}>✅ Goal met! +50 XP · Streak: {progress?.quranStreak ?? 1}</Text>}
        </View>

        {/* Dhikr Counter */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📿 Dhikr Counter</Text>
          <View style={styles.dhikrRow}>
            {DHIKR_ITEMS.map((name) => {
              const count = dhikr[name] ?? 0;
              const done = count >= 33;
              return (
                <View key={name} style={[styles.dhikrItem, done && styles.dhikrDone]}>
                  <Text style={styles.dhikrName}>{name}</Text>
                  <TouchableOpacity
                    onPress={() => tapDhikr(name)}
                    disabled={done}
                    style={[styles.dhikrBtn, done && styles.dhikrBtnDone]}
                  >
                    <Text style={[styles.dhikrCount, done && { color: Colors.teal }]}>{done ? "✓" : count}</Text>
                  </TouchableOpacity>
                  <Text style={styles.dhikrOf}>{count}/33</Text>
                  {!done && (
                    <TouchableOpacity onPress={() => resetDhikrItem(name)} style={styles.dhikrReset}>
                      <Text style={styles.dhikrResetText}>↺</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
          {DHIKR_ITEMS.every((n) => (dhikr[n] ?? 0) >= 33) && <Text style={styles.xpBadge}>✅ Dhikr complete! +25 XP</Text>}
        </View>

        {/* Sunnah Acts */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>☀️ Daily Sunnah Acts</Text>
          {SUNNAH_ACTS.map((act) => {
            const done = sunnah.includes(act);
            return (
              <TouchableOpacity key={act} onPress={() => toggleSunnah(act)} style={[styles.sunnahItem, done && styles.sunnahDone]}>
                <View style={[styles.checkbox, done && styles.checkboxDone]}>
                  {done && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.sunnahText, done && { color: Colors.textPrimary }]}>{act}</Text>
              </TouchableOpacity>
            );
          })}
          {sunnah.length === 3 && <Text style={styles.xpBadge}>✅ All sunnah acts done! +30 XP</Text>}
        </View>

        {/* Dua Journal */}
        <View style={styles.card}>
          <View style={styles.duaHeader}>
            <Text style={styles.cardTitle}>🤲 Dua Journal</Text>
            <TouchableOpacity onPress={() => setShowDuaModal(true)} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ New</Text>
            </TouchableOpacity>
          </View>
          {(Array.isArray(duas) ? duas : []).map((dua: any) => (
            <View key={dua.id} style={styles.duaCard}>
              <TouchableOpacity onPress={() => setExpandedDua(expandedDua === dua.id ? null : dua.id)} style={styles.duaTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.duaTitle}>{dua.title}</Text>
                  <Text style={styles.duaCategory}>{dua.category}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteMutation.mutate(dua.id)} style={styles.duaDelete}>
                  <Text style={{ color: Colors.textDim }}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
              {expandedDua === dua.id && <Text style={styles.duaContent}>{dua.content}</Text>}
            </View>
          ))}
          {(!Array.isArray(duas) || duas.length === 0) && (
            <Text style={styles.emptyText}>No duas yet. Add your first dua.</Text>
          )}
        </View>
      </ScrollView>

      {/* Dua Modal */}
      <Modal visible={showDuaModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>New Dua</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Title"
                placeholderTextColor={Colors.textDim}
                value={duaForm.title}
                onChangeText={(v) => setDuaForm((f) => ({ ...f, title: v }))}
              />
              <TextInput
                style={[styles.modalInput, { height: 100, textAlignVertical: "top" }]}
                placeholder="Your dua…"
                placeholderTextColor={Colors.textDim}
                multiline
                value={duaForm.content}
                onChangeText={(v) => setDuaForm((f) => ({ ...f, content: v }))}
              />
              <View style={styles.categoryRow}>
                {DUA_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setDuaForm((f) => ({ ...f, category: c }))}
                    style={[styles.categoryChip, duaForm.category === c && styles.categoryChipActive]}
                  >
                    <Text style={[styles.categoryText, duaForm.category === c && { color: Colors.white }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalBtns}>
                <TouchableOpacity onPress={() => setShowDuaModal(false)} style={styles.modalCancel}>
                  <Text style={{ color: Colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={submitDua} style={styles.modalSave}>
                  <Text style={{ color: Colors.white, fontWeight: "700" }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  pageTitle: { fontSize: 26, fontWeight: "800", color: Colors.textPrimary },
  hijriDate: { fontSize: 13, fontWeight: "700", color: Colors.teal },
  hijriMonth: { fontSize: 11, color: Colors.textDim },
  specialBanner: { backgroundColor: Colors.teal + "22", borderRadius: 12, borderWidth: 1, borderColor: Colors.teal + "44", padding: 10, alignItems: "center" },
  specialText: { color: Colors.teal, fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: Colors.navyCard, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 16, fontWeight: "800", color: Colors.textPrimary, marginBottom: 14 },
  scoreSubtitle: { color: Colors.textDim, fontSize: 11, textAlign: "center", marginTop: 8 },
  ringOuter: { width: 120, height: 120, borderRadius: 60, borderWidth: 8, alignItems: "center", justifyContent: "center" },
  ringInner: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, alignItems: "center", justifyContent: "center" },
  ringScore: { fontSize: 24, fontWeight: "900", color: Colors.textPrimary },
  ringLabel: { fontSize: 8, fontWeight: "700", color: Colors.teal, letterSpacing: 1 },
  hadithText: { color: Colors.textSecondary, fontStyle: "italic", fontSize: 14, lineHeight: 22, borderLeftWidth: 3, borderLeftColor: Colors.teal, paddingLeft: 12 },
  hadithNarrator: { color: Colors.teal, fontWeight: "700", fontSize: 12, marginTop: 10 },
  prayerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  prayerCard: { flex: 1, minWidth: "18%", alignItems: "center", backgroundColor: Colors.navySurface, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: Colors.borderDim },
  prayerCardDone: { backgroundColor: Colors.teal + "22", borderColor: Colors.teal + "66" },
  prayerCardNext: { borderColor: Colors.teal + "44", backgroundColor: Colors.teal + "11" },
  prayerName: { fontSize: 10, fontWeight: "700", color: Colors.textDim, textTransform: "uppercase" },
  prayerNameDone: { color: Colors.textPrimary },
  prayerTime: { fontSize: 15, fontWeight: "800", color: Colors.textSecondary, marginTop: 4 },
  prayerTimeDone: { color: Colors.textPrimary },
  prayerIcon: { fontSize: 16, marginTop: 6 },
  xpBadge: { color: Colors.teal, fontWeight: "700", fontSize: 12, marginTop: 12, textAlign: "center" },
  quranRow: { flexDirection: "row", gap: 16, marginBottom: 14 },
  inputLabel: { color: Colors.textDim, fontSize: 11, marginBottom: 6 },
  numInput: { backgroundColor: Colors.navySurface, color: Colors.textPrimary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, fontWeight: "700" },
  progressBg: { height: 8, backgroundColor: Colors.navySurface, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: Colors.teal, borderRadius: 4 },
  progressLabel: { color: Colors.textDim, fontSize: 11, marginTop: 6 },
  dhikrRow: { flexDirection: "row", gap: 10 },
  dhikrItem: { flex: 1, alignItems: "center", backgroundColor: Colors.navySurface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: Colors.borderDim },
  dhikrDone: { backgroundColor: Colors.teal + "18", borderColor: Colors.teal + "44" },
  dhikrName: { fontSize: 10, fontWeight: "700", color: Colors.textSecondary, textAlign: "center", marginBottom: 10 },
  dhikrBtn: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: Colors.borderDim, backgroundColor: Colors.navyCard, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  dhikrBtnDone: { borderColor: Colors.teal, backgroundColor: Colors.teal + "22" },
  dhikrCount: { fontSize: 22, fontWeight: "900", color: Colors.textPrimary },
  dhikrOf: { fontSize: 10, color: Colors.textDim },
  dhikrReset: { marginTop: 4 },
  dhikrResetText: { color: Colors.textDim, fontSize: 16 },
  sunnahItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderDim, backgroundColor: Colors.navySurface, marginBottom: 8 },
  sunnahDone: { backgroundColor: Colors.teal + "15", borderColor: Colors.teal + "40" },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.textDim, alignItems: "center", justifyContent: "center" },
  checkboxDone: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  checkmark: { color: Colors.white, fontSize: 12, fontWeight: "900" },
  sunnahText: { flex: 1, color: Colors.textSecondary, fontSize: 13, fontWeight: "500" },
  duaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  addBtn: { backgroundColor: Colors.teal, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  addBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13 },
  duaCard: { backgroundColor: Colors.navySurface, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderDim, marginBottom: 8, overflow: "hidden" },
  duaTop: { flexDirection: "row", alignItems: "center", padding: 14 },
  duaTitle: { color: Colors.textPrimary, fontWeight: "700", fontSize: 14 },
  duaCategory: { color: Colors.teal, fontSize: 11, fontWeight: "600", marginTop: 2, textTransform: "capitalize" },
  duaDelete: { padding: 4 },
  duaContent: { color: Colors.textSecondary, fontSize: 13, paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: Colors.borderDim, paddingTop: 10 },
  emptyText: { color: Colors.textDim, fontSize: 13, textAlign: "center", paddingVertical: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.navyCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary, marginBottom: 16 },
  modalInput: { backgroundColor: Colors.navySurface, color: Colors.textPrimary, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.navySurface },
  categoryChipActive: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  categoryText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  modalBtns: { flexDirection: "row", gap: 12 },
  modalCancel: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  modalSave: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: Colors.teal, alignItems: "center" },
});
