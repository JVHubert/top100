# 0009 — Palpite ambíguo é recusado no envio (sem gastar a vez)

- **Status:** accepted
- **Data:** 2026-10-03
- **Decisores:** Hubert

## Contexto

No teste com a família, várias rodadas foram perdidas com nomes genéricos: "batman" casa
com O Cavaleiro das Trevas (#3) e O Cavaleiro das Trevas Ressurge (#78); "senhor dos
anéis", "vingadores" e "homem-aranha" também. Até aqui o palpite era aceito e valia 0 na
revelação. A `docs/arquitetura.md` (seção 5) evitava avisar no envio para não vazar
informação sobre a lista.

## Decisão

Se o reconhecimento disser `ambiguous`, o envio é **recusado** com "Esse nome serve para
mais de um filme. Escreva o nome completo" e o jogador **continua com a vez** (online:
`GameError` em `Room.submitAnswer`; offline: `reason: 'ambiguous'` em `offline-rules.js`).
Não listamos as opções.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Pedir para especificar, sem opções (**escolhida**) | Ninguém perde a vez; não revela quais filmes | Revela que existe mais de um parecido na lista |
| Mostrar as opções da lista | Mais rápido | Entrega quais filmes estão no top 100 |
| Opções misturadas com filmes de fora | Ajuda sem entregar | Precisa de dados além do top 100 |
| Manter valendo 0 | Zero vazamento | Frustrante (feedback real) |

## Consequências

- **Positivas:** acaba a rodada perdida por nome genérico.
- **Negativas / trade-offs:** vazamento pequeno (há 2+ itens parecidos na lista, sem dizer
  quais nem as posições).
- **Confiança:** alta.
- **Reavaliar se:** jogadores passarem a usar o aviso para sondar a lista.
