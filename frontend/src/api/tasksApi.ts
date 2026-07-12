import apiClient from './axios';

export const getBoardDetail = async (boardId: string) => {
    const res = await apiClient.get(`/boards/${boardId}/`);
    return res.data.data;
};

export const getBoardTasks = async (boardId: string, filters?: { priority?: string, assignee?: string, due?: string }) => {
    let url = `/boards/${boardId}/tasks/`;
    if (filters) {
        const params = new URLSearchParams();
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.assignee) params.append('assignee', filters.assignee);
        if (filters.due) params.append('due', filters.due);
        const qs = params.toString();
        if (qs) url += `?${qs}`;
    }
    const res = await apiClient.get(url);
    return res.data.data;
};

export const searchTasks = async (boardId: string, query: string) => {
    if (!query || query.length < 2) return [];
    const res = await apiClient.get(`/boards/${boardId}/search/?q=${encodeURIComponent(query)}`);
    return res.data.data;
};

export const createTask = async (boardId: string, payload: any) => {
    const res = await apiClient.post(`/boards/${boardId}/tasks/`, payload);
    return res.data.data;
};

export const moveTask = async (taskId: string, column_id: string, order: number) => {
    const res = await apiClient.post(`/tasks/${taskId}/move/`, { column_id, order });
    return res.data.data;
};

export const deleteTask = async (taskId: string) => {
    await apiClient.delete(`/tasks/${taskId}/`);
};

export const assignTaskToSprint = async (taskId: string, sprintId: string | null) => {
    const res = await apiClient.post(`/tasks/${taskId}/assign-sprint/`, { sprint_id: sprintId });
    return res.data.data;
};


export const updateBoard = async (boardId: string, data: any) => {
    const res = await apiClient.patch(`/boards/${boardId}/`, data);
    return res.data.data;
};

export const deleteBoard = async (boardId: string) => {
    await apiClient.delete(`/boards/${boardId}/`);
};

export const inviteMember = async (boardId: string, email: string, role = 'member') => {
    const res = await apiClient.post(`/boards/${boardId}/invite/`, { email, role });
    return res.data.data;
};

export const removeMember = async (boardId: string, userId: number | string) => {
    const res = await apiClient.delete(`/boards/${boardId}/members/${userId}/`);
    return res.data.data;
};

export const getBoardLabels = async (boardId: string) => {
    const res = await apiClient.get(`/boards/${boardId}/labels/`);
    return res.data.data;
};

export const createLabel = async (boardId: string, labelData: { name: string, color: string }) => {
    const res = await apiClient.post(`/boards/${boardId}/labels/`, labelData);
    return res.data.data;
};

export const deleteLabel = async (boardId: string, labelId: number | string) => {
    await apiClient.delete(`/boards/${boardId}/labels/${labelId}/`);
};

// ── Share API ──────────────────────────────────────────────────────────────

export const enableShare = async (boardId: string) => {
    const res = await apiClient.post(`/boards/${boardId}/share/enable/`);
    return res.data.data;
};

export const disableShare = async (boardId: string) => {
    const res = await apiClient.post(`/boards/${boardId}/share/disable/`);
    return res.data.data;
};

/** Public endpoint — no auth header needed, use raw axios */
import axios from 'axios';
export const getPublicBoard = async (token: string) => {
    const isProd = import.meta.env.PROD;
    const fallbackProdUrl = 'https://taskflow-backend-cj9v.onrender.com/api';
    const baseURL = isProd ? fallbackProdUrl : (import.meta.env.VITE_API_URL || '/api');
    const res = await axios.get(`${baseURL}/share/${token}/`);
    return res.data.data as { board: any; tasks: any[] };
};
