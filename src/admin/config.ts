// Cifras de referencia extraídas del Excel de planificación (Calculos.xlsx).
// Ajústalas aquí cuando cambien las previsiones.

// Total de invitados contando todos los extras (columna "Adultos" + "Niños"
// de las hojas Invitados Cris e Invitados Joan):
//   Cris  79 adultos +  7 niños =  86
//   Joan 108 adultos +  6 niños = 114
//   TOTAL 187 adultos + 13 niños = 200
export const EXPECTED_ADULTS = 187;
export const EXPECTED_CHILDREN = 13;
export const EXPECTED_GUESTS = EXPECTED_ADULTS + EXPECTED_CHILDREN; // 200

// Estimación "rebajada" del Excel (asumiendo bajas): Cris 75 + Joan 103 = 178.
export const EXPECTED_GUESTS_LOW = 178;

// Fecha de la boda (para la cuenta atrás del Resumen).
export const WEDDING_DATE = '2026-10-10';

// Playlist de Spotify (colaborativa) para la pestaña de Canciones. Opcional:
// pega la URL de la playlist (open.spotify.com/playlist/...) y se mostrará embebida.
export const SPOTIFY_PLAYLIST_URL = 'https://open.spotify.com/playlist/0hS5lwm0RZeoSEPEvXr26g';
