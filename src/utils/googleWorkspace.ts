/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility functions for Google Workspace integration.
 * Communicates with Google Drive, Google Sheets, Gmail, Google Calendar, and Google Contacts APIs.
 */

// 1. Helper to find or create a Google Drive folder
export async function getOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string> {
  let queryStr = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    queryStr += ` and '${parentId}' in parents`;
  }

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id,name)`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const errorData = await searchRes.json();
    throw new Error(`Google Drive Search Error: ${errorData.error?.message || searchRes.statusText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Folder does not exist, create it
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json();
    throw new Error(`Google Drive Folder Creation Error: ${errorData.error?.message || createRes.statusText}`);
  }

  const createData = await createRes.json();
  return createData.id;
}

// 2. Setup standard folder structure:
// Transport Commission Manager/
//   Database/
//   Documents/
//   Images/
//   Backups/
export async function setupFolderStructure(accessToken: string): Promise<{
  rootFolderId: string;
  databaseFolderId: string;
  documentsFolderId: string;
  imagesFolderId: string;
  backupsFolderId: string;
}> {
  const rootFolderId = await getOrCreateFolder(accessToken, 'Transport Commission Manager');
  const databaseFolderId = await getOrCreateFolder(accessToken, 'Database', rootFolderId);
  const documentsFolderId = await getOrCreateFolder(accessToken, 'Documents', rootFolderId);
  const imagesFolderId = await getOrCreateFolder(accessToken, 'Images', rootFolderId);
  const backupsFolderId = await getOrCreateFolder(accessToken, 'Backups', rootFolderId);

  return {
    rootFolderId,
    databaseFolderId,
    documentsFolderId,
    imagesFolderId,
    backupsFolderId,
  };
}

// 3. Backup database payload to Google Drive (saves under Backups/)
export async function backupDataToDrive(
  accessToken: string,
  backupsFolderId: string,
  backupPayload: any
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `tcm-backup-${timestamp}.json`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: [backupsFolderId],
  };

  const fileContent = JSON.stringify(backupPayload, null, 2);
  const boundary = 'foo_bar_baz_boundary';

  const multipartBody = 
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    `\r\n--${boundary}--`;

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!uploadRes.ok) {
    const errorData = await uploadRes.json();
    throw new Error(`Google Drive Upload Error: ${errorData.error?.message || uploadRes.statusText}`);
  }

  const uploadData = await uploadRes.json();
  return uploadData.id;
}

// 4. List available backups from Google Drive (inside Backups/)
export async function listBackupsInDrive(
  accessToken: string,
  backupsFolderId: string
): Promise<Array<{ id: string; name: string; createdTime: string; size?: string }>> {
  const queryStr = `'${backupsFolderId}' in parents and mimeType='application/json' and name contains 'tcm-backup-' and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&orderBy=createdTime desc&fields=files(id,name,createdTime,size)`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(`Google Drive List Error: ${errorData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

// 5. Restore backup file from Google Drive
export async function restoreBackupFromDrive(accessToken: string, fileId: string): Promise<any> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Google Drive Download Error: ${res.statusText}`);
  }

  const data = await res.json();
  return data;
}

// 6. Google Sheets Export: Creates a spreadsheet, populates headers and rows, returns spreadsheet URL
export async function exportToGoogleSheets(
  accessToken: string,
  title: string,
  sheets: Array<{ sheetName: string; headers: string[]; rows: any[][] }>
): Promise<string> {
  // A. Create Spreadsheet
  const createSpreadsheetUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const spreadsheetMeta = {
    properties: { title: title },
    sheets: sheets.map(s => ({
      properties: { title: s.sheetName }
    }))
  };

  const createRes = await fetch(createSpreadsheetUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(spreadsheetMeta),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json();
    throw new Error(`Google Sheets Creation Error: ${errorData.error?.message || createRes.statusText}`);
  }

  const spreadsheetData = await createRes.json();
  const spreadsheetId = spreadsheetData.spreadsheetId;
  const spreadsheetUrl = spreadsheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // B. Populate values for each sheet
  for (const s of sheets) {
    const range = `${s.sheetName}!A1`;
    const populateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    
    const valueRange = {
      range: range,
      majorDimension: 'ROWS',
      values: [s.headers, ...s.rows]
    };

    const popRes = await fetch(populateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(valueRange),
    });

    if (!popRes.ok) {
      const errorData = await popRes.json();
      console.error(`Failed to populate values for sheet ${s.sheetName}:`, errorData);
    }
  }

  return spreadsheetUrl;
}

// 7. Gmail: Send details via Gmail API
export async function sendGmailEmail(
  accessToken: string,
  toEmail: string,
  subject: string,
  bodyHtml: string
): Promise<boolean> {
  const mailLines = [
    `To: ${toEmail}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    bodyHtml
  ];

  const emailContent = mailLines.join('\r\n');
  
  // Base64Url encode the message (standard for Gmail API)
  const base64UrlEncoded = btoa(unescape(encodeURIComponent(emailContent)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const sendUrl = 'https://gmail.googleapis.com/v1/users/me/messages/send';
  const res = await fetch(sendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: base64UrlEncoded }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error('Gmail send error:', err);
    throw new Error(`Gmail API error: ${err.error?.message || res.statusText}`);
  }

  return true;
}

// 8. Google Calendar: Add booking/delivery event to Calendar
export async function addGoogleCalendarEvent(
  accessToken: string,
  bookingTitle: string,
  dateStr: string, // YYYY-MM-DD
  description: string
): Promise<boolean> {
  const event = {
    summary: bookingTitle,
    description: description,
    start: { date: dateStr },
    end: { date: dateStr }, // Single-day event
    reminders: {
      useDefault: true
    }
  };

  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error('Google Calendar Error:', err);
    throw new Error(`Calendar API Error: ${err.error?.message || res.statusText}`);
  }

  return true;
}

// 9. Google Contacts: Add Contact
export async function addGoogleContact(
  accessToken: string,
  fullName: string,
  phoneNumber: string,
  role: 'Driver' | 'Factory Manager' | 'Customer Warehouse Manager'
): Promise<boolean> {
  const contactPayload = {
    names: [{ givenName: fullName }],
    phoneNumbers: [{ value: phoneNumber, type: 'work' }],
    organizations: [{ name: 'Transport Commission Manager', title: role }],
    notes: `Added automatically via Transport Commission Manager App as ${role}.`
  };

  const url = 'https://people.googleapis.com/v1/people:createContact';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contactPayload),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error('Google Contacts Sync Error:', err);
    throw new Error(`People API Error: ${err.error?.message || res.statusText}`);
  }

  return true;
}
