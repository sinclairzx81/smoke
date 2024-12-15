import * as Http from 'node:http'
import * as Path from 'node:path'
import * as Fs from 'node:fs'

// -------------------------------------------------------------------------------
// Clean
// -------------------------------------------------------------------------------
export async function clean() {
  await folder('target').delete()
}
// -------------------------------------------------------------------------------
// Format
// -------------------------------------------------------------------------------
export async function format() {
  await shell('prettier --no-semi --single-quote --print-width 240 --trailing-comma all --write src test example')
}
// -------------------------------------------------------------------------------
// Start
// -------------------------------------------------------------------------------
export async function start(target = 'target/example') {
  const worker = shell(`hammer watch src/proxy/service/worker.mts --dist ${target}`)
  const start = shell(`hammer serve example/index.html --dist ${target}`)
  const drift = shell(`drift wait 100 url http://localhost:5000`)
  await Promise.all([worker, start, drift])
}
// -------------------------------------------------------------------------------
// Chrome
// -------------------------------------------------------------------------------
async function chrome_warmup() {
  // Chrome will not have been run in CI environment due to fresh install. It's been
  // noted that initialization of Chrome seems to involve running a latent optimization
  // process on the user directory which takes some time to complete. The following just
  // runs chrome, waits 8 seconds and exits. 
  await shell(`drift wait 8000 close`)
}
// -------------------------------------------------------------------------------
// Test
// -------------------------------------------------------------------------------
export async function test_serve(target = 'target/test') {
  await shell(`hammer serve test/index.html --dist ${target}`)
}
function test_server(target = 'target/test', port = 5010) {
  return Http.createServer((req, res) => {
    const [path, extname] = [Path.join(target, req.url), Path.extname(req.url)]
    if(Fs.existsSync(path) && Fs.statSync(path).isFile()) {
      if(extname === '.js') res.writeHead(200, { 'Content-Type': 'application/javascript' })
      res.end(Fs.readFileSync(path))
    } else {
      res.end('<html><head>NotFound</head></html>')
    }
  }).listen(port)
}
export async function test(filter = '', target = 'target/test') {
  await chrome_warmup()
  const server = test_server(target, 5010)
  await shell(`hammer build src/proxy/service/worker.mts --dist ${target}`)
  await shell(`hammer build test/index.mts --dist ${target} --platform node`)
  await shell(`drift url http://localhost:5010 wait 1000 run ./${target}/index.mjs args "${filter}"`)
  server.close()
}
// -------------------------------------------------------------------------------
// Build
// -------------------------------------------------------------------------------
export async function build(target = 'target/build') {
  await clean()
  await shell(`tsc -p src/tsconfig.json --outDir ${target} --declaration`)
  await shell(`hammer build src/proxy/service/worker.mts --dist ${target}`)
  await folder(target).add('package.json')
  await folder(target).add('readme.md')
  await folder(target).add('license')
  await shell(`cd ${target} && npm pack`)
}
// -------------------------------------------------------------
// Publish
// -------------------------------------------------------------
export async function publish(otp, target = 'target/build') {
  const { version } = JSON.parse(Fs.readFileSync('package.json', 'utf8'))
  if(version.includes('-dev')) throw Error(`package version should not include -dev specifier`)
  await shell(`cd ${target} && npm publish sinclair-smoke-${version}.tgz --access=public --otp ${otp}`)
  await shell(`git tag ${version}`)
  await shell(`git push origin ${version}`)
}