import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, Image,
  Platform, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import laporanService from '../../services/laporanService';

const { width } = Dimensions.get('window');

import MapTilerWebView from '../../components/MapTilerWebView';


export default function HalamanKirimLaporan() {
  const router  = useRouter();

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeTab,   setActiveTab]   = useState(1);
  const [judul,       setJudul]       = useState('');
  const [deskripsi,   setDeskripsi]   = useState('');
  const [mediaFiles,  setMediaFiles]  = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [locLoading,  setLocLoading]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching,   setSearching]   = useState(false);
  const [location,    setLocation]    = useState({
    latitude:  -6.2088,
    longitude: 106.8210,
    address:   '',
    confirmed: false,
  });

  // ── GPS: ambil koordinat saat ini ─────────────────────────────────────────
  const handleGPS = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Aktifkan izin lokasi di pengaturan perangkat.'); return;
      }

      // Gunakan Accuracy.Low agar lebih cepat di Expo Go
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
        timeInterval: 5000,
      });

      // Reverse geocode dengan timeout 8 detik
      let addr = '';
      try {
        const geoPromise = Location.reverseGeocodeAsync(pos.coords);
        const timeout    = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000));
        const geo        = await Promise.race([geoPromise, timeout]);
        const p          = geo[0] ?? {};
        addr = [p.street, p.name, p.city].filter(Boolean).join(', ');
      } catch (_) {
        // Jika geocode timeout, pakai koordinat saja
        addr = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
      }

      const newLoc = {
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        address:   addr,
        confirmed: true,
      };
      setLocation(newLoc);
      setSearchQuery(addr);
      // mapRef dihapus — pan peta tidak diperlukan (WebView update otomatis via props)
    } catch (e) {
      Alert.alert('Gagal GPS', e.message || 'Gagal mendapatkan lokasi');
    } finally {
      setLocLoading(false);
    }
  };

  // ── Tap di peta: reverse geocode koordinat dari WebView ──────────────────
  const handleMapPress = async ({ latitude, longitude }) => {
    try {
      const geoPromise = Location.reverseGeocodeAsync({ latitude, longitude });
      const timeout    = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000));
      const geo        = await Promise.race([geoPromise, timeout]);
      const p          = geo[0] ?? {};
      const addr       = [p.street, p.name, p.city].filter(Boolean).join(', ')
                          || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      setLocation({ latitude, longitude, address: addr, confirmed: true });
      setSearchQuery(addr);
    } catch (_) {
      setLocation({ latitude, longitude, address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, confirmed: true });
    }
  };

  // ── Search: forward geocode → pan peta ────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await Location.geocodeAsync(searchQuery.trim());
      if (!results || results.length === 0) {
        Alert.alert('Tidak Ditemukan', 'Alamat tidak ditemukan. Coba kata kunci lain.'); return;
      }
      const { latitude, longitude } = results[0];
      const geo  = await Location.reverseGeocodeAsync({ latitude, longitude });
      const p    = geo[0] ?? {};
      const addr = [p.street, p.name, p.city].filter(Boolean).join(', ') || searchQuery.trim();
      setLocation({ latitude, longitude, address: addr, confirmed: true });
    } catch (e) {
      Alert.alert('Gagal', 'Gagal mencari lokasi: ' + e.message);
    } finally {
      setSearching(false);
    }
  };

  // ── Pilih foto ─────────────────────────────────────────────────────────────
  const pickImage = async (camera = false) => {
    if (mediaFiles.length >= 3) { Alert.alert('Info', 'Maksimal 3 foto'); return; }
    const perm = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Izin Ditolak', `Butuh akses ${camera ? 'kamera' : 'galeri'}. Silakan aktifkan di Pengaturan perangkat Anda.`); return;
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!res.canceled) setMediaFiles([...mediaFiles, { id: Date.now(), uri: res.assets[0].uri }]);
  };

  // ── Submit ke API ─────────────────────────────────────────────────────────
  const submit = async () => {
    if (!judul.trim())         return Alert.alert('Validasi', 'Judul tidak boleh kosong');
    if (!deskripsi.trim())     return Alert.alert('Validasi', 'Deskripsi tidak boleh kosong');
    if (mediaFiles.length < 1) return Alert.alert('Validasi', 'Unggah minimal 1 foto bukti');

    setLoading(true);
    try {
      const alamat = location.confirmed
        ? (location.address || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`)
        : '-';

      const res = await laporanService.buatLaporan({
        judul:     judul.trim(),
        deskripsi: deskripsi.trim(),
        kategori:  'Umum', // kategori default; admin akan menetapkan bidang setelah menerima laporan
        latitude:  location.confirmed ? location.latitude  : null,
        longitude: location.confirmed ? location.longitude : null,
        alamat,
        foto: mediaFiles.map((f, i) => ({ uri: f.uri, name: `foto_${i + 1}.jpg`, type: 'image/jpeg' })),
      });

      router.replace({
        pathname: '/(masyarakat)/terkirim',
        params: { reportId: res?.laporan?.kode_laporan ?? 'SIGAP-BARU' },
      });
    } catch (e) {
      Alert.alert('Gagal Kirim', e.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicator ────────────────────────────────────────────────────────
  const StepBar = () => (
    <View style={s.stepRow}>
      {['Detail', 'Media', 'Lokasi'].map((label, i) => {
        const n = i + 1;
        const done   = activeTab > n;
        const active = activeTab === n;
        return (
          <React.Fragment key={n}>
            <TouchableOpacity style={s.stepItem} onPress={() => setActiveTab(n)}>
              <View style={[s.stepCircle, active && s.stepActive, done && s.stepDone]}>
                {done
                  ? <Icon name="check" size={13} color="#fff" />
                  : <Text style={[s.stepNum, (active || done) && { color: '#fff' }]}>{n}</Text>}
              </View>
              <Text style={[s.stepLabel, active && s.stepLabelActive]}>{label}</Text>
            </TouchableOpacity>
            {i < 2 && <View style={[s.stepLine, done && s.stepLineDone]} />}
          </React.Fragment>
        );
      })}
    </View>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F3B6D" />

      <StepBar />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ══ TAB 1: DETAIL ════════════════════════════════════════════════════ */}
        {activeTab === 1 && (
          <View>
            <Text style={s.label}>Judul Laporan *</Text>
            <TextInput
              style={s.input}
              placeholder="Cth: Jalan berlubang di Jl. Sudirman"
              placeholderTextColor="#A0AEC0"
              value={judul}
              onChangeText={setJudul}
              maxLength={80}
            />

            <Text style={s.label}>Deskripsi Masalah *</Text>
            <View style={s.textareaWrap}>
              <TextInput
                style={s.textarea} multiline maxLength={500}
                placeholder="Ceritakan detail kerusakan, lokasi, dan dampaknya..."
                placeholderTextColor="#A0AEC0"
                value={deskripsi} onChangeText={setDeskripsi}
              />
              <Text style={s.counter}>{deskripsi.length}/500</Text>
            </View>

            <View style={s.infoBox}>
              <Icon name="information" size={15} color="#1F3B6D" />
              <Text style={s.infoText}>Kategori laporan akan ditentukan oleh admin setelah laporan diterima.</Text>
            </View>

            <TouchableOpacity
              style={[s.btnPrimary, (!judul.trim() || !deskripsi.trim()) && s.btnDisabled]}
              onPress={() => {
                if (!judul.trim())     return Alert.alert('Validasi', 'Isi judul dahulu');
                if (!deskripsi.trim()) return Alert.alert('Validasi', 'Isi deskripsi dahulu');
                setActiveTab(2);
              }}
            >
              <Text style={s.btnText}>Lanjut ke Media</Text>
              <Icon name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ══ TAB 2: MEDIA ════════════════════════════════════════════════════ */}
        {activeTab === 2 && (
          <View>
            <Text style={s.label}>Foto Bukti {mediaFiles.length === 0 ? 'Unggah minimal 1 foto' : `(${mediaFiles.length}/3)`} *</Text>
            <View style={s.uploadRow}>
              <TouchableOpacity style={s.uploadCard} onPress={() => pickImage(true)}>
                <Icon name="camera" size={30} color="#1F3B6D" />
                <Text style={s.uploadText}>Kamera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.uploadCard} onPress={() => pickImage(false)}>
                <Icon name="image-multiple" size={30} color="#1F3B6D" />
                <Text style={s.uploadText}>Galeri</Text>
              </TouchableOpacity>
            </View>

            {mediaFiles.length > 0 && (
              <View style={s.mediaGrid}>
                {mediaFiles.map((f, idx) => (
                  <View key={f.id} style={s.mediaItem}>
                    <Image source={{ uri: f.uri }} style={s.mediaImg} />
                    {idx === 0 && (
                      <View style={s.mainTag}><Text style={s.mainTagText}>Utama</Text></View>
                    )}
                    <TouchableOpacity
                      style={s.removeBtn}
                      onPress={() => setMediaFiles(mediaFiles.filter(x => x.id !== f.id))}
                    >
                      <Icon name="close" size={13} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={s.navRow}>
              <TouchableOpacity style={s.btnOutline} onPress={() => setActiveTab(1)}>
                <Icon name="arrow-left" size={18} color="#1F3B6D" />
                <Text style={s.btnOutlineText}>Kembali</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnPrimarySmall, mediaFiles.length === 0 && s.btnDisabled]}
                onPress={() => mediaFiles.length > 0 ? setActiveTab(3) : Alert.alert('Validasi', 'Unggah minimal 1 foto')}
              >
                <Text style={s.btnText}>Lanjut ke Lokasi</Text>
                <Icon name="arrow-right" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══ TAB 3: LOKASI ═══════════════════════════════════════════════════ */}
        {activeTab === 3 && (
          <View>

            {/* Header row */}
            <View style={s.locHeader}>
              <View style={s.locHeaderLeft}>
                <Icon name="map-marker" size={17} color="#2563EB" />
                <Text style={s.locTitle}>Lokasi Kejadian</Text>
              </View>
              <TouchableOpacity style={s.gpsLink} onPress={handleGPS} disabled={locLoading}>
                {locLoading
                  ? <ActivityIndicator size="small" color="#2563EB" />
                  : <Icon name="crosshairs-gps" size={13} color="#2563EB" />}
                <Text style={s.gpsLinkText}>
                  {!judul || !deskripsi ? 'Isi judul dan deskripsi dahulu' : 'Gunakan Lokasi Saat Ini'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Map Card */}
            <View style={s.mapCard}>

              {/* Search bar */}
              <View style={s.searchBar}>
                <Icon name="magnify" size={18} color="#94A3B8" />
                <TextInput
                  style={s.searchInput}
                  placeholder="Cari alamat atau koordinat..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                {searching
                  ? <ActivityIndicator size="small" color="#2563EB" />
                  : searchQuery.length > 0
                    ? <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Icon name="close-circle" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    : <TouchableOpacity onPress={handleSearch}>
                        <Icon name="arrow-right-circle" size={20} color="#2563EB" />
                      </TouchableOpacity>
                }
              </View>

              {/* ── MapTiler WebView — Expo Go compatible ── */}
              {Platform.OS !== 'web' && (
                <View style={s.mapArea}>
                  <MapTilerWebView
                    latitude={location.latitude}
                    longitude={location.longitude}
                    zoom={14}
                    style={{ flex: 1 }}
                    interactive
                    onPress={handleMapPress}
                    markers={
                      location.confirmed
                        ? [{ latitude: location.latitude, longitude: location.longitude, color: '#2563EB' }]
                        : []
                    }
                  />

                  {/* Hint badge jika belum ada pin */}
                  {!location.confirmed && (
                    <View style={s.hintBadge} pointerEvents="none">
                      <Icon name="gesture-tap" size={13} color="#fff" />
                      <Text style={s.hintBadgeText}>Ketuk peta untuk pilih titik</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Address Card */}
            <View style={s.addressCard}>
              <Icon name="map" size={20} color="#94A3B8" />
              <View style={s.addressTexts}>
                <Text style={s.addressPrimary} numberOfLines={2}>
                  {location.confirmed && location.address
                    ? location.address
                    : 'Belum dipilih — ketuk peta atau cari'}
                </Text>
                {location.confirmed && (
                  <Text style={s.addressSub}>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </Text>
                )}
              </View>
              {location.confirmed && (
                <TouchableOpacity
                  onPress={() => { setLocation({ ...location, confirmed: false, address: '' }); setSearchQuery(''); }}
                >
                  <Icon name="pencil" size={17} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {!location.confirmed && (
              <View style={s.warnBox}>
                <Icon name="alert-outline" size={14} color="#F59E0B" />
                <Text style={s.warnText}>
                  Lokasi belum ditentukan. Laporan tetap bisa dikirim tanpa GPS.
                </Text>
              </View>
            )}

            <View style={s.navRow}>
              <TouchableOpacity style={s.btnOutline} onPress={() => setActiveTab(2)}>
                <Icon name="arrow-left" size={18} color="#1F3B6D" />
                <Text style={s.btnOutlineText}>Kembali</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSubmit, loading && { opacity: 0.6 }]}
                onPress={submit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Icon name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={s.btnText}>Kirim Laporan</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F8F9FF' },
  header:      { backgroundColor: '#1F3B6D', flexDirection: 'row', padding: 16, alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Step bar
  stepRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#EEF0F5' },
  stepItem:        { alignItems: 'center' },
  stepLine:        { flex: 1, height: 2, backgroundColor: '#E0E5F2', marginHorizontal: 4, marginBottom: 14 },
  stepLineDone:    { backgroundColor: '#1F3B6D' },
  stepCircle:      { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E5F2', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  stepActive:      { backgroundColor: '#F4C430' },
  stepDone:        { backgroundColor: '#1F3B6D' },
  stepNum:         { color: '#999', fontWeight: 'bold', fontSize: 12 },
  stepLabel:       { fontSize: 9, color: '#999', fontWeight: '600' },
  stepLabelActive: { color: '#1F3B6D', fontWeight: '800' },

  scroll: { padding: 20, paddingBottom: 60 },
  label:  { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8, marginTop: 16 },

  // Inputs
  input:       { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E0E5F2', padding: 13, fontSize: 14, color: '#333', marginBottom: 4 },
  textareaWrap:{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E0E5F2', padding: 13 },
  textarea:    { minHeight: 110, textAlignVertical: 'top', fontSize: 14, color: '#333' },
  counter:     { textAlign: 'right', fontSize: 10, color: '#94A3B8', marginTop: 4 },
  infoBox:     { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10, gap: 8, marginTop: 12, alignItems: 'flex-start' },
  infoText:    { flex: 1, fontSize: 12, color: '#1E40AF', lineHeight: 17 },

  // Buttons
  btnPrimary:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4C430', borderRadius: 12, height: 52, gap: 8, marginTop: 16 },
  btnPrimarySmall: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4C430', borderRadius: 10, height: 50, gap: 6 },
  btnDisabled:     { opacity: 0.45 },
  btnText:         { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnOutline:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 10, borderWidth: 1.5, borderColor: '#1F3B6D', gap: 6 },
  btnOutlineText:  { color: '#1F3B6D', fontWeight: 'bold' },
  btnSubmit:       { flex: 2, flexDirection: 'row', backgroundColor: '#1F3B6D', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  navRow:          { flexDirection: 'row', gap: 12, marginTop: 20 },

  // Media
  uploadRow:   { flexDirection: 'row', gap: 12, marginBottom: 12 },
  uploadCard:  { flex: 1, height: 100, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: '#D1D9E6', backgroundColor: '#F9FAFF', justifyContent: 'center', alignItems: 'center', gap: 6 },
  uploadText:  { fontSize: 12, color: '#1F3B6D', fontWeight: 'bold' },
  mediaGrid:   { flexDirection: 'row', gap: 8, marginBottom: 16 },
  mediaItem:   { width: (width - 56) / 3, aspectRatio: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: '#eee' },
  mediaImg:    { width: '100%', height: '100%' },
  mainTag:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(31,59,109,0.75)', padding: 3, alignItems: 'center' },
  mainTagText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  removeBtn:   { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(239,68,68,0.85)', borderRadius: 10, padding: 3 },

  // Lokasi Tab
  locHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 8 },
  locHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locTitle:      { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  gpsLink:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  gpsLinkText:   { color: '#2563EB', fontSize: 12, fontWeight: '600' },

  // Map card (rounded container)
  mapCard: {
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#1a2744',
    borderWidth: 1, borderColor: '#dde3f0',
    marginBottom: 12, elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10,
  },

  // Search bar inside map card
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    margin: 10, borderRadius: 30,
    paddingHorizontal: 14, paddingVertical: 9,
    gap: 8, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1E293B', padding: 0 },

  // Map area
  mapArea:     { height: 240, position: 'relative' },
  mapView:     { width: '100%', height: '100%' },

  // Hint badge floating on map
  hintBadge: {
    position: 'absolute', bottom: 14,
    alignSelf: 'center', left: '50%', marginLeft: -75,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(37,99,235,0.88)',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, elevation: 4,
  },
  hintBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  // Map fallback (web)
  mapFallback:     { justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#1a2744' },
  mapFallbackText: { color: '#94A3B8', textAlign: 'center', fontSize: 12, lineHeight: 20 },

  // Address card below map
  addressCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#E2EAF4', borderStyle: 'dashed',
    gap: 12, marginBottom: 8,
  },
  addressTexts:   { flex: 1 },
  addressPrimary: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  addressSub:     { fontSize: 11, color: '#64748B', marginTop: 2 },

  warnBox:  { flexDirection: 'row', backgroundColor: '#FFFBEB', padding: 12, borderRadius: 10, gap: 8, alignItems: 'flex-start', marginTop: 4 },
  warnText: { flex: 1, fontSize: 11, color: '#92400E' },
});