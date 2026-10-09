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

export async function getBoardLabelsForCard(cardId) {
  const response = await axiosClient.get(`/api/Label/board/card/${cardId}`);
  return response.data;
}

export async function createBoardLabel({ cardID, labelName, color, assignToCard = true }) {
  const response = await axiosClient.post('/api/Label/board/create', {
    cardID,
    labelName: labelName?.trim() ?? '',
    color: color ?? '',
    assignToCard,
  });
  return response.data;
}

export async function updateBoardLabel(boardLabelId, { labelName, color }) {
  const response = await axiosClient.post(`/api/Label/board/update/${boardLabelId}`, {
    labelName: labelName?.trim() ?? '',
    color: color ?? '',
  });
  return response.data;
}

export async function deleteBoardLabel(boardLabelId) {
  const response = await axiosClient.post(`/api/Label/board/delete/${boardLabelId}`);
  return response.data;
}

export async function setCardBoardLabel({ cardID, boardLabelID, isAssigned }) {
  const response = await axiosClient.post('/api/Label/board/toggle', {
    cardID,
    boardLabelID,
    isAssigned,
  });
  return response.data;
}