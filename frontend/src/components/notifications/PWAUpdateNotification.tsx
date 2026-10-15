import React from 'react';
import { notification, Button } from 'antd';
import { CloudDownloadOutlined } from '@ant-design/icons';

interface PWAUpdateNotificationProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export const PWAUpdateNotification: React.FC<PWAUpdateNotificationProps> = ({
  onUpdate,
  onDismiss,
}) => {
  const [api, contextHolder] = notification.useNotification();

  const showUpdateNotification = () => {
    api.info({
      message: '🚀 Update verfügbar',
      description: 'Eine neue Version der App ist verfügbar. Möchten Sie jetzt aktualisieren?',
      placement: 'topRight',
      duration: 0, // Don't auto-close
      btn: (
        <div className="flex gap-2">
          <Button
            type="primary"
            size="small"
            icon={<CloudDownloadOutlined />}
            onClick={() => {
              onUpdate();
              api.destroy();
            }}
          >
            Aktualisieren
          </Button>
          <Button
            size="small"
            onClick={() => {
              onDismiss();
              api.destroy();
            }}
          >
            Später
          </Button>
        </div>
      ),
      onClose: onDismiss,
    });
  };

  React.useEffect(() => {
    showUpdateNotification();
  }, []);

  return contextHolder;
};

// Hook for PWA update management
export const usePWAUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [registration, setRegistration] = React.useState<ServiceWorkerRegistration | null>(null);

  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        setRegistration(reg);
        
        // Listen for waiting service worker
        if (reg.waiting) {
          setUpdateAvailable(true);
        }

        // Listen for new service worker
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      });

      // Listen for controlling service worker change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  const updateApp = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
  };

  return {
    updateAvailable,
    updateApp,
    dismissUpdate,
  };
};