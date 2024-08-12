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
  const start = shell(`hammer serve example/index.html --dist ${target}`)
  const drift = shell(`drift wait 100 url http://localhost:5000`)
  await Promise.all([start, drift])
}
// -------------------------------------------------------------------------------
// Test
// -------------------------------------------------------------------------------
export async function test_serve(target = 'target/test') {
  await shell(`hammer serve test/index.html --dist ${target}`)
}
export async function test(filter = '', target = 'target/test') {
  await shell(`hammer build test/index.mts --dist ${target} --platform node`)
  const server = require('http').createServer((_, res) => res.end('<html><head></head></html>')).listen(5010)
  await shell(`drift url http://localhost:5010 wait 1000 run ./${target}/index.mjs args "${filter}"`)
  server.close()
}
// -------------------------------------------------------------------------------
// Build
// -------------------------------------------------------------------------------
export async function build(target = 'target/build') {
  await clean()
  await shell(`tsc -p src/tsconfig.json --outDir ${target} --declaration`)
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
