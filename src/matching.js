// Adaptador do reconhecimento de titulos para as regras do modo offline (offline-rules.js).
// O reconhecimento em si vive em matcher.js (o mesmo usado pelo servidor online).
// Roda no navegador: sem dependencias de Node.

import { Matcher, tokenize } from './matcher.js';

const cache = new WeakMap();

function matcherFor(category) {
  let matcher = cache.get(category);
  if (!matcher) cache.set(category, (matcher = new Matcher(category.items ?? [], category.match)));
  return matcher;
}

/**
 * Classifica a resposta: { status: 'hit', item } | { status: 'ambiguous' } | { status: 'miss' }.
 * `item` e o item original do snapshot ({ pos, title, pt, year, aliases }).
 */
export function matchAnswer(category, answer) {
  const result = matcherFor(category).match(String(answer ?? ''));
  if (result.status === 'match') return { status: 'hit', item: result.item };
  if (result.status === 'ambiguous') return { status: 'ambiguous', item: null };
  return { status: 'miss', item: null };
}

/**
 * Procura o item da categoria que corresponde a resposta digitada.
 * Retorna { rank, name } ou null (fora da lista, ambiguo ou nao reconhecido).
 */
export function findItem(category, answer) {
  const result = matcherFor(category).match(String(answer ?? ''));
  if (result.status !== 'match') return null;

  const { pos, title, pt } = result.item;
  return { rank: pos, name: pt ? `${pt} (${title})` : title };
}

// ---------- "Qual voce quis dizer?" (ADR-0015) ----------
// Quando o chute nao bate com certeza, procuramos itens parecidos por trigramas (pedacos de
// 3 letras, como o pg_trgm do Postgres): pega erro de digitacao ("villa") e palavras a mais
// ("vila nova de goias") ao mesmo tempo. Nomes de prefixo "suggest" porque o arquivo do
// celular junta todos os modulos num escopo so.

export const SUGGEST_MIN_LETTERS = 4; // menos que isso, nao sugerimos (evita sondar a lista)
export const SUGGEST_MAX = 3;
const SUGGEST_THRESHOLD = 0.75;
const suggestIndexes = new WeakMap();

function suggestGrams(text) {
  const padded = `  ${tokenize(text).join(' ')} `;
  const grams = new Set();
  for (let i = 0; i < padded.length - 2; i++) grams.add(padded.slice(i, i + 3));
  return grams;
}

function suggestIndexFor(category) {
  let index = suggestIndexes.get(category);
  if (!index) {
    index = (category.items ?? []).map((item) => ({
      item,
      names: [item.title, item.pt, ...(item.aliases || [])].filter(Boolean).map(suggestGrams),
    }));
    suggestIndexes.set(category, index);
  }
  return index;
}

/**
 * Itens parecidos com o chute, do mais para o menos parecido.
 * Retorno: { items } (0 a SUGGEST_MAX itens) ou { tooMany: true } quando ha mais parecidos
 * do que cabem na pergunta (ai o jogo pede o nome completo, como antes).
 * `exclude`: posicoes que nao podem ser sugeridas (itens ja queimados).
 */
export function suggestItems(category, answer, { exclude = [] } = {}) {
  const typed = tokenize(String(answer ?? '')).join('');
  if (typed.length < SUGGEST_MIN_LETTERS) return { items: [] };
  const query = suggestGrams(String(answer));
  const found = [];
  for (const { item, names } of suggestIndexFor(category)) {
    if (exclude.includes(item.pos)) continue;
    let best = null;
    for (const grams of names) {
      let shared = 0;
      for (const g of query) if (grams.has(g)) shared++;
      // overlap: um nome curto inteiro dentro de um chute longo ainda conta como parecido;
      // dice desempata a favor do nome de tamanho mais proximo do digitado
      const overlap = shared / Math.min(query.size, grams.size);
      const dice = (2 * shared) / (query.size + grams.size);
      if (!best || overlap > best.overlap || (overlap === best.overlap && dice > best.dice)) best = { overlap, dice };
    }
    if (best && best.overlap >= SUGGEST_THRESHOLD) found.push({ item, ...best });
  }
  if (found.length > SUGGEST_MAX) return { tooMany: true };
  // empate em ordem alfabetica: ordenar pela posicao entregaria quem esta mais perto do 100
  const label = (it) => it.pt || it.title;
  found.sort((a, b) => b.overlap - a.overlap || b.dice - a.dice || label(a.item).localeCompare(label(b.item), 'pt'));
  return { items: found.map((f) => f.item) };
}
