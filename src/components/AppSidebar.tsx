import { NavLink } from '@/components/NavLink';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  Wrench,
  Download,
  Upload,
  Database,
} from 'lucide-react';
import { exportBackup, importBackup } from '@/lib/dataStore';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';
import { useRef } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/immobili', icon: Building2, label: 'Immobili' },
  { to: '/persone', icon: Users, label: 'Persone' },
  { to: '/contratti', icon: FileText, label: 'Contratti' },
  { to: '/contabilita', icon: CreditCard, label: 'Contabilità' },
  { to: '/manutenzioni', icon: Wrench, label: 'Manutenzioni' },
];

export function AppSidebar() {
  const { refresh } = useData();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importBackup(file);
      refresh();
      toast.success('Backup importato con successo');
    } catch {
      toast.error('Errore durante l\'importazione');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-base font-bold text-sidebar-accent-foreground">ImmoGest</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestionale Immobiliare</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-1">
        <button
          onClick={exportBackup}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full"
        >
          <Download className="w-4 h-4" />
          <span>Esporta Backup</span>
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full"
        >
          <Upload className="w-4 h-4" />
          <span>Importa Backup</span>
        </button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>
    </aside>
  );
}
