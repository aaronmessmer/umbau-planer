# Umbau-Planer

Home-Assistant-Integration, mit der eine Person ihre Bau- und Umbauprojekte plant, in Arbeitsblöcke einteilt und die tatsächliche Arbeitszeit stempelt. Grundlage ist das [Pflichtenheft](Pflichtenheft%20Umbau-Planer.md). Umgesetzt sind **Stufe 1 und Stufe 2**.

- **Überblick:** beliebig tief verschachtelter Aufgabenbaum mit Priorität, Schätzung und Abhängigkeiten
- **Realistischer Plan:** Arbeitsblöcke (Standard 6 Stunden), Nachrücken auf Knopfdruck, fixierte Termine, reservierte Blöcke
- **Schätzen üben:** geschätzte und gestempelte Zeit je Aufgabe und Projekt, Schätzfaktor je Gewerk, Hochrechnung der Restarbeit

Keine Cloud, keine weiteren HACS-Erweiterungen, keine YAML-Helfer. Die Oberfläche ist ein eigenes Panel in der Seitenleiste, das mit dem Home-Assistant-Login arbeitet.

## Installation

### Über HACS (benutzerdefiniertes Repository)

1. HACS öffnen → Menü (⋮) → **Benutzerdefinierte Repositories**.
2. `https://github.com/aaronmessmer/umbau-planer` als Kategorie **Integration** hinzufügen.
3. „Umbau-Planer“ installieren und Home Assistant neu starten.

### Manuell

Den Ordner `custom_components/umbau_planer` in das Verzeichnis `config/custom_components/` kopieren und neu starten. Das fertig gebaute Panel (`custom_components/umbau_planer/frontend/umbau-planer-panel.js`) liegt im Repository, auf dem Raspberry Pi wird nichts gebaut.

### Einrichten

1. **Einstellungen → Geräte & Dienste → Integration hinzufügen → Umbau-Planer.** Es gibt nur eine Installation und keine Eingaben.
2. In der Seitenleiste erscheint **Umbau-Planer**.
3. Unter **Einstellungen** im Panel die Personen anlegen und je einem Home-Assistant-Benutzer zuordnen (die erste Person wird automatisch dem angemeldeten Benutzer zugeordnet; Administratoren wählen aus einer Liste, alle anderen nutzen „Mir zuordnen“).

Getestet mit Home Assistant 2026.2 und Python 3.13.

## Bedienung

Das Panel hat acht Ansichten; „Heute“ ist die Startansicht und auf das Handy ausgelegt (ab 360 px Breite bedienbar, folgt dem hellen oder dunklen Design von Home Assistant). Die laufende Uhr ist unten in jeder Ansicht sichtbar.

| Ansicht | Zweck |
| --- | --- |
| **Heute** | Laufende Uhr, heutiger Block mit Füllstand und Start-Knopf je Eintrag, Warnungen, „Block abschließen“, „Nachrücken“ |
| **Aufgaben** | Baum mit Status, Bereit-Marker, beiden Prioritäten und der gemeinsamen, geschätzt/gebucht/Rest/Prognose. Suche, Filter (Status, Gewerk, Projekt, „bereit“), Erledigte ausblenden. Zeilen direkt bearbeiten, per Ziehen am Griff ⠿ umsortieren oder verschieben (auf dem Handy: „Verschieben …“ in den Details) |
| **Jetzt möglich** | Bereite Aufgaben ohne Unteraufgaben nach gemeinsamer Priorität, mit „Start“ und „Einplanen“ |
| **Kalender** | Liste je Tag, Wochenansicht, Monatsansicht. Einträge und Blöcke per Ziehen verschieben, Blöcke als Serie anlegen, Befüllung eines Blocks nach Priorität vorschlagen, Listen „nicht eingeplant“ und „neu terminieren“ |
| **Uneinig** | Aufgaben, bei denen die Wertungen um mindestens die Schwelle auseinanderliegen, sortiert nach Abstand |
| **Zeiten** | Buchungen je Tag und Woche, Summen je Projekt, Buchungen anlegen, ändern, löschen, umhängen, Helferstunden |
| **Auswertung** | Soll-Ist je Projekt, Schätzfaktor, Verlauf, Hochrechnung, geplant gegen gebucht je Block, Aufgaben ohne Schätzung |
| **Einstellungen** | Personen, Prioritätsstufen, Gewerke, Schwellen, Export und Import |

### Wichtige Regeln im Alltag

- **Stempeln:** ▶ startet die Uhr auf jeder Aufgabe, in jeder Ansicht. Es läuft immer höchstens eine Uhr; wird eine zweite gestartet, endet die erste im selben Moment (ohne Lücke und Überschneidung) und ein Hinweis erlaubt „Rückgängig“. Beim Stoppen lässt sich in einem Schritt „erledigt“ wählen oder die Restschätzung anpassen. Eine laufende Uhr übersteht einen Neustart von Home Assistant, weil nur der Startzeitpunkt gespeichert wird.
- **Schätzung einfrieren:** Mit der ersten Zeitbuchung wird die ursprüngliche Schätzung gesperrt (🔒). Die Restschätzung bleibt jederzeit änderbar. Wird eine Schätzung erst nach der ersten Buchung gesetzt, ist sie sofort eingefroren. Aufgaben ohne Schätzung sind als „ohne Schätzung“ markiert und fließen nicht in Soll-Ist-Vergleiche ein.
- **Dauer eingeben:** `1:30`, `1,5 h`, `90 min`, `2h 15m`. Eine reine ganze Zahl sind Minuten.
- **Bereit / blockiert:** Eine Aufgabe ist bereit, wenn sie offen oder in Arbeit ist, kein Vorgänger („der Reihe nach“) und keine Blockade offen ist, nichts anderes „wartet auf“ gesetzt ist und auch alle übergeordneten Aufgaben nicht blockiert sind. Nicht bereite Aufgaben nennen den Grund mit Link zur blockierenden Aufgabe. Die Sperre ist weich: Du kannst trotzdem einplanen und stempeln, es erscheint nur ein Hinweis.
- **Löschen:** nennt die Zahl der betroffenen Unteraufgaben. Aufgaben mit Zeitbuchungen werden nicht gelöscht, sondern auf „verworfen“ gesetzt (samt den Aufgaben darüber, damit der Baum zusammenhängt).
- **Erledigt setzen:** Setzt du eine Aufgabe mit Unteraufgaben von Hand auf „erledigt“ oder „verworfen“, gilt das auch für ihre offenen Unteraufgaben. Sind alle Unteraufgaben erledigt oder verworfen, wird die übergeordnete Aufgabe automatisch erledigt; kommt eine neue dazu, ist sie wieder offen.

### Prioritäten

Jede Person bewertet mit ihrer eigenen Stufe (1 = höchste Priorität, Standard 5 Stufen). Die gemeinsame Priorität wird berechnet, nie eingegeben:

1. Unbewertete Aufgaben erben die Stufe der nächsten bewerteten übergeordneten Aufgabe (im Panel gestrichelt/kursiv).
2. Jede Stufe einer Person wird in einen Wert von 0 (am wichtigsten) bis 1 umgerechnet: mittlerer Rangplatz (ab 0) der ausdrücklich bewerteten offenen Aufgaben dieser Stufe, geteilt durch deren Anzahl. Wer eine Stufe selten vergibt, gibt ihr damit mehr Gewicht. Bei weniger als 5 bewerteten offenen Aufgaben gilt `(Stufe − 1) / (Stufenanzahl − 1)`. Stufen, die eine Person aktuell nicht ausdrücklich vergeben hat, werden zwischen den benachbarten Stufen eingeordnet.
3. Gemeinsam ist der Mittelwert beider Personen (hat nur eine Person eine Stufe, zählt sie allein), angezeigt zurückgerechnet auf die Stufenskala mit einer Nachkommastelle. Ohne Wertung steht die Aufgabe am Ende („unbewertet“); bei Gleichstand entscheidet die Reihenfolge im Baum.
4. „Uneinig“: wirksame Stufen um mindestens 2 (einstellbar) auseinander.

**Wer darf was:** Zuordnung über die Einstellungen. Eine *bewertende Person* darf ausschließlich ihre eigene Stufe ändern und sieht alles; eine *ausführende Person* (und jeder Administrator ohne Zuordnung) darf alles außer fremde Wertungen ändern. Solange keine Person angelegt ist, darf jeder Benutzer alles. Die Wertung wird immer dem angemeldeten Benutzer zugeordnet, nie einem vom Browser mitgeschickten Namen. (Die im Pflichtenheft offene Frage, ob die bewertende Person Aufgaben anlegen darf, ist so entschieden: nein, nur bewerten. Das lässt sich in `core/ops.py::can_edit` ändern.)

Ändert sich die Anzahl der Stufen, wird nach einer Vorschau proportional umgerechnet.

### Arbeitsblöcke, Nachrücken, Fixierung

- Ein Block hat Datum, optionale Startzeit, Kapazität (Standard 6 h), Notiz. Es sind mehrere Blöcke je Tag möglich. Eingeplant werden nur Aufgaben ohne Unteraufgaben; Vorschlag für die Dauer ist die Restschätzung abzüglich der in anderen künftigen Blöcken geplanten Zeit. Überbuchung ist möglich und wird rot markiert.
- **Nachrücken** (Heute-Ansicht): fragt die Restzeit jeder betroffenen Aufgabe ab (Vorschlag: aktuelle Restschätzung; die Antwort aktualisiert die Restschätzung), zeigt Plan vorher und nachher samt Warnungen und wendet erst nach Bestätigung an. Danach lässt sich der Schritt rückgängig machen (bis zur nächsten manuellen Planänderung).
  - Die Warteschlange besteht aus den nachrückenden Einträgen in bisheriger Reihenfolge, gefolgt von allen nicht fixierten künftigen Einträgen und den bisher „nicht eingeplanten“. Sie wird ab dem nächsten offenen Block verteilt (Kapazität abzüglich fixierter Einträge; reservierte Blöcke werden übersprungen).
  - Passt ein Eintrag nicht ganz, wird er geteilt. Teile unter der kleinsten Teilgröße (Standard 30 min, einstellbar) entstehen nicht; der Eintrag wandert dann ganz in den nächsten Block. Zwei Einträge derselben Aufgabe im selben Block werden zusammengelegt. Was nirgends mehr passt, landet in „nicht eingeplant“. Blöcke werden nie automatisch erzeugt.
  - Die Einträge vergangener Blöcke bleiben als Verlauf erhalten und sind „nachgerückt“ markiert.
- **Fixieren** (📌): ein Eintrag mit optionaler Uhrzeit und „mit wem“ wird nie verschoben und reserviert seine Zeit. Wird er nicht fertig, landet sein Rest in „neu terminieren“. Ist eine Voraussetzung nach Abhängigkeit nicht oder erst am selben Tag danach bzw. später eingeplant, erscheint eine Warnung am Eintrag, in der Heute-Ansicht und als Ereignis.
- **Reservieren:** Ein Block lässt sich für ein Projekt oder eine Aufgabe reservieren. Einplanbar sind dann nur Aufgaben aus diesem Ast, und beim Nachrücken rückt nichts hinein.
- **Serie / Vorschlag (Stufe 2):** Blöcke als Serie anlegen (Wochentage, Anzahl oder Enddatum). „Vorschlag nach Priorität“ befüllt einen Block mit bereiten Aufgaben in der Reihenfolge der gemeinsamen Priorität.

### Auswertung (Stufe 2)

- **Schätzfaktor** je erledigter Aufgabe: Aufwand (eigene Zeit + Helferstunden) ÷ ursprüngliche Schätzung. 1,6 bedeutet 60 % länger als geschätzt. Ausgewiesen als Median mit Anzahl und Streuung je Gewerk, je Projekt und insgesamt; dazu ein Verlauf über die zuletzt erledigten Aufgaben (gleitender Median über 5).
- **Hochrechnung:** Restschätzung jeder offenen Aufgabe × Faktor ihres Gewerks (bei weniger als 5 erledigten Aufgaben im Gewerk: Gesamtfaktor), je Projekt in Stunden und in Arbeitsblöcken der Standardkapazität.
- Je Block geplant gegen gebucht und die Zahl nachgerückter Einträge. Aufgaben ohne Schätzung bleiben außen vor und werden aufgelistet.

## Entitäten

| Entität | Zustand |
| --- | --- |
| `sensor.umbau_planer_aktive_aufgabe` | Titel der laufenden Aufgabe oder „keine“; Attribute `project`, `started`, `elapsed_min`, `task_id` |
| `binary_sensor.umbau_planer_uhr_laeuft` | An, solange eine Buchung läuft |
| `sensor.umbau_planer_heute_gebucht` | Heute gebuchte Stunden |
| `sensor.umbau_planer_heute_geplant` | Heute geplante Stunden |
| `sensor.umbau_planer_rest_gesamt` | Summe aller Restschätzungen in Stunden, Attribut `projekte` je Projekt |
| `sensor.umbau_planer_bereit` | Anzahl bereiter Aufgaben (ohne Unteraufgaben) |
| `sensor.umbau_planer_uneinig` | Anzahl uneiniger Aufgaben |
| `calendar.umbau_planer` | Arbeitsblöcke als Termine, Beschreibung mit den Einträgen (Blöcke ohne Startzeit sind ganztägig) |

## Dienste

| Dienst | Wirkung |
| --- | --- |
| `umbau_planer.start_timer` (`task_id`) | Startet die Uhr auf einer Aufgabe |
| `umbau_planer.stop_timer` | Beendet die laufende Buchung |
| `umbau_planer.resume_timer` | Setzt die zuletzt gestempelte Aufgabe fort |
| `umbau_planer.add_task` (`title`, `parent_id` optional) | Legt eine Aufgabe an |
| `umbau_planer.export` (`path` optional) | Schreibt alle Daten als JSON-Datei (Standard: `config/umbau_planer_export_<Zeit>.json`; der Pfad muss in `allowlist_external_dirs` liegen oder im Konfigurationsordner) |
| `umbau_planer.import` (`path`) | Liest eine JSON-Datei ein, nach automatischer Sicherung |

Die Kennung einer Aufgabe steht in den Exportdaten (`tasks[].id`) und im Attribut `task_id` des Sensors „Aktive Aufgabe“.

## Ereignisse

| Ereignis | Wann | Daten |
| --- | --- | --- |
| `umbau_planer_timer_long_running` | Die Uhr läuft länger als die Schwelle (Standard 5 h) oder über Mitternacht. Zusätzlich entsteht eine Benachrichtigung. Einmal je Buchung. | `task_id`, `task`, `started`, `elapsed_min`, `reason` (`duration` oder `midnight`) |
| `umbau_planer_prerequisite_warning` | Neue Warnung für einen fixierten Eintrag, dessen Voraussetzung nicht rechtzeitig eingeplant ist | `task_id`, `task`, `prerequisite_id`, `prerequisite`, `date`, `reason` (`not_planned` oder `fixed_after`) |

Beispiele: ein Badge für die laufende Aufgabe, eine Erinnerung ans Ausstempeln, Start und Stopp über einen Taster (`umbau_planer.resume_timer` / `umbau_planer.stop_timer`).

## Datenformat und Sicherung

- Die Daten liegen über den Store-Mechanismus von Home Assistant in `.storage/umbau_planer` (atomare Schreibvorgänge, Schema-Version, Migration).
- **Export / Import** erzeugen bzw. lesen dieselbe lesbare JSON-Struktur (Einstellungen → Datensicherung oder die Dienste):

```json
{
  "version": 1,
  "tasks": [{"id": "…", "parent_id": null, "order": 0, "title": "Umbau Haus", "notes": "",
             "status": "open", "category": null, "children_mode": "any",
             "estimate_initial_min": 120, "estimate_frozen_at": null, "remaining_min": null,
             "priorities": {"<person-id>": 2}, "blocked_by": [], "waiting_for": null,
             "waiting_until": null, "created_at": "…", "completed_at": null}],
  "blocks": [{"id": "…", "date": "2026-10-17", "start_time": "08:00", "capacity_min": 360,
              "reserved_for": null, "closed": false, "note": ""}],
  "entries": [{"id": "…", "task_id": "…", "block_id": "…", "order": 0, "planned_min": 120,
               "fixed": false, "fixed_time": null, "with_whom": null, "list": null,
               "superseded": false, "origin_id": null}],
  "time_entries": [{"id": "…", "task_id": "…", "start": "2026-10-17T06:00:00+00:00",
                    "end": null, "helper_min": 0, "note": ""}],
  "settings": {"persons": [], "level_names": [], "default_capacity_min": 360, "categories": [],
               "disagree_threshold": 2, "min_split_min": 30, "long_timer_min": 300}
}
```

  Status: `open`, `in_progress`, `done`, `discarded`; `children_mode`: `any` oder `sequential`; `list`: `unscheduled` oder `reschedule`. Dauern sind ganze Minuten, Zeitpunkte UTC. Summen, Bereitschaft und gemeinsame Priorität werden nie gespeichert.
- **Automatische Sicherungen** vor jeder Schema-Migration und vor jedem Import: `config/umbau_planer_backups/` (die letzten 20 bleiben erhalten).

## Entwicklung

```text
custom_components/umbau_planer/
  core/        reine Fachlogik ohne Home-Assistant-Abhängigkeit (tree, priorities, readiness, plan, timer, stats, ops)
  manager.py   hält die Daten, speichert, leitet Ansichten ab, löst Ereignisse aus
  websocket_api.py, services (in __init__.py), sensor.py, binary_sensor.py, calendar.py, config_flow.py
  frontend/    fertig gebautes Panel (umbau-planer-panel.js)
frontend/      TypeScript-/Lit-Quellen des Panels
tests/core     Unit-Tests der Fachlogik
tests/ha       Integrationstests mit pytest-homeassistant-custom-component
```

```bash
pip install -r requirements_test.txt
pytest                      # Unit- und Integrationstests

cd frontend
npm ci
npm run typecheck
npm run build               # schreibt custom_components/umbau_planer/frontend/umbau-planer-panel.js
```

Das gebaute Bundle ist eingecheckt; die CI prüft, dass es zu den Quellen passt. Die Tests decken Summenbildung, Einfrieren, Zusammenführung der Prioritäten, Bereitschaft, Zirkelprüfung und Nachrücken (Teilung, fixierte Einträge, reservierte Blöcke, Überhang, Rückgängig) sowie Config Flow, Dienste, Entitäten, Ereignisse, WebSocket-Befehle, Export/Import und Neustart mit laufender Uhr ab. Ein Test prüft außerdem, dass die abgeleiteten Werte für 1.000 Aufgaben und 5.000 Buchungen in unter einer Sekunde berechnet werden; gemessen wurde das auf einem normalen Rechner, **nicht** auf einem Raspberry Pi 5.

## Entscheidungen zu offenen Punkten

| Punkt | Umsetzung |
| --- | --- |
| Bewertende Person legt Aufgaben an? | Nein, sie darf nur ihre eigene Priorität ändern |
| Erledigte Projekte archivieren | Nicht umgesetzt; „Erledigte ausblenden“ blendet sie in der Aufgabenansicht aus, die Auswertung behält sie |
| Gewerke | Frei änderbare Liste, eine Aufgabe hat höchstens ein Gewerk |
| Verworfene Aufgaben | Ihre Zeit zählt weiter in Summen und Auswertung, ihre Restschätzung nicht |

## Lizenz

[MIT](LICENSE)

## Neue Version veröffentlichen

In GitHub unter **Actions → Release → Run workflow** die neue Versionsnummer eingeben (z. B. `0.2.0`). Der Workflow führt die Tests aus, trägt die Version in `manifest.json` und `frontend/package.json` ein, committet, setzt das Tag `v0.2.0` und legt das GitHub-Release an. HACS zeigt es danach als Update an. Gestartet wird er auf dem gewählten Branch, normalerweise `main`.
