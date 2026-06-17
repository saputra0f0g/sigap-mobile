import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import authService from '../../services/authService';

const HalamanRegister = () => {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    fullName: '', username: '', email: '', phone: '', password: '', confirmPassword: '',
  });

  const setError = (field, msg) =>
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));

  const clearError = (field) =>
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));

  const handleRegister = async () => {
    // ── Reset errors ──────────────────────────────────────────────────────────
    const errs = { fullName: '', username: '', email: '', phone: '', password: '', confirmPassword: '' };
    let hasError = false;

    if (!fullName.trim()) {
      errs.fullName = 'Nama lengkap wajib diisi';
      hasError = true;
    }
    if (!username.trim()) {
      errs.username = 'Username wajib diisi';
      hasError = true;
    } else if (username.trim().length < 3) {
      errs.username = 'Username minimal 3 karakter';
      hasError = true;
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!email.trim()) {
      errs.email = 'Email wajib diisi';
      hasError = true;
    } else if (!emailRegex.test(email)) {
      errs.email = 'Format email tidak valid';
      hasError = true;
    }
    if (!phone.trim()) {
      errs.phone = 'Nomor WhatsApp wajib diisi';
      hasError = true;
    } else if (phone.length < 10) {
      errs.phone = 'Nomor WhatsApp minimal 10 digit';
      hasError = true;
    }
    if (!password) {
      errs.password = 'Kata sandi wajib diisi';
      hasError = true;
    } else if (password.length < 8) {
      errs.password = 'Kata sandi minimal 8 karakter';
      hasError = true;
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Konfirmasi kata sandi wajib diisi';
      hasError = true;
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Konfirmasi kata sandi tidak cocok';
      hasError = true;
    }

    setFieldErrors(errs);
    if (hasError) return;

    // ── Kirim ke API Laravel ───────────────────────────────────────────────
    setLoading(true);
    try {
      await authService.register({
        name: fullName,
        username: username,
        email: email,
        phone: phone,
        password: password,
        passwordConfirmation: confirmPassword,
      });

      // Registrasi berhasil → arahkan user ke halaman login
      Alert.alert(
        '✅ Akun Berhasil Dibuat',
        'Silakan login dengan email dan password yang telah didaftarkan.',
        [
          {
            text: 'Login Sekarang',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error) {
      // Error dari API (misal: email sudah ada, username sudah ada)
      Alert.alert('Gagal Mendaftar', error.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.mainContainer}>

            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/LOGO-PUPR2.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.logoTitle}>SIGAP MEMBANGUN NEGERI</Text>
            </View>

            {/* Title Section */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Daftar Akun Baru</Text>
              <Text style={styles.welcomeSubtitle}>Silahkan lengkapi data untuk mendaftar</Text>
            </View>

            {/* Form Section */}
            <View style={styles.form}>

              {/* Nama Lengkap */}
              <View style={styles.inputWrapper}>
                <FontAwesome name="user" size={20} color="#BFBFBF" style={styles.iconStyle} />
                <TextInput
                  style={styles.input}
                  placeholder="Nama Lengkap"
                  placeholderTextColor="#A0A0A0"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                />
              </View>

              {/* Username */}
              <View style={styles.inputWrapper}>
                <FontAwesome name="user" size={20} color="#BFBFBF" style={styles.iconStyle} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#A0A0A0"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              {/* Email */}
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={20} color="#BFBFBF" style={styles.iconStyle} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#A0A0A0"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              {/* Nomor WhatsApp */}
              <View style={styles.inputWrapper}>
                <Ionicons name="logo-whatsapp" size={20} color="#BFBFBF" style={styles.iconStyle} />
                <TextInput
                  style={styles.input}
                  placeholder="Nomor WhatsApp (Contoh: 0812...)"
                  placeholderTextColor="#A0A0A0"
                  value={phone}
                  onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                  keyboardType="phone-pad"
                  maxLength={13}
                  editable={!loading}
                />
              </View>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <FontAwesome name="lock" size={22} color="#BFBFBF" style={styles.iconStyle} />
                <TextInput
                  style={styles.input}
                  placeholder="Kata Sandi (min. 6 karakter)"
                  placeholderTextColor="#A0A0A0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}>
                  <Ionicons
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={22}
                    color="#BFBFBF"
                  />
                </TouchableOpacity>
              </View>

              {/* Konfirmasi Password */}
              <View style={styles.inputWrapper}>
                <FontAwesome name="lock" size={22} color="#BFBFBF" style={styles.iconStyle} />
                <TextInput
                  style={styles.input}
                  placeholder="Konfirmasi Kata Sandi"
                  placeholderTextColor="#A0A0A0"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} disabled={loading}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye' : 'eye-off'}
                    size={22}
                    color="#BFBFBF"
                  />
                </TouchableOpacity>
              </View>

              {/* Tombol Daftar */}
              <TouchableOpacity
                style={[styles.mainButton, loading && styles.mainButtonDisabled]}
                onPress={handleRegister}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#3B466D" size="small" />
                ) : (
                  <Text style={styles.mainButtonText}>Daftar Sekarang</Text>
                )}
              </TouchableOpacity>

              {/* Link ke Login */}
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                style={styles.loginLink}
                disabled={loading}
              >
                <Text style={styles.loginLinkText}>
                  Sudah punya akun?{' '}
                  <Text style={{ fontWeight: 'bold', color: '#3B466D' }}>Masuk di sini</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Spacer bawah */}
            <View style={{ height: 60 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainContainer: {
    paddingHorizontal: 30,
    paddingTop: 40,
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 150,
    height: 70,
  },
  logoTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3B466D',
    marginTop: 5,
    letterSpacing: 1,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 55,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  iconStyle: {
    width: 30,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  mainButton: {
    backgroundColor: '#F3CE5A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
  },
  mainButtonDisabled: {
    opacity: 0.6,
  },
  mainButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B466D',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: '#666',
  },
});

export default HalamanRegister;