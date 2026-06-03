export default function UserAvatarIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', fill: 'currentColor' }}
    >
      <circle cx="32" cy="20" r="13" />
      <path d="M12 56c0-13.2 8.8-22 20-22s20 8.8 20 22c0 1.7-1.3 3-3 3H15c-1.7 0-3-1.3-3-3z" />
    </svg>
  )
}
