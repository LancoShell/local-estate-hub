import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AppData, Immobile, Proprietario, Inquilino, Contratto, Pagamento, Manutenzione, Lead } from '@/lib/types';
import { loadData, saveData, generateId } from '@/lib/dataStore';

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
  addContratto: (item: Omit<Contratto, 'id' | 'createdAt'>) => void;
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
  // Lead
  addLead: (item: Omit<Lead, 'id' | 'createdAt'>) => void;
  deleteLead: (id: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);

  const persist = useCallback((newData: AppData) => {
    setData(newData);
    saveData(newData);
  }, []);

  const refresh = useCallback(() => setData(loadData()), []);

  const makeAdd = (key: keyof AppData) =>
    (item: Record<string, unknown>) => {
      const newItem = { ...item, id: generateId(), createdAt: new Date().toISOString() };
      const arr = data[key] as unknown[];
      const newData = { ...data, [key]: [...arr, newItem] };
      persist(newData);
    };

  const makeUpdate = (key: keyof AppData) =>
    (id: string, updates: Record<string, unknown>) => {
      const arr = data[key] as Array<{ id: string }>;
      const newData = { ...data, [key]: arr.map(item => item.id === id ? { ...item, ...updates } : item) };
      persist(newData);
    };

  const makeDelete = (key: keyof AppData) =>
    (id: string) => {
      const arr = data[key] as Array<{ id: string }>;
      const newData = { ...data, [key]: arr.filter(item => item.id !== id) };
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
    addContratto: makeAdd('contratti') as any,
    updateContratto: makeUpdate('contratti') as any,
    deleteContratto: makeDelete('contratti'),
    addPagamento: makeAdd('pagamenti') as any,
    updatePagamento: makeUpdate('pagamenti') as any,
    deletePagamento: makeDelete('pagamenti'),
    addManutenzione: makeAdd('manutenzioni') as any,
    updateManutenzione: makeUpdate('manutenzioni') as any,
    deleteManutenzione: makeDelete('manutenzioni'),
    addLead: makeAdd('lead') as any,
    deleteLead: makeDelete('lead'),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
