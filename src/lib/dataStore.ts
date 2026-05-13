import { AppData, StatoPagamento } from './types';

const STORAGE_KEY = 'gestionale_immobiliare_data';

const defaultData: AppData = {
  immobili: [],
  proprietari: [],
  inquilini: [],
  contratti: [],
  pagamenti: [],
  manutenzioni: [],
  speseFisse: [],
  lead: [],
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const stored = JSON.parse(raw) as AppData;
    // Migrate existing data with defaults for new fields
    return {
      ...defaultData,
      ...stored,
      speseFisse: stored.speseFisse ?? [],
      immobili: (stored.immobili ?? []).map(i => ({
        valoreAcquisto: 0, valoreAttuale: 0, imu: 0, tari: 0, bollette: 0, speseBonifica: 0, allegati: [],
        ...i,
      })),
      inquilini: (stored.inquilini ?? []).map(i => ({
        tipoSoggetto: 'persona_fisica' as const, ragioneSociale: '', partitaIva: '', pec: '',
        ...i,
      })),
      contratti: (stored.contratti ?? []).map(c => ({
        tipoCedolare: 'ordinario' as const, aliquotaCedolare: 21, tipoDeposito: 'cauzionale' as const,
        fidejussione: 0, pagamentiAutomatici: false,
        ...c,
      })),
      pagamenti: (stored.pagamenti ?? []).map(p => ({
        tipoPagamento: 'canone' as const, isDeposito: false, meseRiferimento: '',
        ...p,
        stato: (['pagato', 'parziale', 'insoluto', 'attesa'].includes(p.stato) ? p.stato : 'attesa') as StatoPagamento,
      })),
      manutenzioni: (stored.manutenzioni ?? []).map(m => ({
        tipologia: 'altro' as const, periodicita: 'una_tantum' as const, isAutomatica: false, dataScadenza: '',
        ...m,
      })),
    };
  } catch {
    return { ...defaultData };
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function exportBackup(): void {
  const data = loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_immobiliare_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as AppData;
        saveData(data);
        resolve(data);
      } catch {
        reject(new Error('File JSON non valido'));
      }
    };
    reader.onerror = () => reject(new Error('Errore lettura file'));
    reader.readAsText(file);
  });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
