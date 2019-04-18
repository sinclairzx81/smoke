export async function clean() {
  await shell('smoke-pack clean')
  await drop('node_modules')
}

export async function bench() {
  await Promise.all([
    shell('smoke-pack watch smoke-hub'),
    shell('smoke-pack watch bench')
  ])
}

// pack
export async function pack() {
  await shell('smoke-pack pack smoke-hub')
  await shell('smoke-pack pack smoke-node')
}

export async function test() {
  await shell('smoke-pack test smoke-node')
}

export async function doc() {
  await shell('cd packages/smoke-node && npm install')
  await shell('smoke-pack run smoke-node doc')
  await shell('shx cp -r packages/smoke-node/public/doc/. ./docs/')
}
