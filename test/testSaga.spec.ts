import { Action } from "redux"
import { call, CallEffect, ForkEffect, put, PutEffect, takeEvery } from "redux-saga/effects"
import { buildSaga } from "../src/buildSaga"
import { buildTestSaga } from "../src/testSaga"

describe("testSaga", () => {
  interface SagaAction extends Action<string> {
    payload: number
  }
  type SagaEffects = CallEffect | PutEffect<SagaAction>
  const subscribedAction: SagaAction = { type: "some-type", payload: 1 }
  const okAction = { type: "ok-type", payload: 2 }
  const failAction = { type: "fail-type", payload: 10 }
  const errorAction = { type: "error-type", payload: 20 }

  function* correctSagaTask(arg1: () => boolean, action: SagaAction): IterableIterator<SagaEffects> {
    try {
      const result: boolean = yield call(arg1, action.payload)
      if (result) {
        yield put(okAction)
      } else {
        yield put(failAction)
      }
    } catch (error) {
      yield put(errorAction)
    }
  }

  function* incorrectSagaTask(arg1: () => boolean, action: SagaAction): IterableIterator<SagaEffects> {
    try {
      const result: boolean = yield call(arg1, action.payload)
      if (!result) {
        yield put(okAction)
      } else {
        yield put(failAction)
      }
    } catch (error) {
      yield put(errorAction)
    }
  }

  function* correctSaga(arg1: () => boolean): IterableIterator<ForkEffect> {
    yield takeEvery(subscribedAction.type, correctSagaTask, arg1)
  }

  function* incorrectSaga(arg1: () => boolean): IterableIterator<ForkEffect> {
    yield takeEvery(subscribedAction.type, incorrectSagaTask, arg1)
  }

  function* incorrectSagaType(arg1: () => boolean): IterableIterator<ForkEffect> {
    yield takeEvery("WrongType", incorrectSagaTask, arg1)
  }

  describe("test is successfully", () => {
    const checkEqual = (actual: any, expected: any) => {
      expect(actual).toEqual(expected)
      return true
    }
    const arg1 = () => undefined as any

    it("arg1 returns true", () => {
      const sagaInfo = buildSaga()
        .forSaga(correctSaga)
        .withAction(subscribedAction)
        .andTask(correctSagaTask)
        .andArgs(arg1)
        .effect(call(arg1, subscribedAction.payload))
        .returns(true)
        .effect(put(okAction))
        .build()

      const testSaga = buildTestSaga(checkEqual)
      testSaga(sagaInfo)
    })

    it("arg1 returns false", () => {
      const sagaInfo = buildSaga()
        .forSaga(correctSaga)
        .withAction(subscribedAction)
        .andTask(correctSagaTask)
        .andArgs(arg1)
        .effect(call(arg1, subscribedAction.payload))
        .returns(false)
        .effect(put(failAction))
        .build()

      const testSaga = buildTestSaga(checkEqual)
      testSaga(sagaInfo)
    })

    it("arg1 throws an error", () => {
      const sagaInfo = buildSaga()
        .forSaga(correctSaga)
        .withAction(subscribedAction)
        .andTask(correctSagaTask)
        .andArgs(arg1)
        .effect(call(arg1, subscribedAction.payload))
        .throws("error")
        .effect(put(errorAction))
        .build()

      const testSaga = buildTestSaga(checkEqual)
      testSaga(sagaInfo)
    })
  })

  describe("test fails", () => {
    it("saga subscribes the wrong type", () => {
      const checkEqual = (actual: any, expected: any) => {
        if (expected === subscribedAction.type) {
          expect(actual).not.toEqual(expected)
        } else {
          expect(actual).toEqual(expected)
        }
        return true
      }

      const arg1 = () => true
      const sagaInfo = buildSaga()
        .forSaga(incorrectSagaType)
        .withAction(subscribedAction)
        .andTask(correctSagaTask)
        .andArgs(arg1)
        .effect(call(arg1, subscribedAction.payload))
        .returns(true)
        .effect(put(okAction))
        .build()

      const testSaga = buildTestSaga(checkEqual)
      testSaga(sagaInfo)
    })

    it("saga is incorrectly implemented", () => {
      const checkEqual = (actual: any, expected: any) => {
        if (expected.PUT) {
          expect(actual).not.toEqual(expected)
        } else {
          expect(actual).toEqual(expected)
        }
        return true
      }

      const arg1 = () => true
      const sagaInfo = buildSaga()
        .forSaga(incorrectSaga)
        .withAction(subscribedAction)
        .andTask(incorrectSagaTask)
        .andArgs(arg1)
        .effect(call(arg1, subscribedAction.payload))
        .returns(true)
        .effect(put(okAction))
        .build()

      const testSaga = buildTestSaga(checkEqual)
      testSaga(sagaInfo)
    })

    it("saga is not starved", () => {
      const checkEqual = (actual: any, expected: any) => {
        if (expected === true) {
          expect(actual).not.toEqual(expected)
        } else {
          expect(actual).toEqual(expected)
        }
        return true
      }

      const arg1 = () => true
      const sagaInfo = buildSaga()
        .forSaga(correctSaga)
        .withAction(subscribedAction)
        .andTask(correctSagaTask)
        .andArgs(arg1)
        .effect(call(arg1, subscribedAction.payload))
        .returns(true)
        .build()

      const testSaga = buildTestSaga(checkEqual)
      testSaga(sagaInfo)
    })
  })
})
