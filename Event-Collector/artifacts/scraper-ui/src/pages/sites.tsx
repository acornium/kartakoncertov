import * as React from "react";
import {
  Server, Globe, FileCode, TerminalSquare,
  RefreshCw, Plus, Trash2, X, ChevronDown, ChevronUp, Pencil,
} from "lucide-react";
import {
  useSites, useSiteLogs, useCreateSite, useUpdateSite, useDeleteSite,
  useSiteConfig, CreateSitePayload,
} from "@/hooks/use-scraper";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Badge, Button } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-white/70 uppercase tracking-widest">{label}</label>
      {hint && <p className="text-[11px] text-white/40">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 " +
  "focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all";

const inputDisabledCls =
  "w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white/40 cursor-not-allowed";

// Convert raw config fields (string | string[]) into string[] for the form
function toArr(v: unknown): string[] {
  if (!v) return [""];
  if (Array.isArray(v)) return v.length ? v : [""];
  return [String(v)];
}

function str(v: unknown) { return v ? String(v) : ""; }

function configToForm(raw: Record<string, unknown>): CreateSitePayload {
  const isJsonApi = raw.type === "json_api";
  const f = (raw.fields as Record<string, unknown>) || {};
  const jf = (raw.json_fields as Record<string, unknown>) || {};
  return {
    site_name: str(raw.site_name),
    venue: str(raw.venue),
    url: str(raw.url),
    rate_limit_seconds: Number(raw.rate_limit_seconds ?? 1.0),
    type: isJsonApi ? "json_api" : null,
    // HTML fields
    list_selector: str(raw.list_selector),
    fields: {
      title: toArr(f.title),
      date: toArr(f.date),
      link: toArr(f.link),
      image: toArr(f.image),
    },
    // JSON API fields
    json_fields: {
      title: str(jf.title),
      date: str(jf.date),
      link: str(jf.link),
      image: str(jf.image),
      description: str(jf.description),
    },
  };
}

const EMPTY_FORM: CreateSitePayload = {
  site_name: "",
  venue: "",
  url: "",
  rate_limit_seconds: 1.0,
  type: null,
  list_selector: "",
  fields: { title: [""], date: [""], link: [""], image: [""] },
  json_fields: { title: "", date: "", link: "", image: "", description: "" },
};

// ──────────────────────────────────────────────
// Add / Edit form modal
// ──────────────────────────────────────────────

interface SiteModalProps {
  open: boolean;
  onClose: () => void;
  /** If provided — edit mode, otherwise — create mode */
  editSiteName?: string | null;
}

function SiteModal({ open, onClose, editSiteName }: SiteModalProps) {
  const isEdit = !!editSiteName;
  const { data: existingConfig, isLoading: configLoading } = useSiteConfig(editSiteName ?? null);

  const [form, setForm] = React.useState<CreateSitePayload>(EMPTY_FORM);
  const [advanced, setAdvanced] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const createSite = useCreateSite();
  const updateSite = useUpdateSite();
  const isBusy = createSite.isPending || updateSite.isPending;

  // Pre-fill form when editing
  React.useEffect(() => {
    if (isEdit && existingConfig) {
      setForm(configToForm(existingConfig));
      setError(null);
    } else if (!isEdit) {
      setForm(EMPTY_FORM);
      setError(null);
    }
  }, [isEdit, existingConfig]);

  function handleClose() {
    setForm(EMPTY_FORM);
    setError(null);
    setAdvanced(false);
    onClose();
  }

  function setField(name: keyof CreateSitePayload["fields"], value: string) {
    setForm((f) => ({ ...f, fields: { ...f.fields, [name]: value ? [value] : [""] } }));
  }

  const isJsonApi = form.type === "json_api";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isEdit && !form.site_name.trim()) return setError("Укажите ID сайта");
    if (!form.venue.trim()) return setError("Укажите название площадки");
    if (!form.url.trim()) return setError("Укажите URL сайта");

    if (isJsonApi) {
      if (!form.json_fields?.title?.trim()) return setError("Укажите ключ для поля «Название»");
    } else {
      if (!form.list_selector?.trim()) return setError("Укажите CSS-селектор блоков");
      if (!form.fields?.title?.[0]?.trim()) return setError("Укажите селектор для поля «Название»");
    }

    let payload: CreateSitePayload;
    if (isJsonApi) {
      payload = {
        site_name: form.site_name,
        venue: form.venue,
        url: form.url,
        rate_limit_seconds: form.rate_limit_seconds,
        type: "json_api",
        json_fields: {
          title: form.json_fields!.title,
          ...(form.json_fields?.date ? { date: form.json_fields.date } : {}),
          ...(form.json_fields?.link ? { link: form.json_fields.link } : {}),
          ...(form.json_fields?.image ? { image: form.json_fields.image } : {}),
          ...(form.json_fields?.description ? { description: form.json_fields.description } : {}),
        },
      };
    } else {
      payload = {
        site_name: form.site_name,
        venue: form.venue,
        url: form.url,
        rate_limit_seconds: form.rate_limit_seconds,
        list_selector: form.list_selector,
        fields: {
          title: (form.fields?.title ?? []).filter(Boolean),
          ...(form.fields?.date?.[0] ? { date: form.fields.date.filter(Boolean) } : {}),
          ...(form.fields?.link?.[0] ? { link: form.fields.link.filter(Boolean) } : {}),
          ...(form.fields?.image?.[0] ? { image: form.fields.image.filter(Boolean) } : {}),
        },
      };
    }

    try {
      if (isEdit) {
        await updateSite.mutateAsync({ site_name: editSiteName!, payload });
      } else {
        await createSite.mutateAsync(payload);
      }
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  }

  const title = isEdit ? `Редактировать: ${editSiteName}` : "Добавить новый клуб";
  const submitLabel = isEdit ? "Сохранить изменения" : "Добавить клуб";
  const busyLabel = isEdit ? "Сохранение..." : "Создание...";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isEdit ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
            {title}
          </DialogTitle>
        </DialogHeader>

        {isEdit && configLoading ? (
          <div className="py-16 flex justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-5">
            {/* ID + venue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="ID сайта" hint={isEdit ? "Нельзя изменить" : "Латинские буквы, цифры, дефис"}>
                {isEdit ? (
                  <input className={inputDisabledCls} value={form.site_name} disabled />
                ) : (
                  <input
                    className={inputCls}
                    placeholder="club-name"
                    value={form.site_name}
                    onChange={(e) => setForm((f) => ({ ...f, site_name: e.target.value }))}
                  />
                )}
              </Field>
              <Field label="Название площадки">
                <input
                  className={inputCls}
                  placeholder="Клуб «Звук»"
                  value={form.venue}
                  onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                />
              </Field>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2">
              {(["html", "json_api"] as const).map((mode) => {
                const active = (mode === "json_api") === isJsonApi;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: mode === "json_api" ? "json_api" : null }))}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${
                      active
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
                    }`}
                  >
                    {mode === "html" ? "HTML (CSS-селекторы)" : "JSON API"}
                  </button>
                );
              })}
            </div>

            <Field label={isJsonApi ? "URL JSON-эндпоинта" : "URL сайта"} hint={isJsonApi ? "Адрес, возвращающий список событий в JSON" : "Страница с афишей концертов"}>
              <input
                className={inputCls}
                placeholder={isJsonApi ? "https://club.ru/api/events" : "https://club-example.ru/events"}
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </Field>

            <AnimatePresence mode="wait">
              {isJsonApi ? (
                <motion.div key="json" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  {/* JSON API fields */}
                  <div className="rounded-xl border border-white/10 p-4 space-y-4 bg-white/[0.02]">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/50">Ключи JSON-объекта</p>
                    <p className="text-[11px] text-white/30">Укажите название поля в JSON-ответе, например <span className="font-mono text-white/50">title</span> или <span className="font-mono text-white/50">event.name</span></p>

                    <Field label="Название события *">
                      <input
                        className={inputCls}
                        placeholder="title"
                        value={form.json_fields?.title ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, json_fields: { ...f.json_fields!, title: e.target.value } }))}
                      />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Дата">
                        <input
                          className={inputCls}
                          placeholder="date"
                          value={form.json_fields?.date ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, json_fields: { ...f.json_fields!, date: e.target.value } }))}
                        />
                      </Field>
                      <Field label="Ссылка">
                        <input
                          className={inputCls}
                          placeholder="link"
                          value={form.json_fields?.link ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, json_fields: { ...f.json_fields!, link: e.target.value } }))}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Изображение">
                        <input
                          className={inputCls}
                          placeholder="image"
                          value={form.json_fields?.image ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, json_fields: { ...f.json_fields!, image: e.target.value } }))}
                        />
                      </Field>
                      <Field label="Описание">
                        <input
                          className={inputCls}
                          placeholder="description"
                          value={form.json_fields?.description ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, json_fields: { ...f.json_fields!, description: e.target.value } }))}
                        />
                      </Field>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="html" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
                  <Field
                    label="CSS-селектор блоков событий"
                    hint="Класс или тег одной карточки концерта, например .event-card или article.concert"
                  >
                    <input
                      className={inputCls}
                      placeholder=".event-item"
                      value={form.list_selector ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, list_selector: e.target.value }))}
                    />
                  </Field>

                  <div className="rounded-xl border border-white/10 p-4 space-y-4 bg-white/[0.02]">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/50">CSS-селекторы полей</p>

                    <Field label="Название события *">
                      <input
                        className={inputCls}
                        placeholder=".event-title, h2.name"
                        value={form.fields?.title?.[0] ?? ""}
                        onChange={(e) => setField("title", e.target.value)}
                      />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Дата">
                        <input
                          className={inputCls}
                          placeholder=".event-date, time"
                          value={form.fields?.date?.[0] ?? ""}
                          onChange={(e) => setField("date", e.target.value)}
                        />
                      </Field>
                      <Field label="Ссылка">
                        <input
                          className={inputCls}
                          placeholder=".event-link, a"
                          value={form.fields?.link?.[0] ?? ""}
                          onChange={(e) => setField("link", e.target.value)}
                        />
                      </Field>
                    </div>

                    <Field label="Изображение" hint="Селектор тега <img> или блока с data-src">
                      <input
                        className={inputCls}
                        placeholder=".event-cover img, .poster"
                        value={form.fields?.image?.[0] ?? ""}
                        onChange={(e) => setField("image", e.target.value)}
                      />
                    </Field>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Advanced */}
            <button
              type="button"
              onClick={() => setAdvanced((v) => !v)}
              className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              {advanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Расширенные настройки
            </button>

            <AnimatePresence>
              {advanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Field label="Пауза между запросами (секунды)">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      className={inputCls}
                      value={form.rate_limit_seconds}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, rate_limit_seconds: parseFloat(e.target.value) || 1.0 }))
                      }
                    />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400"
                >
                  <X className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10"
                onClick={handleClose}
              >
                Отмена
              </Button>
              <Button type="submit" className="flex-1" disabled={isBusy}>
                {isBusy ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : isEdit ? (
                  <Pencil className="w-4 h-4 mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {isBusy ? busyLabel : submitLabel}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Delete confirm modal
// ──────────────────────────────────────────────

function DeleteConfirmModal({
  site_name, onClose,
}: { site_name: string; onClose: () => void }) {
  const deleteSite = useDeleteSite();

  async function handleDelete() {
    await deleteSite.mutateAsync(site_name);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-red-400">
            <Trash2 className="w-5 h-5" />
            Удалить источник?
          </DialogTitle>
        </DialogHeader>
        <p className="mt-3 text-sm text-white/60">
          Конфиг <span className="font-mono text-white">{site_name}</span> будет удалён.
          Уже собранные события в базе данных останутся.
        </p>
        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10"
            onClick={onClose}
          >
            Отмена
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            onClick={handleDelete}
            disabled={deleteSite.isPending}
          >
            {deleteSite.isPending
              ? <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              : <Trash2 className="w-4 h-4 mr-2" />}
            Удалить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────

export default function SitesPage() {
  const { data, isLoading } = useSites();
  const [selectedSiteForLogs, setSelectedSiteForLogs] = React.useState<string | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-black text-white">Источники данных</h1>
          <p className="text-muted-foreground text-lg">Настроенные конфигурации для парсинга</p>
        </div>
        <Button className="shrink-0 mt-1" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить клуб
        </Button>
      </header>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : data?.sites.length === 0 ? (
        <div className="py-24 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
            <Server className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-white/40 text-lg">Нет настроенных источников</p>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить первый клуб
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data?.sites.map((site, i) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              key={site.site_name}
              className="glass-card rounded-2xl p-6 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />

              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Server className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl">{site.venue || site.site_name}</h3>
                    <Badge variant="outline" className="mt-1 font-mono text-[10px] uppercase">
                      {site.site_name}
                    </Badge>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditTarget(site.site_name)}
                    className="p-2 rounded-lg text-white/20 hover:text-primary hover:bg-primary/10 transition-all"
                    title="Редактировать"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(site.site_name)}
                    className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Globe className="w-4 h-4 text-white/40 shrink-0" />
                  <a
                    href={site.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary transition-colors truncate"
                  >
                    {site.url || "Нет URL"}
                  </a>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <FileCode className="w-4 h-4 text-white/40 shrink-0" />
                  <span className="font-mono text-xs">{site.filename}</span>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full bg-white/5 hover:bg-white/10 border border-white/5"
                onClick={() => setSelectedSiteForLogs(site.site_name)}
              >
                <TerminalSquare className="w-4 h-4 mr-2" />
                Смотреть логи
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add modal */}
      <SiteModal open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Edit modal */}
      <SiteModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        editSiteName={editTarget}
      />

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirmModal
          site_name={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* Logs modal */}
      <LogsModal site={selectedSiteForLogs} onClose={() => setSelectedSiteForLogs(null)} />
    </div>
  );
}

// ──────────────────────────────────────────────
// Logs modal
// ──────────────────────────────────────────────

function LogsModal({ site, onClose }: { site: string | null; onClose: () => void }) {
  const { data: logs, isLoading } = useSiteLogs(site || "", !!site);
  const scrollRef = React.useRef<HTMLPreElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Dialog open={!!site} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TerminalSquare className="w-5 h-5 text-primary" />
            Логи: {site}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 bg-black/80 rounded-xl border border-white/10 p-4 mt-4 overflow-hidden flex flex-col relative">
          {isLoading && !logs ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <pre
              ref={scrollRef}
              className="flex-1 overflow-y-auto text-[11px] sm:text-xs font-mono text-green-400 whitespace-pre-wrap break-words leading-relaxed"
            >
              {logs || "Лог файл пуст или не существует."}
            </pre>
          )}

          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/70">Live</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
