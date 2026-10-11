# retirement-calculation

Horizonte es una calculadora de retiro en React. Permite ajustar salario, frecuencia de aumentos, gastos, inflación y rendimiento de inversiones para estimar el ingreso mensual necesario o la edad en que se alcanzaría una meta de capital.

## Iniciar

```powershell
npm install
npm run dev
```

Abre la dirección que muestre Vite (normalmente `http://localhost:5173`). No requiere backend ni cuenta.

## Verificar

```powershell
npm run test
npm run lint
npm run build
```

Con el servidor de desarrollo en marcha, la comprobación funcional con Playwright se ejecuta con:

```powershell
python scripts/smoke.py
```

## Convenciones del cálculo

- Los resultados principales se expresan en bolivianos de poder adquisitivo actual. La vista nominal aplica la inflación acumulada al año proyectado.
- El ingreso indicado es neto y crece según la tasa nominal configurada. Los gastos mantienen su poder adquisitivo, por lo que sus importes nominales crecen con la inflación.
- El rendimiento introducido es nominal. La calculadora descuenta la inflación con la fórmula `(1 + rendimiento nominal) / (1 + inflación) - 1` y aplica la tasa real equivalente al patrimonio en bolivianos de hoy. El flujo neto de ingreso menos gastos entra o sale al final de cada mes.
- El retiro ilustrativo descuenta el gasto al inicio de cada mes y aplica después el rendimiento real al saldo. La tasa inicial de retiro determina el capital o el gasto de inicio; no es un rendimiento de inversión.
- La planificación llega hasta los 100 años como horizonte de cálculo. Los rendimientos constantes y la tasa de retiro no garantizan el resultado.
