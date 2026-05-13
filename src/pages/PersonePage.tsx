import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Proprietario, Inquilino, TipoSoggetto, TipoCedolare } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pencil, Trash2, Building2, User } from 'lucide-react';
import { toast } from 'sonner';

const emptyProp = {
  nome: '', cognome: '', codiceFiscale: '', email: '', telefono: '',
  indirizzo: '', iban: '', percentualeProprietà: 100, note: '',
};

const emptyInq = {
  tipoSoggetto: 'persona_fisica' as TipoSoggetto, nome: '', cognome: '',
  ragioneSociale: '', codiceFiscale: '', partitaIva: '', pec: '',
  email: '', telefono: '', indirizzo: '', reddito: 0, referenze: '', note: '',
};

const emptyContrattoOpt = {
  immobileId: '', dataInizio: '', dataFine: '', canone: 0,
  tipoCedolare: 'ordinario' as TipoCedolare, adeguamentoIstat: 0,
};

export default function PersonePage() {
  const { data, addProprietario, updateProprietario, deleteProprietario, addInquilino, updateInquilino, deleteInquilino, addContratto } = useData();
  const [tab, setTab] = useState('proprietari');
  const [search, setSearch] = useState('');
  const [openProp, setOpenProp] = useState(false);
  const [editingProp, setEditingProp] = useState<string | null>(null);
  const [formProp, setFormProp] = useState(emptyProp);
  const [openInq, setOpenInq] = useState(false);
  const [editingInq, setEditingInq] = useState<string | null>(null);
  const [formInq, setFormInq] = useState(emptyInq);
  const [collegaImmobile, setCollegaImmobile] = useState(false);
  const [formContratto, setFormContratto] = useState(emptyContrattoOpt);

  const filteredProp = data.proprietari.filter(p =>
    `${p.nome} ${p.cognome} ${p.email}`.toLowerCase().includes(search.toLowerCase())
  );
  const filteredInq = data.inquilini.filter(i =>
    `${i.nome} ${i.cognome} ${i.ragioneSociale} ${i.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const saveProp = () => {
    if (!formProp.nome || !formProp.cognome) { toast.error('Nome e cognome obbligatori'); return; }
    if (editingProp) { updateProprietario(editingProp, formProp); toast.success('Aggiornato'); }
    else { addProprietario(formProp); toast.success('Proprietario aggiunto'); }
    setFormProp(emptyProp); setEditingProp(null); setOpenProp(false);
  };

  const saveInq = () => {
    if (formInq.tipoSoggetto === 'persona_fisica' && (!formInq.nome || !formInq.cognome)) {
      toast.error('Nome e cognome obbligatori'); return;
    }
    if (formInq.tipoSoggetto === 'azienda' && !formInq.ragioneSociale) {
      toast.error('Ragione sociale obbligatoria'); return;
    }

    let inquilinoId: string;
    if (editingInq) {
      updateInquilino(editingInq, formInq);
      inquilinoId = editingInq;
      toast.success('Inquilino aggiornato');
    } else {
      const inq = addInquilino(formInq) as any;
      inquilinoId = inq?.id || '';
      toast.success('Inquilino aggiunto');
    }

    // Crea contratto automatico se immobile selezionato
    if (!editingInq && collegaImmobile && formContratto.immobileId && formContratto.dataInizio && formContratto.canone > 0) {
      const imm = data.immobili.find(i => i.id === formContratto.immobileId);
      const prop = data.proprietari.find(p => p.id === imm?.proprietarioId);
      const isAzienda = formInq.tipoSoggetto === 'azienda';
      addContratto({
        immobileId: formContratto.immobileId,
        inquilinoId,
        proprietarioId: prop?.id || '',
        dataInizio: formContratto.dataInizio,
        dataFine: formContratto.dataFine,
        canone: formContratto.canone,
        deposito: 0,
        tipoDeposito: 'cauzionale',
        fidejussione: 0,
        stato: 'attivo',
        tipoCedolare: isAzienda ? 'adeguamento_istat' : formContratto.tipoCedolare,
        aliquotaCedolare: 21,
        adeguamentoIstat: isAzienda ? (formContratto.adeguamentoIstat || 75) : formContratto.adeguamentoIstat,
        pagamentiAutomatici: false,
        note: 'Contratto creato automaticamente',
      });
      toast.success('Contratto creato e immobile aggiornato automaticamente');
    }

    setFormInq(emptyInq); setEditingInq(null); setOpenInq(false);
    setCollegaImmobile(false); setFormContratto(emptyContrattoOpt);
  };

  const immobiliLiberi = data.immobili.filter(i => i.stato === 'libero');

  const renderPropCard = (p: Proprietario) => {
    const suoi = data.immobili.filter(i => i.proprietarioId === p.id);
    return (
      <Card key={p.id} className="glass-card hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm">{p.nome} {p.cognome}</p>
              <p className="text-xs text-muted-foreground">{p.email} · {p.telefono}</p>
              <p className="text-xs text-muted-foreground">{suoi.length} immobili</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => {
              const full = data.proprietari.find(x => x.id === p.id)!;
              setFormProp({ nome: full.nome, cognome: full.cognome, codiceFiscale: full.codiceFiscale, email: full.email, telefono: full.telefono, indirizzo: full.indirizzo, iban: full.iban, percentualeProprietà: full.percentualeProprietà, note: full.note });
              setEditingProp(p.id); setOpenProp(true);
            }}><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => { deleteProprietario(p.id); toast.success('Eliminato'); }}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderInqCard = (i: Inquilino) => {
    const isAzienda = i.tipoSoggetto === 'azienda';
    const nome = isAzienda ? i.ragioneSociale : `${i.nome} ${i.cognome}`;
    const contratti = data.contratti.filter(c => c.inquilinoId === i.id && c.stato === 'attivo');
    return (
      <Card key={i.id} className="glass-card hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
              {isAzienda ? <Building2 className="w-4 h-4 text-secondary" /> : <User className="w-4 h-4 text-secondary" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-display font-semibold text-sm">{nome}</p>
                <Badge variant="outline" className="text-xs">{isAzienda ? 'Azienda' : 'Persona'}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{i.email} · {i.telefono}</p>
              {contratti.length > 0 && <p className="text-xs text-success">{contratti.length} contratto/i attivo</p>}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => {
              const full = data.inquilini.find(x => x.id === i.id)!;
              setFormInq({
                tipoSoggetto: full.tipoSoggetto || 'persona_fisica', nome: full.nome, cognome: full.cognome,
                ragioneSociale: full.ragioneSociale || '', codiceFiscale: full.codiceFiscale,
                partitaIva: full.partitaIva || '', pec: full.pec || '',
                email: full.email, telefono: full.telefono, indirizzo: full.indirizzo,
                reddito: full.reddito, referenze: full.referenze, note: full.note,
              });
              setEditingInq(i.id); setOpenInq(true);
            }}><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => { deleteInquilino(i.id); toast.success('Eliminato'); }}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const isAziendaForm = formInq.tipoSoggetto === 'azienda';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Anagrafica</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="proprietari">Proprietari ({data.proprietari.length})</TabsTrigger>
            <TabsTrigger value="inquilini">Inquilini ({data.inquilini.length})</TabsTrigger>
          </TabsList>

          {tab === 'proprietari' ? (
            <Dialog open={openProp} onOpenChange={o => { setOpenProp(o); if (!o) { setEditingProp(null); setFormProp(emptyProp); } }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Nuovo Proprietario</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">{editingProp ? 'Modifica' : 'Nuovo'} Proprietario</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div><Label>Nome *</Label><Input value={formProp.nome} onChange={e => setFormProp({...formProp, nome: e.target.value})} /></div>
                  <div><Label>Cognome *</Label><Input value={formProp.cognome} onChange={e => setFormProp({...formProp, cognome: e.target.value})} /></div>
                  <div><Label>Codice Fiscale</Label><Input value={formProp.codiceFiscale} onChange={e => setFormProp({...formProp, codiceFiscale: e.target.value})} /></div>
                  <div><Label>Email</Label><Input value={formProp.email} onChange={e => setFormProp({...formProp, email: e.target.value})} /></div>
                  <div><Label>Telefono</Label><Input value={formProp.telefono} onChange={e => setFormProp({...formProp, telefono: e.target.value})} /></div>
                  <div><Label>IBAN</Label><Input value={formProp.iban} onChange={e => setFormProp({...formProp, iban: e.target.value})} /></div>
                  <div><Label>% Proprietà</Label><Input type="number" value={formProp.percentualeProprietà} onChange={e => setFormProp({...formProp, percentualeProprietà: +e.target.value})} /></div>
                  <div><Label>Indirizzo</Label><Input value={formProp.indirizzo} onChange={e => setFormProp({...formProp, indirizzo: e.target.value})} /></div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button variant="outline" onClick={() => setOpenProp(false)}>Annulla</Button>
                  <Button onClick={saveProp}>Salva</Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={openInq} onOpenChange={o => {
              setOpenInq(o);
              if (!o) { setEditingInq(null); setFormInq(emptyInq); setCollegaImmobile(false); setFormContratto(emptyContrattoOpt); }
            }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Nuovo Inquilino</Button></DialogTrigger>
              <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">{editingInq ? 'Modifica' : 'Nuovo'} Inquilino</DialogTitle></DialogHeader>

                {/* Tipo soggetto */}
                <div className="mt-3">
                  <Label>Tipo Soggetto</Label>
                  <div className="flex gap-2 mt-1">
                    {(['persona_fisica', 'azienda'] as TipoSoggetto[]).map(tipo => (
                      <Button
                        key={tipo}
                        variant={formInq.tipoSoggetto === tipo ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setFormInq({ ...formInq, tipoSoggetto: tipo });
                          if (tipo === 'azienda') {
                            setFormContratto(prev => ({ ...prev, tipoCedolare: 'adeguamento_istat' }));
                          }
                        }}
                      >
                        {tipo === 'persona_fisica' ? <><User className="w-3 h-3 mr-1" />Persona Fisica</> : <><Building2 className="w-3 h-3 mr-1" />Azienda</>}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  {isAziendaForm ? (
                    <>
                      <div className="col-span-2"><Label>Ragione Sociale *</Label><Input value={formInq.ragioneSociale} onChange={e => setFormInq({...formInq, ragioneSociale: e.target.value})} /></div>
                      <div><Label>Partita IVA</Label><Input value={formInq.partitaIva} onChange={e => setFormInq({...formInq, partitaIva: e.target.value})} /></div>
                      <div><Label>PEC</Label><Input value={formInq.pec} onChange={e => setFormInq({...formInq, pec: e.target.value})} /></div>
                    </>
                  ) : (
                    <>
                      <div><Label>Nome *</Label><Input value={formInq.nome} onChange={e => setFormInq({...formInq, nome: e.target.value})} /></div>
                      <div><Label>Cognome *</Label><Input value={formInq.cognome} onChange={e => setFormInq({...formInq, cognome: e.target.value})} /></div>
                      <div><Label>Codice Fiscale</Label><Input value={formInq.codiceFiscale} onChange={e => setFormInq({...formInq, codiceFiscale: e.target.value})} /></div>
                      <div><Label>Reddito €/anno</Label><Input type="number" value={formInq.reddito} onChange={e => setFormInq({...formInq, reddito: +e.target.value})} /></div>
                    </>
                  )}
                  <div><Label>Email</Label><Input value={formInq.email} onChange={e => setFormInq({...formInq, email: e.target.value})} /></div>
                  <div><Label>Telefono</Label><Input value={formInq.telefono} onChange={e => setFormInq({...formInq, telefono: e.target.value})} /></div>
                  <div className="col-span-2"><Label>Indirizzo</Label><Input value={formInq.indirizzo} onChange={e => setFormInq({...formInq, indirizzo: e.target.value})} /></div>
                  {!isAziendaForm && (
                    <div className="col-span-2"><Label>Referenze</Label><Input value={formInq.referenze} onChange={e => setFormInq({...formInq, referenze: e.target.value})} /></div>
                  )}
                </div>

                {/* Collega immobile (solo nuovo inquilino) */}
                {!editingInq && (
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id="collega"
                        checked={collegaImmobile}
                        onChange={e => setCollegaImmobile(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="collega" className="text-sm font-medium cursor-pointer">
                        Collega immobile e crea contratto automaticamente
                      </label>
                    </div>
                    {collegaImmobile && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2"><Label>Immobile *</Label>
                          <Select value={formContratto.immobileId} onValueChange={v => setFormContratto({...formContratto, immobileId: v})}>
                            <SelectTrigger><SelectValue placeholder="Seleziona immobile libero" /></SelectTrigger>
                            <SelectContent>{immobiliLiberi.map(i => <SelectItem key={i.id} value={i.id}>{i.codice} - {i.indirizzo}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><Label>Data Inizio *</Label><Input type="date" value={formContratto.dataInizio} onChange={e => setFormContratto({...formContratto, dataInizio: e.target.value})} /></div>
                        <div><Label>Data Fine</Label><Input type="date" value={formContratto.dataFine} onChange={e => setFormContratto({...formContratto, dataFine: e.target.value})} /></div>
                        <div><Label>Canone Mensile € *</Label><Input type="number" value={formContratto.canone} onChange={e => setFormContratto({...formContratto, canone: +e.target.value})} /></div>
                        <div><Label>Regime Fiscale</Label>
                          <Select value={formContratto.tipoCedolare} onValueChange={v => setFormContratto({...formContratto, tipoCedolare: v as TipoCedolare})} disabled={isAziendaForm}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cedolare_secca">Cedolare Secca 21%</SelectItem>
                              <SelectItem value="cedolare_concordato">Cedolare Concordato 10%</SelectItem>
                              <SelectItem value="adeguamento_istat">Adeguamento ISTAT</SelectItem>
                              <SelectItem value="ordinario">Ordinario IRPEF</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {isAziendaForm && (
                          <div className="col-span-2 text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                            Per contratti con aziende viene applicato automaticamente l'adeguamento ISTAT (75% della variazione).
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setOpenInq(false)}>Annulla</Button>
                  <Button onClick={saveInq}>Salva{collegaImmobile && !editingInq ? ' e Crea Contratto' : ''}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cerca..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <TabsContent value="proprietari" className="mt-4 space-y-3">
          {filteredProp.length === 0
            ? <p className="text-center text-muted-foreground py-8">Nessun proprietario</p>
            : filteredProp.map(p => renderPropCard(p))}
        </TabsContent>
        <TabsContent value="inquilini" className="mt-4 space-y-3">
          {filteredInq.length === 0
            ? <p className="text-center text-muted-foreground py-8">Nessun inquilino</p>
            : filteredInq.map(i => renderInqCard(i))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
