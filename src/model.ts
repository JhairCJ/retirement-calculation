export type QuestionMode = 'required-income' | 'target-age'
export type GoalMode = 'capital' | 'spending'
export type MoneyView = 'real' | 'nominal'

export type Scenario = {
  question: QuestionMode
  goalMode: GoalMode
  currentAge: number
  targetAge: number
  horizonAge: number
  monthlyIncome: number
  salaryGrowth: number
  salaryIntervalMonths: number
  monthlyExpenses: number
  initialCapital: number
  inflation: number
  nominalReturn: number
  withdrawalRate: number
  targetCapital: number
  retirementSpending: number
}

export type NumericField = Exclude<keyof Scenario, 'question' | 'goalMode'>
export type ValidationErrors = Partial<Record<NumericField, string>>

export const DEFAULT_SCENARIO: Scenario = {
  question: 'required-income',
  goalMode: 'capital',
  currentAge: 22,
  targetAge: 42,
  horizonAge: 100,
  monthlyIncome: 8000,
  salaryGrowth: 5,
  salaryIntervalMonths: 12,
  monthlyExpenses: 2500,
  initialCapital: 0,
  inflation: 5,
  nominalReturn: 9.2,
  withdrawalRate: 3,
  targetCapital: 2_000_000,
  retirementSpending: 5000,
}

export type MonthPoint = {
  month: number
  phase: 'acumular' | 'retirar'
  incomeReal: number
  expensesReal: number
  flowReal: number
  capitalReal: number
  uncoveredReal: number
}

export type Plan = {
  status: 'ready' | 'not-reached' | 'horizon-reached' | 'uncomputable'
  goalReal: number
  withdrawalReal: number
  startingIncome: number | null
  initialSaving: number | null
  initialSavingRate: number | null
  reachedMonth: number | null
  retirementMonth: number | null
  endCapitalReal: number
  depletionMonth: number | null
  accumulation: MonthPoint[]
  retirement: MonthPoint[]
  lastSalaryMonth: number | null
  lastSalaryNominal: number | null
  lastSalaryReal: number | null
}

const ageToMonth = (age: number, currentAge: number) => Math.round((age - currentAge) * 12)

export function monthlyRate(annualPercent: number): number {
  return Math.pow(1 + annualPercent / 100, 1 / 12) - 1
}

export function realReturnRate(nominalReturn: number, inflation: number): number {
  return ((1 + nominalReturn / 100) / (1 + inflation / 100) - 1) * 100
}

export function inflationFactor(annualPercent: number, month: number): number {
  return Math.pow(1 + annualPercent / 100, month / 12)
}

export function toMoneyView(realAmount: number, month: number, inflationPercent: number, view: MoneyView): number {
  return view === 'real' ? realAmount : realAmount * inflationFactor(inflationPercent, month)
}

export function nominalSalaryAtMonth(startingIncome: number, s: Scenario, month: number): number {
  const completedIntervals = month === 0 ? 0 : Math.floor((month - 1) / s.salaryIntervalMonths)
  return startingIncome * Math.pow(1 + s.salaryGrowth / 100, completedIntervals)
}

export function goalCapital(s: Scenario): number {
  return s.goalMode === 'capital' ? s.targetCapital : (s.retirementSpending * 12) / (s.withdrawalRate / 100)
}

export function withdrawalPerMonth(s: Scenario): number {
  return s.goalMode === 'spending' ? s.retirementSpending : (s.targetCapital * (s.withdrawalRate / 100)) / 12
}

export function validateScenario(s: Scenario): ValidationErrors {
  const errors: ValidationErrors = {}
  const limits: Record<NumericField, [number, number]> = {
    currentAge: [18, 99],
    targetAge: [19, 100],
    horizonAge: [20, 120],
    monthlyIncome: [0, 1_000_000_000],
    salaryGrowth: [-99, 100],
    salaryIntervalMonths: [1, 120],
    monthlyExpenses: [0, 1_000_000_000],
    initialCapital: [0, 1_000_000_000_000],
    inflation: [-99, 100],
    nominalReturn: [-99, 100],
    withdrawalRate: [0.01, 100],
    targetCapital: [1, 1_000_000_000_000],
    retirementSpending: [1, 1_000_000_000],
  }

  for (const field of Object.keys(limits) as NumericField[]) {
    if ((field === 'targetCapital' && s.goalMode !== 'capital') ||
        (field === 'retirementSpending' && s.goalMode !== 'spending') ||
        (field === 'targetAge' && s.question !== 'required-income')) continue
    const value = s[field]
    const [min, max] = limits[field]
    if (!Number.isFinite(value)) errors[field] = 'Ingresa un número válido.'
    else if (value < min || value > max) errors[field] = `Usa un valor entre ${min} y ${max}.`
  }

  if (Number.isFinite(s.currentAge) && Number.isFinite(s.targetAge) && s.question === 'required-income' && s.targetAge <= s.currentAge) {
    errors.targetAge = 'La edad de retiro debe ser mayor que tu edad actual.'
  }
  if (Number.isFinite(s.horizonAge) && Number.isFinite(s.currentAge) && s.horizonAge <= s.currentAge) {
    errors.horizonAge = 'La edad final debe ser mayor que tu edad actual.'
  }
  if (s.question === 'required-income' && Number.isFinite(s.horizonAge) && Number.isFinite(s.targetAge) && s.horizonAge < s.targetAge) {
    errors.targetAge = 'La edad de retiro no puede superar la edad final de planificación.'
  }
  if (Number.isFinite(s.currentAge) && !Number.isInteger(s.currentAge)) errors.currentAge = 'Usa años enteros.'
  if (s.question === 'required-income' && Number.isFinite(s.targetAge) && !Number.isInteger(s.targetAge)) errors.targetAge = 'Usa años enteros.'
  if (Number.isFinite(s.horizonAge) && !Number.isInteger(s.horizonAge)) errors.horizonAge = 'Usa años enteros.'
  if (Number.isFinite(s.salaryIntervalMonths) && !Number.isInteger(s.salaryIntervalMonths)) errors.salaryIntervalMonths = 'Usa un número entero de meses.'
  return errors
}

type Accumulation = {
  points: MonthPoint[]
  reachedMonth: number | null
  uncoveredTotal: number
}

export function accumulate(s: Scenario, startingIncome: number, totalMonths: number, goalReal: number, stopAtGoal = false): Accumulation {
  const points: MonthPoint[] = [{
    month: 0,
    phase: 'acumular',
    incomeReal: startingIncome,
    expensesReal: s.monthlyExpenses,
    flowReal: startingIncome - s.monthlyExpenses,
    capitalReal: s.initialCapital,
    uncoveredReal: 0,
  }]
  let capital = s.initialCapital
  let reachedMonth: number | null = capital >= goalReal ? 0 : null
  let uncoveredTotal = 0
  if (stopAtGoal && reachedMonth === 0) return { points, reachedMonth, uncoveredTotal }

  const investmentFactor = 1 + monthlyRate(realReturnRate(s.nominalReturn, s.inflation))
  for (let month = 1; month <= totalMonths; month += 1) {
    const incomeReal = nominalSalaryAtMonth(startingIncome, s, month) / inflationFactor(s.inflation, month)
    const expensesReal = s.monthlyExpenses
    const flowReal = incomeReal - expensesReal
    const beforeFloor = capital * investmentFactor + flowReal
    const uncoveredReal = Math.max(0, -beforeFloor)
    capital = Math.max(0, beforeFloor)
    uncoveredTotal += uncoveredReal
    points.push({ month, phase: 'acumular', incomeReal, expensesReal, flowReal, capitalReal: capital, uncoveredReal })
    if (reachedMonth === null && capital >= goalReal) {
      reachedMonth = month
      if (stopAtGoal) break
    }
  }
  return { points, reachedMonth, uncoveredTotal }
}

export function requiredStartingIncome(s: Scenario): number | null {
  const months = ageToMonth(s.targetAge, s.currentAge)
  const targetGoalReal = goalCapital(s)
  const qualifies = (income: number) => {
    const result = accumulate(s, income, months, targetGoalReal)
    const end = result.points[result.points.length - 1]
    return result.uncoveredTotal < 0.01 && end.capitalReal >= targetGoalReal
  }
  if (qualifies(0)) return 0
  let high = Math.max(s.monthlyExpenses, s.monthlyIncome, targetGoalReal / months, 1)
  while (high < 1_000_000_000 && !qualifies(high)) high *= 2
  if (!qualifies(high)) return null
  let low = 0
  for (let iteration = 0; iteration < 50; iteration += 1) {
    const mid = (low + high) / 2
    if (qualifies(mid)) high = mid
    else low = mid
  }
  // Stay above the binary-search boundary so the displayed plan reaches the goal.
  return high + 0.000001
}

export function projectRetirement(s: Scenario, capitalStart: number, retirementMonth: number, monthlyWithdrawalReal: number): { points: MonthPoint[], depletionMonth: number | null } {
  const horizonMonth = ageToMonth(s.horizonAge, s.currentAge)
  const points: MonthPoint[] = [{ month: retirementMonth, phase: 'retirar', incomeReal: 0, expensesReal: monthlyWithdrawalReal, flowReal: 0, capitalReal: capitalStart, uncoveredReal: 0 }]
  let capital = capitalStart
  let depletionMonth: number | null = null
  const investmentFactor = 1 + monthlyRate(realReturnRate(s.nominalReturn, s.inflation))
  for (let month = retirementMonth + 1; month <= horizonMonth; month += 1) {
    const withdrawn = Math.min(capital, monthlyWithdrawalReal)
    const uncoveredReal = monthlyWithdrawalReal - withdrawn
    capital = (capital - withdrawn) * investmentFactor
    if (depletionMonth === null && capital < 0.01) depletionMonth = month
    points.push({ month, phase: 'retirar', incomeReal: 0, expensesReal: monthlyWithdrawalReal, flowReal: -withdrawn, capitalReal: capital, uncoveredReal })
  }
  return { points, depletionMonth }
}

export function calculatePlan(s: Scenario): Plan {
  if (Object.keys(validateScenario(s)).length > 0) throw new Error('Escenario inválido')
  const goalReal = goalCapital(s)
  const withdrawalReal = withdrawalPerMonth(s)
  const targetMonths = s.question === 'required-income'
    ? ageToMonth(s.targetAge, s.currentAge)
    : ageToMonth(s.horizonAge, s.currentAge)
  const startingIncome = s.question === 'required-income' ? requiredStartingIncome(s) : s.monthlyIncome
  if (startingIncome === null) {
    return {
      status: 'uncomputable', goalReal, withdrawalReal, startingIncome: null, initialSaving: null,
      initialSavingRate: null, reachedMonth: null, retirementMonth: null, endCapitalReal: s.initialCapital,
      depletionMonth: null, accumulation: [], retirement: [],
      lastSalaryMonth: null, lastSalaryNominal: null, lastSalaryReal: null,
    }
  }
  const accumulation = accumulate(s, startingIncome, targetMonths, goalReal, s.question === 'target-age')
  const endCapitalReal = accumulation.points[accumulation.points.length - 1].capitalReal
  const horizonMonths = ageToMonth(s.horizonAge, s.currentAge)
  const retirementMonth = s.question === 'required-income'
    ? targetMonths < horizonMonths ? targetMonths : null
    : accumulation.reachedMonth !== null && accumulation.reachedMonth < targetMonths ? accumulation.reachedMonth : null
  const retirement = retirementMonth === null
    ? { points: [] as MonthPoint[], depletionMonth: null as number | null }
    : projectRetirement(s, endCapitalReal, retirementMonth, withdrawalReal)
  const initialSaving = startingIncome - s.monthlyExpenses
  const lastSalaryMonth = s.question === 'required-income' ? targetMonths : accumulation.reachedMonth ?? targetMonths
  const lastSalaryNominal = nominalSalaryAtMonth(startingIncome, s, lastSalaryMonth)
  return {
    status: retirementMonth !== null ? 'ready' : ((s.question === 'required-income' && targetMonths === horizonMonths) || accumulation.reachedMonth === targetMonths) ? 'horizon-reached' : 'not-reached',
    goalReal, withdrawalReal, startingIncome,
    initialSaving,
    initialSavingRate: startingIncome > 0 ? (initialSaving / startingIncome) * 100 : null,
    reachedMonth: accumulation.reachedMonth,
    retirementMonth,
    endCapitalReal,
    depletionMonth: retirement.depletionMonth,
    accumulation: accumulation.points,
    retirement: retirement.points,
    lastSalaryMonth,
    lastSalaryNominal,
    lastSalaryReal: lastSalaryNominal / inflationFactor(s.inflation, lastSalaryMonth),
  }
}

export function formatAge(currentAge: number, elapsedMonths: number): string {
  const totalMonths = currentAge * 12 + elapsedMonths
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  return months === 0 ? `${years} años` : `${years} años y ${months} ${months === 1 ? 'mes' : 'meses'}`
}
