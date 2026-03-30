import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, Alert, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { getAccountStatus, linkAccount } from '../../services/api';
import { AccountStatus } from '../../types';

const C = {
  bg: '#0a0e17', card: 'rgba(15,20,35,0.85)', accent: '#00ffb4',
  danger: '#ff4757', textPrimary: '#e2e8f0', textSecondary: '#8892a4',
  textMuted: '#4a5568', border: 'rgba(0,255,180,0.08)',
  font: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

const BROKERS = ['Exness', 'IC Markets', 'XM', 'Pepperstone'];

export default function BrokerScreen() {
  const [account, setAccount] = useState<AccountStatus | null>(null);
  const [broker, setBroker] = useState(BROKERS[0]);
  const [server, setServer] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showBrokerPicker, setShowBrokerPicker] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await getAccountStatus();
      setAccount(s);
    } catch {}
  }, []);

  useEffect(() => { fetchStatus(); }, []);

  const handleLink = async () => {
    if (!server || !accountNumber || !password) {
      return Alert.alert('Error', 'Fill in all fields');
    }
    setLoading(true);
    try {
      await linkAccount(broker, server, accountNumber, password);
      await fetchStatus();
      Alert.alert('Success', 'Broker account linked successfully');
    } catch (e: any) {
      Alert.alert('Link Failed', e?.response?.data?.detail || 'Could not link account');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert('Disconnect', 'Unlink this broker account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect', style: 'destructive', onPress: async () => {
          setAccount({ linked: false });
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
    >
      <Text style={s.title}>BROKER</Text>

      {account?.linked ? (
        <View style={s.card}>
          <Text style={s.successIcon}>✓</Text>
          <Text style={s.successText}>ACCOUNT LINKED</Text>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>BROKER</Text>
            <Text style={s.infoVal}>{account.broker}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>SERVER</Text>
            <Text style={s.infoVal}>{account.server}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>ACCOUNT</Text>
            <Text style={s.infoVal}>{account.account_number}</Text>
          </View>
          <Text style={s.encrypted}>⚿ Credentials encrypted with AES-256</Text>
          <TouchableOpacity style={s.dangerBtn} onPress={handleDisconnect}>
            <Text style={s.dangerBtnText}>DISCONNECT</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.cardLabel}>BROKER</Text>
          <TouchableOpacity style={s.picker} onPress={() => setShowBrokerPicker(!showBrokerPicker)}>
            <Text style={s.pickerText}>{broker}</Text>
            <Text style={s.pickerArrow}>▾</Text>
          </TouchableOpacity>
          {showBrokerPicker && (
            <View style={s.pickerDropdown}>
              {BROKERS.map(b => (
                <TouchableOpacity key={b} style={s.pickerItem} onPress={() => { setBroker(b); setShowBrokerPicker(false); }}>
                  <Text style={[s.pickerItemText, b === broker && { color: C.accent }]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[s.cardLabel, { marginTop: 16 }]}>SERVER</Text>
          <TextInput style={s.input} value={server} onChangeText={setServer} placeholder="e.g. Exness-MT5Real" placeholderTextColor={C.textMuted} />

          <Text style={[s.cardLabel, { marginTop: 12 }]}>ACCOUNT NUMBER</Text>
          <TextInput style={s.input} value={accountNumber} onChangeText={setAccountNumber} placeholder="123456789" placeholderTextColor={C.textMuted} keyboardType="numeric" />

          <Text style={[s.cardLabel, { marginTop: 12 }]}>PASSWORD</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={C.textMuted} />

          <Text style={s.encrypted}>⚿ Credentials encrypted with AES-256</Text>

          <TouchableOpacity style={s.btn} onPress={handleLink} disabled={loading}>
            {loading ? <ActivityIndicator color={C.bg} /> : <Text style={s.btnText}>VALIDATE & LINK</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 56 },
  title: { fontFamily: C.font, fontSize: 20, fontWeight: '900', color: C.textPrimary, letterSpacing: 4, marginBottom: 24 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border },
  cardLabel: { fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: 2, marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: C.border,
    color: C.textPrimary, fontFamily: C.font, fontSize: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 4,
  },
  picker: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontFamily: C.font, fontSize: 14, color: C.textPrimary },
  pickerArrow: { color: C.textMuted, fontSize: 14 },
  pickerDropdown: { backgroundColor: 'rgba(15,20,35,0.98)', borderRadius: 12, borderWidth: 1, borderColor: C.border, marginTop: 4 },
  pickerItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  pickerItemText: { fontFamily: C.font, fontSize: 13, color: C.textSecondary },
  encrypted: { fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: 1, textAlign: 'center', marginVertical: 16 },
  btn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnText: { fontFamily: C.font, fontSize: 12, fontWeight: '700', color: C.bg, letterSpacing: 2 },
  successIcon: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  successText: { fontFamily: C.font, fontSize: 14, color: C.accent, letterSpacing: 3, textAlign: 'center', marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  infoLabel: { fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: 2 },
  infoVal: { fontFamily: C.font, fontSize: 12, color: C.textPrimary },
  dangerBtn: { backgroundColor: 'rgba(255,71,87,0.15)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.danger, marginTop: 16 },
  dangerBtnText: { fontFamily: C.font, fontSize: 12, fontWeight: '700', color: C.danger, letterSpacing: 2 },
});
