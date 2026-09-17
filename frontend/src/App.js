import React, { useState, useEffect } from 'react';

function App() {
  const [status, setStatus] = useState(null);
  const [avatarOk, setAvatarOk] = useState(true);

  // A deployment can override this by setting window.__ROTA_API_URL__ in
  // public/config.js, which keeps real hostnames out of the repo.
  const API_URL =
    window.__ROTA_API_URL__ ||
    (window.location.hostname === 'localhost'
      ? 'http://localhost:8003'
      : `${window.location.protocol}//${window.location.hostname}:8003`);

  useEffect(() => {
    fetch(`${API_URL}/api/`)
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(() => setStatus(null));
  }, [API_URL]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0b0c] p-4">
      {/* cold concrete light pool, echoing the avatar's backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 28%, rgba(148,163,175,0.17), transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/60 backdrop-blur-sm">
        {/* hairline of brand orange across the top edge */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#f7941e]/70 to-transparent" />

        <div className="p-5 sm:p-7">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-5 h-28 w-28">
              {avatarOk ? (
                <img
                  src="/avatar.png"
                  alt="Rota bot"
                  onError={() => setAvatarOk(false)}
                  className="h-28 w-28 rounded-full object-cover shadow-[0_0_45px_-10px_rgba(247,148,30,0.75)] ring-2 ring-[#f7941e]/70"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#15171a] shadow-[0_0_45px_-10px_rgba(247,148,30,0.75)] ring-2 ring-[#f7941e]/70">
                  <span className="text-4xl font-black text-[#f7941e]">K</span>
                </div>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#edeae4]">Gaming Rota Bot</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Discord bot for managing your gaming group's rota
            </p>
          </div>

          <div className="mb-6 flex justify-center">
            {status ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                API Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-sm text-red-300">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                API Offline
              </span>
            )}
          </div>

          <div className="rounded-xl border border-white/5 bg-black/40 p-3 sm:p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Available Commands
            </h3>
            <div className="space-y-2 text-sm">
              {[
                ['/rota add @user', 'Add to rota'],
                ['/rota list', 'View rota'],
                ['/next', 'Next game info'],
                ['/pick [game]', 'Select game'],
                ['/games add [name]', 'Add game'],
                ['/cantattend', 'Mark absence'],
                ['/remind', 'Send reminder'],
                ['/setchannel #channel', 'Set reminders'],
              ].map(([cmd, desc]) => (
                <div key={cmd} className="flex items-center justify-between gap-3">
                  <code className="whitespace-nowrap rounded bg-[#f7941e]/10 px-2 py-0.5 font-mono text-[12px] sm:text-[13px] text-[#f7941e] ring-1 ring-inset ring-[#f7941e]/20">
                    {cmd}
                  </code>
                  <span className="whitespace-nowrap text-zinc-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-zinc-500">
            Reminders: Thursdays at 12:00 PM UK time
          </p>
          <p className="mt-2 text-center text-xs text-zinc-600">Built by Zaibatsui Labs</p>
        </div>
      </div>
    </div>
  );
}

export default App;
