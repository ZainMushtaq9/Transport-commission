import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Filter, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Truck, 
  Building2, 
  Users, 
  AlertTriangle, 
  PieChart, 
  CheckCircle2, 
  Search,
  Warehouse,
  Briefcase,
  ShieldAlert,
  BarChart3
} from 'lucide-react';
import { Booking, Commission, Expense, Driver, Vehicle, Factory, Customer } from '../types';

interface ReportsTabProps {
  bookings: Booking[];
  commissions: Commission[];
  expenses: Expense[];
  drivers: Driver[];
  vehicles: Vehicle[];
  factories: Factory[];
  customers: Customer[];
}

type ReportType = 
  | 'summary'
  | 'earnings'
  | 'expenses'
  | 'orders'
  | 'drivers'
  | 'vehicles'
  | 'commissions'
  | 'factories'
  | 'customers'
  | 'warehouses'
  | 'vehicle_expiries';

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'custom' | 'all';

export default function ReportsTab({
  bookings = [],
  commissions = [],
  expenses = [],
  drivers = [],
  vehicles = [],
  factories = [],
  customers = [],
}: ReportsTabProps) {
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Filtering criteria
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [selectedFactory, setSelectedFactory] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Helpers for date calculations
  const getPresetDates = (preset: DatePreset) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      return { start: yStr, end: yStr };
    }
    if (preset === 'this_week') {
      const dayOfWeek = today.getDay(); // 0 is Sun
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Monday
      return { start: firstDay.toISOString().split('T')[0], end: todayStr };
    }
    if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: firstDay.toISOString().split('T')[0], end: todayStr };
    }
    if (preset === 'this_year') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      return { start: firstDay.toISOString().split('T')[0], end: todayStr };
    }
    return { start: '', end: '' };
  };

  // Determine active date range
  const { activeStart, activeEnd } = useMemo(() => {
    if (datePreset === 'custom') {
      return { activeStart: startDate, activeEnd: endDate };
    }
    if (datePreset === 'all') {
      return { activeStart: '', activeEnd: '' };
    }
    const { start, end } = getPresetDates(datePreset);
    return { activeStart: start, activeEnd: end };
  }, [datePreset, startDate, endDate]);

  // Filtered dataset
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (activeStart && b.bookingDate < activeStart) return false;
      if (activeEnd && b.bookingDate > activeEnd) return false;
      if (selectedDriver !== 'all' && b.driverId !== selectedDriver) return false;
      if (selectedVehicle !== 'all' && b.vehicleId !== selectedVehicle) return false;
      if (selectedFactory !== 'all' && b.factoryId !== selectedFactory) return false;
      if (selectedCustomer !== 'all' && b.customerId !== selectedCustomer) return false;
      if (selectedStatus !== 'all' && b.status !== selectedStatus) return false;
      return true;
    });
  }, [bookings, activeStart, activeEnd, selectedDriver, selectedVehicle, selectedFactory, selectedCustomer, selectedStatus]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (activeStart && e.date < activeStart) return false;
      if (activeEnd && e.date > activeEnd) return false;
      return true;
    });
  }, [expenses, activeStart, activeEnd]);

  const filteredCommissions = useMemo(() => {
    return commissions.filter(c => {
      if (activeStart && c.date < activeStart) return false;
      if (activeEnd && c.date > activeEnd) return false;
      if (selectedDriver !== 'all' && c.driverId !== selectedDriver) return false;
      if (selectedVehicle !== 'all' && c.vehicleId !== selectedVehicle) return false;
      if (selectedFactory !== 'all' && c.factoryId !== selectedFactory) return false;
      return true;
    });
  }, [commissions, activeStart, activeEnd, selectedDriver, selectedVehicle, selectedFactory]);

  // Key Aggregations
  const totalRevenue = useMemo(() => filteredBookings.reduce((sum, b) => sum + (b.fare || 0), 0), [filteredBookings]);
  const totalCommissionEarned = useMemo(() => filteredBookings.reduce((sum, b) => sum + (b.commission || 0), 0), [filteredBookings]);
  const totalExpensesAmount = useMemo(() => filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0), [filteredExpenses]);
  const netProfit = totalCommissionEarned - totalExpensesAmount;
  const totalTonnage = useMemo(() => filteredBookings.reduce((sum, b) => sum + (Number(b.weight) || 0), 0), [filteredBookings]);

  // Print helper
  const handlePrintReport = () => {
    window.print();
  };

  // CSV Export helper
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;

    if (reportType === 'earnings' || reportType === 'orders') {
      headers = ['Booking ID', 'Date', 'Product', 'Driver', 'Vehicle', 'Factory', 'Customer', 'Fare (PKR)', 'Commission (PKR)', 'Status'];
      rows = filteredBookings.map(b => [
        b.id,
        b.bookingDate,
        `"${b.product || ''}"`,
        `"${drivers.find(d => d.id === b.driverId)?.fullName || 'N/A'}"`,
        `"${vehicles.find(v => v.id === b.vehicleId)?.registrationNumber || 'N/A'}"`,
        `"${factories.find(f => f.id === b.factoryId)?.factoryName || 'N/A'}"`,
        `"${customers.find(c => c.id === b.customerId)?.warehouseName || 'N/A'}"`,
        b.fare || 0,
        b.commission || 0,
        b.status
      ]);
    } else if (reportType === 'expenses') {
      headers = ['Expense ID', 'Date', 'Category', 'Description', 'Amount (PKR)'];
      rows = filteredExpenses.map(e => [
        e.id,
        e.date,
        e.category,
        `"${e.description || ''}"`,
        e.amount || 0
      ]);
    } else if (reportType === 'commissions') {
      headers = ['Commission ID', 'Date', 'Booking ID', 'Fare', 'Commission', 'Payment Status'];
      rows = filteredCommissions.map(c => [
        c.id,
        c.date,
        c.bookingId,
        c.fare || 0,
        c.commission || 0,
        c.paymentStatus
      ]);
    } else if (reportType === 'drivers') {
      headers = ['Driver Name', 'Phone', 'CNIC', 'Total Trips', 'Total Fare Generated', 'Total Commission'];
      rows = drivers.map(d => {
        const driverBookings = filteredBookings.filter(b => b.driverId === d.id);
        const fare = driverBookings.reduce((sum, b) => sum + (b.fare || 0), 0);
        const comm = driverBookings.reduce((sum, b) => sum + (b.commission || 0), 0);
        return [
          `"${d.fullName}"`,
          `"${d.phoneNumber}"`,
          `"${d.cnicNumber}"`,
          driverBookings.length,
          fare,
          comm
        ];
      });
    } else if (reportType === 'vehicles') {
      headers = ['Registration No', 'Type', 'Capacity (Tons)', 'Assigned Driver', 'Fitness Expiry', 'Token Expiry', 'Total Trips'];
      rows = vehicles.map(v => {
        const vBookings = filteredBookings.filter(b => b.vehicleId === v.id);
        const driverName = drivers.find(d => d.id === v.driverId)?.fullName || 'Unassigned';
        return [
          `"${v.registrationNumber}"`,
          `"${v.vehicleType}"`,
          v.capacity || 0,
          `"${driverName}"`,
          v.fitnessExpiry || 'N/A',
          v.tokenExpiry || 'N/A',
          vBookings.length
        ];
      });
    } else if (reportType === 'vehicle_expiries') {
      headers = ['Registration No', 'Vehicle Type', 'Fitness Expiry Date', 'Token Expiry Date', 'Notes'];
      rows = vehicles.map(v => [
        `"${v.registrationNumber}"`,
        `"${v.vehicleType}"`,
        v.fitnessExpiry || 'N/A',
        v.tokenExpiry || 'N/A',
        `"${v.notes || ''}"`
      ]);
    } else {
      // Summary CSV
      headers = ['Metric', 'Value'];
      rows = [
        ['Total Bookings', filteredBookings.length],
        ['Total Cargo Tonnage (Tons)', totalTonnage],
        ['Total Gross Revenue (PKR)', totalRevenue],
        ['Total Commission Earned (PKR)', totalCommissionEarned],
        ['Total Operating Expenses (PKR)', totalExpensesAmount],
        ['Net Agent Profit (PKR)', netProfit]
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-24 animate-fadeIn" id="reports_tab_view">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden print:hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
              <BarChart3 size={16} /> Centralized Reporting Engine
            </div>
            <h1 className="text-xl font-extrabold text-white sm:text-2xl">
              Logistics & Financial Reports
            </h1>
            <p className="text-slate-400 text-xs mt-1 max-w-xl">
              Export comprehensive audit logs, driver performance, expense ledgers, and vehicle document expiries with custom filters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 active:scale-95"
            >
              <Download size={15} /> Export CSV / Excel
            </button>
            <button
              onClick={handlePrintReport}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-1.5 active:scale-95"
            >
              <Printer size={15} /> Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar (Hidden in Print) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-4 print:hidden">
        {/* Report Category Selection Tabs */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Select Report Category</label>
          <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {[
              { id: 'summary', label: 'Business Summary', icon: PieChart },
              { id: 'earnings', label: 'Earnings Report', icon: DollarSign },
              { id: 'expenses', label: 'Expenses Report', icon: TrendingUp },
              { id: 'orders', label: 'Orders & Bookings', icon: Briefcase },
              { id: 'drivers', label: 'Driver Report', icon: Users },
              { id: 'vehicles', label: 'Vehicle Fleet', icon: Truck },
              { id: 'commissions', label: 'Commission Ledger', icon: BarChart3 },
              { id: 'factories', label: 'Factory Partners', icon: Building2 },
              { id: 'customers', label: 'Customers', icon: Warehouse },
              { id: 'vehicle_expiries', label: 'Document Expiries', icon: ShieldAlert },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = reportType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setReportType(tab.id as ReportType)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Time Range</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-blue-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Date Range</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {datePreset === 'custom' && (
            <>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filter by Driver</label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-blue-500"
            >
              <option value="all">All Drivers</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.fullName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filter by Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Report Document Output (Optimized for Screen & Print) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md space-y-6 print:p-0 print:border-none print:shadow-none">
        
        {/* Printable Letterhead Header */}
        <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
          <div>
            <div className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-black">T</span>
              Transport & Commission Agency
            </div>
            <p className="text-slate-500 text-xs font-medium mt-0.5">
              Official Logistics Report • Generated on {new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}
            </p>
          </div>
          <div className="text-right">
            <span className="bg-slate-100 text-slate-800 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {reportType.replace('_', ' ')}
            </span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Period: {activeStart ? `${activeStart} to ${activeEnd || 'Present'}` : 'All Recorded History'}
            </p>
          </div>
        </div>

        {/* Executive Key Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Total Bookings</span>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block">{filteredBookings.length}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{totalTonnage.toFixed(1)} Tons Cargo</span>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Gross Freight Volume</span>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block">Rs. {totalRevenue.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Total Fare Handled</span>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Agent Commission</span>
            <span className="text-xl font-extrabold text-indigo-700 mt-1 block">Rs. {totalCommissionEarned.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Commission Revenue</span>
          </div>

          <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Net Agent Profit</span>
            <span className={`text-xl font-extrabold mt-1 block ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              Rs. {netProfit.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">After Rs. {totalExpensesAmount.toLocaleString()} Expenses</span>
          </div>
        </div>

        {/* Detailed Data Tables Based on Report Type */}
        {reportType === 'earnings' || reportType === 'orders' || reportType === 'summary' ? (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Briefcase size={16} className="text-blue-600" /> Dispatch Orders & Earnings Breakdown
            </h3>
            
            {filteredBookings.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs border border-dashed rounded-2xl">
                No dispatch bookings found for the selected date range or filters.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-3">Booking Date</th>
                      <th className="p-3">Product</th>
                      <th className="p-3">Driver & Vehicle</th>
                      <th className="p-3">Sourcing Factory</th>
                      <th className="p-3">Customer Destination</th>
                      <th className="p-3 text-right">Fare (Rs.)</th>
                      <th className="p-3 text-right">Commission (Rs.)</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredBookings.map(b => {
                      const driver = drivers.find(d => d.id === b.driverId);
                      const vehicle = vehicles.find(v => v.id === b.vehicleId);
                      const factory = factories.find(f => f.id === b.factoryId);
                      const customer = customers.find(c => c.id === b.customerId);

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-slate-900 font-semibold">{b.bookingDate}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-800">{b.product}</span>
                            <span className="text-[10px] text-slate-400 block">{b.weight} Tons</span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold">{driver?.fullName || 'N/A'}</span>
                            <span className="text-[10px] text-slate-400 block">{vehicle?.registrationNumber || 'N/A'}</span>
                          </td>
                          <td className="p-3">{factory?.factoryName || 'N/A'}</td>
                          <td className="p-3">
                            {customer?.warehouseName || 'N/A'}
                            <span className="text-[10px] text-slate-400 block">{customer?.city || ''}</span>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">Rs. {b.fare?.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-blue-600">Rs. {b.commission?.toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                              b.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                              b.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {reportType === 'expenses' && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp size={16} className="text-red-500" /> Operating Expenses Log
            </h3>
            
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs border border-dashed rounded-2xl">
                No expense logs recorded in this period.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">{e.date}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold">
                            {e.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{e.description || 'N/A'}</td>
                        <td className="p-3 text-right font-bold text-red-600">Rs. {e.amount?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {reportType === 'drivers' && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users size={16} className="text-blue-600" /> Driver Performance Ledger
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3">Driver Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">CNIC Number</th>
                    <th className="p-3 text-center">Total Trips</th>
                    <th className="p-3 text-right">Gross Fare Generated</th>
                    <th className="p-3 text-right">Agent Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {drivers.map(d => {
                    const dBookings = filteredBookings.filter(b => b.driverId === d.id);
                    const fare = dBookings.reduce((sum, b) => sum + (b.fare || 0), 0);
                    const comm = dBookings.reduce((sum, b) => sum + (b.commission || 0), 0);

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{d.fullName}</td>
                        <td className="p-3">{d.phoneNumber}</td>
                        <td className="p-3 font-mono text-[11px]">{d.cnicNumber}</td>
                        <td className="p-3 text-center font-bold text-blue-600">{dBookings.length}</td>
                        <td className="p-3 text-right font-bold text-slate-900">Rs. {fare.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">Rs. {comm.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'vehicles' && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Truck size={16} className="text-blue-600" /> Vehicle Fleet Utilization Report
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3">Registration Number</th>
                    <th className="p-3">Type & Capacity</th>
                    <th className="p-3">Assigned Driver</th>
                    <th className="p-3">Fitness Expiry</th>
                    <th className="p-3">Token Expiry</th>
                    <th className="p-3 text-center">Total Trips</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {vehicles.map(v => {
                    const vBookings = filteredBookings.filter(b => b.vehicleId === v.id);
                    const driver = drivers.find(d => d.id === v.driverId);

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{v.registrationNumber}</td>
                        <td className="p-3">
                          <span className="font-semibold">{v.vehicleType}</span>
                          <span className="text-[10px] text-slate-400 block">{v.capacity} Tons</span>
                        </td>
                        <td className="p-3">{driver?.fullName || 'Unassigned'}</td>
                        <td className="p-3 font-mono text-[11px]">{v.fitnessExpiry || 'N/A'}</td>
                        <td className="p-3 font-mono text-[11px]">{v.tokenExpiry || 'N/A'}</td>
                        <td className="p-3 text-center font-bold text-blue-600">{vBookings.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'vehicle_expiries' && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-500" /> Vehicle Document Expiry Tracker
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3">Registration Number</th>
                    <th className="p-3">Vehicle Type</th>
                    <th className="p-3">Fitness Certificate Expiry</th>
                    <th className="p-3">Token Tax Expiry</th>
                    <th className="p-3">Status Alert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {vehicles.map(v => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isFitnessExpired = v.fitnessExpiry && v.fitnessExpiry < todayStr;
                    const isTokenExpired = v.tokenExpiry && v.tokenExpiry < todayStr;

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{v.registrationNumber}</td>
                        <td className="p-3">{v.vehicleType}</td>
                        <td className={`p-3 font-mono text-[11px] ${isFitnessExpired ? 'text-red-600 font-bold' : ''}`}>
                          {v.fitnessExpiry || 'N/A'}
                        </td>
                        <td className={`p-3 font-mono text-[11px] ${isTokenExpired ? 'text-red-600 font-bold' : ''}`}>
                          {v.tokenExpiry || 'N/A'}
                        </td>
                        <td className="p-3">
                          {isFitnessExpired || isTokenExpired ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 flex items-center gap-1 w-fit">
                              <AlertTriangle size={12} /> Document Expired
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                              <CheckCircle2 size={12} /> Documents Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Audit Stamp */}
        <div className="pt-6 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
          <div>
            Transport Operations System • Audit Verified
          </div>
          <div>
            End of Generated Report
          </div>
        </div>

      </div>
    </div>
  );
}
