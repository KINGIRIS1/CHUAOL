const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

export const IconBook = () => (
  <svg viewBox="0 0 24 24" {...base}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    <path d="M9 8h7M9 11.5h5" />
  </svg>
)

export const IconSliders = () => (
  <svg viewBox="0 0 24 24" {...base}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
)

export const IconHelp = () => (
  <svg viewBox="0 0 24 24" {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.7" />
    <path d="M12 17.2v.1" />
  </svg>
)

export const IconClose = () => (
  <svg viewBox="0 0 24 24" {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
