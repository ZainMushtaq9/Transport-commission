/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Truck, 
  Calendar 
} from 'lucide-react';
import { Booking, Driver, Vehicle, Commission } from '../types';

interface CommissionsTabProps {
  bookings: Booking[];
  drivers: Driver[];
  vehicles: Vehicle[];
  commissions: Commission[];
  onToggleCommissionStatus: (bookingId: string, currentStatus: 'Paid' | 'Unpaid') => void;
}

export default function CommissionsTab({
  bookings,
  drivers,
  vehicles,
  commissions,
  onToggleCommissionStatus
}: CommissionsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState<'all' | 'Paid' | 'Unpaid'>('all');

  // Vehicle-wise statistics calculations
  const vehicleStats = useMemo(() => {
    const statsMap: Record<string, { trips: number; fare: number; commission: number; reg: string; model: string }> = {};
    
    // Seed with existing vehicles
    vehicles.forEach(v => {
      statsMap[v.id] = {
        trips: 0,
        fare: 0,
        commission: 0,
        reg: v.registrationNumber,
        model: `${v.color} ${v.model}`
      };
    });

    bookings.forEach(b => {
      if (b.status === 'Cancelled') return;
      if (statsMap[b.vehicleId]) {
        statsMap[b.vehicleId].trips += 1;
        statsMap[b.vehicleId].fare += b.fare;
        statsMap[b.vehicleId].commission += b.commission;
      } else {
        // Fallback for missing/deleted vehicles
        statsMap[b.vehicleId] = {
          trips: 1,
          fare: b.fare,
          commission: b.commission,
          reg: 'Unknown Registration',
          model: 'N/A'
        };
      }
    });

    return Object.values(statsMap).sort((a, b) => b.commission - a.commission);
  }, [bookings, vehicles]);

  // Combined Commission Records list matching Bookings
  const commissionRecords = useMemo(() => {
    return bookings.map(b => {
      const dbComm = commissions.find(c => c.bookingId === b.id);
      const driver = drivers.find(d => d.id === b.driverId);
      const vehicle = vehicles.find(v => v.id === b.vehicleId);

      return {
        id: b.id,
        bookingId: b.id,
        date: b.bookingDate,
        product: b.product,
        driverName: driver?.fullName || 'N/A',
        vehicleReg: vehicle?.registrationNumber || 'N/A',
        fare: b.fare,
        commission: b.commission,
        paymentStatus: dbComm?.paymentStatus || 'Unpaid'
      };
    });
  }, [bookings, commissions, drivers, vehicles]);

  // Filtered Commission list
  const filteredCommissions = useMemo(() => {
    return commissionRecords.filter(rec => {
      // Payment status filter
      if (filterPayment !== 'all' && rec.paymentStatus !== filterPayment) return false;

      // Text search
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        return (
          rec.driverName.toLowerCase().includes(query) ||
          rec.vehicleReg.toLowerCase().includes(query) ||
          rec.product.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [commissionRecords, searchTerm, filterPayment]);

  // Top level financial summary
  const summary = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    commissionRecords.forEach(rec => {
      if (rec.paymentStatus === 'Paid') {
        paid += rec.commission;
      } else {
        unpaid += rec.commission;
      }
    });

    return { paid, unpaid, total: paid + unpaid };
  }, [commissionRecords]);

  return (
    <div className="space-y-4 pb-24 animate-fadeIn" id="commissions_tab_view">
      {/* Commission Financial Status metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl flex items-center gap-2.5">
          <div className="bg-emerald-500 p-2 rounded-xl text-white">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Cleared Commission</p>
            <p className="text-sm font-bold text-emerald-900">Rs. {summary.paid.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex items-center gap-2.5">
          <div className="bg-amber-500 p-2 rounded-xl text-white">
            <AlertCircle size={16} />
          </div>
          <div>
            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Receivable / Pending</p>
            <p className="text-sm font-bold text-amber-900">Rs. {summary.unpaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Segment controls & Search bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-100 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search commission record..."
            className="w-full pl-8 pr-4 py-1.5 border border-slate-100 rounded-lg text-xs bg-slate-50 focus:outline-hidden"
          />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          {(['all', 'Unpaid', 'Paid'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterPayment(status)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                filterPayment === status
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {status === 'all' ? 'All Ledger' : status === 'Unpaid' ? 'Pending' : 'Cleared'}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Log list */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Ledger Records ({filteredCommissions.length})</span>

        {filteredCommissions.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-slate-400 text-xs border border-slate-100">
            No commission logs found matching the filter.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCommissions.map(rec => (
              <div 
                key={rec.id}
                className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{rec.driverName}</span>
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded-sm font-bold">
                      {rec.vehicleReg}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {rec.product} · {rec.date}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500">
                    Fare: Rs. {rec.fare.toLocaleString()}
                  </p>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-blue-600 block">Rs. {rec.commission.toLocaleString()}</span>
                    <span className={`inline-block text-[8px] font-bold px-1.5 py-0.2 rounded-full ${
                      rec.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {rec.paymentStatus === 'Paid' ? 'Cleared' : 'Receivable'}
                    </span>
                  </div>

                  {/* Toggle button */}
                  <button
                    onClick={() => onToggleCommissionStatus(rec.bookingId, rec.paymentStatus)}
                    className={`p-1.5 rounded-lg border transition-all ${
                      rec.paymentStatus === 'Paid'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <CheckCircle2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vehicle Histories / Statistics Table */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Truck size={14} className="text-blue-500" /> Vehicle-wise Performance Logs
        </h3>

        {vehicleStats.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No vehicles tracked.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {vehicleStats.map(stat => (
              <div 
                key={stat.reg}
                className="p-3 bg-slate-50 rounded-xl border border-slate-100/50 flex justify-between items-center"
              >
                <div>
                  <h4 className="font-mono text-xs font-bold text-slate-800">{stat.reg}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold capitalize">{stat.model}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    Fare Handled: Rs. {stat.fare.toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">{stat.trips} TRIPS</span>
                  <span className="text-xs font-bold text-blue-600">Rs. {stat.commission.toLocaleString()} Commission</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
