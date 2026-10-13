'use client';

import { useState } from 'react';
import { Dashboard } from './Dashboard';
import { useGame } from './gameClient';
import { MainMenu } from './MainMenu';
import { NewGame } from './NewGame';

export function App() {
  const status = useGame((s) => s.status);
  const [screen, setScreen] = useState<'menu' | 'new'>('menu');

  if (status === 'loading') {
    return (
      <main className="grid min-h-dvh place-items-center p-6">
        <p role="status" className="text-sm text-mute">Memuat dunia…</p>
      </main>
    );
  }
  if (status === 'playing') return <Dashboard />;
  if (screen === 'new') return <NewGame onBack={() => setScreen('menu')} />;
  return <MainMenu onNew={() => setScreen('new')} />;
}
