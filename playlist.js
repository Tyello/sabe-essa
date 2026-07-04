// ============================================================
// SABE ESSA? — Dados da playlist
// ============================================================
// Para trocar as músicas, edite apenas este arquivo.
//
// Como obter o id_spotify de uma faixa:
//   1. No Spotify, clique em "..." > Compartilhar > Copiar link da música
//   2. O link tem o formato: https://open.spotify.com/track/XXXXXXXXXXXX
//   3. O trecho XXXXXXXXXXXX é o id_spotify
//
// preview_url (opcional): link direto para um MP3 de ~30s da música.
//   Quando presente, o jogo toca esse arquivo num <audio> simples
//   (mais leve e sem nenhuma UI do Spotify). Quando null — ou se a
//   URL falhar/expirar — o jogo cai automaticamente para o embed
//   oculto do Spotify usando o id_spotify.
//
// ATENÇÃO: os IDs abaixo são exemplos e podem estar desatualizados.
// Verifique cada um abrindo https://open.spotify.com/track/{id}
// antes de jogar de verdade.
// ============================================================

const PLAYLIST = {
  nome: "Clássicos de Todas as Décadas",
  cartas: [
    { id_spotify: "40riOy7x9W7GXjyGp4pjAv", preview_url: null, ano: 1976, artista: "Eagles", titulo: "Hotel California" },
    { id_spotify: "4u7EnebtmKWzUH433cf5Qv", preview_url: null, ano: 1975, artista: "Queen", titulo: "Bohemian Rhapsody" },
    { id_spotify: "0GjEhVFGZW8afUYGChu3Rr", preview_url: null, ano: 1976, artista: "ABBA", titulo: "Dancing Queen" },
    { id_spotify: "5ChkMS8OtdzJeqyybCc9R5", preview_url: null, ano: 1982, artista: "Michael Jackson", titulo: "Billie Jean" },
    { id_spotify: "2WfaOiMkCvy7F5fcp2zZ8L", preview_url: null, ano: 1985, artista: "a-ha", titulo: "Take On Me" },
    { id_spotify: "7o2CTH4ctstm8TNelqjb51", preview_url: null, ano: 1987, artista: "Guns N' Roses", titulo: "Sweet Child O' Mine" },
    { id_spotify: "5ghIJDpPoe3CfHMGu71E6T", preview_url: null, ano: 1991, artista: "Nirvana", titulo: "Smells Like Teen Spirit" },
    { id_spotify: "4eHbdreAnSOrDDsFfc4Fpm", preview_url: null, ano: 1992, artista: "Whitney Houston", titulo: "I Will Always Love You" },
    { id_spotify: "5Z01UMMf7V1o0MzF86s6WJ", preview_url: null, ano: 2002, artista: "Eminem", titulo: "Lose Yourself" },
    { id_spotify: "6I9VzXrHxO9rA9A5euc8Ak", preview_url: null, ano: 2003, artista: "Britney Spears", titulo: "Toxic" },
    { id_spotify: "3dPQuX8Gs42Y7b454ybpMR", preview_url: null, ano: 2003, artista: "The White Stripes", titulo: "Seven Nation Army" },
    { id_spotify: "4OSBTYWVwsQhGLF9NHvIbR", preview_url: null, ano: 2010, artista: "Adele", titulo: "Rolling in the Deep" },
    { id_spotify: "4wCmqSrbyCgxEXROQE6vtV", preview_url: null, ano: 2011, artista: "Gotye", titulo: "Somebody That I Used to Know" },
    { id_spotify: "2Foc5Q5nqNiosCNqttzHof", preview_url: null, ano: 2013, artista: "Daft Punk", titulo: "Get Lucky" },
    { id_spotify: "32OlwWuMpZ6b0aN2RZOeMS", preview_url: null, ano: 2014, artista: "Mark Ronson ft. Bruno Mars", titulo: "Uptown Funk" },
    { id_spotify: "7qiZfU4dY1lWllzX7mPBI3", preview_url: null, ano: 2017, artista: "Ed Sheeran", titulo: "Shape of You" },
    { id_spotify: "6habFhsOp2NvshLv26DqMb", preview_url: null, ano: 2017, artista: "Luis Fonsi ft. Daddy Yankee", titulo: "Despacito" },
    { id_spotify: "0VjIjW4GlUZAMYd2vXMi3b", preview_url: null, ano: 2019, artista: "The Weeknd", titulo: "Blinding Lights" }
  ]
};
