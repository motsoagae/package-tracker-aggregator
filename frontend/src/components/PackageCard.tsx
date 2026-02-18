import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, Package, CheckCircle, AlertCircle, 
  MapPin, Clock, MoreVertical, Archive, Trash2, 
  RefreshCw, ExternalLink, ChevronDown, ChevronUp,
  Copy, Edit3
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Package as PackageType, CARRIER_COLORS, CARRIER_NAMES, STATUS_COLORS } from '../types';
import { usePackageStore } from '../store/usePackageStore';

interface PackageCardProps {
  package: PackageType;
  onEdit: (pkg: PackageType) => void;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'delivered':
      return <CheckCircle className="w-5 h-5" />;
    case 'in_transit':
      return <Truck className="w-5 h-5" />;
    case 'out_for_delivery':
      return <MapPin className="w-5 h-5" />;
    case 'exception':
      return <AlertCircle className="w-5 h-5" />;
    default:
      return <Package className="w-5 h-5" />;
  }
};

export const PackageCard: React.FC<PackageCardProps> = ({ package: pkg, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { archivePackage, removePackage, refreshPackage } = usePackageStore();
  
  const statusConfig = STATUS_COLORS[pkg.status] || STATUS_COLORS.unknown;
  const carrierColor = CARRIER_COLORS[pkg.carrier] || CARRIER_COLORS.unknown;
  const carrierName = CARRIER_NAMES[pkg.carrier] || 'Unknown';
  
  const latestEvent = pkg.events[0];
  const isDelivered = pkg.status === 'delivered';
  
  const handleCopyTracking = () => {
    navigator.clipboard.writeText(pkg.tracking_number);
    // Could add toast here
  };

  const handleRefresh = async () => {
    await refreshPackage(pkg.tracking_number);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow ${
        isDelivered ? 'opacity-75' : ''
      }`}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${carrierColor} flex items-center justify-center text-white font-bold text-sm`}>
              {carrierName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {pkg.nickname || pkg.tracking_number}
                {pkg.carrier_detected && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                    Auto
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                {carrierName} • {pkg.tracking_number}
                <button 
                  onClick={handleCopyTracking}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Copy tracking number"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${statusConfig.bg} ${statusConfig.text}`}>
              <StatusIcon status={pkg.status} />
              {pkg.status.replace('_', ' ').toUpperCase()}
            </span>
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>
              
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10"
                  >
                    <button
                      onClick={() => { onEdit(pkg); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" /> Edit Nickname
                    </button>
                    <button
                      onClick={() => { handleRefresh(); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                    <a
                      href={`https://www.google.com/search?q=${pkg.tracking_number}+tracking`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" /> View on Carrier Site
                    </a>
                    <hr className="my-1" />
                    <button
                      onClick={() => { archivePackage(pkg.id); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-amber-600"
                    >
                      <Archive className="w-4 h-4" /> Archive
                    </button>
                    <button
                      onClick={() => { removePackage(pkg.id); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Latest Update */}
        {latestEvent && (
          <div className="mt-4 flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
            <div className="flex-1">
              <p className="text-sm text-gray-900 font-medium">{latestEvent.description}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {latestEvent.location || 'Location unknown'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(latestEvent.timestamp), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Expand Button */}
        {pkg.events.length > 1 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            {isExpanded ? (
              <>Less details <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>More details <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        )}
      </div>

      {/* Expanded Timeline */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="border-t border-gray-100 bg-gray-50 overflow-hidden"
          >
            <div className="p-5 space-y-4">
              {pkg.events.slice(1).map((event, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-300 mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{event.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(event.timestamp), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
