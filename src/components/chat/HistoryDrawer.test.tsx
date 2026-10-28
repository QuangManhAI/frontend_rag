import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { chatDb } from '../../db/chatDb';
import { useSessionStore } from '../../store/sessionStore';
import { HistoryDrawer } from './HistoryDrawer';

describe('HistoryDrawer Component', () => {
  beforeEach(async () => {
    await chatDb.messages.clear();
    await chatDb.sessions.clear();
    useSessionStore.setState({
      currentSessionId: null,
      sessions: [],
      isHistoryOpen: true,
      isOffline: false,
    });
  });

  it('renders empty state when there are no saved sessions', () => {
    render(<HistoryDrawer />);
    expect(screen.getByText('Chưa có đoạn chat nào.')).toBeDefined();
    expect(screen.getByText('Đoạn chat mới')).toBeDefined();
  });

  it('renders sessions list and handles session selection', async () => {
    const s1 = {
      id: '0199f0c2-7a3e-7c1d-9a52-3c9d8f1e2b01',
      title: 'Khảo sát kiến trúc RAG 3D',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      message_count: 2,
    };
    await chatDb.sessions.put(s1);
    useSessionStore.setState({ sessions: [s1], currentSessionId: null });

    render(<HistoryDrawer />);
    expect(screen.getByText('Khảo sát kiến trúc RAG 3D')).toBeDefined();

    // Click session to select
    const item = screen.getByText('Khảo sát kiến trúc RAG 3D');
    fireEvent.click(item);
    expect(useSessionStore.getState().currentSessionId).toBe(s1.id);
  });

  it('provides 2-step inline confirmation before deleting a session', async () => {
    const s1 = {
      id: '0199f0c2-7a3e-7c1d-9a52-3c9d8f1e2b02',
      title: 'Đoạn chat nháp',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      message_count: 1,
    };
    await chatDb.sessions.put(s1);
    useSessionStore.setState({ sessions: [s1], currentSessionId: s1.id });

    render(<HistoryDrawer />);

    // Initial state: Trash button is present
    const trashBtn = screen.getByRole('button', { name: 'Xoá đoạn chat' });
    expect(trashBtn).toBeDefined();

    // Step 1: Click trash bin
    fireEvent.click(trashBtn);

    // Confirmation UI should now appear
    expect(screen.getByText('Xóa?')).toBeDefined();
    const confirmBtn = screen.getByTitle('Xác nhận xoá');
    const cancelBtn = screen.getByTitle('Huỷ');
    expect(confirmBtn).toBeDefined();
    expect(cancelBtn).toBeDefined();

    // Test Cancel: clicking cancel restores normal state
    fireEvent.click(cancelBtn);
    expect(screen.queryByText('Xóa?')).toBeNull();

    // Step 2: Click trash again and Confirm deletion
    const trashBtnAgain = screen.getByRole('button', { name: 'Xoá đoạn chat' });
    fireEvent.click(trashBtnAgain);
    const confirmBtnAgain = screen.getByTitle('Xác nhận xoá');
    fireEvent.click(confirmBtnAgain);

    // Session should be deleted from Dexie and store
    await waitFor(() => {
      expect(useSessionStore.getState().sessions.length).toBe(0);
    });
    expect(await chatDb.sessions.count()).toBe(0);
  });

  it('clicking "+ Đoạn chat mới" calls startNewChat', () => {
    useSessionStore.setState({ currentSessionId: 'some-id' });
    render(<HistoryDrawer />);

    const newChatBtn = screen.getByRole('button', { name: /Đoạn chat mới/ });
    fireEvent.click(newChatBtn);

    expect(useSessionStore.getState().currentSessionId).toBeNull();
    expect(useSessionStore.getState().isHistoryOpen).toBe(false);
  });
});
