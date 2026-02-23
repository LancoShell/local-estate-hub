export type StatoImmobile = 'libero' | 'affittato' | 'manutenzione';
export type ClasseEnergetica = 'A4' | 'A3' | 'A2' | 'A1' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type TipologiaImmobile = 'appartamento' | 'villa' | 'ufficio' | 'negozio' | 'magazzino' | 'box' | 'altro';
export type StatoPagamento = 'pagato' | 'parziale' | 'insoluto';
export type StatoContratto = 'attivo' | 'scaduto' | 'disdetto';
export type StatoManutenzione = 'aperta' | 'in_corso' | 'completata';

export interface Immobile {
  id: string;
  codice: string;
  tipologia: TipologiaImmobile;
  indirizzo: string;
  citta: string;
  cap: string;
  mq: number;
  vani: number;
  stato: StatoImmobile;
  classeEnergetica: ClasseEnergetica;
  datiCatastali: string;
  prezzoRichiesto: number;
  speseCondominiali: number;
  note: string;
  proprietarioId: string;
  createdAt: string;
}

export interface Proprietario {
  id: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  email: string;
  telefono: string;
  indirizzo: string;
  iban: string;
  percentualeProprietà: number;
  note: string;
  createdAt: string;
}

export interface Inquilino {
  id: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  email: string;
  telefono: string;
  indirizzo: string;
  reddito: number;
  referenze: string;
  note: string;
  createdAt: string;
}

export interface Contratto {
  id: string;
  immobileId: string;
  inquilinoId: string;
  proprietarioId: string;
  dataInizio: string;
  dataFine: string;
  canone: number;
  deposito: number;
  stato: StatoContratto;
  adeguamentoIstat: number;
  note: string;
  createdAt: string;
}

export interface Pagamento {
  id: string;
  contrattoId: string;
  importo: number;
  importoDovuto: number;
  dataPagamento: string;
  dataScadenza: string;
  stato: StatoPagamento;
  mora: number;
  note: string;
  createdAt: string;
}

export interface Manutenzione {
  id: string;
  immobileId: string;
  descrizione: string;
  tecnico: string;
  costo: number;
  stato: StatoManutenzione;
  dataSegnalazione: string;
  dataCompletamento: string;
  note: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  interesse: string;
  immobileId: string;
  note: string;
  createdAt: string;
}

export interface AppData {
  immobili: Immobile[];
  proprietari: Proprietario[];
  inquilini: Inquilino[];
  contratti: Contratto[];
  pagamenti: Pagamento[];
  manutenzioni: Manutenzione[];
  lead: Lead[];
}
