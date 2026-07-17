import * as ImagePicker from 'expo-image-picker';

export const CameraService = {
  requestPermission: async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  },

  takePhoto: async (): Promise<{ uri: string; name: string } | null> => {
    const hasPermission = await CameraService.requestPermission();
    if (!hasPermission) {
      throw new Error('Camera permission not granted');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const filename = asset.uri.split('/').pop() || `camera_${Date.now()}.jpg`;

    return {
      uri: asset.uri,
      name: filename,
    };
  },
};
