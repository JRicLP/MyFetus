import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { apiUrl, fetchWithAuth } from './api';
import { notifyUnauthorized } from './authEvents';
import { getStoredToken } from './sessionStorage';

function safeFileName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized || 'exame';
}

async function downloadOnWeb(url: string, fileName: string): Promise<void> {
  const response = await fetchWithAuth(url);
  if (!response.ok) throw new Error('Não foi possível baixar o exame.');

  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadDocument(
  documentId: number,
  documentName: string,
  mimeType?: string | null
): Promise<void> {
  const url = apiUrl(`/api/documents/${documentId}/download`);
  const fileName = safeFileName(documentName);

  if (Platform.OS === 'web') {
    await downloadOnWeb(url, fileName);
    return;
  }

  const token = await getStoredToken();
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
  if (!FileSystem.cacheDirectory) throw new Error('Armazenamento temporário indisponível.');

  const result = await FileSystem.downloadAsync(
    url,
    `${FileSystem.cacheDirectory}${Date.now()}-${fileName}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (result.status === 401) {
    notifyUnauthorized();
    throw new Error('Sua sessão expirou. Entre novamente.');
  }
  if (result.status < 200 || result.status >= 300) {
    throw new Error('Não foi possível baixar o exame.');
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Não há aplicativo disponível para abrir o exame.');
  }

  await Sharing.shareAsync(result.uri, {
    dialogTitle: 'Abrir exame',
    mimeType: mimeType || undefined,
  });
}
