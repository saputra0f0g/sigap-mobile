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
import { useRouter } from 'expo-router';
import authService from '../../services/authService';

const HalamanLupaKataSandi = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState('');

  // Validasi Email atau WhatsApp
  const validateEmail = (text) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
    return emailRegex.test(text) || phoneRegex.test(text);
  };

  // Handle perubahan input
  const handleEmailChange = (text) => {
    setEmail(text);
    if (text === '') {
      setErrors('');
    } else if (!validateEmail(text)) {
      setErrors('Email atau Nomor WhatsApp tidak valid');
    } else {
      setErrors('');
    }
  };

  // Handle Lanjut ke Pemulihan
  const handleLanjutPemulihan = async () => {
    if (!email) {
      setErrors('Email atau Nomor WhatsApp tidak boleh kosong');
      return;
    }
    if (!validateEmail(email)) {
      setErrors('Email atau Nomor WhatsApp tidak valid');
      return;
    }

    setLoading(true);

    try {
      await authService.forgotPassword({ email });
      router.push({ pathname: '/(auth)/kode-pemulihan', params: { email } });
    } catch (error) {
      Alert.alert('Gagal', error.message || 'Terjadi kesalahan. Silakan coba lagi.');
      console.error('Forgot password error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Kembali ke Login
  const handleKembaliLogin = () => {
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
          <TouchableOpacity onPress={handleKembaliLogin} disabled={loading}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Kata Sandi</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Breadcrumb */}
        <Text style={styles.breadcrumb}>Salah sandi</Text>

        {/* Konten Utama */}
        <View style={styles.contentContainer}>
          {/* Deskripsi */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>
              Masukan Email/Nomor WhatsApp Anda untuk menerima tautan pemulihan
            </Text>
          </View>

          {/* Input Email/WhatsApp */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Alamat Email atau Nomor WhatsApp</Text>
            <View style={[styles.inputWrapper, errors && styles.inputErrorBorder]}>
              <Icon name="email-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukan email atau nomor WhatsApp"
                placeholderTextColor="#999"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
            {errors ? <Text style={styles.errorText}>{errors}</Text> : null}
          </View>

          {/* Tombol Lanjut Pemulihan */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLanjutPemulihan}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={styles.buttonText}>Lanjut Ke Pemulihan</Text>
            )}
          </TouchableOpacity>

          {/* Link Kembali Login */}
          <TouchableOpacity onPress={handleKembaliLogin} disabled={loading}>
            <Text style={styles.linkText}>Kembali ke Login?</Text>
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

  // Link
  linkText: {
    fontSize: 13,
    color: '#1F3B6D',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default HalamanLupaKataSandi;
