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
      .taking(takeEvery)
      .withAction(action)
      .andTask(task)
      .withArgs(arg1, arg2)
      .generateEffect(effect1)
      .generateEffect(effect2)
      .returns(returnedValue)
      .generateEffect(effect3)
      .throws(error)

  it("builds a saga scenario", () => {
    const sagaScenario = getSagaScenario()

    const expectedSteps = [
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
      forkEffect: takeEvery,
      saga,
      steps: expectedSteps,
      task,
    }
    expect(sagaScenario.build()).toEqual(expectedSagaScenario)
  })

  it("builds a saga scenario output", () => {
    const sagaScenario = getSagaScenario()

    const forkEffect = {
      FORK: {
        args: [action.type],
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
  const arg = () => ({ arg1: true })
  const okAction = { type: "ok-type", payload: 2 }
  const failAction = { type: "fail-type", payload: 10 }
  const allAction = { type: "all-type", payload: 20 }
  const errorAction = { type: "error-type", payload: 30 }

  function* correctSagaTask(arg1: () => boolean, action: SagaAction): IterableIterator<SagaEffects> {
    try {
      const result: boolean = yield call(arg1, action.payload)
      if (result) {
        yield put(okAction)
      } else {
        yield put(failAction)
      }
      yield put(allAction)
    } catch (error) {
      yield put(errorAction)
    }
  }

  // function* incorrectSagaTask(arg1: () => boolean, action: SagaAction): IterableIterator<SagaEffects> {
  //   try {
  //     const result: boolean = yield call(arg1, action.payload)
  //     if (!result) {
  //       yield put(okAction)
  //     } else {
  //       yield put(failAction)
  //     }
  //   } catch (error) {
  //     yield put(errorAction)
  //   }
  // }

  function* correctSaga(arg1: () => boolean): IterableIterator<ForkEffect> {
    yield takeEvery(subscribedAction.type, correctSagaTask, arg1)
  }

  // function* incorrectSaga(arg1: () => boolean): IterableIterator<ForkEffect> {
  //   yield takeEvery(subscribedAction.type, incorrectSagaTask, arg1)
  // }

  // function* incorrectSagaType(arg1: () => boolean): IterableIterator<ForkEffect> {
  //   yield takeEvery("WrongType", incorrectSagaTask, arg1)
  // }

  describe("verifies a correct saga", () => {
    const getSagaScenario = () =>
      buildSagaScenario()
        .forSaga(correctSaga)
        .taking(takeEvery)
        .withAction(subscribedAction)
        .andTask(correctSagaTask)
        .withArgs(arg)
        .generateEffect(call(arg, subscribedAction.payload))

    it("when call returns true", () => {
      const sagaScenario = getSagaScenario()
        .returns(true)
        .generateEffect(put(okAction))
        .generateEffect(put(allAction))

      expect(sagaScenario.run()).toEqual(sagaScenario.output())
    })

    it("when call returns false", () => {
      const sagaScenario = getSagaScenario()
        .returns(false)
        .generateEffect(put(failAction))
        .generateEffect(put(allAction))

      expect(sagaScenario.run()).toEqual(sagaScenario.output())
    })

    it("when call that throwss an exception", () => {
      const errorMessage = "some-error"
      const sagaScenario = getSagaScenario()
        .throws(new Error(errorMessage))
        .generateEffect(put(errorAction))

      expect(sagaScenario.run()).toEqual(sagaScenario.output())
    })
  })

  describe("detected an incorrect saga", () => {
    it("when not starved", () => {
      const sagaScenario = buildSagaScenario()
        .forSaga(correctSaga)
        .taking(takeEvery)
        .withAction(subscribedAction)
        .andTask(correctSagaTask)
        .withArgs(arg)
        .generateEffect(call(arg, subscribedAction.payload))
        .returns(true)
        .generateEffect(put(okAction))

      expect(sagaScenario.run().starved).toBeFalsy()
    })
  })
})
