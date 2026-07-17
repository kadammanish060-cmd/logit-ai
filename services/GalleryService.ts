import * as ImagePicker from 'expo-image-picker';

export const GalleryService = {
  requestPermission: async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  },

  selectPhotos: async (): Promise<{ uri: string; name: string }[] | null> => {
    const hasPermission = await GalleryService.requestPermission();
    if (!hasPermission) {
      throw new Error('Gallery permission not granted');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets.map(asset => {
      const filename = asset.uri.split('/').pop() || `image_${Date.now()}.jpg`;
      return {
        uri: asset.uri,
        name: filename,
      };
    });
  },
};
