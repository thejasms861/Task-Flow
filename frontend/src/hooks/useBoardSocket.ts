import { useEffect, useRef, useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import { useQueryClient } from '@tanstack/react-query';

export const clientSocketId = crypto.randomUUID();

export function useBoardSocket(boardId: string | undefined, token: string | null) {
    const [isConnected, setIsConnected] = useState(false);
    const store = useBoardStore();
    const queryClient = useQueryClient();
    const wsRef = useRef<WebSocket | null>(null);
    const backoffRef = useRef(2000);

    useEffect(() => {
        if (!boardId || !token) return;
        let active = true;

        const connect = () => {
            if (!active) return;
            const isProd = import.meta.env.PROD;
            const fallbackProdUrl = 'https://taskflow-backend-cj9v.onrender.com/api';
            const apiBase = isProd ? fallbackProdUrl : (import.meta.env.VITE_API_URL || 'http://localhost:8000/api');
            const wsProtocol = apiBase.startsWith('https') ? 'wss:' : 'ws:';
            const wsHost = new URL(apiBase, window.location.origin).host;
            const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws/board/${boardId}/?token=${token}`);
            wsRef.current = ws;
            ws.onopen = () => {
                if (active) { setIsConnected(true); backoffRef.current = 2000; }
            };
            ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                if (data.sender_socket_id === clientSocketId) return;
                const { type, payload } = data;
                if (type === 'task.created') store.addTask(payload);
                else if (type === 'task.updated') store.updateTask(payload.task_id, payload.changed_fields || {});
                else if (type === 'task.moved') store.moveTaskOptimistic(payload.task_id, payload.from_column_id, payload.to_column_id, payload.new_order);
                else if (type === 'task.deleted') store.deleteTask(payload.task_id);
                else if (type === 'column.reordered') store.reorderColumns(payload.ordered_ids);
                
                // Force react query to refetch in the background to guarantee UI is perfectly in sync
                queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
                if (payload.task_id) {
                    queryClient.invalidateQueries({ queryKey: ['task-detail', payload.task_id] });
                }
            };
            ws.onclose = () => {
                setIsConnected(false);
                if (active) {
                    setTimeout(connect, backoffRef.current);
                    backoffRef.current = Math.min(backoffRef.current * 1.5, 30000);
                }
            };
        };
        connect();
        return () => { active = false; wsRef.current?.close(); };
    }, [boardId, token, queryClient]);

    return { isConnected };
}
