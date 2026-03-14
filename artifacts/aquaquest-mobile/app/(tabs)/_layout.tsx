import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="workouts">
        <Icon sf={{ default: "dumbbell", selected: "dumbbell.fill" }} />
        <Label>Workouts</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="quests">
        <Icon sf={{ default: "map", selected: "map.fill" }} />
        <Label>Goals</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="creatures">
        <Icon sf={{ default: "fish", selected: "fish.fill" }} />
        <Label>Aquarium</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="achievements">
        <Icon sf={{ default: "trophy", selected: "trophy.fill" }} />
        <Label>Achievements</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.teal,
        tabBarInactiveTintColor: Colors.textDim,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.navy,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: Colors.border,
          elevation: 0,
          paddingBottom: insets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.navy }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="chart.bar.fill" tintColor={color} size={size} />
            ) : (
              <Ionicons name="bar-chart" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workouts",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="dumbbell.fill" tintColor={color} size={size} />
            ) : (
              <Ionicons name="barbell" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: "Goals",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="map.fill" tintColor={color} size={size} />
            ) : (
              <Feather name="map" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="creatures"
        options={{
          title: "Aquarium",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="fish.fill" tintColor={color} size={size} />
            ) : (
              <Ionicons name="fish" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: "Achievements",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="trophy.fill" tintColor={color} size={size} />
            ) : (
              <Ionicons name="trophy" size={size} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
