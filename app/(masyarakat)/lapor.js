import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, Image,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import laporanService from '../../services/laporanService';

const { width } = Dimensions.get('window');

const JENIS_KERUSAKAN_OPTIONS = [
  { label: 'Jalan Berlubang', value: 'jalan_berlubang' },
  { label: 'Jalan Retak', value: 'jalan_retak' },
  { label: 'Jalan Amblas', value: 'jalan_amblas' },
  { label: 'Jalan Banjir', value: 'jalan_banjir' },
  { label: 'Lampu Jalan Mati', value: 'lampu_jalan_mati' },
  { label: 'Trotoar Rusak', value: 'trotoar_rusak' },
  { label: 'Rambu Rusak', value: 'rambu_rusak' },
  { label: 'Drainase Tersumbat', value: 'drainase_tersumbat' },
  { label: 'Lainnya', value: 'lainnya' },
];

export default function HalamanKirimLaporan() {
  const router  = useRouter();

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeTab,   setActiveTab]   = useState(1);
  const [judul,       setJudul]       = useState('');
  const [deskripsi,   setDeskripsi]   = useState('');
  const [jenisKerusakan, setJenisKerusakan] = useState('');
  const [jenisDropdownOpen, setJenisDropdownOpen] = useState(false);
  const [mediaFiles,  setMediaFiles]  = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [locLoading,  setLocLoading]  = useState(false);
  const [location,    setLocation]    = useState({
    latitude:  null,
    longitude: null,
    address:   '',
    confirmed: false,
  });

  const resetForm = () => {
    setActiveTab(1);
    setJudul('');
    setDeskripsi('');
    setJenisKerusakan('');
    setJenisDropdownOpen(false);
    setMediaFiles([]);
    setLocation({
      latitude: null,
      longitude: null,
      address: '',
      confirmed: false,
    });
  };

  // ── GPS: otomatis ambil lokasi setelah foto diambil ──────────────────────
  const captureLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Izin lokasi diperlukan agar lokasi laporan dapat dicantumkan. Aktifkan izin lokasi perangkat lalu coba ambil foto lagi.');
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coordsAddress = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
      let address = coordsAddress;
      try {
        const places = await Location.reverseGeocodeAsync(pos.coords);
        const place = places[0] ?? {};
        address = [
          place.street,
          place.name,
          place.district,
          place.city,
          place.region,
        ].filter((part, index, parts) => part && parts.indexOf(part) === index).join(', ') || coordsAddress;
      } catch (_) {
        // Koordinat tetap dicantumkan jika alamat tidak dapat ditemukan.
      }

      setLocation({
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        address,
        confirmed: true,
      });
      return true;
    } catch (e) {
      setLocation({ latitude: null, longitude: null, address: '', confirmed: false });
      Alert.alert('Lokasi Tidak Tersedia', e.message || 'Gagal mendapatkan lokasi. Coba ambil foto lagi setelah memastikan GPS aktif.');
      return false;
    } finally {
      setLocLoading(false);
    }
  };

  // ── Ambil foto dengan kamera dan langsung simpan lokasi GPS ───────────────
  const takePhoto = async () => {
    if (mediaFiles.length >= 3) { Alert.alert('Info', 'Maksimal 3 foto'); return; }
    setCameraLoading(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Izin Ditolak', 'Akses kamera diperlukan untuk mengambil foto laporan.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      setMediaFiles((current) => [
        ...current,
        { id: `${Date.now()}-${current.length}`, uri: asset.uri },
      ]);
      await captureLocation();
    } catch (error) {
      Alert.alert('Gagal Membuka Kamera', error.message || 'Kamera tidak dapat dibuka.');
    } finally {
      setCameraLoading(false);
    }
  };

  // ── Submit ke API ─────────────────────────────────────────────────────────
  const submit = async () => {
    if (loading) return;
    if (!judul.trim())         return Alert.alert('Validasi', 'Judul tidak boleh kosong');
    if (!deskripsi.trim())     return Alert.alert('Validasi', 'Deskripsi tidak boleh kosong');
    if (!jenisKerusakan)       return Alert.alert('Validasi', 'Pilih jenis kerusakan');
    if (mediaFiles.length < 1) return Alert.alert('Validasi', 'Unggah minimal 1 foto bukti');
    if (!location.confirmed)   return Alert.alert('Validasi', 'Lokasi belum tersedia. Ambil foto lagi untuk mengambil lokasi otomatis.');

    setLoading(true);
    try {
      await laporanService.buatLaporan({
        judul:     judul.trim(),
        deskripsi: deskripsi.trim(),
        jenis_kerusakan: jenisKerusakan,
        latitude:  location.latitude,
        longitude: location.longitude,
        alamat: location.address,
        foto: mediaFiles.map((f, i) => ({ uri: f.uri, name: `foto_${i + 1}.jpg`, type: 'image/jpeg' })),
      });

      resetForm();
      Alert.alert('Berhasil', 'Laporan berhasil dikirim.', [
        {
          text: 'OK',
          onPress: () => router.replace('/(masyarakat)/terkirim'),
        },
      ], { cancelable: false });
    } catch (e) {
      Alert.alert('Gagal Kirim', e.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicator ────────────────────────────────────────────────────────
  const StepBar = () => (
    <View style={s.stepRow}>
      {['Detail', 'Foto & Lokasi'].map((label, i) => {
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
            {i < 1 && <View style={[s.stepLine, done && s.stepLineDone]} />}
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

            <Text style={s.label}>Jenis Kerusakan *</Text>
            <TouchableOpacity
              style={s.dropdown}
              onPress={() => setJenisDropdownOpen((isOpen) => !isOpen)}
              accessibilityRole="button"
              accessibilityLabel="Pilih jenis kerusakan"
            >
              <Text style={[s.dropdownText, !jenisKerusakan && s.dropdownPlaceholder]}>
                {JENIS_KERUSAKAN_OPTIONS.find((option) => option.value === jenisKerusakan)?.label
                  ?? 'Pilih jenis kerusakan'}
              </Text>
              <Icon name={jenisDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#64748B" />
            </TouchableOpacity>
            {jenisDropdownOpen && (
              <View style={s.dropdownOptions}>
                {JENIS_KERUSAKAN_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={s.dropdownOption}
                    onPress={() => {
                      setJenisKerusakan(option.value);
                      setJenisDropdownOpen(false);
                    }}
                  >
                    <Text style={s.dropdownOptionText}>{option.label}</Text>
                    {jenisKerusakan === option.value && (
                      <Icon name="check" size={18} color="#1F3B6D" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

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
              <Text style={s.infoText}>Lokasi laporan akan diambil otomatis dari GPS saat Anda mengambil foto.</Text>
            </View>

            <TouchableOpacity
              style={[s.btnPrimary, (!judul.trim() || !deskripsi.trim()) && s.btnDisabled]}
              onPress={() => {
                if (!judul.trim())     return Alert.alert('Validasi', 'Isi judul dahulu');
                if (!jenisKerusakan) return Alert.alert('Validasi', 'Pilih jenis kerusakan dahulu');
                if (!deskripsi.trim()) return Alert.alert('Validasi', 'Isi deskripsi dahulu');
                setActiveTab(2);
              }}
            >
              <Text style={s.btnText}>Lanjut ke Foto</Text>
              <Icon name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ══ TAB 2: FOTO & LOKASI ════════════════════════════════════════════ */}
        {activeTab === 2 && (
          <View>
            <Text style={s.label}>Foto Bukti {mediaFiles.length === 0 ? 'Ambil minimal 1 foto' : `(${mediaFiles.length}/3)`} *</Text>
            <TouchableOpacity
              style={[s.uploadCard, cameraLoading && s.btnDisabled]}
              onPress={takePhoto}
              disabled={cameraLoading}
            >
              {cameraLoading
                ? <ActivityIndicator color="#1F3B6D" />
                : <Icon name="camera" size={30} color="#1F3B6D" />}
              <Text style={s.uploadText}>
                {cameraLoading ? 'Mengambil foto dan lokasi...' : 'Ambil Foto dengan Kamera'}
              </Text>
            </TouchableOpacity>

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

            <View style={s.locHeader}>
              <View style={s.locHeaderLeft}>
                <Icon name="map-marker" size={17} color="#2563EB" />
                <Text style={s.locTitle}>Lokasi Otomatis</Text>
              </View>
            </View>

            <View style={s.addressCard}>
              {locLoading
                ? <ActivityIndicator size="small" color="#2563EB" />
                : <Icon name="map-marker" size={20} color={location.confirmed ? '#10B981' : '#94A3B8'} />}
              <View style={s.addressTexts}>
                <Text style={s.addressPrimary} numberOfLines={2}>
                  {locLoading
                    ? 'Mengambil lokasi dari GPS...'
                    : location.confirmed
                      ? location.address
                      : 'Lokasi belum tersedia'}
                </Text>
                {location.confirmed && (
                  <Text style={s.addressSub}>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </Text>
                )}
              </View>
            </View>

            {!location.confirmed && (
              <View style={s.warnBox}>
                <Icon name="alert-outline" size={14} color="#F59E0B" />
                <Text style={s.warnText}>
                  Lokasi otomatis diambil saat foto dibuat. Pastikan izin lokasi aktif, lalu ambil foto.
                </Text>
              </View>
            )}

            <View style={s.navRow}>
              <TouchableOpacity style={s.btnOutline} onPress={() => setActiveTab(1)}>
                <Icon name="arrow-left" size={18} color="#1F3B6D" />
                <Text style={s.btnOutlineText}>Kembali</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSubmit, (loading || cameraLoading || locLoading || mediaFiles.length === 0 || !location.confirmed) && { opacity: 0.6 }]}
                onPress={submit}
                disabled={loading || cameraLoading || locLoading || mediaFiles.length === 0 || !location.confirmed}
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
  dropdown:    { minHeight: 50, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E0E5F2', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { fontSize: 14, color: '#333' },
  dropdownPlaceholder: { color: '#A0AEC0' },
  dropdownOptions: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E0E5F2', marginTop: 6, overflow: 'hidden' },
  dropdownOption: { minHeight: 46, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownOptionText: { fontSize: 14, color: '#334155' },
  textareaWrap:{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E0E5F2', padding: 13 },
  textarea:    { minHeight: 110, textAlignVertical: 'top', fontSize: 14, color: '#333' },
  counter:     { textAlign: 'right', fontSize: 10, color: '#94A3B8', marginTop: 4 },
  infoBox:     { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10, gap: 8, marginTop: 12, alignItems: 'flex-start' },
  infoText:    { flex: 1, fontSize: 12, color: '#1E40AF', lineHeight: 17 },

  // Buttons
  btnPrimary:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4C430', borderRadius: 12, height: 52, gap: 8, marginTop: 16 },
  btnDisabled:     { opacity: 0.45 },
  btnText:         { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnOutline:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 10, borderWidth: 1.5, borderColor: '#1F3B6D', gap: 6 },
  btnOutlineText:  { color: '#1F3B6D', fontWeight: 'bold' },
  btnSubmit:       { flex: 2, flexDirection: 'row', backgroundColor: '#1F3B6D', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  navRow:          { flexDirection: 'row', gap: 12, marginTop: 20 },

  // Media
  uploadCard:  { minHeight: 100, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: '#D1D9E6', backgroundColor: '#F9FAFF', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 12 },
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

  addressCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#E2EAF4',
    gap: 12, marginBottom: 8,
  },
  addressTexts:   { flex: 1 },
  addressPrimary: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  addressSub:     { fontSize: 11, color: '#64748B', marginTop: 2 },

  warnBox:  { flexDirection: 'row', backgroundColor: '#FFFBEB', padding: 12, borderRadius: 10, gap: 8, alignItems: 'flex-start', marginTop: 4 },
  warnText: { flex: 1, fontSize: 11, color: '#92400E' },
});