import axiosClient from './axiosClient';

export async function getCardAttachments(cardId) {
  const response = await axiosClient.get(`/api/CardAttachment/card/${cardId}`);
  return response.data;
}

export async function uploadCardAttachment(cardId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosClient.post(`/api/CardAttachment/upload/${cardId}`, formData);
  return response.data;
}

export async function addCardAttachmentLink({ cardID, url, displayName }) {
  const response = await axiosClient.post('/api/CardAttachment/link', { cardID, url, displayName });
  return response.data;
}

export async function updateCardAttachment(attachmentId, { displayName, linkUrl }) {
  const response = await axiosClient.post(`/api/CardAttachment/update/${attachmentId}`, {
    displayName,
    linkUrl: linkUrl ?? null,
  });
  return response.data;
}

export async function deleteCardAttachment(attachmentId) {
  const response = await axiosClient.post(`/api/CardAttachment/delete/${attachmentId}`);
  return response.data;
}
