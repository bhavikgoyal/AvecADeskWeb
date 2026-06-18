import api from './axiosConfig';

export const getReminderRules = () => api.get('/reminders/rules').then(res => res.data);

export const createReminderRule = async (payload) => {
  const response = await api.post('/reminders/rules', payload);
  return response.data;
};

export const updateReminderRule = (id, data) =>
  api.put(`/reminders/rules/${id}`, data).then(res => res.data);

export const getReminderStats = () => api.get('/reminders/stats').then(res => res.data);