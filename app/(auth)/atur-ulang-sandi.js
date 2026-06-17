import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import authService from '../../services/authService';

const HalamanAturUlangKataSandi = () => {
  const router = useRouter();
  const [passwordBaru, setPasswordBaru] = useState('');
  const [passwordKonfirmasi, setPasswordKonfirmasi] = useState('');
  const [showPasswordBaru, setShowPasswordBaru] = useState(false);
  const [showPasswordKonfirmasi, setShowPasswordKonfirmasi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ baru: '', konfirmasi: '' });

  const email = useLocalSearchParams()?.email || '';
  const code = useLocalSearchParams()?.code || '';

  // Validasi Password
  const validatePassword = (text) => {
    return text.length >= 8;
  };

  // Handle perubahan password baru
  const handlePasswordBaruChange = (text) => {
    setPasswordBaru(text);
    if (text === '') {
      setErrors({ ...errors, baru: '' });
    } else if (!validatePassword(text)) {
      setErrors({ ...errors, baru: 'Password minimal 8 karakter' });
    } else {
      setErrors({ ...errors, baru: '' });
    }
  };

  // Handle perubahan password konfirmasi
  const handlePasswordKonfirmasiChange = (text) => {
    setPasswordKonfirmasi(text);
    if (text === '') {
      setErrors({ ...errors, konfirmasi: '' });
    } else if (text !== passwordBaru) {
      setErrors({ ...errors, konfirmasi: 'Password tidak cocok' });
    } else {
      setErrors({ ...errors, konfirmasi: '' });
    }
  };

  // Handle Simpan Kata Sandi
  const handleSimpanKataSandi = async () => {
    // Validasi
    if (!passwordBaru) {
      setErrors({ ...errors, baru: 'Kata sandi baru tidak boleh kosong' });
      return;
    }
    if (!validatePassword(passwordBaru)) {
      setErrors({ ...errors, baru: 'Kata sandi minimal 8 karakter' });
      return;
    }
    if (!passwordKonfirmasi) {
      setErrors({ ...errors, konfirmasi: 'Konfirmasi kata sandi tidak boleh kosong' });
      return;
    }
    if (passwordBaru !== passwordKonfirmasi) {
      setErrors({ ...errors, konfirmasi: 'Kata sandi tidak cocok' });
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword({
        email,
        code,
        password: passwordBaru,
        passwordConfirmation: passwordKonfirmasi,
      });
      Alert.alert('Berhasil', 'Kata sandi berhasil diperbarui', [
        {
          text: 'OK',
          onPress: () => router.replace('/(auth)/sukses'),
        },
      ]);
    } catch (error) {
      Alert.alert('Gagal', error.message || 'Terjadi kesalahan. Silakan coba lagi.');
      console.error('Reset password error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Kembali
  const handleKembali = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header dengan Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleKembali} disabled={loading}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Atur Ulang Kata Sandi</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Breadcrumb */}
        <Text style={styles.breadcrumb}>Salah sandi</Text>

        {/* Konten Utama */}
        <View style={styles.contentContainer}>
          {/* Deskripsi */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>
              Buat kata sandi baru untuk akun Anda. Pastikan kata sandi kuat.
            </Text>
          </View>

          {/* Input Kata Sandi Baru */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Kata Sandi Baru</Text>
            <View style={[styles.inputWrapper, errors.baru && styles.inputErrorBorder]}>
              <Icon name="lock-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukan kata sandi baru"
                placeholderTextColor="#999"
                value={passwordBaru}
                onChangeText={handlePasswordBaruChange}
                secureTextEntry={!showPasswordBaru}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPasswordBaru(!showPasswordBaru)}
                disabled={loading}
              >
                <Icon
                  name={showPasswordBaru ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
            {errors.baru ? (
              <Text style={styles.errorText}>{errors.baru}</Text>
            ) : null}
          </View>

          {/* Input Konfirmasi Kata Sandi */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Konfirmasi Kata Sandi</Text>
            <View style={[styles.inputWrapper, errors.konfirmasi && styles.inputErrorBorder]}>
              <Icon name="lock-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ulangi Kata sandi baru"
                placeholderTextColor="#999"
                value={passwordKonfirmasi}
                onChangeText={handlePasswordKonfirmasiChange}
                secureTextEntry={!showPasswordKonfirmasi}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPasswordKonfirmasi(!showPasswordKonfirmasi)}
                disabled={loading}
              >
                <Icon
                  name={showPasswordKonfirmasi ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
            {errors.konfirmasi ? (
              <Text style={styles.errorText}>{errors.konfirmasi}</Text>
            ) : null}
          </View>

          {/* Catatan Kata sandi */}
          <View style={styles.noteContainer}>
            <Icon name="information-outline" size={16} color="#1F3B6D" />
            <Text style={styles.noteText}>
              Kata sandi harus minimal 8 karakter dan berisi kombinasi huruf dan angka untuk keamanan akun Anda.
            </Text>
          </View>

          {/* Tombol Simpan Kata Sandi */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSimpanKataSandi}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={styles.buttonText}>Simpan Kata Sandi</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F3B6D',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Breadcrumb
  breadcrumb: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },

  // Content Container
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  // Description
  descriptionContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#1F3B6D',
  },
  descriptionTitle: {
    fontSize: 14,
    color: '#1F3B6D',
    fontWeight: '600',
    lineHeight: 20,
  },

  // Input Group
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  inputErrorBorder: {
    borderColor: '#ff6b6b',
    backgroundColor: '#fff5f5',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    padding: 0,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },

  // Note
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#1F3B6D',
    lineHeight: 18,
  },

  // Button
  button: {
    backgroundColor: '#F4C430',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#f0d76d',
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default HalamanAturUlangKataSandi;
