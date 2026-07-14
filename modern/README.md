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

## Observacoes

- esta base nao le dados reais da carteira;
- a tela de Relatorios consome snapshot somente leitura por ponte e adaptador explicitos;
- nao acessa sistemas externos ou armazenamento persistente;
- o build sai em `modern/dist`.
