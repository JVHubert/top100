/* Top 100 — pecas visuais da revelacao, compartilhadas pelo modo online (app.js) e pelo
 * offline (offline.js). Script classico: expoe window.Top100Reveal.
 *
 * Cada funcao recebe os resultados JA ORDENADOS do pior para o melhor (a ordem da animacao)
 * e um objeto `ui` com: h, avatarEl, animate, stepMs, meId (opcional) e target (opcional:
 * alvo da rodada no modo Alvo do offline; marca a posicao e mostra a distancia).
 */
(() => {
  'use strict';

  const pct = (pos) => `${((pos - 1) / 99) * 100}%`;
  /** Melhor palpite de rodadas anteriores que ainda nao foi superado nesta rodada. */
  const standingBest = (r) => (r.prevBest && (r.status !== 'hit' || r.prevBest.pos > r.pos) ? r.prevBest : null);
  const scoreLabel = (r) => (r.status === 'hit' ? `#${r.pos}` : r.status === 'ambiguous' ? '?' : r.status === 'no_answer' ? '—' : 'fora');

  /** Regua horizontal 1 -> 100 (telas largas). */
  function ruler(results, { h, avatarEl, animate, stepMs, target }) {
    const rulerWidth = Math.min(1040, window.innerWidth) - 32 - 36 - 76;
    const minGap = Math.max(3, Math.ceil(46 / Math.max(rulerWidth / 99, 1)));
    const lanesEnd = []; // ultima posicao ocupada por faixa
    let outCount = 0;
    const placement = new Map();
    [...results].filter((r) => r.status === 'hit').sort((a, b) => a.pos - b.pos).forEach((r) => {
      let lane = lanesEnd.findIndex((last) => r.pos - last >= minGap);
      if (lane === -1) { lane = lanesEnd.length; lanesEnd.push(r.pos); } else lanesEnd[lane] = r.pos;
      placement.set(r.playerId, lane);
    });
    results.filter((r) => r.status !== 'hit').forEach((r) => placement.set(r.playerId, outCount++));
    const lanes = Math.max(1, lanesEnd.length, outCount);

    const pins = results.map((r, i) => {
      const hit = r.status === 'hit';
      return h('div', {
        class: 'pin' + (hit ? '' : ' pin--out') + (animate ? ' pin--animate' : ''),
        style: { left: hit ? pct(r.pos) : null, '--lane': placement.get(r.playerId), '--delay': `${i * stepMs}ms` },
        title: hit ? `${r.name}: #${r.pos}` : `${r.name}: fora`,
      }, avatarEl(r, 38));
    });
    const ticks = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => h('span', { style: { left: pct(n) } }, n));

    // melhores palpites anteriores, numa faixa abaixo da escala (alternando altura se ficarem perto)
    const bestLanes = [];
    const bests = results.filter(standingBest).sort((a, b) => a.prevBest.pos - b.prevBest.pos).map((r) => {
      const pos = r.prevBest.pos;
      let lane = bestLanes.findIndex((last) => pos - last >= minGap);
      if (lane === -1) { lane = bestLanes.length; bestLanes.push(pos); } else bestLanes[lane] = pos;
      return h('div', { class: 'best-mark', style: { left: pct(pos), '--blane': lane }, title: `Melhor de ${r.name} até agora: #${pos} (${r.prevBest.pt})` },
        avatarEl(r, 26), h('span', null, `#${pos}`));
    });

    return h('div', { class: 'panel ruler-wrap', 'aria-hidden': 'true' },
      h('div', { class: 'ruler', style: { '--lanes': lanes, '--blanes': bestLanes.length } },
        h('div', { class: 'ruler-out' }, 'fora'),
        h('div', { class: 'ruler-bar' }),
        h('div', { class: 'ruler-ticks' }, ticks),
        target ? h('div', { class: 'target-mark', style: { left: pct(target) } }, h('span', null, `🎯 ${target}`)) : null,
        pins,
        bests,
      ),
    );
  }

  /** Uma barra por jogador, entrando uma a uma (celular). */
  function bars(results, { h, avatarEl, animate, stepMs, meId, target }) {
    const topPts = Math.max(0, ...results.map((r) => r.points));
    return h('div', { class: 'panel bars', 'aria-label': 'Quão perto do 100 cada um chegou' },
      results.map((r, i) => {
        const hit = r.status === 'hit';
        const best = standingBest(r);
        return h('div', {
          class: 'bar-row' + (hit ? '' : ' bar-row--out') + (r.points > 0 && r.points === topPts ? ' bar-row--top' : '') + (animate ? ' bar-row--animate' : ''),
          style: { '--delay': `${i * stepMs}ms`, '--fill': hit ? pct(r.pos) : '0%' },
        },
          avatarEl(r, 40),
          h('div', { class: 'bar-body' },
            h('span', { class: 'bar-name' }, r.name, meId && r.playerId === meId ? ' (você)' : '',
              best ? h('span', { class: 'bar-best-label' }, ` · melhor #${best.pos}`) : null),
            h('span', { class: 'bar-track', 'aria-hidden': 'true' }, h('span', { class: 'bar-fill' }),
              best ? h('span', { class: 'bar-best', style: { left: pct(best.pos) } }) : null,
              target ? h('span', { class: 'bar-target', style: { left: pct(target) } }) : null),
          ),
          h('span', { class: 'bar-pos' }, scoreLabel(r)),
        );
      }),
    );
  }

  /** Ingressos com o resultado de cada jogador. */
  function tickets(results, { h, avatarEl, animate, stepMs, meId, target }) {
    const topPts = Math.max(0, ...results.map((r) => r.points));
    return results.map((r, i) => {
      let pts = '+0';
      let detail;
      if (r.status === 'hit') {
        pts = `+${r.points}`;
        // detail vem do snapshot (ex.: "SP · 11,4 mi hab."); filmes usam titulo original + ano
        const extra = r.detail || (r.title !== r.pt ? `${r.title}${r.year ? `, ${r.year}` : ''}` : r.year || '');
        detail = h('div', { class: 'matched' }, 'Reconhecido como ', h('b', null, r.pt), extra ? ` (${extra})` : '');
      } else if (r.status === 'ambiguous') {
        detail = h('div', { class: 'matched' }, 'Nome ambíguo: serve para mais de um item da lista.');
      } else if (r.status === 'no_answer') {
        detail = h('div', { class: 'matched' }, 'Não respondeu a tempo.');
      } else {
        // Deixa claro que o palpite foi lido: ele so nao esta na lista (ex.: "tubarão").
        detail = h('div', { class: 'matched' }, r.text ? `Não encontramos “${r.text}” entre os 100 desta lista.` : 'Fora do top 100.');
      }
      return h('article', {
        class: `ticket result result--${r.status}` + (r.points > 0 && r.points === topPts ? ' result--top' : '') + (animate ? ' result--animate' : ''),
        style: { '--delay': `${i * stepMs}ms` },
      },
        avatarEl(r, 44),
        h('div', null,
          h('div', { class: 'who-line' }, r.name, meId && r.playerId === meId ? ' (você)' : ''),
          r.text ? h('div', { class: 'guess' }, `chutou “${r.text}”`) : null,
          detail,
          target && r.distance != null
            ? h('div', { class: 'distance' }, r.distance === 0 ? '🎯 Cravou o alvo!' : `A ${r.distance} do alvo (nº ${target})`)
            : null,
        ),
        h('div', { class: 'score' }, h('div', { class: 'pos' }, scoreLabel(r)), h('div', { class: 'pts' }, pts)),
      );
    });
  }

  window.Top100Reveal = { ruler, bars, tickets };
})();
