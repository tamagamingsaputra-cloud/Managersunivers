const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const;

export const PauseIcon = () => (
  <svg {...base}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
);
export const PlayIcon = () => (
  <svg {...base}><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
);
export const SaveIcon = () => (
  <svg {...base}><path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 2v5h8V5H7Zm5 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" /></svg>
);
export const BackIcon = () => (
  <svg {...base}><path d="M14.7 5.3a1 1 0 0 1 0 1.4L9.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.4 0Z" /></svg>
);
