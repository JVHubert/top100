// Adaptador do reconhecimento de titulos para as regras do modo offline (offline-rules.js).
// O reconhecimento em si vive em matcher.js (o mesmo usado pelo servidor online).
// Roda no navegador: sem dependencias de Node.

import { Matcher } from './matcher.js';

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
