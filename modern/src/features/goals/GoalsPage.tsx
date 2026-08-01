import { DashboardSection } from '../shared/components/DashboardSection/DashboardSection';
import { EmptyState } from '../shared/components/EmptyState/EmptyState';
import './GoalsPage.css';

export function GoalsPage() {
  return (
    <div className="goals-page">
      <DashboardSection title="Metas" subtitle="Integração não disponível">
        <EmptyState
          title="Integração readonly de metas ainda não disponível"
          body="Nenhum dado mockado, nenhuma leitura direta de S.goals, nenhuma escrita e nenhum contrato novo incompleto nesta etapa."
          size="compact"
        />
      </DashboardSection>
    </div>
  );
}
