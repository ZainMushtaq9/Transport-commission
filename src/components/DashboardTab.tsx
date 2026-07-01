/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  DollarSign, 
  Calendar, 
  Briefcase, 
  Truck, 
  User, 
  MapPin, 
  Trash2 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { Booking, Expense, Driver, Factory, Vehicle, Commission } from '../types';

interface DashboardTabProps {
  bookings: Booking[];
  expenses: Expense[];
  commissions: Commission[];
  drivers: Driver[];
  vehicles: Vehicle[];
  factories: Factory[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  onDeleteExpense: (id: string) => void;
}

export default function DashboardTab({
  bookings,
  expenses,
  commissions = [],
  drivers,
  vehicles,
  factories,
  onAddExpense,
  onDeleteExpense
}: DashboardTabProps) {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');
  const [showAddExpense, setShowAddExpense] = useState(false);
  
  // New Expense Form State
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Fuel');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Color palette for charts
  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8'];

  // Current Local Date helpers
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const startOfWeekDate = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  }, []);

  const startOfMonthDate = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  }, []);

  const startOfYearDate = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0];
  }, []);

  // Filter bookings based on range
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'Cancelled') return false;
      if (dateRange === 'all') return true;
      if (dateRange === 'today') return b.bookingDate === todayStr;
      if (dateRange === 'week') return b.bookingDate >= startOfWeekDate;
      if (dateRange === 'month') return b.bookingDate >= startOfMonthDate;
      if (dateRange === 'year') return b.bookingDate >= startOfYearDate;
      return true;
    });
  }, [bookings, dateRange, todayStr, startOfWeekDate, startOfMonthDate, startOfYearDate]);

  // Filter expenses based on range
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (dateRange === 'all') return true;
      if (dateRange === 'today') return e.date === todayStr;
      if (dateRange === 'week') return e.date >= startOfWeekDate;
      if (dateRange === 'month') return e.date >= startOfMonthDate;
      if (dateRange === 'year') return e.date >= startOfYearDate;
      return true;
    });
  }, [expenses, dateRange, todayStr, startOfWeekDate, startOfMonthDate, startOfYearDate]);

  // Filter commissions based on range
  const filteredCommissions = useMemo(() => {
    return commissions.filter(c => {
      if (dateRange === 'all') return true;
      if (dateRange === 'today') return c.date === todayStr;
      if (dateRange === 'week') return c.date >= startOfWeekDate;
      if (dateRange === 'month') return c.date >= startOfMonthDate;
      if (dateRange === 'year') return c.date >= startOfYearDate;
      return true;
    });
  }, [commissions, dateRange, todayStr, startOfWeekDate, startOfMonthDate, startOfYearDate]);

  // Core Metrics
  const metrics = useMemo(() => {
    let totalFare = 0;
    let totalCommission = 0;
    filteredBookings.forEach(b => {
      totalFare += b.fare;
      totalCommission += b.commission;
    });

    let totalExpense = 0;
    filteredExpenses.forEach(e => {
      totalExpense += e.amount;
    });

    let remainingCommission = 0;
    filteredCommissions.forEach(c => {
      if (c.paymentStatus === 'Unpaid') {
        remainingCommission += c.commission;
      }
    });

    return {
      fare: totalFare,
      commission: totalCommission,
      expense: totalExpense,
      netProfit: totalCommission - totalExpense,
      remainingCommission,
      tripsCount: filteredBookings.length
    };
  }, [filteredBookings, filteredExpenses, filteredCommissions]);

  // Factory-wise Commission calculations
  const factoryCommissionData = useMemo(() => {
    const factoryMap: Record<string, number> = {};
    filteredBookings.forEach(b => {
      const factory = factories.find(f => f.id === b.factoryId);
      const name = factory ? factory.factoryName : 'Unknown Factory';
      factoryMap[name] = (factoryMap[name] || 0) + b.commission;
    });

    return Object.entries(factoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredBookings, factories]);

  // Driver-wise Commission calculations
  const driverCommissionData = useMemo(() => {
    const driverMap: Record<string, number> = {};
    filteredBookings.forEach(b => {
      const driver = drivers.find(d => d.id === b.driverId);
      const name = driver ? driver.fullName : 'Unknown Driver';
      driverMap[name] = (driverMap[name] || 0) + b.commission;
    });

    return Object.entries(driverMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredBookings, drivers]);

  // Vehicle-wise earnings
  const vehicleEarningsData = useMemo(() => {
    const vehicleMap: Record<string, number> = {};
    filteredBookings.forEach(b => {
      const vehicle = vehicles.find(v => v.id === b.vehicleId);
      const reg = vehicle ? vehicle.registrationNumber : 'Unknown Reg';
      vehicleMap[reg] = (vehicleMap[reg] || 0) + b.commission;
    });

    return Object.entries(vehicleMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredBookings, vehicles]);

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    onAddExpense({
      date: expenseDate,
      category: expenseCategory,
      amount: amountNum,
      description: expenseDesc
    });

    setExpenseAmount('');
    setExpenseDesc('');
    setShowAddExpense(false);
  };

  return (
    <div className="space-y-6 pb-24" id="dashboard_tab_container">
      {/* Date Range Selector Bar */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between bg-white p-3 rounded-2xl shadow-xs border border-slate-100 gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Period</span>
        <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full scrollbar-none">
          {(['today', 'week', 'month', 'year', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                dateRange === range
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {range === 'all' ? 'All Time' : range}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Metrics Grid (Mobile-First / One-hand target) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-2xl text-white shadow-md relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-15">
            <TrendingUp size={100} />
          </div>
          <p className="text-xs text-blue-100 font-medium">Total Commission</p>
          <p className="text-2xl font-bold mt-1">Rs. {metrics.commission.toLocaleString()}</p>
          <div className="mt-2 text-[10px] text-blue-100 flex items-center gap-1">
            <span className="font-semibold bg-blue-500/30 px-1.5 py-0.5 rounded-sm">
              {metrics.tripsCount} Trips
            </span>
            <span>Total Fare: Rs. {metrics.fare.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 relative overflow-hidden">
          <p className="text-xs text-slate-500 font-medium">Total Expenses</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">Rs. {metrics.expense.toLocaleString()}</p>
          <button 
            onClick={() => setShowAddExpense(!showAddExpense)}
            className="mt-2 text-xs text-blue-600 font-semibold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-all w-fit"
          >
            <Plus size={14} /> Record Expense
          </button>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-2xl text-white shadow-md relative overflow-hidden col-span-2">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-15">
            <DollarSign size={100} />
          </div>
          <p className="text-xs text-amber-100 font-medium">Remaining Commission</p>
          <p className="text-2xl font-bold mt-1">Rs. {metrics.remainingCommission.toLocaleString()}</p>
          <p className="mt-2 text-[10px] text-amber-100 font-semibold tracking-tight">
            Pending / Unpaid receivables to collect from factories
          </p>
        </div>
      </div>

      {/* Net Earnings Banner */}
      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2.5 rounded-xl text-white shadow-xs">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs text-emerald-700 font-medium">Net Profit (After Expenses)</p>
            <p className="text-xl font-bold text-emerald-900">Rs. {metrics.netProfit.toLocaleString()}</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
          {metrics.commission > 0 ? `${Math.round((metrics.netProfit / metrics.commission) * 100)}% Margin` : '0%'}
        </span>
      </div>

      {/* Add Expense Drawer/Form overlay */}
      {showAddExpense && (
        <form onSubmit={handleExpenseSubmit} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-lg space-y-3 animate-fadeIn">
          <div className="flex justify-between items-center pb-1">
            <h3 className="text-sm font-semibold text-slate-800">Record New Expense</h3>
            <button 
              type="button" 
              onClick={() => setShowAddExpense(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
              <select 
                value={expenseCategory} 
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="Fuel">Fuel</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Office">Office Rent / Bill</option>
                <option value="Tea/Food">Tea & Refreshment</option>
                <option value="Marketing">Marketing / Bribe</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount (Rs.)</label>
              <input 
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="Amount"
                className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</label>
              <input 
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</label>
              <input 
                type="text"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                placeholder="e.g. Fuel for Mazda 4322"
                className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition-all"
          >
            Save Expense
          </button>
        </form>
      )}

      {/* Visual Analytics Charts Section */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Commission Visual Analytics</h3>

        {/* Factory-wise Chart */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <Briefcase size={14} className="text-blue-500" /> Top Factories Contribution (Rs.)
          </h4>
          {factoryCommissionData.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No data to display. Add bookings.</p>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={factoryCommissionData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <Tooltip formatter={(v) => `Rs. ${v}`} />
                  <Bar dataKey="value" fill="#2563eb" radius={[0, 8, 8, 0]}>
                    {factoryCommissionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Vehicle-wise and Driver-wise earnings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Truck size={14} className="text-blue-500" /> Vehicle-wise Earnings
            </h4>
            {vehicleEarningsData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No vehicle earnings.</p>
            ) : (
              <div className="space-y-2">
                {vehicleEarningsData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl">
                    <span className="font-mono font-bold text-slate-700">{item.name}</span>
                    <span className="font-semibold text-blue-600">Rs. {item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <User size={14} className="text-blue-500" /> Driver-wise Earnings
            </h4>
            {driverCommissionData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No driver earnings.</p>
            ) : (
              <div className="space-y-2">
                {driverCommissionData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl">
                    <span className="font-semibold text-slate-700">{item.name}</span>
                    <span className="font-semibold text-blue-600">Rs. {item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expense History Log list */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-3">
        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Expense Logs ({filteredExpenses.length})</h3>
          <span className="text-[10px] text-slate-400 font-semibold">Swipe to scroll</span>
        </div>

        {filteredExpenses.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No expenses registered in this period.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredExpenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-all border border-slate-50">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    exp.category === 'Fuel' ? 'bg-orange-500' :
                    exp.category === 'Maintenance' ? 'bg-indigo-500' :
                    exp.category === 'Tea/Food' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-xs font-bold text-slate-800">{exp.category}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{exp.description || 'No remarks'} · {exp.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Rs. {exp.amount.toLocaleString()}</span>
                  <button 
                    onClick={() => {
                      if (window.confirm('Delete this expense?')) onDeleteExpense(exp.id);
                    }}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
