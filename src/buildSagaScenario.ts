import { Action } from "redux"
import { Effect as ReduxSagaEffect } from "redux-saga"
import { takeEvery, takeLatest } from "redux-saga/effects"

type Task<T> = (...args: any[]) => IterableIterator<T>
type ForkEffectHelper = typeof takeEvery | typeof takeLatest

export type SagaScenario<S, T, A extends string> = {
  saga?: Task<S>
  forkEffect?: ForkEffectHelper
  action?: Action<A>
  task?: Task<T>
  args: any[]
  steps: SagaStep[]
}

export type SagaStep = {
  effect?: ReduxSagaEffect
  returnedValue?: any
  error?: any
}

export type SagaOutput = {
  effects: ReduxSagaEffect[]
  starved: boolean
}

type BuildSagaScenario = () => Pick<SagaBuilder, "forSaga">
type ForSaga = <S extends ReduxSagaEffect>(saga: Task<S>) => Pick<SagaBuilder, "taking">
type Taking = (forkEffect: ForkEffectHelper) => Pick<SagaBuilder, "withAction">
type WithAction = <A extends string>(action: Action<A>) => Pick<SagaBuilder, "andTask">
type AndTask = <T extends ReduxSagaEffect>(task: Task<T>) => Pick<SagaBuilder, "generateEffect" | "withArgs">
type WithArgs = (...args: any[]) => Pick<SagaBuilder, "generateEffect">
type GenerateEffect = (generateEffect: ReduxSagaEffect) => Pick<SagaBuilder, "run" | "build" | "output" | "generateEffect" | "returns" | "throws">
type Returns = (returnedValue?: any) => Pick<SagaBuilder, "run" | "build" | "output" | "generateEffect">
type Throws = (error?: any) => Pick<SagaBuilder, "run" | "build" | "output" | "generateEffect">
type Build = <S extends ReduxSagaEffect, T extends ReduxSagaEffect, A extends string>() => SagaScenario<S, T, A>
type Run = <S extends ReduxSagaEffect, T extends ReduxSagaEffect, A extends string>() => SagaOutput
type Output = <S extends ReduxSagaEffect, T extends ReduxSagaEffect, A extends string>() => SagaOutput

interface SagaBuilder {
  forSaga: ForSaga
  taking: Taking
  withAction: WithAction
  andTask: AndTask
  withArgs: WithArgs
  generateEffect: GenerateEffect
  returns: Returns
  throws: Throws
  build: Build
  run: Run
  output: Output
}

export const buildSagaScenario: BuildSagaScenario = () => {
  const updateSagaScenario = <S extends ReduxSagaEffect, T extends ReduxSagaEffect, A extends string>(sagaScenario: SagaScenario<S, T, A>) => {
    const addStep = (sagaStep: SagaStep) => updateSagaScenario({ ...sagaScenario, steps: [...sagaScenario.steps, sagaStep] })

    const updataLastStep = (sagaStep: SagaStep) => {
      const last = sagaScenario.steps[sagaScenario.steps.length - 1]
      const newSaga = {
        ...sagaScenario,
        steps: [...sagaScenario.steps.slice(0, -1), { ...last, ...sagaStep }],
      }
      return updateSagaScenario(newSaga)
    }

    const returns: Returns = returnedValue => {
      const o = updataLastStep({ returnedValue })
      return {
        generateEffect: o.generateEffect,
      } as ReturnType<Returns>
    }

    const throws: Throws = error => {
      const o = updataLastStep({ error })
      return {
        build: o.build,
        generateEffect: o.generateEffect,
        output: o.output,
        run: o.run,
      } as ReturnType<Throws>
    }

    const generateEffect: GenerateEffect = effect => {
      const o = addStep({ effect })
      return {
        build: o.build,
        generateEffect: o.generateEffect,
        output: o.output,
        returns: o.returns,
        run: o.run,
        throws: o.throws,
      } as ReturnType<GenerateEffect>
    }

    const withArgs: WithArgs = (...args) => {
      const o = updateSagaScenario({ ...sagaScenario, args })
      return {
        generateEffect: o.generateEffect,
      }
    }

    const andTask: AndTask = task => {
      const o = updateSagaScenario({ ...sagaScenario, task })
      return {
        generateEffect: o.generateEffect,
        withArgs: o.withArgs,
      }
    }

    const withAction: WithAction = action => {
      const o = updateSagaScenario({ ...sagaScenario, action })
      return {
        andTask: o.andTask,
      }
    }

    const taking: Taking = forkEffect => {
      const o = updateSagaScenario({ ...sagaScenario, forkEffect })
      return {
        withAction: o.withAction,
      }
    }

    const forSaga: ForSaga = saga => {
      const o = updateSagaScenario({ ...sagaScenario, saga })
      return {
        taking: o.taking,
      }
    }

    const build = () => sagaScenario

    const output: Output = () => {
      const forkEffect = sagaScenario.forkEffect!(sagaScenario.action!.type, sagaScenario.task!)
      const forkEffectWithArgs = {
        ...forkEffect,
        FORK: {
          ...forkEffect.FORK,
          args: [...forkEffect.FORK.args, ...sagaScenario.args],
        },
      }
      return {
        effects: [forkEffectWithArgs, ...sagaScenario.steps.map(s => s.effect!)],
        starved: true,
      }
    }

    const run: Run = () => {
      let returnedValue: any
      let error: any
      const { task, steps, action, args } = sagaScenario

      const effects: ReduxSagaEffect[] = []

      const sagaIterator = sagaScenario.saga!(...args)
      const take = sagaIterator.next() as any
      effects.push(take.value)

      const taskIiterator = task!(...args, action)
      steps.forEach(step => {
        const value = error ? taskIiterator.throw!(error) : (taskIiterator.next(returnedValue) as any)
        effects.push(value.value)
        returnedValue = step.returnedValue
        error = step.error
      })

      return { effects, starved: taskIiterator.next().done }
    }

    return {
      andTask,
      build,
      forSaga,
      generateEffect,
      output,
      returns,
      run,
      taking,
      throws,
      withAction,
      withArgs,
    }
  }

  const initialSaga = { args: [], steps: [] }

  return {
    forSaga: updateSagaScenario(initialSaga).forSaga,
  }
}
