/* Top 100 — cliente
 * O servidor é a fonte da verdade: o cliente só envia intenções (criar, entrar, chutar…)
 * e desenha o estado que recebe no evento "state".
 */
(() => {
  'use strict';

  const $app = document.getElementById('app');
  const $conn = document.getElementById('conn');
  const $toasts = document.getElementById('toasts');

  const SESSION_KEY = 'top100:session'; // por aba: permite testar vários jogadores no mesmo navegador
  const PROFILE_KEY = 'top100:profile'; // nome/personagem lembrados entre visitas
  const REVEAL_STEP_MS = 700;

  let config = null;
  let state = null;
  let socket = null;
  let clockOffset = 0;
  let timerRaf = 0;
  let busy = false;
  let guessError = ''; // erro do ultimo chute, mostrado abaixo do campo (sobrevive a re-render)
  const animatedReveals = new Set();

  // ---------- armazenamento (sempre protegido: pode estar bloqueado) ----------
  function readJSON(store, key) {
    try { return JSON.parse(store.getItem(key)); } catch { return null; }
  }
  function writeJSON(store, key, value) {
    try { value == null ? store.removeItem(key) : store.setItem(key, JSON.stringify(value)); } catch { /* ignora */ }
  }
  const getSession = () => readJSON(sessionStorage, SESSION_KEY);
  const setSession = (s) => writeJSON(sessionStorage, SESSION_KEY, s);
  const getProfile = () => readJSON(localStorage, PROFILE_KEY) || {};
  const setProfile = (p) => writeJSON(localStorage, PROFILE_KEY, p);

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

  // Selo TOP 100 + nome sem o "Top 100" repetido (mesma regra de categoryTitle em src/category-ui.js)
  function categoryTitle(name) {
    const rest = String(name).replace(/^top\s*100\s+/i, '').trim();
    return rest.charAt(0).toLocaleUpperCase('pt-BR') + rest.slice(1);
  }
  function catLabel(name) {
    return h('span', { class: 'cat-label' }, h('span', { class: 'tag100' }, 'TOP 100'), ' ', categoryTitle(name));
  }

  function avatarEl(p, size, off) {
    return h('span', {
      class: 'avatar' + (off ? ' avatar--off' : ''),
      style: { '--c': p.color, '--s': size ? size + 'px' : null },
      'aria-hidden': 'true',
    }, p.avatar);
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

  function emit(event, payload) {
    return new Promise((resolve) => {
      if (!socket) return resolve({ ok: false, error: 'Sem conexão com o servidor.' });
      socket.timeout(8000).emit(event, payload || {}, (err, res) => {
        if (err) resolve({ ok: false, error: 'O servidor demorou para responder. Tente de novo.' });
        else resolve(res || { ok: false, error: 'Resposta inválida do servidor.' });
      });
    });
  }

  async function act(event, payload, { quiet = false } = {}) {
    if (busy) return null;
    busy = true;
    try {
      const res = await emit(event, payload);
      if (!res.ok && !quiet) toast(res.error);
      return res;
    } finally {
      busy = false;
    }
  }

  const isHost = () => state && state.hostId === state.me.id;
  const hostName = () => (state.players.find((p) => p.id === state.hostId) || {}).name || 'o host';
  const shareUrl = (code) => `${location.origin}/online?sala=${code}`;

  // ---------- conexão ----------
  function connect() {
    socket = io({ transports: ['websocket', 'polling'] });

    socket.on('connect', async () => {
      $conn.hidden = true;
      const s = getSession();
      if (!s) { if (!state) renderHome(); return; }
      const res = await emit('room:resume', s);
      if (!res.ok) {
        setSession(null);
        state = null;
        history.replaceState(null, '', '/online');
        toast(res.error);
        renderHome();
      }
    });
    socket.on('disconnect', () => { if (state) $conn.hidden = false; });
    socket.on('state', (s) => {
      clockOffset = s.serverNow - Date.now();
      state = s;
      render();
    });
    socket.on('kicked', ({ message }) => {
      setSession(null);
      state = null;
      toast(message);
      renderHome();
    });
  }

  function joined(res) {
    if (!res || !res.ok) return;
    setSession({ code: res.code, playerId: res.playerId, token: res.token });
    history.replaceState(null, '', `/online?sala=${res.code}`);
  }

  async function leaveRoom() {
    if (!confirm('Sair da sala? Sua pontuação desta partida será perdida.')) return;
    await emit('room:leave');
    setSession(null);
    state = null;
    history.replaceState(null, '', '/online');
    renderHome();
  }

  // ---------- roteamento de telas ----------
  function render() {
    if (!state) return renderHome();
    // Preserva o que o jogador está digitando quando o estado muda no meio da rodada.
    const guess = document.getElementById('guess');
    const keep = guess ? { value: guess.value, focused: document.activeElement === guess, sel: guess.selectionStart } : null;

    if (state.phase !== 'round') guessError = '';
    stopTimer();
    const screen = {
      lobby: renderLobby,
      round: renderRound,
      reveal: renderReveal,
      final: renderFinal,
    }[state.phase];
    $app.replaceChildren(topbar(), screen(state));

    const again = document.getElementById('guess');
    if (again && keep) {
      again.value = keep.value;
      if (keep.focused) { again.focus(); try { again.setSelectionRange(keep.sel, keep.sel); } catch { /* ignora */ } }
    }
    if (state.phase === 'round') startTimer();
  }

  function topbar() {
    return h('header', { class: 'topbar' },
      h('div', { class: 'brand' }, 'TOP 100', h('small', null, categoryTitle(state.category.name))),
      h('div', { class: 'code-chip' },
        h('span', null, 'Sala ', h('b', null, state.code)),
        h('button', { class: 'btn btn--ghost btn--small', style: { color: 'var(--tinta)' }, onclick: leaveRoom }, 'Sair'),
      ),
    );
  }

  // ============================================================
  // HOME
  // ============================================================
  function renderHome() {
    stopTimer();
    if (!config) return;
    const saved = getProfile();
    const look = {
      name: saved.name || '',
      avatar: config.avatars.includes(saved.avatar) ? saved.avatar : config.avatars[Math.floor(Math.random() * config.avatars.length)],
      color: config.colors.includes(saved.color) ? saved.color : config.colors[Math.floor(Math.random() * config.colors.length)],
    };
    const urlCode = (new URLSearchParams(location.search).get('sala') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);

    const preview = h('div', { class: 'me-preview' });
    const nameInput = h('input', {
      class: 'input', id: 'name', maxlength: String(config.nameMax), autocomplete: 'nickname',
      placeholder: 'Como te chamam?', value: look.name,
    });
    const paint = () => preview.replaceChildren(avatarEl(look, 56), h('strong', null, nameInput.value.trim() || 'Seu nome aqui'));
    nameInput.addEventListener('input', paint);

    const avatarButtons = config.avatars.map((a) => h('button', {
      type: 'button', 'aria-label': `Personagem ${a}`, 'aria-pressed': String(a === look.avatar),
      onclick: (e) => {
        look.avatar = a;
        avatarButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
        paint();
      },
    }, a));

    const colorNames = ['Vermelho', 'Amarelo', 'Verde-água', 'Roxo', 'Laranja', 'Azul', 'Rosa', 'Verde'];
    const colorButtons = config.colors.map((c, i) => h('button', {
      type: 'button', style: { '--c': c }, 'aria-label': `Cor ${colorNames[i] || c}`, 'aria-pressed': String(c === look.color),
      onclick: (e) => {
        look.color = c;
        colorButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
        paint();
      },
    }));

    const codeInput = h('input', {
      class: 'input input--code', id: 'code', maxlength: '4', autocomplete: 'off', inputmode: 'text',
      placeholder: 'ABCD', value: urlCode, 'aria-label': 'Código da sala',
    });
    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    });

    function profileOrWarn() {
      const name = nameInput.value.trim();
      if (!name) { toast('Digite seu nome primeiro.'); nameInput.focus(); return null; }
      const p = { name, avatar: look.avatar, color: look.color };
      setProfile(p);
      return p;
    }
    async function create() {
      const p = profileOrWarn();
      if (p) joined(await act('room:create', p));
    }
    async function join() {
      const p = profileOrWarn();
      if (!p) return;
      const code = codeInput.value;
      if (code.length !== 4) { toast('O código da sala tem 4 letras.'); codeInput.focus(); return; }
      joined(await act('room:join', { ...p, code }));
    }
    codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') (codeInput.value.length === 4 ? join() : create()); });

    const hasInvite = urlCode.length === 4;
    const createBtn = h('button', { class: hasInvite ? 'btn btn--ghost btn--block' : 'btn btn--block', onclick: create }, 'Criar sala');
    const joinBtn = h('button', { class: hasInvite ? 'btn' : 'btn btn--ghost', onclick: join }, 'Entrar');

    paint();
    $app.replaceChildren(
      h('section', { class: 'home' },
        h('div', { class: 'marquee' },
          h('h1', null, 'TOP 100'),
          h('p', null, 'Chegue o mais perto possível do fundo da lista.'),
        ),
        h('div', { class: 'panel' },
          preview,
          h('div', { class: 'field' }, h('label', { for: 'name' }, 'Seu nome'), nameInput),
          h('div', { class: 'field' }, h('span', { class: 'label' }, 'Personagem'), h('div', { class: 'picker' }, avatarButtons)),
          h('div', { class: 'field' }, h('span', { class: 'label' }, 'Cor'), h('div', { class: 'swatches' }, colorButtons)),
          hasInvite ? null : createBtn,
          h('div', { class: 'divider' }, hasInvite ? 'Você foi convidado para a sala' : 'ou entre com um código'),
          h('div', { class: 'join-row' }, codeInput, joinBtn),
          hasInvite ? h('div', { class: 'divider' }, 'ou') : null,
          hasInvite ? createBtn : null,
        ),
        h('ul', { class: 'rules' },
          h('li', null, '🎬', h('span', null, 'Todo mundo dá um palpite ao mesmo tempo, sem ver o dos outros.')),
          h('li', null, '🎯', h('span', null, 'Quanto mais perto do ', h('b', null, '100º'), ', mais pontos: cada item vale a sua posição (o 100º vale 100, o 50º vale 50).')),
          h('li', null, '🚫', h('span', null, 'Fora do top 100 vale zero. O que já saiu não vale de novo.')),
        ),
        h('p', { class: 'footer-note' },
          `${config.category.name}: snapshot de ${formatDate(config.category.snapshotDate)}. O ranking real do IMDb muda com o tempo.`),
        h('p', { class: 'footer-note footer-note--link' }, h('a', { href: '/' }, 'Um celular só? Jogue passando de mão em mão')),
      ),
    );
    if (!hasInvite && !look.name) nameInput.focus();
  }

  // ============================================================
  // LOBBY
  // ============================================================
  function renderLobby(s) {
    const host = isHost();
    const copy = async () => {
      try { await navigator.clipboard.writeText(shareUrl(s.code)); toast('Link copiado!', 'ok'); }
      catch { toast(`Não consegui copiar. O link é ${shareUrl(s.code)}`); }
    };
    const share = navigator.share
      ? h('button', { class: 'btn btn--ghost btn--small', onclick: () => navigator.share({ title: 'Top 100', text: `Entra na minha sala do Top 100: ${s.code}`, url: shareUrl(s.code) }).catch(() => {}) }, 'Compartilhar')
      : null;

    const cards = s.players.map((p) => h('div', { class: 'player-card' },
      p.isHost ? h('span', { class: 'crown', title: 'Host' }, '👑') : null,
      avatarEl(p, 64, !p.connected),
      h('span', { class: 'name' }, p.name),
      h('span', { class: 'tag' }, p.id === s.me.id ? 'você' : p.connected ? (p.isHost ? 'host' : 'pronto') : 'reconectando…'),
    ));
    if (s.players.length < s.limits.maxPlayers) {
      cards.push(h('div', { class: 'player-card player-card--empty' }, h('span', { class: 'dots' }, 'Esperando amigos')));
    }

    const hostBox = host
      ? h('div', { class: 'panel host-box' },
          h('h2', null, 'Você é o host'),
          config.categories.length > 1
            ? h('div', { class: 'field' },
                h('span', { class: 'label', id: 'categoria-label' }, 'Categoria'),
                h('div', { class: 'category-list', role: 'group', 'aria-labelledby': 'categoria-label' },
                  config.categories.map((c) => h('button', {
                    type: 'button', 'aria-pressed': String(c.id === s.category.id),
                    onclick: () => act('room:settings', { categoryId: c.id }),
                  }, catLabel(c.name))),
                ),
              )
            : null,
          h('div', { class: 'field' },
            h('span', { class: 'label', id: 'tempo-label' }, 'Tempo por rodada'),
            h('div', { class: 'segmented', role: 'group', 'aria-labelledby': 'tempo-label' },
              config.roundSecondsOptions.map((sec) => h('button', {
                type: 'button', 'aria-pressed': String(sec === s.settings.roundSeconds),
                onclick: () => act('room:settings', { roundSeconds: sec }),
              }, `${sec}s`)),
            ),
          ),
          h('button', { class: 'btn btn--block', onclick: () => act('game:start') }, 'Começar partida'),
          s.players.length < 2 ? h('p', { class: 'hint' }, 'Dá pra testar sozinho, mas a graça é com 2 ou mais pessoas.') : null,
        )
      : h('div', { class: 'panel host-box' },
          h('div', { class: 'waiting' }, '🍿', h('span', { class: 'dots' }, `Esperando ${hostName()} começar`)),
          h('p', { class: 'hint' }, 'Categoria: ', h('b', null, catLabel(s.category.name))),
          h('p', { class: 'hint' }, `Cada rodada terá ${s.settings.roundSeconds} segundos.`),
        );

    return h('section', { class: 'lobby' },
      h('div', { style: { display: 'grid', gap: '20px' } },
        h('div', { class: 'panel lobby-code' },
          h('span', { class: 'label' }, 'Código da sala'),
          h('div', { class: 'big-code', 'aria-label': `Código ${s.code.split('').join(' ')}` }, s.code),
          h('div', { class: 'actions' }, h('button', { class: 'btn btn--small', onclick: copy }, 'Copiar link'), share),
        ),
        h('div', { class: 'panel' },
          h('h2', null, `Jogadores (${s.players.length}/${s.limits.maxPlayers})`),
          h('div', { class: 'players' }, cards),
        ),
      ),
      h('div', { class: 'side' },
        hostBox,
        h('div', { class: 'panel' },
          h('h2', null, 'Como pontua'),
          h('ul', { class: 'rules', style: { marginTop: '10px' } },
            h('li', null, '🎯', h('span', null, 'Pontos = posição: o nº 95 vale 95, o nº 50 vale 50, o nº 20 vale 20.')),
            h('li', null, '🚫', h('span', null, 'Fora do top 100: zero. Nome ambíguo: o jogo pede para especificar.')),
            h('li', null, '🔥', h('span', null, `Cravou ${s.limits.jackpot}+? Pela regra da casa, hora de trocar de tema.`)),
          ),
        ),
      ),
    );
  }

  // ============================================================
  // RODADA
  // ============================================================
  function renderRound(s) {
    const answered = !!s.me.answer;
    const ui = s.category.ui;

    let body;
    if (answered) {
      body = h('div', { class: 'ticket sent' },
        h('small', null, 'Seu chute'),
        h('strong', null, s.me.answer),
        h('small', { class: 'dots' }, 'Esperando os outros'),
      );
    } else {
      const input = h('input', {
        class: 'input', id: 'guess', maxlength: String(s.limits.answerMax), autocomplete: 'off', autocapitalize: 'sentences',
        placeholder: ui.placeholder, 'aria-label': ui.placeholder, enterkeyhint: 'send',
      });
      // Erro logo abaixo do campo: no celular, um aviso no rodape some atras do teclado.
      const error = h('p', { class: 'guess-error', role: 'alert' }, guessError);
      const fail = (message) => { guessError = message; error.textContent = message; input.focus(); };
      input.addEventListener('input', () => { guessError = ''; error.textContent = ''; });
      input.addEventListener('focus', () => input.scrollIntoView({ block: 'start', behavior: 'smooth' }));
      const form = h('form', {
        class: 'guess-form',
        onsubmit: async (e) => {
          e.preventDefault();
          const text = input.value.trim();
          if (!text) return fail(ui.empty);
          const res = await act('round:submit', { text }, { quiet: true });
          if (res && !res.ok) fail(res.error);
          else if (res) guessError = '';
        },
      }, input, h('button', { class: 'btn', type: 'submit' }, 'Enviar chute'));
      body = h('div', { class: 'guess-box' }, form, error);
      setTimeout(() => { if (document.activeElement === document.body) input.focus(); }, 0);
    }

    const strip = h('div', { class: 'answered-strip', 'aria-label': 'Quem já respondeu' },
      s.players.map((p) => h('div', { class: 'who', title: p.answered ? `${p.name} já respondeu` : `${p.name} está pensando` },
        avatarEl(p, 48, !p.connected),
        p.answered ? h('span', { class: 'check', 'aria-hidden': 'true' }, '✓') : null,
        h('span', null, p.id === s.me.id ? 'você' : p.name),
        h('span', { class: 'visually-hidden' }, p.answered ? 'respondeu' : 'pensando'),
      )),
    );

    return h('section', { class: 'round' },
      h('div', { class: 'panel round-main' },
        h('div', { class: 'round-head' },
          h('h1', { class: 'round-title' }, `Rodada ${s.round.number}`),
          h('div', { class: 'leader', id: 'leader', role: 'timer' }, h('span', null, '')),
        ),
        h('p', { class: 'prompt' }, ui.prompt),
        body,
        strip,
      ),
      sidePanel(s),
    );
  }

  function sidePanel(s, deltas) {
    return h('div', { class: 'side' },
      h('div', { class: 'panel' }, h('h2', null, 'Placar'), board(s.ranking, deltas, s.me.id)),
      s.used.length
        ? h('div', { class: 'panel' },
            h('h2', null, 'Já saíram (não valem de novo)'),
            h('div', { class: 'used', style: { marginTop: '10px' } }, s.used.map((u) => h('span', null, h('b', null, `#${u.pos}`), ' ', u.pt))),
          )
        : null,
    );
  }

  function board(ranking, deltas, meId) {
    return h('ol', { class: 'board' }, ranking.map((r, i) => h('li', null,
      h('span', { class: 'rank' }, i + 1),
      avatarEl(r, 32, !r.connected),
      h('span', { class: 'nm' }, r.name, r.playerId === meId ? ' (você)' : ''),
      h('span', { class: 'pts' }, r.score, deltas && deltas[r.playerId] ? h('span', { class: 'delta' }, `+${deltas[r.playerId]}`) : null),
    )));
  }

  function startTimer() {
    stopTimer();
    const tick = () => {
      const el = document.getElementById('leader');
      if (!el || !state || !state.round) return;
      const remaining = Math.max(0, state.round.endsAt - (Date.now() + clockOffset));
      const secs = Math.ceil(remaining / 1000);
      el.style.setProperty('--p', (remaining / state.round.durationMs).toFixed(4));
      if (el.firstChild.textContent !== String(secs)) {
        el.firstChild.textContent = secs;
        el.setAttribute('aria-label', `${secs} segundos restantes`);
        el.classList.toggle('leader--urgent', secs <= 10);
      }
      if (remaining <= 0) {
        const input = document.getElementById('guess');
        if (input) input.disabled = true;
        return; // o servidor fecha a rodada e manda a revelação
      }
      timerRaf = requestAnimationFrame(tick);
    };
    tick();
  }
  function stopTimer() {
    cancelAnimationFrame(timerRaf);
    timerRaf = 0;
  }

  // ============================================================
  // REVELAÇÃO
  // ============================================================
  function renderReveal(s) {
    const rev = s.lastReveal;
    const key = `${s.code}:${rev.number}:${s.roundNumber}`;
    const animate = !animatedReveals.has(key);
    animatedReveals.add(key);
    const results = rev.results; // já vem do pior para o melhor
    const deltas = Object.fromEntries(results.map((r) => [r.playerId, r.points]));
    const doneAt = results.length * REVEAL_STEP_MS + 400;
    const ui = { h, avatarEl, animate, stepMs: REVEAL_STEP_MS, meId: s.me.id };
    const { ruler, bars, tickets } = window.Top100Reveal;

    const jackpot = rev.jackpot
      ? h('div', { class: 'jackpot' + (animate ? ' result--animate' : ''), style: { '--delay': `${doneAt}ms` } },
          h('span', { class: 'big', 'aria-hidden': 'true' }, '🎯'),
          h('span', null, `${rev.jackpot.name} cravou o #${rev.jackpot.pos} (${rev.jackpot.pt})! Pela regra da casa, já dá pra encerrar e trocar de tema.`),
        )
      : null;

    const actions = isHost()
      ? h('div', { class: 'host-actions' },
          h('button', { class: 'btn', onclick: () => act('round:next') }, 'Próxima rodada'),
          h('button', { class: rev.jackpot ? 'btn btn--red' : 'btn btn--ghost', onclick: () => act('game:end') }, 'Encerrar partida'),
        )
      : h('p', { class: 'hint', style: { textAlign: 'center' } }, h('span', { class: 'dots' }, `Esperando ${hostName()} decidir se tem mais uma rodada`));

    return h('section', { class: 'reveal' },
      h('div', { class: 'reveal-head' }, h('h1', null, `Rodada ${rev.number}: revelação`)),
      ruler(results, ui),
      bars(results, ui),
      jackpot,
      h('div', { class: 'results' }, tickets(results, ui)),
      actions,
      sidePanel(s, deltas),
    );
  }

  // ============================================================
  // FINAL
  // ============================================================
  function renderFinal(s) {
    const r = s.ranking;
    const steps = [[r[1], 2], [r[0], 1], [r[2], 3]].filter(([p]) => p);
    const podium = h('div', { class: 'podium', style: { gridTemplateColumns: `repeat(${steps.length}, minmax(0, 150px))` } },
      steps.map(([p, place]) => h('div', { class: `step step--${place}` },
        avatarEl(p, null, !p.connected),
        h('span', { class: 'nm' }, p.name),
        h('span', { class: 'sc' }, `${p.score} pts`),
        h('div', { class: 'block' }, place),
      )),
    );
    const best = r.filter((p) => p.best).sort((a, b) => b.best.pos - a.best.pos)[0];
    const rounds = s.roundNumber;

    return h('section', { class: 'final' },
      h('h1', null, 'Fim de partida'),
      h('p', { class: 'hint' }, catLabel(s.category.name), `, depois de ${rounds} ${rounds === 1 ? 'rodada' : 'rodadas'}.`),
      podium,
      best ? h('p', { class: 'best-shot' }, 'Melhor chute da partida: ', h('b', null, best.name), ` com ${best.best.pt} (#${best.best.pos}).`) : null,
      r.length > 3 ? h('div', { class: 'panel rest' }, h('h2', null, 'Classificação completa'), board(r, null, s.me.id)) : null,
      h('div', { class: 'host-actions' },
        isHost() ? h('button', { class: 'btn', onclick: () => act('game:restart') }, 'Jogar de novo') : h('p', { class: 'hint' }, `${hostName()} pode começar outra partida.`),
        h('button', { class: 'btn btn--ghost', onclick: leaveRoom }, 'Sair da sala'),
      ),
    );
  }

  // ---------- inicialização ----------
  async function boot() {
    try {
      const res = await fetch('/api/config');
      config = await res.json();
    } catch {
      $app.replaceChildren(h('p', { class: 'boot' }, 'Não consegui falar com o servidor. Recarregue a página.'));
      return;
    }
    connect();
    if (!getSession()) renderHome();
  }

  window.addEventListener('resize', () => { if (state && state.phase === 'reveal') render(); });
  boot();
})();
