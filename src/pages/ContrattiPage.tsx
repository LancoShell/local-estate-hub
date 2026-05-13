import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Contratto, StatoContratto, TipoCedolare, TipoDeposito } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const statiContratto: StatoContratto[] = ['attivo', 'scaduto', 'disdetto'];

const statoBadge: Record<StatoContratto, string> = {
  attivo: 'bg-success/10 text-success border-success/20',
  scaduto: 'bg-warning/10 text-warning border-warning/20',
  disdetto: 'bg-destructive/10 text-destructive border-destructive/20',
};

const emptyForm = {
  immobileId: '', inquilinoId: '', proprietarioId: '', dataInizio: '', dataFine: '',
  canone: 0, deposito: 0, tipoDeposito: 'cauzionale' as TipoDeposito, fidejussione: 0,
  stato: 'attivo' as StatoContratto, tipoCedolare: 'ordinario' as TipoCedolare,
  aliquotaCedolare: 21, adeguamentoIstat: 0, pagamentiAutomatici: false, note: '',
};

const labelCedolare: Record<TipoCedolare, string> = {
  cedolare_secca: 'Cedolare Secca 21%',
  cedolare_concordato: 'Cedolare Concordato 10%',
  adeguamento_istat: 'Adeguamento ISTAT',
  ordinario: 'Ordinario IRPEF',
};

const labelDeposito: Record<TipoDeposito, string> = {
  cauzionale: 'Deposito Cauzionale',
  fidejussione_danni: 'Fidejussione Danni',
  fidejussione_affitto: 'Fidejussione Affitto',
  nessuno: 'Nessuno',
};

export default function ContrattiPage() {
  const { data, addContratto, updateContratto, deleteContratto, generaPagamentiContratto } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const getImmobile = (id: string) => data.immobili.find(i => i.id === id);
  const getInquilino = (id: string) => data.inquilini.find(i => i.id === id);
  const getProprietario = (id: string) => data.proprietari.find(p => p.id === id);

  // Se inquilino selezionato è azienda, forza adeguamento ISTAT
  useEffect(() => {
    if (form.inquilinoId) {
      const inq = data.inquilini.find(i => i.id === form.inquilinoId);
      if (inq?.tipoSoggetto === 'azienda' && form.tipoCedolare !== 'adeguamento_istat') {
        setForm(f => ({ ...f, tipoCedolare: 'adeguamento_istat', adeguamentoIstat: f.adeguamentoIstat || 75 }));
      }
    }
  }, [form.inquilinoId]);

  // Auto-fill proprietario da immobile
  useEffect(() => {
    if (form.immobileId && !form.proprietarioId) {
      const imm = data.immobili.find(i => i.id === form.immobileId);
      if (imm?.proprietarioId) setForm(f => ({ ...f, proprietarioId: imm.proprietarioId }));
    }
  }, [form.immobileId]);

  const handleSave = () => {
    if (!form.immobileId || !form.inquilinoId || !form.dataInizio) {
      toast.error('Immobile, inquilino e data inizio sono obbligatori'); return;
    }
    if (editing) {
      updateContratto(editing, form);
      toast.success('Contratto aggiornato');
    } else {
      addContratto(form);
      toast.success('Contratto creato');
    }
    setForm(emptyForm); setEditing(null); setOpen(false);
  };

  const handleEdit = (c: Contratto) => {
    setForm({
      immobileId: c.immobileId, inquilinoId: c.inquilinoId, proprietarioId: c.proprietarioId,
      dataInizio: c.dataInizio, dataFine: c.dataFine, canone: c.canone, deposito: c.deposito,
      tipoDeposito: c.tipoDeposito || 'cauzionale', fidejussione: c.fidejussione || 0,
      stato: c.stato, tipoCedolare: c.tipoCedolare || 'ordinario',
      aliquotaCedolare: c.aliquotaCedolare || 21, adeguamentoIstat: c.adeguamentoIstat || 0,
      pagamentiAutomatici: c.pagamentiAutomatici || false, note: c.note,
    });
    setEditing(c.id); setOpen(true);
  };

  const stimaImposta = (canone: number, tipoCedolare: TipoCedolare, aliquota: number): number => {
    const annuo = canone * 12;
    switch (tipoCedolare) {
      case 'cedolare_secca': return annuo * 0.21;
      case 'cedolare_concordato': return annuo * 0.10;
      case 'adeguamento_istat': return annuo * 0.21; // stima base
      default: return annuo * 0.30; // IRPEF stima media
    }
  };

  const isAziendaInquilino = (inquilinoId: string) => {
    return data.inquilini.find(i => i.id === inquilinoId)?.tipoSoggetto === 'azienda';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Contratti</h1>
          <p className="text-sm text-muted-foreground mt-1">{data.contratti.length} contratti · {data.contratti.filter(c => c.stato === 'attivo').length} attivi</p>
        </div>
        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nuovo Contratto</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">{editing ? 'Modifica' : 'Nuovo'} Contratto</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {/* Parti */}
              <div><Label>Immobile *</Label>
                <Select value={form.immobileId} onValueChange={v => setForm({...form, immobileId: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>{data.immobili.map(i => <SelectItem key={i.id} value={i.id}>{i.codice} - {i.indirizzo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Inquilino *</Label>
                <Select value={form.inquilinoId} onValueChange={v => setForm({...form, inquilinoId: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>{data.inquilini.map(i => {
                    const nome = i.tipoSoggetto === 'azienda' ? i.ragioneSociale : `${i.nome} ${i.cognome}`;
                    return <SelectItem key={i.id} value={i.id}>{nome}{i.tipoSoggetto === 'azienda' ? ' (Azienda)' : ''}</SelectItem>;
                  })}</SelectContent>
                </Select>
              </div>
              <div><Label>Proprietario</Label>
                <Select value={form.proprietarioId} onValueChange={v => setForm({...form, proprietarioId: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>{data.proprietari.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} {p.cognome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Stato</Label>
                <Select value={form.stato} onValueChange={v => setForm({...form, stato: v as StatoContratto})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statiContratto.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Date e canone */}
              <div><Label>Data Inizio *</Label><Input type="date" value={form.dataInizio} onChange={e => setForm({...form, dataInizio: e.target.value})} /></div>
              <div><Label>Data Fine</Label><Input type="date" value={form.dataFine} onChange={e => setForm({...form, dataFine: e.target.value})} /></div>
              <div><Label>Canone Mensile €</Label><Input type="number" value={form.canone} onChange={e => setForm({...form, canone: +e.target.value})} /></div>

              {/* Regime fiscale */}
              <div><Label>Regime Fiscale</Label>
                <Select value={form.tipoCedolare} onValueChange={v => setForm({...form, tipoCedolare: v as TipoCedolare})} disabled={isAziendaInquilino(form.inquilinoId)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cedolare_secca">Cedolare Secca 21%</SelectItem>
                    <SelectItem value="cedolare_concordato">Cedolare Concordato 10%</SelectItem>
                    <SelectItem value="adeguamento_istat">Adeguamento ISTAT</SelectItem>
                    <SelectItem value="ordinario">Ordinario IRPEF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(form.tipoCedolare === 'adeguamento_istat') && (
                <div><Label>Adeguamento ISTAT % (es. 75)</Label><Input type="number" step="0.1" value={form.adeguamentoIstat} onChange={e => setForm({...form, adeguamentoIstat: +e.target.value})} /></div>
              )}

              {/* Deposito */}
              <div><Label>Tipo Garanzia</Label>
                <Select value={form.tipoDeposito} onValueChange={v => setForm({...form, tipoDeposito: v as TipoDeposito})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cauzionale">Deposito Cauzionale</SelectItem>
                    <SelectItem value="fidejussione_danni">Fidejussione per Danni</SelectItem>
                    <SelectItem value="fidejussione_affitto">Fidejussione per Affitto</SelectItem>
                    <SelectItem value="nessuno">Nessuno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.tipoDeposito !== 'nessuno' && (
                <div><Label>Importo Deposito/Fidejussione €</Label><Input type="number" value={form.deposito} onChange={e => setForm({...form, deposito: +e.target.value})} /></div>
              )}
              {(form.tipoDeposito === 'fidejussione_affitto') && (
                <div><Label>Fidejussione Affitto € (garanzia)</Label><Input type="number" value={form.fidejussione} onChange={e => setForm({...form, fidejussione: +e.target.value})} /></div>
              )}

              {/* Pagamenti automatici */}
              <div className="col-span-2 flex items-center gap-2 p-3 bg-muted/20 rounded-md">
                <input type="checkbox" id="pagAuto" checked={form.pagamentiAutomatici} onChange={e => setForm({...form, pagamentiAutomatici: e.target.checked})} className="w-4 h-4" />
                <label htmlFor="pagAuto" className="text-sm cursor-pointer">
                  <span className="font-medium">Genera pagamenti mensili automaticamente</span>
                  <span className="block text-xs text-muted-foreground">Crea scadenze mensili che diventano insolute se non pagate entro la data</span>
                </label>
              </div>

              {/* Stima fiscale */}
              {form.canone > 0 && (
                <div className="col-span-2 p-3 bg-muted/20 rounded-md text-sm space-y-1">
                  <p className="font-medium">Stima fiscale annua:</p>
                  <p>Canone annuo: <strong>€{(form.canone * 12).toLocaleString('it-IT')}</strong></p>
                  <p>Imposta stimata ({labelCedolare[form.tipoCedolare]}): <strong className="text-destructive">€{stimaImposta(form.canone, form.tipoCedolare, form.aliquotaCedolare).toLocaleString('it-IT', { maximumFractionDigits: 0 })}</strong></p>
                  <p>Netto stimato: <strong className="text-success">€{(form.canone * 12 - stimaImposta(form.canone, form.tipoCedolare, form.aliquotaCedolare)).toLocaleString('it-IT', { maximumFractionDigits: 0 })}</strong></p>
                </div>
              )}

              {isAziendaInquilino(form.inquilinoId) && (
                <div className="col-span-2 text-xs text-muted-foreground p-2 bg-muted/20 rounded">
                  Inquilino azienda: regime fiscale impostato automaticamente su Adeguamento ISTAT (75% della variazione annua ISTAT).
                </div>
              )}
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
            const prop = getProprietario(c.proprietarioId);
            const isAzienda = inq?.tipoSoggetto === 'azienda';
            const nomeInq = isAzienda ? inq?.ragioneSociale : (inq ? `${inq.nome} ${inq.cognome}` : 'N/A');
            const canoneAdeguato = c.canone * (1 + (c.adeguamentoIstat || 0) / 100);
            const pagamentiContratto = data.pagamenti.filter(p => p.contrattoId === c.id);
            const insoluti = pagamentiContratto.filter(p => p.stato === 'insoluto').length;
            return (
              <Card key={c.id} className="glass-card hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3 items-start">
                      <div>
                        <p className="font-display font-semibold text-sm">{imm?.codice || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{imm?.indirizzo}</p>
                      </div>
                      <div>
                        <p className="text-sm">{nomeInq || 'N/A'}</p>
                        {isAzienda && <Badge variant="outline" className="text-xs mt-0.5">Azienda</Badge>}
                        <p className="text-xs text-muted-foreground">{prop ? `${prop.nome} ${prop.cognome}` : ''}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{c.dataInizio} → {c.dataFine || '∞'}</p>
                        <p className="text-sm font-medium">€{canoneAdeguato.toFixed(0)}/mese</p>
                        <p className="text-xs text-muted-foreground">{labelCedolare[c.tipoCedolare || 'ordinario']}</p>
                      </div>
                      <div>
                        {c.tipoDeposito !== 'nessuno' && c.deposito > 0 && (
                          <p className="text-xs text-muted-foreground">{labelDeposito[c.tipoDeposito || 'cauzionale']}: €{c.deposito.toLocaleString('it-IT')}</p>
                        )}
                        {insoluti > 0 && <p className="text-xs text-destructive font-medium">{insoluti} insoluti</p>}
                        {c.pagamentiAutomatici && <p className="text-xs text-info">Pagamenti auto</p>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={`w-fit ${statoBadge[c.stato]}`}>{c.stato}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-4">
                      {c.pagamentiAutomatici && c.stato === 'attivo' && (
                        <Button variant="ghost" size="icon" title="Genera pagamenti mensili" onClick={() => {
                          const n = generaPagamentiContratto(c.id);
                          toast.success(n > 0 ? `${n} pagamenti generati` : 'Nessun nuovo pagamento');
                        }}>
                          <RefreshCw className="w-4 h-4 text-info" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { deleteContratto(c.id); toast.success('Eliminato'); }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
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
