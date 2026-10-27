import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

function downloadOnWeb(content: string, fileName: string): void {
  const objectUrl = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Entrega o JSON exportado: download no web; no celular, abre o compartilhamento
 * para a pessoa escolher onde salvar. A cópia temporária é apagada em seguida,
 * porque o arquivo contém dados de saúde.
 */
export async function saveDataExport(content: string, fileName: string): Promise<void> {
  if (Platform.OS === 'web') {
    downloadOnWeb(content, fileName);
    return;
  }

  if (!FileSystem.cacheDirectory) throw new Error('Armazenamento temporário indisponível.');
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Não há aplicativo disponível para salvar o arquivo.');
  }

  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  try {
    await Sharing.shareAsync(uri, {
      dialogTitle: 'Salvar meus dados',
      mimeType: 'application/json',
      UTI: 'public.json',
    });
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
