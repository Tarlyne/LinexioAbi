# LinexioAbi: Die Source of Truth (V3.1)

Diese Datei ist das oberste Gesetz für die Entwicklung von LinexioAbi. Sie definiert Design, Logik und Architektur. Bei Widersprüchen zwischen Code und dieser Datei muss aktiv nachgefragt werden und darauf hingewiesen werden.

---

## 1. Design-System (Tablet-First & Hybrid)

### 1.1. Fundament
- **Zielgerät (Live):** iPad (optimiert für 11" und 12.9" im Landscape-Modus).
- **Zielgerät (Planung):** PC / Großer Bildschirm für komplexe Grid-Vorgänge.
- **Ästhetik:** "Aurora Nocturne" – Dunkler Hintergrund (#0a0f1d), subtile Cyan-Glows, Glas-Effekte.
- **Layout-Konsistenz (Sidebar-Anker):** 
  - Alle Module starten exakt an der gleichen horizontalen Position rechts neben der Sidebar. 
- **Interaktions-Standards:**
  - **Keine Browser-Outlines.**
  - **Thin-Border-Regel:** Ring-1 für Markierungen.
  - **Touch-Targets:** Mindestens 44x44px für interaktive Elemente am iPad.
  - **CSV-Importe müssen Werte mit abgetrenntem ";" erwarten (bspw. Nachname;Vorname) - Grund: Excel exportiert in Deutschland mit ";".

### 1.2. Visuelle Hierarchie & Farb-Semantik
- **Primary / Prüfungsräume:** Cyan (#06b6d4) für aktive Zustände und **Prüfungsräume**.
- **Vorbereitungsräume:** Amber (#f59e0b) für Zeit-Warnungen und **Vorbereitungsräume**.
- **Secondary:** Slate (#94a3b8) für unterstützende Texte.

---

## 2. Fachlogik: Abitur-Prüfungsplanung

### 2.1. Zeit-Struktur
- **Raster:** 10-Minuten-Slots.
- **Die 30-Minuten-Regel:** Jede Prüfung belegt automatisch 3 Slots (20 Min Prüfung + 10 Min Beratung).

### 2.2. Live-Monitor Logik (NEU V3.1)
- **Check-In Deadline:** T-40 Min vor Prüfung. Warnung (rotes Dreieck) wenn nicht anwesend.
- **Vorbereitungs-Vase:** Startet T-20 Min vor Prüfung.
- **Taxi-Logik 1 (Zur Vorbereitung):** T-22 Min. Status: "ZUR VORBEREITUNG" (Amber blinkend).
- **Taxi-Logik 2 (Zur Prüfung):** T-2 Min. Status: "ZUR PRÜFUNG" (Cyan blinkend).
- **Cleanup:** Abgeschlossene Prüfungen werden aus dem Live-Monitor entfernt.

---

## 3. Architektur-Blaupause

### 3.1. Drei-Schichten-Modell
1. **Store:** `store/db.ts` (localforage).
2. **Context:** `context/AppContext.tsx` (Zustand & Business-Logic).
3. **Components:** Reine UI-Layer.
4. **Hooks:** Kapselung komplexer Logik (z.B. `useLive`).

---

## 4. Hardware-Strategie
- **Planungs-Phase:** PC.
- **Live-Phase:** iPad. Multi-Column Grid für schnellen Überblick und Touch-Interaktion.

---

## 6. Feature-Roadmap
- [x] Basis-Setup & Aurora-UI
- [x] Datenbank-Modul (CSV Import/Export)
- [x] Smart-Grid Planung (Drag & Drop mit 30-Min-Regel)
- [x] Live-Monitor (Realtime Status & Taxi-Logik)
- [x] Statistiken (Deputat-Rechner / Aufsichtsplan)
- [ ] Export-Modul (PDF/Druckansicht)