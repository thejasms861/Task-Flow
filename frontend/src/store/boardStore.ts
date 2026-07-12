import { create } from 'zustand';

export const useBoardStore = create<any>((set, get) => ({
    board: null,
    columns: [],
    tasksByColumn: {} as Record<string, any[]>,

    setBoard: (board: any) => set({ board }),
    setColumns: (columns: any[]) => set({ columns }),
    setTasks: (tasksByColumn: Record<string, any[]>) => set({ tasksByColumn }),

    addTask: (task: any) => set((s: any) => {
        const colId = String(task.column);
        const existing = s.tasksByColumn[colId] || [];
        return { tasksByColumn: { ...s.tasksByColumn, [colId]: [...existing, task] } };
    }),

    moveTaskOptimistic: (taskId: string, fromColId: string, toColId: string, newIndex: number) => set((s: any) => {
        const tbc = { ...s.tasksByColumn };
        const src = [...(tbc[fromColId] || [])];
        const dst = fromColId === toColId ? src : [...(tbc[toColId] || [])];
        const idx = src.findIndex((t: any) => String(t.id) === String(taskId));
        if (idx === -1) return {};
        const [task] = src.splice(idx, 1);
        task.column = toColId;
        if (fromColId === toColId) {
            src.splice(newIndex, 0, task);
            tbc[fromColId] = src;
        } else {
            dst.splice(newIndex, 0, task);
            tbc[fromColId] = src;
            tbc[toColId] = dst;
        }
        return { tasksByColumn: tbc };
    }),

    revertMove: (snapshot: Record<string, any[]>) => set({ tasksByColumn: snapshot }),

    updateTask: (taskId: string, fields: any) => set((s: any) => {
        const tbc = { ...s.tasksByColumn };
        Object.keys(tbc).forEach(colId => {
            const list = tbc[colId] || [];
            const idx = list.findIndex((t: any) => String(t.id) === String(taskId));
            if (idx !== -1) {
                tbc[colId] = [...list];
                tbc[colId][idx] = { ...tbc[colId][idx], ...fields };
            }
        });
        return { tasksByColumn: tbc };
    }),

    deleteTask: (taskId: string) => set((s: any) => {
        const tbc = { ...s.tasksByColumn };
        Object.keys(tbc).forEach(colId => {
            tbc[colId] = (tbc[colId] || []).filter((t: any) => String(t.id) !== String(taskId));
        });
        return { tasksByColumn: tbc };
    }),

    reorderColumns: (orderedIds: string[]) => set((s: any) => {
        const cols = [...s.columns];
        orderedIds.forEach((id, i) => {
            const col = cols.find((c: any) => String(c.id) === String(id));
            if (col) col.order = i;
        });
        return { columns: cols.sort((a: any, b: any) => a.order - b.order) };
    }),
}));
