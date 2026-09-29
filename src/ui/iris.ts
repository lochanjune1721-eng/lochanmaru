// Iris-wipe controller. The <Iris /> component installs the implementation; the engine just awaits it.
export const irisCtl = {
  close: (async (_x: number, _y: number, _color: string) => {}) as (x: number, y: number, color: string) => Promise<void>,
  open: (async (_x: number, _y: number) => {}) as (x: number, y: number) => Promise<void>,
}
