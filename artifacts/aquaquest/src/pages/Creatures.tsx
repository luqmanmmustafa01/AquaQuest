import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fish, Sparkles, Star, ShoppingBag, RefreshCw } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const RARITY_CONFIG: Record<string, { glow: string; border: string; badge: string; label: string }> = {
  common:    { glow: "rgba(156,163,175,0.35)", border: "#9CA3AF", badge: "bg-gray-500/20 text-gray-300 border-gray-500/40",     label: "Common"    },
  rare:      { glow: "rgba(59,130,246,0.45)",  border: "#3B82F6", badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",     label: "Rare"      },
  epic:      { glow: "rgba(168,85,247,0.45)",  border: "#A855F7", badge: "bg-purple-500/20 text-purple-300 border-purple-500/40", label: "Epic"    },
  legendary: { glow: "rgba(245,158,11,0.55)",  border: "#F59E0B", badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40", label: "Legendary" },
  mythical:  { glow: "rgba(239,68,68,0.55)",   border: "#EF4444", badge: "bg-red-500/20 text-red-300 border-red-500/40",        label: "Mythical"  },
};

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

type AnimPhase = "chest" | "burst" | "cards";

function RarityBadge({ rarity }: { rarity: string }) {
  const cfg = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${cfg.badge}`}>
      {cfg.label}
    </span>
  );
}

function SummonCard({ result, index, total }: { result: SummonResult; index: number; total: number }) {
  const cfg = RARITY_CONFIG[result.fish.rarity] ?? RARITY_CONFIG.common;
  const isSingle = total === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -80, scale: 0.6, rotate: (index - total / 2) * 5 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 240, damping: 18 }}
      className="relative rounded-2xl border flex flex-col items-center gap-2 text-center"
      style={{
        padding: isSingle ? "28px 24px" : "16px 12px",
        width: isSingle ? 220 : 130,
        borderColor: cfg.border + "66",
        background: `radial-gradient(circle at 50% 0%, ${cfg.glow}, rgba(10,22,40,0.97) 70%)`,
        boxShadow: `0 0 28px ${cfg.glow}, 0 0 70px ${cfg.glow.replace("0.55","0.12").replace("0.45","0.1").replace("0.35","0.08")}`,
      }}
    >
      {result.isDuplicate && (
        <div className="absolute -top-2.5 -right-2.5 bg-yellow-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
          +10✨
        </div>
      )}
      <div style={{ fontSize: isSingle ? 72 : 40 }}>{result.fish.emoji}</div>
      <RarityBadge rarity={result.fish.rarity} />
      <p className="text-white font-bold text-sm leading-snug">{result.fish.name}</p>
      {isSingle && (
        <p className="text-muted-foreground text-xs line-clamp-3 mt-1 max-w-[180px]">
          {result.fish.description}
        </p>
      )}
    </motion.div>
  );
}

function SummonOverlay({ results, totalStardustEarned, onClose }: {
  results: SummonResult[];
  totalStardustEarned: number;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<AnimPhase>("chest");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("burst"), 1000);
    const t2 = setTimeout(() => setPhase("cards"), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "rgba(4,10,22,0.97)", backdropFilter: "blur(10px)" }}
    >
      <AnimatePresence mode="wait">
        {phase === "chest" && (
          <motion.div
            key="chest"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.8, 1.08, 0.95, 1.04, 1], opacity: 1, rotate: [0, -5, 5, -4, 4, -2, 2, 0] }}
            exit={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.95 }}
            className="flex flex-col items-center gap-5"
          >
            <div className="text-[110px] leading-none drop-shadow-2xl" style={{ filter: "drop-shadow(0 0 40px rgba(14,116,144,0.9))" }}>
              🎁
            </div>
            <p className="text-teal-400 text-xl font-bold tracking-wide animate-pulse">Opening...</p>
          </motion.div>
        )}

        {phase === "burst" && (
          <motion.div
            key="burst"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 3, 7], opacity: [1, 0.85, 0] }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute rounded-full"
            style={{
              width: 200,
              height: 200,
              background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(14,116,144,0.7) 35%, transparent 65%)",
            }}
          />
        )}
      </AnimatePresence>

      {phase === "cards" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-6 px-4 max-w-5xl w-full"
        >
          <div className="flex flex-wrap justify-center gap-3 max-h-[65vh] overflow-y-auto py-2">
            {results.map((r, i) => (
              <SummonCard key={i} result={r} index={i} total={results.length} />
            ))}
          </div>

          {totalStardustEarned > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: results.length * 0.07 + 0.25 }}
              className="px-5 py-2.5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 font-semibold text-sm"
            >
              ✨ Duplicates converted to {totalStardustEarned} Stardust
            </motion.div>
          )}

          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: results.length * 0.07 + 0.45 }}
            onClick={onClose}
            className="px-10 py-3.5 rounded-full font-bold text-lg text-white shadow-xl hover:brightness-110 transition-all"
            style={{ background: "linear-gradient(135deg, #0E7490, #155E75)" }}
          >
            Continue
          </motion.button>
        </motion.div>
      )}
    </motion.div>
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
  const accent = isFeatured ? "#A855F7" : "#0E7490";

  return (
    <div
      className="flex flex-col rounded-2xl border overflow-hidden flex-1 min-w-[280px]"
      style={{
        background: `linear-gradient(160deg, ${isFeatured ? "#1a0533" : "#041520"}, #0a1628)`,
        borderColor: accent + "44",
        boxShadow: `0 0 32px ${accent}22`,
      }}
    >
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-white font-bold text-lg">{title}</h3>
            <p className="text-sm mt-0.5" style={{ color: accent }}>{subtitle}</p>
          </div>
          <span className="text-3xl">{isFeatured ? "🌀" : "🌊"}</span>
        </div>

        {featuredFish && (
          <div className="flex items-center gap-3 p-3 rounded-xl mb-3 bg-white/[0.03] border border-white/[0.06]">
            <span className="text-3xl">{featuredFish.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{featuredFish.name}</p>
              <RarityBadge rarity={featuredFish.rarity} />
            </div>
            {isFeatured && (
              <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: accent + "25", color: accent }}>
                Boosted
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground/80 mb-1">
          <span>⚪ Common 60%</span>
          <span>🔵 Rare 25%</span>
          <span>🟣 Epic 12%</span>
          <span className={isFeatured ? "text-yellow-400/90 font-semibold" : ""}>
            🟡 Legendary {isFeatured ? "5%" : "2.75%"}
          </span>
          <span>🔴 Mythical 0.25%</span>
        </div>
        <p className="text-xs text-muted-foreground/50">Pity: Epic every 50 · Legendary every 100</p>
      </div>

      <div className="p-4 border-t grid grid-cols-2 gap-2" style={{ borderColor: accent + "25" }}>
        {([
          { count: 1 as const, currency: "tickets" as const, label: "1x 🎟️ 1 Ticket" },
          { count: 1 as const, currency: "coins" as const,   label: "1x 🪙 100" },
          { count: 10 as const, currency: "tickets" as const, label: "10x 🎟️ 8 Tickets" },
          { count: 10 as const, currency: "coins" as const,   label: "10x 🪙 800" },
        ] as const).map(({ count, currency, label }) => (
          <button
            key={`${count}-${currency}`}
            disabled={isLoading}
            onClick={() => onPull(bannerKey, count, currency)}
            className="py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            style={{
              background: currency === "tickets" ? accent : "rgba(255,255,255,0.07)",
              border: currency === "coins" ? `1px solid ${accent}44` : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FishCard({ fish }: { fish: CollectionEntry }) {
  const cfg = RARITY_CONFIG[fish.rarity] ?? RARITY_CONFIG.common;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ boxShadow: `0 0 22px ${cfg.glow}` }}
      className="rounded-2xl border p-4 flex flex-col items-center gap-2 text-center cursor-default transition-shadow"
      style={{
        borderColor: cfg.border + "44",
        background: `radial-gradient(circle at 50% 0%, ${cfg.glow.replace("0.55","0.12").replace("0.45","0.1").replace("0.35","0.07")}, rgba(10,22,40,0.92) 70%)`,
      }}
    >
      {fish.isCompanion && <div className="absolute top-2 right-2 text-xs">⭐</div>}
      <div className="text-4xl">{fish.emoji}</div>
      <RarityBadge rarity={fish.rarity} />
      <p className="text-white font-semibold text-sm leading-tight">{fish.name}</p>
    </motion.div>
  );
}

const FILTER_TABS = ["all", "common", "rare", "epic", "legendary", "mythical"];
const RARITY_ORDER = ["mythical", "legendary", "epic", "rare", "common"];

export default function Creatures() {
  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [pool, setPool] = useState<FishData[]>([]);
  const [filter, setFilter] = useState("all");
  const [summonResult, setSummonResult] = useState<{ results: SummonResult[]; totalStardustEarned: number } | null>(null);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStardustShop, setShowStardustShop] = useState(false);
  const [shopMsg, setShopMsg] = useState<string | null>(null);

  const fetchCollection = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/ocean-summon/collection`);
      if (res.ok) setCollection(await res.json());
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchCollection();
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/ocean-summon/pool`);
        if (res.ok) setPool(await res.json());
      } catch (_) {}
    })();
  }, [fetchCollection]);

  const featuredFish = pool.find((f) => f.isFeatured) ?? pool.find((f) => f.rarity === "legendary") ?? null;
  const mainHighlight = pool.find((f) => f.rarity === "mythical") ?? null;

  const handlePull = async (banner: "main" | "featured", count: 1 | 10, currency: "tickets" | "coins") => {
    setError(null);
    setPulling(true);
    try {
      const res = await fetch(`${BASE}/api/ocean-summon/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banner, count, currency }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Summon failed."); setPulling(false); return; }
      setSummonResult({ results: data.results, totalStardustEarned: data.totalStardustEarned });
    } catch (_) {
      setError("Network error. Please try again.");
    }
    setPulling(false);
  };

  const handleStardustShop = async () => {
    setShopMsg(null);
    try {
      const res = await fetch(`${BASE}/api/ocean-summon/stardust-shop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy_ticket" }),
      });
      const data = await res.json();
      setShopMsg(data.error ?? data.message ?? "Done.");
      if (res.ok) fetchCollection();
    } catch (_) { setShopMsg("Network error."); }
  };

  const filtered = (collection?.fish ?? [])
    .filter((f) => filter === "all" || f.rarity === filter)
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));

  return (
    <div className="space-y-8 pb-24">
      <AnimatePresence>
        {summonResult && (
          <SummonOverlay
            results={summonResult.results}
            totalStardustEarned={summonResult.totalStardustEarned}
            onClose={() => { setSummonResult(null); fetchCollection(); }}
          />
        )}
      </AnimatePresence>

      <div className="border-b border-border/50 pb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-2 flex items-center gap-3">
              <Fish className="w-8 h-8 text-accent" /> Aquarium
            </h1>
            <p className="text-muted-foreground">Summon ocean creatures and build your collection.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {collection && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
                <span className="text-yellow-300 font-bold">✨ {collection.stardust}</span>
                <span className="text-yellow-400/60 text-sm">Stardust</span>
              </div>
            )}
            <button
              onClick={() => { setShowStardustShop((v) => !v); setShopMsg(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 bg-card/50 text-muted-foreground hover:text-white hover:border-accent/50 transition-colors text-sm font-medium"
            >
              <ShoppingBag className="w-4 h-4" /> Stardust Shop
            </button>
          </div>
        </div>

        {showStardustShop && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-2xl border border-yellow-500/25 bg-yellow-500/5"
          >
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-yellow-400" /> Stardust Shop
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Spend 100 ✨ Stardust → 1 🎟️ Spin Ticket</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Balance: ✨ {collection?.stardust ?? 0} Stardust</p>
              </div>
              <button
                onClick={handleStardustShop}
                disabled={!collection || collection.stardust < 100}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40 transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #B45309, #92400E)" }}
              >
                Exchange 100✨ → 1🎟️
              </button>
            </div>
            {shopMsg && (
              <p className={`mt-2 text-sm font-medium ${shopMsg.toLowerCase().includes("not") || shopMsg.toLowerCase().includes("error") ? "text-red-400" : "text-green-400"}`}>
                {shopMsg}
              </p>
            )}
          </motion.div>
        )}

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">{error}</div>
        )}
      </div>

      <section>
        <h2 className="text-xl font-display font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" /> Ocean Summon
        </h2>
        <div className="flex gap-4 flex-wrap">
          <BannerCard bannerKey="main" title="Ocean Depths" subtitle="All rarities available" featuredFish={mainHighlight} isLoading={pulling} onPull={handlePull} />
          <BannerCard bannerKey="featured" title="Tidal Surge" subtitle="Boosted Legendary rate" featuredFish={featuredFish} isLoading={pulling} onPull={handlePull} />
        </div>
        {collection && (
          <div className="mt-4 flex gap-4 flex-wrap text-xs text-muted-foreground/70">
            <span>📊 Total Summons: {collection.totalSummons}</span>
            <span>🟣 Epic Pity: {collection.epicPity}/50</span>
            <span>🟡 Legendary Pity: {collection.legendaryPity}/100</span>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" /> My Collection
            {collection && (
              <span className="text-sm font-normal text-muted-foreground ml-1">({collection.fish.length})</span>
            )}
          </h2>
          <button onClick={fetchCollection} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mb-5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all border ${
                filter === tab
                  ? "text-white border-accent bg-accent/20"
                  : "text-muted-foreground border-border/40 hover:border-accent/40 hover:text-white/80"
              }`}
            >
              {tab === "all" ? "All" : RARITY_CONFIG[tab]?.label ?? tab}
            </button>
          ))}
        </div>

        {!collection || collection.fish.length === 0 ? (
          <div className="py-20 text-center rounded-3xl border border-dashed border-border/30">
            <div className="text-6xl mb-4">🐚</div>
            <h3 className="text-xl font-display font-bold text-white mb-2">No fish yet</h3>
            <p className="text-muted-foreground">Use Ocean Summon above to build your collection!</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No {filter} fish collected yet.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((fish) => (
              <FishCard key={fish.id} fish={fish} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
