import { createContext, FC, useEffect, ReactNode } from 'react';
import type { Snapshot } from 'valtio';
import { proxy, snapshot, useSnapshot } from 'valtio';
import { deepClone } from 'valtio/utils';

//#region types
type PageLoadingState = PageLoadingHiddenState | PageLoadingShownState;
type PageLoadingHiddenState = {
  phase: 'hidden',
};
type PageLoadingShownState = {
  phase: 'shown';
};

//#endregion


//#region states
const initialState: PageLoadingHiddenState = { 
  phase: 'hidden',
}

const stateProxy = proxy<{ data: PageLoadingState }>({ 
  data: deepClone(initialState)
});

function show() { 
  if (stateProxy.data.phase === 'hidden') {
    setState({ 
      ...stateProxy.data,
      phase: 'shown'
    });
  }
};

function hide() { 
  if (stateProxy.data.phase === 'shown') {
    setState({ 
      ...stateProxy.data,
      phase: 'hidden'
    });
  }
};

function setState (newState: PageLoadingState) {
  if (stateProxy.data.phase === newState.phase) {
    console.log(`[PageLoading] - [update]${stateProxy.data.phase}`);
  } else {
    console.log(`[PageLoading] - [current]${stateProxy.data.phase} --> [new]${newState.phase}`);
  }
  stateProxy.data = { ...newState };
};

function reset() {
  stateProxy.data = deepClone(initialState);
}
//#endregion


//#region context & components
const usePageLoadingState = (initialValue?: 
  PageLoadingHiddenState 
  | PageLoadingShownState
) => {
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

const PageLoadingContext = createContext<Snapshot<PageLoadingState>>(snapshot(stateProxy).data);

const PageLoadingProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const state = usePageLoadingState();

  return <PageLoadingContext.Provider value={state}>
    {children}
  </PageLoadingContext.Provider>;
}

const PageLoading: FC = () => {
  const context = usePageLoadingState();


  return <div data-testid="PageLoading">
    {context.phase === 'shown' && <p>Loading</p>}  
  </div>
}
//#endregion

const pageLoadingActions = {
  show,
  hide,
}

export type {
  PageLoadingState,
  PageLoadingShownState,
  PageLoadingHiddenState,
}

export {
  usePageLoadingState,
  pageLoadingActions,
  PageLoadingContext,
  PageLoadingProvider,
  PageLoading,
};

export default function PageLoadingHOC () {
  return <PageLoadingProvider>
    <PageLoading />
  </PageLoadingProvider>
}