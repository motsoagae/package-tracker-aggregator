import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Package, RefreshCw, Archive, Trash2, 
  BarChart3, Settings, Bell, Search, Filter,
  Download, Upload, Moon, Sun
} from 'lucide-react';
import { PackageCard } from './components/PackageCard';
import { AddPackageModal } from './components/AddPackageModal';
import { usePackageStore } from './store/usePackageStore';
import { Package as PackageType, TrackingResponse, CarrierType } from './types';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const { 
    packages, 
    archivedPackages,
    addPackage, 
    updatePackage,
    removePackage,
    refreshAll,
    isLoading,
    getStats,
    importPackages
  } = usePackageStore();

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAll();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const handleAddPackage = async (
    trackingNumber: string, 
    carrier?: CarrierType, 
    nickname?: string
  ) => {
    const toastId = toast.loading('Adding package...');
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/track/${trackingNumber}${
          carrier ? `?carrier=${carrier}` : ''
        }`
      );
      
      const data: TrackingResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to track package');
      }

      const newPackage: PackageType = {
        ...data.package!,
        nickname: nickname || data.package!.nickname,
        created_at: new Date().toISOString()
      };

      addPackage(newPackage);
      toast.success('Package added successfully!', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add package', { 
        id: toastId 
      });
      throw error;
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(packages, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packages-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success('Packages exported!');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        importPackages(imported);
        toast.success(`Imported ${imported.length} packages!`);
      } catch {
        toast.error('Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  const stats = getStats();

  const filteredPackages = (showArchived ? archivedPackages : packages).filter(pkg => {
    const matchesSearch = 
      pkg.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pkg.nickname?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      pkg.carrier.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' || 
      pkg.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const activePackages = filteredPackages.filter(p => !p.archived && p.status !== 'delivered');
  const deliveredPackages = filteredPackages.filter(p => p.status === 'delivered' && !p.archived);

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Package Tracker
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.active} active • {stats.delivered} delivered
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <button
                onClick={handleExport}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Export packages"
              >
                <Download className="w-4 h-4" />
              </button>

              <label className="hidden sm:flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer" title="Import packages">
                <Upload className="w-4 h-4" />
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>

              <button
                onClick={() => refreshAll()}
                disabled={isLoading}
                className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Package</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              label="Total" 
              value={stats.total} 
              icon={Package} 
              color="blue" 
            />
            <StatCard 
              label="In Transit" 
              value={stats.inTransit} 
              icon={RefreshCw} 
              color="amber" 
            />
            <StatCard 
              label="Delivered" 
              value={stats.delivered} 
              icon={Package} 
              color="green" 
            />
            <StatCard 
              label="Exceptions" 
              value={stats.exception} 
              icon={Bell} 
              color="red" 
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <FilterButton 
              active={filterStatus === 'all'} 
              onClick={() => setFilterStatus('all')}
              label="All"
            />
            <FilterButton 
              active={filterStatus === 'in_transit'} 
              onClick={() => setFilterStatus('in_transit')}
              label="In Transit"
            />
            <FilterButton 
              active={filterStatus === 'delivered'} 
              onClick={() => setFilterStatus('delivered')}
              label="Delivered"
            />
            <FilterButton 
              active={showArchived} 
              onClick={() => setShowArchived(!showArchived)}
              label="Archived"
              icon={Archive}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {filteredPackages.length === 0 ? (
          <EmptyState onAdd={() => setIsModalOpen(true)} />
        ) : (
          <div className="space-y-8">
            {/* Active Packages */}
            {!showArchived && activePackages.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  Active Deliveries ({activePackages.length})
                </h2>
                <div className="grid gap-4">
                  <AnimatePresence mode="popLayout">
                    {activePackages.map((pkg) => (
                      <PackageCard 
                        key={pkg.id} 
                        package={pkg} 
                        onEdit={setEditingPackage}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Delivered Packages */}
            {!showArchived && deliveredPackages.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  Recently Delivered ({deliveredPackages.length})
                </h2>
                <div className="grid gap-4">
                  {deliveredPackages.map((pkg) => (
                    <PackageCard 
                      key={pkg.id} 
                      package={pkg}
                      onEdit={setEditingPackage}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Archived Packages */}
            {showArchived && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Archive className="w-5 h-5 text-gray-600" />
                  Archived ({archivedPackages.length})
                </h2>
                <div className="grid gap-4">
                  {archivedPackages.map((pkg) => (
                    <PackageCard 
                      key={pkg.id} 
                      package={pkg}
                      onEdit={setEditingPackage}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <AddPackageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddPackage}
      />
    </div>
  );
}

// Helper Components
const StatCard = ({ label, value, icon: Icon, color }: any) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
};

const FilterButton = ({ active, onClick, label, icon: Icon }: any) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
      active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none'
        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
    }`}
  >
    {Icon && <Icon className="w-4 h-4" />}
    {label}
  </button>
);

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-20"
  >
    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
      <Package className="w-12 h-12 text-gray-400" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
      No packages yet
    </h3>
    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
      Start tracking your deliveries by adding your first package. We'll automatically detect the carrier.
    </p>
    <button
      onClick={onAdd}
      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
    >
      <Plus className="w-5 h-5" />
      Add Your First Package
    </button>
  </motion.div>
);

export default App;
