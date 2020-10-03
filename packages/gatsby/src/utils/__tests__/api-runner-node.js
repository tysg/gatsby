const apiRunnerNode = require(`../api-runner-node`)
const reporter = require(`gatsby-cli/lib/reporter`)

jest.mock(`../../redux`, () => {
  return {
    store: {
      getState: jest.fn(),
    },
    emitter: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }
})

const start = jest.fn()
const end = jest.fn()

const mockActivity = {
  start,
  end,
  done: end,
}

jest.mock(`gatsby-cli/lib/reporter`, () => {
  return {
    activityTimer: jest.fn(() => mockActivity),
    createProgress: jest.fn(() => mockActivity),
    panicOnBuild: jest.fn(),
  }
})

const { store, emitter } = require(`../../redux`)

beforeEach(() => {
  store.getState.mockClear()
  emitter.on.mockClear()
  emitter.off.mockClear()
  emitter.emit.mockClear()

  // mockActivity is mutated so that mockActivity.start is no longer a mock fn; reset it
  mockActivity.start = start
  mockActivity.end = end
  mockActivity.done = end
  mockActivity.start.mockClear()
  mockActivity.end.mockClear()
})

xit(`Ends activities if plugin didn't end them`, async () => {
  jest.doMock(
    `test-plugin-correct/gatsby-node`,
    () => {
      return {
        testAPIHook: ({ reporter }) => {
          const spinnerActivity = reporter.activityTimer(
            `control spinner activity`
          )
          spinnerActivity.start()
          // calling activity.end() to make sure api runner doesn't call it more than needed
          spinnerActivity.end()

          const progressActivity = reporter.createProgress(
            `control progress activity`
          )
          progressActivity.start()
          // calling activity.done() to make sure api runner doesn't call it more than needed
          progressActivity.done()
        },
      }
    },
    { virtual: true }
  )
  jest.doMock(
    `test-plugin-spinner/gatsby-node`,
    () => {
      return {
        testAPIHook: ({ reporter }) => {
          const activity = reporter.activityTimer(`spinner activity`)
          activity.start()
          // not calling activity.end() - api runner should do end it
        },
      }
    },
    { virtual: true }
  )
  jest.doMock(
    `test-plugin-progress/gatsby-node`,
    () => {
      return {
        testAPIHook: ({ reporter }) => {
          const activity = reporter.createProgress(`progress activity`, 100, 0)
          activity.start()
          // not calling activity.end() or done() - api runner should do end it
        },
      }
    },
    { virtual: true }
  )
  jest.doMock(
    `test-plugin-spinner-throw/gatsby-node`,
    () => {
      return {
        testAPIHook: ({ reporter }) => {
          const activity = reporter.activityTimer(
            `spinner activity with throwing`
          )
          activity.start()
          throw new Error(`error`)
          // not calling activity.end() - api runner should do end it
        },
      }
    },
    { virtual: true }
  )
  jest.doMock(
    `test-plugin-progress-throw/gatsby-node`,
    () => {
      return {
        testAPIHook: ({ reporter }) => {
          const activity = reporter.createProgress(
            `progress activity with throwing`,
            100,
            0
          )
          activity.start()
          throw new Error(`error`)
          // not calling activity.end() or done() - api runner should do end it
        },
      }
    },
    { virtual: true }
  )
  store.getState.mockImplementation(() => {
    return {
      program: {},
      config: {},
      flattenedPlugins: [
        {
          name: `test-plugin-correct`,
          resolve: `test-plugin-correct`,
          nodeAPIs: [`testAPIHook`],
        },
        {
          name: `test-plugin-spinner`,
          resolve: `test-plugin-spinner`,
          nodeAPIs: [`testAPIHook`],
        },
        {
          name: `test-plugin-progress`,
          resolve: `test-plugin-progress`,
          nodeAPIs: [`testAPIHook`],
        },
        {
          name: `test-plugin-spinner-throw`,
          resolve: `test-plugin-spinner-throw`,
          nodeAPIs: [`testAPIHook`],
        },
        {
          name: `test-plugin-progress-throw`,
          resolve: `test-plugin-progress-throw`,
          nodeAPIs: [`testAPIHook`],
        },
      ],
    }
  })
  await apiRunnerNode(`testAPIHook`)

  expect(start).toBeCalledTimes(6)
  // we called end same amount of times we called start, even tho plugins
  // didn't call end/done themselves
  expect(end).toBeCalledTimes(6)
})

it(`Shows correct file path when an async error is thrown`, async () => {
  // jest.doMock(
  //   `test-plugin-throw-async-error/gatsby-node`,
  //   () => require(`./fixtures/async-throw/gatsby-node`),
  //   { virtual: true }
  // )

  // jest.spyOn(mockErrorNode, )
  store.getState.mockImplementation(() => {
    return {
      program: {},
      config: {},
      flattenedPlugins: [
        {
          name: `test-plugin-throw-async-error`,
          resolve: `./__tests__/fixtures/async-throw`,
          nodeAPIs: [`testAPIHook`],
        },
      ],
    }
  })

  await apiRunnerNode(`testAPIHook`)
  expect(reporter.panicOnBuild).toBeCalledWith(
    expect.objectContaining({
      filePath: expect.stringMatching(/^async/),
    })
  )
})
