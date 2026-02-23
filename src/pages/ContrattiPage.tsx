import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Contratto, StatoContratto } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const statiContratto: StatoContratto[] = ['attivo', 'scaduto', 'disdetto'];
const statoBadge: Record<StatoContratto, string> = {
  attivo: 'bg-success/10 text-success border-success/20',
  scaduto: 'bg-warning/10 text-warning border-warning/20',
  disdetto: 'bg-destructive/10 text-destructive border-destructive/20',
};

const emptyForm = { immobileId: '', inquilinoId: '', proprietarioId: '', dataInizio: '', dataFine: '', canone: 0, deposito: 0, stato: 'attivo' as StatoContratto, adeguamentoIstat: 0, note: '' };

export default function ContrattiPage() {
  const { data, addContratto, updateContratto, deleteContratto } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const getImmobile = (id: string) => data.immobili.find(i => i.id === id);
  const getInquilino = (id: string) => data.inquilini.find(i => i.id === id);

  const handleSave = () => {
    if (!form.immobileId || !form.inquilinoId || !form.dataInizio) { toast.error('Campi obbligatori mancanti'); return; }
    if (editing) { updateContratto(editing, form); toast.success('Aggiornato'); }
    else { addContratto(form); toast.success('Contratto creato'); }
    setForm(emptyForm); setEditing(null); setOpen(false);
  };

  const handleEdit = (c: Contratto) => {
    setForm({ immobileId: c.immobileId, inquilinoId: c.inquilinoId, proprietarioId: c.proprietarioId, dataInizio: c.dataInizio, dataFine: c.dataFine, canone: c.canone, deposito: c.deposito, stato: c.stato, adeguamentoIstat: c.adeguamentoIstat, note: c.note });
    setEditing(c.id); setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Contratti</h1>
          <p className="text-sm text-muted-foreground mt-1">{data.contratti.length} contratti</p>
        </div>
        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nuovo Contratto</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle className="font-display">{editing ? 'Modifica' : 'Nuovo'} Contratto</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div><Label>Immobile *</Label>
                <Select value={form.immobileId} onValueChange={v => setForm({...form, immobileId: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>{data.immobili.map(i => <SelectItem key={i.id} value={i.id}>{i.codice} - {i.indirizzo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Inquilino *</Label>
                <Select value={form.inquilinoId} onValueChange={v => setForm({...form, inquilinoId: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>{data.inquilini.map(i => <SelectItem key={i.id} value={i.id}>{i.nome} {i.cognome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Data Inizio *</Label><Input type="date" value={form.dataInizio} onChange={e => setForm({...form, dataInizio: e.target.value})} /></div>
              <div><Label>Data Fine</Label><Input type="date" value={form.dataFine} onChange={e => setForm({...form, dataFine: e.target.value})} /></div>
              <div><Label>Canone Mensile €</Label><Input type="number" value={form.canone} onChange={e => setForm({...form, canone: +e.target.value})} /></div>
              <div><Label>Deposito €</Label><Input type="number" value={form.deposito} onChange={e => setForm({...form, deposito: +e.target.value})} /></div>
              <div><Label>Adeguamento ISTAT %</Label><Input type="number" step="0.1" value={form.adeguamentoIstat} onChange={e => setForm({...form, adeguamentoIstat: +e.target.value})} /></div>
              <div><Label>Stato</Label>
                <Select value={form.stato} onValueChange={v => setForm({...form, stato: v as StatoContratto})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statiContratto.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
              <Button onClick={handleSave}>Salva</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {data.contratti.length === 0 ? (
        <Card className="glass-card"><CardContent className="p-12 text-center text-muted-foreground">Nessun contratto</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {data.contratti.map(c => {
            const imm = getImmobile(c.immobileId);
            const inq = getInquilino(c.inquilinoId);
            const canoneAdeguato = c.canone * (1 + c.adeguamentoIstat / 100);
            return (
              <Card key={c.id} className="glass-card hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                    <div>
                      <p className="font-display font-semibold text-sm">{imm?.codice || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{imm?.indirizzo}</p>
                    </div>
                    <div>
                      <p className="text-sm">{inq ? `${inq.nome} ${inq.cognome}` : 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{c.dataInizio} → {c.dataFine || '∞'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">€{canoneAdeguato.toFixed(0)}/mese</p>
                      {c.adeguamentoIstat > 0 && <p className="text-xs text-muted-foreground">ISTAT +{c.adeguamentoIstat}%</p>}
                    </div>
                    <Badge variant="outline" className={`w-fit ${statoBadge[c.stato]}`}>{c.stato}</Badge>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { deleteContratto(c.id); toast.success('Eliminato'); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
