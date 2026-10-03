import axiosClient from './axiosClient';

export async function getCardComments(cardId) {
  const response = await axiosClient.get(`/api/CardComment/card/${cardId}`);
  return response.data;
}

export async function getCardActivity(cardId) {
  const response = await axiosClient.get(`/api/CardComment/activity/${cardId}`);
  return response.data;
}

export async function logCardActivity({ cardID, activityType, description = null, oldValue = null, newValue = null }) {
  const response = await axiosClient.post('/api/CardComment/activity/log', {
    cardID,
    activityType,
    description,
    oldValue,
    newValue,
  });
  return response.data;
}

export async function createCardComment(cardID, commentText) {
  const response = await axiosClient.post('/api/CardComment/create', { cardID, commentText });
  return response.data;
}

export async function updateCardComment(commentId, cardID, commentText) {
  const response = await axiosClient.post(`/api/CardComment/update/${commentId}`, { cardID, commentText });
  return response.data;
}

export async function deleteCardComment(commentId) {
  const response = await axiosClient.post(`/api/CardComment/delete/${commentId}`);
  return response.data;
}
