import { describe, it, expect } from 'vitest';
import { calcolaMora, canoneAdeguato, giorniRitardo } from '@/lib/calc';

describe('calc', () => {
  it('applica la quota ISTAT (75%) alla variazione annua', () => {
    expect(canoneAdeguato({ canone: 1000, adeguamentoIstat: 4, quotaIstat: 75 })).toBe(1030);
    expect(canoneAdeguato({ canone: 1000, adeguamentoIstat: 0, quotaIstat: 75 })).toBe(1000);
  });
  it('mora 2% al mese pro-rata', () => {
    expect(calcolaMora(1000, 30)).toBe(20);
    expect(calcolaMora(1000, 15)).toBe(10);
  });
  it('giorni di ritardo', () => {
    expect(giorniRitardo('2026-09-05', new Date(2026, 8, 15))).toBe(10);
    expect(giorniRitardo('2026-09-20', new Date(2026, 8, 15))).toBe(0);
  });
});
