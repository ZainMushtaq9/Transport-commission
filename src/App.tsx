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
  LogOut,
  LogIn
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
import AuthScreen from './components/AuthScreen';

// Setup modules
import { 
  auth, 
  db, 
  initAuth, 
  googleSignIn, 
  logout, 
  setAccessToken,
  isFirebaseConfigured
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
import { syncEngine } from './utils/syncEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'commissions' | 'drivers' | 'directory' | 'settings'>('dashboard');
  
  // Auth and Token states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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

  // Sandbox mode bypass
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(() => {
    return localStorage.getItem('tcm_sandbox_active') === 'true';
  });

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

    let lastWrite = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      if (now - lastWrite > 2000) {
        localStorage.setItem('tcm_last_activity', now.toString());
        lastWrite = now;
      }
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
        if (auth.currentUser || isSandboxMode) {
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
  }, [isSessionLocked, isSandboxMode]);

  // --- 2. FIRESTORE REAL-TIME SYNC ENGINE ---
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsAuthLoading(false);
      setIsSandboxMode(true);
      return;
    }

    // Listen to Firebase Auth state
    const unsubAuth = initAuth(
      async (currentUser, token) => {
        const lastActivityStr = localStorage.getItem('tcm_last_activity');
        if (lastActivityStr) {
          const lastActivity = Number(lastActivityStr);
          const elapsedSeconds = (Date.now() - lastActivity) / 1000;
          if (elapsedSeconds >= INACTIVITY_TIMEOUT) {
            // Expired session on load - log out immediately
            try {
              await logout();
            } catch (e) {
              console.error(e);
            }
            setUser(null);
            setAccessTokenState(null);
            setIsSessionLocked(true);
            setIsAuthLoading(false);
            return;
          }
        }

        // Active session - refresh last activity and resume
        localStorage.setItem('tcm_last_activity', Date.now().toString());
        lastActivityRef.current = Date.now();
        setUser(currentUser);
        if (token) setAccessTokenState(token);
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setAccessTokenState(null);
        setIsAuthLoading(false);
      }
    );

    return () => {
      unsubAuth();
    };
  }, []);

  // Sync state into Firestore collections if user is authenticated
  useEffect(() => {
    if (!user) return;

    let isSubscribed = true;
    let unsubs: (() => void)[] = [];

    const initFirestoreSync = async () => {
      try {
        // 1. Check if Firestore contains any data for this user
        const driversSnap = await getDocs(query(collection(db, 'drivers'), where('userId', '==', user.uid)));
        const hasFirestoreData = !driversSnap.empty;

        // If Firestore is empty, but we have local data, upload local data to Firestore first
        if (!hasFirestoreData) {
          const localDrivers = JSON.parse(localStorage.getItem('tcm_drivers') || '[]');
          const localVehicles = JSON.parse(localStorage.getItem('tcm_vehicles') || '[]');
          const localFactories = JSON.parse(localStorage.getItem('tcm_factories') || '[]');
          const localCustomers = JSON.parse(localStorage.getItem('tcm_customers') || '[]');
          const localBookings = JSON.parse(localStorage.getItem('tcm_bookings') || '[]');
          const localCommissions = JSON.parse(localStorage.getItem('tcm_commissions') || '[]');
          const localExpenses = JSON.parse(localStorage.getItem('tcm_expenses') || '[]');
          const localNotifications = JSON.parse(localStorage.getItem('tcm_notifications') || '[]');

          const hasLocalData = localDrivers.length > 0 || 
                               localVehicles.length > 0 || 
                               localFactories.length > 0 || 
                               localCustomers.length > 0 || 
                               localBookings.length > 0 ||
                               localCommissions.length > 0 ||
                               localExpenses.length > 0;

          if (hasLocalData && isSubscribed) {
            console.log('Firestore is empty but local state has data. Uploading local state to Firestore...');
            const batchToSync = {
              drivers: localDrivers,
              vehicles: localVehicles,
              factories: localFactories,
              customers: localCustomers,
              bookings: localBookings,
              commissions: localCommissions,
              expenses: localExpenses,
              notifications: localNotifications
            };

            for (const [colName, list] of Object.entries(batchToSync)) {
              for (const item of list as any[]) {
                const docRef = doc(db, colName, item.id);
                await setDoc(docRef, { ...item, userId: user.uid }, { merge: true });
              }
            }
            console.log('Local state successfully uploaded to Firestore!');
          }
        }
      } catch (err) {
        console.error('Error checking/uploading local data to Firestore:', err);
      }

      if (!isSubscribed) return;

      // 2. Establish onSnapshot listeners
      const unsubDrivers = onSnapshot(query(collection(db, 'drivers'), where('userId', '==', user.uid)), (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
        setDrivers(data);
        saveLocalData('tcm_drivers', data);
      });
      unsubs.push(unsubDrivers);

      const unsubVehicles = onSnapshot(query(collection(db, 'vehicles'), where('userId', '==', user.uid)), (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
        setVehicles(data);
        saveLocalData('tcm_vehicles', data);
      });
      unsubs.push(unsubVehicles);

      const unsubFactories = onSnapshot(query(collection(db, 'factories'), where('userId', '==', user.uid)), (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Factory));
        setFactories(data);
        saveLocalData('tcm_factories', data);
      });
      unsubs.push(unsubFactories);

      const unsubCustomers = onSnapshot(query(collection(db, 'customers'), where('userId', '==', user.uid)), (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        setCustomers(data);
        saveLocalData('tcm_customers', data);
      });
      unsubs.push(unsubCustomers);

      const unsubBookings = onSnapshot(query(collection(db, 'bookings'), where('userId', '==', user.uid)), (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        setBookings(data);
        saveLocalData('tcm_bookings', data);
      });
      unsubs.push(unsubBookings);

      const unsubCommissions = onSnapshot(query(collection(db, 'commissions'), where('userId', '==', user.uid)), (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Commission));
        setCommissions(data);
        saveLocalData('tcm_commissions', data);
      });
      unsubs.push(unsubCommissions);

      const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), where('userId', '==', user.uid)), (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
        setExpenses(data);
        saveLocalData('tcm_expenses', data);
      });
      unsubs.push(unsubExpenses);

      const unsubNotifications = onSnapshot(query(collection(db, 'notifications'), where('userId', '==', user.uid)), (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationRef));
        setNotifications(data);
        saveLocalData('tcm_notifications', data);
      });
      unsubs.push(unsubNotifications);
    };

    initFirestoreSync();

    return () => {
      isSubscribed = false;
      unsubs.forEach(unsub => unsub());
    };
  }, [user]);

  // Restore cached Google access token if exists
  useEffect(() => {
    const savedToken = localStorage.getItem('tcm_google_access_token');
    if (savedToken) {
      setAccessTokenState(savedToken);
    }
  }, []);

  // Background sync processing for enqueued items whenever we obtain an access token
  useEffect(() => {
    if (accessToken && user) {
      syncEngine.drainQueue(accessToken, user.uid);
    }
  }, [accessToken, user]);

  // Document media sync effect - automatically extracts and uploads base64 documents to Google Drive in the background,
  // then updates the Firestore reference and local storage.
  useEffect(() => {
    if (!accessToken || !user) return;

    let isSubscribed = true;

    const autoSyncDocuments = async () => {
      // 1. Process Drivers
      let driversChanged = false;
      const updatedDrivers = await Promise.all(drivers.map(async (d) => {
        let updated = { ...d };
        if (d.photo && d.photo.startsWith('data:')) {
          const fileName = `${d.id}_photo.jpg`;
          try {
            const folders = await setupFolderStructure(accessToken);
            const fileId = await syncEngine.syncDocumentToDrive(accessToken, folders.documents.driverPhotosFolderId, fileName, d.photo);
            if (fileId && isSubscribed) {
              updated.photo = `https://drive.google.com/uc?export=view&id=${fileId}`;
              driversChanged = true;
            }
          } catch (err) {
            console.error('Failed syncing photo for driver', d.fullName, err);
          }
        }
        if (d.cnicFrontImage && d.cnicFrontImage.startsWith('data:')) {
          const fileName = `${d.id}_cnic_front.jpg`;
          try {
            const folders = await setupFolderStructure(accessToken);
            const fileId = await syncEngine.syncDocumentToDrive(accessToken, folders.documents.cnicFrontFolderId, fileName, d.cnicFrontImage);
            if (fileId && isSubscribed) {
              updated.cnicFrontImage = `https://drive.google.com/uc?export=view&id=${fileId}`;
              driversChanged = true;
            }
          } catch (err) {
            console.error('Failed syncing cnic front for driver', d.fullName, err);
          }
        }
        if (d.cnicBackImage && d.cnicBackImage.startsWith('data:')) {
          const fileName = `${d.id}_cnic_back.jpg`;
          try {
            const folders = await setupFolderStructure(accessToken);
            const fileId = await syncEngine.syncDocumentToDrive(accessToken, folders.documents.cnicBackFolderId, fileName, d.cnicBackImage);
            if (fileId && isSubscribed) {
              updated.cnicBackImage = `https://drive.google.com/uc?export=view&id=${fileId}`;
              driversChanged = true;
            }
          } catch (err) {
            console.error('Failed syncing cnic back for driver', d.fullName, err);
          }
        }
        return updated;
      }));

      if (driversChanged && isSubscribed) {
        setDrivers(updatedDrivers);
        saveLocalData('tcm_drivers', updatedDrivers);
        for (const d of updatedDrivers) {
          await setDoc(doc(db, 'drivers', d.id), d);
        }
      }

      // 2. Process Vehicles
      let vehiclesChanged = false;
      const updatedVehicles = await Promise.all(vehicles.map(async (v) => {
        let updated = { ...v };
        if (v.registrationBookImage && v.registrationBookImage.startsWith('data:')) {
          const fileName = `${v.id}_reg_book.jpg`;
          try {
            const folders = await setupFolderStructure(accessToken);
            const fileId = await syncEngine.syncDocumentToDrive(accessToken, folders.documents.vehicleRegBooksFolderId, fileName, v.registrationBookImage);
            if (fileId && isSubscribed) {
              updated.registrationBookImage = `https://drive.google.com/uc?export=view&id=${fileId}`;
              vehiclesChanged = true;
            }
          } catch (err) {
            console.error('Failed syncing reg book for vehicle', v.registrationNumber, err);
          }
        }
        return updated;
      }));

      if (vehiclesChanged && isSubscribed) {
        setVehicles(updatedVehicles);
        saveLocalData('tcm_vehicles', updatedVehicles);
        for (const v of updatedVehicles) {
          await setDoc(doc(db, 'vehicles', v.id), v);
        }
      }
    };

    autoSyncDocuments();

    return () => {
      isSubscribed = false;
    };
  }, [drivers, vehicles, accessToken, user]);

  // Entity-level synchronization listeners
  const lastDriversRef = useRef('');
  useEffect(() => {
    if (!accessToken || !user) return;
    const serialized = JSON.stringify(drivers);
    if (serialized !== lastDriversRef.current) {
      lastDriversRef.current = serialized;
      syncEngine.enqueueSync(accessToken, user.uid, 'Modify', 'Drivers', 'all', drivers);
    }
  }, [drivers, accessToken, user]);

  const lastVehiclesRef = useRef('');
  useEffect(() => {
    if (!accessToken || !user) return;
    const serialized = JSON.stringify(vehicles);
    if (serialized !== lastVehiclesRef.current) {
      lastVehiclesRef.current = serialized;
      syncEngine.enqueueSync(accessToken, user.uid, 'Modify', 'Vehicles', 'all', vehicles);
    }
  }, [vehicles, accessToken, user]);

  const lastFactoriesRef = useRef('');
  useEffect(() => {
    if (!accessToken || !user) return;
    const serialized = JSON.stringify(factories);
    if (serialized !== lastFactoriesRef.current) {
      lastFactoriesRef.current = serialized;
      syncEngine.enqueueSync(accessToken, user.uid, 'Modify', 'Factories', 'all', factories);
    }
  }, [factories, accessToken, user]);

  const lastCustomersRef = useRef('');
  useEffect(() => {
    if (!accessToken || !user) return;
    const serialized = JSON.stringify(customers);
    if (serialized !== lastCustomersRef.current) {
      lastCustomersRef.current = serialized;
      syncEngine.enqueueSync(accessToken, user.uid, 'Modify', 'Customers', 'all', customers);
    }
  }, [customers, accessToken, user]);

  const lastBookingsRef = useRef('');
  useEffect(() => {
    if (!accessToken || !user) return;
    const serialized = JSON.stringify(bookings);
    if (serialized !== lastBookingsRef.current) {
      lastBookingsRef.current = serialized;
      syncEngine.enqueueSync(accessToken, user.uid, 'Modify', 'Bookings', 'all', bookings);
    }
  }, [bookings, accessToken, user]);

  const lastCommissionsRef = useRef('');
  useEffect(() => {
    if (!accessToken || !user) return;
    const serialized = JSON.stringify(commissions);
    if (serialized !== lastCommissionsRef.current) {
      lastCommissionsRef.current = serialized;
      syncEngine.enqueueSync(accessToken, user.uid, 'Modify', 'Commissions', 'all', commissions);
    }
  }, [commissions, accessToken, user]);

  const lastExpensesRef = useRef('');
  useEffect(() => {
    if (!accessToken || !user) return;
    const serialized = JSON.stringify(expenses);
    if (serialized !== lastExpensesRef.current) {
      lastExpensesRef.current = serialized;
      syncEngine.enqueueSync(accessToken, user.uid, 'Modify', 'Expenses', 'all', expenses);
    }
  }, [expenses, accessToken, user]);

  // --- 3. GOOGLE WORKSPACE LINKING ---
  const handleLinkGoogle = async () => {
    try {
      const result = await googleSignIn(true); // true: request Google Workspace sensitive scopes
      if (result) {
        setAccessTokenState(result.accessToken);
        setAccessToken(result.accessToken);
        addNotification('Google Workspace Linked', 'Authorized Google Workspace scopes successfully.');
      }
    } catch (e) {
      console.error('Google Link Error:', e);
      alert('Google Workspace link failed: ' + (e as Error).message);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessTokenState(null);
    setIsSandboxMode(false);
    localStorage.removeItem('tcm_sandbox_active');
    localStorage.removeItem('tcm_last_activity');
    loadLocalData();
    addNotification('Logged Out', 'Successfully logged out of your session.');
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

  // Background Google Drive Auto Backup trigger
  const triggerAutoDriveBackup = async (
    currentDrivers = drivers,
    currentVehicles = vehicles,
    currentFactories = factories,
    currentCustomers = customers,
    currentBookings = bookings,
    currentCommissions = commissions,
    currentExpenses = expenses
  ) => {
    if (!accessToken) return;
    try {
      const folders = await setupFolderStructure(accessToken);
      const payload = {
        drivers: currentDrivers,
        vehicles: currentVehicles,
        factories: currentFactories,
        customers: currentCustomers,
        bookings: currentBookings,
        commissions: currentCommissions,
        expenses: currentExpenses,
        backupDate: new Date().toISOString()
      };
      await backupDataToDrive(accessToken, folders.backupsFolderId, payload);
      const lastBackupStr = new Date().toLocaleString();
      localStorage.setItem('tcm_last_backup', lastBackupStr);
      setBackupMetadata({
        status: 'success',
        lastBackupDate: lastBackupStr,
        message: 'Auto backup synchronized to Google Drive'
      });
    } catch (err) {
      console.warn('Background auto Drive backup failed:', err);
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
    triggerAutoDriveBackup(updated);
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
    triggerAutoDriveBackup(drivers, updated);
  };

  const handleUpdateDriver = async (id: string, driverInput: Partial<Omit<Driver, 'id' | 'createdAt'>>) => {
    const updated = drivers.map(d => d.id === id ? { ...d, ...driverInput } as Driver : d);
    setDrivers(updated);
    saveLocalData('tcm_drivers', updated);

    if (user) {
      const existing = drivers.find(d => d.id === id);
      if (existing) {
        await setDoc(doc(db, 'drivers', id), { ...existing, ...driverInput, userId: user.uid }, { merge: true });
      }
    }

    addNotification('Driver Updated', `Updated profile details for driver.`);
    triggerAutoDriveBackup(updated);
  };

  const handleUpdateVehicle = async (id: string, vehicleInput: Partial<Omit<Vehicle, 'id' | 'createdAt'>>) => {
    const updated = vehicles.map(v => v.id === id ? { ...v, ...vehicleInput } as Vehicle : v);
    setVehicles(updated);
    saveLocalData('tcm_vehicles', updated);

    if (user) {
      const existing = vehicles.find(v => v.id === id);
      if (existing) {
        await setDoc(doc(db, 'vehicles', id), { ...existing, ...vehicleInput, userId: user.uid }, { merge: true });
      }
    }

    addNotification('Vehicle Updated', `Updated details for ${vehicleInput.registrationNumber || 'Vehicle'}.`);
    triggerAutoDriveBackup(drivers, updated);
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
    triggerAutoDriveBackup(drivers, vehicles, updated);
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
    triggerAutoDriveBackup(drivers, vehicles, factories, updated);
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

    const updatedBookings = [...bookings, newBooking];
    const updatedCommissions = [...commissions, newCommission];

    setBookings(updatedBookings);
    setCommissions(updatedCommissions);

    saveLocalData('tcm_bookings', updatedBookings);
    saveLocalData('tcm_commissions', updatedCommissions);

    if (user) {
      await setDoc(doc(db, 'bookings', newBooking.id), newBooking);
      await setDoc(doc(db, 'commissions', newCommission.id), newCommission);
    }

    addNotification('Order Dispatched', `Booking dispatched: ${newBooking.product} (Rs. ${newBooking.commission} Comm).`);
    triggerAutoDriveBackup(drivers, vehicles, factories, customers, updatedBookings, updatedCommissions);

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
    triggerAutoDriveBackup(drivers, vehicles, factories, customers, updated);
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
    triggerAutoDriveBackup(drivers, vehicles, factories, customers, bookings, updatedComms);
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
    triggerAutoDriveBackup(drivers, vehicles, factories, customers, bookings, commissions, updated);
  };

  const handleDeleteExpense = async (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    saveLocalData('tcm_expenses', updated);

    if (user) {
      await deleteDoc(doc(db, 'expenses', id));
    }

    addNotification('Expense Deleted', 'Removed expense log entry.');
    triggerAutoDriveBackup(drivers, vehicles, factories, customers, bookings, commissions, updated);
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

  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-bold tracking-widest uppercase animate-pulse">Initializing Secure Session...</p>
      </div>
    );
  }

  if (!user && !isSandboxMode) {
    return (
      <AuthScreen
        onAuthSuccess={(authenticatedUser, token) => {
          localStorage.setItem('tcm_last_activity', Date.now().toString());
          lastActivityRef.current = Date.now();
          setIsSessionLocked(false);
          setUser(authenticatedUser);
          if (token) {
            setAccessTokenState(token);
            setAccessToken(token);
          }
          setIsSandboxMode(false);
          localStorage.removeItem('tcm_sandbox_active');
          addNotification('Welcome back', `Logged in successfully!`);
        }}
        onEnterSandboxMode={() => {
          localStorage.setItem('tcm_last_activity', Date.now().toString());
          lastActivityRef.current = Date.now();
          setIsSessionLocked(false);
          setIsSandboxMode(true);
          localStorage.setItem('tcm_sandbox_active', 'true');
          addNotification('Sandbox Activated', 'Running in local storage sandbox mode.');
        }}
      />
    );
  }

  return (
    <div className="h-screen h-[100dvh] overflow-hidden bg-slate-50 flex flex-col font-sans select-none relative antialiased text-slate-800" id="main_viewport_container">
      
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

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all flex items-center justify-center"
            title="Log Out"
            id="logout_header_btn"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* 2. DYNAMIC CENTER WORKSPACE PANEL */}
      <main className="flex-1 px-4 pt-4 pb-28 overflow-y-auto max-w-lg mx-auto w-full">
        {activeTab === 'dashboard' && (
          <DashboardTab 
            bookings={bookings} 
            expenses={expenses} 
            commissions={commissions}
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
            onUpdateDriver={handleUpdateDriver}
            onUpdateVehicle={handleUpdateVehicle}
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
            onLogin={handleLinkGoogle} 
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
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-slate-100 py-2.5 z-40 flex items-center justify-around shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
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

            <div className="pt-2">
              <button
                onClick={async () => {
                  await handleLogout();
                  setIsSessionLocked(false);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                id="relogin_btn"
              >
                <LogIn size={14} />
                <span>Log In with Email & Password</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
