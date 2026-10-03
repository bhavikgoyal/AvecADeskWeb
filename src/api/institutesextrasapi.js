import axiosClient from './axiosClient';

function normalizeContact(raw) {
  return {
    id: raw.id ?? raw.Id,
    instituteId: raw.instituteId ?? raw.InstituteId,
    contactName: raw.contactName ?? raw.ContactName ?? '',
    designation: raw.designation ?? raw.Designation ?? '',
    email: raw.email ?? raw.Email ?? '',
    phone: raw.phone ?? raw.Phone ?? '',
    alternatePhone: raw.alternatePhone ?? raw.AlternatePhone ?? '',
    address: raw.address ?? raw.Address ?? '',
    notes: raw.notes ?? raw.Notes ?? '',
  };
}

export function getEmptyContactForm() {
  return {
    contactName: '',
    designation: '',
    email: '',
    phone: '',
    alternatePhone: '',
    address: '',
    notes: '',
  };
}

function toContactRequestBody(form) {
  return {
    contactName: form.contactName?.trim() || null,
    designation: form.designation?.trim() || null,
    email: form.email?.trim() || null,
    phone: form.phone?.trim() || null,
    alternatePhone: form.alternatePhone?.trim() || null,
    address: form.address?.trim() || null,
    notes: form.notes?.trim() || null,
  };
}

export async function fetchInstituteContacts(instituteId) {
  const { data } = await axiosClient.get(`/api/institutes/${instituteId}/contacts`);
  return (data ?? []).map(normalizeContact);
}

export async function createInstituteContact(instituteId, form) {
  const { data } = await axiosClient.post(
    `/api/institutes/${instituteId}/contacts`,
    toContactRequestBody(form),
  );
  return normalizeContact(data);
}

export async function updateInstituteContact(instituteId, contactId, form) {
  const { data } = await axiosClient.put(
    `/api/institutes/${instituteId}/contacts/${contactId}`,
    toContactRequestBody(form),
  );
  return normalizeContact(data);
}

export async function deleteInstituteContact(instituteId, contactId) {
  await axiosClient.delete(`/api/institutes/${instituteId}/contacts/${contactId}`);
}




function normalizeContract(raw) {
  return {
    id: raw.id ?? raw.Id,
    instituteId: raw.instituteId ?? raw.InstituteId,
    contractStatus: raw.contractStatus ?? raw.ContractStatus ?? 'Active',
    contractStartDate: (raw.contractStartDate ?? raw.ContractStartDate ?? '')?.slice(0, 10) || '',
    contractEndDate: (raw.contractEndDate ?? raw.ContractEndDate ?? '')?.slice(0, 10) || '',
    contractReferenceNo: raw.contractReferenceNo ?? raw.ContractReferenceNo ?? '',
    contractFileUrl: raw.contractFileUrl ?? raw.ContractFileUrl ?? '',
    notes: raw.notes ?? raw.Notes ?? '',
  };
}

export function getEmptyContractForm() {
  return {
    contractStatus: 'Active',
    contractStartDate: '',
    contractEndDate: '',
    contractReferenceNo: '',
    contractFileUrl: '',
    notes: '',
  };
}

function toContractRequestBody(form) {
  return {
    contractStatus: form.contractStatus || 'Active',
    contractStartDate: form.contractStartDate || null,
    contractEndDate: form.contractEndDate || null,
    contractReferenceNo: form.contractReferenceNo?.trim() || null,
    contractFileUrl: form.contractFileUrl?.trim() || null,
    notes: form.notes?.trim() || null,
  };
}

export async function fetchInstituteContracts(instituteId) {
  const { data } = await axiosClient.get(`/api/institutes/${instituteId}/contracts`);
  return (data ?? []).map(normalizeContract);
}

export async function createInstituteContract(instituteId, form) {
  const { data } = await axiosClient.post(
    `/api/institutes/${instituteId}/contracts`,
    toContractRequestBody(form),
  );
  return normalizeContract(data);
}

export async function updateInstituteContract(instituteId, contractId, form) {
  const { data } = await axiosClient.post(
    `/api/institutes/${instituteId}/contracts/${contractId}`,
    toContractRequestBody(form),
  );
  return normalizeContract(data);
}

export async function deleteInstituteContract(instituteId, contractId) {
  await axiosClient.delete(`/api/institutes/${instituteId}/contracts/${contractId}`);
}

function normalizeCredential(raw) {
  return {
    id: raw.id ?? raw.Id,
    instituteId: raw.instituteId ?? raw.InstituteId,
    name: raw.name ?? raw.Name ?? '',
    url: raw.url ?? raw.Url ?? '',
    username: raw.username ?? raw.Username ?? '',
    password: raw.password ?? raw.Password ?? '',
  };
}

export function getEmptyCredentialForm() {
  return { name: '', url: '', username: '', password: '' };
}

function validateCredentialForm(form) {
  if (!form.name?.trim() || !form.url?.trim() || !form.username?.trim() || !form.password?.trim()) {
    return 'Name, URL, username and password are all required.';
  }
  return '';
}

function toCredentialRequestBody(form) {
  return {
    name: form.name.trim(),
    url: form.url.trim(),
    username: form.username.trim(),
    password: form.password,
  };
}

export async function fetchInstituteCredentials(instituteId) {
  const { data } = await axiosClient.get(`/api/institutes/${instituteId}/credentials`);
  return (data ?? []).map(normalizeCredential);
}

export async function createInstituteCredential(instituteId, form) {
  const validationError = validateCredentialForm(form);
  if (validationError) {
    throw new Error(validationError);
  }

  const { data } = await axiosClient.post(
    `/api/institutes/${instituteId}/credentials`,
    toCredentialRequestBody(form),
  );
  return normalizeCredential(data);
}

export async function updateInstituteCredential(instituteId, credentialId, form) {
  const validationError = validateCredentialForm(form);
  if (validationError) {
    throw new Error(validationError);
  }

  const { data } = await axiosClient.post(
    `/api/institutes/${instituteId}/credentials/${credentialId}`,
    toCredentialRequestBody(form),
  );
  return normalizeCredential(data);
}

export async function deleteInstituteCredential(instituteId, credentialId) {
  await axiosClient.delete(`/api/institutes/${instituteId}/credentials/${credentialId}`);
}

export async function uploadInstituteContractFile(instituteId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await axiosClient.post(
    `/api/institutes/${instituteId}/contracts/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.url;
}