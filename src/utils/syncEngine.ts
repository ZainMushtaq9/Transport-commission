import { setupFolderStructure, FullFolderStructure } from './googleWorkspace';

export interface SyncEvent {
  id: string; // Event ID
  timestamp: string;
  operation: 'Create' | 'Insert' | 'Update' | 'Modify' | 'Delete' | 'Restore' | 'Upload' | 'Replace' | 'Merge';
  entity: 'Drivers' | 'Vehicles' | 'Factories' | 'Customers' | 'Bookings' | 'Commissions' | 'Expenses' | 'Activity Logs';
  recordId: string;
  payload: any; // The updated data array or document base64
  fileName?: string; // Optional for document files
}

export interface ActivityLog {
  timestamp: string;
  operation: string;
  entity: string;
  recordId: string;
  userId: string;
  status: 'Synced Successfully' | 'Pending Sync (Offline)' | 'Sync Failed';
  errorDetails?: string;
}

class SyncEngine {
  private isProcessingQueue = false;

  constructor() {
    // Add online listener to auto-drain queue when connection returns
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.logActivity('Online', 'Network', 'system', 'system', 'Synced Successfully', 'Internet connection restored. Triggering sync queue drain.');
        this.drainQueue();
      });
    }
  }

  // Helper to log activities locally and register sync status
  public logActivity(
    operation: string,
    entity: string,
    recordId: string,
    userId: string,
    status: 'Synced Successfully' | 'Pending Sync (Offline)' | 'Sync Failed',
    errorDetails?: string
  ) {
    const log: ActivityLog = {
      timestamp: new Date().toISOString(),
      operation,
      entity,
      recordId,
      userId,
      status,
      errorDetails
    };

    const localLogsStr = localStorage.getItem('tcm_activity_logs');
    const logs: ActivityLog[] = localLogsStr ? JSON.parse(localLogsStr) : [];
    logs.unshift(log);
    // Limit local logs to prevent storage bloating
    localStorage.setItem('tcm_activity_logs', JSON.stringify(logs.slice(0, 200)));
  }

  // Get local logs
  public getLocalLogs(): ActivityLog[] {
    const localLogsStr = localStorage.getItem('tcm_activity_logs');
    return localLogsStr ? JSON.parse(localLogsStr) : [];
  }

  // Enqueue a sync event
  public async enqueueSync(
    accessToken: string | null,
    userId: string,
    operation: SyncEvent['operation'],
    entity: SyncEvent['entity'],
    recordId: string,
    payload: any,
    fileName?: string
  ) {
    const event: SyncEvent = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      operation,
      entity,
      recordId,
      payload,
      fileName
    };

    // Store in queue
    const queue = this.getQueue();
    queue.push(event);
    this.saveQueue(queue);

    if (!accessToken || !navigator.onLine) {
      this.logActivity(operation, entity, recordId, userId, 'Pending Sync (Offline)', 'Device is offline or not authorized. Event enqueued.');
      return;
    }

    // Process immediately in background
    this.drainQueue(accessToken, userId);
  }

  // Sync a base64 document/image to Google Drive and return the file ID
  public async syncDocumentToDrive(
    accessToken: string,
    folderId: string,
    fileName: string,
    base64Data: string
  ): Promise<string> {
    if (!base64Data || base64Data.startsWith('http')) return ''; // Skip already uploaded or empty

    // 1. Check if file already exists in this folder to replace/update it
    let fileId: string | null = null;
    try {
      const queryStr = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          fileId = searchData.files[0].id;
        }
      }
    } catch (e) {
      console.error('Error finding existing document:', e);
    }

    // Convert base64 to binary payload
    let contentType = 'image/jpeg';
    let base64Pure = base64Data;
    if (base64Data.includes(';base64,')) {
      const parts = base64Data.split(';base64,');
      contentType = parts[0].replace('data:', '');
      base64Pure = parts[1];
    }

    const binaryString = atob(base64Pure);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: contentType });

    // Multi-part or simple upload
    const metadata = {
      name: fileName,
      mimeType: contentType,
      parents: fileId ? undefined : [folderId]
    };

    const boundary = 'tcm_sync_boundary';
    const multipartBody = 
      `\r\n--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      `Content-Type: ${contentType}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Pure +
      `\r\n--${boundary}--`;

    const url = fileId 
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const res = await fetch(url, {
      method: fileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Document sync failed: ${errorData.error?.message || res.statusText}`);
    }

    const resData = await res.json();
    return resData.id;
  }

  // Retrieve existing file list inside standard drive JSON entity
  private async getEntityFileId(accessToken: string, folderId: string, entityName: string): Promise<string | null> {
    const fileName = `${entityName.toLowerCase()}.json`;
    const queryStr = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }
    return null;
  }

  // Upload structured entity JSON payload to Google Drive (Incremental comparison checks)
  private async syncEntityPayload(
    accessToken: string,
    folders: FullFolderStructure,
    entity: SyncEvent['entity'],
    payload: any
  ) {
    let folderId = folders.databaseFolderId;
    let fileName = '';

    // Map entity to specific sub-folders
    switch (entity) {
      case 'Drivers':
        folderId = folders.database.driversFolderId;
        fileName = 'drivers.json';
        break;
      case 'Vehicles':
        folderId = folders.database.vehiclesFolderId;
        fileName = 'vehicles.json';
        break;
      case 'Factories':
        folderId = folders.database.factoriesFolderId;
        fileName = 'factories.json';
        break;
      case 'Customers':
        folderId = folders.database.customersFolderId;
        fileName = 'customers.json';
        break;
      case 'Bookings':
        folderId = folders.database.bookingsFolderId;
        fileName = 'bookings.json';
        break;
      case 'Commissions':
        folderId = folders.database.commissionsFolderId;
        fileName = 'commissions.json';
        break;
      case 'Expenses':
        folderId = folders.database.expensesFolderId;
        fileName = 'expenses.json';
        break;
      case 'Activity Logs':
        folderId = folders.database.activityLogsFolderId;
        fileName = 'activity_logs.json';
        break;
    }

    if (!fileName) return;

    // Check if file already exists in Drive to check for incremental updates
    const existingFileId = await this.getEntityFileId(accessToken, folderId, entity);

    // Incremental Check: Compare checksums or lengths
    let shouldSkip = false;
    if (existingFileId) {
      try {
        const metadataRes = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFileId}?fields=size,md5Checksum`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (metadataRes.ok) {
          const meta = await metadataRes.json();
          const newSize = JSON.stringify(payload).length;
          // If size matches exactly, we can optimize and skip uploading
          if (meta.size && parseInt(meta.size) === newSize) {
            shouldSkip = true;
          }
        }
      } catch (err) {
        // Fallback to upload if size check fails
      }
    }

    if (shouldSkip) {
      return;
    }

    // Prepare JSON upload
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: existingFileId ? undefined : [folderId]
    };

    const fileContent = JSON.stringify(payload, null, 2);
    const boundary = 'tcm_entity_boundary';
    const multipartBody = 
      `\r\n--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      `\r\n--${boundary}--`;

    const url = existingFileId 
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const res = await fetch(url, {
      method: existingFileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Payload sync failed: ${errorData.error?.message || res.statusText}`);
    }
  }

  // Drain the offline synchronization queue
  public async drainQueue(accessToken?: string | null, userId?: string) {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    // Resolve credentials if not provided
    const resolvedToken = accessToken || localStorage.getItem('tcm_gdrive_token');
    const resolvedUserId = userId || localStorage.getItem('tcm_user_id') || 'system';

    if (!resolvedToken || !navigator.onLine) {
      this.isProcessingQueue = false;
      return;
    }

    const queue = this.getQueue();
    if (queue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    try {
      // 1. Setup standard hierarchy on GDrive
      const folders = await setupFolderStructure(resolvedToken);

      // 2. Process events in order
      const remainingEvents: SyncEvent[] = [];

      for (const event of queue) {
        try {
          if (event.fileName && event.payload && event.payload.startsWith('data:')) {
            // Document upload
            let folderId = folders.documentsFolderId;
            if (event.fileName.includes('photo')) folderId = folders.documents.driverPhotosFolderId;
            else if (event.fileName.includes('cnic_front')) folderId = folders.documents.cnicFrontFolderId;
            else if (event.fileName.includes('cnic_back')) folderId = folders.documents.cnicBackFolderId;
            else if (event.fileName.includes('reg_book')) folderId = folders.documents.vehicleRegBooksFolderId;
            else if (event.fileName.includes('challan')) folderId = folders.documents.deliveryChallansFolderId;
            else if (event.fileName.includes('invoice')) folderId = folders.documents.invoicesFolderId;

            await this.syncDocumentToDrive(resolvedToken, folderId, event.fileName, event.payload);
          } else {
            // Entity JSON array upload
            await this.syncEntityPayload(resolvedToken, folders, event.entity, event.payload);
          }

          // Register successful log
          this.logActivity(event.operation, event.entity, event.recordId, resolvedUserId, 'Synced Successfully');
        } catch (eventError: any) {
          console.error('Failed syncing queue event:', event, eventError);
          // Put back in queue to retry later
          remainingEvents.push(event);
          this.logActivity(event.operation, event.entity, event.recordId, resolvedUserId, 'Sync Failed', eventError.message);
        }
      }

      // Update remaining queue
      this.saveQueue(remainingEvents);

      // Upload consolidated activity logs to cloud Database/Activity Logs/activity_logs.json
      if (remainingEvents.length === 0) {
        const fullLogs = this.getLocalLogs();
        await this.syncEntityPayload(resolvedToken, folders, 'Activity Logs', fullLogs);
      }
    } catch (rootError) {
      console.error('Core sync queue processing failure:', rootError);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // Local Storage Helpers for Queue
  private getQueue(): SyncEvent[] {
    const queueStr = localStorage.getItem('tcm_sync_queue');
    return queueStr ? JSON.parse(queueStr) : [];
  }

  private saveQueue(queue: SyncEvent[]) {
    localStorage.setItem('tcm_sync_queue', JSON.stringify(queue));
  }
}

export const syncEngine = new SyncEngine();
