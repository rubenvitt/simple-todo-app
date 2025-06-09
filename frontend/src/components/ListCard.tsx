import { Dropdown } from 'antd';
import { EllipsisOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks';
import type { ListWithStats } from '@simple-todo-app/shared';

interface ListCardProps {
  list: ListWithStats;
  onEdit: (list: ListWithStats) => void;
  onDelete: (list: ListWithStats) => void;
}

export const ListCard: React.FC<ListCardProps> = ({ list, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const progress = list.taskCount > 0 ? Math.round((list.completedTaskCount / list.taskCount) * 100) : 0;

  const menuItems = [
    {
      key: 'edit',
      label: t('lists.actions.edit'),
      icon: <EditOutlined />,
      onClick: () => onEdit(list),
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
      className="relative bg-white rounded-lg border border-gray-200 p-4 h-auto transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-base font-semibold text-gray-900">
          {list.name}
        </h3>
        
        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
          placement="bottomRight"
        >
          <button
            className="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Weitere Aktionen für Liste ${list.name}`}
          >
            <EllipsisOutlined />
          </button>
        </Dropdown>
      </div>

      {/* Beschreibung - max 2 Zeilen */}
      {list.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {list.description}
        </p>
      )}

      {/* Statistiken */}
      <div className="flex gap-4 text-xs text-gray-600 mb-2">
        <span>📋 {list.taskCount} Aufgaben</span>
        <span>✅ {progress}% erledigt</span>
      </div>

      {/* Fortschrittsbalken - nur 4px hoch! */}
      <div className="h-1 bg-gray-200 rounded-sm overflow-hidden">
        <div 
          className="h-full bg-green-500 rounded-sm transition-all duration-300"
          style={{ width: `${progress}%` }}
          aria-label={`Fortschritt: ${progress}% abgeschlossen`}
        />
      </div>
    </div>
  );
};