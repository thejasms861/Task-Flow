import apiClient from './axios';

export const getBoardSprints = async (boardId: string) => {
    const res = await apiClient.get(`/boards/${boardId}/sprints/`);
    return res.data.data;
};

export const createSprint = async (boardId: string, payload: { name: string; goal?: string; start_date: string; end_date: string }) => {
    const res = await apiClient.post(`/boards/${boardId}/sprints/`, payload);
    return res.data.data;
};

export const updateSprint = async (boardId: string, sprintId: string, payload: any) => {
    const res = await apiClient.patch(`/boards/${boardId}/sprints/${sprintId}/`, payload);
    return res.data.data;
};

export const startSprint = async (boardId: string, sprintId: string) => {
    const res = await apiClient.post(`/boards/${boardId}/sprints/${sprintId}/start/`);
    return res.data.data;
};

export const completeSprint = async (boardId: string, sprintId: string) => {
    const res = await apiClient.post(`/boards/${boardId}/sprints/${sprintId}/complete/`);
    return res.data.data;
};
