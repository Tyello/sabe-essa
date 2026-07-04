/* ============================================================
   SABE ESSA? — lógica do jogo
   ============================================================ */

const WIN_CARDS = 10;      // cartas na timeline para vencer
const START_TOKENS = 2;    // fichas iniciais por jogador
const SKIP_COST = 1;       // custo para pular a música atual
const BUY_COST = 3;        // custo para comprar a carta direto

// ---------- Estado ----------
const state = {
  players: [],       // { name, timeline: [carta...ordenada], tokens }
  deck: [],          // cartas ainda não sorteadas
  discard: [],       // cartas erradas/puladas (voltam se o baralho acabar)
  turnIdx: 0,        // jogador da vez
  viewIdx: 0,        // jogador cuja timeline está visível
  current: null,     // carta em jogo (oculta)
  chosenSlot: null,  // posição escolhida na timeline
  phase: 'setup',    // setup | place | confirm | judge | result | over
  lastResult: null   // dados do último turno para exibição
};

// ---------- Atalhos DOM ----------
const $ = (id) => document.getElementById(id);
const screens = { loading: $('screen-loading'), setup: $('screen-setup'), game: $('screen-game'), win: $('screen-win') };

function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// PLAYLIST
// ============================================================
// Carrega playlist-gerada.json; se falhar (404, rede, JSON inválido),
// cai para a lista de exemplo de playlist.js com um aviso visível.
let playlist = null;

function validCard(c) {
  return c && typeof c.id_spotify === 'string' && c.id_spotify &&
    Number.isFinite(c.ano) &&
    typeof c.artista === 'string' && c.artista &&
    typeof c.titulo === 'string' && c.titulo;
}

async function initPlaylist() {
  try {
    const res = await fetch('playlist-gerada.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.cartas) || data.cartas.length === 0 || !data.cartas.every(validCard)) {
      throw new Error('estrutura de cartas inválida');
    }
    playlist = data;
  } catch (err) {
    console.warn('Falha ao carregar playlist-gerada.json — usando a playlist de demonstração.', err);
    playlist = PLAYLIST;
    $('demo-warning').classList.remove('hidden');
  }
  showScreen('setup');
}

// ============================================================
// SETUP
// ============================================================
function addPlayerInput(name = '') {
  const inputs = $('player-inputs');
  const row = el('div', 'player-row');
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 20;
  input.placeholder = `Jogador ${inputs.children.length + 1}`;
  input.value = name;
  const rm = el('button', 'btn-remove', '✕');
  rm.type = 'button';
  rm.onclick = () => {
    if (inputs.children.length > 2) row.remove();
  };
  row.append(input, rm);
  inputs.appendChild(row);
}

function startGame() {
  const names = [...$('player-inputs').querySelectorAll('input')]
    .map((i, idx) => i.value.trim() || i.placeholder || `Jogador ${idx + 1}`);

  if (names.length < 2) return;

  const minCards = names.length * (1 + WIN_CARDS); // aviso apenas; o jogo recicla o descarte
  if (playlist.cartas.length < names.length + 1) {
    alert('Playlist pequena demais para esse número de jogadores. Adicione mais músicas em playlist-gerada.json.');
    return;
  }
  if (playlist.cartas.length < minCards) {
    // segue o jogo — o descarte é reembaralhado quando o baralho acaba
    console.warn(`Playlist tem ${playlist.cartas.length} cartas; o ideal para ${names.length} jogadores seria ${minCards}+.`);
  }

  state.deck = shuffle(playlist.cartas);
  state.discard = [];
  state.players = names.map((name) => ({
    name,
    timeline: [state.deck.pop()],
    tokens: START_TOKENS
  }));
  state.turnIdx = Math.floor(Math.random() * state.players.length);
  state.lastResult = null;

  startTurn();
  showScreen('game');
}

// ============================================================
// FLUXO DO TURNO
// ============================================================
function drawCard() {
  if (state.deck.length === 0) {
    if (state.discard.length === 0) return null;
    state.deck = shuffle(state.discard);
    state.discard = [];
  }
  return state.deck.pop();
}

function startTurn() {
  const card = drawCard();
  if (!card) { endByDeckOut(); return; }
  state.current = card;
  state.chosenSlot = null;
  state.phase = 'place';
  state.viewIdx = state.turnIdx;
  loadTrack(card);
  render();
}

// ---------- Player híbrido ----------
// Prioridade: se a carta tem preview_url, toca num <audio> simples — nada
// da música (capa, título, artista) fica exposto e o preview já tem 30s.
// Fallback: Spotify iFrame API com o iframe oculto, cortada aos 30s.
// Para o jogador os dois caminhos são idênticos: mesmo botão, mesma barra.
// O autoplay continua bloqueado pelo navegador, então o primeiro play de
// cada faixa exige toque do usuário.
const PREVIEW_MS = 30000;

let spotifyApi = null;        // IFrameAPI, quando o script carregar
let spotifyController = null; // EmbedController criado pela API
let embedTrackReady = false;  // a FAIXA ATUAL já confirmou carregamento no embed
let embedLoadedId = null;     // última faixa enviada ao controller (create/loadUri)
let pendingTrackId = null;    // faixa pedida antes da API/controller existir
let creatingController = false;

let playerMode = null;        // 'audio' | 'embed' | 'failed'
let isPlaying = false;
let currentTrackId = null;    // id_spotify da carta atual (para o fallback)
let embedCutDone = false;     // já cortamos o embed aos 30s nesta faixa?
let embedFailTimer = null;

const audioEl = $('preview-audio');

window.onSpotifyIframeApiReady = (IFrameAPI) => {
  spotifyApi = IFrameAPI;
  if (pendingTrackId) {
    const id = pendingTrackId;
    pendingTrackId = null;
    createController(id);
  }
};

function createController(trackId) {
  creatingController = true;
  embedLoadedId = trackId;
  spotifyApi.createController(
    $('spotify-embed'),
    { uri: `spotify:track:${trackId}`, width: '100%', height: 80 },
    (controller) => {
      spotifyController = controller;
      creatingController = false;
      controller.addListener('ready', () => {
        // 'ready' só vale para a faixa com que o controller foi criado —
        // se outra já foi pedida via loadUri, o playback_update dela confirma
        if (embedLoadedId === currentTrackId && !embedTrackReady) {
          embedTrackReady = true;
          clearTimeout(embedFailTimer);
          if (playerMode === 'embed') setPlayUi('idle');
        }
      });
      controller.addListener('playback_update', (e) => {
        if (playerMode !== 'embed') return;
        if (!embedTrackReady) {
          // primeiro update após o loadUri desta faixa = carregou de verdade
          embedTrackReady = true;
          clearTimeout(embedFailTimer);
        }
        isPlaying = !e.data.isPaused;
        setProgress(e.data.position / PREVIEW_MS);
        if (e.data.position >= PREVIEW_MS && !embedCutDone) {
          embedCutDone = true;
          controller.pause();
        }
        setPlayUi(isPlaying ? 'playing' : 'idle');
      });
      controller.addListener('error', () => {
        if (playerMode === 'embed') playerFailed();
      });
      // faixa trocada enquanto o controller era criado
      if (pendingTrackId) {
        const id = pendingTrackId;
        pendingTrackId = null;
        embedLoadedId = id;
        embedTrackReady = false;
        controller.loadUri(`spotify:track:${id}`);
      }
    }
  );
}

function setProgress(frac) {
  const pct = Math.min(100, Math.max(0, frac * 100));
  $('play-progress-fill').style.width = `${pct}%`;
}

function setPlayUi(uiState) {
  const btn = $('btn-play');
  const label = btn.querySelector('.btn-play-label');
  btn.classList.toggle('playing', uiState === 'playing');
  btn.disabled = uiState === 'loading' || uiState === 'failed';
  label.textContent =
    uiState === 'loading' ? 'Carregando música…' :
    uiState === 'playing' ? 'Pausar música misteriosa' :
    uiState === 'failed'  ? 'Música indisponível 😢' :
                            'Tocar música misteriosa';
  $('play-hint').textContent = uiState === 'failed'
    ? 'Não deu pra carregar esta música — dá pra pular com uma ficha, ou seguir no palpite.'
    : 'O play exige um toque seu — o navegador não deixa tocar sozinho 😉';
}

function loadTrack(card) {
  stopPlayback();
  clearTimeout(embedFailTimer);
  setProgress(0);
  embedCutDone = false;
  currentTrackId = card.id_spotify;

  if (card.preview_url) {
    playerMode = 'audio';
    setPlayUi('loading');
    audioEl.src = card.preview_url;
    audioEl.load();
  } else {
    useEmbed(card.id_spotify);
  }
}

// Fallback: toca via Spotify iFrame API (também chamado quando o MP3 falha)
function useEmbed(trackId) {
  playerMode = 'embed';
  // solta o <audio> para não receber eventos atrasados da faixa anterior
  if (audioEl.getAttribute('src')) {
    audioEl.removeAttribute('src');
    audioEl.load();
  }

  // cada faixa começa "carregando" — o play só libera quando ELA confirmar
  embedTrackReady = false;
  clearTimeout(embedFailTimer);

  if (spotifyController) {
    embedLoadedId = trackId;
    spotifyController.loadUri(`spotify:track:${trackId}`);
  } else if (spotifyApi && !creatingController) {
    createController(trackId);
  } else {
    pendingTrackId = trackId; // usado assim que a API/controller existir
  }

  setPlayUi('loading');
  embedFailTimer = setTimeout(() => {
    if (playerMode === 'embed' && !embedTrackReady) playerFailed();
  }, 12000);
}

function playerFailed() {
  playerMode = 'failed';
  isPlaying = false;
  setPlayUi('failed');
}

function togglePlay() {
  if (playerMode === 'audio') {
    if (audioEl.paused) {
      if (audioEl.ended || audioEl.currentTime >= PREVIEW_MS / 1000) audioEl.currentTime = 0;
      audioEl.play().catch(() => {
        if (currentTrackId) useEmbed(currentTrackId);
        else playerFailed();
      });
    } else {
      audioEl.pause();
    }
  } else if (playerMode === 'embed' && spotifyController) {
    if (embedCutDone && !isPlaying) {
      embedCutDone = false;
      setProgress(0);
      spotifyController.seek(0);
      spotifyController.play();
    } else {
      spotifyController.togglePlay();
    }
  }
}

function stopPlayback() {
  if (!audioEl.paused) audioEl.pause();
  if (spotifyController) spotifyController.pause();
  isPlaying = false;
}

// ---- Eventos do <audio> (caminho preferencial) ----
audioEl.addEventListener('canplay', () => {
  if (playerMode !== 'audio') return;
  setPlayUi(isPlaying ? 'playing' : 'idle');
});

audioEl.addEventListener('error', () => {
  // preview quebrado/expirado → cai para o embed do Spotify
  if (playerMode !== 'audio' || !audioEl.getAttribute('src')) return;
  if (currentTrackId) useEmbed(currentTrackId);
  else playerFailed();
});

audioEl.addEventListener('play', () => {
  if (playerMode !== 'audio') return;
  isPlaying = true;
  setPlayUi('playing');
});

audioEl.addEventListener('pause', () => {
  if (playerMode !== 'audio') return;
  isPlaying = false;
  setPlayUi('idle');
});

audioEl.addEventListener('timeupdate', () => {
  if (playerMode !== 'audio') return;
  const dur = Math.min(audioEl.duration || PREVIEW_MS / 1000, PREVIEW_MS / 1000);
  setProgress(dur ? audioEl.currentTime / dur : 0);
  if (audioEl.currentTime >= PREVIEW_MS / 1000 && !audioEl.paused) audioEl.pause();
});

audioEl.addEventListener('ended', () => {
  if (playerMode !== 'audio') return;
  setProgress(1);
});

function activePlayer() { return state.players[state.turnIdx]; }
function viewedPlayer() { return state.players[state.viewIdx]; }

// Posição correta? O ano da carta deve caber entre os vizinhos (empate conta como acerto)
function slotFits(timeline, slot, year) {
  const left = slot > 0 ? timeline[slot - 1].ano : -Infinity;
  const right = slot < timeline.length ? timeline[slot].ano : Infinity;
  return year >= left && year <= right;
}

// Encontra uma posição correta (para a compra com fichas)
function correctSlot(timeline, year) {
  let i = 0;
  while (i < timeline.length && timeline[i].ano < year) i++;
  return i;
}

function chooseSlot(slot) {
  if (state.phase !== 'place') return;
  state.chosenSlot = slot;
  state.phase = 'confirm';
  state.viewIdx = state.turnIdx;
  render();
}

function cancelSlot() {
  state.chosenSlot = null;
  state.phase = 'place';
  render();
}

function startBonus() {
  state.phase = 'judge';
  state.viewIdx = state.turnIdx;
  render();
}

function resolveBonus(won) {
  if (won) activePlayer().tokens += 1;
  reveal(won ? 'bonus-ok' : 'bonus-fail');
}

function reveal(bonusOutcome = null) {
  state.viewIdx = state.turnIdx;
  const p = activePlayer();
  const card = state.current;
  const fits = slotFits(p.timeline, state.chosenSlot, card.ano);

  if (fits) {
    p.timeline.splice(state.chosenSlot, 0, card);
  } else {
    state.discard.push(card);
  }

  state.lastResult = { card, fits, bonusOutcome, playerName: p.name, bought: false };
  state.current = null;
  state.phase = 'result';
  stopPlayback();

  if (p.timeline.length >= WIN_CARDS) { win(p); return; }
  render();
}

function skipCard() {
  const p = activePlayer();
  if (p.tokens < SKIP_COST || state.phase !== 'place') return;
  p.tokens -= SKIP_COST;
  state.discard.push(state.current);
  const card = drawCard();
  if (!card) { endByDeckOut(); return; }
  state.current = card;
  state.chosenSlot = null;
  loadTrack(card);
  render();
}

function buyCard() {
  const p = activePlayer();
  if (p.tokens < BUY_COST || state.phase !== 'place') return;
  state.viewIdx = state.turnIdx;
  p.tokens -= BUY_COST;
  const card = state.current;
  p.timeline.splice(correctSlot(p.timeline, card.ano), 0, card);
  state.lastResult = { card, fits: true, bonusOutcome: null, playerName: p.name, bought: true };
  state.current = null;
  state.phase = 'result';
  stopPlayback();
  if (p.timeline.length >= WIN_CARDS) { win(p); return; }
  render();
}

function nextTurn() {
  state.turnIdx = (state.turnIdx + 1) % state.players.length;
  startTurn();
}

const CONFETTI_MS = 6000; // depois disso os pedaços saem do DOM (bateria/CPU)
let confettiTimer = null;

function launchConfetti() {
  const holder = $('confetti');
  holder.innerHTML = '';
  clearTimeout(confettiTimer);
  const colors = ['#ff2e7e', '#22e0c9', '#ffc53d', '#8b5cf6', '#f7f4ff'];
  for (let i = 0; i < 60; i++) {
    const piece = el('span', 'confetti-piece');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 2.5}s`;
    piece.style.animationDuration = `${2.6 + Math.random() * 2}s`;
    piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 160}px`);
    piece.style.setProperty('--spin', `${540 + Math.random() * 540}deg`);
    holder.appendChild(piece);
  }
  confettiTimer = setTimeout(() => { holder.innerHTML = ''; }, CONFETTI_MS);
}

function win(player) {
  state.phase = 'over';
  launchConfetti();
  $('win-title').textContent = `${player.name} venceu!`;
  $('win-sub').innerHTML = `Completou <strong>${player.timeline.length} cartas</strong> na linha do tempo 🎉`;
  const wt = $('win-timeline');
  wt.innerHTML = '';
  player.timeline.forEach((c) => wt.appendChild(cardEl(c)));
  showScreen('win');
}

function endByDeckOut() {
  // Sem cartas restantes: vence quem tiver a maior timeline
  stopPlayback();
  launchConfetti();
  const best = [...state.players].sort((a, b) => b.timeline.length - a.timeline.length)[0];
  $('win-title').textContent = `${best.name} venceu!`;
  $('win-sub').innerHTML = `As músicas acabaram — maior linha do tempo, com <strong>${best.timeline.length} cartas</strong> 🎶`;
  const wt = $('win-timeline');
  wt.innerHTML = '';
  best.timeline.forEach((c) => wt.appendChild(cardEl(c)));
  state.phase = 'over';
  showScreen('win');
}

// ============================================================
// RENDERIZAÇÃO
// ============================================================
function render() {
  renderTabs();
  renderPlayerInfo();
  renderMusicArea();
  renderStatus();
  renderTimeline();
  renderActions();
  $('deck-info').textContent =
    `Baralho: ${state.deck.length} 🎴 · Descarte: ${state.discard.length} · Meta: ${WIN_CARDS} cartas`;
}

function renderTabs() {
  const tabs = $('player-tabs');
  tabs.innerHTML = '';
  state.players.forEach((p, i) => {
    const t = el('button', 'ptab',
      `${escapeHtml(p.name)} <span class="score">${p.timeline.length}🎴 ${p.tokens}🪙</span>`);
    if (i === state.viewIdx) t.classList.add('viewing');
    if (i === state.turnIdx) t.classList.add('active-turn');
    t.onclick = () => { state.viewIdx = i; render(); };
    tabs.appendChild(t);
  });
}

function renderPlayerInfo() {
  const p = viewedPlayer();
  const isTurn = state.viewIdx === state.turnIdx;
  $('player-info').innerHTML = `
    <span class="pname">${escapeHtml(p.name)} ${isTurn ? '· 🎯 na vez' : ''}</span>
    <span class="tokens">🪙 ${p.tokens} ficha${p.tokens === 1 ? '' : 's'}</span>`;
}

function renderMusicArea() {
  const inTurnPhase = ['place', 'confirm', 'judge'].includes(state.phase);
  $('music-area').classList.toggle('hidden', !inTurnPhase);
}

function renderStatus() {
  const s = $('status');
  const p = activePlayer();

  if (state.phase === 'place') {
    s.innerHTML = state.viewIdx === state.turnIdx
      ? `🎧 Ouça e toque num espaço <strong>＋</strong> da linha do tempo de <strong>${escapeHtml(p.name)}</strong>`
      : `Vez de <strong>${escapeHtml(p.name)}</strong> — volte para a aba dele para jogar`;
    return;
  }

  if (state.phase === 'confirm') {
    s.innerHTML = `📍 Posição escolhida. Revelar, ou tentar o bônus antes?`;
    return;
  }

  if (state.phase === 'judge') {
    s.innerHTML = `🎤 <span class="bonus"><strong>${escapeHtml(p.name)}</strong>, diga o artista e o título em voz alta!</span><br>Os outros julgam se acertou os dois.`;
    return;
  }

  if (state.phase === 'result' && state.lastResult) {
    const r = state.lastResult;
    const bonusMsg =
      r.bonusOutcome === 'bonus-ok' ? `<br><span class="bonus">🎤 Bônus: +1 ficha!</span>` :
      r.bonusOutcome === 'bonus-fail' ? `<br><span class="bad">🎤 Bônus perdido…</span>` : '';
    const main = r.bought
      ? `<span class="big ok">🪙 Carta comprada!</span>`
      : r.fits
        ? `<span class="big ok">✅ Acertou!</span>`
        : `<span class="big bad">❌ Errou a posição!</span>`;
    s.innerHTML = `${main}<br><strong>${escapeHtml(r.card.titulo)}</strong> — ${escapeHtml(r.card.artista)} · <strong>${r.card.ano}</strong>${bonusMsg}`;
    return;
  }

  s.innerHTML = '';
}

function cardEl(c, extraCls = '') {
  const d = el('div', `tcard ${extraCls}`);
  d.innerHTML = `
    <div class="year">${c.ano}</div>
    <div>
      <div class="artist">${escapeHtml(c.artista)}</div>
      <div class="title">${escapeHtml(c.titulo)}</div>
    </div>`;
  return d;
}

function renderTimeline() {
  const tl = $('timeline');
  tl.innerHTML = '';
  const p = viewedPlayer();
  const placing = ['place', 'confirm'].includes(state.phase) && state.viewIdx === state.turnIdx;
  const justWonId = state.phase === 'result' && state.lastResult?.fits ? state.lastResult.card.id_spotify : null;

  if (placing) {
    for (let i = 0; i <= p.timeline.length; i++) {
      const slot = el('button', 'slot', '＋');
      if (state.phase === 'confirm' && state.chosenSlot === i) slot.classList.add('chosen');
      slot.onclick = () => chooseSlot(i);
      tl.appendChild(slot);
      if (i < p.timeline.length) tl.appendChild(cardEl(p.timeline[i]));
    }
    // centraliza a timeline na tela
    requestAnimationFrame(() => { tl.scrollLeft = (tl.scrollWidth - tl.clientWidth) / 2; });
  } else {
    if (p.timeline.length === 0) {
      tl.appendChild(el('div', 'timeline-empty', 'Nenhuma carta ainda.'));
    }
    p.timeline.forEach((c) => {
      tl.appendChild(cardEl(c, c.id_spotify === justWonId && state.viewIdx === state.turnIdx ? 'just-won' : ''));
    });
  }
}

function renderActions() {
  const a = $('actions');
  a.innerHTML = '';
  const p = activePlayer();

  if (state.phase === 'place') {
    if (state.viewIdx !== state.turnIdx) {
      const back = el('button', 'btn btn-primary', `Voltar para a vez de ${escapeHtml(p.name)}`);
      back.onclick = () => { state.viewIdx = state.turnIdx; render(); };
      a.appendChild(back);
      return;
    }
    const row = el('div', 'row');
    const skip = el('button', 'btn', `⏭️ Pular (${SKIP_COST}🪙)`);
    skip.disabled = p.tokens < SKIP_COST;
    skip.onclick = skipCard;
    const buy = el('button', 'btn btn-warn', `🛒 Comprar carta (${BUY_COST}🪙)`);
    buy.disabled = p.tokens < BUY_COST;
    buy.onclick = buyCard;
    row.append(skip, buy);
    a.appendChild(row);
    a.appendChild(el('div', 'hint', 'Toque num ＋ na linha do tempo para escolher a posição'));
    return;
  }

  if (state.phase === 'confirm') {
    const bonus = el('button', 'btn btn-warn', '🎤 Bônus: sei o artista e o título! (+1🪙)');
    bonus.onclick = startBonus;
    const revealBtn = el('button', 'btn btn-primary btn-big', '👁️ Revelar carta');
    revealBtn.onclick = () => reveal();
    const back = el('button', 'btn btn-ghost', '↩️ Mudar posição');
    back.onclick = cancelSlot;
    a.append(bonus, revealBtn, back);
    return;
  }

  if (state.phase === 'judge') {
    const row = el('div', 'row');
    const ok = el('button', 'btn btn-primary', '✅ Acertou');
    ok.onclick = () => resolveBonus(true);
    const nope = el('button', 'btn btn-danger', '❌ Errou');
    nope.onclick = () => resolveBonus(false);
    row.append(ok, nope);
    a.appendChild(row);
    return;
  }

  if (state.phase === 'result') {
    const nextP = state.players[(state.turnIdx + 1) % state.players.length];
    const next = el('button', 'btn btn-primary btn-big', `▶️ Próximo: ${escapeHtml(nextP.name)}`);
    next.onclick = nextTurn;
    a.appendChild(next);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
$('btn-add-player').onclick = () => addPlayerInput();
$('btn-start').onclick = startGame;
$('btn-play').onclick = togglePlay;
$('btn-restart').onclick = () => location.reload();
$('btn-restart-game').onclick = () => {
  if (confirm('Reiniciar o jogo? O progresso atual será perdido.')) location.reload();
};

addPlayerInput();
addPlayerInput();
initPlaylist();
