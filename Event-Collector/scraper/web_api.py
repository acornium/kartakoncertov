"""
web_api.py — FastAPI сервер для веб-интерфейса парсера концертов.

Эндпоинты:
  GET    /scraper-api/events               — список событий (поиск, фильтр, пагинация)
  GET    /scraper-api/sites                — список настроенных сайтов
  POST   /scraper-api/sites               — добавить новый сайт (создать JSON-конфиг)
  DELETE /scraper-api/sites/{site_name}   — удалить сайт (удалить JSON-конфиг)
  POST   /scraper-api/run                 — запустить парсер (все или один сайт)
  GET    /scraper-api/run/status          — статус текущего запуска
  GET    /scraper-api/images/{site}/{filename} — отдать файл изображения
  GET    /scraper-api/logs/{site}         — содержимое лог-файла сайта

Запуск: uvicorn web_api:app --host 0.0.0.0 --port 8082
"""

import json
import re
import subprocess
import sys
import threading
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse
from pydantic import BaseModel

# Убедимся, что импорты из текущей папки работают
sys.path.insert(0, str(Path(__file__).parent))

import database
from log_manager import setup_logging

setup_logging()

# ──────────────────────────────────────────────
# Конфигурация приложения
# ──────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
CONFIGS_DIR = BASE_DIR / "parsers" / "configs"
IMAGES_DIR = BASE_DIR / "images"
LOGS_DIR = BASE_DIR / "logs"

app = FastAPI(
    title="Concert Scraper API",
    description="API для управления парсером концертных событий",
    version="1.0.0",
    root_path="/scraper-api",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Состояние запуска парсера
# ──────────────────────────────────────────────

_run_lock = threading.Lock()
_run_status: dict = {"running": False, "last_run": None, "message": ""}


# ──────────────────────────────────────────────
# Схемы Pydantic
# ──────────────────────────────────────────────

class RunRequest(BaseModel):
    site: Optional[str] = None  # None = все сайты


class RunStatus(BaseModel):
    running: bool
    last_run: Optional[str]
    message: str


class SiteFieldSelectors(BaseModel):
    title: list[str]
    date: Optional[list[str]] = None
    link: Optional[list[str]] = None
    image: Optional[list[str]] = None
    description: Optional[list[str]] = None


class JsonFieldsMap(BaseModel):
    title: str
    date: Optional[str] = None
    link: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None


class CreateSiteRequest(BaseModel):
    site_name: str
    venue: str
    url: str
    # HTML mode
    list_selector: Optional[str] = None
    fields: Optional[SiteFieldSelectors] = None
    # JSON API mode
    type: Optional[str] = None          # "json_api" или None (html)
    json_fields: Optional[JsonFieldsMap] = None
    rate_limit_seconds: float = 1.0


# ──────────────────────────────────────────────
# Инициализация базы данных при старте
# ──────────────────────────────────────────────

@app.on_event("startup")
def startup():
    database.init_db()


# ──────────────────────────────────────────────
# Эндпоинты
# ──────────────────────────────────────────────

@app.get("/events")
def get_events(
    search: str = Query("", description="Поиск по заголовку"),
    site: str = Query("", description="Фильтр по site_name"),
    venue: str = Query("", description="Фильтр по площадке"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    Возвращает список событий с поиском и фильтрацией.
    Дополнительно добавляет image_url_local для отображения фото через API.
    """
    all_events = database.fetch_all_events()

    # Фильтрация
    if search:
        s = search.lower()
        all_events = [e for e in all_events if s in (e.get("title") or "").lower()]
    if site:
        all_events = [e for e in all_events if e.get("source") == site]
    if venue:
        all_events = [e for e in all_events if e.get("venue") == venue]

    total = len(all_events)
    page = all_events[offset: offset + limit]

    # Добавляем локальный URL для изображений
    for event in page:
        img_path = event.get("image_path")
        if img_path and Path(img_path).exists():
            p = Path(img_path)
            # images/<site>/<filename>
            parts = p.parts
            if len(parts) >= 2:
                event["image_local_url"] = f"/scraper-api/images/{parts[-2]}/{parts[-1]}"
        else:
            event["image_local_url"] = None

    return {"total": total, "offset": offset, "limit": limit, "events": page}


@app.get("/sites")
def get_sites():
    """Возвращает список всех настроенных сайтов из JSON-конфигов."""
    sites = []
    for path in sorted(CONFIGS_DIR.glob("*.json")):
        try:
            with path.open(encoding="utf-8") as f:
                config = json.load(f)
            sites.append({
                "site_name": config.get("site_name", path.stem),
                "venue": config.get("venue"),
                "url": config.get("url"),
                "filename": path.name,
            })
        except Exception:
            pass
    return {"sites": sites}


@app.get("/ui", response_class=HTMLResponse)
@app.get("/ui-fallback", response_class=HTMLResponse)
def scraper_ui():
    """Built-in scraper UI without Node/Vite."""
    return """<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Scraper Fallback UI</title>
  <style>
    :root {
      --bg: #f6ede3;
      --bg2: #ecdac7;
      --card: #fff8ef;
      --line: #d8c3ad;
      --text: #3f2f22;
      --muted: #7f6a56;
      --accent: #a56f45;
      --accentSoft: #ccb197;
      --ok: #3f8a57;
      --warn: #9d6f2f;
      --danger: #a54b4b;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: linear-gradient(180deg, var(--bg), var(--bg2)); color: var(--text); font: 14px/1.45 Segoe UI, system-ui, sans-serif; }
    .wrap { max-width: 1360px; margin: 20px auto; padding: 0 14px; }
    h1 { margin: 0 0 10px; font-size: 22px; }
    h2 { margin: 0 0 8px; font-size: 16px; }
    .muted { color: var(--muted); }
    .top { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: 1.1fr 1.2fr 1.5fr; gap: 12px; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    input, select, button { width: 100%; border: 1px solid var(--line); border-radius: 8px; background: #fffaf4; color: var(--text); padding: 8px 10px; font: inherit; }
    button { cursor: pointer; background: var(--accent); color: #fff; border-color: #946343; }
    button.secondary { background: var(--accentSoft); color: var(--text); border-color: #b79b80; }
    button.warn { background: #9d6f2f; border-color: #855d26; }
    button.danger { background: #a54b4b; border-color: #8e3f3f; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .status { font-weight: 600; }
    .ok { color: var(--ok); }
    .warnText { color: var(--warn); }
    .dangerText { color: var(--danger); }
    .list, .events, .logs { border: 1px solid var(--line); border-radius: 10px; background: #fffaf4; overflow: auto; padding: 8px; }
    .list { max-height: 260px; }
    .events { max-height: 720px; }
    .logs { max-height: 220px; white-space: pre-wrap; }
    .siteItem, .eventItem { border-bottom: 1px solid #e5d4c4; padding: 8px 0; }
    .siteItem:last-child, .eventItem:last-child { border-bottom: 0; }
    .small { font-size: 12px; }
    .siteActions { display: flex; gap: 6px; margin-top: 6px; }
    .siteActions button { width: auto; padding: 6px 8px; }
    .eventsHead { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .eventRow { display: grid; grid-template-columns: 84px 1fr; gap: 10px; }
    .eventImg { width: 84px; height: 84px; object-fit: cover; border-radius: 8px; border: 1px solid var(--line); background: #f0e3d7; }
    .tag { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: 999px; background: #efe1d3; border: 1px solid var(--line); margin-right: 6px; }
    @media (max-width: 1180px) { .grid { grid-template-columns: 1fr; } .events { max-height: 420px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1 id="title">...</h1>

    <div class="top">
      <button id="runAll">...</button>
      <select id="runSiteSelect"></select>
      <button class="secondary" id="runOne">...</button>
      <button class="secondary" id="refreshAll">...</button>
      <span id="status" class="status muted">...</span>
    </div>

    <div class="grid">
      <section class="card">
        <h2 id="sitesHeader">...</h2>
        <div id="sitesList" class="list"></div>
      </section>

      <section class="card">
        <h2 id="cfgHeader">...</h2>
        <div class="row">
          <input id="siteName" placeholder="site_name" />
          <input id="siteVenue" placeholder="venue" />
        </div>
        <div class="row" style="margin-top:8px;">
          <input id="siteUrl" placeholder="url" />
          <input id="siteRate" type="number" step="0.1" min="0" value="1" placeholder="rate_limit_seconds" />
        </div>
        <div class="row" style="margin-top:8px;">
          <select id="siteType">
            <option value="html">HTML</option>
            <option value="json_api">JSON API</option>
          </select>
          <input id="listSelector" placeholder="list_selector" />
        </div>

        <div id="htmlFields" style="margin-top:8px;">
          <input id="fTitle" placeholder="title selectors" />
          <input id="fDate" placeholder="date selectors" style="margin-top:8px;" />
          <input id="fLink" placeholder="link selectors" style="margin-top:8px;" />
          <input id="fImage" placeholder="image selectors" style="margin-top:8px;" />
          <input id="fDesc" placeholder="description selectors" style="margin-top:8px;" />
        </div>

        <div id="jsonFields" style="display:none; margin-top:8px;">
          <input id="jTitle" placeholder="json title" />
          <input id="jDate" placeholder="json date" style="margin-top:8px;" />
          <input id="jLink" placeholder="json link" style="margin-top:8px;" />
          <input id="jImage" placeholder="json image" style="margin-top:8px;" />
          <input id="jDesc" placeholder="json description" style="margin-top:8px;" />
        </div>

        <div class="top" style="margin-top:10px;">
          <button id="createSite">Create</button>
          <button id="updateSite" class="warn">Save</button>
          <button id="deleteSite" class="danger">Delete</button>
          <button id="clearForm" class="secondary">Clear</button>
        </div>
        <div id="cfgHint" class="small muted"></div>

        <h2 id="logsHeader" style="margin-top:14px;">Logs</h2>
        <div class="top">
          <select id="logSiteSelect"></select>
          <button id="loadLogs" class="secondary">Load logs</button>
        </div>
        <pre id="logs" class="logs small"></pre>
      </section>

      <section class="card">
        <h2 id="eventsHeader">Events</h2>
        <div class="eventsHead">
          <input id="search" placeholder="search" />
          <select id="filterSite"></select>
          <input id="filterVenue" placeholder="venue filter" />
          <input id="limit" type="number" min="1" max="500" value="50" style="max-width:90px;" />
          <button id="applyFilters" class="secondary" style="max-width:120px;">Apply</button>
        </div>
        <div class="top">
          <button id="prevPage" class="secondary" style="max-width:110px;">Prev</button>
          <button id="nextPage" class="secondary" style="max-width:110px;">Next</button>
          <span id="pageInfo" class="muted small"></span>
        </div>
        <div id="events" class="events"></div>
      </section>
    </div>
  </div>

  <script>
    const RU = {
      title: "Панель управления парсером",
      runAll: "Запустить все сайты",
      runOne: "Запустить выбранный",
      refreshAll: "Обновить всё",
      statusLoading: "статус: загрузка...",
      sites: "Сайты",
      cfg: "Конфиг сайта",
      events: "События",
      logs: "Логи",
      chooseSite: "выбери сайт",
      allSites: "все сайты",
      create: "Создать",
      save: "Сохранить",
      del: "Удалить",
      clear: "Очистить",
      loadLogs: "Загрузить логи",
      apply: "Применить",
      prev: "Назад",
      next: "Вперёд",
      cfgHint: "Создай новый конфиг или нажми Edit в списке.",
      logsHint: "Выбери сайт и нажми “Загрузить логи”.",
      noSites: "Пока нет конфигов сайтов.",
      noEvents: "Нет событий по текущим фильтрам.",
      noImage: "нет картинки",
      source: "источник",
      statusPrefix: "статус: ",
      running: "выполняется...",
      idle: "ожидание",
      idleLast: "ожидание, последний запуск ",
      runError: "ошибка запуска: ",
      error: "ошибка: ",
      created: "создан ",
      updated: "обновлён ",
      deleted: "удалён ",
      saveErr: "ошибка сохранения: ",
      createErr: "ошибка создания: ",
      delErr: "ошибка удаления: ",
      askDelete: "Удалить сайт ",
      askDeleteQ: "?",
      pickSiteFirst: "сначала выбери сайт",
      emptyLogs: "(логи пустые)",
      edit: "Edit",
      run: "Запуск",
      logsBtn: "Логи",
      searchPh: "поиск по title",
      venuePh: "фильтр по площадке"
    };

    const API = "/scraper-api";
    const state = { sites: [], total: 0, offset: 0, selectedEditSite: null, logTimer: null };
    const $ = (id) => document.getElementById(id);
    const els = {
      title: $("title"), status: $("status"),
      runAll: $("runAll"), runSiteSelect: $("runSiteSelect"), runOne: $("runOne"), refreshAll: $("refreshAll"),
      sitesHeader: $("sitesHeader"), cfgHeader: $("cfgHeader"), eventsHeader: $("eventsHeader"), logsHeader: $("logsHeader"),
      sitesList: $("sitesList"),
      siteName: $("siteName"), siteVenue: $("siteVenue"), siteUrl: $("siteUrl"), siteRate: $("siteRate"),
      siteType: $("siteType"), listSelector: $("listSelector"), htmlFields: $("htmlFields"), jsonFields: $("jsonFields"),
      fTitle: $("fTitle"), fDate: $("fDate"), fLink: $("fLink"), fImage: $("fImage"), fDesc: $("fDesc"),
      jTitle: $("jTitle"), jDate: $("jDate"), jLink: $("jLink"), jImage: $("jImage"), jDesc: $("jDesc"),
      createSite: $("createSite"), updateSite: $("updateSite"), deleteSite: $("deleteSite"), clearForm: $("clearForm"),
      cfgHint: $("cfgHint"),
      logSiteSelect: $("logSiteSelect"), loadLogs: $("loadLogs"), logs: $("logs"),
      search: $("search"), filterSite: $("filterSite"), filterVenue: $("filterVenue"), limit: $("limit"),
      applyFilters: $("applyFilters"), prevPage: $("prevPage"), nextPage: $("nextPage"), pageInfo: $("pageInfo"),
      events: $("events")
    };

    function applyRu() {
      els.title.textContent = RU.title;
      els.runAll.textContent = RU.runAll;
      els.runOne.textContent = RU.runOne;
      els.refreshAll.textContent = RU.refreshAll;
      els.status.textContent = RU.statusLoading;
      els.sitesHeader.textContent = RU.sites;
      els.cfgHeader.textContent = RU.cfg;
      els.eventsHeader.textContent = RU.events;
      els.logsHeader.textContent = RU.logs;
      els.createSite.textContent = RU.create;
      els.updateSite.textContent = RU.save;
      els.deleteSite.textContent = RU.del;
      els.clearForm.textContent = RU.clear;
      els.loadLogs.textContent = RU.loadLogs;
      els.applyFilters.textContent = RU.apply;
      els.prevPage.textContent = RU.prev;
      els.nextPage.textContent = RU.next;
      els.cfgHint.textContent = RU.cfgHint;
      els.logs.textContent = RU.logsHint;
      els.search.placeholder = RU.searchPh;
      els.filterVenue.placeholder = RU.venuePh;
      els.siteVenue.placeholder = "площадка";
      els.siteUrl.placeholder = "ссылка";
      els.listSelector.placeholder = "list_selector (для HTML режима)";
      els.fTitle.placeholder = "селекторы title (через запятую)";
      els.fDate.placeholder = "селекторы date (через запятую)";
      els.fLink.placeholder = "селекторы link (через запятую)";
      els.fImage.placeholder = "селекторы image (через запятую)";
      els.fDesc.placeholder = "селекторы description (через запятую)";
      els.jTitle.placeholder = "json поле: title (обязательно)";
      els.jDate.placeholder = "json поле: date";
      els.jLink.placeholder = "json поле: link";
      els.jImage.placeholder = "json поле: image";
      els.jDesc.placeholder = "json поле: description";
      els.siteType.options[0].text = "HTML парсер";
      els.siteType.options[1].text = "JSON API парсер";
    }

    function splitList(v) { return (v || "").split(",").map((x) => x.trim()).filter(Boolean); }
    function toCsv(v) { return Array.isArray(v) ? v.join(", ") : (v || ""); }

    function setStatus(msg, cls = "muted") {
      els.status.className = `status ${cls}`;
      els.status.textContent = `${RU.statusPrefix}${msg}`;
    }

    async function req(path, options = {}) {
      const res = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
      if (!res.ok) {
        let detail = `${res.status} ${res.statusText}`;
        try { const d = await res.json(); if (d.detail) detail = d.detail; } catch (_) {}
        throw new Error(detail);
      }
      const ct = res.headers.get("content-type") || "";
      return ct.includes("application/json") ? res.json() : res.text();
    }

    function setSiteTypeUI() {
      const isJson = els.siteType.value === "json_api";
      els.htmlFields.style.display = isJson ? "none" : "block";
      els.jsonFields.style.display = isJson ? "block" : "none";
    }

    function clearForm() {
      state.selectedEditSite = null;
      els.siteName.value = ""; els.siteVenue.value = ""; els.siteUrl.value = ""; els.siteRate.value = "1";
      els.siteType.value = "html"; els.listSelector.value = "";
      els.fTitle.value = ""; els.fDate.value = ""; els.fLink.value = ""; els.fImage.value = ""; els.fDesc.value = "";
      els.jTitle.value = ""; els.jDate.value = ""; els.jLink.value = ""; els.jImage.value = ""; els.jDesc.value = "";
      setSiteTypeUI();
    }

    function payloadFromForm() {
      const payload = {
        site_name: els.siteName.value.trim(),
        venue: els.siteVenue.value.trim(),
        url: els.siteUrl.value.trim(),
        rate_limit_seconds: Number(els.siteRate.value || 1),
      };
      if (els.siteType.value === "json_api") {
        payload.type = "json_api";
        payload.json_fields = {
          title: els.jTitle.value.trim(),
          date: els.jDate.value.trim() || undefined,
          link: els.jLink.value.trim() || undefined,
          image: els.jImage.value.trim() || undefined,
          description: els.jDesc.value.trim() || undefined,
        };
      } else {
        payload.type = null;
        payload.list_selector = els.listSelector.value.trim();
        payload.fields = {
          title: splitList(els.fTitle.value),
          date: splitList(els.fDate.value),
          link: splitList(els.fLink.value),
          image: splitList(els.fImage.value),
          description: splitList(els.fDesc.value),
        };
      }
      return payload;
    }

    function fillFormFromConfig(siteName, cfg) {
      state.selectedEditSite = siteName;
      els.siteName.value = siteName || "";
      els.siteVenue.value = cfg.venue || "";
      els.siteUrl.value = cfg.url || "";
      els.siteRate.value = String(cfg.rate_limit_seconds ?? 1);
      els.siteType.value = cfg.type === "json_api" ? "json_api" : "html";
      els.listSelector.value = cfg.list_selector || "";
      const f = cfg.fields || {};
      els.fTitle.value = toCsv(f.title); els.fDate.value = toCsv(f.date); els.fLink.value = toCsv(f.link); els.fImage.value = toCsv(f.image); els.fDesc.value = toCsv(f.description);
      const j = cfg.json_fields || {};
      els.jTitle.value = j.title || ""; els.jDate.value = j.date || ""; els.jLink.value = j.link || ""; els.jImage.value = j.image || ""; els.jDesc.value = j.description || "";
      setSiteTypeUI();
    }

    function renderSites() {
      els.sitesList.innerHTML = "";
      if (!state.sites.length) { els.sitesList.innerHTML = `<div class="muted">${RU.noSites}</div>`; return; }
      for (const s of state.sites) {
        const div = document.createElement("div");
        div.className = "siteItem";
        div.innerHTML = `<div><strong>${s.site_name}</strong> <span class="small muted">(${s.venue || "-"})</span></div><div class="small muted">${s.url || "-"}</div>`;
        const actions = document.createElement("div");
        actions.className = "siteActions";

        const editBtn = document.createElement("button"); editBtn.className = "secondary"; editBtn.textContent = RU.edit;
        editBtn.onclick = async () => { try { const cfg = await req(`/sites/${encodeURIComponent(s.site_name)}`); fillFormFromConfig(s.site_name, cfg); setStatus(`edit ${s.site_name}`, "ok"); } catch (e) { setStatus(`${RU.error}${e.message}`, "dangerText"); } };

        const runBtn = document.createElement("button"); runBtn.textContent = RU.run; runBtn.onclick = () => runScraper(s.site_name);

        const logBtn = document.createElement("button"); logBtn.className = "secondary"; logBtn.textContent = RU.logsBtn;
        logBtn.onclick = () => { els.logSiteSelect.value = s.site_name; loadLogs(true); };

        actions.appendChild(editBtn); actions.appendChild(runBtn); actions.appendChild(logBtn);
        div.appendChild(actions); els.sitesList.appendChild(div);
      }
    }

    function fillSiteSelects() {
      const fill = (el, all) => {
        el.innerHTML = "";
        const o = document.createElement("option"); o.value = ""; o.textContent = all ? RU.allSites : RU.chooseSite; el.appendChild(o);
        for (const s of state.sites) { const opt = document.createElement("option"); opt.value = s.site_name; opt.textContent = s.site_name; el.appendChild(opt); }
      };
      fill(els.runSiteSelect, false); fill(els.logSiteSelect, false); fill(els.filterSite, true);
    }

    async function loadSites() { const d = await req("/sites"); state.sites = d.sites || []; renderSites(); fillSiteSelects(); }

    function renderEvents(list) {
      els.events.innerHTML = "";
      if (!list.length) { els.events.innerHTML = `<div class="muted">${RU.noEvents}</div>`; return; }
      for (const e of list) {
        const img = e.image_local_url || e.image_url || "";
        const imgHtml = img ? `<img class="eventImg" src="${img}" alt="img" />` : `<div class="eventImg small muted" style="display:flex;align-items:center;justify-content:center;">${RU.noImage}</div>`;
        const link = e.link ? `<a href="${e.link}" target="_blank" rel="noreferrer">${RU.source}</a>` : "";
        const row = document.createElement("div");
        row.className = "eventItem";
        row.innerHTML = `<div class="eventRow"><div>${imgHtml}</div><div><div><strong>${e.title || "-"}</strong></div><div class="small muted" style="margin-top:4px;">${e.date || "-"}</div><div class="small" style="margin-top:4px;"><span class="tag">${e.source || "-"}</span><span class="tag">${e.venue || "-"}</span></div><div class="small" style="margin-top:6px;">${link}</div></div></div>`;
        els.events.appendChild(row);
      }
    }

    async function loadEvents() {
      const qp = new URLSearchParams();
      qp.set("offset", String(state.offset));
      qp.set("limit", String(Number(els.limit.value || 50)));
      if (els.search.value.trim()) qp.set("search", els.search.value.trim());
      if (els.filterSite.value) qp.set("site", els.filterSite.value);
      if (els.filterVenue.value.trim()) qp.set("venue", els.filterVenue.value.trim());
      const d = await req(`/events?${qp.toString()}`);
      state.total = d.total || 0;
      const list = d.events || [];
      renderEvents(list);
      const end = Math.min(state.offset + list.length, state.total);
      els.pageInfo.textContent = `${state.total ? state.offset + 1 : 0}-${end} / ${state.total}`;
      els.prevPage.disabled = state.offset <= 0;
      els.nextPage.disabled = state.offset + Number(els.limit.value || 50) >= state.total;
    }

    async function loadStatus() {
      const st = await req("/run/status");
      if (st.running) setStatus(RU.running, "warnText");
      else if (st.last_run) setStatus(`${RU.idleLast}${st.last_run}`, "ok");
      else setStatus(RU.idle, "muted");
    }

    async function runScraper(siteName = null) {
      try {
        await req("/run", { method: "POST", body: JSON.stringify({ site: siteName }) });
        setStatus(siteName ? `${RU.run} ${siteName}` : RU.runAll, "warnText");
        setTimeout(refreshAll, 1500);
      } catch (e) {
        setStatus(`${RU.runError}${e.message}`, "dangerText");
      }
    }

    async function loadLogs(poll = false) {
      const site = els.logSiteSelect.value;
      if (!site) { els.logs.textContent = RU.pickSiteFirst; return; }
      try {
        const txt = await req(`/logs/${encodeURIComponent(site)}?lines=200`);
        els.logs.textContent = txt || RU.emptyLogs;
        if (poll) {
          if (state.logTimer) clearInterval(state.logTimer);
          state.logTimer = setInterval(() => loadLogs(false), 3000);
        }
      } catch (e) {
        els.logs.textContent = `${RU.error}${e.message}`;
      }
    }

    async function createSite() {
      try {
        const p = payloadFromForm();
        await req("/sites", { method: "POST", body: JSON.stringify(p) });
        setStatus(`${RU.created}${p.site_name}`, "ok");
        await loadSites();
      } catch (e) { setStatus(`${RU.createErr}${e.message}`, "dangerText"); }
    }

    async function updateSite() {
      try {
        const p = payloadFromForm();
        const target = state.selectedEditSite || p.site_name;
        if (!target) throw new Error(RU.pickSiteFirst);
        await req(`/sites/${encodeURIComponent(target)}`, { method: "PUT", body: JSON.stringify(p) });
        setStatus(`${RU.updated}${target}`, "ok");
        await loadSites();
      } catch (e) { setStatus(`${RU.saveErr}${e.message}`, "dangerText"); }
    }

    async function deleteSite() {
      try {
        const target = state.selectedEditSite || els.siteName.value.trim();
        if (!target) throw new Error(RU.pickSiteFirst);
        if (!confirm(`${RU.askDelete}${target}${RU.askDeleteQ}`)) return;
        await req(`/sites/${encodeURIComponent(target)}`, { method: "DELETE" });
        setStatus(`${RU.deleted}${target}`, "ok");
        clearForm();
        await loadSites();
      } catch (e) { setStatus(`${RU.delErr}${e.message}`, "dangerText"); }
    }

    async function refreshAll() {
      try { await Promise.all([loadSites(), loadEvents(), loadStatus()]); }
      catch (e) { setStatus(`${RU.error}${e.message}`, "dangerText"); }
    }

    els.siteType.addEventListener("change", setSiteTypeUI);
    els.runAll.addEventListener("click", () => runScraper(null));
    els.runOne.addEventListener("click", () => {
      if (!els.runSiteSelect.value) return setStatus(RU.pickSiteFirst, "warnText");
      runScraper(els.runSiteSelect.value);
    });
    els.refreshAll.addEventListener("click", refreshAll);
    els.createSite.addEventListener("click", createSite);
    els.updateSite.addEventListener("click", updateSite);
    els.deleteSite.addEventListener("click", deleteSite);
    els.clearForm.addEventListener("click", clearForm);
    els.loadLogs.addEventListener("click", () => loadLogs(true));
    els.applyFilters.addEventListener("click", () => { state.offset = 0; loadEvents(); });
    els.prevPage.addEventListener("click", () => { state.offset = Math.max(0, state.offset - Number(els.limit.value || 50)); loadEvents(); });
    els.nextPage.addEventListener("click", () => { state.offset += Number(els.limit.value || 50); loadEvents(); });

    applyRu();
    clearForm();
    refreshAll();
    setInterval(loadStatus, 3000);
  </script>
</body>
</html>
"""


def _build_config(site_name: str, body: CreateSiteRequest) -> dict:
    """Собирает словарь конфига из тела запроса (html или json_api)."""
    is_json_api = body.type == "json_api"

    config: dict = {
        "site_name": site_name,
        "venue": body.venue,
        "url": body.url,
        "rate_limit_seconds": body.rate_limit_seconds,
    }

    if is_json_api:
        config["type"] = "json_api"
        if body.json_fields:
            config["json_fields"] = {
                k: v for k, v in body.json_fields.model_dump().items() if v
            }
    else:
        config["list_selector"] = body.list_selector or ""
        if body.fields:
            fields: dict = {}
            for field_name, selectors in body.fields.model_dump(exclude_none=True).items():
                if selectors:
                    fields[field_name] = selectors[0] if len(selectors) == 1 else selectors
            config["fields"] = fields

    return config


@app.post("/sites", status_code=201)
def create_site(body: CreateSiteRequest):
    """Создаёт новый JSON-конфиг сайта в папке parsers/configs/."""
    if not re.match(r"^[a-zA-Z0-9_\-]+$", body.site_name):
        raise HTTPException(
            status_code=422,
            detail="site_name может содержать только латинские буквы, цифры, дефис и подчёркивание",
        )

    config_path = CONFIGS_DIR / f"{body.site_name}.json"
    if config_path.exists():
        raise HTTPException(
            status_code=409,
            detail=f"Сайт с именем «{body.site_name}» уже существует",
        )

    config = _build_config(body.site_name, body)
    CONFIGS_DIR.mkdir(parents=True, exist_ok=True)
    config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"created": True, "site_name": body.site_name, "filename": config_path.name}


@app.get("/sites/{site_name}")
def get_site(site_name: str):
    """Возвращает полный конфиг конкретного сайта."""
    if not re.match(r"^[a-zA-Z0-9_\-]+$", site_name):
        raise HTTPException(status_code=422, detail="Недопустимое имя сайта")
    config_path = CONFIGS_DIR / f"{site_name}.json"
    if not config_path.exists():
        raise HTTPException(status_code=404, detail=f"Конфиг «{site_name}» не найден")
    with config_path.open(encoding="utf-8") as f:
        return json.load(f)


@app.put("/sites/{site_name}")
def update_site(site_name: str, body: CreateSiteRequest):
    """Обновляет существующий JSON-конфиг сайта."""
    if not re.match(r"^[a-zA-Z0-9_\-]+$", site_name):
        raise HTTPException(status_code=422, detail="Недопустимое имя сайта")

    config_path = CONFIGS_DIR / f"{site_name}.json"
    if not config_path.exists():
        raise HTTPException(status_code=404, detail=f"Конфиг «{site_name}» не найден")

    config = _build_config(site_name, body)
    config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"updated": True, "site_name": site_name}


@app.delete("/sites/{site_name}")
def delete_site(site_name: str):
    """Удаляет JSON-конфиг сайта."""
    if not re.match(r"^[a-zA-Z0-9_\-]+$", site_name):
        raise HTTPException(status_code=422, detail="Недопустимое имя сайта")

    config_path = CONFIGS_DIR / f"{site_name}.json"
    if not config_path.exists():
        raise HTTPException(status_code=404, detail=f"Конфиг «{site_name}» не найден")

    config_path.unlink()
    return {"deleted": True, "site_name": site_name}


@app.post("/run")
def run_scraper(body: RunRequest, background_tasks: BackgroundTasks):
    """
    Запускает парсер в фоне. Если уже работает — возвращает 409.
    """
    with _run_lock:
        if _run_status["running"]:
            raise HTTPException(status_code=409, detail="Парсер уже запущен")
        _run_status["running"] = True
        _run_status["message"] = "Запуск..."

    def _do_run():
        cmd = [sys.executable, str(BASE_DIR / "main.py")]
        if body.site:
            cmd += ["--site", body.site]
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,
                cwd=str(BASE_DIR),
            )
            msg = result.stdout[-2000:] if result.stdout else result.stderr[-500:]
            status_msg = "Завершено успешно" if result.returncode == 0 else f"Ошибка (код {result.returncode})"
        except subprocess.TimeoutExpired:
            status_msg = "Превышено время ожидания (5 минут)"
            msg = ""
        except Exception as exc:
            status_msg = f"Ошибка запуска: {exc}"
            msg = ""

        from datetime import datetime
        with _run_lock:
            _run_status["running"] = False
            _run_status["last_run"] = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
            _run_status["message"] = status_msg

    background_tasks.add_task(_do_run)
    return {"started": True, "site": body.site}


@app.get("/run/status", response_model=RunStatus)
def run_status():
    """Возвращает текущий статус запуска парсера."""
    with _run_lock:
        return RunStatus(**_run_status)


@app.get("/images/{site}/{filename}")
def serve_image(site: str, filename: str):
    """Отдаёт файл изображения по имени сайта и файла."""
    # Базовая защита от path traversal
    if ".." in site or ".." in filename:
        raise HTTPException(status_code=400, detail="Недопустимый путь")
    file_path = IMAGES_DIR / site / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    return FileResponse(file_path)


@app.get("/logs/{site}", response_class=PlainTextResponse)
def get_log(site: str, lines: int = Query(100, ge=1, le=2000)):
    """Возвращает последние N строк лог-файла указанного сайта."""
    if ".." in site:
        raise HTTPException(status_code=400, detail="Недопустимое имя сайта")
    log_path = LOGS_DIR / f"{site}.log"
    if not log_path.exists():
        return f"Лог-файл для сайта «{site}» не найден."
    all_lines = log_path.read_text(encoding="utf-8").splitlines()
    return "\n".join(all_lines[-lines:])


# ──────────────────────────────────────────────
# Точка входа
# ──────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("SCRAPER_API_PORT", 8081))
    uvicorn.run("web_api:app", host="0.0.0.0", port=port, reload=False)
