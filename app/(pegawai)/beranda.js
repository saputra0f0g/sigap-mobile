import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import laporanService from '../../services/laporanService';
import penugasanService from '../../services/penugasanService';
import MapTilerWebView from '../../components/MapTilerWebView';

const { width } = Dimensions.get('window');


export default function DashboardPegawai() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('Semua Bidang');
  const filters = ['Semua Bidang', 'Jalan', 'Jembatan', 'Sumber Daya Air (SDA)', 'Cipta Karya', 'Tata Ruang'];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statistik, setStatistik] = useState({ total: 0, menunggu: 0, diproses: 0, selesai: 0, ditolak: 0, terkendala: 0, bidang: { bina_marga: 0, sda: 0, cipta_karya: 0 } });
  const [laporanList, setLaporanList] = useState([]);

  // Auto-refresh setiap kali screen ini mendapat fokus:
  // - Saat tab Beranda ditekan (baik pertama kali maupun ulang)
  // - Saat kembali dari halaman detail/update-progres
  // - Saat filter beranda diubah (activeFilter menjadi dependency-nya)
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [activeFilter])
  );

  const fetchDashboardData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      // Statistik laporan dari server (total, menunggu, diproses, selesai)
      const statRes = await laporanService.getStatistikPegawai();
      setStatistik(statRes);

      // ── Ganti getDaftarSemua → getDaftarTugas ──────────────────────────
      // Endpoint baru: GET /api/pekerja/tugas  (hanya tugas milik pekerja ini)
      // Response shape: { success, data: [ { id, status_tugas, laporan: {...}, ... } ] }
      const tugasParams = { per_page: 20 };
      const res = await penugasanService.getDaftarTugas(tugasParams);

      // Petakan data penugasan ke format yang dipakai kartu beranda.
      // Field utama ada di dalam objek 'laporan' (nested), bukan di root.
      const mapped = (res.data ?? []).map(tugas => {
        const lap = tugas.laporan ?? {};
        return {
          // ID penugasan (dipakai untuk navigasi ke detail)
          id:          tugas.id,
          id_laporan:  lap.id,

          // Konten kartu
          judul:       lap.judul    ?? lap.deskripsi ?? 'Tidak ada judul',
          kategori:    lap.kategori ?? 'Umum',
          alamat:      lap.alamat   ?? 'Lokasi tidak diketahui',
          foto_url:    lap.foto_url ?? null,

          // Koordinat untuk peta
          latitude:    lap.koordinat?.latitude  ?? null,
          longitude:   lap.koordinat?.longitude ?? null,

          // Status tugas pekerja (bukan status laporan)
          status_raw:  tugas.status_tugas,
          status:      tugas.label_status ?? tugas.status_tugas,
        };
      });

      setLaporanList(mapped);
    } catch (error) {
      console.log('Error fetch pegawai beranda:', error.message);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData(true);
    setRefreshing(false);
  }, [activeFilter]);

  // Kalkulasi persentase agregat berdasar status
  // menunggu: 10%, proses: 55%, selesai: 100%
  const calcPercentage = () => {
    const totalTasks = (statistik.menunggu || 0) + (statistik.diproses || 0) + (statistik.selesai || 0) + (statistik.terkendala || 0);
    if (totalTasks === 0) return 0;
    const totalScore = ((statistik.menunggu || 0) * 10) + ((statistik.diproses || 0) * 55) + ((statistik.selesai || 0) * 100) + ((statistik.terkendala || 0) * 30);
    const overall = totalScore / totalTasks;
    return Math.round(overall);
  };
  const percentage = calcPercentage();

  const filteredLaporanList = laporanList.filter(item => {
    if (activeFilter === 'Semua Bidang' || activeFilter === 'All Fields') return true;
    return (item.kategori || '').toLowerCase() === activeFilter.toLowerCase();
  });

  // Helper untuk mendapatkan warna bidang
  const getBidangTheme = (kategori) => {
    const k = (kategori || '').toLowerCase();
    if (k.includes('marga') || k.includes('jalan') || k.includes('jembatan')) return { color: '#001e57', bgColor: '#dae2ff', indicator: '#001e57' };
    if (k.includes('air') || k.includes('sda')) return { color: '#047857', bgColor: '#d1fae5', indicator: '#10b981' };
    if (k.includes('cipta') || k.includes('tata')) return { color: '#785a00', bgColor: '#ffdf9d', indicator: '#785a00' };
    return { color: '#444650', bgColor: '#e2e8f0', indicator: '#444650' };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9ff" />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#001e57']} />
        }
      >
        
        {/* ── HEADER HALAMAN ── */}
        <View style={styles.header}>
          <Text style={styles.welcomeTitle}>Halo, {user?.name ? user.name.split(' ')[0] : 'Petugas Lapangan'}</Text>
          <Text style={styles.welcomeSubtitle}>Pantau progres infrastruktur lintas departemen hari ini.</Text>
        </View>

        {/* ── STATS BENTO SECTION ── */}
        <View style={styles.bentoSection}>
          {/* Main Statistics Card */}
          <View style={styles.mainStatCard}>
            <Text style={styles.mainStatLabel}>TOTAL TUGAS AKTIF</Text>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainStatValue}>{statistik.total}</Text>}
            
            <View style={styles.mainStatGrid}>
              <View style={styles.subStatBox}>
                <MaterialIcons name="engineering" size={20} color="#ffce5d" />
                <Text style={styles.subStatLabel}>Bina Marga</Text>
                <Text style={styles.subStatValue}>{statistik.bidang?.bina_marga || 0}</Text>
              </View>
              <View style={styles.subStatBox}>
                <MaterialIcons name="water-drop" size={20} color="#93c5fd" />
                <Text style={styles.subStatLabel}>SDA</Text>
                <Text style={styles.subStatValue}>{statistik.bidang?.sda || 0}</Text>
              </View>
              <View style={styles.subStatBox}>
                <MaterialIcons name="apartment" size={20} color="#86efac" />
                <Text style={styles.subStatLabel}>Cipta Karya</Text>
                <Text style={styles.subStatValue}>{statistik.bidang?.cipta_karya || 0}</Text>
              </View>
            </View>
            
            {/* Abstract BG Decor (simulated) */}
            <View style={[styles.glowCircle, { right: -50, top: -50, backgroundColor: 'rgba(255, 206, 93, 0.15)' }]} />
            <View style={[styles.glowCircle, { left: -50, bottom: -50, backgroundColor: 'rgba(96, 165, 250, 0.15)' }]} />
          </View>
        </View>

        {/* ── FILTERS ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {filters.map((f, i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.filterBtn, activeFilter === f ? styles.filterBtnActive : styles.filterBtnInactive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterBtnText, activeFilter === f ? styles.filterBtnTextActive : styles.filterBtnTextInactive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={{ width: 20 }} />
        </ScrollView>

        {/* ── PRIORITY LIST ── */}
        <View style={styles.prioritySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daftar Prioritas</Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#001e57" style={{ marginTop: 20 }} />
          ) : filteredLaporanList.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#444650' }}>Belum ada daftar prioritas.</Text>
          ) : (
            filteredLaporanList.slice(0, 3).map(item => {
              const theme = getBidangTheme(item.kategori);
              const isUrgent = item.status_raw === 'ditugaskan' || item.status_raw === 'revisi' || item.status_raw === 'terkendala';
              return (
                <TouchableOpacity key={item.id} style={styles.taskCard} onPress={() => router.push({ pathname: '/(pegawai)/detail-laporan', params: { id: item.id } })}>
                  <View style={[styles.taskIndicator, { backgroundColor: theme.indicator }]} />
                  <View style={styles.taskContent}>
                    <Image source={{ uri: item.foto_url || 'https://images.unsplash.com/photo-1541888087525-4bd40ed19375?auto=format&fit=crop&w=300&q=80' }} style={styles.taskImage} />
                    <View style={styles.taskInfo}>
                      <View style={[styles.tagBadge, { backgroundColor: theme.bgColor }]}>
                        <Text style={[styles.tagText, { color: theme.color }]}>{item.kategori || 'UMUM'}</Text>
                      </View>
                      <Text style={styles.taskTitle} numberOfLines={1}>{item.judul}</Text>
                      
                      <View style={styles.taskMetaRow}>
                        <View style={styles.metaItem}>
                          <MaterialIcons name="location-on" size={14} color="#444650" />
                          <Text style={styles.metaText} numberOfLines={1}>{item.alamat || 'Lokasi tidak diketahui'}</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <MaterialIcons name={isUrgent ? 'priority-high' : 'schedule'} size={14} color={isUrgent ? '#ba1a1a' : '#444650'} />
                          <Text style={[styles.metaText, isUrgent && { color: '#ba1a1a' }]}>{item.status}</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.moreBtn}>
                      <MaterialIcons name="more-vert" size={24} color="#444650" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )
            })
          )}
        </View>

        {/* ── MAP SECTION ── */}
        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>Peta Wilayah Kerja</Text>
          <View style={styles.mapWrapper}>
            <MapTilerWebView 
              latitude={-6.57139}
              longitude={107.76139}
              zoom={11}
              style={{ width: '100%', height: '100%' }}
              interactive={true}
              markers={filteredLaporanList.filter(l => l.latitude && l.longitude).map(l => ({ latitude: l.latitude, longitude: l.longitude }))}
            />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0b1c30',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#444650',
    marginTop: 4,
  },
  bentoSection: {
    marginBottom: 24,
  },
  mainStatCard: {
    backgroundColor: '#1d356e',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    overflow: 'hidden',
  },
  mainStatLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  mainStatValue: {
    fontSize: 56,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 24,
  },
  mainStatGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  subStatBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  subStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 4,
  },
  subStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    zIndex: 0,
  },
  percentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c5c6d1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  percentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentIconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 206, 93, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  percentValueText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0b1c30',
  },
  percentBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  percentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  percentDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444650',
    marginTop: 2,
  },
  circleProgressWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#f4c454',
    borderLeftColor: '#e2e8f0', // fake partial progress ring
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  circleProgressInner: {
    transform: [{ rotate: '-45deg' }],
  },
  circleProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#785a00',
  },
  filterContainer: {
    marginBottom: 24,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  filterBtnActive: {
    backgroundColor: '#ffce5d',
  },
  filterBtnInactive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c5c6d1',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: '#755700',
  },
  filterBtnTextInactive: {
    color: '#444650',
  },
  prioritySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0b1c30',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#001e57',
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c5c6d1',
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  taskIndicator: {
    width: 6,
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  taskImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#eff4ff',
  },
  taskInfo: {
    flex: 1,
  },
  tagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b1c30',
    marginBottom: 8,
  },
  taskMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444650',
  },
  moreBtn: {
    padding: 4,
    alignSelf: 'flex-start',
    marginRight: -8,
    marginTop: -8,
  },
  mapSection: {
    marginBottom: 16,
  },
  mapWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#c5c6d1',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingTop: 40,
    justifyContent: 'flex-end',
  },
  mapBtn: {
    backgroundColor: '#ffce5d',
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBtnText: {
    color: '#755700',
    fontSize: 14,
    fontWeight: '700',
  },
});
