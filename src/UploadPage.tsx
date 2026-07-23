import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
    Camera,
    Loader2,
    Check,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    X,
    Download,
    CheckSquare,
    Maximize2,
} from 'lucide-react';

interface Photo {
    id: number;
    uploader: string | null;
    created_at: string;
    url: string | null;
}

interface UploadItem {
    name: string;
    status: 'uploading' | 'done' | 'error';
}

type Sort = 'newest' | 'oldest';

export default function UploadPage() {
    const [name, setName] = useState<string>(
        () => localStorage.getItem('boda_uploader') || '',
    );
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [uploads, setUploads] = useState<UploadItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [sort, setSort] = useState<Sort>('newest');
    const [filterUser, setFilterUser] = useState<string>('all');
    const [heroIdx, setHeroIdx] = useState(0);

    const [viewer, setViewer] = useState<number | null>(null);
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [zipping, setZipping] = useState(false);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const heroTouch = useRef<number | null>(null);
    const wheelLock = useRef(false);
    const touchX = useRef<number | null>(null);

    const loadPhotos = useCallback(() => {
        fetch('/api/photos')
            .then((r) => r.json())
            .then((data) => Array.isArray(data) && setPhotos(data))
            .catch(() => { });
    }, []);

    useEffect(() => {
        loadPhotos();
    }, [loadPhotos]);

    // If a photo's file no longer exists in R2 (deleted), hide it from the album
    // and ask the server to prune the orphan DB row (only if truly missing).
    const handleBrokenImg = (id: number) => {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        fetch('/api/photos?action=prune', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        }).catch(() => { });
    };

    const uploaders = useMemo(() => {
        const set = new Set<string>();
        for (const p of photos) if (p.uploader?.trim()) set.add(p.uploader.trim());
        return [...set].sort((a, b) => a.localeCompare(b, 'es'));
    }, [photos]);

    const displayed = useMemo(() => {
        let list = photos.filter((p) => p.url);
        if (filterUser !== 'all') {
            list = list.filter((p) => (p.uploader?.trim() || '') === filterUser);
        }
        list = [...list].sort((a, b) => {
            const d = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            return sort === 'newest' ? d : -d;
        });
        return list;
    }, [photos, filterUser, sort]);

    // Keep hero index valid when the filtered list changes.
    useEffect(() => {
        setHeroIdx((i) => (i > displayed.length - 1 ? 0 : i));
    }, [displayed.length]);
    useEffect(() => {
        setHeroIdx(0);
    }, [filterUser, sort]);

    const goHero = (i: number) =>
        setHeroIdx(Math.max(0, Math.min(displayed.length - 1, i)));

    // --- Uploads ---
    const uploadOne = async (file: File): Promise<boolean> => {
        if (file.size > 20 * 1024 * 1024) throw new Error('La foto supera los 20 MB');
        const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
        const presignRes = await fetch('/api/photos-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentType: file.type, ext }),
        });
        if (!presignRes.ok) {
            const d = await presignRes.json().catch(() => null);
            throw new Error((d && d.error) || 'No se pudo preparar la subida');
        }
        const { url, key } = await presignRes.json();
        const up = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
        });
        if (!up.ok) throw new Error('Error al subir la foto');
        await fetch('/api/photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key,
                uploader: name.trim() || null,
                contentType: file.type,
                size: file.size,
            }),
        });
        return true;
    };

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setError(null);
        if (name.trim()) localStorage.setItem('boda_uploader', name.trim());
        const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
        setUploads(list.map((f) => ({ name: f.name, status: 'uploading' })));
        for (let i = 0; i < list.length; i++) {
            try {
                await uploadOne(list[i]);
                setUploads((prev) =>
                    prev.map((u, idx) => (idx === i ? { ...u, status: 'done' } : u)),
                );
            } catch (err) {
                setError((err as Error).message);
                setUploads((prev) =>
                    prev.map((u, idx) => (idx === i ? { ...u, status: 'error' } : u)),
                );
            }
        }
        loadPhotos();
        if (inputRef.current) inputRef.current.value = '';
        setTimeout(() => setUploads([]), 2500);
    };

    const uploadingCount = uploads.filter((u) => u.status === 'uploading').length;

    // --- Viewer (lightbox over the displayed list) ---
    const showAt = useCallback(
        (i: number) =>
            setViewer((((i % displayed.length) + displayed.length) % displayed.length) || 0),
        [displayed.length],
    );

    useEffect(() => {
        if (viewer === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setViewer(null);
            else if (e.key === 'ArrowRight') showAt(viewer + 1);
            else if (e.key === 'ArrowLeft') showAt(viewer - 1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [viewer, showAt]);

    const downloadPhoto = (p: Photo) => {
        const a = document.createElement('a');
        a.href = `/api/photos-download?id=${p.id}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    // --- Selection + zip ---
    const toggleSelect = (id: number) =>
        setSelected((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });

    const exitSelect = () => {
        setSelectMode(false);
        setSelected(new Set());
    };

    const downloadZip = async () => {
        const chosen = photos.filter((p) => selected.has(p.id));
        if (chosen.length === 0) return;
        setZipping(true);
        try {
            const zip = new JSZip();
            for (const p of chosen) {
                try {
                    const r = await fetch(`/api/photos-file?id=${p.id}`);
                    if (!r.ok) continue;
                    const blob = await r.blob();
                    const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
                    zip.file(`boda-${p.id}.${ext}`, blob);
                } catch {
                    /* skip */
                }
            }
            const out = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(out);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'fotos-boda.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            exitSelect();
        } finally {
            setZipping(false);
        }
    };

    const current = displayed[heroIdx];

    return (
        <div className={`min-h-screen bg-med-cream text-med-ink ${selectMode ? 'pb-20' : ''}`}>
            {/* Top bar */}
            <header className="sticky top-0 z-30 bg-med-cream/90 backdrop-blur border-b border-med-olive/10">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="font-serif text-xl tracking-tighter">
                            C<span className="italic text-med-gold">&</span>J
                        </span>
                        <span className="font-serif text-lg">Álbum</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Tu nombre"
                            className="w-28 sm:w-36 px-3 py-2 text-sm rounded-lg border border-med-olive/20 focus:border-med-terracotta focus:outline-none"
                        />
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFiles(e.target.files)}
                        />
                        <button
                            onClick={() => inputRef.current?.click()}
                            disabled={uploadingCount > 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-med-olive text-white text-sm font-semibold disabled:opacity-60 hover:bg-med-olive/90 transition"
                        >
                            {uploadingCount > 0 ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> {uploadingCount}
                                </>
                            ) : (
                                <>
                                    <Camera className="w-4 h-4" /> Añadir fotos
                                </>
                            )}
                        </button>
                    </div>
                </div>
                {error && (
                    <div className="max-w-6xl mx-auto px-4 pb-2 flex items-center gap-2 text-xs text-med-terracotta">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}
            </header>

            {/* HERO: large horizontal viewer */}
            {displayed.length === 0 ? (
                <div className="max-w-6xl mx-auto px-4 py-24 text-center text-med-ink/40">
                    <Camera className="w-10 h-10 mx-auto mb-4 text-med-olive/40" />
                    <p className="font-serif text-xl text-med-ink/60">
                        Aún no hay fotos en el álbum
                    </p>
                    <p className="text-sm mt-1">Pulsa «Añadir fotos» para empezar.</p>
                </div>
            ) : (
                <section className="relative isolate bg-med-cream pt-6 pb-3 overflow-hidden">
                    <div
                        className="relative h-[56vh] sm:h-[64vh] select-none touch-pan-y"
                        onPointerDown={(e) => (heroTouch.current = e.clientX)}
                        onPointerUp={(e) => {
                            if (heroTouch.current === null) return;
                            const dx = e.clientX - heroTouch.current;
                            if (Math.abs(dx) > 40) goHero(heroIdx + (dx < 0 ? 1 : -1));
                            heroTouch.current = null;
                        }}
                        onWheel={(e) => {
                            if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
                            if (wheelLock.current) return;
                            wheelLock.current = true;
                            goHero(heroIdx + (e.deltaX > 0 ? 1 : -1));
                            setTimeout(() => (wheelLock.current = false), 220);
                        }}
                    >
                        {displayed.map((p, i) => {
                            const d = i - heroIdx;
                            if (Math.abs(d) > 3) return null;
                            const ad = Math.abs(d);
                            const scale = Math.max(1 - ad * 0.13, 0.5);
                            const opacity = ad >= 3 ? 0 : Math.max(1 - ad * 0.12, 0);
                            const translate = d * 28;
                            return (
                                <div
                                    key={p.id}
                                    className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out"
                                    style={{
                                        transform: `translateX(${translate}%) scale(${scale})`,
                                        opacity,
                                        zIndex: 100 - ad,
                                    }}
                                >
                                    <button
                                        onClick={() => (d === 0 ? setViewer(i) : goHero(i))}
                                        className="h-full flex items-center justify-center"
                                        title={d === 0 ? 'Ver a pantalla completa' : 'Ver'}
                                    >
                                        <img
                                            src={p.url as string}
                                            alt={p.uploader || 'Foto'}
                                            draggable={false}
                                            onError={() => handleBrokenImg(p.id)}
                                            className={`max-h-full max-w-full object-contain rounded-2xl ${d === 0 ? 'shadow-2xl' : 'shadow-lg'
                                                }`}
                                        />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {displayed.length > 1 && (
                        <>
                            <button
                                onClick={() => goHero(heroIdx - 1)}
                                disabled={heroIdx === 0}
                                className="absolute left-3 top-1/2 -translate-y-1/2 z-[200] p-2 rounded-full bg-white/80 shadow text-med-ink hover:bg-white transition disabled:opacity-0"
                                title="Anterior"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={() => goHero(heroIdx + 1)}
                                disabled={heroIdx === displayed.length - 1}
                                className="absolute right-3 top-1/2 -translate-y-1/2 z-[200] p-2 rounded-full bg-white/80 shadow text-med-ink hover:bg-white transition disabled:opacity-0"
                                title="Siguiente"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </>
                    )}

                    {current && (
                        <div className="max-w-6xl mx-auto px-4 mt-4 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-med-ink">
                                    {current.uploader || 'Anónimo'}
                                </div>
                                <div className="text-xs text-med-ink/50">
                                    {new Date(current.created_at).toLocaleDateString('es-ES', {
                                        day: 'numeric',
                                        month: 'long',
                                    })}{' '}
                                    · {heroIdx + 1}/{displayed.length}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setViewer(heroIdx)}
                                    className="p-2 rounded-full bg-med-olive/10 text-med-olive hover:bg-med-olive/20 transition"
                                    title="Pantalla completa"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => downloadPhoto(current)}
                                    className="p-2 rounded-full bg-med-olive/10 text-med-olive hover:bg-med-olive/20 transition"
                                    title="Descargar"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* GRID + controls */}
            <section className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                    <h2 className="font-serif text-lg">Todas las fotos ({displayed.length})</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value as Sort)}
                            className="text-sm px-3 py-1.5 rounded-lg border border-med-olive/20 bg-white focus:outline-none"
                        >
                            <option value="newest">Más recientes</option>
                            <option value="oldest">Más antiguas</option>
                        </select>
                        {uploaders.length > 0 && (
                            <select
                                value={filterUser}
                                onChange={(e) => setFilterUser(e.target.value)}
                                className="text-sm px-3 py-1.5 rounded-lg border border-med-olive/20 bg-white focus:outline-none"
                            >
                                <option value="all">Todos los autores</option>
                                {uploaders.map((u) => (
                                    <option key={u} value={u}>
                                        {u}
                                    </option>
                                ))}
                            </select>
                        )}
                        {selectMode ? (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelected(new Set(displayed.map((p) => p.id)))}
                                    className="text-xs text-med-ink/60 hover:text-med-olive"
                                >
                                    Todas
                                </button>
                                <button
                                    onClick={exitSelect}
                                    className="text-xs text-med-ink/60 hover:text-med-terracotta"
                                >
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setSelectMode(true)}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-med-olive/20 text-med-ink/70 hover:bg-med-olive/5 transition"
                            >
                                <CheckSquare className="w-3.5 h-3.5" />
                                Seleccionar
                            </button>
                        )}
                    </div>
                </div>

                {displayed.length === 0 ? (
                    <p className="text-center text-sm text-med-ink/40 py-10">
                        No hay fotos que coincidan con el filtro.
                    </p>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {displayed.map((p, i) => (
                            <button
                                key={p.id}
                                onClick={() =>
                                    selectMode
                                        ? toggleSelect(p.id)
                                        : (goHero(i), window.scrollTo({ top: 0, behavior: 'smooth' }))
                                }
                                className={`relative block aspect-square rounded-lg overflow-hidden bg-med-olive/5 ${selectMode && selected.has(p.id)
                                    ? 'ring-2 ring-med-olive'
                                    : i === heroIdx
                                        ? 'ring-2 ring-med-gold'
                                        : ''
                                    }`}
                            >
                                <img
                                    src={p.url as string}
                                    alt={p.uploader || 'Foto'}
                                    loading="lazy"
                                    onError={() => handleBrokenImg(p.id)}
                                    className="w-full h-full object-cover hover:scale-105 transition"
                                />
                                {selectMode && (
                                    <span
                                        className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected.has(p.id)
                                            ? 'bg-med-olive border-med-olive text-white'
                                            : 'bg-white/70 border-white'
                                            }`}
                                    >
                                        {selected.has(p.id) && <Check className="w-3 h-3" />}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                <footer className="text-center text-[10px] uppercase tracking-[0.3em] text-med-ink/30 mt-12">
                    10 de Octubre, 2026 • Valencia
                </footer>
            </section>

            {/* Selection action bar */}
            {selectMode && (
                <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-med-olive/10 shadow-lg">
                    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-med-ink/70">
                            {selected.size} seleccionada{selected.size === 1 ? '' : 's'}
                        </span>
                        <button
                            onClick={downloadZip}
                            disabled={selected.size === 0 || zipping}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-med-olive text-white text-sm disabled:opacity-50 hover:bg-med-olive/90 transition"
                        >
                            {zipping ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            {zipping ? 'Preparando ZIP…' : 'Descargar ZIP'}
                        </button>
                    </div>
                </div>
            )}

            {/* Fullscreen lightbox */}
            {viewer !== null && displayed[viewer] && displayed[viewer].url && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
                    onClick={() => setViewer(null)}
                >
                    <div
                        className="flex items-center justify-between p-4 text-white/80"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span className="text-sm">
                            {viewer + 1} / {displayed.length}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => downloadPhoto(displayed[viewer]!)}
                                className="p-1 hover:text-white"
                                title="Descargar"
                            >
                                <Download className="w-6 h-6" />
                            </button>
                            <button
                                onClick={() => setViewer(null)}
                                className="p-1 hover:text-white"
                                title="Cerrar"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div
                        className="flex-1 flex items-center justify-center relative min-h-0 px-2"
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
                        onTouchEnd={(e) => {
                            if (touchX.current === null) return;
                            const dx = e.changedTouches[0].clientX - touchX.current;
                            if (Math.abs(dx) > 50) showAt(viewer + (dx < 0 ? 1 : -1));
                            touchX.current = null;
                        }}
                    >
                        {displayed.length > 1 && (
                            <button
                                onClick={() => showAt(viewer - 1)}
                                className="absolute left-2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                                title="Anterior"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        )}
                        <img
                            src={displayed[viewer].url as string}
                            alt={displayed[viewer].uploader || 'Foto'}
                            onError={() => handleBrokenImg(displayed[viewer]!.id)}
                            className="max-h-full max-w-full object-contain rounded"
                        />
                        {displayed.length > 1 && (
                            <button
                                onClick={() => showAt(viewer + 1)}
                                className="absolute right-2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                                title="Siguiente"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        )}
                    </div>

                    <div
                        className="p-4 text-center text-white"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-sm font-medium">
                            {displayed[viewer].uploader || 'Anónimo'}
                        </div>
                        <div className="text-xs text-white/40 mt-0.5">
                            {new Date(displayed[viewer].created_at).toLocaleString('es-ES', {
                                day: 'numeric',
                                month: 'long',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
