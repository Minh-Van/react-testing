"use client"
import { createContext, FC, useEffect, ReactNode, useContext } from 'react';
import type { Snapshot } from 'valtio';
import { proxy, snapshot, useSnapshot } from 'valtio';
import { deepClone } from 'valtio/utils';
import UserList, { userListActions } from './UserList';
import UserForm from './UserForm';
import UserDeleteConfirmation from './UserDeleteConfirmation';
import type { User } from '@app/services/user';
import type { StrictOmit } from '@app/types';
import PageLoading from '@app/components/PageLoading';
import ToastActions from '@app/components/Toast';

//#region types
type UserManagementState = UserManagementReadyState | UserManagementEditingState | UserManagementDeletingState;
type UserManagementReadyState = {
  phase: 'ready',
  actions: {
    startEditing: (param: UserManagementEditingState['editingInfo']) => void;
    startDeleting: (userId: string) => void;
  },
}

type UserManagementEditingState = {
  phase: 'editing',
  editingInfo: {
    mode: 'creation',
    userType: User['type'],
  } | {
    mode: 'update',
    userId: string;
  },
  actions: {
    endEditing: () => void;
  },
}

type UserManagementDeletingState = {
  phase: 'deleting',
  userId: string;
  actions: {
    endDeleting: () => void;
  },
}

type UserManagementInitialValue = StrictOmit<UserManagementReadyState, 'actions'> 
| StrictOmit<UserManagementEditingState, 'actions'>   
| StrictOmit<UserManagementDeletingState, 'actions'>;
//#endregion


//#region states
const initialState: UserManagementState = addActions({ 
  phase: 'ready',
});

const stateProxy = proxy<{ data: UserManagementState }>({ 
  data: deepClone(initialState)
});

function startEditing (param: UserManagementEditingState['editingInfo']) {
  if (stateProxy.data.phase !== 'ready') {
    throw new Error(`Not support transition from state "${stateProxy.data.phase}"`);
  }

  const { mode } = param;
  setState(addActions({
    phase: 'editing',
    editingInfo: mode === 'creation' ? {
      mode,
      userType: param.userType,
    } : {
      mode,
      userId: param.userId,
    }
  }));
}

function endEditing () {
  if (stateProxy.data.phase !== 'editing') {
    throw new Error(`Not support transition from state "${stateProxy.data.phase}"`);
  }

  setState(addActions({
    phase: 'ready'
  }));
}

function startDeleting (userId: string) {
  if (stateProxy.data.phase !== 'ready') {
    throw new Error(`Not support transition from state "${stateProxy.data.phase}"`);
  }

  setState(addActions({
    phase: 'deleting',
    userId,
  }));
}

function endDeleting () {
  if (stateProxy.data.phase !== 'deleting') {
    throw new Error(`Not support transition from state "${stateProxy.data.phase}"`);
  }

  setState(addActions({
    phase: 'ready'
  }));
}

function setState (newState: UserManagementState) {
  if (stateProxy.data.phase === newState.phase) {
    console.log(`[UserManagement] - [update]${stateProxy.data.phase}`);
  } else {
    console.log(`[UserManagement] - [current]${stateProxy.data.phase} --> [new]${newState.phase}`);
  }
  stateProxy.data = { ...newState };
};

function addActions (param: UserManagementInitialValue): UserManagementState {
  const { phase } = param;

  switch (phase) {
    case 'ready':
      return { 
        ...param, 
        actions: {
          startEditing,
          startDeleting,
        }
      };
    case 'editing':
      return { 
        ...param,
        actions: {
          endEditing,
        }
      };
    case 'deleting':
      return { 
        ...param,
        actions: {
          endDeleting,
        }
      };
    default:
      throw new Error(`Not support "${phase}"`)
  }
}

function reset() {
  stateProxy.data = deepClone(initialState);
}
//#endregion


//#region Context & Components
const useUserManagementState = (initialValue?: UserManagementInitialValue) => {
  const stateSnapshot = useSnapshot(stateProxy);

  useEffect(() => {
    if (initialValue) {
      setState(addActions(initialValue));
    }
    
    return () => {
      reset();
    }
  }, []);

  return stateSnapshot.data;
};

const UserManagementContext = createContext<Snapshot<UserManagementState>>(snapshot(stateProxy).data);

const UserManagementProvider: FC<{ 
  initialValue?: UserManagementInitialValue,
  children: ReactNode 
}> = ({ initialValue, children }) => {
  const state = useUserManagementState(initialValue);

  return <UserManagementContext.Provider value={state}>
    {children}
  </UserManagementContext.Provider>;
}

const UserManagement: FC = () => {
  const context = useContext(UserManagementContext);

  const handleStartEditing = (param: UserManagementEditingState['editingInfo']) => {
    if (context.phase === 'ready') {
      context.actions.startEditing(param);
    }
  };

  const handleEndEditing = () => {
    if (context.phase === 'editing') {
      context.actions.endEditing();
    }
  };

  const handleStartDeleting = (userId: string) => {
    if (context.phase === 'ready') {
      context.actions.startDeleting(userId);
    }
  };

  const handleEndDeleting = () => {
    if (context.phase === 'deleting') {
      context.actions.endDeleting();
    }
  };

  const handleSubmitSucceed = () => {
    if (context.phase === 'deleting') {
      context.actions.endDeleting();
    } else if (context.phase === 'editing') {
      context.actions.endEditing();
    }

    userListActions.loadUsers();
  };

  const allowToCreateUser = context.phase !== 'editing';

  return <div data-testid="UserManagement">
      <PageLoading />
      <ToastActions />

      <button type="button" 
        data-testid={`CreationButton-doctor`} 
        disabled={!allowToCreateUser}
        onClick={allowToCreateUser ? () => handleStartEditing({ mode: 'creation', userType: 'doctor' }) : undefined}
      >
        Create doctor
      </button>
      <button type="button" 
        data-testid={`CreationButton-mfa`} 
        disabled={!allowToCreateUser}
        onClick={allowToCreateUser ? () => handleStartEditing({ mode: 'creation', userType: 'mfa' }) : undefined}
      >
        Create mfa
      </button>

      <UserList 
        onUpdateUser={(userId) => handleStartEditing({ mode: 'update', userId })}
        onDeleteUser={(userId) => handleStartDeleting(userId)}
      />

      {context.phase === 'editing' && context.editingInfo.mode === 'creation' && <UserForm 
        mode='creation'
        userType={context.editingInfo.userType}
        onEndEditing={handleEndEditing}
        onSubmitted={handleSubmitSucceed}
      />}

      {context.phase === 'editing' && context.editingInfo.mode === 'update' && <UserForm 
        mode='update'
        userId={context.editingInfo.userId}
        onEndEditing={handleEndEditing}
        onSubmitted={handleSubmitSucceed}
      />}

      {context.phase === 'deleting' && <UserDeleteConfirmation
        userId={context.userId}
        onEndDeletion={handleEndDeleting}
        onSubmitted={handleSubmitSucceed}
      />}
    </div>
}
//#endregion


export type {
  UserManagementInitialValue,
  UserManagementState,
  UserManagementReadyState,
  UserManagementEditingState,
  UserManagementDeletingState,
};

export {
  useUserManagementState,
  UserManagementContext,
  UserManagementProvider,
  UserManagement,
};


export default function UserManagementHOC() {
  return <UserManagementProvider>
    <UserManagement />
  </UserManagementProvider>
}