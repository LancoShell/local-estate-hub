import { Contratto, Pagamento, Proprietario } from './types';

export const MORA_PERCENTUALE_MENSILE = 0.02;

export function nomeProprietario(p?: Pick<Proprietario, 'tipoSoggetto' | 'nome' | 'cognome' | 'ragioneSociale'> | null): string {
  if (!p) return '—';
  return p.tipoSoggetto === 'azienda' ? p.ragioneSociale : `${p.nome} ${p.cognome}`.trim();
}

/** Canone mensile con adeguamento ISTAT: variazione annua × quota applicata (di norma 75%). */
export function canoneAdeguato(c: Pick<Contratto, 'canone' | 'adeguamentoIstat' | 'quotaIstat'>): number {
  const variazione = (c.adeguamentoIstat || 0) * ((c.quotaIstat ?? 75) / 100);
  return Math.round(c.canone * (1 + variazione / 100) * 100) / 100;
}

export function giorniRitardo(dataScadenza: string, oggi = new Date()): number {
  if (!dataScadenza) return 0;
  const [y, m, d] = dataScadenza.split('-').map(Number);
  const scad = new Date(y, m - 1, d);
  const start = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  return Math.max(0, Math.floor((start.getTime() - scad.getTime()) / 86400000));
}

/** Mora: 2% al mese sull'importo dovuto, in proporzione ai giorni di ritardo (giorni/30). */
export function calcolaMora(importoDovuto: number, giorni: number): number {
  return Math.round(importoDovuto * MORA_PERCENTUALE_MENSILE * (giorni / 30) * 100) / 100;
}

export function moraAttuale(p: Pick<Pagamento, 'stato' | 'importoDovuto' | 'dataScadenza' | 'mora'>, oggi = new Date()): number {
  if (p.stato === 'pagato') return p.mora || 0;
  return calcolaMora(p.importoDovuto, giorniRitardo(p.dataScadenza, oggi));
}

export function parseData(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function fmtData(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
