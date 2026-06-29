/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  User, 
  Truck, 
  Plus, 
  Phone, 
  FileText, 
  ArrowRight, 
  MapPin, 
  PlusCircle, 
  X, 
  Camera, 
  Hash,
  ChevronRight 
} from 'lucide-react';
import { Driver, Vehicle } from '../types';

interface DriversTabProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  onAddDriver: (driver: Omit<Driver, 'id' | 'createdAt'>) => void;
  onAddVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => void;
}

export default function DriversTab({
  drivers,
  vehicles,
  onAddDriver,
  onAddVehicle
}: DriversTabProps) {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Driver Form State
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [cnicNumber, setCnicNumber] = useState('');
  const [address, setAddress] = useState('');
  const [driverNotes, setDriverNotes] = useState('');
  const [driverPhoto, setDriverPhoto] = useState('');
  const [cnicFront, setCnicFront] = useState('');
  const [cnicBack, setCnicBack] = useState('');

  // 2. Vehicle Form State
  const [regNum, setRegNum] = useState('');
  const [vehicleType, setVehicleType] = useState('6 Wheeler');
  const [capacity, setCapacity] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [regBookImg, setRegBookImg] = useState('');
  const [insurance, setInsurance] = useState('');
  const [fitnessExp, setFitnessExp] = useState(new Date().toISOString().split('T')[0]);
  const [tokenExp, setTokenExp] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNotes, setVehicleNotes] = useState('');

  // Helper: File To Base64 Reader
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Duplicate checks programmatically
  const existingCnics = useMemo(() => drivers.map(d => d.cnicNumber), [drivers]);
  const existingRegs = useMemo(() => vehicles.map(v => v.registrationNumber.toUpperCase()), [vehicles]);

  const handleAddDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (existingCnics.includes(cnicNumber)) {
      alert(`Error: A driver with CNIC ${cnicNumber} already exists in the system.`);
      return;
    }

    onAddDriver({
      fullName,
      fatherName,
      phoneNumber,
      whatsAppNumber,
      cnicNumber,
      address,
      notes: driverNotes,
      photo: driverPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', // Default professional avatar
      cnicFrontImage: cnicFront,
      cnicBackImage: cnicBack
    });

    // Reset Form
    setFullName('');
    setFatherName('');
    setPhoneNumber('');
    setWhatsAppNumber('');
    setCnicNumber('');
    setAddress('');
    setDriverNotes('');
    setDriverPhoto('');
    setCnicFront('');
    setCnicBack('');
    setShowAddDriver(false);
  };

  const handleAddVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedReg = regNum.trim().toUpperCase();
    if (existingRegs.includes(normalizedReg)) {
      alert(`Error: A vehicle with Registration Number ${normalizedReg} already exists in the system.`);
      return;
    }

    if (!selectedDriver) return;

    onAddVehicle({
      driverId: selectedDriver.id,
      registrationNumber: normalizedReg,
      vehicleType,
      capacity: parseFloat(capacity) || 0,
      model,
      color,
      registrationBookImage: regBookImg,
      insurance,
      fitnessExpiry: fitnessExp,
      tokenExpiry: tokenExp,
      notes: vehicleNotes
    });

    // Reset form
    setRegNum('');
    setCapacity('');
    setModel('');
    setColor('');
    setRegBookImg('');
    setInsurance('');
    setVehicleNotes('');
    setShowAddVehicle(false);
  };

  // Search filtered drivers list
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      if (searchQuery.trim() === '') return true;
      const q = searchQuery.toLowerCase();
      const drvVehicles = vehicles.filter(v => v.driverId === d.id);
      const vehicleMatches = drvVehicles.some(v => v.registrationNumber.toLowerCase().includes(q));

      return (
        d.fullName.toLowerCase().includes(q) ||
        d.cnicNumber.toLowerCase().includes(q) ||
        d.phoneNumber.toLowerCase().includes(q) ||
        vehicleMatches
      );
    });
  }, [drivers, vehicles, searchQuery]);

  return (
    <div className="space-y-4 pb-24 animate-fadeIn" id="drivers_tab_view">
      {/* Search Header and Quick Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, CNIC or Vehicle..."
            className="w-full pl-4 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-xs focus:border-blue-500 focus:outline-hidden"
          />
        </div>
        <button
          onClick={() => setShowAddDriver(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
        >
          <Plus size={14} /> Add Driver
        </button>
      </div>

      {/* Grid List of Drivers cards */}
      <div className="grid grid-cols-1 gap-3">
        {filteredDrivers.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center text-slate-400 text-xs">
            No drivers found in system. Register a new driver profile.
          </div>
        ) : (
          filteredDrivers.map(d => {
            const drvVehicles = vehicles.filter(v => v.driverId === d.id);
            return (
              <div
                key={d.id}
                onClick={() => setSelectedDriver(d)}
                className="bg-white p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-xs hover:shadow-md transition-all cursor-pointer relative"
              >
                <img
                  src={d.photo}
                  alt={d.fullName}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-xl object-cover bg-slate-100 border border-slate-200"
                />

                <div className="flex-1 space-y-0.5">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    {d.fullName}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <Phone size={10} /> {d.phoneNumber}
                  </p>

                  {/* Badges of owned vehicles */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {drvVehicles.length === 0 ? (
                      <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.2 rounded-sm font-semibold">
                        No vehicles assigned
                      </span>
                    ) : (
                      drvVehicles.map(v => (
                        <span key={v.id} className="text-[8px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded-sm flex items-center gap-0.5">
                          <Truck size={8} /> {v.registrationNumber}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <ChevronRight size={16} className="text-slate-400" />
              </div>
            );
          })
        )}
      </div>

      {/* Driver Complete Profile Detail Dialog Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-slate-900/60 flex justify-center p-4 z-50 overflow-y-auto items-start sm:items-center animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg p-5 space-y-4 my-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Driver Professional Profile</h3>
              <button
                onClick={() => setSelectedDriver(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Summary Card */}
            <div className="flex items-start gap-4">
              <img
                src={selectedDriver.photo}
                alt={selectedDriver.fullName}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl object-cover bg-slate-50 border border-slate-200"
              />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">{selectedDriver.fullName}</h4>
                <p className="text-xs font-semibold text-slate-400">Father Name: {selectedDriver.fatherName}</p>
                <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Phone size={12} /> {selectedDriver.phoneNumber} {selectedDriver.whatsAppNumber && `(WA: ${selectedDriver.whatsAppNumber})`}
                </p>
                <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Hash size={12} /> CNIC: {selectedDriver.cnicNumber}
                </p>
              </div>
            </div>

            {/* Address & Remarks list */}
            <div className="bg-slate-50 p-3 rounded-2xl space-y-2 text-xs text-slate-600">
              <p className="flex gap-1">
                <MapPin size={14} className="text-slate-400 shrink-0" />
                <span><strong className="text-slate-800">Address:</strong> {selectedDriver.address || 'No address registered.'}</span>
              </p>
              <p className="flex gap-1 border-t border-slate-200/50 pt-2">
                <FileText size={14} className="text-slate-400 shrink-0" />
                <span><strong className="text-slate-800">Special Notes:</strong> {selectedDriver.notes || 'No notes added.'}</span>
              </p>
            </div>

            {/* CNIC Documents Attached gallery */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">CNIC Attachments Verification</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-500 mb-1">CNIC FRONT</span>
                  {selectedDriver.cnicFrontImage ? (
                    <img src={selectedDriver.cnicFrontImage} referrerPolicy="no-referrer" className="w-full h-24 rounded-lg object-contain" />
                  ) : (
                    <div className="h-24 flex items-center justify-center text-[10px] text-slate-400 font-semibold">No Image</div>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-500 mb-1">CNIC BACK</span>
                  {selectedDriver.cnicBackImage ? (
                    <img src={selectedDriver.cnicBackImage} referrerPolicy="no-referrer" className="w-full h-24 rounded-lg object-contain" />
                  ) : (
                    <div className="h-24 flex items-center justify-center text-[10px] text-slate-400 font-semibold">No Image</div>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicles lists assigned */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Assigned Vehicles ({vehicles.filter(v => v.driverId === selectedDriver.id).length})</span>
                <button
                  onClick={() => setShowAddVehicle(true)}
                  className="text-xs font-bold text-blue-600 flex items-center gap-0.5"
                >
                  <Plus size={14} /> Add Vehicle
                </button>
              </div>

              <div className="space-y-2">
                {vehicles.filter(v => v.driverId === selectedDriver.id).map(v => (
                  <div key={v.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/50 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-bold text-slate-800">{v.registrationNumber}</span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">{v.vehicleType}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-semibold">
                      <p>Capacity: {v.capacity} Tons</p>
                      <p>Model: {v.color} {v.model}</p>
                      <p>Insurance: {v.insurance || 'None'}</p>
                      <p>Token Expiry: {v.tokenExpiry}</p>
                    </div>
                    {v.registrationBookImage && (
                      <div className="pt-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Registration Book Photo</span>
                        <img src={v.registrationBookImage} referrerPolicy="no-referrer" className="w-full h-24 rounded-lg object-contain bg-white border border-slate-100" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Sub-Modal inside Driver Profile Details */}
      {showAddVehicle && selectedDriver && (
        <div className="fixed inset-0 bg-slate-900/60 flex justify-center p-4 z-50 overflow-y-auto items-start sm:items-center animate-fadeIn">
          <form onSubmit={handleAddVehicleSubmit} className="bg-white rounded-3xl w-full max-w-md p-5 space-y-4 my-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">Add Vehicle for {selectedDriver.fullName}</h3>
              <button
                type="button"
                onClick={() => setShowAddVehicle(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reg. Number (Unique)</label>
                <input
                  type="text"
                  value={regNum}
                  onChange={(e) => setRegNum(e.target.value)}
                  placeholder="e.g. MNV-4322"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                >
                  <option value="6 Wheeler">6 Wheeler</option>
                  <option value="10 Wheeler">10 Wheeler</option>
                  <option value="Mazda Truck">Mazda Truck</option>
                  <option value="Flatbed Container">Flatbed Container</option>
                  <option value="Heavy Dumper">Heavy Dumper</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capacity (Tons)</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Model Year</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. 2018"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Color</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g. Red"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Token Expiry</label>
                <input
                  type="date"
                  value={tokenExp}
                  onChange={(e) => setTokenExp(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Insurance Info</label>
                <input
                  type="text"
                  value={insurance}
                  onChange={(e) => setInsurance(e.target.value)}
                  placeholder="Policy / Company"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Document Attachments inside Vehicle */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Registration Book Image</label>
              <div className="mt-1 flex items-center gap-3">
                <label className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 text-xs font-semibold text-slate-600">
                  <Camera size={14} className="text-blue-500" />
                  Select Document File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setRegBookImg)}
                    className="hidden"
                  />
                </label>
                {regBookImg && <span className="text-[10px] font-bold text-emerald-600">✓ Image Loaded</span>}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              Link Vehicle to Profile
            </button>
          </form>
        </div>
      )}

      {/* Add Driver Full Modal Dialog */}
      {showAddDriver && (
        <div className="fixed inset-0 bg-slate-900/60 flex justify-center p-4 z-50 overflow-y-auto items-start sm:items-center animate-fadeIn">
          <form onSubmit={handleAddDriverSubmit} className="bg-white rounded-3xl w-full max-w-lg p-5 space-y-3 my-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">Register Driver Profile</h3>
              <button
                type="button"
                onClick={() => setShowAddDriver(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Zain Mushtaq"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Father Name</label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Father Name"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0300..."
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">WhatsApp No.</label>
                <input
                  type="tel"
                  value={whatsAppNumber}
                  onChange={(e) => setWhatsAppNumber(e.target.value)}
                  placeholder="WhatsApp No."
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CNIC No. (Unique)</label>
                <input
                  type="text"
                  value={cnicNumber}
                  onChange={(e) => setCnicNumber(e.target.value)}
                  placeholder="35201-..."
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Complete home address"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Special Profile Remarks</label>
                <input
                  type="text"
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder="Reliable, night driver, etc."
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Document Attachments - Base64 Upload widgets */}
            <div className="space-y-2 border-t border-slate-100 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Attached Profile Verification Files</span>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Driver Photo</span>
                  <label className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                    <Camera size={14} className="text-slate-400" />
                    <span className="text-[8px] font-bold text-slate-500 mt-1">Upload</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setDriverPhoto)} className="hidden" />
                  </label>
                  {driverPhoto && <span className="text-[8px] font-bold text-emerald-600 block text-center mt-1">✓ Loaded</span>}
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">CNIC Front</span>
                  <label className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                    <Camera size={14} className="text-slate-400" />
                    <span className="text-[8px] font-bold text-slate-500 mt-1">Upload</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setCnicFront)} className="hidden" />
                  </label>
                  {cnicFront && <span className="text-[8px] font-bold text-emerald-600 block text-center mt-1">✓ Loaded</span>}
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">CNIC Back</span>
                  <label className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                    <Camera size={14} className="text-slate-400" />
                    <span className="text-[8px] font-bold text-slate-500 mt-1">Upload</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setCnicBack)} className="hidden" />
                  </label>
                  {cnicBack && <span className="text-[8px] font-bold text-emerald-600 block text-center mt-1">✓ Loaded</span>}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all mt-2"
            >
              Verify & Register Driver
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
