import { GoogleAuthProvider, signInWithPopup, User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { DriveFileAttachment } from '../types';

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file'
];

let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;
let isSigningIn = false;

// Subscribers for auth state changes in the Drive client
const authStateListeners: Array<(user: User | null, token: string | null) => void> = [];

export const subscribeToDriveAuth = (
  callback: (user: User | null, token: string | null) => void
) => {
  authStateListeners.push(callback);
  callback(cachedGoogleUser, cachedAccessToken);
  return () => {
    const index = authStateListeners.indexOf(callback);
    if (index > -1) authStateListeners.splice(index, 1);
  };
};

const notifyDriveAuthState = () => {
  authStateListeners.forEach((listener) => {
    try {
      listener(cachedGoogleUser, cachedAccessToken);
    } catch (e) {
      console.error('Error in Drive auth state listener:', e);
    }
  });
};

/**
 * Initialize Drive Auth listener linked with Firebase Auth
 */
export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedGoogleUser = user;
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      notifyDriveAuthState();
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
        notifyDriveAuthState();
      }
    }
  });
};

/**
 * Connect to Google Drive with popup and obtain access token
 */
export const connectGoogleDrive = async (): Promise<{ user: User; accessToken: string }> => {
  if (cachedAccessToken && cachedGoogleUser) {
    return { user: cachedGoogleUser, accessToken: cachedAccessToken };
  }

  isSigningIn = true;
  try {
    const provider = new GoogleAuthProvider();
    DRIVE_SCOPES.forEach((scope) => provider.addScope(scope));
    // Prompt to consent
    provider.setCustomParameters({
      prompt: 'select_account consent',
      access_type: 'offline',
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google Drive. Por favor intenta de nuevo.');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    notifyDriveAuthState();

    return {
      user: result.user,
      accessToken: cachedAccessToken,
    };
  } catch (error: any) {
    console.error('Error connecting Google Drive:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get the current cached access token or return null
 */
export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Disconnect Google Drive session token
 */
export const disconnectGoogleDrive = async () => {
  cachedAccessToken = null;
  notifyDriveAuthState();
};

/**
 * Checks if Google Drive is currently connected and active
 */
export const isDriveConnected = (): boolean => {
  return Boolean(cachedAccessToken);
};

// =========================================================================
// GOOGLE DRIVE API V3 HELPERS (FOLDER STRUCTURE & FILE UPLOAD)
// =========================================================================

/**
 * Sanitizes folder or file name for Google Drive
 */
export const sanitizeDriveName = (name: string): string => {
  return (name || '').replace(/[/\\?%*:|"<>]/g, '-').trim() || 'Sin Nombre';
};

/**
 * Searches for an existing folder with given name inside parentId, or creates a new one
 */
export const getOrCreateFolder = async (
  folderName: string,
  parentId: string = 'root',
  accessToken: string
): Promise<string> => {
  const cleanName = sanitizeDriveName(folderName);
  
  // Escape single quotes for Google Drive search query
  const safeSearchName = cleanName.replace(/'/g, "\\'");
  const query = `name = '${safeSearchName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Error buscando carpeta "${cleanName}" en Google Drive: ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: cleanName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Error creando carpeta "${cleanName}" en Google Drive: ${errText}`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
};

/**
 * Recursively creates or traverses a hierarchy of folders starting from 'root'.
 * e.g. ["I.E. Técnico Superior", "Grado 5°", "Grupo 503", "Actividades", "2026-08-24 - Taller 1"]
 */
export const ensureDriveFolderPath = async (
  folderSegments: string[],
  accessToken: string
): Promise<{ folderId: string; displayPath: string }> => {
  let currentParentId = 'root';
  const cleanSegments = folderSegments.map(sanitizeDriveName).filter(Boolean);

  for (const segment of cleanSegments) {
    currentParentId = await getOrCreateFolder(segment, currentParentId, accessToken);
  }

  return {
    folderId: currentParentId,
    displayPath: cleanSegments.join(' > '),
  };
};

/**
 * Uploads a local File or Blob directly to Google Drive via multipart upload
 */
export const uploadFileToGoogleDrive = async (options: {
  file: File | Blob;
  fileName?: string;
  folderSegments: string[];
  description?: string;
  onProgress?: (status: string) => void;
}): Promise<DriveFileAttachment> => {
  const { file, fileName, folderSegments, description, onProgress } = options;

  onProgress?.('Verificando conexión con Google Drive...');
  let token = getDriveAccessToken();
  if (!token) {
    const authResult = await connectGoogleDrive();
    token = authResult.accessToken;
  }

  onProgress?.('Organizando árbol de carpetas en Google Drive...');
  const { folderId, displayPath } = await ensureDriveFolderPath(folderSegments, token);

  const cleanFileName = sanitizeDriveName(fileName || (file instanceof File ? file.name : 'archivo_adjunto'));
  const mimeType = file.type || 'application/octet-stream';

  onProgress?.(`Subiendo "${cleanFileName}" a Google Drive...`);

  // Read file as ArrayBuffer or Base64
  const fileData = await file.arrayBuffer();

  const metadata = {
    name: cleanFileName,
    parents: [folderId],
    description: description || `Cargado desde Registro Académico fleon en ${displayPath}`,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  // Construct multipart body
  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' });
  const contentBlob = new Blob([fileData], { type: mimeType });

  const multipartBody = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadataBlob,
    delimiter,
    `Content-Type: ${mimeType}\r\n\r\n`,
    contentBlob,
    closeDelim,
  ]);

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,thumbnailLink,size,createdTime';

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Error al subir archivo a Google Drive: ${errText}`);
  }

  const uploadedFile = await uploadRes.json();
  onProgress?.('¡Archivo guardado con éxito!');

  return {
    id: uploadedFile.id,
    name: uploadedFile.name || cleanFileName,
    mimeType: uploadedFile.mimeType || mimeType,
    webViewLink: uploadedFile.webViewLink || `https://drive.google.com/file/d/${uploadedFile.id}/view`,
    webContentLink: uploadedFile.webContentLink,
    thumbnailLink: uploadedFile.thumbnailLink,
    size: uploadedFile.size ? Number(uploadedFile.size) : (file instanceof File ? file.size : undefined),
    uploadedAt: uploadedFile.createdTime || new Date().toISOString(),
    folderPathDisplay: displayPath,
    driveFolderId: folderId,
  };
};

/**
 * Deletes a file from Google Drive by its fileId
 */
export const deleteFileFromGoogleDrive = async (fileId: string): Promise<boolean> => {
  let token = getDriveAccessToken();
  if (!token) {
    const authResult = await connectGoogleDrive();
    token = authResult.accessToken;
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    console.warn(`No se pudo eliminar el archivo ${fileId} de Google Drive:`, errText);
    return false;
  }

  return true;
};

/**
 * Builds standard folder path segments for an Activity
 * Format: [Colegio, Grado, Grupo, "Actividades", "YYYY-MM-DD - Titulo"]
 */
export const buildActivityFolderPathSegments = (
  schoolName: string,
  grade: string,
  groupName: string,
  assignedDate: string,
  activityTitle: string
): string[] => {
  const cleanSchool = schoolName || 'Institución Educativa';
  const cleanGrade = grade.toLowerCase().startsWith('grado') ? grade : `Grado ${grade}`;
  const cleanGroup = groupName.toLowerCase().startsWith('grupo') ? groupName : `Grupo ${groupName}`;
  const cleanDate = assignedDate || new Date().toISOString().split('T')[0];
  const cleanActivity = activityTitle.trim() || 'Actividad';

  return [
    cleanSchool,
    cleanGrade,
    cleanGroup,
    'Actividades',
    `${cleanDate} - ${cleanActivity}`,
  ];
};

/**
 * Builds standard folder path segments for a Class Daily Log (Diario de Campo)
 * Format: [Colegio, Grado, Grupo, "Diario de Campo", "YYYY-MM-DD - Materia"]
 */
export const buildDailyLogFolderPathSegments = (
  schoolName: string,
  grade: string,
  groupName: string,
  date: string,
  subject: string
): string[] => {
  const cleanSchool = schoolName || 'Institución Educativa';
  const cleanGrade = grade.toLowerCase().startsWith('grado') ? grade : `Grado ${grade}`;
  const cleanGroup = groupName.toLowerCase().startsWith('grupo') ? groupName : `Grupo ${groupName}`;
  const cleanDate = date || new Date().toISOString().split('T')[0];
  const cleanSubject = subject.trim() || 'General';

  return [
    cleanSchool,
    cleanGrade,
    cleanGroup,
    'Diario de Campo',
    `${cleanDate} - ${cleanSubject}`,
  ];
};
