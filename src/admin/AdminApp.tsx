import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './auth';
import Login from './components/Login';
import AdminLayout from './components/AdminLayout';
import SummaryPage from './pages/SummaryPage';
import GuestsPage from './pages/GuestsPage';
import BudgetPage from './pages/BudgetPage';
import TasksPage from './pages/TasksPage';
import MesasPage from './pages/MesasPage';
import MusicPage from './pages/MusicPage';
import BusPage from './pages/BusPage';
import PhotosPage from './pages/PhotosPage';

export default function AdminApp() {
    const [authed, setAuthed] = useState<boolean>(() => !!getToken());

    if (!authed) {
        return <Login onSuccess={() => setAuthed(true)} />;
    }

    return (
        <Routes>
            <Route element={<AdminLayout onLogout={() => setAuthed(false)} />}>
                <Route index element={<SummaryPage />} />
                <Route path="invitados" element={<GuestsPage />} />
                <Route path="presupuesto" element={<BudgetPage />} />
                <Route path="tareas" element={<TasksPage />} />
                <Route path="mesas" element={<MesasPage />} />
                <Route path="canciones" element={<MusicPage />} />
                <Route path="autobus" element={<BusPage />} />
                <Route path="fotos" element={<PhotosPage />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
        </Routes>
    );
}
