/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  X, 
  User, 
  Truck, 
  Building2, 
  Users, 
  Briefcase, 
  DollarSign, 
  Calendar 
} from 'lucide-react';
import { Driver, Vehicle, Factory, Customer, Booking } from '../types';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  drivers: Driver[];
  vehicles: Vehicle[];
  factories: Factory[];
  customers: Customer[];
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  onSelectDriver: (driver: Driver) => void;
}

export default function SearchOverlay({
  isOpen,
  onClose,
  query,
  drivers,
  vehicles,
  factories,
  customers,
  bookings,
  onSelectBooking,
  onSelectDriver
}: SearchOverlayProps) {
  const normalizedQuery = query.toLowerCase().trim();

  const results = useMemo(() => {
    if (normalizedQuery === '') {
      return { drivers: [], vehicles: [], factories: [], customers: [], bookings: [] };
    }

    // 1. Filter Drivers
    const filteredDrivers = drivers.filter(d => 
      d.fullName.toLowerCase().includes(normalizedQuery) ||
      d.cnicNumber.toLowerCase().includes(normalizedQuery) ||
      d.phoneNumber.toLowerCase().includes(normalizedQuery) ||
      d.whatsAppNumber.toLowerCase().includes(normalizedQuery)
    );

    // 2. Filter Vehicles
    const filteredVehicles = vehicles.filter(v => 
      v.registrationNumber.toLowerCase().includes(normalizedQuery) ||
      v.vehicleType.toLowerCase().includes(normalizedQuery) ||
      v.model.toLowerCase().includes(normalizedQuery)
    );

    // 3. Filter Factories
    const filteredFactories = factories.filter(f => 
      f.factoryName.toLowerCase().includes(normalizedQuery) ||
      f.managerName.toLowerCase().includes(normalizedQuery) ||
      f.phone.toLowerCase().includes(normalizedQuery)
    );

    // 4. Filter Customers
    const filteredCustomers = customers.filter(c => 
      c.warehouseName.toLowerCase().includes(normalizedQuery) ||
      c.company.toLowerCase().includes(normalizedQuery) ||
      c.city.toLowerCase().includes(normalizedQuery)
    );

    // 5. Filter Bookings
    const filteredBookings = bookings.filter(b => {
      const driverName = drivers.find(d => d.id === b.driverId)?.fullName.toLowerCase() || '';
      const vehicleNum = vehicles.find(v => v.id === b.vehicleId)?.registrationNumber.toLowerCase() || '';
      const factoryName = factories.find(f => f.id === b.factoryId)?.factoryName.toLowerCase() || '';
      const custName = customers.find(c => c.id === b.customerId)?.warehouseName.toLowerCase() || '';

      return (
        b.id.toLowerCase().includes(normalizedQuery) ||
        b.product.toLowerCase().includes(normalizedQuery) ||
        b.bookingDate.includes(normalizedQuery) ||
        b.fare.toString().includes(normalizedQuery) ||
        b.commission.toString().includes(normalizedQuery) ||
        driverName.includes(normalizedQuery) ||
        vehicleNum.includes(normalizedQuery) ||
        factoryName.includes(normalizedQuery) ||
        custName.includes(normalizedQuery)
      );
    });

    return {
      drivers: filteredDrivers,
      vehicles: filteredVehicles,
      factories: filteredFactories,
      customers: filteredCustomers,
      bookings: filteredBookings
    };
  }, [normalizedQuery, drivers, vehicles, factories, customers, bookings]);

  const hasResults = useMemo(() => {
    return (
      results.drivers.length > 0 ||
      results.vehicles.length > 0 ||
      results.factories.length > 0 ||
      results.customers.length > 0 ||
      results.bookings.length > 0
    );
  }, [results]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-50 overflow-y-auto p-4 sm:p-6 animate-fadeIn">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Search header bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Global Database Results</h3>
            <p className="text-[10px] text-slate-500 font-medium">Search query: "{query}"</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {normalizedQuery === '' ? (
          <p className="text-xs text-slate-500 text-center py-10">Start typing in the search bar above to query all system registries instantly.</p>
        ) : !hasResults ? (
          <p className="text-xs text-slate-500 text-center py-10">No matching registry or booking record found across drivers, vehicles, factories, warehouses, or financial ledgers.</p>
        ) : (
          <div className="space-y-5 pb-10">
            {/* 1. Bookings Results */}
            {results.bookings.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block ml-1 flex items-center gap-1">
                  <Briefcase size={12} /> Bookings & commissions ({results.bookings.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {results.bookings.map(b => (
                    <div 
                      key={b.id}
                      onClick={() => {
                        onSelectBooking(b);
                        onClose();
                      }}
                      className="bg-slate-800/80 hover:bg-slate-800 p-3 rounded-xl border border-slate-700/50 cursor-pointer transition-all space-y-1.5"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-mono font-bold truncate max-w-[120px]">{b.id}</span>
                        <span className="text-[8px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.2 rounded-full">{b.status}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200">{b.product} ({b.weight} Tons)</h4>
                      <p className="text-[10px] font-bold text-blue-400">Commission: Rs. {b.commission.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Drivers Results */}
            {results.drivers.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block ml-1 flex items-center gap-1">
                  <User size={12} /> Registered Drivers ({results.drivers.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {results.drivers.map(d => (
                    <div 
                      key={d.id}
                      onClick={() => {
                        onSelectDriver(d);
                        onClose();
                      }}
                      className="bg-slate-800/80 hover:bg-slate-800 p-3 rounded-xl border border-slate-700/50 cursor-pointer transition-all flex items-center gap-2.5"
                    >
                      <img src={d.photo} referrerPolicy="no-referrer" className="w-10 h-10 rounded-lg object-cover bg-slate-700" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{d.fullName}</h4>
                        <p className="text-[9px] text-slate-400 font-semibold">{d.phoneNumber}</p>
                        <p className="text-[8px] text-slate-500 font-mono">CNIC: {d.cnicNumber}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Vehicles Results */}
            {results.vehicles.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block ml-1 flex items-center gap-1">
                  <Truck size={12} /> Registered Vehicles ({results.vehicles.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {results.vehicles.map(v => {
                    const owner = drivers.find(d => d.id === v.driverId);
                    return (
                      <div 
                        key={v.id}
                        className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 space-y-1"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono font-bold text-slate-200">{v.registrationNumber}</span>
                          <span className="text-[8px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.2 rounded-full">{v.vehicleType}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold">Owner: {owner?.fullName || 'N/A'}</p>
                        <p className="text-[9px] text-slate-500 font-semibold">Capacity: {v.capacity} Tons · Year: {v.model}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Factories Results */}
            {results.factories.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block ml-1 flex items-center gap-1">
                  <Building2 size={12} /> Sourcing Factories ({results.factories.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {results.factories.map(f => (
                    <div 
                      key={f.id}
                      className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 space-y-1"
                    >
                      <h4 className="text-xs font-bold text-slate-200">{f.factoryName}</h4>
                      <p className="text-[9px] text-slate-400 font-semibold">Manager: {f.managerName}</p>
                      <p className="text-[9px] text-slate-500 font-semibold">Phone: {f.phone}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Customers Results */}
            {results.customers.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block ml-1 flex items-center gap-1">
                  <Users size={12} /> Destination Warehouses ({results.customers.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {results.customers.map(c => (
                    <div 
                      key={c.id}
                      className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 space-y-1"
                    >
                      <h4 className="text-xs font-bold text-slate-200">{c.warehouseName}</h4>
                      <p className="text-[9px] text-slate-400 font-semibold">Company: {c.company} · {c.city}</p>
                      <p className="text-[9px] text-slate-500 font-semibold">Phone: {c.phone}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
