import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Loader2, Sparkles } from 'lucide-react';
import { CarrierType } from '../types';

interface AddPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (trackingNumber: string, carrier?: CarrierType, nickname?: string) => Promise<void>;
}

const CARRIERS: { value: CarrierType; label: string; pattern: string }[] = [
  { value: 'usps', label: 'USPS', pattern: '9400 1000 0000 0000 0000 00' },
  { value: 'ups', label: 'UPS', pattern: '1Z999AA10123456784' },
  { value: 'fedex', label: 'FedEx', pattern: '123456789012' },
  { value: 'dhl', label: 'DHL', pattern: '1234567890' },
  { value: 'amazon', label: 'Amazon', pattern: 'TBA123456789012' },
];

export const AddPackageModal: React.FC<AddPackageModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState<CarrierType | undefined>();
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [detectedCarrier, setDetectedCarrier] = useState<CarrierType | null>(null);

  // Auto-detect carrier as user types
  useEffect(() => {
    if (trackingNumber.length > 5) {
      detectCarrier(trackingNumber);
    } else {
      setDetectedCarrier(null);
    }
  }, [trackingNumber]);

  const detectCarrier = async (tn: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/detect/${tn}`
      );
      const data = await response.json();
      if (data.detected_carrier !== 'unknown') {
        setDetectedCarrier(data.detected_carrier);
        if (!carrier) setCarrier(data.detected_carrier);
      }
    } catch (e) {
      console.error('Detection failed:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      await onAdd(trackingNumber.trim(), carrier, nickname.trim() || undefined);
      onClose();
      // Reset form
      setTrackingNumber('');
      setCarrier(undefined);
      setNickname('');
      setDetectedCarrier(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add package');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Add Package</h2>
                    <p className="text-sm text-gray-500">Track a new delivery</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-lg font-mono"
                    autoFocus
                  />
                  {detectedCarrier && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 flex items-center gap-2 text-sm text-blue-600"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Auto-detected: {detectedCarrier.toUpperCase()}</span>
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Carrier (Optional)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CARRIERS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCarrier(c.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          carrier === c.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {carrier 
                      ? CARRIERS.find(c => c.value === carrier)?.pattern 
                      : 'Auto-detect enabled'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nickname (Optional)
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g., Birthday Gift, Work Laptop..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-red-50 text-red-600 text-sm rounded-lg"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !trackingNumber.trim()}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Package'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
