import { Simulation } from '../sim/simulation';
import { makeView, SPEEDS, type Speed } from '../sim/view';
import type { FromWorker, ToWorker } from './protocol';

/** Worker simulasi: memegang satu Simulation dan menjalankan waktu game di luar thread UI. */
const ctx = self as unknown as {
  postMessage(message: FromWorker): void;
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null;
};

let sim: Simulation | null = null;
let speed: Speed = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function post(message: FromWorker): void {
  ctx.postMessage(message);
}

function pushView(): void {
  if (sim) post({ type: 'view', view: makeView(sim, speed) });
}

function stopTimer(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

function fail(error: unknown): void {
  speed = 0;
  stopTimer();
  post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  pushView();
}

function startTimer(): void {
  stopTimer();
  if (speed === 0 || !sim) return;
  timer = setInterval(() => {
    try {
      sim?.advanceDays(1);
      pushView();
    } catch (e) {
      fail(e);
    }
  }, 1000 / speed);
}

ctx.onmessage = (event) => {
  const msg = event.data;
  try {
    switch (msg.type) {
      case 'new':
        stopTimer();
        speed = 0;
        sim = Simulation.create(msg.options);
        pushView();
        break;
      case 'load':
        stopTimer();
        speed = 0;
        sim = new Simulation(msg.state);
        pushView();
        break;
      case 'setSpeed':
        if (!SPEEDS.includes(msg.speed)) throw new RangeError(`Kecepatan tidak valid: ${msg.speed}`);
        speed = msg.speed;
        startTimer();
        pushView();
        break;
      case 'advance':
        if (!sim) throw new Error('Belum ada game aktif');
        sim.advanceDays(msg.days);
        pushView();
        break;
      case 'snapshot':
        if (!sim) throw new Error('Belum ada game aktif');
        post({ type: 'snapshot', requestId: msg.requestId, state: sim.snapshot() });
        break;
    }
  } catch (e) {
    fail(e);
  }
};
