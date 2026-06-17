import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, SafeAreaView, StatusBar, Platform, ActivityIndicator,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import penugasanService from '../../services/penugasanService';
import MapTilerWebView from '../../components/MapTilerWebView';

// --- PALET WARNA ---
const colors = {
  primary: '#001e57',
  primaryFixedDim: '#b3c5ff',
  background: '#f8f9ff',
  surface: '#ffffff',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#444650',
  secondaryContainer: '#ffce5d',
  onSecondaryContainer: '#755700',
  outlineVariant: '#c5c6d1',
  outline: '#757681',
  error: '#ba1a1a',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerLow: '#eff4ff',
};

const getStatusTheme = (statusRaw) => {
  switch (statusRaw) {
    case 'selesai':         return { bg: '#dcfce7', text: '#15803d' };
    case 'terkendala':      return { bg: '#fee2e2', text: '#b91c1c' };
    case 'ditugaskan':      return { bg: '#dce9ff', text: '#001e57' };
    case 'dikerjakan':      return { bg: '#eff6ff', text: '#1d4ed8' };
    case 'survei_selesai':  return { bg: '#ede9fe', text: '#5b21b6' };
    case 'menunggu_review': return { bg: '#fef3c7', text: '#92400e' };
    case 'revisi':          return { bg: '#fee2e2', text: '#b91c1c' };
    case 'ditunda':         return { bg: '#f3f4f6', text: '#374151' };
    default:                return { bg: '#fef9c3', text: '#a16207' };
  }
};

export default function DetailTugasScreen() {
  const { id } = useLocalSearchParams(); // id = ID penugasan
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [penugasan, setPenugasan] = useState(null);

  // Auto-refresh setiap kali screen detail mendapat fokus:
  // - Pertama kali dibuka dari daftar tugas
  // - Kembali dari update-progres (data status/bukti terbaru langsung muncul)
  useFocusEffect(
    useCallback(() => {
      if (id) fetchDetail();
    }, [id])
  );

  const fetchDetail = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      // GET /api/pekerja/tugas/:id  — detail penugasan lengkap dengan laporan & bukti
      const res = await penugasanService.getDetailTugas(id);
      setPenugasan(res);
    } catch (err) {
      console.log('Error fetch detail tugas:', err.message);
      setError(err.message || 'Gagal memuat detail tugas. Periksa koneksi Anda.');
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDetail(true);
    setRefreshing(false);
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <MaterialIcons name="cloud-off" size={60} color={colors.outlineVariant} />
        <Text style={{ textAlign: 'center', color: colors.error, marginTop: 15, fontSize: 16 }}>{error}</Text>
        <TouchableOpacity
          style={{ marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
          onPress={() => fetchDetail(false)}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Coba Lagi</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, fontWeight: 'bold' }}>← Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!penugasan) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialIcons name="error-outline" size={48} color={colors.outlineVariant} />
        <Text style={{ marginTop: 12, color: colors.onSurfaceVariant }}>Tugas tidak ditemukan.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, fontWeight: 'bold' }}>← Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Ambil data dari struktur penugasan baru
  const lap = penugasan.laporan ?? {};
  const survei = penugasan.survei ?? {};
  const buktiList = penugasan.bukti_progres ?? [];
  const statusTheme = getStatusTheme(penugasan.status_tugas);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >

        {/* ── Header Penugasan ── */}
        <View style={styles.card}>
          <View style={styles.cardLeftBorder} />
          <View style={styles.taskHeaderRow}>
            <View>
              <Text style={styles.labelSmallOutline}>ID PENUGASAN</Text>
              <Text style={styles.taskIdTitle}>#{penugasan.id}</Text>
              {lap.kode_laporan && (
                <Text style={styles.kodeLabel}>Laporan: {lap.kode_laporan}</Text>
              )}
            </View>
            <View style={[styles.badgeBaru, { backgroundColor: statusTheme.bg }]}>
              <Text style={[styles.badgeBaruText, { color: statusTheme.text }]}>
                {penugasan.label_status ?? penugasan.status_tugas}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.taskStatsRow}>
            <View style={styles.statCol}>
              <Text style={styles.labelSmallOutline}>KATEGORI</Text>
              <View style={styles.statValueRow}>
                <MaterialIcons name="category" size={18} color={colors.primary} />
                <Text style={styles.statValueNormal}>{lap.kategori || 'Umum'}</Text>
              </View>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.labelSmallOutline}>DITUGASKAN</Text>
              <View style={styles.statValueRow}>
                <MaterialIcons name="calendar-today" size={18} color={colors.onSurfaceVariant} />
                <Text style={styles.statValueNormal}>{penugasan.ditugaskan_pada ?? '-'}</Text>
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={styles.labelSmallOutline}>PROGRES</Text>
              <Text style={styles.labelSmallOutline}>{penugasan.progres_persen ?? 0}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${penugasan.progres_persen ?? 0}%` }]} />
            </View>
          </View>
        </View>

        {/* ── Instruksi dari Admin ── */}
        {penugasan.instruksi_tambahan && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <MaterialIcons name="assignment" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Instruksi dari Admin</Text>
            </View>
            <Text style={styles.descText}>{penugasan.instruksi_tambahan}</Text>
          </View>
        )}

        {/* ── Deskripsi Laporan ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="description" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>{lap.judul ?? 'Detail Laporan'}</Text>
          </View>
          <Text style={styles.descText}>{lap.deskripsi ?? '-'}</Text>
          {lap.pelapor && (
            <View style={styles.pelapor}>
              <MaterialIcons name="person" size={16} color={colors.outline} />
              <Text style={styles.pelapor_text}>Pelapor: {lap.pelapor.nama}</Text>
            </View>
          )}
        </View>

        {/* ── Lokasi Tugas ── */}
        <View style={styles.card}>
          <View style={[styles.cardTitleRow, styles.spaceBetween]}>
            <View style={styles.cardTitleRow}>
              <MaterialIcons name="location-on" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Lokasi Tugas</Text>
            </View>
          </View>

          <View style={styles.mapContainer}>
            {lap.koordinat?.latitude && lap.koordinat?.longitude ? (
              <MapTilerWebView
                latitude={lap.koordinat.latitude}
                longitude={lap.koordinat.longitude}
                zoom={14}
                style={{ width: '100%', height: '100%' }}
                interactive={false}
                markers={[{ latitude: lap.koordinat.latitude, longitude: lap.koordinat.longitude }]}
              />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e2e8f0' }}>
                <Text style={{ color: '#64748b' }}>GPS Tidak Tersedia</Text>
              </View>
            )}
            <View style={styles.mapOverlayBox}>
              <Text style={styles.mapOverlayText} numberOfLines={2}>
                {lap.alamat || 'Lokasi tidak diketahui'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Foto Lampiran Laporan ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="photo-library" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Foto Laporan Warga</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachmentScroll}>
            {lap.foto_url ? (
              <Image source={{ uri: lap.foto_url }} style={styles.attachmentImage} />
            ) : (
              <Text style={{ color: colors.outline, fontSize: 13 }}>Tidak ada foto lampiran.</Text>
            )}
          </ScrollView>
        </View>

        {/* ── Bukti Progres yang sudah diunggah ── */}
        {buktiList.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <MaterialIcons name="attachment" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>
                Bukti Progres ({buktiList.length}/5)
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachmentScroll}>
              {buktiList.map(b => (
                <View key={b.id} style={{ marginRight: 12 }}>
                  <Image source={{ uri: b.file_url }} style={styles.attachmentImage} />
                  {b.keterangan && (
                    <Text style={{ fontSize: 10, color: colors.outline, marginTop: 4, maxWidth: 120 }} numberOfLines={2}>
                      {b.keterangan}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Data Hasil Survei (jika sudah survei) ── */}
        {survei.status_validitas && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <MaterialIcons name="fact-check" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Hasil Survei Lapangan</Text>
            </View>
            <View style={styles.surveiRow}>
              <Text style={styles.surveiLabel}>Status Validitas</Text>
              <View style={[styles.badgeBaru, {
                backgroundColor: survei.status_validitas === 'valid' ? '#dcfce7' : '#fee2e2'
              }]}>
                <Text style={[styles.badgeBaruText, {
                  color: survei.status_validitas === 'valid' ? '#15803d' : '#b91c1c'
                }]}>
                  {survei.status_validitas === 'valid' ? 'VALID' : 'TIDAK VALID'}
                </Text>
              </View>
            </View>
            {survei.deskripsi_temuan && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.labelSmallOutline}>TEMUAN</Text>
                <Text style={styles.descText}>{survei.deskripsi_temuan}</Text>
              </View>
            )}
            {survei.rekomendasi && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.labelSmallOutline}>REKOMENDASI</Text>
                <Text style={styles.descText}>{survei.rekomendasi}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Catatan Revisi / Alasan Penundaan ── */}
        {(penugasan.catatan_revisi || penugasan.alasan_penundaan) && (
          <View style={[styles.card, { borderColor: '#fca5a5' }]}>
            <View style={styles.cardTitleRow}>
              <MaterialIcons name="info-outline" size={20} color={colors.error} />
              <Text style={[styles.cardTitle, { color: colors.error }]}>
                {penugasan.catatan_revisi ? 'Catatan Revisi' : 'Alasan Penundaan'}
              </Text>
            </View>
            <Text style={styles.descText}>
              {penugasan.catatan_revisi ?? penugasan.alasan_penundaan}
            </Text>
          </View>
        )}

        {/* ── Action Button ── */}
        {penugasan.status_tugas !== 'selesai' ? (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.btnAction}
              onPress={() => router.push({ pathname: '/(pegawai)/update-progres', params: { id: penugasan.id } })}
            >
              <MaterialIcons name="update" size={24} color={colors.onSecondaryContainer} />
              <Text style={styles.btnActionText}>UPDATE PROGRES</Text>
            </TouchableOpacity>
            <Text style={styles.actionWarningText}>
              Perbarui status dan unggah bukti progres setelah melakukan pekerjaan di lokasi.
            </Text>
          </View>
        ) : (
          <View style={styles.actionSection}>
            <View style={[styles.btnAction, { backgroundColor: '#e2e8f0', borderColor: '#cbd5e1', borderWidth: 1 }]}>
              <MaterialIcons name="check-circle" size={24} color="#64748b" />
              <Text style={[styles.btnActionText, { color: '#64748b' }]}>LAPORAN SELESAI (READ-ONLY)</Text>
            </View>
            <Text style={styles.actionWarningText}>
              Laporan ini telah diselesaikan dan tidak dapat diperbarui lagi.
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.outlineVariant, position: 'relative', overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  cardLeftBorder: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 6, backgroundColor: colors.primary },
  taskHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  labelSmallOutline: { fontSize: 10, fontWeight: 'bold', color: colors.outline, letterSpacing: 0.5, marginBottom: 4 },
  taskIdTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  kodeLabel: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  badgeBaru: { backgroundColor: colors.secondaryContainer, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeBaruText: { fontSize: 10, fontWeight: 'bold', color: colors.onSecondaryContainer },
  divider: { height: 1, backgroundColor: 'rgba(197, 198, 209, 0.3)', marginBottom: 16 },
  taskStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCol: { flex: 1 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValueNormal: { fontSize: 14, fontWeight: 'bold', color: colors.onSurfaceVariant },
  progressBarBg: { height: 8, backgroundColor: colors.surfaceContainerHigh, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  spaceBetween: { justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  descText: { fontSize: 14, color: colors.onSurfaceVariant, lineHeight: 22 },
  pelapor: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  pelapor_text: { fontSize: 12, color: colors.outline },
  mapContainer: {
    width: '100%', aspectRatio: 16 / 9, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.outlineVariant, position: 'relative',
  },
  mapOverlayBox: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: 8, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(197, 198, 209, 0.3)',
  },
  mapOverlayText: { fontSize: 12, fontWeight: 'bold', color: colors.onSurface },
  attachmentScroll: { gap: 12, paddingBottom: 8 },
  attachmentImage: {
    width: 120, height: 120, borderRadius: 8,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  surveiRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  surveiLabel: { fontSize: 14, fontWeight: '600', color: colors.onSurface },
  actionSection: { marginTop: 10, gap: 12 },
  btnAction: {
    backgroundColor: colors.secondaryContainer, paddingVertical: 16, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  btnActionText: { fontSize: 16, fontWeight: 'bold', color: colors.onSecondaryContainer },
  actionWarningText: { textAlign: 'center', fontSize: 12, color: colors.outline, fontWeight: '600', paddingHorizontal: 20 },
});