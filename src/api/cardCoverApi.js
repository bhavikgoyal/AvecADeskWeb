import axiosClient from './axiosClient';

export async function getCoverColors() {
  const response = await axiosClient.get('/api/CardCover/colors');
  return response.data;
}

export async function getCardCover(cardId) {
  const response = await axiosClient.get(`/api/CardCover/card/${cardId}`);
  return response.data;
}

export async function saveCardCover(payload) {
  const response = await axiosClient.post('/api/CardCover/save', {
    cardID: payload?.cardID,
    color: payload?.color ?? null,
    imageUrl: payload?.imageUrl ?? null,
    size: payload?.size ?? 'normal',
    brightness: payload?.brightness ?? 'light',
  });
  return response.data;
}

export async function uploadCardCoverImage(cardId, file, size = 'normal') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('size', size);
  const response = await axiosClient.post(`/api/CardCover/upload/${cardId}`, formData);
  return response.data;
}

export async function removeCardCover(cardId) {
  const response = await axiosClient.post(`/api/CardCover/remove/${cardId}`);
  return response.data;
}
