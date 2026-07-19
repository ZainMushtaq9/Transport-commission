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
  Download, 
  Copy, 
  Trash2, 
  Edit, 
  CheckCircle, 
  Clock, 
  X, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  MoreHorizontal,
  Phone,
  MapPin,
  Clock4,
  AlertCircle
} from 'lucide-react';
import { Booking, Driver, Vehicle, Factory, Customer } from '../types';

interface DailyInventoryTabProps {
  bookings: Booking[];
  drivers: Driver[];
  vehicles: Vehicle[];
  factories: Factory[];
  customers: Customer[];
  accessToken: string | null;
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  onUpdateBooking?: (id: string, booking: Partial<Omit<Booking, 'id' | 'createdAt'>>) => void;
  onDeleteBooking?: (id: string) => void;
}

export default function DailyInventoryTab({
  bookings,
  drivers,
  vehicles,
  factories,
  customers,
  accessToken,
  onAddBooking,
  onUpdateBooking,
  onDeleteBooking
}: DailyInventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [expandedVehicles, setExpandedVehicles] = useState<Record<string, boolean>>({});
  
  // Modals and editing state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

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

  // Extended Daily Inventory Fields
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
      setVehicleModel(driverVehicles[0].model || '');
    } else {
      setVehicleId('');
      setVehicleModel('');
    }

    const driver = drivers.find(d => d.id === id);
    if (driver) {
      setPhone1(driver.phoneNumber || '');
      setPhone2(driver.whatsAppNumber || '');
    }
  };

  const handleVehicleChange = (id: string) => {
    setVehicleId(id);
    const vehicle = vehicles.find(v => v.id === id);
    if (vehicle) {
      setVehicleModel(vehicle.model || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      driverId,
      vehicleId,
      factoryId,
      customerId,
      bookingDate,
      product,
      weight: parseFloat(weight) || 0,
      fare: parseFloat(fare) || 0,
      commission: parseFloat(commission) || 0,
      status,
      deliveryDate: bookingDate,
      notes,

      biltiNo,
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
        onUpdateBooking(editingBooking.id, payload);
      }
    } else {
      onAddBooking(payload);
    }

    resetForm();
    setShowFormModal(false);
  };

  const handleDuplicate = (booking: Booking) => {
    const { id, createdAt, ...rest } = booking;
    const duplicatedPayload: Omit<Booking, 'id' | 'createdAt'> = {
      ...rest,
      biltiNo: booking.biltiNo ? `${booking.biltiNo}-DUP` : '',
      bookingTime: new Date().toTimeString().split(' ')[0].slice(0, 5)
    };
    onAddBooking(duplicatedPayload);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      if (onDeleteBooking) {
        onDeleteBooking(id);
      }
      setSelectedBooking(null);
    }
  };

  // Grouping bookings based on date hierarchy
  const dateHierarchy = useMemo(() => {
    const groups: Record<string, {
      date: string;
      totalOrders: number;
      totalKerya: number;
      totalCommission: number;
      vehicles: Record<string, {
        vehicleId: string;
        registrationNumber: string;
        driverName: string;
        totalOrders: number;
        totalKerya: number;
        totalCommission: number;
        orders: Booking[];
      }>;
    }> = {};

    bookings.forEach(b => {
      // Apply search term if present
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const driverName = drivers.find(d => d.id === b.driverId)?.fullName.toLowerCase() || '';
        const vehicleReg = vehicles.find(v => v.id === b.vehicleId)?.registrationNumber.toLowerCase() || '';
        const bilti = b.biltiNo?.toLowerCase() || '';
        const company = b.companyName?.toLowerCase() || '';
        const receiver = b.receiverName?.toLowerCase() || '';
        const stop = b.stopLocation?.toLowerCase() || '';

        const matches = 
          driverName.includes(query) ||
          vehicleReg.includes(query) ||
          bilti.includes(query) ||
          company.includes(query) ||
          receiver.includes(query) ||
          stop.includes(query) ||
          b.product.toLowerCase().includes(query);

        if (!matches) return;
      }

      const dateStr = b.bookingDate;
      if (!groups[dateStr]) {
        groups[dateStr] = {
          date: dateStr,
          totalOrders: 0,
          totalKerya: 0,
          totalCommission: 0,
          vehicles: {}
        };
      }

      const dateGroup = groups[dateStr];
      dateGroup.totalOrders += 1;
      dateGroup.totalKerya += b.fare || 0;
      dateGroup.totalCommission += b.commission || 0;

      const vehicleKey = `${b.vehicleId || 'none'}-${b.driverId || 'none'}`;
      if (!dateGroup.vehicles[vehicleKey]) {
        const regNo = vehicles.find(v => v.id === b.vehicleId)?.registrationNumber || 'Unassigned Vehicle';
        const drvName = drivers.find(d => d.id === b.driverId)?.fullName || 'Unassigned Driver';

        dateGroup.vehicles[vehicleKey] = {
          vehicleId: b.vehicleId,
          registrationNumber: regNo,
          driverName: drvName,
          totalOrders: 0,
          totalKerya: 0,
          totalCommission: 0,
          orders: []
        };
      }

      const vehicleGroup = dateGroup.vehicles[vehicleKey];
      vehicleGroup.totalOrders += 1;
      vehicleGroup.totalKerya += b.fare || 0;
      vehicleGroup.totalCommission += b.commission || 0;
      vehicleGroup.orders.push(b);
    });

    // Sort by date descending
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [bookings, drivers, vehicles, searchTerm]);

  // Expand / collapse helpers
  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const toggleVehicle = (key: string) => {
    setExpandedVehicles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Printing Layout Helper
  const handlePrint = (booking: Booking) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const driverName = drivers.find(d => d.id === booking.driverId)?.fullName || 'N/A';
    const vehicleReg = vehicles.find(v => v.id === booking.vehicleId)?.registrationNumber || 'N/A';
    const sourceFactory = factories.find(f => f.id === booking.factoryId)?.factoryName || 'N/A';
    const destWarehouse = customers.find(c => c.id === booking.customerId)?.warehouseName || 'N/A';

    printWindow.document.write(`
      <html>
        <head>
          <title>Bilti Invoice - ${booking.biltiNo || 'Order'}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; margin: 20px; color: #000; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; text-transform: uppercase; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
            .label { font-weight: bold; }
            .footer { text-align: center; border-top: 2px dashed #000; margin-top: 20px; padding-top: 10px; font-size: 11px; }
            .divider { border-bottom: 1px dotted #000; margin: 15px 0; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div class="title">TRANSPORT COMMISSION SERVICE</div>
            <div>Bilti Consignment Receipt / Order Invoice</div>
            <div>Date: ${booking.bookingDate} | Time: ${booking.bookingTime || 'N/A'}</div>
          </div>

          <div class="row">
            <span class="label">Bilti Number:</span>
            <span>${booking.biltiNo || 'N/A'}</span>
          </div>
          <div class="row">
            <span class="label">Dari No:</span>
            <span>${booking.dariNo || 'N/A'}</span>
          </div>
          <div class="row">
            <span class="label">Client Company:</span>
            <span>${booking.companyName || 'N/A'}</span>
          </div>
          <div class="row">
            <span class="label">Receiver Name:</span>
            <span>${booking.receiverName || 'N/A'}</span>
          </div>

          <div class="divider"></div>

          <div class="row">
            <span class="label">Vehicle Reg No:</span>
            <span>${vehicleReg}</span>
          </div>
          <div class="row">
            <span class="label">Driver Assigned:</span>
            <span>${driverName}</span>
          </div>
          <div class="row">
            <span class="label">Gari Feet:</span>
            <span>${booking.gariFeet || 'N/A'}</span>
          </div>
          <div class="row">
            <span class="label">Model:</span>
            <span>${booking.vehicleModel || 'N/A'}</span>
          </div>

          <div class="divider"></div>

          <div class="row">
            <span class="label">Source Factory:</span>
            <span>${sourceFactory}</span>
          </div>
          <div class="row">
            <span class="label">Destination Stop:</span>
            <span>${booking.stopLocation || destWarehouse}</span>
          </div>
          <div class="row">
            <span class="label">Product / Cargo:</span>
            <span>${booking.product} (${booking.weight} Tons)</span>
          </div>

          <div class="divider"></div>

          <div class="row">
            <span class="label">Kerya (Fare Value):</span>
            <span style="font-size: 15px; font-weight: bold;">Rs. ${booking.fare?.toLocaleString()}</span>
          </div>
          <div class="row">
            <span class="label">Agent Commission:</span>
            <span style="font-size: 14px; font-weight: bold;">Rs. ${booking.commission?.toLocaleString()}</span>
          </div>
          <div class="row">
            <span class="label">Trip Status:</span>
            <span>${booking.status}</span>
          </div>

          <div class="footer">
            <p>Thank you for transporting with Transport Commission Manager.</p>
            <p>Verification Signature: _______________________</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Share Details
  const handleShare = (booking: Booking) => {
    const driverName = drivers.find(d => d.id === booking.driverId)?.fullName || 'N/A';
    const vehicleReg = vehicles.find(v => v.id === booking.vehicleId)?.registrationNumber || 'N/A';
    
    const shareText = `*Transport Order Details*\n` +
      `*Bilti No:* ${booking.biltiNo || 'N/A'}\n` +
      `*Date:* ${booking.bookingDate}\n` +
      `*Vehicle:* ${vehicleReg} (${booking.vehicleModel || 'N/A'})\n` +
      `*Driver:* ${driverName}\n` +
      `*Product:* ${booking.product} (${booking.weight} Tons)\n` +
      `*Stop:* ${booking.stopLocation || 'N/A'}\n` +
      `*Kerya (Fare):* Rs. ${booking.fare?.toLocaleString()}\n` +
      `*Commission:* Rs. ${booking.commission?.toLocaleString()}\n` +
      `*Status:* ${booking.status}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      alert('Order details copied to clipboard in professional format!');
    } else {
      alert(shareText);
    }
  };

  // Export Specific Date Group to CSV
  const handleExportCSV = (dateGroup: any) => {
    let headers = ['Bilti No', 'Date', 'Time', 'Vehicle', 'Driver', 'Company', 'Receiver', 'Product', 'Stop', 'Kerya', 'Commission', 'Status'];
    let rows: any[] = [];

    Object.values(dateGroup.vehicles).forEach((vg: any) => {
      vg.orders.forEach((b: Booking) => {
        rows.push([
          b.biltiNo || '',
          b.bookingDate,
          b.bookingTime || '',
          vg.registrationNumber,
          vg.driverName,
          b.companyName || '',
          b.receiverName || '',
          b.product,
          b.stopLocation || '',
          b.fare,
          b.commission,
          b.status
        ]);
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daily_Inventory_${dateGroup.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-24 animate-fadeIn" id="daily_inventory_view">
      
      {/* Header Panel */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Bilti, Driver, Vehicle, stop or goods..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-xs focus:border-blue-500 focus:outline-hidden shadow-xs"
          />
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <Plus size={14} /> Add Order
        </button>
      </div>

      {/* Date-Level Cards Hierarchy */}
      <div className="space-y-3">
        {dateHierarchy.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center text-slate-400 text-xs">
            No daily inventory logs found. Create an order to begin grouping.
          </div>
        ) : (
          dateHierarchy.map(dateGrp => {
            const dateStr = dateGrp.date;
            const isDateExpanded = expandedDates[dateStr] ?? true; // expanded by default for readability

            return (
              <div key={dateStr} className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                
                {/* Date Header Card */}
                <div 
                  onClick={() => toggleDate(dateStr)}
                  className="bg-slate-50/50 p-4 flex items-center justify-between cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{dateGrp.totalOrders} Orders logged</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Kerya / Commission</span>
                      <span className="text-xs font-semibold text-slate-700">Rs. {dateGrp.totalKerya.toLocaleString()} / </span>
                      <span className="text-xs font-extrabold text-blue-600">Rs. {dateGrp.totalCommission.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportCSV(dateGrp);
                        }}
                        className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-all"
                        title="Export to CSV"
                      >
                        <Download size={12} />
                      </button>
                      {isDateExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    </div>
                  </div>
                </div>

                {/* Vehicles List Sub-Cards */}
                {isDateExpanded && (
                  <div className="p-3 bg-white space-y-3">
                    {Object.entries(dateGrp.vehicles).map(([vKey, vGrp]: [string, any]) => {
                      const isVehExpanded = expandedVehicles[vKey] ?? true; // expanded by default too

                      return (
                        <div key={vKey} className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                          
                          {/* Vehicle Header */}
                          <div 
                            onClick={() => toggleVehicle(vKey)}
                            className="bg-slate-100/50 p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <Truck size={14} className="text-slate-500" />
                              <div>
                                <h4 className="text-xs font-mono font-extrabold text-slate-800">{vGrp.registrationNumber}</h4>
                                <p className="text-[10px] text-slate-400 font-semibold">Driver: {vGrp.driverName}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right text-[10px] font-semibold text-slate-500">
                                {vGrp.totalOrders} Orders · Fare: <span className="text-slate-800 font-bold">Rs. {vGrp.totalKerya.toLocaleString()}</span>
                              </div>
                              {isVehExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                            </div>
                          </div>

                          {/* Orders Detail Grid */}
                          {isVehExpanded && (
                            <div className="divide-y divide-slate-50 bg-white">
                              {vGrp.orders.map((b: Booking) => (
                                <div 
                                  key={b.id} 
                                  onClick={() => setSelectedBooking(b)}
                                  className="p-3 hover:bg-slate-50 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                                >
                                  {/* Left Column: Bilti & Company */}
                                  <div className="flex-1 min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono font-extrabold text-slate-800 bg-slate-100 border px-1.5 py-0.5 rounded-md text-[10px]">
                                        Bilti: {b.biltiNo || 'No Bilti'}
                                      </span>
                                      {b.bookingTime && (
                                        <span className="text-[9px] text-slate-400 flex items-center gap-0.5 font-semibold">
                                          <Clock4 size={10} /> {b.bookingTime}
                                        </span>
                                      )}
                                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                                        b.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                        b.status === 'In Transit' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                        b.status === 'Cancelled' ? 'bg-red-50 text-red-600 border border-red-100' :
                                        'bg-amber-50 text-amber-600 border border-amber-100'
                                      }`}>
                                        {b.status}
                                      </span>
                                    </div>
                                    <div className="pt-1 font-semibold text-slate-700">
                                      {b.product} · {b.companyName || 'No Company'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                      <MapPin size={10} /> Stop: {b.stopLocation || 'N/A'}
                                    </div>
                                  </div>

                                  {/* Right Column: Pricing & Quick Actions */}
                                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                                    <div className="text-left sm:text-right">
                                      <div className="text-[10px] text-slate-400 font-semibold">
                                        Fare: <strong className="text-slate-800">Rs. {b.fare?.toLocaleString()}</strong>
                                      </div>
                                      <div className="text-[10px] text-blue-600 font-bold">
                                        Comm: Rs. {b.commission?.toLocaleString()}
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      <button 
                                        onClick={() => handleOpenEditModal(b)}
                                        className="p-1 hover:bg-slate-100 text-blue-600 rounded-lg"
                                        title="Edit"
                                      >
                                        <Edit size={12} />
                                      </button>
                                      <button 
                                        onClick={() => handleDuplicate(b)}
                                        className="p-1 hover:bg-slate-100 text-slate-500 rounded-lg"
                                        title="Duplicate"
                                      >
                                        <Copy size={12} />
                                      </button>
                                      <button 
                                        onClick={() => handlePrint(b)}
                                        className="p-1 hover:bg-slate-100 text-indigo-500 rounded-lg"
                                        title="Print Receipt"
                                      >
                                        <Printer size={12} />
                                      </button>
                                      <button 
                                        onClick={() => handleShare(b)}
                                        className="p-1 hover:bg-slate-100 text-emerald-500 rounded-lg"
                                        title="Share Text"
                                      >
                                        <Share2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Order Complete Details Modal View */}
      {selectedBooking && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-center items-start sm:items-center p-2 sm:p-4 overflow-y-auto animate-fadeBackdrop">
          <div className="relative bg-white rounded-3xl w-full max-w-md max-h-[92vh] sm:max-h-[90vh] my-auto flex flex-col shadow-2xl animate-fadeIn overflow-hidden">
            
            <div className="flex justify-between items-center border-b border-slate-100 p-4 sm:p-5 shrink-0">
              <h3 className="text-sm font-bold text-slate-800">Order Verification Details</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-4 text-xs text-slate-600">
              
              {/* Top Banner details */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs font-bold text-slate-400">BILTI NO: {selectedBooking.biltiNo || 'N/A'}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedBooking.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>{selectedBooking.status}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedBooking.product}</h4>
                  <p className="font-medium text-slate-500 mt-0.5">Loads: {selectedBooking.weight} Tons · Date: {selectedBooking.bookingDate} at {selectedBooking.bookingTime || 'N/A'}</p>
                </div>
              </div>

              {/* Extended Info grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Client Company</span>
                  <p className="font-bold text-slate-800">{selectedBooking.companyName || 'N/A'}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Dari Number</span>
                  <p className="font-bold text-slate-800">{selectedBooking.dariNo || 'N/A'}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Receiver Name</span>
                  <p className="font-bold text-slate-800">{selectedBooking.receiverName || 'N/A'}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Stop / Destination</span>
                  <p className="font-bold text-slate-800">{selectedBooking.stopLocation || 'N/A'}</p>
                </div>
              </div>

              {/* Vehicle & driver specifics */}
              <div className="bg-slate-50/50 p-3 rounded-2xl space-y-2 border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                  <Truck size={14} className="text-blue-500" /> Assigned Fleet Log
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <p><strong className="text-slate-500">Driver Phone 1:</strong> {selectedBooking.phone1 || 'N/A'}</p>
                  <p><strong className="text-slate-500">Driver Phone 2:</strong> {selectedBooking.phone2 || 'N/A'}</p>
                  <p><strong className="text-slate-500">Gari Feet:</strong> {selectedBooking.gariFeet || 'N/A'}</p>
                  <p><strong className="text-slate-500">Vehicle Model:</strong> {selectedBooking.vehicleModel || 'N/A'}</p>
                </div>
              </div>

              {/* Remarks block */}
              {selectedBooking.notes && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Operational Remarks</span>
                  <p className="p-2 bg-slate-50 rounded-xl italic border">{selectedBooking.notes}</p>
                </div>
              )}

              {/* Financial values */}
              <div className="border-t pt-3 flex justify-between items-center text-sm font-bold">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Kerya (Fare)</span>
                  <p className="text-slate-800">Rs. {selectedBooking.fare?.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-blue-600 font-bold block uppercase">Commission Earned</span>
                  <p className="text-blue-600 text-base font-extrabold">Rs. {selectedBooking.commission?.toLocaleString()}</p>
                </div>
              </div>

            </div>

            <div className="border-t border-slate-100 p-4 sm:p-5 bg-slate-50 shrink-0 flex gap-2">
              <button
                onClick={() => {
                  handleOpenEditModal(selectedBooking);
                  setSelectedBooking(null);
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
              >
                <Edit size={12} /> Edit
              </button>
              <button
                onClick={() => handlePrint(selectedBooking)}
                className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all"
                title="Print Receipt"
              >
                <Printer size={14} />
              </button>
              <button
                onClick={() => handleShare(selectedBooking)}
                className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all"
                title="Share Details"
              >
                <Share2 size={14} />
              </button>
              <button
                onClick={() => handleDelete(selectedBooking.id)}
                className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Form Add / Edit Modal Sheet */}
      {showFormModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-center items-start sm:items-center p-2 sm:p-4 overflow-y-auto animate-fadeBackdrop">
          <form onSubmit={handleSubmit} className="relative bg-white rounded-3xl w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] my-auto flex flex-col shadow-2xl animate-fadeIn overflow-hidden">
            
            <div className="flex justify-between items-center border-b border-slate-100 p-4 sm:p-5 shrink-0">
              <h3 className="text-sm font-bold text-slate-800">
                {editingBooking ? 'Modify Transport Order' : 'Dispatch Daily Transport Order'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-4">
              
              {/* Linked profile dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver Profile</label>
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

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vehicle Log</label>
                  <select
                    value={vehicleId}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                    required
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.filter(v => !driverId || v.driverId === driverId).map(v => (
                      <option key={v.id} value={v.id}>{v.registrationNumber} ({v.vehicleType})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bilti & Dari No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bilti Number</label>
                  <input
                    type="text"
                    value={biltiNo}
                    onChange={(e) => setBiltiNo(e.target.value)}
                    placeholder="e.g. BL-9876"
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dari Number</label>
                  <input
                    type="text"
                    value={dariNo}
                    onChange={(e) => setDariNo(e.target.value)}
                    placeholder="e.g. DR-54"
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Sourcing & Destination Stop */}
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination Stop Location</label>
                  <input
                    type="text"
                    value={stopLocation}
                    onChange={(e) => setStopLocation(e.target.value)}
                    placeholder="e.g. Lahore Warehouse, Multan"
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Client Company & Receiver Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Client Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Fauji Fertilizer"
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Receiver Name</label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Receiver Name"
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Booking Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Booking Time</label>
                  <input
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trip Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Gari Feet & Vehicle Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gari Feet (Truck Length)</label>
                  <input
                    type="text"
                    value={gariFeet}
                    onChange={(e) => setGariFeet(e.target.value)}
                    placeholder="e.g. 22 Feet"
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vehicle Model</label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="e.g. 2019 Bedford"
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Phone 1 & Phone 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver Phone 1</label>
                  <input
                    type="tel"
                    value={phone1}
                    onChange={(e) => setPhone1(e.target.value)}
                    placeholder="Primary Phone"
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver Phone 2</label>
                  <input
                    type="tel"
                    value={phone2}
                    onChange={(e) => setPhone2(e.target.value)}
                    placeholder="Secondary Phone"
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Product and load weight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Product / Goods Cargo</label>
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="e.g. Urea fertilizer bags"
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weight (Tons)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Tonnage load"
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Fare & Commission */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Kerya (Fare) (Rs.)</label>
                  <input
                    type="number"
                    value={fare}
                    onChange={(e) => setFare(e.target.value)}
                    placeholder="Fare rent"
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Commission Fee (Rs.)</label>
                  <input
                    type="number"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    placeholder="Agent Commission"
                    className="w-full mt-1 p-2 border border-blue-200 rounded-xl text-xs bg-blue-50/50 text-blue-600 font-bold focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Special notes */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Special Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Extra remarks..."
                  rows={2}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

            </div>

            <div className="border-t border-slate-100 p-4 sm:p-5 bg-slate-50 shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                {editingBooking ? 'Update Order' : 'Dispatch Order'}
              </button>
            </div>

          </form>
        </div>,
        document.body
      )}

    </div>
  );
}
