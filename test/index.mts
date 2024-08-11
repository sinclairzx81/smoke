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

// ------------------------------------------------------------------
// Runner
// ------------------------------------------------------------------
declare const Drift: any
if ('Drift' in globalThis) {
  Test.run({ filter: Drift.args[0] }).then((result) => {
    return result.success ? Drift.close(0) : Drift.close(1)
  })
} else {
  Test.run({ filter: '' }).then((result) => {
    console.log('done', result)
  })
}
