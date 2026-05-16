import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Pagamento, StatoPagamento, TipoPagamento, SpesaFissa, TipoSpesa, PeriodicitaSpesa } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Pencil, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const statiPag: StatoPagamento[] = ['pagato', 'parziale', 'insoluto', 'attesa'];
const tipiPagamento: TipoPagamento[] = ['canone', 'deposito', 'fidejussione', 'imu', 'tari', 'bolletta', 'condominio', 'manutenzione', 'altro'];
const tipiSpesa: TipoSpesa[] = ['imu', 'tari', 'bolletta', 'condominio', 'bonifica', 'altro'];
const periodicita: PeriodicitaSpesa[] = ['mensile', 'trimestrale', 'semestrale', 'annuale'];

const statoBadge: Record<StatoPagamento, string> = {
  pagato: 'bg-success/10 text-success border-success/20',
  parziale: 'bg-warning/10 text-warning border-warning/20',
  insoluto: 'bg-destructive/10 text-destructive border-destructive/20',
  attesa: 'bg-muted/30 text-muted-foreground border-muted',
};

const emptyPag = {
  contrattoId: '', tipoPagamento: 'canone' as TipoPagamento, importo: 0, importoDovuto: 0,
  dataPagamento: '', dataScadenza: '', stato: 'attesa' as StatoPagamento, isDeposito: false,
  meseRiferimento: '', mora: 0, note: '',
};

const emptySpesa = {
  immobileId: '', tipo: 'imu' as TipoSpesa, descrizione: '', importo: 0,
  periodicita: 'annuale' as PeriodicitaSpesa, dataInizio: '', attiva: true, note: '',
};

const periodicMult = { mensile: 12, trimestrale: 4, semestrale: 2, annuale: 1 };

export default function ContabilitaPage() {
  const { data, addPagamento, updatePagamento, deletePagamento, addSpesaFissa, updateSpesaFissa, deleteSpesaFissa, generaPagamentiContratto } = useData();

  const [openPag, setOpenPag] = useState(false);
  const [formPag, setFormPag] = useState(emptyPag);

  const [openSpesa, setOpenSpesa] = useState(false);
  const [editingSpesa, setEditingSpesa] = useState<string | null>(null);
  const [formSpesa, setFormSpesa] = useState(emptySpesa);

  // Filtri
  const [filtroProprietario, setFiltroProprietario] = useState('tutti');
  const [filtroTipologia, setFiltroTipologia] = useState('tutti');
  const [filtroAnno, setFiltroAnno] = useState(String(new Date().getFullYear()));
  const [filtroTipoPag, setFiltroTipoPag] = useState('tutti');

  // Quando si seleziona un contratto, pre-compila importo dovuto
  const handleContrattoChange = (v: string) => {
    const c = data.contratti.find(x => x.id === v);
    const mese = new Date().toISOString().slice(0, 7);
    setFormPag(prev => ({
      ...prev,
      contrattoId: v,
      importoDovuto: c?.canone ?? 0,
      meseRiferimento: mese,
      isDeposito: ['deposito', 'fidejussione'].includes(prev.tipoPagamento),
    }));
  };

  const handleTipoPagChange = (v: string) => {
    const isDeposito = ['deposito', 'fidejussione'].includes(v);
    setFormPag(prev => ({ ...prev, tipoPagamento: v as TipoPagamento, isDeposito }));
  };

  const handleSavePag = () => {
    if (!form.dataScadenza) { toast.error('Data scadenza obbligatoria'); return; }
    let mora = 0;
    if (formPag.stato === 'insoluto' && formPag.dataScadenza) {
      const diffDays = Math.max(0, Math.floor((Date.now() - new Date(formPag.dataScadenza).getTime()) / 86400000));
      mora = Math.round(formPag.importoDovuto * 0.02 * (diffDays / 30));
    }
    addPagamento({ ...formPag, mora });
    toast.success('Pagamento registrato');
    setFormPag(emptyPag); setOpenPag(false);
  };

  const handleSaveSpesa = () => {
    if (!formSpesa.immobileId || !formSpesa.importo) { toast.error('Immobile e importo obbligatori'); return; }
    if (editingSpesa) { updateSpesaFissa(editingSpesa, formSpesa); toast.success('Aggiornata'); }
    else { addSpesaFissa(formSpesa); toast.success('Spesa aggiunta'); }
    setFormSpesa(emptySpesa); setEditingSpesa(null); setOpenSpesa(false);
  };

  const getContratto = (id: string) => data.contratti.find(c => c.id === id);
  const getImmobile = (id: string) => data.immobili.find(i => i.id === id);
  const getInquilino = (id: string) => data.inquilini.find(i => i.id === id);

  // Pagamenti filtrati (solo canoni/non depositi)
  const pagamentiCanoni = data.pagamenti.filter(p => {
    if (p.isDeposito) return false;
    const c = getContratto(p.contrattoId);
    const imm = c ? getImmobile(c.immobileId) : null;
    const matchProp = filtroProprietario === 'tutti' || imm?.proprietarioId === filtroProprietario;
    const matchTip = filtroTipologia === 'tutti' || imm?.tipologia === filtroTipologia;
    const matchAnno = !filtroAnno || p.dataScadenza?.startsWith(filtroAnno) || p.dataPagamento?.startsWith(filtroAnno);
    const matchTipoPag = filtroTipoPag === 'tutti' || p.tipoPagamento === filtroTipoPag;
    return matchProp && matchTip && matchAnno && matchTipoPag;
  });

  const pagamentiDepositi = data.pagamenti.filter(p => p.isDeposito);
  const insoluti = data.pagamenti.filter(p => p.stato === 'insoluto');

  const totaleEntrate = pagamentiCanoni.filter(p => p.stato === 'pagato').reduce((s, p) => s + p.importo, 0);
  const totaleInsoluti = insoluti.reduce((s, p) => s + p.importoDovuto, 0);
  const totaleMora = data.pagamenti.reduce((s, p) => s + (p.mora || 0), 0);
  const totaleDepositi = pagamentiDepositi.filter(p => p.stato === 'pagato').reduce((s, p) => s + p.importo, 0);

  // Spese fisse annualizzate (IMU, TARI, bollette, ecc.)
  const speseFisseAnnue = data.speseFisse.filter(s => s.attiva).reduce((sum, s) => sum + s.importo * periodicMult[s.periodicita], 0);
  // Spese fisse proporzionate all'anno filtrato (quante rate cadono nell'anno selezionato)
  const annoFiltro = parseInt(filtroAnno) || new Date().getFullYear();
  const speseFisseAnno = data.speseFisse.filter(s => s.attiva && s.dataInizio).reduce((sum, s) => {
    const inizio = new Date(s.dataInizio);
    const mult = { mensile: 1, trimestrale: 3, semestrale: 6, annuale: 12 }[s.periodicita] ?? 1;
    let count = 0;
    for (let m = 0; m < 12; m++) {
      const diffMesi = (annoFiltro - inizio.getFullYear()) * 12 + (m - inizio.getMonth());
      if (diffMesi >= 0 && diffMesi % mult === 0) count++;
    }
    return sum + s.importo * count;
  }, 0);
  const saldoNetto = totaleEntrate - speseFisseAnno;

  // Affidabilità inquilini
  const affidabilita = data.inquilini.map(inq => {
    const contrattiInq = data.contratti.filter(c => c.inquilinoId === inq.id);
    const pagamentiInq = data.pagamenti.filter(p => contrattiInq.some(c => c.id === p.contrattoId) && !p.isDeposito);
    const totale = pagamentiInq.filter(p => p.stato !== 'attesa').length;
    const pagatiInTempo = pagamentiInq.filter(p => p.stato === 'pagato' && p.dataPagamento && p.dataPagamento <= p.dataScadenza).length;
    const pagatiTardi = pagamentiInq.filter(p => p.stato === 'pagato' && p.dataPagamento && p.dataPagamento > p.dataScadenza).length;
    const insolutiN = pagamentiInq.filter(p => p.stato === 'insoluto').length;
    const score = totale > 0 ? Math.round((pagatiInTempo / totale) * 100) : null;
    const nome = inq.tipoSoggetto === 'azienda' ? inq.ragioneSociale : `${inq.nome} ${inq.cognome}`;
    return { inq, nome, totale, pagatiInTempo, pagatiTardi, insolutiN, score };
  }).filter(a => a.totale > 0);

  // Tassazione per contratto attivo
  const tassazione = data.contratti.filter(c => c.stato === 'attivo').map(c => {
    const imm = getImmobile(c.immobileId);
    const inq = getInquilino(c.inquilinoId);
    const nomeInq = inq?.tipoSoggetto === 'azienda' ? inq.ragioneSociale : (inq ? `${inq.nome} ${inq.cognome}` : 'N/A');
    const annuo = c.canone * 12;
    let aliquota = 0.30;
    let etichetta = 'IRPEF ~30%';
    switch (c.tipoCedolare) {
      case 'cedolare_secca': aliquota = 0.21; etichetta = 'Ced. Secca 21%'; break;
      case 'cedolare_concordato': aliquota = 0.10; etichetta = 'Ced. Concordato 10%'; break;
      case 'adeguamento_istat': aliquota = 0.21; etichetta = 'Adeg. ISTAT ~21%'; break;
    }
    const imposta = annuo * aliquota;
    return { c, imm, nomeInq, annuo, imposta, netto: annuo - imposta, etichetta };
  });

  const form = formPag; // alias per handleSavePag scope

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Contabilità</h1>
        <Dialog open={openPag} onOpenChange={o => { setOpenPag(o); if (!o) setFormPag(emptyPag); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Registra Pagamento</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">Nuovo Pagamento</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="col-span-2"><Label>Contratto</Label>
                <Select value={formPag.contrattoId} onValueChange={handleContrattoChange}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>{data.contratti.map(c => {
                    const imm = getImmobile(c.immobileId);
                    return <SelectItem key={c.id} value={c.id}>{imm?.codice} - €{c.canone}/mese</SelectItem>;
                  })}</SelectContent>
                </Select>
              </div>
              <div><Label>Tipo</Label>
                <Select value={formPag.tipoPagamento} onValueChange={handleTipoPagChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tipiPagamento.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Mese Rif.</Label><Input type="month" value={formPag.meseRiferimento} onChange={e => setFormPag({...formPag, meseRiferimento: e.target.value})} /></div>
              <div><Label>Importo Dovuto €</Label><Input type="number" value={formPag.importoDovuto} onChange={e => setFormPag({...formPag, importoDovuto: +e.target.value})} /></div>
              <div><Label>Importo Ricevuto €</Label><Input type="number" value={formPag.importo} onChange={e => setFormPag({...formPag, importo: +e.target.value})} /></div>
              <div><Label>Data Scadenza *</Label><Input type="date" value={formPag.dataScadenza} onChange={e => setFormPag({...formPag, dataScadenza: e.target.value})} /></div>
              <div><Label>Data Pagamento</Label><Input type="date" value={formPag.dataPagamento} onChange={e => setFormPag({...formPag, dataPagamento: e.target.value})} /></div>
              <div><Label>Stato</Label>
                <Select value={formPag.stato} onValueChange={v => setFormPag({...formPag, stato: v as StatoPagamento})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statiPag.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <input type="checkbox" id="isDeposito" checked={formPag.isDeposito} onChange={e => setFormPag({...formPag, isDeposito: e.target.checked})} className="w-4 h-4" />
                <label htmlFor="isDeposito" className="text-sm">È un deposito (escluso dal cash flow)</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => setOpenPag(false)}>Annulla</Button>
              <Button onClick={handleSavePag}>Registra</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="glass-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Entrate Nette</p>
          <p className="text-2xl font-display font-bold text-success mt-1">€{totaleEntrate.toLocaleString('it-IT')}</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Spese Fisse ({annoFiltro})</p>
          <p className="text-2xl font-display font-bold text-destructive mt-1">€{speseFisseAnno.toLocaleString('it-IT')}</p>
          <p className="text-xs text-muted-foreground">IMU · TARI · altro</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo Netto</p>
          <p className={`text-2xl font-display font-bold mt-1 ${saldoNetto >= 0 ? 'text-success' : 'text-destructive'}`}>€{saldoNetto.toLocaleString('it-IT')}</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Insoluti</p>
          <p className="text-2xl font-display font-bold text-destructive mt-1">€{totaleInsoluti.toLocaleString('it-IT')}</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Mora Totale</p>
          <p className="text-2xl font-display font-bold text-warning mt-1">€{totaleMora.toLocaleString('it-IT')}</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Depositi Tenuti</p>
          <p className="text-2xl font-display font-bold text-info mt-1">€{totaleDepositi.toLocaleString('it-IT')}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="pagamenti">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="pagamenti">Pagamenti</TabsTrigger>
          <TabsTrigger value="depositi">Depositi</TabsTrigger>
          <TabsTrigger value="insoluti">Insoluti ({insoluti.length})</TabsTrigger>
          <TabsTrigger value="affidabilita">Affidabilità</TabsTrigger>
          <TabsTrigger value="tassazione">Tassazione</TabsTrigger>
          <TabsTrigger value="spese">Spese Fisse</TabsTrigger>
        </TabsList>

        {/* TAB PAGAMENTI */}
        <TabsContent value="pagamenti" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select value={filtroAnno} onValueChange={setFiltroAnno}>
              <SelectTrigger><SelectValue placeholder="Anno" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i)).map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroProprietario} onValueChange={setFiltroProprietario}>
              <SelectTrigger><SelectValue placeholder="Tutti i proprietari" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti i proprietari</SelectItem>
                {data.proprietari.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} {p.cognome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroTipologia} onValueChange={setFiltroTipologia}>
              <SelectTrigger><SelectValue placeholder="Tutte le tipologie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutte le tipologie</SelectItem>
                {['appartamento','villa','ufficio','negozio','magazzino','box','altro'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroTipoPag} onValueChange={setFiltroTipoPag}>
              <SelectTrigger><SelectValue placeholder="Tipo pagamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti i tipi</SelectItem>
                {tipiPagamento.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Genera pagamenti per tutti i contratti auto */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              let tot = 0;
              data.contratti.filter(c => c.pagamentiAutomatici && c.stato === 'attivo').forEach(c => {
                tot += generaPagamentiContratto(c.id);
              });
              toast.success(tot > 0 ? `${tot} nuovi pagamenti generati` : 'Nessun nuovo pagamento');
            }}>
              <RefreshCw className="w-4 h-4 mr-2" />Sincronizza Pagamenti Mensili
            </Button>
          </div>

          {pagamentiCanoni.length === 0 ? (
            <Card className="glass-card"><CardContent className="p-8 text-center text-muted-foreground">Nessun pagamento trovato</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {pagamentiCanoni.sort((a, b) => b.dataScadenza.localeCompare(a.dataScadenza)).map(p => {
                const c = getContratto(p.contrattoId);
                const imm = c ? getImmobile(c.immobileId) : null;
                const inq = c ? getInquilino(c.inquilinoId) : null;
                const nomeInq = inq?.tipoSoggetto === 'azienda' ? inq.ragioneSociale : (inq ? `${inq.nome} ${inq.cognome}` : '');
                return (
                  <Card key={p.id} className="glass-card">
                    <CardContent className="p-3 flex items-center justify-between gap-2">
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-2 items-center text-sm">
                        <p className="font-semibold">{imm?.codice || '—'}</p>
                        <p className="text-muted-foreground text-xs">{nomeInq}</p>
                        <p>{p.meseRiferimento || p.dataScadenza}</p>
                        <p>€{p.importo.toLocaleString('it-IT')} / <span className="text-muted-foreground">€{p.importoDovuto.toLocaleString('it-IT')}</span></p>
                        {p.mora > 0 && <p className="text-destructive text-xs">Mora: €{p.mora}</p>}
                        <Badge variant="outline" className={`w-fit ${statoBadge[p.stato]}`}>{p.stato}</Badge>
                      </div>
                      <div className="flex gap-1">
                        {p.stato === 'attesa' && (
                          <Button size="sm" variant="outline" onClick={() => {
                            updatePagamento(p.id, { stato: 'pagato', importo: p.importoDovuto, dataPagamento: new Date().toISOString().slice(0, 10) });
                            toast.success('Pagato');
                          }}>✓ Paga</Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => { deletePagamento(p.id); toast.success('Eliminato'); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB DEPOSITI */}
        <TabsContent value="depositi" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">I depositi sono separati dal cash flow operativo.</p>
          {pagamentiDepositi.length === 0 ? (
            <Card className="glass-card"><CardContent className="p-8 text-center text-muted-foreground">Nessun deposito registrato</CardContent></Card>
          ) : (
            pagamentiDepositi.map(p => {
              const c = getContratto(p.contrattoId);
              const imm = c ? getImmobile(c.immobileId) : null;
              const inq = c ? getInquilino(c.inquilinoId) : null;
              const nome = inq?.tipoSoggetto === 'azienda' ? inq.ragioneSociale : (inq ? `${inq.nome} ${inq.cognome}` : '');
              return (
                <Card key={p.id} className="glass-card">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="grid grid-cols-4 gap-3 flex-1 text-sm items-center">
                      <p className="font-semibold">{imm?.codice || '—'}</p>
                      <p className="text-muted-foreground">{nome}</p>
                      <p className="font-medium">€{p.importo.toLocaleString('it-IT')}</p>
                      <Badge variant="outline" className={`w-fit ${statoBadge[p.stato]}`}>{p.tipoPagamento}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { deletePagamento(p.id); toast.success('Eliminato'); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* TAB INSOLUTI */}
        <TabsContent value="insoluti" className="mt-4 space-y-3">
          {insoluti.length === 0 ? (
            <Card className="glass-card"><CardContent className="p-8 text-center text-muted-foreground">Nessun insoluto</CardContent></Card>
          ) : (
            insoluti.sort((a, b) => a.dataScadenza.localeCompare(b.dataScadenza)).map(p => {
              const c = getContratto(p.contrattoId);
              const imm = c ? getImmobile(c.immobileId) : null;
              const inq = c ? getInquilino(c.inquilinoId) : null;
              const nome = inq?.tipoSoggetto === 'azienda' ? inq.ragioneSociale : (inq ? `${inq.nome} ${inq.cognome}` : '');
              const giorni = Math.floor((Date.now() - new Date(p.dataScadenza).getTime()) / 86400000);
              return (
                <Card key={p.id} className="glass-card border-destructive/30">
                  <CardContent className="p-3 flex items-center justify-between gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm items-center">
                      <p className="font-semibold">{imm?.codice || '—'}</p>
                      <p className="text-muted-foreground">{nome}</p>
                      <p className="text-destructive font-medium">€{p.importoDovuto.toLocaleString('it-IT')}</p>
                      <p className="text-xs text-muted-foreground">Scad: {p.dataScadenza} ({giorni}gg fa)</p>
                      {p.mora > 0 && <p className="text-xs text-destructive">+ €{p.mora} mora</p>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => {
                      updatePagamento(p.id, { stato: 'pagato', importo: p.importoDovuto, dataPagamento: new Date().toISOString().slice(0, 10) });
                      toast.success('Segnato come pagato');
                    }}>✓ Paga</Button>
                    <Button variant="ghost" size="icon" onClick={() => { deletePagamento(p.id); toast.success('Eliminato'); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* TAB AFFIDABILITÀ */}
        <TabsContent value="affidabilita" className="mt-4">
          {affidabilita.length === 0 ? (
            <Card className="glass-card"><CardContent className="p-8 text-center text-muted-foreground">Nessun dato disponibile (aggiungi contratti e pagamenti)</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {affidabilita.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).map(({ nome, totale, pagatiInTempo, pagatiTardi, insolutiN, score }) => {
                const scoreColor = score === null ? 'text-muted-foreground' : score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-destructive';
                return (
                  <Card key={nome} className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-display font-semibold text-sm">{nome}</p>
                        <div className="flex items-center gap-2">
                          <TrendingUp className={`w-4 h-4 ${scoreColor}`} />
                          <span className={`text-xl font-bold font-display ${scoreColor}`}>{score !== null ? `${score}%` : 'N/D'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs text-center">
                        <div className="p-1 bg-muted/30 rounded"><p className="text-muted-foreground">Totale</p><p className="font-semibold">{totale}</p></div>
                        <div className="p-1 bg-success/10 rounded"><p className="text-success">In tempo</p><p className="font-semibold">{pagatiInTempo}</p></div>
                        <div className="p-1 bg-warning/10 rounded"><p className="text-warning">In ritardo</p><p className="font-semibold">{pagatiTardi}</p></div>
                        <div className="p-1 bg-destructive/10 rounded"><p className="text-destructive">Insoluti</p><p className="font-semibold">{insolutiN}</p></div>
                      </div>
                      {score !== null && (
                        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-success' : score >= 50 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${score}%` }} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB TASSAZIONE */}
        <TabsContent value="tassazione" className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">Stime indicative. Consultare un commercialista per calcoli definitivi.</p>
          {tassazione.length === 0 ? (
            <Card className="glass-card"><CardContent className="p-8 text-center text-muted-foreground">Nessun contratto attivo</CardContent></Card>
          ) : (
            <>
              <div className="grid gap-3">
                {tassazione.map(({ c, imm, nomeInq, annuo, imposta, netto, etichetta }) => (
                  <Card key={c.id} className="glass-card">
                    <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm items-center">
                      <div><p className="font-semibold">{imm?.codice || '—'}</p><p className="text-xs text-muted-foreground">{imm?.indirizzo}</p></div>
                      <p className="text-muted-foreground">{nomeInq}</p>
                      <p>Annuo: <strong>€{annuo.toLocaleString('it-IT')}</strong></p>
                      <p className="text-destructive">Imposta: <strong>€{imposta.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</strong><br/><span className="text-xs text-muted-foreground">{etichetta}</span></p>
                      <p className="text-success">Netto: <strong>€{netto.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</strong></p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <p className="text-sm font-medium">Totale anno</p>
                  <div className="grid grid-cols-3 gap-4 mt-2 text-center">
                    <div><p className="text-xs text-muted-foreground">Entrate lorde</p><p className="font-bold">€{tassazione.reduce((s, t) => s + t.annuo, 0).toLocaleString('it-IT')}</p></div>
                    <div><p className="text-xs text-destructive">Imposte stimate</p><p className="font-bold text-destructive">€{tassazione.reduce((s, t) => s + t.imposta, 0).toLocaleString('it-IT', { maximumFractionDigits: 0 })}</p></div>
                    <div><p className="text-xs text-success">Netto stimato</p><p className="font-bold text-success">€{tassazione.reduce((s, t) => s + t.netto, 0).toLocaleString('it-IT', { maximumFractionDigits: 0 })}</p></div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB SPESE FISSE */}
        <TabsContent value="spese" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Spese fisse ricorrenti (IMU, TARI, bollette, condominio...)</p>
              <p className="text-xs text-muted-foreground">Totale annuo: <strong>€{speseFisseAnnue.toLocaleString('it-IT')}</strong></p>
            </div>
            <Dialog open={openSpesa} onOpenChange={o => { setOpenSpesa(o); if (!o) { setEditingSpesa(null); setFormSpesa(emptySpesa); } }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Nuova Spesa</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">{editingSpesa ? 'Modifica' : 'Nuova'} Spesa Fissa</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="col-span-2"><Label>Immobile *</Label>
                    <Select value={formSpesa.immobileId} onValueChange={v => setFormSpesa({...formSpesa, immobileId: v})}>
                      <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                      <SelectContent>{data.immobili.map(i => <SelectItem key={i.id} value={i.id}>{i.codice} - {i.indirizzo}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Tipo</Label>
                    <Select value={formSpesa.tipo} onValueChange={v => setFormSpesa({...formSpesa, tipo: v as TipoSpesa})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{tipiSpesa.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Periodicità</Label>
                    <Select value={formSpesa.periodicita} onValueChange={v => setFormSpesa({...formSpesa, periodicita: v as PeriodicitaSpesa})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{periodicita.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Importo €</Label><Input type="number" value={formSpesa.importo} onChange={e => setFormSpesa({...formSpesa, importo: +e.target.value})} /></div>
                  <div><Label>Data Inizio</Label><Input type="date" value={formSpesa.dataInizio} onChange={e => setFormSpesa({...formSpesa, dataInizio: e.target.value})} /></div>
                  <div className="col-span-2"><Label>Descrizione</Label><Input value={formSpesa.descrizione} onChange={e => setFormSpesa({...formSpesa, descrizione: e.target.value})} /></div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="attiva" checked={formSpesa.attiva} onChange={e => setFormSpesa({...formSpesa, attiva: e.target.checked})} className="w-4 h-4" />
                    <label htmlFor="attiva" className="text-sm">Spesa attiva</label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button variant="outline" onClick={() => setOpenSpesa(false)}>Annulla</Button>
                  <Button onClick={handleSaveSpesa}>Salva</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {data.speseFisse.length === 0 ? (
            <Card className="glass-card"><CardContent className="p-8 text-center text-muted-foreground">Nessuna spesa fissa registrata</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {data.speseFisse.map(s => {
                const imm = getImmobile(s.immobileId);
                const annuo = s.importo * periodicMult[s.periodicita];
                return (
                  <Card key={s.id} className={`glass-card ${!s.attiva ? 'opacity-50' : ''}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 flex-1 text-sm items-center">
                        <p className="font-semibold">{imm?.codice || '—'}</p>
                        <Badge variant="outline" className="w-fit capitalize">{s.tipo}</Badge>
                        <p>{s.descrizione || '—'}</p>
                        <p>€{s.importo.toLocaleString('it-IT')} / <span className="text-muted-foreground capitalize">{s.periodicita}</span></p>
                        <p className="text-muted-foreground text-xs">€{annuo.toLocaleString('it-IT')} annui</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setFormSpesa({ immobileId: s.immobileId, tipo: s.tipo, descrizione: s.descrizione, importo: s.importo, periodicita: s.periodicita, dataInizio: s.dataInizio, attiva: s.attiva, note: s.note });
                          setEditingSpesa(s.id); setOpenSpesa(true);
                        }}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { deleteSpesaFissa(s.id); toast.success('Eliminata'); }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
