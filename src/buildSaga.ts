import { Action } from "redux"
import { Effect } from "redux-saga"

type Task<T> = (...args: any[]) => IterableIterator<T>

export type SagaInfo<S, T, A extends string> = {
  saga?: Task<S>
  action?: Action<A>
  task?: Task<T>
  args: any[]
  operations: SagaOperation[]
}

export type SagaOperation = {
  effect?: Effect
  value?: any
  error?: any
}

export const buildSaga = <S, T, A extends string>() => {
  const updateSaga = (sagaInfo: SagaInfo<S, T, A>) => {
    const addOperation = (operation: SagaOperation) =>
      updateSaga({ ...sagaInfo, operations: [...sagaInfo.operations, operation] })

    const updataLastOperation = (operation: SagaOperation) => {
      const last = sagaInfo.operations[sagaInfo.operations.length - 1]
      const newSaga = {
        ...sagaInfo,
        operations: [...sagaInfo.operations.slice(0, -1), { ...last, ...operation }],
      }
      return updateSaga(newSaga)
    }

    const returns = (value?: any) => {
      const o = updataLastOperation({ value })
      return {
        build: o.build,
        effect: o.effect,
      }
    }

    const throws = (error?: any) => {
      const o = updataLastOperation({ error })
      return {
        build: o.build,
        effect: o.effect,
      }
    }

    const effect = (effect2: Effect) => {
      const o = addOperation({ effect: effect2 })
      return {
        build: o.build,
        effect: o.effect,
        returns: o.returns,
        throws: o.throws,
      }
    }

    const andArgs = (...args: any[]) => {
      const o = updateSaga({ ...sagaInfo, args })
      return {
        build: o.build,
        effect: o.effect,
      }
    }

    const andTask = (task: Task<T>) => {
      const o = updateSaga({ ...sagaInfo, task })
      return {
        andArgs: o.andArgs,
        build: o.build,
        effect: o.effect,
      }
    }

    const withAction = (action: Action<A>) => {
      const o = updateSaga({ ...sagaInfo, action })
      return {
        andTask: o.andTask,
      }
    }

    const forSaga = (saga: Task<S>) => {
      const o = updateSaga({ ...sagaInfo, saga })
      return {
        withAction: o.withAction,
      }
    }

    const build = () => sagaInfo

    return {
      andArgs,
      andTask,
      build,
      effect,
      forSaga,
      returns,
      throws,
      withAction,
    }
  }

  const initialSaga = { args: [], operations: [] }

  return {
    forSaga: updateSaga(initialSaga).forSaga,
  }
}
