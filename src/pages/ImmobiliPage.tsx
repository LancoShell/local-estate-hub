import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Immobile, StatoImmobile, TipologiaImmobile, ClasseEnergetica } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const tipologie: TipologiaImmobile[] = ['appartamento', 'villa', 'ufficio', 'negozio', 'magazzino', 'box', 'altro'];
const classiEnergetiche: ClasseEnergetica[] = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'];
const stati: StatoImmobile[] = ['libero', 'affittato', 'manutenzione'];

const statoBadge: Record<StatoImmobile, string> = {
  libero: 'bg-success/10 text-success border-success/20',
  affittato: 'bg-info/10 text-info border-info/20',
  manutenzione: 'bg-warning/10 text-warning border-warning/20',
};

const emptyForm = {
  codice: '', tipologia: 'appartamento' as TipologiaImmobile, indirizzo: '', citta: '', cap: '',
  mq: 0, vani: 0, stato: 'libero' as StatoImmobile, classeEnergetica: 'G' as ClasseEnergetica,
  datiCatastali: '', prezzoRichiesto: 0, speseCondominiali: 0, note: '', proprietarioId: '',
};

export default function ImmobiliPage() {
  const { data, addImmobile, updateImmobile, deleteImmobile } = useData();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = data.immobili.filter(i =>
    `${i.codice} ${i.indirizzo} ${i.citta} ${i.tipologia}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!form.codice || !form.indirizzo) {
      toast.error('Codice e indirizzo sono obbligatori');
      return;
    }
    if (editing) {
      updateImmobile(editing, form);
      toast.success('Immobile aggiornato');
    } else {
      addImmobile(form);
      toast.success('Immobile aggiunto');
    }
    setForm(emptyForm);
    setEditing(null);
    setOpen(false);
  };

  const handleEdit = (imm: Immobile) => {
    setForm({
      codice: imm.codice, tipologia: imm.tipologia, indirizzo: imm.indirizzo, citta: imm.citta,
      cap: imm.cap, mq: imm.mq, vani: imm.vani, stato: imm.stato, classeEnergetica: imm.classeEnergetica,
      datiCatastali: imm.datiCatastali, prezzoRichiesto: imm.prezzoRichiesto,
      speseCondominiali: imm.speseCondominiali, note: imm.note, proprietarioId: imm.proprietarioId,
    });
    setEditing(imm.id);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteImmobile(id);
    toast.success('Immobile eliminato');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Immobili</h1>
          <p className="text-sm text-muted-foreground mt-1">{data.immobili.length} immobili registrati</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nuovo Immobile</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? 'Modifica Immobile' : 'Nuovo Immobile'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div><Label>Codice *</Label><Input value={form.codice} onChange={e => setForm({...form, codice: e.target.value})} /></div>
              <div><Label>Tipologia</Label>
                <Select value={form.tipologia} onValueChange={v => setForm({...form, tipologia: v as TipologiaImmobile})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tipologie.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Indirizzo *</Label><Input value={form.indirizzo} onChange={e => setForm({...form, indirizzo: e.target.value})} /></div>
              <div><Label>Città</Label><Input value={form.citta} onChange={e => setForm({...form, citta: e.target.value})} /></div>
              <div><Label>CAP</Label><Input value={form.cap} onChange={e => setForm({...form, cap: e.target.value})} /></div>
              <div><Label>Mq</Label><Input type="number" value={form.mq} onChange={e => setForm({...form, mq: +e.target.value})} /></div>
              <div><Label>Vani</Label><Input type="number" value={form.vani} onChange={e => setForm({...form, vani: +e.target.value})} /></div>
              <div><Label>Stato</Label>
                <Select value={form.stato} onValueChange={v => setForm({...form, stato: v as StatoImmobile})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{stati.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Classe Energetica</Label>
                <Select value={form.classeEnergetica} onValueChange={v => setForm({...form, classeEnergetica: v as ClasseEnergetica})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{classiEnergetiche.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Prezzo Richiesto €</Label><Input type="number" value={form.prezzoRichiesto} onChange={e => setForm({...form, prezzoRichiesto: +e.target.value})} /></div>
              <div><Label>Spese Condominiali €</Label><Input type="number" value={form.speseCondominiali} onChange={e => setForm({...form, speseCondominiali: +e.target.value})} /></div>
              <div className="col-span-2"><Label>Dati Catastali</Label><Input value={form.datiCatastali} onChange={e => setForm({...form, datiCatastali: e.target.value})} /></div>
              <div><Label>Proprietario</Label>
                <Select value={form.proprietarioId} onValueChange={v => setForm({...form, proprietarioId: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>{data.proprietari.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} {p.cognome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Note</Label><Input value={form.note} onChange={e => setForm({...form, note: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); setForm(emptyForm); }}>Annulla</Button>
              <Button onClick={handleSave}>{editing ? 'Aggiorna' : 'Salva'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Cerca immobili..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Card className="glass-card"><CardContent className="p-12 text-center text-muted-foreground">Nessun immobile trovato</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(imm => (
            <Card key={imm.id} className="glass-card hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                  <div>
                    <p className="font-display font-semibold text-sm">{imm.codice}</p>
                    <p className="text-xs text-muted-foreground capitalize">{imm.tipologia}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm">{imm.indirizzo}</p>
                    <p className="text-xs text-muted-foreground">{imm.citta} {imm.cap}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">€{imm.prezzoRichiesto.toLocaleString('it-IT')}/mese</p>
                    <p className="text-xs text-muted-foreground">{imm.mq} mq · {imm.vani} vani</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statoBadge[imm.stato]}>{imm.stato}</Badge>
                    <Badge variant="outline" className="text-xs">{imm.classeEnergetica}</Badge>
                  </div>
                </div>
                <div className="flex gap-1 ml-4">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(imm)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(imm.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
