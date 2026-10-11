# Checklist de manutenção operacional — LEGACY

Este checklist é manual. A existência de scripts não comprova execução agendada. Para cada verificação, registre data, SHA, resultado e evidência; não inclua valores ou identificadores financeiros pessoais.

## Diariamente — disponibilidade e publicação

- Consultar o estado HTTP e o identificador de build servido com `node scripts/maintenance/health-check.js`.
- Conferir se a implantação Vercel corresponde ao SHA esperado e se a CI desse SHA terminou com sucesso.
- Se a checagem não foi executada ou a CI está pendente, registrar `NOT_TESTED`/`PENDING`; ausência de alerta não é aprovação.
- Não acessar áreas autenticadas nem dados financeiros para esta checagem.

## Semanalmente — incidentes e monitoramento

- Revisar falhas de CI, erros de runtime e incidentes registrados desde a última revisão.
- Confirmar em seu runtime administrativo quais automações estão ativas, quando executaram pela última vez e para onde enviaram resultado.
- Se o runtime ou destino não estiver acessível, registrar `UNKNOWN`; não declarar monitoramento ativo.

## Mensalmente — dependências e cópias independentes

- Revisar alertas de dependências e lockfile; testar atualizações em worktree separada, sem aplicar correção automática em lote.
- Confirmar que o proprietário completou o procedimento manual de exportação e guardou uma cópia independente, sem agentes lerem o arquivo.
- Executar o verificador somente quando houver diretório aprovado e autorização para inspecionar seus metadados; registrar hash/idade sem copiar conteúdo financeiro.
- Se não houver cópia confirmada, registrar `BACKUP=NOT_CONFIRMED`; não inferir sucesso pelo IndexedDB ou pela sincronização Firestore.

## Trimestralmente — recuperação e segurança

- Rodar fixtures sintéticas de manifesto, checksum, compatibilidade e prévia de restauração em memória/test storage isolado.
- Revalidar regras Firestore no Emulator com duas identidades sintéticas e confirmar negação de acesso cruzado.
- Revisar logout, isolamento de sessão e falhas de sincronização somente em ambiente QA isolado.
- Nenhuma restauração real faz parte deste checklist; ela requer gate humano separado.

## Anualmente — continuidade tecnológica

- Revisar suporte do runtime, dependências, arquitetura, política de retenção e responsáveis por recuperação.
- Reavaliar objetivo de recuperação e destino independente, incluindo acesso ao arquivo e à chave/hash, sem publicar segredos.
- Separar o estado certificado do sistema estável de mudanças premium ainda em revisão.
- Atualizar o checklist e a memória canônica com evidências atuais, preservando `UNKNOWN != ZERO` e `NOT_TESTED != PASS`.

## Registro mínimo

- Data e fuso horário.
- SHA e ambiente (local, emulador, Preview ou produção somente leitura).
- Gate e estado (`PASS`, `FAIL`, `PARTIAL`, `UNKNOWN`, `NOT_TESTED`).
- Link ou referência da evidência, sem valores financeiros, credenciais ou dados pessoais.
- Ação corretiva e próximo responsável/gate humano, quando aplicável.