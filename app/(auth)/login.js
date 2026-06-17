// app/(auth)/login.js
// Dipindahkan dari: app/(tabs)/HalamanLogin.js
// Perubahan: handleLogin menggunakan useAuth().login() | router paths diperbarui

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

const HalamanLogin = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ username: '', password: '' });

  const validateUsername = (text) => text.length >= 3;

  const handleUsernameChange = (text) => {
    setUsername(text);
    if (text === '') setErrors({ ...errors, username: '' });
    else if (!validateUsername(text)) setErrors({ ...errors, username: 'Username minimal 3 karakter' });
    else setErrors({ ...errors, username: '' });
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (text === '') setErrors({ ...errors, password: '' });
    else if (text.length < 6) setErrors({ ...errors, password: 'Password minimal 6 karakter' });
    else setErrors({ ...errors, password: '' });
  };

  const handleLogin = async () => {
    if (!username) { setErrors({ ...errors, username: 'Username tidak boleh kosong' }); return; }
    if (!password) { setErrors({ ...errors, password: 'Password tidak boleh kosong' }); return; }
    if (!validateUsername(username)) { setErrors({ ...errors, username: 'Username minimal 3 karakter' }); return; }
    if (password.length < 6) { setErrors({ ...errors, password: 'Password minimal 6 karakter' }); return; }

    setLoading(true);
    try {
      // login() dari AuthContext — setelah berhasil, index.js akan redirect
      // ke group yang sesuai dengan userRole.
      const loggedUser = await login({ username, password });

      // Redirect eksplisit berdasarkan role
      if (loggedUser.role === 'pegawai') {
        router.replace('/(pegawai)/beranda');
      } else {
        router.replace('/(masyarakat)/beranda');
      }

      setUsername('');
      setPassword('');
      setErrors({ username: '', password: '' });
    } catch (error) {
      Alert.alert('Login Gagal', error.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleLupaPassword = () => router.push('/(auth)/lupa-sandi');
  const handleDaftar = () => router.push('/(auth)/register');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/LOGO-PUPR2.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.illustrationContainer}>
          <Image
            source={require('../../assets/images/orang.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>Selamat Datang!</Text>
          <Text style={styles.welcomeSubtitle}>Silahkan masuk untuk melanjutkan</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrapper, errors.username && styles.inputErrorBorder]}>
              <Icon name="account-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nama Pengguna"
                placeholderTextColor="#999"
                value={username}
                onChangeText={handleUsernameChange}
                editable={!loading}
                autoCapitalize="none"
              />
            </View>
            {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <View style={[styles.inputWrapper, errors.password && styles.inputErrorBorder]}>
              <Icon name="lock-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Kata Sandi"
                placeholderTextColor="#999"
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}>
                <Icon name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#999" />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          <TouchableOpacity onPress={handleLupaPassword} disabled={loading}>
            <Text style={styles.lupaPasswordText}>Lupa Kata Sandi?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={styles.loginButtonText}>Masuk</Text>
            )}
          </TouchableOpacity>

          <View style={styles.daftarContainer}>
            <Text style={styles.daftarText}>Belum punya akun? </Text>
            <TouchableOpacity onPress={handleDaftar} disabled={loading}>
              <Text style={styles.daftarLink}>Daftar Sekarang</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 20 },
  logoContainer: { alignItems: 'center', marginTop: 28, marginBottom: 20 },
  logo: { width: 120, height: 60, marginBottom: 8 },
  illustrationContainer: { alignItems: 'center', marginVertical: 20, height: 220 },
  illustration: { width: '100%', height: '100%' },
  welcomeContainer: { alignItems: 'center', marginBottom: 30 },
  welcomeTitle: { fontSize: 26, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  welcomeSubtitle: { fontSize: 14, color: '#666' },
  formContainer: { marginBottom: 30 },
  inputGroup: { marginBottom: 16 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#f9f9f9',
  },
  inputErrorBorder: { borderColor: '#ff6b6b', backgroundColor: '#fff5f5' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#333', padding: 0 },
  errorText: { color: '#ff6b6b', fontSize: 12, marginTop: 6, marginLeft: 4 },
  lupaPasswordText: { fontSize: 13, color: '#1F3B6D', fontWeight: '600', textAlign: 'right', marginBottom: 20 },
  loginButton: {
    backgroundColor: '#F4C430', paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 5,
  },
  loginButtonDisabled: { backgroundColor: '#f0d76d', opacity: 0.7 },
  loginButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  daftarContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  daftarText: { fontSize: 13, color: '#666' },
  daftarLink: { fontSize: 13, color: '#F4C430', fontWeight: 'bold' },
});

export default HalamanLogin;
