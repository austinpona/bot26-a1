import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform,
  Alert, ActivityIndicator, ScrollView, Switch,
} from 'react-native';
import { getSettings, updateSettings } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BotSettings } from '../../types';
import Constants from 'expo-constants';

const C = {
  bg: '#0a0e17', card: 'rgba(15,20,35,0.85)', accent: '#00ffb4',
  danger: '#ff4757', textPrimary: '#e2e8f0', textSecondary: '#8892a4',
  textMuted: '#4a5568', border: 'rgba(0,255,180,0.08)',
  font: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

const STRATEGIES = ['Scalping RSI', 'Grid Trading'];

export default function SettingsScreen() {
  const { logout } = useAuth();
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [strategy, setStrategy] = useState('Scalping RSI');
  const [sl, setSl] = useState('25');
  const [tp, setTp] = useState('50');
  const [twoFa, setTwoFa] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const s = await getSettings();
      setSettings(s);
      setStrategy(s.strategy_name);
      setSl(String(s.stop_loss));
      setTp(String(s.take_profit));
      setTwoFa(s.two_factor_enabled);
    } catch {}
  }, []);

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    const slNum = parseInt(sl, 10);
    const tpNum = parseInt(tp, 10);
    if (isNaN(slNum) || isNaN(tpNum) || slNum <= 0 || tpNum <= 0) {
      return Alert.alert('Error', 'SL and TP must be positive numbers');
    }
    setSaving(true);
    try {
      await updateSettings(strategy, slNum, tpNum);
      Alert.alert('Saved', 'Settings updated');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>SETTINGS</Text>

      {/* Strategy */}
      <View style={s.card}>
        <Text style={s.cardLabel}>STRATEGY</Text>
        <View style={s.stratRow}>
          {STRATEGIES.map(st => (
            <TouchableOpacity
              key={st}
              style={[s.stratBtn, strategy === st && s.stratBtnActive]}
              onPress={() => setStrategy(st)}
            >
              <Text style={[s.stratText, strategy === st && s.stratTextActive]}>{st.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Risk */}
      <View style={s.card}>
        <Text style={s.cardLabel}>RISK MANAGEMENT</Text>
        <View style={s.riskRow}>
          <View style={s.riskBox}>
            <Text style={s.riskLabel}>STOP LOSS (PIPS)</Text>
            <TextInput
              style={s.riskInput}
              value={sl}
              onChangeText={setSl}
              keyboardType="numeric"
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={s.riskBox}>
            <Text style={s.riskLabel}>TAKE PROFIT (PIPS)</Text>
            <TextInput
              style={s.riskInput}
              value={tp}
              onChangeText={setTp}
              keyboardType="numeric"
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>
      </View>

      {/* 2FA */}
      <View style={s.card}>
        <Text style={s.cardLabel}>SECURITY</Text>
        <View style={s.switchRow}>
          <Text style={s.switchLabel}>TWO-FACTOR AUTH</Text>
          <Switch
            value={twoFa}
            onValueChange={setTwoFa}
            trackColor={{ false: C.textMuted, true: C.accent }}
            thumbColor={twoFa ? '#fff' : '#ccc'}
          />
        </View>
      </View>

      <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={C.bg} /> : <Text style={s.saveBtnText}>SAVE SETTINGS</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutText}>LOGOUT</Text>
      </TouchableOpacity>

      <Text style={s.version}>BOT 26 A1 · v1.0.0</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 56 },
  title: { fontFamily: C.font, fontSize: 20, fontWeight: '900', color: C.textPrimary, letterSpacing: 4, marginBottom: 24 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  cardLabel: { fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: 2, marginBottom: 12 },
  stratRow: { flexDirection: 'row', gap: 8 },
  stratBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
    borderColor: C.border, alignItems: 'center',
  },
  stratBtnActive: { backgroundColor: 'rgba(0,255,180,0.12)', borderColor: C.accent },
  stratText: { fontFamily: C.font, fontSize: 9, color: C.textMuted, letterSpacing: 1 },
  stratTextActive: { color: C.accent },
  riskRow: { flexDirection: 'row', gap: 12 },
  riskBox: { flex: 1 },
  riskLabel: { fontFamily: C.font, fontSize: 9, color: C.textMuted, letterSpacing: 1, marginBottom: 8 },
  riskInput: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, borderWidth: 1, borderColor: C.border,
    color: C.textPrimary, fontFamily: C.font, fontSize: 20, fontWeight: '700',
    paddingHorizontal: 12, paddingVertical: 10, textAlign: 'center',
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontFamily: C.font, fontSize: 11, color: C.textSecondary, letterSpacing: 1 },
  saveBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  saveBtnText: { fontFamily: C.font, fontSize: 12, fontWeight: '700', color: C.bg, letterSpacing: 2 },
  logoutBtn: {
    backgroundColor: 'rgba(255,71,87,0.12)', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: C.danger, marginBottom: 24,
  },
  logoutText: { fontFamily: C.font, fontSize: 12, fontWeight: '700', color: C.danger, letterSpacing: 2 },
  version: { fontFamily: C.font, fontSize: 10, color: C.textMuted, textAlign: 'center', letterSpacing: 2 },
});
