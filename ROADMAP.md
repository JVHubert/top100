# ROADMAP

## Concluído (v0.1)

- [x] Backend real-time com salas por código
- [x] Lobby com nome + avatar e início pelo host
- [x] Rodada com timer e respostas ocultas
- [x] Revelação, pontuação (`pontos = rank`) e placar acumulado
- [x] Resultado final
- [x] Categoria IMDb (snapshot) populada
- [x] Modo offline (passa-o-celular)
- [x] Avaliação de categoria e destaque das favoritas
- [x] "Concede" em 95+

## Próximo (v0.2)

- [ ] Testes automatizados das regras em `src/game.js`
- [ ] Reconexão de jogador (se cair, volta para a sala)
- [ ] "Kick"/transferência de host
- [ ] Melhor casamento de respostas (apelidos, títulos alternativos, tolerância a erros)
- [ ] Mais categorias + seletor de **categoria aleatória**
- [ ] Persistir avaliações de categoria em arquivo/DB (hoje: `runtime/ratings.json`)

## Depois (v0.3+)

- [ ] Contas leves / apelido salvo no navegador
- [ ] Sons e animações mais ricas (vibe Jackbox/Kahoot)
- [x] Site público instalável como app (GitHub Pages) — ver ADR-0013
- [ ] Domínio próprio

## Ideias soltas (backlog, não comprometido)

- Modo espectador
- Histórico de partidas
- Chat rápido com reações (sem texto livre)
- "Concede" votado pelos jogadores (hoje é só do host)
