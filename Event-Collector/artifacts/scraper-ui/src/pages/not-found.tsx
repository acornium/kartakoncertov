import { Link } from "wouter";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-8 transform rotate-12 border border-white/10 shadow-2xl">
        <FileQuestion className="w-12 h-12 text-primary -rotate-12" />
      </div>
      
      <h1 className="text-6xl font-display font-black mb-4 text-glow">404</h1>
      <h2 className="text-2xl font-semibold mb-6 text-white/80">Страница не найдена</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Возможно, ссылка устарела или вы ввели неверный адрес.
      </p>
      
      <Link href="/">
        <Button size="lg" className="rounded-full px-8">
          Вернуться на главную
        </Button>
      </Link>
    </div>
  );
}
