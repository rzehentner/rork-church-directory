import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, Upload, X, Check, ZoomIn, ZoomOut, RotateCw, RefreshCw } from 'lucide-react-native';

interface ImageUploaderProps {
  currentImageUrl?: string | null;
  onUpload: (file: any) => Promise<string>;
  placeholder?: string;
  size?: number;
  isCircular?: boolean;
  disabled?: boolean;
  aspectRatio?: { width: number; height: number };
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  
  // Animated values for smooth interactions
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  
  // Touch tracking refs
  const lastScale = useRef(1);
  const baseScale = useRef(1);
  const lastDistance = useRef(0);
  const panOffset = useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    setImageUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  const pickImage = async () => {
    if (disabled) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        base64: false,
      });

      console.log('[ImageUploader] Picker result:', result);

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('[ImageUploader] Asset details:', {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        });
        
        // Reset transforms and open editor
        setImageSize({ width: asset.width, height: asset.height });
        setEditingImage(asset.uri);
        setRotation(0);
        resetTransforms();
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to open image picker.');
    }
  };

  const resetTransforms = () => {
    console.log('[ImageUploader] Resetting transforms');
    pan.setValue({ x: 0, y: 0 });
    scale.setValue(1);
    panOffset.current = { x: 0, y: 0 };
    lastScale.current = 1;
    baseScale.current = 1;
  };

  const getDistance = (touches: any[]) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        console.log(`[ImageUploader] Touch started with ${touches.length} finger(s)`);
        
        if (touches.length === 2) {
          // Starting pinch gesture
          lastDistance.current = getDistance(touches);
          baseScale.current = lastScale.current;
        }
        
        // Store current pan offset
        panOffset.current = {
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        };
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        
        if (touches.length === 2) {
          // Handle pinch to zoom
          const distance = getDistance(touches);
          if (lastDistance.current > 0) {
            const scaleDelta = distance / lastDistance.current;
            const newScale = Math.min(Math.max(baseScale.current * scaleDelta, 0.5), 3);
            scale.setValue(newScale);
            lastScale.current = newScale;
            console.log(`[ImageUploader] Pinch zoom: ${newScale.toFixed(2)}x`);
          }
        } else if (touches.length === 1) {
          // Handle pan
          pan.setValue({
            x: panOffset.current.x + gestureState.dx,
            y: panOffset.current.y + gestureState.dy,
          });
        }
      },
      onPanResponderRelease: () => {
        console.log('[ImageUploader] Touch ended');
        lastDistance.current = 0;
        panOffset.current = {
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        };
      },
    })
  ).current;

  const handleSaveEditedImage = async () => {
    if (!editingImage) return;
    
    setIsUploading(true);
    
    try {
      const currentScale = (scale as any)._value;
      const currentPan = {
        x: (pan.x as any)._value,
        y: (pan.y as any)._value,
      };
      
      console.log('[ImageUploader] Saving with transforms:', {
        scale: currentScale,
        rotation,
        pan: currentPan,
        aspectRatio,
        imageSize,
      });
      
      // Frame dimensions
      const frameWidth = screenWidth * 0.9;
      const frameHeight = aspectRatio 
        ? frameWidth * (aspectRatio.height / aspectRatio.width)
        : frameWidth;
      
      // Calculate how the image fits in the frame
      const imageAspect = imageSize.width / imageSize.height;
      const frameAspect = frameWidth / frameHeight;
      
      let displayWidth: number;
      let displayHeight: number;
      
      if (imageAspect > frameAspect) {
        displayWidth = frameWidth;
        displayHeight = frameWidth / imageAspect;
      } else {
        displayHeight = frameHeight;
        displayWidth = frameHeight * imageAspect;
      }
      
      // Apply scale to display dimensions
      const scaledDisplayWidth = displayWidth * currentScale;
      const scaledDisplayHeight = displayHeight * currentScale;
      
      // Calculate the visible area in original image coordinates
      const scaleFactorX = imageSize.width / displayWidth;
      const scaleFactorY = imageSize.height / displayHeight;
      
      // The visible frame in original image coordinates
      const visibleWidth = (frameWidth / currentScale) * scaleFactorX;
      const visibleHeight = (frameHeight / currentScale) * scaleFactorY;
      
      // Calculate the center point considering pan
      const centerX = imageSize.width / 2 - (currentPan.x / currentScale) * scaleFactorX;
      const centerY = imageSize.height / 2 - (currentPan.y / currentScale) * scaleFactorY;
      
      // Calculate crop origin
      const originX = Math.max(0, Math.min(imageSize.width - visibleWidth, centerX - visibleWidth / 2));
      const originY = Math.max(0, Math.min(imageSize.height - visibleHeight, centerY - visibleHeight / 2));
      
      const actions: any[] = [];
      
      // Apply rotation if needed
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }
      
      // Apply crop to get the visible area
      actions.push({
        crop: {
          originX: Math.round(originX),
          originY: Math.round(originY),
          width: Math.round(visibleWidth),
          height: Math.round(visibleHeight),
        },
      });
      
      // Resize to final dimensions
      const finalWidth = 1024;
      const finalHeight = aspectRatio 
        ? Math.round(finalWidth * (aspectRatio.height / aspectRatio.width))
        : Math.round(finalWidth * (visibleHeight / visibleWidth));
      
      actions.push({
        resize: {
          width: finalWidth,
          height: finalHeight,
        },
      });
      
      console.log('[ImageUploader] Manipulation actions:', actions);
      
      const manipResult = await ImageManipulator.manipulateAsync(
        editingImage,
        actions,
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      console.log('[ImageUploader] Manipulated image:', manipResult);
      
      const file = {
        uri: manipResult.uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
      };

      const uploadedUrl = await onUpload(file);
      console.log('[ImageUploader] Upload successful:', uploadedUrl);
      
      const urlWithTimestamp = `${uploadedUrl}${uploadedUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      setImageUrl(urlWithTimestamp);
      setEditingImage(null);
    } catch (error) {
      console.error('[ImageUploader] Save error:', error);
      Alert.alert('Save Failed', 'Failed to save photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleZoomIn = () => {
    const currentScale = (scale as any)._value;
    const newScale = Math.min(3, currentScale + 0.2);
    Animated.spring(scale, {
      toValue: newScale,
      useNativeDriver: true,
    }).start();
    lastScale.current = newScale;
    baseScale.current = newScale;
    console.log(`[ImageUploader] Zoom in: ${newScale.toFixed(2)}x`);
  };

  const handleZoomOut = () => {
    const currentScale = (scale as any)._value;
    const newScale = Math.max(0.5, currentScale - 0.2);
    Animated.spring(scale, {
      toValue: newScale,
      useNativeDriver: true,
    }).start();
    lastScale.current = newScale;
    baseScale.current = newScale;
    console.log(`[ImageUploader] Zoom out: ${newScale.toFixed(2)}x`);
  };

  const handleRotate = () => {
    setRotation(rotation + 90);
    console.log(`[ImageUploader] Rotated to ${rotation + 90}°`);
  };

  const handleReset = () => {
    console.log('[ImageUploader] Reset all transforms');
    Animated.parallel([
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
    setRotation(0);
    panOffset.current = { x: 0, y: 0 };
    lastScale.current = 1;
    baseScale.current = 1;
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

  const renderEditor = () => {
    if (!editingImage) return null;
    
    const frameWidth = screenWidth * 0.9;
    const frameHeight = aspectRatio 
      ? frameWidth * (aspectRatio.height / aspectRatio.width)
      : frameWidth;
    
    const currentScale = (scale as any)._value || 1;
    
    return (
      <Modal
        visible={!!editingImage}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setEditingImage(null)}
      >
        <View style={styles.editorContainer}>
          <View style={styles.editorHeader}>
            <TouchableOpacity
              onPress={() => setEditingImage(null)}
              style={styles.headerButton}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.editorTitle}>Adjust Photo</Text>
            <TouchableOpacity
              onPress={handleSaveEditedImage}
              style={styles.headerButton}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Check size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.editorContent}>
            <View
              style={[
                styles.imageFrame,
                {
                  width: frameWidth,
                  height: frameHeight,
                },
              ]}
              {...panResponder.panHandlers}
            >
              <Animated.View
                style={[
                  styles.imageWrapper,
                  {
                    transform: [
                      { translateX: pan.x },
                      { translateY: pan.y },
                      { scale },
                      { rotate: `${rotation}deg` },
                    ],
                  },
                ]}
              >
                <Image
                  source={{ uri: editingImage }}
                  style={{
                    width: frameWidth,
                    height: frameHeight,
                  }}
                  resizeMode="contain"
                />
              </Animated.View>
              
              {/* Frame overlay */}
              <View style={styles.frameOverlay} pointerEvents="none">
                <View style={styles.frameBorder} />
              </View>
            </View>
            
            <Text style={styles.helpText}>
              Drag to move • Pinch to zoom • {Math.round(currentScale * 100)}%
            </Text>
          </View>
          
          <View style={styles.editorControls}>
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleZoomOut}
              >
                <ZoomOut size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleZoomIn}
              >
                <ZoomIn size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleRotate}
              >
                <RotateCw size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleReset}
              >
                <RefreshCw size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <>
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
      {renderEditor()}
    </>
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
  editorContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#000000',
  },
  headerButton: {
    padding: 8,
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  editorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFrame: {
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
    position: 'relative',
  },
  imageWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  frameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  frameBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    opacity: 0.3,
  },
  editorControls: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#000000',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  controlButton: {
    padding: 12,
    backgroundColor: '#333333',
    borderRadius: 8,
  },
  helpText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});