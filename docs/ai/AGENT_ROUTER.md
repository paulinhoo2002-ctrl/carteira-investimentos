# Carteira Investimentos — Agent Router

OFFICIAL_WORKSPACE:
C:\Projetos\carteira-investimentos

---

## OWNER AGENT

**Um agente único executa a feature do início ao fim.**

O owner deve:
- investigar;
- implementar;
- testar;
- corrigir;
- validar;
- entregar resultado.

**Evitar troca de agente no meio da mesma feature.**

---

## HERMES / CODEX / OPENCODE — ORIENTAÇÃO (NÃO REGRA RÍGIDA)

| AGENTE | BOM OWNER PARA |
|--------|----------------|
| **HERMES** | UI, UX, browser QA, features, testes locais, Git/PR/CI, tarefas que exigem iteração visual |
| **CODEX** | Refatorações grandes, bugs difíceis, mudanças estruturais, verificação independente, financial/persistence/security review |
| **OPENCODE** | Investigação read-only, exploração ampla do codebase, localizar origem de problemas, produzir findings para o owner |

**IMPORTANTE**: Não transformar isso em regra rígida.
- Se Codex já começou uma feature e está funcionando bem: **Codex permanece owner**
- Se Hermes já começou: **Hermes permanece owner**
- Não trocar agente sem motivo.

---

## SEGUNDO AGENTE — SOMENTE SE NECESSÁRIO

Segundo agente **SOMENTE** se a tarefa envolver:
- finance core;
- persistência;
- migração;
- auth/security;
- arquitetura significativa;
- bug cuja causa permaneça incerta;
- refatoração cross-cutting de alto risco.

**Para UI normal: NÃO usar segundo agente.**
**Para CSS/copy/layout simples: NÃO usar segundo agente.**

---

## HANDOFF MÍNIMO (PADRÃO OFICIAL)

Quando houver transição de agente (ex: owner → reviewer), usar formato:

```
TASK=
FILES_CHANGED=
DECISIONS=
TESTS=
KNOWN_RISKS=
```

**Exemplo:**

```
TASK=melhorar Top ativos em Dividendos

FILES_CHANGED=
index.html

DECISIONS=
- manteve helpers oficiais
- layout mobile empilha Top ativos
- nenhum cálculo financeiro alterado

TESTS=
- focused PASS
- modern 750/750
- browser 390/430/1366 PASS

KNOWN_RISKS=
none
```

**O próximo agente NÃO deve reanalisar todo o projeto** se esse handoff fornecer o contexto necessário.

---

## CONTEXTO MÍNIMO POR TIPO DE MISSÃO

| TIPO | ENVIAR APENAS |
|------|---------------|
| **SMALL FIX** | problema, arquivo, resultado esperado, teste relacionado |
| **UI CHANGE** | tela, objetivo visual, skill track, viewports, restrições financeiras, teste |
| **FINANCIAL CHANGE** | contrato, invariantes, funções oficiais, testes, safety gates |
| **BUG** | reprodução, sintoma, logs, hipóteses relevantes |

**NÃO ENVIAR:**
- história completa do projeto
- AGENTS.md inteiro
- todas as skills
- relatórios antigos não relacionados
- baseline repetido sem necessidade

---

## PERFIS OFICIAIS DE EXECUÇÃO

| PERFIL | PARA | SKILLS | TESTS | BROWSER | REVIEWER |
|--------|------|--------|-------|---------|----------|
| **FAST** | CSS, copy, small fix, UI adjustment | 0-1 | focused | somente se UI | não |
| **BALANCED** | feature normal, UI significativa, bug médio | 1-2 | focused + final gates | 390/430/1366 se UI | normalmente não |
| **DEEP** | finance, persistence, security, architecture, migration, hard bug | 1-3 | full | completo se UI | sim |

---

## RELATÓRIOS

**Relatório normal (curto):**
```
FILES_CHANGED=
TESTS=
BROWSER=
RISKS=
READY=
```

**Só gerar relatório longo quando:**
- high-risk
- auditoria
- incidente
- merge/deploy
- usuário pedir