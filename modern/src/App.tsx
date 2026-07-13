import { useState } from 'react';

export function App() {
  const [showNote, setShowNote] = useState(false);

  return (
    <main className="page-shell">
      <section className="panel" aria-labelledby="modern-title">
        <p className="eyebrow">Fase 161</p>
        <h1 id="modern-title">Carteira de Investimentos</h1>
        <p className="lead">
          Base moderna isolada com React, TypeScript e Vite.
        </p>
        <p className="notice">
          Nenhuma leitura ou gravação de dados reais. Esta tela existe só como
          prova técnica inicial.
        </p>

        <ul className="stack" aria-label="Tecnologias da base moderna">
          <li>React</li>
          <li>TypeScript</li>
          <li>Vite</li>
        </ul>

        <button
          className="button"
          type="button"
          onClick={() => setShowNote((current) => !current)}
        >
          {showNote ? 'Ocultar confirmação técnica' : 'Mostrar confirmação técnica'}
        </button>

        {showNote ? (
          <p className="confirmation" role="status">
            Confirmação ativa: o moderno está isolado do legado.
          </p>
        ) : null}
      </section>
    </main>
  );
}
