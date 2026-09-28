# V65 — revisão arquitetural e de segurança

## Conclusões

- O fluxo mensal proposto é pré-autorização local e rejeita flags `--real`,
  `--write` e `--execute`.
- Source, baseline, plano e target são bindings independentes; mismatch falha
  fechado.
- A sombra usa o executor oficial, mas perfis descartáveis e callbacks sem
  cloud. Nenhum dado real é copiado para autorização.
- A autorização futura é de uso único e vinculada ao HEAD + manifesto. Repetição
  exige nova decisão do usuário.
- O runtime V2/Service Worker v17 é requisito prévio; V1 não pode escrever.
- Exclusões e no-op permanecem fora do delta financeiro; duplicidade é uma gate.

## Limites e revisão

Mantis architecture/structural-index/threat-model/review/critic/report foram
aplicados como lentes de leitura e revisão deste desenho. A auditoria Firebase
mantém cloud-zero como contrato operacional; nenhuma regra foi alterada.
Browser-harness não estava disponível como executor nesta sessão; a validação
browser histórica válida foi preservada e a ferramenta nova não abre perfil real.
