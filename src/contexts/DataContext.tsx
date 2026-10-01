import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  AppData, Immobile, Proprietario, Inquilino, Contratto, Pagamento,
  Manutenzione, Lead, SpesaFissa, StatoPagamento, TipologiaManutenzione, PeriodicitaManutenzione,
  TipoSpesa, PeriodicitaSpesa,
} from '@/lib/types';
import { loadData, saveData, generateId } from '@/lib/dataStore';
import { calcolaMora, canoneAdeguato, fmtData, giorniRitardo, moraAttuale, parseData } from '@/lib/calc';

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
  pagaPagamento: (id: string) => number;
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

const SPESE_IMMOBILE: Array<{
  key: 'imu' | 'tari' | 'bollette'; tipo: TipoSpesa; periodicita: PeriodicitaSpesa;
  descrizione: string; mmgg: string; importo: (i: Immobile) => number;
}> = [
  { key: 'imu', tipo: 'imu', periodicita: 'semestrale', descrizione: 'IMU (acconto 16/6 e saldo 16/12)', mmgg: '06-16', importo: i => (i.imu || 0) / 2 },
  { key: 'tari', tipo: 'tari', periodicita: 'semestrale', descrizione: 'TARI (2 rate)', mmgg: '04-30', importo: i => (i.tari || 0) / 2 },
  { key: 'bollette', tipo: 'bolletta', periodicita: 'mensile', descrizione: 'Bollette', mmgg: '01-01', importo: i => i.bollette || 0 },
];

/** Allinea le spese fisse generate (IMU, TARI, bollette) ai valori dell'immobile. */
function syncSpeseImmobile(d: AppData, immobileId: string): AppData {
  const imm = d.immobili.find(i => i.id === immobileId);
  if (!imm) return d;
  let spese = d.speseFisse;
  const anno = new Date().getFullYear();
  for (const def of SPESE_IMMOBILE) {
    const importo = def.importo(imm);
    const existing = spese.find(s => s.immobileId === immobileId && s.autoKey === def.key);
    if (importo > 0) {
      if (existing) {
        if (existing.importo !== importo || !existing.attiva) {
          spese = spese.map(s => s === existing ? { ...s, importo, attiva: true } : s);
        }
      } else {
        spese = [...spese, {
          id: generateId(), immobileId, tipo: def.tipo, descrizione: def.descrizione, importo,
          periodicita: def.periodicita, dataInizio: `${anno}-${def.mmgg}`, attiva: true,
          autoKey: def.key, note: "Generata dai dati dell'immobile", createdAt: new Date().toISOString(),
        }];
      }
    } else if (existing) {
      spese = spese.filter(s => s !== existing);
    }
  }
  return spese === d.speseFisse ? d : { ...d, speseFisse: spese };
}

/** Ricalcola stato (attesa -> insoluto) e mora dei pagamenti non saldati. */
function aggiornaMoraPagamenti(pagamenti: Pagamento[], oggi = new Date()): Pagamento[] {
  let changed = false;
  const out = pagamenti.map(p => {
    if (p.isDeposito || p.stato === 'pagato' || !p.dataScadenza) return p;
    const scaduto = giorniRitardo(p.dataScadenza, oggi) > 0;
    const stato: StatoPagamento = scaduto && p.stato === 'attesa' ? 'insoluto' : p.stato;
    const mora = scaduto ? moraAttuale(p, oggi) : 0;
    if (stato === p.stato && mora === p.mora) return p;
    changed = true;
    return { ...p, stato, mora };
  });
  return changed ? out : pagamenti;
}

/** Allinea al contratto: canone sull'immobile, rate non pagate, deposito e spese di registrazione. */
function syncContratto(d: AppData, contrattoId: string, ricalcolaRate: boolean): AppData {
  const c = d.contratti.find(x => x.id === contrattoId);
  if (!c) return d;
  const now = new Date().toISOString();
  let { immobili, pagamenti } = d;

  if (c.stato === 'attivo' && c.canone > 0 && c.immobileId) {
    immobili = immobili.map(i => i.id === c.immobileId ? { ...i, prezzoRichiesto: c.canone } : i);
  }

  if (ricalcolaRate) {
    const dovuto = canoneAdeguato(c);
    pagamenti = pagamenti.map(p =>
      p.contrattoId === c.id && p.tipoPagamento === 'canone' && (p.stato === 'attesa' || p.stato === 'insoluto')
        ? { ...p, importoDovuto: dovuto } : p);
  }

  // Deposito / fidejussione
  const depositoDa = c.tipoDeposito !== 'nessuno' && c.deposito > 0;
  const dep = pagamenti.find(p => p.contrattoId === c.id && p.autoKey === 'deposito');
  if (depositoDa) {
    const tipoPagamento = c.tipoDeposito === 'cauzionale' ? 'deposito' as const : 'fidejussione' as const;
    if (dep) {
      pagamenti = pagamenti.map(p => p === dep
        ? { ...p, tipoPagamento, importoDovuto: c.deposito, importo: p.stato === 'pagato' ? c.deposito : p.importo } : p);
    } else {
      pagamenti = [...pagamenti, {
        id: generateId(), contrattoId: c.id, tipoPagamento, importo: c.deposito, importoDovuto: c.deposito,
        dataPagamento: c.dataInizio, dataScadenza: c.dataInizio, stato: 'pagato', isDeposito: true,
        meseRiferimento: c.dataInizio.slice(0, 7), mora: 0, autoKey: 'deposito',
        note: 'Registrato automaticamente dal contratto', createdAt: now,
      }];
    }
  } else if (dep) {
    pagamenti = pagamenti.filter(p => p !== dep);
  }

  // Spese di registrazione: 50% a carico dell'inquilino, da versare come rata
  const reg = pagamenti.find(p => p.contrattoId === c.id && p.autoKey === 'registrazione');
  if (c.speseRegistrazione > 0) {
    const meta = Math.round(c.speseRegistrazione / 2 * 100) / 100;
    if (reg) {
      pagamenti = pagamenti.map(p => p === reg
        ? { ...p, importoDovuto: meta, importo: p.stato === 'pagato' ? meta : p.importo } : p);
    } else {
      const scad = parseData(c.dataInizio);
      scad.setDate(scad.getDate() + 30); // l'imposta di registro si versa entro 30 giorni dalla stipula
      pagamenti = [...pagamenti, {
        id: generateId(), contrattoId: c.id, tipoPagamento: 'registrazione', importo: 0, importoDovuto: meta,
        dataPagamento: '', dataScadenza: fmtData(scad), stato: 'attesa', isDeposito: false,
        meseRiferimento: c.dataInizio.slice(0, 7), mora: 0, autoKey: 'registrazione',
        note: "50% delle spese di registrazione a carico dell'inquilino", createdAt: now,
      }];
    }
  } else if (reg) {
    pagamenti = pagamenti.filter(p => p !== reg);
  }

  pagamenti = aggiornaMoraPagamenti(pagamenti);
  return { ...d, immobili, pagamenti };
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

  // All'avvio: aggiorna stato/mora dei pagamenti scaduti e allinea le spese fisse degli immobili
  useEffect(() => {
    const before = dataRef.current;
    let d = { ...before, pagamenti: aggiornaMoraPagamenti(before.pagamenti) };
    d.immobili.forEach(i => { d = syncSpeseImmobile(d, i.id); });
    if (d.pagamenti !== before.pagamenti || d.speseFisse !== before.speseFisse) persist(d);
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
      immobili: current.immobili.filter(i => i.id !== id).map(i => i.immobilePrincipaleId === id ? { ...i, immobilePrincipaleId: undefined } : i),
      speseFisse: current.speseFisse.filter(s => !(s.immobileId === id && s.autoKey)),
    });
  };

  /** Salda un pagamento: importo = rata + mora maturata alla data di oggi. */
  const pagaPagamento = (id: string): number => {
    const current = dataRef.current;
    const p = current.pagamenti.find(x => x.id === id);
    if (!p) return 0;
    const mora = moraAttuale(p);
    const totale = Math.round((p.importoDovuto + mora) * 100) / 100;
    persist({
      ...current,
      pagamenti: current.pagamenti.map(x => x.id === id
        ? { ...x, stato: 'pagato' as const, mora, importo: totale, dataPagamento: fmtData(new Date()) } : x),
    });
    return totale;
  };

  const addContrattoFn = (item: Omit<Contratto, 'id' | 'createdAt'>): Contratto => {
    const current = dataRef.current;
    const newItem = { ...item, id: generateId(), createdAt: new Date().toISOString() } as Contratto;
    const updatedImmobili = item.stato === 'attivo' && item.immobileId
      ? current.immobili.map(i => i.id === item.immobileId ? { ...i, stato: 'affittato' as const } : i)
      : current.immobili;
    const newData = { ...current, contratti: [...current.contratti, newItem], immobili: updatedImmobili };
    persist(syncContratto(newData, newItem.id, false));

    if (item.pagamentiAutomatici && item.stato === 'attivo') {
      generaPagamentiContrattoInternal(newItem.id, dataRef.current);
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
      updatedImmobili = current.immobili.map(i => {
        if (i.id !== updatedContratto.immobileId) return i;
        if (updates.stato === 'attivo') return { ...i, stato: 'affittato' as const };
        const hasOtherActive = current.contratti.some(c => c.id !== id && c.immobileId === i.id && c.stato === 'attivo');
        return hasOtherActive ? i : { ...i, stato: 'libero' as const };
      });
    }
    const newData = {
      ...current,
      contratti: current.contratti.map(c => c.id === id ? updatedContratto : c),
      immobili: updatedImmobili,
    };
    const ricalcola = updates.canone !== undefined || updates.adeguamentoIstat !== undefined || updates.quotaIstat !== undefined;
    persist(syncContratto(newData, id, ricalcola));
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
    const canoneMese = canoneAdeguato(contratto);

    while (current <= limit) {
      const meseRif = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const exists = currentData.pagamenti.some(
        p => p.contrattoId === contrattoId && p.meseRiferimento === meseRif && p.tipoPagamento === 'canone'
      );
      if (!exists) {
        const dataScadenza = new Date(current.getFullYear(), current.getMonth(), 5);
        const isScaduto = dataScadenza < now;
        const giorni = giorniRitardo(fmtData(dataScadenza), now);
        nuoviPagamenti.push({
          id: generateId(),
          contrattoId,
          tipoPagamento: 'canone',
          importo: 0,
          importoDovuto: canoneMese,
          dataPagamento: '',
          dataScadenza: fmtData(dataScadenza),
          stato: isScaduto ? 'insoluto' : 'attesa',
          isDeposito: false,
          meseRiferimento: meseRif,
          mora: isScaduto ? calcolaMora(canoneMese, giorni) : 0,
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
    deleteContratto: makeDelete('contratti'),
    addPagamento: makeAdd('pagamenti') as any,
    updatePagamento: makeUpdate('pagamenti') as any,
    deletePagamento: makeDelete('pagamenti'),
    pagaPagamento,
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
