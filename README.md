# Carteira de Investimentos

Sistema pessoal de controle financeiro e analise de carteira de investimentos.

## STATUS DO PROJETO

Versao atual:
v1.1.0 (Em desenvolvimento)

Status:
🟢 Desenvolvimento ativo

Ultima grande entrega:
Fase 57 - UX Premium

## DOCUMENTACAO

| Documento | Descricao |
|-----------|-----------|
| [PRODUCT.md](PRODUCT.md) | Visao do produto |
| [DESIGN.md](DESIGN.md) | Sistema de design |
| [CHANGELOG.md](CHANGELOG.md) | Historico de versoes |

## DOCUMENTACAO DO PRODUTO

| Documento | Descricao |
|-----------|-----------|
| [docs/ROADMAP.md](docs/ROADMAP.md) | Proximas fases planejadas |
| [docs/VERSION.md](docs/VERSION.md) | Versao atual e status |
| [docs/RELEASES.md](docs/RELEASES.md) | Historico de releases |
| [docs/BACKUP.md](docs/BACKUP.md) | Guia de backup e protecao de dados |

## Estabilidade e producao

Este projeto possui um guia de estabilidade com checklist de producao, backup real dos dados, regras pre-merge, pos-deploy e criacao de tag estavel.

Consulte:

[docs/ESTABILIDADE.md](docs/ESTABILIDADE.md)

## ACESSO EXPERIMENTAL

Quando o app roda em `localhost` ou `127.0.0.1` com `testMode=1`, a tela de Relatorios mostra a entrada `Relatório experimental somente leitura`.

Essa entrada abre o host readonly da carteira ativa com `activeWalletHost=1&testMode=1` e inclui retorno explicito ao legado.

O contexto visual preservado na sessao e somente a pagina moderna selecionada. O valor fica em `readonlyReportPage` na URL experimental durante a navegacao e volta para o legado junto com o retorno. Valores invalidos caem no padrao seguro e o shell independente continua sem usar esse contexto.

## PRINCIPIOS DO PROJETO

- UX em primeiro lugar.
- Mobile First.
- Performance.
- PWA.
- Codigo simples.
- Melhorias incrementais por fases.
- Nao alterar regras de negocio durante melhorias visuais.
- Sempre validar com `cmd /c npm run build`.

## ROADMAP RESUMIDO

### Concluido

✅ v1.0

### Em desenvolvimento

🚧 Fase 57

### Planejado

Fase 58  
Assistente Inteligente

Fase 59  
Automações

Fase 60  
IA Consultiva

## INFORMAÇÕES PARA DESENVOLVEDORES

Antes de implementar qualquer melhoria:

1. Ler `PRODUCT.md`
2. Ler `DESIGN.md`
3. Consultar `CHANGELOG.md`
4. Executar `cmd /c npm run build` antes de finalizar

## EXECUCAO LOCAL SEGURA

Nao abra o app diretamente por `file://`.

Evite:

- `file:///C:/Projetos/carteira-investimentos/index.html`

Use sempre um servidor local com `localhost`.

Antes de testar login local, adicione `localhost` em:

`Firebase Console > Authentication > Settings > Authorized domains`

Fluxo recomendado:

1. `npm install`
2. `npm run build`
3. `python -m http.server 4173`
4. Abrir `http://localhost:4173`

Alternativa:

1. `npx serve . -l 4173`
2. Abrir `http://localhost:4173`

Observacao:

- Se usar outra porta, mantenha o dominio `localhost`.
- O Firebase Auth valida o dominio, nao o caminho `file://`.

## QUALIDADE

O README deve permanecer limpo, objetivo e servir como ponto de entrada da documentacao.

