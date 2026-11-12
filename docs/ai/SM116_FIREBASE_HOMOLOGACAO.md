# SM116 — Especificação: Firebase de homologação hospedado

Status: ESPECIFICAÇÃO. Nenhum recurso externo criado. Nenhum faturamento ativado. Não usar credenciais de produção. Requer autorização explícita do proprietário para cada etapa marcada como [AUTORIZAÇÃO].

## 1. Objetivo
Permitir que um aparelho Android físico acesse um PWA de homologação com login e Firestore, usando dados exclusivamente sintéticos, sem tocar no projeto de produção `carteira-de-investimento-16725`.

## 2. Isolamento obrigatório
- Projeto Firebase NOVO, sem relação de dados ou de apps com a produção. Nome sugerido: `carteira-homolog-sm116` (confirmar disponibilidade). [AUTORIZAÇÃO]
- Nenhuma app web do projeto de produção é reutilizada. Criar um app web próprio no projeto de homologação.
- Credenciais: apenas as do novo app web (`apiKey` pública do próprio projeto de teste). Nunca copiar a config de produção.
- Origem web isolada: domínio de homologação dedicado (ex.: Vercel project `carteira-homolog-sm116`, `*.vercel.app`, sem Git conectado, sem variáveis de produção). [AUTORIZAÇÃO]
- Armazenamento: origem nova => `localStorage`, IndexedDB e Service Worker separados da produção por construção (origem diferente).

## 3. Authentication
- Provedor: e-mail/senha apenas (sem Google, sem provedores reais).
- Contas: 2 a 3 contas sintéticas com domínio `.invalid` (ex.: `homolog-a@example.invalid`), criadas pelo próprio console do projeto de teste.
- A conta do dono usada pelas regras (`isOwnerAccount`) precisa de UID e e-mail definidos pelas regras versionadas. Como as regras atuais fixam o e-mail do proprietário, a conta de homologação do dono deve ser decisão explícita: (a) manter o UID fixo com e-mail sintético, exigindo ajuste das regras de homologação (arquivo separado), ou (b) testar apenas contas não-dono. Recomendação: (b) para homologação física; (a) só se o fluxo do dono for necessário. [DECISÃO]
- Verificação de e-mail: desativada no projeto de teste ou feita por link de teste controlado.

## 4. Firestore
- Banco novo em modo produção com regras versionadas (ver seção 5). Localização: a mais próxima do Brasil disponível no plano gratuito.
- Coleções: as mesmas da aplicação (`portfolios`, `users`, `meta`), apenas com dados sintéticos gerados pelo fixture do repositório.
- Nenhuma importação de dado real. Exportação e importação de homologação usam somente arquivos sintéticos.

## 5. Regras de segurança (versionadas no repositório, arquivo próprio)
- Arquivo: `firestore.homolog.rules` (NÃO substituir `firestore.rules` de produção).
- Base: regras de dono por UID e e-mail verificado, espelhando `firestore.rules` atual, com a conta do dono de homologação definida na seção 3.
- Negar tudo por padrão (default-deny); sem leitura pública.
- Validar com emulador antes de publicar: `npm run test:m594-real-rules-emulator` (suíte existente, usa regras locais).

## 6. Custos e permissões
- Plano Spark (gratuito). Não ativar Blaze (faturamento) sem autorização. [AUTORIZAÇÃO]
- Cotas do plano gratuito são suficientes para homologação com contas sintéticas. Monitorar o painel de uso.
- Permissões mínimas: a conta do operador com papel de Editor apenas no projeto de homologação. Nenhuma chave de conta de serviço fora do projeto.
- Nenhuma credencial em repositório, logs ou documentação. Verificação: `git grep` por `apiKey` real antes de publicar.

## 7. Procedimento de criação e validação (após autorização)
1. Criar projeto `carteira-homolog-sm116` no console. [AUTORIZAÇÃO]
2. Habilitar Authentication (e-mail/senha) e criar as contas sintéticas.
3. Criar banco Firestore e publicar `firestore.homolog.rules`.
4. Criar app web e copiar apenas a config desse app para o build de homologação.
5. Validar: login de conta sintética funciona; leitura de conta de outra conta sintética é negada; acesso a `meta/access` negado a não-dono.
6. Validar isolamento: a config de homologação não contém nenhum identificador do projeto de produção (`carteira-de-investimento-16725`, `*.firebaseapp.com` de produção).

## 8. Desativação e limpeza
1. Ao fim da homologação: remover as contas sintéticas e apagar a coleção `portfolios` e demais dados de teste.
2. Apagar o projeto de homologação inteiro (console → configurações → encerrar projeto) quando não for mais necessário.
3. Remover o projeto Vercel de homologação e o alias `*.vercel.app`.
4. Registrar a data de encerramento na memória. [AUTORIZAÇÃO para qualquer exclusão]

## 9. Verificações que impedem uso de produção
- Build de homologação recusa iniciar se `projectId` for o de produção (checagem em tempo de build, a implementar).
- Banner visível "HOMOLOGAÇÃO — NÃO É A CARTEIRA DE PRODUÇÃO" com o SHA do build.
- Checagem de teste: `git grep carteira-de-investimento-16725` no artefato de homologação deve retornar apenas as referências documentais já existentes.

## 10. Critério para liberar a homologação física
- Projeto criado e validado conforme seção 7.
- Config de homologação sem nenhum identificador de produção.
- Contas sintéticas funcionando em aparelho e em navegador de desktop.
- Nenhum dado real presente no projeto de homologação.

Estado atual: NÃO CRIADO. Bloqueio: autorização do proprietário para criar o projeto e publicar a origem de homologação.
