import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export async function currentCoordinates() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return {};
  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: location.coords.latitude, longitude: location.coords.longitude };
}

export async function capturePrivatePhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Bạn cần cấp quyền Camera để chụp ảnh.');
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75, exif: false });
  if (result.canceled || !result.assets[0]) return null;
  const root = `${FileSystem.documentDirectory}driver-evidence/`;
  await FileSystem.makeDirectoryAsync(root, { intermediates: true });
  const destination = `${root}${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  await FileSystem.copyAsync({ from: result.assets[0].uri, to: destination });
  return destination;
}
