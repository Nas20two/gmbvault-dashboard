import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Business, Status } from '../types';
import BusinessCard from '../components/BusinessCard';
import Logo from '../components/Logo';
import { FILTERS, STATUS_META, needsFollowUp, type Filter } from '../lib/status';
import { getBusinesses, clearToken, AuthError } from '../api/client';
import { headline, greeting } from '../lib/helpers';

export default function Dashboard() {
  const [items, setItems] = useState<Business[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoaded(false);
    setError(false);
    try {
      const data = await getBusinesses();
      setItems(data);
    } catch (err) {
      if (err instanceof AuthError) {
        clearToken();
        window.location.href = '/login';
        return;
      }
      setError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const attention = useMemo(() => (items ?? []).filter((b) => needsFollowUp(b.status)), [items]);
  const filtered = useMemo(() => {
    let list = items ?? [];
    if (filter !== 'all') list = list.filter((b) => b.status === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }
    return list;
  }, [items, filter, query]);

  if (!loaded) {
    return <Shell>…</Shell>;
  }
  if (error) {
    return (
      <Shell>
        <div className="mx-auto max-w-md text-center">
          <p className="text-lg text-vault-text">We're having a little trouble loading right now — check back in a few minutes.</p>
          <button onClick={load} className="mt-4 rounded-lg bg-vault-accent px-4 py-2 font-semibold text-vault-bg hover:bg-amber-400">
            Try again
          </button>
        </div>
      </Shell>
    );
  }

  const hasItems = (items ?? []).length > 0;
  const shownNice = hasItems && filtered.length === 0;

  return (
    <Shell>
      <h1 className="text-2xl font-bold text-vault-text">
        {greeting()}. {headline(attention.length)}
      </h1>

      {attention.length > 0 && (
        <section className="mt-6 rounded-2xl bg-vault-accent/10 p-5 ring-1 ring-vault-accent/30">
          <h2 className="text-lg font-bold text-vault-text">Needs your attention</h2>
          <p className="text-sm text-vault-muted">These are the ones that have been waiting a few days.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {attention.map((b) => <BusinessCard key={b.slug} business={b} />)}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-bold text-vault-text">All your businesses</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a business"
          className="mt-3 w-full max-w-sm rounded-lg border border-white/10 bg-vault-bg px-3 py-2 text-vault-text placeholder-vault-muted focus:border-vault-accent focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const chipColor = f.key === 'all' ? '' : STATUS_META[f.key as Status].chip;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition ${
                  filter === f.key ? 'bg-vault-accent text-vault-bg' : 'bg-vault-card text-vault-text ring-1 ring-white/10 hover:bg-white/5'
                }`}
              >
                {f.key !== 'all' && <span className={`h-2.5 w-2.5 rounded-full ${chipColor}`} />}
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          {shownNice && <p className="text-vault-muted">Nothing to show yet.</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((b) => <BusinessCard key={b.slug} business={b} />)}
          </div>
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-vault-bg">
      <header className="border-b border-white/10 bg-vault-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="text-lg font-bold text-vault-text">GMBVault</span>
          </div>
          <button onClick={() => { clearToken(); window.location.href = '/login'; }} className="text-sm text-vault-muted hover:text-vault-text">
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
