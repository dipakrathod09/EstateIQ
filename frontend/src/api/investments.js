import client from './client';

export const getInvestmentListings = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.asset_class) params.set('asset_class', filters.asset_class);
  if (filters.is_pre_launch !== undefined && filters.is_pre_launch !== null)
    params.set('is_pre_launch', filters.is_pre_launch);
  if (filters.min_roi) params.set('min_roi', filters.min_roi);
  if (filters.max_roi) params.set('max_roi', filters.max_roi);
  if (filters.ordering) params.set('ordering', filters.ordering);
  return client.get(`/investments/?${params.toString()}`);
};

export const getInvestmentListing = (id) => client.get(`/investments/${id}/`);

export const submitInvestmentInquiry = (listingId, data) =>
  client.post(`/investments/${listingId}/inquire/`, data);

export const getInvestmentInquiries = (listingId) =>
  client.get(`/investments/${listingId}/inquiries/`);

export const updateInquiryStatus = (inquiryId, status) =>
  client.patch(`/investments/inquiries/${inquiryId}/`, { status });
