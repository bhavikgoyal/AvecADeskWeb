/** Vendor onboarding fields — shown on edit vendor only (11-step onboarding). */

const grid = {
  half: { xs: 12, md: 6, lg: 6 },
  third: { xs: 12, md: 6, lg: 4 },
  full: { xs: 12 },
  wide: { xs: 12, md: 12, lg: 8 },
};

const yesNo = {
  type: 'select',
  options: ['yes', 'no'],
  grid: grid.half,
};

export const VENDOR_ONBOARDING_FIELD_DEFS = {
  legalBusinessName: { label: 'Legal business name', type: 'text', grid: grid.half },
  tradingName: { label: 'Trading name (if different)', type: 'text', grid: grid.half },
  yearEstablished: { label: 'Year established', type: 'number', grid: grid.half },
  companyRegistrationNumber: { label: 'Company registration number', type: 'text', grid: grid.half },
  countryOfRegistration: { label: 'Country of registration', type: 'text', grid: grid.half },
  registeredOfficeAddress: { label: 'Registered office address', type: 'textarea', grid: grid.full },
  operationalOfficeAddress: { label: 'Operational office address (if different)', type: 'textarea', grid: grid.full },
  website: { label: 'Website', type: 'text', grid: grid.half },
  linkedInProfile: { label: 'LinkedIn profile', type: 'text', grid: grid.half },

  primaryContactName: { label: 'Primary contact name', type: 'text', grid: grid.half },
  primaryContactDesignation: { label: 'Primary contact designation', type: 'text', grid: grid.half },
  primaryContactEmail: { label: 'Primary contact email', type: 'email', grid: grid.half },
  primaryContactMobile: { label: 'Primary contact mobile', type: 'text', grid: grid.half },
  secondaryContactName: { label: 'Secondary contact name', type: 'text', grid: grid.half },
  secondaryContactEmail: { label: 'Secondary contact email', type: 'email', grid: grid.half },
  secondaryContactNumber: { label: 'Secondary contact number', type: 'text', grid: grid.half },

  businessType: {
    label: 'Type of business',
    type: 'select',
    options: ['Education Agent', 'Migration Agency', 'Both', 'Other'],
    grid: grid.half,
  },
  businessTypeOther: { label: 'Business type (other)', type: 'text', grid: grid.half },
  numberOfEmployees: { label: 'Number of employees', type: 'number', grid: grid.half },
  numberOfCounselors: { label: 'Number of counselors', type: 'number', grid: grid.half },
  numberOfOffices: { label: 'Number of offices', type: 'number', grid: grid.half },
  yearsOfExperience: { label: 'Years of experience', type: 'number', grid: grid.half },

  primaryStudentSourceCountries: { label: 'Primary student source countries', type: 'textarea', grid: grid.full },
  secondaryMarkets: { label: 'Secondary markets', type: 'textarea', grid: grid.full },
  top5Institutions: { label: 'Top 5 institutions', type: 'textarea', grid: grid.full },
  destinationCountries: {
    label: 'Destination countries (comma-separated)',
    type: 'textarea',
    grid: grid.full,
  },
  destinationCountriesOther: { label: 'Other destination countries', type: 'text', grid: grid.half },

  studentsRecruitedLastYear: { label: 'Students recruited last year', type: 'number', grid: grid.half },
  expectedStudentsNext12Months: { label: 'Expected students (next 12 months)', type: 'number', grid: grid.half },
  visaSuccessRate: { label: 'Visa success rate (%)', type: 'number', grid: grid.half },

  registeredWithRegulatoryBody: { label: 'Registered with regulatory body?', ...yesNo },
  regulatoryBodyDetails: { label: 'Regulatory body details', type: 'textarea', grid: grid.full },
  certifiedCounselors: { label: 'Certified counselors?', ...yesNo },
  visaFraudHistory: { label: 'Visa fraud history?', ...yesNo },
  visaFraudExplanation: { label: 'Visa fraud explanation', type: 'textarea', grid: grid.full },
  complianceAgreements: {
    label: 'Compliance agreements (comma-separated)',
    type: 'textarea',
    grid: grid.full,
  },

  conductsSeminars: { label: 'Conducts seminars/events?', ...yesNo },
  marketingChannels: {
    label: 'Marketing channels (comma-separated)',
    type: 'textarea',
    grid: grid.full,
  },
  marketingChannelsOther: { label: 'Other marketing channels', type: 'text', grid: grid.half },
  inHouseVisaSupport: { label: 'In-house visa support?', ...yesNo },

  preferredPaymentTerms: { label: 'Preferred payment terms', type: 'text', grid: grid.half },

  bankName: { label: 'Bank name', type: 'text', grid: grid.half },
  accountName: { label: 'Account name', type: 'text', grid: grid.half },
  accountNumber: { label: 'Account number', type: 'text', grid: grid.half },
  swiftCode: { label: 'SWIFT code', type: 'text', grid: grid.half },
  bankCountry: { label: 'Bank country', type: 'text', grid: grid.half },

  companyRegistrationCertificate: { label: 'Company registration certificate (uploaded)', type: 'text', grid: grid.half, readOnly: true },
  directorIdPassport: { label: 'Director ID / passport (uploaded)', type: 'text', grid: grid.half, readOnly: true },
  officePhotos: { label: 'Office photos (uploaded)', type: 'text', grid: grid.half, readOnly: true },
  businessProfileDoc: { label: 'Business profile / brochure (uploaded)', type: 'text', grid: grid.half, readOnly: true },
  existingPartnerAgreements: { label: 'Existing partner agreements (uploaded)', type: 'text', grid: grid.half, readOnly: true },

  authorizedSignatoryName: { label: 'Authorized signatory name', type: 'text', grid: grid.half },
  signature: { label: 'Signature', type: 'text', grid: grid.half },
  declarationDate: { label: 'Declaration date', type: 'date', grid: grid.half },
  declarationItems: {
    label: 'Declaration items (comma-separated)',
    type: 'textarea',
    grid: grid.full,
  },
};

export const VENDOR_EDIT_SECTIONS = [
  {
    title: 'Account details',
    description: 'Core vendor record in AvecADeskApi.',
    layout: 'full',
    fields: ['businessName', 'contactPerson', 'phone', 'email', 'vendorStatus'],
  },
  {
    title: '1. Company information',
    description: 'Legal and operational details about the organization.',
    layout: 'full',
    fields: [
      'legalBusinessName',
      'tradingName',
      'yearEstablished',
      'companyRegistrationNumber',
      'countryOfRegistration',
      'registeredOfficeAddress',
      'operationalOfficeAddress',
      'website',
      'linkedInProfile',
    ],
  },
  {
    title: '2. Key contact',
    description: 'Primary and secondary contact persons.',
    layout: 'full',
    fields: [
      'primaryContactName',
      'primaryContactDesignation',
      'primaryContactEmail',
      'primaryContactMobile',
      'secondaryContactName',
      'secondaryContactEmail',
      'secondaryContactNumber',
    ],
  },
  {
    title: '3. Business profile',
    description: 'Business type, team size, and experience.',
    layout: 'full',
    fields: [
      'businessType',
      'businessTypeOther',
      'numberOfEmployees',
      'numberOfCounselors',
      'numberOfOffices',
      'yearsOfExperience',
    ],
  },
  {
    title: '4. Recruitment markets',
    description: 'Source countries, destinations, and partner institutions.',
    layout: 'full',
    fields: [
      'primaryStudentSourceCountries',
      'secondaryMarkets',
      'top5Institutions',
      'destinationCountries',
      'destinationCountriesOther',
    ],
  },
  {
    title: '5. Performance & compliance',
    description: 'Recruitment performance and regulatory compliance.',
    layout: 'full',
    fields: [
      'studentsRecruitedLastYear',
      'expectedStudentsNext12Months',
      'visaSuccessRate',
      'registeredWithRegulatoryBody',
      'regulatoryBodyDetails',
      'certifiedCounselors',
      'visaFraudHistory',
      'visaFraudExplanation',
      'complianceAgreements',
    ],
  },
  {
    title: '6. Marketing capability',
    description: 'Marketing channels and visa support capabilities.',
    layout: 'full',
    fields: [
      'conductsSeminars',
      'marketingChannels',
      'marketingChannelsOther',
      'inHouseVisaSupport',
    ],
  },
  {
    title: '7. Commercial terms',
    description: 'Payment and commercial preferences.',
    layout: 'full',
    fields: ['preferredPaymentTerms'],
  },
  {
    title: '8. Banking details',
    description: 'Bank account information for payouts.',
    layout: 'full',
    fields: ['bankName', 'accountName', 'accountNumber', 'swiftCode', 'bankCountry'],
  },
  {
    title: '9. Documents upload',
    description: 'Files uploaded during onboarding (read-only). Re-upload via vendor onboarding link if needed.',
    layout: 'full',
    fields: [
      'companyRegistrationCertificate',
      'directorIdPassport',
      'officePhotos',
      'businessProfileDoc',
      'existingPartnerAgreements',
    ],
  },
  {
    title: '10. Declaration',
    description: 'Authorized signatory and declaration details.',
    layout: 'full',
    fields: ['authorizedSignatoryName', 'signature', 'declarationDate', 'declarationItems'],
  },
];

export function emptyVendorOnboardingForm() {
  return Object.fromEntries(Object.keys(VENDOR_ONBOARDING_FIELD_DEFS).map((key) => [key, '']));
}
