import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View, Text } from 'react-native';

const C = {
  bg: '#0a0e17',
  accent: '#00ffb4',
  textMuted: '#4a5568',
  font: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={[tabS.iconWrap, focused && tabS.iconActive]}>
      <Text style={[tabS.iconLabel, { color: focused ? C.accent : C.textMuted }]}>{label}</Text>
    </View>
  );
}

const tabS = StyleSheet.create({
  iconWrap: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  iconActive: { backgroundColor: 'rgba(0,255,180,0.08)' },
  iconLabel: { fontFamily: C.font, fontSize: 9, letterSpacing: 1 },
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: 'rgba(0,255,180,0.08)',
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: {
          fontFamily: C.font,
          fontSize: 9,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'HOME', tabBarIcon: ({ focused }) => <TabIcon label="⊞" focused={focused} /> }} />
      <Tabs.Screen name="signals" options={{ title: 'SIGNALS', tabBarIcon: ({ focused }) => <TabIcon label="≡" focused={focused} /> }} />
      <Tabs.Screen name="broker" options={{ title: 'BROKER', tabBarIcon: ({ focused }) => <TabIcon label="⚭" focused={focused} /> }} />
      <Tabs.Screen name="license" options={{ title: 'LICENSE', tabBarIcon: ({ focused }) => <TabIcon label="⚿" focused={focused} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'CONFIG', tabBarIcon: ({ focused }) => <TabIcon label="⚙" focused={focused} /> }} />
    </Tabs>
  );
}
