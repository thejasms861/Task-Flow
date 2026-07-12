import apiClient from './axios';

export const getTaskDetail = async (taskId: string) => {
    const res = await apiClient.get(`/tasks/${taskId}/`);
    return res.data.data;
};

export const patchTask = async (taskId: string, payload: any) => {
    const res = await apiClient.patch(`/tasks/${taskId}/`, payload);
    return res.data.data;
};

export const createSubtask = async (taskId: string, title: string) => {
    const res = await apiClient.post(`/tasks/${taskId}/subtasks/`, { title });
    return res.data.data;
};

export const patchSubtask = async (taskId: string, subId: string, payload: any) => {
    const res = await apiClient.patch(`/tasks/${taskId}/subtasks/${subId}/`, payload);
    return res.data.data;
};

export const uploadTaskGuideline = async (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post(`/tasks/${taskId}/upload-guideline/`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return res.data.data;
};
