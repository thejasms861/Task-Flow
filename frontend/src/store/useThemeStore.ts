import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeState {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
    theme: (localStorage.getItem('taskflow-theme') as Theme) || 'dark',
    toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('taskflow-theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        return { theme: newTheme };
    }),
    setTheme: (theme: Theme) => set(() => {
        localStorage.setItem('taskflow-theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        return { theme };
    })
}));
