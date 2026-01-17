# LinexioAbi: Die Source of Truth (V3.3)

Diese Datei ist das oberste Gesetz für die Entwicklung von LinexioAbi. Sie definiert Design, Logik und Architektur. Bei Widersprüchen zwischen Code und dieser Datei muss aktiv nachgefragt werden und darauf hingewiesen werden.

---

## 1. Design-System (Tablet-First & Hybrid)

### 1.1. Fundament
- **Zielgerät (Live):** iPad (optimiert für 11" und 12.9" im Landscape-Modus).
- **Zielgerät (Planung):** PC / Großer Bildschirm für komplexe Grid-Vorgänge.
- **Ästhetik:** "Aurora Nocturne" – Dunkler Hintergrund (#0a0f1d), subtile Cyan-Glows, Glas-Effekte.
- **Header-Navigation:** 
  - Konsolidierung mehrerer Primär-Aktionen in einem "Aktionen"-Dropdown-Menü, um Platz auf Tablet-Screens zu sparen.
- **Interaktions-Standards:**
  - **Keine Browser-Outlines.**
  - **Thin-Border-Regel:** Ring-1 für Markierungen.
  - **Touch-Targets:** Mindestens 44x44px für interaktive Elemente am iPad.
  - **CSV-Importe:** Trennzeichen ";" (Excel-Standard DE).

### 1.2. Visuelle Hierarchie & Farb-Semantik
- **Primary / Prüfungsräume:** Cyan (#06b6d4) für aktive Zustände und **Prüfungsräume**.
- **Vorbereitungsräume:** Amber (#f59e0b) für Zeit-Warnungen und **Vorbereitungsräume**.
- **Secondary:** Slate (#94a3b8) für unterstützende Texte.
- **Spotlight-Effekt:** Bei aktiver Suche werden unbeteiligte Elemente auf 20% Opazität gesetzt, Treffer erhalten einen farbigen Ring-1.

---

## 2. Fachlogik: Abitur-Prüfungsplanung

### 2.1. Zeit-Struktur
- **Raster:** 10-Minuten-Slots.
- **Die 30-Minuten-Regel:** Jede Prüfung belegt automatisch 3 Slots (20 Min Prüfung + 10 Min Beratung).

### 2.2. Integritäts-Check (NEU V3.2)
- **Personenzentrierte Sicht:** Matrix-Ansicht (Schüler vs. Prüfungen).
- **Vollständigkeit:** Ermöglicht das schnelle Identifizieren von Schülern ohne Prüfungen oder mit Terminkonflikten außerhalb der Raum-Sicht.

---

## 3. Architektur-Blaupause

### 3.1. Drei-Schichten-Modell
1. **Store:** `store/db.ts` (localforage).
2. **Context:** `context/AppContext.tsx` (Zustand & Business-Logic).
3. **Components:** Reine UI-Layer.
4. **Hooks:** Kapselung komplexer Logik.

### 3.2. Asset-Management (NEU V3.3)
- **Strikte Binär-Sperre:** Bilddateien (.png, .jpg, .ico) dürfen NIEMALS durch die KI generiert oder im Code-Update-Block überschrieben werden. 
- **Verfahren:** Assets werden manuell auf GitHub hochgeladen. Die KI referenziert lediglich die Dateinamen im Code.

---

## 6. Feature-Roadmap
- [x] Basis-Setup & Aurora-UI
- [x] Datenbank-Modul (CSV Import/Export)
- [x] Smart-Grid Planung (Drag & Drop mit 30-Min-Regel)
- [x] Live-Monitor (Realtime Status & Taxi-Logik)
- [x] Schüler-Integritätscheck (Spotlight-Suche)
- [x] Export-Modul (PDF/Druckansicht)