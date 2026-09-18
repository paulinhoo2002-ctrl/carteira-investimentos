# Skill Router — Carteira de Investimentos LEGACY

`SUPERPOWERS_ALWAYS_CONSIDERED=true`. Superpowers organiza planejamento,
decomposição, investigação, execução e revisão, mas nunca sobrepõe AGENTS.md,
semântica protegida, gates humanos ou segurança financeira.

## Regra global

Descobrir metadados primeiro; carregar corpo de Skill somente após seleção.
Usar menor conjunto suficiente, normalmente 2 Skills e excepcionalmente 3.
Não instalar automaticamente. Ausência de `browser-harness` → Playwright/CDP.

| TASK_PATTERN | PRIMARY_SKILLS | OPTIONAL_SKILLS | HUMAN_GATE |
|---|---|---|---|
| UI / Dashboard / Ativos / Dividendos | Superpowers + interface-design | impeccable, playwright | semântica/persistência |
| Nova direção visual | Superpowers + frontend-design | ui-ux-pro-max | aprovação visual |
| Responsive / accessibility | Superpowers + interface-design | playwright | nenhum se não financeiro |
| Browser QA / E2E | Superpowers + playwright | browser-testing-with-devtools; browser-harness se disponível | login se necessário |
| Performance UI | Superpowers + performance | playwright, code-review | nenhum se mecânico |
| Finance / persistence / import | Superpowers + doubt-driven-development | source-driven-development, code-review | gate antes de semântica/schema/confirm |
| Documentation / pre-PR | Superpowers + caveman ou code-review | verification/testing | merge humano |

## Não usar

- Skill visual em backend-only.
- `ui-ux-pro-max` para ajuste local já coberto por `interface-design`.
- Browser quando documentação basta.
- Skill como autorização para write, cloud, deploy ou merge.

## Política

`SAME_FAILURE_TWICE=PIVOT`; `REUSE_GREEN_EVIDENCE=true`;
`FUTURE_MISSIONS_DO_NOT_REPEAT_STABLE_GOVERNANCE=true`.
