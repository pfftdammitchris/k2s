import nock from 'nock'

before(() => {
  process.stdout.write('\x1Bc')
})

afterEach(() => {
  nock.cleanAll()
})
