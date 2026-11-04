import axiosClient from './axiosClient';

function normalizeAgent(raw) {
  return {
    id: raw.agentId ?? raw.AgentId,
    agentName: raw.agentName ?? raw.AgentName ?? '',
    contactPerson: raw.contactPerson ?? raw.ContactPerson ?? '',
    phoneNo: raw.phoneNo ?? raw.PhoneNo ?? '',
    email: raw.email ?? raw.Email ?? '',
    address: raw.address ?? raw.Address ?? '',
    notes: raw.notes ?? raw.Notes ?? '',
    isActive: raw.isActive ?? raw.IsActive ?? true,
    createdAt: raw.createdAt ?? raw.CreatedAt ?? null,
    updatedOn: raw.updatedOn ?? raw.UpdatedOn ?? null,
  };
}

export function getEmptyAgentForm() {
  return {
    agentName: '',
    contactPerson: '',
    phoneNo: '',
    email: '',
    address: '',
    notes: '',
    isActive: true,
  };
}

function toAgentRequestBody(form) {
  return {
    agentName: form.agentName?.trim() || null,
    contactPerson: form.contactPerson?.trim() || null,
    phoneNo: form.phoneNo?.trim() || null,
    email: form.email?.trim() || null,
    address: form.address?.trim() || null,
    notes: form.notes?.trim() || null,
    isActive: !!form.isActive,
  };
}

export async function fetchAgents() {
  const { data } = await axiosClient.get('/api/agents');
  return (data ?? []).map(normalizeAgent);
}

export const DEFAULT_AGENT_NAME = 'Avec';

/** Active agents for dropdowns, in the order they were added (Avec first). */
export async function fetchAgentLookup() {
  const { data } = await axiosClient.get('/api/agents/lookup');
  return (data ?? [])
    .map((raw) => ({ id: raw.agentId ?? raw.AgentId, name: raw.agentName ?? raw.AgentName ?? '' }))
    .filter((agent) => agent.id != null);
}

export async function createAgent(form) {
  const { data } = await axiosClient.post('/api/agents', toAgentRequestBody(form));
  return normalizeAgent(data);
}

export async function updateAgent(agentId, form) {
  const { data } = await axiosClient.post(`/api/agents/${agentId}`, toAgentRequestBody(form));
  return normalizeAgent(data);
}

export async function deleteAgent(agentId) {
  await axiosClient.post(`/api/agents/${agentId}/delete`);
}
