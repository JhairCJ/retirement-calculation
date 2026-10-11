# Proposal

## Why

El análisis inicial ofrece escenarios útiles, pero sus tablas fijas no permiten adaptar el plan a aumentos de sueldo que ocurren en distintos intervalos ni distinguir fácilmente entre bolivianos actuales y futuros. Una calculadora interactiva permitirá explorar cuánto ingresar y ahorrar para una edad de retiro elegida, cuándo se alcanzaría una meta y cómo cambia ese plazo por la inflación.

## What Changes

- Crear una página web en React, en español y con bolivianos (Bs) como moneda inicial, para explorar un plan de independencia financiera.
- Permitir ajustar edad actual, edad objetivo, ingreso neto, porcentaje de aumento del sueldo y meses entre aumentos, gastos, patrimonio inicial, inflación, rendimiento de inversión, gasto deseado en retiro y tasa inicial de retiro.
- Ofrecer dos preguntas: ingreso mensual inicial necesario para una edad objetivo y edad estimada para alcanzar el capital objetivo con el ingreso indicado.
- Interpretar siempre la meta de capital directo como bolivianos de hoy que conservan poder adquisitivo. Mostrar como cifra destacada el capital nominal necesario en la fecha objetivo o estimada, ajustado a los años transcurridos y a la inflación configurada.
- Mostrar el sueldo neto mensual del último mes de trabajo, tanto en bolivianos nominales de esa fecha como en poder adquisitivo actual.
- Comparar la edad de logro del escenario con inflación con la de un escenario hipotético sin inflación, manteniendo iguales el sueldo inicial, los aumentos pactados y el rendimiento nominal de la inversión.
- Mostrar la evolución anual de ingreso, gastos, aportes y patrimonio, con vistas en poder adquisitivo actual y en valores nominales.
- Mostrar el capital requerido para el gasto de retiro, el retiro mensual inicial y una proyección ilustrativa del patrimonio durante el retiro hasta una edad de planificación ajustable.
- Ordenar la interfaz en torno a la pregunta, la meta y la respuesta principal; agrupar los supuestos secundarios y dejar trayectoria y metodología después del resultado.
- Explicar supuestos y límites del modelo, incluidos el carácter hipotético de los rendimientos y la ausencia de una predicción de longevidad o una garantía de sostenibilidad.

## Capabilities

### New Capabilities

- `planificacion-retiro`: Entradas ajustables, cálculos de acumulación y retiro, resultados y visualización de escenarios.

### Modified Capabilities

Ninguna.

## Impact

La aplicación React existente y su motor de cálculo deberán actualizar sus entradas, resultados y pruebas. Todo seguirá ejecutándose localmente en el navegador, sin backend ni cuentas. La interfaz y el motor deberán compartir definiciones explícitas de tasas reales, nominales, intervalos salariales y momentos de aportes y retiros.
