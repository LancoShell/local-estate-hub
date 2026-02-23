import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Manutenzione, StatoManutenzione } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const statiMan: StatoManutenzione[] = ['aperta', 'in_corso', 'completata'];
const statoBadge: Record<StatoManutenzione, string> = {
  aperta: 'bg-destructive/10 text-destructive border-destructive/20',
  in_corso: 'bg-warning/10 text-warning border-warning/20',
  completata: 'bg-success/10 text-success border-success/20',
};

const emptyForm = { immobileId: '', descrizione: '', tecnico: '', costo: 0, stato: 'aperta' as StatoManutenzione, dataSegnalazione: new Date().toISOString().slice(0, 10), dataCompletamento: '', note: '' };

export default function ManutenzioniPage() {
  const { data, addManutenzione, updateManutenzione, deleteManutenzione } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const handleSave = () => {
    if (!form.immobileId || !form.descrizione) { toast.error('Campi obbligatori mancanti'); return; }
    if (editing) { updateManutenzione(editing, form); toast.success('Aggiornata'); }
    else { addManutenzione(form); toast.success('Segnalazione creata'); }
    setForm(emptyForm); setEditing(null); setOpen(false);
  };

  const handleEdit = (m: Manutenzione) => {
    setForm({ immobileId: m.immobileId, descrizione: m.descrizione, tecnico: m.tecnico, costo: m.costo, stato: m.stato, dataSegnalazione: m.dataSegnalazione, dataCompletamento: m.dataCompletamento, note: m.note });
    setEditing(m.id); setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Manutenzioni</h1>
          <p className="text-sm text-muted-foreground mt-1">{data.manutenzioni.filter(m => m.stato !== 'completata').length} attive</p>
        </div>
        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nuova Segnalazione</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">{editing ? 'Modifica' : 'Nuova'} Manutenzione</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="col-span-2"><Label>Immobile *</Label>
                <Select value={form.immobileId} onValueChange={v => setForm({...form, immobileId: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>{data.immobili.map(i => <SelectItem key={i.id} value={i.id}>{i.codice} - {i.indirizzo}</SelectItem>)}</SelectContent>
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
              <div><Label>Data Segnalazione</Label><Input type="date" value={form.dataSegnalazione} onChange={e => setForm({...form, dataSegnalazione: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
              <Button onClick={handleSave}>Salva</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {data.manutenzioni.length === 0 ? (
        <Card className="glass-card"><CardContent className="p-12 text-center text-muted-foreground">Nessuna manutenzione</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {data.manutenzioni.map(m => {
            const imm = data.immobili.find(i => i.id === m.immobileId);
            return (
              <Card key={m.id} className="glass-card hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 items-center">
                    <div>
                      <p className="font-display font-semibold text-sm">{imm?.codice || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{imm?.indirizzo}</p>
                    </div>
                    <p className="text-sm">{m.descrizione}</p>
                    <div>
                      <p className="text-sm">{m.tecnico || '—'}</p>
                      <p className="text-xs text-muted-foreground">€{m.costo.toLocaleString('it-IT')}</p>
                    </div>
                    <Badge variant="outline" className={statoBadge[m.stato]}>{m.stato.replace('_', ' ')}</Badge>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { deleteManutenzione(m.id); toast.success('Eliminata'); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
