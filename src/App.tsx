import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { DEFAULT_SCENARIO, calculatePlan, formatAge, realReturnRate, toMoneyView, validateScenario, type GoalMode, type MoneyView, type MonthPoint, type NumericField, type Plan, type QuestionMode, type Scenario } from './model'

const integer = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 })
const bs = (value: number) => `Bs ${integer.format(Math.round(value))}`
const pct = (value: number) => `${decimal.format(value)}%`
const compact = (value: number) => value >= 1e6 ? `${decimal.format(value / 1e6)} M` : value >= 1000 ? `${decimal.format(value / 1000)} mil` : integer.format(value)

const labels: Record<NumericField, [string, string, string?]> = {
  currentAge: ['Edad actual', 'años'], targetAge: ['Edad a la que quieres retirarte', 'años'],
  horizonAge: ['Planificar hasta', 'años', 'Es un límite de cálculo, no una predicción de vida.'],
  monthlyIncome: ['Ingreso neto mensual actual', 'Bs / mes'], salaryGrowth: ['Aumento del sueldo por vez', '% nominal', 'Se aplica al comenzar el mes siguiente a cada intervalo completo.'], salaryIntervalMonths: ['Cada cuántos meses aumenta', 'meses', 'Por ejemplo, 6 para aumentos semestrales.'],
  monthlyExpenses: ['Gastos mensuales de hoy', 'Bs / mes'], initialCapital: ['Ya tienes invertido', 'Bs de hoy'],
  inflation: ['Inflación anual estimada', '%'], nominalReturn: ['Rendimiento anual de la inversión', '%'],
  withdrawalRate: ['Tasa inicial de retiro', '% / año', 'Convierte gasto y capital. No es una rentabilidad.'],
  targetCapital: ['Capital que quieres alcanzar', 'Bs de hoy'], retirementSpending: ['Gasto mensual deseado al retirarte', 'Bs de hoy'],
}

function initialRaw(): Record<NumericField, string> {
  return Object.fromEntries((Object.keys(labels) as NumericField[]).map(key => [key, String(DEFAULT_SCENARIO[key])])) as Record<NumericField, string>
}

const SETTINGS_KEY = 'horizonte.settings.v1'

type SavedSettings = {
  raw: Record<NumericField, string>
  question: QuestionMode
  goalMode: GoalMode
  view: MoneyView
}

function loadSettings(): SavedSettings {
  const defaults: SavedSettings = { raw: initialRaw(), question: DEFAULT_SCENARIO.question, goalMode: DEFAULT_SCENARIO.goalMode, view: 'real' }
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')
    if (!saved || typeof saved !== 'object') return defaults
    const raw = saved.raw && typeof saved.raw === 'object' ? saved.raw : {}
    for (const name of Object.keys(labels) as NumericField[]) {
      if (typeof raw[name] === 'string' && raw[name].length <= 100) defaults.raw[name] = raw[name]
    }
    if (saved.question === 'required-income' || saved.question === 'target-age') defaults.question = saved.question
    if (saved.goalMode === 'capital' || saved.goalMode === 'spending') defaults.goalMode = saved.goalMode
    if (saved.view === 'real' || saved.view === 'nominal') defaults.view = saved.view
  } catch {
    // Storage may be unavailable or contain an older, invalid value.
  }
  return defaults
}

function parse(raw: Record<NumericField, string>, question: QuestionMode, goalMode: GoalMode): Scenario {
  const values = Object.fromEntries((Object.keys(labels) as NumericField[]).map(key => [key, raw[key].trim() === '' ? NaN : Number(raw[key])]))
  return { ...values, horizonAge: DEFAULT_SCENARIO.horizonAge, question, goalMode } as Scenario
}

function Input({ name, value, error, change }: { name: NumericField, value: string, error?: string, change: (name: NumericField, value: string) => void }) {
  const [label, suffix, hint] = labels[name]
  return <div className={`field${error ? ' field-error' : ''}`}>
    <label htmlFor={name}>{label}</label>
    <div className="input-wrap"><input id={name} type="number" inputMode="decimal" step={name.endsWith('Age') || name === 'salaryIntervalMonths' ? '1' : 'any'} value={value} aria-invalid={!!error} aria-describedby={[hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(' ') || undefined} onChange={event => change(name, event.target.value)} /><span>{suffix}</span></div>
    {hint && <small id={`${name}-hint`}>{hint}</small>}
    {error && <small className="error-text" id={`${name}-error`}>{error}</small>}
  </div>
}

function ControlDetails({ title, children, initiallyOpen = false, invalid = false }: { title: string, children: ReactNode, initiallyOpen?: boolean, invalid?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen)
  useEffect(() => { if (invalid) setOpen(true) }, [invalid])
  return <details className="control-details" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{title}{invalid ? ' · revisar valores' : ''}</summary><div className="control-details-body">{children}</div>
  </details>
}

function Metric({ label, value, detail }: { label: string, value: string, detail: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
}

function Timeline({ plan, scenario, view, setView }: { plan: Plan, scenario: Scenario, view: MoneyView, setView: (v: MoneyView) => void }) {
  const fullMonths = (scenario.horizonAge - scenario.currentAge) * 12
  const [zoomMonths, setZoomMonths] = useState<number | null>(null)
  const [windowStart, setWindowStart] = useState(0)
  const [hovered, setHovered] = useState(false)
  const drag = useRef<{ x: number, start: number } | null>(null)
  const visibleMonths = Math.min(zoomMonths ?? fullMonths, fullMonths)
  const startMonth = Math.min(windowStart, fullMonths - visibleMonths)
  const endMonth = startMonth + visibleMonths
  const allPoints = useMemo(() => [...plan.accumulation, ...plan.retirement.slice(1)], [plan])
  const points = useMemo(() => {
    const step = visibleMonths <= 60 ? 1 : visibleMonths <= 180 ? 3 : visibleMonths <= 360 ? 6 : 12
    return allPoints.filter(p => p.month >= startMonth && p.month <= endMonth && (
      p.month === startMonth || p.month === endMonth || p.month % step === 0 ||
      p.month === plan.retirementMonth || p.month === plan.depletionMonth
    ))
  }, [allPoints, plan.retirementMonth, plan.depletionMonth, startMonth, endMonth, visibleMonths])
  const [chosen, setChosen] = useState<number | null>(null)
  if (points.length < 2) return null
  const preferred = chosen ?? plan.retirementMonth ?? endMonth
  const selectedMonth = Math.max(startMonth, Math.min(endMonth, preferred))
  const selected = allPoints[selectedMonth]
  const rangeLabel = `${formatAge(scenario.currentAge, startMonth)} → ${formatAge(scenario.currentAge, endMonth)}`
  const changeZoom = (direction: 'in' | 'out') => {
    const nextMonths = direction === 'in' ? Math.max(Math.min(24, fullMonths), Math.round(visibleMonths / 2)) : Math.min(fullMonths, visibleMonths * 2)
    const anchor = selected.month
    const nextStart = Math.max(0, Math.min(fullMonths - nextMonths, Math.round(anchor - nextMonths / 2)))
    setZoomMonths(nextMonths === fullMonths ? null : nextMonths)
    setWindowStart(nextStart)
  }
  const monthAtPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, ((event.clientX - rect.left) / rect.width * 850 - 52) / 748))
    return Math.round(startMonth + fraction * visibleMonths)
  }
  const movePointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (drag.current && visibleMonths < fullMonths) {
      const plotWidth = event.currentTarget.getBoundingClientRect().width * 748 / 850
      const movedMonths = (event.clientX - drag.current.x) / plotWidth * visibleMonths
      setWindowStart(Math.max(0, Math.min(fullMonths - visibleMonths, Math.round(drag.current.start - movedMonths))))
      setHovered(false)
    } else {
      setChosen(monthAtPointer(event))
      setHovered(true)
    }
  }
  const stopDragging = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (drag.current && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = null
  }
  const convert = (value: number, point: MonthPoint) => toMoneyView(value, point.month, scenario.inflation, view)
  const show = (value: number, point = selected) => bs(convert(value, point))
  const capitals = points.map(p => convert(p.capitalReal, p))
  const goals = points.map(p => convert(plan.goalReal, p))
  const max = Math.max(1, ...capitals, ...goals) * 1.12
  const x = (month: number) => 52 + (month - startMonth) / visibleMonths * 748
  const y = (value: number) => 315 - value / max * 285
  const path = (values: number[]) => points.map((p, i) => `${i ? 'L' : 'M'}${x(p.month).toFixed(1)},${y(values[i]).toFixed(1)}`).join(' ')
  const capitalPath = path(capitals)
  const area = `${capitalPath} L${x(endMonth)},315 L${x(startMonth)},315 Z`
  const cells: [string, number][] = selected.phase === 'acumular' ? [
    ['Ingreso mensual', selected.incomeReal], ['Gastos mensuales', selected.expensesReal],
    [selected.flowReal >= 0 ? 'Aporte mensual' : 'Déficit mensual', Math.abs(selected.flowReal)],
  ] : [['Retiro mensual', selected.expensesReal]]
  return <section className="timeline-section" aria-labelledby="timeline-heading">
    <div className="section-head"><div><p className="eyebrow">Tu trayectoria</p><h2 id="timeline-heading">La historia detrás del número</h2><p>La proyección llega hasta los 100 años. Acerca la gráfica y la tabla para explorar un periodo más corto.</p></div><div className="view-toggle" role="group" aria-label="Unidad de la trayectoria"><button type="button" className={view === 'real' ? 'active' : ''} aria-pressed={view === 'real'} onClick={() => setView('real')}>Bs de hoy</button><button type="button" className={view === 'nominal' ? 'active' : ''} aria-pressed={view === 'nominal'} onClick={() => setView('nominal')}>Bs futuros</button></div></div>
    <div className="chart-card">
      <div className="zoom-toolbar" role="group" aria-label="Zoom de gráfica y tabla"><div><span>Rango visible</span><strong>{rangeLabel}</strong></div><div className="zoom-actions"><button type="button" onClick={() => changeZoom('out')} disabled={visibleMonths === fullMonths} aria-label="Alejar gráfica y tabla">− Alejar</button><button type="button" onClick={() => changeZoom('in')} disabled={visibleMonths <= Math.min(24, fullMonths)} aria-label="Acercar gráfica y tabla">+ Acercar</button><button type="button" onClick={() => { setZoomMonths(null); setWindowStart(0) }} disabled={visibleMonths === fullMonths}>Ver todo</button></div></div>
      <p className="chart-instruction">Pasa el cursor para ver datos de cada edad. Acerca y arrastra la gráfica para mover el periodo.</p>
      <div className="chart-key"><span><i className="key-capital"/> Patrimonio</span><span><i className="key-goal"/> Meta equivalente</span>{plan.retirementMonth !== null && <span><i className="key-milestone"/> Retiro ilustrativo</span>}</div>
      <div className="chart-scroll"><svg viewBox="0 0 850 365" role="img" aria-label={`Gráfica de patrimonio y meta desde ${formatAge(scenario.currentAge, startMonth)} hasta ${formatAge(scenario.currentAge, endMonth)} en ${view === 'real' ? 'bolivianos de hoy' : 'bolivianos futuros'}. Pasa el cursor para consultar los datos y arrastra para mover el periodo.`} onPointerMove={movePointer} onPointerDown={event => { setChosen(monthAtPointer(event)); if (visibleMonths < fullMonths) { drag.current = { x: event.clientX, start: startMonth }; event.currentTarget.setPointerCapture(event.pointerId) } }} onPointerUp={stopDragging} onPointerCancel={stopDragging} onPointerLeave={() => { if (!drag.current) setHovered(false) }}>
        <defs><linearGradient id="capitalFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#35a6a2" stopOpacity=".27"/><stop offset="100%" stopColor="#35a6a2" stopOpacity=".01"/></linearGradient></defs>
        {[0, .25, .5, .75, 1].map(f => <g key={f}><line x1="52" x2="800" y1={y(max * f)} y2={y(max * f)} className="grid-line"/><text x="45" y={y(max * f) + 4} className="axis-label" textAnchor="end">{compact(max * f)}</text></g>)}
        <path d={area} fill="url(#capitalFade)"/><path d={path(goals)} className="goal-path"/><path d={capitalPath} className="capital-path"/>
        {plan.retirementMonth !== null && plan.retirementMonth >= startMonth && plan.retirementMonth <= endMonth && <line x1={x(plan.retirementMonth)} x2={x(plan.retirementMonth)} y1="30" y2="315" className="milestone-line"/>}
        <line x1={x(selected.month)} x2={x(selected.month)} y1="30" y2="315" className="selection-line"/><circle cx={x(selected.month)} cy={y(convert(selected.capitalReal, selected))} r="7" className="selection-dot"/>
        <text x="52" y="346" className="axis-label">{formatAge(scenario.currentAge, startMonth)}</text><text x="800" y="346" className="axis-label" textAnchor="end">{formatAge(scenario.currentAge, endMonth)}</text>
        {hovered && <g className="chart-tooltip" transform={`translate(${Math.max(52, Math.min(580, x(selected.month) + 12))},42)`} pointerEvents="none"><rect width="220" height="103" rx="8"/><text x="12" y="20" className="chart-tooltip-title">{formatAge(scenario.currentAge, selected.month)}</text><text x="12" y="42">Patrimonio: {show(selected.capitalReal)}</text><text x="12" y="62">Meta: {show(plan.goalReal)}</text><text x="12" y="82">{selected.phase === 'acumular' ? `Aporte/mes: ${show(selected.flowReal)}` : `Retiro/mes: ${show(selected.expensesReal)}`}</text></g>}
      </svg></div>
      <div className="age-selector"><label htmlFor="age-select">Explorar edad <strong>{formatAge(scenario.currentAge, selected.month)}</strong></label><input id="age-select" type="range" min={startMonth} max={endMonth} value={selected.month} onChange={event => setChosen(Number(event.target.value))}/></div>
      <div className="selected-details" aria-live="polite"><p className="selected-unit">{view === 'real' ? 'Bs de hoy: importes futuros descontados por la inflación configurada.' : `Bs futuros: importes nominales a los ${formatAge(scenario.currentAge, selected.month)}.`}</p><div><span>Patrimonio</span><strong>{show(selected.capitalReal)}</strong></div><div><span>Meta</span><strong>{show(plan.goalReal)}</strong></div>{cells.map(([label, value]) => <div key={label}><span>{label}</span><strong>{show(value)}</strong></div>)}</div>
      {selected.uncoveredReal > 0 && <p className="shortfall-note">En este punto, {show(selected.uncoveredReal)} de gastos quedan sin cubrir.</p>}
    </div>
    <details className="data-details"><summary>Ver trayectoria en tabla · {points.length} fechas</summary><div className="table-scroll"><table><thead><tr><th>Edad</th><th>Etapa</th><th>Ingreso/mes</th><th>Gastos/mes</th><th>Aporte o retiro/mes</th><th>Patrimonio</th><th>Meta</th></tr></thead><tbody>{points.map(p => <tr key={`${p.phase}-${p.month}`}><th>{formatAge(scenario.currentAge, p.month)}</th><td>{p.phase === 'acumular' ? 'Acumulación' : 'Retiro'}</td><td>{show(p.incomeReal, p)}</td><td>{show(p.expensesReal, p)}</td><td>{show(p.flowReal, p)}</td><td>{show(p.capitalReal, p)}</td><td>{show(plan.goalReal, p)}</td></tr>)}</tbody></table></div></details>
  </section>
}

function Results({ plan, scenario, view, setView }: { plan: Plan, scenario: Scenario, view: MoneyView, setView: (v: MoneyView) => void }) {
  const resultMonth = scenario.question === 'required-income'
    ? (scenario.targetAge - scenario.currentAge) * 12
    : plan.reachedMonth ?? (scenario.horizonAge - scenario.currentAge) * 12
  const goalNominal = toMoneyView(plan.goalReal, resultMonth, scenario.inflation, 'nominal')
  const withdrawalNominal = toMoneyView(plan.withdrawalReal, resultMonth, scenario.inflation, 'nominal')
  const duration = `${Math.floor(resultMonth / 12)} años${resultMonth % 12 ? ` y ${resultMonth % 12} meses` : ''}`
  const referenceAge = formatAge(scenario.currentAge, resultMonth)
  const pending = scenario.question === 'target-age' && plan.reachedMonth === null
  const answer = scenario.question === 'required-income' ? plan.status === 'uncomputable' ? 'Fuera de rango' : bs(plan.startingIncome ?? 0) : pending ? 'No se alcanza en el horizonte' : formatAge(scenario.currentAge, plan.reachedMonth ?? 0)
  const description = scenario.question === 'required-income' ? `Ingreso neto inicial para alcanzar tu meta a los ${scenario.targetAge} años.` : pending ? `A los ${scenario.horizonAge} años proyectas ${bs(plan.endCapitalReal)} de hoy.` : `Primera edad en que llegarías a ${bs(plan.goalReal)} de poder adquisitivo actual.`
  return <div className="results" aria-live="polite">
    <section className="answer-card"><div className="answer-top"><span className="answer-badge">Escenario ilustrativo</span><span>Tu respuesta</span></div><p className="answer-label">{scenario.question === 'required-income' ? 'Ingreso neto mensual inicial necesario' : 'Edad estimada para alcanzar la meta'}</p><h2 className={pending ? 'long-answer' : undefined}>{answer}</h2>{scenario.question === 'required-income' && plan.status === 'ready' && <p className="answer-unit">bolivianos netos al mes, desde hoy</p>}<p className="answer-description">{description}</p><div className="answer-bottom"><span>Hoy: {scenario.currentAge} años</span><span>Meta: {bs(plan.goalReal)} de hoy</span></div></section>
    <section className="capital-focus" aria-label="Capital ajustado por inflación"><div><p className="eyebrow">{pending ? 'Referencia al horizonte · meta pendiente' : 'Capital necesario ajustado por inflación'}</p><h2>{bs(goalNominal)}</h2><p>{pending ? `Cifra equivalente a los ${referenceAge}; la meta no se alcanzó.` : `Necesarios a los ${referenceAge} en bolivianos de esa fecha.`}</p></div><div className="capital-context"><span>{bs(plan.goalReal)} de hoy</span><span>{duration} · inflación {pct(scenario.inflation)} anual</span></div></section>
    <div className="metrics-grid">
      <Metric label="Ahorro inicial mensual" value={plan.initialSaving === null ? '—' : bs(Math.max(0, plan.initialSaving))} detail={plan.initialSaving !== null && plan.initialSaving < 0 ? `Déficit inicial: ${bs(-plan.initialSaving)}` : plan.initialSavingRate !== null ? `${pct(Math.max(0, plan.initialSavingRate))} del ingreso inicial` : 'Sin ingreso inicial'}/>
      <Metric label={scenario.goalMode === 'capital' ? 'Retiro mensual derivado de tu meta' : 'Gasto mensual elegido para el retiro'} value={bs(plan.withdrawalReal)} detail={scenario.goalMode === 'capital' ? `${bs(plan.goalReal)} × ${pct(scenario.withdrawalRate)} ÷ 12. Tus gastos de hoy son ${bs(scenario.monthlyExpenses)}/mes. Equivale a ${bs(withdrawalNominal)} nominales a los ${referenceAge}.` : `${bs(withdrawalNominal)} nominales a los ${referenceAge}. Tus gastos actuales de ${bs(scenario.monthlyExpenses)}/mes son una entrada distinta.`}/>
      <Metric label="Sueldo al finalizar · nominal" value={plan.lastSalaryNominal === null ? '—' : bs(plan.lastSalaryNominal)} detail={plan.lastSalaryMonth === null ? 'Sin proyección' : plan.lastSalaryMonth === 0 ? 'Sueldo de hoy; no hubo meses de trabajo proyectados' : plan.status === 'not-reached' ? `Al horizonte: ${formatAge(scenario.currentAge, plan.lastSalaryMonth)}; la meta no se alcanzó` : `A los ${formatAge(scenario.currentAge, plan.lastSalaryMonth)}`}/>
      <Metric label="Sueldo al finalizar · Bs de hoy" value={plan.lastSalaryReal === null ? '—' : bs(plan.lastSalaryReal)} detail="Equivalente en poder adquisitivo actual"/>
    </div>
    {plan.status === 'uncomputable' && <p className="result-alert">Estos valores exceden el rango del cálculo. Reduce la meta o revisa el plazo.</p>}
    {plan.status === 'horizon-reached' && <p className="result-alert">La meta se alcanza justo al cumplir 100 años. La proyección del retiro termina en esa edad.</p>}
    {plan.status === 'ready' && plan.depletionMonth !== null && <p className="result-alert">Bajo estos supuestos constantes, el patrimonio se agotaría cerca de los <strong>{formatAge(scenario.currentAge, plan.depletionMonth)}</strong>.</p>}
    {plan.accumulation.length + plan.retirement.length > 2 && <Timeline plan={plan} scenario={scenario} view={view} setView={setView}/>}
  </div>
}

export default function App() {
  const [savedSettings] = useState(loadSettings)
  const [raw, setRaw] = useState(savedSettings.raw)
  const [question, setQuestion] = useState(savedSettings.question)
  const [goalMode, setGoalMode] = useState(savedSettings.goalMode)
  const [view, setView] = useState(savedSettings.view)
  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ raw, question, goalMode, view })) } catch { /* Storage is optional. */ }
  }, [raw, question, goalMode, view])
  const scenario = useMemo(() => parse(raw, question, goalMode), [raw, question, goalMode])
  const errors = useMemo(() => validateScenario(scenario), [scenario])
  const valid = Object.keys(errors).length === 0
  const currentInvalid = ['currentAge', 'monthlyIncome', 'monthlyExpenses', 'initialCapital'].some(name => errors[name as NumericField])
  const assumptionsInvalid = ['salaryGrowth', 'salaryIntervalMonths', 'nominalReturn'].some(name => errors[name as NumericField])
  const goalInvalid = ['targetCapital', 'retirementSpending', 'targetAge', 'inflation', 'withdrawalRate'].some(name => errors[name as NumericField])
  const plan = useMemo(() => valid ? calculatePlan(scenario) : null, [scenario, valid])
  const change = (name: NumericField, value: string) => setRaw(previous => ({ ...previous, [name]: value }))
  const input = (name: NumericField) => <Input name={name} value={raw[name]} error={errors[name]} change={change}/>
  const reset = () => { setRaw(initialRaw()); setQuestion(DEFAULT_SCENARIO.question); setGoalMode(DEFAULT_SCENARIO.goalMode); setView('real') }
  return <div className="site-shell">
    <header className="site-header"><div className="brand"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span>horizonte<span className="brand-dot">.</span></span></div><a href="#metodologia">Cómo se calcula <span aria-hidden="true">↗</span></a></header>
    <main>
      <section className="intro"><div><p className="eyebrow">Tu mapa financiero personal</p><h1>Tu retiro empieza con una <em>pregunta clara.</em></h1><p>Define una meta en bolivianos de hoy. Verás cuánto capital necesitarías en la fecha elegida después de ajustar por inflación.</p></div><div className="intro-aside"><span/><p>22 <b>→</b> 42</p><small>Un camino posible, no una fecha prometida.</small></div></section>
      <div className="workspace"><aside className="controls" aria-label="Ajustes del escenario"><div className="controls-heading"><div><p className="eyebrow">Tu escenario</p><h2>Ajusta el plan</h2></div><button type="button" className="reset-button" onClick={reset}>Restablecer</button></div>
        <fieldset className="mode-group"><legend>¿Qué quieres saber?</legend><div className="segmented"><button type="button" className={question === 'required-income' ? 'active' : ''} aria-pressed={question === 'required-income'} onClick={() => setQuestion('required-income')}>Ingreso necesario</button><button type="button" className={question === 'target-age' ? 'active' : ''} aria-pressed={question === 'target-age'} onClick={() => setQuestion('target-age')}>Edad de logro</button></div><p>«Edad de logro» es cuándo alcanzarías la meta de capital.</p></fieldset>
        <ControlDetails title="01 · Tu situación actual" initiallyOpen invalid={currentInvalid}><div className="field-grid">{input('currentAge')}{question === 'target-age' && input('monthlyIncome')}{input('monthlyExpenses')}{input('initialCapital')}</div></ControlDetails>
        <ControlDetails title="02 · Supuestos de la proyección" initiallyOpen invalid={assumptionsInvalid}><div className="field-grid">{input('salaryGrowth')}{input('salaryIntervalMonths')}{input('nominalReturn')}</div><p className="section-hint">Con {pct(scenario.inflation)} de inflación, el rendimiento equivale a {Number.isFinite(scenario.nominalReturn) && Number.isFinite(scenario.inflation) && scenario.inflation > -100 ? pct(realReturnRate(scenario.nominalReturn, scenario.inflation)) : '—'} anual en poder adquisitivo de hoy. La proyección se extiende hasta los 100 años.</p></ControlDetails>
        <ControlDetails title="03 · Tu objetivo" initiallyOpen invalid={goalInvalid}>
          <fieldset className="mode-group goal-group"><legend>Define la meta por</legend><div className="segmented"><button type="button" className={goalMode === 'capital' ? 'active' : ''} aria-pressed={goalMode === 'capital'} onClick={() => setGoalMode('capital')}>Capital</button><button type="button" className={goalMode === 'spending' ? 'active' : ''} aria-pressed={goalMode === 'spending'} onClick={() => setGoalMode('spending')}>Gasto al retirarte</button></div></fieldset>
          <div className="field-grid">{goalMode === 'capital' ? input('targetCapital') : input('retirementSpending')}{question === 'required-income' && input('targetAge')}{input('inflation')}{input('withdrawalRate')}</div>
          {goalMode === 'spending' && plan && <div className="goal-preview"><span>Capital calculado para ese gasto</span><strong>{bs(plan.goalReal)} de hoy</strong><small>{bs(scenario.retirementSpending)} al mes × 12 ÷ {pct(scenario.withdrawalRate)}. El capital guardado en la pestaña «Capital» no se usa en este modo.</small></div>}
          <p className="section-hint">{goalMode === 'spending' ? 'El gasto elegido conserva el poder adquisitivo de hoy. En «Bs futuros» verás su importe ajustado por inflación a cada edad.' : 'La meta está en Bs de hoy; la cifra futura se ajusta según la edad y la inflación.'}</p>
        </ControlDetails>
      </aside><div className="content-column">{plan ? <Results plan={plan} scenario={scenario} view={view} setView={setView}/> : <section className="empty-state" aria-live="polite"><p className="eyebrow">Revisa tu escenario</p><h2>Hay valores por corregir.</h2><p>Los campos señalados indican qué falta o qué edades y tasas debes ajustar. Los resultados volverán al corregirlos.</p></section>}</div></div>
      <section className="methodology" id="metodologia"><div className="method-title"><p className="eyebrow">Antes de decidir</p><h2>Qué significa esta proyección</h2><p>Explora opciones y observa cómo cambia el plan cuando cambian tus supuestos.</p></div><div className="method-grid"><div><span>01</span><h3>Dinero de hoy y futuro</h3><p>La meta se expresa siempre en Bs de hoy. La cifra necesaria en el futuro aumenta con la inflación y el plazo: capital de hoy × (1 + inflación anual) elevado a los años transcurridos.</p></div><div><span>02</span><h3>Sueldo y aportes</h3><p>El ingreso es neto y aumenta solo después de completar cada intervalo de meses. Entre aumentos, su valor nominal se mantiene fijo y su poder adquisitivo cambia con la inflación. Los gastos actuales reducen el ahorro disponible durante la etapa de trabajo.</p></div><div><span>03</span><h3>De dónde sale el retiro mensual</h3><p>Si eliges una meta de capital, el importe ilustrativo es capital × tasa inicial de retiro ÷ 12. No se calcula a partir de tus gastos actuales. Si eliges «Gasto al retirarte», ese importe es el gasto mensual que introduzcas. En ambos casos la tasa no es el rendimiento de la inversión.</p></div></div><div className="method-warning"><strong>La realidad tendrá altibajos.</strong><p>Inflación y rendimiento constantes son hipótesis, no pronósticos. La tasa de retiro no garantiza que el dinero dure. La calculadora descuenta la inflación del rendimiento indicado; las comisiones e impuestos deben descontarse antes de introducirlo. No modelamos pérdidas de mercado, cambios de gastos, impuestos particulares ni riesgo cambiario. La proyección fija hasta los 100 años no predice tu longevidad.</p></div></section>
    </main><footer className="site-footer"><span>horizonte.</span><span>Una herramienta para pensar el futuro, no una promesa financiera.</span></footer>
  </div>
}
