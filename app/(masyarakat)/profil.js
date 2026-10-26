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
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import userService from '../../services/userService';
import { getPublicFileUrl } from '../../services/api';

const ProfileScreen = () => {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();

  const [showDropdown, setShowDropdown] = useState({
    password: false,
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
  const [uploadingFoto, setUploadingFoto] = useState(false);

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

  const handleEditFoto = async () => {
    if (uploadingFoto) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Izin Ditolak', 'Akses galeri diperlukan untuk memilih foto profil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Gagal', 'Foto tidak dapat dibaca. Silakan pilih foto lain.');
        return;
      }

      const extension = asset.uri.split('.').pop()?.split('?')[0]?.toLowerCase();
      const mimeType = asset.mimeType
        ?? (extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg');

      setUploadingFoto(true);
      const response = await userService.uploadFotoProfil({
        uri: asset.uri,
        name: asset.fileName ?? `foto_profil.${extension || 'jpg'}`,
        type: mimeType,
      });
      const fotoUrl = getPublicFileUrl(response?.foto_url);
      if (!fotoUrl) {
        throw new Error('Foto berhasil diunggah, tetapi alamat foto tidak diterima dari server.');
      }

      updateUser({ ...user, foto_url: fotoUrl });
      Alert.alert('Berhasil', 'Foto profil berhasil diperbarui.');
    } catch (error) {
      Alert.alert('Gagal Mengubah Foto', error.message || 'Foto profil tidak dapat diperbarui.');
    } finally {
      setUploadingFoto(false);
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
          <TouchableOpacity
            style={[styles.editButton, uploadingFoto && { opacity: 0.7 }]}
            onPress={handleEditFoto}
            disabled={uploadingFoto}
          >
            {uploadingFoto
              ? <ActivityIndicator color="#1F3B6D" size="small" />
              : <Text style={styles.editButtonText}>Edit Foto Profil</Text>
            }
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

        </View>

        {/* HELP */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Hubungi Kami</Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => {
              const phoneNumber = '6285221089204'; // Ganti dengan nomor admin yang sebenarnya
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
  container: { flex: 1, backgroundColor: '#F3F6FB' },
  header: { backgroundColor: '#2C3E50', padding: 15 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },

  scrollContainer: { paddingHorizontal: 18, paddingTop: 16 },

  avatarSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 22,
    marginBottom: 14,
    borderRadius: 22,
    shadowColor: '#1F3B6D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  avatar: { width: 92, height: 92, borderRadius: 46, marginBottom: 12, borderWidth: 3, borderColor: '#E8EEF8' },
  editButton: { backgroundColor: '#EEF3FB', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  editButtonText: { fontSize: 12, color: '#1F3B6D', fontWeight: '700' },

  formSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 22,
    shadowColor: '#1F3B6D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },

  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FB', paddingHorizontal: 13, minHeight: 50, marginBottom: 10, borderRadius: 13, borderWidth: 1, borderColor: '#E9EEF5' },
  input: { flex: 1, marginLeft: 10, color: '#24344D', fontSize: 14 },
  passwordInput: { backgroundColor: '#F5F7FB', borderRadius: 12, padding: 12, marginBottom: 9, fontSize: 13 },

  simpanButton: { backgroundColor: '#1F3B6D', padding: 14, borderRadius: 13, alignItems: 'center', marginTop: 3 },
  simpanButtonText: { color: '#fff', fontWeight: '700' },

  dropdownSection: { marginTop: 14, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' },
  dropdownHeader: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  dropdownTitle: { marginLeft: 10, color: '#24344D', fontWeight: '600', fontSize: 14 },
  dropdownContent: { backgroundColor: '#fff', paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4 },
  subButton: { backgroundColor: '#1F3B6D', padding: 12, borderRadius: 10, alignItems: 'center' },
  subButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  helpSection: { marginTop: 18 },
  helpTitle: { fontWeight: '700', fontSize: 16, color: '#24344D', marginBottom: 5 },
  helpButton: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#fff', marginTop: 8, borderRadius: 16, borderWidth: 1, borderColor: '#E9EEF5' },
  helpButtonText: { marginLeft: 10, justifyContent: 'center' },
  helpButtonTitle: { fontWeight: '700', fontSize: 14, color: '#24344D' },

  logoutButton: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, backgroundColor: '#FFF1F1', borderRadius: 14 },
  logoutButtonText: { color: '#D94848', fontWeight: '700', fontSize: 15, marginLeft: 8 },
});

export default ProfileScreen;
