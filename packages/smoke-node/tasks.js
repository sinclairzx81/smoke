shell_options({ trace: true })

export async function clean() {
  await shell('shx rm -rf public')
  await shell('shx rm -rf node_modules')
}

export async function build() {
  await shell('tsc --project src/tsconfig.json --outDir public/bin --declaration')
  await shell('shx cp package.json public/bin')
}

export async function conditional_build() {
  if(!exists('public/bin/package.json')) {
    await build()
  }
}

export async function start() {
  await conditional_build()
  await shell('node public/bin/index.js')
}

export async function watch() {
  await conditional_build()
  await shell('tsc --project src/tsconfig.json --outDir public/bin --declaration --watch')
}

export async function test() {
  await shell('webpack --config test/webpack.config.js --mode development')
  await shell('cd test && karma start ./karma.config.js')
}

export async function doc() {
  await shell('typedoc --tsconfig ./src/tsconfig.json --out ./public/doc')
}

export async function pack() {
  await build()
  await shell('shx rm -rf public/pack')
  await shell('shx mkdir public/pack')
  await shell('shx cp -r public/bin/* public/pack')
  await shell('shx cp -r package.json public/pack')
  await shell('shx cp -r readme.md    public/pack')
  await shell('shx cp -r license      public/pack')
  await shell('cd public/pack && npm pack')
}