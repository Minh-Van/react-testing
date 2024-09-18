import { mockFn } from 'jest-mock-extended';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { proxy, snapshot } from 'valtio';
import type { User } from '@app/services/user';
import type { 
  UserManagementState,
  UserListWithoutSelectedUserState,
  UserListWithSelectedUserState
} from '@app/modules/UserManagement';
import { UserManagement, UserManagementContext } from '@app/modules/UserManagement';

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

describe('UserManagement', () => {
  it(`UserList in state "user-list-without-selected-user"`, async () => {
    const state: UserManagementState = {
      type: 'user-list-without-selected-user', 
      users: fixtures.users,
      actions: {
        selectUser: mockFn<UserListWithoutSelectedUserState['actions']['selectUser']>(), 
        goToCreation: mockFn<UserListWithoutSelectedUserState['actions']['goToCreation']>(),
      }
    }
    const stateSnapshot = snapshot(proxy<UserManagementState>(state));

    const user = userEvent.setup();

    render(
      <UserManagementContext.Provider value={stateSnapshot}>
        <UserManagement />
      </UserManagementContext.Provider>
    );

    expect(screen.getByTestId('UserList')).toBeInTheDocument();
    
    for (const { id } of state.users) {
      await user.click(screen.getByTestId(`UserItem-${id}`));
      expect(state.actions.selectUser).toHaveBeenLastCalledWith<
        Parameters<UserListWithoutSelectedUserState['actions']['selectUser']>
      >(id); 
    }

    for (const type of fixtures.types) {
      await user.click(screen.getByTestId(`CreationButton-${type}`));
      expect(state.actions.goToCreation).toHaveBeenLastCalledWith<
        Parameters<UserListWithoutSelectedUserState['actions']['goToCreation']>
      >(type); 
    }
  });

  it(`UserList in state "user-list-with-selected-user"`, async () => {
    const state: UserManagementState = {
      type: 'user-list-with-selected-user', 
      users: fixtures.users,
      selectedUserId: fixtures.users[0].id,
      actions: {
        selectUser: mockFn<UserListWithSelectedUserState['actions']['selectUser']>(), 
        goToCreation: mockFn<UserListWithSelectedUserState['actions']['goToCreation']>(),
        goToUpdate: mockFn<UserListWithSelectedUserState['actions']['goToUpdate']>(),
        goToDelete: mockFn<UserListWithSelectedUserState['actions']['goToDelete']>(),
      }
    }
    const stateSnapshot = snapshot(proxy<UserManagementState>(state));

    const user = userEvent.setup();

    render(
      <UserManagementContext.Provider value={stateSnapshot}>
        <UserManagement />
      </UserManagementContext.Provider>
    );

    expect(screen.getByTestId('UserList')).toBeInTheDocument();
    
    await user.click(screen.getByTestId(`UserItem-${state.selectedUserId}`));
    expect(state.actions.selectUser).not.toHaveBeenCalled();

    await user.click(screen.getByTestId(`UpdateButton-${state.selectedUserId}`));
    expect(state.actions.goToUpdate).toHaveBeenCalled(); 

    await user.click(screen.getByTestId(`DeleteButton-${state.selectedUserId}`));
    expect(state.actions.goToDelete).toHaveBeenCalled(); 


    for (const { id } of state.users) {
      if (id === state.selectedUserId) {
        continue;
      }

      await user.click(screen.getByTestId(`UserItem-${id}`));
      expect(state.actions.selectUser).toHaveBeenLastCalledWith<
        Parameters<UserListWithSelectedUserState['actions']['selectUser']>
      >(id); 
    }

    for (const type of fixtures.types) {
      await user.click(screen.getByTestId(`CreationButton-${type}`));
      expect(state.actions.goToCreation).toHaveBeenLastCalledWith<
        Parameters<UserListWithSelectedUserState['actions']['goToCreation']>
      >(type); 
    }
  });
});
