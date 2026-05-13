import { useData } from '@/contexts/DataContext';
import { Building2, Users, FileText, CreditCard, Wrench, TrendingUp, Home, AlertTriangle, TrendingDown, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import CalendarioEventi from '@/components/CalendarioEventi';

const PIE_COLORS = ['hsl(152,60%,40%)', 'hsl(38,92%,50%)', 'hsl(0,72%,51%)'];

export default function Dashboard() {
  const { data } = useData();

  const totalImmobili = data.immobili.length;
  const affittati = data.immobili.filter(i => i.stato === 'affittato').length;
  const liberi = data.immobili.filter(i => i.stato === 'libero').length;
  const inManutenzione = data.immobili.filter(i => i.stato === 'manutenzione').length;

  // Tasso occupazione: immobili con almeno un contratto attivo nell'anno corrente / totale
  const annoCorrente = new Date().getFullYear();
  const immobiliAffittatiAnno = new Set(
    data.contratti
      .filter(c => {
        if (c.stato === 'disdetto') return false;
        const start = new Date(c.dataInizio);
        const end = c.dataFine ? new Date(c.dataFine) : new Date(annoCorrente + 1, 0, 1);
        return start.getFullYear() <= annoCorrente && end.getFullYear() >= annoCorrente;
      })
      .map(c => c.immobileId)
  ).size;
  const occupazione = totalImmobili > 0 ? Math.round((immobiliAffittatiAnno / totalImmobili) * 100) : 0;

  const contrattiAttivi = data.contratti.filter(c => c.stato === 'attivo').length;

  // Entrate: solo pagamenti canone pagati (non depositi)
  const totaleEntrate = data.pagamenti
    .filter(p => p.stato === 'pagato' && !p.isDeposito)
    .reduce((s, p) => s + p.importo, 0);

  const totaleInsoluti = data.pagamenti.filter(p => p.stato === 'insoluto').length;
  const importoInsoluti = data.pagamenti.filter(p => p.stato === 'insoluto').reduce((s, p) => s + p.importoDovuto, 0);
  const manutenzioniAperte = data.manutenzioni.filter(m => m.stato !== 'completata').length;

  // Uscite per cash flow
  const costiManutenzione = data.manutenzioni
    .filter(m => m.stato === 'completata')
    .reduce((s, m) => s + m.costo, 0);
  const speseImu = data.immobili.reduce((s, i) => s + (i.imu || 0), 0);
  const speseTari = data.immobili.reduce((s, i) => s + (i.tari || 0), 0);
  const speseFisseAnnue = data.speseFisse
    .filter(s => s.attiva)
    .reduce((s, sf) => {
      const mult = { mensile: 12, trimestrale: 4, semestrale: 2, annuale: 1 }[sf.periodicita] ?? 1;
      return s + sf.importo * mult;
    }, 0);

  const totaleUscite = costiManutenzione + speseImu + speseTari + speseFisseAnnue;
  const cashFlow = totaleEntrate - totaleUscite;

  // Depositi tenuti
  const totaleDepositi = data.pagamenti
    .filter(p => p.isDeposito && p.stato === 'pagato')
    .reduce((s, p) => s + p.importo, 0);

  const statoData = [
    { name: 'Affittati', value: affittati },
    { name: 'Liberi', value: liberi },
    { name: 'Manutenzione', value: inManutenzione },
  ].filter(d => d.value > 0);

  // Entrate mensili ultimi 6 mesi (solo canoni, no depositi)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleString('it-IT', { month: 'short' });
    const year = d.getFullYear();
    const m = d.getMonth();
    const entrate = data.pagamenti
      .filter(p => {
        const pd = new Date(p.dataPagamento);
        return pd.getMonth() === m && pd.getFullYear() === year && p.stato === 'pagato' && !p.isDeposito;
      })
      .reduce((s, p) => s + p.importo, 0);
    const uscite = data.manutenzioni
      .filter(man => {
        if (!man.dataCompletamento) return false;
        const md = new Date(man.dataCompletamento);
        return md.getMonth() === m && md.getFullYear() === year && man.stato === 'completata';
      })
      .reduce((s, man) => s + man.costo, 0);
    return { name: month, entrate, uscite };
  });

  const kpis = [
    { label: 'Immobili Totali', value: totalImmobili, icon: Building2, color: 'text-primary' },
    { label: `Occupazione ${annoCorrente}`, value: `${occupazione}%`, icon: Home, color: 'text-success', sub: `${immobiliAffittatiAnno} su ${totalImmobili} immobili` },
    { label: 'Contratti Attivi', value: contrattiAttivi, icon: FileText, color: 'text-info' },
    { label: 'Cash Flow Netto', value: `€${cashFlow.toLocaleString('it-IT')}`, icon: TrendingUp, color: cashFlow >= 0 ? 'text-success' : 'text-destructive' },
    { label: 'Entrate Canoni', value: `€${totaleEntrate.toLocaleString('it-IT')}`, icon: CreditCard, color: 'text-secondary' },
    { label: 'Insoluti', value: `${totaleInsoluti} (€${importoInsoluti.toLocaleString('it-IT')})`, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Manutenzioni', value: manutenzioniAperte, icon: Wrench, color: 'text-warning' },
    { label: 'Depositi', value: `€${totaleDepositi.toLocaleString('it-IT')}`, icon: PiggyBank, color: 'text-accent' },
    { label: 'Uscite Totali', value: `€${totaleUscite.toLocaleString('it-IT')}`, icon: TrendingDown, color: 'text-destructive' },
    { label: 'Persone', value: data.proprietari.length + data.inquilini.length, icon: Users, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Panoramica del tuo patrimonio immobiliare</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide leading-tight">{kpi.label}</p>
                  <p className="text-xl font-display font-bold mt-1 truncate">{kpi.value}</p>
                  {'sub' in kpi && kpi.sub && <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>}
                </div>
                <kpi.icon className={`w-7 h-7 flex-shrink-0 ml-2 ${kpi.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Entrate vs Uscite Mensili</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.some(d => d.entrate > 0 || d.uscite > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => `€${v.toLocaleString('it-IT')}`} />
                  <Bar dataKey="entrate" name="Entrate" fill="hsl(152,60%,40%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="uscite" name="Uscite" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Stato Immobili</CardTitle>
          </CardHeader>
          <CardContent>
            {statoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statoData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statoData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                Aggiungi immobili per visualizzare i dati
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CalendarioEventi />
    </div>
  );
}
