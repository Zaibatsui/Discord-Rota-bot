import React, { useState, useEffect } from 'react';

function App() {
  const [status, setStatus] = useState(null);
  
  // Configure this based on your setup:
  // - For local network: 'http://YOUR_SERVER_IP:8003'
  // - For HTTPS domain: 'https://api.yourdomain.com'
  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8003'
    : `${window.location.protocol}//${window.location.hostname}:8003`;

  useEffect(() => {
    fetch(`${API_URL}/api/`)
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(() => setStatus(null));
  }, [API_URL]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-800/50 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Gaming Rota Bot</h1>
          <p className="text-slate-300 mt-2">Discord bot for managing your gaming group's rota</p>
        </div>
        <div className="flex items-center justify-center gap-2 mb-6">
          {status ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span>API Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>API Offline</span>
            </div>
          )}
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 space-y-2 text-sm">
          <h3 className="text-white font-semibold mb-3">Available Commands</h3>
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
            <div key={cmd} className="flex justify-between">
              <code className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{cmd}</code>
              <span className="text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-sm text-center mt-4">Reminders: Thursdays at 12:00 PM UK time</p>
        <p className="text-slate-600 text-xs text-center mt-2">Built by Zaibatsui Labs</p>
      </div>
    </div>
  );
}

export default App;
