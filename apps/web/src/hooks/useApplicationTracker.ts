import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { applicationSchema } from '@tracker/shared';
import type { Application, ApplicationInput } from '@tracker/shared';
import { applicationsApi } from '../api/applications';
export function useApplicationTracker() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Application | null>(null);
  const [draft, setDraft] = useState<ApplicationInput | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const dirty =
    !!draft &&
    !!selected &&
    JSON.stringify(draft) !== JSON.stringify(applicationSchema.parse(selected));
  useEffect(() => {
    void applicationsApi
      .list()
      .then(setApps)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  function open(a: Application) {
    setSelected(a);
    setDraft(applicationSchema.parse(a));
    setError('');
  }
  function back() {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    setSelected(null);
    setDraft(null);
    setError('');
  }
  function patch(p: Partial<ApplicationInput>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
  }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSaving(true);
    setError('');
    try {
      const a = await applicationsApi.create({
        company: String(data.get('company') ?? ''),
        role: String(data.get('role') ?? ''),
      });
      setApps((v) => [a, ...v]);
      setAdding(false);
      open(a);
      setNotice('Application added');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!selected || !draft) return;
    const parsed = applicationSchema.safeParse(draft);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      );
      return;
    }
    setSaving(true);
    setError('');
    try {
      const a = await applicationsApi.update(selected.id, parsed.data);
      setApps((v) => v.map((x) => (x.id === a.id ? a : x)));
      open(a);
      setNotice('Changes saved');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function startAdding() {
    setAdding(true);
    setError('');
  }
  return {
    apps,
    loading,
    error,
    selected,
    draft,
    adding,
    saving,
    notice,
    dirty,
    open,
    back,
    patch,
    create,
    save,
    startAdding,
    closeAdding: () => setAdding(false),
    dismissError: () => setError(''),
  };
}
