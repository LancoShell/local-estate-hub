import { useData } from '@/contexts/DataContext';
import { Building2, Users, FileText, CreditCard, Wrench, TrendingUp, Home, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['hsl(152,60%,40%)', 'hsl(38,92%,50%)', 'hsl(0,72%,51%)'];

export default function Dashboard() {
  const { data } = useData();

  const totalImmobili = data.immobili.length;
  const affittati = data.immobili.filter(i => i.stato === 'affittato').length;
  const liberi = data.immobili.filter(i => i.stato === 'libero').length;
  const inManutenzione = data.immobili.filter(i => i.stato === 'manutenzione').length;
  const occupazione = totalImmobili > 0 ? Math.round((affittati / totalImmobili) * 100) : 0;

  const contrattiAttivi = data.contratti.filter(c => c.stato === 'attivo').length;
  const totaleEntrate = data.pagamenti.filter(p => p.stato === 'pagato').reduce((s, p) => s + p.importo, 0);
  const totaleInsoluti = data.pagamenti.filter(p => p.stato === 'insoluto').length;
  const manutenzioniAperte = data.manutenzioni.filter(m => m.stato !== 'completata').length;

  const cashFlow = totaleEntrate - data.manutenzioni.reduce((s, m) => s + m.costo, 0);

  const statoData = [
    { name: 'Affittati', value: affittati },
    { name: 'Liberi', value: liberi },
    { name: 'Manutenzione', value: inManutenzione },
  ].filter(d => d.value > 0);

  // Monthly revenue from payments
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleString('it-IT', { month: 'short' });
    const year = d.getFullYear();
    const m = d.getMonth();
    const entrate = data.pagamenti
      .filter(p => {
        const pd = new Date(p.dataPagamento);
        return pd.getMonth() === m && pd.getFullYear() === year && p.stato === 'pagato';
      })
      .reduce((s, p) => s + p.importo, 0);
    return { name: month, entrate };
  });

  const kpis = [
    { label: 'Immobili', value: totalImmobili, icon: Building2, color: 'text-primary' },
    { label: 'Occupazione', value: `${occupazione}%`, icon: Home, color: 'text-success' },
    { label: 'Contratti Attivi', value: contrattiAttivi, icon: FileText, color: 'text-info' },
    { label: 'Cash Flow', value: `€${cashFlow.toLocaleString('it-IT')}`, icon: TrendingUp, color: 'text-accent' },
    { label: 'Entrate Totali', value: `€${totaleEntrate.toLocaleString('it-IT')}`, icon: CreditCard, color: 'text-secondary' },
    { label: 'Insoluti', value: totaleInsoluti, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Manutenzioni', value: manutenzioniAperte, icon: Wrench, color: 'text-warning' },
    { label: 'Persone', value: data.proprietari.length + data.inquilini.length, icon: Users, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Panoramica del tuo patrimonio immobiliare</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-display font-bold mt-1">{kpi.value}</p>
                </div>
                <kpi.icon className={`w-8 h-8 ${kpi.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Entrate Mensili</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.some(d => d.entrate > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => `€${v.toLocaleString('it-IT')}`} />
                  <Bar dataKey="entrate" fill="hsl(222,60%,28%)" radius={[4, 4, 0, 0]} />
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
    </div>
  );
}
