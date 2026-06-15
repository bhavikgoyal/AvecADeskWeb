import axiosClient from './axiosClient';

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
  const { data } = await axiosClient.get('/api/institutes/admin');
  return data.map((raw) => {
    const institute = normalizeInstitute(raw);
    return {
      id: String(institute.instituteId),
      instituteId: institute.instituteId,
      instituteName: institute.instituteName,
      city: institute.city,
      instituteStatus: institute.status,
      primaryColour: institute.primaryColour,
      secondaryColour: institute.secondaryColour,
      websiteUrl: institute.websiteUrl,
      contactEmail: institute.contactEmail,
      contactPhone: institute.contactPhone,
      isPublished: institute.isPublished ? 'Yes' : 'No',
      name: institute.instituteName,
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
    serviceTypes: form.serviceTypes?.trim() || null,
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
    logoUrl: institute.logoUrl || '',
    primaryColour: institute.primaryColour || '',
    secondaryColour: institute.secondaryColour || '',
    instituteStatus: institute.status || 'Active',
    isPublished: institute.isPublished ? 'Yes' : 'No',
    address: institute.address || '',
    city: institute.city || '',
    state: institute.state || '',
    serviceTypes: institute.serviceTypes || '',
    contactEmail: institute.contactEmail || '',
    contactPhone: institute.contactPhone || '',
    notes: '',
  };
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
    serviceTypes: form.serviceTypes?.trim() || null,
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
