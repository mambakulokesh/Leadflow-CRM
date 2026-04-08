import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers['Cache-Control'] = 'no-cache';
    config.headers['Pragma'] = 'no-cache';
    return config;
});

// Auth
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (email, password) => api.post('/auth/login', { email, password });
export const getProfile = () => api.get('/auth/profile');

// Leads
export const getLeads = (search = '', page = 1, limit = 10, status = '') =>
    api.get(`/leads?search=${search}&page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`);
export const getLeadCounts = (search = '') => api.get(`/leads/counts${search ? `?search=${search}` : ''}`);
export const createLead = (data) => api.post('/leads', data);
export const updateLead = (id, data) => api.put(`/leads/${id}`, data);
export const deleteLead = (id) => api.delete(`/leads/${id}`);
export const deleteLeads = (ids) => api.delete('/leads', { data: { ids } });
export const convertLead = (id, data) => api.post(`/leads/${id}/convert`, data);
export const importLeads = (data) => api.post('/leads/import', data);

// Customers
export const getCustomers = (page = 1, limit = 10, search = '', status = '') =>
    api.get(`/customers?page=${page}&limit=${limit}&search=${search}${status ? `&status=${status}` : ''}`);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getLegacyDashboardStats = () =>
    Promise.all([api.get('/leads'), api.get('/customers')]);

// Users (admin)
export const getUsers = (role = '', page = 1, limit = 10) =>
    api.get(`/users?page=${page}&limit=${limit}${role ? `&role=${role}` : ''}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

export const assignLead = (id, assignedTo) => api.put(`/leads/${id}/assign`, { assignedTo });
export const bulkAssignLeads = (ids, assignedTo) => api.put('/leads/assign-bulk', { ids, assignedTo });

// Roles (admin)
export const getRoles = (page = 1, limit = 10) => api.get(`/roles?page=${page}&limit=${limit}`);
export const createRole = (data) => api.post('/roles', data);
export const updateRole = (id, data) => api.put(`/roles/${id}`, data);
export const deleteRole = (id) => api.delete(`/roles/${id}`);

export default api;
