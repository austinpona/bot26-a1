import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl, FlatList } from 'react-native';
import { getBotStatus, getLogs, createLiveLogsSocket } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LogEntry, LiveLog, BotStatus } from '../../types';

const C = {
  bg: '#0a0e17', card: 'rgba(15,20,35,0.85)', accent: '#00ffb4',
  danger: '#ff4757', textPrimary: '#e2e8f0', textSecondary: '#8892a4',
  textMuted: '#4a5568', border: 'rgba(0,255,180,0.08)',
  font: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

function logColor(msg: string, status?: string): string {
  if (status === 'TP_HIT' || msg.includes('TP')) return C.accent;
  if (status === 'SL_HIT' || msg.includes('SL')) return C.danger;
  if (msg.includes('BUY') || msg.includes('SELL')) return C.textPrimary;
  return C.textMuted;
}

export default function SignalsScreen() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [liveLogs, setLiveLogs] = useState<LiveLog[]>([]);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [l, bs] = await Promise.all([getLogs(1, 30), getBotStatus()]);
      setLogs(l);
      setBotStatus(bs);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token) return;
    wsRef.current = createLiveLogsSocket(token, (data) => {
      setLiveLogs((prev) => [data, ...prev].slice(0, 50));
    });
    return () => wsRef.current?.close();
  }, [token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const isLive = botStatus?.is_active ?? false;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
    >
      <View style={s.header}>
        <Text style={s.title}>SIGNALS</Text>
        <View style={s.liveRow}>
          <View style={[s.dot, { backgroundColor: isLive ? C.accent : C.textMuted }]} />
          <Text style={[s.liveText, { color: isLive ? C.accent : C.textMuted }]}>
            {isLive ? 'LIVE' : 'OFF'}
          </Text>
        </View>
      </View>

      {/* Open Positions */}
      <View style={s.card}>
        <Text style={s.cardLabel}>OPEN POSITIONS</Text>
        {logs.filter(l => l.status === 'OPEN').length === 0 ? (
          <Text style={s.empty}>No open positions</Text>
        ) : (
          logs.filter(l => l.status === 'OPEN').map(log => (
            <View key={log.id} style={s.posRow}>
              <Text style={s.posSymbol}>{log.symbol}</Text>
              <View style={[s.tag, { backgroundColor: log.action === 'BUY' ? 'rgba(0,255,180,0.15)' : 'rgba(255,71,87,0.15)' }]}>
                <Text style={[s.tagText, { color: log.action === 'BUY' ? C.accent : C.danger }]}>{log.action}</Text>
              </View>
              <Text style={s.posPrice}>{log.entry_price.toFixed(5)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Live Activity Feed */}
      <View style={s.card}>
        <Text style={s.cardLabel}>ACTIVITY FEED</Text>
        {liveLogs.length === 0 && logs.length === 0 ? (
          <Text style={s.empty}>No activity yet</Text>
        ) : (
          <>
            {liveLogs.map((l, i) => (
              <View key={`live-${i}`} style={s.logRow}>
                <Text style={s.logTime}>{new Date(l.timestamp).toLocaleTimeString()}</Text>
                <Text style={[s.logMsg, { color: logColor(l.message) }]}>{l.message}</Text>
              </View>
            ))}
            {logs.map(log => (
              <View key={log.id} style={s.logRow}>
                <Text style={s.logTime}>{new Date(log.created_at).toLocaleTimeString()}</Text>
                <Text style={[s.logMsg, { color: logColor(log.log_message, log.status) }]}>{log.log_message}</Text>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontFamily: C.font, fontSize: 20, fontWeight: '900', color: C.textPrimary, letterSpacing: 4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontFamily: C.font, fontSize: 10, letterSpacing: 2 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  cardLabel: { fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: 2, marginBottom: 12 },
  empty: { fontFamily: C.font, fontSize: 11, color: C.textMuted, textAlign: 'center', padding: 12 },
  posRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  posSymbol: { fontFamily: C.font, fontSize: 13, color: C.textPrimary, fontWeight: '700', flex: 1 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontFamily: C.font, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  posPrice: { fontFamily: C.font, fontSize: 12, color: C.textSecondary },
  logRow: { flexDirection: 'row', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  logTime: { fontFamily: C.font, fontSize: 10, color: C.textMuted, width: 70 },
  logMsg: { fontFamily: C.font, fontSize: 11, flex: 1 },
});
