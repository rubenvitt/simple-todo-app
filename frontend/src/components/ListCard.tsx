import React, { useState } from 'react';
import { Dropdown } from 'antd';
import { EllipsisOutlined, EditOutlined, DeleteOutlined, ShareAltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useMobileDetection } from '../hooks';
import type { ListWithStats } from '@simple-todo-app/shared';
import { ShareButton, ShareModal } from './sharing';

interface ListCardProps {
  list: ListWithStats;
  onEdit: (list: ListWithStats) => void;
  onDelete: (list: ListWithStats) => void;
}

export const ListCard: React.FC<ListCardProps> = ({ list, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { isMobile } = useMobileDetection();
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const progress = list.taskCount > 0 ? Math.round((list.completedTaskCount / list.taskCount) * 100) : 0;

  // Transform list data for sharing
  const shareableList = {
    id: list.id,
    name: list.name,
    description: list.description,
    // Note: We don't have full task data here, just stats
    // The actual sharing would ideally fetch full task data
    tasks: [], // Would need to be populated from API
    createdAt: list.createdAt ? new Date(list.createdAt) : undefined,
    updatedAt: list.updatedAt ? new Date(list.updatedAt) : undefined
  };

  // Quick share data for ShareButton
  const quickShareData = {
    title: `List: ${list.name}`,
    text: `${list.name}${list.description ? `\n\n${list.description}` : ''}\n\nProgress: ${list.completedTaskCount}/${list.taskCount} tasks completed (${progress}%)`,
    url: `${window.location.origin}/lists/${list.id}`
  };

  const menuItems = [
    {
      key: 'edit',
      label: t('lists.actions.edit'),
      icon: <EditOutlined />,
      onClick: () => onEdit(list),
    },
    {
      key: 'share-quick',
      label: (
        <ShareButton
          data={quickShareData}
          variant="icon"
          size="sm"
          className="!p-0 !bg-transparent !text-current !border-0 hover:!bg-transparent"
          showStatus={false}
        >
          Quick Share
        </ShareButton>
      ),
      icon: <ShareAltOutlined />,
      onClick: (e: any) => {
        e.domEvent?.stopPropagation();
      }
    },
    {
      key: 'share-advanced',
      label: 'Advanced Share...',
      icon: <ShareAltOutlined />,
      onClick: () => setShareModalOpen(true),
    },
    {
      key: 'delete',
      label: t('lists.actions.delete'),
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => onDelete(list),
    },
  ];

  const handleCardClick = () => {
    navigate(`/lists/${list.id}`);
  };

  return (
    <div 
      className={`relative bg-white rounded-lg border border-gray-200 h-auto transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none ${
        isMobile ? 'compact-card-mobile' : 'compact-card'
      }`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Liste ${list.name} öffnen`}
    >
      {/* Farbiger Akzent-Streifen links - NUR 4px! */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg"
        style={{ backgroundColor: list.color || '#3b82f6' }}
      />
      
      {/* Header mit Titel und Aktionen */}
      <div className={`flex justify-between items-start ${isMobile ? 'mb-1' : 'mb-2'}`}>
        <h3 className={`font-semibold text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
          {list.name}
        </h3>
        
        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
          placement="bottomRight"
        >
          <button
            className={`text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors ${
              isMobile ? 'ml-1 p-1' : 'ml-2 p-1'
            }`}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Weitere Aktionen für Liste ${list.name}`}
          >
            <EllipsisOutlined />
          </button>
        </Dropdown>
      </div>

      {/* Beschreibung - max 2 Zeilen */}
      {list.description && (
        <p className={`text-gray-600 line-clamp-2 ${
          isMobile ? 'text-xs mb-1' : 'text-sm mb-2'
        }`}>
          {list.description}
        </p>
      )}

      {/* Statistiken */}
      <div className={`flex text-gray-600 ${
        isMobile ? 'gap-2 text-xs mb-1' : 'gap-4 text-xs mb-2'
      }`}>
        <span>📋 {list.taskCount} Aufgaben</span>
        <span>✅ {progress}% erledigt</span>
      </div>

      {/* Fortschrittsbalken - kompakt! */}
      <div className="h-1 bg-gray-200 rounded-sm overflow-hidden">
        <div 
          className="h-full bg-green-500 rounded-sm transition-all duration-300"
          style={{ width: `${progress}%` }}
          aria-label={`Fortschritt: ${progress}% abgeschlossen`}
        />
      </div>
      
      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        content={{
          type: 'list',
          data: shareableList
        }}
      />
    </div>
  );
};