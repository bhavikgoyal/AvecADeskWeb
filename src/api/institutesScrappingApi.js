import axiosClient from './axiosClient';

function normalizeRecord(raw) {
  return {
    scrappingId: raw.scrappingId ?? raw.ScrappingId,
    instituteName: raw.instituteName ?? raw.InstituteName ?? '',
    websiteUrl: raw.websiteURL ?? raw.WebsiteURL ?? raw.websiteUrl ?? '',
    campus: raw.campus ?? raw.Campus ?? '',
    state: raw.state ?? raw.State ?? '',
    programName: raw.programName ?? raw.ProgramName ?? '',
    level: raw.level ?? raw.Level ?? '',
    programLink: raw.programLink ?? raw.ProgramLink ?? '',
    cricosCode: raw.cricosCode ?? raw.CricosCode ?? '',
    duration: raw.duration ?? raw.Duration ?? '',
    intake: raw.intake ?? raw.Intake ?? '', 
    feesYearly: raw.feesYearly ?? raw.FeesYearly ?? '',
    englishReq: raw.englishReq ?? raw.EnglishReq ?? '',
    name: raw.name ?? raw.Name ?? '',
    logo: raw.logo ?? raw.Logo ?? '',
    country: raw.country ?? raw.Country ?? '',
    city: raw.city ?? raw.City ?? '',
    description: raw.description ?? raw.Description ?? '',
    countryRanking: raw.countryRanking ?? raw.CountryRanking ?? '',
    scholarshipsDetails: raw.scholarshipsDetails ?? raw.ScholarshipsDetails ?? '',
    programDescription: raw.programDescription ?? raw.ProgramDescription ?? '',
    programLogo: raw.programLogo ?? raw.ProgramLogo ?? '',
    addmissionRequirements: raw.addmissionRequirements ?? raw.AddmissionRequirements ?? '',
  };
}

function mapRow(record) {
  return {
    id: String(record.scrappingId),
    ...record,
  };
}

function toRequestBody(form) {
  return {
    instituteName: form.instituteName || null,
    websiteURL: form.websiteUrl || null,
  };
}

function toManualRequestBody(form) {
  return {
    instituteName: form.instituteName || null,
    websiteURL: form.websiteUrl || null,
    campus: form.campus || null,
    state: form.state || null,
    programName: form.programName || null,
    level: form.level || null,
    programLink: form.programLink || null,
    cricosCode: form.cricosCode || null,
    duration: form.duration || null,
    intake: form.intake || null,
    feesYearly: form.feesYearly || null,
    englishReq: form.englishReq || null,
    name: form.name || null,
    logo: form.logo || null,
    country: form.country || null,
    city: form.city || null,
    description: form.description || null,
    countryRanking: form.countryRanking || null,
    scholarshipsDetails: form.scholarshipsDetails || null,
    programDescription: form.programDescription || null,
    programLogo: form.programLogo || null,
    addmissionRequirements: form.addmissionRequirements || null,
  };
}

function getEmptyManualForm() {
  return {
    instituteName: '',
    websiteUrl: '',
    campus: '',
    state: '',
    programName: '',
    level: '',
    programLink: '',
    cricosCode: '',
    duration: '',
    intake: '',
    feesYearly: '',
    englishReq: '',
    name: '',
    logo: '',
    country: '',
    city: '',
    description: '',
    countryRanking: '',
    scholarshipsDetails: '',
    programDescription: '',
    programLogo: '',
    addmissionRequirements: '',
  };
}

function buildFilterParams({ instituteName } = {}) {
  const params = {};
  const trimmedName = (instituteName || '').trim();
  if (trimmedName) params.instituteName = trimmedName;
  return params;
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getFilenameFromDisposition(disposition, fallback) {
  if (!disposition) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition);
  return match?.[1]?.trim().replace(/['"]/g, '') || fallback;
}

export async function fetchInstituteScrappingById(scrappingId) {
  const { data } = await axiosClient.get(`/api/institutes-scrapping/${scrappingId}`);
  return mapRow(normalizeRecord(data));
}

export async function updateInstituteScrapping(scrappingId, form) {
  const validationError = validateManualForm(form);
  if (validationError) {
    throw new Error(validationError);
  }

  const { data } = await axiosClient.put(`/api/institutes-scrapping/${scrappingId}`, toManualRequestBody(form));
  return mapRow(normalizeRecord(data));
}

export async function fetchInstituteScrappingRows({ instituteName } = {}) {
  const { data } = await axiosClient.get('/api/institutes-scrapping', {
    params: buildFilterParams({ instituteName }),
  });
  return (data ?? []).map((raw) => mapRow(normalizeRecord(raw)));
}

export async function exportInstituteScrappingExcel({ instituteName } = {}) {
  const response = await axiosClient.get('/api/institutes-scrapping/export', {
    params: buildFilterParams({ instituteName }),
    responseType: 'blob',
  });

  const filename = getFilenameFromDisposition(
    response.headers['content-disposition'],
    `institute-scrap-list-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
  const blob = new Blob([response.data], {
    type: response.headers['content-type']
      || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerBlobDownload(blob, filename);
}

export async function runInstituteScrapping(form) {
  const validationError = validateScrapeForm(form);
  if (validationError) {
    throw new Error(validationError);
  }

  const { data } = await axiosClient.post('/api/institutes-scrapping/run', toRequestBody(form), {
    timeout: 660_000,
  });
  return {
    recordsInserted: data?.recordsInserted ?? data?.RecordsInserted ?? 0,
    usedAiFallback: data?.usedAiFallback ?? data?.UsedAiFallback ?? false,
    message: data?.message ?? data?.Message ?? '',
    records: (data?.records ?? data?.Records ?? []).map((raw) => mapRow(normalizeRecord(raw))),
  };
}

function validateScrapeForm(form) {
  const instituteName = (form.instituteName || '').trim();
  const websiteUrl = (form.websiteUrl || '').trim();

  if (!instituteName || !websiteUrl) {
    return 'Institute name and website URL are required.';
  }

  return '';
}

function validateManualForm(form) {
  const instituteName = (form.instituteName || '').trim();
  const programName = (form.programName || '').trim();

  if (!instituteName || !programName) {
    return 'Institute name and program name are required.';
  }

  return '';
}

export async function createInstituteScrappingManual(form) {
  const validationError = validateManualForm(form);
  if (validationError) {
    throw new Error(validationError);
  }

  const { data } = await axiosClient.post('/api/institutes-scrapping/manual', toManualRequestBody(form));
  const record = data?.record ?? data?.Record;
  return {
    scrappingId: data?.scrappingId ?? data?.ScrappingId,
    courseId: data?.courseId ?? data?.CourseId,
    instituteId: data?.instituteId ?? data?.InstituteId,
    record: record ? mapRow(normalizeRecord(record)) : null,
  };
}

export { getEmptyManualForm };

export async function deleteInstituteScrapping(scrappingId) {
  await axiosClient.delete(`/api/institutes-scrapping/${scrappingId}`);
}
