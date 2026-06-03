import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getEmployees       = (activeOnly = false) => api.get(`/employees${activeOnly ? '?activeOnly=1' : ''}`).then(r => r.data);
export const updateEmployee     = (id, data) => api.put(`/employees/${id}`, data).then(r => r.data);
export const createEmployee     = (data) => api.post('/employees', data).then(r => r.data);
export const deleteEmployee     = (id) => api.delete(`/employees/${id}`).then(r => r.data);

export const getFrameworks   = () => api.get('/frameworks').then(r => r.data);
export const createFramework = (data) => api.post('/frameworks', data).then(r => r.data);
export const updateFramework = (id, data) => api.put(`/frameworks/${id}`, data).then(r => r.data);
export const deleteFramework = (id) => api.delete(`/frameworks/${id}`).then(r => r.data);

export const getAssignments       = () => api.get('/assignments').then(r => r.data);
export const getAssignmentSummary = () => api.get('/assignments/summary').then(r => r.data);
export const updateAssignment     = (id, data) => api.put(`/assignments/${id}`, data).then(r => r.data);

export const getKinder      = () => api.get('/kinder').then(r => r.data);
export const createKinder   = (data) => api.post('/kinder', data).then(r => r.data);
export const updateKinder   = (id, data) => api.put(`/kinder/${id}`, data).then(r => r.data);
export const deleteKinder   = (id) => api.delete(`/kinder/${id}`).then(r => r.data);

export const getTeams       = () => api.get('/teams').then(r => r.data);
export const updateTeam     = (id, data) => api.put(`/teams/${id}`, data).then(r => r.data);
export const getUnassigned  = () => api.get('/teams/unassigned').then(r => r.data);

export const getSpecEdClasses    = () => api.get('/spec-ed').then(r => r.data);
export const createSpecEdClass   = (data) => api.post('/spec-ed', data).then(r => r.data);
export const updateSpecEdClass   = (id, data) => api.put(`/spec-ed/${id}`, data).then(r => r.data);
export const deleteSpecEdClass   = (id) => api.delete(`/spec-ed/${id}`).then(r => r.data);

export const getSupervisions   = () => api.get('/supervisions').then(r => r.data);
export const createSupervision = (data) => api.post('/supervisions', data).then(r => r.data);
export const updateSupervision = (id, data) => api.put(`/supervisions/${id}`, data).then(r => r.data);
export const deleteSupervision = (id) => api.delete(`/supervisions/${id}`).then(r => r.data);
