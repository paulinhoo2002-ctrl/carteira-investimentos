# Playbook de release

## Antes do PR

- Confirmar identidade física, base, branch e working tree.
- Não desenvolver no main sujo nem reutilizar V166, V178 ou V182.
- Definir escopo e risco; separar docs, UI, finanças e infraestrutura.
- Rodar os testes aplicáveis e revisar `git diff --check`.

## PR e CI

- Staging seletivo; nunca `git add .` ou `git add -A`.
- Push normal, sem force push.
- Uma PR por objetivo coerente.
- Acompanhar todos os checks até estado terminal; não declarar pronto com
  check pendente.
- Corrigir falha real sem enfraquecer testes; após duas tentativas iguais,
  mudar a estratégia de diagnóstico.

## Gates separados

- Criar PR não autoriza merge.
- CI verde não autoriza deploy manual.
- Deploy automático, quando configurado, deve ser observado, não disparado
  manualmente sem autorização.
- Certificação de produção deve usar o baseline aprovado e registrar qualquer
  mudança real.

## Finalização

Worktrees/branches locais só são removidos após prova de limpeza, equivalência
ou supersessão, ausência de PR e ausência de valor de recuperação. Histórico
ambíguo é preservado.

