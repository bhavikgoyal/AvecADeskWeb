import axiosClient from './axiosClient';

export async function getLabelsByCard(cardId) {
  const response = await axiosClient.get(`/api/Label/card/${cardId}`);
  return response.data;
}

export async function createLabel(payload) {
  const safePayload = {
    cardID: payload?.cardID,
    labelName: payload?.labelName?.trim(),
    color: payload?.color ?? null,
  };

  const response = await axiosClient.post('/api/Label/create', safePayload);
  return response.data;
}

export async function deleteLabel(labelId) {
  const response = await axiosClient.post(`/api/Label/delete/${labelId}`);
  return response.data;
}