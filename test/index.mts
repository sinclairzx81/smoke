// ------------------------------------------------------------------
// Harness
// ------------------------------------------------------------------
import { Test } from './test/index.mjs'

// ------------------------------------------------------------------
// Modules
// ------------------------------------------------------------------
import './async/index.mjs'
import './buffer/index.mjs'
import './channel/index.mjs'
import './crypto/index.mjs'
import './events/index.mjs'
import './filesystem/index.mjs'
import './http/index.mjs'
import './net/index.mjs'
import './os/index.mjs'
import './proxy/index.mjs'

// ------------------------------------------------------------------
// Drift
// ------------------------------------------------------------------
declare const Drift: any

// ------------------------------------------------------------------
// Runner
// ------------------------------------------------------------------
function resolve_filter() {
  if ('Drift' in globalThis) return Drift.args[0]
  const searchParams = new URLSearchParams(window.location.search)
  return searchParams.get('filter') ?? ''
}

Test.run({ filter: resolve_filter() }).then((result) => {
  if ('Drift' in globalThis) return result.success ? Drift.close(0) : Drift.close(1)
  console.log(result)
})
