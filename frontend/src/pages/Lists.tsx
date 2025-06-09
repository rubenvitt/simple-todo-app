import { useState } from 'react';
import {
  Typography,
  Button,
  Input,
  Modal,
  Empty,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  BarsOutlined,
} from '@ant-design/icons';
import { useLists, useDeleteList } from '../hooks';
import { CreateListModal, ShareModal, ListCard, ListTable } from '../components';
// import { useTranslation } from '../hooks';
import type { ListWithStats } from '@simple-todo-app/shared';

const { Title } = Typography;
const { Search } = Input;

const Lists = () => {
  // const { t } = useTranslation('common'); // Currently not used
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ListWithStats | null>(null);
  const [sharingList, setSharingList] = useState<ListWithStats | null>(null);
  const [viewType, setViewType] = useState<'cards' | 'table'>('cards');

  const { data: lists, isLoading, error } = useLists();
  const deleteList = useDeleteList();

  const filteredLists = lists?.filter((list) =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (list.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  ) ?? [];

  const handleEditList = (list: ListWithStats) => {
    setEditingList(list);
    setCreateModalOpen(true);
  };

  const handleShareList = (list: ListWithStats) => {
    setSharingList(list);
    setShareModalOpen(true);
  };

  const handleDeleteList = (list: ListWithStats) => {
    Modal.confirm({
      title: 'Liste löschen',
      content: `Möchten Sie die Liste "${list.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      icon: <DeleteOutlined />,
      okText: 'Löschen',
      cancelText: 'Abbrechen',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteList.mutateAsync(list.id);
        } catch (error) {
          console.error('Error deleting list:', error);
        }
      },
    });
  };

  const handleCloseModal = () => {
    setCreateModalOpen(false);
    setEditingList(null);
  };

  const handleCloseShareModal = () => {
    setShareModalOpen(false);
    setSharingList(null);
  };

  if (error) {
    return (
      <Alert
        message="Fehler beim Laden der Listen"
        description="Es gab ein Problem beim Laden Ihrer Listen. Bitte versuchen Sie es später erneut."
        type="error"
        showIcon
      />
    );
  }

  const totalTasks = lists?.reduce((sum, list) => sum + list.taskCount, 0) || 0;
  const completedTasks = lists?.reduce((sum, list) => sum + list.completedTaskCount, 0) || 0;
  const sharedLists = lists?.filter(list => list.memberCount > 1).length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-1">
              📋 Meine Listen
            </h1>
            <p className="text-gray-600">
              Verwalten Sie Ihre Listen und Projekte
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-lg p-1 shadow-sm">
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewType === 'table'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setViewType('table')}
              >
                <BarsOutlined className="mr-1" />
                Tabelle
              </button>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewType === 'cards'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setViewType('cards')}
              >
                <AppstoreOutlined className="mr-1" />
                Karten
              </button>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
              size="large"
              className="shadow-sm hover:shadow-md transition-shadow"
            >
              Neue Liste
            </Button>
          </div>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Gesamt Listen</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{lists?.length || 0}</div>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Geteilte Listen</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{sharedLists}</div>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Gesamt Aufgaben</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{totalTasks}</div>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Erledigte Aufgaben</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{completedTasks}</div>
          </div>
        </div>

        {/* Suchbereich */}
        <div className="mb-8">
          <Search
            placeholder="Listen durchsuchen..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Listen Inhalt - Wiederverwendung der Komponenten! */}
        {filteredLists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="text-center">
                  <p className="text-lg text-gray-600 mb-2">
                    {searchTerm
                      ? `🔍 Keine Listen für "${searchTerm}" gefunden`
                      : '📝 Noch keine Listen vorhanden'}
                  </p>
                  {!searchTerm && (
                    <p className="text-gray-500">
                      Erstellen Sie Ihre erste Liste, um mit der Organisation zu beginnen!
                    </p>
                  )}
                </div>
              }
            >
              {!searchTerm && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalOpen(true)}
                  size="large"
                  className="mt-4"
                >
                  🎯 Erste Liste erstellen
                </Button>
              )}
            </Empty>
          </div>
        ) : viewType === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredLists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                onEdit={handleEditList}
                onDelete={handleDeleteList}
              />
            ))}
          </div>
        ) : (
          <ListTable
            lists={filteredLists}
            loading={isLoading}
            onEdit={handleEditList}
            onDelete={handleDeleteList}
          />
        )}

        {/* Modals */}
        <CreateListModal
          open={createModalOpen}
          onClose={handleCloseModal}
          editingList={editingList}
        />

        <ShareModal
          open={shareModalOpen}
          onClose={handleCloseShareModal}
          list={sharingList}
        />
      </div>
    </div>
  );
};

export default Lists;