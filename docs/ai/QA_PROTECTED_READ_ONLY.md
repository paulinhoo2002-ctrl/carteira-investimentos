# QA protegido somente leitura

O modo oficial de QA protegido é ativado com o parâmetro de URL
`protectedReadOnlyQa=1`:

`http://127.0.0.1:4173/index.html?protectedReadOnlyQa=1`

O parâmetro é uma redução explícita de capacidade. Ele mantém leitura,
renderização e navegação disponíveis, mas bloqueia salvamento local, gravações
cloud/Firestore, locks de edição, sincronização de eventos públicos e
automação financeira. A origem pode ser localhost, produção ou outro ambiente
de QA; o parâmetro não concede autoridade adicional.

Use somente dados e fixtures sanitizados. A certificação autenticada deve
reutilizar o perfil QA oficial e continuar em modo somente leitura. Este modo
não substitui os gates de merge, deploy ou qualquer autorização de escrita.
