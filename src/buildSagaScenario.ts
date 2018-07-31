import { Action } from "redux"
import { Effect as ReduxSagaEffect } from "redux-saga"

type Task<T> = (...args: any[]) => IterableIterator<T>

export type SagaScenario<S, T, A extends string> = {
  saga?: Task<S>
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
type ForSaga = <S extends ReduxSagaEffect>(saga: Task<S>) => Pick<SagaBuilder, "withAction">
type WithAction = <A extends string>(action: Action<A>) => Pick<SagaBuilder, "andTask">
type AndTask = <T extends ReduxSagaEffect>(task: Task<T>) => Pick<SagaBuilder, "effect" | "withArgs">
type WithArgs = (...args: any[]) => Pick<SagaBuilder, "effect">
type Effect = (effect: ReduxSagaEffect) => Pick<SagaBuilder, "run" | "build" | "output" | "effect" | "returns" | "throws">
type Returns = (returnedValue?: any) => Pick<SagaBuilder, "run" | "build" | "output" | "effect">
type Throws = (error?: any) => Pick<SagaBuilder, "run" | "build" | "output" | "effect">
type Build = <S extends ReduxSagaEffect, T extends ReduxSagaEffect, A extends string>() => SagaScenario<S, T, A>
type Run = <S extends ReduxSagaEffect, T extends ReduxSagaEffect, A extends string>() => SagaOutput
type Output = <S extends ReduxSagaEffect, T extends ReduxSagaEffect, A extends string>() => SagaOutput

interface SagaBuilder {
  forSaga: ForSaga
  withAction: WithAction
  andTask: AndTask
  withArgs: WithArgs
  effect: Effect
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
        effect: o.effect,
      } as ReturnType<Returns>
    }

    const throws: Throws = error => {
      const o = updataLastStep({ error })
      return {
        effect: o.effect,
        build: o.build,
        output: o.output,
        run: o.run,
      } as ReturnType<Throws>
    }

    const effect: Effect = e => {
      const o = addStep({ effect: e })
      return {
        effect: o.effect,
        output: o.output,
        returns: o.returns,
        build: o.build,
        run: o.run,
        throws: o.throws,
      } as ReturnType<Effect>
    }

    const withArgs: WithArgs = (...args) => {
      const o = updateSagaScenario({ ...sagaScenario, args })
      return {
        effect: o.effect,
      }
    }

    const andTask: AndTask = task => {
      const o = updateSagaScenario({ ...sagaScenario, task })
      return {
        effect: o.effect,
        withArgs: o.withArgs,
      }
    }

    const withAction: WithAction = action => {
      const o = updateSagaScenario({ ...sagaScenario, action })
      return {
        andTask: o.andTask,
      }
    }

    const forSaga: ForSaga = saga => {
      const o = updateSagaScenario({ ...sagaScenario, saga })
      return {
        withAction: o.withAction,
      }
    }

    const build = () => sagaScenario

    const output: Output = () => ({ effects: sagaScenario.steps.map(s => s.effect!), starved: true })

    const run: Run = () => {
      let returnedValue: any
      let error: any
      const { task, steps, action, args } = sagaScenario

      const effects: ReduxSagaEffect[] = []

      // const sagaIterator = sagaScenario.saga!(action, task, ...args)
      // const take = sagaIterator.next()
      // effects.push(take.value)
      
      const taskIiterator = task!(...args, action)
      steps.forEach(step => {
          const value = error ? taskIiterator.throw!(error) : taskIiterator.next(returnedValue)
          effects.push(value.value)
          returnedValue = step.returnedValue
          error = step.error
        })

      return { effects, starved: taskIiterator.next().done }

    }

    return {
      andTask,
      build,
      effect,
      forSaga,
      output,
      returns,
      run,
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
