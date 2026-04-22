# Kata 2 - Engenharia

Este arquivo registra o racional tecnico da Kata 2 no novo recorte de
**robust MVP**.

## 1. Decisao central de arquitetura

O sistema continua como **single-workspace** e **sem autenticacao real**, mas o
dominio deixa de ser uma todo-list simples. A entidade principal do board passa
a precisar suportar:

- `title`
- `description`
- `priority`
- `status`
- timestamps tecnicos
- marcador de arquivamento para `soft delete`

Isso eleva o valor do produto sem forcar subsistemas de identidade antes da
hora.

## 2. Modelo de dominio do board

O board profissional exige duas separacoes conceituais:

### Estado operacional

Representa o ciclo de trabalho do card:

- `pending`
- `in_progress`
- `completed`
- `cancelled`

### Estado de ciclo de vida

Representa se o card ainda pertence ao board ativo:

- ativo
- arquivado

`DELETE` deve atuar no segundo eixo. Arquivar nao e o mesmo que concluir ou
cancelar. Essa separacao evita misturar "sumiu do quadro" com "estado do
trabalho".

## 3. Por que manter single-workspace agora

Single-workspace e a menor unidade coerente para este MVP porque:

- mantem o contrato simples;
- reduz o numero de invariantes no backend;
- permite focar na qualidade do board e nao em tenancy;
- preserva uma migracao limpa para multiworkspace depois.

Na pratica, isso significa que o sistema opera sobre um unico contexto de
trabalho compartilhado pelo produto, sem precisar decidir ainda quem e dono de
cada card.

## 4. Por que auth, times e permissao ficam para a proxima fase

Esses temas foram explicitamente empurrados para a fase seguinte porque nao sao
detalhes de UI. Eles exigem mudancas estruturais:

1. **Identidade**: usuario, sessao, token, expiracao e revogacao.
2. **Autorizacao**: papel, escopo de acao, ownership e isolamento de dados.
3. **Modelo relacional**: `workspace`, `membership`, `user`, possivel
   `owner_id`, `assignee_id` e auditoria.
4. **Operacao**: trilha de acesso, observabilidade, rate limit e politicas de
   incidente.

Documentar isso como proxima fase e mais correto do que fingir que um login
cosmetico resolve o problema.

## 5. Por que login fake seria pior

Login fake parece acelerar a percepcao de maturidade, mas tecnicamente piora a
base:

- introduz estado de sessao que nao protege nada;
- sugere isolamento entre usuarios que o backend nao implementa;
- contamina testes com cenarios artificiais;
- aumenta a chance de a proxima fase ter que ser reescrita, nao apenas
  evoluida.

Neste contexto, o caminho serio e:

- documentar claramente o limite atual;
- fortalecer o modelo do board;
- preparar a arquitetura para auth real em vez de simulacao.

## 6. Soft delete por `DELETE`

Tratar `DELETE` como arquivamento e a escolha mais coerente para este MVP:

- evita perda destrutiva de informacao;
- aproxima o comportamento de ferramentas de board reais;
- deixa espaco para historico e restauracao futura;
- continua simples do ponto de vista de UX.

A implementacao recomendada e marcar o card como arquivado e exclui-lo apenas da
listagem padrao do board ativo.

## 7. Evolucao arquitetural seguinte

Quando o produto entrar na fase de colaboracao real, a arquitetura deve mudar
de forma explicita:

- introduzir autenticacao confiavel;
- separar `workspace` e membership;
- atrelar cards a ownership e/ou responsavel;
- adicionar politicas de permissao;
- suportar auditoria e restauracao de arquivo;
- migrar de repositório puramente em memoria para persistencia duravel.

Esse sequenciamento preserva o MVP atual e evita retrabalho de contrato.

## 8. Sintese tecnica

O robust MVP da Kata 2 nao tenta parecer um produto enterprise completo. Ele
faz algo melhor: entrega um board crivel com modelo de dominio mais forte e
deixa explicito que colaboracao autenticada e uma etapa arquitetural propria.
