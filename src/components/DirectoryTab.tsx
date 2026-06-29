/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Plus, 
  Search, 
  Users, 
  X, 
  Share2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Factory, Customer } from '../types';

interface DirectoryTabProps {
  factories: Factory[];
  customers: Customer[];
  accessToken: string | null;
  onAddFactory: (factory: Omit<Factory, 'id' | 'createdAt'>) => void;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  onSyncContact: (fullName: string, phoneNumber: string, role: 'Driver' | 'Factory Manager' | 'Customer Warehouse Manager') => Promise<void>;
}

export default function DirectoryTab({
  factories,
  customers,
  accessToken,
  onAddFactory,
  onAddCustomer,
  onSyncContact
}: DirectoryTabProps) {
  const [subTab, setSubTab] = useState<'factories' | 'customers'>('factories');
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddFactory, setShowAddFactory] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // 1. Factory Form State
  const [factoryName, setFactoryName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [factoryPhone, setFactoryPhone] = useState('');
  const [factoryAddress, setFactoryAddress] = useState('');
  const [factoryNotes, setFactoryNotes] = useState('');

  // 2. Customer Form State
  const [warehouseName, setWarehouseName] = useState('');
  const [company, setCompany] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Contact sync feedback tracking
  const [syncFeedback, setSyncFeedback] = useState<Record<string, 'idle' | 'syncing' | 'done' | 'error'>>({});

  const handleFactorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddFactory({
      factoryName,
      managerName,
      phone: factoryPhone,
      address: factoryAddress,
      notes: factoryNotes
    });

    setFactoryName('');
    setManagerName('');
    setFactoryPhone('');
    setFactoryAddress('');
    setFactoryNotes('');
    setShowAddFactory(false);
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCustomer({
      warehouseName,
      company,
      phone: customerPhone,
      address: customerAddress,
      city: customerCity,
      notes: customerNotes
    });

    setWarehouseName('');
    setCompany('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerCity('');
    setCustomerNotes('');
    setShowAddCustomer(false);
  };

  const triggerContactSync = async (
    id: string, 
    fullName: string, 
    phoneNumber: string, 
    role: 'Driver' | 'Factory Manager' | 'Customer Warehouse Manager'
  ) => {
    setSyncFeedback(prev => ({ ...prev, [id]: 'syncing' }));
    try {
      await onSyncContact(fullName, phoneNumber, role);
      setSyncFeedback(prev => ({ ...prev, [id]: 'done' }));
    } catch (err) {
      setSyncFeedback(prev => ({ ...prev, [id]: 'error' }));
    }
  };

  // Filtered lists based on search
  const filteredFactories = useMemo(() => {
    return factories.filter(f => {
      if (searchQuery.trim() === '') return true;
      const q = searchQuery.toLowerCase();
      return (
        f.factoryName.toLowerCase().includes(q) ||
        f.managerName.toLowerCase().includes(q) ||
        f.phone.toLowerCase().includes(q)
      );
    });
  }, [factories, searchQuery]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (searchQuery.trim() === '') return true;
      const q = searchQuery.toLowerCase();
      return (
        c.warehouseName.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
      );
    });
  }, [customers, searchQuery]);

  return (
    <div className="space-y-4 pb-24 animate-fadeIn" id="directory_tab_view">
      {/* Subtab navigation */}
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => {
            setSubTab('factories');
            setSearchQuery('');
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'factories'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Building2 size={14} /> Factories ({factories.length})
        </button>
        <button
          onClick={() => {
            setSubTab('customers');
            setSearchQuery('');
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'customers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Users size={14} /> Customers ({customers.length})
        </button>
      </div>

      {/* Search and Action bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={subTab === 'factories' ? 'Search factory or manager...' : 'Search warehouse or city...'}
            className="w-full pl-8 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <button
          onClick={() => {
            if (subTab === 'factories') setShowAddFactory(true);
            else setShowAddCustomer(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
        >
          <Plus size={14} /> Add New
        </button>
      </div>

      {/* Directory Item Lists */}
      <div className="space-y-3">
        {subTab === 'factories' ? (
          filteredFactories.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-slate-400 text-xs border border-slate-100">
              No factories listed yet. Tap "Add New" to index a sourcing partner.
            </div>
          ) : (
            filteredFactories.map(f => (
              <div key={f.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-2.5 relative">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{f.factoryName}</h4>
                    <p className="text-xs text-slate-500 font-semibold">Manager: {f.managerName}</p>
                  </div>

                  {/* Sync with Google contacts button */}
                  <button
                    onClick={() => triggerContactSync(f.id, f.managerName, f.phone, 'Factory Manager')}
                    className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
                      syncFeedback[f.id] === 'done' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      syncFeedback[f.id] === 'syncing' ? 'bg-slate-50 text-slate-500 border-slate-200 animate-pulse' :
                      'bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border-slate-200'
                    }`}
                  >
                    <Share2 size={12} />
                    {syncFeedback[f.id] === 'done' ? 'Synced Contacts' : syncFeedback[f.id] === 'syncing' ? 'Syncing...' : 'Sync to Google'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-50 pt-2.5 font-semibold">
                  <p className="flex items-center gap-1"><Phone size={12} className="text-slate-400" /> {f.phone}</p>
                  <p className="flex items-center gap-1 truncate"><MapPin size={12} className="text-slate-400 shrink-0" /> {f.address}</p>
                </div>

                {f.notes && (
                  <div className="bg-slate-50 p-2 rounded-xl text-[10px] text-slate-500 italic mt-1 border border-slate-100/50">
                    Remarks: {f.notes}
                  </div>
                )}
              </div>
            ))
          )
        ) : (
          filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-slate-400 text-xs border border-slate-100">
              No customers listed yet. Tap "Add New" to index a destination warehouse.
            </div>
          ) : (
            filteredCustomers.map(c => (
              <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-2.5 relative">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{c.warehouseName}</h4>
                    <p className="text-xs text-slate-500 font-semibold">Company: {c.company} · {c.city}</p>
                  </div>

                  {/* Sync to Contacts */}
                  <button
                    onClick={() => triggerContactSync(c.id, `${c.warehouseName} Manager`, c.phone, 'Customer Warehouse Manager')}
                    className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
                      syncFeedback[c.id] === 'done' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      syncFeedback[c.id] === 'syncing' ? 'bg-slate-50 text-slate-500 border-slate-200 animate-pulse' :
                      'bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border-slate-200'
                    }`}
                  >
                    <Share2 size={12} />
                    {syncFeedback[c.id] === 'done' ? 'Synced Contacts' : syncFeedback[c.id] === 'syncing' ? 'Syncing...' : 'Sync to Google'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-50 pt-2.5 font-semibold">
                  <p className="flex items-center gap-1"><Phone size={12} className="text-slate-400" /> {c.phone}</p>
                  <p className="flex items-center gap-1 truncate"><MapPin size={12} className="text-slate-400 shrink-0" /> {c.address}</p>
                </div>

                {c.notes && (
                  <div className="bg-slate-50 p-2 rounded-xl text-[10px] text-slate-500 italic mt-1 border border-slate-100/50">
                    Remarks: {c.notes}
                  </div>
                )}
              </div>
            ))
          )
        )}
      </div>

      {/* Add Factory Dialog modal */}
      {showAddFactory && (
        <div className="fixed inset-0 bg-slate-900/60 flex justify-center p-4 z-50 overflow-y-auto items-start sm:items-center animate-fadeIn">
          <form onSubmit={handleFactorySubmit} className="bg-white rounded-3xl w-full max-w-md p-5 space-y-4 my-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">Add Sourcing Factory</h3>
              <button
                type="button"
                onClick={() => setShowAddFactory(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Factory Name</label>
                <input
                  type="text"
                  value={factoryName}
                  onChange={(e) => setFactoryName(e.target.value)}
                  placeholder="e.g. Chenab Mills"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Manager Name</label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. Farhan Ali"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Number</label>
                <input
                  type="tel"
                  value={factoryPhone}
                  onChange={(e) => setFactoryPhone(e.target.value)}
                  placeholder="e.g. 0321-..."
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Complete Address</label>
                <input
                  type="text"
                  value={factoryAddress}
                  onChange={(e) => setFactoryAddress(e.target.value)}
                  placeholder="Faisalabad, Pakistan"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes / Contract Details</label>
              <textarea
                value={factoryNotes}
                onChange={(e) => setFactoryNotes(e.target.value)}
                placeholder="Preferential commission rate is 5%..."
                rows={2}
                className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              Save Factory Profile
            </button>
          </form>
        </div>
      )}

      {/* Add Customer Dialog modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 flex justify-center p-4 z-50 overflow-y-auto items-start sm:items-center animate-fadeIn">
          <form onSubmit={handleCustomerSubmit} className="bg-white rounded-3xl w-full max-w-md p-5 space-y-4 my-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">Add Destination Customer Warehouse</h3>
              <button
                type="button"
                onClick={() => setShowAddCustomer(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Warehouse Name</label>
                <input
                  type="text"
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  placeholder="e.g. Terminal A-3"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Company / Brand</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Metro Group"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0312-..."
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">City</label>
                <input
                  type="text"
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  placeholder="e.g. Lahore"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Raiwind Road"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes / Receiving Hours</label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Receiving open 9 AM to 5 PM only..."
                rows={2}
                className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              Save Customer Profile
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
