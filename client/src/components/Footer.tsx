export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full border-t border-white/5 bg-background/60 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>© {year} ASOF.ai — All rights reserved.</span>
        <a
          href="mailto:Support@asofai.com"
          className="hover:text-primary transition-colors"
        >
          Support@asofai.com
        </a>
      </div>
    </footer>
  );
}
