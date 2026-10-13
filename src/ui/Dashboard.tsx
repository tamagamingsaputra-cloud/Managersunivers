'use client';

import { useState } from 'react';
import { dayToISO } from '../engine/time/calendar';
import type { LogLevel } from '../engine/sim/state';
import { SPEEDS, type Speed } from '../engine/sim/view';
import { formatDate, formatMoney, formatShortDate } from './format';
import { useGame } from './gameClient';
import { BackIcon, PauseIcon, PlayIcon, SaveIcon } from './icons';
import { LEVEL_CLASS, LEVEL_LABEL } from './labels';

const FILTERS: ReadonlyArray<LogLevel | 'all'> = ['all', 'info', 'warning', 'decision', 'report'];

export function Dashboard() {
  const view = useGame((s) => s.view);
  const dirty = useGame((s) => s.dirty);
  const error = useGame((s) => s.error);
  const notice = useGame((s) => s.notice);
  const saveName = useGame((s) => s.saveName);
  const { setSpeed, advance, save, exit, clearMessages } = useGame.getState();
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');

  if (!view) return null;
  const { player } = view;
  const entries = [...view.log].reverse().filter((e) => filter === 'all' || e.level === filter);

  const leave = (): void => {
    if (dirty && !window.confirm('Ada kemajuan yang belum disimpan. Keluar ke menu utama?')) return;
    exit();
  };

  return (
    <main className="mx-auto max-w-5xl p-4 pb-10">
      <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-mute">{saveName}</p>
            <p className="text-lg font-semibold" aria-live="polite">{formatDate(view.dateISO)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Kecepatan waktu" className="flex gap-1">
              {SPEEDS.map((s: Speed) => (
                <button
                  key={s}
                  className={`btn px-3 ${view.speed === s ? 'border-accent text-accent' : ''}`}
                  aria-pressed={view.speed === s}
                  aria-label={s === 0 ? 'Jeda' : `Kecepatan ${s} hari per detik`}
                  onClick={() => setSpeed(s)}
                >
                  {s === 0 ? <PauseIcon /> : s === 1 ? <PlayIcon /> : `${s}×`}
                </button>
              ))}
            </div>
            <button className="btn" disabled={view.speed !== 0} onClick={() => advance(7)}>+7 hari</button>
            <button className="btn" disabled={view.speed !== 0} onClick={() => advance(30)}>+30 hari</button>
          </div>
        </div>
      </header>

      {error && (
        <div role="alert" className="card mb-4 flex items-start justify-between gap-3 border-danger/50 text-sm text-danger">
          <span>{error}</span>
          <button className="underline" onClick={clearMessages}>Tutup</button>
        </div>
      )}
      {notice && (
        <div role="status" className="card mb-4 flex items-start justify-between gap-3 border-ok/50 text-sm text-ok">
          <span>{notice}</span>
          <button className="underline" onClick={clearMessages}>Tutup</button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <section className="card md:col-span-1" aria-labelledby="org-heading">
          <p className="text-xs uppercase tracking-wide text-mute">{player.kind === 'club' ? 'Klub' : 'Perusahaan'}</p>
          <h2 id="org-heading" className="text-xl font-semibold">{player.name}</h2>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-sm md:grid-cols-1">
            <div><dt className="text-xs text-mute">Kas</dt><dd className="font-semibold tabular-nums">{formatMoney(player.cash)}</dd></div>
            <div>
              <dt className="text-xs text-mute">Utang</dt>
              <dd className={`font-semibold tabular-nums ${player.debt > 0 ? 'text-warn' : ''}`}>{formatMoney(player.debt)}</dd>
            </div>
            <div><dt className="text-xs text-mute">Reputasi</dt><dd className="font-semibold tabular-nums">{player.reputation}/100</dd></div>
          </dl>
          <div className="mt-4 flex flex-col gap-2">
            <button className="btn btn-primary" onClick={() => void save()} disabled={!dirty}>
              <SaveIcon /> {dirty ? 'Simpan' : 'Tersimpan'}
            </button>
            <button className="btn" onClick={leave}><BackIcon /> Menu utama</button>
          </div>
          <p className="mt-4 text-xs text-mute">
            Belum tersedia: atlet dan staf, pertandingan, kompetisi, transfer, peta dunia. Fitur ini dibangun bertahap
            sesuai roadmap; tidak ada tombol palsu untuknya.
          </p>
        </section>

        <section className="card md:col-span-2" aria-labelledby="log-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="log-heading" className="text-lg font-semibold">Pesan dan laporan</h2>
            <div role="group" aria-label="Filter pesan" className="flex flex-wrap gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={`btn min-h-9 px-3 text-xs ${filter === f ? 'border-accent text-accent' : ''}`}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'Semua' : LEVEL_LABEL[f]}
                </button>
              ))}
            </div>
          </div>
          {entries.length === 0 ? (
            <p className="mt-4 text-sm text-mute">Belum ada pesan untuk filter ini.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {entries.map((e, i) => (
                <li key={`${e.day}-${i}`} className="flex gap-3 text-sm">
                  <span className={`h-fit shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${LEVEL_CLASS[e.level]}`}>
                    {LEVEL_LABEL[e.level]}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-mute">{formatShortDate(dayToISO(e.day))}</span>
                    {e.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
