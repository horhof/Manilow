/**
 * Defines the main entry point. Loads the VM, points it to source code, and
 * runs it.
 */

import { Vm } from './Vm'

process.env['DEBUG'] = [
  'Mel:Vm',
  'Mel:Parser',
  'Mel:Memory',
  'Mel:Interpreter',
  'Mel:Interpreter:Debug',
  'Mel:I/O'
].join(',')

const vm = new Vm()
vm.run('source.s')