import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Manutenzione, StatoManutenzione, TipologiaManutenzione, PeriodicitaManutenzione } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Zap, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const statiMan: StatoManutenzione[] = ['aperta', 'in_corso', 'completata'];
const tipologieMan: TipologiaManutenzione[] = ['caldaia', 'filtri', 'caditoie', 'serramenti', 'siliconature', 'bascula', 'altro'];
const periodicitaMan: PeriodicitaManutenzione[] = ['annuale', 'triennale', 'una_tantum'];

const statoBadge: Record<StatoManutenzione, string> = {
  aperta: 'bg-destructive/10 text-destructive border-destructive/20',
  in_corso: 'bg-warning/10 text-warning border-warning/20',
  completata: 'bg-success/10 text-success border-success/20',
};

const tipoBadgeColor: Record<TipologiaManutenzione, string> = {
  caldaia: 'bg-orange-500/10 text-orange-600',
  filtri: 'bg-blue-500/10 text-blue-600',
  caditoie: 'bg-cyan-500/10 text-cyan-600',
  serramenti: 'bg-purple-500/10 text-purple-600',
  siliconature: 'bg-indigo-500/10 text-indigo-600',
  bascula: 'bg-pink-500/10 text-pink-600',
  altro: 'bg-muted/40 text-muted-foreground',
};

const emptyForm = {
  immobileId: '', descrizione: '', tipologia: 'altro' as TipologiaManutenzione,
  periodicita: 'una_tantum' as PeriodicitaManutenzione, isAutomatica: false,
  tecnico: '', costo: 0, stato: 'aperta' as StatoManutenzione,
  dataSegnalazione: new Date().toISOString().slice(0, 10), dataScadenza: '', dataCompletamento: '', note: '',
};

export default function ManutenzioniPage() {
  const { data, addManutenzione, updateManutenzione, deleteManutenzione, generaManutenzioniAutomatiche } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filtroImmobile, setFiltroImmobile] = useState('tutti');
  const [filtroTipologia, setFiltroTipologia] = useState('tutti');
  const [filtroStato, setFiltroStato] = useState('tutti');

  const filtered = data.manutenzioni.filter(m => {
    const matchImm = filtroImmobile === 'tutti' || m.immobileId === filtroImmobile;
    const matchTip = filtroTipologia === 'tutti' || m.tipologia === filtroTipologia;
    const matchStato = filtroStato === 'tutti' || m.stato === filtroStato;
    return matchImm && matchTip && matchStato;
  });

  const handleSave = () => {
    if (!form.immobileId || !form.descrizione) { toast.error('Campi obbligatori mancanti'); return; }
    if (editing) { updateManutenzione(editing, form); toast.success('Aggiornata'); }
    else { addManutenzione(form); toast.success('Segnalazione creata'); }
    setForm(emptyForm); setEditing(null); setOpen(false);
  };

  const handleEdit = (m: Manutenzione) => {
    setForm({
      immobileId: m.immobileId, descrizione: m.descrizione,
      tipologia: m.tipologia || 'altro', periodicita: m.periodicita || 'una_tantum',
      isAutomatica: m.isAutomatica || false,
      tecnico: m.tecnico, costo: m.costo, stato: m.stato,
      dataSegnalazione: m.dataSegnalazione, dataScadenza: m.dataScadenza || '',
      dataCompletamento: m.dataCompletamento, note: m.note,
    });
    setEditing(m.id); setOpen(true);
  };

  const scadute = data.manutenzioni.filter(m => {
    if (m.stato === 'completata' || !m.dataScadenza) return false;
    return new Date(m.dataScadenza) < new Date();
  }).length;

  const costoTotale = data.manutenzioni.filter(m => m.stato === 'completata').reduce((s, m) => s + m.costo, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Manutenzioni</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.manutenzioni.filter(m => m.stato !== 'completata').length} attive
            {scadute > 0 && <span className="text-destructive ml-2">· {scadute} scadute</span>}
            · Costi completate: €{costoTotale.toLocaleString('it-IT')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const n = generaManutenzioniAutomatiche();
            toast.success(n > 0 ? `${n} manutenzioni programmate automaticamente` : 'Nessuna nuova manutenzione da programmare');
          }}>
            <Zap className="w-4 h-4 mr-2" />Genera Auto
          </Button>
          <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nuova Segnalazione</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-display">{editing ? 'Modifica' : 'Nuova'} Manutenzione</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="col-span-2"><Label>Immobile *</Label>
                  <Select value={form.immobileId} onValueChange={v => setForm({...form, immobileId: v})}>
                    <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                    <SelectContent>{data.immobili.map(i => <SelectItem key={i.id} value={i.id}>{i.codice} - {i.indirizzo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Tipologia</Label>
                  <Select value={form.tipologia} onValueChange={v => {
                    const tip = v as TipologiaManutenzione;
                    const per: PeriodicitaManutenzione = ['serramenti','siliconature','bascula'].includes(tip) ? 'triennale' : tip === 'altro' ? 'una_tantum' : 'annuale';
                    setForm({...form, tipologia: tip, periodicita: per});
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tipologieMan.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Periodicità</Label>
                  <Select value={form.periodicita} onValueChange={v => setForm({...form, periodicita: v as PeriodicitaManutenzione})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{periodicitaMan.map(p => <SelectItem key={p} value={p} className="capitalize">{p.replace('_', ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Descrizione *</Label><Textarea value={form.descrizione} onChange={e => setForm({...form, descrizione: e.target.value})} /></div>
                <div><Label>Tecnico</Label><Input value={form.tecnico} onChange={e => setForm({...form, tecnico: e.target.value})} /></div>
                <div><Label>Costo €</Label><Input type="number" value={form.costo} onChange={e => setForm({...form, costo: +e.target.value})} /></div>
                <div><Label>Stato</Label>
                  <Select value={form.stato} onValueChange={v => setForm({...form, stato: v as StatoManutenzione})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statiMan.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data Scadenza</Label><Input type="date" value={form.dataScadenza} onChange={e => setForm({...form, dataScadenza: e.target.value})} /></div>
                <div><Label>Data Segnalazione</Label><Input type="date" value={form.dataSegnalazione} onChange={e => setForm({...form, dataSegnalazione: e.target.value})} /></div>
                {form.stato === 'completata' && (
                  <div><Label>Data Completamento</Label><Input type="date" value={form.dataCompletamento} onChange={e => setForm({...form, dataCompletamento: e.target.value})} /></div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
                <Button onClick={handleSave}>Salva</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtri */}
      <div className="grid grid-cols-3 gap-3">
        <Select value={filtroImmobile} onValueChange={setFiltroImmobile}>
          <SelectTrigger><SelectValue placeholder="Tutti gli immobili" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli immobili</SelectItem>
            {data.immobili.map(i => <SelectItem key={i.id} value={i.id}>{i.codice}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroTipologia} onValueChange={setFiltroTipologia}>
          <SelectTrigger><SelectValue placeholder="Tutte le tipologie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutte le tipologie</SelectItem>
            {tipologieMan.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroStato} onValueChange={setFiltroStato}>
          <SelectTrigger><SelectValue placeholder="Tutti gli stati" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            {statiMan.map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="glass-card"><CardContent className="p-12 text-center text-muted-foreground">Nessuna manutenzione trovata</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.sort((a, b) => {
            // Prima le scadute, poi per data scadenza
            const aScad = a.dataScadenza && new Date(a.dataScadenza) < new Date() && a.stato !== 'completata';
            const bScad = b.dataScadenza && new Date(b.dataScadenza) < new Date() && b.stato !== 'completata';
            if (aScad && !bScad) return -1;
            if (!aScad && bScad) return 1;
            return (a.dataScadenza || '').localeCompare(b.dataScadenza || '');
          }).map(m => {
            const imm = data.immobili.find(i => i.id === m.immobileId);
            const isScaduta = m.dataScadenza && new Date(m.dataScadenza) < new Date() && m.stato !== 'completata';
            const giorniAllaScadenza = m.dataScadenza && m.stato !== 'completata'
              ? Math.ceil((new Date(m.dataScadenza).getTime() - Date.now()) / 86400000)
              : null;
            return (
              <Card key={m.id} className={`glass-card hover:shadow-md transition-shadow ${isScaduta ? 'border-destructive/30' : ''}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
                    <div>
                      <p className="font-display font-semibold text-sm">{imm?.codice || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{imm?.indirizzo}</p>
                    </div>
                    <div>
                      <Badge variant="outline" className={`text-xs ${tipoBadgeColor[m.tipologia || 'altro']}`}>{m.tipologia || 'altro'}</Badge>
                      {m.isAutomatica && <Badge variant="outline" className="text-xs ml-1">Auto</Badge>}
                      <p className="text-sm mt-0.5">{m.descrizione}</p>
                    </div>
                    <div>
                      <p className="text-sm">{m.tecnico || '—'}</p>
                      {m.costo > 0 && <p className="text-xs text-muted-foreground">€{m.costo.toLocaleString('it-IT')}</p>}
                    </div>
                    <div>
                      {m.dataScadenza && (
                        <p className={`text-xs ${isScaduta ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          {isScaduta ? <><AlertTriangle className="w-3 h-3 inline mr-1" />Scaduta {Math.abs(giorniAllaScadenza!)}gg fa</> : `Scade in ${giorniAllaScadenza}gg`}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground capitalize">{m.periodicita?.replace('_', ' ')}</p>
                    </div>
                    <Badge variant="outline" className={statoBadge[m.stato]}>{m.stato.replace('_', ' ')}</Badge>
                  </div>
                  <div className="flex gap-1 ml-4">
                    {m.stato !== 'completata' && (
                      <Button variant="outline" size="sm" onClick={() => {
                        updateManutenzione(m.id, { stato: 'completata', dataCompletamento: new Date().toISOString().slice(0, 10) });
                        toast.success('Manutenzione completata' + (m.isAutomatica ? '. Prossima programmata.' : ''));
                      }}>✓</Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { deleteManutenzione(m.id); toast.success('Eliminata'); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
