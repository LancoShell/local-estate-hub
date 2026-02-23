import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Proprietario, Inquilino } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyProp = { nome: '', cognome: '', codiceFiscale: '', email: '', telefono: '', indirizzo: '', iban: '', percentualeProprietà: 100, note: '' };
const emptyInq = { nome: '', cognome: '', codiceFiscale: '', email: '', telefono: '', indirizzo: '', reddito: 0, referenze: '', note: '' };

export default function PersonePage() {
  const { data, addProprietario, updateProprietario, deleteProprietario, addInquilino, updateInquilino, deleteInquilino } = useData();
  const [tab, setTab] = useState('proprietari');
  const [search, setSearch] = useState('');
  const [openProp, setOpenProp] = useState(false);
  const [editingProp, setEditingProp] = useState<string | null>(null);
  const [formProp, setFormProp] = useState(emptyProp);
  const [openInq, setOpenInq] = useState(false);
  const [editingInq, setEditingInq] = useState<string | null>(null);
  const [formInq, setFormInq] = useState(emptyInq);

  const filteredProp = data.proprietari.filter(p => `${p.nome} ${p.cognome} ${p.email}`.toLowerCase().includes(search.toLowerCase()));
  const filteredInq = data.inquilini.filter(i => `${i.nome} ${i.cognome} ${i.email}`.toLowerCase().includes(search.toLowerCase()));

  const saveProp = () => {
    if (!formProp.nome || !formProp.cognome) { toast.error('Nome e cognome obbligatori'); return; }
    if (editingProp) { updateProprietario(editingProp, formProp); toast.success('Aggiornato'); }
    else { addProprietario(formProp); toast.success('Aggiunto'); }
    setFormProp(emptyProp); setEditingProp(null); setOpenProp(false);
  };

  const saveInq = () => {
    if (!formInq.nome || !formInq.cognome) { toast.error('Nome e cognome obbligatori'); return; }
    if (editingInq) { updateInquilino(editingInq, formInq); toast.success('Aggiornato'); }
    else { addInquilino(formInq); toast.success('Aggiunto'); }
    setFormInq(emptyInq); setEditingInq(null); setOpenInq(false);
  };

  const renderPersonCard = (p: { id: string; nome: string; cognome: string; email: string; telefono: string }, type: 'prop' | 'inq') => (
    <Card key={p.id} className="glass-card hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="font-display font-semibold text-sm">{p.nome} {p.cognome}</p>
          <p className="text-xs text-muted-foreground">{p.email} · {p.telefono}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => {
            if (type === 'prop') {
              const full = data.proprietari.find(x => x.id === p.id)!;
              setFormProp({ nome: full.nome, cognome: full.cognome, codiceFiscale: full.codiceFiscale, email: full.email, telefono: full.telefono, indirizzo: full.indirizzo, iban: full.iban, percentualeProprietà: full.percentualeProprietà, note: full.note });
              setEditingProp(p.id); setOpenProp(true);
            } else {
              const full = data.inquilini.find(x => x.id === p.id)!;
              setFormInq({ nome: full.nome, cognome: full.cognome, codiceFiscale: full.codiceFiscale, email: full.email, telefono: full.telefono, indirizzo: full.indirizzo, reddito: full.reddito, referenze: full.referenze, note: full.note });
              setEditingInq(p.id); setOpenInq(true);
            }
          }}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => { type === 'prop' ? deleteProprietario(p.id) : deleteInquilino(p.id); toast.success('Eliminato'); }}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Anagrafica Persone</h1>

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
            <Dialog open={openInq} onOpenChange={o => { setOpenInq(o); if (!o) { setEditingInq(null); setFormInq(emptyInq); } }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Nuovo Inquilino</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">{editingInq ? 'Modifica' : 'Nuovo'} Inquilino</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div><Label>Nome *</Label><Input value={formInq.nome} onChange={e => setFormInq({...formInq, nome: e.target.value})} /></div>
                  <div><Label>Cognome *</Label><Input value={formInq.cognome} onChange={e => setFormInq({...formInq, cognome: e.target.value})} /></div>
                  <div><Label>Codice Fiscale</Label><Input value={formInq.codiceFiscale} onChange={e => setFormInq({...formInq, codiceFiscale: e.target.value})} /></div>
                  <div><Label>Email</Label><Input value={formInq.email} onChange={e => setFormInq({...formInq, email: e.target.value})} /></div>
                  <div><Label>Telefono</Label><Input value={formInq.telefono} onChange={e => setFormInq({...formInq, telefono: e.target.value})} /></div>
                  <div><Label>Reddito €</Label><Input type="number" value={formInq.reddito} onChange={e => setFormInq({...formInq, reddito: +e.target.value})} /></div>
                  <div className="col-span-2"><Label>Referenze</Label><Input value={formInq.referenze} onChange={e => setFormInq({...formInq, referenze: e.target.value})} /></div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button variant="outline" onClick={() => setOpenInq(false)}>Annulla</Button>
                  <Button onClick={saveInq}>Salva</Button>
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
          {filteredProp.length === 0 ? <p className="text-center text-muted-foreground py-8">Nessun proprietario</p> : filteredProp.map(p => renderPersonCard(p, 'prop'))}
        </TabsContent>
        <TabsContent value="inquilini" className="mt-4 space-y-3">
          {filteredInq.length === 0 ? <p className="text-center text-muted-foreground py-8">Nessun inquilino</p> : filteredInq.map(i => renderPersonCard(i, 'inq'))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
