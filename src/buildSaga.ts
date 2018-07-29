import { Action } from "redux"
import { Effect as SagaEffect } from "redux-saga"

type Task<T> = (...args: any[]) => IterableIterator<T>

export type SagaInfo<S, T, A extends string> = {
  saga?: Task<S>
  action?: Action<A>
  task?: Task<T>
  args: any[]
  operations: SagaOperation[]
}

export type SagaOperation = {
  effect?: SagaEffect
  value?: any
  error?: any
}

type Build = <S, T, A extends string>() => SagaInfo<S, T, A>
type Returns = (value?: any) => Pick<SagaBuilder, "build" | "effect">
type Throws = (error?: any) => Pick<SagaBuilder, "build" | "effect">
type Effect = (effect: SagaEffect) => Pick<SagaBuilder, "build" | "effect" | "returns" | "throws">
type WithArgs = (...args: any[]) => Pick<SagaBuilder, "build" | "effect">
type AndTask = <T>(task: Task<T>) => Pick <SagaBuilder, "build" | "effect" | "withArgs">
type WithAction = <A extends string>(action: Action<A>) => Pick <SagaBuilder, "andTask">
type ForSaga = <S>(saga: Task<S>) => Pick<SagaBuilder, "withAction">

interface SagaBuilder {
  forSaga: ForSaga
  withAction: WithAction
  andTask: AndTask
  withArgs: WithArgs
  effect: Effect
  returns: Returns
  throws: Throws
  build: Build
}

type BuildSaga = () => Pick<SagaBuilder, "forSaga">
export const buildSaga: BuildSaga = () => {
  const updateSaga = <S, T, A extends string>(sagaInfo: SagaInfo<S, T, A>) => {
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

    const returns: Returns = value => {
      const o = updataLastOperation({ value })
      return {
        build: o.build,
        effect: o.effect,
      } as ReturnType<Returns>
    }

    const throws: Throws = error => {
      const o = updataLastOperation({ error })
      return {
        build: o.build,
        effect: o.effect,
      }  as ReturnType<Throws>
    }

    const effect: Effect = e => {
      const o = addOperation({ effect: e })
      return {
        build: o.build,
        effect: o.effect,
        returns: o.returns,
        throws: o.throws,
      } as ReturnType<Effect>
    }

    const withArgs: WithArgs = (...args) => {
      const o = updateSaga({ ...sagaInfo, args })
      return {
        build: o.build,
        effect: o.effect,
      } as ReturnType<WithArgs>
    }

    const andTask: AndTask = task => {
      const o = updateSaga({ ...sagaInfo, task })
      return {
        build: o.build,
        effect: o.effect,
        withArgs: o.withArgs,
      } as ReturnType<AndTask>
    }

    const withAction: WithAction = action => {
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
      andTask,
      build,
      effect,
      forSaga,
      returns,
      throws,
      withAction,
      withArgs,
    }
  }

  const initialSaga = { args: [], operations: [] }

  return {
    forSaga: updateSaga(initialSaga).forSaga,
  }
}
