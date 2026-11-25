import type { ReactNode } from 'react';
import { BriefcaseBusiness, FileText, ListChecks } from 'lucide-react';
import './AppShell.css';
export function AppShell({
  applicationCount,
  company,
  onBack,
  onCvLibrary,
  showingCvs,
  children,
}: {
  applicationCount: number;
  company: string | undefined;
  onBack: () => void;
  onCvLibrary: () => void;
  showingCvs: boolean;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onBack();
          }}
        >
          <span className="logo">
            <BriefcaseBusiness size={23} />
          </span>
          waymark<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <button className={showingCvs ? 'nav' : 'nav active'} onClick={onBack}>
          <ListChecks size={19} /> Applications <span>{applicationCount}</span>
        </button>
        <button
          className={showingCvs ? 'nav active' : 'nav'}
          onClick={onCvLibrary}
        >
          <FileText size={19} /> CV Library
        </button>
        <div className="sidebar-bottom">
          <div className="avatar">Y</div>
          <div>
            Your next chapter<small>One step at a time.</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{' '}
            {showingCvs ? 'CV Library' : 'Applications'}{' '}
            {company && (
              <>
                <span className="slash">/</span>
                <strong>{company}</strong>
              </>
            )}
          </span>
          <span className="private-label">Personal job tracker</span>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
