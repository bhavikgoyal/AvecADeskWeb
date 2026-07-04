import axiosClient from './axiosClient';

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function normalizeTemplate(raw) {
    if (!raw) return null;
    const id = raw.id ?? raw.templateId ?? raw.TemplateId ?? raw._id ?? raw.Id;
    const templateName = raw.templateName ?? raw.name ?? raw.title ?? raw.TemplateName ?? raw.Name ?? '';
    const category = raw.category ?? raw.type ?? raw.Category ?? 'General';
    const subject = raw.subject ?? raw.Subject ?? '';
    const bodyHtml = raw.bodyHtml ?? raw.body ?? raw.content ?? raw.html ?? '';
    const notes = raw.notes ?? raw.note ?? '';
    const updated = formatDate(raw.updatedAt ?? raw.updated ?? raw.createdAt ?? raw.createdAt);

    return {
        id: String(id ?? templateName ?? Math.random().toString(36).slice(2, 9)),
        templateName,
        category,
        subject,
        bodyHtml,
        notes,
        updated,
        name: templateName,
    };
}

/**
 * GET
 * api/email-templates
 */
export const getEmailTemplates = async () => {
    const { data } = await axiosClient.get('/api/email-templates');
    if (!Array.isArray(data)) return [];
    return data.map(normalizeTemplate);
};

/**
 * POST
 * api/email-templates
 */
export const createEmailTemplate = async (templateData) => {
    const payload = {
        Name: templateData.templateName ?? templateData.name ?? '',
        Category: templateData.category ?? 'General',
        Subject: templateData.subject ?? '',
        Body: templateData.bodyHtml ?? templateData.body ?? templateData.content ?? '',
        BodyHtml: templateData.bodyHtml ?? templateData.body ?? templateData.content ?? '',
        Notes: templateData.notes ?? '',
    };
    console.debug('createEmailTemplate payload:', payload);
    const { data } = await axiosClient.post('/api/email-templates', payload);
    console.debug('createEmailTemplate response:', data);
    return normalizeTemplate(data);
};

/**
 * PUT
 * api/email-templates/{templateId}
 */
export const updateEmailTemplate = async (templateId, templateData) => {
    const payload = {
        Name: templateData.templateName ?? templateData.name ?? '',
        Category: templateData.category ?? 'General',
        Subject: templateData.subject ?? '',
        Body: templateData.bodyHtml ?? templateData.body ?? templateData.content ?? '',
        BodyHtml: templateData.bodyHtml ?? templateData.body ?? templateData.content ?? '',
        Notes: templateData.notes ?? '',
    };
    console.debug('updateEmailTemplate payload:', { templateId, payload });
    const { data } = await axiosClient.put(`/api/email-templates/${templateId}`, payload);
    console.debug('updateEmailTemplate response:', data);
    return normalizeTemplate(data);
};

/**
 * GET
 * api/email-templates/{templateId}
 */
export const getEmailTemplateById = async (templateId) => {
    const { data } = await axiosClient.get(`/api/email-templates/${templateId}`);
    return normalizeTemplate(data);
};

/**
 * DELETE
 * api/email-templates/{templateId}
 */
export const deleteEmailTemplate = async (templateId) => {
    await axiosClient.delete(`/api/email-templates/${templateId}`);
    return true;
};