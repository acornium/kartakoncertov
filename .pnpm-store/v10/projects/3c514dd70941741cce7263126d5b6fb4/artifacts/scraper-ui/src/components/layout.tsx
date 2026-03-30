import * as React from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Music2, Activity, Database, Settings, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScraperStatus, useRunScraper, useSites } from "@/hooks/use-scraper";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from "@/components/ui";

const navItems = [
  { href: "/", label: "Афиша", icon: Music2 },
  { href: "/sites", label: "Источники", icon: Database },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: status } = useScraperStatus();
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-72 border-r border-white/5 glass flex flex-col z-20 shrink-0">
        <div className="p-6 md:p-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Activity className="text-white w-6 h-6" />
          </div>
          <h1 className="font-display font-bold text-xl tracking-wide">
            SONAR<span className="text-primary">.</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block focus:outline-none">
                <div
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 relative group cursor-pointer",
                    isActive ? "text-white" : "text-muted-foreground hover:text-white hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav"
                      className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={cn("w-5 h-5 relative z-10", isActive && "text-primary")} />
                  <span className="font-medium relative z-10">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-6">
          <ScraperWidget />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
        {/* Decorative Background Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[150px] -z-10 pointer-events-none" />
        
        <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

function ScraperWidget() {
  const { data: status } = useScraperStatus();
  const { mutate: runScraper, isPending } = useRunScraper();
  const { data: sitesData } = useSites();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedSite, setSelectedSite] = React.useState<string | undefined>(undefined);

  const isRunning = status?.running || isPending;

  return (
    <>
      <div className="glass-card rounded-2xl p-5 border-t border-white/10 relative overflow-hidden group">
        {isRunning && (
          <div className="absolute inset-0 bg-primary/5 animate-pulse" />
        )}
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h3 className="font-display font-semibold text-sm text-white/90">Статус парсера</h3>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isRunning ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white/20"></span>
              )}
            </span>
          </div>
        </div>

        <div className="space-y-1 mb-5 relative z-10">
          <p className="text-xs text-muted-foreground">
            {isRunning ? "Сбор данных в процессе..." : "Ожидание команды"}
          </p>
          <p className="text-[11px] text-white/40 truncate" title={status?.message}>
            {status?.message || "Нет данных о предыдущих запусках"}
          </p>
          {status?.last_run && !isRunning && (
            <p className="text-[11px] text-white/30">
              Последний: {status.last_run}
            </p>
          )}
        </div>

        <Button 
          variant="primary" 
          className="w-full text-xs py-2 h-auto"
          onClick={() => setIsOpen(true)}
          disabled={isRunning}
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          {isRunning ? "Парсинг..." : "Запустить сбор"}
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Запуск сбора данных</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Выберите сайт для парсинга или запустите сбор по всем доступным источникам.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div 
                onClick={() => setSelectedSite(undefined)}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all",
                  selectedSite === undefined 
                    ? "border-primary bg-primary/10 text-white" 
                    : "border-white/10 hover:border-white/30 text-muted-foreground hover:text-white"
                )}
              >
                <div className="font-semibold mb-1">Все сайты</div>
                <div className="text-xs opacity-70">Запустить полный обход баз</div>
              </div>
              
              {sitesData?.sites.map(site => (
                <div 
                  key={site.site_name}
                  onClick={() => setSelectedSite(site.site_name)}
                  className={cn(
                    "p-4 rounded-xl border cursor-pointer transition-all",
                    selectedSite === site.site_name 
                      ? "border-primary bg-primary/10 text-white" 
                      : "border-white/10 hover:border-white/30 text-muted-foreground hover:text-white"
                  )}
                >
                  <div className="font-semibold mb-1 truncate">{site.venue || site.site_name}</div>
                  <div className="text-xs opacity-70 truncate">{site.url}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>Отмена</Button>
            <Button 
              onClick={() => {
                runScraper(selectedSite);
                setIsOpen(false);
              }}
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Старт
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
