# SM109 — Roteiro de homologação Android (PWA) — atualizado na SM117

Status: ROTEIRO PRONTO, NÃO EXECUTADO. Android físico: NÃO HOMOLOGADO. Nenhuma execução física foi feita.

## 0. Identificação do candidato (sem invenção)
- SHA candidato da variante integrada: `c6b395d4d71d` (branch `codex/integracao-variante-sm107`, publicada).
- Composição: `origin/main` + SM95 (boot) + SM109 (timeout do SW) + SM110 (preload) + SM107 (worker pdf.js na mesma origem e correção `proventoSummaryCards`) + fixture determinístico (SM115).
- Suíte automatizada na variante: `npm test` = 1418/1418, EXIT=0 (execução limpa, sem concorrência).
- URL de homologação: PENDENTE. Não existe. Não usar produção nem domínios `*.vercel.app` de produção.
- Conta sintética: PENDENTE. Não criada. Nenhuma credencial foi gerada nem registrada aqui.
- Firebase de teste hospedado: NÃO CRIADO (ver `SM116_FIREBASE_HOMOLOGACAO.md`).

Bloqueio para execução física: sem Firebase de teste hospedado e origem isolada, o aparelho não consegue login nem Firestore. O emulador local (`127.0.0.1`) não é acessível ao aparelho.

## 1. Pré-requisitos
- Aparelho Android físico, Chrome atualizado, Wi-Fi e dados móveis.
- Registrar: modelo, versão do Android, versão do Chrome, data e hora, SHA do build instalado.
- Build de homologação com banner visível "HOMOLOGAÇÃO — NÃO É A CARTEIRA DE PRODUÇÃO" e SHA exibido.
- Nunca usar a carteira real. Só contas e dados sintéticos.
- Não limpar dados do navegador nem do PWA de produção (se o aparelho tiver a produção instalada, não remover).

## 2. Cenários e passos

### 2.1 Primeira instalação
1. Abrir a URL de homologação no Chrome. Confirmar banner e SHA.
2. Menu → "Instalar aplicativo". Confirmar ícone.
3. Abrir pelo ícone. Confirmar modo standalone.
Evidência: captura de tela do ícone, do banner e do SHA.

### 2.2 Primeira abertura
- Tempo até a tela de acesso ou painel. Registrar em segundos.

### 2.3 Dez reaberturas
- Fechar pelo gerenciador de recentes e reabrir pelo ícone, 10 vezes.
- Em cada reabertura: tempo até renderização e presença de erro.

### 2.4 Rede lenta
- Limitar a rede (Wi-Fi lento ou ferramenta de limitação do aparelho) e abrir pelo ícone.
- Registrar tempo até renderização. Referência do ambiente de teste: primeiro acesso frio pode levar dezenas de segundos sem gzip; cache aquecido é esperado abaixo de 1 s.

### 2.5 Rede travada (sem resposta, com o app já instalado)
- Conectar a uma rede sem rota para a internet (ex.: Wi-Fi sem saída). Abrir pelo ícone.
- Referência do ambiente de teste (SW ativo): commit de navegação em ~4 s e render em ~4,2 s.

### 2.6 Offline
- Modo avião com o app já aberto antes. Fechar e reabrir.
- Esperado: abre pela cópia em cache, sem tela em branco.

### 2.7 Reconexão
- Reativar a rede e recarregar. Esperado: volta ao comportamento normal, sem erro persistente.

### 2.8 Atualização do service worker
- Só com uma nova versão publicada (não é o caso do candidato atual). Registrar SHA antes e depois.
- Esperado: nova versão assume; dados locais preservados; cache da versão anterior removido.

### 2.9 Importação sintética B3 (somente prévia)
- Aba "Aportes" → "Importar movimentações" → "Negociações B3 (Excel/CSV)".
- Válida: arquivo sintético com ativos fictícios (ex.: TSTE3, TSTB4). Esperado: prévia mostra os ativos.
- Inválida: arquivo que não é planilha. Esperado: mensagem de erro, sem tela em branco.
- Não confirmar nenhuma importação. Nada é gravado.

### 2.10 Exportações sintéticas (com carteira sintética carregada)
- CSV: ativos, carteira completa, IRPF. Disponíveis na tela de Relatórios.
- JSON: ativos e carteira completa.
- PDF: carteira completa. Disponível.
- XLSX: NÃO disponível na interface atual. Não testar; registrar como "não aplicável".
- Esperado: arquivo gerado, conteúdo com dados fictícios, sem erro.

## 3. Verificação de ausência de dados reais
- Antes de começar: conta sintética, sem vínculo com carteira real.
- Durante: não importar arquivos reais. Não exportar com carteira real.
- Depois: confirmar que o projeto de teste não contém dados reais (checklist de `SM116_FIREBASE_HOMOLOGACAO.md`, seção 9).

## 4. Critérios objetivos
- APROVADO (por cenário): abre sem tela em branco além do limite registrado; sem erro de console bloqueante; dados locais preservados; prévia e exportação funcionam com dados sintéticos.
- REPROVADO: qualquer tela em branco persistente; perda de dados locais; uso de domínio ou credencial de produção; importação gravada indevidamente; exportação com erro.
- Aprovação global: todos os cenários obrigatórios (2.1 a 2.7, 2.9, 2.10) aprovados em aparelho físico, com evidências.

## 5. Coleta de evidências
- Capturas de tela de cada etapa, com data e hora visíveis.
- Tabela de tempos (ver seção 6).
- Registro do SHA e do ambiente (seção 1).
- Arquivo de log do console quando possível (Chrome remoto, `chrome://inspect`).
- Guardar as evidências fora do repositório.

## 6. Tabela de resultados (preencher em aparelho)

| # | Cenário | Resultado (APROVADO/REPROVADO/NÃO TESTADO) | Tempo | Evidência |
|---|---|---|---|---|
| 2.1 | Instalação | | | |
| 2.2 | Primeira abertura | | | |
| 2.3 | Reaberturas x10 | | | |
| 2.4 | Rede lenta | | | |
| 2.5 | Rede travada | | | |
| 2.6 | Offline | | | |
| 2.7 | Reconexão | | | |
| 2.8 | Atualização SW | | | |
| 2.9 | Importação B3 válida e inválida | | | |
| 2.10 | Exportações CSV/JSON/PDF | | | |

Aparelho: ____ Android: ____ Chrome: ____ SHA: `c6b395d4d71d` Data: ____

## 7. Estado
- Técnico (automatizado): suíte 1418/1418 na variante. SW, preload e instrumentação sem regressão nos testes locais.
- Físico: NÃO HOMOLOGADO. NO-GO até existirem URL isolada, conta sintética e aparelho com as evidências acima.
