import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchCurrency() {
  const res = await fetch(`${BASE}/api/currency`);
  if (!res.ok) throw new Error("Failed to fetch currency");
  return res.json() as Promise<{ coins: number; gems: number; spinTickets: number }>;
}

export function CurrencyBar() {
  const { data } = useQuery({ queryKey: ["currency"], queryFn: fetchCurrency, staleTime: 30_000 });

  const items = [
    { icon: "🪙", label: "Coins", value: data?.coins ?? 0 },
    { icon: "💎", label: "Gems", value: data?.gems ?? 0 },
    { icon: "🎟️", label: "Tickets", value: data?.spinTickets ?? 0 },
  ];

  return (
    <div className="sticky top-0 z-30 w-full border-b border-[#0E7490]/30 bg-[#0A1628]/90 backdrop-blur-md">
      <div className="flex items-center justify-end gap-6 px-6 py-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-xs font-semibold text-[#0E7490] uppercase tracking-wider">{item.label}</span>
            <span className="text-sm font-bold text-white ml-1">{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
