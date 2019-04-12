export async function clean() {
  await shell('smoke-pack clean')
  await drop('node_modules')
}

export async function webpack() {
  await Promise.all([
    shell('smoke-pack watch smoke-hub'),
    shell('smoke-pack watch smoke-webpack')
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
  await shell('smoke-pack run smoke-node doc')
}
