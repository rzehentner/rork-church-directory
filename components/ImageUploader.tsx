import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, Upload } from 'lucide-react-native';

interface ImageUploaderProps {
  currentImageUrl?: string | null;
  onUpload: (file: any) => Promise<string>;
  placeholder?: string;
  size?: number;
  isCircular?: boolean;
  disabled?: boolean;
  aspectRatio?: { width: number; height: number };
}

export default function ImageUploader({
  currentImageUrl,
  onUpload,
  placeholder = 'Add Photo',
  size = 80,
  isCircular = false,
  disabled = false,
  aspectRatio,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(currentImageUrl || null);

  React.useEffect(() => {
    setImageUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  const resizeImage = async (uri: string): Promise<{ uri: string }> => {
    const MAX_WIDTH = 1200;
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: MAX_WIDTH } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result;
    } catch (manipError: any) {
      return { uri };
    }
  };

  const pickImage = async () => {
    if (disabled) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos.');
        return;
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      };

      if (aspectRatio) {
        pickerOptions.aspect = [aspectRatio.width, aspectRatio.height];
      }

      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        setIsUploading(true);
        try {
          const resized = await resizeImage(asset.uri);

          const file = {
            uri: resized.uri,
            name: `photo_${Date.now()}.jpg`,
            type: 'image/jpeg',
          };

          const uploadedUrl = await onUpload(file);

          const urlWithTimestamp = `${uploadedUrl}${uploadedUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
          setImageUrl(urlWithTimestamp);
        } catch (error: any) {
          Alert.alert('Upload Failed', `Failed to save photo. ${error?.message || 'Please try again.'}`);
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open image picker.');
    }
  };

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: isCircular ? size / 2 : 12,
    },
    disabled && styles.disabled,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={pickImage}
      disabled={disabled || isUploading}
      testID="image-uploader"
    >
      {isUploading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#7C3AED" />
        </View>
      ) : imageUrl && imageUrl.trim() !== '' ? (
        <>
          <Image
            source={{ uri: imageUrl }}
            style={[
              styles.image,
              {
                width: size,
                height: size,
                borderRadius: isCircular ? size / 2 : 12,
              },
            ]}
            resizeMode="cover"
          />
          {!disabled && (
            <View style={styles.overlay}>
              <Camera size={16} color="#FFFFFF" />
            </View>
          )}
        </>
      ) : (
        <View style={styles.placeholder}>
          <Upload size={24} color="#9CA3AF" />
          <Text style={styles.placeholderText}>{placeholder}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  disabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    backgroundColor: '#F3F4F6',
  },
  overlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  placeholderText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '500' as const,
  },
});