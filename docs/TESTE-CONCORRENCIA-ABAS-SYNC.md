# Teste de concorrencia entre abas e sync

Branch: `test/reproduz-concorrencia-abas-sync`

Data do teste: `2026-07-12`

## Resumo

Este teste confirmou, com evidencias locais, que duas abas abertas da aplicacao podem manter estados diferentes em memoria e sobrescrever o armazenamento compartilhado ao salvar ou recarregar.

O risco observado nao dependeu de alterar codigo. Ele apareceu apenas com duas abas normais, usando a carteira temporaria `TESTE CONCORRENCIA ABAS`.

## Confirmacao previa

Antes do teste, foi confirmada a existencia de um backup recente no computador:

`C:\Users\pauli\Downloads\carteira-assets-2026-07-05-21-22.json`

Nao foi necessario abrir ou editar esse arquivo. Ele serviu apenas como confirmacao de que havia um backup real atualizado para o cenario.

## Metodo

Foram usadas duas abas normais do Chrome apontando para o mesmo ambiente local:

- Aba A: `http://127.0.0.1:8000/index.html`
- Aba B: `http://127.0.0.1:8000/index.html`

As duas abas compartilhavam o mesmo `localStorage`, mas mantinham `S` em memoria de forma independente.

Foi usado um script via CDP para ler:

- estado em memoria (`S.assets`)
- estado persistido (`localStorage.getItem('civ5')`)

Depois, a aba B gravou um estado proprio e a aba A foi recarregada para verificar se o estado antigo ainda conseguiria sobrescrever o armazenamento compartilhado.

## Evidencias observadas

### Estado inicial

```text
INITIAL A {"mem":["TESTE-ABA-A"],"persisted":["TESTE-ABA-B"]}
INITIAL B {"mem":["TESTE-ABA-B"],"persisted":["TESTE-ABA-B"]}
```

Interpretacao:

- A aba A estava com um estado antigo em memoria.
- A aba B estava com outro estado em memoria.
- O armazenamento compartilhado estava consistente com a aba B naquele momento.
- Isso ja mostra divergencia entre abas antes de qualquer nova acao.

### Depois do save na aba B

```text
B SAVE {"saved":true,"mem":["TESTE-ABA-B"]}
AFTER B SAVE A {"mem":["TESTE-ABA-A"],"persisted":["TESTE-ABA-B"]}
AFTER B SAVE B {"mem":["TESTE-ABA-B"],"persisted":["TESTE-ABA-B"]}
```

Interpretacao:

- A aba B conseguiu escrever seu proprio estado no armazenamento compartilhado.
- A aba A permaneceu com o estado antigo em memoria.
- O armazenamento compartilhado passou a refletir a ultima escrita da aba B.
- Nao houve sincronizacao automatico-ativa entre as abas para reconciliar o estado em memoria.

### Depois do reload da aba A

```text
AFTER A RELOAD {"mem":["TESTE-ABA-A"],"persisted":["TESTE-ABA-A"]}
```

Interpretacao:

- Ao recarregar, a aba A voltou a carregar e/ou gravar o estado antigo.
- O armazenamento compartilhado foi sobrescrito novamente.
- Isso confirma um risco real de "ultimo save vence" entre abas.

## Separacao entre fatos e hipotese

### Fatos comprovados

1. Duas abas normais mantiveram estados diferentes em memoria.
2. O armazenamento compartilhado foi sobrescrito por uma aba com estado antigo.
3. O reload de uma aba tambem conseguiu alterar o estado persistido.
4. Nao foi encontrado mecanismo local de reconciliacao entre abas no fluxo observado.

### Hipoteses

1. Em uma conta com sync remoto ativo, a janela de sobrescrita pode ficar maior.
2. Se o sync remoto estiver ativo ao mesmo tempo em que a aba antiga grava, o conflito pode sair do nivel local e afetar a copia remota.

Essas hipoteses sao coerentes com o comportamento observado, mas o risco local ja ficou comprovado sem precisar delas.

## Conclusao

O teste comprovou um risco alto de sobrescrita entre abas:

- nao existe consolidacao automatica entre memorias de abas diferentes;
- a ultima escrita pode substituir um estado mais novo ou mais correto;
- um reload tambem pode reescrever o armazenamento com estado antigo;
- isso afeta diretamente a confiabilidade de edicao concorrente.

Nao foi encontrado risco critico novo alem desse comportamento de sobrescrita local, mas o impacto funcional e alto porque uma acao inocente em uma aba pode apagar alteracoes recentes feitas em outra.

## Recomendacao

Primeira correcao recomendada:

1. Proteger contra concorrencia entre abas e sync com uma estrategia pequena e explicavel.

Solucao minima recomendada, nesta ordem:

1. Comunicacao entre abas
   - Preferir `BroadcastChannel`.
   - Prever fallback simples com evento `storage`, se necessario.
   - Nao adicionar dependencia externa.

2. Identificacao por aba
   - Cada aba recebe um identificador unico temporario.
   - O identificador nao deve ser persistido como dado da carteira.

3. Eleicao de aba ativa
   - Uma aba e considerada proprietaria da edicao.
   - As demais entram em modo somente leitura.

4. Aba secundaria
   - Pode consultar os dados.
   - Nao deve conseguir salvar, excluir, importar, restaurar ou sincronizar alteracoes enquanto nao assumir o controle.

5. Aviso visivel
   - Mostrar mensagem clara informando que outra aba esta editando.
   - Nao depender somente de console ou toast temporario.

6. Assumir controle
   - Exigir acao explicita do usuario.
   - Avisar que assumir o controle pode invalidar o estado da outra aba.
   - A aba antiga deve perder permissao de edicao ao receber o aviso.

7. Timeout seguro
   - A propriedade da edicao deve expirar quando a aba principal for fechada, travar ou deixar de enviar sinal de vida.
   - Evitar bloqueio permanente por aba encerrada incorretamente.

8. Protecoes da primeira versao
   - Nao implementar merge automatico de entidades.
   - Nao alterar schema financeiro.
   - Nao alterar calculos.
   - Nao alterar backup.
   - Nao alterar Firebase/Auth.
   - Nao alterar o formato dos dados persistidos nesta primeira correcao, salvo necessidade comprovada.

9. Limitacoes
   - `BroadcastChannel` reduz concorrencia no mesmo navegador/perfil.
   - Nao resolve sozinho conflitos entre computadores ou perfis diferentes.
   - Conflito remoto deve permanecer como fase posterior.

10. Estrategia de rollback
   - A protecao deve ficar isolada.
   - Deve ser possivel remover ou desativar sem mexer nos dados existentes.
   - Nenhuma migracao de dados deve ser necessaria.

### Nao recomendado agora

- reescrever o sistema de persistencia;
- criar um mecanismo paralelo de sync;
- mexer em calculos ou nos modelos de dados sem necessidade;
- espalhar a correcao por varias telas ao mesmo tempo.

## 17. Proposta de testes futuros

- duas abas abertas;
- fechamento normal da aba proprietaria;
- encerramento inesperado;
- tomada de controle;
- aba antiga tentando salvar;
- recarregamento;
- navegador sem suporte a `BroadcastChannel`, se aplicavel;
- desktop 1366x768;
- mobile 390x844;
- teclado;
- console;
- ausencia de perda de dados.

## Escopo nao alterado

Durante este teste nao houve alteracao em:

- `index.html`
- `save()`
- Firebase/Auth
- backup
- sincronizacao
- `sw.js`
- `firestore.rules`
- `package.json`
- calculos da aplicacao

## Status final do teste

- Branch: `test/reproduz-concorrencia-abas-sync`
- Arquivo: `docs/TESTE-CONCORRENCIA-ABAS-SYNC.md`
- Commit do documento: `6283064`
- Push da branch: realizado
- PR: #142
- Alteracao funcional: nenhuma
