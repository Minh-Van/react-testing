import { renderHook, act, waitFor } from '@testing-library/react';
import UserService from '@app/services/user';
import type { 
  UserDeleteConfirmationState
} from '@app/modules/user-management/UserDeleteConfirmation';
import { useUserDeleteConfirmationState } from '@app/modules/user-management/UserDeleteConfirmation';
import fixtures from '@test/fixtures';
import utils from '@app/utils';

describe('useUserDeleteConfirmationState', () => {
  beforeEach(() => {
    jest.spyOn(UserService, 'getUser').mockImplementation(async (userId) => {
      const user = fixtures.users.find((user) => user.id === userId);
      if (!user) {
        throw new Error(`getUser: incorrect mockImplementation`);
      }

      await utils.wait(1000);

      return { data: user };
    });

    jest.spyOn(UserService, 'deleteUser').mockImplementation(async () => {
      await utils.wait(1000);
      return;
    });
  })

  afterEach(() => {
    jest.restoreAllMocks();
  })

  it(`When load user for confirmation in initial`, async () => {    
    const { result } = renderHook(() => useUserDeleteConfirmationState({ phase: 'initial' }));

    await waitFor(() => expect(result.current.phase).toEqual<UserDeleteConfirmationState['phase']>('initial'));

    act(() => {
      if (result.current.phase === 'initial') {
        result.current.actions.initial(fixtures.users[0].id);
      }
    });
    await waitFor(() => expect(result.current.phase).toEqual<UserDeleteConfirmationState['phase']>('loading'));

    await waitFor(() => expect(result.current.phase).toEqual<UserDeleteConfirmationState['phase']>('waiting-confirmation'));
  });

  it(`When submit deletion`, async () => {    
    const { result } = renderHook(() => useUserDeleteConfirmationState({ 
      phase: 'waiting-confirmation',
      deletingUser: fixtures.users[0],
    }));

    await waitFor(() => expect(result.current.phase).toEqual<UserDeleteConfirmationState['phase']>('waiting-confirmation'));

    act(() => {
      if (result.current.phase === 'waiting-confirmation') {
        result.current.actions.submit();
      }
    });
    await waitFor(() => expect(result.current.phase).toEqual<UserDeleteConfirmationState['phase']>('loading'));

    await waitFor(() => expect(result.current.phase).toEqual<UserDeleteConfirmationState['phase']>('waiting-confirmation'));
  });
});