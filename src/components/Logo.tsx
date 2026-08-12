export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#f59e0b" />
      <path
        d="M20 10c-4.418 0-8 3.582-8 8v4H9v9h22v-9h-3v-4c0-4.418-3.582-8-8-8Zm0 3c2.757 0 5 2.243 5 5v4H15v-4c0-2.757 2.243-5 5-5Z"
        fill="#262626"
      />
    </svg>
  );
}
