import { takeEvery } from "redux-saga/effects"
import { SagaInfo } from "./buildSaga"

type CheckEqual = (actual: any, expected: any) => boolean
export const buildTestSaga = (checkEqual: CheckEqual) => <S, T, A extends string>(sagaInfo: SagaInfo<S, T, A>) => {

  const checkStarved = () => {
    const starved = taskIiterator.next().done
    checkEqual(starved, true)
  }

  let value: any
  let error: any
  const { task, operations } = sagaInfo

  const sagaIterator = sagaInfo.saga!(sagaInfo.action, sagaInfo.task, ...sagaInfo.args)
  const actionType = sagaInfo.action!.type
  const sagaType = (sagaIterator.next().value as any).FORK.args[0]
  const expectedType = takeEvery(actionType, sagaInfo.task!, sagaInfo.args).FORK.args[0]
  checkEqual(sagaType, expectedType)

  const taskIiterator = task!(...sagaInfo.args, sagaInfo.action)
  operations.forEach(operation => {
    if (error) {
      checkEqual(taskIiterator.throw!(error).value, operation.effect)
    } else {
      checkEqual(taskIiterator.next(value).value, operation.effect)
      value = operation.value
      error = operation.error
    }
  })

  checkStarved()
}

const expectEqual: CheckEqual = (actual, expected) => {
  expect(actual).toEqual(expected)
  return actual === expected
}

export const testSaga = buildTestSaga(expectEqual)
