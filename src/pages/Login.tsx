import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, ApiError } from '../api/client';
import Logo from '../components/Logo';

export default function Login() {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await login(password);
      setPassword('');
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That password didn’t work. Try again.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-vault-bg p-6">
      <div className="w-full max-w-sm rounded-2xl bg-vault-card p-8 shadow-lg ring-1 ring-white/10">
        <div className="flex justify-center">
          <Logo className="h-14 w-14" />
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold text-vault-text">GMBVault</h1>
        <p className="mt-1 text-center text-sm text-vault-muted">Your outreach tracker</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-vault-text">Your password</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-white/10 bg-vault-bg px-3 py-2 text-vault-text placeholder-vault-muted focus:border-vault-accent focus:outline-none"
                autoFocus
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="text-sm text-vault-muted hover:text-vault-text">
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-vault-accent py-2.5 font-semibold text-vault-bg hover:bg-amber-400 disabled:opacity-60"
          >
            {busy ? 'Just a moment…' : 'Let me in'}
          </button>
        </form>
      </div>
    </div>
  );
}
