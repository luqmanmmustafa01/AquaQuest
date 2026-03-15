import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN ?? "";

async function fetchCurrency() {
  const res = await fetch(`${BASE_URL}/api/currency`);
  if (!res.ok) throw new Error("Failed to fetch currency");
  return res.json() as Promise<{ coins: number; gems: number; spinTickets: number }>;
}

export function CurrencyHeader() {
  const { data } = useQuery({ queryKey: ["currency"], queryFn: fetchCurrency, staleTime: 30_000 });

  const items = [
    { icon: "🪙", label: "Coins", value: data?.coins ?? 0 },
    { icon: "💎", label: "Gems", value: data?.gems ?? 0 },
    { icon: "🎟️", label: "Tickets", value: data?.spinTickets ?? 0 },
  ];

  return (
    <View style={styles.bar}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <Text style={styles.icon}>{item.icon}</Text>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value.toLocaleString()}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: Colors.navy,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  icon: {
    fontSize: 13,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.teal,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginLeft: 2,
  },
});
