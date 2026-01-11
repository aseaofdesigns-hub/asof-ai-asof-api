import { Cpu, Activity, Code2 } from "lucide-react";
import { Link } from "wouter";

export function Header() {
  return (
    <header className="border-b border-white/5 bg-background/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Cpu className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            As-of <span className="text-primary">AI</span> Automation
          </h1>
        </div>
        
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
            Dashboard
          </Link>
          <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
            About
          </Link>
          <Link href="/privacy" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
            Privacy
          </Link>
          <Link href="/contact" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
            Contact
          </Link>
          <Link href="/faq" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors" data-testid="link-faq">
            FAQ
          </Link>
          <Link href="/docs" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1" data-testid="link-api-docs">
            <Code2 className="w-3 h-3" />
            API
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
            <Activity className="w-3 h-3" />
            SYSTEM ONLINE
          </div>
        </nav>
      </div>
    </header>
  );
}
