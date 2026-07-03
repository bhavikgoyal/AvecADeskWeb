import axiosClient from './axiosClient';

export async function fetchAgrrementTemplates() {
	const { data } = await axiosClient.get('/api/agrrement-templates');
	return data;
}

export async function fetchAgrrementTemplateById(templateId) {
	const { data } = await axiosClient.get(`/api/agrrement-templates/${templateId}`);
	return data;
}

export async function createAgrrementTemplate(payload) {
	const { data } = await axiosClient.post('/api/agrrement-templates', payload);
	return data;
}

export async function updateAgrrementTemplate(templateId, payload) {
	const { data } = await axiosClient.put(`/api/agrrement-templates/${templateId}`, payload);
	return data;
}

export async function deleteAgrrementTemplate(templateId) {
	const { data } = await axiosClient.delete(`/api/agrrement-templates/${templateId}`);
	return data;
}
