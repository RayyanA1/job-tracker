import type { FormEvent } from 'react';
import type { Application } from '@tracker/shared';
import { Check, ChevronLeft } from 'lucide-react';
import { PageHeading } from '../../components/PageHeading/PageHeading';
import type { ApplicationEditorProps } from './types';
import { OpportunitySection } from './OpportunitySection';
import { QuestionsSection } from './QuestionsSection';
import { InterviewStagesSection } from './InterviewStagesSection';
import { ApplicationSidebar } from './ApplicationSidebar';
import { CvAttachment } from '../cvs/CvAttachment';
import './ApplicationDetailPage.css';
export function ApplicationDetailPage({
  selected,
  draft,
  patch,
  saving,
  dirty,
  onBack,
  onSave,
  onCreateCv,
}: ApplicationEditorProps & {
  selected: Application;
  saving: boolean;
  dirty: boolean;
  onBack: () => void;
  onSave: (event: FormEvent) => void;
  onCreateCv: () => void;
}) {
  return (
    <form onSubmit={onSave}>
      <button type="button" className="back" onClick={onBack}>
        <ChevronLeft size={17} /> All applications
      </button>
      <PageHeading
        eyebrow="APPLICATION DETAILS"
        title={selected.company}
        subtitle={selected.role}
      >
        <button className="primary" disabled={saving}>
          {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          {!dirty && <Check size={17} />}
        </button>
      </PageHeading>
      <fieldset disabled={saving} className="editor-fields">
        <div className="detail-layout">
          <div className="detail-main">
            <OpportunitySection draft={draft} patch={patch} />
            <CvAttachment
              key={selected.id}
              applicationId={selected.id}
              onCreate={onCreateCv}
            />
            <QuestionsSection draft={draft} patch={patch} />
            <InterviewStagesSection draft={draft} patch={patch} />
          </div>
          <ApplicationSidebar draft={draft} patch={patch} dirty={dirty} />
        </div>
      </fieldset>
      <div className="save-bar">
        <span>
          {dirty
            ? 'Ready when you are. Save your latest updates.'
            : 'Everything is up to date.'}
        </span>
        <button className="primary" disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
