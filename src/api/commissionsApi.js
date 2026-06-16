import axiosClient from './axiosClient';

function normalizeCommissionRate(raw) {
  return {
    commissionId: raw.commissionId ?? raw.CommissionId,
    vendorId: raw.vendorId ?? raw.VendorId,
    instituteId: raw.instituteId ?? raw.InstituteId ?? null,
    courseId: raw.courseId ?? raw.CourseId ?? null,
    rateType: raw.rateType ?? raw.RateType ?? '',
    rate: raw.rate ?? raw.Rate ?? 0,
    effectiveFrom: raw.effectiveFrom ?? raw.EffectiveFrom ?? '',
    effectiveTo: raw.effectiveTo ?? raw.EffectiveTo ?? null,
  };
}

function toApiPayload(form) {
  return {
    instituteId: form.instituteId ? Number(form.instituteId) : null,
    courseId: form.courseId ? Number(form.courseId) : null,
    rateType: form.rateType,
    rate: Number(form.rate),
    effectiveFrom: form.effectiveFrom,
    effectiveTo: form.effectiveTo || null,
  };
}

export async function fetchCommissionRates(vendorId) {
  const params = vendorId ? { vendorId } : undefined;
  const { data } = await axiosClient.get('/api/commissions/rates', { params });
  return (data ?? []).map(normalizeCommissionRate);
}

export async function fetchVendorCommissionRates(vendorId) {
  return fetchCommissionRates(vendorId);
}

export async function createVendorCommissionRate(vendorId, form) {
  const { data } = await axiosClient.post(`/api/commissions/vendor/${vendorId}`, toApiPayload(form));
  return normalizeCommissionRate(data);
}

export async function updateVendorCommissionRate(vendorId, commissionId, form) {
  const { data } = await axiosClient.put(
    `/api/commissions/vendor/${vendorId}/rates/${commissionId}`,
    toApiPayload(form),
  );
  return normalizeCommissionRate(data);
}

export async function deleteVendorCommissionRate(vendorId, commissionId) {
  await axiosClient.delete(`/api/commissions/vendor/${vendorId}/rates/${commissionId}`);
}

export function getEmptyCommissionRateForm(defaultVendorId = '') {
  const today = new Date().toISOString().slice(0, 10);
  return {
    vendorId: defaultVendorId ? String(defaultVendorId) : '',
    instituteId: '',
    courseId: '',
    rateType: 'Fixed',
    rate: '',
    effectiveFrom: today,
    effectiveTo: '',
  };
}
