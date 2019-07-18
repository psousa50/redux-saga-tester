import { Action } from "redux"
import { Effect as ReduxSagaEffect, effectTypes, ForkEffect, takeEvery, takeLatest, takeLeading } from "redux-saga/effects"

type Task<T> = (...args: any[]) => IterableIterator<T>
type ForkEffectHelper = typeof takeEvery | typeof takeLatest | typeof takeLeading

export type SagaScenario<S, T, A extends string> = {
  saga?: Task<S>
  forkEffect?: ForkEffectHelper
  action?: Action<A>
  task?: Task<T>
  args: any[]
  steps: SagaStep[]
  starved?: boolean
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

type EffectOperations = "build" | "generateEffect" | "output" | "run" | "starved"
type PickOp<T extends keyof SagaBuilder> = Pick<SagaBuilder, T>

type BuildSagaScenario = () => PickOp<"forSaga">
type ForSaga = <S extends ReduxSagaEffect>(saga: Task<S>) => PickOp<EffectOperations | "taking" | "withAction">
type Taking = (forkEffect: ForkEffectHelper) => PickOp<"withAction">
type WithAction = <A extends string>(action: Action<A>) => PickOp<"andTask" | "withArgs">
type AndTask = <T extends ReduxSagaEffect>(task: Task<T>) => PickOp<"generateEffect" | "withArgs">
type WithArgs = (...args: any[]) => PickOp<EffectOperations>
type GenerateEffect = (generateEffect: ReduxSagaEffect) => PickOp<EffectOperations | "returns" | "throws">
type Returns = (returnedValue?: any) => PickOp<EffectOperations>
type Throws = (error?: any) => PickOp<EffectOperations>
type Starved = (starved?: boolean) => PickOp<EffectOperations>
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
  starved: Starved
  build: Build
  run: Run
  output: Output
}

const efectOperations = (s: SagaBuilder) => ({
  build: s.build,
  generateEffect: s.generateEffect,
  output: s.output,
  run: s.run,
  starved: s.starved,
})

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

    const forSaga: ForSaga = saga => {
      const o = updateSagaScenario({ ...sagaScenario, saga })
      return {
        ...efectOperations(o),
        taking: o.taking,
        withAction: o.withAction,
      }
    }

    const taking: Taking = forkEffect => {
      const o = updateSagaScenario({ ...sagaScenario, forkEffect })
      return {
        withAction: o.withAction,
      }
    }

    const withAction: WithAction = action => {
      const o = updateSagaScenario({ ...sagaScenario, action })
      return {
        andTask: o.andTask,
        withArgs: o.withArgs,
      }
    }

    const andTask: AndTask = task => {
      const o = updateSagaScenario({ ...sagaScenario, task })
      return {
        generateEffect: o.generateEffect,
        withArgs: o.withArgs,
      }
    }

    const withArgs: WithArgs = (...args) => {
      const o = updateSagaScenario({ ...sagaScenario, args })
      return {
        ...efectOperations(o),
      }
    }

    const generateEffect: GenerateEffect = effect => {
      const o = addStep({ effect })
      return {
        ...efectOperations(addStep({ effect })),
        returns: o.returns,
        throws: o.throws,
      }
    }

    const returns: Returns = returnedValue => {
      const o = updataLastStep({ returnedValue })
      return {
        ...efectOperations(o),
      }
    }

    const throws: Throws = error => {
      const o = updataLastStep({ error })
      return {
        ...efectOperations(o),
      }
    }

    const starved: Starved = isStarved => {
      const o = updateSagaScenario({ ...sagaScenario, starved: isStarved })
      return {
        ...efectOperations(o),
      }
    }

    const build = () => sagaScenario

    const output: Output = () => {
      const getForkEffect = () => {
        if (!sagaScenario.forkEffect) {
          return []
        } else {
          const forkEffect = sagaScenario.forkEffect!(sagaScenario.action!.type, sagaScenario.task!)
          return [
            {
              ...forkEffect,
              payload: {
                args: [...forkEffect.payload.args, ...sagaScenario.args],
              },
              type: effectTypes.FORK,
            },
          ]
        }
      }

      return {
        effects: [...getForkEffect(), ...sagaScenario.steps.map(s => s.effect!)],
        starved: sagaScenario.starved === undefined ? true : sagaScenario.starved,
      }
    }

    const run: Run = () => {
      let returnedValue: any
      let error: any
      const { task, steps, action, args } = sagaScenario

      const effects: ReduxSagaEffect[] = []

      const sagaIterator = sagaScenario.saga!(...args)
      const take = sagaIterator.next()
      effects.push(take.value)

      const taskToIterate = task ? task : ((take.value as ForkEffect).payload.args[1] as Task<T>)
      const stepstoIterate = task ? steps : steps.slice(1)
      const taskIiterator = taskToIterate(...args, action)
      stepstoIterate.forEach(step => {
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
      forSaga,
      generateEffect,
      output,
      returns,
      run,
      starved,
      taking,
      throws,
      withAction,
      withArgs,
    } as SagaBuilder
  }

  const initialSaga = { args: [], steps: [] }

  return {
    forSaga: updateSagaScenario(initialSaga).forSaga,
  }
}
