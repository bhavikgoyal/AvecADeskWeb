import axiosClient from './axiosClient';

function pick(data, camel, pascal) {
  const value = data?.[camel] ?? data?.[pascal];
  return value ?? '';
}

function listToCsv(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return list.join(', ');
}

function csvToList(value) {
  if (!value?.trim()) return [];
  return value.split(',').map((part) => part.trim()).filter(Boolean);
}

function formatDeclarationDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function normalizeOnboardingData(data) {
  if (!data) return {};

  const docs = data.uploadedDocuments ?? data.UploadedDocuments ?? {};

  return {
    businessId: data.businessId ?? data.BusinessId ?? null,
    legalBusinessName: pick(data, 'legalBusinessName', 'LegalBusinessName'),
    tradingName: pick(data, 'tradingName', 'TradingName'),
    yearEstablished: data.yearEstablished ?? data.YearEstablished ?? '',
    companyRegistrationNumber: pick(data, 'companyRegistrationNumber', 'CompanyRegistrationNumber'),
    countryOfRegistration: pick(data, 'countryOfRegistration', 'CountryOfRegistration'),
    registeredOfficeAddress: pick(data, 'registeredOfficeAddress', 'RegisteredOfficeAddress'),
    operationalOfficeAddress: pick(data, 'operationalOfficeAddress', 'OperationalOfficeAddress'),
    website: pick(data, 'website', 'Website'),
    linkedInProfile: pick(data, 'linkedInProfile', 'LinkedInProfile'),

    primaryContactName: pick(data, 'primaryContactName', 'PrimaryContactName'),
    primaryContactDesignation: pick(data, 'primaryContactDesignation', 'PrimaryContactDesignation'),
    primaryContactEmail: pick(data, 'primaryContactEmail', 'PrimaryContactEmail'),
    primaryContactMobile: pick(data, 'primaryContactMobile', 'PrimaryContactMobile'),
    secondaryContactName: pick(data, 'secondaryContactName', 'SecondaryContactName'),
    secondaryContactEmail: pick(data, 'secondaryContactEmail', 'SecondaryContactEmail'),
    secondaryContactNumber: pick(data, 'secondaryContactNumber', 'SecondaryContactNumber'),

    businessType: pick(data, 'businessType', 'BusinessType'),
    businessTypeOther: pick(data, 'businessTypeOther', 'BusinessTypeOther'),
    numberOfEmployees: data.numberOfEmployees ?? data.NumberOfEmployees ?? '',
    numberOfCounselors: data.numberOfCounselors ?? data.NumberOfCounselors ?? '',
    numberOfOffices: data.numberOfOffices ?? data.NumberOfOffices ?? '',
    yearsOfExperience: data.yearsOfExperience ?? data.YearsOfExperience ?? '',

    primaryStudentSourceCountries: pick(data, 'primaryStudentSourceCountries', 'PrimaryStudentSourceCountries'),
    secondaryMarkets: pick(data, 'secondaryMarkets', 'SecondaryMarkets'),
    top5Institutions: pick(data, 'top5Institutions', 'Top5Institutions'),
    destinationCountries: listToCsv(data.destinationCountries ?? data.DestinationCountries),
    destinationCountriesOther: pick(data, 'destinationCountriesOther', 'DestinationCountriesOther'),

    studentsRecruitedLastYear: data.studentsRecruitedLastYear ?? data.StudentsRecruitedLastYear ?? '',
    expectedStudentsNext12Months: data.expectedStudentsNext12Months ?? data.ExpectedStudentsNext12Months ?? '',
    visaSuccessRate: data.visaSuccessRate ?? data.VisaSuccessRate ?? '',

    registeredWithRegulatoryBody: pick(data, 'registeredWithRegulatoryBody', 'RegisteredWithRegulatoryBody'),
    regulatoryBodyDetails: pick(data, 'regulatoryBodyDetails', 'RegulatoryBodyDetails'),
    certifiedCounselors: pick(data, 'certifiedCounselors', 'CertifiedCounselors'),
    visaFraudHistory: pick(data, 'visaFraudHistory', 'VisaFraudHistory'),
    visaFraudExplanation: pick(data, 'visaFraudExplanation', 'VisaFraudExplanation'),
    complianceAgreements: listToCsv(data.complianceAgreements ?? data.ComplianceAgreements),

    conductsSeminars: pick(data, 'conductsSeminars', 'ConductsSeminars'),
    marketingChannels: listToCsv(data.marketingChannels ?? data.MarketingChannels),
    marketingChannelsOther: pick(data, 'marketingChannelsOther', 'MarketingChannelsOther'),
    inHouseVisaSupport: pick(data, 'inHouseVisaSupport', 'InHouseVisaSupport'),

    preferredPaymentTerms: pick(data, 'preferredPaymentTerms', 'PreferredPaymentTerms'),

    bankName: pick(data, 'bankName', 'BankName'),
    accountName: pick(data, 'accountName', 'AccountName'),
    accountNumber: pick(data, 'accountNumber', 'AccountNumber'),
    swiftCode: pick(data, 'swiftCode', 'SwiftCode'),
    bankCountry: pick(data, 'bankCountry', 'BankCountry'),

    companyRegistrationCertificate: docs.companyRegistrationCertificate ?? '',
    directorIdPassport: docs.directorIdPassport ?? '',
    officePhotos: docs.officePhotos ?? '',
    businessProfileDoc: docs.businessProfile ?? '',
    existingPartnerAgreements: docs.existingPartnerAgreements ?? '',

    authorizedSignatoryName: pick(data, 'authorizedSignatoryName', 'AuthorizedSignatoryName'),
    signature: pick(data, 'signature', 'Signature'),
    declarationDate: formatDeclarationDate(data.declarationDate ?? data.DeclarationDate),
    declarationItems: listToCsv(data.declarationItems ?? data.DeclarationItems),

    isLinkExpired: Boolean(data.isLinkExpired ?? data.IsLinkExpired),
  };
}

function toNumber(value) {
  if (value === '' || value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function buildOnboardingSavePayload(form) {
  return {
    businessId: form.businessId ? Number(form.businessId) : null,
    legalBusinessName: form.legalBusinessName?.trim() || form.businessName?.trim() || null,
    tradingName: form.tradingName?.trim() || null,
    yearEstablished: toNumber(form.yearEstablished),
    companyRegistrationNumber: form.companyRegistrationNumber?.trim() || null,
    countryOfRegistration: form.countryOfRegistration?.trim() || null,
    registeredOfficeAddress: form.registeredOfficeAddress?.trim() || null,
    operationalOfficeAddress: form.operationalOfficeAddress?.trim() || null,
    website: form.website?.trim() || null,
    linkedInProfile: form.linkedInProfile?.trim() || null,

    primaryContactName: form.primaryContactName?.trim() || null,
    primaryContactDesignation: form.primaryContactDesignation?.trim() || null,
    primaryContactEmail: form.primaryContactEmail?.trim() || null,
    primaryContactMobile: form.primaryContactMobile?.trim() || null,
    secondaryContactName: form.secondaryContactName?.trim() || null,
    secondaryContactEmail: form.secondaryContactEmail?.trim() || null,
    secondaryContactNumber: form.secondaryContactNumber?.trim() || null,

    businessType: form.businessType?.trim() || null,
    businessTypeOther: form.businessTypeOther?.trim() || null,
    numberOfEmployees: toNumber(form.numberOfEmployees),
    numberOfCounselors: toNumber(form.numberOfCounselors),
    numberOfOffices: toNumber(form.numberOfOffices),
    yearsOfExperience: toNumber(form.yearsOfExperience),

    primaryStudentSourceCountries: form.primaryStudentSourceCountries?.trim() || null,
    secondaryMarkets: form.secondaryMarkets?.trim() || null,
    top5Institutions: form.top5Institutions?.trim() || null,
    destinationCountries: csvToList(form.destinationCountries),
    destinationCountriesOther: form.destinationCountriesOther?.trim() || null,

    studentsRecruitedLastYear: toNumber(form.studentsRecruitedLastYear),
    expectedStudentsNext12Months: toNumber(form.expectedStudentsNext12Months),
    visaSuccessRate: toNumber(form.visaSuccessRate),

    registeredWithRegulatoryBody: form.registeredWithRegulatoryBody?.trim() || null,
    regulatoryBodyDetails: form.regulatoryBodyDetails?.trim() || null,
    certifiedCounselors: form.certifiedCounselors?.trim() || null,
    visaFraudHistory: form.visaFraudHistory?.trim() || null,
    visaFraudExplanation: form.visaFraudExplanation?.trim() || null,
    complianceAgreements: csvToList(form.complianceAgreements),

    conductsSeminars: form.conductsSeminars?.trim() || null,
    marketingChannels: csvToList(form.marketingChannels),
    marketingChannelsOther: form.marketingChannelsOther?.trim() || null,
    inHouseVisaSupport: form.inHouseVisaSupport?.trim() || null,

    preferredPaymentTerms: form.preferredPaymentTerms?.trim() || null,

    bankName: form.bankName?.trim() || null,
    accountName: form.accountName?.trim() || null,
    accountNumber: form.accountNumber?.trim() || null,
    swiftCode: form.swiftCode?.trim() || null,
    bankCountry: form.bankCountry?.trim() || null,

    authorizedSignatoryName: form.authorizedSignatoryName?.trim() || null,
    signature: form.signature?.trim() || null,
    declarationDate: form.declarationDate || null,
    declarationItems: csvToList(form.declarationItems),
  };
}

export async function fetchVendorOnboarding(vendorId) {
  try {
    const { data } = await axiosClient.get(`/api/vendor-onboarding/${vendorId}`);
    return normalizeOnboardingData(data);
  } catch (err) {
    if (err.message?.toLowerCase().includes('not found')) {
      return {};
    }
    throw err;
  }
}

export async function saveVendorOnboarding(vendorId, form) {
  const payload = buildOnboardingSavePayload(form);
  await axiosClient.put(`/api/vendors/${vendorId}/onboarding`, payload);
}
