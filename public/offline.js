/* Top 100 — modo offline (passa-o-celular)
 * Roda 100% no navegador, com as regras de /shared/offline-rules.js e o mesmo reconhecimento
 * de titulos do online. Visual e pecas (regua, ingressos, podio) iguais ao modo online.
 * Ver docs/adr/0004 e 0007.
 */
import { makeRoom, addPlayer, startRound, submitAnswer, revealRound, ranking, endGame, oneMoreRound, suddenDeathResult, isLastRound, clampRounds, tiedForFirst, MAX_PLAYERS, MIN_ROUNDS, MAX_ROUNDS, DEFAULT_ROUNDS, DEFAULT_GAME_MODE } from '/shared/offline-rules.js';
import { AVATARS, COLORS } from '/shared/look.js';
import { categoryUi, fillText, ratingScore, categoryTitle } from '/shared/category-ui.js';

const $app = document.getElementById('app');
const $toasts = document.getElementById('toasts');

const REVEAL_STEP_MS = 700;
const NAME_MAX = 16;
const STANDALONE = Array.isArray(window.TOP100_CATEGORIES); // build de arquivo unico, sem servidor

let categories = []; // todas as categorias, com os itens
let category = null; // a escolhida para a partida
let roster = []; // jogadores cadastrados: { name, avatar, color }
let room = null;
let turn = 0; // indice do jogador da vez na rodada
let screen = 'home';
let lastIntroCategory = null; // a explicacao aparece de novo so quando a categoria muda
let ratings = {}; // votos somados { idDaCategoria: { up, down } } (servidor + este aparelho)
let surprise = false; // a partida veio do botao "categoria aleatoria"
let voted = false; // ja votou nesta partida
let suddenDeath = null; // rodada de morte subita em andamento: { pos, name, pt } a superar
let categoryPicked = false; // a etapa "Partida" so libera depois de escolher a categoria
let maxRounds = DEFAULT_ROUNDS; // escolhido na tela de rodadas; fica para as proximas partidas
let gameMode = DEFAULT_GAME_MODE; // 'classic' (soma posicoes) | 'target' (alvo sorteado), ADR-0016

// ---------- avaliacao das categorias ----------
const LOCAL_VOTES_KEY = 'top100:votos';
function readLocalVotes() {
  try { return JSON.parse(localStorage.getItem(LOCAL_VOTES_KEY)) || {}; } catch { return {}; }
}
function sendVote(vote) {
  const local = readLocalVotes();
  const entry = (local[category.id] ??= { up: 0, down: 0 });
  entry[vote] += 1;
  try { localStorage.setItem(LOCAL_VOTES_KEY, JSON.stringify(local)); } catch { /* sem armazenamento: segue */ }
  const shown = (ratings[category.id] ??= { up: 0, down: 0 });
  shown[vote] += 1;
  if (!STANDALONE) {
    fetch('/api/ratings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: category.id, vote }),
    }).catch(() => {}); // sem rede: o voto fica so neste aparelho
  }
}
const isValidated = (c) => c.status === 'validada';
const animatedReveals = new Set();

// ---------- helpers de DOM ----------
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') { for (const [sk, sv] of Object.entries(v)) if (sv != null) el.style.setProperty(sk, sv); }
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

function avatarEl(p, size) {
  return h('span', { class: 'avatar', style: { '--c': p.color, '--s': size ? size + 'px' : null }, 'aria-hidden': 'true' }, p.avatar);
}

/** Selo TOP 100 (mini da arte do topo) + nome da categoria sem o "Top 100" repetido. */
function catLabel(c) {
  return h('span', { class: 'cat-label' }, h('span', { class: 'tag100' }, 'TOP 100'), ' ', categoryTitle(c.name));
}

function toast(message, kind = 'error') {
  const el = h('div', { class: `toast toast--${kind}`, role: kind === 'error' ? 'alert' : 'status' }, message);
  $toasts.append(el);
  setTimeout(() => el.remove(), 3800);
}

function formatDate(iso) {
  const [y, m, d] = String(iso).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const currentPlayer = () => room.players[turn];

function go(next) {
  screen = next;
  render();
  window.scrollTo(0, 0);
}

const SETUP_SCREENS = new Set(['home', 'players', 'category', 'rounds']);

function render() {
  const view = {
    home: renderHome, players: renderPlayers, category: renderCategory, rounds: renderRounds,
    intro: renderIntro, pass: renderPass, answer: renderAnswer, reveal: renderReveal, final: renderFinal,
  }[screen];
  $app.replaceChildren(...[SETUP_SCREENS.has(screen) ? null : topbar(), view()].filter(Boolean));
}

/** Sai da partida para uma tela de preparo. Só pede confirmação se há pontos a perder. */
function leaveMatch(next) {
  const inProgress = room && room.roundNumber > 0 && room.phase !== 'ended';
  if (inProgress && !confirm('Sair da partida? A pontuação desta partida será perdida.')) return;
  room = null;
  suddenDeath = null;
  lastIntroCategory = null; // ao voltar, a explicação aparece de novo
  go(next);
}

function topbar() {
  return h('header', { class: 'topbar' },
    h('button', { class: 'brand', type: 'button', 'aria-label': 'Voltar ao início', onclick: () => leaveMatch('home') },
      'TOP 100', h('small', null, categoryTitle(category.name))),
    h('div', { class: 'code-chip' },
      h('span', null, h('b', null, 'OFFLINE')),
      h('button', { class: 'btn btn--ghost btn--small', style: { color: 'var(--tinta)' }, onclick: () => leaveMatch('category') }, 'Sair'),
    ),
  );
}

/** Indicador "1 · 2 · 3" das etapas de preparo. */
/** Indicador "1 · 2 · 3 · 4" das etapas de preparo. Cada etapa já liberada é clicável. */
function steps(current) {
  const list = [
    { label: 'Modo', screen: 'home', ready: true },
    { label: 'Jogadores', screen: 'players', ready: true },
    { label: 'Categoria', screen: 'category', ready: roster.length > 0 },
    { label: 'Partida', screen: 'rounds', ready: roster.length > 0 && categoryPicked },
  ];
  return h('ol', { class: 'steps', 'aria-label': 'Etapas' },
    list.map((s, i) => {
      const n = i + 1;
      const state = n === current ? 'is-current' : n < current ? 'is-done' : null;
      const content = [h('span', { class: 'n' }, n), h('span', { class: 'lbl' }, s.label)];
      return h('li', { class: state, 'aria-current': n === current ? 'step' : null },
        n !== current && s.ready
          ? h('button', { type: 'button', class: 'step-link', 'aria-label': `Ir para ${s.label}`, onclick: () => go(s.screen) }, content)
          : content);
    }),
  );
}

// ============================================================
// 1) INICIO: online ou offline
// ============================================================
function renderHome() {
  return h('section', { class: 'home' },
    h('div', { class: 'marquee' },
      h('h1', null, 'TOP 100'),
      h('p', null, 'Chegue o mais perto possível do fundo da lista.'),
    ),
    steps(1),
    h('div', { class: 'mode-list' },
      h('button', { class: 'mode-card', type: 'button', onclick: () => go('players') },
        h('span', { class: 'mode-icon', 'aria-hidden': 'true' }, '📱'),
        h('span', { class: 'mode-text' }, h('strong', null, 'Num celular só'), h('small', null, 'O aparelho passa de mão em mão. Funciona sem internet.')),
      ),
      h('button', { class: 'mode-card', type: 'button', disabled: true, 'aria-describedby': 'online-soon' },
        h('span', { class: 'mode-icon', 'aria-hidden': 'true' }, '🌐'),
        h('span', { class: 'mode-text' }, h('strong', null, 'Cada um no seu celular'), h('small', { id: 'online-soon' }, 'Em breve.')),
      ),
    ),
  );
}

// ============================================================
// 2) JOGADORES
// ============================================================
function renderPlayers() {
  const used = new Set(roster.map((p) => p.avatar));
  const look = { avatar: pick(AVATARS.filter((a) => !used.has(a))) || pick(AVATARS), color: COLORS[roster.length % COLORS.length] };

  const preview = h('div', { class: 'me-preview' });
  const nameInput = h('input', { class: 'input', id: 'name', maxlength: String(NAME_MAX), autocomplete: 'off', placeholder: 'Nome de quem vai jogar' });
  const paint = () => preview.replaceChildren(avatarEl(look, 56), h('strong', null, nameInput.value.trim() || 'Novo jogador'));
  nameInput.addEventListener('input', paint);

  const avatarButtons = AVATARS.map((a) => h('button', {
    type: 'button', 'aria-label': `Personagem ${a}`, 'aria-pressed': String(a === look.avatar),
    onclick: (e) => {
      look.avatar = a;
      avatarButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
      paint();
    },
  }, a));
  const colorNames = ['Vermelho', 'Amarelo', 'Verde-água', 'Roxo', 'Laranja', 'Azul', 'Rosa', 'Verde'];
  const colorButtons = COLORS.map((c, i) => h('button', {
    type: 'button', style: { '--c': c }, 'aria-label': `Cor ${colorNames[i] || c}`, 'aria-pressed': String(c === look.color),
    onclick: (e) => {
      look.color = c;
      colorButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
      paint();
    },
  }));

  function add() {
    const name = nameInput.value.replace(/\s+/g, ' ').trim();
    if (!name) { toast('Digite o nome do jogador.'); nameInput.focus(); return; }
    if (roster.length >= MAX_PLAYERS) { toast(`Máximo de ${MAX_PLAYERS} jogadores.`); return; }
    if (roster.some((p) => p.name.toLowerCase() === name.toLowerCase())) { toast('Já tem alguém com esse nome.'); return; }
    roster.push({ name, avatar: look.avatar, color: look.color });
    render();
    document.getElementById('name')?.focus();
  }
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });

  const cards = roster.map((p, i) => h('div', { class: 'player-card' },
    h('button', {
      class: 'remove', type: 'button', 'aria-label': `Remover ${p.name}`,
      onclick: () => { roster.splice(i, 1); render(); },
    }, '×'),
    avatarEl(p, 64),
    h('span', { class: 'name' }, p.name),
    h('span', { class: 'tag' }, `${i + 1}º a jogar`),
  ));
  if (roster.length < 2) cards.push(h('div', { class: 'player-card player-card--empty' }, h('span', null, roster.length ? 'Falta 1 jogador' : 'Ninguém ainda')));

  paint();
  return h('section', { class: 'home' },
    steps(2),
    h('div', { class: 'panel' },
      preview,
      h('div', { class: 'field' }, h('label', { for: 'name' }, 'Nome'), nameInput),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Personagem'), h('div', { class: 'picker' }, avatarButtons)),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Cor'), h('div', { class: 'swatches' }, colorButtons)),
      h('button', { class: 'btn btn--ghost btn--block', onclick: add }, '+ Adicionar jogador'),
    ),
    h('div', { class: 'panel' },
      h('h2', null, `Jogadores (${roster.length}/${MAX_PLAYERS})`),
      h('div', { class: 'players' }, cards),
    ),
    h('div', { class: 'step-actions' },
      h('button', { class: 'btn btn--ghost', onclick: () => go('home') }, 'Voltar'),
      h('button', {
        class: 'btn', disabled: roster.length < 1 ? true : null,
        onclick: () => { if (!roster.length) { toast('Adicione pelo menos 1 jogador.'); return; } go('category'); },
      }, 'Escolher categoria'),
    ),
  );
}

// ============================================================
// 3) CATEGORIA
// ============================================================
function renderCategory() {
  const choose = (c, fromRandom = false) => { category = c; surprise = fromRandom; categoryPicked = true; go('rounds'); };
  const card = (c) => {
    const r = ratings[c.id];
    const votes = r && r.up + r.down ? `👍 ${r.up} · 👎 ${r.down}` : 'Ainda sem votos';
    return h('button', { class: 'category-card', type: 'button', role: 'listitem', onclick: () => choose(c) },
      h('strong', null, catLabel(c)),
      h('small', null, `Lista de ${formatDate(c.snapshot.date)}${isValidated(c) ? '' : ` · ${votes}`}`),
    );
  };
  const validated = categories.filter(isValidated);
  // experimentais: as mais bem avaliadas primeiro
  const experimental = categories.filter((c) => !isValidated(c))
    .sort((x, y) => ratingScore(ratings[y.id]) - ratingScore(ratings[x.id]));
  const random = () => {
    const pool = categories.length > 1 ? categories.filter((c) => c.id !== category?.id) : categories;
    choose(pick(pool), true);
  };

  return h('section', { class: 'home' },
    steps(3),
    h('p', { class: 'hint category-players' }, `${roster.length} ${roster.length === 1 ? 'jogador' : 'jogadores'}: ${roster.map((p) => p.name).join(', ')}`),
    h('button', { class: 'mode-card random-card', type: 'button', onclick: random },
      h('span', { class: 'mode-icon', 'aria-hidden': 'true' }, '🎲'),
      h('span', { class: 'mode-text' }, h('strong', null, 'Categoria aleatória'), h('small', null, 'Uma surpresa. No fim, conte se foi divertida.')),
    ),
    validated.length
      ? h('div', { class: 'panel' },
          h('h2', { id: 'validadas-label' }, '⭐ Validadas'),
          h('div', { class: 'category-cards', role: 'list', 'aria-labelledby': 'validadas-label' }, validated.map(card)),
        )
      : null,
    experimental.length
      ? h('div', { class: 'panel' },
          h('h2', { id: 'experimentais-label' }, '🧪 Experimentais'),
          h('p', { class: 'hint' }, 'Categorias em teste. As mais bem avaliadas sobem na lista.'),
          h('div', { class: 'category-cards', role: 'list', 'aria-labelledby': 'experimentais-label' }, experimental.map(card)),
        )
      : null,
    h('div', { class: 'step-actions' },
      h('button', { class: 'btn btn--ghost', onclick: () => go('players') }, 'Trocar jogadores'),
    ),
  );
}

/** Pergunta do fim da partida: a categoria foi divertida? */
function ratingCard() {
  const box = h('div', { class: 'panel rating-card' + (surprise ? ' rating-card--surprise' : '') });
  const ask = () => box.replaceChildren(
    h('h2', null, surprise ? 'Categoria surpresa: ' : null, catLabel(category)),
    h('p', null, 'Essa categoria foi divertida?'),
    h('div', { class: 'rating-actions' },
      h('button', { class: 'btn', type: 'button', onclick: () => vote('up') }, '👍 Foi'),
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => vote('down') }, '👎 Não muito'),
    ),
  );
  const thanks = () => box.replaceChildren(h('p', { class: 'rating-thanks', role: 'status' }, 'Valeu! Seu voto ajuda a escolher as próximas categorias.'));
  function vote(v) { voted = true; sendVote(v); thanks(); }
  if (voted) thanks(); else ask();
  return box;
}

// ============================================================
// 4) NUMERO DE RODADAS
// ============================================================
function renderRounds() {
  const value = h('output', { class: 'rounds-value', for: 'rounds-range rounds-number', 'aria-live': 'polite' });
  const range = h('input', { type: 'range', id: 'rounds-range', class: 'rounds-range', min: MIN_ROUNDS, max: MAX_ROUNDS, step: 1, value: maxRounds, 'aria-label': 'Número de rodadas' });
  const number = h('input', { type: 'number', id: 'rounds-number', class: 'input rounds-number', min: MIN_ROUNDS, max: MAX_ROUNDS, step: 1, inputmode: 'numeric', value: maxRounds, 'aria-label': 'Número de rodadas' });
  const paint = () => value.replaceChildren(String(maxRounds), h('small', null, maxRounds === 1 ? ' rodada' : ' rodadas'));
  const set = (v, from) => {
    maxRounds = clampRounds(v);
    if (from !== range) range.value = maxRounds;
    if (from !== number) number.value = maxRounds;
    paint();
  };
  range.addEventListener('input', () => set(range.value, range));
  // enquanto digita, so aplica numero valido; ao sair do campo, corrige o que ficou fora
  number.addEventListener('input', () => { if (number.value !== '') set(number.value, number); });
  number.addEventListener('change', () => set(number.value));
  number.addEventListener('keydown', (e) => { if (e.key === 'Enter') { set(number.value); startMatch(); } });
  paint();

  const modes = [
    { id: 'classic', icon: '📈', name: 'Clássico', text: 'Cada acerto soma a posição: perto do nº 100 vale mais.' },
    { id: 'target', icon: '🎯', name: 'Alvo', text: 'Sorteamos um número de 1 a 100. Quem chegar mais perto vence a rodada.' },
  ];
  const modeButtons = modes.map((m) => h('button', {
    type: 'button', class: 'mode-card game-mode', role: 'radio', 'aria-checked': String(m.id === gameMode),
    onclick: () => { gameMode = m.id; render(); },
  },
    h('span', { class: 'mode-icon', 'aria-hidden': 'true' }, m.icon),
    h('span', { class: 'mode-text' }, h('strong', null, m.name), h('small', null, m.text)),
  ));

  return h('section', { class: 'home' },
    steps(4),
    h('p', { class: 'hint category-players' }, catLabel(category)),
    h('div', { class: 'panel' },
      h('h2', { id: 'game-mode-label' }, 'Tipo de jogo'),
      h('div', { class: 'mode-list', role: 'radiogroup', 'aria-labelledby': 'game-mode-label' }, modeButtons),
    ),
    h('div', { class: 'panel rounds-panel' },
      h('h2', null, 'Quantas rodadas?'),
      value,
      h('div', { class: 'rounds-picker' },
        h('span', { 'aria-hidden': 'true' }, MIN_ROUNDS), range, h('span', { 'aria-hidden': 'true' }, MAX_ROUNDS),
      ),
      h('label', { class: 'rounds-type' }, 'Ou digite: ', number),
      h('p', { class: 'hint' }, gameMode === 'classic'
        ? 'Quem cravar 95+ pode encerrar antes. Empate no fim? Dá para jogar desempate.'
        : 'Cada rodada vencida vale 1 ponto. Empate no fim? Dá para jogar desempate.'),
    ),
    h('div', { class: 'step-actions' },
      h('button', { class: 'btn btn--ghost', onclick: () => go('category') }, 'Trocar categoria'),
      h('button', { class: 'btn', onclick: startMatch }, 'Começar'),
    ),
  );
}

/** "Rodada 3 de 10"; depois do combinado (desempate ou "Mais um round..."), "Rodada extra". */
function roundLabel(n = room.roundNumber) {
  return n <= room.maxRounds ? `Rodada ${n} de ${room.maxRounds}` : `Rodada extra (${n})`;
}

function startMatch() {
  voted = false;
  suddenDeath = null;
  room = makeRoom({ code: 'OFFLINE', hostId: 'p1', categoryId: category.id, roundSeconds: 0, maxRounds, gameMode });
  roster.forEach((p, i) => addPlayer(room, { id: `p${i + 1}`, ...p }));
  const introKey = `${category.id}:${gameMode}`; // explica de novo se mudar categoria ou tipo de jogo
  if (surprise || lastIntroCategory !== introKey) { // sorteio sempre anuncia a categoria
    lastIntroCategory = introKey;
    go('intro');
  } else {
    newRound();
  }
}

// ============================================================
// EXPLICACAO DA REGRA (antes da 1a rodada)
// ============================================================
function renderIntro() {
  const ui = categoryUi(category);
  return h('section', { class: 'intro' },
    h('div', { class: 'panel intro-card' },
      h('p', { class: 'intro-kicker' }, surprise ? '🎲 Categoria sorteada' : 'Categoria'),
      h('h1', { class: 'intro-category' }, catLabel(category)),
      gameMode === 'target' ? introTarget() : introClassic(),
      // contexto da lista (ex.: o que foi o programa do SBT), quando a categoria traz
      ui.about
        ? h('div', { class: 'intro-about' },
            h('h3', null, 'Sobre esta lista'),
            [].concat(ui.about).map((p) => h('p', null, p)),
            ui.aboutLink ? h('p', null, h('a', { href: ui.aboutLink.href, target: '_blank', rel: 'noopener' }, ui.aboutLink.label)) : null,
          )
        : null,
      h('button', { class: 'btn btn--block', onclick: newRound }, 'Entendi, vamos jogar'),
      h('div', { class: 'intro-back' },
        h('button', { class: 'btn btn--ghost btn--block', onclick: () => leaveMatch('category') }, 'Escolher outra categoria'),
        h('button', { class: 'btn btn--ghost btn--block', onclick: () => leaveMatch('players') }, 'Escolher outros jogadores'),
      ),
    ),
  );
}

function introClassic() {
  return [
    h('h2', { class: 'intro-trick' }, 'Atenção ao truque'),
    h('p', { class: 'intro-lead' }, 'Aqui não ganha quem acerta o primeiro da lista. Ganha quem chega mais perto do ', h('b', null, 'fim'), '.'),
    h('div', { class: 'intro-scale', 'aria-hidden': 'true' },
      h('span', { class: 'cold' }, '#1'), h('span', { class: 'bar' }), h('span', { class: 'hot' }, '#100'),
    ),
    h('ul', { class: 'rules' },
      h('li', null, '🥶', h('span', null, 'O nº 1 da lista vale só ', h('b', null, '1 ponto'), '.')),
      h('li', null, '📈', h('span', null, 'Cada item vale a sua posição: o nº 50 vale 50, o nº 90 vale 90.')),
      h('li', null, '🔥', h('span', null, 'Um palpite lá perto do nº 100 vale quase ', h('b', null, '100 pontos'), '.')),
      h('li', null, '🚫', h('span', null, 'Fora do top 100 vale zero. O que já saiu não vale de novo.')),
      h('li', null, '🤫', h('span', null, 'Cada um digita na sua vez, sem os outros verem.')),
    ),
  ];
}

function introTarget() {
  return [
    h('h2', { class: 'intro-trick' }, '🎯 Modo Alvo'),
    h('p', { class: 'intro-lead' }, 'A cada rodada sorteamos um número de 1 a 100. Ganha quem chegar ', h('b', null, 'mais perto dele'), '.'),
    h('ul', { class: 'rules' },
      h('li', null, '🎯', h('span', null, 'Ex.: alvo nº 28. Quem acertar o nº 32 (a 4) ganha de quem acertar o nº 10 (a 18).')),
      h('li', null, '🏅', h('span', null, 'Vencer a rodada vale ', h('b', null, '1 ponto'), '.')),
      h('li', null, '🤝', h('span', null, 'Empate entre os mais perto (nº 24 e nº 32 com alvo 28): ninguém pontua.')),
      h('li', null, '🚫', h('span', null, 'Fora do top 100 não conta. O que já saiu não vale de novo.')),
      h('li', null, '🤫', h('span', null, 'Cada um digita na sua vez, sem os outros verem.')),
    ),
  ];
}

/** Faixa com o alvo da rodada (modo Alvo). */
function targetBanner() {
  const t = room.round?.target ?? room.lastReveal?.target;
  return t ? h('p', { class: 'target-banner', role: 'status' }, '🎯 Alvo da rodada: ', h('b', null, `nº ${t}`)) : null;
}

// ============================================================
// RODADA: passa o celular -> resposta
// ============================================================
function newRound() {
  startRound(room);
  turn = 0;
  go('pass');
}

function strip() {
  return h('div', { class: 'answered-strip', 'aria-label': 'Quem já respondeu' },
    room.players.map((p, i) => {
      const answered = Boolean(room.round?.answers[p.id]);
      return h('div', { class: 'who' },
        avatarEl(p, 48),
        answered ? h('span', { class: 'check', 'aria-hidden': 'true' }, '✓') : null,
        h('span', null, i === turn && !answered ? `${p.name} (vez)` : p.name),
        h('span', { class: 'visually-hidden' }, answered ? 'respondeu' : 'pensando'),
      );
    }),
  );
}

function renderPass() {
  const p = currentPlayer();
  return h('section', { class: 'round' },
    h('div', { class: 'panel round-main pass' },
      h('h1', { class: 'round-title' }, roundLabel()),
      targetBanner(),
      suddenDeath
        ? h('p', { class: 'sudden-banner', role: 'status' }, `⚡ Morte súbita: só vale superar o #${suddenDeath.pos} (${suddenDeath.pt}) de ${suddenDeath.name}.`)
        : null,
      avatarEl(p, 110),
      h('p', { class: 'prompt' }, 'Passe o celular para'),
      h('div', { class: 'pass-name' }, p.name),
      h('button', { class: 'btn btn--block', onclick: () => go('answer') }, `Sou ${p.name}, estou com o celular`),
      h('p', { class: 'hint' }, 'Os outros não podem olhar a tela agora. 🤫'),
      strip(),
    ),
    sidePanel(),
  );
}

function renderAnswer() {
  const p = currentPlayer();
  const ui = categoryUi(category);
  const input = h('input', {
    class: 'input', id: 'guess', maxlength: '80', autocomplete: 'off', autocapitalize: 'sentences',
    placeholder: ui.placeholder, 'aria-label': ui.placeholder, enterkeyhint: 'send',
  });
  // Erro fica logo abaixo do campo: no celular, um aviso no rodape some atras do teclado.
  const error = h('p', { class: 'guess-error', role: 'alert' });
  const fail = (message) => { error.textContent = message; input.focus(); };
  input.addEventListener('input', () => { error.textContent = ''; });
  input.addEventListener('focus', () => input.scrollIntoView({ block: 'start', behavior: 'smooth' }));

  const done = () => {
    turn += 1;
    if (turn < room.players.length) go('pass');
    else { revealRound(room); go('reveal'); }
  };
  const form = h('form', {
    class: 'guess-form',
    onsubmit: (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return fail(ui.empty);
      const res = submitAnswer(room, category, p.id, text);
      if (!res.ok) {
        if (res.reason === 'choose') return render(); // abre "Qual você quis dizer?"
        if (res.reason === 'burned') return fail(fillText(ui.burned, { item: res.item.pt || res.item.title }));
        if (res.reason === 'ambiguous') return fail(ui.ambiguous);
        return fail('Não deu para registrar. Tente de novo.');
      }
      done();
    },
  }, input, h('button', { class: 'btn', type: 'submit' }, 'Enviar chute'));

  // Pergunta aberta: sem campo de texto. Só escolher uma opção ou enviar como escreveu (ADR-0015).
  const pending = room.round.pending[p.id];
  const choice = pending ? choicePanel(pending, (opts) => { if (submitAnswer(room, category, p.id, null, opts).ok) done(); }) : null;
  if (!pending) setTimeout(() => input.focus(), 0);

  return h('section', { class: 'round' },
    h('div', { class: 'panel round-main answer-main' },
      h('div', { class: 'answer-head' }, avatarEl(p, 40), h('h1', { class: 'round-title' }, `${roundLabel()} · vez de ${p.name}`)),
      targetBanner(),
      suddenDeath
        ? h('p', { class: 'sudden-banner', role: 'status' }, `⚡ Morte súbita: só vale superar o #${suddenDeath.pos} (${suddenDeath.pt}) de ${suddenDeath.name}.`)
        : null,
      choice || form,
      choice ? null : error,
      choice ? null : h('p', { class: 'prompt' }, room.round.target ? `Qual ${ui.noun} está mais perto do nº ${room.round.target}?` : ui.prompt),
      h('p', { class: 'hint' }, room.round.target ? 'Quem chegar mais perto do alvo vence a rodada.' : 'Quanto mais perto do nº 100, mais pontos.'),
    ),
    sidePanel(),
  );
}

/** "Qual você quis dizer?": as opções parecidas com o chute + enviar como foi escrito. */
function choicePanel(pending, send) {
  const options = pending.options.map((pos) => category.items.find((it) => it.pos === pos));
  return h('div', { class: 'choice', role: 'group', 'aria-labelledby': 'choice-title' },
    h('h2', { id: 'choice-title' }, 'Qual você quis dizer?'),
    h('p', { class: 'hint' }, 'Você escreveu ', h('b', null, `“${pending.text}”`), '. Escolha uma opção; não dá para voltar e digitar de novo.'),
    h('div', { class: 'choice-options' },
      options.map((it) => {
        const name = it.pt || it.title;
        // título original e ano ajudam a separar filmes; nada que entregue a posição
        const extra = [it.pt && it.title !== it.pt ? it.title : null, it.year].filter(Boolean).join(', ');
        return h('button', { class: 'btn choice-option', type: 'button', onclick: () => send({ pick: it.pos }) },
          name, extra ? h('small', null, extra) : null);
      }),
    ),
    h('button', { class: 'btn btn--ghost btn--block', type: 'button', onclick: () => send({ asTyped: true }) },
      `Nenhum desses: enviar “${pending.text}”`),
  );
}

// ============================================================
// PAINEIS LATERAIS
// ============================================================
function sidePanel(deltas) {
  return h('div', { class: 'side' },
    h('div', { class: 'panel' }, h('h2', null, 'Placar'), board(ranking(room), deltas)),
    room.used.length
      ? h('div', { class: 'panel' },
          h('h2', null, 'Já saíram (não valem de novo)'),
          h('div', { class: 'used', style: { marginTop: '10px' } }, room.used.map((u) => h('span', null, h('b', null, `#${u.pos}`), ' ', u.pt))),
        )
      : null,
  );
}

function board(rows, deltas) {
  return h('ol', { class: 'board' }, rows.map((r, i) => h('li', null,
    h('span', { class: 'rank' }, i + 1),
    avatarEl(r, 32),
    h('span', { class: 'nm' }, r.name),
    h('span', { class: 'pts' }, r.score, deltas && deltas[r.playerId] ? h('span', { class: 'delta' }, `+${deltas[r.playerId]}`) : null),
  )));
}

// ============================================================
// REVELACAO
// ============================================================
function renderReveal() {
  const rev = room.lastReveal;
  const key = `${room.createdAt}:${rev.number}`;
  const animate = !animatedReveals.has(key);
  animatedReveals.add(key);
  // do pior para o melhor (a ordem da animação); no Alvo, pior = mais longe (quem chutou fora sai primeiro)
  const far = (r) => (r.distance == null ? Infinity : r.distance);
  const results = [...rev.results].sort(rev.target ? (a, b) => far(b) - far(a) || a.points - b.points : (a, b) => a.points - b.points);
  const deltas = Object.fromEntries(results.map((r) => [r.playerId, r.points]));
  const doneAt = results.length * REVEAL_STEP_MS + 400;
  const ui = { h, avatarEl, animate, stepMs: REVEAL_STEP_MS, target: rev.target };
  const { ruler, bars, tickets } = window.Top100Reveal;

  // Morte súbita em andamento: se ninguém superou o alvo, acabou.
  const suddenOver = suddenDeath && !suddenDeathResult(rev, suddenDeath.pos).beaten;
  const target = rev.jackpot;
  const beatText = (pos) => (pos === 99 ? 'Só um #100 supera.' : pos === 98 ? 'Só um #99 ou #100 supera.' : `Só do #${pos + 1} ao #100 supera.`);
  let message = null;
  if (rev.target) {
    const win = rev.results.find((r) => r.playerId === rev.winnerId);
    const anyHit = rev.results.some((r) => r.status === 'hit');
    message = win
      ? (win.distance === 0 ? `${win.name} cravou o alvo nº ${rev.target}! +1 ponto.` : `${win.name} chegou mais perto do nº ${rev.target} (#${win.pos}, a ${win.distance}). +1 ponto.`)
      : anyHit ? `Empate entre os mais perto do nº ${rev.target}: ninguém pontua.` : `Ninguém acertou um item da lista. Alvo era o nº ${rev.target}.`;
  } else if (suddenOver) message = `Ninguém superou o #${suddenDeath.pos} de ${suddenDeath.name}. Fim de partida!`;
  else if (target) message = target.pos === 100
    ? `${target.name} cravou o #100 (${target.pt})! Impossível superar: fim de partida.`
    : `${target.name} cravou o #${target.pos} (${target.pt})! ${beatText(target.pos)}`;
  const jackpot = message
    ? h('div', { class: 'jackpot' + (animate ? ' result--animate' : ''), style: { '--delay': `${doneAt}ms` } },
        h('span', { class: 'big', 'aria-hidden': 'true' }, suddenOver ? '🏁' : rev.target && !rev.winnerId ? '🤝' : '🎯'),
        h('span', null, message),
      )
    : null;

  const finish = () => { suddenDeath = null; endGame(room); go('final'); };
  const lastChance = () => { suddenDeath = { pos: target.pos, name: target.name, pt: target.pt }; newRound(); };
  let actions;
  if (suddenOver || (target && target.pos === 100)) {
    actions = h('div', { class: 'host-actions' }, h('button', { class: 'btn', onclick: finish }, 'Ver resultado final'));
  } else if (target) {
    // Cravou 95+ mas dá para superar: uma rodada de morte súbita, ou encerra.
    actions = h('div', { class: 'host-actions' },
      h('button', { class: 'btn', onclick: lastChance }, 'Só mais uma rodada (morte súbita)'),
      h('button', { class: 'btn btn--ghost', onclick: finish }, 'Ver resultado final'),
    );
  } else if (isLastRound(room) && tiedForFirst(room)) {
    // Empate no primeiro lugar: quantas rodadas de desempate quiserem (os dois modos).
    actions = h('div', { class: 'host-actions' },
      h('p', { class: 'hint tie-note' }, 'Empate no primeiro lugar!'),
      h('button', { class: 'btn', onclick: newRound }, 'Rodada de desempate'),
      h('button', { class: 'btn btn--ghost', onclick: finish }, 'Ver resultado final'),
    );
  } else if (isLastRound(room)) {
    actions = h('div', { class: 'host-actions' }, h('button', { class: 'btn', onclick: finish }, 'Ver resultado final'));
  } else {
    actions = h('div', { class: 'host-actions' },
      h('button', { class: 'btn', onclick: newRound }, 'Próxima rodada'),
      h('button', { class: 'btn btn--ghost', onclick: finish }, 'Encerrar partida'),
    );
  }

  return h('section', { class: 'reveal' },
    h('div', { class: 'reveal-head' }, h('h1', null, `${roundLabel(rev.number)}: revelação`)),
    targetBanner(),
    ruler(results, ui),
    bars(results, ui),
    jackpot,
    h('div', { class: 'results' }, tickets(results, ui)),
    actions,
    sidePanel(deltas),
  );
}

// ============================================================
// FINAL
// ============================================================
function renderFinal() {
  const r = ranking(room);
  const steps = [[r[1], 2], [r[0], 1], [r[2], 3]].filter(([p]) => p);
  const podium = h('div', { class: 'podium', style: { gridTemplateColumns: `repeat(${steps.length}, minmax(0, 150px))` } },
    steps.map(([p, place]) => h('div', { class: `step step--${place}` },
      avatarEl(p),
      h('span', { class: 'nm' }, p.name),
      h('span', { class: 'sc' }, `${p.score} pts`),
      h('div', { class: 'block' }, place),
    )),
  );
  const best = r.filter((p) => p.best).sort((a, b) => b.best.pos - a.best.pos)[0];
  const rounds = room.roundNumber;

  return h('section', { class: 'final' },
    h('h1', null, 'Fim de partida'),
    h('p', { class: 'hint' }, catLabel(category), `, ${room.gameMode === 'target' ? 'modo Alvo, ' : ''}depois de ${rounds} ${rounds === 1 ? 'rodada' : 'rodadas'}.`),
    tiedForFirst(room) ? h('p', { class: 'hint tie-note' }, 'Terminou empatado. "Mais um round..." desempata.') : null,
    podium,
    best ? h('p', { class: 'best-shot' }, 'Melhor chute da partida: ', h('b', null, best.name), ` com ${best.best.pt} (#${best.best.pos}).`) : null,
    r.length > 3 ? h('div', { class: 'panel rest' }, h('h2', null, 'Classificação completa'), board(r)) : null,
    ratingCard(),
    h('div', { class: 'host-actions' },
      h('button', { class: 'btn', onclick: () => { suddenDeath = null; oneMoreRound(room); turn = 0; go('pass'); } }, 'Mais um round...'),
      h('button', { class: 'btn btn--ghost', onclick: startMatch }, 'Jogar de novo'),
      h('button', { class: 'btn btn--ghost', onclick: () => { room = null; go('category'); } }, 'Trocar categoria'),
      h('button', { class: 'btn btn--ghost', onclick: () => { room = null; go('players'); } }, 'Trocar jogadores'),
    ),
  );
}

// ---------- inicializacao ----------
async function boot() {
  try {
    if (STANDALONE) {
      categories = window.TOP100_CATEGORIES;
    } else {
      const list = await (await fetch('/api/categories')).json();
      categories = await Promise.all(list.map(async (c) => (await fetch(`/api/categories/${encodeURIComponent(c.id)}`)).json()));
    }
    category = categories[0];
    ratings = STANDALONE ? readLocalVotes() : await fetch('/api/ratings').then((r) => r.json()).catch(() => ({}));
  } catch {
    $app.replaceChildren(h('p', { class: 'boot' }, 'Não consegui carregar as listas. Recarregue a página.'));
    return;
  }
  render();
}

window.addEventListener('resize', () => { if (screen === 'reveal') render(); });
boot();
