# STATUS — estado atual do projeto

> **Briefing rápido.** Quem chega (humano ou IA) lê isto primeiro.
> Atualize ao fim de cada sessão. Mantenha curto.

**Atualizado em:** 2026-10-03
**Versão:** 0.1.0 (fundação + MVP jogável)
**Repositório:** <https://github.com/JVHubert/top100> (privado)

## O que já está funcionando

- [x] Estrutura de documentação (README, CONTRIBUTING, CHANGELOG, ADRs, devlog)
- [x] Repositório privado publicado no GitHub + guia de colaboração (`docs/guias/subir-no-github.md`)
- [x] Zambelli (`artur-zambelli`) como colaborador, com permissão de escrita
- [x] Guia de entrada do parceiro (`docs/guias/entrar-no-projeto.md`) + instaladores de
      um clique para Windows (`ferramentas/`)
- [x] Backend real-time (Express + Socket.IO) com salas por código
- [x] Lobby: criar sala, entrar por código, escolher nome + avatar, host inicia
- [x] Rodada com timer, respostas ocultas até todos responderem
- [x] Revelação com posição real e pontos (`pontos = rank`, fora = 0)
- [x] Placar acumulado entre rodadas
- [x] Tela de resultado final (ranking)
- [x] Categoria "Top 100 filmes segundo o IMDb" (snapshot) populada
- [x] Modo offline (passa-o-celular) — `/offline.html`
- [x] Avaliação de categoria (👍/👎) + destaque das favoritas
- [x] "Concede" quando alguém faz 95+

## Em andamento

- [x] Convergência (ADR-0006/0007): preparo + **troca de base para a versão do Zambelli**
      (servidor, regras, reconhecimento PT/typos, visual antigo no online). 34 testes.
- [x] Modo offline com o visual antigo + `npm run celular` (arquivo único para celular).
- [x] Report automático das mudanças da `main` (issue "📣 Novidades da main", ADR-0008).
- [x] Feedback do teste com a família: teclado/campo visível e barras no celular (#16),
      ambíguo pede para especificar e "fora" mais claro (#17).
- [x] Várias categorias (ADR-0010): filmes, nomes do Brasil, países, cidades do Brasil.
- [ ] Conferir no site do IBGE a ordem dos nomes (veio da CNN; ver `snapshot.note`) e o
      snapshot do IMDb contra o site.
- [ ] Levar a explicação da regra (#9) para o online; decidir o pôster (#10, direito de uso);
      👍/👎 por categoria de volta.
- [ ] Deploy (`Dockerfile` + `render.yaml` da versão do Zambelli).

## Travado / dúvidas abertas

- Proteção da `main`: indisponível no plano grátis com repo privado (HTTP 403).
  Opções: repo público, GitHub Pro, ou seguir só no combinado.
- Hosting do deploy: resolvido em tese pela versão do Zambelli (Render) — entra no PR 6.
- Decidir se o placar terá "streak"/bônus de rodada múltipla.

## Próximo passo sugerido

Rodar `npm install && npm start`, abrir 2 abas e jogar uma rodada completa.
