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
    { icon: "🪙", value: data?.coins ?? 0 },
    { icon: "💎", value: data?.gems ?? 0 },
    { icon: "🎟️", value: data?.spinTickets ?? 0 },
  ];

  return (
    <div className="sticky top-0 z-30 w-full border-b border-[#0E7490]/20 bg-[#0A1628]/90 backdrop-blur-md">
      <div className="flex items-center justify-end gap-4 px-5 py-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="text-sm leading-none">{item.icon}</span>
            <span className="text-xs font-bold text-white tabular-nums">{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
