/**
 * Defines the main entry point. Loads the VM, points it to source code, and
 * runs it.
 */

// Provide defaults for debugging if not defined.
process.env['DEBUG'] = process.env['DEBUG'] || [
  'Mel:Vm',
  'Mel:Kernel',
  'Mel:Registers',
  'Mel:Parser',
  'Mel:Memory',
  'Mel:Interpreter',
  'Mel:Interpreter:Debug',
  'Mel:I/O'
].join(',')

import { Vm } from './Vm'
const vm = new Vm()
vm.run('source.s')