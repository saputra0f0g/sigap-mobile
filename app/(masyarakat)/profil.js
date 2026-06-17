import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import userService from '../../services/userService';

const ProfileScreen = () => {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();

  const [showDropdown, setShowDropdown] = useState({
    password: false,
    laporan: false,
    lokasi: false,
  });

  const [formData, setFormData] = useState({
    nama:  user?.name  ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
  });

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [savingProfil,   setSavingProfil]   = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const toggleDropdown = (key) => {
    setShowDropdown((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSimpanProfil = async () => {
    if (!formData.nama.trim()) {
      Alert.alert('Error', 'Nama tidak boleh kosong');
      return;
    }
    setSavingProfil(true);
    try {
      const response = await userService.updateProfil({
        name:  formData.nama,
        phone: formData.phone,
      });
      updateUser(response.user); // sinkronkan AuthContext
      Alert.alert('Berhasil', 'Profil berhasil disimpan!');
    } catch (e) {
      Alert.alert('Gagal', e.message);
    } finally {
      setSavingProfil(false);
    }
  };

  const handleGantiPassword = async () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      Alert.alert('Gagal', 'Semua kolom kata sandi harus diisi');
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      Alert.alert('Gagal', 'Konfirmasi kata sandi tidak cocok');
      return;
    }
    if (passwordData.new.length < 8) {
      Alert.alert('Gagal', 'Kata sandi baru minimal 8 karakter');
      return;
    }
    setSavingPassword(true);
    try {
      await userService.gantiPassword({
        currentPassword: passwordData.current,
        newPassword:     passwordData.new,
        confirmPassword: passwordData.confirm,
      });
      Alert.alert('Berhasil', 'Kata sandi berhasil diubah!');
      setPasswordData({ current: '', new: '', confirm: '' });
      setShowDropdown((prev) => ({ ...prev, password: false }));
    } catch (e) {
      Alert.alert('Gagal', e.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Keluar',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (_) {
              // tetap lanjut logout meskipun API gagal (misal offline)
            } finally {
              router.replace('/(auth)/login');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* AVATAR */}
        <View style={styles.avatarSection}>
          <Image
            source={{
              uri: user?.foto_url ?? 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name ?? 'U') + '&background=3B466D&color=fff&size=100',
            }}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit Foto Profile</Text>
          </TouchableOpacity>
        </View>

        {/* FORM */}
        <View style={styles.formSection}>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#999" />
            <TextInput
              style={styles.input}
              value={formData.nama}
              placeholder="Nama Lengkap"
              onChangeText={(text) => setFormData({ ...formData, nama: text })}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={20} color="#999" />
            <TextInput
              style={styles.input}
              value={formData.phone}
              placeholder="Nomor WhatsApp"
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#999" />
            <TextInput
              style={[styles.input, { color: '#999' }]}
              value={formData.email}
              editable={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.simpanButton, savingProfil && { opacity: 0.7 }]}
            onPress={handleSimpanProfil}
            disabled={savingProfil}
          >
            {savingProfil
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.simpanButtonText}>Simpan Perubahan</Text>
            }
          </TouchableOpacity>
        </View>

        {/* DROPDOWN */}
        <View style={styles.dropdownSection}>

          {/* PASSWORD */}
          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => toggleDropdown('password')}
          >
            <View style={styles.dropdownTitleContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" />
              <Text style={styles.dropdownTitle}>Ganti Kata Sandi</Text>
            </View>
            <Ionicons
              name={showDropdown.password ? 'chevron-up' : 'chevron-down'}
              size={24}
              color="#999"
            />
          </TouchableOpacity>

          {showDropdown.password && (
            <View style={styles.dropdownContent}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password saat ini"
                secureTextEntry
                value={passwordData.current}
                onChangeText={(t) => setPasswordData({ ...passwordData, current: t })}
              />
              <TextInput
                style={styles.passwordInput}
                placeholder="Password baru (min. 6 karakter)"
                secureTextEntry
                value={passwordData.new}
                onChangeText={(t) => setPasswordData({ ...passwordData, new: t })}
              />
              <TextInput
                style={styles.passwordInput}
                placeholder="Konfirmasi password baru"
                secureTextEntry
                value={passwordData.confirm}
                onChangeText={(t) => setPasswordData({ ...passwordData, confirm: t })}
              />
              <TouchableOpacity
                style={[styles.subButton, savingPassword && { opacity: 0.7 }]}
                onPress={handleGantiPassword}
                disabled={savingPassword}
              >
                {savingPassword
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.subButtonText}>Simpan Password</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* LAPORAN */}
          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => toggleDropdown('laporan')}
          >
            <View style={styles.dropdownTitleContainer}>
              <Ionicons name="document-outline" size={20} color="#999" />
              <Text style={styles.dropdownTitle}>Laporan Belum Diproses</Text>
            </View>
            <Ionicons
              name={showDropdown.laporan ? 'chevron-up' : 'chevron-down'}
              size={24}
              color="#999"
            />
          </TouchableOpacity>

          {showDropdown.laporan && (
            <View style={styles.dropdownContent}>
              <Text style={styles.dropdownText}>Ada laporan yang belum diproses</Text>
              <TouchableOpacity
                style={styles.subButton}
                onPress={() => router.push('/(masyarakat)/riwayat')}
              >
                <Text style={styles.subButtonText}>Lihat Laporan</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* LOKASI */}
          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => toggleDropdown('lokasi')}
          >
            <View style={styles.dropdownTitleContainer}>
              <Ionicons name="location-outline" size={20} color="#999" />
              <Text style={styles.dropdownTitle}>Masalah Lokasi</Text>
            </View>
            <Ionicons
              name={showDropdown.lokasi ? 'chevron-up' : 'chevron-down'}
              size={24}
              color="#999"
            />
          </TouchableOpacity>

          {showDropdown.lokasi && (
            <View style={styles.dropdownContent}>
              <Text style={styles.dropdownText}>Hubungi admin jika lokasi error</Text>
              <TouchableOpacity style={styles.subButton}>
                <Text style={styles.subButtonText}>Hubungi Admin</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* HELP */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Hubungi Kami</Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => {
              const phoneNumber = '6281234567890'; // Ganti dengan nomor admin yang sebenarnya
              const message = 'Halo Admin SIGAP, saya ingin bertanya terkait aplikasi.';
              Linking.openURL(`whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`).catch(() => {
                Alert.alert('Gagal', 'Aplikasi WhatsApp tidak terinstall di perangkat Anda.');
              });
            }}
          >
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            <View style={styles.helpButtonText}>
              <Text style={styles.helpButtonTitle}>Hubungi Admin</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* LOGOUT — menggunakan AuthContext.logout() */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          <Text style={styles.logoutButtonText}>Keluar</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#2C3E50', padding: 15 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },

  scrollContainer: { padding: 15 },

  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  editButton: { borderWidth: 1, borderColor: '#2C3E50', padding: 8, borderRadius: 20 },
  editButtonText: { fontSize: 12 },

  inputWrapper: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, marginBottom: 10, borderRadius: 8 },
  input: { flex: 1, marginLeft: 10 },
  passwordInput: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 13 },

  simpanButton: { backgroundColor: '#FFD700', padding: 12, borderRadius: 8, alignItems: 'center' },
  simpanButtonText: { color: '#fff', fontWeight: '700' },

  dropdownHeader: { backgroundColor: '#fff', padding: 12, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  dropdownTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  dropdownTitle: { marginLeft: 10 },
  dropdownContent: { backgroundColor: '#fff', padding: 10 },
  dropdownText: { color: '#666', fontSize: 13, marginBottom: 8 },
  subButton: { backgroundColor: '#1F3B6D', padding: 8, borderRadius: 6, alignItems: 'center' },
  subButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  helpSection: { marginTop: 20 },
  helpTitle: { fontWeight: '700', fontSize: 14, color: '#333', marginBottom: 5 },
  helpButton: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', marginTop: 10, borderRadius: 8 },
  helpButtonText: { marginLeft: 10, justifyContent: 'center' },
  helpButtonTitle: { fontWeight: '600', fontSize: 14 },

  logoutButton: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 },
  logoutButtonText: { color: '#FF6B6B', fontWeight: '700', fontSize: 15, marginLeft: 8 },
});

export default ProfileScreen;
