import type { DemoCard, ModernPage } from '../types/navigation';

interface PagePlaceholderProps {
  cardData?: DemoCard[];
  page: ModernPage;
}

export function PagePlaceholder({ cardData, page }: PagePlaceholderProps) {
  return (
    <section className="page-shell" aria-labelledby={`page-${page.id}`}>
      <div>
        <p className="page-shell__eyebrow">Base moderna</p>
        <h2 className="page-shell__title" id={`page-${page.id}`}>
          {page.title}
        </h2>
      </div>

      <p className="page-shell__description">{page.description}</p>
      <p className="page-shell__warning">Funcionalidade real ainda nao foi migrada.</p>

      {cardData ? (
        <div className="overview-grid" aria-label="Cartoes demonstrativos da visao geral">
          {cardData.map((card) => (
            <article className="overview-card" key={card.label}>
              <p className="overview-card__label">{card.label}</p>
              <p className="overview-card__value">{card.value}</p>
              <p className="overview-card__hint">{card.hint}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
