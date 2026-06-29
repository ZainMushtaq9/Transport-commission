/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Briefcase, 
  DollarSign, 
  Truck, 
  User, 
  Users, 
  Settings, 
  Plus, 
  Search, 
  Bell, 
  Menu, 
  Compass, 
  CloudCheck, 
  HelpCircle, 
  ChevronRight, 
  Check, 
  X, 
  Database, 
  LogOut 
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  query,
  where
} from 'firebase/firestore';

// Subcomponents
import DashboardTab from './components/DashboardTab';
import BookingsTab from './components/BookingsTab';
import CommissionsTab from './components/CommissionsTab';
import DriversTab from './components/DriversTab';
import DirectoryTab from './components/DirectoryTab';
import SettingsTab from './components/SettingsTab';
import SearchOverlay from './components/SearchOverlay';

// Setup modules
import { 
  auth, 
  db, 
  initAuth, 
  googleSignIn, 
  logout, 
  setAccessToken 
} from './firebase';
import { 
  setupFolderStructure, 
  backupDataToDrive, 
  listBackupsInDrive, 
  restoreBackupFromDrive, 
  exportToGoogleSheets, 
  sendGmailEmail, 
  addGoogleCalendarEvent, 
  addGoogleContact 
} from './utils/googleWorkspace';
import { 
  Driver, 
  Vehicle, 
  Factory, 
  Customer, 
  Booking, 
  Commission, 
  Expense, 
  NotificationRef, 
  BackupMetadata 
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'commissions' | 'drivers' | 'directory' | 'settings'>('dashboard');
  
  // Auth and Token states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Core Data Lists
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<NotificationRef[]>([]);

  // Backup state
  const [backupMetadata, setBackupMetadata] = useState<BackupMetadata>({
    lastBackupDate: localStorage.getItem('tcm_last_backup') || '',
    status: 'idle'
  });

  // Global Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // FAB Floating Action Menu toggle
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Notification Pane toggle
  const [showNotifications, setShowNotifications] = useState(false);

  // Demo seed checker
  const isDataSeeded = useRef(false);

  // Session inactivity states
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const INACTIVITY_TIMEOUT = 300; // 5 minutes (300 seconds)

  // --- 1. LOCAL DATA FALLBACKS (OFFLINE-FIRST DESIGN) ---
  const loadLocalData = () => {
    try {
      setDrivers(JSON.parse(localStorage.getItem('tcm_drivers') || '[]'));
      setVehicles(JSON.parse(localStorage.getItem('tcm_vehicles') || '[]'));
      setFactories(JSON.parse(localStorage.getItem('tcm_factories') || '[]'));
      setCustomers(JSON.parse(localStorage.getItem('tcm_customers') || '[]'));
      setBookings(JSON.parse(localStorage.getItem('tcm_bookings') || '[]'));
      setCommissions(JSON.parse(localStorage.getItem('tcm_commissions') || '[]'));
      setExpenses(JSON.parse(localStorage.getItem('tcm_expenses') || '[]'));
      setNotifications(JSON.parse(localStorage.getItem('tcm_notifications') || '[]'));
    } catch (e) {
      console.error('Error loading fallback local state:', e);
    }
  };

  const saveLocalData = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Ensure a clean production slate: if demo data was previously seeded, wipe it once.
  useEffect(() => {
    const wasSeeded = localStorage.getItem('tcm_seeded');
    if (wasSeeded === 'yes') {
      localStorage.removeItem('tcm_drivers');
      localStorage.removeItem('tcm_vehicles');
      localStorage.removeItem('tcm_factories');
      localStorage.removeItem('tcm_customers');
      localStorage.removeItem('tcm_bookings');
      localStorage.removeItem('tcm_commissions');
      localStorage.removeItem('tcm_expenses');
      localStorage.removeItem('tcm_notifications');
      localStorage.removeItem('tcm_last_backup');
      localStorage.removeItem('tcm_seeded');
    }
    loadLocalData();
  }, []);

  // Inactivity tracking mechanism to auto logout and lock session
  useEffect(() => {
    if (isSessionLocked) return;

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Listen to touch/mouse/scroll/key events
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    const interval = setInterval(async () => {
      const elapsedSeconds = (Date.now() - lastActivityRef.current) / 1000;
      if (elapsedSeconds >= INACTIVITY_TIMEOUT) {
        setIsSessionLocked(true);
        if (auth.currentUser) {
          try {
            await logout();
            setUser(null);
            setAccessTokenState(null);
            loadLocalData();
          } catch (e) {
            console.error('Error on auto session logout:', e);
          }
        }
      }
    }, 5000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(interval);
    };
  }, [isSessionLocked]);

  // --- 2. FIRESTORE REAL-TIME SYNC ENGINE ---
  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubAuth = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) setAccessTokenState(token);
      },
      () => {
        setUser(null);
        setAccessTokenState(null);
      }
    );

    return () => {
      unsubAuth();
    };
  }, []);

  // Sync state into Firestore collections if user is authenticated
  useEffect(() => {
    if (!user) return;

    // Listeners for collections
    const unsubDrivers = onSnapshot(query(collection(db, 'drivers'), where('userId', '==', user.uid)), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
      setDrivers(data);
      saveLocalData('tcm_drivers', data);
    });

    const unsubVehicles = onSnapshot(query(collection(db, 'vehicles'), where('userId', '==', user.uid)), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      setVehicles(data);
      saveLocalData('tcm_vehicles', data);
    });

    const unsubFactories = onSnapshot(query(collection(db, 'factories'), where('userId', '==', user.uid)), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Factory));
      setFactories(data);
      saveLocalData('tcm_factories', data);
    });

    const unsubCustomers = onSnapshot(query(collection(db, 'customers'), where('userId', '==', user.uid)), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(data);
      saveLocalData('tcm_customers', data);
    });

    const unsubBookings = onSnapshot(query(collection(db, 'bookings'), where('userId', '==', user.uid)), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
      saveLocalData('tcm_bookings', data);
    });

    const unsubCommissions = onSnapshot(query(collection(db, 'commissions'), where('userId', '==', user.uid)), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Commission));
      setCommissions(data);
      saveLocalData('tcm_commissions', data);
    });

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), where('userId', '==', user.uid)), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(data);
      saveLocalData('tcm_expenses', data);
    });

    const unsubNotifications = onSnapshot(query(collection(db, 'notifications'), where('userId', '==', user.uid)), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationRef));
      setNotifications(data);
      saveLocalData('tcm_notifications', data);
    });

    return () => {
      unsubDrivers();
      unsubVehicles();
      unsubFactories();
      unsubCustomers();
      unsubBookings();
      unsubCommissions();
      unsubExpenses();
      unsubNotifications();
    };
  }, [user]);

  // --- 3. GOOGLE SIGN-IN FLOW ---
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessTokenState(result.accessToken);
        setAccessToken(result.accessToken);

        // Upload any local data that exists to Firestore to unify registries
        await syncLocalToFirestore();
        addNotification('Google Synced', 'Authorized Google Workspace scopes and unified database.');

        // Unlock security overlay on successful login
        setIsSessionLocked(false);
        lastActivityRef.current = Date.now();
      }
    } catch (e) {
      console.error('Google Sign In Error:', e);
      alert('Login failed: ' + (e as Error).message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessTokenState(null);
    loadLocalData();
    addNotification('Google Logged Out', 'Access token revoked. Working offline with local caches.');
  };

  // Helper to sync local data elements to Firestore collections
  const syncLocalToFirestore = async () => {
    try {
      const collectionsToSync = {
        drivers,
        vehicles,
        factories,
        customers,
        bookings,
        commissions,
        expenses,
        notifications
      };

      for (const [colName, list] of Object.entries(collectionsToSync)) {
        for (const item of list) {
          const docRef = doc(db, colName, item.id);
          await setDoc(docRef, { ...item, userId: user.uid }, { merge: true });
        }
      }
    } catch (err) {
      console.error('Failed syncing local changes to Firestore:', err);
    }
  };

  // --- 4. CORE DATABASE ACTION TRIGGERS ---
  const addNotification = async (title: string, message: string) => {
    const notif: NotificationRef = {
      id: 'n-' + Math.random().toString(36).substr(2, 9),
      title,
      message,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
      userId: user?.uid
    };

    const updated = [notif, ...notifications];
    setNotifications(updated);
    saveLocalData('tcm_notifications', updated);

    if (user) {
      try {
        await setDoc(doc(db, 'notifications', notif.id), notif);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddDriver = async (driverInput: Omit<Driver, 'id' | 'createdAt'>) => {
    const newDriver: Driver = {
      ...driverInput,
      id: 'drv-' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      userId: user?.uid
    };

    const updated = [...drivers, newDriver];
    setDrivers(updated);
    saveLocalData('tcm_drivers', updated);

    if (user) {
      await setDoc(doc(db, 'drivers', newDriver.id), newDriver);
    }

    addNotification('Driver Added', `Successfully registered profile for ${newDriver.fullName}.`);
  };

  const handleAddVehicle = async (vehicleInput: Omit<Vehicle, 'id' | 'createdAt'>) => {
    const newVehicle: Vehicle = {
      ...vehicleInput,
      id: 'veh-' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      userId: user?.uid
    };

    const updated = [...vehicles, newVehicle];
    setVehicles(updated);
    saveLocalData('tcm_vehicles', updated);

    if (user) {
      await setDoc(doc(db, 'vehicles', newVehicle.id), newVehicle);
    }

    addNotification('Vehicle Registered', `Linked ${newVehicle.registrationNumber} (${newVehicle.vehicleType}) successfully.`);
  };

  const handleAddFactory = async (factoryInput: Omit<Factory, 'id' | 'createdAt'>) => {
    const newFactory: Factory = {
      ...factoryInput,
      id: 'fac-' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      userId: user?.uid
    };

    const updated = [...factories, newFactory];
    setFactories(updated);
    saveLocalData('tcm_factories', updated);

    if (user) {
      await setDoc(doc(db, 'factories', newFactory.id), newFactory);
    }

    addNotification('Factory Indexed', `Added sourcing partner: ${newFactory.factoryName}.`);
  };

  const handleAddCustomer = async (customerInput: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      ...customerInput,
      id: 'cust-' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      userId: user?.uid
    };

    const updated = [...customers, newCustomer];
    setCustomers(updated);
    saveLocalData('tcm_customers', updated);

    if (user) {
      await setDoc(doc(db, 'customers', newCustomer.id), newCustomer);
    }

    addNotification('Warehouse Added', `Added warehouse location: ${newCustomer.warehouseName}.`);
  };

  const handleAddBooking = async (bookingInput: Omit<Booking, 'id' | 'createdAt'>) => {
    const bookingId = 'bkg-' + Math.random().toString(36).substr(2, 9);
    const newBooking: Booking = {
      ...bookingInput,
      id: bookingId,
      createdAt: new Date().toISOString(),
      userId: user?.uid
    };

    // Auto-create Commission record side-by-side
    const newCommission: Commission = {
      id: 'com-' + Math.random().toString(36).substr(2, 9),
      bookingId: bookingId,
      driverId: bookingInput.driverId,
      vehicleId: bookingInput.vehicleId,
      factoryId: bookingInput.factoryId,
      date: bookingInput.bookingDate,
      fare: bookingInput.fare,
      commission: bookingInput.commission,
      paymentStatus: 'Unpaid',
      createdAt: new Date().toISOString(),
      userId: user?.uid
    };

    setBookings(prev => [...prev, newBooking]);
    setCommissions(prev => [...prev, newCommission]);

    saveLocalData('tcm_bookings', [...bookings, newBooking]);
    saveLocalData('tcm_commissions', [...commissions, newCommission]);

    if (user) {
      await setDoc(doc(db, 'bookings', newBooking.id), newBooking);
      await setDoc(doc(db, 'commissions', newCommission.id), newCommission);
    }

    addNotification('Order Dispatched', `Booking dispatched: ${newBooking.product} (Rs. ${newBooking.commission} Comm).`);

    // Smart Trigger: Google Calendar Addition automatically if connected
    if (accessToken) {
      try {
        const factory = factories.find(f => f.id === newBooking.factoryId)?.factoryName || 'Factory';
        const customer = customers.find(c => c.id === newBooking.customerId)?.warehouseName || 'Warehouse';
        await addGoogleCalendarEvent(
          accessToken,
          `Booking: ${newBooking.product} delivery`,
          newBooking.bookingDate,
          `Transporting ${newBooking.weight} Tons from ${factory} to ${customer}. Fare: Rs. ${newBooking.fare}. Commission: Rs. ${newBooking.commission}`
        );
        addNotification('Google Calendar Linked', 'Automatically pinned delivery date onto your Google Calendar.');
      } catch (err) {
        console.error('Calendar auto add error:', err);
      }
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: Booking['status']) => {
    const updated = bookings.map(b => b.id === id ? { ...b, status } : b);
    setBookings(updated);
    saveLocalData('tcm_bookings', updated);

    if (user) {
      await updateDoc(doc(db, 'bookings', id), { status });
    }

    addNotification('Trip Status Updated', `Booking status changed to "${status}".`);
  };

  const handleToggleCommissionStatus = async (bookingId: string, currentStatus: 'Paid' | 'Unpaid') => {
    const newStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    const updatedComms = commissions.map(c => 
      c.bookingId === bookingId ? { ...c, paymentStatus: newStatus as any } : c
    );
    setCommissions(updatedComms);
    saveLocalData('tcm_commissions', updatedComms);

    if (user) {
      // Find the specific commission ID
      const targetComm = commissions.find(c => c.bookingId === bookingId);
      if (targetComm) {
        await updateDoc(doc(db, 'commissions', targetComm.id), { paymentStatus: newStatus });
      }
    }

    addNotification('Ledger Updated', `Commission marked as ${newStatus === 'Paid' ? 'Cleared' : 'Unpaid'}.`);
  };

  const handleAddExpense = async (expenseInput: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...expenseInput,
      id: 'exp-' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      userId: user?.uid
    };

    const updated = [...expenses, newExpense];
    setExpenses(updated);
    saveLocalData('tcm_expenses', updated);

    if (user) {
      await setDoc(doc(db, 'expenses', newExpense.id), newExpense);
    }

    addNotification('Expense Recorded', `Logged Rs. ${newExpense.amount} for ${newExpense.category}.`);
  };

  const handleDeleteExpense = async (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    saveLocalData('tcm_expenses', updated);

    if (user) {
      await deleteDoc(doc(db, 'expenses', id));
    }

    addNotification('Expense Deleted', 'Removed expense log entry.');
  };

  // --- 5. WORKSPACE API BACKUPS & EXPORTS ---
  const handleTriggerBackup = async () => {
    if (!accessToken) {
      alert('Backup requires active Google login authorization.');
      return;
    }

    setBackupMetadata({ status: 'backing_up', lastBackupDate: backupMetadata.lastBackupDate });
    try {
      const folders = await setupFolderStructure(accessToken);
      const payload = {
        drivers,
        vehicles,
        factories,
        customers,
        bookings,
        commissions,
        expenses,
        backupDate: new Date().toISOString()
      };

      await backupDataToDrive(accessToken, folders.backupsFolderId, payload);
      
      const lastBackupStr = new Date().toLocaleString();
      localStorage.setItem('tcm_last_backup', lastBackupStr);
      
      setBackupMetadata({
        status: 'success',
        lastBackupDate: lastBackupStr,
        message: 'Successfully generated and uploaded secure backup onto your Google Drive!'
      });

      addNotification('Backup Completed', 'Secure backup snapshot synchronized to Google Drive.');
    } catch (err) {
      console.error(err);
      setBackupMetadata({
        status: 'error',
        lastBackupDate: backupMetadata.lastBackupDate,
        message: 'Drive write error: ' + (err as Error).message
      });
    }
  };

  const handleFetchDriveBackups = async () => {
    if (!accessToken) return [];
    try {
      const folders = await setupFolderStructure(accessToken);
      return await listBackupsInDrive(accessToken, folders.backupsFolderId);
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const handleTriggerRestore = async (fileId: string) => {
    if (!accessToken) return;
    setBackupMetadata({ status: 'restoring', lastBackupDate: backupMetadata.lastBackupDate });
    try {
      const data = await restoreBackupFromDrive(accessToken, fileId);
      
      // Save elements locally
      if (data.drivers) {
        setDrivers(data.drivers);
        saveLocalData('tcm_drivers', data.drivers);
      }
      if (data.vehicles) {
        setVehicles(data.vehicles);
        saveLocalData('tcm_vehicles', data.vehicles);
      }
      if (data.factories) {
        setFactories(data.factories);
        saveLocalData('tcm_factories', data.factories);
      }
      if (data.customers) {
        setCustomers(data.customers);
        saveLocalData('tcm_customers', data.customers);
      }
      if (data.bookings) {
        setBookings(data.bookings);
        saveLocalData('tcm_bookings', data.bookings);
      }
      if (data.commissions) {
        setCommissions(data.commissions);
        saveLocalData('tcm_commissions', data.commissions);
      }
      if (data.expenses) {
        setExpenses(data.expenses);
        saveLocalData('tcm_expenses', data.expenses);
      }

      // Sync elements to Firestore to propagate restore across all logged-in instances
      await syncLocalToFirestore();

      setBackupMetadata({
        status: 'success',
        lastBackupDate: backupMetadata.lastBackupDate,
        message: 'Database restore and phone migration completed successfully!'
      });

      addNotification('Data Restored', 'Successfully restored database point from Drive backups.');
    } catch (err) {
      console.error(err);
      setBackupMetadata({
        status: 'error',
        lastBackupDate: backupMetadata.lastBackupDate,
        message: 'Restore failed: ' + (err as Error).message
      });
    }
  };

  const handleSyncContact = async (
    fullName: string, 
    phoneNumber: string, 
    role: 'Driver' | 'Factory Manager' | 'Customer Warehouse Manager'
  ) => {
    if (!accessToken) {
      alert('Authentication required: Sign in to link Contacts.');
      return;
    }
    await addGoogleContact(accessToken, fullName, phoneNumber, role);
    addNotification('Contact Synced', `Synced contact ${fullName} to Google Contacts.`);
  };

  const handleTriggerGmail = async (booking: Booking, email: string) => {
    if (!accessToken) return;
    const driver = drivers.find(d => d.id === booking.driverId)?.fullName || 'N/A';
    const vehicle = vehicles.find(v => v.id === booking.vehicleId)?.registrationNumber || 'N/A';
    const factory = factories.find(f => f.id === booking.factoryId)?.factoryName || 'N/A';
    const customer = customers.find(c => c.id === booking.customerId)?.warehouseName || 'N/A';

    const mailHtml = `
      <h3>Transport Dispatch Invoice Confirmation</h3>
      <p>Dear Sourcing Manager,</p>
      <p>Here are the verified transport details logged for order <strong>#${booking.id}</strong>:</p>
      <ul>
        <li><strong>Product:</strong> ${booking.product} (${booking.weight} Tons)</li>
        <li><strong>Dispatch Date:</strong> ${booking.bookingDate}</li>
        <li><strong>Source Factory:</strong> ${factory}</li>
        <li><strong>Destination Warehouse:</strong> ${customer}</li>
        <li><strong>Driver Assigned:</strong> ${driver} (${vehicle})</li>
        <li><strong>Fare Total:</strong> Rs. ${booking.fare.toLocaleString()}</li>
      </ul>
      <p>Regards,<br/><strong>Transport Commission Manager Agent Service</strong></p>
    `;

    await sendGmailEmail(accessToken, email, `Transport Invoice Confirmation #${booking.id}`, mailHtml);
  };

  const handleTriggerCalendar = async (booking: Booking) => {
    if (!accessToken) return;
    const factory = factories.find(f => f.id === booking.factoryId)?.factoryName || 'Factory';
    const customer = customers.find(c => c.id === booking.customerId)?.warehouseName || 'Warehouse';
    
    await addGoogleCalendarEvent(
      accessToken,
      `Delivery Task: ${booking.product}`,
      booking.bookingDate,
      `Source: ${factory} | Destination: ${customer} | Fare: Rs. ${booking.fare}`
    );
  };

  const handleGenerateSheetsReport = async (reportType: string): Promise<string> => {
    if (!accessToken) throw new Error('Auth token missing');

    let sheets: any[] = [];
    if (reportType === 'commission') {
      sheets = [{
        sheetName: 'Commission Ledger',
        headers: ['Booking ID', 'Date', 'Product', 'Fare (Rs.)', 'Commission (Rs.)', 'Payment Status'],
        rows: bookings.map(b => [
          b.id,
          b.bookingDate,
          b.product,
          b.fare,
          b.commission,
          commissions.find(c => c.bookingId === b.id)?.paymentStatus || 'Unpaid'
        ])
      }];
    } else if (reportType === 'booking') {
      sheets = [{
        sheetName: 'Bookings Records',
        headers: ['ID', 'Date', 'Product', 'Weight (Tons)', 'Fare', 'Status', 'Notes'],
        rows: bookings.map(b => [
          b.id, b.bookingDate, b.product, b.weight, b.fare, b.status, b.notes
        ])
      }];
    } else if (reportType === 'driver') {
      sheets = [{
        sheetName: 'Drivers list',
        headers: ['Full Name', 'Father Name', 'Phone', 'WhatsApp', 'CNIC', 'Address'],
        rows: drivers.map(d => [
          d.fullName, d.fatherName, d.phoneNumber, d.whatsAppNumber, d.cnicNumber, d.address
        ])
      }];
    } else if (reportType === 'vehicle') {
      sheets = [{
        sheetName: 'Vehicles List',
        headers: ['Reg Number', 'Type', 'Capacity (Tons)', 'Model', 'Color', 'Insurance', 'Token Expiry'],
        rows: vehicles.map(v => [
          v.registrationNumber, v.vehicleType, v.capacity, v.model, v.color, v.insurance, v.tokenExpiry
        ])
      }];
    } else if (reportType === 'factory') {
      sheets = [{
        sheetName: 'Factories',
        headers: ['Factory Name', 'Manager Name', 'Phone', 'Address', 'Notes'],
        rows: factories.map(f => [
          f.factoryName, f.managerName, f.phone, f.address, f.notes
        ])
      }];
    } else if (reportType === 'customer') {
      sheets = [{
        sheetName: 'Customers',
        headers: ['Warehouse Name', 'Company', 'Phone', 'Address', 'City'],
        rows: customers.map(c => [
          c.warehouseName, c.company, c.phone, c.address, c.city
        ])
      }];
    } else {
      sheets = [{
        sheetName: 'Expenses List',
        headers: ['Date', 'Category', 'Amount (Rs.)', 'Description'],
        rows: expenses.map(e => [
          e.date, e.category, e.amount, e.description
        ])
      }];
    }

    const titleStr = `Transport Commission System Report - ${reportType.toUpperCase()}`;
    return await exportToGoogleSheets(accessToken, titleStr, sheets);
  };

  const handleGenerateCsvReport = (reportType: string) => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (reportType === 'commission') {
      headers = ['Booking ID', 'Date', 'Product', 'Fare (Rs.)', 'Commission (Rs.)', 'Payment Status'];
      rows = bookings.map(b => [
        b.id, b.bookingDate, b.product, b.fare, b.commission, commissions.find(c => c.bookingId === b.id)?.paymentStatus || 'Unpaid'
      ]);
    } else if (reportType === 'booking') {
      headers = ['ID', 'Date', 'Product', 'Weight (Tons)', 'Fare', 'Status', 'Notes'];
      rows = bookings.map(b => [b.id, b.bookingDate, b.product, b.weight, b.fare, b.status, b.notes]);
    } else if (reportType === 'driver') {
      headers = ['Full Name', 'Father Name', 'Phone', 'CNIC', 'Address'];
      rows = drivers.map(d => [d.fullName, d.fatherName, d.phoneNumber, d.cnicNumber, d.address]);
    } else {
      headers = ['Date', 'Category', 'Amount (Rs.)', 'Description'];
      rows = expenses.map(e => [e.date, e.category, e.amount, e.description]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tcm_report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGeneratePdfReport = (reportType: string) => {
    // Open a formatted print preview layout
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let rowsHtml = '';
    if (reportType === 'commission') {
      bookings.forEach(b => {
        const pStatus = commissions.find(c => c.bookingId === b.id)?.paymentStatus || 'Unpaid';
        rowsHtml += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${b.bookingDate}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${b.product}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">Rs. ${b.fare.toLocaleString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; color: #2563eb;">Rs. ${b.commission.toLocaleString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${pStatus}</td>
          </tr>
        `;
      });
    } else {
      bookings.forEach(b => {
        rowsHtml += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${b.bookingDate}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${b.product} (${b.weight} Tons)</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${b.status}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Rs. ${b.fare.toLocaleString()}</td>
          </tr>
        `;
      });
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Transport Commission Manager - Financial Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #2563eb; color: white; padding: 12px; text-align: left; }
          </style>
        </head>
        <body>
          <h2>Transport Commission System Ledger Report</h2>
          <p>Generated Date: ${new Date().toLocaleString()}</p>
          <p>Report Category: <strong>${reportType.toUpperCase()}</strong></p>
          <hr/>
          <table>
            <thead>
              <tr>
                <th style="padding: 12px;">Date</th>
                <th style="padding: 12px;">Description / Product</th>
                <th style="padding: 12px;">Fare amount</th>
                <th style="padding: 12px;">Commission / Status</th>
                <th style="padding: 12px;">Payment</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Quick Action menu callback selectors
  const [selectedDriverForProfile, setSelectedDriverForProfile] = useState<Driver | null>(null);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none relative overflow-x-hidden antialiased text-slate-800" id="main_viewport_container">
      
      {/* 1. TOP HEADER APP BAR */}
      <header className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 z-30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-sm">
            T
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">Transport Manager</h1>
            <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              {user ? 'Firestore Sync Active' : 'Local Sandbox Mode'}
            </p>
          </div>
        </div>

        {/* Dynamic header inputs & status actions */}
        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <div className="relative">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-all"
            >
              <Search size={16} />
            </button>
          </div>

          {/* Notifications Icon Tray */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-all relative"
            >
              <Bell size={16} />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              )}
            </button>

            {/* Floating Notifications Drawer */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-100 shadow-xl p-4 space-y-3 z-40 max-h-96 overflow-y-auto animate-fadeIn">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-xs font-bold text-slate-800">Operation Alerts</span>
                  <button 
                    onClick={() => {
                      const updated = notifications.map(n => ({ ...n, read: true }));
                      setNotifications(updated);
                      saveLocalData('tcm_notifications', updated);
                      setShowNotifications(false);
                    }}
                    className="text-[10px] font-bold text-blue-600"
                  >
                    Clear All
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No new notifications recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map(n => (
                      <div key={n.id} className="p-2 hover:bg-slate-50 rounded-xl transition-all border border-slate-50">
                        <p className="text-xs font-bold text-slate-800">{n.title}</p>
                        <p className="text-[10px] text-slate-500">{n.message}</p>
                        <span className="text-[8px] text-slate-400 font-semibold block text-right mt-1">{n.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. DYNAMIC CENTER WORKSPACE PANEL */}
      <main className="flex-1 px-4 py-4 overflow-y-auto max-w-lg mx-auto w-full">
        {activeTab === 'dashboard' && (
          <DashboardTab 
            bookings={bookings} 
            expenses={expenses} 
            drivers={drivers}
            vehicles={vehicles}
            factories={factories}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'bookings' && (
          <BookingsTab 
            bookings={bookings} 
            drivers={drivers} 
            vehicles={vehicles} 
            factories={factories} 
            customers={customers}
            accessToken={accessToken}
            onAddBooking={handleAddBooking}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onTriggerGmail={handleTriggerGmail}
            onTriggerCalendar={handleTriggerCalendar}
          />
        )}

        {activeTab === 'commissions' && (
          <CommissionsTab 
            bookings={bookings} 
            drivers={drivers} 
            vehicles={vehicles} 
            commissions={commissions}
            onToggleCommissionStatus={handleToggleCommissionStatus}
          />
        )}

        {activeTab === 'drivers' && (
          <DriversTab 
            drivers={drivers} 
            vehicles={vehicles} 
            onAddDriver={handleAddDriver} 
            onAddVehicle={handleAddVehicle} 
          />
        )}

        {activeTab === 'directory' && (
          <DirectoryTab 
            factories={factories} 
            customers={customers} 
            accessToken={accessToken}
            onAddFactory={handleAddFactory} 
            onAddCustomer={handleAddCustomer} 
            onSyncContact={handleSyncContact}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab 
            user={user} 
            accessToken={accessToken}
            onLogin={handleLogin} 
            onLogout={handleLogout}
            backupMetadata={backupMetadata}
            onTriggerBackup={handleTriggerBackup}
            onTriggerRestore={handleTriggerRestore}
            onFetchDriveBackups={handleFetchDriveBackups}
            onGenerateGoogleSheetsReport={handleGenerateSheetsReport}
            onGenerateCsvReport={handleGenerateCsvReport}
            onGeneratePdfReport={handleGeneratePdfReport}
          />
        )}
      </main>

      {/* 3. FLOAT FLOATING ACTION QUICK BUTTON (One Hand optimization) */}
      <div className="fixed right-5 bottom-20 z-40">
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transform transition-all active:scale-95"
          id="fab_floating_action_btn"
        >
          <Plus size={28} className={`transform transition-all ${isFabOpen ? 'rotate-45' : ''}`} />
        </button>

        {isFabOpen && (
          <div className="absolute right-0 bottom-16 bg-white rounded-2xl border border-slate-100 shadow-2xl p-3 w-48 space-y-1.5 animate-fadeIn">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block ml-2">Quick Commands</span>
            
            <button
              onClick={() => {
                setActiveTab('bookings');
                setIsFabOpen(false);
              }}
              className="w-full text-left p-2 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl flex items-center gap-2"
            >
              <Briefcase size={14} className="text-blue-500" /> New Booking
            </button>

            <button
              onClick={() => {
                setActiveTab('drivers');
                setIsFabOpen(false);
              }}
              className="w-full text-left p-2 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl flex items-center gap-2"
            >
              <User size={14} className="text-emerald-500" /> Register Driver
            </button>

            <button
              onClick={() => {
                setActiveTab('directory');
                setIsFabOpen(false);
              }}
              className="w-full text-left p-2 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl flex items-center gap-2"
            >
              <Users size={14} className="text-indigo-500" /> Sourcing Partner
            </button>

            <button
              onClick={() => {
                setActiveTab('dashboard');
                setIsFabOpen(false);
              }}
              className="w-full text-left p-2 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl flex items-center gap-2"
            >
              <DollarSign size={14} className="text-red-500" /> Record Expense
            </button>
          </div>
        )}
      </div>

      {/* 4. BOTTOM PERSISTENT NAVIGATION BAR (NATIVE LOOK & FEEL) */}
      <nav className="sticky bottom-0 bg-white border-t border-slate-100 py-2.5 z-30 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center transition-all ${
            activeTab === 'dashboard' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Compass size={20} />
          <span className="text-[9px] font-bold mt-1 tracking-tight">Earnings</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex flex-col items-center justify-center transition-all ${
            activeTab === 'bookings' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Briefcase size={20} />
          <span className="text-[9px] font-bold mt-1 tracking-tight">Bookings</span>
        </button>

        <button
          onClick={() => setActiveTab('commissions')}
          className={`flex flex-col items-center justify-center transition-all ${
            activeTab === 'commissions' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <DollarSign size={20} />
          <span className="text-[9px] font-bold mt-1 tracking-tight">Commissions</span>
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex flex-col items-center justify-center transition-all ${
            activeTab === 'drivers' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Truck size={20} />
          <span className="text-[9px] font-bold mt-1 tracking-tight">Drivers</span>
        </button>

        <button
          onClick={() => setActiveTab('directory')}
          className={`flex flex-col items-center justify-center transition-all ${
            activeTab === 'directory' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users size={20} />
          <span className="text-[9px] font-bold mt-1 tracking-tight">Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center transition-all ${
            activeTab === 'settings' ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Settings size={20} />
          <span className="text-[9px] font-bold mt-1 tracking-tight">System</span>
        </button>
      </nav>

      {/* 5. SEARCH OVERLAY TRIGGER VIEW */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex flex-col p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-4 shadow-2xl max-w-lg mx-auto w-full space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-xs font-bold text-slate-800">Dynamic Universal Search</span>
              <button 
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query any driver, reg, phone, fare or product..."
                className="w-full pl-8 pr-4 py-1.5 border rounded-xl text-xs bg-slate-50 focus:outline-hidden"
              />
            </div>

            <div className="max-h-96 overflow-y-auto pt-2">
              <SearchOverlay
                isOpen={isSearchOpen}
                onClose={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                query={searchQuery}
                drivers={drivers}
                vehicles={vehicles}
                factories={factories}
                customers={customers}
                bookings={bookings}
                onSelectBooking={(b) => setSelectedBookingForDetails(b)}
                onSelectDriver={(d) => setSelectedDriverForProfile(d)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Profile / Details Callback Modals */}
      {selectedDriverForProfile && (
        <DriversTab
          drivers={drivers}
          vehicles={vehicles}
          onAddDriver={handleAddDriver}
          onAddVehicle={handleAddVehicle}
        />
      )}

      {/* 6. INACTIVITY AUTO LOGOUT LOCK SCREEN OVERLAY */}
      {isSessionLocked && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn" id="session_locked_overlay">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4 border border-slate-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <LogOut size={32} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Session Locked</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                You have been logged out automatically due to 5 minutes of inactivity to protect your transport logs and financials.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={handleLogin}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 fill-current text-white">
                  <path fill="#ffffff" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#ffffff" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#ffffff" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#ffffff" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>Re-login with Google</span>
              </button>

              <button
                onClick={() => {
                  lastActivityRef.current = Date.now();
                  setIsSessionLocked(false);
                  addNotification('Session Unlocked', 'Resumed session in Sandbox Mode.');
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all active:scale-95"
              >
                Resume in Sandbox
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
