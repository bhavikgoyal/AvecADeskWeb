import api from './axiosConfig';

export const getInvoices = () => api.get('/invoices').then(res => res.data);