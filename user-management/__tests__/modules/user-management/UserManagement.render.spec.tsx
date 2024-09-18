import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deepClone } from 'valtio/utils';
import UserService from '@app/services/user';
import { UserManagementProvider, UserManagement } from '@app/modules/user-management/UserManagement';
import originalFixtures from '@test/fixtures';
import utils from '@app/utils';

describe('useUserManagementState', () => {
  let fixtures: Pick<typeof originalFixtures, 'users'>;

  beforeEach(() => {
    fixtures = {
      users: deepClone(originalFixtures.users),
    };

    jest.spyOn(UserService, 'getUsers').mockImplementation(async () => {
      await utils.wait(1000);
      return { data: [...fixtures.users] };
    });

    jest.spyOn(UserService, 'getUser').mockImplementation(async (userId) => {
      const user = fixtures.users.find((user) => user.id === userId);
      if (!user) {
        throw new Error(`getUser: incorrect mockImplementation`);
      }

      await utils.wait(1000);

      return { data: {...user} };
    });

    jest.spyOn(UserService, 'createUser').mockImplementation(async (userInfo) => {
      const newUser = {
        ...userInfo,
        id: Date.now().toString(),
      };
      fixtures.users.push(newUser);

      await utils.wait(1000);
      return { data: newUser.id };
    });

    jest.spyOn(UserService, 'updateUser').mockImplementation(async (userInfo) => {
      fixtures.users = fixtures.users.map((user) => user.id === userInfo.id ? userInfo : user);

      await utils.wait(1000);
      return;
    });

    jest.spyOn(UserService, 'deleteUser').mockImplementation(async (userId) => {
      fixtures.users = fixtures.users.filter((user) => user.id !== userId);

      await utils.wait(1000);
      return;
    });
  })

  afterEach(() => {
    jest.restoreAllMocks();
  })

  it(`When create a new MFA`, async () => {    
    const user = userEvent.setup();
    render(
      <UserManagementProvider initialValue={{ phase: 'ready' }}>
        <UserManagement />
      </UserManagementProvider>
    );

    await waitFor(() => expect(screen.getByTestId('PageLoading')).toHaveTextContent('Loading'));
    await waitFor(() => expect(screen.getByTestId('PageLoading')).not.toHaveTextContent('Loading'));

    await user.click(screen.getByTestId(`CreationButton-mfa`));
    await waitFor(() => user.type(screen.getByTestId(`InputName`), 'New MFA'));
    await user.tab();
    await waitFor(() => user.type(screen.getByTestId(`InputEmail`), 'new-mfa@email.com'));
    await user.tab();
    await user.click(screen.getByTestId(`ButtonSubmit`));
    await waitFor(() => expect(screen.getByTestId('PageLoading')).toHaveTextContent('Loading'));
    await waitFor(() => expect(screen.getByTestId('PageLoading')).not.toHaveTextContent('Loading'));
    await waitFor(() => expect(screen.queryByTestId('UserCreationForm')).toBeNull());
    await waitFor(() => expect(screen.getByTestId('UserList')).toHaveTextContent('New MFA'));
  });

  it(`When update a doctor`, async () => {    
    const user = userEvent.setup();
    const editingUser = { ...fixtures.users[0] };

    render(
      <UserManagementProvider initialValue={{ phase: 'ready' }}>
        <UserManagement />
      </UserManagementProvider>
    );

    await waitFor(() => expect(screen.getByTestId('PageLoading')).toHaveTextContent('Loading'));
    await waitFor(() => expect(screen.getByTestId('PageLoading')).not.toHaveTextContent('Loading'));
    await waitFor(() => expect(screen.getByTestId('UserList')).toBeInTheDocument());

    await user.click(screen.getByTestId(`UserItem-${editingUser.id}`));
    await user.click(screen.getByTestId(`UpdateButton-${editingUser.id}`));
    await waitFor(() => expect(screen.getByTestId('PageLoading')).toHaveTextContent('Loading'));
    await waitFor(() => expect(screen.getByTestId('PageLoading')).not.toHaveTextContent('Loading'));
    await user.clear(screen.getByTestId(`InputName`));
    await waitFor(() => user.type(screen.getByTestId(`InputName`), `${editingUser.name}(Updated)`));
    await user.tab();
    await user.click(screen.getByTestId(`ButtonSubmit`));
    await waitFor(() => expect(screen.getByTestId('PageLoading')).toHaveTextContent('Loading'));
    await waitFor(() => expect(screen.getByTestId('PageLoading')).not.toHaveTextContent('Loading'));
    await waitFor(() => expect(screen.queryByTestId(`UserUpdateForm-${editingUser.id}`)).toBeNull());
    await waitFor(() => expect(screen.getByTestId('UserList')).toHaveTextContent(`${editingUser.name}(Updated)`));
  });

  it(`When delete a doctor`, async () => {    
    const user = userEvent.setup();
    const deletingUser = { ...fixtures.users[0] };

    render(
      <UserManagementProvider initialValue={{ phase: 'ready' }}>
        <UserManagement />
      </UserManagementProvider>
    );

    await waitFor(() => expect(screen.getByTestId('PageLoading')).toHaveTextContent('Loading'));
    await waitFor(() => expect(screen.getByTestId('PageLoading')).not.toHaveTextContent('Loading'));
    await waitFor(() => expect(screen.getByTestId('UserList')).toBeInTheDocument());

    await user.click(screen.getByTestId(`UserItem-${deletingUser.id}`));
    await user.click(screen.getByTestId(`DeleteButton-${deletingUser.id}`));
    await waitFor(() => expect(screen.getByTestId('PageLoading')).toHaveTextContent('Loading'));
    await waitFor(() => expect(screen.getByTestId('PageLoading')).not.toHaveTextContent('Loading'));
    await waitFor(() => expect(screen.getByTestId(`UserDeletionConfirmation-${deletingUser.id}`)).toBeInTheDocument());
    
    await user.click(screen.getByTestId(`ButtonSubmit`));
    await waitFor(() => expect(screen.getByTestId('PageLoading')).toHaveTextContent('Loading'));
    await waitFor(() => expect(screen.getByTestId('PageLoading')).not.toHaveTextContent('Loading'));
    await waitFor(() => expect(screen.queryByTestId(`UserDeletionConfirmation-${deletingUser.id}`)).toBeNull());
    await waitFor(() => expect(screen.getByTestId('UserList')).not.toHaveTextContent(`${deletingUser.name}`));
  });
});