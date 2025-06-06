import { create } from 'zustand';

interface ModalState {
  createTaskModalOpen: boolean;
  editTaskModalOpen: boolean;
  createListModalOpen: boolean;
  editListModalOpen: boolean;
  shareListModalOpen: boolean;
  deleteConfirmModalOpen: boolean;
  
  selectedTaskId: string | null;
  selectedListId: string | null;
  deleteTarget: { type: 'task' | 'list'; id: string } | null;
  
  openCreateTaskModal: (listId?: string) => void;
  openEditTaskModal: (taskId: string) => void;
  closeTaskModals: () => void;
  
  openCreateListModal: () => void;
  openEditListModal: (listId: string) => void;
  closeListModals: () => void;
  
  openShareListModal: (listId: string) => void;
  closeShareListModal: () => void;
  
  openDeleteConfirmModal: (type: 'task' | 'list', id: string) => void;
  closeDeleteConfirmModal: () => void;
  
  closeAllModals: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  createTaskModalOpen: false,
  editTaskModalOpen: false,
  createListModalOpen: false,
  editListModalOpen: false,
  shareListModalOpen: false,
  deleteConfirmModalOpen: false,
  
  selectedTaskId: null,
  selectedListId: null,
  deleteTarget: null,
  
  openCreateTaskModal: (listId) => set({
    createTaskModalOpen: true,
    selectedListId: listId || null,
  }),
  
  openEditTaskModal: (taskId) => set({
    editTaskModalOpen: true,
    selectedTaskId: taskId,
  }),
  
  closeTaskModals: () => set({
    createTaskModalOpen: false,
    editTaskModalOpen: false,
    selectedTaskId: null,
  }),
  
  openCreateListModal: () => set({
    createListModalOpen: true,
  }),
  
  openEditListModal: (listId) => set({
    editListModalOpen: true,
    selectedListId: listId,
  }),
  
  closeListModals: () => set({
    createListModalOpen: false,
    editListModalOpen: false,
    selectedListId: null,
  }),
  
  openShareListModal: (listId) => set({
    shareListModalOpen: true,
    selectedListId: listId,
  }),
  
  closeShareListModal: () => set({
    shareListModalOpen: false,
    selectedListId: null,
  }),
  
  openDeleteConfirmModal: (type, id) => set({
    deleteConfirmModalOpen: true,
    deleteTarget: { type, id },
  }),
  
  closeDeleteConfirmModal: () => set({
    deleteConfirmModalOpen: false,
    deleteTarget: null,
  }),
  
  closeAllModals: () => set({
    createTaskModalOpen: false,
    editTaskModalOpen: false,
    createListModalOpen: false,
    editListModalOpen: false,
    shareListModalOpen: false,
    deleteConfirmModalOpen: false,
    selectedTaskId: null,
    selectedListId: null,
    deleteTarget: null,
  }),
}));