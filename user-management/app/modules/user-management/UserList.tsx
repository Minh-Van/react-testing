import { createContext, FC, useEffect, ReactNode, useRef } from 'react';
import type { Snapshot } from 'valtio';
import { proxy, snapshot, useSnapshot } from 'valtio';
import { deepClone } from 'valtio/utils';
import type { StrictOmit } from '@app/types';
import type { User } from '@app/services/user';
import UserService from '@app/services/user';
import { pageLoadingActions } from '@app/components/PageLoading';
import { toastActions } from '@app/components/Toast';

//#region types
type UserListState = UserListCommonState & (UserListInitialState | UserListLoadingState | UserListWithSelectedUserState | UserListWithoutSelectedUserState);
type UserListCommonState = {
  error?: { message: string }; 
};
type UserListInitialState = {
  phase: 'initial',
  actions: {
    initial:() => void;
  }
};
type UserListLoadingState = {
  phase: 'loading';
  users?: Array<Pick<User, 'id' | 'name' | 'type'>>;
  selectedUserId?: string;
};
type UserListWithSelectedUserState = {
  phase: 'with-selected-user';
  users: Array<Pick<User, 'id' | 'name' | 'type'>>;
  selectedUserId: string;
  actions: {
    loadUsers:() => void;
    selectUser: (userId: string) => void;
    onUpdateUser: (callback: (userId: string) => void) => void;
    onDeleteUser: (callback: (userId: string) => void) => void;
  }
};
type UserListWithoutSelectedUserState = {
  phase: 'without-selected-user';
  users: Array<Pick<User, 'id' | 'name' | 'type'>>;
  actions: {
    loadUsers:() => void;
    selectUser: (userId: string) => void;
  }
};

type UserListProps = { 
  onUpdateUser: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
};

type UserListInitialValue = UserListCommonState & (
  StrictOmit<UserListInitialState, 'actions'> 
  | UserListLoadingState 
  | StrictOmit<UserListWithSelectedUserState, 'actions'> 
  | StrictOmit<UserListWithoutSelectedUserState, 'actions'>
);
//#endregion


//#region states
const initialState: UserListCommonState & UserListInitialState = { 
  phase: 'initial',
  actions: {
    initial: loadUsers
  }
}

const stateProxy = proxy<{ data: UserListState }>({ 
  data: deepClone(initialState)
});

async function loadUsers() { 
  if (stateProxy.data.phase === 'loading') {
    return;
  }

  try {
    setState(addActions({ 
      ...stateProxy.data,
      phase: 'loading' 
    }));

    const { data } = await UserService.getUsers();

    setState(addActions({
      phase: 'without-selected-user',
      users: [...data]
    }));
  } catch (error) {
    console.error(error);
    setState(addActions({
      ...stateProxy.data,
      error: { message: 'Load users failed' },
    }));
  }
};

async function selectUser(userId: string) {
  switch(stateProxy.data.phase) {
    case 'with-selected-user': {
      if (stateProxy.data.selectedUserId !== userId) {
        setState(addActions({
          ...stateProxy.data,
          selectedUserId: userId,
        }));
      }
      break;
    }
    case 'without-selected-user': {
      setState(addActions({
        ...stateProxy.data,
        phase: 'with-selected-user',
        selectedUserId: userId,
      }));
      break; 
    }
    default:
      throw new Error(`Not support transition from state "${stateProxy.data.phase}"`);    
  }
}

function addActions (param: UserListInitialValue): UserListState {
  const { phase } = param;

  switch (phase) {
    case 'initial':
      return { 
        ...param,
        actions: {
          initial: loadUsers
        }
      };
    case 'loading':
      return { ...param };
    case 'with-selected-user':
      return { 
        ...param,
        actions: {
          loadUsers,
          selectUser,
          onUpdateUser: (callback) => callback(param.selectedUserId),
          onDeleteUser: (callback) => callback(param.selectedUserId),
        }
      };
    case 'without-selected-user':
        return { 
          ...param,
          actions: {
            loadUsers,
            selectUser,
          }
        };
    default:
      throw new Error(`Not support "${phase}"`)
  }
}

function setState (newState: UserListState) {
  if (stateProxy.data.phase === newState.phase) {
    console.log(`[UserList] - [update]${stateProxy.data.phase}`);
  } else {
    console.log(`[UserList] - [current]${stateProxy.data.phase} --> [new]${newState.phase}`);
  }
  stateProxy.data = { ...newState };
};

function reset() {
  stateProxy.data = deepClone(initialState);
}
//#endregion


//#region context & components
const useUserListState = (initialValue?: UserListInitialValue) => {
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

const UserListContext = createContext<Snapshot<UserListState>>(snapshot(stateProxy).data);

const UserListProvider: FC<{ 
  initialValue?: UserListInitialValue,
  children: ReactNode 
}> = ({ initialValue, children }) => {
  const state = useUserListState(initialValue);

  return <UserListContext.Provider value={state}>
    {children}
  </UserListContext.Provider>;
}

const UserList: FC<UserListProps> = (props) => {
  const context = useUserListState();
  const isShownPageLoading = useRef<boolean>();

  useEffect(() => {
    if (context.phase === 'initial') {
      context.actions.initial();
    }
    else if (context.phase === 'loading') {
      pageLoadingActions.show();
      isShownPageLoading.current = true;
    }
    
    if (context.phase !== 'loading' && isShownPageLoading.current) {
      pageLoadingActions.hide();
      isShownPageLoading.current = false;
    }
  }, [context.phase])

  useEffect(() => {
    if (context.error) {
      toastActions.show({ type: 'error', message: context.error.message });
    }
  }, [context.error])


  return <div data-testid="UserList">
    {context.phase !== 'initial' && context.users?.map((user) => {
      if (context.phase === 'without-selected-user') {
        return <div 
          key={user.id} 
          data-testid={`UserItem-${user.id}`} 
          onClick={() => context.actions.selectUser(user.id)}
        >
          {user.type} - {user.name}
        </div>
      } 
      else if (context.phase === 'with-selected-user') {
        const isSelected = context.selectedUserId === user.id;

        return <div 
          key={user.id} 
          data-testid={`UserItem-${user.id}`} 
          data-selected={isSelected ? 'selected' : ''}
          onClick={isSelected ? undefined : () => context.actions.selectUser(user.id)}
        >
          {user.type} - {user.name}
          {isSelected && <button type="button" data-testid={`UpdateButton-${user.id}`} onClick={(e) => { e.preventDefault(); context.actions.onUpdateUser(props.onUpdateUser); }}>Update</button>}
          {isSelected && <button type="button" data-testid={`DeleteButton-${user.id}`} onClick={(e) => { e.preventDefault(); context.actions.onDeleteUser(props.onDeleteUser); }}>Delete</button>}
        </div>
      }
      else {
        return <div 
          key={user.id} 
          data-testid={`UserItem-${user.id}`} 
        >
          {user.type} - {user.name}
        </div>
      }
    })}
    </div>
}
//#endregion

const userListActions = {
  loadUsers,
}

export type {
  UserListProps,
  UserListInitialValue,
  UserListState, 
  UserListCommonState, 
  UserListInitialState,
  UserListLoadingState,
  UserListWithSelectedUserState,
  UserListWithoutSelectedUserState,
}

export {
  useUserListState,
  userListActions,
  UserListContext,
  UserListProvider,
  UserList,
};

export default function UserListHOC (props: UserListProps) {
  return <UserListProvider>
    <UserList {...props} />
  </UserListProvider>
}