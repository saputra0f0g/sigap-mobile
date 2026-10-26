import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import laporanService from '../../services/laporanService';
import { getPublicFileUrl } from '../../services/api';

// ─── KOMPONEN UTAMA ───────────────────────────────────────────────────────────
const HalamanBeranda = () => {
  const router = useRouter();
  const { user } = useAuth();

  const [statistik, setStatistik] = useState({ total: 0, menunggu: 0, diverifikasi: 0, dalam_perbaikan: 0, selesai: 0, ditolak: 0 });
  const [hasilKerja, setHasilKerja] = useState([]); // dokumentasi admin/petugas
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllData = useCallback(async (pullToRefresh = false) => {
    if (pullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [statRes, laporanRes] = await Promise.all([
        laporanService.getStatistik(),
        laporanService.getDaftarMilikSaya({ page: 1 }),
      ]);

      setStatistik(statRes);

      const data = laporanRes.data ?? [];

      // Tampilkan satu thumbnail untuk setiap laporan yang memiliki dokumentasi admin.
      const dokumentasi = data
        .map((laporan) => {
          const photos = laporan.foto_penanganan_urls ?? laporan.foto_penanganan ?? [];
          const urls = (Array.isArray(photos) ? photos : [photos])
            .map(getPublicFileUrl)
            .filter(Boolean);
          return urls.length > 0 ? {
            ...laporan,
            fotoUrl: urls[0],
            fotoCount: urls.length,
          } : null;
        })
        .filter(Boolean);
      setHasilKerja(dokumentasi);

    } catch (e) {
      console.warn('Gagal fetch beranda:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F3B6D" />



      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAllData(true)}
            colors={['#1F3B6D']}
            tintColor="#1F3B6D"
          />
        }
      >

        {/* ── BANNER SELAMAT DATANG ── */}
        <View style={styles.welcomeSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dashboardLabel}>DASHBOARD UTAMA</Text>
            <Text style={styles.welcomeText}>Selamat Datang,</Text>
            <Text style={styles.welcomeName}>{user?.name ?? 'Pengguna'} 👋</Text>
            <Text style={styles.subtitle}>
              Pantau laporan infrastruktur Anda secara real-time.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => router.push('/(masyarakat)/lapor')}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Buat laporan masalah baru"
          >
            <View style={styles.reportIcon}>
              <Icon name="file-plus-outline" size={23} color="#fff" />
            </View>
            <Text style={styles.reportButtonText}>Buat Laporan</Text>
            <Text style={styles.reportButtonHint}>Masalah baru</Text>
            <Icon name="arrow-right" size={16} color="#fff" style={styles.reportArrow} />
          </TouchableOpacity>
        </View>

        {/* ── STATISTIK CARD ── */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>LAPORAN SAYA</Text>
          {loading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 10 }} />
          ) : (
            <>
              <Text style={styles.statsValue}>{statistik.total}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statsBadge}>
                  <Text style={styles.statsBadgeText}>⏳ {statistik.menunggu} Menunggu</Text>
                </View>
                <View style={[styles.statsBadge, { backgroundColor: 'rgba(59,130,246,0.3)' }]}>
                  <Text style={styles.statsBadgeText}>✓ {statistik.diverifikasi} Diverifikasi</Text>
                </View>
                <View style={[styles.statsBadge, { backgroundColor: 'rgba(249,115,22,0.3)' }]}>
                  <Text style={styles.statsBadgeText}>🔧 {statistik.dalam_perbaikan} Dalam Perbaikan</Text>
                </View>
                <View style={[styles.statsBadge, { backgroundColor: 'rgba(16,185,129,0.3)' }]}>
                  <Text style={styles.statsBadgeText}>✔ {statistik.selesai} Selesai</Text>
                </View>
                <View style={[styles.statsBadge, { backgroundColor: 'rgba(239,68,68,0.3)' }]}>
                  <Text style={styles.statsBadgeText}>✕ {statistik.ditolak} Ditolak</Text>
                </View>
              </View>
            </>
          )}
          <Icon name="file-document-multiple" size={40} color="rgba(255,255,255,0.1)" style={styles.statsBgIcon} />
        </View>

        {/* ── DOKUMENTASI ADMIN/PETUGAS ── */}
        <View style={styles.galleryHeader}>
          <Text style={styles.hasilKerjaTitle}>Dokumentasi Penanganan</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#1F3B6D" style={{ marginVertical: 20 }} />
        ) : hasilKerja.length === 0 ? (
          <View style={styles.emptyGallery}>
            <Icon name="image-off-outline" size={40} color="#CBD5E0" />
            <Text style={styles.emptyGalleryText}>
              Belum ada dokumentasi dari admin atau petugas
            </Text>
          </View>
        ) : (
          <View style={styles.masonryContainer}>
            <View style={styles.column}>
              {hasilKerja
                .filter((_, i) => i % 2 === 0)
                .map((laporan, i) => (
                  <TouchableOpacity
                    key={laporan.id}
                    style={styles.galleryCard}
                    onPress={() => router.push({
                      pathname: '/(masyarakat)/detail-riwayat',
                      params: { id: laporan.id },
                    })}
                  >
                    <Image
                      source={{ uri: laporan.fotoUrl }}
                      style={[styles.galleryImg, { height: i === 0 ? 200 : 150 }]}
                      resizeMode="cover"
                    />
                    <View style={styles.imgTag}>
                      <Text style={styles.imgTagText}>{laporan.fotoCount} foto</Text>
                    </View>
                    <View style={styles.galleryOverlay}>
                      <Text style={styles.galleryTitle} numberOfLines={2}>
                        {laporan.judul}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </View>

            <View style={styles.column}>
              {hasilKerja
                .filter((_, i) => i % 2 === 1)
                .map((laporan, i) => (
                  <TouchableOpacity
                    key={laporan.id}
                    style={styles.galleryCard}
                    onPress={() => router.push({
                      pathname: '/(masyarakat)/detail-riwayat',
                      params: { id: laporan.id },
                    })}
                  >
                    <Image
                      source={{ uri: laporan.fotoUrl }}
                      style={[styles.galleryImg, { height: i === 0 ? 150 : 200 }]}
                      resizeMode="cover"
                    />
                    <View style={styles.imgTag}>
                      <Text style={styles.imgTagText}>{laporan.fotoCount} foto</Text>
                    </View>
                    <View style={styles.galleryOverlay}>
                      <Text style={styles.galleryTitle} numberOfLines={2}>
                        {laporan.judul}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },

  header: {
    backgroundColor: '#1F3B6D',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  notificationBadge: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#EF4444', borderRadius: 10,
    minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  scrollContent: { paddingBottom: 100 },

  // Banner
  welcomeSection: { padding: 20, flexDirection: 'row', alignItems: 'flex-start' },
  dashboardLabel: { color: '#1F3B6D', fontSize: 10, fontWeight: '800', marginBottom: 4 },
  welcomeText: { fontSize: 13, color: '#555' },
  welcomeName: { fontSize: 18, fontWeight: 'bold', color: '#1F3B6D', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#888', lineHeight: 16 },
  reportButton: {
    backgroundColor: '#eabc60',
    padding: 12,
    borderRadius: 18,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: 12,
    width: 120,
    minHeight: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#9A6500',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 9,
    elevation: 7,
  },
  reportIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#1F3B6D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  reportButtonText: { color: '#17345F', fontSize: 13, fontWeight: '800' },
  reportButtonHint: { color: '#4D5E74', fontSize: 10, fontWeight: '600', marginTop: 3 },
  reportArrow: { position: 'absolute', right: 11, bottom: 12 },

  // Statistik
  statsCard: {
    marginHorizontal: 16, backgroundColor: '#1F3B6D',
    padding: 20, borderRadius: 16, overflow: 'hidden', marginBottom: 16,
  },
  statsLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statsValue: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginVertical: 6 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  statsBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statsBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  statsBgIcon: { position: 'absolute', bottom: -10, right: -5 },

  // Galeri (Hasil Kerja)
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  hasilKerjaTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  masonryContainer: { flexDirection: 'row', paddingHorizontal: 12 },
  column: { flex: 1, paddingHorizontal: 4 },
  galleryCard: { marginBottom: 8, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E2E8F0' },
  galleryImg: { width: '100%' },
  imgTag: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  imgTagText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  galleryOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
  },
  galleryTitle: { color: '#fff', fontSize: 9, fontWeight: '600' },
  emptyGallery: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 40 },
  emptyGalleryText: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 18 },
});

export default HalamanBeranda;