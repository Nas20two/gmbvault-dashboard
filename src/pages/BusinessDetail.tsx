import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { BusinessDetail as Detail } from '../types';
import StatusBadge from '../components/StatusBadge';
import EmailThread from '../components/EmailThread';
import MetricDisplay from '../components/MetricDisplay';
import { getBusiness, patchBusiness, clearToken, AuthError } from '../api/client';
import { nextCheckInDate, seenText } from '../lib/helpers';

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

  if (!loaded) return <DetailShell><p className="text-gray-500">Loading…</p></DetailShell>;
  if (error || !biz) {
    return (
      <DetailShell>
        <p className="text-lg text-gray-800">Couldn't load this business right now. Please try again.</p>
      </DetailShell>
    );
  }

  const isDue = biz.status === 'followup_1' || biz.status === 'followup_2';

  return (
    <DetailShell>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{biz.name}</h1>
            <div className="mt-2"><StatusBadge status={biz.status} /></div>
            <div className="mt-3"><MetricDisplay rating={biz.rating} reviewCount={biz.reviewCount} score={biz.score} rank={biz.rank} /></div>
            <p className="mt-1 text-sm text-gray-500">Last contacted {biz.sentDate ? nextCheckInDate(biz.sentDate) : '—'} · {seenText(biz.open)}</p>
          </div>
          {confirm && <p className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">{confirm}</p>}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {isDue && (
            <button onClick={() => act('followup_sent', 'Got it — we’ll check back in 5 days.')}
              className="rounded-lg bg-yellow-500 px-4 py-2.5 font-semibold text-white hover:bg-yellow-600">
              I sent my follow-up
            </button>
          )}
          {biz.status !== 'replied' && biz.status !== 'converted' && (
            <button onClick={() => act('replied', 'Marked as replied.')}
              className="rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700">
              They replied
            </button>
          )}
          {biz.status === 'replied' && (
            <button onClick={() => act('convert', '🎉 Congratulations on the new client!')}
              className="rounded-lg bg-purple-600 px-4 py-2.5 font-semibold text-white hover:bg-purple-700">
              Mark as new client
            </button>
          )}
        </div>
      </div>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Your messages</h2>
        <p className="text-sm text-gray-500">This shows the emails you've sent and their replies.</p>
        <div className="mt-4"><EmailThread emails={biz.emails} /></div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Anything to remember about this business?</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
        />
        <button onClick={saveNote} className="mt-3 rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800">
          Save note
        </button>
      </section>
    </DetailShell>
  );
}

function DetailShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold text-gray-900">GMBVault</span>
          <button onClick={() => { clearToken(); window.location.href = '/login'; }} className="text-sm text-gray-500 hover:text-gray-700">Log out</button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="text-sm text-blue-600 hover:underline">← Back to all businesses</Link>
        <div className="mt-4">{children}</div>
      </main>
    </div>
  );
}
