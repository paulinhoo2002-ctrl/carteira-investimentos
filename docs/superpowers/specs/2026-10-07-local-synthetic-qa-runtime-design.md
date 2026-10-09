# Local Synthetic QA Runtime — Design

**Status:** aprovada e implementada localmente em 2026-10-07; CI/Preview do commit V332 pendentes.
**Base:** `origin/main` em `cefc725f2378648c29593b27399a2f9bf2656db7`.

## Contexto e objetivo

O legado já tem fixture sintética em memória, mas hoje `localhost`/`127.0.0.1` + `?testMode=1` bastam para ativá-la. A aplicação retorna antes de inicializar Firebase, usa dados sintéticos e não persiste o estado financeiro, porém o sinal de runtime não é controlado pelo servidor. A mudança deve permitir QA local reproduzível sem depender de Firebase e impedir que a URL sozinha altere autenticação ou persistência reais.

## Decisão proposta

Ativar a sessão sintética editável em memória somente quando as três condições forem verdadeiras:

1. Um servidor local iniciado explicitamente pelo launcher de QA injeta um marcador de runtime antes do bootstrap da aplicação.
2. `location.hostname` é exatamente `localhost` ou `127.0.0.1`.
3. A URL contém `testMode=1`.

A aplicação não deve inferir o marcador a partir de hostname, query, `NODE_ENV` compilado no cliente ou configuração de Vercel. O launcher serve a página por loopback e injeta a atribuição do marcador apenas na resposta runtime QA; a resposta normal da aplicação não injeta essa atribuição. Sem qualquer condição, segue o fluxo normal existente de autenticação, autorização, Firebase e persistência. O parâmetro isolado nunca muda esse fluxo.

O launcher terá uma invocação documentada que disponibiliza `http://localhost:8765/?testMode=1`. Não requer pacote novo. O processo deve falhar claramente se a porta não puder ser vinculada a loopback ou se a página não puder ser servida; não deve trocar silenciosamente para outro modo ou host.

## Dois modos sintéticos

- **Editável efêmero:** `testMode=1` no runtime QA autorizado usa exclusivamente o estado sintético em memória atual. Ações podem alterar a sessão sintética para exercitar fluxos; nenhuma alteração financeira é gravada em localStorage, Firebase, rede ou conta real.
- **Estritamente somente leitura:** uma opção explícita adicional, por exemplo `testReadOnly=1`, só produz efeito dentro das mesmas três condições. Ela bloqueia operações mutáveis antes da alteração do estado e também nos limites compartilhados de save, armazenamento e transporte. A interface desabilita/explica ações, mas não é a barreira de segurança. Tentativa bloqueada deve produzir estado/erro determinístico e não sucesso otimista.

A implementação deverá rastrear todos os caminhos que podem alterar estado financeiro, não apenas botões visíveis. Metadados não financeiros estritamente necessários ao harness devem ser enumerados e separados; nenhum deles poderá usar a chave/armazenamento financeiro.

## Firebase, produção e emuladores

No modo sintético, a inicialização, leitura, escrita, sincronização e carregamento de SDK Firebase devem continuar ausentes; a instrumentação deve comprovar zero solicitações Firebase, em especial para o projeto de produção. Não alterar configuração Firebase de produção, regras, provedores, fluxo de login, persistência Firebase `LOCAL`, regras de autorização, ou comportamento de usuários reais.

O modo Auth + Firestore Emulator continua separado e intacto. O launcher de fixture não deve fingir ser emulador nem fornecer identidade autenticada. Visual QA sintético não certifica autenticação real nem persistência autenticada.

Marcador ausente, host diferente, `testMode` ausente ou execução em Preview/produção devem resultar no fluxo normal, sem fallback sintético. O controle negativo local verifica que a resposta normal do servidor não injeta a atribuição do marcador e que `?testMode=1` não remove o gate de login; nenhuma inspeção do Preview V332 foi feita antes da publicação.

## Experiência e diagnósticos

Exibir um aviso persistente e acessível, por exemplo **“TESTE LOCAL — dados sintéticos em memória”**; no modo readonly, acrescentar **“somente leitura”**. Incluir os nomes dos modos nos diagnósticos do harness, sem dados pessoais ou financeiros. Mensagens de bloqueio devem informar que a ação não está disponível em QA somente leitura.

## Escopo de implementação esperado

Mudança pequena e concentrada em:

- bootstrap da página para validar o marcador, host e flag antes de ativar a fixture;
- launcher/harness local para injetar o marcador em runtime, vinculado ao loopback e à porta 8765;
- guardas compartilhadas de mutação/save/transporte para readonly;
- aviso de modo e testes automatizados.

Não introduzir dependências, novo backend, credenciais, Firebase project, alterações de rules, ou mudanças na persistência real. Não substituir os emuladores existentes.

## Contratos de teste

1. Launcher QA + loopback + `testMode=1` inicia a fixture sem conexão/Firebase SDK e identifica dados sintéticos.
2. O mesmo runtime sem `testMode=1` não ativa fixture.
3. `testMode=1` sem atribuição do marcador, com host não loopback, em Preview e em produção não altera autenticação nem autorização.
4. Modo readonly bloqueia mutações em handlers/serviços e nos limites de save/armazenamento/transporte; confirmar estado e contadores de escrita inalterados.
5. Modo editável permite a interação sintética em memória, mas não produz gravações financeiras persistentes nem solicitações de rede Firebase.
6. Auth + Firestore Emulator continua com os testes e configuração atuais, sem ser confundido com fixture sintética.
7. Rotas principais, especialmente Ativos e Dividendos, renderizam usando fixture; keyboard/accessibility smoke continua operacional.
8. Playwright valida `1366×768` e `390×844`, incluindo ausência de overflow horizontal e aviso legível.
9. Regressões financeiras exclusivamente sintéticas permanecem verdes; resultados e totais não mudam fora do escopo.

## Fora do escopo e garantias

- Nenhuma alteração na autenticação ou persistência de usuários reais.
- Nenhum bypass em produção/Preview.
- Nenhuma alteração de regras Firebase ou integração de emuladores.
- Nenhuma importação, restauração, sincronização ou escrita financeira real.
- Nenhuma certificação de persistência real baseada em QA visual.

## Critérios de aceite

`LOCAL_TEST_MODE=PASS` somente com prova das três condições e dos dois submodos. `FIREBASE_INDEPENDENCE=PASS` requer zero inicialização/requisições no modo sintético. `PRODUCTION_BYPASS_PREVENTION=PASS` requer negativos com atribuição ausente e hostname não-loopback; esta validação local não equivale a inspeção de deployment. `READ_ONLY_ENFORCEMENT=PASS` requer tentativa de mutação rejeitada antes de alterar memória e com zero gravações. Evidência de browser QA não será descrita como prova de autenticação ou persistência real.

## Auto-revisão adversarial

- **Sinal falsificável:** o marcador é deliberadamente não secreto e só confiável porque é injetado exclusivamente pelo launcher de loopback e não vai no artefato de produção; os testes devem detectar vazamento no build.
- **Precedência:** o ramo readonly deve ser verificado antes de qualquer ramo que altere fixture em memória; guards só em `save()` seriam insuficientes se o handler já mutou o estado.
- **Fallback:** falha do launcher não pode cair para fixture nem iniciar em endereço externo; sem marcador o app segue a autenticação normal.
- **Compatibilidade:** manter exatamente separados fixture sintética editável, fixture sintética readonly e Auth/Firestore Emulator.
- **Persistência real:** nenhum caminho de modo sintético altera configuração ou sessão Firebase real; os testes de persistência autenticada permanecem evidência independente.
