export const INSTITUTE_SCRAPPING_BASE_PATH = '/institutes-scrapping';

export const MANUAL_FORM_SECTIONS = [
  {
    title: 'Institute details',
    fields: [
      'instituteName',
      'websiteUrl',
      'name',
      'logo',
      'description',
      'countryRanking',
      'scholarshipsDetails',
    ],
  },
];


export const AUTO_FORM_SECTIONS = [
  {
    title: 'Institute details',
    fields: ['instituteName', 'websiteUrl'],
  },
];

export const MANUAL_REQUIRED_FIELDS = ['instituteName'];


export const AUTO_REQUIRED_FIELDS = ['instituteName'];

export function recordToManualForm(record = {}) {
  return {
    instituteId: record.instituteId ?? null,
    instituteName: record.instituteName ?? '',
    websiteUrl: record.websiteUrl ?? '',
    name: record.name ?? '',
    logo: record.logo ?? '',
    description: record.description ?? '',
    countryRanking: record.countryRanking ?? '',
    scholarshipsDetails: record.scholarshipsDetails ?? '',
    campuses: record.campuses ?? [],
  };
}

export function isManualFormValid(form) {
  return MANUAL_REQUIRED_FIELDS.every((field) => String(form[field] ?? '').trim());
}