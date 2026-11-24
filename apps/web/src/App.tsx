import { useState } from 'react';
import type { JobPosting } from '@tracker/shared';
import { CvLibraryPage } from './pages/cvs/CvLibraryPage';
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
  const [cvPage, setCvPage] = useState<{
    application: { id: string; job: JobPosting } | null;
  } | null>(null);
  function createCv() {
    if (!tracker.selected || !tracker.draft) return;
    const { company, role, jobLink } = tracker.draft;
    setCvPage({
      application: {
        id: tracker.selected.id,
        job: { company, title: role, url: jobLink, description: '' },
      },
    });
  }
  return (
    <AppShell
      applicationCount={tracker.apps.length}
      company={cvPage ? undefined : tracker.selected?.company}
      showingCvs={!!cvPage}
      onCvLibrary={() =>
        setCvPage((current) => current ?? { application: null })
      }
      onBack={() => (cvPage ? setCvPage(null) : tracker.back())}
    >
      {tracker.notice && <Toast message={tracker.notice} />}
      {tracker.error && !tracker.adding && (
        <ErrorMessage error={tracker.error} onDismiss={tracker.dismissError} />
      )}
      {cvPage ? (
        <CvLibraryPage
          application={cvPage.application}
          onReturn={() => setCvPage(null)}
        />
      ) : tracker.selected && tracker.draft ? (
        <ApplicationDetailPage
          selected={tracker.selected}
          draft={tracker.draft}
          patch={tracker.patch}
          saving={tracker.saving}
          dirty={tracker.dirty}
          onBack={tracker.back}
          onSave={tracker.save}
          onCreateCv={createCv}
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
