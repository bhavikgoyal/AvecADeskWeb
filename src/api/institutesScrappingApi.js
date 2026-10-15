import axiosClient from './axiosClient';

function normalizeCampus(raw) {
  const campusId = raw.campusId ?? raw.CampusId ?? null;
  return {
    key: campusId ? `id-${campusId}` : `new-${Math.random().toString(36).slice(2)}`,
    campusId,
    campus: raw.campus ?? raw.Campus ?? '',
    country: raw.country ?? raw.Country ?? '',
    city: raw.city ?? raw.City ?? '',
    state: raw.state ?? raw.State ?? '',
    zipCode: raw.zipCode ?? raw.ZipCode ?? '',
    address: raw.address ?? raw.Address ?? '',
  };
}

function normalizeRecord(raw) {
  return {
    scrappingId: raw.scrappingId ?? raw.ScrappingId,
    instituteId: raw.instituteId ?? raw.InstituteId ?? null,
    createdAt: raw.createdAt ?? raw.CreatedAt ?? null,
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
    zipCode: raw.zipCode ?? raw.ZipCode ?? '',
    address: raw.address ?? raw.Address ?? '',
    campuses: (raw.campuses ?? raw.Campuses ?? []).map(normalizeCampus),
    description: raw.description ?? raw.Description ?? '',
    countryRanking: raw.countryRanking ?? raw.CountryRanking ?? '',
    scholarshipsDetails: raw.scholarshipsDetails ?? raw.ScholarshipsDetails ?? '',
    programDescription: raw.programDescription ?? raw.ProgramDescription ?? '',
    programLogo: raw.programLogo ?? raw.ProgramLogo ?? '',
    addmissionRequirements: raw.addmissionRequirements ?? raw.AddmissionRequirements ?? '',
    isScrap: raw.isScrap ?? raw.IsScrap ?? null,
    scrapeStatus: raw.scrapeStatus ?? raw.ScrapeStatus ?? '',
    scrapingStatus: raw.scrapingStatus ?? raw.ScrapingStatus ?? '',
    status: raw.status ?? raw.Status ?? '',
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
  const clean = (value) => String(value ?? '').trim() || null;
  const campuses = (form.campuses || [])
    .map((c) => ({
      campusId: c.campusId || null,
      campus: clean(c.campus),
      country: clean(c.country),
      city: clean(c.city),
      state: clean(c.state),
      zipCode: clean(c.zipCode),
      address: clean(c.address),
    }))
    .filter((c) => c.campus);

  return {
    instituteName: form.instituteName || null,
    websiteURL: form.websiteUrl || null,
    campus: campuses[0]?.campus || null,
    name: form.name || null,
    logo: form.logo || null,
    description: form.description || null,
    countryRanking: form.countryRanking || null,
    scholarshipsDetails: form.scholarshipsDetails || null,
    campuses,
  };
}

function getEmptyManualForm() {
  return {
    instituteName: '',
    websiteUrl: '',
    name: '',
    logo: '',
    description: '',
    countryRanking: '',
    scholarshipsDetails: '',
    campuses: [],
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
export async function fetchUniqueInstituteNames() {
  const { data } = await axiosClient.get(
    '/api/institutes-scrapping/institutenames'
  );

  return (data ?? []).map((item) => ({
    id: item.scrappingId ?? item.ScrappingId,
    name: item.instituteName ?? item.InstituteName ?? '',
    campusname: item.campus ?? item.Campus ?? '',
  }));
}


export function normalizeInstituteName(name) {
  return String(name || '')
    .trim()
    .replace(/:+\s*$/, '')
    .trim();
}

export function getUniqueInstituteNames(rows) {
  const seen = new Set();
  const names = [];
  for (const item of rows || []) {
    const key = normalizeInstituteName(item?.name);
    if (!key) continue;
    const lower = key.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    names.push(key);
  }
  return names.sort((a, b) => a.localeCompare(b));
}

export function getCampusesForInstitute(rows, instituteName) {
  const key = normalizeInstituteName(instituteName).toLowerCase();
  if (!key) return [];

  const campuses = new Set();
  for (const row of rows || []) {
    if (normalizeInstituteName(row?.name).toLowerCase() !== key) continue;
    String(row?.campusname || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .forEach((c) => campuses.add(c));
  }
  return Array.from(campuses).sort((a, b) => a.localeCompare(b));
}

export function resolveScrappingId(rows, instituteName, campusName) {
  const key = normalizeInstituteName(instituteName).toLowerCase();
  if (!key) return '';

  const matches = (rows || []).filter(
    (row) => normalizeInstituteName(row?.name).toLowerCase() === key,
  );
  if (!matches.length) return '';

  const campus = String(campusName || '').trim().toLowerCase();
  if (campus) {
    const byCampus = matches.find((row) =>
      String(row?.campusname || '')
        .split(',')
        .map((c) => c.trim().toLowerCase())
        .includes(campus),
    );
    if (byCampus) return String(byCampus.id);
  }

  return String(matches[0].id);
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

  const { data } = await axiosClient.post(`/api/institutes-scrapping/${scrappingId}/update`, toManualRequestBody(form));
  return mapRow(normalizeRecord(data));
}

export async function fetchInstituteScrappingRows({ instituteName } = {}) {
  const { data } = await axiosClient.get('/api/institutes-scrapping', {
    params: buildFilterParams({ instituteName }),
  });

  const seen = new Set();
  return (data ?? [])
    .map((raw) => mapRow(normalizeRecord(raw)))
    .filter((row) => {
      const key = String(row.scrappingId ?? row.id ?? '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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

  if (!instituteName) {
    return 'Institute name is required.';
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
  await axiosClient.post(`/api/institutes-scrapping/${scrappingId}/delete`);
}
