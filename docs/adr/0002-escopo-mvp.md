# 0002 — Escopo do MVP

- **Status:** accepted
- **Data:** 2026-10-03
- **Decisores:** fundadores do projeto

## Contexto

Havia risco de tentar um jogo "grande e quebrado". A preferência explícita foi:
**escopo menor, mas 100% funcional de ponta a ponta**, com backend real de tempo real.

## Decisão

Entregar um MVP jogável com:

1. Lobby: criar sala → código → entrar → nome + avatar → host inicia.
2. Uma categoria fixa populada ("Top 100 filmes segundo o IMDb", snapshot).
3. Rodada com timer, respostas ocultas até todos responderem (ou o tempo acabar).
4. Revelação com posição real e pontos (`pontos = rank`, fora da lista = 0).
5. Placar acumulado e tela de resultado final.
6. Extras pedidos que couberam: avaliação de categoria (👍/👎), modo **offline**
   (passa-o-aparelho) e **"concede"** ao atingir 95+.

Fica **fora** desta versão: contas de usuário, múltiplas categorias, pacotes pagos,
cosméticos, chat de texto, reconexão automática e espectadores.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Só o mínimo (lobby+rodada) | entrega mais rápida | deixaria de fora pedidos claros (offline, avaliação, concede) |
| MVP + monetização já | validação de receita cedo | complexidade alta antes de validar o jogo em si |

## Consequências

- **Positivas:** o jogo roda de ponta a ponta hoje; base sólida para incrementos.
- **Negativas:** sem reconexão, cair da internet perde o lugar na sala; só 1 categoria
  (o "categoria aleatória" fica pronto mas sem variedade para sortear).
- **Confiança:** alta.
- **Reavaliar se:** o playtest mostrar que um item fora do escopo é essencial (ex.:
  reconexão).
