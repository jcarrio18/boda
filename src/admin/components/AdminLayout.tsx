import { useState } from 'react';
import type { ComponentType } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Wallet,
    KanbanSquare,
    Armchair,
    Music,
    Bus,
    Camera,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';
import { clearToken } from '../auth';

interface NavItem {
    to: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { to: '/admin', label: 'Resumen', icon: LayoutDashboard },
    { to: '/admin/invitados', label: 'Invitados', icon: Users },
    { to: '/admin/presupuesto', label: 'Presupuesto', icon: Wallet },
    { to: '/admin/tareas', label: 'Tareas', icon: KanbanSquare },
    { to: '/admin/mesas', label: 'Mesas', icon: Armchair },
    { to: '/admin/canciones', label: 'Canciones', icon: Music },
    { to: '/admin/autobus', label: 'Autobús', icon: Bus },
    { to: '/admin/fotos', label: 'Fotos', icon: Camera },
];

interface AdminLayoutProps {
    onLogout: () => void;
}

export default function AdminLayout({ onLogout }: AdminLayoutProps) {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState<boolean>(
        () => localStorage.getItem('boda_admin_sidebar') === 'collapsed',
    );

    const toggleCollapsed = () => {
        setCollapsed((c) => {
            const next = !c;
            localStorage.setItem('boda_admin_sidebar', next ? 'collapsed' : 'open');
            return next;
        });
    };

    const handleLogout = () => {
        clearToken();
        onLogout();
        navigate('/admin');
    };

    return (
        <div className="min-h-screen flex bg-med-cream text-med-ink">
            <aside
                className={`${collapsed ? 'w-16' : 'w-60'} shrink-0 border-r border-med-olive/10 bg-white flex flex-col transition-[width] duration-200`}
            >
                <div className="p-4 border-b border-med-olive/10 flex items-center justify-between gap-2">
                    {!collapsed && (
                        <div>
                            <div className="font-serif text-2xl tracking-tighter">
                                C<span className="italic text-med-gold">&</span>J
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.25em] text-med-ink/40 mt-1">
                                Panel de gestión
                            </div>
                        </div>
                    )}
                    <button
                        onClick={toggleCollapsed}
                        className={`${collapsed ? 'mx-auto' : ''} text-med-ink/40 hover:text-med-olive transition`}
                        title={collapsed ? 'Expandir menú' : 'Ocultar menú'}
                    >
                        {collapsed ? (
                            <PanelLeftOpen className="w-5 h-5" />
                        ) : (
                            <PanelLeftClose className="w-5 h-5" />
                        )}
                    </button>
                </div>

                <nav className="flex-1 p-3 space-y-1">
                    {NAV_ITEMS.map(({ to, label, icon: Icon, disabled }) =>
                        disabled ? (
                            <span
                                key={to}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-med-ink/30 cursor-not-allowed ${collapsed ? 'justify-center' : ''}`}
                                title={collapsed ? `${label} (pronto)` : 'Próximamente'}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                {!collapsed && (
                                    <>
                                        {label}
                                        <span className="ml-auto text-[9px] uppercase tracking-wider bg-med-olive/5 px-1.5 py-0.5 rounded">
                                            pronto
                                        </span>
                                    </>
                                )}
                            </span>
                        ) : (
                            <NavLink
                                key={to}
                                to={to}
                                end={to === '/admin'}
                                title={collapsed ? label : undefined}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${collapsed ? 'justify-center' : ''} ${isActive
                                        ? 'bg-med-olive text-white'
                                        : 'text-med-ink/70 hover:bg-med-olive/5'
                                    }`
                                }
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                {!collapsed && label}
                            </NavLink>
                        ),
                    )}
                </nav>

                <button
                    onClick={handleLogout}
                    className={`m-3 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-med-ink/60 hover:bg-med-terracotta/5 hover:text-med-terracotta transition ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? 'Cerrar sesión' : undefined}
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    {!collapsed && 'Cerrar sesión'}
                </button>
            </aside>

            <main className="flex-1 overflow-x-auto">
                <Outlet />
            </main>
        </div>
    );
}
