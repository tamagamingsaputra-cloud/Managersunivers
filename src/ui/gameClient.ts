'use client';

import { create } from 'zustand';
import type { NewGameOptions } from '../engine/sim/newGame';
import type { GameState } from '../engine/sim/state';
import type { GameView, Speed } from '../engine/sim/view';
import type { FromWorker, ToWorker } from '../engine/worker/protocol';
import { deleteSave, listSaves, readSave, writeSave, type SaveMeta } from '../persistence/db';

export type Status = 'menu' | 'loading' | 'playing';

interface GameStore {
  status: Status;
  view: GameView | null;
  error: string | null;
  notice: string | null;
  saveId: string | null;
  saveName: string;
  dirty: boolean;
  saves: SaveMeta[];
  savesLoaded: boolean;
  refreshSaves(): Promise<void>;
  startNew(options: NewGameOptions, saveName: string): void;
  loadSave(id: string): Promise<void>;
  setSpeed(speed: Speed): void;
  advance(days: number): void;
  save(): Promise<void>;
  removeSave(id: string): Promise<void>;
  exit(): void;
  clearMessages(): void;
}

let worker: Worker | null = null;
let requestSeq = 0;
let savedDay: number | null = null;
const pending = new Map<number, { resolve: (s: GameState) => void; reject: (e: Error) => void }>();

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function spawn(first: ToWorker): void {
  worker?.terminate();
  pending.forEach((p) => p.reject(new Error('Simulasi dihentikan')));
  pending.clear();
  const w = new Worker(new URL('../engine/worker/sim.worker.ts', import.meta.url), { type: 'module' });
  worker = w;
  w.onmessage = (e: MessageEvent<FromWorker>) => handle(e.data);
  w.onerror = (e) => {
    useGame.setState({ error: `Worker simulasi gagal: ${e.message}`, status: 'menu', view: null });
  };
  w.postMessage(first);
}

function send(msg: ToWorker): void {
  worker?.postMessage(msg);
}

function handle(m: FromWorker): void {
  if (m.type === 'view') {
    useGame.setState({ view: m.view, status: 'playing', dirty: m.view.day !== savedDay });
  } else if (m.type === 'snapshot') {
    const p = pending.get(m.requestId);
    if (p) {
      pending.delete(m.requestId);
      p.resolve(m.state);
    }
  } else {
    const { view } = useGame.getState();
    useGame.setState({ error: m.message, status: view ? 'playing' : 'menu' });
  }
}

function requestSnapshot(): Promise<GameState> {
  return new Promise((resolve, reject) => {
    if (!worker) return reject(new Error('Tidak ada game aktif'));
    const id = ++requestSeq;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error('Pengambilan snapshot melewati batas waktu'));
    }, 10_000);
    pending.set(id, {
      resolve: (s) => { clearTimeout(timeout); resolve(s); },
      reject: (e) => { clearTimeout(timeout); reject(e); },
    });
    send({ type: 'snapshot', requestId: id });
  });
}

export const useGame = create<GameStore>()((set, get) => ({
  status: 'menu',
  view: null,
  error: null,
  notice: null,
  saveId: null,
  saveName: '',
  dirty: false,
  saves: [],
  savesLoaded: false,

  async refreshSaves() {
    try {
      set({ saves: await listSaves(), savesLoaded: true });
    } catch (e) {
      set({ savesLoaded: true, error: `Gagal membaca daftar save: ${errMsg(e)}` });
    }
  },

  startNew(options, saveName) {
    savedDay = null;
    set({ status: 'loading', error: null, notice: null, saveId: null, saveName, view: null, dirty: true });
    spawn({ type: 'new', options });
  },

  async loadSave(id) {
    set({ status: 'loading', error: null, notice: null });
    try {
      const { meta, state } = await readSave(id);
      savedDay = state.day;
      set({ saveId: meta.id, saveName: meta.name, view: null, dirty: false });
      spawn({ type: 'load', state });
    } catch (e) {
      set({ status: 'menu', error: `Gagal memuat save: ${errMsg(e)}` });
    }
  },

  setSpeed(speed) {
    send({ type: 'setSpeed', speed });
  },

  advance(days) {
    send({ type: 'advance', days });
  },

  async save() {
    try {
      const state = await requestSnapshot();
      const id = await writeSave(get().saveId, get().saveName, state);
      savedDay = state.day;
      set({ saveId: id, dirty: get().view ? get().view?.day !== savedDay : false, notice: 'Game tersimpan.' });
      await get().refreshSaves();
    } catch (e) {
      set({ error: `Gagal menyimpan: ${errMsg(e)}` });
    }
  },

  async removeSave(id) {
    try {
      await deleteSave(id);
      await get().refreshSaves();
    } catch (e) {
      set({ error: `Gagal menghapus save: ${errMsg(e)}` });
    }
  },

  exit() {
    worker?.terminate();
    worker = null;
    pending.clear();
    savedDay = null;
    set({ status: 'menu', view: null, saveId: null, dirty: false, notice: null });
    void get().refreshSaves();
  },

  clearMessages() {
    set({ error: null, notice: null });
  },
}));
