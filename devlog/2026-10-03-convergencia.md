# 2026-10-03 — Comparação das versões e início da convergência

**Quem trabalhou:** Hubert
**Ferramenta de IA usada:** Claude Code

## Objetivo da sessão

Comparar a versão antiga do Zambelli com a `main` e decidir o que portar.

## O que foi feito

- Comparação lado a lado: os mesmos 29 chutes rodados nos dois reconhecedores, testes
  das duas versões (`main`: 14/14; antiga: 12/12).
- Decisão de convergência registrada em `docs/adr/0006-convergencia-das-versoes.md`.
- `old_version/` adicionada ao `.gitignore`.
- Build avulso do modo offline num único HTML (sem servidor), usando o reconhecimento da
  versão antiga, para testar no celular. Fora do repositório por enquanto; vira
  ferramenta no PR do frontend.

## Decisões tomadas

- Jogo = versão do Zambelli; processo = `main` (ADR-0006).
- Proteção da `main` **não é possível** no plano gratuito com repositório privado
  (`gh api .../branches/main/protection` → HTTP 403, "Upgrade to GitHub Pro or make this
  repository public"). O "toda mudança via PR" do ADR-0005 vale por combinado, não por
  regra técnica.

## Pendências / próximo passo

- [ ] PR 2: servidor e reconhecimento da antiga; fechar `GET /api/categories/:id`.
- [ ] Apagar a branch remota `docs/guia-do-parceiro` (já mergeada no #2).
- [ ] Decidir: repositório público, GitHub Pro, ou manter a `main` sem proteção.

## Atrito / o que doeu

- A transcrição de handoff dizia "26 testes"; o repositório tem 14. Vale o repositório.
- Commits desta máquina saíam como `Top100 Dev <dev@top100.local>`; identidade corrigida
  para Hubert.

## Continuação — troca de base (ADR-0007)

- PRs 2, 3 e 4 do plano viraram um só: o frontend antigo fala um protocolo Socket.IO
  diferente do servidor da `main`, então trocar só um lado quebraria o jogo.
- Servidor, regras, reconhecimento, dados e visual da versão do Zambelli em `src/`
  (ESM). Modo offline mantido, agora com o mesmo `matcher.js`.
- `npm test`: 34/34 (inclui o ponta a ponta com 3 clientes Socket.IO).
- Smoke test no Edge (tela de celular, servidor real): home online com o visual antigo,
  partida offline completa ("brilho eterno" → 100, "clube da luta" → 13), sem erros.
- Feedback de jogo do Hubert registrado nas issues #7–#11, mencionando o Zambelli.
- Branch remota `docs/guia-do-parceiro` apagada.

## Continuação — modo offline com o visual antigo

- O arquivo de celular ainda tinha o visual da versão reconstruída: o visual antigo só
  tinha voltado no online. O offline foi refeito com as mesmas peças do online (régua,
  ingressos, pódio, "Já saíram") e as regras ganharam status, filme queimado e jackpot.
- `npm run celular` gera o arquivo único (fontes embutidas; pôsteres opcionais, fora do
  repo por causa do direito de uso, issue #10).
- Testado no Edge com tela de celular, servidor e arquivo local: partida de 2 rodadas,
  filme queimado recusado, aviso de 95+, tela final; sem erros e sem rolagem lateral.
- Workflow de novidades: filtro do "Co-authored-by" agora ignora maiúsculas.

## Continuação — feedback do teste com a família (plano aprovado, PR A)

- Teclado cobria o campo: campo e botão agora logo abaixo do título da rodada, erro inline
  abaixo do campo, toasts no topo em telas pequenas, viewport com
  `interactive-widget=resizes-content`.
- Régua minúscula no celular: abaixo de 600px vira uma barra por jogador.
- Verificado no Edge (390×844 e simulando teclado com 390×420): offline no servidor e no
  arquivo único, online com 2 abas. Campo visível (topo em ~200px), barras no celular,
  régua no desktop, sem erros e sem rolagem lateral.
- "tubarão" valendo 0 não é bug: Jaws não está no snapshot (vai para o PR B: mensagem de
  "fora" mais clara).
- PR B: ambíguo recusado no envio (ADR-0009); "fora" com texto claro. O e2e deixava o
  processo preso quando falhava (socket `beto2` só fechava no sucesso): corrigido.
- PR C: infraestrutura de várias categorias (ADR-0010). Textos "filme" saíram do código e
  foram para o bloco `ui` do JSON; `Matcher` aceita opções por categoria; sala online troca
  de categoria no lobby. 38 testes; navegador sem regressão nos dois modos.
- PR D: categoria "Top 100 nomes mais comuns do Brasil" (Censo 2022). A API do IBGE
  (`/api/v2/censos/nomes/ranking`) só devolve 20 nomes e ainda é do Censo 2010; o site do
  Censo 2022 fica atrás de verificação anti-robô (não contornamos). Ordem tirada da CNN
  Brasil (04/11/2025), conferida com as quantidades por sexo da Wikipédia: 1–41 batem,
  depois só Laura/Aline invertidas (421 pessoas). **Vale conferir no site do IBGE.**
- Nomes sem tolerância a erro de digitação: com ela "Mário" virava "Maria" e "Luiza" virava
  "Luiz". Placeholder sem exemplo (o primeiro rascunho dizia "Carla", que é o nº 97).
- Novo `test/categories.test.js`: checagens para todas as categorias (100 posições, cada
  item reconhecido pelo próprio nome, exemplo da tela de truque em posição baixa).
- PR E: categoria "Top 100 países mais populosos" (ONU, WPP 2024, estimativa de 1/7/2023,
  via tabela da Wikipédia). Nomes em português e apelidos a mão; "Coreia" pede para
  especificar; "Inglaterra" não vale (o país é o Reino Unido); Taiwan entra como a ONU
  publica. Ingresso mostra a população (`detail`).
- PR F: categoria "Top 100 maiores cidades do Brasil" direto da API SIDRA do IBGE (tabela
  4709, Censo 2022, 5.570 municípios). Apelidos só quando não apontam para cidade fora da
  lista ("Juazeiro" e "Mogi" ficaram de fora); "Caxias" pede para especificar.
- Arquivo do celular regenerado com as 4 categorias (795 KB) e testado aberto do disco.

## 2026-10-04 — segundo teste no celular (Galaxy S24)

- "raphael" não pontuava: novo `spellingVariants` no `Matcher` (ph/f, th/t, y/i, w/v,
  k/c, h final, letras dobradas), ligado em nomes. Conferência registrada em teste e na
  checklist de `docs/categorias.md`. Thiago/Tiago e Matheus/Mateus seguem separados
  (são itens próprios no IBGE). Érica/Érika não estão no top 100.
- Pôster aparecia no #95 de nomes: pôsteres agora são por categoria (só filmes).
- Linha "1 … 100" vazia acima das barras: trocada por linha de chegada em cada trilho.
- Pontuação quadrática (ADR-0011): `ceil(pos²/100)` em `src/scoring.js`. Textos de regra
  atualizados (início, lobby, "Atenção ao truque"). Testes ajustados aos novos valores.
- Fluxo em 3 etapas (pedido do Hubert): início (num celular só / online "em breve") →
  jogadores → categoria. Fim da partida: jogar de novo, trocar categoria, trocar jogadores.
  A explicação da regra reaparece só quando a categoria muda. `/` abre esse fluxo; o
  online foi para `/online` e convites `/?sala=` redirecionam.
- Avaliação de categorias (ADR-0012): status validada/experimental, categoria aleatória,
  voto no fim da partida (servidor + aparelho). Gerar categorias por IA fica para depois.
- Feedback durante o trabalho: "iran" não valia (só "Irã") → nomes em inglês dos 100 países
  como apelidos + `spellingVariants` em países; conferência completa registrada em teste.
- 95+ agora encerra a partida de verdade (revelação só oferece "Ver resultado final"); na tela
  final, "Mais um round..." reabre mantendo placar e queimados, quantas vezes quiserem.
- Melhor palpite anterior de cada jogador marcado na régua (computador) e nas barras
  (celular) até ser superado.
- O pôster em "Sumaré #98" era do arquivo antigo (antes do #22): é "Viver" (Ikiru), filme #98.
- Morte súbita: 95+ que ainda pode ser superado oferece "Só mais uma rodada (morte súbita)";
  nessa rodada, se ninguém passa da posição, acabou. #100 encerra direto. A explicação da
  regra agora anuncia a categoria em destaque ("🎲 Categoria sorteada").
- Bug de CSS do #16 achado no print: no celular, "Passe o celular para" ia para baixo do
  botão (a regra de reordenar a tela de resposta pegava a tela de passar). Corrigido.
- Quatro categorias novas: SBT 2012 (Wikipédia pt, 100 posições; top 12 pelos lugares da
  final; Dedé 63º × Carlos Chagas 66º confirmado), Rolling Stone Brasil 2009 (página oficial;
  erro da fonte na nº 34 corrigido), Interbrand 2025 (dados da página oficial) e CBF 2026
  (lista da Band). Conferência de grafias achou e corrigiu: primeiro nome sozinho valendo
  muito ("Maria" → #100), "Carlos" virando Roberto Carlos, "Portuguesa" valendo a do Rio.
- Séries do IMDb: imdb.com responde 403 até para navegador comum; não contornado. Nomes por
  sexo: aguardando o Hubert colar a lista do IBGE.
- Três categorias com listas que o Hubert copiou dos sites (04/10/2026): séries do IMDb
  (Dragon Ball Z aparece duas vezes: #76 original fica com o nome puro, #74 "versão de
  1996"), sobrenomes do IBGE (o IBGE conta "Júnior", "Filho", "Maria" como sobrenome) e
  nomes de bebês 2020–2022 (Arthur/Artur, Sofia/Sophia etc. são itens próprios).
- Publicação (ADR-0013): o Hubert topou o top100 público, desde que monetização e dados
  sensíveis fiquem fora. Varredura do histórico: planos de monetização nunca entraram no Git;
  e-mail do Zambelli estava no instalador `.cmd` (tirado do arquivo atual; segue no histórico
  do PR #3). Criado `JVHubert/top100-negocio` (privado) com o estudo de monetização.
  Pôsteres removidos. Site instalável (manifesto + service worker com versão automática) e
  Action de Pages. Testado: service worker ativo, manifesto com 3 ícones, abre sem internet.
- Selo TOP 100 (mini do letreiro da tela inicial) substitui o "Top 100" repetido nos nomes;
  `categoryTitle` em `src/category-ui.js`. Categoria SBT ganhou contexto (`ui.about`) na tela
  de explicação, sem citar posições do meio da lista (dariam pista de palpite).
