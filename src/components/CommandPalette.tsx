import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, FileText, BookA } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { MODULES, PAGES, getModule } from "@/lib/curriculum";
import { GLOSSARY, slug } from "@/lib/glossary";

/** Ctrl/Cmd+K palette: jump to any module, page or glossary term. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(to: string, hash?: string) {
    setOpen(false);
    navigate({ to, hash });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 rounded-full border border-border bg-secondary/60 pl-3 pr-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label="Search modules and terms"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">Search</span>
        <kbd className="hidden lg:inline font-mono text-[10px] rounded border border-border bg-background px-1.5 py-0.5">Ctrl K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search modules, labs and glossary terms…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Modules & labs">
            {MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <CommandItem key={m.id} value={`${m.title} ${m.desc}`} onSelect={() => go(m.to)}>
                  <Icon className="text-primary" />
                  <span>{m.title}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandGroup heading="Pages">
            {PAGES.map((p) => (
              <CommandItem key={p.to} value={p.title} onSelect={() => go(p.to)}>
                <FileText className="text-muted-foreground" />
                <span>{p.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Glossary">
            {GLOSSARY.map((t) => (
              <CommandItem key={t.term} value={`${t.term} ${t.def}`} onSelect={() => go("/glossary", slug(t.term))}>
                <BookA className="text-success" />
                <span className="font-mono">{t.term}</span>
                <span className="ml-auto text-xs text-muted-foreground">{getModule(t.module).short}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

