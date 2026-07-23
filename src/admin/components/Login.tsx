import { useState } from 'react';
import type { FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { login } from '../auth';

interface LoginProps {
    onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
    const [token, setToken] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(token.trim());
            onSuccess();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-med-cream px-6">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-med-olive/10 p-8"
            >
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-12 h-12 rounded-full bg-med-olive/10 flex items-center justify-center mb-4">
                        <Lock className="w-5 h-5 text-med-olive" />
                    </div>
                    <h1 className="font-serif text-2xl text-med-ink">Panel de la boda</h1>
                    <p className="text-sm text-med-ink/50 mt-1">
                        Introduce la contraseña de acceso
                    </p>
                </div>

                <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Contraseña"
                    autoFocus
                    className="w-full px-4 py-3 rounded-lg border border-med-olive/20 focus:border-med-terracotta focus:outline-none focus:ring-2 focus:ring-med-terracotta/20 transition"
                />

                {error && <p className="text-sm text-med-terracotta mt-3">{error}</p>}

                <button
                    type="submit"
                    disabled={loading || !token.trim()}
                    className="w-full mt-6 py-3 rounded-lg bg-med-olive text-white font-semibold uppercase tracking-wider text-xs disabled:opacity-50 hover:bg-med-olive/90 transition"
                >
                    {loading ? 'Entrando…' : 'Entrar'}
                </button>
            </form>
        </div>
    );
}
