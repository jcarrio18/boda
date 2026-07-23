import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Trash2, Copy, Check, ImageOff, Eraser } from 'lucide-react';
import { useApi } from '../useApi';
import { apiFetch } from '../auth';

interface Photo {
    id: number;
    uploader: string | null;
    created_at: string;
    url: string | null;
}

export default function PhotosPage() {
    const { data: photos, loading, error, refetch } = useApi<Photo[]>('/api/photos');
    const [copied, setCopied] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [cleaning, setCleaning] = useState(false);
    const [cleanMsg, setCleanMsg] = useState<string | null>(null);

    const uploadUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/subir` : '/subir';

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(uploadUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    };

    const remove = async (id: number) => {
        if (!confirm('¿Eliminar esta foto? Se borrará también del almacenamiento.'))
            return;
        setActionError(null);
        try {
            await apiFetch(`/api/photos?id=${id}`, { method: 'DELETE' });
            refetch();
        } catch (err) {
            setActionError((err as Error).message);
        }
    };

    const cleanup = async () => {
        setActionError(null);
        setCleanMsg(null);
        setCleaning(true);
        try {
            const res = await apiFetch<{ removed: number }>(
                '/api/photos?action=cleanup',
                { method: 'POST' },
            );
            setCleanMsg(
                res.removed > 0
                    ? `Eliminadas ${res.removed} fotos que ya no existían.`
                    : 'No había fotos huérfanas.',
            );
            refetch();
        } catch (err) {
            setActionError((err as Error).message);
        } finally {
            setCleaning(false);
        }
    };

    if (error) return <div className="p-8 text-med-terracotta">{error}</div>;

    return (
        <div className="p-8">
            <header className="mb-6">
                <h1 className="font-serif text-3xl text-med-ink">Fotos</h1>
                <p className="text-sm text-med-ink/50 mt-1">
                    Álbum colaborativo. Comparte el QR el día de la boda.
                </p>
            </header>

            {/* QR + link */}
            <div className="bg-white rounded-xl border border-med-olive/10 p-5 mb-6 flex flex-col sm:flex-row items-center gap-5">
                <div className="p-3 bg-white rounded-lg border border-med-olive/10">
                    <QRCodeSVG value={uploadUrl} size={140} fgColor="#1A1A1A" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                    <div className="text-sm text-med-ink/60 mb-1">
                        Los invitados escanean este código para subir y ver fotos:
                    </div>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <code className="text-sm bg-med-cream px-2 py-1 rounded border border-med-olive/10">
                            {uploadUrl}
                        </code>
                        <button
                            onClick={copyLink}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-med-olive/20 text-med-ink/70 hover:bg-med-olive/5 transition"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-med-olive" /> Copiado
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" /> Copiar
                                </>
                            )}
                        </button>
                    </div>
                    <div className="text-xs text-med-ink/40 mt-3">
                        {photos ? `${photos.length} fotos subidas` : '—'}
                    </div>
                    <button
                        onClick={cleanup}
                        disabled={cleaning}
                        className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-med-olive/20 text-med-ink/70 hover:bg-med-olive/5 transition disabled:opacity-50"
                        title="Elimina de la lista las fotos borradas directamente en Cloudflare"
                    >
                        <Eraser className="w-3.5 h-3.5" />
                        {cleaning ? 'Limpiando…' : 'Limpiar fotos borradas'}
                    </button>
                    {cleanMsg && (
                        <div className="text-xs text-med-olive mt-2">{cleanMsg}</div>
                    )}
                </div>
            </div>

            {actionError && (
                <div className="mb-4 text-sm text-med-terracotta bg-med-terracotta/5 px-4 py-2 rounded-lg">
                    {actionError}
                </div>
            )}

            {loading ? (
                <div className="text-med-ink/40">Cargando fotos…</div>
            ) : !photos || photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-med-ink/40">
                    <ImageOff className="w-8 h-8 mb-3" />
                    Aún no hay fotos subidas.
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                    {photos.map((p) => (
                        <div
                            key={p.id}
                            className="group relative aspect-square rounded-lg overflow-hidden bg-med-olive/5 border border-med-olive/10"
                        >
                            {p.url && (
                                <a href={p.url} target="_blank" rel="noreferrer">
                                    <img
                                        src={p.url}
                                        alt={p.uploader || 'Foto'}
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                    />
                                </a>
                            )}
                            {p.uploader && (
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-[10px] px-2 py-1 truncate">
                                    {p.uploader}
                                </div>
                            )}
                            <button
                                onClick={() => remove(p.id)}
                                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 bg-white/90 rounded-md p-1 text-med-ink/60 hover:text-med-terracotta transition"
                                title="Eliminar"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
