/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudLightning, 
  CloudOff, 
  Download, 
  RefreshCw, 
  FileSpreadsheet, 
  FileText, 
  Settings, 
  AlertCircle, 
  CheckCircle2, 
  Database, 
  ArrowLeftRight,
  LogIn,
  Activity,
  Wifi,
  WifiOff,
  UserCheck,
  Shield,
  KeyRound,
  UserPlus,
  Trash2,
  Edit3,
  Lock,
  Mail,
  Plus,
  Users,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';
import { User } from 'firebase/auth';
import { BackupMetadata, Employee } from '../types';
import { syncEngine, ActivityLog } from '../utils/syncEngine';
import { changeCurrentUserPassword, changeCurrentUserEmail } from '../firebase';

interface SettingsTabProps {
  user: User | null;
  accessToken: string | null;
  employees?: Employee[];
  onSaveEmployee?: (employee: any) => Promise<void>;
  onUpdateEmployee?: (id: string, updates: Partial<Employee>) => Promise<void>;
  onDeleteEmployee?: (id: string) => Promise<void>;
  onLogin: () => void;
  onLogout: () => void;
  onSyncLocalToFirestore?: () => Promise<void>;
  backupMetadata: BackupMetadata;
  onTriggerBackup: () => Promise<void>;
  onTriggerRestore: (fileId: string) => Promise<void>;
  onFetchDriveBackups: () => Promise<Array<{ id: string; name: string; createdTime: string; size?: string }>>;
  onGenerateGoogleSheetsReport: (reportType: string) => Promise<string>;
  onGenerateCsvReport: (reportType: string) => void;
  onGeneratePdfReport: (reportType: string) => void;
}

export default function SettingsTab({
  user,
  accessToken,
  employees = [],
  onSaveEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onLogin,
  onLogout,
  onSyncLocalToFirestore,
  backupMetadata,
  onTriggerBackup,
  onTriggerRestore,
  onFetchDriveBackups,
  onGenerateGoogleSheetsReport,
  onGenerateCsvReport,
  onGeneratePdfReport
}: SettingsTabProps) {
  const [driveBackups, setDriveBackups] = useState<Array<{ id: string; name: string; createdTime: string; size?: string }>>([]);
  const [fetchingBackups, setFetchingBackups] = useState(false);
  
  // Security Password & Email Update State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Employee Management State
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empFullName, setEmpFullName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [showEmpPassword, setShowEmpPassword] = useState(false);
  const [empPhone, setEmpPhone] = useState('');
  const [empRole, setEmpRole] = useState<'Admin' | 'Employee'>('Employee');
  const [empStatus, setEmpStatus] = useState<'Active' | 'Disabled'>('Active');
  const [empPermissions, setEmpPermissions] = useState({
    orders: true,
    drivers: true,
    earnings: true,
    expenses: true,
    reports: true,
    settings: false
  });
  const [empLoading, setEmpLoading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPassword !== confirmNewPassword) {
      setPassMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    setPassLoading(true);
    try {
      await changeCurrentUserPassword(newPassword);
      setPassMsg({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      console.error(err);
      setPassMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setPassLoading(false);
    }
  };

  // Handle email change
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null);
    if (!newEmail || !newEmail.includes('@')) {
      setEmailMsg({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    setEmailLoading(true);
    try {
      await changeCurrentUserEmail(newEmail);
      setEmailMsg({ type: 'success', text: 'Email address updated successfully!' });
      setNewEmail('');
    } catch (err: any) {
      console.error(err);
      setEmailMsg({ type: 'error', text: err.message || 'Failed to update email. Re-authentication may be required.' });
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Employee Modal Save
  const handleSaveEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFullName.trim() || !empEmail.trim()) {
      alert('Please fill in employee full name and email address.');
      return;
    }
    if (!editingEmployee && !empPassword.trim()) {
      alert('Please enter a login password for the new employee.');
      return;
    }

    setEmpLoading(true);

    try {
      if (editingEmployee) {
        if (onUpdateEmployee) {
          const updates: Partial<Employee> = {
            fullName: empFullName.trim(),
            email: empEmail.trim(),
            phone: empPhone.trim(),
            role: empRole,
            status: empStatus,
            permissions: empPermissions
          };
          if (empPassword.trim()) {
            updates.password = empPassword.trim();
          }
          await onUpdateEmployee(editingEmployee.id, updates);
        }
      } else {
        if (onSaveEmployee) {
          await onSaveEmployee({
            fullName: empFullName.trim(),
            email: empEmail.trim(),
            password: empPassword.trim(),
            phone: empPhone.trim(),
            role: empRole,
            status: empStatus,
            permissions: empPermissions,
            adminUserId: user?.uid || 'offline_admin'
          });
        }
      }
      setShowEmployeeModal(false);
      resetEmployeeForm();
    } catch (err: any) {
      console.error('Failed to save employee:', err);
      alert('Error saving employee: ' + (err?.message || 'Unknown error'));
    } finally {
      setEmpLoading(false);
    }
  };

  const resetEmployeeForm = () => {
    setEditingEmployee(null);
    setEmpFullName('');
    setEmpEmail('');
    setEmpPassword('');
    setShowEmpPassword(false);
    setEmpPhone('');
    setEmpRole('Employee');
    setEmpStatus('Active');
    setEmpPermissions({
      orders: true,
      drivers: true,
      earnings: true,
      expenses: true,
      reports: true,
      settings: false
    });
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpFullName(emp.fullName);
    setEmpEmail(emp.email);
    setEmpPassword(emp.password || '');
    setShowEmpPassword(false);
    setEmpPhone(emp.phone || '');
    setEmpRole(emp.role);
    setEmpStatus(emp.status);
    setEmpPermissions(emp.permissions || {
      orders: true,
      drivers: true,
      earnings: true,
      expenses: true,
      reports: true,
      settings: false
    });
    setShowEmployeeModal(true);
  };
  
  // Report Generator Selection
  const [selectedReportType, setSelectedReportType] = useState('commission');
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // Background Sync status states
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [onlineStatus, setOnlineStatus] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    setActivityLogs(syncEngine.getLocalLogs());

    const interval = setInterval(() => {
      setActivityLogs(syncEngine.getLocalLogs());
    }, 3000);

    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load drive backups list if authenticated
  useEffect(() => {
    if (accessToken) {
      handleLoadBackups();
    }
  }, [accessToken, backupMetadata.status]);

  const handleLoadBackups = async () => {
    setFetchingBackups(true);
    try {
      const list = await onFetchDriveBackups();
      setDriveBackups(list);
    } catch (err) {
      console.error('Failed to load drive backups:', err);
    } finally {
      setFetchingBackups(false);
    }
  };

  const handleSheetsExport = async () => {
    setReportLoading(true);
    setSheetsUrl('');
    try {
      const url = await onGenerateGoogleSheetsReport(selectedReportType);
      setSheetsUrl(url);
    } catch (err) {
      alert('Sheets creation failed: Google API scope permission required.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fadeIn" id="settings_tab_view">
      {/* Account Verification Status */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Account & Cloud Status</h3>

        {user ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                  alt={user.displayName || 'User'}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border border-slate-200"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{user.displayName || 'Main Administrator'}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">{user.email}</p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-all"
              >
                Sign Out
              </button>
            </div>

            {accessToken ? (
              <div className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold p-2.5 rounded-xl flex items-center gap-2 border border-emerald-100">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Google Workspace services fully linked. Backup and Exports enabled.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-[10px] bg-amber-50 text-amber-700 font-semibold p-2.5 rounded-xl flex items-center gap-2 border border-amber-100">
                  <AlertCircle size={14} className="text-amber-600" />
                  Not linked to Google Workspace. Drive backups and Google Sheets are disabled.
                </div>
                <button 
                  onClick={onLogin}
                  className="w-full border border-blue-200 hover:border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs py-2 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                  id="link_google_workspace_btn"
                >
                  <RefreshCw size={12} className="animate-pulse" />
                  <span>Authorize & Link Google Workspace</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <p className="text-xs text-slate-500 font-medium">You are currently running in Offline Sandbox Mode. Sign in with a registered email to enable real-time cloud data entries.</p>
            
            <button 
              onClick={onLogout}
              className="mx-auto border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              id="goto_signin_btn"
            >
              <LogIn size={14} />
              <span>Sign In / Create Account</span>
            </button>
          </div>
        )}
      </div>

      {/* Firebase Cloud Database Sync Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-amber-600" />
            <div>
              <h3 className="text-xs font-bold text-slate-800">Firebase Cloud Database</h3>
              <p className="text-[10px] text-slate-400 font-medium">Project: <span className="font-mono text-slate-600 font-bold">kashif-603d3</span></p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${user ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
            {user ? 'Authenticated' : 'Offline Mode'}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          {user 
            ? 'Your account is connected to Firebase. Any drivers or records created in the app can be synchronized directly to your Cloud Firestore database.'
            : 'You are using Offline Mode. Sign in to sync your local drivers and transport records to Firebase.'}
        </p>

        {user && onSyncLocalToFirestore && (
          <button
            onClick={() => onSyncLocalToFirestore()}
            className="w-full border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <CloudLightning size={14} className="text-blue-600 animate-bounce" />
            <span>Upload & Sync All Local Data to Firebase Cloud</span>
          </button>
        )}
      </div>
      {user && (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <KeyRound size={14} className="text-blue-500" /> Account Credentials & Security
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lock size={14} className="text-slate-500" /> Change Account Password
              </span>

              {passMsg && (
                <div className={`p-2.5 rounded-xl text-[11px] font-semibold flex items-center gap-2 ${
                  passMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {passMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span>{passMsg.text}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={passLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                {passLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>

            {/* Change Email Form */}
            <form onSubmit={handleChangeEmail} className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Mail size={14} className="text-slate-500" /> Update Account Email
              </span>

              {emailMsg && (
                <div className={`p-2.5 rounded-xl text-[11px] font-semibold flex items-center gap-2 ${
                  emailMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {emailMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span>{emailMsg.text}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Current Email</label>
                <input
                  type="text"
                  disabled
                  value={user.email || ''}
                  className="w-full p-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">New Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="newemail@transport.com"
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={emailLoading}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                {emailLoading ? 'Updating Email...' : 'Update Email Address'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Employee Access Management Section (Admin Only) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users size={14} className="text-blue-500" /> Employee Access Management
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Create sub-accounts and assign granular module permissions for staff.
            </p>
          </div>

          <button
            onClick={() => {
              resetEmployeeForm();
              setShowEmployeeModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
          >
            <Plus size={14} /> Add Employee
          </button>
        </div>

        {employees.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed text-slate-400 text-xs">
            No employee sub-accounts created yet. Click "Add Employee" to grant staff access.
          </div>
        ) : (
          <div className="space-y-2">
            {employees.map(emp => (
              <div key={emp.id} className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900">{emp.fullName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      emp.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {emp.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800">
                      {emp.role}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium flex-wrap">
                    <span className="flex items-center gap-1">
                      <Mail size={12} className="text-slate-400" />
                      <strong>Email:</strong> {emp.email}
                    </span>
                    {emp.phone && (
                      <span>• Phone: {emp.phone}</span>
                    )}
                    {emp.password && (
                      <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        <KeyRound size={11} className="text-amber-500" />
                        <span className="font-mono text-slate-700">
                          {visiblePasswords[emp.id] ? emp.password : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setVisiblePasswords(prev => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                          className="text-slate-400 hover:text-slate-600 ml-1"
                          title="Toggle password view"
                        >
                          {visiblePasswords[emp.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`Email: ${emp.email}\nPassword: ${emp.password}`);
                            setCopiedId(emp.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="text-slate-400 hover:text-blue-600 ml-0.5"
                          title="Copy login credentials"
                        >
                          {copiedId === emp.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Permissions Pills */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider self-center mr-1">Modules:</span>
                    {Object.entries(emp.permissions || {}).map(([key, allowed]) => (
                      <span key={key} className={`px-2 py-0.5 rounded-md text-[9px] font-bold capitalize ${
                        allowed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 line-through'
                      }`}>
                        {key}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => openEditEmployee(emp)}
                    className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                  >
                    <Edit3 size={12} /> Edit
                  </button>

                  <button
                    onClick={() => {
                      if (onUpdateEmployee) {
                        onUpdateEmployee(emp.id, { status: emp.status === 'Active' ? 'Disabled' : 'Active' });
                      }
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      emp.status === 'Active' ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {emp.status === 'Active' ? 'Disable' : 'Enable'}
                  </button>

                  {onDeleteEmployee && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete employee account for ${emp.fullName}?`)) {
                          onDeleteEmployee(emp.id);
                        }
                      }}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-all"
                      title="Delete account"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Employee Modal Dialog */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editingEmployee ? 'Edit Employee Account' : 'Register New Employee'}
              </h3>
              <button
                onClick={() => {
                  setShowEmployeeModal(false);
                  resetEmployeeForm();
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployeeSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={empFullName}
                  onChange={(e) => setEmpFullName(e.target.value)}
                  placeholder="e.g. Ali Khan"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Email Address (Login Username) *</label>
                <input
                  type="email"
                  required
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  placeholder="employee@transport.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">
                    Login Password {!editingEmployee ? '*' : '(Leave blank to keep unchanged)'}
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showEmpPassword ? 'text' : 'password'}
                    required={!editingEmployee}
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    placeholder={editingEmployee ? 'Enter new password if changing' : 'Create login password'}
                    className="w-full p-2.5 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmpPassword(!showEmpPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showEmpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  Employee will use this email and password to log in.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Role</label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value as 'Admin' | 'Employee')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden font-medium"
                  >
                    <option value="Employee">Employee</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</label>
                  <select
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value as 'Active' | 'Disabled')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden font-medium"
                  >
                    <option value="Active">Active</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>

              {/* Granular Module Permissions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Assign Module Permissions</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEmpPermissions({ orders: true, drivers: true, earnings: true, expenses: true, reports: true, settings: true })}
                      className="text-[9px] font-bold text-blue-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-[9px] text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setEmpPermissions({ orders: false, drivers: false, earnings: false, expenses: false, reports: false, settings: false })}
                      className="text-[9px] font-bold text-slate-400 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'orders', label: 'Dispatch Orders' },
                    { id: 'drivers', label: 'Fleet & Drivers' },
                    { id: 'earnings', label: 'Commissions & Ledger' },
                    { id: 'expenses', label: 'Expenses' },
                    { id: 'reports', label: 'Reports Module' },
                    { id: 'settings', label: 'System Settings' },
                  ].map(perm => (
                    <label key={perm.id} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all border ${
                      (empPermissions as any)[perm.id] ? 'bg-blue-50/60 border-blue-200 text-blue-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <input
                        type="checkbox"
                        checked={(empPermissions as any)[perm.id]}
                        onChange={(e) => setEmpPermissions({ ...empPermissions, [perm.id]: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-0"
                      />
                      <span className="text-[11px]">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmployeeModal(false);
                    resetEmployeeForm();
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={empLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5"
                >
                  {empLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingEmployee ? 'Update Account' : 'Create Account'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reports Export Generator Module */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <FileSpreadsheet size={14} className="text-blue-500" /> Export Reports Module
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Report Type</label>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              className="w-full mt-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-hidden"
            >
              <option value="commission">Commission Ledger Report</option>
              <option value="booking">All Dispatch Bookings Report</option>
              <option value="driver">Driver Information Summary</option>
              <option value="vehicle">Vehicle Expiring Logs Report</option>
              <option value="factory">Sourcing Factories Logs</option>
              <option value="customer">Warehouse Customers Logs</option>
              <option value="expense">Financial Expense Summary</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Google Sheets Trigger */}
            <button
              onClick={handleSheetsExport}
              disabled={!accessToken || reportLoading}
              className="py-2.5 border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              Google Sheet
            </button>

            {/* Local Excel CSV Trigger */}
            <button
              onClick={() => onGenerateCsvReport(selectedReportType)}
              className="py-2.5 border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
            >
              <Download size={16} />
              Excel / CSV
            </button>

            {/* Local Styled PDF Print Trigger */}
            <button
              onClick={() => onGeneratePdfReport(selectedReportType)}
              className="py-2.5 border border-red-100 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
            >
              <FileText size={16} />
              Print PDF
            </button>
          </div>

          {reportLoading && (
            <p className="text-[10px] text-blue-500 font-semibold animate-pulse">Generating Report and uploading onto your Google Drive...</p>
          )}

          {sheetsUrl && (
            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 text-center">
              <p className="text-[10px] text-emerald-800 font-bold mb-1.5">✓ Spreadsheet Successfully Generated!</p>
              <a
                href={sheetsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Open Google Sheets
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Google Drive Database Backup / Phone Migration Module */}
      {accessToken && (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Database size={14} className="text-blue-500" /> Google Drive Database Backup
            </h3>
            <button
              onClick={handleLoadBackups}
              disabled={fetchingBackups}
              className="text-[10px] font-bold text-blue-600 flex items-center gap-1"
            >
              <RefreshCw size={10} className={fetchingBackups ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3 justify-between items-center p-3 bg-slate-50 rounded-2xl">
              <div>
                <p className="text-xs font-bold text-slate-700">Backup and Security</p>
                <p className="text-[9px] text-slate-400 font-semibold">
                  Last Backup: {backupMetadata.lastBackupDate || 'Never backed up'}
                </p>
              </div>

              <button
                onClick={onTriggerBackup}
                disabled={backupMetadata.status === 'backing_up'}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs"
              >
                {backupMetadata.status === 'backing_up' ? 'Backing up...' : 'Create Backup'}
              </button>
            </div>

            {/* Backups logs fetched dynamically from Google Drive (Supports Phone Migration & Restore!) */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Restore Point / Phone Migration</span>
              
              {fetchingBackups ? (
                <p className="text-xs text-slate-400 animate-pulse text-center py-4">Checking Drive backups...</p>
              ) : driveBackups.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-2xl border border-dashed">No backup files found inside Drive 'Backups/' folder.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {driveBackups.map(bk => (
                    <div key={bk.id} className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl flex justify-between items-center transition-all border border-slate-100/50">
                      <div>
                        <p className="text-xs font-semibold text-slate-700 font-mono truncate max-w-[180px]">{bk.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{bk.createdTime}</p>
                      </div>

                      <button
                        onClick={() => {
                          if (window.confirm('Restore database from this point? Current local state will be overwritten with backup contents.')) {
                            onTriggerRestore(bk.id);
                          }
                        }}
                        className="py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                      >
                        <ArrowLeftRight size={10} /> Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Background Silent Synchronization & Queue Monitor */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Activity size={14} className="text-emerald-500 animate-pulse" /> Live Synchronizer Status
          </h3>
          <div className="flex items-center gap-2">
            {onlineStatus ? (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Wifi size={10} /> Device Online
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                <WifiOff size={10} /> Offline Queueing
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700">Event-Driven Cloud Sync</p>
              <p className="text-[9px] text-slate-400 font-semibold">
                Continuous incremental backup mapping DB entries silently.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">
                {accessToken ? "✓ Configured" : "⚠️ Unauthorized"}
              </p>
              <p className="text-[9px] text-slate-400 font-bold">
                {accessToken ? "Silent uploads active" : "Grant permissions to activate"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Recent Sync Activity Logs</span>
            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-dashed">
                No active synchronizations recorded yet.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {activityLogs.map((log, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center gap-2 text-slate-700">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">{log.operation} {log.entity}</span>
                        <span className="text-[8px] font-mono text-slate-400">({log.recordId})</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold truncate">
                        {log.timestamp} {log.errorDetails ? `| Error: ${log.errorDetails}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      log.status === 'Synced Successfully' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : log.status === 'Pending Sync (Offline)'
                        ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                        : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone: Reset Application Data */}
      <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-red-600">
          Danger Zone
        </h3>
        <p className="text-[11px] text-red-700/80 leading-relaxed font-medium">
          If your browser contains any old cached or simulated test data, you can permanently wipe all local registries (Drivers, Vehicles, Bookings, Expenses) from your browser cache.
        </p>
        <button
          onClick={() => {
            if (window.confirm("Are you absolutely sure you want to permanently delete all local application data and cached records? This cannot be undone.")) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          Reset Application Data (Clear Cache)
        </button>
      </div>
    </div>
  );
}
