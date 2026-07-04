import axiosClient from './axiosClient';
import { fetchVendors } from './lookupApi';
import { fetchCommissionRates } from './commissionsApi';

function formatInstituteAddress(institute) {
  const cityState = [institute.city, institute.state].filter(Boolean).join(' ');
  const parts = [institute.address, cityState].filter(Boolean);
  return parts.join(', ') || '—';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function pickCurrentRate(rates) {
  if (!rates.length) return null;
  const sorted = [...rates].sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom));
  const active = sorted.find((r) => !r.effectiveTo || new Date(r.effectiveTo) >= new Date());
  return active || sorted[0];
}

async function buildVendorNameMap() {
  try {
    const vendors = await fetchVendors();
    return Object.fromEntries(
      vendors.map((vendor) => [
        String(vendor.vendorId ?? vendor.VendorId),
        vendor.businessName ?? vendor.BusinessName ?? `Vendor ${vendor.vendorId ?? vendor.VendorId}`,
      ]),
    );
  } catch {
    return {};
  }
}

function normalizeInstitute(institute) {
  return {
    instituteId: institute.instituteId ?? institute.InstituteId,
    vendorId: institute.vendorId ?? institute.VendorId,
    instituteName: institute.instituteName ?? institute.InstituteName ?? '',
    websiteUrl: institute.websiteUrl ?? institute.WebsiteUrl ?? '',
    logoUrl: institute.logoUrl ?? institute.LogoUrl ?? '',
    primaryColour: institute.primaryColour ?? institute.PrimaryColour ?? '',
    secondaryColour: institute.secondaryColour ?? institute.SecondaryColour ?? '',
    address: institute.address ?? institute.Address ?? '',
    city: institute.city ?? institute.City ?? '',
    state: institute.state ?? institute.State ?? '',
    serviceTypes: institute.serviceTypes ?? institute.ServiceTypes ?? '',
    contactEmail: institute.contactEmail ?? institute.ContactEmail ?? '',
    contactPhone: institute.contactPhone ?? institute.ContactPhone ?? '',
    status: institute.status ?? institute.Status ?? '',
    isPublished: institute.isPublished ?? institute.IsPublished ?? false,
    createdAt: institute.createdAt ?? institute.CreatedAt,
  };
}

export async function fetchInstituteRows() {
  const [{ data }, vendorMap, allRates] = await Promise.all([
    axiosClient.get('/api/institutes/admin'),
    buildVendorNameMap(),
    fetchCommissionRates().catch(() => []),
  ]);

  return data.map((raw) => {
    const institute = normalizeInstitute(raw);
    const instituteRates = allRates.filter(
      (r) => String(r.instituteId) === String(institute.instituteId),
    );
    const currentRate = pickCurrentRate(instituteRates);

    return {
      id: String(institute.instituteId),
      instituteId: institute.instituteId,
      vendorId: institute.vendorId,
      vendorName: vendorMap[String(institute.vendorId)] || '—',
      instituteName: institute.instituteName,
      address: formatInstituteAddress(institute),
      serviceType: institute.serviceTypes || '—',
      city: institute.city,
      instituteStatus: institute.status,
      websiteUrl: institute.websiteUrl,
      contactEmail: institute.contactEmail,
      contactPhone: institute.contactPhone,
      isPublished: institute.isPublished ? 'Yes' : 'No',
      name: institute.instituteName,
      rateType: currentRate?.rateType || '—',
      rate: currentRate ? currentRate.rate : '—',
      effectiveFrom: formatDate(currentRate?.effectiveFrom),
      effectiveTo: currentRate?.effectiveTo ? formatDate(currentRate.effectiveTo) : '—',
      commissionRates: instituteRates,
    };
  });
}

export async function createInstitute(form) {
  const vendorId = Number(form.vendorId);
  if (!vendorId) {
    throw new Error('Please select a vendor');
  }

  if (!form.instituteName?.trim()) {
    throw new Error('Institute name is required');
  }

  const { data } = await axiosClient.post('/api/institutes', {
    vendorId,
    instituteName: form.instituteName.trim(),
    websiteUrl: form.websiteUrl?.trim() || null,
    logoUrl: form.logoUrl?.trim() || null,
    primaryColour: form.primaryColour?.trim() || null,
    secondaryColour: form.secondaryColour?.trim() || null,
    address: form.address?.trim() || null,
    city: form.city?.trim() || null,
    state: form.state?.trim() || null,
    serviceTypes: form.serviceType?.trim() || form.serviceTypes?.trim() || null,
    contactEmail: form.contactEmail?.trim() || null,
    contactPhone: form.contactPhone?.trim() || null,
  });

  const institute = normalizeInstitute(data);

  if (form.isPublished === 'Yes') {
    await axiosClient.put(`/api/institutes/${institute.instituteId}/publish`);
  }

  if (form.instituteStatus && form.instituteStatus !== 'Active') {
    await axiosClient.put(`/api/institutes/${institute.instituteId}/status`, {
      status: form.instituteStatus,
    });
  }

  return institute;
}

function buildInstituteForm(institute) {
  return {
    vendorId: institute.vendorId ? String(institute.vendorId) : '',
    instituteName: institute.instituteName,
    websiteUrl: institute.websiteUrl || '',
    instituteStatus: institute.status || 'Active',
    isPublished: institute.isPublished ? 'Yes' : 'No',
    address: institute.address || '',
    city: institute.city || '',
    state: institute.state || '',
    serviceType: institute.serviceTypes || '',
    contactEmail: institute.contactEmail || '',
    contactPhone: institute.contactPhone || '',
    notes: '',
  };
}

export async function deleteInstitute(instituteId) {
  await axiosClient.delete(`/api/institutes/${instituteId}`);
}

export async function fetchInstituteById(instituteId) {
  const { data } = await axiosClient.get(`/api/institutes/${instituteId}`);
  return normalizeInstitute(data);
}

export async function fetchInstituteForm(instituteId) {
  const institute = await fetchInstituteById(instituteId);
  return {
    institute,
    form: buildInstituteForm(institute),
  };
}

export async function updateInstitute(instituteId, form) {
  const vendorId = Number(form.vendorId);
  if (!vendorId) {
    throw new Error('Please select a vendor');
  }

  if (!form.instituteName?.trim()) {
    throw new Error('Institute name is required');
  }

  const existing = await fetchInstituteById(instituteId);

  const { data } = await axiosClient.put(`/api/institutes/${instituteId}`, {
    vendorId,
    instituteName: form.instituteName.trim(),
    websiteUrl: form.websiteUrl?.trim() || null,
    logoUrl: form.logoUrl?.trim() || null,
    primaryColour: form.primaryColour?.trim() || null,
    secondaryColour: form.secondaryColour?.trim() || null,
    address: form.address?.trim() || null,
    city: form.city?.trim() || null,
    state: form.state?.trim() || null,
    serviceTypes: form.serviceType?.trim() || form.serviceTypes?.trim() || null,
    contactEmail: form.contactEmail?.trim() || null,
    contactPhone: form.contactPhone?.trim() || null,
  });

  let institute = normalizeInstitute(data);

  if (form.isPublished === 'Yes' && !existing.isPublished) {
    await axiosClient.put(`/api/institutes/${instituteId}/publish`);
    institute = await fetchInstituteById(instituteId);
  }

  if (form.instituteStatus && form.instituteStatus !== existing.status) {
    await axiosClient.put(`/api/institutes/${instituteId}/status`, {
      status: form.instituteStatus,
    });
    institute = await fetchInstituteById(instituteId);
  }

  return institute;
}
