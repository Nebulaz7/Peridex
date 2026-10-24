import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
      <h2 className="text-2xl font-bold font-mono text-zinc-950 mb-2">404 - Page Not Found</h2>
      <p className="text-xs text-zinc-500 mb-4 font-mono">
        The requested Peridex route does not exist.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-zinc-950 text-white rounded text-xs font-medium hover:bg-zinc-800 transition"
      >
        Return to Schema Studio
      </Link>
    </div>
  );
}
