import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import laporanService from '../../services/laporanService';
import MapTilerWebView from '../../components/MapTilerWebView';

const { width } = Dimensions.get('window');

// ─── Warna marker berdasarkan status ────────────────────────────────────────
const markerColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'menunggu': case 'pending': return '#F59E0B';
    case 'diproses': case 'proses': return '#3B82F6';
    case 'selesai': return '#10B981';
    case 'ditolak': return '#EF4444';
    default: return '#6B7280';
  }
};

// ─── Status label & progress ────────────────────────────────────────────────
const statusLabel = (status) => {
  switch (status?.toLowerCase()) {
    case 'menunggu': case 'pending': return { label: 'Menunggu', pct: 10, color: '#F59E0B' };
    case 'diproses': case 'proses': return { label: 'Diproses', pct: 55, color: '#3B82F6' };
    case 'selesai': return { label: 'Selesai', pct: 100, color: '#10B981' };
    case 'ditolak': return { label: 'Ditolak', pct: 0, color: '#EF4444' };
    default: return { label: status, pct: 0, color: '#6B7280' };
  }
};

// ─── KOMPONEN UTAMA ───────────────────────────────────────────────────────────
const HalamanBeranda = () => {
  const router = useRouter();
  const { user } = useAuth();
  const mapRef = useRef(null);

  const [statistik, setStatistik] = useState({ total: 0, menunggu: 0, diproses: 0, selesai: 0 });
  const [laporanList, setLaporanList] = useState([]); // semua laporan user
  const [hasilKerja, setHasilKerja] = useState([]); // laporan selesai dengan foto
  const [loading, setLoading] = useState(true);

  // Koordinat default (jika tidak ada laporan dengan GPS)
  const [mapRegion, setMapRegion] = useState({
    latitude: -6.2088,
    longitude: 106.8210,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statRes, laporanRes] = await Promise.all([
        laporanService.getStatistik(),
        laporanService.getDaftarMilikSaya({ page: 1 }),
      ]);

      setStatistik(statRes);

      const data = laporanRes.data ?? [];
      setLaporanList(data);

      // ── Laporan dengan koordinat GPS ──────────────────────────────────────
      const withGps = data.filter(
        (l) => l.latitude && l.longitude &&
          parseFloat(l.latitude) !== 0 &&
          parseFloat(l.longitude) !== 0
      );

      if (withGps.length > 0) {
        // Pusatkan peta ke rata-rata koordinat
        const avgLat = withGps.reduce((s, l) => s + parseFloat(l.latitude), 0) / withGps.length;
        const avgLng = withGps.reduce((s, l) => s + parseFloat(l.longitude), 0) / withGps.length;
        setMapRegion({
          latitude: avgLat,
          longitude: avgLng,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        });
      }

      // ── Hasil Kerja: laporan selesai yang punya foto ─────────────────────
      const selesai = data.filter(
        (l) => l.status_raw === 'selesai' && l.foto_url
      );
      setHasilKerja(selesai);

    } catch (e) {
      console.warn('Gagal fetch beranda:', e.message);
    } finally {
      setLoading(false);
    }
  };

  // 5 laporan terbaru untuk STATUS PROYEK
  const laporanTerbaru = laporanList.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F3B6D" />



      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

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
          <TouchableOpacity style={styles.reportButton} onPress={() => router.push('/(masyarakat)/lapor')}>
            <Icon name="file-document-edit-outline" size={20} color="#fff" />
            <Text style={styles.reportButtonText}>Laporan{'\n'}Masalah</Text>
          </TouchableOpacity>
        </View>

        {/* ── PETA INFRASTRUKTUR — hanya tampil di mobile ── */}
        {Platform.OS !== 'web' && (
          <View style={styles.mapContainer}>
            <MapTilerWebView
              latitude={mapRegion.latitude}
              longitude={mapRegion.longitude}
              zoom={11}
              style={styles.mapView}
              interactive={true}
              markers={laporanList
                .map((l) => {
                  const lat = parseFloat(l.latitude);
                  const lng = parseFloat(l.longitude);
                  if (!lat || !lng || lat === 0 || lng === 0) return null;
                  return {
                    latitude: lat,
                    longitude: lng,
                    title: l.kode_laporan,
                    description: l.judul,
                    color: markerColor(l.status_raw),
                  };
                })
                .filter(Boolean)}
            />

            {/* Label overlay */}
            <View style={styles.mapLabel}>
              <Icon name="map-marker-multiple" size={14} color="#1F3B6D" />
              <Text style={styles.mapLabelText}>Peta Laporan</Text>
              <View style={styles.mapBadge}>
                <Text style={styles.mapBadgeText}>{laporanList.length} titik</Text>
              </View>
            </View>

            {/* Legend */}
            <View style={styles.mapLegend}>
              {[
                { color: '#F59E0B', label: 'Menunggu' },
                { color: '#3B82F6', label: 'Proses' },
                { color: '#10B981', label: 'Selesai' },
              ].map((item) => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

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
                <View style={[styles.statsBadge, { backgroundColor: 'rgba(16,185,129,0.3)' }]}>
                  <Text style={styles.statsBadgeText}>✔ {statistik.selesai} Selesai</Text>
                </View>
                <View style={[styles.statsBadge, { backgroundColor: 'rgba(59,130,246,0.3)' }]}>
                  <Text style={styles.statsBadgeText}>🔧 {statistik.diproses} Proses</Text>
                </View>
              </View>
            </>
          )}
          <Icon name="file-document-multiple" size={40} color="rgba(255,255,255,0.1)" style={styles.statsBgIcon} />
        </View>

        {/* ── STATUS PROYEK (dari laporan user) ── */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>STATUS LAPORAN TERBARU</Text>

          {loading ? (
            <ActivityIndicator color="#1F3B6D" size="small" />
          ) : laporanTerbaru.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada laporan</Text>
          ) : (
            laporanTerbaru.map((laporan) => {
              const { label, pct, color } = statusLabel(laporan.status_raw);
              return (
                <TouchableOpacity
                  key={laporan.id}
                  style={styles.progressItem}
                  onPress={() => router.push({
                    pathname: '/(masyarakat)/detail-riwayat',
                    params: { id: laporan.id },
                  })}
                >
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.projectName} numberOfLines={1}>
                      {laporan.kode_laporan} — {laporan.judul}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.statusPillText, { color }]}>{label}</Text>
                    </View>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={styles.progressPct}>{pct}%</Text>
                </TouchableOpacity>
              );
            })
          )}

          <TouchableOpacity
            style={styles.lihatSemuaBtn}
            onPress={() => router.push('/(masyarakat)/riwayat')}
          >
            <Text style={styles.lihatSemuaBtnText}>Lihat Semua Laporan →</Text>
          </TouchableOpacity>
        </View>

        {/* ── HASIL KERJA (laporan selesai dengan foto) ── */}
        <View style={styles.galleryHeader}>
          <Text style={styles.hasilKerjaTitle}>Hasil Kerja</Text>
          <TouchableOpacity onPress={() => router.push('/(masyarakat)/riwayat')}>
            <Text style={styles.lihatSemua}>Lihat Semua {'>'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#1F3B6D" style={{ marginVertical: 20 }} />
        ) : hasilKerja.length === 0 ? (
          <View style={styles.emptyGallery}>
            <Icon name="image-off-outline" size={40} color="#CBD5E0" />
            <Text style={styles.emptyGalleryText}>
              Belum ada laporan yang selesai dikerjakan
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
                      source={{ uri: laporan.foto_url }}
                      style={[styles.galleryImg, { height: i === 0 ? 200 : 150 }]}
                      resizeMode="cover"
                    />
                    <View style={styles.imgTag}>
                      <Text style={styles.imgTagText}>{laporan.kategori ?? 'Infrastruktur'}</Text>
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
                      source={{ uri: laporan.foto_url }}
                      style={[styles.galleryImg, { height: i === 0 ? 150 : 200 }]}
                      resizeMode="cover"
                    />
                    <View style={styles.imgTag}>
                      <Text style={styles.imgTagText}>{laporan.kategori ?? 'Infrastruktur'}</Text>
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
    backgroundColor: '#F4C430', padding: 10, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginLeft: 10, minWidth: 70,
  },
  reportButtonText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textAlign: 'center', marginTop: 4 },

  // Peta
  mapContainer: {
    marginHorizontal: 16, height: 220, borderRadius: 16,
    overflow: 'hidden', backgroundColor: '#ddd', marginBottom: 16,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8,
  },
  mapView: { width: '100%', height: '100%' },
  mapLabel: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    elevation: 2,
  },
  mapLabelText: { fontSize: 11, fontWeight: 'bold', color: '#1F3B6D', marginHorizontal: 5 },
  mapBadge: { backgroundColor: '#1F3B6D', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  mapBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  mapLegend: {
    position: 'absolute', bottom: 10, left: 12,
    flexDirection: 'row', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: { fontSize: 9, color: '#333', fontWeight: '600' },

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

  // Progress (Status Laporan)
  progressSection: {
    marginHorizontal: 16, backgroundColor: '#fff',
    padding: 16, borderRadius: 16, marginBottom: 16,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 14 },
  progressItem: { marginBottom: 14 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  projectName: { fontSize: 12, fontWeight: '600', color: '#1E293B', flex: 1, marginRight: 8 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  progressBarBg: { height: 5, backgroundColor: '#F1F5F9', borderRadius: 3, marginBottom: 2 },
  progressBarFill: { height: 5, borderRadius: 3 },
  progressPct: { fontSize: 9, color: '#94A3B8', textAlign: 'right' },
  emptyText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  lihatSemuaBtn: { marginTop: 8, alignItems: 'center', padding: 8 },
  lihatSemuaBtnText: { color: '#1F3B6D', fontSize: 12, fontWeight: '700' },

  // Galeri (Hasil Kerja)
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  hasilKerjaTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  lihatSemua: { color: '#1F3B6D', fontSize: 12, fontWeight: 'bold' },
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