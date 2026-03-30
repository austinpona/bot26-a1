import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, Alert, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { getLicenseStatus, validateLicense } from '../../services/api';
import { LicenseStatus } from '../../types';

const C = {
  bg: '#0a0e17', card: 'rgba(15,20,35,0.85)', accent: '#00ffb4',
  danger: '#ff4757', textPrimary: '#e2e8f0', textSecondary: '#8892a4',
  textMuted: '#4a5568', border: 'rgba(0,255,180,0.08)',
  font: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export default function LicenseScreen() {
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const l = await getLicenseStatus();
      setLicense(l);
    } catch {}
  }, []);

  useEffect(() => { fetchStatus(); }, []);

  const handleValidate = async () => {
    if (key.trim().length < 10) return Alert.alert('Error', 'Enter a valid license key');
    setLoading(true);
    try {
      const result = await validateLicense(key.trim());
      setLicense(result);
      Alert.alert('Success', 'License activated successfully');
    } catch (e: any) {
      Alert.alert('Invalid License', e?.response?.data?.detail || 'License key rejected');
    } finally {
      setLoading(false);
    }
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
      <Text style={s.title}>LICENSE</Text>

      {license?.active ? (
        <View style={s.card}>
          <Text style={s.bigIcon}>✓</Text>
          <View style={s.badge}>
            <Text style={s.badgeText}>ACTIVE</Text>
          </View>
          <Text style={s.maskedKey}>{license.license_key_masked}</Text>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>PLAN</Text>
            <Text style={s.infoVal}>Bot 26 A1 Pro</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>EXPIRES</Text>
            <Text style={s.infoVal}>
              {license.expires_at ? new Date(license.expires_at).toLocaleDateString() : '—'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.bigIcon}>⚿</Text>
          <Text style={s.instructions}>ENTER YOUR LICENSE KEY TO ACTIVATE BOT 26 A1</Text>
          <TextInput
            style={s.keyInput}
            value={key}
            onChangeText={setKey}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity style={s.btn} onPress={handleValidate} disabled={loading}>
            {loading ? <ActivityIndicator color={C.bg} /> : <Text style={s.btnText}>VALIDATE LICENSE</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 56, alignItems: 'stretch' },
  title: { fontFamily: C.font, fontSize: 20, fontWeight: '900', color: C.textPrimary, letterSpacing: 4, marginBottom: 24 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  bigIcon: { fontSize: 48, marginBottom: 12 },
  badge: { backgroundColor: 'rgba(0,255,180,0.15)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 16 },
  badgeText: { fontFamily: C.font, fontSize: 12, color: C.accent, letterSpacing: 3, fontWeight: '700' },
  maskedKey: { fontFamily: C.font, fontSize: 16, color: C.textPrimary, letterSpacing: 4, marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  infoLabel: { fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: 2 },
  infoVal: { fontFamily: C.font, fontSize: 12, color: C.textPrimary },
  instructions: { fontFamily: C.font, fontSize: 11, color: C.textSecondary, letterSpacing: 1, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  keyInput: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: C.border,
    color: C.accent, fontFamily: C.font, fontSize: 18, paddingHorizontal: 20, paddingVertical: 16,
    letterSpacing: 4, textAlign: 'center', width: '100%', marginBottom: 20,
  },
  btn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', width: '100%' },
  btnText: { fontFamily: C.font, fontSize: 12, fontWeight: '700', color: C.bg, letterSpacing: 2 },
});
