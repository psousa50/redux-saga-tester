import { takeEvery } from "redux-saga/effects"
import { SagaDescription } from "./buildSaga"

type CheckEqual = (actual: any, expected: any) => boolean
export const buildTestSaga = (checkEqual: CheckEqual) => <S, T, A extends string>(
  sagaDescription: SagaDescription<S, T, A>,
) => {
  const checkStarved = () => {
    const starved = taskIiterator.next().done
    checkEqual(starved, true)
  }

  let returnedValue: any
  let error: any
  const { task, operations } = sagaDescription

  const sagaIterator = sagaDescription.saga!(sagaDescription.action, sagaDescription.task, ...sagaDescription.args)
  const actionType = sagaDescription.action!.type
  const sagaType = (sagaIterator.next().value as any).FORK.args[0]
  const expectedType = takeEvery(actionType, sagaDescription.task!, sagaDescription.args).FORK.args[0]
  checkEqual(sagaType, expectedType)

  const taskIiterator = task!(...sagaDescription.args, sagaDescription.action)
  operations.forEach(operation => {
    if (error) {
      const value = taskIiterator.throw!(error)
      checkEqual(value.value, operation.effect)
    } else {
      const value = taskIiterator.next(returnedValue)
      checkEqual(value.value, operation.effect)
      returnedValue = operation.returnedValue
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
