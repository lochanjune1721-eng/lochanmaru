// Audio facade (implemented in Task 8). Kept as a stable API so UI/world code can already call it.
type Handler = { enabled: boolean }
export const audio = {
  state: { enabled: false } as Handler,
  init() {},
  setEnabled(_on: boolean) {},
  ui(_name: 'tick' | 'open' | 'close' | 'discover' | 'door' | 'whoosh' | 'pop') {},
}
