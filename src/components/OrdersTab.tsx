/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar, 
  Truck, 
  User, 
  Plus, 
  Search, 
  Printer, 
  Share2, 
  Trash2, 
  Edit, 
  CheckCircle, 
  Clock, 
  X, 
  ChevronRight, 
  ArrowLeft,
  FileText, 
  MapPin, 
  Phone,
  ArrowUpDown,
  Building2,
  DollarSign,
  Package,
  AlertCircle
} from 'lucide-react';
import { Booking, Driver, Vehicle, Factory, Customer } from '../types';

interface OrdersTabProps {
  bookings: Booking[];
  drivers: Driver[];
  vehicles: Vehicle[];
  factories: Factory[];
  customers: Customer[];
  accessToken: string | null;
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  onUpdateBooking?: (id: string, booking: Partial<Omit<Booking, 'id' | 'createdAt'>>) => void;
  onDeleteBooking?: (id: string) => void;
  onUpdateBookingStatus?: (id: string, status: Booking['status']) => void;
}

export default function OrdersTab({
  bookings,
  drivers,
  vehicles,
  factories,
  customers,
  accessToken,
  onAddBooking,
  onUpdateBooking,
  onDeleteBooking,
  onUpdateBookingStatus
}: OrdersTabProps) {
  // Global Search
  const [searchTerm, setSearchTerm] = useState('');

  // Date Sort Direction: 'asc' (default, oldest to newest) | 'desc' (newest to oldest)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Currently opened date detail view (null = main date cards list view)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<Booking | null>(null);
  const [printBooking, setPrintBooking] = useState<Booking | null>(null);
  const [shareBooking, setShareBooking] = useState<Booking | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Form Field States
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
  const [status, setStatus] = useState<Booking['status']>('Pending');

  // Extended Order / Bilti Fields
  const [biltiNo, setBiltiNo] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [gariFeet, setGariFeet] = useState('');
  const [dariNo, setDariNo] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [stopLocation, setStopLocation] = useState('');
  const [bookingTime, setBookingTime] = useState(new Date().toTimeString().split(' ')[0].slice(0, 5));

  // Reset form fields
  const resetForm = () => {
    setDriverId('');
    setVehicleId('');
    setFactoryId('');
    setCustomerId('');
    setBookingDate(new Date().toISOString().split('T')[0]);
    setProduct('');
    setWeight('');
    setFare('');
    setCommission('');
    setNotes('');
    setStatus('Pending');

    setBiltiNo('');
    setCompanyName('');
    setReceiverName('');
    setGariFeet('');
    setDariNo('');
    setVehicleModel('');
    setPhone1('');
    setPhone2('');
    setStopLocation('');
    setBookingTime(new Date().toTimeString().split(' ')[0].slice(0, 5));

    setEditingBooking(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    if (selectedDate) {
      setBookingDate(selectedDate);
    }
    setShowFormModal(true);
  };

  const handleOpenEditModal = (booking: Booking) => {
    setEditingBooking(booking);
    setDriverId(booking.driverId || '');
    setVehicleId(booking.vehicleId || '');
    setFactoryId(booking.factoryId || '');
    setCustomerId(booking.customerId || '');
    setBookingDate(booking.bookingDate || '');
    setProduct(booking.product || '');
    setWeight(booking.weight?.toString() || '');
    setFare(booking.fare?.toString() || '');
    setCommission(booking.commission?.toString() || '');
    setNotes(booking.notes || '');
    setStatus(booking.status || 'Pending');

    setBiltiNo(booking.biltiNo || '');
    setCompanyName(booking.companyName || '');
    setReceiverName(booking.receiverName || '');
    setGariFeet(booking.gariFeet || '');
    setDariNo(booking.dariNo || '');
    setVehicleModel(booking.vehicleModel || '');
    setPhone1(booking.phone1 || '');
    setPhone2(booking.phone2 || '');
    setStopLocation(booking.stopLocation || '');
    setBookingTime(booking.bookingTime || '');

    setShowFormModal(true);
  };

  const handleDriverChange = (id: string) => {
    setDriverId(id);
    const driverVehicles = vehicles.filter(v => v.driverId === id);
    if (driverVehicles.length > 0) {
      setVehicleId(driverVehicles[0].id);
      if (driverVehicles[0].model) {
        setVehicleModel(driverVehicles[0].model);
      }
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    const orderData = {
      driverId,
      vehicleId,
      factoryId,
      customerId,
      bookingDate: bookingDate || new Date().toISOString().split('T')[0],
      product,
      weight: parseFloat(weight) || 0,
      fare: parseFloat(fare) || 0,
      commission: parseFloat(commission) || 0,
      status,
      deliveryDate: bookingDate,
      notes,
      biltiNo: biltiNo || `B-${Math.floor(10000 + Math.random() * 90000)}`,
      companyName,
      receiverName,
      gariFeet,
      dariNo,
      vehicleModel,
      phone1,
      phone2,
      stopLocation,
      bookingTime
    };

    if (editingBooking) {
      if (onUpdateBooking) {
        onUpdateBooking(editingBooking.id, orderData);
      }
    } else {
      onAddBooking(orderData);
    }

    setShowFormModal(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      if (onDeleteBooking) {
        onDeleteBooking(id);
      }
      if (selectedBookingForDetail?.id === id) {
        setSelectedBookingForDetail(null);
      }
    }
  };

  // Helper lookup functions
  const getDriverName = (id: string) => drivers.find(d => d.id === id)?.fullName || 'Unassigned Driver';
  const getVehicleReg = (id: string) => vehicles.find(v => v.id === id)?.registrationNumber || 'No Vehicle Reg';
  const getFactoryName = (id: string) => factories.find(f => f.id === id)?.factoryName || 'Unassigned Pickup';
  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.warehouseName || 'Unassigned Destination';

  // Format date helper: "2026-07-31" -> "31 Jul 2026"
  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return 'Unspecified Date';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parts[2];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (monthNames[monthIdx]) {
          return `${day} ${monthNames[monthIdx]} ${year}`;
        }
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // 1. Instant Global Search Filter across all orders
  const filteredBookings = useMemo(() => {
    if (!searchTerm.trim()) return bookings;
    const q = searchTerm.toLowerCase();

    return bookings.filter(b => {
      const dName = getDriverName(b.driverId).toLowerCase();
      const vReg = getVehicleReg(b.vehicleId).toLowerCase();
      const fName = getFactoryName(b.factoryId).toLowerCase();
      const cName = getCustomerName(b.customerId).toLowerCase();
      const bilti = (b.biltiNo || '').toLowerCase();
      const date = (b.bookingDate || '').toLowerCase();
      const formattedDate = formatDateLabel(b.bookingDate).toLowerCase();
      const dest = (b.stopLocation || '').toLowerCase();
      const prod = (b.product || '').toLowerCase();
      const stat = (b.status || '').toLowerCase();
      const model = (b.vehicleModel || '').toLowerCase();
      const company = (b.companyName || '').toLowerCase();
      const receiver = (b.receiverName || '').toLowerCase();

      return (
        dName.includes(q) ||
        vReg.includes(q) ||
        fName.includes(q) ||
        cName.includes(q) ||
        bilti.includes(q) ||
        date.includes(q) ||
        formattedDate.includes(q) ||
        dest.includes(q) ||
        prod.includes(q) ||
        stat.includes(q) ||
        model.includes(q) ||
        company.includes(q) ||
        receiver.includes(q)
      );
    });
  }, [bookings, searchTerm, drivers, vehicles, factories, customers]);

  // 2. Group Orders by Date
  const dateGroups = useMemo(() => {
    const groups: Record<string, Booking[]> = {};

    filteredBookings.forEach(b => {
      const dKey = b.bookingDate || 'Undated';
      if (!groups[dKey]) {
        groups[dKey] = [];
      }
      groups[dKey].push(b);
    });

    // Sort Date keys
    const sortedDates = Object.keys(groups).sort((a, b) => {
      if (sortDirection === 'asc') {
        return a.localeCompare(b);
      } else {
        return b.localeCompare(a);
      }
    });

    return sortedDates.map(dateKey => {
      const items = groups[dateKey];
      const totalOrders = items.length;
      const totalFare = items.reduce((sum, item) => sum + (item.fare || 0), 0);
      const totalCommission = items.reduce((sum, item) => sum + (item.commission || 0), 0);

      return {
        dateKey,
        formattedDate: formatDateLabel(dateKey),
        totalOrders,
        totalFare,
        totalCommission,
        orders: items
      };
    });
  }, [filteredBookings, sortDirection]);

  // Selected date group object for Date Details View
  const activeDateGroup = useMemo(() => {
    if (!selectedDate) return null;
    return dateGroups.find(g => g.dateKey === selectedDate) || {
      dateKey: selectedDate,
      formattedDate: formatDateLabel(selectedDate),
      totalOrders: 0,
      totalFare: 0,
      totalCommission: 0,
      orders: bookings.filter(b => b.bookingDate === selectedDate)
    };
  }, [selectedDate, dateGroups, bookings]);

  // Share message text builder
  const buildShareText = (b: Booking) => {
    return `*TRANSPORT BILLI DETAILS*
📌 *Bilti No:* ${b.biltiNo || 'N/A'}
📅 *Date:* ${formatDateLabel(b.bookingDate)} ${b.bookingTime || ''}
🚛 *Vehicle:* ${getVehicleReg(b.vehicleId)} (${b.vehicleModel || 'N/A'})
👤 *Driver:* ${getDriverName(b.driverId)} (${b.phone1 || 'N/A'})
🏭 *Pickup:* ${getFactoryName(b.factoryId)}
🏬 *Destination:* ${getCustomerName(b.customerId)} (${b.stopLocation || 'N/A'})
📦 *Product:* ${b.product || 'Goods'} (${b.weight || 0} Tons)
💰 *Fare:* Rs. ${(b.fare || 0).toLocaleString()}
💵 *Commission:* Rs. ${(b.commission || 0).toLocaleString()}
📊 *Status:* ${b.status}`;
  };

  const handleShareWhatsApp = (b: Booking) => {
    const text = encodeURIComponent(buildShareText(b));
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyShareText = (b: Booking) => {
    navigator.clipboard.writeText(buildShareText(b));
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <div className="space-y-4 pb-28">
      {/* HEADER & GLOBAL SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-blue-600" size={20} />
              Orders Module
            </h2>
            <p className="text-xs text-slate-500">Centralized order entry, bilti history, and date logs</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
          >
            <Plus size={16} />
            <span>New Order</span>
          </button>
        </div>

        {/* Global Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Date, Bilti, Driver, Vehicle, Customer, Status..."
            className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Controls: Ascending/Descending Date Sort & Active Search Notice */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-600">
              {dateGroups.length} Date {dateGroups.length === 1 ? 'Group' : 'Groups'} ({filteredBookings.length} Orders)
            </span>
            {searchTerm && <span className="text-blue-600 font-semibold">• Search active</span>}
          </div>

          <button
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
          >
            <ArrowUpDown size={13} />
            <span>Sort: {sortDirection === 'asc' ? 'Ascending (Oldest First)' : 'Descending (Newest First)'}</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: DATE DETAILS VIEW (If a date card is expanded) */}
      {selectedDate ? (
        <div className="space-y-4">
          {/* Back button & Date Header Banner */}
          <div className="bg-slate-800 text-white p-4 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedDate(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-xl transition-all"
              >
                <ArrowLeft size={16} />
                <span>Back to Date History</span>
              </button>

              <button
                onClick={handleOpenCreateModal}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1"
              >
                <Plus size={14} />
                <span>Add Order for {formatDateLabel(selectedDate)}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Date Log Details</p>
                <h3 className="text-xl font-extrabold text-white">{formatDateLabel(selectedDate)}</h3>
              </div>

              <div className="flex gap-4 text-xs">
                <div className="bg-slate-700/60 px-3 py-1.5 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Total Orders</span>
                  <span className="text-sm font-bold text-white">{activeDateGroup?.totalOrders || 0}</span>
                </div>
                <div className="bg-slate-700/60 px-3 py-1.5 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Total Fare</span>
                  <span className="text-sm font-bold text-emerald-400">
                    Rs. {(activeDateGroup?.totalFare || 0).toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-700/60 px-3 py-1.5 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Total Commission</span>
                  <span className="text-sm font-bold text-amber-300">
                    Rs. {(activeDateGroup?.totalCommission || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Orders List for selected date */}
          {activeDateGroup?.orders && activeDateGroup.orders.length > 0 ? (
            <div className="space-y-3">
              {activeDateGroup.orders.map((b) => {
                const driverName = getDriverName(b.driverId);
                const vehicleReg = getVehicleReg(b.vehicleId);
                const factoryName = getFactoryName(b.factoryId);
                const customerName = getCustomerName(b.customerId);

                return (
                  <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 transition-all hover:border-slate-300">
                    {/* Top Row: Bilti Number, Status, Time */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-50 text-blue-700 text-xs font-extrabold px-2.5 py-1 rounded-lg border border-blue-100">
                          {b.biltiNo || 'BILTI-N/A'}
                        </span>
                        {b.bookingTime && (
                          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <Clock size={12} /> {b.bookingTime}
                          </span>
                        )}
                      </div>

                      {/* Status Dropdown / Badge */}
                      <select
                        value={b.status}
                        onChange={(e) => onUpdateBookingStatus && onUpdateBookingStatus(b.id, e.target.value as Booking['status'])}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-hidden ${
                          b.status === 'Delivered' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : b.status === 'In Transit'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : b.status === 'Cancelled'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Transit">In Transit</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Middle Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
                      <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl">
                        <Truck className="text-slate-400 mt-0.5 shrink-0" size={15} />
                        <div>
                          <p className="font-bold text-slate-800">{vehicleReg} {b.vehicleModel ? `(${b.vehicleModel})` : ''}</p>
                          <p className="text-slate-500 text-[11px]">Driver: <span className="font-semibold text-slate-700">{driverName}</span></p>
                          {b.phone1 && <p className="text-slate-500 text-[11px]">Phone: {b.phone1}</p>}
                        </div>
                      </div>

                      <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl">
                        <MapPin className="text-slate-400 mt-0.5 shrink-0" size={15} />
                        <div>
                          <p className="font-bold text-slate-800">{factoryName} → {customerName}</p>
                          {b.stopLocation && <p className="text-slate-500 text-[11px]">Destination: {b.stopLocation}</p>}
                          {b.receiverName && <p className="text-slate-500 text-[11px]">Receiver: {b.receiverName}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Cargo & Financial Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-600 flex items-center gap-1">
                          <Package size={14} className="text-slate-400" />
                          {b.product || 'General Cargo'} ({b.weight || 0} Tons)
                        </span>
                        {b.gariFeet && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px]">
                            Feet: {b.gariFeet}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-600">
                          Fare: <span className="font-bold text-slate-900">Rs. {(b.fare || 0).toLocaleString()}</span>
                        </span>
                        <span className="text-slate-600">
                          Commission: <span className="font-bold text-emerald-600">Rs. {(b.commission || 0).toLocaleString()}</span>
                        </span>
                      </div>
                    </div>

                    {b.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100/60">
                        Notes: {b.notes}
                      </p>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setPrintBooking(b)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                        title="Print Bilti"
                      >
                        <Printer size={15} />
                        <span>Print</span>
                      </button>

                      <button
                        onClick={() => setShareBooking(b)}
                        className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                        title="Share Order"
                      >
                        <Share2 size={15} />
                        <span>Share</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(b)}
                        className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                        title="Edit Order"
                      >
                        <Edit size={15} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                        title="Delete Order"
                      >
                        <Trash2 size={15} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
              <AlertCircle className="mx-auto text-slate-400" size={32} />
              <p className="text-sm font-semibold text-slate-700">No Orders for this Date</p>
              <p className="text-xs text-slate-500">Click "Add Order" above to create an entry for {formatDateLabel(selectedDate)}.</p>
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: MAIN DATE CARDS LIST VIEW (ONLY DATE CARDS ARE DISPLAYED) */
        <div className="space-y-2.5">
          {dateGroups.length > 0 ? (
            dateGroups.map((group) => (
              <div
                key={group.dateKey}
                onClick={() => setSelectedDate(group.dateKey)}
                className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-2xl p-4 shadow-xs cursor-pointer transition-all flex items-center justify-between gap-4 group"
              >
                {/* Left Section: Date & Details Summary */}
                <div className="space-y-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {group.formattedDate}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span>
                      Total Orders: <strong className="text-slate-900">{group.totalOrders}</strong>
                    </span>
                    <span>
                      Total Fare: <strong className="text-slate-900">Rs. {group.totalFare.toLocaleString()}</strong>
                    </span>
                    <span>
                      Total Commission: <strong className="text-emerald-600">Rs. {group.totalCommission.toLocaleString()}</strong>
                    </span>
                  </div>
                </div>

                {/* Right Section: Expand Arrow Icon */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                    View Orders
                  </span>
                  <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-blue-600 text-slate-500 group-hover:text-white flex items-center justify-center transition-all">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <Calendar className="mx-auto text-slate-300" size={40} />
              <h3 className="text-base font-bold text-slate-800">No Orders Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm 
                  ? `No orders match your search "${searchTerm}". Clear search to view all dates.`
                  : 'Start by creating your first order to build your date-wise order history.'
                }
              </p>
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm('')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Clear Search
                </button>
              ) : (
                <button
                  onClick={handleOpenCreateModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm"
                >
                  Create First Order
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT ORDER MODAL */}
      {showFormModal && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden my-8">
            <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <FileText size={18} className="text-blue-400" />
                {editingBooking ? 'Edit Order Details' : 'Create New Transport Order'}
              </h3>
              <button 
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Section 1: Date, Bilti, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Booking Date *</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Bilti Number</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={biltiNo}
                    onChange={(e) => setBiltiNo(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Order Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Booking['status'])}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Section 2: Fleet Selection (Driver & Vehicle) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Driver *</label>
                  <select
                    required
                    value={driverId}
                    onChange={(e) => handleDriverChange(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="">Select Driver</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.fullName} ({d.phoneNumber || 'No phone'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Vehicle *</label>
                  <select
                    required
                    value={vehicleId}
                    onChange={(e) => {
                      setVehicleId(e.target.value);
                      const v = vehicles.find(veh => veh.id === e.target.value);
                      if (v?.model) setVehicleModel(v.model);
                    }}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.registrationNumber} ({v.vehicleType})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 3: Route Selection (Pickup Factory & Customer Destination) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Pickup Location (Factory) *</label>
                  <select
                    required
                    value={factoryId}
                    onChange={(e) => setFactoryId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="">Select Factory / Source</option>
                    {factories.map(f => (
                      <option key={f.id} value={f.id}>{f.factoryName} ({f.address || 'Address N/A'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Destination (Customer Warehouse) *</label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="">Select Warehouse / Destination</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.warehouseName} ({c.city || 'City N/A'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 4: Cargo Product & Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cargo Product</label>
                  <input
                    type="text"
                    placeholder="e.g. Cement, Steel, Rice"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Weight (Tons)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Gari Feet / Dimensions</label>
                  <input
                    type="text"
                    placeholder="e.g. 20ft, 40ft"
                    value={gariFeet}
                    onChange={(e) => setGariFeet(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Section 5: Financials (Fare & Commission) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Total Fare (Rs.)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={fare}
                    onChange={(e) => setFare(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">Commission (Rs.)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-bold text-emerald-600 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Section 6: Additional Bilti Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Company Name</label>
                  <input
                    type="text"
                    placeholder="Transport Company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Receiver Name</label>
                  <input
                    type="text"
                    placeholder="Receiver Contact"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Destination Address</label>
                  <input
                    type="text"
                    placeholder="Unloading stop"
                    value={stopLocation}
                    onChange={(e) => setStopLocation(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Order Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Special unloading requirements..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                >
                  {editingBooking ? 'Save Order Changes' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: PRINT BILTI RECEIPT MODAL */}
      {printBooking && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Printer size={18} className="text-blue-600" />
                Transport Order Bilti Receipt
              </h3>
              <button onClick={() => setPrintBooking(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Printable Receipt Area */}
            <div id="printable_bilti_area" className="border border-slate-300 p-5 rounded-xl bg-slate-50 space-y-3 text-xs">
              <div className="text-center border-b border-slate-300 pb-2">
                <h2 className="text-base font-black uppercase text-slate-900">TRANSPORT COMMISSION COMPANY</h2>
                <p className="text-[11px] text-slate-600">Goods Transport & Commission Agency Bilti</p>
                <p className="text-[11px] font-bold text-blue-700">Bilti No: {printBooking.biltiNo || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 block">Date:</span>
                  <span className="font-bold text-slate-800">{formatDateLabel(printBooking.bookingDate)} {printBooking.bookingTime}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  <span className="font-bold text-slate-800">{printBooking.status}</span>
                </div>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-200">
                <p><strong className="text-slate-700">Vehicle:</strong> {getVehicleReg(printBooking.vehicleId)} ({printBooking.vehicleModel || 'N/A'})</p>
                <p><strong className="text-slate-700">Driver:</strong> {getDriverName(printBooking.driverId)}</p>
                <p><strong className="text-slate-700">Pickup:</strong> {getFactoryName(printBooking.factoryId)}</p>
                <p><strong className="text-slate-700">Destination:</strong> {getCustomerName(printBooking.customerId)} ({printBooking.stopLocation || ''})</p>
                <p><strong className="text-slate-700">Product:</strong> {printBooking.product} ({printBooking.weight || 0} Tons)</p>
              </div>

              <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-sm">
                <span>Total Fare:</span>
                <span className="text-slate-900">Rs. {(printBooking.fare || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPrintBooking(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Printer size={15} />
                <span>Print Bilti</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: SHARE ORDER MODAL */}
      {shareBooking && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Share2 size={18} className="text-emerald-600" />
                Share Order Summary
              </h3>
              <button onClick={() => setShareBooking(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <textarea
              readOnly
              rows={9}
              value={buildShareText(shareBooking)}
              className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={() => handleCopyShareText(shareBooking)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center gap-1.5"
              >
                {shareCopied ? 'Copied!' : 'Copy to Clipboard'}
              </button>

              <button
                onClick={() => handleShareWhatsApp(shareBooking)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Share2 size={15} />
                <span>Share via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
