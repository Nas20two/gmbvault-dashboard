import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { BusinessDetail as Detail } from '../types';
import StatusBadge from '../components/StatusBadge';
import EmailThread from '../components/EmailThread';
import MetricDisplay from '../components/MetricDisplay';
import Logo from '../components/Logo';
import { getBusiness, patchBusiness, clearToken, AuthError } from '../api/client';
import { friendlyDate, seenText } from '../lib/helpers';

export default function BusinessDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [biz, setBiz] = useState<Detail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [notes, setNotes] = useState('');
  const [confirm, setConfirm] = useState('');

  const load = useCallback(async () => {
    if (!slug) return;
    setLoaded(false);
    setError(false);
    try {
      const d = await getBusiness(slug);
      setBiz(d);
      setNotes(d.notes);
    } catch (err) {
      if (err instanceof AuthError) { clearToken(); window.location.href = '/login'; return; }
      setError(true);
    } finally {
      setLoaded(true);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function act(action: string, msg: string) {
    if (!slug || !biz) return;
    try {
      const updated = await patchBusiness(slug, action);
      setBiz(updated);
      setNotes(updated.notes);
      setConfirm(msg);
      window.setTimeout(() => setConfirm(''), 4000);
    } catch (err) {
      if (err instanceof AuthError) { clearToken(); window.location.href = '/login'; return; }
      setConfirm('');
    }
  }

  async function saveNote() {
    if (!slug || !biz) return;
    try {
      const updated = await patchBusiness(slug, 'notes', notes);
      setBiz(updated);
      setConfirm('Note saved.');
      window.setTimeout(() => setConfirm(''), 3000);
    } catch {
      // quiet
    }
  }

  if (!loaded) return <DetailShell><p className="text-vault-muted">Loading…</p></DetailShell>;
  if (error || !biz) {
    return (
      <DetailShell>
        <p className="text-lg text-vault-text">Couldn't load this business right now. Please try again.</p>
      </DetailShell>
    );
  }

  const isDue = biz.status === 'followup_1' || biz.status === 'followup_2';

  return (
    <DetailShell>
      <div className="rounded-2xl bg-vault-card p-6 shadow-lg ring-1 ring-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-vault-text">{biz.name}</h1>
            <div className="mt-2"><StatusBadge status={biz.status} /></div>
            <div className="mt-3"><MetricDisplay rating={biz.rating} reviewCount={biz.reviewCount} score={biz.score} rank={biz.rank} /></div>
            <p className="mt-1 text-sm text-vault-muted">Last contacted {biz.sentDate ? friendlyDate(biz.sentDate) : '—'} · {seenText(biz.open)}</p>
          </div>
          {confirm && <p className="rounded-lg bg-vault-success/10 px-3 py-1.5 text-sm font-medium text-vault-success">{confirm}</p>}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {isDue && (
            <button onClick={() => act('followup_sent', 'Got it — we’ll check back in 5 days.')}
              className="rounded-lg bg-vault-accent px-4 py-2.5 font-semibold text-vault-bg hover:bg-amber-400">
              I sent my follow-up
            </button>
          )}
          {biz.status !== 'replied' && biz.status !== 'converted' && (
            <button onClick={() => act('replied', 'Marked as replied.')}
              className="rounded-lg bg-vault-success px-4 py-2.5 font-semibold text-white hover:bg-emerald-400">
              They replied
            </button>
          )}
          {biz.status === 'replied' && (
            <button onClick={() => act('convert', '🎉 Congratulations on the new client!')}
              className="rounded-lg bg-purple-600 px-4 py-2.5 font-semibold text-white hover:bg-purple-500">
              Mark as new client
            </button>
          )}
        </div>
      </div>

      <section className="mt-6 rounded-2xl bg-vault-card p-6 shadow-lg ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-vault-text">Your messages</h2>
        <p className="text-sm text-vault-muted">This shows the emails you've sent and their replies.</p>
        <div className="mt-4"><EmailThread emails={biz.emails} /></div>
      </section>

      <section className="mt-6 rounded-2xl bg-vault-card p-6 shadow-lg ring-1 ring-white/10">
        <label htmlFor="notes" className="block text-sm font-medium text-vault-text">Anything to remember about this business?</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-lg border border-white/10 bg-vault-bg px-3 py-2 text-vault-text placeholder-vault-muted focus:border-vault-accent focus:outline-none"
        />
        <button onClick={saveNote} className="mt-3 rounded-lg bg-vault-text px-4 py-2 font-semibold text-vault-bg hover:bg-white">
          Save note
        </button>
      </section>
    </DetailShell>
  );
}

function DetailShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-vault-bg">
      <header className="border-b border-white/10 bg-vault-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="text-lg font-bold text-vault-text">GMBVault</span>
          </Link>
          <button onClick={() => { clearToken(); window.location.href = '/login'; }} className="text-sm text-vault-muted hover:text-vault-text">Log out</button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="text-sm text-vault-accent hover:underline">← Back to all businesses</Link>
        <div className="mt-4">{children}</div>
      </main>
    </div>
  );
}
