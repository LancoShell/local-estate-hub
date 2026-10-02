import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  AppData, Immobile, Proprietario, Inquilino, Contratto, Pagamento,
  Manutenzione, Lead, SpesaFissa, StatoPagamento, TipologiaManutenzione, PeriodicitaManutenzione,
} from '@/lib/types';
import { loadData, saveData, generateId } from '@/lib/dataStore';
import { calcolaMora, canoneEffettivo, moraApplicabile } from '@/lib/finance';

const MANUTENZIONI_AUTO: Array<{ tipologia: TipologiaManutenzione; descrizione: string; periodicita: PeriodicitaManutenzione; mesi: number }> = [
  { tipologia: 'caldaia', descrizione: 'Revisione annuale caldaia', periodicita: 'annuale', mesi: 12 },
  { tipologia: 'filtri', descrizione: 'Sostituzione filtri aria/acqua', periodicita: 'annuale', mesi: 12 },
  { tipologia: 'caditoie', descrizione: 'Pulizia caditoie e scarichi', periodicita: 'annuale', mesi: 12 },
  { tipologia: 'serramenti', descrizione: 'Controllo serramenti e infissi', periodicita: 'triennale', mesi: 36 },
  { tipologia: 'siliconature', descrizione: 'Controllo e rifacimento siliconature', periodicita: 'triennale', mesi: 36 },
  { tipologia: 'bascula', descrizione: 'Pulizia e manutenzione bascula/cancello', periodicita: 'triennale', mesi: 36 },
];

interface DataContextType {
  data: AppData;
  refresh: () => void;
  // Immobili
  addImmobile: (item: Omit<Immobile, 'id' | 'createdAt'>) => Immobile;
  updateImmobile: (id: string, item: Partial<Immobile>) => void;
  deleteImmobile: (id: string) => void;
  // Proprietari
  addProprietario: (item: Omit<Proprietario, 'id' | 'createdAt'>) => void;
  updateProprietario: (id: string, item: Partial<Proprietario>) => void;
  deleteProprietario: (id: string) => void;
  // Inquilini
  addInquilino: (item: Omit<Inquilino, 'id' | 'createdAt'>) => void;
  updateInquilino: (id: string, item: Partial<Inquilino>) => void;
  deleteInquilino: (id: string) => void;
  // Contratti
  addContratto: (item: Omit<Contratto, 'id' | 'createdAt'>) => Contratto;
  updateContratto: (id: string, item: Partial<Contratto>) => void;
  deleteContratto: (id: string) => void;
  // Pagamenti
  addPagamento: (item: Omit<Pagamento, 'id' | 'createdAt'>) => void;
  updatePagamento: (id: string, item: Partial<Pagamento>) => void;
  deletePagamento: (id: string) => void;
  // Manutenzioni
  addManutenzione: (item: Omit<Manutenzione, 'id' | 'createdAt'>) => void;
  updateManutenzione: (id: string, item: Partial<Manutenzione>) => void;
  deleteManutenzione: (id: string) => void;
  // SpeseFisse
  addSpesaFissa: (item: Omit<SpesaFissa, 'id' | 'createdAt'>) => void;
  updateSpesaFissa: (id: string, item: Partial<SpesaFissa>) => void;
  deleteSpesaFissa: (id: string) => void;
  // Lead
  addLead: (item: Omit<Lead, 'id' | 'createdAt'>) => void;
  deleteLead: (id: string) => void;
  // Helpers
  generaPagamentiContratto: (contrattoId: string) => number;
  generaManutenzioniAutomatiche: (immobileId?: string) => number;
}

const DataContext = createContext<DataContextType | null>(null);

// Immobile + sue pertinenze (garage/cantina collegati)
function gruppoImmobile(immobili: Immobile[], immobileId: string): Set<string> {
  const ids = new Set<string>([immobileId]);
  immobili.forEach(i => { if (i.pertinenzaDi === immobileId) ids.add(i.id); });
  return ids;
}

const annoCorrente = () => new Date().getFullYear();

// Allinea le spese fisse IMU/TARI all'immobile (2 rate semestrali, date modificabili in Contabilità)
function syncSpeseImmobile(d: AppData, immobileId: string, soloMancanti = false): AppData {
  const imm = d.immobili.find(i => i.id === immobileId);
  if (!imm) return d;
  let spese = d.speseFisse;
  const config = [
    { tipo: 'imu' as const, annuo: imm.imu || 0, inizio: `${annoCorrente()}-06-16`, label: 'IMU' },
    { tipo: 'tari' as const, annuo: imm.tari || 0, inizio: `${annoCorrente()}-06-30`, label: 'TARI' },
  ];
  for (const { tipo, annuo, inizio, label } of config) {
    const collegata = spese.find(s => s.immobileId === immobileId && s.tipo === tipo && s.origine === 'immobile');
    if (soloMancanti) {
      if (annuo > 0 && !spese.some(s => s.immobileId === immobileId && s.tipo === tipo)) {
        spese = [...spese, {
          id: generateId(), immobileId, tipo, descrizione: `${label} annua €${annuo} (2 rate)`, importo: annuo / 2,
          periodicita: 'semestrale', dataInizio: inizio, attiva: true, origine: 'immobile', note: '', createdAt: new Date().toISOString(),
        }];
      }
      continue;
    }
    if (annuo > 0) {
      const rata = Math.round((annuo / 2) * 100) / 100;
      if (collegata) {
        spese = spese.map(s => s.id === collegata.id
          ? { ...s, importo: rata, periodicita: 'semestrale', attiva: true, descrizione: `${label} annua €${annuo} (2 rate)` }
          : s);
      } else {
        spese = [...spese, {
          id: generateId(), immobileId, tipo, descrizione: `${label} annua €${annuo} (2 rate)`, importo: rata,
          periodicita: 'semestrale', dataInizio: inizio, attiva: true, origine: 'immobile', note: '', createdAt: new Date().toISOString(),
        }];
      }
    } else if (collegata) {
      spese = spese.filter(s => s.id !== collegata.id);
    }
  }
  return spese === d.speseFisse ? d : { ...d, speseFisse: spese };
}

// Allinea tutto ciò che deriva dal contratto: canone sull'immobile, rate non pagate,
// deposito e spese di registrazione (metà a carico inquilino)
function syncContratto(d: AppData, contrattoId: string): AppData {
  const c = d.contratti.find(x => x.id === contrattoId);
  if (!c) return d;
  const now = new Date();
  const canone = canoneEffettivo(c);
  let pagamenti = d.pagamenti.map(p => {
    if (p.contrattoId !== c.id || p.tipoPagamento !== 'canone' || (p.stato !== 'attesa' && p.stato !== 'insoluto')) return p;
    return { ...p, importoDovuto: canone, mora: p.stato === 'insoluto' ? calcolaMora(canone, p.dataScadenza, now) : 0 };
  });

  const upsertAuto = (origine: 'deposito' | 'registrazione', importo: number, build: () => Pagamento) => {
    const esistente = pagamenti.find(p => p.contrattoId === c.id && p.origine === origine);
    if (importo > 0) {
      if (!esistente) pagamenti = [...pagamenti, build()];
      else if (esistente.stato !== 'pagato' || origine === 'deposito') {
        const nuovo = build();
        pagamenti = pagamenti.map(p => p.id === esistente.id
          ? { ...p, tipoPagamento: nuovo.tipoPagamento, importoDovuto: nuovo.importoDovuto, importo: origine === 'deposito' ? nuovo.importo : p.importo, dataScadenza: nuovo.dataScadenza }
          : p);
      }
    } else if (esistente) {
      pagamenti = pagamenti.filter(p => p.id !== esistente.id);
    }
  };

  const depositoAttivo = c.tipoDeposito !== 'nessuno' && c.deposito > 0;
  upsertAuto('deposito', depositoAttivo ? c.deposito : 0, () => ({
    id: generateId(), contrattoId: c.id,
    tipoPagamento: c.tipoDeposito === 'cauzionale' ? 'deposito' : 'fidejussione',
    importo: c.deposito, importoDovuto: c.deposito, dataPagamento: c.dataInizio, dataScadenza: c.dataInizio,
    stato: 'pagato', isDeposito: true, meseRiferimento: c.dataInizio.slice(0, 7), mora: 0, origine: 'deposito',
    note: 'Generato dal contratto', createdAt: now.toISOString(),
  }));

  const metaRegistrazione = Math.round(((c.speseRegistrazione || 0) / 2) * 100) / 100;
  upsertAuto('registrazione', metaRegistrazione, () => ({
    id: generateId(), contrattoId: c.id, tipoPagamento: 'registrazione',
    importo: 0, importoDovuto: metaRegistrazione, dataPagamento: '', dataScadenza: c.dataInizio,
    stato: 'attesa', isDeposito: false, meseRiferimento: c.dataInizio.slice(0, 7), mora: 0, origine: 'registrazione',
    note: `50% spese di registrazione (totale €${c.speseRegistrazione})`, createdAt: now.toISOString(),
  }));

  let immobili = d.immobili;
  if (c.stato === 'attivo') {
    immobili = immobili.map(i => i.id === c.immobileId ? { ...i, prezzoRichiesto: canone } : i);
  }
  return { ...d, pagamenti, immobili };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);
  // Ref always holds the latest data so sequential mutations don't overwrite each other
  const dataRef = useRef<AppData>(data);

  const persist = useCallback((newData: AppData) => {
    dataRef.current = newData;
    setData(newData);
    saveData(newData);
  }, []);

  const refresh = useCallback(() => {
    const loaded = loadData();
    dataRef.current = loaded;
    setData(loaded);
  }, []);

  // Al caricamento: attesa → insoluto se scaduti, mora degli insoluti aggiornata a oggi,
  // IMU/TARI già presenti sugli immobili ma senza spesa fissa collegata
  useEffect(() => {
    const now = new Date();
    let hasChanges = false;
    const updatedPagamenti = data.pagamenti.map(p => {
      if (p.stato === 'attesa' && p.dataScadenza && new Date(p.dataScadenza) < now) {
        hasChanges = true;
        return { ...p, stato: 'insoluto' as StatoPagamento, mora: moraApplicabile(p) ? calcolaMora(p.importoDovuto, p.dataScadenza, now) : 0 };
      }
      if (p.stato === 'insoluto' && moraApplicabile(p)) {
        const mora = calcolaMora(p.importoDovuto, p.dataScadenza, now);
        if (mora !== p.mora) { hasChanges = true; return { ...p, mora }; }
      }
      return p;
    });
    let newData: AppData = { ...data, pagamenti: updatedPagamenti };
    data.immobili.forEach(i => { newData = syncSpeseImmobile(newData, i.id, true); });
    // Canone degli immobili affittati ancora vuoto: lo prende dal contratto attivo
    const immobiliAllineati = newData.immobili.map(i => {
      const att = newData.contratti.find(c => c.immobileId === i.id && c.stato === 'attivo');
      return att && !i.prezzoRichiesto ? { ...i, prezzoRichiesto: canoneEffettivo(att) } : i;
    });
    if (immobiliAllineati.some((i, k) => i !== newData.immobili[k])) { newData = { ...newData, immobili: immobiliAllineati }; hasChanges = true; }
    if (hasChanges || newData.speseFisse !== data.speseFisse) persist(newData);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const makeAdd = (key: keyof AppData) =>
    (item: Record<string, unknown>) => {
      const current = dataRef.current;
      const newItem = { ...item, id: generateId(), createdAt: new Date().toISOString() };
      const arr = current[key] as unknown[];
      const newData = { ...current, [key]: [...arr, newItem] };
      persist(newData);
      return newItem;
    };

  const makeUpdate = (key: keyof AppData) =>
    (id: string, updates: Record<string, unknown>) => {
      const current = dataRef.current;
      const arr = current[key] as Array<{ id: string }>;
      const newData = { ...current, [key]: arr.map(item => item.id === id ? { ...item, ...updates } : item) };
      persist(newData);
    };

  const makeDelete = (key: keyof AppData) =>
    (id: string) => {
      const current = dataRef.current;
      const arr = current[key] as Array<{ id: string }>;
      const newData = { ...current, [key]: arr.filter(item => item.id !== id) };
      persist(newData);
    };

  const addImmobileFn = (item: Omit<Immobile, 'id' | 'createdAt'>): Immobile => {
    const current = dataRef.current;
    const newItem = { ...item, id: generateId(), createdAt: new Date().toISOString() } as Immobile;
    persist(syncSpeseImmobile({ ...current, immobili: [...current.immobili, newItem] }, newItem.id));
    return newItem;
  };

  const updateImmobileFn = (id: string, updates: Partial<Immobile>) => {
    const current = dataRef.current;
    const newData = { ...current, immobili: current.immobili.map(i => i.id === id ? { ...i, ...updates } : i) };
    persist(syncSpeseImmobile(newData, id));
  };

  const deleteImmobileFn = (id: string) => {
    const current = dataRef.current;
    persist({
      ...current,
      immobili: current.immobili.filter(i => i.id !== id).map(i => i.pertinenzaDi === id ? { ...i, pertinenzaDi: '' } : i),
      speseFisse: current.speseFisse.filter(s => !(s.immobileId === id && s.origine === 'immobile')),
    });
  };

  const deleteContrattoFn = (id: string) => {
    const current = dataRef.current;
    persist({
      ...current,
      contratti: current.contratti.filter(c => c.id !== id),
      pagamenti: current.pagamenti.filter(p => !(p.contrattoId === id && p.origine)),
    });
  };

  const addContrattoFn = (item: Omit<Contratto, 'id' | 'createdAt'>): Contratto => {
    const current = dataRef.current;
    const newItem = { ...item, id: generateId(), createdAt: new Date().toISOString() } as Contratto;
    const gruppo = gruppoImmobile(current.immobili, item.immobileId);
    const updatedImmobili = item.stato === 'attivo' && item.immobileId
      ? current.immobili.map(i => gruppo.has(i.id) ? { ...i, stato: 'affittato' as const } : i)
      : current.immobili;
    const newData = syncContratto({ ...current, contratti: [...current.contratti, newItem], immobili: updatedImmobili }, newItem.id);
    persist(newData);

    if (item.pagamentiAutomatici && item.stato === 'attivo') {
      setTimeout(() => generaPagamentiContrattoInternal(newItem.id, dataRef.current), 0);
    }
    return newItem;
  };

  const updateContrattoFn = (id: string, updates: Partial<Contratto>) => {
    const current = dataRef.current;
    const contratto = current.contratti.find(c => c.id === id);
    if (!contratto) return;
    const updatedContratto = { ...contratto, ...updates };
    let updatedImmobili = current.immobili;
    if (updates.stato !== undefined && updatedContratto.immobileId) {
      const gruppo = gruppoImmobile(current.immobili, updatedContratto.immobileId);
      updatedImmobili = current.immobili.map(i => {
        if (!gruppo.has(i.id)) return i;
        if (updates.stato === 'attivo') return { ...i, stato: 'affittato' as const };
        const hasOtherActive = current.contratti.some(c => c.id !== id && gruppo.has(c.immobileId) && c.stato === 'attivo');
        return hasOtherActive ? i : { ...i, stato: 'libero' as const };
      });
    }
    const newData = syncContratto({
      ...current,
      contratti: current.contratti.map(c => c.id === id ? updatedContratto : c),
      immobili: updatedImmobili,
    }, id);
    persist(newData);
  };

  function generaPagamentiContrattoInternal(contrattoId: string, currentData: AppData): number {
    const contratto = currentData.contratti.find(c => c.id === contrattoId);
    if (!contratto) return 0;

    const start = new Date(contratto.dataInizio);
    const end = contratto.dataFine
      ? new Date(contratto.dataFine)
      : new Date(start.getFullYear() + 4, start.getMonth(), start.getDate());

    const now = new Date();
    const maxDate = new Date(now.getFullYear(), now.getMonth() + 3, 1); // genera fino a 3 mesi nel futuro
    const limit = end < maxDate ? end : maxDate;

    const nuoviPagamenti: Pagamento[] = [];
    // Se il contratto inizia dopo il 5 (data scadenza canone), il primo pagamento spetta al mese successivo
    const firstPayMonth = start.getDate() > 5
      ? new Date(start.getFullYear(), start.getMonth() + 1, 1)
      : new Date(start.getFullYear(), start.getMonth(), 1);
    const current = new Date(firstPayMonth);
    const canoneAdeguato = canoneEffettivo(contratto);

    while (current <= limit) {
      const meseRif = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const exists = currentData.pagamenti.some(
        p => p.contrattoId === contrattoId && p.meseRiferimento === meseRif && p.tipoPagamento === 'canone'
      );
      if (!exists) {
        const dataScadenza = new Date(current.getFullYear(), current.getMonth(), 5);
        const isScaduto = dataScadenza < now;
        nuoviPagamenti.push({
          id: generateId(),
          contrattoId,
          tipoPagamento: 'canone',
          importo: 0,
          importoDovuto: canoneAdeguato,
          dataPagamento: '',
          dataScadenza: dataScadenza.toISOString().slice(0, 10),
          stato: isScaduto ? 'insoluto' : 'attesa',
          isDeposito: false,
          meseRiferimento: meseRif,
          mora: isScaduto ? calcolaMora(canoneAdeguato, dataScadenza.toISOString().slice(0, 10), now) : 0,
          note: '',
          createdAt: new Date().toISOString(),
        });
      }
      current.setMonth(current.getMonth() + 1);
    }

    if (nuoviPagamenti.length > 0) {
      const newData = { ...currentData, pagamenti: [...currentData.pagamenti, ...nuoviPagamenti] };
      persist(newData);
    }
    return nuoviPagamenti.length;
  }

  const generaPagamentiContratto = useCallback((contrattoId: string): number => {
    return generaPagamentiContrattoInternal(contrattoId, dataRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generaManutenzioniAutomatiche = useCallback((immobileId?: string): number => {
    const current = dataRef.current;
    const target = immobileId ? current.immobili.filter(i => i.id === immobileId) : current.immobili;
    const nuove: Manutenzione[] = [];
    const now = new Date();

    for (const imm of target) {
      for (const tipo of MANUTENZIONI_AUTO) {
        const pending = current.manutenzioni.find(
          m => m.immobileId === imm.id && m.tipologia === tipo.tipologia && m.stato !== 'completata' && m.isAutomatica
        );
        if (!pending) {
          const lastCompleted = current.manutenzioni
            .filter(m => m.immobileId === imm.id && m.tipologia === tipo.tipologia && m.stato === 'completata' && m.isAutomatica)
            .sort((a, b) => b.dataCompletamento.localeCompare(a.dataCompletamento))[0];

          let dataScadenza: Date;
          if (lastCompleted?.dataCompletamento) {
            dataScadenza = new Date(lastCompleted.dataCompletamento);
            dataScadenza.setMonth(dataScadenza.getMonth() + tipo.mesi);
          } else {
            dataScadenza = new Date(imm.createdAt);
            dataScadenza.setMonth(dataScadenza.getMonth() + tipo.mesi);
          }

          nuove.push({
            id: generateId(),
            immobileId: imm.id,
            descrizione: tipo.descrizione,
            tipologia: tipo.tipologia,
            periodicita: tipo.periodicita,
            isAutomatica: true,
            tecnico: '',
            costo: 0,
            stato: 'aperta',
            dataSegnalazione: now.toISOString().slice(0, 10),
            dataScadenza: dataScadenza.toISOString().slice(0, 10),
            dataCompletamento: '',
            note: '',
            createdAt: now.toISOString(),
          });
        }
      }
    }

    if (nuove.length > 0) {
      const newData = { ...current, manutenzioni: [...current.manutenzioni, ...nuove] };
      persist(newData);
    }
    return nuove.length;
  }, [persist]);

  const updateManutenzioneConRinnovo = (id: string, updates: Partial<Manutenzione>) => {
    const current = dataRef.current;
    const man = current.manutenzioni.find(m => m.id === id);
    const updated = { ...man, ...updates } as Manutenzione;
    const arr = current.manutenzioni.map(m => m.id === id ? updated : m);
    let newPagamenti = current.pagamenti;

    // Se una manutenzione automatica viene completata, programma la prossima
    if (updates.stato === 'completata' && updated.isAutomatica) {
      const tipo = MANUTENZIONI_AUTO.find(t => t.tipologia === updated.tipologia);
      if (tipo) {
        const dataCompletata = new Date(updates.dataCompletamento || new Date().toISOString().slice(0, 10));
        const prossima = new Date(dataCompletata);
        prossima.setMonth(prossima.getMonth() + tipo.mesi);
        const next: Manutenzione = {
          id: generateId(),
          immobileId: updated.immobileId,
          descrizione: tipo.descrizione,
          tipologia: tipo.tipologia,
          periodicita: tipo.periodicita,
          isAutomatica: true,
          tecnico: '',
          costo: 0,
          stato: 'aperta',
          dataSegnalazione: new Date().toISOString().slice(0, 10),
          dataScadenza: prossima.toISOString().slice(0, 10),
          dataCompletamento: '',
          note: '',
          createdAt: new Date().toISOString(),
        };
        arr.push(next);
      }
    }

    const newData = { ...current, manutenzioni: arr, pagamenti: newPagamenti };
    persist(newData);
  };

  const value: DataContextType = {
    data,
    refresh,
    addImmobile: addImmobileFn,
    updateImmobile: updateImmobileFn,
    deleteImmobile: deleteImmobileFn,
    addProprietario: makeAdd('proprietari') as any,
    updateProprietario: makeUpdate('proprietari') as any,
    deleteProprietario: makeDelete('proprietari'),
    addInquilino: makeAdd('inquilini') as any,
    updateInquilino: makeUpdate('inquilini') as any,
    deleteInquilino: makeDelete('inquilini'),
    addContratto: addContrattoFn,
    updateContratto: updateContrattoFn,
    deleteContratto: deleteContrattoFn,
    addPagamento: makeAdd('pagamenti') as any,
    updatePagamento: makeUpdate('pagamenti') as any,
    deletePagamento: makeDelete('pagamenti'),
    addManutenzione: makeAdd('manutenzioni') as any,
    updateManutenzione: updateManutenzioneConRinnovo,
    deleteManutenzione: makeDelete('manutenzioni'),
    addSpesaFissa: makeAdd('speseFisse') as any,
    updateSpesaFissa: makeUpdate('speseFisse') as any,
    deleteSpesaFissa: makeDelete('speseFisse'),
    addLead: makeAdd('lead') as any,
    deleteLead: makeDelete('lead'),
    generaPagamentiContratto,
    generaManutenzioniAutomatiche,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
