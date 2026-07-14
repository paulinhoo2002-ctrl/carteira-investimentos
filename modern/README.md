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

## Observacoes

- esta base nao le dados reais da carteira;
- a tela de Relatorios consome snapshot somente leitura por adaptador explicito;
- nao acessa sistemas externos ou armazenamento persistente;
- o build sai em `modern/dist`.
