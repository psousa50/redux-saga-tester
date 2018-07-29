import { buildSaga } from "../src/buildSaga"

describe("buildSaga", () => {
  it("builds a saga", () => {
    const saga = { saga: true } as any
    const action = { type: "some-type" }
    const arg1 = { arg1: true } as any
    const arg2 = { arg2: true } as any
    const task = { task: true } as any
    const effect1 = { effect1: true } as any
    const effect2 = { effect2: true } as any
    const effect3 = { effect3: true } as any
    const value = { value: true } as any
    const error = { error: true } as any

    const sagaInfo = buildSaga()
      .forSaga(saga)
      .withAction(action)
      .andTask(task)
      .andArgs(arg1, arg2)
      .effect(effect1)
      .effect(effect2)
      .returns(value)
      .effect(effect3)
      .throws(error)
      .build()

    const expectedOperations = [
      {
        effect: effect1,
      },
      {
        effect: effect2,
        value,
      },
      {
        effect: effect3,
        error,
      },
    ]

    const expectedSaga = {
      action,
      args: [arg1, arg2],
      operations: expectedOperations,
      saga,
      task,
    }

    expect(sagaInfo).toEqual(expectedSaga)
  })
})
