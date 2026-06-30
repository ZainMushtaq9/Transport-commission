/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  MapPin, 
  Truck, 
  User, 
  Plus, 
  Filter, 
  Search, 
  CheckCircle, 
  Clock, 
  XCircle, 
  MoreVertical, 
  ChevronRight, 
  Mail, 
  CalendarPlus, 
  AlertCircle 
} from 'lucide-react';
import { Booking, Driver, Vehicle, Factory, Customer } from '../types';

interface BookingsTabProps {
  bookings: Booking[];
  drivers: Driver[];
  vehicles: Vehicle[];
  factories: Factory[];
  customers: Customer[];
  accessToken: string | null;
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  onUpdateBookingStatus: (id: string, status: Booking['status']) => void;
  onTriggerGmail: (booking: Booking, email: string) => Promise<void>;
  onTriggerCalendar: (booking: Booking) => Promise<void>;
}

export default function BookingsTab({
  bookings,
  drivers,
  vehicles,
  factories,
  customers,
  accessToken,
  onAddBooking,
  onUpdateBookingStatus,
  onTriggerGmail,
  onTriggerCalendar
}: BookingsTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [factoryFilter, setFactoryFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');

  // New Booking Form State
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [factoryId, setFactoryId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [product, setProduct] = useState('');
  const [weight, setWeight] = useState('');
  const [fare, setFare] = useState('');
  const [commission, setCommission] = useState('');
  const [notes, setNotes] = useState('');
  
  // Quick Email input state
  const [sendToEmail, setSendToEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // Linked vehicles filtered by selected driver
  const availableVehicles = useMemo(() => {
    if (!driverId) return vehicles;
    return vehicles.filter(v => v.driverId === driverId);
  }, [driverId, vehicles]);

  // Handle auto-population or validation warnings
  const handleDriverChange = (id: string) => {
    setDriverId(id);
    const driverVehicles = vehicles.filter(v => v.driverId === id);
    if (driverVehicles.length > 0) {
      setVehicleId(driverVehicles[0].id);
    } else {
      setVehicleId('');
    }
  };

  // Filtered Bookings list
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // Status Filter
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      // Factory Filter
      if (factoryFilter !== 'all' && b.factoryId !== factoryFilter) return false;
      // Driver Filter
      if (driverFilter !== 'all' && b.driverId !== driverFilter) return false;

      // Text Search
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const driverName = drivers.find(d => d.id === b.driverId)?.fullName.toLowerCase() || '';
        const vehicleReg = vehicles.find(v => v.id === b.vehicleId)?.registrationNumber.toLowerCase() || '';
        const factoryName = factories.find(f => f.id === b.factoryId)?.factoryName.toLowerCase() || '';
        const custName = customers.find(c => c.id === b.customerId)?.warehouseName.toLowerCase() || '';
        const prod = b.product.toLowerCase();

        return (
          driverName.includes(query) ||
          vehicleReg.includes(query) ||
          factoryName.includes(query) ||
          custName.includes(query) ||
          prod.includes(query)
        );
      }

      return true;
    });
  }, [bookings, drivers, vehicles, factories, customers, searchTerm, statusFilter, factoryFilter, driverFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId || !vehicleId || !factoryId || !customerId) {
      alert('Please fill out all connected entities.');
      return;
    }

    onAddBooking({
      driverId,
      vehicleId,
      factoryId,
      customerId,
      bookingDate,
      product,
      weight: parseFloat(weight) || 0,
      fare: parseFloat(fare) || 0,
      commission: parseFloat(commission) || 0,
      status: 'Pending',
      deliveryDate: bookingDate, // Initial estimation
      notes
    });

    // Reset states
    setDriverId('');
    setVehicleId('');
    setFactoryId('');
    setCustomerId('');
    setProduct('');
    setWeight('');
    setFare('');
    setCommission('');
    setNotes('');
    setShowAddModal(false);
  };

  const triggerGmailSend = async (booking: Booking) => {
    if (!sendToEmail) return;
    setEmailStatus('sending');
    try {
      await onTriggerGmail(booking, sendToEmail);
      setEmailStatus('success');
      setTimeout(() => setEmailStatus('idle'), 3000);
    } catch (err) {
      setEmailStatus('error');
    }
  };

  return (
    <div className="space-y-4 pb-24" id="bookings_tab_view">
      {/* Search & Filter Header */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search driver, vehicle, product..."
            className="w-full pl-9 pr-4 py-2 border border-slate-100 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        {/* Dynamic Horizontal Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={factoryFilter}
            onChange={(e) => setFactoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 focus:outline-hidden max-w-[120px] truncate"
          >
            <option value="all">All Factories</option>
            {factories.map(f => (
              <option key={f.id} value={f.id}>{f.factoryName}</option>
            ))}
          </select>

          <select
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 focus:outline-hidden max-w-[120px] truncate"
          >
            <option value="all">All Drivers</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.fullName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bookings Lists */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bookings ({filteredBookings.length})</span>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all"
          >
            <Plus size={14} /> New Booking
          </button>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center text-slate-400 text-xs">
            No bookings found. Tap "+ New Booking" to start earning commissions.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredBookings.map(b => {
              const driver = drivers.find(d => d.id === b.driverId);
              const vehicle = vehicles.find(v => v.id === b.vehicleId);
              const factory = factories.find(f => f.id === b.factoryId);
              const customer = customers.find(c => c.id === b.customerId);

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBooking(b)}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer relative"
                >
                  {/* Status Tag */}
                  <span className={`absolute right-4 top-4 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    b.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    b.status === 'In Transit' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                    b.status === 'Cancelled' ? 'bg-red-50 text-red-600 border border-red-100' :
                    'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    {b.status}
                  </span>

                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <Calendar size={12} /> {b.bookingDate}
                    </p>

                    <h4 className="text-sm font-bold text-slate-800">
                      {b.product} ({b.weight} Tons)
                    </h4>

                    {/* Routing Details */}
                    <div className="grid grid-cols-2 gap-2 pt-1.5 text-xs border-t border-slate-50">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                          <User size={10} /> Driver & Vehicle
                        </span>
                        <p className="font-semibold text-slate-700 truncate">{driver?.fullName || 'N/A'}</p>
                        <p className="font-mono text-[10px] font-bold text-slate-500">{vehicle?.registrationNumber || 'N/A'}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                          <MapPin size={10} /> Route Path
                        </span>
                        <p className="font-semibold text-slate-700 truncate">From: {factory?.factoryName || 'N/A'}</p>
                        <p className="text-[10px] font-semibold text-slate-500 truncate">To: {customer?.warehouseName || 'N/A'}, {customer?.city || ''}</p>
                      </div>
                    </div>

                    {/* Financial details row */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-1">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">FARE amount</span>
                        <span className="text-xs font-bold text-slate-700">Rs. {b.fare.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wider block">Agent Commission</span>
                        <span className="text-sm font-extrabold text-blue-600">Rs. {b.commission.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Details Dialog Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 overflow-y-auto flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="relative bg-white rounded-3xl w-full max-w-lg p-5 space-y-4 my-4 sm:my-8 shadow-2xl shrink-0 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Booking Verification & Actions</h3>
              <button
                onClick={() => {
                  setSelectedBooking(null);
                  setEmailStatus('idle');
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                Close
              </button>
            </div>

            {/* Core Info Summary Card */}
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
              <p className="text-xs text-slate-400 font-semibold">Booking ID: {selectedBooking.id}</p>
              <h4 className="text-sm font-bold text-slate-800">
                {selectedBooking.product} · {selectedBooking.weight} Tons
              </h4>
              <p className="text-xs font-semibold text-slate-500">
                Fare: <span className="font-bold text-slate-700">Rs. {selectedBooking.fare.toLocaleString()}</span> |
                Commission: <span className="font-bold text-blue-600">Rs. {selectedBooking.commission.toLocaleString()}</span>
              </p>
              <div className="pt-2 text-xs border-t border-slate-200 mt-2">
                <span className="text-[10px] font-bold text-slate-400">Notes / Instructions:</span>
                <p className="text-slate-600 italic mt-0.5">{selectedBooking.notes || 'No remarks recorded.'}</p>
              </div>
            </div>

            {/* Quick Status Update buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Update Trip Status</span>
              <div className="grid grid-cols-4 gap-2">
                {(['Pending', 'In Transit', 'Delivered', 'Cancelled'] as Booking['status'][]).map(st => (
                  <button
                    key={st}
                    onClick={() => {
                      onUpdateBookingStatus(selectedBooking.id, st);
                      setSelectedBooking({ ...selectedBooking, status: st });
                    }}
                    className={`py-2 text-[10px] font-bold rounded-xl border transition-all ${
                      selectedBooking.status === st
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Integrations Module */}
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Workspace Smart Triggers</span>

              <div className="flex gap-2">
                <button
                  onClick={() => onTriggerCalendar(selectedBooking)}
                  disabled={!accessToken}
                  className="flex-1 py-2 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CalendarPlus size={14} className="text-red-500" />
                  Add to Calendar
                </button>
              </div>

              {/* Gmail dispatch form */}
              <div className="bg-slate-50 p-3 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                  <Mail size={12} className="text-blue-500" /> Dispatch Booking Info via Gmail
                </span>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={sendToEmail}
                    onChange={(e) => setSendToEmail(e.target.value)}
                    placeholder="manager@factory.com"
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-hidden"
                  />
                  <button
                    onClick={() => triggerGmailSend(selectedBooking)}
                    disabled={!accessToken || !sendToEmail}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {emailStatus === 'sending' ? 'Sending...' : emailStatus === 'success' ? 'Sent!' : 'Send'}
                  </button>
                </div>
                {!accessToken && (
                  <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-1">
                    <AlertCircle size={10} /> Google Login required to send Gmail
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Booking Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 overflow-y-auto flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <form onSubmit={handleSubmit} className="relative bg-white rounded-3xl w-full max-w-lg p-5 space-y-4 my-4 sm:my-8 shadow-2xl shrink-0 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Dispatch New Transport Order</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                Cancel
              </button>
            </div>

            {/* Select Connected Driver */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connected Driver</label>
                <select
                  value={driverId}
                  onChange={(e) => handleDriverChange(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                >
                  <option value="">Select Driver</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.fullName}</option>
                  ))}
                </select>
              </div>

              {/* Select Connected Vehicle */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connected Vehicle</label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                >
                  <option value="">Select Vehicle</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registrationNumber} ({v.vehicleType})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Select Connected Factory & Customer warehouse */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sourcing Factory</label>
                <select
                  value={factoryId}
                  onChange={(e) => setFactoryId(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                >
                  <option value="">Select Factory</option>
                  {factories.map(f => (
                    <option key={f.id} value={f.id}>{f.factoryName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                >
                  <option value="">Select Warehouse</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.warehouseName} ({c.company})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Booking Date & Product details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Booking Date</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Product / Goods</label>
                <input
                  type="text"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="e.g. Wheat Bags, Sugar"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weight (Tons)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Weight"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Fare (Rs.)</label>
                <input
                  type="number"
                  value={fare}
                  onChange={(e) => setFare(e.target.value)}
                  placeholder="Fare"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Commission (Rs.)</label>
                <input
                  type="number"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="Commission"
                  className="w-full mt-1 p-2 border border-blue-100 rounded-xl text-xs bg-blue-50/50 text-blue-600 font-bold focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Special Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarks about loading/unloading..."
                rows={2}
                className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              Confirm and Dispatch Order
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
