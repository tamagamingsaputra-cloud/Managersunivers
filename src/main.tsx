import { createRoot } from 'react-dom/client';

// Fase 0: halaman penanda saja. UI sebenarnya dibangun di Fase 6 (design system) dan seterusnya.
const container = document.getElementById('root');
if (container === null) throw new Error('Elemen #root tidak ditemukan');

createRoot(container).render(
  <main style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem', maxWidth: '40rem' }}>
    <h1>Sports Manager Simulator</h1>
    <p>Fase 0: fondasi proyek. Belum ada fitur game yang tersedia.</p>
  </main>,
);
