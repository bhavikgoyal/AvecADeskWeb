import axiosClient from './axiosClient';
export async function getBoardCards(filters = {}) {
  const { searchText, assignedUserId, fromDate, toDate } = filters;
  const response = await axiosClient.get('/api/Card/board', {
    params: { searchText, assignedUserId, fromDate, toDate },
  });
  return response.data;
}

export async function createCard(payload) {
  const response = await axiosClient.post('/api/Card/create', {
    listID: payload.listID || null,        
    cardTitle: payload.cardTitle,
    description: payload.description || null,
    color: payload.color || null,
    dueDate: payload.dueDate || null,
    assignedUserID: payload.assignedUserID || null, 
    cardStatusID: payload.cardStatusID,    
    cpid: payload.cpid || null,          
    sheetType: payload.sheetType || null,
  });
  return response.data;
}

export async function updateCard(payload) {
  const response = await axiosClient.put('/api/Card/update', payload);
  return response.data;
}

export async function moveCard(payload) {
  const response = await axiosClient.patch('/api/Card/move', payload);
  return response.data;
}
export async function deleteCard(cardId) {
  const response = await axiosClient.delete(`/api/Card/delete/${cardId}`);
  return response.data;
}

export async function getCardStatuses() {
  const response = await axiosClient.get('/api/CardStatus/list');
  return response.data;
}
export async function getUsers() {
  const response = await axiosClient.get('/api/Members/Users_List');
  return response.data;
}