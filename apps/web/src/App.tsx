import { AppShell } from './components/AppShell/AppShell';
import { ErrorMessage, Toast } from './components/Feedback/Feedback';
import { ApplicationsPage } from './pages/applications/ApplicationsPage';
import { AddApplicationDialog } from './pages/applications/AddApplicationDialog';
import { ApplicationDetailPage } from './pages/application-detail/ApplicationDetailPage';
import { useApplicationTracker } from './hooks/useApplicationTracker';
import { useApplicationFilters } from './pages/applications/useApplicationFilters';
export function App() {
  const tracker = useApplicationTracker();
  const filters = useApplicationFilters();
  return (
    <AppShell
      applicationCount={tracker.apps.length}
      company={tracker.selected?.company}
      onBack={tracker.back}
    >
      {tracker.notice && <Toast message={tracker.notice} />}
      {tracker.error && !tracker.adding && (
        <ErrorMessage error={tracker.error} onDismiss={tracker.dismissError} />
      )}
      {tracker.selected && tracker.draft ? (
        <ApplicationDetailPage
          selected={tracker.selected}
          draft={tracker.draft}
          patch={tracker.patch}
          saving={tracker.saving}
          dirty={tracker.dirty}
          onBack={tracker.back}
          onSave={tracker.save}
        />
      ) : (
        <ApplicationsPage
          {...filters}
          apps={tracker.apps}
          loading={tracker.loading}
          onOpen={tracker.open}
          onAdd={tracker.startAdding}
        />
      )}
      {tracker.adding && (
        <AddApplicationDialog
          saving={tracker.saving}
          error={tracker.error}
          onClose={tracker.closeAdding}
          onSubmit={tracker.create}
        />
      )}
    </AppShell>
  );
}
