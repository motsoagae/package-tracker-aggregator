import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Package, TrackingResponse } from '../types';

interface PackageStore {
  packages: Package[];
  archivedPackages: Package[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addPackage: (pkg: Package) => void;
  updatePackage: (id: string, updates: Partial<Package>) => void;
  removePackage: (id: string) => void;
  archivePackage: (id: string) => void;
  unarchivePackage: (id: string) => void;
  refreshPackage: (trackingNumber: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  clearAll: () => void;
  importPackages: (packages: Package[]) => void;
  
  // Getters
  getActivePackages: () => Package[];
  getDeliveredPackages: () => Package[];
  getPackagesByCarrier: (carrier: string) => Package[];
  getStats: () => {
    total: number;
    active: number;
    delivered: number;
    inTransit: number;
    exception: number;
  };
}

export const usePackageStore = create<PackageStore>()(
  persist(
    (set, get) => ({
      packages: [],
      archivedPackages: [],
      isLoading: false,
      error: null,

      addPackage: (pkg) => {
        set((state) => ({
          packages: [pkg, ...state.packages.filter(p => p.id !== pkg.id)]
        }));
      },

      updatePackage: (id, updates) => {
        set((state) => ({
          packages: state.packages.map(p => 
            p.id === id ? { ...p, ...updates } : p
          )
        }));
      },

      removePackage: (id) => {
        set((state) => ({
          packages: state.packages.filter(p => p.id !== id),
          archivedPackages: state.archivedPackages.filter(p => p.id !== id)
        }));
      },

      archivePackage: (id) => {
        set((state) => {
          const pkg = state.packages.find(p => p.id === id);
          if (!pkg) return state;
          return {
            packages: state.packages.filter(p => p.id !== id),
            archivedPackages: [pkg, ...state.archivedPackages]
          };
        });
      },

      unarchivePackage: (id) => {
        set((state) => {
          const pkg = state.archivedPackages.find(p => p.id === id);
          if (!pkg) return state;
          return {
            archivedPackages: state.archivedPackages.filter(p => p.id !== id),
            packages: [pkg, ...state.packages]
          };
        });
      },

      refreshPackage: async (trackingNumber) => {
        const { packages } = get();
        const pkg = packages.find(p => p.tracking_number === trackingNumber);
        if (!pkg) return;

        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/track/${trackingNumber}?carrier=${pkg.carrier}`
          );
          const data: TrackingResponse = await response.json();
          
          if (data.success && data.package) {
            get().updatePackage(pkg.id, {
              ...data.package,
              nickname: pkg.nickname, // Preserve nickname
              archived: pkg.archived
            });
          }
        } catch (error) {
          console.error('Failed to refresh package:', error);
        }
      },

      refreshAll: async () => {
        const { packages } = get();
        set({ isLoading: true });
        
        try {
          await Promise.all(
            packages.map(p => get().refreshPackage(p.tracking_number))
          );
        } finally {
          set({ isLoading: false });
        }
      },

      clearAll: () => {
        set({ packages: [], archivedPackages: [] });
      },

      importPackages: (newPackages) => {
        set((state) => {
          const existingIds = new Set(state.packages.map(p => p.id));
          const uniqueNew = newPackages.filter(p => !existingIds.has(p.id));
          return {
            packages: [...uniqueNew, ...state.packages]
          };
        });
      },

      getActivePackages: () => {
        return get().packages.filter(p => !p.archived && p.status !== 'delivered');
      },

      getDeliveredPackages: () => {
        return get().packages.filter(p => p.status === 'delivered' && !p.archived);
      },

      getPackagesByCarrier: (carrier) => {
        return get().packages.filter(p => p.carrier === carrier);
      },

      getStats: () => {
        const { packages } = get();
        return {
          total: packages.length,
          active: packages.filter(p => p.status !== 'delivered').length,
          delivered: packages.filter(p => p.status === 'delivered').length,
          inTransit: packages.filter(p => p.status === 'in_transit').length,
          exception: packages.filter(p => p.status === 'exception').length
        };
      }
    }),
    {
      name: 'package-tracker-storage',
      partialize: (state) => ({ 
        packages: state.packages, 
        archivedPackages: state.archivedPackages 
      })
    }
  )
);
