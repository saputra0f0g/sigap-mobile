import React, { useState, useRef, useEffect } from 'react';
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

const HalamanKodePemulihan = () => {
  const router = useRouter();
  const [codes, setCodes] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  const email = useLocalSearchParams()?.email || '';

  // Timer untuk resend code
  useEffect(() => {
    let interval;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer, canResend]);

  // Handle perubahan input kode
  const handleCodeChange = (text, index) => {
    if (!/^\d*$/.test(text)) return; // Hanya angka

    const newCodes = [...codes];
    newCodes[index] = text;
    setCodes(newCodes);
    setErrors('');

    // Auto focus ke input berikutnya
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Verifikasi Kode
  const handleVerifikasiKode = async () => {
    const fullCode = codes.join('');

    if (fullCode.length !== 6) {
      setErrors('Masukan 6 digit kode pemulihan');
      return;
    }

    setLoading(true);

    try {
      await authService.verifyOtp({ email, code: fullCode });
      router.push({ pathname: '/(auth)/atur-ulang-sandi', params: { email, code: fullCode } });
    } catch (error) {
      Alert.alert('Gagal', error.message || 'Kode tidak valid. Silakan coba lagi.');
      console.error('Verify code error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Kirim Ulang Kode
  const handleKirimUlangKode = async () => {
    if (!canResend) return;

    setLoading(true);
    try {
      await authService.forgotPassword({ email });
      Alert.alert('Berhasil', 'Kode pemulihan telah dikirim ulang');
      setTimer(60);
      setCanResend(false);
      setCodes(['', '', '', '', '', '']);
    } catch (error) {
      Alert.alert('Gagal', error.message || 'Gagal mengirim ulang kode');
      console.error('Resend code error:', error);
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
          <Text style={styles.headerTitle}>Masukan Kode Pemulihan</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Breadcrumb */}
        <Text style={styles.breadcrumb}>Kode Pemulihan Sandi</Text>

        {/* Konten Utama */}
        <View style={styles.contentContainer}>
          {/* Deskripsi */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>
              Silahkan masukan 6 digit kode pemulihan yang kami kirimkan ke Email/Nomor yang Didisplay
            </Text>
          </View>

          {/* Input Kode (6 digit) */}
          <View style={styles.codeInputContainer}>
            {codes.map((code, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[styles.codeInput, errors && styles.codeInputError]}
                placeholder="0"
                placeholderTextColor="#ddd"
                value={code}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                editable={!loading}
              />
            ))}
          </View>

          {/* Error Message */}
          {errors ? <Text style={styles.errorText}>{errors}</Text> : null}

          {/* Timer */}
          <View style={styles.timerContainer}>
            {!canResend && (
              <Text style={styles.timerText}>
                Kirim Ulang Kode dalam {timer} detik
              </Text>
            )}
          </View>

          {/* Tombol Verifikasi Kode */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerifikasiKode}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={styles.buttonText}>Verifikasi Kode</Text>
            )}
          </TouchableOpacity>

          {/* Link Kirim Ulang Kode */}
          <TouchableOpacity 
            onPress={handleKirimUlangKode} 
            disabled={loading || !canResend}
            style={[!canResend && styles.disabledLink]}
          >
            <Text style={[styles.linkText, !canResend && styles.disabledLinkText]}>
              Kirim Ulang Kode?
            </Text>
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

  // Code Input Container
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  codeInput: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1F3B6D',
    backgroundColor: '#fff',
  },
  codeInputError: {
    borderColor: '#ff6b6b',
    backgroundColor: '#fff5f5',
  },

  // Error Message
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },

  // Timer
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 12,
    color: '#666',
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
  disabledLink: {
    opacity: 0.5,
  },
  disabledLinkText: {
    color: '#999',
  },
});

export default HalamanKodePemulihan;
