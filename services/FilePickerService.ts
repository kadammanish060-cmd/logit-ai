import * as DocumentPicker from 'expo-document-picker';

export const FilePickerService = {
  selectFile: async (): Promise<{ uri: string; name: string; size?: number; mimeType?: string } | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/heic',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.heic', '.csv', '.xls', '.xlsx'];
    const name = asset.name.toLowerCase();
    const isAllowed = allowedExtensions.some(ext => name.endsWith(ext));

    if (!isAllowed) {
      throw new Error('Unsupported file type. Please select a PDF, JPG, PNG, HEIC, CSV, or Excel file.');
    }

    return {
      uri: asset.uri,
      name: asset.name,
      size: asset.size,
      mimeType: asset.mimeType,
    };
  },
};
