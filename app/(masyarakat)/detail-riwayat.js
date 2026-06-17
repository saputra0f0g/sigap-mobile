import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  StyleSheet, 
  Image, 
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { 
  Ionicons, 
  MaterialIcons, 
  FontAwesome5, 
  MaterialCommunityIcons 
} from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import laporanService from '../../services/laporanService';
import MapTilerWebView from '../../components/MapTilerWebView';

import { Linking } from 'react-native';

const { width } = Dimensions.get('window');

export default function HalamanDetailRiwayat() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [laporan, setLaporan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetail = () => {
    if (id) {
      setLoading(true);
      setError(null);
      laporanService.getDetail(id)
        .then(res => setLaporan(res.data || res))
        .catch(err => setError(err.message || 'Gagal memuat detail laporan. Periksa koneksi Anda.'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B466D" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="cloud-offline-outline" size={60} color="#94A3B8" />
        <Text style={{ textAlign: 'center', color: '#EF4444', marginTop: 15, fontSize: 16 }}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchDetail}>
          <Text style={styles.retryBtnText}>Coba Lagi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 15 }} onPress={() => router.back()}>
          <Text style={{ color: '#2563EB' }}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!laporan) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Laporan tidak ditemukan.</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
          <Text style={{ color: '#2563EB' }}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Helpers untuk UI status
  const isSelesai = laporan.status_raw === 'selesai';
  const isProses  = laporan.status_raw === 'diproses';
  const isTolak   = laporan.status_raw === 'ditolak';

  let statusTitle = "Menunggu Verifikasi";
  let statusDesc  = "Laporan Anda sedang menunggu verifikasi oleh tim.";
  let statusIcon  = "access-time";
  let statusColor = "#F59E0B";

  if (isSelesai) {
    statusTitle = "Selesai Dikerjakan";
    statusDesc  = "Laporan Anda telah berhasil diverifikasi dan diselesaikan.";
    statusIcon  = "check-circle";
    statusColor = "#10B981";
  } else if (isProses) {
    statusTitle = "Sedang Diproses";
    statusDesc  = "Laporan Anda sedang ditangani oleh tim teknis.";
    statusIcon  = "engineering";
    statusColor = "#3B82F6";
  } else if (isTolak) {
    statusTitle = "Laporan Ditolak";
    statusDesc  = laporan.catatan || "Laporan tidak memenuhi kriteria verifikasi.";
    statusIcon  = "cancel";
    statusColor = "#EF4444";
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Status & ID Header */}
        <View style={styles.headerCards}>
          <View style={styles.statusMainCard}>
            <View style={styles.checkIconCircle}>
                <MaterialIcons name={statusIcon} size={40} color={statusColor} />
            </View>
            <View style={styles.statusContent}>
              <View style={[styles.badgeSelesai, { backgroundColor: statusColor + '20' }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>{laporan.status}</Text>
              </View>
              <Text style={styles.statusTitle}>{statusTitle}</Text>
              <Text style={styles.statusDesc}>{statusDesc}</Text>
            </View>
          </View>

          <View style={styles.idCard}>
            <Text style={styles.idLabel}>ID LAPORAN</Text>
            <Text style={styles.idValue}>{laporan.kode_laporan}</Text>
            <Text style={[styles.idLabel, { marginTop: 10 }]}>KATEGORI</Text>
            <View style={styles.categoryRow}>
              <Ionicons name="home" size={14} color="#3B466D" />
              <Text style={styles.categoryText}>{laporan.kategori || 'Umum'}</Text>
            </View>
          </View>
        </View>

        {/* Dokumentasi */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="photo-library" size={18} color="#3B466D" />
            <Text style={styles.sectionTitle}>Dokumentasi</Text>
          </View>
        </View>

        <View style={styles.imageGrid}>
          {laporan.foto_url ? (
            <Image source={{ uri: laporan.foto_url }} style={styles.mainImage} resizeMode="cover" />
          ) : (
            <View style={[styles.mainImage, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: '#94A3B8' }}>Tidak ada foto</Text>
            </View>
          )}
        </View>

        {/* Detail Informasi */}
        <View style={styles.infoCard}>
          <View style={styles.infoTitleRow}>
            <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
            <Text style={styles.infoTitle}>Detail Informasi</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>LOKASI KEJADIAN</Text>
              <Text style={styles.infoValue}>{laporan.alamat}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>WAKTU PELAPORAN</Text>
              <Text style={styles.infoValue}>{laporan.tanggal || (laporan.created_at ? new Date(laporan.created_at).toLocaleDateString('id-ID') : '-')}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>PELAPOR</Text>
              <Text style={styles.infoValue}>{laporan.pelapor?.nama || 'Anda'}</Text>
            </View>
          </View>

          <Text style={[styles.infoLabel, { marginTop: 15 }]}>DESKRIPSI MASALAH</Text>
          <Text style={styles.descriptionText}>
            {laporan.deskripsi}
          </Text>
        </View>

        {/* Aktivitas Laporan (Timeline) */}
        <View style={styles.timelineSection}>
           <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={18} color="#2563EB" />
            <Text style={styles.sectionTitleBlue}>Status Laporan</Text>
          </View>

          {/* Timeline Item 1 */}
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineIcon, { backgroundColor: statusColor }]}>
                <Ionicons name={statusIcon === 'access-time' ? 'time' : 'checkmark'} size={14} color="white" />
              </View>
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineRight}>
              <View style={[styles.timelineContentCard, { borderLeftColor: statusColor }]}>
                <View style={styles.timelineHeader}>
                  <Text style={[styles.timelineStatus, { color: statusColor }]}>{laporan.status}</Text>
                  <Text style={styles.timelineDate}>{laporan.tanggal}</Text>
                </View>
                <Text style={styles.timelineDesc}>{statusDesc}</Text>
              </View>
            </View>
          </View>

          {/* Map Preview */}
          {laporan.latitude && laporan.longitude && (
            <View style={styles.mapContainer}>
              <MapTilerWebView
                latitude={laporan.latitude}
                longitude={laporan.longitude}
                zoom={15}
                interactive={false}
                markers={[{
                  latitude: laporan.latitude,
                  longitude: laporan.longitude,
                  color: statusColor
                }]}
              />
              <View style={styles.mapOverlay} pointerEvents="none">
                <Ionicons name="location" size={20} color="white" />
                <Text style={styles.mapOverlayText}>Titik Koordinat Laporan</Text>
              </View>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomActions}>
        {/* Tombol diganti menjadi Kembali ke Dashboard */}
        <TouchableOpacity 
          style={styles.btnSecondary} 
          onPress={() => router.replace('/(masyarakat)/riwayat')}
        >
          <Text style={styles.btnTextSecondary}>Kembali ke Dashboard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.btnPrimary} onPress={() => {
          const phoneNumber = '6281234567890'; // Nomor petugas
          const message = `Halo, saya pelapor untuk laporan dengan kode ${laporan.kode_laporan}. Saya ingin bertanya progresnya.`;
          Linking.openURL(`whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`).catch(() => {
            Alert.alert('Gagal', 'WhatsApp tidak terinstall.');
          });
        }}>
          <Text style={styles.btnTextPrimary}>Hubungi Petugas</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  appBar: { 
    backgroundColor: '#3B466D', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: 45, 
    paddingBottom: 15 
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center' },
  appBarTitle: { color: 'white', fontWeight: 'bold', marginLeft: 15, fontSize: 16 },
  appBarRight: { flexDirection: 'row' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  headerCards: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statusMainCard: { backgroundColor: 'white', width: '65%', borderRadius: 16, padding: 12, flexDirection: 'row', elevation: 2 },
  checkIconCircle: { marginRight: 10, justifyContent: 'center' },
  statusContent: { flex: 1 },
  badgeSelesai: { backgroundColor: '#DBEAFE', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 5 },
  badgeText: { color: '#2563EB', fontSize: 10, fontWeight: 'bold' },
  statusTitle: { fontWeight: 'bold', fontSize: 12, color: '#1E293B' },
  statusDesc: { fontSize: 9, color: '#64748B', marginTop: 2 },
  
  idCard: { backgroundColor: '#FBBF24', width: '32%', borderRadius: 16, padding: 12, elevation: 2 },
  idLabel: { fontSize: 8, fontWeight: 'bold', color: '#B45309' },
  idValue: { fontSize: 10, fontWeight: 'bold', color: 'white', marginTop: 2 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  categoryText: { fontSize: 8, color: '#3B466D', marginLeft: 4, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { marginLeft: 6, fontWeight: 'bold', color: '#3B466D', fontSize: 13 },
  photoCount: { fontSize: 10, color: '#94A3B8' },

  imageGrid: { flexDirection: 'row', height: 200, marginBottom: 20 },
  mainImage: { flex: 1, borderRadius: 12, marginRight: 8 },
  sideImages: { flex: 1 },
  subImage: { flex: 1, borderRadius: 12, marginBottom: 8 },
  moreImageContainer: { flex: 1, position: 'relative' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  overlayText: { color: 'white', fontWeight: 'bold', fontSize: 18 },

  infoCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, elevation: 2, marginBottom: 20 },
  infoTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoTitle: { color: '#2563EB', fontWeight: 'bold', marginLeft: 8 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: { width: '50%', marginBottom: 12 },
  infoLabel: { fontSize: 9, fontWeight: 'bold', color: '#94A3B8', marginBottom: 4 },
  infoValue: { fontSize: 11, fontWeight: 'bold', color: '#1E293B' },
  priorityRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  descriptionText: { fontSize: 11, color: '#64748B', lineHeight: 16, marginTop: 5 },

  timelineSection: { marginTop: 10 },
  sectionTitleBlue: { marginLeft: 6, fontWeight: 'bold', color: '#2563EB', fontSize: 13 },
  timelineItem: { flexDirection: 'row', marginTop: 15 },
  timelineLeft: { alignItems: 'center', width: 30 },
  timelineIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: -5 },
  timelineRight: { flex: 1, paddingBottom: 20 },
  timelineContentCard: { backgroundColor: 'white', padding: 12, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#3B466D' },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  timelineStatus: { fontWeight: 'bold', fontSize: 12, color: '#2563EB' },
  timelineDate: { fontSize: 10, color: '#94A3B8' },
  timelineDesc: { fontSize: 11, color: '#64748B' },
  ratingButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 8, borderRadius: 8, marginTop: 10 },
  ratingText: { fontSize: 10, color: '#2563EB', marginLeft: 6, fontWeight: '600' },

  mapContainer: { borderRadius: 16, overflow: 'hidden', height: 120, marginTop: 10 },
  mapImage: { width: '100%', height: '100%' },
  mapOverlay: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(59, 70, 109, 0.8)', flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 20 },
  mapOverlayText: { color: 'white', fontSize: 10, fontWeight: 'bold', marginLeft: 5 },

  bottomActions: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: 'white', 
    flexDirection: 'row', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9' 
  },
  btnSecondary: { flex: 1, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#3B466D', marginRight: 10 },
  btnPrimary: { flex: 1, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#FBBF24' },
  btnTextSecondary: { color: 'white', fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  btnTextPrimary: { color: '#3B466D', fontWeight: 'bold' }
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#3B466D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});