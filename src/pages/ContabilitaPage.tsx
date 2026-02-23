import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Pagamento, StatoPagamento } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const statiPag: StatoPagamento[] = ['pagato', 'parziale', 'insoluto'];
const statoBadge: Record<StatoPagamento, string> = {
  pagato: 'bg-success/10 text-success border-success/20',
  parziale: 'bg-warning/10 text-warning border-warning/20',
  insoluto: 'bg-destructive/10 text-destructive border-destructive/20',
};

const emptyForm = { contrattoId: '', importo: 0, importoDovuto: 0, dataPagamento: '', dataScadenza: '', stato: 'pagato' as StatoPagamento, mora: 0, note: '' };

export default function ContabilitaPage() {
  const { data, addPagamento, deletePagamento } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const totaleEntrate = data.pagamenti.filter(p => p.stato === 'pagato').reduce((s, p) => s + p.importo, 0);
  const totaleInsoluti = data.pagamenti.filter(p => p.stato === 'insoluto').reduce((s, p) => s + p.importoDovuto, 0);
  const totaleMora = data.pagamenti.reduce((s, p) => s + p.mora, 0);

  const handleSave = () => {
    if (!form.contrattoId || !form.dataScadenza) { toast.error('Campi obbligatori mancanti'); return; }
    // Calcola mora se in ritardo
    let mora = 0;
    if (form.stato === 'insoluto' && form.dataScadenza) {
      const diffDays = Math.max(0, Math.floor((Date.now() - new Date(form.dataScadenza).getTime()) / 86400000));
      mora = Math.round(form.importoDovuto * 0.02 * (diffDays / 30)); // 2% mensile
    }
    addPagamento({ ...form, mora });
    toast.success('Pagamento registrato');
    setForm(emptyForm); setOpen(false);
  };

  const getContratto = (id: string) => {
    const c = data.contratti.find(c => c.id === id);
    if (!c) return 'N/A';
    const imm = data.immobili.find(i => i.id === c.immobileId);
    return imm?.codice || 'N/A';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Contabilità</h1>
        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setForm(emptyForm); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Registra Pagamento</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Nuovo Pagamento</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="col-span-2"><Label>Contratto *</Label>
                <Select value={form.contrattoId} onValueChange={v => setForm({...form, contrattoId: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>{data.contratti.map(c => {
                    const imm = data.immobili.find(i => i.id === c.immobileId);
                    return <SelectItem key={c.id} value={c.id}>{imm?.codice} - €{c.canone}/mese</SelectItem>;
                  })}</SelectContent>
                </Select>
              </div>
              <div><Label>Importo Dovuto €</Label><Input type="number" value={form.importoDovuto} onChange={e => setForm({...form, importoDovuto: +e.target.value})} /></div>
              <div><Label>Importo Pagato €</Label><Input type="number" value={form.importo} onChange={e => setForm({...form, importo: +e.target.value})} /></div>
              <div><Label>Data Scadenza *</Label><Input type="date" value={form.dataScadenza} onChange={e => setForm({...form, dataScadenza: e.target.value})} /></div>
              <div><Label>Data Pagamento</Label><Input type="date" value={form.dataPagamento} onChange={e => setForm({...form, dataPagamento: e.target.value})} /></div>
              <div><Label>Stato</Label>
                <Select value={form.stato} onValueChange={v => setForm({...form, stato: v as StatoPagamento})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statiPag.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
              <Button onClick={handleSave}>Registra</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Entrate</p><p className="text-2xl font-display font-bold text-success mt-1">€{totaleEntrate.toLocaleString('it-IT')}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Insoluti</p><p className="text-2xl font-display font-bold text-destructive mt-1">€{totaleInsoluti.toLocaleString('it-IT')}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Mora Totale</p><p className="text-2xl font-display font-bold text-warning mt-1">€{totaleMora.toLocaleString('it-IT')}</p></CardContent></Card>
      </div>

      {data.pagamenti.length === 0 ? (
        <Card className="glass-card"><CardContent className="p-12 text-center text-muted-foreground">Nessun pagamento registrato</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {data.pagamenti.map(p => (
            <Card key={p.id} className="glass-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
                  <p className="font-display font-semibold text-sm">{getContratto(p.contrattoId)}</p>
                  <p className="text-sm">€{p.importo.toLocaleString('it-IT')} / €{p.importoDovuto.toLocaleString('it-IT')}</p>
                  <p className="text-xs text-muted-foreground">Scad: {p.dataScadenza}</p>
                  {p.mora > 0 && <p className="text-xs text-destructive">Mora: €{p.mora}</p>}
                  <Badge variant="outline" className={statoBadge[p.stato]}>{p.stato}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { deletePagamento(p.id); toast.success('Eliminato'); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
