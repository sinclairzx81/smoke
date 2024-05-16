import { Network, FileSystem } from '@sinclair/smoke'

// ------------------------------------------------------------------
// Store Static Files
// ------------------------------------------------------------------

const Fs = await FileSystem.open('filesystem')

await Fs.writeText('/index.html', '<html>hello world</html>')

// ------------------------------------------------------------------
// Serve Static Files
// ------------------------------------------------------------------

const { Http } = new Network()

Http.listen({ port: 5000 }, (request) => {
  const { pathname } = new URL(request.url)

  return new Response(Fs.readable(pathname))
})

// ------------------------------------------------------------------
// Fetch
// ------------------------------------------------------------------

const html = await Http.fetch('http://localhost:5000/index.html').then((x) => x.text())

console.log(html)
