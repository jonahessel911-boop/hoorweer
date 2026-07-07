# Vervolgprompt — Belfunctie (Bel-tab) voor HearDirect

Plak deze prompt in Lovable, Bolt, v0 of Claude Code om de **Bellen-tab** toe te voegen aan de bestaande HearDirect admin (`/admin`).

---

## Context — wat er al bestaat

HearDirect is een React + TypeScript + Vite app met Supabase (localStorage-fallback). Admin heeft tabs: **Leads | Orders | Analytics**. Nederlandse UI, branding **HearDirect**.

Leads hebben al:
- `status`: `nieuw` | `contact_poging` | `afgeboekt_geen_contact` | `test_verzonden` | `test_gestart` | `test_afgerond`
- `contact_pogingen` (0–7)
- `contact_uitkomst`: `terugbellen` | `deal` | `geen_interesse` | null
- Hoortest via `/test/:token` (8 stappen, Web Audio API)
- Lead detail met statuspipeline, Reg Contact-modal, hoortest-voortgang per stap

**Bouw de Belfunctie hierop voort** — hergebruik bestaande types, `updateLead`, realtime subscriptions en leadStatus-logica (`MAX_CONTACT_ATTEMPTS = 7`).

---

## Doel

Een **belwachtrij** waarmee ik leads één voor één afbel, zonder tussen schermen te wisselen. Groot, simpel, snel — ontworpen voor iemand die tegelijk aan het bellen is.

---

## Tab toevoegen

Voeg een vierde admin-tab toe: **Bellen** (`/admin/dashboard/bellen`).

Navigatie: `Leads | Orders | Analytics | Bellen`

---

## Wachtrij-logica

### Wie staat in de wachtrij?

Alle leads die **nog gebeld moeten worden**:
- `status` = `nieuw` OF `contact_poging`
- `contact_uitkomst` = null
- `status` ≠ `afgeboekt_geen_contact`
- `status` ≠ `test_gestart` / `test_afgerond` (tenzij expliciet terugbellen — zie uitzondering hieronder)

**Uitzondering terugbellen:** leads met `contact_uitkomst = 'terugbellen'` en nog geen test verzonden komen óók in de wachtrij (hoge prioriteit, badge "Terugbellen").

### Sortering — speed-to-lead

**Nieuwste lead eerst** (`created_at` DESC).

Komt er tijdens het bellen een nieuwe lead binnen → die komt **vooraan** in de rij en is de volgende na "Volgende". Realtime via bestaande Supabase/localStorage subscription — **geen pagina-refresh nodig**.

### Auto-afboeken na 7 pogingen

- Elke mislukte belpoging telt `contact_pogingen` +1 **als de daglimiet niet bereikt is**
- **Maximaal 2 pogingen per dag per lead tellen mee** richting de 7 totaal (`telt_mee = true` in `call_logs`). Extra pogingen dezelfde dag worden wel gelogd maar tellen niet (`telt_mee = false`) — zo spreid je de 7 pogingen over meerdere dagen
- Bij poging 7 (meetellend) zonder bereik: `status` → `afgeboekt_geen_contact`
- Lead **verdwijnt uit wachtrij**, blijft zichtbaar in Leads-tab met grijze badge **"Geen contact mogelijk"**

---

## Belscherm — één lead tegelijk

### Layout (groot, rustig, één kolom)

```
┌─────────────────────────────────────────────────┐
│  Bellen                    Wachtrij: 12 leads   │
├─────────────────────────────────────────────────┤
│                                                 │
│   [GROTE KAART — huidige lead]                  │
│                                                 │
│   Jan de Vries                                  │
│   📞 06-12345678          [kopieer] [bel]       │
│   ✉ jan@email.nl          [kopieer]             │
│                                                 │
│   Poging 2 van 7  ·  Laatste: 5 jul 14:32      │
│   Status: Contact poging  ·  Hoortest: Niet gestart │
│                                                 │
│   [Notitieveld — optioneel]                     │
│                                                 │
├─────────────────────────────────────────────────┤
│  Uitkomst:                                      │
│  [Geen gehoor]  [Voicemail]                     │
│  [Bereikt — testlink verstuurd]                 │
│  [Bereikt — bel later terug]                    │
│                                                 │
│              [ Volgende → ]                     │
└─────────────────────────────────────────────────┘
```

### Velden met kopieer-knop

Per veld een **kopieer-icoon** → klembord + korte toast **"Gekopieerd!"**:
- Naam
- Telefoonnummer (ook als `tel:`-link — klik = direct bellen op mobiel)
- E-mail (indien aanwezig)
- Testlink (`/test/{token}`) — handig na "testlink verstuurd"

### Zichtbare metadata

- **Poging X van 7**
- **Laatste belpoging** (datum/tijd) — nieuw veld, zie database
- Leadstatus (badge)
- Hoortest-status: Niet gestart | Gestart | Afgerond (uit lead.status + test_results)

---

## Uitkomst-knoppen (na elke poging)

| Knop | Actie |
|------|-------|
| **Geen gehoor** | Als daglimiet OK: `contact_pogingen` +1, `telt_mee=true`. Anders alleen loggen (`telt_mee=false`). Bij 7 meetellend → afgeboekt. |
| **Voicemail ingesproken** | Zelfde daglimiet-regel als Geen gehoor. |
| **Bereikt — testlink verstuurd** | `status` → `test_verzonden`. Poging telt **niet** mee als mislukt. Lead uit wachtrij. Log poging. Toon testlink met kopieer-knop. |
| **Bereikt — bel later terug** | `contact_uitkomst` → `terugbellen`. Poging telt **niet** mee. Lead blijft in wachtrij (lagere prio dan nieuwe leads). Optioneel: datum/tijd terugbellen in notitie. Log poging. |

**Volgende →** slaat geselecteerde uitkomst op en laadt direct de **volgende lead** uit de wachtrij.

**Enter-toets** = zelfde als "Volgende" (als er een uitkomst geselecteerd is).

**Sneltoetsen (optioneel maar gewenst):**
- `1` = Geen gehoor
- `2` = Voicemail
- `3` = Testlink verstuurd
- `4` = Bel later terug
- `Enter` = Volgende

---

## Lege wachtrij

Rustig scherm:
- **"Alle leads gebeld ✓"**
- Teller: **X belpogingen vandaag**
- Link naar Leads-tab

---

## Database-uitbreiding

### Nieuwe tabel: `call_logs`

```sql
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  uitkomst TEXT NOT NULL CHECK (uitkomst IN (
    'geen_gehoor', 'voicemail', 'testlink_verstuurd', 'bel_later_terug'
  )),
  notitie TEXT,
  poging_nummer INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_call_logs_lead_id ON call_logs(lead_id);
```

### Lead-veld toevoegen

```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS laatste_belpoging TIMESTAMPTZ;
```

Bij elke gelogde poging: `laatste_belpoging = now()`.

LocalStorage-fallback: zelfde structuur in `localDb.ts`.

---

## Lead detail — bel-tijdlijn

Op `/admin/leads/:id` een sectie **Belgeschiedenis**:
- Mini-tijdlijn van `call_logs` (tijdstip, uitkomst, notitie, poging #)
- Notities uit belscherm zijn hier terug te zien

---

## Analytics-uitbreiding

Voeg toe aan Analytics-tab:

| KPI | Berekening |
|-----|------------|
| Belpogingen vandaag | `call_logs` waar `created_at` = vandaag |
| Bereikpercentage | bereikt / totaal belpogingen (%) |
| Geen contact mogelijk | aantal leads met `afgeboekt_geen_contact` in periode |
| Gem. pogingen tot bereik | gemiddelde `contact_pogingen` bij bereikte leads |

---

## Technische eisen

- **Realtime:** nieuwe leads verschijnen direct bovenaan wachtrij (bestaande `subscribeToChanges` / `useRealtimeLeads`)
- **Geen dubbele acties:** disable knoppen tijdens opslaan
- **Mobiel-vriendelijk:** grote knoppen, `tel:`-links
- **Nederlandse copy** overal
- **Hergebruik:** `RegContactModal`-logica mag samenvloeien met belscherm of vervangen worden door belscherm als primaire flow
- **Status `afgeboekt_geen_contact`** tonen als **"Geen contact mogelijk"** in UI (Leads-tab grijze badge)

---

## Acceptatiecriteria (checklist)

- [ ] Tab "Bellen" in admin-navigatie
- [ ] Wachtrij toont alleen belbare leads, nieuwste eerst
- [ ] Nieuwe lead tijdens bellen → volgende na "Volgende" is die nieuwe lead
- [ ] Kopieer-knoppen voor naam, telefoon, e-mail, testlink
- [ ] `tel:`-link op telefoonnummer
- [ ] Poging X van 7 zichtbaar
- [ ] 4 uitkomst-knoppen werken correct
- [ ] Na 7 mislukte pogingen → auto "Geen contact mogelijk", uit wachtrij
- [ ] "Bereikt — testlink verstuurd" zet status op `test_verzonden`
- [ ] Enter = Volgende
- [ ] Lege wachtrij toont vriendelijk scherm
- [ ] `call_logs` opgeslagen en zichtbaar op lead detail
- [ ] Analytics toont bel-KPI's
- [ ] Werkt met Supabase én localStorage-demo-modus

---

## Seed-data (voor testen)

Voeg 5 leads toe in verschillende wachtrij-staten:
1. Nieuwe lead (0 pogingen) — moet bovenaan
2. Lead met 3 pogingen — midden in rij
3. Lead met 6 pogingen — bijna afgeboekt
4. Lead terugbellen — in wachtrij met badge
5. Lead afgeboekt — **niet** in wachtrij

---

## Niet in scope (v1)

- E-mailintegratie (testlink kopiëren is genoeg)
- Automatisch bellen via VoIP
- Meerdere agents / wachtrij-toewijzing
- Kalenderintegratie voor terugbel-afspraken

---

## Tip na bouwen

Test de flow handmatig: maak 3 leads aan, bel ze af met "Geen gehoor" tot afboeking, en controleer of Analytics en lead detail de logs correct tonen.
