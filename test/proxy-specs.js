// transpile:mocha
/* global describe:true, it:true */

import { proxy } from '../..';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
//import Q from 'q';
import 'mochawait';

let should = chai.should();
chai.use(chaiAsPromised);

describe('proxy', () => {
  it('should exist', async () => {
    should.exist(proxy);
  });
});
