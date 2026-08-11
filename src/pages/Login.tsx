import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, ApiError } from '../api/client';

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-center text-2xl font-bold text-gray-900">GMBVault</h1>
        <p className="mt-1 text-center text-sm text-gray-500">Your outreach tracker</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Your password</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="text-sm text-gray-500 hover:text-gray-700">
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-gray-700">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? 'Just a moment…' : 'Let me in'}
          </button>
        </form>
      </div>
    </div>
  );
}
