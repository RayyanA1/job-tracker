import { useEffect, useState } from 'react';
import type { CvProfile, CvProfileEntry } from '@tracker/shared';
import { cvApi } from '../../api/cvs';
import { Card } from '../../components/Card/Card';
import './CvProfileView.css';

function factAnchor(entry: CvProfileEntry) {
  return `cv-fact-${entry.id}`;
}

function FactLink({
  entry,
  children,
}: {
  entry: CvProfileEntry;
  children?: string;
}) {
  return (
    <a
      href={`#${factAnchor(entry)}`}
      onClick={(event) => {
        event.preventDefault();
        const target = document.getElementById(factAnchor(entry));
        target?.scrollIntoView({ block: 'nearest' });
        target?.focus({ preventScroll: true });
      }}
    >
      {children ?? entry.name}
    </a>
  );
}

function FactFields({ entry }: { entry: CvProfileEntry }) {
  const fields = Object.entries(entry.fields).filter(
    ([field, value]) =>
      value &&
      (entry.kind !== 'role' ||
        !['Official title', 'Dates', 'Scope'].includes(field)),
  );
  if (!fields.length) return null;
  return (
    <dl className="cv-fact-fields">
      {fields.map(([field, value]) => (
        <div key={field}>
          <dt>{field}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Profile({ profile }: { profile: CvProfile }) {
  const {
    name,
    location,
    email,
    phone,
    links,
    background,
    interests,
    headlines,
    entries,
  } = profile;
  const contact = [location, email, phone, links].filter(Boolean);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const roles = entries.filter(({ kind }) => kind === 'role');
  const projects = entries.filter(({ kind }) => kind === 'project');
  const skills = entries.filter(({ kind }) => kind === 'skill');
  const education = entries.filter(({ kind }) => kind === 'education');

  function skillLinks(entry: CvProfileEntry) {
    if (!entry.skills.length) return null;
    return (
      <ul className="cv-profile-pills" aria-label="Related skills">
        {[...new Set(entry.skills)].map((id) => (
          <li key={id}>
            <FactLink entry={byId.get(id)!} />
          </li>
        ))}
      </ul>
    );
  }

  if (!(
    name ||
    contact.length ||
    background ||
    interests ||
    headlines.length ||
    entries.length
  )) {
    return (
      <Card className="cv-stack">
        <h2>Your CV profile is empty</h2>
        <p>
          Add your career details to <code>.cv-data/local/profile.json</code>,
          then reopen this view.
        </p>
      </Card>
    );
  }

  return (
    <section className="cv-stack cv-profile" aria-label="CV profile">
      <Card className="cv-profile-intro">
        <div className="cv-profile-identity">
          <h2>{name || 'CV Profile'}</h2>
          <p>Source facts for tailored CVs</p>
          {contact.length > 0 && (
            <ul className="cv-profile-contact" aria-label="Contact details">
              {contact.map((value, index) => (
                <li key={index}>{value}</li>
              ))}
            </ul>
          )}
        </div>
        {(background || interests || headlines.length > 0) && (
          <div className="cv-profile-overview">
            {background && <p>{background}</p>}
            {headlines.length > 0 && (
              <div>
                <h3>CV headlines</h3>
                <ul className="cv-profile-pills">
                  {headlines.map((headline, index) => (
                    <li key={index}>{headline}</li>
                  ))}
                </ul>
              </div>
            )}
            {interests && (
              <div>
                <h3>Interests</h3>
                <p>{interests}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="cv-profile-layout">
        <div className="cv-stack">
          {roles.length > 0 && (
            <Card className="cv-profile-section">
              <h2>Career timeline</h2>
              <ol className="cv-career-timeline">
                {roles.map((role) => {
                  const { id, name, fields } = role;
                  const achievements = entries.filter(
                    (entry) =>
                      entry.kind === 'achievement' && entry.roleId === id,
                  );
                  const roleProjects = projects.filter(
                    (entry) => entry.roleId === id,
                  );
                  return (
                    <li
                      key={id}
                      className="cv-career-role"
                      id={factAnchor(role)}
                      tabIndex={-1}
                    >
                      <p className="cv-career-dates">{fields.Dates}</p>
                      <h3>{fields['Official title']}</h3>
                      <p className="cv-career-employer">{name}</p>
                      {fields.Scope && <p>{fields.Scope}</p>}
                      <FactFields entry={role} />
                      {skillLinks(role)}
                      {achievements.length > 0 && (
                        <ul className="cv-role-achievements">
                          {achievements.map((achievement) => (
                            <li
                              key={achievement.id}
                              id={factAnchor(achievement)}
                              tabIndex={-1}
                            >
                              <h4>{achievement.name}</h4>
                              <FactFields entry={achievement} />
                              {skillLinks(achievement)}
                            </li>
                          ))}
                        </ul>
                      )}
                      {roleProjects.length > 0 && (
                        <ul
                          className="cv-profile-pills"
                          aria-label="Related projects"
                        >
                          {roleProjects.map((project) => (
                            <li key={project.id}>
                              <FactLink entry={project} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}
          {projects.length > 0 && (
            <Card className="cv-profile-section">
              <h2>Projects</h2>
              <ul className="cv-project-list">
                {projects.map((project) => (
                  <li key={project.id} id={factAnchor(project)} tabIndex={-1}>
                    <h3>{project.name}</h3>
                    {project.roleId && (
                      <p className="cv-career-employer">
                        <FactLink entry={byId.get(project.roleId)!} />
                      </p>
                    )}
                    <FactFields entry={project} />
                    {skillLinks(project)}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="cv-stack">
          {skills.length > 0 && (
            <Card className="cv-profile-section">
              <h2>Skills and evidence</h2>
              <ul className="cv-project-list">
                {skills.map((skill) => {
                  const evidence = [
                    ...new Set([
                      ...skill.evidence,
                      ...entries
                        .filter(
                          (entry) =>
                            entry.skills.includes(skill.id) &&
                            entry.kind !== 'skill',
                        )
                        .map(({ id }) => id),
                    ]),
                  ];
                  return (
                    <li key={skill.id} id={factAnchor(skill)} tabIndex={-1}>
                      <h3>{skill.name}</h3>
                      <FactFields entry={skill} />
                      {evidence.length > 0 && (
                        <ul
                          className="cv-evidence-list"
                          aria-label={`Evidence for ${skill.name}`}
                        >
                          {evidence.map((id) => {
                            const entry = byId.get(id)!;
                            const role = entry.roleId
                              ? byId.get(entry.roleId)
                              : undefined;
                            return (
                              <li key={id}>
                                <FactLink entry={entry}>
                                  {role && entry.kind === 'achievement'
                                    ? `${entry.name} · ${role.name}`
                                    : entry.name}
                                </FactLink>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
          {education.length > 0 && (
            <Card className="cv-profile-section">
              <h2>Education and certifications</h2>
              <ul className="cv-project-list">
                {education.map((entry) => (
                  <li key={entry.id} id={factAnchor(entry)} tabIndex={-1}>
                    <h3>{entry.name}</h3>
                    <FactFields entry={entry} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

export function CvProfileView() {
  const [profile, setProfile] = useState<CvProfile>();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    cvApi
      .profile()
      .then((result) => {
        if (active) setProfile(result);
      })
      .catch((error: Error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error)
    return (
      <p role="alert" className="cv-error">
        {error}
      </p>
    );
  if (!profile) return <p role="status">Loading CV profile…</p>;
  return <Profile profile={profile} />;
}
