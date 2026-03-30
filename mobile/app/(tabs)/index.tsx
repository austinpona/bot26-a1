import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  ScrollView, RefreshControl, ActivityIndicator, Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getBotStatus, getAccountStatus, getLicenseStatus, startBot, stopBot, getLogs, createLiveLogsSocket } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BotStatus, AccountStatus, LicenseStatus, LiveLog } from '../../types';

const C = {
  bg: '#0a0e17', card: 'rgba(15,20,35,0.85)', accent: '#00ffb4',
  danger: '#ff4757', textPrimary: '#e2e8f0', textSecondary: '#8892a4',
  textMuted: '#4a5568', border: 'rgba(0,255,180,0.08)',
  font: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

function PulseDot({ active }: { active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.5, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scale.setValue(1);
    }
  }, [active]);

  return (
    <Animated.View style={[
      { width: 8, height: 8, borderRadius: 4, backgroundColor: active ? C.accent : C.danger },
      { transform: [{ scale }] }
    ]} />
  );
}

export default function DashboardScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [account, setAccount] = useState<AccountStatus | null>(null);
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [liveLogs, setLiveLogs] = useState<LiveLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const canStart = account?.linked && license?.active;

  const fetch = useCallback(async () => {
    try {
      const [bs, acc, lic] = await Promise.all([getBotStatus(), getAccountStatus(), getLicenseStatus()]);
      setBotStatus(bs);
      setAccount(acc);
      setLicense(lic);
    } catch {}
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token) return;
    wsRef.current = createLiveLogsSocket(token, (data) => {
      setLiveLogs((prev) => [data, ...prev].slice(0, 20));
    });
    return () => wsRef.current?.close();
  }, [token]);

  useEffect(() => {
    if (botStatus?.is_active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [botStatus?.is_active]);

  const handleToggle = async () => {
    if (!canStart && !botStatus?.is_active) {
      Alert.alert('Cannot Start', 'Link a broker and activate a license first.');
      return;
    }
    setToggling(true);
    try {
      if (botStatus?.is_active) {
        await stopBot();
      } else {
        await startBot();
      }
      await fetch();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Something went wrong');
    } finally {
      setToggling(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  };

  const isActive = botStatus?.is_active ?? false;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
    >
      <Text style={s.title}>BOT 26 A1</Text>
      <Text style={s.subtitle}>TRADING DASHBOARD</Text>

      <View style={s.powerWrap}>
        <Animated.View style={[s.powerGlow, { shadowColor: isActive ? C.accent : C.danger }, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={[s.powerBtn, { borderColor: isActive ? C.accent : C.danger, opacity: (!canStart && !isActive) ? 0.4 : 1 }]}
            onPress={handleToggle}
            disabled={toggling}
          >
            {toggling ? (
              <ActivityIndicator color={isActive ? C.danger : C.accent} />
            ) : (
              <Text style={[s.powerIcon, { color: isActive ? C.accent : C.danger }]}>⏻</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={s.statusRow}>
          <PulseDot active={isActive} />
          <Text style={[s.statusText, { color: isActive ? C.accent : C.danger }]}>
            {isActive ? 'RUNNING' : 'STOPPED'}
          </Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>ACCOUNT SUMMARY</Text>
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statVal}>${botStatus?.balance?.toFixed(2) ?? '—'}</Text>
            <Text style={s.statLabel}>BALANCE</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statVal}>${botStatus?.equity?.toFixed(2) ?? '—'}</Text>
            <Text style={s.statLabel}>EQUITY</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statVal}>{botStatus?.open_trades_count ?? '—'}</Text>
            <Text style={s.statLabel}>OPEN TRADES</Text>
          </View>
        </View>
        <Text style={s.strategyText}>{botStatus?.strategy ?? 'Scalping RSI'}</Text>
      </View>

      <View style={s.gridRow}>
        <TouchableOpacity style={[s.card, s.halfCard]} onPress={() => router.push('/(tabs)/broker')}>
          <Text style={s.cardLabel}>BROKER</Text>
          <Text style={[s.statusBadge, { color: account?.linked ? C.accent : C.danger }]}>
            {account?.linked ? '✓ LINKED' : '✗ NOT LINKED'}
          </Text>
          {account?.broker && <Text style={s.brokerName}>{account.broker}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[s.card, s.halfCard]} onPress={() => router.push('/(tabs)/license')}>
          <Text style={s.cardLabel}>LICENSE</Text>
          <Text style={[s.statusBadge, { color: license?.active ? C.accent : C.danger }]}>
            {license?.active ? '✓ ACTIVE' : '✗ INACTIVE'}
          </Text>
          {license?.expires_at && (
            <Text style={s.expiry}>EXP {new Date(license.expires_at).toLocaleDateString()}</Text>
          )}
        </TouchableOpacity>
      </View>

      {isActive && liveLogs.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardLabel}>LIVE FEED</Text>
          {liveLogs.slice(0, 3).map((log, i) => (
            <Text key={i} style={s.logLine}>
              {new Date(log.timestamp).toLocaleTimeString()} — {log.message}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 56 },
  title: { fontFamily: C.font, fontSize: 28, fontWeight: '900', color: C.accent, letterSpacing: 6, textAlign: 'center' },
  subtitle: { fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: 4, textAlign: 'center', marginBottom: 32 },
  powerWrap: { alignItems: 'center', marginBottom: 32 },
  powerGlow: {
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20,
    borderRadius: 60, marginBottom: 12,
  },
  powerBtn: {
    width: 110, height: 110, borderRadius: 55, borderWidth: 3,
    backgroundColor: 'rgba(15,20,35,0.95)', alignItems: 'center', justifyContent: 'center',
  },
  powerIcon: { fontSize: 40 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontFamily: C.font, fontSize: 12, letterSpacing: 3 },
  card: {
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 12,
  },
  cardLabel: { fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: 2, marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { alignItems: 'center' },
  statVal: { fontFamily: C.font, fontSize: 18, fontWeight: '700', color: C.textPrimary },
  statLabel: { fontFamily: C.font, fontSize: 9, color: C.textMuted, letterSpacing: 1, marginTop: 4 },
  strategyText: { fontFamily: C.font, fontSize: 10, color: C.accent, letterSpacing: 2, textAlign: 'center', marginTop: 12 },
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  halfCard: { flex: 1, marginBottom: 12 },
  statusBadge: { fontFamily: C.font, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  brokerName: { fontFamily: C.font, fontSize: 10, color: C.textSecondary, marginTop: 4 },
  expiry: { fontFamily: C.font, fontSize: 9, color: C.textMuted, marginTop: 4 },
  logLine: { fontFamily: C.font, fontSize: 11, color: C.textSecondary, marginBottom: 4 },
});
