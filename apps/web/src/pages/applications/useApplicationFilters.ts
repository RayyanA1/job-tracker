import { useState } from 'react';
// Keep this state above the page boundary so it survives opening a detail page.
export function useApplicationFilters() {
  const [filter, setFilter] = useState('All statuses');
  const [sort, setSort] = useState('recent');
  const [query, setQuery] = useState('');
  return { filter, setFilter, sort, setSort, query, setQuery };
}
export type ApplicationFilters = ReturnType<typeof useApplicationFilters>;
