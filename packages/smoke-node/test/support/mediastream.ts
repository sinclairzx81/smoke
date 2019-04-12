export class MediaStreamContext {
  private _running: boolean
  constructor(private _mediastream: MediaStream, private _context: CanvasRenderingContext2D) {
    this._running = true
    this.run()
  }

  public mediastream(): MediaStream {
    return this._mediastream
  }

  public dispose() {
    this._running = false
  }

  private async run() {
    setTimeout(() => {
      const r = Math.floor(Math.random() * 255)
      const g = Math.floor(Math.random() * 255)
      const b = Math.floor(Math.random() * 255)
      this._context.fillStyle = `rgb(${r}, ${g}, ${b})`
      this._context.fillRect(0, 0, 100, 100)
      if(this._running) {
        this.run()
      }
    }, 1000 / 30)
  }
}

export function createMediaStream(): MediaStreamContext {
  const canvas      = document.createElement('canvas')
  canvas.width      = canvas.height = 256
  const context     = canvas.getContext('2d')!
  const facade      = canvas as any
  const mediastream = facade['captureStream'](30)
  return new MediaStreamContext(mediastream, context)
}