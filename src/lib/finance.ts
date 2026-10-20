import { Contratto, Pagamento, Proprietario, SpesaFissa } from './types';

// Mora: 2% dell'importo dovuto per ogni 30 giorni di ritardo (proporzionale ai giorni)
export const TASSO_MORA_MENSILE = 0.02;

export function giorniRitardo(dataScadenza: string, rif: Date = new Date()): number {
  if (!dataScadenza) return 0;
  return Math.max(0, Math.floor((rif.getTime() - new Date(dataScadenza).getTime()) / 86400000));
}

export function calcolaMora(importoDovuto: number, dataScadenza: string, rif: Date = new Date()): number {
  return Math.round(importoDovuto * TASSO_MORA_MENSILE * (giorniRitardo(dataScadenza, rif) / 30));
}

// La mora non si applica alle spese di registrazione né ai depositi
export function moraApplicabile(p: Pick<Pagamento, 'tipoPagamento' | 'isDeposito'>): boolean {
  return !p.isDeposito && p.tipoPagamento !== 'registrazione';
}

// Totale da incassare per un pagamento non saldato (rata + mora aggiornata a oggi)
export function totaleDaIncassare(p: Pagamento, rif: Date = new Date()): number {
  const mora = p.stato === 'insoluto' && moraApplicabile(p) ? calcolaMora(p.importoDovuto, p.dataScadenza, rif) : 0;
  return p.importoDovuto + mora;
}

export function canoneEffettivo(c: Pick<Contratto, 'canone' | 'adeguamentoIstat'>): number {
  return Math.round(c.canone * (1 + (c.adeguamentoIstat || 0) / 100) * 100) / 100;
}

export function nomeProprietario(p?: Pick<Proprietario, 'tipoSoggetto' | 'ragioneSociale' | 'nome' | 'cognome'>): string {
  if (!p) return '—';
  return p.tipoSoggetto === 'azienda' ? p.ragioneSociale : `${p.nome} ${p.cognome}`.trim();
}

export const MESI_PERIODICITA = { mensile: 1, trimestrale: 3, semestrale: 6, annuale: 12 } as const;

const aggiungiMesi = (iso: string, mesi: number): string => {
  const d = new Date(iso + 'T00:00:00');
  const giorno = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + mesi);
  d.setDate(Math.min(giorno, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Prossima scadenza non ancora pagata di una spesa fissa
export function prossimaScadenzaSpesa(s: Pick<SpesaFissa, 'dataInizio' | 'createdAt' | 'periodicita' | 'pagataFinoA'>): string {
  const inizio = s.dataInizio || s.createdAt.slice(0, 10);
  return s.pagataFinoA ? aggiungiMesi(s.pagataFinoA, MESI_PERIODICITA[s.periodicita]) : inizio;
}
