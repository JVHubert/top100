/**
 * Reconhecimento de títulos digitados livremente pelos jogadores.
 *
 * Objetivo: aceitar o jeito que as pessoas realmente digitam ("o poderoso chefao 2",
 * "clube da luta", "interestelar", "star wars 5") sem aceitar chutes errados por acaso.
 *
 * Estratégia, em ordem:
 *   1. Igualdade exata da "chave" normalizada (título original, título PT-BR ou apelido).
 *   2. Tolerância a erro de digitação (Levenshtein) SÓ entre chaves com os mesmos números
 *      — "Toy Story 2" nunca vira "Toy Story 3".
 *   3. Correspondência parcial (todas as palavras digitadas estão no título) quando aponta
 *      para um único filme. Se apontar para vários ("Batman", "Vingadores"), é "ambíguo".
 *
 * Retorno: { status: 'match', item, via } | { status: 'ambiguous', count } | { status: 'none' }
 */

const STOPWORDS = new Set([
  // PT
  'o', 'os', 'a', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'e',
  'em', 'no', 'na', 'nos', 'nas', 'para', 'pra', 'pro', 'pros', 'ao', 'aos', 'por', 'pelo', 'pela', 'com',
  // EN
  'the', 'an', 'of', 'and', 'in', 'or', 'to', 'on',
  // outros idiomas comuns em títulos
  'il', 'la', 'le', 'les', 'el', 'der', 'die',
  // ruído de sequência
  'part', 'parte', 'episode', 'episodio', 'filme', 'movie',
]);

// Algarismos romanos e números por extenso viram dígitos, dos dois lados da comparação.
// ("x" fica de fora de propósito: "American History X" não é "10".)
const NUMBER_WORDS = {
  ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9',
  two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  dois: '2', duas: '2', tres: '3', quatro: '4', cinco: '5', seis: '6', sete: '7', oito: '8', nove: '9', dez: '10',
};

function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Converte um texto em lista de tokens significativos. */
function tokenize(raw) {
  if (typeof raw !== 'string') return [];
  let s = stripAccents(raw.toLowerCase());
  s = s.replace(/&/g, ' e ');
  s = s.replace(/['’`´]/g, ''); // schindler's -> schindlers
  s = s.replace(/(\d+)(st|nd|rd|th|º|ª)\b/g, '$1'); // 12th -> 12
  s = s.replace(/[^a-z0-9]+/g, ' ');
  return s
    .split(' ')
    .filter(Boolean)
    .map((t) => NUMBER_WORDS[t] || t)
    .filter((t) => !STOPWORDS.has(t));
}

function toKey(raw) {
  return tokenize(raw).join(' ');
}

function digitsOf(tokens) {
  return tokens.filter((t) => /^\d+$/.test(t)).sort().join(',');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}

function similarity(a, b) {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max;
}

/** Duas palavras "batem" se forem iguais ou, sendo longas, diferirem por 1 letra. */
function tokenMatches(input, candidate, minLength) {
  if (input === candidate) return true;
  if (/^\d+$/.test(input) || /^\d+$/.test(candidate)) return false;
  return input.length >= minLength && candidate.length >= minLength && levenshtein(input, candidate) <= 1;
}

const FUZZY_THRESHOLD = 0.8;
// Padroes; cada categoria pode ajustar no JSON ("match": { ... }). Nomes curtos, por
// exemplo, pedem tolerancia menor para "Ana" nao virar "Ane".
const DEFAULT_OPTIONS = Object.freeze({ minFuzzyLength: 4, minTokenFuzzyLength: 5, spellingVariants: false });

/**
 * Chave "como se fala" para grafias alternativas do mesmo nome: Raphael = Rafael,
 * Érika = Érica, Thyago = Thiago, Isabella = Isabela, Sarah = Sara, Wanessa = Vanessa.
 * Recebe uma chave ja normalizada (sem acento, minuscula).
 */
function spellingKey(key) {
  return key
    .split(' ')
    .map((t) =>
      t
        .replace(/ph/g, 'f')
        .replace(/th/g, 't')
        .replace(/y/g, 'i')
        .replace(/w/g, 'v')
        .replace(/qu(?=[ei])/g, 'k')
        .replace(/k/g, 'c')
        .replace(/h$/, '')
        .replace(/(.)\1+/g, '$1'),
    )
    .join(' ');
}

export class Matcher {
  /** @param {Array<{pos:number,title:string,pt?:string,aliases?:string[]}>} items */
  constructor(items, options = {}) {
    this.items = items;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.entries = []; // { item, key, tokens, digits }
    this.exact = new Map(); // key -> item
    for (const item of items) {
      const names = [item.title, item.pt, ...(item.aliases || [])].filter(Boolean);
      for (const name of names) {
        const tokens = tokenize(name);
        const key = tokens.join(' ');
        if (!key) continue;
        const existing = this.exact.get(key);
        if (existing && existing.pos !== item.pos) {
          // Chave compartilhada por dois filmes: não é segura para match exato.
          this.exact.set(key, null);
        } else if (existing !== null) {
          this.exact.set(key, item);
        }
        this.entries.push({ item, key, tokens, digits: digitsOf(tokens), spelling: spellingKey(key) });
      }
    }
  }

  match(raw) {
    const tokens = tokenize(raw);
    const key = tokens.join(' ');
    if (!key) return { status: 'none' };
    const digits = digitsOf(tokens);

    // 1) exato
    if (this.exact.has(key)) {
      const item = this.exact.get(key);
      if (item) return { status: 'match', item, via: 'exact' };
      return { status: 'ambiguous', count: 2 };
    }

    // 1b) grafia alternativa do mesmo nome (categorias que ligam a opcao). Se mais de um
    // item soa igual (Thiago e Tiago estao os dois na lista), vale a grafia mais parecida.
    if (this.options.spellingVariants) {
      const spelling = spellingKey(key);
      const same = this.entries.filter((e) => e.spelling === spelling);
      if (same.length) {
        same.sort((a, b) => levenshtein(key, a.key) - levenshtein(key, b.key) || a.item.pos - b.item.pos);
        return { status: 'match', item: same[0].item, via: 'spelling' };
      }
    }

    // 2) tolerância a erro de digitação
    if (key.length >= this.options.minFuzzyLength) {
      const best = new Map(); // pos -> {item, score}
      for (const e of this.entries) {
        if (e.digits !== digits) continue;
        const score = similarity(key, e.key);
        if (score < FUZZY_THRESHOLD) continue;
        const prev = best.get(e.item.pos);
        if (!prev || score > prev.score) best.set(e.item.pos, { item: e.item, score });
      }
      const ranked = [...best.values()].sort((a, b) => b.score - a.score);
      if (ranked.length === 1 || (ranked.length > 1 && ranked[0].score - ranked[1].score >= 0.05)) {
        return { status: 'match', item: ranked[0].item, via: 'fuzzy' };
      }
      if (ranked.length > 1) return { status: 'ambiguous', count: ranked.length };
    }

    // 3) parcial: todas as palavras digitadas estão no título
    const hits = new Map(); // pos -> item
    for (const e of this.entries) {
      if (e.digits !== digits) continue;
      const allContained = tokens.every((t) => e.tokens.some((c) => tokenMatches(t, c, this.options.minTokenFuzzyLength)));
      if (!allContained) continue;
      hits.set(e.item.pos, { item: e.item, coverage: tokens.length / e.tokens.length });
    }
    if (hits.size > 1) return { status: 'ambiguous', count: hits.size };
    if (hits.size === 1) {
      const only = [...hits.values()][0];
      // Uma palavra solta ("leão") é pouco para cravar um filme; exija mais contexto.
      if (tokens.length >= 2 && only.coverage >= 0.5) {
        return { status: 'match', item: only.item, via: 'partial' };
      }
    }
    return { status: 'none' };
  }
}

export { tokenize, toKey, levenshtein, similarity };
