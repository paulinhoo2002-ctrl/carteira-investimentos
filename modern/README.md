# Shell moderno isolado

Fase 2 da modernizacao da Carteira de Investimentos.

## Rodar

```bash
npm run dev:modern
```

## Build

```bash
npm run build:modern
```

## Host experimental

```bash
http://127.0.0.1:4173/host.html
```

O host compartilha o mesmo shell moderno, mas fica fora do fluxo principal. Ele usa a fonte legada readonly real somente nesse entrypoint experimental e cai para a fonte demonstrativa se a carga falhar.

No host experimental, a previa de Relatorios ganha um botao manual de atualizacao. Ele apenas solicita uma nova leitura readonly e preserva o ultimo snapshot valido se algo falhar.
Quando o host esta em modo experimental, um diagnostico discreto mostra se a origem veio da carteira ativa real, de um snapshot vazio valido, do fallback readonly ou da fonte demonstrativa.

## Carteira ativa experimental

Quando for preciso compor a carteira ativa em memoria do legado, use o entrypoint isolado do app principal:

```bash
../index.html?activeWalletHost=1
```

Esse modo continua somente leitura. Ele injeta os ativos do legado apenas na composicao experimental, sem expor `S` ao React e sem criar copia permanente da carteira.

## Observacoes

- esta base nao le dados reais da carteira;
- a tela de Relatorios consome snapshot somente leitura por ponte e adaptador explicitos;
- nao acessa sistemas externos ou armazenamento persistente;
- o build sai em `modern/dist`.

## Navegacao

O shell visual organiza os IDs em grupos para desktop e mobile:

- `PRIMARY` e `SECONDARY` no sidebar (desktop e drawer mobile);
- `MOBILE_BOTTOM` na barra inferior fixa (<1024px) com item virtual `more`;
- `MOBILE_MORE` no painel `Mais` acessivel pelo botao `more` da barra inferior.

A lista completa de IDs vive no contrato canonico (`readonly-report-page-contract.js`) e no catalogo visual (`MODERN_PAGES` em `modern/src/types/navigation.mjs`). O modulo `modern/src/types/shellNavigation.mjs` apenas agrupa IDs ja validados contra `MODERN_PAGES` e nao introduz listas paralelas.
