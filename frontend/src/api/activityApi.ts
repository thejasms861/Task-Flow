import apiClient from './axios';

export const getBoardActivities = async (boardId: string, page = 1, filter = '') => {
    const { data } = await apiClient.get(`/boards/${boardId}/activities/`, {
        params: { page, filter }
    });
    return data.data;
};
