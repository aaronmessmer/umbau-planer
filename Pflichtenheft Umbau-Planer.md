# Pflichtenheft Umbau-Planer

Oct 11, 2026 · @Aaron

## Ziel und Überblick

Der Umbau-Planer (Arbeitstitel) ist eine Home-Assistant-Integration, mit der eine Person ihre Bau- und Umbauprojekte plant, in Arbeitsblöcke einteilt und die tatsächliche Arbeitszeit stempelt. Dieses Dokument ist der Auftrag an Claude Code. Es legt fest, was die Software können muss. Wo nichts festgelegt ist, entscheidet die Umsetzung.

Drei Ziele stehen im Vordergrund:

- **Überblick:** Alle offenen Arbeiten stehen in einem beliebig tief verschachtelten Aufgabenbaum, mit Priorität, Schätzung und Abhängigkeiten.
- **Realistischer Plan:** Arbeitsblöcke von üblicherweise 6 Stunden werden mit Aufgaben befüllt. Unerledigtes rückt auf Knopfdruck nach.
- **Schätzen üben:** Geschätzte und tatsächlich gestempelte Zeit stehen je Aufgabe und je Projekt nebeneinander.

Es gibt zwei Rollen, beide sind Home-Assistant-Benutzer:

| Rolle | Tätigkeit |
| --- | --- |
| Ausführende Person | Legt Aufgaben an, schätzt, plant Blöcke, stempelt, bewertet Prioritäten |
| Bewertende Person | Vergibt ausschließlich ihre eigenen Prioritäten und sieht den Stand |

Projekte sind die Aufgaben der obersten Ebene, zum Beispiel „Umbau Haus“, „Dach Schwiegermutter“ und „Camper“. Alle Projekte teilen sich einen Kalender und eine Stempeluhr.

## Rahmenbedingungen und Architektur

Die Lösung ist eine eigenständige Python-Integration mit eigenem Panel in der Seitenleiste, ohne YAML-Helfer und ohne separaten Login.

- **Zielsystem:** Home Assistant OS auf einem Raspberry Pi 5 mit 8 GB RAM und SSD. Bedienung am Handy über die Companion-App, am Tablet und am PC.
- **Integration:** `custom_components/umbau_planer`, Einrichtung über einen Config Flow in der Oberfläche. Das Repository ist so aufgebaut, dass es sich in HACS als benutzerdefiniertes Repository einbinden lässt.
- **Datenablage:** Eine JSON-Datei über den Store-Mechanismus von Home Assistant, mit Schema-Version und Migration. Schreibvorgänge sind atomar. Dazu Export und Import als lesbare JSON-Datei.
- **Fachlogik:** Summenbildung, Bereitschaft, Zusammenführung der Prioritäten und Nachrücken liegen in reinen Python-Modulen ohne Abhängigkeit zu Home Assistant, damit sie einzeln testbar sind.
- **Oberfläche:** Eigenes Panel in TypeScript mit Lit. Das fertig gebaute Bundle liegt im Repository, auf dem Pi wird nichts gebaut.
- **Kommunikation:** WebSocket-Befehle der Integration. Änderungen werden an alle offenen Geräte gemeldet, damit zwei Geräte denselben Stand zeigen.
- **Zeiten:** Dauern intern als ganze Minuten, Zeitpunkte in UTC. Angezeigt wird in Stunden und Minuten in der Zeitzone von Home Assistant.
- **Sprache:** Oberfläche auf Deutsch, Texte in Übersetzungsdateien. Bezeichner im Code auf Englisch.
- **Unabhängigkeit:** Keine Cloud-Dienste und keine weiteren HACS-Erweiterungen als Voraussetzung.

## Datenmodell

Das Modell trennt vier Dinge: die Aufgabe (was), den Arbeitsblock mit seinen Planeinträgen (Plan) und die Zeitbuchung (Ist). Summen, Bereitschaft und gemeinsame Priorität werden nie gespeichert, sondern beim Lesen berechnet.

### Aufgabe (`Task`)

| Feld | Inhalt |
| --- | --- |
| `id` | Eindeutige Kennung (UUID) |
| `parent_id` | Übergeordnete Aufgabe, leer bei Projekten |
| `order` | Position unter den Geschwistern |
| `title`, `notes` | Titel und freie Notiz |
| `status` | `offen`, `in Arbeit`, `erledigt`, `verworfen` |
| `category` | Gewerk aus einer änderbaren Liste, zum Beispiel Elektrik, Malen, Holz |
| `children_mode` | `der Reihe nach` oder `beliebig` (Standard) |
| `estimate_initial_min` | Ursprüngliche Schätzung in Minuten |
| `estimate_frozen_at` | Zeitpunkt des Einfrierens, leer solange änderbar |
| `remaining_min` | Restschätzung, jederzeit änderbar |
| `priorities` | Stufe je Person, leer wenn nicht bewertet |
| `blocked_by` | Liste von Aufgaben, die vorher erledigt sein müssen |
| `waiting_for`, `waiting_until` | Text „wartet auf …“ und optionales Datum |
| `created_at`, `completed_at` | Zeitpunkte |

### Arbeitsblock (`WorkBlock`)

| Feld | Inhalt |
| --- | --- |
| `id`, `date` | Kennung und Tag |
| `start_time` | Optionale Startzeit |
| `capacity_min` | Kapazität, Standard 360 Minuten |
| `reserved_for` | Optionale Aufgabe oder Projekt, für die der ganze Block reserviert ist |
| `closed` | Block ist abgeschlossen |
| `note` | Freie Notiz, zum Beispiel der Ort |

### Planeintrag (`PlanEntry`)

| Feld | Inhalt |
| --- | --- |
| `id`, `task_id` | Kennung und geplante Aufgabe |
| `block_id` | Block, leer bei Einträgen in einer Warteliste |
| `order` | Position im Block |
| `planned_min` | Geplante Dauer in diesem Block |
| `fixed`, `fixed_time` | Fixierung und optionale Uhrzeit |
| `with_whom` | Optionaler Text, wer hilft |
| `list` | Bei leerem Block: `nicht eingeplant` oder `neu terminieren` |
| `superseded` | Eintrag eines vergangenen Blocks, der nachgerückt wurde |

### Zeitbuchung (`TimeEntry`)

| Feld | Inhalt |
| --- | --- |
| `id`, `task_id` | Kennung und Aufgabe |
| `start`, `end` | Beginn und Ende, Ende leer bei laufender Uhr |
| `helper_min` | Optionale Helferstunden in Minuten |
| `note` | Freie Notiz |

### Einstellungen (`Settings`)

Personen mit Zuordnung zum Home-Assistant-Benutzer und Rolle, Anzahl und Namen der Prioritätsstufen, Standardkapazität eines Blocks, Liste der Gewerke, Schwelle für „uneinig“, kleinste Teilgröße beim Nachrücken und Schwelle für eine lange laufende Uhr.

## Aufgabenbaum und Schätzungen

Jede Aufgabe kennt nur ihre übergeordnete Aufgabe, daraus ergibt sich die unbegrenzte Tiefe.

### Aufgabenbaum

- **A-1:** Aufgaben lassen sich in beliebiger Tiefe anlegen. Aufgaben ohne übergeordnete Aufgabe sind Projekte.
- **A-2:** Aufgaben lassen sich umbenennen, per Ziehen umsortieren und unter eine andere Aufgabe verschieben. Eine Aufgabe kann nicht unter sich selbst oder einen eigenen Nachfahren verschoben werden.
- **A-3:** Löschen verlangt eine Bestätigung und nennt die Zahl der betroffenen Unteraufgaben. Aufgaben mit Zeitbuchungen werden nicht gelöscht, sondern auf `verworfen` gesetzt.
- **A-4:** Der Status wechselt bei der ersten Zeitbuchung automatisch auf `in Arbeit`. Sind alle Unteraufgaben erledigt oder verworfen, wird die übergeordnete Aufgabe `erledigt`. Kommt eine neue Unteraufgabe dazu, wird sie wieder `offen`.
- **A-5:** Äste lassen sich ein- und ausklappen, der Zustand bleibt je Gerät erhalten.
- **A-6:** Suche nach Titel und Notiz. Filter nach Status, Gewerk, Projekt und „bereit“.
- **A-7:** Erledigte Aufgaben lassen sich ausblenden.

### Schätzungen

- **S-1:** Jede Aufgabe kann eine Schätzung in Stunden und Minuten bekommen.
- **S-2:** Eine Aufgabe mit Unteraufgaben zeigt die Summe ihrer Unteraufgaben. Hat sie zusätzlich eine eigene Schätzung, gilt diese als Grobschätzung und steht zum Vergleich daneben.
- **S-3:** Mit der ersten Zeitbuchung auf eine Aufgabe wird ihre ursprüngliche Schätzung eingefroren und lässt sich nicht mehr ändern.
- **S-4:** Die Restschätzung bleibt jederzeit änderbar. Ihr Vorschlagswert ist die ursprüngliche Schätzung minus gebuchte Zeit, mindestens 0.
- **S-5:** Je Aufgabe werden angezeigt: geschätzt, gebucht, Rest, Prognose (gebucht plus Rest) und Abweichung der Prognose zur Schätzung.
- **S-6:** Alle Werte summieren sich den Baum hinauf bis zum Projekt. Zeit, die direkt auf eine Aufgabe mit Unteraufgaben gebucht wurde, zählt in deren Summe mit.
- **S-7:** Wird eine Aufgabe erledigt, wird ihr Rest 0.
- **S-8:** Aufgaben ohne Schätzung sind als solche gekennzeichnet und fließen nicht in Soll-Ist-Vergleiche ein.

## Prioritäten

Jede Person vergibt je Aufgabe eine eigene Stufe, die gemeinsame Priorität wird daraus berechnet und nie eingegeben.

- **P-1:** Stufe 1 ist die höchste Priorität. Standard sind 5 Stufen. Anzahl und Namen der Stufen sind in den Einstellungen änderbar. Bei geänderter Anzahl werden bestehende Wertungen nach einer Vorschau proportional umgerechnet.
- **P-2:** Jede Person ändert nur ihre eigene Stufe, erkannt am angemeldeten Home-Assistant-Benutzer. Beide Wertungen sind für beide Personen sichtbar.
- **P-3:** Hat eine Person eine Aufgabe nicht bewertet, gilt ihre Stufe der nächsten bewerteten übergeordneten Aufgabe. Geerbte Stufen sind optisch von eigenen unterscheidbar.
- **P-4:** Die Stufen werden je Person in einen Wert von 0 (am wichtigsten) bis 1 umgerechnet, der berücksichtigt, wie die Person ihre Skala nutzt. Dazu erhält jede Stufe den mittleren Rangplatz ihrer Aufgaben unter allen ausdrücklich bewerteten offenen Aufgaben dieser Person, geteilt durch deren Anzahl. Eine Stufe, die jemand selten vergibt, wiegt dadurch schwerer als eine, die er häufig vergibt.
- **P-5:** Hat eine Person weniger als 5 offene Aufgaben ausdrücklich bewertet, gilt für sie die lineare Umrechnung (Stufe minus 1) geteilt durch (Stufenanzahl minus 1).
- **P-6:** Die gemeinsame Priorität ist der Mittelwert der Werte beider Personen. Hat nur eine Person eine wirksame Stufe, zählt ihr Wert allein. Hat keine eine, steht die Aufgabe am Ende und ist als „unbewertet“ gekennzeichnet.
- **P-7:** Angezeigt wird die gemeinsame Priorität zurückgerechnet auf die Stufenskala mit einer Nachkommastelle, neben den beiden Einzelwertungen.
- **P-8:** Eine Aufgabe gilt als „uneinig“, wenn die wirksamen Stufen beider Personen um mindestens 2 auseinanderliegen. Die Schwelle ist einstellbar. Eine eigene Liste zeigt diese Aufgaben, sortiert nach Abstand.
- **P-9:** Bei gleicher gemeinsamer Priorität entscheidet die Reihenfolge im Baum.

Beispiel mit 5 Stufen:

| Aufgabe | Person A | Person B | Gemeinsam | Hinweis |
| --- | --- | --- | --- | --- |
| Sockelleisten Flur | 2 | 2 | hoch |  |
| Werkstatt-Regal | 1 | 5 | mittel | uneinig |
| Vorhangschienen | 4 | 1 | mittel | uneinig |
| Kellertür streichen | 5 | 4 | niedrig |  |

## Abhängigkeiten und Bereitschaft

Für jede Aufgabe wird berechnet, ob sie „bereit“ ist, also jetzt begonnen werden kann.

- **D-1:** Jede Aufgabe mit Unteraufgaben hat den Schalter „der Reihe nach“ oder „beliebig“. Standard ist „beliebig“.
- **D-2:** Bei „der Reihe nach“ ist jede Unteraufgabe blockiert, solange eine vor ihr stehende weder erledigt noch verworfen ist. Umsortieren ändert damit die Abhängigkeit.
- **D-3:** Bei „beliebig“ dient die Reihenfolge nur der Anzeige.
- **D-4:** Zusätzlich lässt sich je Aufgabe ausdrücklich „blockiert durch“ setzen, auf beliebige andere Aufgaben, auch in anderen Ästen und Projekten. Zirkelbezüge werden beim Anlegen abgelehnt, auch solche über Vorfahren und Nachfahren.
- **D-5:** „Wartet auf“ hält eine Aufgabe mit einem Text an, zum Beispiel Material oder Handwerker, optional mit Datum. Der Zustand wird von Hand aufgehoben. Ist das Datum erreicht, erscheint ein Hinweis.
- **D-6:** Eine Aufgabe ist bereit, wenn alle Bedingungen gelten: Status `offen` oder `in Arbeit`, kein offener Vorgänger nach D-2, alle Aufgaben aus „blockiert durch“ erledigt oder verworfen, kein „wartet auf“ und alle übergeordneten Aufgaben selbst bereit.
- **D-7:** Eine Blockade vererbt sich damit auf alle Unteraufgaben.
- **D-8:** Nicht bereite Aufgaben zeigen den Grund an, mit Verweis auf die blockierende Aufgabe.
- **D-9:** Die Sperre ist weich. Eine nicht bereite Aufgabe lässt sich trotzdem einplanen und stempeln, es erscheint nur ein Hinweis mit dem Grund.
- **D-10:** Die Ansicht „Jetzt möglich“ zeigt alle bereiten Aufgaben ohne Unteraufgaben, sortiert nach gemeinsamer Priorität.

## Arbeitsblöcke, Nachrücken und Fixierung

Arbeitsblöcke sind der Plan. Die eingeplanten Aufgaben bilden über alle Blöcke hinweg eine Warteschlange, die auf Knopfdruck nachrückt und fixierte Termine unberührt lässt.

### Arbeitsblöcke

- **B-1:** Ein Block hat Datum, optionale Startzeit, Kapazität und Notiz. Die Standardkapazität beträgt 6 Stunden und ist einstellbar. Mehrere Blöcke je Tag sind möglich.
- **B-2:** Eingeplant werden Aufgaben ohne Unteraufgaben. Der Vorschlag für die geplante Dauer ist die Restschätzung abzüglich der bereits in anderen künftigen Blöcken geplanten Zeit.
- **B-3:** Die Reihenfolge der Einträge im Block ist änderbar, Einträge lassen sich in einen anderen Block verschieben.
- **B-4:** Jeder Block zeigt seinen Füllstand, zum Beispiel 4,5 von 6 Stunden. Überbuchen ist möglich und wird deutlich markiert.
- **B-5:** Eine Aufgabe darf auf mehrere Blöcke verteilt sein. Die Aufgabe zeigt, wie viel ihrer Restschätzung eingeplant ist.
- **B-6:** Liegt eine Aufgabe im Plan vor einer Aufgabe, von der sie nach D-2 oder D-4 abhängt, erscheint eine Warnung.
- **B-7:** Ein Block lässt sich abschließen. Vergangene Blöcke zeigen je Eintrag geplante und an diesem Tag tatsächlich gebuchte Zeit und sind nicht mehr planbar.

### Nachrücken

- **N-1:** Ein Knopf „Nachrücken“ verschiebt alles Unerledigte aus abgeschlossenen oder vergangenen Blöcken nach vorne in die kommenden Blöcke.
- **N-2:** Für jede betroffene, nicht erledigte Aufgabe wird die Restzeit abgefragt. Vorschlag ist die aktuelle Restschätzung. Die Antwort aktualisiert die Restschätzung der Aufgabe.
- **N-3:** Die Warteschlange besteht aus den nachrückenden Einträgen in ihrer bisherigen Reihenfolge, gefolgt von allen nicht fixierten künftigen Einträgen in ihrer Reihenfolge.
- **N-4:** Die Warteschlange wird ab dem nächsten offenen Block neu verteilt. Maßgeblich ist je Block die Kapazität abzüglich fixierter Einträge. Reservierte Blöcke werden übersprungen.
- **N-5:** Passt ein Eintrag nicht mehr ganz in einen Block, wird er geteilt und der Rest in den nächsten Block gelegt. Teile unter 30 Minuten entstehen nicht, der Eintrag wandert dann ganz in den nächsten Block. Der Wert ist einstellbar.
- **N-6:** Zwei Einträge derselben Aufgabe, die im selben Block aufeinandertreffen, werden zusammengelegt.
- **N-7:** Was in keinen angelegten Block mehr passt, landet in der Liste „nicht eingeplant“, in unveränderter Reihenfolge. Blöcke werden nicht automatisch erzeugt.
- **N-8:** Vor dem Anwenden zeigt eine Vorschau den Plan vorher und nachher. Nach dem Anwenden lässt sich der Schritt rückgängig machen.
- **N-9:** Die Einträge vergangener Blöcke bleiben als Verlauf erhalten und werden als nachgerückt markiert, damit ursprünglicher Plan und Wirklichkeit vergleichbar bleiben.

### Fixierung

- **F-1:** Ein Planeintrag lässt sich fixieren, optional mit Uhrzeit und dem Feld „mit wem“. Er reserviert seine geplante Zeit im Block und wird beim Nachrücken nie verschoben. Die restliche Kapazität des Blocks bleibt für nachrückende Aufgaben offen.
- **F-2:** Ein ganzer Block lässt sich für ein Projekt oder eine Aufgabe reservieren. Einplanbar sind dann nur Aufgaben aus diesem Ast. Beim Nachrücken rückt nichts hinein, auch wenn Kapazität frei ist.
- **F-3:** Wird ein fixierter Eintrag nicht fertig, rückt sein Rest nicht nach. Er landet in der Liste „neu terminieren“ und wird von Hand neu eingeplant.
- **F-4:** Ist eine Voraussetzung eines fixierten Eintrags nach D-2 oder D-4 nicht eingeplant oder erst am selben Tag danach oder später eingeplant, erscheint eine Warnung am Eintrag und in der Tagesansicht.
- **F-5:** Die Vorschau des Nachrückens meldet, wenn dadurch eine Voraussetzung hinter ihren fixierten Termin rutschen würde.

## Stempeluhr

Die Stempeluhr erfasst die tatsächliche Arbeitszeit als einzelne Buchungen mit Beginn und Ende je Aufgabe.

- **T-1:** Jede Aufgabe lässt sich aus jeder Ansicht mit einem Tippen starten. Es läuft immer höchstens eine Uhr.
- **T-2:** Wird eine andere Aufgabe gestartet, endet die laufende Buchung im selben Moment. Ein kurzer Hinweis erlaubt, den Wechsel rückgängig zu machen.
- **T-3:** „Stopp“ beendet die Buchung. „Fortsetzen“ startet eine neue Buchung auf der zuletzt gestempelten Aufgabe.
- **T-4:** Eine laufende Uhr übersteht einen Neustart von Home Assistant, weil nur der Startzeitpunkt gespeichert wird.
- **T-5:** Buchungen lassen sich nachträglich ändern: Beginn und Ende anpassen, Buchung von Hand anlegen, löschen und einer anderen Aufgabe zuordnen.
- **T-6:** Buchungen dürfen sich zeitlich nicht überschneiden. Das Ende liegt immer nach dem Beginn.
- **T-7:** Läuft eine Uhr länger als 5 Stunden ohne Unterbrechung oder über Mitternacht, wird eine Benachrichtigung in Home Assistant erzeugt und ein Ereignis ausgelöst. Die Schwelle ist einstellbar.
- **T-8:** Je Buchung lassen sich optional Helferstunden eintragen. Der Aufwand einer Aufgabe ist eigene Zeit plus Helferstunden. Soll-Ist-Vergleiche rechnen mit dem Aufwand, die eigene Zeit wird getrennt ausgewiesen.
- **T-9:** Die erste Buchung setzt die Aufgabe auf `in Arbeit` und friert ihre Schätzung nach S-3 ein.
- **T-10:** Beim Stoppen lässt sich in einem Schritt „erledigt“ wählen oder die Restschätzung anpassen. Der Schritt ist überspringbar.
- **T-11:** Summen stehen je Aufgabe, je Projekt, je Tag und je Woche zur Verfügung.

## Auswertung

Die Auswertung zeigt, wie weit Schätzung und Wirklichkeit auseinanderliegen und was das für die Restarbeit bedeutet.

- **W-1:** Für jede erledigte Aufgabe mit Schätzung wird der Schätzfaktor berechnet: Aufwand geteilt durch ursprüngliche Schätzung. Ein Faktor von 1,6 bedeutet 60 Prozent länger als geschätzt.
- **W-2:** Der Faktor wird je Gewerk, je Projekt und insgesamt als Median ausgewiesen, mit Anzahl der Aufgaben und Streuung.
- **W-3:** Ein Verlauf über die zuletzt erledigten Aufgaben zeigt, ob die Schätzungen besser werden.
- **W-4:** Die Hochrechnung multipliziert die Restschätzung jeder offenen Aufgabe mit dem Faktor ihres Gewerks. Gibt es dort weniger als 5 erledigte Aufgaben, gilt der Gesamtfaktor.
- **W-5:** Die hochgerechnete Restarbeit wird je Projekt in Stunden und in Arbeitsblöcken der Standardkapazität angegeben.
- **W-6:** Je vergangenem Block steht geplante gegen gebuchte Zeit, dazu die Zahl der nachgerückten Einträge.
- **W-7:** Aufgaben ohne Schätzung bleiben außen vor und werden in einer eigenen Liste genannt.

## Oberfläche

Das Panel hat acht Ansichten. „Heute“ ist die Startansicht und auf das Handy ausgelegt.

| Ansicht | Inhalt |
| --- | --- |
| Heute | Laufende Uhr, heutiger Block mit Füllstand und Start-Knopf je Eintrag, Warnungen, Knöpfe „Block abschließen“ und „Nachrücken“ |
| Aufgaben | Baum mit Status, Bereit-Marker, beiden Prioritäten und gemeinsamer Priorität, geschätzt, gebucht und Rest |
| Jetzt möglich | Bereite Aufgaben nach gemeinsamer Priorität, mit Start-Knopf und „einplanen“ |
| Kalender | Blöcke je Tag mit Einträgen, Listen „nicht eingeplant“ und „neu terminieren“ |
| Uneinig | Aufgaben mit abweichender Wertung, sortiert nach Abstand |
| Zeiten | Buchungen je Tag und Woche, Korrektur nach T-5 |
| Auswertung | Inhalte des Abschnitts Auswertung |
| Einstellungen | Personen, Stufen, Gewerke, Schwellen, Export und Import |

Für alle Ansichten gilt:

- **O-1:** Die Oberfläche folgt dem hellen oder dunklen Design von Home Assistant und ist ab 360 Pixel Breite bedienbar.
- **O-2:** Felder werden direkt in der Zeile bearbeitet. Eine Rückfrage kommt nur bei Löschen, Import und Nachrücken.
- **O-3:** Die laufende Uhr ist in jeder Ansicht sichtbar, mit Aufgabe, verstrichener Zeit und Stopp-Knopf.
- **O-4:** Die bewertende Person sieht dieselben Ansichten, kann aber nur ihre eigene Stufe ändern. Ihre Stufe lässt sich im Baum mit einem Tippen setzen.
- **O-5:** Wird eine Ansicht verlassen, während ein Dialog offen ist, geht keine Eingabe ohne Hinweis verloren.

## Home-Assistant-Einbindung

Die Integration stellt Entitäten, Dienste und Ereignisse bereit, damit sich Stand und Stempeluhr in Dashboards und Automationen nutzen lassen.

| Entität | Zustand |
| --- | --- |
| `sensor.umbau_planer_aktive_aufgabe` | Titel der laufenden Aufgabe oder „keine“, Attribute: Projekt, Beginn, verstrichene Minuten |
| `binary_sensor.umbau_planer_uhr_laeuft` | An, solange eine Buchung läuft |
| `sensor.umbau_planer_heute_gebucht` | Heute gebuchte Stunden |
| `sensor.umbau_planer_heute_geplant` | Heute geplante Stunden |
| `sensor.umbau_planer_rest_gesamt` | Summe aller Restschätzungen in Stunden, Attribute je Projekt |
| `sensor.umbau_planer_bereit` | Anzahl bereiter Aufgaben |
| `sensor.umbau_planer_uneinig` | Anzahl uneiniger Aufgaben |
| `calendar.umbau_planer` | Arbeitsblöcke als Termine, Beschreibung mit den Einträgen |

| Dienst | Wirkung |
| --- | --- |
| `umbau_planer.start_timer` | Startet die Uhr auf einer Aufgabe |
| `umbau_planer.stop_timer` | Beendet die laufende Buchung |
| `umbau_planer.resume_timer` | Setzt die zuletzt gestempelte Aufgabe fort |
| `umbau_planer.add_task` | Legt eine Aufgabe mit Titel und optionaler übergeordneter Aufgabe an |
| `umbau_planer.export` | Schreibt alle Daten als JSON-Datei |
| `umbau_planer.import` | Liest eine JSON-Datei ein, nach automatischer Sicherung |

Ereignisse: `umbau_planer_timer_long_running` nach T-7 und `umbau_planer_prerequisite_warning` nach F-4. Damit sind zum Beispiel ein Badge für die laufende Aufgabe, eine Erinnerung ans Ausstempeln und Start und Stopp über einen Taster möglich.

## Ausbaustufen

Stufe 1 liefert alles, was zum täglichen Planen und Stempeln nötig ist. Stufe 2 ergänzt Komfort und die ausführliche Auswertung. Das Datenmodell wird von Anfang an vollständig angelegt.

| Bereich | Stufe 1 | Stufe 2 |
| --- | --- | --- |
| Aufgabenbaum | A-1 bis A-7 |  |
| Schätzungen | S-1 bis S-8 |  |
| Prioritäten | P-1 bis P-9 |  |
| Abhängigkeiten | D-1 bis D-10 |  |
| Arbeitsblöcke | B-1 bis B-7, Kalender als Liste je Tag | Kalender mit Wochen- und Monatsansicht und Ziehen und Ablegen, Blöcke als Serie anlegen, Befüllung eines Blocks nach gemeinsamer Priorität vorschlagen |
| Nachrücken und Fixierung | N-1 bis N-9, F-1 bis F-5 |  |
| Stempeluhr | T-1 bis T-11 |  |
| Auswertung | Soll-Ist je Aufgabe und Projekt nach S-5 und S-6 | W-1 bis W-7 |
| Einbindung | Alle Entitäten, Dienste und Ereignisse |  |

## Qualität und Abnahme

Die Fachlogik ist durch automatische Tests abgesichert, und die Daten überstehen Abstürze, Updates und Importe ohne Verlust.

- **Q-1:** Unit-Tests für Summenbildung, Einfrieren, Zusammenführung der Prioritäten, Bereitschaft, Zirkelprüfung und Nachrücken, einschließlich Teilung, fixierter Einträge, reservierter Blöcke und Überhang.
- **Q-2:** Integrationstests mit `pytest-homeassistant-custom-component` für Config Flow, Dienste, Entitäten und WebSocket-Befehle.
- **Q-3:** Vor jeder Schema-Migration und vor jedem Import wird automatisch eine Sicherungskopie der Daten abgelegt.
- **Q-4:** Mit 1.000 Aufgaben und 5.000 Zeitbuchungen lädt die Aufgabenansicht auf dem Zielsystem in unter 1 Sekunde.
- **Q-5:** Eine README beschreibt Installation, Bedienung, Datenformat, Entitäten und Dienste.

Abnahmefälle für Stufe 1:

1. Ein Projekt mit drei Ebenen und Schätzungen von 2 und 3 Stunden auf der untersten Ebene zeigt auf jeder Ebene darüber 5 Stunden.
2. Nach einer Buchung von 30 Minuten ist die ursprüngliche Schätzung der Aufgabe gesperrt, die Restschätzung bleibt änderbar.
3. Eine Aufgabe mit den Stufen 1 und 5 erscheint in der Liste „Uneinig“. Eine unbewertete Unteraufgabe zeigt die geerbten Stufen.
4. Unter einer Aufgabe „der Reihe nach“ mit drei Unteraufgaben ist nur die erste bereit. Nach deren Erledigung ist es die zweite.
5. Eine blockierte Aufgabe lässt sich stempeln und zeigt dabei den Grund der Blockade.
6. In einem Block von 6 Stunden sind 4 Stunden belegt. Eine nachrückende Aufgabe von 4 Stunden wird in 2 Stunden in diesem und 2 Stunden im nächsten Block geteilt.
7. Ein fixierter Eintrag steht nach dem Nachrücken am selben Platz. Ein nicht erledigter fixierter Eintrag steht in „neu terminieren“.
8. In einen reservierten Block rückt nichts nach, obwohl Kapazität frei ist.
9. Liegt eine Voraussetzung eines fixierten Eintrags nach dessen Termin, erscheint die Warnung nach F-4.
10. Nachrücken lässt sich rückgängig machen und stellt den Plan exakt wieder her.
11. Eine laufende Uhr zeigt nach einem Neustart von Home Assistant die richtige verstrichene Zeit.
12. Der Start einer zweiten Aufgabe beendet die erste Buchung ohne Lücke und ohne Überschneidung.
13. Export und anschließender Import in eine leere Installation ergeben denselben Datenstand.

## Annahmen und offene Punkte

Die folgenden Werte sind Annahmen dieses Entwurfs und noch nicht ausdrücklich entschieden.

| Punkt | Annahme |
| --- | --- |
| Name | Arbeitstitel „Umbau-Planer“, technische Kennung `umbau_planer` |
| Prioritätsstufen | 5 Stufen als Ausgangswert |
| Sichtbarkeit der Wertungen | Beide Personen sehen jederzeit beide Wertungen |
| Schwelle „uneinig“ | Abstand von mindestens 2 Stufen |
| Kleinste Teilgröße beim Nachrücken | 30 Minuten |
| Schwelle lange laufende Uhr | 5 Stunden |
| Einplanen | Nur Aufgaben ohne Unteraufgaben |
| Datenablage | Speicher von Home Assistant mit Export und Import, keine frei liegende Datei |
| Gewerke | Frei änderbare Liste, eine Aufgabe hat höchstens ein Gewerk |

Offen:

- Soll die bewertende Person Aufgaben auch anlegen dürfen, oder bleibt sie auf das Bewerten beschränkt?
- Sollen erledigte Projekte archiviert werden können, damit sie aus den Listen verschwinden und in der Auswertung bleiben?
