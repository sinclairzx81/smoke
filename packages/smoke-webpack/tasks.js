shell_options({ trace: false })

const package = require(`${process.cwd()}/package.json`)

/** Cleans this project. */
export async function clean() {
  await shell('shx rm -rf public')
  await shell('shx rm -rf node_modules')
}

/** Builds this project. */
export async function build() {
  await shell('webpack --config src/program/webpack.config.js --mode production')
  await shell('shx cp -R src/pages/* public/bin')
}

/** Builds the project if not already built. */
export async function conditional_build() {
  if(!exists('public/bin/index.js')) {
    await build()
  }
}

/** Builds and starts this project. */
export async function start() {
  await conditional_build()
  await shell('smoke-web public/bin')
}

/** Watches this project. */
export async function watch() {
  await conditional_build()
  await Promise.all([
    shell('webpack --config src/program/webpack.config.js --mode development --watch'),
    shell('smoke-run src/pages/\\{**,.\\}/** -- shx cp -r src/pages/* public/bin'),
    shell('smoke-web public/bin')
  ])
}

/** Runs tests for this project. */
export async function test() {
  await shell('webpack --config test/webpack.config.js --mode development')
  await shell('cd test && karma start ./karma.config.js')
}

/** Packs this project for NPM deployment. */
export async function pack() {
  await build()
  await shell('shx rm -rf public/pack')
  await shell('shx mkdir  public/pack')
  await shell('shx cp -R public/bin/* public/pack')
}
