import { Network, Stream } from '@sinclair/smoke'

const { Http } = new Network()

Http.listen({ port: 5000 }, () => new Response('hello webrtc'))

const text = await Http.fetch('http://localhost:5000').then((x) => x.text())

console.log(text)
