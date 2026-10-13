'use client';

import { useEffect } from 'react';
import { dayToISO } from '../engine/time/calendar';
import { formatDate } from './format';
import { useGame } from './gameClient';

export function MainMenu({ onNew }: { onNew: () => void }) {
  const saves = useGame((s) => s.saves);
  const savesLoaded = useGame((s) => s.savesLoaded);
  const error = useGame((s) => s.error);
  const refreshSaves = useGame((s) => s.refreshSaves);
  const loadSave = useGame((s) => s.loadSave);
  const removeSave = useGame((s) => s.removeSave);
  const clearMessages = useGame((s) => s.clearMessages);

  useEffect(() => {
    void refreshSaves();
  }, [refreshSaves]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 p-4 pb-10">
      <header className="pt-10">
        <p className="text-xs font-medium uppercase tracking-widest text-accent">v0.1 · Fondasi</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sports Manager Simulator</h1>
        <p className="mt-2 text-sm text-mute">
          Dunia olahraga global dengan simulasi mendalam. Versi ini baru memuat fondasi: dunia, waktu, organisasi,
          keuangan sementara, dan penyimpanan lokal.
        </p>
      </header>

      {error && (
        <div role="alert" className="card flex items-start justify-between gap-3 border-danger/50 text-sm text-danger">
          <span>{error}</span>
          <button className="underline" onClick={clearMessages}>Tutup</button>
        </div>
      )}

      <button className="btn btn-primary" onClick={onNew}>Game baru</button>

      <section aria-labelledby="save-heading" className="flex flex-col gap-3">
        <h2 id="save-heading" className="text-sm font-semibold text-mute">Lanjutkan</h2>
        {!savesLoaded && <p className="text-sm text-mute">Membaca penyimpanan…</p>}
        {savesLoaded && saves.length === 0 && (
          <p className="card text-sm text-mute">Belum ada game tersimpan. Mulai game baru untuk membuatnya.</p>
        )}
        {saves.map((s) => (
          <div key={s.id} className="card flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{s.name}</p>
              <p className="text-xs text-mute">
                {formatDate(dayToISO(s.day))} · disimpan {new Date(s.updatedAt).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button className="btn" onClick={() => void loadSave(s.id)}>Muat</button>
              <button
                className="btn btn-danger"
                aria-label={`Hapus save ${s.name}`}
                onClick={() => {
                  if (window.confirm(`Hapus save "${s.name}"? Tindakan ini tidak bisa dibatalkan.`)) void removeSave(s.id);
                }}
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
