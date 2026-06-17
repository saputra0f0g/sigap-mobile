import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, SafeAreaView, StatusBar, Platform, ActivityIndicator, Alert,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import penugasanService from '../../services/penugasanService';
import laporanService from '../../services/laporanService';

// --- PALET WARNA ---
const colors = {
  primary: '#001e57',
  background: '#f8f9ff',
  surface: '#ffffff',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#444650',
  secondaryContainer: '#ffce5d',
  onSecondaryContainer: '#755700',
  outlineVariant: '#c5c6d1',
  error: '#ba1a1a',
  surfaceContainerHigh: '#dce9ff',
  glassDark: 'rgba(0, 30, 87, 0.95)',
};

// Map status_tugas → warna badge
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

const getBidangTheme = (kategori) => {
  const k = (kategori || '').toLowerCase();
  if (k.includes('marga') || k.includes('jalan') || k.includes('jembatan')) return { color: '#001e57', bgColor: '#dce9ff', border: '#dce9ff' };
  if (k.includes('air') || k.includes('sda')) return { color: '#10b981', bgColor: '#d1fae5', border: '#10b981' };
  if (k.includes('cipta') || k.includes('tata')) return { color: '#755700', bgColor: 'rgba(255, 206, 93, 0.2)', border: colors.secondaryContainer };
  return { color: '#444650', bgColor: '#e2e8f0', border: '#c5c6d1' };
};

// Filter tab → status_tugas value (null = semua)
const FILTER_TABS = [
  { label: 'Semua Tugas',    value: null },
  { label: 'Ditugaskan',     value: 'ditugaskan' },
  { label: 'Survei Selesai', value: 'survei_selesai' },
  { label: 'Dikerjakan',     value: 'dikerjakan' },
  { label: 'Menunggu Review',value: 'menunggu_review' },
  { label: 'Perlu Revisi',   value: 'revisi' },
  { label: 'Ditunda',        value: 'ditunda' },
  { label: 'Terkendala',     value: 'terkendala' },
  { label: 'Selesai',        value: 'selesai' },
];

export default function DaftarKerjaScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeFilter, setActiveFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tugasList, setTugasList] = useState([]);
  const [statistik, setStatistik] = useState({ total: 0, selesai: 0, diproses: 0, menunggu: 0, terkendala: 0 });

  // Auto-refresh setiap kali screen mendapat fokus:
  // - Tab Tugas ditekan (pertama kali atau ulang)
  // - Kembali dari detail-laporan atau update-progres
  // - Filter tab berubah (activeFilter sebagai dependency)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [activeFilter])
  );

  const fetchData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      // Statistik dari laporan service (total aktif lintas bidang)
      const statRes = await laporanService.getStatistikPegawai();
      setStatistik(statRes);

      // Daftar tugas milik pekerja yang login — GET /api/pekerja/tugas
      const response = await penugasanService.getDaftarTugas({ status: activeFilter });
      const rawData = response.data || response;
      const dataArr = Array.isArray(rawData) ? rawData : (rawData?.data || []);

      // Petakan struktur penugasan ke format yang dipakai kartu
      const mapped = dataArr.map(tugas => {
        const lap = tugas.laporan ?? {};
        return {
          id:          tugas.id,          // ID penugasan
          id_laporan:  lap.id,
          judul:       lap.judul       ?? lap.deskripsi ?? 'Tanpa Judul',
          deskripsi:   lap.deskripsi   ?? '',
          kategori:    lap.kategori    ?? 'Umum',
          alamat:      lap.alamat      ?? 'Lokasi tidak diketahui',
          foto_url:    lap.foto_url    ?? null,
          tanggal:     tugas.ditugaskan_pada ?? '-',
          status_raw:  tugas.status_tugas,
          status:      tugas.label_status ?? tugas.status_tugas,
          progres:     tugas.progres_persen ?? 0,
        };
      });

      setTugasList(mapped);
    } catch (err) {
      console.log('Error fetch tugas pekerja:', err.message);
      setError(err.message || 'Gagal memuat daftar tugas.');
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  }, [activeFilter]);

  const heroItem = tugasList.length > 0 ? tugasList[0] : null;
  const listItems = tugasList.length > 1 ? tugasList.slice(1) : [];

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

        {/* Page Title */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Daftar Tugas Saya</Text>
          <Text style={styles.pageSubtitle}>Tugas lapangan yang ditugaskan kepada Anda.</Text>
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabsContainer}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.label}
              style={[styles.filterTab, activeFilter === tab.value && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab.value)}
            >
              <Text style={activeFilter === tab.value ? styles.filterTabTextActive : styles.filterTabText}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Loading / Error / Content */}
        {loading ? (
          <View style={{ marginTop: 50 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={{ alignItems: 'center', marginTop: 50, padding: 20 }}>
            <MaterialIcons name="cloud-off" size={60} color={colors.outlineVariant} />
            <Text style={{ textAlign: 'center', color: colors.error, marginTop: 15, fontSize: 16 }}>{error}</Text>
            <TouchableOpacity
              style={{ marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
              onPress={() => fetchData(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : tugasList.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="assignment" size={48} color={colors.outlineVariant} />
            <Text style={styles.emptyText}>Tidak ada tugas ditemukan.</Text>
          </View>
        ) : (
          <>
            {/* Hero Task Card */}
            {heroItem && (
              <TouchableOpacity
                style={styles.heroCard}
                onPress={() => router.push({ pathname: '/(pegawai)/detail-laporan', params: { id: heroItem.id } })}
              >
                <View style={styles.heroImageContainer}>
                  <Image
                    source={{ uri: heroItem.foto_url || 'https://images.unsplash.com/photo-1541888087525-4bd40ed19375?auto=format&fit=crop&w=600&q=80' }}
                    style={styles.heroImage}
                  />
                  <View style={styles.heroBadges}>
                    <View style={styles.badgeCategory}>
                      <Text style={styles.badgeCategoryText}>{heroItem.kategori.toUpperCase()}</Text>
                    </View>
                    {heroItem.status_raw === 'terkendala' && (
                      <View style={styles.badgeUrgent}>
                        <Text style={styles.badgeUrgentText}>TERKENDALA</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.heroContent}>
                  <Text style={styles.heroTitle} numberOfLines={1}>{heroItem.judul}</Text>
                  <View style={styles.locationRow}>
                    <MaterialIcons name="location-on" size={14} color={colors.onSurfaceVariant} />
                    <Text style={styles.locationText} numberOfLines={1}>{heroItem.alamat}</Text>
                  </View>

                  <View style={styles.heroFooter}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusTheme(heroItem.status_raw).bg }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusTheme(heroItem.status_raw).text }]}>
                        {heroItem.status}
                      </Text>
                    </View>
                    <Text style={styles.progressText}>{heroItem.progres}%</Text>
                  </View>

                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${heroItem.progres}%` }]} />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Summary Widget */}
            <View style={styles.summaryWidget}>
              <View style={styles.summaryHeader}>
                <View>
                  <Text style={styles.summaryLabel}>RINGKASAN TUGAS</Text>
                  <Text style={styles.summarySubLabel}>Total Tugas Aktif Saya</Text>
                </View>
                <Text style={styles.summaryTotal}>{statistik.total}</Text>
              </View>

              <View style={styles.bentoGrid}>
                <View style={styles.bentoBox}>
                  <Text style={styles.bentoBoxLabel}>SELESAI</Text>
                  <Text style={styles.bentoBoxValue}>
                    {statistik.selesai}
                  </Text>
                </View>
                <View style={styles.bentoBox}>
                  <Text style={styles.bentoBoxLabel}>PROSES</Text>
                  <Text style={styles.bentoBoxValue}>
                    {statistik.diproses}
                  </Text>
                </View>
                <View style={styles.bentoBox}>
                  <Text style={styles.bentoBoxLabel}>TERKENDALA</Text>
                  <Text style={styles.bentoBoxValue}>
                    {statistik.terkendala}
                  </Text>
                </View>
              </View>
            </View>

            {/* Task List Items */}
            <View style={styles.taskList}>
              {listItems.map((item) => {
                const theme = getBidangTheme(item.kategori);
                const statusTheme = getStatusTheme(item.status_raw);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.taskCard}
                    onPress={() => router.push({ pathname: '/(pegawai)/detail-laporan', params: { id: item.id } })}
                  >
                    <View style={[styles.taskLeftBorder, { backgroundColor: theme.border }]} />
                    <View style={styles.taskCardInner}>
                      <View style={styles.taskHeader}>
                        <View style={[styles.taskBadge, { backgroundColor: theme.bgColor }]}>
                          <Text style={[styles.taskBadgeText, { color: theme.color }]}>{item.kategori.toUpperCase()}</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color={colors.outlineVariant} />
                      </View>
                      <Text style={styles.taskItemTitle} numberOfLines={1}>{item.judul}</Text>
                      <Text style={styles.taskItemDesc} numberOfLines={2}>{item.deskripsi || item.alamat}</Text>
                      <View style={styles.taskItemFooter}>
                        <View style={styles.taskDateRow}>
                          <MaterialIcons name="calendar-today" size={14} color={colors.onSurfaceVariant} />
                          <Text style={styles.taskDateText}>{item.tanggal}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: statusTheme.text }]}>{item.status}</Text>
                        </View>
                      </View>
                      {/* Progress bar mini */}
                      <View style={[styles.progressBarBg, { marginTop: 8 }]}>
                        <View style={[styles.progressBarFill, { width: `${item.progres}%` }]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 100 },
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: colors.onSurface },
  pageSubtitle: { fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4, marginBottom: 4 },
  filterTabsContainer: { flexDirection: 'row', marginBottom: 24 },
  filterTab: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, height: 36, justifyContent: 'center',
  },
  filterTabActive: { backgroundColor: colors.secondaryContainer, borderColor: colors.secondaryContainer },
  filterTabText: { color: colors.onSurfaceVariant, fontSize: 12, fontWeight: 'bold' },
  filterTabTextActive: { color: colors.onSecondaryContainer, fontSize: 12, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 14, color: colors.onSurfaceVariant, fontWeight: '600' },
  heroCard: {
    backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1,
    borderColor: colors.outlineVariant, overflow: 'hidden', marginBottom: 20,
  },
  heroImageContainer: { height: 180, width: '100%', position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroBadges: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 8 },
  badgeCategory: { backgroundColor: 'rgba(255, 206, 93, 0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeCategoryText: { fontSize: 10, fontWeight: 'bold', color: colors.onSecondaryContainer },
  badgeUrgent: { backgroundColor: colors.error, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeUrgentText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
  heroContent: { padding: 16 },
  heroTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  locationText: { fontSize: 12, color: colors.onSurfaceVariant, marginLeft: 4 },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressText: { fontSize: 12, fontWeight: 'bold', color: colors.primary },
  progressBarBg: { height: 8, backgroundColor: colors.surfaceContainerHigh, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  summaryWidget: { backgroundColor: colors.glassDark, borderRadius: 16, padding: 16, marginBottom: 24 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  summaryLabel: { fontSize: 12, color: '#b3c5ff', fontWeight: 'bold' },
  summarySubLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  summaryTotal: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  bentoGrid: { flexDirection: 'row', gap: 12 },
  bentoBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  bentoBoxLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', marginBottom: 4 },
  bentoBoxValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  taskList: { gap: 16 },
  taskCard: {
    backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1,
    borderColor: colors.outlineVariant, flexDirection: 'row', overflow: 'hidden',
  },
  taskLeftBorder: { width: 6 },
  taskCardInner: { flex: 1, padding: 16 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  taskBadgeText: { fontSize: 10, fontWeight: 'bold' },
  taskItemTitle: { fontSize: 16, fontWeight: 'bold', color: colors.onSurface, marginBottom: 4 },
  taskItemDesc: { fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 12 },
  taskItemFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(197, 198, 209, 0.3)',
  },
  taskDateRow: { flexDirection: 'row', alignItems: 'center' },
  taskDateText: { fontSize: 12, color: colors.onSurfaceVariant, marginLeft: 6 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
});