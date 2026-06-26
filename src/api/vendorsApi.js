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
  if (!value) return '—';
  const date = new Date(value);

  if (isNaN(date.getTime())) return '—'; 
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
    status: vendor.status ?? vendor.Status ?? '',
    createdAt: vendor.createdAt ?? vendor.CreatedAt,
  };
}

function deriveUsername(email) {
  if (!email) return '—';
  const local = String(email).split('@')[0];
  return local || '—';
}

function deriveReferral(vendor) {
  if (vendor.vendorCode) {
    const suffix = vendor.vendorCode.replace(/^VEN-/i, 'AU-');
    return `REF-${suffix}`;
  }
  return '—';
}

function resolveBusinessName(form) {
  return (form.vendorRef || form.businessName || '').trim();
}

function mapVendorRow(vendor) {
  return {
    id: String(vendor.vendorId),
    vendorId: vendor.vendorId,
    businessName: vendor.businessName,
    vendorCode: vendor.vendorCode || '—',
    username: deriveUsername(vendor.email),
    vendorStatus: vendor.status,
    email: vendor.email || '—',
    phone: vendor.phone || '—',
    contactPerson: vendor.contactPerson || '—',
    referral: deriveReferral(vendor),
    updated: formatDate(vendor.createdAt),
    name: vendor.businessName,
  };
}

async function fetchLinkedInstituteFields(vendorId) {
  try {
    const { data } = await axiosClient.get('/api/institutes/admin');
    const linked = data.find((item) => String(item.vendorId ?? item.VendorId) === String(vendorId));
    if (!linked) return {};
    const institute = normalizeInstituteFromRaw(linked);
    return {
      instituteName: institute.instituteName,
      websiteUrl: institute.websiteUrl,
      logoUrl: institute.logoUrl,
      primaryColor: institute.primaryColour || '#3385c6',
      secondaryColor: institute.secondaryColour || '#1a2b3d',
      address: institute.address,
      city: institute.city,
      state: institute.state,
      serviceType: institute.serviceTypes,
    };
  } catch {
    return {};
  }
}

function normalizeInstituteFromRaw(institute) {
  return {
    instituteName: institute.instituteName ?? institute.InstituteName ?? '',
    websiteUrl: institute.websiteUrl ?? institute.WebsiteUrl ?? '',
    logoUrl: institute.logoUrl ?? institute.LogoUrl ?? '',
    primaryColour: institute.primaryColour ?? institute.PrimaryColour ?? '',
    secondaryColour: institute.secondaryColour ?? institute.SecondaryColour ?? '',
    address: institute.address ?? institute.Address ?? '',
    city: institute.city ?? institute.City ?? '',
    state: institute.state ?? institute.State ?? '',
    serviceTypes: institute.serviceTypes ?? institute.ServiceTypes ?? '',
  };
}

export async function fetchVendorRows() {
  const { data } = await axiosClient.get('/api/vendors');
  return data.map((raw) => mapVendorRow(normalizeVendor(raw)));
}

export async function createVendor(form) {
  const businessName = resolveBusinessName(form);
  if (!businessName) {
    throw new Error('Vendor name is required');
  }

  if (!form.phone?.trim()) {
    throw new Error('Phone is required');
  }

  if (!form.email?.trim()) {
    throw new Error('Email is required to send the onboarding link');
  }

  const userId = getStoredUserId();
  if (!userId) {
    throw new Error('Please log in again to register a vendor.');
  }

  const { data } = await axiosClient.post('/api/vendors/register', {
    userId,
    businessName,
    contactPerson: (form.contactPerson || form.contact)?.trim() || '',
    phone: form.phone.trim(),
    email: form.email.trim(),
  });

  const vendor = normalizeVendor(data);

  if (form.vendorStatus && form.vendorStatus !== 'Pending') {
    await axiosClient.put(`/api/vendors/${vendor.vendorId}/status`, {
      status: form.vendorStatus,
    });
  }

  return vendor;
}

function buildVendorForm(vendor, instituteFields = {}) {
  return {
    vendorCode: vendor.vendorCode || '',
    username: deriveUsername(vendor.email),
    businessName: vendor.businessName,
    vendorRef: vendor.businessName,
    contactPerson: vendor.contactPerson || '',
    contact: vendor.contactPerson || '',
    referral: deriveReferral(vendor),
    vendorStatus: vendor.status || 'Pending',
    email: vendor.email || '',
    phone: vendor.phone || '',
    instituteName: instituteFields.instituteName || '',
    websiteUrl: instituteFields.websiteUrl || '',
    logoUrl: instituteFields.logoUrl || '',
    primaryColor: instituteFields.primaryColor || '#3385c6',
    secondaryColor: instituteFields.secondaryColor || '#1a2b3d',
    address: instituteFields.address || '',
    city: instituteFields.city || '',
    state: instituteFields.state || '',
    serviceType: instituteFields.serviceType || '',
    isPublic: 'No',
    notes: '',
  };
}

export async function fetchVendorById(vendorId) {
  const { data } = await axiosClient.get(`/api/vendors/${vendorId}`);
  return normalizeVendor(data);
}

export async function fetchVendorForm(vendorId) {
  const vendor = await fetchVendorById(vendorId);
  const instituteFields = await fetchLinkedInstituteFields(vendorId);
  return {
    vendor,
    form: buildVendorForm(vendor, instituteFields),
  };
}

export async function deleteVendor(vendorId) {
  await axiosClient.delete(`/api/vendors/${vendorId}`);
}

export async function updateVendor(vendorId, form) {
  const businessName = resolveBusinessName(form);
  if (!businessName) {
    throw new Error('Vendor name is required');
  }

  if (!form.phone?.trim()) {
    throw new Error('Phone is required');
  }

  const existing = await fetchVendorById(vendorId);

  const { data } = await axiosClient.put(`/api/vendors/${vendorId}`, {
    businessName,
    contactPerson: (form.contactPerson || form.contact)?.trim() || '',
    phone: form.phone.trim(),
    email: form.email?.trim() || '',
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
