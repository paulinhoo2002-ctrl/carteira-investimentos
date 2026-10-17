# Matriz de estado da Carteira LEGACY

Estado consolidado da release de 17/10/2026. `READY` descreve o código ou a operação indicada na linha, não certifica fontes financeiras que ainda estejam incompletas.

| Componente | Estado | Produção | Certificação | Próxima ação |
| --- | --- | --- | --- | --- |
| Shell do site | READY | Ativo | Release e smoke autenticado | Manutenção corretiva |
| Dashboard | READY_WITH_PARTIAL_DATA | Ativo | KPIs esperados e rota autenticada verificados | Manter cobertura explícita |
| Renda variável | PARTIAL | Ativo | Posição e resultado têm limites de cobertura | Certificar por fonte e data |
| Renda fixa | PARTIAL | Ativo | Não tratar aplicado, bruto e líquido como equivalentes | Obter evidência por produto |
| Proventos | PARTIAL | Ativo | Recebido, esperado e desconhecido separados | Completar cobertura documentada |
| Rentabilidade | READY_WITH_LIMITS | Ativo | Rota autenticada verificada; série histórica não completa | Não inferir períodos sem fonte |
| Auth | OPERATIONAL | Ativo | Smoke com conta autorizada passou | Revisar recuperação administrativa |
| Backup/restore | LIMITED | Ativo | Não certificado como recuperação independente completa | Exercício sintético isolado e revisão do destino |
| Package2 V3 | CODE_READY_READ_ONLY | Não promovido | Contrato local e dry-run | Exigir gates e autorização próprios |
| Motor IR2026 | CODE_READY | Ativo como motor | Código e testes passaram | Aguardar evidência fiscal |
| IR2026 real | BLOCKED_BY_EVIDENCE | Não certificado | Imposto não calculado | Certificar abertura, perdas, custos e retenções |
| Patrimônio global | NOT_CERTIFIED | Não declarar total global | Custodiantes, datas e cobertura ainda precisam de reconciliação | Reconciliação com datas comparáveis |
| Acessibilidade autenticada | NOT_VERIFIED_DIRECTLY | Sem alegação de Axe em produção | Axe do painel autenticado não executado | Executar quando houver janela segura |
| Privacidade histórica | OPEN_BACKLOG | Árvore atual sanitizada no diferencial de release | Histórico remoto antigo da #500 preservado | Avaliar remediação sem reescrever história sem aprovação |
| Recuperação administrativa | OPEN | Sem mudança de acesso | MFA e recuperação não revalidados nesta release | Confirmar diretamente nos provedores |

## Leitura correta

- `CODE_READY` não significa `DATA_CERTIFIED`.
- `PRODUCTION=READY` descreve a implantação do commit registrado na release; não promove Package2 V3 nem certifica patrimônio global.
- `NOT_VERIFIED_DIRECTLY` e `BLOCKED_BY_EVIDENCE` nunca devem ser convertidos em `PASS` por inferência.
