import { renderHook, act, waitFor } from '@testing-library/react';
import type { User } from '@app/services/user';
import type { 
  InitialState,
  InitialFailedState,
  UserListCommonState,
  UserListWithoutSelectedUserState,
  UserListWithSelectedUserState,
  UserCreationCommonState,
  UserCreationInitialedState
} from '@app/modules/UserManagement';
import UserService from '@app/services/user';
import { useUserManagementState } from '@app/modules/UserManagement';


const fixtures: {
  types: Array<User['type']>;
  users: User[];
} = {
  types: ['doctor', 'mfa'],
  users: [{
    id: 'doctor-01',
    name: 'Doctor 01',
    email: 'doctor01@email.com',
    type: 'doctor',
    lanr: 'LANR-01',
  },
  {
    id: 'doctor-02',
    name: 'Doctor 02',
    email: 'doctor02@email.com',
    type: 'doctor',
    lanr: 'LANR-02',
  },
  {
    id: 'mfa-01',
    name: 'MFA 01',
    email: 'mfa01@email.com',
    type: 'mfa',
  }]
};

describe('useUserManagementState', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  })

  it(`From "initialing" to "user-list-without-selected-user"`, async () => {
    jest.spyOn(UserService, 'getUsers').mockImplementation(async () => {
      return { data: [...fixtures.users] };
    });

    const { result } = renderHook(() => useUserManagementState());

    await waitFor(() => expect(result.current).toMatchObject<UserListCommonState & UserListWithoutSelectedUserState>({
      type: 'user-list-without-selected-user',
      users: fixtures.users,
      actions: {
        selectUser: expect.any(Function),
        goToCreation: expect.any(Function)
      }
    }))
  });

  it(`From "initialing" to "initial-failed"`, async () => {
    jest.spyOn(UserService, 'getUsers').mockImplementation(async () => {
      throw new Error();
    });

    const { result } = renderHook(() => useUserManagementState());

    await waitFor(() => expect(result.current).toMatchObject<InitialState & InitialFailedState>({
      type: 'initial-failed',
      error: expect.objectContaining<InitialFailedState['error']>({ message: expect.any(String) }),
      actions: {
        reInitial: expect.any(Function)
      }
    }))
  });

  it(`From "initial-failed" to "user-list-without-selected-user"`, async () => {
    jest.spyOn(UserService, 'getUsers').mockImplementation(async () => {
      return { data: [...fixtures.users] }
    });

    const { result } = renderHook(() => useUserManagementState({
      type: 'initial-failed',
      error: { message: 'Initialize failed' },
    }));

    act(() => {
      if (result.current.type === 'initial-failed') {
        result.current.actions.reInitial();
      }
    });

    await waitFor(() => expect(result.current).toMatchObject<UserListCommonState & UserListWithoutSelectedUserState>({
      type: 'user-list-without-selected-user',
      users: fixtures.users,
      actions: {
        selectUser: expect.any(Function),
        goToCreation: expect.any(Function)
      }
    }))
  });

  it(`From "user-list-without-selected-user" to "user-list-with-selected-user"`, async () => {
    const { result } = renderHook(() => useUserManagementState({
      type: 'user-list-without-selected-user',
      users: [...fixtures.users]
    }));

    act(() => {
      if (result.current.type === 'user-list-without-selected-user') {
        result.current.actions.selectUser(fixtures.users[0].id);
      }
    });

    await waitFor(() => expect(result.current).toMatchObject<UserListCommonState & UserListWithSelectedUserState>({
      type: 'user-list-with-selected-user',
      users: fixtures.users,
      selectedUserId: fixtures.users[0].id,
      actions: {
        selectUser: expect.any(Function),
        goToCreation: expect.any(Function),
        goToUpdate: expect.any(Function),
        goToDelete: expect.any(Function)
      }
    }))
  });

  it(`From "user-list-without-selected-user" to "user-creation-initialed"`, async () => {
    const { result } = renderHook(() => useUserManagementState({
      type: 'user-list-without-selected-user',
      users: [...fixtures.users]
    }));

    act(() => {
      if (result.current.type === 'user-list-without-selected-user') {
        result.current.actions.goToCreation('doctor');
      }
    });

    await waitFor(() => expect(result.current).toMatchObject<UserCreationCommonState & UserCreationInitialedState>({
      type: 'user-creation-initialed',
      users: fixtures.users,
      editingUser: { type: 'doctor', name: '', email: '', lanr: '' },
      actions: {
        setEditingUser: expect.any(Function),
        exitCreation: expect.any(Function),
      }
    }))
  });
});