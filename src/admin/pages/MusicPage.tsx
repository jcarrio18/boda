import { useMemo, useState } from 'react';
import { Music, Copy, Check, Search, ExternalLink, ListMusic } from 'lucide-react';
import { useApi } from '../useApi';
import { SPOTIFY_PLAYLIST_URL } from '../config';
import type { Rsvp } from '../types';

interface SongItem {
  key: string;
  title: string;
  requester: string;
}

function spotifyEmbed(url: string): string | null {
  if (!url) return null;
  const m = url.match(/playlist[/:]([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/playlist/${m[1]}?utm_source=generator` : null;
}

export default function MusicPage() {
  const { data: rsvps, loading, error } = useApi<Rsvp[]>('/api/rsvps');
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState('');

  const songs = useMemo<SongItem[]>(() => {
    const out: SongItem[] = [];
    for (const r of rsvps ?? []) {
      if (!r.songs || !r.songs.trim()) continue;
      // Split a free-text entry into individual songs (by line breaks / ; / ,).
      const parts = r.songs
        .split(/\n|;|,/)
        .map((s) => s.trim())
        .filter(Boolean);
      parts.forEach((title, i) =>
        out.push({ key: `${r.id}-${i}`, title, requester: r.name }),
      );
    }
    return out;
  }, [rsvps]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.requester.toLowerCase().includes(q),
    );
  }, [songs, query]);

  const requesters = useMemo(
    () => new Set(songs.map((s) => s.requester)).size,
    [songs],
  );

  const copyPlaylist = async () => {
    const text = songs.map((s) => `${s.title} — (${s.requester})`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const embed = spotifyEmbed(SPOTIFY_PLAYLIST_URL);

  if (error) return <div className="p-8 text-med-terracotta">{error}</div>;
  if (loading) return <div className="p-8 text-med-ink/40">Cargando canciones…</div>;

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl text-med-ink">Canciones</h1>
          <p className="text-sm text-med-ink/50 mt-1">
            {songs.length} canciones · {requesters} invitados
          </p>
        </div>
        {songs.length > 0 && (
          <button
            onClick={copyPlaylist}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-med-olive/20 text-med-ink/70 hover:bg-med-olive/5 transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-med-olive" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar lista
              </>
            )}
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Spotify playlist */}
        <section className="bg-white rounded-xl border border-med-olive/10 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-med-olive/10">
            <ListMusic className="w-5 h-5 text-med-olive" />
            <h2 className="font-serif text-lg text-med-ink">Playlist</h2>
          </div>
          {embed ? (
            <iframe
              title="Playlist de la boda"
              src={embed}
              width="100%"
              height="420"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="block border-0"
            />
          ) : (
            <div className="px-5 py-8 text-sm text-med-ink/50">
              Aún no hay playlist configurada. Crea una playlist en Spotify (mejor
              colaborativa), copia su enlace y pégalo en{' '}
              <code className="bg-med-cream px-1 rounded">SPOTIFY_PLAYLIST_URL</code>{' '}
              (src/admin/config.ts) para verla aquí embebida.
            </div>
          )}
        </section>

        {/* Requests */}
        <section className="bg-white rounded-xl border border-med-olive/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-med-olive/10">
            <div className="flex items-center gap-2 mb-3">
              <Music className="w-5 h-5 text-med-olive" />
              <h2 className="font-serif text-lg text-med-ink">
                Peticiones ({filtered.length})
              </h2>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-med-ink/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar canción o invitado…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-med-olive/20 focus:border-med-terracotta focus:outline-none"
              />
            </div>
          </div>
          <ul className="divide-y divide-med-olive/5 max-h-[440px] overflow-auto">
            {filtered.map((s) => (
              <li
                key={s.key}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm text-med-ink truncate">{s.title}</div>
                  <div className="text-xs text-med-ink/40">— {s.requester}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`https://open.spotify.com/search/${encodeURIComponent(s.title)}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Buscar en Spotify"
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-[#1DB954]/10 text-[#1DB954] hover:bg-[#1DB954]/20 transition"
                  >
                    Spotify
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(s.title)}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Buscar en YouTube"
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-med-terracotta/10 text-med-terracotta hover:bg-med-terracotta/20 transition"
                  >
                    YouTube
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-med-ink/40">
                {songs.length === 0
                  ? 'Aún no hay peticiones de canciones.'
                  : 'Sin resultados para la búsqueda.'}
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
