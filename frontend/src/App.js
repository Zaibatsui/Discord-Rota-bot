import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/`)
      .then(res => res.json())
      .then(data => {
        setStatus(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold text-white tracking-tight">
            Gaming Rota Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-slate-300 text-lg">
            A Discord bot to manage your gaming group's rota
          </p>
          
          <div className="flex items-center justify-center gap-2">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
                <span>Checking status...</span>
              </div>
            ) : status ? (
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

          <div className="bg-slate-900/50 rounded-lg p-4 text-left space-y-3">
            <h3 className="text-white font-semibold mb-2">Available Commands</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <code className="text-indigo-400">/rota add @user</code>
                <span className="text-slate-400">Add to rota</span>
              </div>
              <div className="flex justify-between">
                <code className="text-indigo-400">/rota list</code>
                <span className="text-slate-400">View rota</span>
              </div>
              <div className="flex justify-between">
                <code className="text-indigo-400">/next</code>
                <span className="text-slate-400">Next game info</span>
              </div>
              <div className="flex justify-between">
                <code className="text-indigo-400">/pick [game]</code>
                <span className="text-slate-400">Select game</span>
              </div>
              <div className="flex justify-between">
                <code className="text-indigo-400">/games add [name]</code>
                <span className="text-slate-400">Add game</span>
              </div>
              <div className="flex justify-between">
                <code className="text-indigo-400">/cantattend</code>
                <span className="text-slate-400">Mark absence</span>
              </div>
              <div className="flex justify-between">
                <code className="text-indigo-400">/remind</code>
                <span className="text-slate-400">Send reminder</span>
              </div>
              <div className="flex justify-between">
                <code className="text-indigo-400">/setchannel #channel</code>
                <span className="text-slate-400">Set reminders</span>
              </div>
            </div>
          </div>

          <p className="text-slate-500 text-sm">
            Reminders sent every Thursday at 12:00 PM UK time
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
