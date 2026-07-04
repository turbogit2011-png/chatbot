import { Link } from "next-view-transitions";
import { Compass, Home, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="font-display text-8xl text-gradient leading-none mb-2">404</div>
        <div className="flex items-center justify-center gap-2 text-[var(--text-subtle)] mb-4">
          <Compass size={16} /> Ta ścieżka prowadzi donikąd
        </div>
        <h1 className="text-2xl font-semibold mb-2">Zgubiłeś się?</h1>
        <p className="text-[var(--text-muted)] mb-7">
          Strony, której szukasz, nie ma — ale wszystko ważne jest tuż obok.
          Naciśnij <kbd>⌘K</kbd>, aby przejść gdziekolwiek.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn btn-primary">
            <Home size={16} /> Wróć na pulpit
          </Link>
          <Link href="/ai" className="btn btn-ghost">
            <Sparkles size={16} /> Otwórz Aurę
          </Link>
        </div>
      </div>
    </div>
  );
}
