import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

const AdminApp = lazy(() => import('./admin/AdminApp.tsx'));
const UploadPage = lazy(() => import('./UploadPage.tsx'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route
          path="/subir"
          element={
            <Suspense fallback={<div className="min-h-screen bg-med-cream" />}>
              <UploadPage />
            </Suspense>
          }
        />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<div className="min-h-screen bg-med-cream" />}>
              <AdminApp />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
