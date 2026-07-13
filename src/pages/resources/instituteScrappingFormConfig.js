export const INSTITUTE_SCRAPPING_BASE_PATH = '/institutes-scrapping';

export const MANUAL_FORM_SECTIONS = [
  {
    title: 'Institute details',
    fields: [
      'instituteName',
      'websiteUrl',
      'name',
      'logo',
      'country',
      'city',
      'state',
      'campus',
      'description',
      'countryRanking',
      'scholarshipsDetails',
    ],
  },
  {
    title: 'Program details',
    fields: [
      'programName',
      'level',
      'programLink',
      'cricosCode',
      'duration',
      'intake',
      'feesYearly',
      'englishReq',
      'programDescription',
      'programLogo',
      'addmissionRequirements',
    ],
  },
];

export const MANUAL_REQUIRED_FIELDS = ['instituteName', 'programName'];

export function recordToManualForm(record = {}) {
  return {
    instituteName: record.instituteName ?? '',
    websiteUrl: record.websiteUrl ?? '',
    campus: record.campus ?? '',
    state: record.state ?? '',
    programName: record.programName ?? '',
    level: record.level ?? '',
    programLink: record.programLink ?? '',
    cricosCode: record.cricosCode ?? '',
    duration: record.duration ?? '',
    intake: record.intake ?? '',
    feesYearly: record.feesYearly ?? '',
    englishReq: record.englishReq ?? '',
    name: record.name ?? '',
    logo: record.logo ?? '',
    country: record.country ?? '',
    city: record.city ?? '',
    description: record.description ?? '',
    countryRanking: record.countryRanking ?? '',
    scholarshipsDetails: record.scholarshipsDetails ?? '',
    programDescription: record.programDescription ?? '',
    programLogo: record.programLogo ?? '',
    addmissionRequirements: record.addmissionRequirements ?? '',
  };
}

export function isManualFormValid(form) {
  return MANUAL_REQUIRED_FIELDS.every((field) => String(form[field] ?? '').trim());
}
