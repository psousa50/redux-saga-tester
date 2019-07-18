import { Action } from "redux"
import { call, CallEffect, ForkEffect, put, PutEffect, takeEvery } from "redux-saga/effects"
import { buildSagaScenario } from "../src"

describe("buildSagaScenario.build()", () => {
  const saga = { saga: true } as any
  const action = { type: "some-type" }
  const arg1 = { arg1: true } as any
  const arg2 = { arg2: true } as any
  const task = { task: true } as any
  const effect1 = { effect1: true } as any
  const effect2 = { effect2: true } as any
  const effect3 = { effect3: true } as any
  const returnedValue = { returnedValue: true } as any
  const error = { error: true } as any

  const getSagaScenario = () =>
    buildSagaScenario()
      .forSaga(saga)
      .withAction(action)
      .withArgs(arg1, arg2)
      .generateEffect(takeEvery(action.type, task, arg1, arg2))
      .generateEffect(effect1)
      .generateEffect(effect2)
      .returns(returnedValue)
      .generateEffect(effect3)
      .throws(error)

  it("builds a saga scenario", () => {
    const sagaScenario = getSagaScenario()

    const expectedSteps = [
      {
        effect: takeEvery(action.type, task, arg1, arg2),
      },
      {
        effect: effect1,
      },
      {
        effect: effect2,
        returnedValue,
      },
      {
        effect: effect3,
        error,
      },
    ]

    const expectedSagaScenario = {
      action,
      args: [arg1, arg2],
      saga,
      steps: expectedSteps,
    }
    expect(sagaScenario.build()).toEqual(expectedSagaScenario)
  })

  it("builds a saga scenario output", () => {
    const sagaScenario = getSagaScenario()

    const sagaOutput = sagaScenario.output()

    const forkEffect = {
      ["@@redux-saga/IO"]: true,
      FORK: {
        args: [action.type, task, arg1, arg2],
        context: null,
        fn: (sagaOutput.effects[0] as any).FORK.fn,
      },
    }
    const expectedScenarioOutput = {
      effects: [forkEffect, effect1, effect2, effect3],
      starved: true,
    }
    expect(sagaScenario.output()).toEqual(expectedScenarioOutput)
  })
})

describe("buildSagaScenario.run()", () => {
  interface SagaAction extends Action<string> {
    payload: number
  }
  type SagaEffects = CallEffect | PutEffect<SagaAction>
  const subscribedAction: SagaAction = { type: "some-type", payload: 1 }
  const arg1 = () => ({ arg1: true } as any)
  const buildArg2 = (f: () => number) => () => ({ type: "arg2", payload: f() } as SagaAction)
  const arg2 = buildArg2(() => 3)

  const okAction = { type: "ok-type", payload: 10 }
  const failAction = { type: "fail-type", payload: 20 }
  const errorAction = { type: "error-type", payload: 30 }
  function* testSagaTask(arg11: () => boolean, arg22: () => SagaAction, action: SagaAction): IterableIterator<SagaEffects> {
    try {
      const result: boolean = yield call(arg11, action.payload)
      if (result) {
        yield put(okAction)
      } else {
        yield put(failAction)
      }
      yield put(arg22())
    } catch (error) {
       yield put(errorAction)
    }
  }

  function* testSaga(arg11: () => boolean, arg22: () => SagaAction): IterableIterator<ForkEffect> {
    yield takeEvery(subscribedAction.type, testSagaTask, arg11, arg22)
  }

  const getSagaScenario = () =>
    buildSagaScenario()
      .forSaga(testSaga)
      .withAction(subscribedAction)
      .withArgs(arg1, arg2)
      .generateEffect(takeEvery(subscribedAction.type, testSagaTask, arg1, arg2))
      .generateEffect(call(arg1, subscribedAction.payload))

  describe("verifies a correct saga", () => {
    it("when call returns true", () => {
      const sagaScenario = getSagaScenario()
        .returns(true)
        .generateEffect(put(okAction))
        .generateEffect(put(arg2()))

      expect(sagaScenario.run()).toEqual(sagaScenario.output())
    })

    it("when call returns false", () => {
      const sagaScenario = getSagaScenario()
        .returns(false)
        .generateEffect(put(failAction))
        .generateEffect(put(arg2()))

      expect(sagaScenario.run()).toEqual(sagaScenario.output())
    })

    it("when call throws an exception", () => {
      const errorMessage = "some-error"
      const sagaScenario = getSagaScenario()
        .throws(new Error(errorMessage))
        .generateEffect(put(errorAction))

      expect(sagaScenario.run()).toEqual(sagaScenario.output())
    })
  })

  describe("detected an incorrect saga", () => {
    it("when not starved", () => {
      const sagaScenario = getSagaScenario()
        .returns(true)
        .generateEffect(put(okAction))

      expect(sagaScenario.run().starved).toBeFalsy()
    })
  })
})
