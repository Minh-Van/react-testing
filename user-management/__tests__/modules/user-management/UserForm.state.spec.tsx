import { renderHook, act, waitFor } from '@testing-library/react';
import UserService from '@app/services/user';
import type { 
  UserFormState
} from '@app/modules/user-management/UserForm';
import { useUserFormState } from '@app/modules/user-management/UserForm';
import fixtures from '@test/fixtures';
import utils from '@app/utils';

describe('useUserFormState', () => {
  beforeEach(() => {
    jest.spyOn(UserService, 'getUser').mockImplementation(async (userId) => {
      const user = fixtures.users.find((user) => user.id === userId);
      if (!user) {
        throw new Error(`getUser: incorrect mockImplementation`);
      }

      await utils.wait(1000);

      return { data: user };
    });

    jest.spyOn(UserService, 'createUser').mockImplementation(async () => {
      await utils.wait(1000);
      return { data: Date.now().toString() };
    });

    jest.spyOn(UserService, 'updateUser').mockImplementation(async () => {
      await utils.wait(1000);
      return;
    });
  })

  afterEach(() => {
    jest.restoreAllMocks();
  })

  it(`When load user for update in initial`, async () => {    
    const { result } = renderHook(() => useUserFormState({ phase: 'initial' }));

    await waitFor(() => expect(result.current.phase).toEqual<UserFormState['phase']>('initial'));

    act(() => {
      if (result.current.phase === 'initial') {
        result.current.actions.initial({ 
          mode: 'update',
          userId: fixtures.users[0].id
        });
      }
    });
    await waitFor(() => expect(result.current.phase).toEqual<UserFormState['phase']>('loading'));

    await waitFor(() => expect(result.current.phase).toEqual<UserFormState['phase']>('edit-pristine'));
  });

  it(`When edit user info`, async () => {    
    const { result } = renderHook(() => useUserFormState({ 
      phase: 'edit-pristine',
      editingUser: fixtures.users[0],
    }));

    await waitFor(() => expect(result.current.phase).toEqual<UserFormState['phase']>('edit-pristine'));

    act(() => {
      if (result.current.phase === 'edit-pristine') {
        result.current.actions.setEditingUser({
          ...fixtures.users[0],
          email: '',
        });
      }
    });
    await waitFor(() => expect(result.current.phase).toEqual<UserFormState['phase']>('edit-invalid'));

    act(() => {
      if (result.current.phase === 'edit-invalid') {
        result.current.actions.setEditingUser({
          ...fixtures.users[0],
          email: fixtures.users[0].email,
        });
      }
    });
    await waitFor(() => expect(result.current.phase).toEqual<UserFormState['phase']>('edit-valid'));
  });

  it(`When submit user info`, async () => {    
    const { result } = renderHook(() => useUserFormState({ 
      phase: 'edit-valid',
      editingUser: fixtures.users[0],
    }));

    await waitFor(() => expect(result.current.phase).toEqual<UserFormState['phase']>('edit-valid'));

    act(() => {
      if (result.current.phase === 'edit-valid') {
        result.current.actions.submit();
      }
    });
    await waitFor(() => expect(result.current.phase).toEqual<UserFormState['phase']>('loading'));

    await waitFor(() => expect(result.current.phase).toEqual<UserFormState['phase']>('edit-valid'));
  });
});