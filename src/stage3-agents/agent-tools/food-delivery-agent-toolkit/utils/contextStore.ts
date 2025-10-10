// utils/contextStore.ts
interface Context {
  restaurant?: string
  menu?: string[]
  order?: any
}

let store: Context = {}

export const contextStore = {
  get: () => store,
  set: (updates: Partial<Context>) => {
    store = { ...store, ...updates }
  },
  clear: () => {
    store = {}
  },
}
