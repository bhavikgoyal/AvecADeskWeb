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

export async function fetchInstituteScrappingRows() {
  const { data } = await axiosClient.get('/api/institutes-scrapping');
  return (data ?? []).map((raw) => mapRow(normalizeRecord(raw)));
}

function validateScrapeForm(form) {
  const instituteName = (form.instituteName || '').trim();
  const websiteUrl = (form.websiteUrl || '').trim();

  if (!instituteName || !websiteUrl) {
    return 'Institute name and website URL are required.';
  }

  return '';
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

export async function deleteInstituteScrapping(scrappingId) {
  await axiosClient.delete(`/api/institutes-scrapping/${scrappingId}`);
}
