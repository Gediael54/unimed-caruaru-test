# Arquitetura Kata 2

## Objetivos

O quadro de tarefas é propositalmente pequeno, mas ainda mantém fronteiras claras entre as camadas para que o código seja fácil de revisar e evoluir.

## Estrutura do Backend

- `Controllers/`: roteamento HTTP, códigos de status e mapeamento entre requisição e resposta.
- `Dtos/`: contratos públicos da API.
- `Models/`: modelos internos de domínio e armazenamento.
- `Repositories/`: fronteira de persistência. A implementação atual é em memória.
- `Services/`: validação e regras de negócio.

O controller não é dono das regras de tarefa. O repositório não valida entrada de negócio. Os DTOs mantêm os contratos externos separados dos modelos internos.

## Estrutura do Frontend

- `src/api.ts`: funções do cliente HTTP da API.
- `src/types.ts`: tipos de tarefa compartilhados entre UI e cliente de API.
- `src/App.tsx`: comportamento do quadro e renderização.
- `src/styles.css`: regras de layout e estilo.

Em uma aplicação maior o próximo passo seria dividir `App.tsx` em `components/`, `services/` e `models/`. Para o escopo do kata, a estrutura atual mantém a superfície pequena sem esconder o fluxo principal.

## System Design

O frontend conversa com o backend via HTTP. No desenvolvimento local o Vite faz proxy de `/tasks` para `http://localhost:5000`. O backend mantém as tarefas em memória porque o requisito não exige persistência durável.

A evolução para produção deve adicionar banco de dados, autenticação, verificação de propriedade, observabilidade e gestão de migrações antes de atender usuários reais.
