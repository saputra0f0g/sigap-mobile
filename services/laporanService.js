/**
 * API calls for reports created by the authenticated masyarakat user.
 */

import api from './api';

const laporanService = {
  getDaftarMilikSaya: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return await api.get(`/laporan${qs}`);
  },

  getDetail: async (id) => {
    return await api.get(`/laporan/${id}`);
  },

  buatLaporan: async (data) => {
    const formData = new FormData();

    formData.append('judul', data.judul);
    formData.append('deskripsi', data.deskripsi);
    formData.append('jenis_kerusakan', data.jenis_kerusakan);
    if (data.latitude != null) formData.append('latitude', String(data.latitude));
    if (data.longitude != null) formData.append('longitude', String(data.longitude));
    formData.append('alamat', data.alamat ?? '');

    if (data.foto?.length) {
      data.foto.forEach((file, index) => {
        formData.append(`foto[${index}]`, {
          uri: file.uri,
          name: file.name ?? `foto_${index}.jpg`,
          type: file.type ?? 'image/jpeg',
        });
      });
    }

    return await api.upload('/laporan', formData);
  },

  hapusLaporan: async (id) => {
    return await api.delete(`/laporan/${id}`);
  },

  getStatistik: async () => {
    return await api.get('/statistik');
  },

  getLaporanSelesai: async () => {
    return await api.get('/laporan?status=selesai');
  },
};

export default laporanService;
