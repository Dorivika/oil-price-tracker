import axios from 'axios';

const API_BASE = '/api';

export const register = (data: any) => axios.post(`${API_BASE}/auth/register`, data);
export const login = (data: any) => axios.post(`${API_BASE}/auth/login`, data);
export const getPrices = () => axios.get(`${API_BASE}/prices`);
export const createAlert = (data: any) => axios.post(`${API_BASE}/alerts`, data);
export const getAlerts = (userId: string) => axios.get(`${API_BASE}/alerts/${userId}`);
export const placeOrder = (data: any) => axios.post(`${API_BASE}/orders/place`, data);
export const createPaymentIntent = (data: any) => axios.post(`${API_BASE}/orders/create-payment-intent`, data);
