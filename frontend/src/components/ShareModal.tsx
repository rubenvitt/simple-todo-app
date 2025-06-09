import { useState, useCallback } from 'react';
import {
  Modal,
  Select,
  Button,
  Space,
  List,
  Avatar,
  Typography,
  Tag,
  Spin,
  message,
  Divider,
  Alert,
  Checkbox,
  Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  ShareAltOutlined,
  DeleteOutlined,
  MailOutlined,
  LogoutOutlined,
  MoreOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { PermissionLevel } from '@simple-todo-app/shared';
import {
  useListShares,
  useShareList,
  useUpdateListShare,
  useRemoveListShare,
  useSearchUsers,
} from '../hooks/useListShares';
import { useAuth } from '../hooks';
import { debounce } from 'lodash';

const { Title, Text } = Typography;
const { Option } = Select;

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  list: {
    id: string;
    name: string;
  } | null;
}

const PERMISSION_LABELS = {
  [PermissionLevel.VIEWER]: 'Betrachter',
  [PermissionLevel.EDITOR]: 'Bearbeiter',
  [PermissionLevel.OWNER]: 'Besitzer',
};

const PERMISSION_COLORS = {
  [PermissionLevel.VIEWER]: 'blue',
  [PermissionLevel.EDITOR]: 'green',
  [PermissionLevel.OWNER]: 'gold',
};

export const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onClose,
  list,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<PermissionLevel>(
    PermissionLevel.VIEWER
  );
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkPermission, setBulkPermission] = useState<PermissionLevel>(PermissionLevel.VIEWER);

  const { data: shares = [], isLoading: sharesLoading } = useListShares(list?.id || '');
  const { data: searchResults = [], isLoading: searchLoading } = useSearchUsers(searchQuery);
  
  const shareListMutation = useShareList();
  const updateShareMutation = useUpdateListShare();
  const removeShareMutation = useRemoveListShare();

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchQuery(value);
    }, 300),
    [setSearchQuery]
  );

  const handleSearchChange = (value: string) => {
    debouncedSearch(value);
  };

  const handleShareList = async () => {
    if (!selectedUser) {
      message.warning('Bitte wählen Sie einen Benutzer aus 👤');
      return;
    }

    const selectedUserData = searchResults.find(user => user.id === selectedUser);
    if (!selectedUserData) {
      message.error('Benutzer nicht gefunden 😞');
      return;
    }

    try {
      await shareListMutation.mutateAsync({
        listId: list?.id || '',
        data: {
          userEmail: selectedUserData.email,
          permissionLevel: selectedPermission,
        },
      });
      
      message.success(`Liste erfolgreich mit ${selectedUserData.name} geteilt! 🎉`);
      setSelectedUser(null);
      setSearchQuery('');
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Fehler beim Teilen der Liste';
      message.error(`${errorMessage} 😞`);
    }
  };

  const handleUpdatePermission = async (userId: string, newPermission: PermissionLevel) => {
    try {
      await updateShareMutation.mutateAsync({
        listId: list?.id || '',
        userId,
        data: { permissionLevel: newPermission },
      });
      message.success('Berechtigung erfolgreich aktualisiert! ✅');
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Fehler beim Aktualisieren der Berechtigung';
      message.error(`${errorMessage} 😞`);
    }
  };

  const handleRemoveShare = async (userId: string, userName: string) => {
    try {
      await removeShareMutation.mutateAsync({ listId: list!.id, userId });
      message.success(`${userName} wurde von der Liste entfernt! 👋`);
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Fehler beim Entfernen des Benutzers';
      message.error(`${errorMessage} 😞`);
    }
  };

  const handleLeaveList = async () => {
    try {
      await removeShareMutation.mutateAsync({ listId: list?.id || '', userId: user!.id });
      message.success('Sie haben die Liste erfolgreich verlassen! 👋');
      onClose();
      // Navigate away from the list page
      window.location.href = '/dashboard';
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Fehler beim Verlassen der Liste';
      message.error(`${errorMessage} 😞`);
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleBulkPermissionChange = async () => {
    if (selectedUsers.length === 0) {
      message.warning('Bitte wählen Sie mindestens einen Benutzer aus 👥');
      return;
    }

    try {
      // Update permissions for all selected users
      await Promise.all(
        selectedUsers.map(userId =>
          updateShareMutation.mutateAsync({
            listId: list?.id || '',
            userId,
            data: { permissionLevel: bulkPermission },
          })
        )
      );
      
      message.success(`Berechtigungen für ${selectedUsers.length} Benutzer aktualisiert! ✅`);
      setSelectedUsers([]);
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Fehler beim Aktualisieren der Berechtigungen';
      message.error(`${errorMessage} 😞`);
    }
  };

  const currentUserIsOwner = shares.some(
    share => share.userId === user?.id && share.permissionLevel === PermissionLevel.OWNER
  );
  
  const currentUserShare = shares.find(share => share.userId === user?.id);
  const canLeaveList = currentUserShare && !currentUserIsOwner;

  const filteredSearchResults = searchResults.filter(
    searchUser => !shares.some(share => share.userId === searchUser.id) && searchUser.id !== user?.id
  );

  const editableShares = shares.filter(
    share => share.permissionLevel !== PermissionLevel.OWNER || currentUserIsOwner
  );

  const bulkActionsMenu: MenuProps['items'] = [
    {
      key: 'select-all',
      label: 'Alle auswählen',
      icon: <TeamOutlined />,
      onClick: () => {
        const selectableUserIds = editableShares
          .filter(share => share.userId !== user?.id)
          .map(share => share.userId);
        setSelectedUsers(selectableUserIds);
      },
    },
    {
      key: 'clear-selection',
      label: 'Auswahl aufheben',
      onClick: () => setSelectedUsers([]),
    },
  ];

  if (!list) {
    return null;
  }

  return (
    <Modal
      title={
        <Space>
          <ShareAltOutlined />
          <span>"{list?.name}" teilen</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      {/* Share with new user */}
      {currentUserIsOwner && (
        <>
          <Alert
            message="Neue Person hinzufügen"
            description="Suchen Sie nach Benutzern per E-Mail oder Name und fügen Sie sie zur Liste hinzu."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
            <Select
              showSearch
              placeholder="Benutzer suchen..."
              style={{ flex: 1 }}
              value={selectedUser}
              onChange={setSelectedUser}
              onSearch={handleSearchChange}
              loading={searchLoading}
              filterOption={false}
              notFoundContent={searchLoading ? <Spin size="small" /> : null}
            >
              {filteredSearchResults.map(user => (
                <Option key={user.id} value={user.id}>
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} />
                    <div>
                      <div>{user.name}</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {user.email}
                      </Text>
                    </div>
                  </Space>
                </Option>
              ))}
            </Select>
            
            <Select
              value={selectedPermission}
              onChange={setSelectedPermission}
              style={{ width: 120 }}
            >
              <Option value={PermissionLevel.VIEWER}>Betrachter</Option>
              <Option value={PermissionLevel.EDITOR}>Bearbeiter</Option>
            </Select>
            
            <Button
              type="primary"
              icon={<ShareAltOutlined />}
              onClick={handleShareList}
              loading={shareListMutation.isPending}
              disabled={!selectedUser}
            >
              Teilen
            </Button>
          </Space.Compact>
          
          <Divider />
        </>
      )}

      {/* Bulk Actions */}
      {currentUserIsOwner && shares.length > 1 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <Title level={5} className="!mb-0">
              🎛️ Bulk-Aktionen
            </Title>
            <Space>
              <Dropdown menu={{ items: bulkActionsMenu }} trigger={['click']}>
                <Button icon={<MoreOutlined />}>
                  Auswahl
                </Button>
              </Dropdown>
            </Space>
          </div>
          
          {selectedUsers.length > 0 && (
            <Alert
              message={`${selectedUsers.length} Benutzer ausgewählt`}
              description={
                <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                  <Select
                    value={bulkPermission}
                    onChange={setBulkPermission}
                    style={{ width: 120 }}
                  >
                    <Option value={PermissionLevel.VIEWER}>Betrachter</Option>
                    <Option value={PermissionLevel.EDITOR}>Bearbeiter</Option>
                  </Select>
                  <Button
                    type="primary"
                    onClick={handleBulkPermissionChange}
                    loading={updateShareMutation.isPending}
                  >
                    Anwenden
                  </Button>
                </Space.Compact>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />
          )}
          
          <Divider />
        </>
      )}

      {/* Current shares */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Title level={5} className="!mb-0">
            👥 Personen mit Zugriff ({shares.length})
          </Title>
          
          {canLeaveList && (
            <Button
              danger
              icon={<LogoutOutlined />}
              onClick={handleLeaveList}
              loading={removeShareMutation.isPending}
            >
              Liste verlassen
            </Button>
          )}
        </div>
        
        {sharesLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin size="large" />
          </div>
        ) : shares.length === 0 ? (
          <Alert
            message="Noch keine geteilten Berechtigungen"
            description="Diese Liste ist noch nicht mit anderen Personen geteilt."
            type="info"
            showIcon
          />
        ) : (
          <List
            dataSource={shares}
            renderItem={(share) => (
              <List.Item
                actions={
                  currentUserIsOwner && share.permissionLevel !== PermissionLevel.OWNER
                    ? [
                        <Select
                          key="permission"
                          value={share.permissionLevel}
                          onChange={(value) => handleUpdatePermission(share.userId, value)}
                          loading={updateShareMutation.isPending}
                          style={{ width: 120 }}
                        >
                          <Option value={PermissionLevel.VIEWER}>Betrachter</Option>
                          <Option value={PermissionLevel.EDITOR}>Bearbeiter</Option>
                        </Select>,
                        <Button
                          key="remove"
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveShare(share.userId, share.user?.name || 'Benutzer')}
                          loading={removeShareMutation.isPending}
                          title="Benutzer entfernen"
                        />,
                      ]
                    : []
                }
              >
                <List.Item.Meta
                  avatar={
                    <Space>
                      {currentUserIsOwner && share.userId !== user?.id && share.permissionLevel !== PermissionLevel.OWNER && (
                        <Checkbox
                          checked={selectedUsers.includes(share.userId)}
                          onChange={(e) => handleUserSelection(share.userId, e.target.checked)}
                        />
                      )}
                      <Avatar icon={<UserOutlined />} />
                    </Space>
                  }
                  title={
                    <Space>
                      <span>{share.user?.name || 'Unbekannter Benutzer'}</span>
                      <Tag color={PERMISSION_COLORS[share.permissionLevel]}>
                        {PERMISSION_LABELS[share.permissionLevel]}
                      </Tag>
                      {share.userId === user?.id && (
                        <Tag color="purple">Sie</Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Space>
                      <MailOutlined />
                      <Text type="secondary">{share.user?.email}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </Modal>
  );
};