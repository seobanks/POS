import { MessageCircle } from "lucide-react";

export function BrandFooter() {
  return (
    <div className="flex flex-col gap-2 border-t border-sidebar-border px-4 py-3">
      <a
        href="https://wa.me/918423711043?text=Hi%2C%20I%20need%20support%20with%20Hanva%20POS"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 rounded-lg border border-sidebar-border px-3 py-1.5 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
        Contact support
      </a>
      <a
        href="https://orderrestro.nodedr.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-left text-xs font-medium leading-tight text-sidebar-foreground/70 hover:text-sidebar-foreground hover:underline"
      >
        Hanva Fine Dine
      </a>
    </div>
  );
}
