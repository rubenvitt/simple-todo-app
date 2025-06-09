import React, { useState, useRef, useCallback } from 'react';
import { Upload, Button, Modal, message, Avatar, Space } from 'antd';
import { UploadOutlined, UserOutlined, CameraOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useTranslation } from '../hooks';

interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarChange: (avatarUrl: string) => void;
  size?: number;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  onAvatarChange,
  size = 80,
}) => {
  const { t } = useTranslation('common');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
  ) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight,
      ),
      mediaWidth,
      mediaHeight,
    )
  }

  const onSelectFile = (file: File) => {
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || '');
        setIsModalVisible(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const getCroppedImg = useCallback(
    (image: HTMLImageElement, crop: Crop): Promise<Blob> => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No 2d context');
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const pixelRatio = window.devicePixelRatio;

      canvas.width = crop.width * pixelRatio * scaleX;
      canvas.height = crop.height * pixelRatio * scaleY;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width * scaleX,
        crop.height * scaleY,
      );

      return new Promise((resolve) => {
        canvas.toBlob(resolve as BlobCallback, 'image/jpeg', 0.9);
      });
    },
    [],
  );

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) {
      return;
    }

    setIsUploading(true);
    try {
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
      
      // Convert blob to base64 for preview
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        onAvatarChange(base64);
        message.success(t('profile.avatarUpdated'));
        setIsModalVisible(false);
      };
      reader.readAsDataURL(croppedImageBlob);
    } catch (error) {
      console.error('Error cropping image:', error);
      message.error(t('profile.avatarUploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error(t('profile.avatarTypeError'));
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error(t('profile.avatarSizeError'));
      return false;
    }

    onSelectFile(file);
    return false; // Prevent auto upload
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar 
          size={size} 
          src={currentAvatar || null} 
          icon={<UserOutlined />}
        />
        <Upload
          beforeUpload={beforeUpload}
          showUploadList={false}
          accept="image/*"
        >
          <Button icon={<CameraOutlined />} type="dashed">
            {t('profile.changeAvatar')}
          </Button>
        </Upload>
      </div>

      <Modal
        title={t('profile.cropAvatar')}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>
            {t('actions.cancel')}
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={isUploading}
            onClick={handleCropComplete}
            disabled={!completedCrop}
          >
            {t('actions.save')}
          </Button>,
        ]}
        width={600}
      >
        {imageSrc && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              circularCrop
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imageSrc}
                style={{ maxHeight: '400px', maxWidth: '100%' }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>
        )}
      </Modal>
    </>
  );
};

export default AvatarUpload;