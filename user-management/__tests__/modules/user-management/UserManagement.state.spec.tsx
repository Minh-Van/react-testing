import { renderHook, act, waitFor } from '@testing-library/react';
import type { 
  UserManagementState
} from '@app/modules/user-management/UserManagement';
import { useUserManagementState } from '@app/modules/user-management/UserManagement';
import fixtures from '@test/fixtures';

describe('useUserManagementState', () => {
  it(`When start/end editing`, async () => {    
    const { result } = renderHook(() => useUserManagementState({ phase: 'ready' }));

    await waitFor(() => expect(result.current.phase).toEqual<UserManagementState['phase']>('ready'));

    act(() => {
      if (result.current.phase === 'ready') {
        result.current.actions.startEditing({
          mode: 'creation',
          userType: 'doctor',
        });
      }
    });
    await waitFor(() => expect(result.current.phase).toEqual<UserManagementState['phase']>('editing'));

    act(() => {
      if (result.current.phase === 'editing') {
        result.current.actions.endEditing();
      }
    });
    await waitFor(() => expect(result.current.phase).toEqual<UserManagementState['phase']>('ready'));
  });

  it(`When start/end deleting`, async () => {    
    const { result } = renderHook(() => useUserManagementState({ phase: 'ready' }));

    await waitFor(() => expect(result.current.phase).toEqual<UserManagementState['phase']>('ready'));

    act(() => {
      if (result.current.phase === 'ready') {
        result.current.actions.startDeleting(fixtures.users[0].id)
      }
    });
    await waitFor(() => expect(result.current.phase).toEqual<UserManagementState['phase']>('deleting'));

    act(() => {
      if (result.current.phase === 'deleting') {
        result.current.actions.endDeleting()
      }
    });
    await waitFor(() => expect(result.current.phase).toEqual<UserManagementState['phase']>('ready'));
  });
});