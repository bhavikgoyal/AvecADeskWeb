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
];

export const MANUAL_REQUIRED_FIELDS = ['instituteName'];

export function recordToManualForm(record = {}) {
  return {
    instituteName: record.instituteName ?? '',
    websiteUrl: record.websiteUrl ?? '',
    campus: record.campus ?? '',
    state: record.state ?? '',
    name: record.name ?? '',
    logo: record.logo ?? '',
    country: record.country ?? '',
    city: record.city ?? '',
    description: record.description ?? '',
    countryRanking: record.countryRanking ?? '',
    scholarshipsDetails: record.scholarshipsDetails ?? '',
  };
}

export function isManualFormValid(form) {
  return MANUAL_REQUIRED_FIELDS.every((field) => String(form[field] ?? '').trim());
}
