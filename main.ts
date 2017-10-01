/**
 * Defines the main entry point. Loads the VM, points it to source code, and
 * runs it.
 */

// Provide defaults for debugging if not defined.
process.env['DEBUG'] = process.env['DEBUG'] || [
  'Mel:Argument',
  'Mel:Vm',
  'Mel:Kernel',
  'Mel:Registers',
  'Mel:Parser',
  'Mel:Memory',
  'Mel:Runtime',
  'Mel:Runtime:Debug',
  'Mel:I/O'
].join(',')
console.log('Main entry> DEBUG=', process.env['DEBUG'])

process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p);
  })
  .on('uncaughtException', err => {
    console.error(err, 'Uncaught Exception thrown');
    process.exit(1);
  });

import { Vm } from './Vm'
const vm = new Vm()
console.log('Main entry> Running program...')
vm.run('source.s')
  .then(() => {
    console.log('Main entry> Exit.')
  })