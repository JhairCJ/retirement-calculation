import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SCENARIO, accumulate, calculatePlan, formatAge, goalCapital, inflationFactor,
  monthlyRate, nominalSalaryAtMonth, realReturnRate, toMoneyView, validateScenario, withdrawalPerMonth,
} from './model'

describe('metas y unidades', () => {
  it('usa los 100 años como edad final predeterminada', () => {
    expect(DEFAULT_SCENARIO.horizonAge).toBe(100)
  })

  it('deriva dos millones de Bs 5.000 al 3%', () => {
    expect(goalCapital({ ...DEFAULT_SCENARIO, goalMode: 'spending' })).toBeCloseTo(2_000_000, 5)
    expect(withdrawalPerMonth({ ...DEFAULT_SCENARIO, targetCapital: 1_500_000 })).toBe(3750)
  })

  it('convierte rendimientos efectivos y capital futuro sin mezclar unidades', () => {
    expect(Math.pow(1 + monthlyRate(4), 12)).toBeCloseTo(1.04, 10)
    expect(realReturnRate(8, 5)).toBeCloseTo(2.857142857, 6)
    expect(realReturnRate(9.2, 5)).toBeCloseTo(4, 10)
    expect(inflationFactor(5, 240) * 2_000_000).toBeCloseTo(5_306_595, 0)
    expect(toMoneyView(2_000_000, 240, 5, 'nominal')).toBeCloseTo(5_306_595, 0)
    expect(toMoneyView(2_000_000, 240, 5, 'real')).toBe(2_000_000)
  })

  it('mantiene la meta real y ajusta su cifra futura al plazo', () => {
    const s = DEFAULT_SCENARIO
    expect(goalCapital(s)).toBe(2_000_000)
    expect(toMoneyView(goalCapital(s), 240, 5, 'nominal')).toBeCloseTo(5_306_595, 0)
    expect(toMoneyView(goalCapital(s), 300, 5, 'nominal')).toBeCloseTo(6_772_710, 0)
    expect(withdrawalPerMonth(s)).toBe(5000)
    expect(toMoneyView(withdrawalPerMonth(s), 240, 5, 'nominal')).toBeCloseTo(13_266.49, 0)
    expect(goalCapital({ ...s, goalMode: 'spending' })).toBeCloseTo(2_000_000, 5)
  })

  it('usa solo el gasto elegido cuando la meta se define por gasto', () => {
    const s = { ...DEFAULT_SCENARIO, goalMode: 'spending' as const, retirementSpending: 5000, targetCapital: 9_000_000 }
    const plan = calculatePlan(s)
    expect(plan.goalReal).toBe(2_000_000)
    expect(plan.withdrawalReal).toBe(5000)
    expect(toMoneyView(plan.withdrawalReal, 240, s.inflation, 'nominal')).toBeCloseTo(13_266.49, 0)
    expect(validateScenario({ ...s, targetCapital: Number.NaN }).targetCapital).toBeUndefined()
  })
})

describe('acumulación', () => {
  it('suma aportes al final de cada mes con retorno real nulo', () => {
    const s = { ...DEFAULT_SCENARIO, monthlyExpenses: 2500, nominalReturn: 0, inflation: 0, salaryGrowth: 0 }
    const result = accumulate(s, 15_000, 120, 1_500_000)
    expect(result.points[120].capitalReal).toBeCloseTo(1_500_000, 5)
    expect(result.points[120].flowReal).toBe(12_500)
    expect(result.reachedMonth).toBe(120)
  })

  it('registra déficit descubierto y no permite capital negativo', () => {
    const s = { ...DEFAULT_SCENARIO, monthlyExpenses: 2500, nominalReturn: 0, inflation: 0, salaryGrowth: 0 }
    const result = accumulate(s, 1000, 2, 100_000)
    expect(result.points[1].capitalReal).toBe(0)
    expect(result.points[1].uncoveredReal).toBe(1500)
    expect(result.uncoveredTotal).toBe(3000)
  })

  it('descuenta automáticamente la inflación del retorno nominal al invertir', () => {
    const s = { ...DEFAULT_SCENARIO, nominalReturn: 8, inflation: 5, monthlyExpenses: 0, salaryGrowth: 0, initialCapital: 100_000 }
    const withInflation = accumulate(s, 0, 12, 1_000_000)
    const withoutInflation = accumulate({ ...s, inflation: 0 }, 0, 12, 1_000_000)
    expect(withInflation.points[12].capitalReal).toBeCloseTo(100_000 * 1.08 / 1.05, 5)
    expect(withoutInflation.points[12].capitalReal).toBeCloseTo(108_000, 5)
  })

  it('aplica aumentos solo tras un intervalo completo', () => {
    const s = { ...DEFAULT_SCENARIO, salaryGrowth: 10, salaryIntervalMonths: 6, inflation: 0 }
    const result = accumulate(s, 8000, 12, 2_000_000)
    expect(result.points.slice(1, 7).every(point => point.incomeReal === 8000)).toBe(true)
    expect(result.points.slice(7, 13).every(point => Math.abs(point.incomeReal - 8800) < 0.001)).toBe(true)
    expect(nominalSalaryAtMonth(8000, s, 12)).toBeCloseTo(8800)
  })

  it('pierde poder adquisitivo entre aumentos anuales', () => {
    const s = { ...DEFAULT_SCENARIO, salaryGrowth: 5, inflation: 5 }
    const result = accumulate(s, 8000, 13, 2_000_000)
    expect(result.points[6].incomeReal).toBeLessThan(result.points[1].incomeReal)
    expect(result.points[13].incomeReal).toBeGreaterThan(result.points[12].incomeReal)
  })

  it('convierte el aumento salarial nominal a poder adquisitivo del mes proyectado', () => {
    const s = { ...DEFAULT_SCENARIO, salaryGrowth: 10, inflation: 5 }
    const result = accumulate(s, 8000, 12, 1_000_000)
    expect(result.points[12].incomeReal).toBeCloseTo(8000 / 1.05, 6)
    expect(toMoneyView(result.points[12].incomeReal, 12, 5, 'nominal')).toBeCloseTo(8000, 6)
  })
})

describe('respuestas del plan', () => {
  it('halla un ingreso inicial de Bs 15.000 en el caso sin retorno', () => {
    const plan = calculatePlan({ ...DEFAULT_SCENARIO, targetAge: 32, targetCapital: 1_500_000, nominalReturn: 0, inflation: 0, salaryGrowth: 0 })
    expect(plan.startingIncome).toBeCloseTo(15_000, 2)
    expect(plan.initialSaving).toBeCloseTo(12_500, 2)
  })

  it('permite ingreso inicial cero si el capital cubre gastos y meta', () => {
    const plan = calculatePlan({ ...DEFAULT_SCENARIO, initialCapital: 3_000_000, targetAge: 23, nominalReturn: 0, inflation: 0, salaryGrowth: 0 })
    expect(plan.startingIncome).toBe(0)
    expect(plan.status).toBe('ready')
  })

  it('muestra primer logro anterior a la edad objetivo y sueldo al cierre', () => {
    const s = { ...DEFAULT_SCENARIO, question: 'required-income' as const, targetAge: 23, horizonAge: 25, initialCapital: 2_100_000, nominalReturn: 0, inflation: 0, salaryGrowth: 10, salaryIntervalMonths: 6 }
    const plan = calculatePlan(s)
    expect(plan.reachedMonth).toBe(0)
    expect(plan.lastSalaryMonth).toBe(12)
    expect(plan.lastSalaryNominal).toBeCloseTo((plan.startingIncome ?? 0) * 1.1)
  })

  it('muestra el sueldo del mes 12 después del aumento semestral', () => {
    const plan = calculatePlan({ ...DEFAULT_SCENARIO, question: 'target-age', monthlyIncome: 8000, salaryGrowth: 10, salaryIntervalMonths: 6, inflation: 0, nominalReturn: 0, monthlyExpenses: 0, targetCapital: 100_000, horizonAge: 23 })
    expect(plan.reachedMonth).toBe(12)
    expect(plan.lastSalaryNominal).toBeCloseTo(8800)
    expect(plan.lastSalaryReal).toBeCloseTo(8800)
  })

  it('descuenta inflación acumulada del sueldo final', () => {
    const plan = calculatePlan({ ...DEFAULT_SCENARIO, question: 'target-age', monthlyIncome: 10_000, salaryGrowth: 0, inflation: 25, nominalReturn: 0, monthlyExpenses: 0, targetCapital: 1_000_000_000, horizonAge: 23 })
    expect(plan.lastSalaryNominal).toBe(10_000)
    expect(plan.lastSalaryReal).toBeCloseTo(8000)
  })

  it('mantiene el umbral real al buscar el primer mes de logro', () => {
    const base = { ...DEFAULT_SCENARIO, question: 'target-age' as const, monthlyIncome: 10_000, monthlyExpenses: 0, salaryGrowth: 0, nominalReturn: 0, inflation: 10, targetCapital: 100_000, horizonAge: 32 }
    const plan = calculatePlan(base)
    expect(plan.reachedMonth).not.toBeNull()
    expect(plan.accumulation[plan.accumulation.length - 1].capitalReal).toBeGreaterThanOrEqual(base.targetCapital)
    expect(plan.goalReal).toBe(base.targetCapital)
  })

  it('resuelve ingresos para la misma meta real aunque cambie el plazo', () => {
    const base = { ...DEFAULT_SCENARIO, targetAge: 42, inflation: 5, nominalReturn: 9.2, salaryGrowth: 0 }
    const plan = calculatePlan(base)
    const longer = calculatePlan({ ...base, targetAge: 47 })
    expect(plan.goalReal).toBe(2_000_000)
    expect(longer.goalReal).toBe(2_000_000)
    expect(longer.startingIncome!).toBeLessThan(plan.startingIncome!)
  })

  it('devuelve el primer mes de logro o el estado fuera de horizonte', () => {
    const base = { ...DEFAULT_SCENARIO, question: 'target-age' as const, initialCapital: 0, nominalReturn: 0, inflation: 0, salaryGrowth: 0, monthlyIncome: 15_000, targetCapital: 1_500_000 }
    const achieved = calculatePlan(base)
    expect(achieved.reachedMonth).toBe(120)
    expect(formatAge(22, 121)).toBe('32 años y 1 mes')
    const missing = calculatePlan({ ...base, monthlyIncome: 2500, horizonAge: 40 })
    expect(missing.status).toBe('not-reached')
    expect(missing.reachedMonth).toBeNull()
  })

  it('pide ampliar el horizonte si la meta se alcanza justo al final', () => {
    const plan = calculatePlan({ ...DEFAULT_SCENARIO, question: 'target-age', horizonAge: 23, monthlyIncome: 3500, targetCapital: 12000, nominalReturn: 0, inflation: 0, salaryGrowth: 0 })
    expect(plan.status).toBe('horizon-reached')
    expect(plan.reachedMonth).toBe(12)
    expect(plan.retirement).toHaveLength(0)
  })

  it('termina a los 100 años sin inventar meses de retiro posteriores', () => {
    const plan = calculatePlan({ ...DEFAULT_SCENARIO, currentAge: 99, targetAge: 100, initialCapital: 2_000_000 })
    expect(plan.status).toBe('horizon-reached')
    expect(plan.retirement).toHaveLength(0)
    expect(validateScenario({ ...DEFAULT_SCENARIO, targetAge: 101 }).targetAge).toBeTruthy()
  })

  it('detecta agotamiento ilustrativo y mantiene el patrimonio en cero', () => {
    const s = { ...DEFAULT_SCENARIO, targetAge: 23, horizonAge: 30, targetCapital: 12_000, withdrawalRate: 100, nominalReturn: 0, inflation: 0, salaryGrowth: 0 }
    const plan = calculatePlan(s)
    expect(plan.withdrawalReal).toBe(1000)
    expect(plan.depletionMonth).not.toBeNull()
    expect(plan.retirement.every(point => point.capitalReal >= 0)).toBe(true)
  })
})

describe('validación', () => {
  it('rechaza edades incompatibles, números ausentes y tasas fuera de rango', () => {
    const errors = validateScenario({ ...DEFAULT_SCENARIO, targetAge: 22, horizonAge: 22, monthlyExpenses: Number.NaN, nominalReturn: -100 })
    expect(errors.targetAge).toBeTruthy()
    expect(errors.horizonAge).toBeTruthy()
    expect(errors.monthlyExpenses).toBeTruthy()
    expect(errors.nominalReturn).toBeTruthy()
  })
  it('exige meses enteros positivos para los aumentos', () => {
    for (const interval of [0, 1.5, Number.NaN]) {
      expect(validateScenario({ ...DEFAULT_SCENARIO, salaryIntervalMonths: interval }).salaryIntervalMonths).toBeTruthy()
    }
  })
})
