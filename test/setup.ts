/**
 * Expect and log functions for tests.
 */

import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as Debug from 'debug';

chai.use(chaiAsPromised)
export const expect = chai.expect
export const log = Debug('Mel:Test');