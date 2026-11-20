import type { ApplicationFilters } from './useApplicationFilters';
import { BriefcaseBusiness, Plus, Search, CalendarDays } from 'lucide-react';
import { statuses, progress } from '@tracker/shared';
import type { Application } from '@tracker/shared';
import { Badge } from '../../components/Badge/Badge';
import { Rating } from '../../components/Rating/Rating';
import { PageHeading } from '../../components/PageHeading/PageHeading';
import './ApplicationsPage.css';
const dateLabel = (s: string) =>
  s
    ? new Date(`${s}T00:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No due date';
export function ApplicationsPage({
  apps,
  loading,
  onOpen,
  onAdd,
  filter,
  setFilter,
  sort,
  setSort,
  query,
  setQuery,
}: ApplicationFilters & {
  apps: Application[];
  loading: boolean;
  onOpen: (application: Application) => void;
  onAdd: () => void;
}) {
  const shown = apps
    .filter(
      (a) =>
        (filter === 'All statuses' || a.status === filter) &&
        `${a.company} ${a.role}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'rating'
        ? (b.rating ?? 0) - (a.rating ?? 0)
        : sort === 'date'
          ? (a.nextActionDate || '9999').localeCompare(
              b.nextActionDate || '9999',
            )
          : b.updatedAt.localeCompare(a.updatedAt),
    );
  const active = apps.filter(
    (a) =>
      a.status === 'Applied' ||
      a.status === 'Interviewing' ||
      a.status === 'Offer',
  ).length;
  return (
    <>
      <PageHeading
        eyebrow="YOUR NEXT CHAPTER"
        title="Applications"
        subtitle="A little clarity for your next big move."
      >
        <button className="primary" onClick={onAdd}>
          <Plus size={18} /> Add application
        </button>
      </PageHeading>
      <div className="stats">
        <div>
          <span>Active applications</span>
          <strong>
            {active}
            <small>in your pipeline</small>
          </strong>
        </div>
        <div>
          <span>Interviewing</span>
          <strong>
            {apps.filter((a) => a.status === 'Interviewing').length}
            <small>conversations in motion</small>
          </strong>
        </div>
        <div>
          <span>Offers received</span>
          <strong>
            {apps.filter((a) => a.status === 'Offer').length}
            <small>possibilities ahead</small>
          </strong>
        </div>
      </div>
      <section className="list-panel">
        <div className="list-top">
          <h2>
            Your applications <span className="count">{apps.length}</span>
          </h2>
          <span className="muted">Keep the next step in sight.</span>
        </div>
        <div className="toolbar">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Search applications"
              placeholder="Search company or role…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter by status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {['All statuses', ...statuses].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Sort applications"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">Recently updated</option>
            <option value="rating">Highest rated</option>
            <option value="date">Next action date</option>
          </select>
        </div>
        {loading ? (
          <div className="empty">Loading your applications…</div>
        ) : shown.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>COMPANY / ROLE</th>
                  <th>STATUS</th>
                  <th>RATING</th>
                  <th>CURRENT STAGE</th>
                  <th>NEXT ACTION</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <button
                        className="company-link"
                        onClick={() => onOpen(a)}
                      >
                        <span className="company-icon">
                          {a.company.slice(0, 1).toUpperCase()}
                        </span>
                        <span>
                          <strong>{a.company}</strong>
                          <small>{a.role}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <Badge status={a.status} />
                    </td>
                    <td>
                      <Rating value={a.rating} />
                    </td>
                    <td className="stage-cell">{progress(a)}</td>
                    <td>
                      <span className="action-text">
                        {a.nextAction || 'No next action'}
                      </span>
                      {a.nextAction && (
                        <small className="due">
                          <CalendarDays size={13} />
                          {dateLabel(a.nextActionDate)}
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <span className="empty-icon">
              <BriefcaseBusiness size={28} />
            </span>
            <h3>
              {apps.length
                ? 'No matching applications'
                : 'Your next chapter starts here'}
            </h3>
            <p>
              {apps.length
                ? 'Try another search or status filter.'
                : 'Add a company and role. Fill in the details as you go.'}
            </p>
            {!apps.length && (
              <button className="secondary" onClick={onAdd}>
                <Plus size={17} /> Add your first application
              </button>
            )}
          </div>
        )}
        <footer className="table-footer">
          {shown.length} application{shown.length === 1 ? '' : 's'}
          <span>Small steps. Forward momentum.</span>
        </footer>
      </section>
    </>
  );
}
