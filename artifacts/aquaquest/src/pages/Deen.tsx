import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Hadiths (rotate by day of month) ─── */
const HADITHS = [
  { text: "The best of you are those who learn the Quran and teach it.", narrator: "Bukhari" },
  { text: "None of you truly believes until he loves for his brother what he loves for himself.", narrator: "Bukhari & Muslim" },
  { text: "The strong person is not the one who can wrestle someone else down. The strong person is the one who can control himself when he is angry.", narrator: "Bukhari" },
  { text: "Make things easy and do not make them difficult. Cheer people up and do not drive them away.", narrator: "Bukhari" },
  { text: "Speak good or remain silent.", narrator: "Bukhari & Muslim" },
  { text: "A Muslim is the one from whose tongue and hand the Muslims are safe.", narrator: "Bukhari" },
  { text: "The merciful are shown mercy by the All-Merciful. Have mercy on those on earth, and He who is in heaven will have mercy on you.", narrator: "Tirmidhi" },
  { text: "Smiling at your brother is an act of charity.", narrator: "Tirmidhi" },
  { text: "Whoever believes in Allah and the Last Day, let him speak good or remain silent.", narrator: "Bukhari & Muslim" },
  { text: "The best charity is that given when one is healthy and desirous (of wealth).", narrator: "Abu Dawud" },
  { text: "Cleanliness is half of faith.", narrator: "Muslim" },
  { text: "No fatigue, illness, anxiety, sorrow, harm, or sadness afflicts a Muslim, even if it were the prick he receives from a thorn, but that Allah expiates some of his sins.", narrator: "Bukhari" },
  { text: "Feed the hungry, visit the sick, and set free the captives.", narrator: "Bukhari" },
  { text: "The world is a prison for the believer and a paradise for the disbeliever.", narrator: "Muslim" },
  { text: "Whoever removes a worldly grief from a believer, Allah will remove from him one of the griefs of the Day of Resurrection.", narrator: "Muslim" },
  { text: "Tie your camel, then put your trust in Allah.", narrator: "Tirmidhi" },
  { text: "Allah does not look at your forms and possessions, but He looks at your hearts and your deeds.", narrator: "Muslim" },
  { text: "The most beloved of deeds to Allah are those that are most consistent, even if they are small.", narrator: "Bukhari & Muslim" },
  { text: "Seek knowledge from the cradle to the grave.", narrator: "Ibn Abdil Barr" },
  { text: "He who has been given gratitude has been given much good.", narrator: "Abu Dawud" },
  { text: "Make use of five before five: your youth before your old age, your health before your illness, your wealth before your poverty, your free time before your preoccupation, and your life before your death.", narrator: "Al-Hakim" },
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
const QURAN_GOAL_DEFAULT = 1;

/* ─── API helpers ─── */
async function fetchProgress(date: string) {
  const r = await fetch(`${BASE}/api/deen/progress?date=${date}`);
  return r.ok ? r.json() : null;
}
async function patchProgress(date: string, body: object) {
  const r = await fetch(`${BASE}/api/deen/progress?date=${date}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}
async function fetchDuas() {
  const r = await fetch(`${BASE}/api/deen/duas`);
  return r.ok ? r.json() : [];
}
async function createDua(body: object) {
  const r = await fetch(`${BASE}/api/deen/duas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}
async function deleteDua(id: number) {
  await fetch(`${BASE}/api/deen/duas/${id}`, { method: "DELETE" });
}

/* ─── Circular Score Ring ─── */
function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={130} height={130} viewBox="0 0 130 130">
      <circle cx={65} cy={65} r={r} fill="none" stroke="#1A2B45" strokeWidth={10} />
      <circle
        cx={65} cy={65} r={r} fill="none" stroke="#0E7490" strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 65 65)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={65} y={65} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={22} fontWeight="bold">{score}%</text>
      <text x={65} y={85} textAnchor="middle" fill="#0E7490" fontSize={9} fontWeight="600" letterSpacing={1}>DEEN SCORE</text>
    </svg>
  );
}

/* ─── Main Component ─── */
export default function DeenPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const dayOfMonth = new Date().getDate(); // 1–31, use % 30 for hadiths
  const hadith = HADITHS[(dayOfMonth - 1) % 30];

  /* Prayer times via Aladhan API */
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setLocationError("Location unavailable — showing approximate times."),
    );
  }, []);

  const { data: prayerData } = useQuery({
    queryKey: ["prayer-times", location],
    queryFn: async () => {
      const ts = Math.floor(Date.now() / 1000);
      const url = location
        ? `https://api.aladhan.com/v1/timings/${ts}?latitude=${location.lat}&longitude=${location.lon}&method=2`
        : `https://api.aladhan.com/v1/timingsByCity?city=Mecca&country=Saudi Arabia&method=2`;
      const r = await fetch(url);
      const j = await r.json();
      return j.data as { timings: Record<string, string>; date: { hijri: { date: string; month: { en: string; number: number }; year: string; designation: { abbreviated: string } } } };
    },
    staleTime: 60 * 60 * 1000,
    enabled: true,
  });

  const { data: hijriData } = useQuery({
    queryKey: ["hijri", today],
    queryFn: async () => {
      const [d, m, y] = today.split("-").reverse();
      const r = await fetch(`https://api.aladhan.com/v1/gToH?date=${d}-${m}-${y}`);
      const j = await r.json();
      return j.data?.hijri as { date: string; month: { en: string; number: number }; year: string; designation: { abbreviated: string } };
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  /* Deen progress */
  const { data: progress } = useQuery({ queryKey: ["deen-progress", today], queryFn: () => fetchProgress(today) });

  const [prayers, setPrayers] = useState<string[]>([]);
  const [dhikr, setDhikr] = useState<Record<string, number>>({ SubhanAllah: 0, Alhamdulillah: 0, "Allahu Akbar": 0 });
  const [sunnah, setSunnah] = useState<string[]>([]);
  const [quranPages, setQuranPages] = useState(0);
  const [quranGoal, setQuranGoal] = useState(QURAN_GOAL_DEFAULT);
  const [quranGoalStr, setQuranGoalStr] = useState(String(QURAN_GOAL_DEFAULT));

  /* Sync local state from API when loaded */
  useEffect(() => {
    if (!progress) return;
    const pc = Array.isArray(progress.prayersCompleted) ? progress.prayersCompleted : [];
    const dc = Array.isArray(progress.dhikrCompleted) ? progress.dhikrCompleted : [];
    const sc = Array.isArray(progress.sunnahCompleted) ? progress.sunnahCompleted : [];
    setPrayers(pc);
    setSunnah(sc);
    setQuranPages(progress.quranPages ?? 0);
    const serverCounts: Record<string, number> = { SubhanAllah: 0, Alhamdulillah: 0, "Allahu Akbar": 0 };
    dc.forEach((k: string) => { if (serverCounts[k] !== undefined) serverCounts[k] = 33; });
    setDhikr((prev) =>
      Object.fromEntries(Object.keys(serverCounts).map((k) => [k, serverCounts[k] === 33 ? 33 : (prev[k] ?? 0)]))
    );
  }, [progress]);

  /* Compute Deen Score */
  const computeScore = useCallback((p: string[], q: number, d: Record<string, number>, s: string[]) => {
    const pScore = (p.length / 5) * 40;
    const qScore = q >= quranGoal ? 25 : 0;
    const dScore = (Object.values(d).filter((v) => v >= 33).length / 3) * 20;
    const sScore = (s.length / 3) * 15;
    return Math.round(pScore + qScore + dScore + sScore);
  }, [quranGoal]);

  const score = computeScore(prayers, quranPages, dhikr, sunnah);

  /* Auto-save progress to API with debounce */
  const saveMutation = useMutation({
    mutationFn: (body: object) => patchProgress(today, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deen-progress", today] }),
  });

  const save = useCallback((patch: object) => saveMutation.mutate(patch), [saveMutation]);

  /* Prayer toggle */
  const togglePrayer = (name: string) => {
    const next = prayers.includes(name) ? prayers.filter((p) => p !== name) : [...prayers, name];
    setPrayers(next);
    const streak = next.length === 5 ? (progress?.prayerStreak ?? 0) + 1 : progress?.prayerStreak ?? 0;
    save({ prayersCompleted: next, deenScore: computeScore(next, quranPages, dhikr, sunnah), prayerStreak: streak });
  };

  /* Dhikr tap */
  const tapDhikr = (name: string) => {
    setDhikr((prev) => {
      const cur = prev[name] ?? 0;
      if (cur >= 33) return prev;
      const next = { ...prev, [name]: cur + 1 };
      const completed = Object.entries(next).filter(([, v]) => v >= 33).map(([k]) => k);
      save({ dhikrCompleted: completed, deenScore: computeScore(prayers, quranPages, next, sunnah) });
      return next;
    });
  };
  const resetDhikr = (name?: string) => {
    setDhikr((prev) => {
      const next = name ? { ...prev, [name]: 0 } : { SubhanAllah: 0, Alhamdulillah: 0, "Allahu Akbar": 0 };
      const completed = Object.entries(next).filter(([, v]) => v >= 33).map(([k]) => k);
      save({ dhikrCompleted: completed, deenScore: computeScore(prayers, quranPages, next, sunnah) });
      return next;
    });
  };

  /* Sunnah toggle */
  const toggleSunnah = (act: string) => {
    const next = sunnah.includes(act) ? sunnah.filter((s) => s !== act) : [...sunnah, act];
    setSunnah(next);
    save({ sunnahCompleted: next, deenScore: computeScore(prayers, quranPages, dhikr, next) });
  };

  /* Quran save */
  const saveQuran = (pages: number) => {
    setQuranPages(pages);
    save({ quranPages: pages, deenScore: computeScore(prayers, pages, dhikr, sunnah) });
  };

  /* Duas */
  const { data: duas = [] } = useQuery({ queryKey: ["duas"], queryFn: fetchDuas });
  const createMutation = useMutation({ mutationFn: createDua, onSuccess: () => qc.invalidateQueries({ queryKey: ["duas"] }) });
  const deleteMutation = useMutation({ mutationFn: deleteDua, onSuccess: () => qc.invalidateQueries({ queryKey: ["duas"] }) });

  const [duaForm, setDuaForm] = useState({ title: "", content: "", category: "personal" as string });
  const [showDuaForm, setShowDuaForm] = useState(false);
  const [expandedDua, setExpandedDua] = useState<number | null>(null);

  const submitDua = () => {
    if (!duaForm.title || !duaForm.content) return;
    createMutation.mutate(duaForm);
    setDuaForm({ title: "", content: "", category: "personal" });
    setShowDuaForm(false);
  };

  /* Identify current/next prayer */
  const timings = prayerData?.timings;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const prayerMinutes = PRAYERS.map((p) => {
    const t = timings?.[p];
    if (!t) return Infinity;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  });
  const nextPrayerIdx = prayerMinutes.findIndex((m) => m > currentMinutes);
  const highlightIdx = nextPrayerIdx === -1 ? 0 : nextPrayerIdx;

  const isImportantHijri = (month: number, day?: number) => {
    if (month === 9) return "🌙 Ramadan";
    if (month === 10 && day === 1) return "🎉 Eid al-Fitr";
    if (month === 12 && day === 10) return "🎊 Eid al-Adha";
    if (month === 12 && (day ?? 0) <= 10) return "✨ First 10 Days of Dhul Hijjah";
    return null;
  };

  const hijriMonth = hijriData ? Number(hijriData.month.number) : 0;
  const specialOccasion = isImportantHijri(hijriMonth);

  const cardStyle = "rounded-2xl border border-[#0E7490]/20 bg-[#0F1F3A]/80 backdrop-blur-sm p-6";
  const sectionTitle = "text-lg font-bold text-white mb-4 flex items-center gap-2";

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-display font-bold text-white">🕌 Deen</h1>
        {hijriData && (
          <div className="text-right">
            <div className="text-sm font-semibold text-[#0E7490]">{hijriData.date} {hijriData.designation?.abbreviated}</div>
            <div className="text-xs text-gray-400">{hijriData.month.en} {hijriData.year}</div>
          </div>
        )}
      </div>

      {specialOccasion && (
        <div className="rounded-xl border border-[#0E7490]/40 bg-[#0E7490]/10 p-3 text-center text-sm font-semibold text-[#0E7490]">
          {specialOccasion}
        </div>
      )}

      {/* Top row: Score + Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={cardStyle + " flex flex-col items-center justify-center gap-2"}>
          <ScoreRing score={score} />
          <div className="text-xs text-gray-400 text-center">Prayers · Quran · Dhikr · Sunnah</div>
        </div>
        <div className={cardStyle}>
          <div className={sectionTitle}>📅 Today</div>
          <div className="text-4xl font-bold text-white mb-1">{today}</div>
          {hijriData && (
            <div className="text-xl text-[#0E7490] font-semibold">{hijriData.date} {hijriData.designation?.abbreviated}</div>
          )}
          {hijriData && <div className="text-sm text-gray-400 mt-1">{hijriData.month.en} {hijriData.year}</div>}
          {specialOccasion && <div className="mt-3 text-sm font-semibold text-[#0E7490]">{specialOccasion}</div>}
        </div>
      </div>

      {/* Daily Hadith */}
      <div className={cardStyle}>
        <div className={sectionTitle}>📖 Hadith of the Day</div>
        <blockquote className="text-gray-200 italic text-base leading-relaxed border-l-4 border-[#0E7490] pl-4">
          "{hadith.text}"
        </blockquote>
        <div className="text-xs text-[#0E7490] font-semibold mt-3">— {hadith.narrator}</div>
      </div>

      {/* Prayer Times */}
      <div className={cardStyle}>
        <div className={sectionTitle}>🕌 Prayer Times {locationError && <span className="text-xs text-yellow-400 font-normal">{locationError}</span>}</div>
        {!timings ? (
          <div className="text-gray-400 text-sm">Fetching prayer times…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {PRAYERS.map((name, i) => {
              const time = timings[name] ?? "—";
              const isHighlighted = i === highlightIdx;
              const isDone = prayers.includes(name);
              return (
                <button
                  key={name}
                  onClick={() => togglePrayer(name)}
                  className={`rounded-xl p-4 text-center transition-all border ${
                    isDone
                      ? "bg-[#0E7490]/20 border-[#0E7490]/60 text-white"
                      : isHighlighted
                      ? "bg-[#0E7490]/10 border-[#0E7490]/40 text-[#0E7490]"
                      : "bg-[#0A1628]/60 border-white/10 text-gray-400"
                  }`}
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-1">{name}</div>
                  <div className="text-lg font-bold">{time.slice(0, 5)}</div>
                  <div className="text-lg mt-1">{isDone ? "✅" : isHighlighted ? "⏰" : "○"}</div>
                </button>
              );
            })}
          </div>
        )}
        {prayers.length === 5 && (
          <div className="mt-3 text-center text-sm font-semibold text-[#0E7490]">🎉 All 5 prayers completed! +100 XP · Streak: {progress?.prayerStreak ?? 1}</div>
        )}
      </div>

      {/* Quran Tracker */}
      <div className={cardStyle}>
        <div className={sectionTitle}>📗 Quran Tracker</div>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="text-xs text-gray-400 mb-1">Daily goal (pages)</div>
            <Input
              type="number" min={1}
              value={quranGoalStr}
              onChange={(e) => {
                setQuranGoalStr(e.target.value);
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n) && n >= 1) setQuranGoal(n);
              }}
              onBlur={() => {
                const n = parseInt(quranGoalStr, 10);
                const valid = !isNaN(n) && n >= 1 ? n : 1;
                setQuranGoal(valid);
                setQuranGoalStr(String(valid));
              }}
              className="w-24 bg-[#0A1628] border-[#0E7490]/30 text-white"
            />
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-400 mb-1">Pages read today</div>
            <Input
              type="number" min={0}
              value={quranPages}
              onChange={(e) => saveQuran(Number(e.target.value))}
              className="w-24 bg-[#0A1628] border-[#0E7490]/30 text-white"
            />
          </div>
        </div>
        <div className="w-full bg-[#0A1628] rounded-full h-3">
          <div
            className="bg-[#0E7490] h-3 rounded-full transition-all"
            style={{ width: `${Math.min(100, (quranPages / quranGoal) * 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-2">{quranPages} / {quranGoal} page{quranGoal !== 1 ? "s" : ""}</div>
        {quranPages >= quranGoal && <div className="text-sm font-semibold text-[#0E7490] mt-2">✅ Daily goal met! +50 XP · Streak: {progress?.quranStreak ?? 1}</div>}
      </div>

      {/* Dhikr Counter */}
      <div className={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div className={sectionTitle + " mb-0"}>📿 Dhikr Counter</div>
          <button onClick={() => resetDhikr()} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset all
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DHIKR_ITEMS.map((name) => {
            const count = dhikr[name] ?? 0;
            const done = count >= 33;
            return (
              <div key={name} className={`rounded-xl p-4 text-center border transition-all ${done ? "bg-[#0E7490]/20 border-[#0E7490]/60" : "bg-[#0A1628]/60 border-white/10"}`}>
                <div className="text-sm font-bold text-white mb-2">{name}</div>
                <button
                  onClick={() => tapDhikr(name)}
                  disabled={done}
                  className={`w-20 h-20 rounded-full text-3xl font-bold flex items-center justify-center mx-auto mb-3 transition-all border-2 ${done ? "border-[#0E7490] bg-[#0E7490]/30 text-[#0E7490]" : "border-white/20 bg-[#0F1F3A] text-white hover:border-[#0E7490]/50 active:scale-95"}`}
                >
                  {done ? "✓" : count}
                </button>
                <div className="text-xs text-gray-400">{count}/33</div>
                {!done && <button onClick={() => resetDhikr(name)} className="text-xs text-gray-500 hover:text-gray-300 mt-1"><RotateCcw className="w-3 h-3 inline" /></button>}
              </div>
            );
          })}
        </div>
        {DHIKR_ITEMS.every((n) => (dhikr[n] ?? 0) >= 33) && (
          <div className="text-center text-sm font-semibold text-[#0E7490] mt-3">✅ All dhikr complete! +25 XP</div>
        )}
      </div>

      {/* Sunnah Acts */}
      <div className={cardStyle}>
        <div className={sectionTitle}>☀️ Daily Sunnah Acts</div>
        <div className="space-y-3">
          {SUNNAH_ACTS.map((act) => {
            const done = sunnah.includes(act);
            return (
              <button
                key={act}
                onClick={() => toggleSunnah(act)}
                className={`w-full text-left flex items-center gap-3 rounded-xl p-4 border transition-all ${done ? "bg-[#0E7490]/15 border-[#0E7490]/40" : "bg-[#0A1628]/60 border-white/10 hover:border-white/20"}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${done ? "bg-[#0E7490] border-[#0E7490]" : "border-gray-500"}`}>
                  {done && <span className="text-white text-xs">✓</span>}
                </div>
                <span className={`text-sm font-medium ${done ? "text-white" : "text-gray-300"}`}>{act}</span>
              </button>
            );
          })}
        </div>
        {sunnah.length === 3 && <div className="text-center text-sm font-semibold text-[#0E7490] mt-3">✅ All sunnah acts done! +30 XP</div>}
      </div>

      {/* Dua Journal */}
      <div className={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div className={sectionTitle + " mb-0"}>🤲 Dua Journal</div>
          <Button size="sm" onClick={() => setShowDuaForm((v) => !v)} className="bg-[#0E7490] hover:bg-[#0A5A6E] text-white">
            <Plus className="w-4 h-4 mr-1" /> New Dua
          </Button>
        </div>

        {showDuaForm && (
          <div className="rounded-xl border border-[#0E7490]/30 bg-[#0A1628]/60 p-4 mb-4 space-y-3">
            <Input
              placeholder="Title"
              value={duaForm.title}
              onChange={(e) => setDuaForm((f) => ({ ...f, title: e.target.value }))}
              className="bg-[#0A1628] border-[#0E7490]/30 text-white"
            />
            <Textarea
              placeholder="Your dua…"
              value={duaForm.content}
              onChange={(e) => setDuaForm((f) => ({ ...f, content: e.target.value }))}
              className="bg-[#0A1628] border-[#0E7490]/30 text-white min-h-24"
            />
            <select
              value={duaForm.category}
              onChange={(e) => setDuaForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-md border border-[#0E7490]/30 bg-[#0A1628] text-white px-3 py-2 text-sm"
            >
              {["personal", "family", "health", "guidance", "gratitude"].map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button onClick={submitDua} className="bg-[#0E7490] hover:bg-[#0A5A6E] text-white">Save</Button>
              <Button variant="outline" onClick={() => setShowDuaForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {(Array.isArray(duas) ? duas : []).map((dua: any) => (
            <div key={dua.id} className="rounded-xl border border-white/10 bg-[#0A1628]/60">
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setExpandedDua(expandedDua === dua.id ? null : dua.id)}
              >
                <div>
                  <div className="font-semibold text-white text-sm">{dua.title}</div>
                  <div className="text-xs text-[#0E7490] mt-0.5 capitalize">{dua.category}</div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedDua === dua.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(dua.id); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); deleteMutation.mutate(dua.id); } }}
                    className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </div>
                </div>
              </button>
              {expandedDua === dua.id && (
                <div className="px-4 pb-4 text-sm text-gray-300 border-t border-white/10 pt-3">{dua.content}</div>
              )}
            </div>
          ))}
          {duas.length === 0 && !showDuaForm && (
            <div className="text-center text-gray-500 text-sm py-6">No duas yet. Add your first dua above.</div>
          )}
        </div>
      </div>
    </div>
  );
}
