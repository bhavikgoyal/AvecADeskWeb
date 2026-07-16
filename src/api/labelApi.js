import axiosClient from './axiosClient';

export async function getCardLabels(cardId) {
  const response = await axiosClient.get(`/api/Label/card/${cardId}`);
  return response.data;
}

export async function createLabel(payload) {
  const response = await axiosClient.post('/api/Label/create', {
    cardID: payload.cardID,
    labelName: payload.labelName,
    color: payload.color ?? null,
  });
  return response.data;
}

export async function deleteLabel(labelId) {
  const response = await axiosClient.delete(`/api/Label/delete/${labelId}`);
  return response.data;
}
