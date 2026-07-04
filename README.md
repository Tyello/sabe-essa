# 🎵 Sabe Essa?

Recriação digital do jogo de tabuleiro **Hitster**, para jogar em grupo com **um único dispositivo** passado de mão em mão. 100% estático — sem backend, sem API keys, sem build.

## Como jogar

1. Cadastre 2+ jogadores (ou times). Cada um começa com **1 carta revelada** e **2 fichas**.
2. Na sua vez, uma música misteriosa toca via Spotify (sem mostrar ano, artista ou título).
3. Toque num espaço **＋** da sua linha do tempo para dizer **onde a música se encaixa cronologicamente**.
4. **Bônus opcional:** antes de revelar, diga artista + título em voz alta — os outros jogadores julgam. Acertou os dois? **+1 ficha**.
5. Revele: se o ano couber entre os vizinhos escolhidos, a carta é sua; senão, vai pro descarte.
6. **Fichas:** gaste **1** para pular a música atual ou **3** para comprar a carta direto (entra na posição correta).
7. Vence quem completar **10 cartas** na linha do tempo.

## Estrutura

```
index.html    → marcação das telas (setup, jogo, vitória)
style.css     → estilos (mobile-first, tema escuro)
game.js       → toda a lógica do jogo
playlist.js   → ⭐ dados das músicas (edite este arquivo!)
```

## Editando a playlist

Abra `playlist.js` e edite a lista `cartas`. Cada carta precisa de:

```js
{ id_spotify: "4u7EnebtmKWzUH433cf5Qv", ano: 1975, artista: "Queen", titulo: "Bohemian Rhapsody" }
```

Para obter o `id_spotify`: no Spotify, **⋯ → Compartilhar → Copiar link da música**. O link tem o formato `https://open.spotify.com/track/XXXX...` — o trecho final é o ID.

> ⚠️ Os 18 IDs incluídos são exemplos e **devem ser verificados** antes de jogar de verdade: abra `https://open.spotify.com/track/{id}` no navegador e confira se toca a música certa. Dica: quanto mais músicas, melhor — o ideal é ter pelo menos `jogadores × 11` cartas (mas o jogo reembaralha o descarte se o baralho acabar).

## Como o áudio funciona (e suas limitações)

O jogo usa a **Spotify iFrame API** (`https://open.spotify.com/embed/iframe-api/v1`) — nenhuma credencial, OAuth ou chamada de API REST é necessária.

- O player do Spotify (que exibiria capa/título/artista e estragaria o jogo) fica **totalmente oculto** num container com `height: 0; overflow: hidden` (`.embed-holder` em `style.css`). Nenhuma parte da UI do Spotify aparece na tela.
- O áudio é controlado por um **botão próprio** ("▶️ Tocar música misteriosa") que chama `controller.togglePlay()`. A troca de faixa usa `controller.loadUri()` no mesmo controller, sem recriar o iframe.
- **Sem login no Spotify**, o embed toca uma **prévia de ~30 segundos** — suficiente para o jogo. Logado (no navegador), pode tocar a faixa inteira.
- O play **não é automático** (restrição de autoplay dos navegadores): o jogador da vez aperta o botão.

## Rodando localmente

Basta abrir `index.html` no navegador (funciona via `file://`). Se preferir um servidor local:

```bash
npx serve .
# ou
python -m http.server 8000
```

## Deploy no GitHub Pages

1. Crie um repositório no GitHub e envie os arquivos:
   ```bash
   git init
   git add .
   git commit -m "Sabe Essa?"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/sabe-essa.git
   git push -u origin main
   ```
2. No repositório: **Settings → Pages**.
3. Em **Source**, escolha **Deploy from a branch**; selecione a branch `main` e a pasta `/ (root)`. Salve.
4. Em ~1 minuto o jogo estará em `https://SEU_USUARIO.github.io/sabe-essa/`.

Para atualizar (trocar a playlist, por exemplo): edite `playlist.js`, commit e push — o Pages republica sozinho.

## Deploy no Cloudflare Pages

**Opção A — sem Git (mais rápida):**
1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Upload assets**.
2. Dê um nome ao projeto e arraste a pasta do jogo (ou os arquivos).
3. Pronto: `https://SEU-PROJETO.pages.dev`.

**Opção B — conectada ao Git (republica a cada push):**
1. **Workers & Pages → Create → Pages → Connect to Git** e selecione o repositório.
2. Configuração de build:
   - **Framework preset:** `None`
   - **Build command:** *(vazio)*
   - **Build output directory:** `/`
3. **Save and Deploy**.

## Ajustes rápidos

Constantes no topo de `game.js`:

```js
const WIN_CARDS = 10;      // cartas para vencer
const START_TOKENS = 2;    // fichas iniciais
const SKIP_COST = 1;       // custo de pular
const BUY_COST = 3;        // custo de comprar carta
```
