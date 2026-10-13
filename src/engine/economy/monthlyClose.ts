import type { Handler } from '../sim/context';
import { addDays, firstOfNextMonth, monthLabel } from '../time/calendar';
import type { Organization } from '../world/types';

export const MONTHLY_CLOSE = 'monthly_close';

/**
 * MODEL EKONOMI SEMENTARA (tahap fondasi).
 * Tujuannya membuktikan bahwa seluruh dunia tersimulasi di latar belakang lewat antrean kejadian.
 * Akan diganti modul economy lengkap (sponsor, gaji, tiket, fasilitas) pada tahap 3.
 */
const fmt = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function monthlyIncome(org: Organization, variance: number): number {
  const base = org.kind === 'club' ? 1_000_000 : 400_000;
  return Math.round(base * (0.6 + org.reputation / 100) * variance);
}

function monthlyCost(org: Organization): number {
  if (org.kind === 'company') return 300_000;
  const frugality = org.ai ? org.ai.frugality : 0;
  return Math.round((700_000 + org.reputation * 5_000) * (1 - 0.1 * frugality));
}

export const monthlyClose: Handler = (ctx, ev) => {
  const closed = monthLabel(addDays(ev.day, -1));

  for (const org of Object.values(ctx.state.world.organizations)) {
    const income = monthlyIncome(org, ctx.rng.float(0.9, 1.1));
    const cost = monthlyCost(org);
    const interest = Math.round(org.debt * 0.01);

    org.cash += income - cost - interest;
    let covered = 0;
    if (org.cash < 0) {
      covered = -org.cash;
      org.debt += covered;
      org.cash = 0;
    }
    // AI melunasi utang jika kas melebihi cadangan tiga bulan biaya. Pemain memutuskan sendiri.
    if (org.ai && org.debt > 0 && org.cash > cost * 3) {
      const pay = Math.min(org.debt, org.cash - cost * 3);
      org.debt -= pay;
      org.cash -= pay;
    }

    if (org.controller === 'player') {
      ctx.log(
        'report',
        `Tutup buku ${closed}: pemasukan ${fmt(income)}, pengeluaran ${fmt(cost + interest)}, kas ${fmt(org.cash)}.`,
        org.id,
      );
      if (covered > 0) {
        ctx.log('warning', `Kas habis. Kekurangan ${fmt(covered)} ditutup dengan utang (total utang ${fmt(org.debt)}).`, org.id);
      }
    }
  }

  ctx.queue.schedule(firstOfNextMonth(ev.day), MONTHLY_CLOSE, {});
};
