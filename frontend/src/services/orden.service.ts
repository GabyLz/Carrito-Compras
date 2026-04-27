import api from './api';

export const getOrdenes = async () => {
  const response = await api.get('/ordenes');
  return response.data;
};
