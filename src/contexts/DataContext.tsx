import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  AppData, Immobile, Proprietario, Inquilino, Contratto, Pagamento,
  Manutenzione, Lead, SpesaFissa, StatoPagamento, TipologiaManutenzione, PeriodicitaManutenzione,
} from '@/lib/types';
import { loadData, saveData, generateId } from '@/lib/dataStore';

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
  addImmobile: (item: Omit<Immobile, 'id' | 'createdAt'>) => void;
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

function calcolaMoraGiorni(importoDovuto: number, giorni: number): number {
  return Math.round(importoDovuto * 0.02 * (giorni / 30));
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

  // Auto-aggiorna pagamenti scaduti (attesa → insoluto) al caricamento
  useEffect(() => {
    const now = new Date();
    let hasChanges = false;
    const updatedPagamenti = data.pagamenti.map(p => {
      if (p.stato === 'attesa' && p.dataScadenza && new Date(p.dataScadenza) < now) {
        const diffDays = Math.floor((now.getTime() - new Date(p.dataScadenza).getTime()) / 86400000);
        const mora = calcolaMoraGiorni(p.importoDovuto, diffDays);
        hasChanges = true;
        return { ...p, stato: 'insoluto' as StatoPagamento, mora };
      }
      return p;
    });
    if (hasChanges) {
      const newData = { ...data, pagamenti: updatedPagamenti };
      setData(newData);
      saveData(newData);
    }
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

  const addContrattoFn = (item: Omit<Contratto, 'id' | 'createdAt'>): Contratto => {
    const current = dataRef.current;
    const newItem = { ...item, id: generateId(), createdAt: new Date().toISOString() } as Contratto;
    const updatedImmobili = item.stato === 'attivo' && item.immobileId
      ? current.immobili.map(i => i.id === item.immobileId ? { ...i, stato: 'affittato' as const } : i)
      : current.immobili;
    const newData = { ...current, contratti: [...current.contratti, newItem], immobili: updatedImmobili };
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
    const canoneAdeguato = contratto.canone * (1 + (contratto.adeguamentoIstat || 0) / 100);

    while (current <= limit) {
      const meseRif = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const exists = currentData.pagamenti.some(
        p => p.contrattoId === contrattoId && p.meseRiferimento === meseRif && p.tipoPagamento === 'canone'
      );
      if (!exists) {
        const dataScadenza = new Date(current.getFullYear(), current.getMonth(), 5);
        const isScaduto = dataScadenza < now;
        const giorni = isScaduto ? Math.floor((now.getTime() - dataScadenza.getTime()) / 86400000) : 0;
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
          mora: isScaduto ? calcolaMoraGiorni(canoneAdeguato, giorni) : 0,
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
    addImmobile: makeAdd('immobili') as any,
    updateImmobile: makeUpdate('immobili') as any,
    deleteImmobile: makeDelete('immobili'),
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
