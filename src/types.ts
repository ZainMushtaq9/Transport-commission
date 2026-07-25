/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Driver {
  id: string; // UUID
  photo: string; // Base64 or standard URL
  fullName: string;
  fatherName: string;
  phoneNumber: string;
  whatsAppNumber: string;
  cnicNumber: string; // Unique check
  cnicFrontImage: string; // Base64 or URL
  cnicBackImage: string; // Base64 or URL
  address: string;
  notes: string;
  createdAt: string;
  userId?: string;

  // Extended Driver Profile Fields
  driverPhone1?: string;
  driverPhone2?: string;
  driverPhone3?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  driverAddress?: string;
  guarantorAddress?: string;
  vehicleImage?: string; // Vehicle Image Upload
}

export interface Vehicle {
  id: string; // UUID
  driverId: string; // Linked Driver
  registrationNumber: string; // Unique registration check
  vehicleType: string; // e.g. '6 Wheeler', '10 Wheeler', 'Mazda', 'Flatbed'
  capacity: number; // in tons
  model: string;
  color: string;
  registrationBookImage: string; // Base64 or URL
  insurance: string;
  fitnessExpiry: string; // YYYY-MM-DD
  tokenExpiry: string; // YYYY-MM-DD
  notes: string;
  createdAt: string;
  userId?: string;
  vehicleImage?: string; // Vehicle Image Upload
}

export interface Factory {
  id: string; // UUID
  factoryName: string;
  managerName: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
  userId?: string;
}

export interface Customer {
  id: string; // UUID
  warehouseName: string;
  company: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
  createdAt: string;
  userId?: string;
}

export interface Booking {
  id: string; // UUID
  driverId: string;
  vehicleId: string;
  factoryId: string;
  customerId: string;
  bookingDate: string; // YYYY-MM-DD
  product: string;
  weight: number; // tons
  fare: number;
  commission: number;
  status: 'Pending' | 'In Transit' | 'Delivered' | 'Cancelled' | 'Completed';
  deliveryDate: string; // YYYY-MM-DD
  notes: string;
  createdAt: string;
  userId?: string;

  // Extended fields for Daily Inventory Module
  biltiNo?: string;
  companyName?: string;
  receiverName?: string;
  gariFeet?: string;
  dariNo?: string;
  vehicleModel?: string;
  phone1?: string;
  phone2?: string;
  stopLocation?: string;
  bookingTime?: string;
}

export interface Commission {
  id: string; // UUID
  bookingId: string;
  vehicleId: string;
  driverId: string;
  factoryId: string;
  date: string; // YYYY-MM-DD
  fare: number;
  commission: number;
  paymentStatus: 'Paid' | 'Unpaid';
  createdAt: string;
  userId?: string;
}

export interface Expense {
  id: string; // UUID
  date: string; // YYYY-MM-DD
  category: string; // 'Fuel' | 'Maintenance' | 'Office' | 'Tea/Food' | 'Marketing' | 'Others'
  amount: number;
  description: string;
  createdAt: string;
  userId?: string;
}

export interface DocumentRef {
  id: string; // UUID
  type: 'Driver Photo' | 'CNIC Front' | 'CNIC Back' | 'Vehicle Reg Book' | 'Invoice' | 'Delivery Challan' | 'Receipt' | 'Other';
  referenceId: string; // Links to Driver ID, Vehicle ID, or Booking ID
  fileName: string;
  fileData: string; // Base64 payload or resource URL
  dateAdded: string;
}

export interface NotificationRef {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  userId?: string;
}

export interface BackupMetadata {
  lastBackupDate: string;
  backupFileId?: string;
  status: 'idle' | 'backing_up' | 'restoring' | 'success' | 'error';
  message?: string;
}

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'Admin' | 'Employee';
  status: 'Active' | 'Disabled';
  permissions: {
    orders: boolean;
    drivers: boolean;
    earnings: boolean;
    expenses: boolean;
    reports: boolean;
    settings: boolean;
  };
  adminUserId: string;
  createdAt: string;
}
