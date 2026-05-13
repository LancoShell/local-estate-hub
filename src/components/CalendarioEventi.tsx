import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalEvent {
  data: string;
  tipo: 'pagamento_scaduto' | 'pagamento_attesa' | 'manutenzione' | 'contratto_scade';
  label: string;
}

const coloreEvento: Record<CalEvent['tipo'], string> = {
  pagamento_scaduto: 'bg-destructive',
  pagamento_attesa: 'bg-warning',
  manutenzione: 'bg-orange-500',
  contratto_scade: 'bg-purple-500',
};

const labelEvento: Record<CalEvent['tipo'], string> = {
  pagamento_scaduto: 'Insoluto',
  pagamento_attesa: 'Scadenza',
  manutenzione: 'Manutenzione',
  contratto_scade: 'Contratto',
};

const GG = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export default function CalendarioEventi() {
  const { data } = useData();
  const today = new Date();
  const [anno, setAnno] = useState(today.getFullYear());
  const [mese, setMese] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Raccoglie tutti gli eventi
  const events: CalEvent[] = [];

  data.pagamenti.forEach(p => {
    if (!p.dataScadenza) return;
    if (p.stato === 'insoluto') {
      events.push({ data: p.dataScadenza, tipo: 'pagamento_scaduto', label: `Insoluto: €${p.importoDovuto}` });
    } else if (p.stato === 'attesa') {
      events.push({ data: p.dataScadenza, tipo: 'pagamento_attesa', label: `Scadenza: €${p.importoDovuto}` });
    }
  });

  data.manutenzioni.forEach(m => {
    if (!m.dataScadenza || m.stato === 'completata') return;
    const imm = data.immobili.find(i => i.id === m.immobileId);
    events.push({ data: m.dataScadenza, tipo: 'manutenzione', label: `${imm?.codice || ''} - ${m.descrizione}` });
  });

  data.contratti.forEach(c => {
    if (!c.dataFine || c.stato !== 'attivo') return;
    events.push({ data: c.dataFine, tipo: 'contratto_scade', label: `Fine contratto: ${data.immobili.find(i => i.id === c.immobileId)?.codice || ''}` });
  });

  // Calcola struttura del mese
  const primoGiorno = new Date(anno, mese, 1);
  const ultimoGiorno = new Date(anno, mese + 1, 0);
  const giorniNelMese = ultimoGiorno.getDate();
  // Giorno della settimana del primo giorno (0=dom → converti a lun=0)
  const offsetInizio = (primoGiorno.getDay() + 6) % 7;

  const prevMese = () => {
    if (mese === 0) { setMese(11); setAnno(a => a - 1); }
    else setMese(m => m - 1);
  };
  const nextMese = () => {
    if (mese === 11) { setMese(0); setAnno(a => a + 1); }
    else setMese(m => m + 1);
  };

  const eventiDelGiorno = (giorno: number): CalEvent[] => {
    const dataStr = `${anno}-${String(mese + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
    return events.filter(e => e.data === dataStr);
  };

  const selectedEvents = selectedDay ? events.filter(e => e.data === selectedDay) : [];

  const nomesMese = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

  const celle: (number | null)[] = [
    ...Array(offsetInizio).fill(null),
    ...Array.from({ length: giorniNelMese }, (_, i) => i + 1),
  ];
  // Completa a multiplo di 7
  while (celle.length % 7 !== 0) celle.push(null);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-display">Calendario Scadenze</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prevMese}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-medium min-w-[130px] text-center">{nomesMese[mese]} {anno}</span>
            <Button variant="ghost" size="icon" onClick={nextMese}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legenda */}
        <div className="flex flex-wrap gap-3 mb-3 text-xs">
          {(Object.keys(coloreEvento) as CalEvent['tipo'][]).map(tipo => (
            <span key={tipo} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${coloreEvento[tipo]}`} />
              {labelEvento[tipo]}
            </span>
          ))}
        </div>

        {/* Griglia giorni settimana */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {GG.map(g => (
            <div key={g} className="text-center text-xs text-muted-foreground font-medium py-1">{g}</div>
          ))}
        </div>

        {/* Griglia giorni */}
        <div className="grid grid-cols-7 gap-1">
          {celle.map((giorno, idx) => {
            if (!giorno) return <div key={idx} />;
            const ev = eventiDelGiorno(giorno);
            const dataStr = `${anno}-${String(mese + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
            const isToday = today.getFullYear() === anno && today.getMonth() === mese && today.getDate() === giorno;
            const isSelected = selectedDay === dataStr;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(isSelected ? null : dataStr)}
                className={`relative flex flex-col items-center p-1 rounded-md text-xs transition-colors min-h-[36px]
                  ${isToday ? 'ring-2 ring-primary' : ''}
                  ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}
                  ${ev.length > 0 ? 'cursor-pointer' : 'cursor-default'}
                `}
              >
                <span className={`font-medium ${isToday ? 'text-primary' : ''}`}>{giorno}</span>
                <div className="flex gap-0.5 flex-wrap justify-center mt-0.5">
                  {ev.slice(0, 3).map((e, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${coloreEvento[e.tipo]}`} />
                  ))}
                  {ev.length > 3 && <span className="text-[9px] text-muted-foreground">+{ev.length - 3}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dettaglio giorno selezionato */}
        {selectedDay && selectedEvents.length > 0 && (
          <div className="mt-3 border-t pt-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {selectedEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-muted/30">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${coloreEvento[ev.tipo]}`} />
                <span>{ev.label}</span>
              </div>
            ))}
          </div>
        )}
        {selectedDay && selectedEvents.length === 0 && (
          <p className="mt-3 text-xs text-muted-foreground text-center pt-3 border-t">Nessun evento in questo giorno</p>
        )}
      </CardContent>
    </Card>
  );
}
