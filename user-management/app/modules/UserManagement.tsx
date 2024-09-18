"use client"
import { createContext, useState, FC, useRef, useEffect, useContext, ReactNode } from 'react';
import type { Snapshot } from 'valtio';
import { proxy, useSnapshot } from 'valtio';
import type { User, Doctor, MFA } from '@app/services/user';
import UserService from '@app/services/user'

//#region typing
type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

type UserManagementState = InitialState | UserListState | UserCreationState | UserUpdateState | UserDeletionState;

type InitialState = InitialingState | InitialFailedState;
type InitialingState = {
  type: 'initialing';
};
type InitialFailedState = { 
  type: 'initial-failed',
  error: { message: string }; 
  actions: {
    reInitial: () => Promise<void>;
  }
};

type UserListState = UserListCommonState & (UserListWithoutSelectedUserState 
  | UserListWithSelectedUserState 
  | UserListRefreshUsersState
  | UserListRefetchUserFailedWithoutSelectedUserState
  | UserListRefetchUserFailedWithSelectedUserState 
  | UserListFetchingSelectedUserState 
  | UserListFetchSelectedUserFailedState);
type UserListCommonState = {
  users: Array<Pick<User, 'id' | 'name' | 'type'>>;
};
type UserListWithoutSelectedUserState = {
  type: 'user-list-without-selected-user';
  actions: {
    selectUser: (userId: string) => Promise<void>;
    goToCreation: (type: User['type']) => Promise<void>;
  }
};
type UserListWithSelectedUserState = StrictOmit<UserListWithoutSelectedUserState, 'type'> & {
  type: 'user-list-with-selected-user';
  selectedUserId: string;
  actions: {
    goToUpdate: () => Promise<void>;
    goToDelete: () => Promise<void>;
  }
};
type UserListRefreshUsersState = {
  type: 'user-list-refreshing-users';
  selectedUserId?: UserListWithSelectedUserState['selectedUserId'];
};
type UserListRefetchUserFailedWithoutSelectedUserState = StrictOmit<UserListWithoutSelectedUserState, 'type'> & {
  type: 'user-list-refetch-users-failed-without-selected-user';
  error: { message: string };
};
type UserListRefetchUserFailedWithSelectedUserState = StrictOmit<UserListWithSelectedUserState, 'type'> & {
  type: 'user-list-refetch-users-failed-with-selected-user';
  error: { message: string };
};
type UserListFetchingSelectedUserState = {
  type: 'user-list-fetching-selected-user';
  selectedUserId: UserListWithSelectedUserState['selectedUserId'];
};
type UserListFetchSelectedUserFailedState = StrictOmit<UserListWithSelectedUserState, 'type'> & {
  type: 'user-list-fetch-selected-user-failed';
  error: { message: string };
};


type UserCreationState = UserCreationCommonState & (UserCreationInitialedState | UserCreationValidState | UserCreationInvalidState | UserCreationSubmittingState | UserCreationSubmitFailedState | UserCreationSubmitSucceedState);
type UserCreationCommonState = { 
  users: UserListState['users'],
  selectedUserId?: UserListWithSelectedUserState['selectedUserId'],
  editingUser: Pick<User, 'name' | 'email'> & (Pick<Doctor, 'type' | 'lanr'> | Pick<MFA, 'type'>);
};
type UserCreationInitialedState = {
  type: 'user-creation-initialed';
  actions: {
    setEditingUser: (param: UserCreationState['editingUser']) => Promise<void>;
    exitCreation: () => Promise<void>;
  }
};
type UserCreationValidState = StrictOmit<UserCreationInitialedState, 'type'> & {
  type: 'user-creation-valid';
  actions: {
    submitCreation: () => Promise<void>;
  }
};
type UserCreationInvalidState = StrictOmit<UserCreationInitialedState, 'type'> & {
  type: 'user-creation-invalid';
  errors: Partial<Record<keyof Pick<User & Doctor, 'name' | 'email' | 'lanr' | 'type'>, string>>;
}
type UserCreationSubmittingState = {
  type: 'user-creation-submitting';
};
type UserCreationSubmitFailedState = StrictOmit<UserCreationValidState, 'type'> & {
  type: 'user-creation-submit-failed';
  error: { message: string };
};
type UserCreationSubmitSucceedState = {
  type: 'user-creation-submit-succeed';
  actions: {
    exitCreation: () => Promise<void>;
  }
};


type UserUpdateState = UserUpdateCommonState & (UserUpdateInitialedState | UserUpdateValidState | UserUpdateInvalidState | UserUpdateSubmittingState | UserUpdateSubmitFailedState | UserUpdateSubmitSucceedState);
type UserUpdateCommonState = Pick<UserListCommonState & UserListWithSelectedUserState, 'users' | 'selectedUserId'> 
& { 
  editingUser: Pick<User, 'id' | 'name' | 'email'> & (Pick<Doctor, 'type' | 'lanr'> | Pick<MFA, 'type'>) 
};
type UserUpdateInitialedState = {
  type: 'user-update-initialed';
  actions: {
    setEditingUser: (param: UserUpdateState['editingUser']) => Promise<void>;
    exitUpdate: () => Promise<void>;
  }
};
type UserUpdateValidState = StrictOmit<UserUpdateInitialedState, 'type'> & {
  type: 'user-update-valid';
  actions: {
    submitUpdate: () => Promise<void>;
  }
};
type UserUpdateInvalidState = StrictOmit<UserUpdateInitialedState, 'type'> & {
  type: 'user-update-invalid';
  errors: Partial<Record<keyof Pick<User & Doctor, 'name' | 'email' | 'lanr' | 'type'>, string>>;
}
type UserUpdateSubmittingState = {
  type: 'user-update-submitting';
};
type UserUpdateSubmitFailedState = StrictOmit<UserUpdateValidState, 'type'> & {
  type: 'user-update-submit-failed';
  error: { message: string };
};
type UserUpdateSubmitSucceedState = StrictOmit<UserUpdateValidState, 'type'> & {
  type: 'user-update-submit-succeed';
};


type UserDeletionState = UserDeletionCommonState & (UserDeletionConfirmationState | UserDeletionSubmittingState | UserDeletionSubmitFailedState | UserDeletionSubmitSucceedState);
type UserDeletionCommonState = Pick<UserListCommonState & UserListWithSelectedUserState, 'users' | 'selectedUserId'>;
type UserDeletionConfirmationState = {
  type: 'user-deletion-confirmation';
  actions: {
    confirmDeletion: () => Promise<void>;
    exitDeletion: () => Promise<void>;
  }
};
type UserDeletionSubmittingState = {
  type: 'user-deletion-submitting';
};
type UserDeletionSubmitFailedState = StrictOmit<UserDeletionConfirmationState, 'type'> & {
  type: 'user-deletion-submit-failed';
  error: { message: string };
};
type UserDeletionSubmitSucceedState = {
  type: 'user-deletion-submit-succeed';
  actions: {
    exitDeletion: () => Promise<void>;
  }
};
//#endregion


//#region context

const useUserManagementState = (initialValue?: 
  (InitialingState | StrictOmit<InitialFailedState, 'actions'>)
  | (UserListCommonState 
      & (StrictOmit<UserListWithoutSelectedUserState, 'actions'>
      | StrictOmit<UserListWithSelectedUserState , 'actions'>
      | UserListRefreshUsersState
      | StrictOmit<UserListRefetchUserFailedWithoutSelectedUserState, 'actions'>
      | StrictOmit<UserListRefetchUserFailedWithSelectedUserState , 'actions'>
      | UserListFetchingSelectedUserState
      | StrictOmit<UserListFetchSelectedUserFailedState, 'actions'>
      )
    )
  | (UserCreationCommonState
      & (StrictOmit<UserCreationInitialedState, 'actions'>
      | StrictOmit<UserCreationValidState , 'actions'>
      | StrictOmit<UserCreationInvalidState , 'actions'>
      | UserCreationSubmittingState
      | StrictOmit<UserCreationSubmitFailedState , 'actions'>
      | StrictOmit<UserCreationSubmitSucceedState, 'actions'>
      )
    )
  | (UserUpdateCommonState
      & (StrictOmit<UserUpdateInitialedState, 'actions'>
      | StrictOmit<UserUpdateValidState , 'actions'>
      | StrictOmit<UserUpdateInvalidState , 'actions'>
      | UserUpdateSubmittingState
      | StrictOmit<UserUpdateSubmitFailedState , 'actions'>
      | StrictOmit<UserUpdateSubmitSucceedState, 'actions'>
      )
    )
  | (UserDeletionCommonState
      & (StrictOmit<UserDeletionConfirmationState, 'actions'>
      | UserDeletionSubmittingState
      | StrictOmit<UserDeletionSubmitFailedState , 'actions'>
      | StrictOmit<UserDeletionSubmitSucceedState, 'actions'>
      )
    )
) => {
  //#region Initial
  const initial = async () => { 
    try {
      const { data } = await UserService.getUsers();
      setState({
        type: 'user-list-without-selected-user',
        users: data,
        actions: {
          selectUser,
          goToCreation,
        }
      })
    } catch (error) {
      setState({
        type: 'initial-failed',
        error: { message: 'Initialize failed' },
        actions: {
          reInitial: initial,
        }
      });
    }
   };
  //#endregion


  //#region User List
  const refreshUsers = async () => {
    switch (stateProxy.data.type) {
      case 'user-creation-submit-succeed':
      case 'user-update-submit-succeed':
      case 'user-deletion-submit-succeed': {
        const { users, selectedUserId } = stateProxy.data;
        
        setState({
          type: 'user-list-refreshing-users', 
          users,
          selectedUserId,
        });

        try {
          const { data } = await UserService.getUsers();  

          if (selectedUserId) {
            setState({
              type: 'user-list-with-selected-user', 
              users: data,
              selectedUserId,
              actions: {
                selectUser,
                goToCreation,
                goToUpdate,
                goToDelete,
              }
            });
          } else {
            setState({
              type: 'user-list-without-selected-user', 
              users: data,
              actions: {
                selectUser,
                goToCreation,
              }
            });
          }
        } catch (error) {
          if (selectedUserId) {
            setState({
              type: 'user-list-refetch-users-failed-with-selected-user', 
              users,
              selectedUserId,
              error: { message: 'Refesh user list failed' },
              actions: {
                selectUser,
                goToCreation,
                goToUpdate,
                goToDelete,
              }
            });
          } else {
            setState({
              type: 'user-list-refetch-users-failed-without-selected-user', 
              users,
              error: { message: 'Refesh user list failed' },
              actions: {
                selectUser,
                goToCreation,
              }
            });
          }
        }
        break;
      }
      default:
        throw new Error(`[refreshUsers]Not support transition from state "${stateProxy.data.type}"`);
    }
  };

  const selectUser = async (userId: string) => { 
    switch(stateProxy.data.type) {
      case 'user-list-refetch-users-failed-without-selected-user':
      case 'user-list-without-selected-user':
      case 'user-list-refetch-users-failed-with-selected-user':
      case 'user-list-with-selected-user':
        const { users } = stateProxy.data;
        setState({ 
          type: 'user-list-with-selected-user',   
          users,
          selectedUserId: userId,
          actions: {
            selectUser,
            goToCreation,
            goToUpdate,
            goToDelete,
          }
        });
        break;
      default:
        throw new Error(`[selectUser]Not support transition from state "${stateProxy.data.type}"`);
    }
  };
  //#endregion


  //#region User Creation
  const goToCreation = async (type: User['type']) => {
    switch(stateProxy.data.type) {
      case 'user-list-refetch-users-failed-without-selected-user':
      case 'user-list-refetch-users-failed-with-selected-user':
      case 'user-list-without-selected-user':
      case 'user-list-with-selected-user': {
        const { users } = stateProxy.data;
        const selectedUserId = (stateProxy.data.type === 'user-list-with-selected-user' || stateProxy.data.type === 'user-list-refetch-users-failed-with-selected-user') 
          ? stateProxy.data.selectedUserId 
          : undefined;

        setState({
          type: 'user-creation-initialed',
          users,
          selectedUserId,
          editingUser: type === 'doctor' ? { name: '', email: '', lanr: '', type } : { name: '', email: '', type },
          actions: {
            setEditingUser: setEditingUserForCreation,
            exitCreation,
          }
        });
        break;
      }
      default:
        throw new Error(`[goToCreation]Not support transition from state "${stateProxy.data.type}"`);
    }
  };

  const setEditingUserForCreation = async (param: UserCreationState['editingUser']) => {
    switch(stateProxy.data.type) {
      case 'user-creation-initialed':
      case 'user-creation-valid':
      case 'user-creation-invalid':
      case 'user-creation-submit-failed': {
        const { name, email, type } = param;
        
        let errors: UserCreationInvalidState['errors'] = {};

        if (!name.trim().length) {
          errors = { ...errors, name: 'Invalid name' };
        }
        if (!email.trim().includes('@')) {
          errors = { ...errors, email: 'Invalid email' };
        }
        if (type === 'doctor' && !param.lanr.trim().length) {
          errors = { ...errors, lanr: 'Invalid lanr' };
        }
        
        if (Object.keys(errors).length) {
          const { users, selectedUserId } = stateProxy.data;
          setState({
            type: 'user-creation-invalid',
            errors,
            users, 
            selectedUserId, 
            editingUser: { ...param },
            actions: {
              setEditingUser: setEditingUserForCreation, 
              exitCreation
            }
          });
        } else {
          const { users, selectedUserId } = stateProxy.data;
          setState({
            type: 'user-creation-valid',
            users, 
            selectedUserId,
            editingUser: { ...param },
            actions: {
              setEditingUser: setEditingUserForCreation, 
              exitCreation,
              submitCreation,
            }
          });
        }

        break;
      }
      default:
        throw new Error(`[setEditingUserForCreation]Not support transition from state "${stateProxy.data.type}"`);
    }
  };

  const submitCreation = async () => {
    if (stateProxy.data.type !== 'user-creation-valid') {
      throw new Error(`[submitCreation]Not support transition from state "${stateProxy.data.type}"`);
    }
    
    const { users, selectedUserId, editingUser } = stateProxy.data;
    setState({
      type: 'user-creation-submitting',
      users, 
      selectedUserId,
      editingUser,
    });

    try {
      const { users, selectedUserId, editingUser } = stateProxy.data;

      await UserService.createUser(editingUser);

      setState({
        type: 'user-creation-submit-succeed',
        users, 
        selectedUserId, 
        editingUser, 
        actions: {
          exitCreation,
        }
      });
    } catch (error) {
      const { users, selectedUserId, editingUser } = stateProxy.data;
      setState({
        type: 'user-creation-submit-failed',
        error: { message: 'Create user failed' },
        users, 
        selectedUserId, 
        editingUser, 
        actions: {
          setEditingUser: setEditingUserForCreation,
          exitCreation,
          submitCreation
        }
      });
    }
  };

  const exitCreation = async () => {
    switch(stateProxy.data.type) {
      case 'user-creation-initialed':
      case 'user-creation-valid':
      case 'user-creation-invalid':
      case 'user-creation-submit-failed': {
        const { users, selectedUserId } = stateProxy.data;
        if (selectedUserId) {
          setState({
            type: 'user-list-with-selected-user',
            users,
            selectedUserId,
            actions: {
              selectUser,
              goToCreation,
              goToUpdate,
              goToDelete,
            }
          });
        } else {
          setState({
            type: 'user-list-without-selected-user',
            users,
            actions: {
              selectUser,
              goToCreation,
            }
          });
        }
        break;
      }
      case 'user-creation-submit-succeed': {
        await refreshUsers();
        break;;
      }
      default:
        throw new Error(`[exitCreation]Not support transition from state "${stateProxy.data.type}"`);
    }
  };
  //#endregion


  //#region User Update
  const goToUpdate = async () => {
    if(stateProxy.data.type != 'user-list-with-selected-user' 
      && stateProxy.data.type != 'user-list-refetch-users-failed-with-selected-user'
    ) {
      throw new Error(`[goToUpdate]Not support transition from state "${stateProxy.data.type}"`);
    }

    const { users, selectedUserId } = stateProxy.data;
    setState({
      type: 'user-list-fetching-selected-user',
      users,
      selectedUserId,
    });

    try {
      const { data } = await UserService.getUser(selectedUserId);
      setState({
        type: 'user-update-initialed',
        users,
        selectedUserId,
        editingUser: data,
        actions: {
          setEditingUser: setEditingUserForUpdate,
          exitUpdate,
        }
      });
    } catch (error) {
      setState({
        type: 'user-list-fetch-selected-user-failed',
        error: { message: 'Get user failed' },
        users,
        selectedUserId,
        actions: {
          selectUser,
          goToCreation,
          goToUpdate,
          goToDelete,
        }
      });
    }
  };

  const setEditingUserForUpdate = async (param: UserUpdateState['editingUser']) => {
    switch(stateProxy.data.type) {
      case 'user-update-initialed':
      case 'user-update-valid':
      case 'user-update-invalid':
      case 'user-update-submit-failed': {
        const { name, email, type } = param;
        let errors: UserUpdateInvalidState['errors'] = {};

        if (!name.trim().length) {
          errors = { ...errors, name: 'Invalid name' };
        }
        if (!email.trim().includes('@')) {
          errors = { ...errors, email: 'Invalid email' };
        }
        if (type === 'doctor' && !param.lanr.trim().length) {
          errors = { ...errors, lanr: 'Invalid lanr' };
        }
  
        if (Object.keys(errors).length) {
          const { users, selectedUserId } = stateProxy.data;
          setState({
            type: 'user-update-invalid',
            errors,
            users, 
            selectedUserId, 
            editingUser: { ...param },
            actions: {
              setEditingUser: setEditingUserForUpdate, 
              exitUpdate
            }
          });
        } else {
          const { users, selectedUserId } = stateProxy.data;
          setState({
            type: 'user-update-valid',
            users, 
            selectedUserId,
            editingUser: { ...param },
            actions: {
              setEditingUser: setEditingUserForUpdate, 
              exitUpdate, 
              submitUpdate,
            }
          });
        }
        break;
      }
      default:
        throw new Error(`[setEditingUserForUpdate]Not support transition from state "${stateProxy.data.type}"`);
    }
  };

  const submitUpdate = async () => {
    if (stateProxy.data.type !== 'user-update-valid') {
      throw new Error(`[submitUpdate]Not support transition from state "${stateProxy.data.type}"`);
    }
    
    const { users, selectedUserId, editingUser } = stateProxy.data;
    setState({
      type: 'user-update-submitting',
      users, 
      selectedUserId,
      editingUser,
    });

    try {
      const { users, selectedUserId, editingUser } = stateProxy.data;

      await UserService.updateUser(editingUser)

      setState({
        type: 'user-update-submit-succeed',
        users, 
        selectedUserId, 
        editingUser, 
        actions: {
          setEditingUser: setEditingUserForUpdate,
          submitUpdate,
          exitUpdate,
        }
      });
    } catch (error) {
      const { users, selectedUserId, editingUser } = stateProxy.data;
      setState({
        type: 'user-update-submit-failed',
        error: { message: 'Create user failed' },
        users, 
        selectedUserId, 
        editingUser, 
        actions: {
          setEditingUser: setEditingUserForUpdate,
          exitUpdate,
          submitUpdate
        }
      });
    }
  };

  const exitUpdate = async () => {
    switch(stateProxy.data.type) {
      case 'user-update-initialed':
      case 'user-update-valid':
      case 'user-update-invalid':
      case 'user-update-submit-failed': {
        const { users, selectedUserId } = stateProxy.data;
        const newState: UserListState & UserListWithSelectedUserState = {
          type: 'user-list-with-selected-user',
          users,
          selectedUserId,
          actions: {
            selectUser,
            goToCreation,
            goToUpdate,
            goToDelete,
          }
        };
        setState(newState);
        break;
      }
      case 'user-update-submit-succeed': {
        await refreshUsers();
        break;
      }
      default:
        throw new Error(`[exitUpdate]Not support transition from state "${stateProxy.data.type}"`);
    }
  };
  //#endregion


  //#region User Deletion
  const goToDelete = async () => {
    if(stateProxy.data.type != 'user-list-with-selected-user' 
      && stateProxy.data.type != 'user-list-refetch-users-failed-with-selected-user'
    ) {
      throw new Error(`[goToDelete]Not support transition from state "${stateProxy.data.type}"`);
    }

    const { users, selectedUserId } = stateProxy.data;
    setState({
      type: 'user-deletion-confirmation',
      users,
      selectedUserId,
      actions: {
        confirmDeletion,
        exitDeletion,
      }
    });
  };

  const confirmDeletion = async () => {
    if (stateProxy.data.type !== 'user-deletion-confirmation' 
      && stateProxy.data.type !== 'user-deletion-submit-failed'
    ) {
      throw new Error(`[confirmDeletion]Not support transition from state "${stateProxy.data.type}"`);
    }
    
    const { users, selectedUserId } = stateProxy.data;
    setState({
      type: 'user-deletion-submitting',
      users, 
      selectedUserId,
    });

    try {
      const { users, selectedUserId } = stateProxy.data;

      await UserService.deleteUser(selectedUserId)

      setState({
        type: 'user-deletion-submit-succeed',
        users, 
        selectedUserId,
        actions: {
          exitDeletion,
        }
      });
    } catch (error) {
      const { users, selectedUserId } = stateProxy.data;
      setState({
        type: 'user-deletion-submit-failed',
        error: { message: 'Delete user failed' },
        users, 
        selectedUserId,
        actions: {
          confirmDeletion,
          exitDeletion,
        }
      });
    }
  };

  const exitDeletion = async () => {
    switch(stateProxy.data.type) {
      case 'user-deletion-confirmation':
      case 'user-deletion-submit-failed': {
        const { users, selectedUserId } = stateProxy.data;
        setState({
          type: 'user-list-with-selected-user',
          users,
          selectedUserId,
          actions: {
            selectUser,
            goToCreation,
            goToUpdate,
            goToDelete,
          }
        });
        break;
      }
      case 'user-deletion-submit-succeed': {
        await refreshUsers();
        break;
      }
      default:
        throw new Error(`[exitDeletion]Not support transition from state "${stateProxy.data.type}"`);
    }
  };
  //#endregion

  const setState = (newState: UserManagementState) => {
    if (stateProxy.data.type === newState.type) {
      console.log(`[update]${stateProxy.data.type}`);
    } else {
      console.log(`[current]${stateProxy.data.type} --> [new]${newState.type}`);
    }
    stateProxy.data = { ...newState };
  };

  const buildInitialState = (initialValue: NonNullable<Parameters<typeof useUserManagementState>[0]>): UserManagementState => {
    const { type } = initialValue;

    switch (type) {
      //#region  Initial
      case 'initialing':
        return { ...initialValue };
      case 'initial-failed':
          return { 
            ...initialValue,
            actions: {
              reInitial: initial
            }
          };
      //#endregion

      //#region User List
      case 'user-list-without-selected-user':
      case 'user-list-refetch-users-failed-without-selected-user':
        return {
          ...initialValue,
          actions: {
            selectUser,
            goToCreation,
          }
        };
      case 'user-list-with-selected-user':
      case 'user-list-fetch-selected-user-failed':
      case 'user-list-refetch-users-failed-with-selected-user':
        return {
          ...initialValue,
          actions: {
            selectUser,
            goToCreation,
            goToDelete,
            goToUpdate,
          }
        };
      case 'user-list-fetching-selected-user':
      case 'user-list-refreshing-users':
        return {
          ...initialValue,
        };
      //#endregion

      //#region User Creation
      case 'user-creation-initialed':
      case 'user-creation-invalid':
        return { 
          ...initialValue,
          actions: {
            setEditingUser: setEditingUserForCreation,
            exitCreation,
          },
        };
      case 'user-creation-valid':
      case 'user-creation-submit-failed':
        return { 
          ...initialValue,
          actions: {
            setEditingUser: setEditingUserForCreation,
            submitCreation,
            exitCreation,
          },
        };
      case 'user-creation-submitting':
        return {  ...initialValue };
      case 'user-creation-submit-succeed':
        return { 
          ...initialValue,
          actions: {
            exitCreation,
          },
        };
      //#endregion

      //#region User Update
      case 'user-update-initialed':
      case 'user-update-invalid':
        return { 
          ...initialValue,
          actions: {
            setEditingUser: setEditingUserForUpdate,
            exitUpdate,
          },
        };
      case 'user-update-valid':
      case 'user-update-submit-failed':
      case 'user-update-submit-succeed':
        return { 
          ...initialValue,
          actions: {
            setEditingUser: setEditingUserForUpdate,
            submitUpdate,
            exitUpdate,
          },
        };
      case 'user-update-submitting':
        return {  ...initialValue };
      //#endregion
      
      //#region User Deletion
      case 'user-deletion-confirmation':
      case 'user-deletion-submit-failed':
        return { 
          ...initialValue,
          actions: {
            confirmDeletion,
            exitDeletion,
          },
        };
      case 'user-deletion-submitting':
          return {  ...initialValue };
      case 'user-deletion-submit-succeed':
        return { 
          ...initialValue,
          actions: {
            exitDeletion,
          },
        };
      //#endregion
      default:
        throw new Error(`Not support "${type}"`)
    }
  }

  const stateProxy = useRef(proxy<{ data: UserManagementState }>({ 
    data: buildInitialState(initialValue || { type: 'initialing' }) 
  })).current;
  const stateSnapshot = useSnapshot(stateProxy);

  useEffect(() => {
    if (stateProxy.data.type === 'initialing') {
      initial();
    }
  }, []);

  return stateSnapshot.data;
};

const UserManagementContext = createContext<Snapshot<UserManagementState>>({ type: 'initialing' });

const UserManagementProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const state = useUserManagementState();

  return <UserManagementContext.Provider value={state}>
    {children}
  </UserManagementContext.Provider>;
}
//#endregion


//#region component
const UserManagement: FC = () => {
  const context = useContext(UserManagementContext);

  const errorTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [error, setError] = useState<{ message: string }>();

  const successTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [success, setSuccess] = useState<{ message: string }>();

  useEffect(() => {
    switch(context.type) {
      case 'initial-failed':
      case 'user-list-refetch-users-failed-with-selected-user':
      case 'user-list-refetch-users-failed-without-selected-user':
      case 'user-list-fetch-selected-user-failed':
      case 'user-creation-submit-failed':
      case 'user-update-submit-failed':
      case 'user-deletion-submit-failed':
        clearTimeout(errorTimeout.current);
        setError(context.error);
        errorTimeout.current = setTimeout(() => { setError(undefined) }, 2 * 1000);
        break;
    }
  }, [context.type]);

  useEffect(() => {
    const setSuccessTimeout = (message: string) => {
      clearTimeout(successTimeout.current);
      setSuccess({ message });
      successTimeout.current = setTimeout(() => { setSuccess(undefined) }, 2 * 1000);
    };

    switch(context.type) {
      case 'user-creation-submit-succeed':
        context.actions.exitCreation();
        setSuccessTimeout('User created');
        break;
      case 'user-update-submit-succeed':
        context.actions.exitUpdate();
        setSuccessTimeout('User updated');
        break;
      case 'user-deletion-submit-succeed':
        context.actions.exitDeletion();
        setSuccessTimeout('User deleted');
        break;
    }
  }, [context.type]);

  const renderCreationButton = (type: User['type']) => {
    if (context.type === 'user-list-fetch-selected-user-failed'
      || context.type === 'user-list-with-selected-user' 
      || context.type === 'user-list-refetch-users-failed-with-selected-user'
      || context.type === 'user-list-without-selected-user' 
      || context.type === 'user-list-refetch-users-failed-without-selected-user') {
        return <button type="button" 
        data-testid={`CreationButton-${type}`} 
        onClick={(e) => { e.preventDefault(); context.actions.goToCreation(type) }}
        >
          Create {type}
        </button>;
      }

      return <button type="button" 
        data-testid={`CreationButton-${type}`} 
        disabled
      >
        Create {type}
      </button>;
  };

  const renderUserList = () => {
    if (context.type === 'initialing' || context.type === 'initial-failed') {
      return null;
    }

    return <div data-testid="UserList">
    {context.users.map((user) => {
      if (context.type === 'user-list-without-selected-user' 
        || context.type === 'user-list-refetch-users-failed-without-selected-user'
      ) {
        return <div 
          key={user.id} 
          data-testid={`UserItem-${user.id}`} 
          onClick={() => context.actions.selectUser(user.id)}
        >
          {user.type} - {user.name}
        </div>
      } 
      else if (context.type === 'user-list-with-selected-user' 
        || context.type === 'user-list-refetch-users-failed-with-selected-user'
      ) {
        const isSelected = context.selectedUserId === user.id;

        return <div 
          key={user.id} 
          data-testid={`UserItem-${user.id}`} 
          data-selected={isSelected ? 'selected' : ''}
          onClick={isSelected ? undefined : () => context.actions.selectUser(user.id)}
        >
          {user.type} - {user.name}
          {isSelected && <button type="button" data-testid={`UpdateButton-${user.id}`} onClick={(e) => { e.preventDefault(); context.actions.goToUpdate(); }}>Update</button>}
          {isSelected && <button type="button" data-testid={`DeleteButton-${user.id}`} onClick={(e) => { e.preventDefault(); context.actions.goToDelete(); }}>Delete</button>}
        </div>
      }
      else {
        const isSelected = context.selectedUserId === user.id;

        return <div 
          key={user.id} 
          data-testid={`UserItem-${user.id}`} 
          data-selected={isSelected ? 'selected' : ''}
        >
          {user.type} - {user.name}
          {isSelected && <button type="button" data-testid={`UpdateButton-${user.id}`} disabled>Update</button>}
          {isSelected && <button type="button" data-testid={`DeleteButton-${user.id}`} disabled>Delete</button>}
        </div>
      }
    })}
    </div>
  };

  const renderCreationForm = () => {
    if (context.type === 'user-creation-initialed') {
      return <div data-testid="UserCreationForm">
        <input 
          type="text" 
          data-testid="InputName" 
          defaultValue={context.editingUser.name} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, name: e.target.value })} 
        />
        <input 
          type="text" 
          data-testid="InputEmail" 
          defaultValue={context.editingUser.email} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, email: e.target.value })} 
        />
        {context.editingUser.type === 'doctor' && <input 
          type="text" 
          data-testid="InputLanr" 
          defaultValue={context.editingUser.lanr} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, lanr: e.target.value }  as User & Doctor)} 
        />}

        <button type="button" onClick={() => context.actions.exitCreation()}>Close</button>
        
        <button type="button" disabled>Submit</button>
      </div>;
    }
    else if (context.type === 'user-creation-invalid') {
      return <div data-testid="UserCreationForm">
        <input 
          type="text" 
          data-testid="InputName" 
          style={context.errors?.name ? { borderColor: 'red' } : undefined}
          defaultValue={context.editingUser.name} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, name: e.target.value })} 
        />
        <input 
          type="text" 
          data-testid="InputEmail" 
          style={context.errors?.email ? { borderColor: 'red' } : undefined}
          defaultValue={context.editingUser.email} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, email: e.target.value })} 
        />
        {context.editingUser.type === 'doctor' && <input 
          type="text" 
          data-testid="InputLanr" 
          style={context.errors?.lanr ? { borderColor: 'red' } : undefined}
          defaultValue={context.editingUser.lanr} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, lanr: e.target.value } as User & Doctor)} 
        />}

        <button type="button" onClick={() => context.actions.exitCreation()}>Close</button>
        
        <button type="button" disabled>Submit</button>
      </div>
    }
    else if (context.type === 'user-creation-valid' || context.type === 'user-creation-submit-failed') {
      return <div data-testid="UserCreationForm">
        <input 
          type="text" 
          data-testid="InputName" 
          defaultValue={context.editingUser.name} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, name: e.target.value })} 
        />
        <input 
          type="text" 
          data-testid="InputEmail" 
          defaultValue={context.editingUser.email} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, email: e.target.value })} 
        />
        {context.editingUser.type === 'doctor' && <input 
          type="text" 
          data-testid="InputLanr" 
          defaultValue={context.editingUser.lanr} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, lanr: e.target.value } as User & Doctor)} 
        />}

        <button type="button" onClick={() => context.actions.exitCreation()}>Close</button>
        
        <button type="button" onClick={() => context.actions.submitCreation()}>Submit</button>
      </div>
    }
    else if (context.type === 'user-creation-submitting') {
      return <div data-testid="UserCreationForm">
        <input 
          type="text" 
          data-testid="InputName" 
          defaultValue={context.editingUser.name} 
          disabled
        />
        <input 
          type="text" 
          data-testid="InputEmail" 
          defaultValue={context.editingUser.email} 
          disabled
        />
        {context.editingUser.type === 'doctor' && <input 
          type="text" 
          data-testid="InputLanr" 
          defaultValue={context.editingUser.lanr} 
          disabled
        />}

        <button type="button" disabled>Close</button>
        
        <button type="button" disabled>Submit</button>
      </div>
    }
    else if (context.type === 'user-creation-submit-succeed') {
      return <div data-testid="UserCreationForm">
        <input 
          type="text" 
          data-testid="InputName" 
          defaultValue={context.editingUser.name} 
          disabled
        />
        <input 
          type="text" 
          data-testid="InputEmail" 
          defaultValue={context.editingUser.email} 
          disabled
        />
        {context.editingUser.type === 'doctor' && <input 
          type="text" 
          data-testid="InputLanr" 
          defaultValue={context.editingUser.lanr} 
          disabled
        />}

        <button type="button" onClick={() => context.actions.exitCreation()}>Close</button>
        
        <button type="button" disabled>Submit</button>
      </div>
    }

    return null;
  };

  const renderUpdateForm = () => {
    if (context.type === 'user-update-initialed') {
      return <div data-testid={`UserUpdateForm-${context.selectedUserId}`}>
        <input 
          type="text" 
          data-testid="InputName" 
          defaultValue={context.editingUser.name} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, name: e.target.value })} 
        />
        <input 
          type="text" 
          data-testid="InputEmail" 
          defaultValue={context.editingUser.email} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, email: e.target.value })} 
        />
        {context.editingUser.type === 'doctor' && <input 
          type="text" 
          data-testid="InputLanr" 
          defaultValue={context.editingUser.lanr} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, lanr: e.target.value }  as User & Doctor)} 
        />}

        <button type="button" onClick={() => context.actions.exitUpdate()}>Close</button>
        
        <button type="button" disabled>Submit</button>
      </div>;
    }
    else if (context.type === 'user-update-invalid') {
      return <div data-testid={`UserUpdateForm-${context.selectedUserId}`}>
        <input 
          type="text" 
          data-testid="InputName" 
          style={context.errors?.name ? { borderColor: 'red' } : undefined}
          defaultValue={context.editingUser.name} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, name: e.target.value })} 
        />
        <input 
          type="text" 
          data-testid="InputEmail" 
          style={context.errors?.email ? { borderColor: 'red' } : undefined}
          defaultValue={context.editingUser.email} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, email: e.target.value })} 
        />
        {context.editingUser.type === 'doctor' && <input 
          type="text" 
          data-testid="InputLanr" 
          style={context.errors?.lanr ? { borderColor: 'red' } : undefined}
          defaultValue={context.editingUser.lanr} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, lanr: e.target.value } as User & Doctor)} 
        />}

        <button type="button" onClick={() => context.actions.exitUpdate()}>Close</button>
        
        <button type="button" disabled>Submit</button>
      </div>
    }
    else if (context.type === 'user-update-valid' || context.type === 'user-update-submit-failed') {
      return <div data-testid={`UserUpdateForm-${context.selectedUserId}`}>
        <input 
          type="text" 
          data-testid="InputName" 
          defaultValue={context.editingUser.name} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, name: e.target.value })} 
        />
        <input 
          type="text" 
          data-testid="InputEmail" 
          defaultValue={context.editingUser.email} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, email: e.target.value })} 
        />
        {context.editingUser.type === 'doctor' && <input 
          type="text" 
          data-testid="InputLanr" 
          defaultValue={context.editingUser.lanr} 
          onChange={(e) => context.actions.setEditingUser({ ...context.editingUser, lanr: e.target.value } as User & Doctor)} 
        />}

        <button type="button" onClick={() => context.actions.exitUpdate()}>Close</button>
        
        <button type="button" onClick={() => context.actions.submitUpdate()}>Submit</button>
      </div>
    }
    else if (context.type === 'user-update-submitting') {
      return <div data-testid={`UserUpdateForm-${context.selectedUserId}`}>
        <input 
          type="text" 
          data-testid="InputName" 
          defaultValue={context.editingUser.name} 
          disabled
        />
        <input 
          type="text" 
          data-testid="InputEmail" 
          defaultValue={context.editingUser.email} 
          disabled
        />
        {context.editingUser.type === 'doctor' && <input 
          type="text" 
          data-testid="InputLanr" 
          defaultValue={context.editingUser.lanr} 
          disabled
        />}

        <button type="button" disabled>Close</button>
        
        <button type="button" disabled>Submit</button>
      </div>
    }
    else if (context.type === 'user-update-submit-succeed') {
      return <div data-testid={`UserUpdateForm-${context.selectedUserId}`}>
        <input 
          type="text" 
          data-testid="InputName" 
          defaultValue={context.editingUser.name} 
          disabled
        />
        <input 
          type="text" 
          data-testid="InputEmail" 
          defaultValue={context.editingUser.email} 
          disabled
        />
        {context.editingUser.type === 'doctor' && <input 
          type="text" 
          data-testid="InputLanr" 
          defaultValue={context.editingUser.lanr} 
          disabled
        />}

        <button type="button" onClick={() => context.actions.exitUpdate()}>Close</button>
        
        <button type="button" disabled>Submit</button>
      </div>
    }

    return null;
  };

  const renderDeletionConfirmation = () => {
    if (context.type === 'user-deletion-confirmation' || context.type === 'user-deletion-submit-failed') {
      return <div data-testid={`UserDeletionConfirmation-${context.selectedUserId}`}>
        <div>{`Are you sure to delete ${context.users.find((user) => user.id === context.selectedUserId)?.name} ?`}</div>

        <button type="button" onClick={() => context.actions.exitDeletion()}>Close</button>
        
        <button type="button" onClick={() => context.actions.confirmDeletion()}>OK</button>
      </div>
    }
    else if (context.type === 'user-deletion-submitting') {
      return <div data-testid={`UserDeletionConfirmation-${context.selectedUserId}`}>
        <div>{`Are you sure to delete ${context.users.find((user) => user.id === context.selectedUserId)?.name} ?`}</div>

        <button type="button" disabled>Close</button>
        
        <button type="button" disabled>OK</button>
      </div>
    }
    else if (context.type === 'user-deletion-submit-succeed') {
      return <div data-testid={`UserDeletionConfirmation-${context.selectedUserId}`}>
        <div>{`Are you sure to delete ${context.users.find((user) => user.id === context.selectedUserId)?.name} ?`}</div>

        <button type="button" onClick={() => context.actions.exitDeletion()}>Close</button>
        
        <button type="button" disabled>OK</button>
      </div>
    }

    return null;
  };

  return (
    <div data-testid="UserManagement">
      {error && <div data-testid="ErrorState">{error.message}</div>}
      {success && <div data-testid="SucceedState">{success.message}</div>}

      {context.type === 'initialing' && <div data-testid="LoadingState">Initialing</div>}
      
      {context.type === 'initial-failed' && 
        <button type="button" onClick={() => context.actions.reInitial()}>Re-Initial</button>
      }

      {context.type !== 'initialing' && context.type !== 'initial-failed' && 
        <>
          {renderCreationButton('doctor')}

          {renderCreationButton('mfa')}

          {renderUserList()}

          {renderCreationForm()}

          {renderUpdateForm()}

          {renderDeletionConfirmation()}
        </>
      }
    </div>
  );
};
//#endregion

export type {
  UserManagementState,
  InitialState,
  InitialingState,
  InitialFailedState,
  UserListState,
  UserListCommonState,
  UserListWithoutSelectedUserState,
  UserListWithSelectedUserState,
  UserListRefreshUsersState,
  UserListRefetchUserFailedWithoutSelectedUserState,
  UserListRefetchUserFailedWithSelectedUserState ,
  UserListFetchingSelectedUserState ,
  UserListFetchSelectedUserFailedState,
  UserCreationState,
  UserCreationCommonState,
  UserCreationInitialedState,
}

export { 
  useUserManagementState,
  UserManagementContext, 
  UserManagementProvider,
  UserManagement,
};
