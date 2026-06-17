import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons, Octicons, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import laporanService from '../../services/laporanService';

const { width } = Dimensions.get('window');

// ─── Warna per status ─────────────────────────────────────────────────────────
const statusColor = (status = '') => {
  const s = status.toLowerCase();
  if (s.includes('selesai'))               return '#22C55E';
  if (s.includes('diproses') || s.includes('proses')) return '#F97316';
  if (s.includes('ditolak'))               return '#EF4444';
  if (s.includes('menunggu') || s.includes('pending')) return '#F59E0B';
  return '#94A3B8';
};

// ─── Kartu laporan ─────────────────────────────────────────────────────────────
const ReportCard = ({ item, onPress }) => {
  const color = statusColor(item.status);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Header: kode + status */}
      <View style={styles.cardHeader}>
        <View style={styles.idBadge}>
          <Text style={styles.idText} numberOfLines={1}>{item.kode}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: color + '22' }]}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>{item.status}</Text>
        </View>
      </View>

      {/* Judul */}
      <Text style={styles.cardTitle} numberOfLines={2}>{item.judul}</Text>

      {/* Lokasi */}
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={11} color="#94A3B8" />
        <Text style={styles.locationText} numberOfLines={1}>{item.alamat || '-'}</Text>
      </View>

      {/* Footer: tanggal + tombol detail */}
      <View style={styles.cardFooter}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={11} color="#94A3B8" />
          <Text style={styles.dateText}>{item.tanggal || '-'}</Text>
        </View>
        <View style={styles.detailBtn}>
          <Text style={styles.detailText}>Detail</Text>
          <AntDesign name="arrowright" size={11} color="#2563EB" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── FILTER OPTIONS ───────────────────────────────────────────────────────────
const FILTERS = [
  { label: 'Semua',    value: null },
  { label: 'Menunggu', value: 'menunggu' },
  { label: 'Diproses', value: 'diproses' },
  { label: 'Selesai',  value: 'selesai' },
  { label: 'Ditolak',  value: 'ditolak' },
];

// ─── HALAMAN RIWAYAT ──────────────────────────────────────────────────────────
export default function HalamanRiwayat() {
  const router = useRouter();

  const [filter,        setFilter]        = useState(FILTERS[0]);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [laporan,       setLaporan]       = useState([]);
  const [statistik,     setStatistik]     = useState({ total: 0, menunggu: 0, diproses: 0, selesai: 0, ditolak: 0 });
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [page,          setPage]          = useState(1);
  const [lastPage,      setLastPage]      = useState(1);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [error,         setError]         = useState(null);

  // ── Fetch data ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async (pageNum = 1, isRefresh = false) => {
    if (pageNum === 1) isRefresh ? setRefreshing(true) : setLoading(true);
    else setLoadingMore(true);

    setError(null);

    try {
      const [laporanRes, statRes] = await Promise.all([
        laporanService.getDaftarMilikSaya({
          page:   pageNum,
          status: filter.value,
        }),
        laporanService.getStatistik(),
      ]);

      // Handle variasi struktur response
      const items    = laporanRes?.data ?? laporanRes ?? [];
      const meta     = laporanRes?.meta ?? {};
      const newItems = Array.isArray(items) ? items : [];

      if (pageNum === 1) {
        setLaporan(newItems);
      } else {
        setLaporan((prev) => [...prev, ...newItems]);
      }

      setLastPage(meta?.last_page ?? 1);
      setPage(pageNum);

      if (statRes && typeof statRes === 'object') {
        setStatistik({
          total:    statRes.total    ?? 0,
          menunggu: statRes.menunggu ?? 0,
          diproses: statRes.diproses ?? 0,
          selesai:  statRes.selesai  ?? 0,
          ditolak:  statRes.ditolak  ?? 0,
        });
      }
    } catch (e) {
      console.warn('[Riwayat] Error:', e.message);
      setError(e.message || 'Gagal memuat data. Periksa koneksi internet.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData(1);
  }, [filter]);

  const handleRefresh = () => fetchData(1, true);

  const handleLoadMore = () => {
    if (!loadingMore && page < lastPage) {
      fetchData(page + 1);
    }
  };

  const handleFilterSelect = (f) => {
    setFilter(f);
    setModalVisible(false);
    setPage(1);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3B466D']} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 60;
          if (isNearBottom) handleLoadMore();
        }}
        scrollEventThrottle={400}
      >

        {/* ── Header & Filter ── */}
        <View style={styles.headerSection}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.title}>Riwayat Laporan</Text>
            <Text style={styles.subtitle}>Pantau laporan infrastruktur Anda secara real-time.</Text>
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setModalVisible(true)}>
            <Octicons name="sliders" size={14} color="#475569" />
            <Text style={styles.filterText}>{filter.label}</Text>
            <Ionicons name="chevron-down" size={12} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* ── Ringkasan Statistik ── */}
        <View style={styles.statRow}>
          {[
            { label: 'Total',    value: statistik.total,    color: '#1F3B6D' },
            { label: 'Menunggu', value: statistik.menunggu, color: '#F59E0B' },
            { label: 'Diproses', value: statistik.diproses, color: '#F97316' },
            { label: 'Selesai',  value: statistik.selesai,  color: '#22C55E' },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Error State ── */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => fetchData(1)} style={styles.retryBtn}>
              <Text style={styles.retryText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Loading ── */}
        {loading && !error && (
          <ActivityIndicator size="large" color="#3B466D" style={{ marginTop: 50 }} />
        )}

        {/* ── Daftar Laporan ── */}
        {!loading && !error && (
          <>
            {laporan.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={56} color="#CBD5E0" />
                <Text style={styles.emptyTitle}>Belum ada laporan</Text>
                <Text style={styles.emptySubtitle}>
                  {filter.value
                    ? `Tidak ada laporan dengan status "${filter.label}"`
                    : 'Anda belum pernah membuat laporan'}
                </Text>
                <TouchableOpacity
                  style={styles.buatBtn}
                  onPress={() => router.push('/(masyarakat)/lapor')}
                >
                  <Text style={styles.buatBtnText}>+ Buat Laporan</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.grid}>
                {laporan.map((item) => (
                  <ReportCard
                    key={item.id ?? item.kode_laporan}
                    item={{
                      kode:   item.kode_laporan ?? item.id_laporan ?? '-',
                      status: item.status ?? '-',
                      judul:  item.judul ?? item.deskripsi_laporan ?? '-',
                      alamat: item.alamat ?? item.alamat_map ?? '-',
                      tanggal: item.tanggal ?? (item.created_at
                        ? new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '-'),
                    }}
                    onPress={() => router.push({
                      pathname: '/(masyarakat)/detail-riwayat',
                      params: { id: item.id },
                    })}
                  />
                ))}

                {/* Ringkasan Card */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Ringkasan</Text>
                  {[
                    { label: 'Selesai',  value: statistik.selesai },
                    { label: 'Diproses', value: statistik.diproses },
                    { label: 'Ditolak',  value: statistik.ditolak },
                    { label: 'Total',    value: statistik.total },
                  ].map((s, i) => (
                    <View key={s.label} style={[styles.summaryItem, i === 3 && styles.summaryActive]}>
                      <Text style={styles.summaryLabel}>{s.label}</Text>
                      <Text style={styles.summaryValue}>{s.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Load More */}
            {loadingMore && (
              <ActivityIndicator color="#3B466D" style={{ marginVertical: 16 }} />
            )}
            {!loadingMore && page < lastPage && (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
                <Text style={styles.loadMoreText}>Muat Lebih Banyak</Text>
              </TouchableOpacity>
            )}
          </>
        )}

      </ScrollView>

      {/* ── Modal Filter ── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filter Status</Text>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.label}
                style={[styles.filterOption, filter.label === f.label && styles.filterOptionActive]}
                onPress={() => handleFilterSelect(f)}
              >
                <Text style={[styles.filterOptionText, filter.label === f.label && { color: '#2563EB', fontWeight: 'bold' }]}>
                  {f.label}
                </Text>
                {filter.label === f.label && <Ionicons name="checkmark-circle" size={18} color="#2563EB" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeModal} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeModalText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F8FAFC' },
  navbar:      { backgroundColor: '#3B466D', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 45 },
  navTitle:    { color: 'white', fontWeight: 'bold', fontSize: 16 },
  scrollContent: { padding: 16, paddingBottom: 120 },

  // Header
  headerSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:    { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 3 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    elevation: 1,
  },
  filterText: { fontSize: 12, fontWeight: '600', color: '#1E293B' },

  // Stat Row
  statRow:   { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox:   { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', elevation: 1 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 9, color: '#94A3B8', marginTop: 2, fontWeight: '600' },

  // Error
  errorBox:  { alignItems: 'center', paddingVertical: 24, gap: 8 },
  errorText: { color: '#64748B', fontSize: 13, textAlign: 'center' },
  retryBtn:  { backgroundColor: '#1F3B6D', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  // Card
  card: {
    backgroundColor: 'white', width: '48%', borderRadius: 16,
    padding: 12, marginBottom: 14, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },
  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 4 },
  idBadge:       { backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, flex: 1 },
  idText:        { fontSize: 8, color: '#3B82F6', fontWeight: '700' },
  statusPill:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  dot:           { width: 5, height: 5, borderRadius: 3, marginRight: 3 },
  statusText:    { fontSize: 8, fontWeight: '700' },
  cardTitle:     { fontSize: 12, fontWeight: 'bold', color: '#1E293B', marginBottom: 6, minHeight: 34 },
  locationRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  locationText:  { fontSize: 9, color: '#64748B', marginLeft: 3, flex: 1 },
  cardFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 },
  dateRow:       { flexDirection: 'row', alignItems: 'center' },
  dateText:      { fontSize: 9, color: '#94A3B8', marginLeft: 3 },
  detailBtn:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  detailText:    { fontSize: 9, color: '#2563EB', fontWeight: 'bold' },

  // Summary
  summaryCard:   { backgroundColor: '#3B466D', width: '48%', borderRadius: 16, padding: 12, marginBottom: 14 },
  summaryTitle:  { color: 'white', fontWeight: 'bold', fontSize: 13, marginBottom: 8 },
  summaryItem:   { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.1)', padding: 7, borderRadius: 7, marginBottom: 4 },
  summaryActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  summaryLabel:  { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
  summaryValue:  { color: 'white', fontSize: 10, fontWeight: 'bold' },

  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle:     { fontSize: 16, fontWeight: 'bold', color: '#475569', marginTop: 16 },
  emptySubtitle:  { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 6, paddingHorizontal: 20 },
  buatBtn:        { marginTop: 20, backgroundColor: '#1F3B6D', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  buatBtnText:    { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  // Load More
  loadMoreBtn:  { alignItems: 'center', paddingVertical: 12 },
  loadMoreText: { color: '#3B466D', fontWeight: '600', fontSize: 13 },

  // Modal
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent:       { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  modalHandle:        { width: 40, height: 4, backgroundColor: '#CBD5E0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle:         { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },
  filterOption:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  filterOptionActive: { backgroundColor: '#EFF6FF', marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 8, borderBottomWidth: 0 },
  filterOptionText:   { fontSize: 14, color: '#475569' },
  closeModal:         { marginTop: 16, paddingVertical: 12, alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 10 },
  closeModalText:     { color: '#EF4444', fontWeight: 'bold', fontSize: 14 },
});