shell_options({ trace: false })

const package = require(`${process.cwd()}/package.json`)

export async function clean() {
  await shell('shx rm -rf public')
  await shell('shx rm -rf node_modules')
}

export async function build() {
  await shell('tsc-bundle src/tsconfig.json --outFile public/bin/index.js')
  await shell('shx cp src/start.js public/bin')
}

export async function conditional_build() {
  if(!exists('public/bin/index.js')) {
    await build()
  }
}

export async function start() {
  await conditional_build()
  await shell('node public/bin/index.js --port 5001 --config ./ice.json --trace')
}

export async function watch() {
  await conditional_build()
  await Promise.all([
    shell('tsc-bundle src/tsconfig.json --outFile public/bin/index.js --watch'),
    shell('smoke-run public/bin/index.js -- node public/bin/index.js --port 5001 --config ./ice.json --trace')
  ])
}

export async function test() {
  await shell('tsc-bundle test/tsconfig.json --outFile public/test/index.js')
  await shell('mocha public/test/index.js')
}

export async function pack() {
  await build()
  await shell('shx rm -rf public/pack')
  await shell('shx mkdir public/pack')
  await shell('shx cp public/bin/* public/pack')
  await shell('shx cp package.json public/pack')
  await shell('shx cp readme.md    public/pack')
  await shell('shx cp license      public/pack')
  await shell('cd public/pack && npm pack')
}

export async function install_cli () {
  await pack()
  await shell(`npm install public/pack/${package.name}-${package.version}.tgz -g`)
}