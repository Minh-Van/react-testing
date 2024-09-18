import { createContext, FC, useEffect, ReactNode } from 'react';
import type { Snapshot } from 'valtio';
import { proxy, snapshot, useSnapshot } from 'valtio';
import { deepClone } from 'valtio/utils';

//#region types
type ToastState = { 
  phase: 'ready',
  items: { 
    [id: string]: {
      type: 'error' | 'success';
      message: string;
    } 
  };
};
//#endregion


//#region states
const initialState: ToastState = { 
  phase: 'ready',
  items: {},
}

const stateProxy = proxy<{ data: ToastState }>({ 
  data: deepClone(initialState)
});

function show(param: ToastState['items'][keyof ToastState['items']]) { 
  if (stateProxy.data.phase === 'ready') {
    const id = Date.now().toString();

    setState({ 
      ...stateProxy.data,
      items: {
        ...stateProxy.data.items, 
        [id]: { ...param }
      }
    });

    setTimeout(() => {
      const updatedItems = { ...stateProxy.data.items };
      delete updatedItems[id];

      setState({ 
        ...stateProxy.data,
        items: updatedItems
      });
    }, 2000);
  }
};

function setState (newState: ToastState) {
  if (stateProxy.data.phase === newState.phase) {
    console.log(`[Toast] - [update]${stateProxy.data.phase}`);
  } else {
    console.log(`[Toast] - [current]${stateProxy.data.phase} --> [new]${newState.phase}`);
  }
  stateProxy.data = { ...newState };
};

function reset() {
  stateProxy.data = deepClone(initialState);
}
//#endregion


//#region context & components
const useToastState = (initialValue?: ToastState) => {
  const stateSnapshot = useSnapshot(stateProxy);

  useEffect(() => {
    if (initialValue) {
      setState(initialValue);
    }

    return () => {
      reset();
    }
  }, []);

  return stateSnapshot.data;
};

const ToastContext = createContext<Snapshot<ToastState>>(snapshot(stateProxy).data);

const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const state = useToastState();

  return <ToastContext.Provider value={state}>
    {children}
  </ToastContext.Provider>;
}

const Toast: FC = () => {
  const context = useToastState();


  return <div data-testid="Toast">
    {context.phase === 'ready' && Object.entries(context.items).map(([id, item]) => {
      return <div key={id} data-testid={`ToastItem-${item.type}-${id}`}>{item.message}</div>;
    })}  
  </div>
}
//#endregion

const toastActions = {
  show,
}

export type {
  ToastState
}

export {
  useToastState,
  toastActions,
  ToastContext,
  ToastProvider,
  Toast,
};

export default function ToastHOC () {
  return <ToastProvider>
    <Toast />
  </ToastProvider>
}