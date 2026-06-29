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
  ArrowLeftRight 
} from 'lucide-react';
import { User } from 'firebase/auth';
import { BackupMetadata } from '../types';

interface SettingsTabProps {
  user: User | null;
  accessToken: string | null;
  onLogin: () => void;
  onLogout: () => void;
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
  onLogin,
  onLogout,
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
  
  // Report Generator Selection
  const [selectedReportType, setSelectedReportType] = useState('commission');
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

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
                  <h4 className="text-xs font-bold text-slate-800">{user.displayName}</h4>
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
              <div className="text-[10px] bg-amber-50 text-amber-700 font-semibold p-2.5 rounded-xl flex items-center gap-2 border border-amber-100">
                <AlertCircle size={14} className="text-amber-600" />
                Linked with Local Database. Standard permissions set.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <p className="text-xs text-slate-500 font-medium">Connect your Google account to enable persistent cloud synchronization, real-time Firestore database entries, and Google Drive automatic backup.</p>
            
            {/* Standard gsi styled button */}
            <button 
              onClick={onLogin}
              className="mx-auto border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>
        )}
      </div>

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
    </div>
  );
}
