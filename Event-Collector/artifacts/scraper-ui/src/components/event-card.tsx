import * as React from "react";
import { Calendar, MapPin, ExternalLink, Music } from "lucide-react";
import { motion } from "framer-motion";
import { ConcertEvent } from "@/hooks/use-scraper";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui";

export function EventCard({ event, index }: { event: ConcertEvent, index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      className="group relative flex flex-col bg-card rounded-2xl border border-white/5 overflow-hidden hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20"
    >
      {/* Poster Image Area */}
      <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-black/50">
        {event.image_local_url ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent z-10" />
            <img 
              src={event.image_local_url} 
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
              loading="lazy"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/5 to-white/0">
            <Music className="w-16 h-16 text-white/10" />
          </div>
        )}
        
        {/* Venue Badge floating on image */}
        {event.venue && (
          <div className="absolute top-4 left-4 z-20">
            <Badge variant="primary" className="backdrop-blur-md bg-primary/20 border-primary/50 shadow-lg shadow-black/50">
              <MapPin className="w-3 h-3 mr-1" />
              {event.venue}
            </Badge>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex flex-col flex-1 p-5 md:p-6 relative z-20 -mt-12">
        <div className="bg-card/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex-1 flex flex-col shadow-xl">
          <h3 className="font-display font-bold text-lg leading-tight mb-3 group-hover:text-primary transition-colors line-clamp-2">
            {event.title}
          </h3>
          
          <div className="space-y-2 mt-auto">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2 text-white/50" />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center text-xs text-white/30">
              <span className="uppercase tracking-wider font-semibold">Source:</span>
              <span className="ml-2 truncate">{event.source}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {event.link && (
          <a 
            href={event.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center w-full py-3 rounded-xl bg-white/5 hover:bg-primary text-white text-sm font-semibold transition-all duration-300 group/btn"
          >
            Купить билеты
            <ExternalLink className="w-4 h-4 ml-2 opacity-50 group-hover/btn:opacity-100 transition-opacity" />
          </a>
        )}
      </div>
    </motion.div>
  );
}
