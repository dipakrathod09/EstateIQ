import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:8000/api' });

// Attach JWT if present
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getInvestmentListings = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.asset_class) params.set('asset_class', filters.asset_class);
  if (filters.is_pre_launch !== undefined && filters.is_pre_launch !== null)
    params.set('is_pre_launch', filters.is_pre_launch);
  if (filters.min_roi) params.set('min_roi', filters.min_roi);
  if (filters.max_roi) params.set('max_roi', filters.max_roi);
  if (filters.ordering) params.set('ordering', filters.ordering);
  return API.get(`/investments/?${params.toString()}`);
};

export const getInvestmentListing = (id) => API.get(`/investments/${id}/`);

export const submitInvestmentInquiry = (listingId, data) =>
  API.post(`/investments/${listingId}/inquire/`, data);

export const getInvestmentInquiries = (listingId) =>
  API.get(`/investments/${listingId}/inquiries/`);

export const updateInquiryStatus = (inquiryId, status) =>
  API.patch(`/investments/inquiries/${inquiryId}/`, { status });
