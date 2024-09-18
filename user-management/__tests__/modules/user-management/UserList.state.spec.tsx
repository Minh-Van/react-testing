import { renderHook, act, waitFor } from '@testing-library/react';
import UserService from '@app/services/user';
import type { 
  UserListState
} from '@app/modules/user-management/UserList';
import { useUserListState } from '@app/modules/user-management/UserList';
import fixtures from '@test/fixtures';
import utils from '@app/utils';

describe('useUserListState', () => {
  beforeEach(() => {
    jest.spyOn(UserService, 'getUsers').mockImplementation(async () => {
      await utils.wait(1000);
      return { data: fixtures.users };
    });
  })

  afterEach(() => {
    jest.restoreAllMocks();
  })

  it(`When load users in initial`, async () => {    
    const { result } = renderHook(() => useUserListState({ phase: 'initial' }));

    await waitFor(() => expect(result.current.phase).toEqual<UserListState['phase']>('initial'));

    act(() => {
      if (result.current.phase === 'initial') {
        result.current.actions.initial();
      }
    });
    await waitFor(() => expect(result.current.phase).toEqual<UserListState['phase']>('loading'));

    await waitFor(() => expect(result.current.phase).toEqual<UserListState['phase']>('without-selected-user'));
  });

  it(`When select a user`, async () => {    
    const { result } = renderHook(() => useUserListState({ 
      phase: 'without-selected-user',
      users: fixtures.users,
    }));

    await waitFor(() => expect(result.current.phase).toEqual<UserListState['phase']>('without-selected-user'));

    act(() => {
      if (result.current.phase === 'without-selected-user') {
        result.current.actions.selectUser(fixtures.users[0].id);
      }
    });
    await waitFor(() => expect(result.current.phase).toEqual<UserListState['phase']>('with-selected-user'));

    act(() => {
      if (result.current.phase === 'with-selected-user') {
        result.current.actions.selectUser(fixtures.users[1].id);
      }
    });
    await waitFor(() => expect(result.current.phase).toEqual<UserListState['phase']>('with-selected-user'));
  });
});