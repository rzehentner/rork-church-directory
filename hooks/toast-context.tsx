import React, { useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import Toast, { ToastType } from '@/components/Toast';
import NetInfo from '@react-native-community/netinfo';

interface ToastState {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  actionText?: string;
  onAction?: () => void;
}

interface ToastOptions {
  duration?: number;
  actionText?: string;
  onAction?: () => void;
}

const [ToastProvider, useToast] = createContextHook(() => {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  const showToast = useCallback((
    type: ToastType,
    message: string,
    options?: ToastOptions
  ) => {
    if (!message?.trim()) return;
    if (message.length > 200) return;
    const sanitizedMessage = message.trim();
    
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastState = {
      id,
      type,
      message: sanitizedMessage,
      duration: options?.duration,
      actionText: options?.actionText,
      onAction: options?.onAction,
    };

    setToasts(prev => {
      // Remove any existing toasts of the same type to prevent spam
      const filtered = prev.filter(toast => toast.type !== type || toast.message !== sanitizedMessage);
      return [...filtered, newToast];
    });
  }, []);

  const hideToast = useCallback((id?: string) => {
    if (id) {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    } else {
      // Hide the most recent toast
      setToasts(prev => prev.slice(0, -1));
    }
  }, []);

  const showSuccess = useCallback((message: string, options?: ToastOptions) => {
    if (!message?.trim()) return;
    if (message.length > 200) return;
    const sanitizedMessage = message.trim();
    const validatedOptions = options && typeof options === 'object' ? options : undefined;
    showToast('success', sanitizedMessage, validatedOptions);
  }, [showToast]);

  const showError = useCallback((message: string, options?: ToastOptions) => {
    if (!message?.trim()) return;
    if (message.length > 200) return;
    const sanitizedMessage = message.trim();
    const validatedOptions = options && typeof options === 'object' ? options : undefined;
    showToast('error', sanitizedMessage, { duration: 6000, ...validatedOptions }); // Longer duration for errors
  }, [showToast]);

  const showWarning = useCallback((message: string, options?: ToastOptions) => {
    if (!message?.trim()) return;
    if (message.length > 200) return;
    const sanitizedMessage = message.trim();
    const validatedOptions = options && typeof options === 'object' ? options : undefined;
    showToast('warning', sanitizedMessage, validatedOptions);
  }, [showToast]);

  const showInfo = useCallback((message: string, options?: ToastOptions) => {
    if (!message?.trim()) return;
    if (message.length > 200) return;
    const sanitizedMessage = message.trim();
    const validatedOptions = options && typeof options === 'object' ? options : undefined;
    showToast('info', sanitizedMessage, validatedOptions);
  }, [showToast]);

  const showOfflineError = useCallback(() => {
    showError('No internet connection. Please check your network and try again.');
  }, [showError]);

  // Monitor network connectivity
  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      
      if (offline) {
        showWarning('You are offline. Some features may not work properly.');
      }
    });

    return unsubscribe;
  }, [showWarning]);

  return useMemo(() => ({
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showOfflineError,
    toasts,
    isOffline,
  }), [showToast, hideToast, showSuccess, showError, showWarning, showInfo, showOfflineError, toasts, isOffline]);
});

export { ToastProvider, useToast };

// Toast renderer component to be used in the root layout
export function ToastRenderer() {
  const { toasts, hideToast } = useToast();
  
  return (
    <>
      {/* Render toasts - only show the most recent one */}
      {toasts.length > 0 && (
        <Toast
          type={toasts[toasts.length - 1].type}
          message={toasts[toasts.length - 1].message}
          visible={true}
          onHide={() => hideToast(toasts[toasts.length - 1].id)}
          duration={toasts[toasts.length - 1].duration}
          actionText={toasts[toasts.length - 1].actionText}
          onAction={toasts[toasts.length - 1].onAction}
        />
      )}
    </>
  );
}