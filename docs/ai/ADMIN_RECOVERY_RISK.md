# Recuperação administrativa — proposta operacional

Status: proposta de governança. Este documento não registra contas, contatos,
IDs de projeto, papéis atuais ou detalhes de recuperação de uma pessoa.
Nenhuma mudança de acesso ou de dados hospedados é autorizada por ele.

## Risco

Quando controle de código, hospedagem e dados depende de uma única identidade
administrativa, a perda dessa identidade pode interromper o acesso simultâneo
aos serviços. A condição real de cada provedor precisa ser verificada no
respectivo painel administrativo; este documento não certifica a configuração
atual.

## ADMIN_RECOVERY_V1 — proposta

1. Manter um responsável primário com autenticação multifator.
2. Definir um segundo responsável de recuperação, com acesso mínimo necessário
   e autenticação multifator, somente após decisão do proprietário.
3. Guardar o procedimento de recuperação em local privado e protegido, fora do
   repositório.
4. Exigir exportação e restauração verificadas antes de qualquer mudança de
   IAM ou de autoridade.
5. Preservar as regras de autorização fail-closed e auditar o uso da identidade
   de recuperação.

## Limites

A proposta não adiciona usuários, não altera IAM, Auth, Firestore Rules,
backups, credenciais ou configurações de hospedagem. Qualquer execução exige
uma fase e autorização próprias.