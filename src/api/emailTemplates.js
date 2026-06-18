import api from './axiosConfig';

export async function fetchEmailTemplates() {
  const { data } = await api.get('/email-templates');
  return data;
}

export async function createEmailTemplate(payload) {
  const { data } = await api.post('/email-templates', payload);
  return data;
}