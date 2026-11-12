# SM109 — Roteiro de homologação Android (PWA)

Status: ROTEIRO. Nenhuma homologação realizada. Não declarar "homologado" sem os resultados abaixo preenchidos em aparelho físico.

Base: `docs/ai/SM95_4_HOMOLOGACAO_ANDROID.md` (plano original) e as correções locais da SM95 (`codex/sm95-boot-fix-main`, publicada em `c22eb9b`) e da SM109 (`codex/sm109-sw-nav-timeout`, local, NÃO publicada).

## 0. Pré-requisitos
- Aparelho Android físico, Chrome atualizado, conexão Wi-Fi e dados móveis disponíveis.
- Build a testar identificado pelo SHA do commit. A homologação precisa rodar o build correto: não testar a produção como se fosse a correção.
- Conta de teste ou dados sintéticos. Nunca usar a carteira real do proprietário para testes destrutivos.
- Não limpar dados do navegador nem do PWA de produção (regra da SM95).
- Registrar: modelo do aparelho, versão do Android, versão do Chrome, SHA do build, data e hora.

## 1. Instalação
1. Abrir a URL de homologação no Chrome. Confirmar o banner de identificação do build (SHA exibido).
2. Menu do Chrome → "Instalar aplicativo" (ou "Adicionar à tela inicial"). Anotar se o ícone aparece.
3. Abrir pelo ícone (não pela aba do Chrome). Anotar se abre em modo standalone.

Critério: instalação concluída; abertura pelo ícone sem barra do navegador.

## 2. Primeira abertura (rede normal)
- Tempo até a tela de acesso ou o painel. Esperado: sem tela em branco além de alguns segundos.
- Anotar mensagens exibidas e qualquer erro.

## 3. Fechamento completo e reabertura
- Fechar o app pelo gerenciador de apps recentes.
- Reabrir pelo ícone. Repetir 10 vezes (20 se houver tempo).
- Critério: todas as reaberturas renderizam; nenhuma tela em branco persistente; nenhuma perda de dados locais.

## 4. Rede lenta
- Ativar um limitador de rede ou usar um Wi-Fi lento. Abrir o app.
- Critério: aparece a tela de acesso ou "Verificando acesso" em tempo razoável; a tela não fica em branco indefinidamente.

## 5. Rede travada (sem resposta)
- Trocar para uma rede sem internet real (ex.: Wi-Fi de portal cativo sem saída) ou desligar dados e manter Wi-Fi sem rota.
- Abrir o app pelo ícone.
- Critério: o app mostra estado de rede ou tela de acesso dentro de poucos segundos (meta do build: navegação confirmada em até ~4 s, script carregado do cache quando há cópia).

## 6. Offline
- Modo avião com o app já aberto pelo menos uma vez com rede.
- Fechar e reabrir o app em modo avião.
- Critério: abre pela cópia em cache (tela de acesso ou o último painel). Anotar se algum script ausente impede a renderização (ver limitação de pré-cache, seção 9).

## 7. Reconexão
- Com o app aberto, reativar a rede. Recarregar.
- Critério: volta ao comportamento normal, sem erro persistente e sem necessidade de limpar dados.

## 8. Atualização do aplicativo
- Só se houver uma versão nova publicada (não é o caso da homologação atual).
- Registrar a versão antes e depois. Abrir o app e confirmar que o SW novo assume (ver `SW_VERSION` no `sw.js`).
- Critério: nova versão carrega; dados locais preservados.

## 9. Limitação conhecida (registrar, não corrigir nesta fase)
- `APP_SHELL` do `sw.js` lista 6 de 90 scripts/estilos locais do `index.html`. Os demais entram no cache na primeira carga controlada pelo SW. Consequência: o primeiro acesso offline, sem visita anterior com SW ativo, não renderiza o app.
- Ampliar o `APP_SHELL` muda a estratégia de cache e exige análise própria.

## 10. Registro de resultados (preencher em aparelho)

| # | Passo | Resultado (PASSOU/FALHOU/NÃO TESTADO) | Tempo | Observações |
|---|---|---|---|---|
| 1 | Instalação pelo ícone | | | |
| 2 | Primeira abertura | | | |
| 3 | Reabertura x10 | | | |
| 4 | Rede lenta | | | |
| 5 | Rede travada | | | |
| 6 | Offline | | | |
| 7 | Reconexão | | | |
| 8 | Atualização | | | |

Aparelho: ____  Android: ____  Chrome: ____  SHA do build: ____  Data: ____

## 11. Critério GO / NO-GO
- GO apenas com a tabela preenchida em aparelho físico, todos os passos obrigatórios PASSOU, nenhuma perda de dados locais, e SHA do build registrado.
- NO-GO se qualquer passo de abertura, reabertura ou rede travada falhar, ou se houver perda de dados.
- Enquanto não houver evidência física, o estado é NÃO HOMOLOGADO.
