# Redux Saga Tester

## Description

A library to help redux sagas testing.

### The ideia

- build a Saga scenario
- expected the run of the saga scenario to be as expected

Example:

Imagine the following saga and respective task:

```typescript
interface TestSagaAction extends Action<string> {
  payload: number
}
type TestSagaEffects = CallEffect | PutEffect<TestSagaAction>
const subscribedAction: TestSagaAction = { type: "some-type", payload: 1 }
const okAction = { type: "ok-type", payload: 2 }
const failAction = { type: "fail-type", payload: 10 }

const subscribedAction: SagaAction = { type: "some-type", payload: 1 }
function* testSaga(arg1: () => boolean): IterableIterator<ForkEffect> {
  yield takeEvery(subscribedAction.type, testSagaTask, arg11, arg22)
}

function* testSagaTask(arg1: () => boolean, action: TestSagaAction): IterableIterator<TestSagaEffects> {
  try {
    const result: boolean = yield call(arg11, action.payload)
    if (result) {
      yield put(okAction)
    } else {
      yield put(failAction)
    }
    yield put(arg1())
  } catch (error) {
    yield put(errorAction)
  }
}
```

To test this saga we first build a saga scenario using a fluent API and then expect that when the saga "runs" it will generate the expected effects:

```typescript
    it("runs testSaga correctly", () => {
      const sagaScenario =
        .forSaga(testSaga)
        .withAction(subscribedAction)
        .withArgs(arg1, arg2)
        .generateEffect(takeEvery(subscribedAction.type, testSagaTask, arg1, arg2))
        .generateEffect(call(arg1, subscribedAction.payload))
        .returns(true)
        .generateEffect(put(okAction))
        .generateEffect(put(arg2()))

      expect(sagaScenario.run()).toEqual(sagaScenario.output())
    })
```

## Installation

To install the stable version:

```bash
yarn install @psousa50/redux-saga-tester
```

## Using the extension

## Building
