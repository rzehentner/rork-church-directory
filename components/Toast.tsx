import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Hook for confirmation dialogs
export function useConfirmation() {
  const [dialog, setDialog] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    destructive?: boolean;
  } | null>(null);

  const showConfirmation = React.useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
    }
  ) => {
    setDialog({
      visible: true,
      title,
      message,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      onConfirm: () => {
        onConfirm();
        setDialog(null);
      },
      onCancel: () => setDialog(null),
      destructive: options?.destructive,
    });
  }, []);

  const ConfirmationRenderer = React.useCallback(() => {
    if (!dialog) return null;
    
    return (
      <ConfirmationDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
        destructive={dialog.destructive}
      />
    );
  }, [dialog]);

  return { showConfirmation, ConfirmationRenderer };
}

interface ToastProps {
  type: ToastType;
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
  actionText?: string;
  onAction?: () => void;
}

const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const TOAST_COLORS = {
  success: {
    background: '#10B981',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  error: {
    background: '#EF4444',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  warning: {
    background: '#F59E0B',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  info: {
    background: '#3B82F6',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
};

export default function Toast({
  type,
  message,
  visible,
  onHide,
  duration = 4000,
  actionText,
  onAction,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const IconComponent = TOAST_ICONS[type];
  const colors = TOAST_COLORS[type];

  const hideToast = React.useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  }, [translateY, opacity, onHide]);

  useEffect(() => {
    if (visible) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Animate in
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after duration
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    } else {
      hideToast();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, duration, translateY, opacity, hideToast]);

  const handlePress = () => {
    if (onAction) {
      onAction();
    }
    hideToast();
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={actionText ? handlePress : hideToast}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>
          <IconComponent size={20} color={colors.icon} />
        </View>
        
        <View style={styles.messageContainer}>
          <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
            {message}
          </Text>
          {actionText && (
            <Text style={[styles.actionText, { color: colors.text }]}>
              {actionText}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  iconContainer: {
    marginRight: 12,
  },
  messageContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 2,
    textDecorationLine: 'underline',
  },
});

// Confirmation Dialog Component
interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmationDialog({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmationDialogProps) {
  // Use native Alert on mobile
  React.useEffect(() => {
    if (Platform.OS !== 'web' && visible) {
      Alert.alert(
        title,
        message,
        [
          { text: cancelText, style: 'cancel', onPress: onCancel },
          {
            text: confirmText,
            style: destructive ? 'destructive' : 'default',
            onPress: onConfirm,
          },
        ],
        { cancelable: true, onDismiss: onCancel }
      );
    }
  }, [visible, title, message, confirmText, cancelText, onConfirm, onCancel, destructive]);

  // Return null for mobile (Alert handles the UI)
  if (Platform.OS !== 'web') {
    return null;
  }

  // Custom modal for web
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={confirmationStyles.overlay}>
        <View style={confirmationStyles.dialog}>
          <Text style={confirmationStyles.title}>{title}</Text>
          <Text style={confirmationStyles.message}>{message}</Text>
          
          <View style={confirmationStyles.buttons}>
            <TouchableOpacity
              style={[confirmationStyles.button, confirmationStyles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={confirmationStyles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                confirmationStyles.button,
                destructive ? confirmationStyles.destructiveButton : confirmationStyles.confirmButton
              ]}
              onPress={onConfirm}
            >
              <Text style={[
                destructive ? confirmationStyles.destructiveButtonText : confirmationStyles.confirmButtonText
              ]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const confirmationStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    minWidth: 300,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  confirmButton: {
    backgroundColor: '#7C3AED',
  },
  destructiveButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  destructiveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});