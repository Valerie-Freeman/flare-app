import queryClient from '../../src/lib/queryClient';
import { QueryClient } from '@tanstack/react-query';

describe('queryClient', () => {
  it('exports a QueryClient instance', () => {
    expect(queryClient).toBeInstanceOf(QueryClient);
  });

  it('is a singleton (same reference on re-import)', () => {
    const queryClient2 = require('../../src/lib/queryClient').default;
    expect(queryClient).toBe(queryClient2);
  });

  it('has staleTime set to 5 minutes (300000ms)', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries.staleTime).toBe(300000);
  });

  it('has gcTime set to 30 minutes (1800000ms)', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries.gcTime).toBe(1800000);
  });

  it('has retry set to 2', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries.retry).toBe(2);
  });

  it('has refetchOnWindowFocus enabled', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries.refetchOnWindowFocus).toBe(true);
  });

  it('has refetchOnReconnect enabled', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries.refetchOnReconnect).toBe(true);
  });
});
