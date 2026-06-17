import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, SafeAreaView, StatusBar, TextInput, Platform,
  ActivityIndicator, Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import penugasanService from '../../services/penugasanService';

// --- PALET WARNA ---
const colors = {
  primary: '#001e57',
  primaryFixed: '#dae2ff',
  primaryContainer: '#1d356e',
  background: '#f8f9ff',
  surface: '#ffffff',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#444650',
  secondaryContainer: '#ffce5d',
  onSecondaryContainer: '#755700',
  outlineVariant: '#c5c6d1',
  outline: '#757681',
  surfaceContainerLow: '#eff4ff',
  error: '#ba1a1a',
};

// Status yang tersedia untuk dipilih pekerja
const STATUS_OPTIONS = [
  { value: 'dikerjakan',      label: 'Dikerjakan',       icon: 'pending-actions' },
  { value: 'terkendala',      label: 'Terkendala',       icon: 'error-outline' },
  { value: 'survei_selesai',  label: 'Survei Selesai',   icon: 'fact-check' },
  { value: 'menunggu_review', label: 'Kirim Review',     icon: 'rate-review' },
  { value: 'selesai',         label: 'Selesai',          icon: 'task-alt' },
];

export default function UpdateProgresScreen() {
  const { id } = useLocalSearchParams(); // id = ID penugasan
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [penugasan, setPenugasan] = useState(null);

  const [activeStatus, setActiveStatus] = useState('dikerjakan');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [keteranganFoto, setKeteranganFoto] = useState('');

  // Fetch data saat pertama dibuka
  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      // GET /api/pekerja/tugas/:id  (menggunakan ID penugasan, bukan ID laporan)
      const res = await penugasanService.getDetailTugas(id);
      setPenugasan(res);

      if (res.status_tugas === 'selesai') {
        Alert.alert(
          'Akses Ditolak',
          'Penugasan ini sudah selesai dan tidak dapat di-update lagi.',
          [{ text: 'Kembali', onPress: () => router.back() }]
        );
        return;
      }

      // Set status awal sesuai status tugas saat ini dan fasenya
      const st = res.status_tugas;
      const isSurvey = st === 'ditugaskan' || st === 'survei_selesai' ||
        ((st === 'terkendala' || st === 'ditunda') && !res.survei?.status_validitas);

      const valid = isSurvey
        ? ['terkendala', 'survei_selesai']
        : ['dikerjakan', 'terkendala', 'menunggu_review', 'selesai'];

      setActiveStatus(valid.includes(st) ? st : (isSurvey ? 'survei_selesai' : 'dikerjakan'));
    } catch (err) {
      console.log('Error fetch detail tugas:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Dibutuhkan izin galeri untuk mengunggah foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const handleSimpan = async () => {
    if (!penugasan) return;
    setSubmitting(true);
    try {
      // Cek apakah sudah ada 5 file — sisa slot dari API
      const sisaSlot = penugasan.sisa_slot ?? 5;
      if (photo && sisaSlot <= 0) {
        Alert.alert('Batas Tercapai', 'Maksimal 5 file bukti per penugasan.');
        return;
      }

      // 1. Upload foto bukti progres dulu (jika ada)
      if (photo) {
        await penugasanService.uploadBuktiProgres(id, {
          file: {
            uri:  photo.uri,
            name: photo.fileName || 'progres.jpg',
            type: photo.mimeType || 'image/jpeg',
          },
          tipe_file:  'foto',
          keterangan: keteranganFoto || notes || null,
        });
      }

      // 2. Submit survei jika status = survei_selesai
      if (activeStatus === 'survei_selesai') {
        if (!notes.trim()) {
          Alert.alert('Deskripsi Diperlukan', 'Harap isi deskripsi temuan survei sebelum mengirim.');
          return;
        }
        await penugasanService.submitSurvei(id, {
          status_validitas_survei: 'valid',
          deskripsi_temuan_survei: notes,
          rekomendasi_survei: null,
        });
      } else {
        // Untuk status lain, gunakan endpoint PATCH status yang baru
        // Kita juga bisa kirimkan catatan/alasan penundaan jika statusnya terkendala
        await penugasanService.updateStatus(id, {
          status:           activeStatus,
          alasan_penundaan: (activeStatus === 'terkendala' && notes.trim()) ? notes : null,
        });
      }

      Alert.alert('Berhasil! ✓', 'Update progres berhasil disimpan.', [
        {
          text: 'Kembali ke Detail',
          // router.back() sudah cukup — useFocusEffect di detail-laporan
          // akan otomatis trigger fetchDetail() saat screen kembali mendapat fokus
          onPress: () => router.back()
        }
      ]);
    } catch (err) {
      console.log('Update Error:', err.message);
      Alert.alert('Gagal', err.message || 'Terjadi kesalahan saat menyimpan progres.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const lap = penugasan?.laporan ?? {};
  const sisaSlot = penugasan?.sisa_slot ?? 5;

  const isSurveyPhase = penugasan && (
    penugasan.status_tugas === 'ditugaskan' ||
    penugasan.status_tugas === 'survei_selesai' ||
    ((penugasan.status_tugas === 'terkendala' || penugasan.status_tugas === 'ditunda') &&
     !penugasan.survei?.status_validitas)
  );

  const allowedStatuses = isSurveyPhase
    ? ['terkendala', 'survei_selesai']
    : ['dikerjakan', 'terkendala', 'menunggu_review', 'selesai'];

  const filteredOptions = STATUS_OPTIONS.filter(opt => allowedStatuses.includes(opt.value));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Project Title Section */}
        <View style={styles.sectionMargin}>
          <Text style={styles.projectId}>PENUGASAN #{penugasan?.id}</Text>
          <Text style={styles.pageTitle}>Update Progres Tugas</Text>
          <Text style={styles.pageSubtitle} numberOfLines={2}>
            {lap.judul ?? lap.deskripsi ?? 'Tidak ada judul'}
          </Text>
        </View>

        {/* Status Pekerjaan */}
        <View style={styles.sectionMargin}>
          <Text style={styles.sectionTitle}>Status Pekerjaan</Text>
          <View style={styles.statusGrid}>
            {filteredOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.statusCard,
                  activeStatus === opt.value ? styles.statusCardActive : styles.statusCardInactive
                ]}
                onPress={() => setActiveStatus(opt.value)}
                activeOpacity={0.8}
              >
                {activeStatus === opt.value && (
                  <MaterialIcons name="check-circle" size={20} color={colors.primary} style={styles.statusCheckIcon} />
                )}
                <MaterialIcons
                  name={opt.icon}
                  size={28}
                  color={activeStatus === opt.value ? colors.primary : colors.outline}
                  style={styles.statusIcon}
                />
                <Text style={[styles.statusText, activeStatus === opt.value ? styles.statusTextActive : styles.statusTextInactive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Catatan / Deskripsi Temuan */}
        <View style={styles.sectionMargin}>
          <Text style={styles.sectionTitle}>
            {activeStatus === 'survei_selesai' ? 'Deskripsi Temuan Survei *' : 'Catatan Pekerjaan'}
          </Text>
          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={4}
            placeholder={
              activeStatus === 'survei_selesai'
                ? 'Tuliskan temuan survei di lapangan...'
                : 'Tuliskan detail pekerjaan hari ini...'
            }
            placeholderTextColor={colors.outlineVariant}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
        </View>

        {/* Dokumentasi Visual */}
        <View style={styles.sectionMargin}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>Unggah Bukti Foto</Text>
            <Text style={[styles.sectionTitle, { fontSize: 12, color: sisaSlot === 0 ? colors.error : colors.outline }]}>
              Sisa slot: {sisaSlot}/5
            </Text>
          </View>

          <View style={styles.visualGrid}>
            {/* Foto laporan dari warga (referensi) */}
            <View style={styles.visualCol}>
              <Text style={styles.visualLabel}>FOTO LAPORAN WARGA</Text>
              <View style={styles.visualCard}>
                <Image
                  source={{ uri: lap.foto_url || 'https://images.unsplash.com/photo-1541888087525-4bd40ed19375?auto=format&fit=crop&w=300&q=80' }}
                  style={styles.visualImage}
                />
              </View>
            </View>

            {/* Foto bukti progres baru */}
            <View style={styles.visualCol}>
              <Text style={styles.visualLabel}>FOTO PROGRES BARU</Text>
              {photo ? (
                <TouchableOpacity activeOpacity={0.9} style={styles.visualCard} onPress={pickImage}>
                  <Image source={{ uri: photo.uri }} style={styles.visualImage} />
                  <View style={styles.visualOverlay}>
                    <MaterialIcons name="edit" size={24} color="#ffffff" />
                    <Text style={styles.visualOverlayText}>Ganti Foto</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.visualCardDashed, sisaSlot === 0 && { opacity: 0.4 }]}
                  onPress={pickImage}
                  disabled={sisaSlot === 0}
                >
                  <MaterialIcons name="upload-file" size={32} color={colors.primary} style={{ marginBottom: 8 }} />
                  <Text style={styles.visualDashedText}>
                    {sisaSlot === 0 ? 'Slot Penuh' : 'Unggah Foto'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Keterangan foto */}
          {photo && (
            <TextInput
              style={[styles.textInput, { marginTop: 12, minHeight: 60 }]}
              placeholder="Keterangan foto (opsional)..."
              placeholderTextColor={colors.outlineVariant}
              value={keteranganFoto}
              onChangeText={setKeteranganFoto}
              textAlignVertical="top"
            />
          )}
        </View>

        {/* Simpan Button */}
        <TouchableOpacity style={styles.btnSimpan} onPress={handleSimpan} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={colors.onSecondaryContainer} />
          ) : (
            <>
              <MaterialIcons name="cloud-upload" size={24} color={colors.onSecondaryContainer} />
              <Text style={styles.btnSimpanText}>Simpan Update Progres</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionMargin: { marginBottom: 24 },
  projectId: { fontSize: 12, fontWeight: 'bold', color: colors.primary, letterSpacing: 0.5, marginBottom: 4 },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: colors.onSurface },
  pageSubtitle: { fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.onSurface, marginBottom: 16 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statusCard: {
    width: '30%', alignItems: 'center', justifyContent: 'center', paddingVertical: 20,
    borderRadius: 12, position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  statusCardActive: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary },
  statusCardInactive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant },
  statusCheckIcon: { position: 'absolute', top: 8, right: 8 },
  statusIcon: { marginBottom: 6 },
  statusText: { fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
  statusTextActive: { color: colors.primary },
  statusTextInactive: { color: colors.outline },
  textInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: 12, padding: 16, fontSize: 14, color: colors.onSurface, minHeight: 120,
  },
  visualGrid: { flexDirection: 'row', gap: 16 },
  visualCol: { flex: 1, gap: 8 },
  visualLabel: { fontSize: 10, fontWeight: 'bold', color: colors.outline, letterSpacing: 0.5 },
  visualCard: {
    width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.outlineVariant, position: 'relative',
  },
  visualImage: { width: '100%', height: '100%' },
  visualOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center',
  },
  visualOverlayText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  visualCardDashed: {
    width: '100%', aspectRatio: 1, borderRadius: 12, borderWidth: 2,
    borderColor: colors.primaryFixed, borderStyle: 'dashed',
    backgroundColor: colors.surfaceContainerLow, justifyContent: 'center', alignItems: 'center',
  },
  visualDashedText: { fontSize: 12, fontWeight: 'bold', color: colors.primary },
  btnSimpan: {
    backgroundColor: colors.secondaryContainer, paddingVertical: 16, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  btnSimpanText: { fontSize: 16, fontWeight: 'bold', color: colors.onSecondaryContainer },
});