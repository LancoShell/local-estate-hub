export type StatoImmobile = 'libero' | 'affittato' | 'manutenzione';
export type ClasseEnergetica = 'A4' | 'A3' | 'A2' | 'A1' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type TipologiaImmobile = 'appartamento' | 'villa' | 'ufficio' | 'negozio' | 'magazzino' | 'box' | 'altro';
export type StatoPagamento = 'pagato' | 'parziale' | 'insoluto' | 'attesa';
export type StatoContratto = 'attivo' | 'scaduto' | 'disdetto';
export type StatoManutenzione = 'aperta' | 'in_corso' | 'completata';
export type TipoSoggetto = 'persona_fisica' | 'azienda';
export type TipoCedolare = 'cedolare_secca' | 'cedolare_concordato' | 'adeguamento_istat' | 'ordinario';
export type TipoDeposito = 'cauzionale' | 'fidejussione_danni' | 'fidejussione_affitto' | 'nessuno';
export type TipoPagamento = 'canone' | 'deposito' | 'fidejussione' | 'imu' | 'tari' | 'bolletta' | 'condominio' | 'manutenzione' | 'altro';
export type TipoSpesa = 'imu' | 'tari' | 'bolletta' | 'condominio' | 'bonifica' | 'altro';
export type PeriodicitaSpesa = 'mensile' | 'trimestrale' | 'semestrale' | 'annuale';
export type TipologiaManutenzione = 'caldaia' | 'filtri' | 'caditoie' | 'serramenti' | 'siliconature' | 'bascula' | 'altro';
export type PeriodicitaManutenzione = 'annuale' | 'triennale' | 'una_tantum';

export interface Allegato {
  id: string;
  nome: string;
  tipo: string;
  dati: string; // base64
  dimensione: number;
  createdAt: string;
}

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
  valoreAcquisto: number;
  valoreAttuale: number;
  imu: number;
  tari: number;
  bollette: number;
  speseBonifica: number;
  allegati: Allegato[];
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
  tipoSoggetto: TipoSoggetto;
  nome: string;
  cognome: string;
  ragioneSociale: string;
  codiceFiscale: string;
  partitaIva: string;
  pec: string;
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
  tipoDeposito: TipoDeposito;
  fidejussione: number;
  stato: StatoContratto;
  tipoCedolare: TipoCedolare;
  aliquotaCedolare: number;
  adeguamentoIstat: number;
  pagamentiAutomatici: boolean;
  note: string;
  createdAt: string;
}

export interface Pagamento {
  id: string;
  contrattoId: string;
  tipoPagamento: TipoPagamento;
  importo: number;
  importoDovuto: number;
  dataPagamento: string;
  dataScadenza: string;
  stato: StatoPagamento;
  isDeposito: boolean;
  meseRiferimento: string;
  mora: number;
  note: string;
  createdAt: string;
}

export interface Manutenzione {
  id: string;
  immobileId: string;
  descrizione: string;
  tipologia: TipologiaManutenzione;
  periodicita: PeriodicitaManutenzione;
  isAutomatica: boolean;
  tecnico: string;
  costo: number;
  stato: StatoManutenzione;
  dataSegnalazione: string;
  dataScadenza: string;
  dataCompletamento: string;
  note: string;
  createdAt: string;
}

export interface SpesaFissa {
  id: string;
  immobileId: string;
  tipo: TipoSpesa;
  descrizione: string;
  importo: number;
  periodicita: PeriodicitaSpesa;
  dataInizio: string;
  attiva: boolean;
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
  speseFisse: SpesaFissa[];
  lead: Lead[];
}
