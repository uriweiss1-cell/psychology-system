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
export const createTeam     = (data) => api.post('/teams', data).then(r => r.data);
export const deleteTeam     = (id) => api.delete(`/teams/${id}`).then(r => r.data);
export const updateTeam     = (id, data) => api.put(`/teams/${id}`, data).then(r => r.data);
export const getUnassigned  = () => api.get('/teams/unassigned').then(r => r.data);

export const getAlerts           = () => api.get('/alerts').then(r => r.data);
export const getSettings         = () => api.get('/settings').then(r => r.data);
export const updateSettings      = (data) => api.put('/settings', data).then(r => r.data);
export const getStandardsMarked  = () => api.get('/settings/marks').then(r => r.data);
export const putStandardsMarked  = (ids) => api.put('/settings/marks', { ids }).then(r => r.data);
export const getHiddenSupTypes   = () => api.get('/settings/hidden-sup-types').then(r => r.data);
export const putHiddenSupTypes   = (types) => api.put('/settings/hidden-sup-types', { types }).then(r => r.data);
export const getSecretaries      = () => api.get('/secretaries').then(r => r.data);
export const createSecretary    = (data) => api.post('/secretaries', data).then(r => r.data);
export const updateSecretary    = (id, data) => api.put(`/secretaries/${id}`, data).then(r => r.data);
export const deleteSecretary    = (id) => api.delete(`/secretaries/${id}`).then(r => r.data);

export const getExemptions       = () => api.get('/settings/exemptions').then(r => r.data);
export const putExemptions       = (exemptions) => api.put('/settings/exemptions', { exemptions }).then(r => r.data);

export const getDraftStatus      = () => api.get('/draft/status').then(r => r.data);
export const activateDraft       = () => api.post('/draft/activate').then(r => r.data);
export const pauseDraft          = () => api.post('/draft/pause').then(r => r.data);
export const resumeDraft         = () => api.post('/draft/resume').then(r => r.data);
export const approveDraft        = () => api.post('/draft/approve').then(r => r.data);
export const discardDraft        = () => api.post('/draft/discard').then(r => r.data);

export const previewImport       = (type, file) => { const fd = new FormData(); fd.append('file', file); return api.post(`/import/${type}/preview`, fd).then(r => r.data); };
export const applyImport         = (type, rows, toDeleteIds = []) => api.post(`/import/${type}/apply`, { rows, toDeleteIds }).then(r => r.data);

export const getSpecEdClasses    = () => api.get('/spec-ed').then(r => r.data);
export const createSpecEdClass   = (data) => api.post('/spec-ed', data).then(r => r.data);
export const updateSpecEdClass   = (id, data) => api.put(`/spec-ed/${id}`, data).then(r => r.data);
export const deleteSpecEdClass   = (id) => api.delete(`/spec-ed/${id}`).then(r => r.data);
export const advanceSpecEdYear   = () => api.post('/spec-ed/advance-year').then(r => r.data);

export const getSupervisions   = () => api.get('/supervisions').then(r => r.data);
export const createSupervision = (data) => api.post('/supervisions', data).then(r => r.data);
export const updateSupervision = (id, data) => api.put(`/supervisions/${id}`, data).then(r => r.data);
export const deleteSupervision = (id) => api.delete(`/supervisions/${id}`).then(r => r.data);
