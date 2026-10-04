// Checagens que valem para TODAS as categorias registradas em src/categories.js,
// mais chutes de exemplo por categoria.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Matcher } from '../src/matcher.js';
import { listCategories, getCategory } from '../src/categories.js';

const all = listCategories().map((c) => getCategory(c.id));

function matcherOf(category) {
  const m = new Matcher(category.items, category.match);
  return (text) => {
    const r = m.match(text);
    return r.status === 'match' ? r.item.pos : r.status;
  };
}

for (const category of all) {
  test(`${category.id}: 100 posições contíguas e dados obrigatórios`, () => {
    assert.equal(category.items.length, 100);
    category.items.forEach((it, i) => {
      assert.equal(it.pos, i + 1);
      assert.ok(it.title, `item ${it.pos} sem título`);
    });
    assert.ok(category.snapshot?.date && category.snapshot?.source, 'snapshot sem data/fonte');
  });

  test(`${category.id}: cada item é reconhecido pelo próprio nome`, () => {
    const pos = matcherOf(category);
    for (const it of category.items) {
      assert.equal(pos(it.pt || it.title), it.pos, `"${it.pt || it.title}" não voltou na posição ${it.pos}`);
    }
  });

  test(`${category.id}: exemplo da tela "Atenção ao truque" é uma posição baixa`, () => {
    const example = category.ui?.example;
    if (example == null) return;
    assert.ok(example >= 1 && example <= 30, `exemplo ${example} entrega posição alta demais`);
  });
}

test('nomes: acento e maiúscula não importam; variantes são nomes diferentes', () => {
  const pos = matcherOf(getCategory('top100-nomes-brasil'));
  assert.equal(pos('maria'), 1);
  assert.equal(pos('JOAO'), 4);
  assert.equal(pos('Luiz'), 10);
  assert.equal(pos('luis'), 16); // IBGE: "Luís" e "Luis" são o mesmo; "Luiz" é outro
  assert.equal(pos('Natalia'), 100);
});

test('nomes: sem tolerância a erro, nomes parecidos de fora não pontuam', () => {
  const pos = matcherOf(getCategory('top100-nomes-brasil'));
  assert.equal(pos('Mário'), 'none'); // não vira "Maria"
  assert.equal(pos('Luiza'), 'none'); // não vira "Luiz"
  assert.equal(pos('Marta'), 'none');
  assert.equal(pos('Maria Eduarda'), 'none');
});

test('países: nomes em português, apelidos e vizinhos parecidos', () => {
  const pos = matcherOf(getCategory('top100-paises-populacao'));
  assert.equal(pos('brasil'), 7);
  assert.equal(pos('EUA'), 3);
  assert.equal(pos('Holanda'), pos('Países Baixos'));
  assert.equal(pos('Birmânia'), pos('Mianmar'));
  assert.notEqual(pos('Níger'), pos('Nigéria'));
  assert.notEqual(pos('Áustria'), pos('Austrália'));
  assert.equal(pos('Sudão'), 30);
  assert.equal(pos('Sudão do Sul'), 83);
  assert.equal(pos('Coreia'), 'ambiguous'); // pede "do Sul" ou "do Norte"
  assert.equal(pos('Inglaterra'), 'none'); // o país da lista é o Reino Unido
  assert.equal(pos('Suíça'), 'none'); // nº 101, fora da lista
});

test('cidades: nomes completos, apelidos e cidades de nome parecido', () => {
  const pos = matcherOf(getCategory('top100-cidades-brasil'));
  assert.equal(pos('sao paulo'), 1);
  assert.equal(pos('Sampa'), 1);
  assert.equal(pos('Rio'), 2);
  assert.equal(pos('BH'), 6);
  assert.equal(pos('Floripa'), pos('Florianópolis'));
  assert.equal(pos('Vitória'), 87);
  assert.equal(pos('Vitória da Conquista'), 68);
  assert.notEqual(pos('Campo Grande'), pos('Campina Grande'));
  assert.equal(pos('Caxias'), 'ambiguous'); // Duque de Caxias ou Caxias do Sul
  assert.equal(pos('Cotia'), 100);
  assert.equal(pos('Imperatriz'), 'none'); // nº 102, fora da lista
});

test('nomes: grafias alternativas contam como a forma da lista', () => {
  const pos = matcherOf(getCategory('top100-nomes-brasil'));
  assert.equal(pos('Raphael'), 15); // Rafael
  assert.equal(pos('Thyago'), 52); // Thiago (mais parecido que Tiago)
  assert.equal(pos('Kamila'), 59); // Camila
  assert.equal(pos('Isabella'), 77); // Isabela
  assert.equal(pos('Sarah'), 96); // Sara
  assert.equal(pos('Henrike'), 95); // Henrique
  assert.equal(pos('Phelipe'), 20); // Felipe
});

test('nomes: grafias que são itens próprios no IBGE continuam separadas', () => {
  const pos = matcherOf(getCategory('top100-nomes-brasil'));
  assert.equal(pos('Thiago'), 52);
  assert.equal(pos('Tiago'), 76);
  assert.equal(pos('Matheus'), 24);
  assert.equal(pos('Mateus'), 49);
  assert.equal(pos('Érica'), 'none'); // nem Érica nem Érika estão no top 100
  assert.equal(pos('Erika'), 'none');
});

test('países: nomes em inglês e grafias alternativas (conferência de grafias)', () => {
  const pos = matcherOf(getCategory('top100-paises-populacao'));
  assert.equal(pos('iran'), 17); // antes só "Irã" valia
  assert.equal(pos('Japan'), 12);
  assert.equal(pos('Germany'), 19);
  assert.equal(pos('Philipinas'), 13);
  assert.equal(pos('Thailandia'), 20);
  assert.equal(pos('Bielorussia'), 100);
  assert.equal(pos('Emirados'), 89);
  assert.equal(pos('Switzerland'), 'none'); // nº 101
  assert.equal(pos('Hong Kong'), 'none');
});

test('SBT 2012: apelidos, sobrenomes e palpites vagos (conferência de grafias)', () => {
  const pos = matcherOf(getCategory('top100-maior-brasileiro-sbt'));
  assert.equal(pos('Chico Xavier'), 1);
  assert.equal(pos('JK'), 5);
  assert.equal(pos('Ayrton Sena'), 6); // grafia errada de Senna
  assert.equal(pos('Ronaldinho'), 82);
  assert.equal(pos('Dedé'), 63); // na frente de Carlos Chagas (66)
  assert.equal(pos('Maria'), 'none'); // primeiro nome sozinho não vale a Maria da Penha (#100)
  assert.equal(pos('Carlos'), 'ambiguous'); // não vira Roberto Carlos: pede para especificar (Chagas, Drummond...)
  assert.equal(pos('Soares'), 'ambiguous'); // RR Soares ou Jô Soares
  assert.equal(pos('Silvio Santos'), 'none');
});

test('músicas RS: nome da música, grafias e homônimos', () => {
  const pos = matcherOf(getCategory('top100-musicas-brasileiras-rs'));
  assert.equal(pos('Construção'), 1);
  assert.equal(pos('Panis et Circenses'), 7);
  assert.equal(pos('Que país é esse'), 81);
  assert.equal(pos('Ana Júlia'), 100);
  assert.equal(pos('Rosa'), 84);
  assert.equal(pos('Rosa de Hiroshima'), 69);
  assert.equal(pos('Evidências'), 'none');
  assert.equal(pos('Chico Buarque'), 'none'); // vale a música, não o artista
});

test('marcas: apelidos e marcas de fora', () => {
  const pos = matcherOf(getCategory('top100-marcas-interbrand'));
  assert.equal(pos('Coca'), 7);
  assert.equal(pos('McDonalds'), 9);
  assert.equal(pos('HM'), 68);
  assert.equal(pos('DHL'), 100);
  assert.equal(pos('Meta'), 'none');
  assert.equal(pos('Land Rover'), 'none'); // a da lista é Range Rover
});

test('clubes CBF: apelidos, homônimos com estado e Portuguesa', () => {
  const pos = matcherOf(getCategory('top100-clubes-cbf'));
  assert.equal(pos('Mengão'), 1);
  assert.equal(pos('Timão'), 2);
  assert.equal(pos('Botafogo'), 7); // o do Rio
  assert.equal(pos('Botafogo-SP'), 34);
  assert.equal(pos('Fluminense-PI'), 97);
  assert.equal(pos('Atlético'), 'ambiguous'); // MG ou GO
  assert.equal(pos('Brasil'), 68);
  assert.equal(pos('Portuguesa'), 'none'); // a famosa é a de SP, fora da lista
  assert.equal(pos('Treze'), 100);
});

test('séries IMDb: títulos em PT/EN, apelidos e Dragon Ball Z duplicado', () => {
  const pos = matcherOf(getCategory('top100-series-imdb'));
  assert.equal(pos('Breaking Bad'), 1);
  assert.equal(pos('Família Soprano'), 8);
  assert.equal(pos('Ataque dos Titãs'), 16);
  assert.equal(pos('Bojack'), 67);
  assert.equal(pos('Dragon Ball Z'), 76); // o original de 1989; a versão de 1996 (#74) pede o ano
  assert.equal(pos('Dragon Ball Z 1996'), 74);
  assert.equal(pos('Naruto'), 'none'); // só Naruto Shippuden (#99) está na lista
  assert.equal(pos('Stranger Things'), 'none');
});

test('sobrenomes: grafias que são sobrenomes próprios e letras dobradas', () => {
  const pos = matcherOf(getCategory('top100-sobrenomes-brasil'));
  assert.equal(pos('Souza'), 4);
  assert.equal(pos('Sousa'), 11);
  assert.equal(pos('Mello'), 34); // Melo
  assert.equal(pos('Mattos'), 65); // Matos
  assert.equal(pos('Junior'), 46);
  assert.equal(pos('Cordeiro'), 100);
  assert.equal(pos('Cavalcanti'), 'none'); // a da lista é Cavalcante
  assert.equal(pos('Dantas'), 'none'); // nº 101
});

test('nomes de bebês 2020-2022: grafias próprias e variantes', () => {
  const pos = matcherOf(getCategory('top100-nomes-bebes-2020-2022'));
  assert.equal(pos('Arthur'), 6);
  assert.equal(pos('Artur'), 38);
  assert.equal(pos('Teo'), 18); // Theo
  assert.equal(pos('Isys'), 33); // Isis
  assert.equal(pos('Brian'), 89); // Bryan
  assert.equal(pos('Benjamim'), 100);
  assert.equal(pos('Clara'), 'none'); // nº 101
});
