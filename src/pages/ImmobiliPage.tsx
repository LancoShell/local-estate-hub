import { useState, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { Immobile, StatoImmobile, TipologiaImmobile, ClasseEnergetica, Allegato } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Pencil, Trash2, Paperclip, Download, X, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { generateId } from '@/lib/dataStore';

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
  datiCatastali: '', prezzoRichiesto: 0, speseCondominiali: 0,
  valoreAcquisto: 0, valoreAttuale: 0, imu: 0, tari: 0, bollette: 0, speseBonifica: 0,
  allegati: [] as Allegato[], note: '', proprietarioId: '',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImmobiliPage() {
  const { data, addImmobile, updateImmobile, deleteImmobile, generaManutenzioniAutomatiche } = useData();
  const [search, setSearch] = useState('');
  const [filtroProprietario, setFiltroProprietario] = useState('tutti');
  const [filtroTipologia, setFiltroTipologia] = useState('tutti');
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState('info');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = data.immobili.filter(i => {
    const matchSearch = `${i.codice} ${i.indirizzo} ${i.citta} ${i.tipologia}`.toLowerCase().includes(search.toLowerCase());
    const matchProp = filtroProprietario === 'tutti' || i.proprietarioId === filtroProprietario;
    const matchTip = filtroTipologia === 'tutti' || i.tipologia === filtroTipologia;
    const matchStato = filtroStato === 'tutti' || i.stato === filtroStato;
    return matchSearch && matchProp && matchTip && matchStato;
  });

  const handleSave = () => {
    if (!form.codice || !form.indirizzo) { toast.error('Codice e indirizzo sono obbligatori'); return; }
    if (editing) {
      updateImmobile(editing, form);
      toast.success('Immobile aggiornato');
    } else {
      addImmobile(form);
      toast.success('Immobile aggiunto');
    }
    setForm(emptyForm); setEditing(null); setOpen(false); setTab('info');
  };

  const handleEdit = (imm: Immobile) => {
    setForm({
      codice: imm.codice, tipologia: imm.tipologia, indirizzo: imm.indirizzo, citta: imm.citta,
      cap: imm.cap, mq: imm.mq, vani: imm.vani, stato: imm.stato, classeEnergetica: imm.classeEnergetica,
      datiCatastali: imm.datiCatastali, prezzoRichiesto: imm.prezzoRichiesto,
      speseCondominiali: imm.speseCondominiali, note: imm.note, proprietarioId: imm.proprietarioId,
      valoreAcquisto: imm.valoreAcquisto || 0, valoreAttuale: imm.valoreAttuale || 0,
      imu: imm.imu || 0, tari: imm.tari || 0, bollette: imm.bollette || 0,
      speseBonifica: imm.speseBonifica || 0, allegati: imm.allegati || [],
    });
    setEditing(imm.id); setOpen(true); setTab('info');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name} supera il limite di 5MB`); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const allegato: Allegato = {
          id: generateId(),
          nome: file.name,
          tipo: file.type,
          dati: ev.target?.result as string,
          dimensione: file.size,
          createdAt: new Date().toISOString(),
        };
        setForm(f => ({ ...f, allegati: [...f.allegati, allegato] }));
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAllegato = (id: string) => setForm(f => ({ ...f, allegati: f.allegati.filter(a => a.id !== id) }));

  const downloadAllegato = (a: Allegato) => {
    const link = document.createElement('a');
    link.href = a.dati;
    link.download = a.nome;
    link.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getProprietario = (id: string) => {
    const p = data.proprietari.find(x => x.id === id);
    return p ? `${p.nome} ${p.cognome}` : '—';
  };

  const rendimento = (imm: Immobile) => {
    if (!imm.valoreAttuale) return null;
    const canoneAnnuo = imm.prezzoRichiesto * 12;
    return ((canoneAnnuo / imm.valoreAttuale) * 100).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Immobili</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} di {data.immobili.length} immobili</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const n = generaManutenzioniAutomatiche();
            toast.success(n > 0 ? `${n} manutenzioni programmate` : 'Nessuna nuova manutenzione');
          }}>
            <Wrench className="w-4 h-4 mr-2" />Auto-Manutenzioni
          </Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); setTab('info'); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Nuovo Immobile</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">{editing ? 'Modifica Immobile' : 'Nuovo Immobile'}</DialogTitle>
              </DialogHeader>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="info" className="flex-1">Info Base</TabsTrigger>
                  <TabsTrigger value="valori" className="flex-1">Valori & Spese</TabsTrigger>
                  <TabsTrigger value="allegati" className="flex-1">Allegati</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Codice *</Label><Input value={form.codice} onChange={e => setForm({...form, codice: e.target.value})} /></div>
                    <div><Label>Tipologia</Label>
                      <Select value={form.tipologia} onValueChange={v => setForm({...form, tipologia: v as TipologiaImmobile})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{tipologie.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
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
                        <SelectContent>{stati.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Classe Energetica</Label>
                      <Select value={form.classeEnergetica} onValueChange={v => setForm({...form, classeEnergetica: v as ClasseEnergetica})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{classiEnergetiche.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Canone Richiesto €/mese</Label><Input type="number" value={form.prezzoRichiesto} onChange={e => setForm({...form, prezzoRichiesto: +e.target.value})} /></div>
                    <div><Label>Spese Condominiali €/mese</Label><Input type="number" value={form.speseCondominiali} onChange={e => setForm({...form, speseCondominiali: +e.target.value})} /></div>
                    <div className="col-span-2"><Label>Dati Catastali</Label><Input value={form.datiCatastali} onChange={e => setForm({...form, datiCatastali: e.target.value})} /></div>
                    <div><Label>Proprietario</Label>
                      <Select value={form.proprietarioId} onValueChange={v => setForm({...form, proprietarioId: v})}>
                        <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                        <SelectContent>{data.proprietari.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} {p.cognome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Note</Label><Input value={form.note} onChange={e => setForm({...form, note: e.target.value})} /></div>
                  </div>
                </TabsContent>

                <TabsContent value="valori" className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 text-sm font-medium text-muted-foreground border-b pb-1">Valori Immobile</div>
                    <div><Label>Valore Acquisto € (carico)</Label><Input type="number" value={form.valoreAcquisto} onChange={e => setForm({...form, valoreAcquisto: +e.target.value})} /></div>
                    <div><Label>Valore Attuale € (mercato)</Label><Input type="number" value={form.valoreAttuale} onChange={e => setForm({...form, valoreAttuale: +e.target.value})} /></div>
                    {form.valoreAttuale > 0 && form.prezzoRichiesto > 0 && (
                      <div className="col-span-2 p-3 bg-muted/30 rounded-md text-sm">
                        Rendimento lordo stimato: <strong>{((form.prezzoRichiesto * 12 / form.valoreAttuale) * 100).toFixed(2)}%</strong> annuo
                        {form.valoreAcquisto > 0 && (
                          <span className="ml-4">Plusvalenza: <strong className={form.valoreAttuale >= form.valoreAcquisto ? 'text-success' : 'text-destructive'}>
                            €{(form.valoreAttuale - form.valoreAcquisto).toLocaleString('it-IT')}
                          </strong></span>
                        )}
                      </div>
                    )}
                    <div className="col-span-2 text-sm font-medium text-muted-foreground border-b pb-1 mt-2">Spese Fisse Annue</div>
                    <div><Label>IMU €/anno</Label><Input type="number" value={form.imu} onChange={e => setForm({...form, imu: +e.target.value})} /></div>
                    <div><Label>TARI €/anno</Label><Input type="number" value={form.tari} onChange={e => setForm({...form, tari: +e.target.value})} /></div>
                    <div><Label>Bollette €/mese (se vuoto)</Label><Input type="number" value={form.bollette} onChange={e => setForm({...form, bollette: +e.target.value})} /></div>
                    <div><Label>Spese Bonifica €</Label><Input type="number" value={form.speseBonifica} onChange={e => setForm({...form, speseBonifica: +e.target.value})} /></div>
                  </div>
                </TabsContent>

                <TabsContent value="allegati" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png,.dwg,.doc,.docx" onChange={handleFileUpload} />
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="w-4 h-4 mr-2" />Carica Allegati
                      </Button>
                      <span className="text-xs text-muted-foreground">PDF, immagini, planimetrie (max 5MB per file)</span>
                    </div>
                    {form.allegati.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nessun allegato caricato</p>
                    ) : (
                      <div className="space-y-2">
                        {form.allegati.map(a => (
                          <div key={a.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{a.nome}</p>
                              <p className="text-xs text-muted-foreground">{formatSize(a.dimensione)}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => downloadAllegato(a)}><Download className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => removeAllegato(a.id)}><X className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); setForm(emptyForm); }}>Annulla</Button>
                <Button onClick={handleSave}>{editing ? 'Aggiorna' : 'Salva'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtri */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cerca..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
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
            {tipologie.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroStato} onValueChange={setFiltroStato}>
          <SelectTrigger><SelectValue placeholder="Tutti gli stati" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            {stati.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="glass-card"><CardContent className="p-12 text-center text-muted-foreground">Nessun immobile trovato</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(imm => {
            const ren = rendimento(imm);
            const prop = getProprietario(imm.proprietarioId);
            const nAllegati = imm.allegati?.length || 0;
            return (
              <Card key={imm.id} className="glass-card hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-3 items-center">
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
                      <div>
                        <p className="text-xs text-muted-foreground">{prop}</p>
                        {ren && <p className="text-xs text-success font-medium">Rend. {ren}%</p>}
                        {nAllegati > 0 && <p className="text-xs text-muted-foreground"><Paperclip className="w-3 h-3 inline mr-1" />{nAllegati}</p>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={statoBadge[imm.stato]}>{imm.stato}</Badge>
                        <Badge variant="outline" className="text-xs w-fit">{imm.classeEnergetica}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-4">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(imm)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => {
                        deleteImmobile(imm.id);
                        toast.success('Immobile eliminato');
                      }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                  {(imm.valoreAcquisto || imm.imu || imm.tari) ? (
                    <div className="mt-2 pt-2 border-t flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {imm.valoreAcquisto > 0 && <span>Acquisto: €{imm.valoreAcquisto.toLocaleString('it-IT')}</span>}
                      {imm.valoreAttuale > 0 && <span>Valore: €{imm.valoreAttuale.toLocaleString('it-IT')}</span>}
                      {imm.imu > 0 && <span>IMU: €{imm.imu.toLocaleString('it-IT')}/a</span>}
                      {imm.tari > 0 && <span>TARI: €{imm.tari.toLocaleString('it-IT')}/a</span>}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
