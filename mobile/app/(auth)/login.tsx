import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

const C = {
  bg: '#0a0e17',
  card: 'rgba(15,20,35,0.85)',
  accent: '#00ffb4',
  danger: '#ff4757',
  textPrimary: '#e2e8f0',
  textSecondary: '#8892a4',
  textMuted: '#4a5568',
  border: 'rgba(0,255,180,0.08)',
  font: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Fill in all fields');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      Alert.alert('Login Failed', e?.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.logoBox}>
          <Text style={s.logoMain}>BOT 26</Text>
          <Text style={s.logoSub}>A1 · TRADING</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>EMAIL</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={C.textMuted}
            placeholder="trader@example.com"
          />

          <Text style={[s.label, { marginTop: 16 }]}>PASSWORD</Text>
          <View style={s.pwRow}>
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              placeholderTextColor={C.textMuted}
              placeholder="••••••••"
            />
            <TouchableOpacity onPress={() => setShowPw(!showPw)} style={s.eyeBtn}>
              <Text style={s.eyeText}>{showPw ? 'HIDE' : 'SHOW'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={C.bg} />
            ) : (
              <Text style={s.btnText}>SIGN IN</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={s.link}>DON'T HAVE AN ACCOUNT? REGISTER</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoBox: { alignItems: 'center', marginBottom: 40 },
  logoMain: { fontFamily: C.font, fontSize: 48, fontWeight: '900', color: C.accent, letterSpacing: 8 },
  logoSub: { fontFamily: C.font, fontSize: 12, color: C.textSecondary, letterSpacing: 6, marginTop: 4 },
  card: {
    backgroundColor: C.card, borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: C.border,
  },
  label: {
    fontFamily: C.font, fontSize: 10, color: C.textMuted,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    color: C.textPrimary, fontFamily: C.font, fontSize: 14,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 4,
  },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyeBtn: { padding: 12 },
  eyeText: { fontFamily: C.font, fontSize: 10, color: C.accent, letterSpacing: 1 },
  btn: {
    backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 24,
  },
  btnText: { fontFamily: C.font, fontSize: 13, fontWeight: '700', color: C.bg, letterSpacing: 2 },
  link: {
    fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: 1,
    textAlign: 'center', marginTop: 20,
  },
});
