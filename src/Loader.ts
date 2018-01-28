/**
 * Defines the main entry point. Loads the VM, points it to source code, and
 * runs it.
 */

import * as fs from 'fs'
import * as Debug from 'debug'

const log = Debug('Mel:Loader')

process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p)
  })
  .on('uncaughtException', err => {
    console.error(err, 'Uncaught Exception thrown')
    process.exit(1)
  })

import { Machine } from './Machine'
const vm = new Machine()

const filename = process.argv[2]

if (!filename) {
  console.error(`No filename provided.`)
  process.exit(1)
}

log(`Running file %s...`, filename)
const program = fs.readFileSync(filename, 'utf-8')
vm.run(program)
  .then(() => {
    process.exit(0)
  })