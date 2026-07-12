import apiClient from './axios';

export const getNotifications = async () => {
    const res = await apiClient.get('/notifications/');
    return res.data;
};

export const markNotificationRead = async (id: string) => {
    const res = await apiClient.patch(`/notifications/${id}/read/`);
    return res.data;
};

export const markAllNotificationsRead = async () => {
    const res = await apiClient.post('/notifications/read-all/');
    return res.data;
};

export const getUnreadCount = async () => {
    const res = await apiClient.get('/notifications/unread-count/');
    return res.data;
};
