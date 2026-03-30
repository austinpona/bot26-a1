import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

const C = {
  bg: '#0a0e17', card: 'rgba(15,20,35,0.85)', accent: '#00ffb4',
  textPrimary: '#e2e8f0', textSecondary: '#8892a4', textMuted: '#4a5568',
  border: 'rgba(0,255,180,0.08)',
  font: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) return Alert.alert('Error', 'Fill in all fields');
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (e: any) {
      Alert.alert('Registration Failed', e?.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.logoBox}>
          <Text style={s.logoMain}>BOT 26</Text>
          <Text style={s.logoSub}>A1 · CREATE ACCOUNT</Text>
        </View>

        <View style={s.card}>
          {[
            { label: 'NAME', val: name, set: setName, kbType: 'default' as const },
            { label: 'EMAIL', val: email, set: setEmail, kbType: 'email-address' as const },
            { label: 'PASSWORD', val: password, set: setPassword, kbType: 'default' as const, secure: true },
          ].map(({ label, val, set, kbType, secure }) => (
            <View key={label}>
              <Text style={s.label}>{label}</Text>
              <TextInput
                style={s.input}
                value={val}
                onChangeText={set}
                keyboardType={kbType}
                autoCapitalize={kbType === 'email-address' ? 'none' : 'words'}
                secureTextEntry={!!secure}
                placeholderTextColor={C.textMuted}
              />
            </View>
          ))}

          <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color={C.bg} /> : <Text style={s.btnText}>CREATE ACCOUNT</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.link}>ALREADY HAVE AN ACCOUNT? SIGN IN</Text>
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
  logoSub: { fontFamily: C.font, fontSize: 11, color: C.textSecondary, letterSpacing: 4, marginTop: 4 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border },
  label: { fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: 2, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: C.border,
    color: C.textPrimary, fontFamily: C.font, fontSize: 14, paddingHorizontal: 16, paddingVertical: 12,
  },
  btn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  btnText: { fontFamily: C.font, fontSize: 13, fontWeight: '700', color: C.bg, letterSpacing: 2 },
  link: { fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: 1, textAlign: 'center', marginTop: 20 },
});
