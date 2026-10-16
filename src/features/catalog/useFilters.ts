import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { parseFilters, serializeFilters, type Filters } from './filter-model';

/**
 * Filters live in the URL. Facet clicks push history (Back undoes them); typing replaces.
 * flushSync: navigations otherwise commit in a transition, and a controlled
 * checkbox would show its old state until then.
 */
export function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const setFilters = useCallback(
    (next: Filters, opts: { replace?: boolean } = {}) => {
      setParams(serializeFilters(next), {
        replace: opts.replace ?? false,
        preventScrollReset: true,
      });
    },
    [setParams],
  );
  return { filters, setFilters, search: params.toString() };
}
