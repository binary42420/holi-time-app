import { create } from 'zustand';

interface ShiftPageStore {
  activeAccordionItems: string[];
  setActiveAccordionItems: (items: string[]) => void;
  isDeleteModalOpen: boolean;
  setDeleteModalOpen: (isOpen: boolean) => void;
  assignmentActionState: { assignmentId?: string; isProcessing: boolean };
  setAssignmentActionState: (state: { assignmentId?: string; isProcessing: boolean }) => void;
}

export const useShiftPageStore = create<ShiftPageStore>((set) => ({
  activeAccordionItems: [],
  setActiveAccordionItems: (items) => set({ activeAccordionItems: items }),
  isDeleteModalOpen: false,
  setDeleteModalOpen: (isOpen) => set({ isDeleteModalOpen: isOpen }),
  assignmentActionState: { isProcessing: false },
  setAssignmentActionState: (state) => set({ assignmentActionState: state }),
}));