import { Table, Progress, Button, Dropdown, Tag, Tooltip, Space } from 'antd';
import { EditOutlined, DeleteOutlined, FolderOpenOutlined, EllipsisOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks';
import type { ListWithStats } from '@simple-todo-app/shared';
import type { ColumnsType } from 'antd/es/table';

interface ListTableProps {
  lists: ListWithStats[];
  loading?: boolean;
  onEdit: (list: ListWithStats) => void;
  onDelete: (list: ListWithStats) => void;
}

export const ListTable: React.FC<ListTableProps> = ({ 
  lists, 
  loading = false, 
  onEdit, 
  onDelete 
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const columns: ColumnsType<ListWithStats> = [
    {
      title: '📝 Name',
      dataIndex: 'name',
      key: 'name',
      width: '25%',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record: ListWithStats) => (
        <div className="flex items-center space-x-3">
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0" 
            style={{ backgroundColor: record.color || '#3b82f6' }}
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors truncate"
                 onClick={() => navigate(`/lists/${record.id}`)}>
              {name}
            </div>
            {record.description && (
              <div className="text-sm text-gray-500 truncate">
                {record.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '📊 Fortschritt',
      key: 'progress',
      width: '20%',
      sorter: (a, b) => {
        const progressA = a.taskCount > 0 ? (a.completedTaskCount / a.taskCount) * 100 : 0;
        const progressB = b.taskCount > 0 ? (b.completedTaskCount / b.taskCount) * 100 : 0;
        return progressA - progressB;
      },
      render: (_, record: ListWithStats) => {
        const progress = record.taskCount > 0 ? Math.round((record.completedTaskCount / record.taskCount) * 100) : 0;
        return (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{record.completedTaskCount}/{record.taskCount} Aufgaben</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress 
              percent={progress} 
              showInfo={false}
              size="small"
              strokeColor={{
                '0%': '#10b981',
                '100%': '#059669',
              }}
              trailColor="#f3f4f6"
            />
          </div>
        );
      },
    },
    {
      title: '👥 Mitglieder',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: '12%',
      sorter: (a, b) => a.memberCount - b.memberCount,
      render: (count: number) => (
        <Tag color="blue" className="text-center">
          {count}
        </Tag>
      ),
    },
    {
      title: '📅 Erstellt',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '15%',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => (
        <span className="text-sm text-gray-600">
          {new Date(date).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })}
        </span>
      ),
    },
    {
      title: 'Aktionen',
      key: 'actions',
      width: '15%',
      render: (_, record: ListWithStats) => (
        <Space size="small">
          <Tooltip title={t('lists.actions.open')}>
            <Button
              type="text"
              icon={<FolderOpenOutlined />}
              onClick={() => navigate(`/lists/${record.id}`)}
              className="text-blue-500 hover:text-blue-700"
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'edit',
                  label: t('lists.actions.edit'),
                  icon: <EditOutlined />,
                  onClick: () => onEdit(record),
                },
                {
                  key: 'delete',
                  label: t('lists.actions.delete'),
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => onDelete(record),
                },
              ]
            }}
            trigger={['click']}
          >
            <Button
              type="text"
              icon={<EllipsisOutlined />}
              className="text-gray-500 hover:text-gray-700"
            />
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={lists}
      loading={loading}
      rowKey="id"
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => 
          `${range[0]}-${range[1]} von ${total} Listen`,
      }}
      rowClassName={(_, index) => 
        `${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`
      }
      className="shadow-sm rounded-lg overflow-hidden bg-white border border-gray-200"
      scroll={{ x: 800 }}
    />
  );
};