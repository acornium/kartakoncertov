import * as React from "react";
import { Search, Filter, Loader2, Music } from "lucide-react";
import { useEvents, useSites } from "@/hooks/use-scraper";
import { EventCard } from "@/components/event-card";
import { Input, Button } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";

export default function EventsPage() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedSite, setSelectedSite] = React.useState<string>("");
  
  // Pagination state (simple infinite scroll simulation for UX, using limit)
  const [limit, setLimit] = React.useState(24);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError } = useEvents({
    search: debouncedSearch,
    site: selectedSite || undefined,
    limit,
    offset: 0
  });

  const { data: sitesData } = useSites();

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-display font-black text-white text-glow">Афиша</h1>
          <p className="text-muted-foreground text-lg">
            {data?.total !== undefined ? (
              <>Найдено <span className="text-white font-semibold">{data.total}</span> событий</>
            ) : "Сбор данных..."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Поиск артиста..." 
              className="pl-10 bg-black/20 border-white/10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="relative w-full sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
            <select
              className="flex h-11 w-full appearance-none rounded-xl border border-white/10 bg-black/20 pl-10 pr-8 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary transition-colors cursor-pointer"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
            >
              <option value="">Все площадки</option>
              {sitesData?.sites.map(s => (
                <option key={s.site_name} value={s.site_name}>
                  {s.venue || s.site_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="min-h-[400px] relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="glass-card p-10 rounded-2xl text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-destructive text-2xl font-bold">!</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Ошибка загрузки</h3>
            <p className="text-muted-foreground">Не удалось получить данные с сервера. Убедитесь, что Python API запущен.</p>
          </div>
        ) : data?.events.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-12 rounded-3xl text-center flex flex-col items-center justify-center border-dashed border-2 border-white/10"
          >
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Music className="w-10 h-10 text-white/20" />
            </div>
            <h3 className="text-2xl font-display font-bold text-white mb-2">События не найдены</h3>
            <p className="text-muted-foreground max-w-md">
              По вашему запросу ничего нет. Попробуйте изменить фильтры или запустите парсер для сбора новых данных.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {data?.events.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {data && data.total > limit && (
          <div className="mt-12 flex justify-center">
            <Button 
              variant="outline" 
              size="lg" 
              className="rounded-full px-12 glass"
              onClick={() => setLimit(l => l + 24)}
            >
              Загрузить еще
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
