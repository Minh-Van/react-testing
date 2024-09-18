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
type UserDeleteConfirmationState = UserDeleteConfirmationCommonState & (UserDeleteConfirmationInitialState | UserDeleteConfirmationLoadingState | UserDeleteConfirmationWaitingState);

type UserDeleteConfirmationCommonState = {
  error?: { message: string };
};

type UserDeleteConfirmationInitialState = {
  phase: 'initial';
  actions: {
    initial: (userId: string) => void;
  }
};

type UserDeleteConfirmationLoadingState = {
  phase: 'loading';
  deletingUser?: Pick<User, 'id' | 'name' | 'type'>;
};

type UserDeleteConfirmationWaitingState = { 
  phase: 'waiting-confirmation';
  deletingUser: Pick<User, 'id' | 'name' | 'type'>;
  actions: {
    submit: () => Promise<boolean>;
    onEndDeletion: (callback: () => void) => void;
  },
};

type UserDeleteConfirmationProps = {
  userId: string,
  onEndDeletion: () => void;
  onSubmitted: () => void;
};

type UserDeletionInitialValue = UserDeleteConfirmationCommonState & (
  StrictOmit<UserDeleteConfirmationInitialState, 'actions'>
  | UserDeleteConfirmationLoadingState
  | StrictOmit<UserDeleteConfirmationWaitingState, 'actions'>
);
//#endregion


//#region states
const initialState: UserDeleteConfirmationCommonState & UserDeleteConfirmationInitialState = { 
  phase: 'initial',
  actions: {
    initial: loadUser
  }
}

const stateProxy = proxy<{ data: UserDeleteConfirmationState }>({ 
  data: deepClone(initialState)
});

async function loadUser (userId: string) { 
  if (stateProxy.data.phase === 'loading') {
    return;
  }

  try {
    setState(addActions({ phase: 'loading' }));

    const { data } = await UserService.getUser(userId);
    
    return setState(addActions({
      ...stateProxy.data,
      phase: 'waiting-confirmation',
      deletingUser: { ...data },
    }));
  } catch (error) {
    console.error(error);
    setState(addActions({
      ...stateProxy.data,
      error: { message: 'Load user failed' }
    }));
  }
}

const submit = async () => {
  if (stateProxy.data.phase !== 'waiting-confirmation') {
    throw new Error(`Not support transition from state "${stateProxy.data.phase}"`);
  }

  try {
    const { deletingUser } = stateProxy.data;

    setState(addActions({
      ...stateProxy.data,
      phase: 'loading',
    }));

    await UserService.deleteUser(deletingUser.id);

    setState(addActions({
      ...stateProxy.data,
      phase: 'waiting-confirmation',
    }));

    return true;
  } catch (error) {
    console.error(error);
    setState(addActions({
      ...stateProxy.data,
      error: { message: 'Submit failed' }
    }));

    return false;
  }
};

const onEndDeletion = (callback: () => void) => {
  if (stateProxy.data.phase !== 'waiting-confirmation') {
    throw new Error(`[onEndDeletion]Not support transition from state "${stateProxy.data.phase}"`);
  }

  callback();
};

function addActions (param: UserDeletionInitialValue): UserDeleteConfirmationState {
  const { phase } = param;

  switch (phase) {
    case 'initial':
      return {
        ...param,
        actions: {
          initial: loadUser,
        }
      };
    case 'loading':
      return {
        ...param,
      };
    case 'waiting-confirmation':
      return { 
        ...param,
        actions: {
          submit,
          onEndDeletion,
        },
      };
    default:
      throw new Error(`Not support "${phase}"`)
  }
}

function setState (newState: UserDeleteConfirmationState) {
  if (stateProxy.data.phase === newState.phase) {
    console.log(`[UserDeleteConfirmation] - [update]${stateProxy.data.phase}`);
  } else {
    console.log(`[UserDeleteConfirmation] - [current]${stateProxy.data.phase} --> [new]${newState.phase}`);
  }
  stateProxy.data = { ...newState };
};

function resetState() {
  stateProxy.data = deepClone(initialState);
}
//#endregion


//#region Context & Component
const useUserDeleteConfirmationState = (initialValue?: UserDeletionInitialValue) => {
const stateSnapshot = useSnapshot(stateProxy);

useEffect(() => {
  if (initialValue) {
    setState(addActions(initialValue));
  }

  return () => {
    resetState();
  }
}, []);

return stateSnapshot.data;
};

const UserDeleteConfirmationContext = createContext<Snapshot<UserDeleteConfirmationState>>(snapshot(stateProxy).data);

const UserDeleteConfirmationProvider: FC<{ 
  initialValue?: UserDeletionInitialValue,
  children: ReactNode 
}> = ({ initialValue, children }) => {
const state = useUserDeleteConfirmationState(initialValue);

return <UserDeleteConfirmationContext.Provider value={state}>
  {children}
</UserDeleteConfirmationContext.Provider>;
}

const UserDeleteConfirmation: FC<UserDeleteConfirmationProps> = (props) => {
  const context = useUserDeleteConfirmationState();
  const isShownPageLoading = useRef<boolean>();

  useEffect(() => {
    if (context.phase === 'initial') {
      context.actions.initial(props.userId);
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

  const submit = async () => {
    if (context.phase === 'waiting-confirmation') {
      const isSucceed = await context.actions.submit();
      if (isSucceed) {
        toastActions.show({ type: 'success', message: 'User deleted' });

        props.onSubmitted();
      }
    }
  };


  return <div data-testid={`UserDeletionConfirmation-${props.userId}`}>
    {context.phase === 'waiting-confirmation' && <>
      <div>{`Are you sure to delete ${context.deletingUser.type}, ${context.deletingUser.name} ?`}</div>

      <button type="button" onClick={() => context.actions.onEndDeletion(props.onEndDeletion)}>Close</button>
      
      <button 
        data-testid="ButtonSubmit"
        type="button" 
        onClick={submit}
      >
        OK
      </button>
    </>}
  </div>
}
//#endregion

export type {
  UserDeleteConfirmationProps,
  UserDeletionInitialValue,
  UserDeleteConfirmationState,
  UserDeleteConfirmationCommonState,
  UserDeleteConfirmationInitialState,
  UserDeleteConfirmationLoadingState,
  UserDeleteConfirmationWaitingState,
}

export {
  useUserDeleteConfirmationState,
  UserDeleteConfirmationContext,
  UserDeleteConfirmationProvider,
  UserDeleteConfirmation,
};

export default function UserDeleteConfirmationHOC (props: UserDeleteConfirmationProps) {
  return <UserDeleteConfirmationProvider>
    <UserDeleteConfirmation {...props} />
  </UserDeleteConfirmationProvider>
}