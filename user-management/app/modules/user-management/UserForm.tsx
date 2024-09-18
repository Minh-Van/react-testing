import { createContext, FC, useEffect, ReactNode, useRef } from 'react';
import type { Snapshot } from 'valtio';
import { proxy, snapshot, useSnapshot } from 'valtio';
import { deepClone } from 'valtio/utils';
import type { StrictOmit } from '@app/types';
import type { Doctor, MFA, User } from '@app/services/user';
import UserService from '@app/services/user';
import { pageLoadingActions } from '@app/components/PageLoading';
import { toastActions } from '@app/components/Toast';

//#region types
type UserFormState = UserFormCommonState & (UserFormInitialState | UserFormLoadingState | UserFormEditPristineState | UserFormEditValidState | UserFormEditInvalidState);

type UserFormCommonState = {
  userId?: string;
  error?: { message: string };
};

type UserFormInitialState = {
  phase: 'initial';
  actions: {
    initial: (param: (
      {
        mode: 'creation',
        userType: User['type'],
      } | 
      {
        mode: 'update',
        userId: string,
      }
    )) => void;
  }
};

type UserFormLoadingState = {
  phase: 'loading';
  editingUser?: Pick<User, 'name' | 'email'> & (Pick<Doctor, 'type' | 'lanr'> | Pick<MFA, 'type'>);
  invalid?: Partial<Record<keyof Pick<User & Doctor, 'name' | 'email' | 'lanr' | 'type'>, string>>;
};

type UserFormEditPristineState = { 
  phase: 'edit-pristine';
  editingUser: Pick<User, 'name' | 'email'> & (Pick<Doctor, 'type' | 'lanr'> | Pick<MFA, 'type'>);
  actions: {
    setEditingUser: (param: Parameters<typeof setEditingUser>[0]) => void;
    onEndEditing: (callback: () => void) => void;
  },
};

type UserFormEditValidState = { 
  phase: 'edit-valid';
  editingUser: Pick<User, 'name' | 'email'> & (Pick<Doctor, 'type' | 'lanr'> | Pick<MFA, 'type'>);
  actions: {
    setEditingUser: (param: Parameters<typeof setEditingUser>[0]) => void;
    onEndEditing: (callback: () => void) => void;
    submit: () => Promise<boolean>;
  },
};

type UserFormEditInvalidState = { 
  phase: 'edit-invalid';
  editingUser: Pick<User, 'name' | 'email'> & (Pick<Doctor, 'type' | 'lanr'> | Pick<MFA, 'type'>);
  invalid: Partial<Record<keyof Pick<User & Doctor, 'name' | 'email' | 'lanr' | 'type'>, string>>;
  actions: {
    setEditingUser: (param: Parameters<typeof setEditingUser>[0]) => void;
    onEndEditing: (callback: () => void) => void;
  },
};

type UserFormProps = {
  onEndEditing: () => void;
  onSubmitted: (mode: 'creation' | 'update') => void;
} & (
  {
    mode: 'creation',
    userType: User['type'],
  } | 
  {
    mode: 'update',
    userId: string,
  }
);

type UserFormInitialValue = UserFormCommonState & (
  StrictOmit<UserFormInitialState, 'actions'>
  | UserFormLoadingState
  | StrictOmit<UserFormEditPristineState, 'actions'>
  | StrictOmit<UserFormEditValidState, 'actions'>
  | StrictOmit<UserFormEditInvalidState , 'actions'>
);
//#endregion


//#region states
const initialState: UserFormCommonState & UserFormInitialState = { 
  phase: 'initial',
  actions: {
    initial,
  }
};

const stateProxy = proxy<{ data: UserFormState }>({ 
  data: deepClone(initialState)
});

async function initial (param: {
  mode: 'creation',
  userType: User['type'],
} | 
{
  mode: 'update',
  userId: string,
}) { 
  if (stateProxy.data.phase === 'loading') {
    return;
  }

  const { mode } = param;

  try {
    if (mode === 'creation') {
      return setState(addActions({
        phase: 'edit-pristine',
        editingUser: param.userType === 'doctor' 
          ? { name: '', email: '', lanr: '', type: param.userType } 
          : { name: '', email: '', type: param.userType },
      }));
    }

    setState(addActions({ phase: 'loading' }));

    const { data } = await UserService.getUser(param.userId);
    
    return setState(addActions({
      ...stateProxy.data,
      phase: 'edit-pristine',
      userId: param.userId,
      editingUser: { ...data },
    }));
  } catch (error) {
    console.error(error);
    setState(addActions({
      ...stateProxy.data,
      error: { message: 'Initial failed' }
    }));
  }
}

const setEditingUser = async (param: Partial<{
  name: string;
  email: string;
  lanr: string;
}>) => {
  switch(stateProxy.data.phase) {
    case 'edit-pristine':
    case 'edit-valid':
    case 'edit-invalid': {
      const { name, email, lanr } = param;
      let invalid: UserFormEditInvalidState['invalid'] = {};

      const editingUser: UserFormEditInvalidState['editingUser'] = { 
        ...stateProxy.data.editingUser,
        name: name !== undefined ? name : stateProxy.data.editingUser.name,
        email: email !== undefined ? email : stateProxy.data.editingUser.email,
        ...(stateProxy.data.editingUser.type === 'doctor' 
            ? { lanr: lanr !== undefined ? lanr : stateProxy.data.editingUser.lanr }
            : {}),
      };

      if (!editingUser.name.trim().length) {
        invalid = { ...invalid, name: 'Invalid name' };
      }
      if (!editingUser.email.trim().includes('@')) {
        invalid = { ...invalid, email: 'Invalid email' };
      }
      if (editingUser.type === 'doctor' && !editingUser.lanr.trim().length) {
        invalid = { ...invalid, lanr: 'Invalid lanr' };
      }
      
      if (Object.keys(invalid).length) {
        setState(addActions({
          ...stateProxy.data,
          phase: 'edit-invalid',
          invalid,
          editingUser,
        }));
      } else {
        setState(addActions({
          ...stateProxy.data,
          phase: 'edit-valid',
          editingUser,
        }));
      }
      break;
    }
    default:
      throw new Error(`Not support transition from state "${stateProxy.data.phase}"`);
  }
};

const submit = async () => {
  if (stateProxy.data.phase !== 'edit-valid') {
    throw new Error(`Not support transition from state "${stateProxy.data.phase}"`);
  }

  try {
    const { editingUser } = stateProxy.data;

    setState(addActions({
      ...stateProxy.data,
      phase: 'loading',
    }));

    if (stateProxy.data.userId) {
      await UserService.updateUser({ id: stateProxy.data.userId, ...editingUser });
    } else {
      await UserService.createUser(editingUser);
    }

    setState(addActions({
      ...stateProxy.data,
      phase: 'edit-valid',
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

const onEndEditing = (callback: () => void) => {
  switch(stateProxy.data.phase) {
    case 'edit-pristine':
    case 'edit-valid':
    case 'edit-invalid': {
      callback();
      break;
    }
    default:
      throw new Error(`[onEndEditing]Not support transition from state "${stateProxy.data.phase}"`);
  }
};

function addActions (param: UserFormInitialValue): UserFormState {
  const { phase } = param;

  switch (phase) {
    case 'initial':
      return {
        ...param,
        actions: {
          initial,
        }
      };
    case 'loading':
      return {
        ...param,
      };
    case 'edit-pristine':
    case 'edit-invalid':
      return { 
        ...param,
        actions: {
          setEditingUser,
          onEndEditing,
        },
      };
    case 'edit-valid':
      return { 
        ...param,
        actions: {
          setEditingUser,
          submit,
          onEndEditing: (callback) => callback(),
        },
      };
    default:
      throw new Error(`Not support "${phase}"`)
  }
}

function setState (newState: UserFormState) {
  if (stateProxy.data.phase === newState.phase) {
    console.log(`[UserForm] - [update]${stateProxy.data.phase}`);
  } else {
    console.log(`[UserForm] - [current]${stateProxy.data.phase} --> [new]${newState.phase}`);
  }
  stateProxy.data = { ...newState };
};

function resetState() {
  stateProxy.data = deepClone(initialState);
}
//#endregion


//#region Context & Component
const useUserFormState = (initialValue?: UserFormInitialValue) => {
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

const UserFormContext = createContext<Snapshot<UserFormState>>(snapshot(stateProxy).data);

const UserFormProvider: FC<{
  initialValue?: UserFormInitialValue,
  children: ReactNode 
}> = ({ initialValue, children }) => {
const state = useUserFormState(initialValue);

return <UserFormContext.Provider value={state}>
  {children}
</UserFormContext.Provider>;
}

const UserForm: FC<UserFormProps> = (props) => {
  const context = useUserFormState();
  const isShownPageLoading = useRef<boolean>();

  useEffect(() => {
    if (context.phase === 'initial') {
      context.actions.initial(props.mode === 'creation' ? {
        mode: 'creation',
        userType: props.userType,
      } : {
        mode: 'update',
        userId: props.userId,
      });
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
    if (context.phase === 'edit-valid') {
      const isSucceed = await context.actions.submit();
      if (isSucceed) {
        toastActions.show({ 
          type: 'success', 
          message: props.mode === 'creation' 
            ? 'User created' 
            : 'User updated' 
        });

        props.onSubmitted(props.mode);
      }
    }
  };


  return <div 
    data-testid={props.mode === 'creation' ? `UserCreationForm-${context.phase}` : `UserUpdateForm-${props.userId}-${context.phase}`}
  >
    {(context.phase === 'edit-pristine' || context.phase === 'edit-valid') && <>
      <input 
        type="text" 
        data-testid="InputName" 
        defaultValue={context.editingUser.name} 
        onBlur={(e) => {
          e.preventDefault();
          context.actions.setEditingUser({ name: e.target.value });
        }} 
      />
      <input 
        type="text" 
        data-testid="InputEmail" 
        defaultValue={context.editingUser.email} 
        onBlur={(e) => {
          e.preventDefault();
          context.actions.setEditingUser({ email: e.target.value })
        }} 
      />
      {context.editingUser.type === 'doctor' && <input 
        type="text" 
        data-testid="InputLanr" 
        defaultValue={context.editingUser.lanr} 
        onBlur={(e) => context.actions.setEditingUser({ lanr: e.target.value } as User & Doctor)} 
      />}

      <button 
        type="button" 
        onClick={() => context.actions.onEndEditing(props.onEndEditing)}
      >
        Close
      </button>
      
      <button type="button" 
        data-testid="ButtonSubmit" 
        disabled={context.phase === 'edit-pristine'} 
        onClick={submit}
      >
        Submit
      </button>
    </>}

    {context.phase === 'edit-invalid' && <>
      <input 
        type="text" 
        data-testid="InputName" 
        style={context.invalid?.name ? { borderColor: 'red' } : undefined}
        defaultValue={context.editingUser.name} 
        onBlur={(e) => {
          e.preventDefault();
          context.actions.setEditingUser({ name: e.target.value });
        }} 
      />
      <input 
        type="text" 
        data-testid="InputEmail" 
        style={context.invalid?.email ? { borderColor: 'red' } : undefined}
        defaultValue={context.editingUser.email} 
        onBlur={(e) => {
          e.preventDefault();
          context.actions.setEditingUser({ email: e.target.value });
        }} 
      />
      {context.editingUser.type === 'doctor' && <input 
        type="text" 
        data-testid="InputLanr" 
        style={context.invalid?.lanr ? { borderColor: 'red' } : undefined}
        defaultValue={context.editingUser.lanr} 
        onBlur={(e) => {
          e.preventDefault();
          context.actions.setEditingUser({ lanr: e.target.value });
        }} 
      />}

      <button type="button" onClick={() => context.actions.onEndEditing(props.onEndEditing)}>Close</button>
      
      <button type="button" data-testid="ButtonSubmit" disabled>Submit</button>
    </>}
  </div>
}
//#endregion

export type {
  UserFormProps,
  UserFormInitialValue,
  UserFormState,
  UserFormCommonState,
  UserFormInitialState,
  UserFormLoadingState,
  UserFormEditPristineState,
  UserFormEditValidState,
  UserFormEditInvalidState,
}

export {
  useUserFormState,
  UserFormContext,
  UserFormProvider,
  UserForm,
};

export default function UserFormHOC (props: UserFormProps) {
  return <UserFormProvider>
    <UserForm {...props} />
  </UserFormProvider>
}