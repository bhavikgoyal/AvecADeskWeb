import axiosClient from './axiosClient';
import { STORAGE_KEY } from '../constants/auth';

function getStoredUserId() {
  try {
    const savedUser = localStorage.getItem(STORAGE_KEY);
    if (!savedUser) return null;
    const user = JSON.parse(savedUser);
    const id = Number(user?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function normalizeVendor(vendor) {
  return {
    vendorId: vendor.vendorId ?? vendor.VendorId,
    userId: vendor.userId ?? vendor.UserId,
    vendorCode: vendor.vendorCode ?? vendor.VendorCode ?? '',
    businessName: vendor.businessName ?? vendor.BusinessName ?? '',
    contactPerson: vendor.contactPerson ?? vendor.ContactPerson ?? '',
    phone: vendor.phone ?? vendor.Phone ?? '',
    email: vendor.email ?? vendor.Email ?? '',
    bankDetails: vendor.bankDetails ?? vendor.BankDetails ?? '',
    commissionPreference: vendor.commissionPreference ?? vendor.CommissionPreference ?? '',
    status: vendor.status ?? vendor.Status ?? '',
    createdAt: vendor.createdAt ?? vendor.CreatedAt,
  };
}

export async function fetchVendorRows() {
  const { data } = await axiosClient.get('/api/vendors');
  return data.map((raw) => {
    const vendor = normalizeVendor(raw);
    return {
      id: String(vendor.vendorId),
      vendorId: vendor.vendorId,
      businessName: vendor.businessName,
      vendorCode: vendor.vendorCode || '—',
      vendorStatus: vendor.status,
      email: vendor.email,
      phone: vendor.phone,
      contactPerson: vendor.contactPerson,
      updated: formatDate(vendor.createdAt),
      name: vendor.businessName,
    };
  });
}

export async function createVendor(form) {
  if (!form.businessName?.trim()) {
    throw new Error('Business name is required');
  }

  if (!form.phone?.trim()) {
    throw new Error('Phone is required');
  }

  const userId = getStoredUserId();
  if (!userId) {
    throw new Error('Please log in again to register a vendor.');
  }

  const { data } = await axiosClient.post('/api/vendors/register', {
    userId,
    businessName: form.businessName.trim(),
    contactPerson: form.contactPerson?.trim() || '',
    phone: form.phone.trim(),
    email: form.email?.trim() || '',
    bankDetails: form.bankDetails?.trim() || null,
    commissionPreference: form.commissionPreference?.trim() || null,
  });

  const vendor = normalizeVendor(data);

  if (form.vendorStatus && form.vendorStatus !== 'Pending') {
    await axiosClient.put(`/api/vendors/${vendor.vendorId}/status`, {
      status: form.vendorStatus,
    });
  }

  return vendor;
}

function buildVendorForm(vendor) {
  return {
    vendorCode: vendor.vendorCode || '',
    businessName: vendor.businessName,
    contactPerson: vendor.contactPerson || '',
    vendorStatus: vendor.status || 'Pending',
    email: vendor.email || '',
    phone: vendor.phone || '',
    commissionPreference: vendor.commissionPreference || '',
    bankDetails: vendor.bankDetails || '',
    notes: '',
  };
}

export async function fetchVendorById(vendorId) {
  const { data } = await axiosClient.get(`/api/vendors/${vendorId}`);
  return normalizeVendor(data);
}

export async function fetchVendorForm(vendorId) {
  const vendor = await fetchVendorById(vendorId);
  return {
    vendor,
    form: buildVendorForm(vendor),
  };
}

export async function updateVendor(vendorId, form) {
  if (!form.businessName?.trim()) {
    throw new Error('Business name is required');
  }

  if (!form.phone?.trim()) {
    throw new Error('Phone is required');
  }

  const existing = await fetchVendorById(vendorId);

  const { data } = await axiosClient.put(`/api/vendors/${vendorId}`, {
    businessName: form.businessName.trim(),
    contactPerson: form.contactPerson?.trim() || '',
    phone: form.phone.trim(),
    email: form.email?.trim() || '',
    bankDetails: form.bankDetails?.trim() || null,
    commissionPreference: form.commissionPreference?.trim() || null,
  });

  let vendor = normalizeVendor(data);

  if (form.vendorStatus && form.vendorStatus !== existing.status) {
    await axiosClient.put(`/api/vendors/${vendorId}/status`, {
      status: form.vendorStatus,
    });
    vendor = await fetchVendorById(vendorId);
  }

  return vendor;
}
