export function createSource(): MediaStream {
  const canvas  = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const context = canvas.getContext('2d')!
  setInterval(() => {
    const r = Math.floor(Math.random() * 255)
    const g = Math.floor(Math.random() * 255)
    const b = Math.floor(Math.random() * 255)
    context.fillStyle = `rgb(${r}, ${g}, ${b})`
    context.fillRect(0, 0, 100, 100)
  }, 10)
  const facade = canvas as any
  return facade['captureStream'](30)
}