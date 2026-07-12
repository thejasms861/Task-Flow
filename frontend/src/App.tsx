import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';
import AuthLayout from './layouts/AuthLayout';
import ProtectedRoute from './layouts/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import OAuthCallback from './pages/OAuthCallback';
import Boards from './pages/Boards';
import Board from './pages/Board';
import ActivityLog from './pages/ActivityLog';
import Analytics from './pages/Analytics';
import Sprints from './pages/Sprints';
import PublicBoard from './pages/PublicBoard';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';
import ToastProvider from './components/ui/ToastProvider';

const queryClient = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } }
});

function App() {
    const loadUser = useAuthStore(s => s.loadUser);
    const { theme } = useThemeStore();
    
    useEffect(() => { loadUser(); }, [loadUser]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <ToastProvider />
                <Routes>
                    <Route element={<AuthLayout />}>
                        <Route path='/login' element={<Login />} />
                        <Route path='/register' element={<Register />} />
                        <Route path='/verify-email' element={<VerifyEmail />} />
                        <Route path='/forgot-password' element={<ForgotPassword />} />
                        <Route path='/reset-password' element={<ResetPassword />} />
                        <Route path='/auth/callback' element={<OAuthCallback />} />
                        <Route path='/auth/callback/google' element={<OAuthCallback />} />
                        <Route path='/auth/callback/github' element={<OAuthCallback />} />
                    </Route>

                    {/* Public share route — no auth needed */}
                    <Route path='/share/:token' element={<PublicBoard />} />

                    <Route element={<ProtectedRoute />}>
                        <Route path='/boards' element={<Boards />} />
                        <Route path='/board/:id' element={<Board />} />
                        <Route path='/board/:id/activity' element={<ActivityLog />} />
                        <Route path='/board/:id/analytics' element={<Analytics />} />
                        <Route path='/board/:id/sprints' element={<Sprints />} />
                        <Route path='/settings' element={<Settings />} />
                        <Route path='/' element={<Navigate to='/boards' replace />} />
                    </Route>
                    <Route path='*' element={<NotFound />} />
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;
