import axiosClient from './axiosClient';

const CHECKLIST_OPTIONS = [
  'Completed all sections of the application form',
  'Attached Agent certified copies of all academic transcript(s) and certificate(s) translated into English (if applicable)',
  'Attached Agent certified copy of my passport',
  'Attached evidence of English language proficiency',
  'Completed and Submitted Genuine Student (GS) Assessment Form',
  'Read and signed the student declaration',
];

export const FILE_FIELDS = {
  passportFile:              { category: 'Personal',  docType: 'Passport' },
  englishEvidence:           { category: 'English',   docType: 'EnglishCertificate' },
  resume:                    { category: 'Work',      docType: 'Resume' },
  doc10thMarksheet:          { category: 'Education', docType: '10thMarksheet' },
  doc12thMarksheet:          { category: 'Education', docType: '12thMarksheet' },
  docDiplomaMarksheets:      { category: 'Education', docType: 'DiplomaMarksheets' },
  docBachelorMarksheets:     { category: 'Education', docType: 'BachelorMarksheets' },
  docBachelorDegree:         { category: 'Education', docType: 'BachelorDegree' },
  docMasterMarksheets:       { category: 'Education', docType: 'MasterMarksheets' },
  docMasterDegree:           { category: 'Education', docType: 'MasterDegree' },
  additionalEducationalDocs: { category: 'Education', docType: 'AdditionalEducation' },
  workExperienceDocs:        { category: 'Work',      docType: 'WorkExperience' },
};

const MULTI_FILE_FIELDS = new Set([
  'docDiplomaMarksheets',
  'docBachelorMarksheets',
  'docMasterMarksheets',
  'additionalEducationalDocs',
  'workExperienceDocs',
]);

function yesNoToBool(value) {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return null;
}

function resolveTitle(formData) {
  if (formData.title === 'Other') return formData.titleOther || 'Other';
  return formData.title || null;
}

function resolvePositiveInt(...values) {
  for (const value of values) {
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
}



const EDUCATION_DOC_FIELD_NAMES = [
  'doc10thMarksheet',
  'doc12thMarksheet',
  'docDiplomaMarksheets',
  'docBachelorMarksheets',
  'docBachelorDegree',
  'docMasterMarksheets',
  'docMasterDegree',
  'additionalEducationalDocs',
];


export async function getVendorStudentHistory(vendorId, search = '', pageNumber = 1, pageSize = 50) {
  try {
    const { data } = await axiosClient.get(`/api/VendorStudent/vendor/${vendorId}/history`, {
      params: { search, pageNumber, pageSize },
    });
    return {
      data: data.data ?? data.Data ?? [],
      totalRecords: data.totalRecords ?? data.TotalRecords ?? 0,
    };
  } catch (error) {
    throw new Error('Failed to fetch application history.');
  }
}

export async function getVendorStudentById(studentId) {
  try {
    const { data } = await axiosClient.get(`/api/VendorStudent/${studentId}`);
    return data;
  } catch (error) {
    throw new Error('Failed to fetch application details.');
  }
}
