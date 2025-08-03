import { google } from 'googleapis';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink: string;
  thumbnailLink?: string;
}

export interface DriveAuthUrl {
  authUrl: string;
  state: string;
}

// Supported spreadsheet MIME types
const SPREADSHEET_MIME_TYPES = [
  'application/vnd.google-apps.spreadsheet', // Google Sheets
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel (.xlsx)
  'application/vnd.ms-excel', // Excel (.xls)
  'text/csv', // CSV files
];

// Comprehensive Google OAuth scopes - maximum permissions for Drive and Sheets
const SCOPES = [
  // Google Drive scopes - full access
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.scripts',

  // Google Sheets scopes - full access
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',

  // Google Docs scopes - for document access
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/documents.readonly',

  // Google Apps Script scopes
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/script.projects.readonly',

  // User profile and email
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
  'email',
  'profile'
];

/**
 * Create OAuth2 client for Google Drive API
 */
function createOAuth2Client() {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://holitime-242147063579.us-west2.run.app';
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/api/import/google-drive/callback`
  );
}

/**
 * Generate Google OAuth URL for Drive access
 */
export function generateAuthUrl(userId: string): DriveAuthUrl {
  const oauth2Client = createOAuth2Client();

  const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

  console.log('Google Drive Auth: Generating URL with scopes:', SCOPES);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent', // Force consent to get refresh token
  });

  console.log('Google Drive Auth: Generated URL:', authUrl);
  return { authUrl, state };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<any> {
  const oauth2Client = createOAuth2Client();

  console.log('Google Drive Auth: Exchanging code for tokens');
  const { tokens } = await oauth2Client.getToken(code);
  console.log('Google Drive Auth: Received tokens:', {
    access_token: tokens.access_token ? `${tokens.access_token.substring(0, 20)}...` : 'none',
    refresh_token: tokens.refresh_token ? 'present' : 'none',
    scope: tokens.scope,
    token_type: tokens.token_type,
    expiry_date: tokens.expiry_date
  });
  return tokens;
}

/**
 * List spreadsheet files from Google Drive
 */
export async function listSpreadsheetFiles(accessToken: string): Promise<DriveFile[]> {
  console.log('Google Drive Service: Starting file listing with token:', accessToken.substring(0, 20) + '...');

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    // First, let's try a simple test call to verify the token works
    console.log('Google Drive Service: Testing token with about endpoint...');
    try {
      const aboutResponse = await drive.about.get({ fields: 'user' });
      console.log('Google Drive Service: Token test successful, user:', aboutResponse.data.user?.emailAddress);
    } catch (aboutError: any) {
      console.error('Google Drive Service: Token test failed:', aboutError);
      throw aboutError;
    }

    // Now try to list files
    const query = `(${SPREADSHEET_MIME_TYPES.map(type => `mimeType='${type}'`).join(' or ')}) and trashed=false`;
    console.log('Google Drive Service: Using query:', query);

    const response = await drive.files.list({
      q: query,
      fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 50,
    });

    console.log('Google Drive Service: Raw API response:', {
      filesCount: response.data.files?.length || 0,
      status: response.status,
      statusText: response.statusText
    });

    const files = response.data.files?.map(file => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size || undefined,
      modifiedTime: file.modifiedTime!,
      webViewLink: file.webViewLink!,
      thumbnailLink: file.thumbnailLink || undefined,
    })) || [];

    console.log('Google Drive Service: Successfully retrieved', files.length, 'files');
    return files;
  } catch (error: any) {
    console.error('Google Drive Service: Detailed error:', {
      message: error.message,
      code: error.code,
      status: error.status,
      errors: error.errors,
      response: error.response?.data,
      stack: error.stack
    });

    // Provide more specific error messages
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      throw new Error('Google Drive access token has expired. Please reconnect.');
    } else if (error.code === 403) {
      throw new Error(`Insufficient permissions to access Google Drive files. Details: ${error.message}`);
    } else if (error.code === 429) {
      throw new Error('Too many requests to Google Drive API. Please try again later.');
    } else {
      throw new Error(`Failed to access Google Drive files: ${error.message || 'Unknown error'}`);
    }
  }
}

/**
 * Download file content from Google Drive
 */
export async function downloadFile(fileId: string, accessToken: string): Promise<Buffer> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    // Get file metadata first
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'mimeType',
    });

    let response;
    
    if (fileMetadata.data.mimeType === 'application/vnd.google-apps.spreadsheet') {
      // For Google Sheets, export as Excel format
      response = await drive.files.export({
        fileId,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }, { responseType: 'arraybuffer' });
    } else {
      // For other files, download directly
      response = await drive.files.get({
        fileId,
        alt: 'media',
      }, { responseType: 'arraybuffer' });
    }

    return Buffer.from(response.data as ArrayBuffer);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file');
  }
}

/**
 * Get file metadata from Google Drive
 */
export async function getFileMetadata(fileId: string, accessToken: string): Promise<any> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    const response = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,size,modifiedTime,webViewLink,parents',
    });

    return response.data;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw new Error('Failed to get file metadata');
  }
}
