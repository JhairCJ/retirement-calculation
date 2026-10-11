# Spec Delta

## Purpose

Permitir que una persona explore, con supuestos ajustables y resultados comprensibles, el ingreso y el tiempo necesarios para financiar una meta de retiro en bolivianos.

## ADDED Requirements

### Requirement: Entradas ajustables y valores iniciales
El sistema SHALL ofrecer entradas para edad actual, edad objetivo de retiro, ingreso neto mensual actual, porcentaje nominal de aumento por evento salarial, intervalo entre aumentos en meses, gasto mensual actual, patrimonio invertido inicial, inflación anual, rendimiento nominal anual de la inversión, tasa inicial de retiro y meta de capital o gasto mensual deseado en retiro. SHALL calcular automáticamente el rendimiento real efectivo como `(1 + rendimiento_nominal) / (1 + inflación) - 1` y mostrarlo junto al supuesto. La planificación SHALL extenderse siempre hasta los 100 años, sin entrada para cambiar esa edad. La meta de capital directo SHALL introducirse siempre en bolivianos de poder adquisitivo actual, sin selector de meta nominal futura fija. SHALL iniciar con un escenario ilustrativo basado en 22 años, Bs 2.500 de gastos, Bs 2.000.000 de meta en Bs de hoy, 5% de inflación, 9,2% de rendimiento nominal (equivalente a 4% real) y 3% de tasa de retiro. El supuesto salarial inicial SHALL ser un aumento del 5% cada 12 meses y SHALL poder modificarse independientemente de la inflación.

#### Scenario: Cambio de supuesto
- **WHEN** la persona modifica una entrada válida
- **THEN** los resultados y las visualizaciones se recalculan con ese valor sin recargar la página

#### Scenario: Restablecimiento
- **WHEN** la persona activa «Restablecer»
- **THEN** todas las entradas vuelven al escenario ilustrativo inicial

### Requirement: Validación de entradas
El sistema SHALL impedir resultados numéricos engañosos cuando las entradas sean inválidas o incompatibles. SHALL señalar el campo y la corrección necesaria; la edad objetivo SHALL ser mayor que la actual y no superar los 100 años, la tasa de retiro SHALL ser mayor que cero y el intervalo entre aumentos SHALL ser un número entero positivo de meses. Una meta alcanzada justo a los 100 años SHALL indicarse como fin del horizonte, sin proyectar retiros posteriores.

#### Scenario: Edad objetivo imposible
- **WHEN** la edad objetivo es igual o menor que la edad actual
- **THEN** el sistema informa el error y no presenta un ingreso requerido calculado para ese escenario

#### Scenario: Valor no numérico
- **WHEN** una entrada numérica queda vacía o contiene un valor no válido
- **THEN** el sistema señala la entrada y evita mostrar `NaN`, infinito u otro resultado inválido

#### Scenario: Intervalo salarial inválido
- **WHEN** el intervalo entre aumentos está vacío, es fraccionario o es cero
- **THEN** el sistema señala ese campo y no presenta resultados calculados con esa cadencia

### Requirement: Aumentos salariales por intervalos ajustables
El sistema SHALL aplicar el porcentaje de aumento salarial configurado solo al terminar cada intervalo completo de meses desde el inicio del plan. El nuevo sueldo SHALL regir desde el mes siguiente; entre aumentos, el sueldo nominal SHALL permanecer constante. SHALL permitir ajustar tanto el porcentaje por aumento como el número de meses entre aumentos, sin confundirlos con una tasa anual continua.

#### Scenario: Aumento semestral
- **WHEN** el sueldo inicial es Bs 8.000, el aumento es 10% cada 6 meses y no hay inflación
- **THEN** el sueldo de los meses 1 a 6 es Bs 8.000 y el de los meses 7 a 12 es Bs 8.800

#### Scenario: Intervalo mayor que el plazo de trabajo
- **WHEN** la persona se retira antes de completar el primer intervalo salarial
- **THEN** el sueldo nominal del último mes trabajado sigue siendo el sueldo inicial

### Requirement: Definición de la meta de retiro
El sistema SHALL permitir fijar directamente una meta de capital en bolivianos de hoy o derivarla del gasto mensual deseado en retiro mediante `capital = gasto mensual × 12 / tasa inicial de retiro`. Ambas formas SHALL definir un umbral real constante. Su equivalente nominal en el mes `m` SHALL ser `meta × factor_inflación(m)`, con `factor_inflación(m) = (1 + inflación_anual)^(m/12)`. La calculadora SHALL buscar el primer mes en que el patrimonio real llegue a ese umbral. SHALL mostrar el retiro mensual inicial implícito en Bs de hoy y su equivalente nominal al retirarse. SHALL identificar claramente qué método determina la meta activa.

#### Scenario: Meta derivada del gasto
- **WHEN** el gasto deseado es Bs 5.000 mensuales y la tasa inicial de retiro es 3%
- **THEN** el sistema muestra una meta de Bs 2.000.000 de poder adquisitivo actual

#### Scenario: Meta de capital directa
- **WHEN** la meta directa es Bs 1.500.000 y la tasa inicial de retiro es 3%
- **THEN** el sistema muestra un retiro inicial ilustrativo de Bs 3.750 mensuales de poder adquisitivo actual

#### Scenario: Meta actual ajustada por inflación
- **WHEN** la meta directa es Bs 2.000.000 de hoy, la inflación es 5% anual y el retiro objetivo ocurre en 20 años
- **THEN** el umbral sigue siendo Bs 2.000.000 reales y la cifra principal de capital necesario al retirarse es aproximadamente Bs 5.306.595 nominales

#### Scenario: Cambio de plazo e inflación
- **WHEN** la meta es Bs 2.000.000 de hoy y la persona cambia la edad objetivo o la inflación
- **THEN** la cifra nominal destacada se recalcula con los años entre la edad actual y la nueva edad objetivo, mientras el umbral real permanece en Bs 2.000.000

#### Scenario: Meta alcanzada antes del plazo objetivo
- **WHEN** el patrimonio alcanza el umbral real antes de la edad objetivo
- **THEN** la edad de primer logro usa el umbral real constante y el capital nominal equivalente de ese primer mes; el capital necesario a la edad objetivo sigue calculándose para el plazo elegido

### Requirement: Ingreso necesario para una edad objetivo
El sistema SHALL calcular el ingreso neto mensual inicial mínimo que, junto con patrimonio inicial, gastos y aumentos salariales configurados, permite alcanzar la meta al cumplir la edad objetivo. SHALL mostrar también el ahorro mensual inicial y la fracción inicial del ingreso destinada al ahorro. El cálculo SHALL considerar aportes al final de cada mes y rendimiento compuesto, y SHALL evitar asumir aportes que excedan el ingreso disponible después de gastos.

#### Scenario: Rendimiento real nulo
- **WHEN** la edad actual es 22, la objetivo 32, el patrimonio inicial cero, la meta Bs 1.500.000, el rendimiento real 0%, la inflación 0%, el crecimiento salarial 0% y el gasto mensual Bs 2.500
- **THEN** el ingreso requerido es aproximadamente Bs 15.000 mensuales de hoy, con Bs 12.500 de aporte inicial

#### Scenario: Meta ya cubierta
- **WHEN** el patrimonio inicial, proyectado hasta la edad objetivo, ya cubre la meta sin aportes adicionales
- **THEN** el sistema indica que no se requiere ahorro adicional para alcanzar esa meta y no presenta un ingreso negativo

### Requirement: Edad para alcanzar la meta con ingreso proyectado
El sistema SHALL estimar el primer mes en que el patrimonio proyectado alcanza la meta, a partir del ingreso neto mensual actual y los aumentos salariales por intervalo configurados. SHALL informar la edad alcanzada en años y meses, o indicar que la meta no se alcanza dentro del horizonte de planificación. «Edad para alcanzar la meta» SHALL referirse al patrimonio objetivo y nunca a una predicción de muerte.

#### Scenario: Aumentos anuales frente a inflación
- **WHEN** el sueldo sube 5% cada 12 meses y la inflación es 5% anual
- **THEN** el sueldo real disminuye entre aumentos y vuelve aproximadamente al nivel inicial después de cada aumento anual

#### Scenario: Meta fuera de horizonte
- **WHEN** el patrimonio no alcanza la meta antes de la edad final de planificación
- **THEN** el sistema indica «No se alcanza en el horizonte» y muestra el patrimonio proyectado al final, sin inventar una edad de logro

### Requirement: Sueldo al finalizar la etapa de ahorro
El sistema SHALL mostrar el sueldo neto mensual del último mes trabajado antes del retiro planificado o antes del primer mes en que se alcanza la meta, según la pregunta activa. SHALL mostrar ese sueldo tanto en bolivianos nominales de ese mes como en bolivianos de poder adquisitivo actual e indicar la edad a la que corresponde. Si no se alcanza la meta dentro del horizonte, SHALL mostrar el sueldo del último mes proyectado y señalar que no es un sueldo de retiro alcanzado.

#### Scenario: Sueldo final después de un aumento
- **WHEN** el sueldo inicial es Bs 8.000, sube 10% cada 6 meses y la etapa de ahorro termina después del mes 12 sin inflación
- **THEN** el sueldo del último mes trabajado es Bs 8.800; el aumento siguiente todavía no se aplica a ese sueldo

#### Scenario: Sueldo final real y nominal
- **WHEN** el sueldo nominal del último mes trabajado es Bs 10.000 y la inflación acumulada hasta ese mes es 25%
- **THEN** el sistema muestra Bs 10.000 nominales y el equivalente aproximado a Bs 8.000 de hoy

### Requirement: Valores reales y nominales
El sistema SHALL distinguir bolivianos de poder adquisitivo actual de bolivianos nominales del año proyectado. SHALL aplicar inflación a ingresos, gastos, aportes y a la meta nominal de cada mes. SHALL convertir el rendimiento nominal introducido a rendimiento real antes de proyectar el patrimonio en bolivianos de hoy. La tasa de retiro SHALL usarse como referencia para el gasto inicial, no como tasa de rendimiento de la inversión.

#### Scenario: Meta nominal futura
- **WHEN** la meta es Bs 2.000.000 de hoy, la inflación es 5% anual y faltan 20 años para retirarse
- **THEN** el sistema muestra una meta nominal futura cercana a Bs 5.306.595

#### Scenario: Cambio de unidad sin cambiar la meta
- **WHEN** la persona alterna la vista entre Bs de hoy y Bs futuros
- **THEN** el sistema convierte el patrimonio y el umbral del mes mostrado sin cambiar la edad calculada ni ocultar el capital nominal necesario en la fecha de referencia

### Requirement: Evolución del plan
El sistema SHALL presentar una visualización por edad del patrimonio, el umbral de meta correspondiente a cada mes y los flujos principales durante la acumulación, y una proyección ilustrativa de patrimonio y retiros durante el retiro hasta los 100 años. La gráfica y la tabla SHALL mostrar inicialmente el rango completo desde la edad actual hasta los 100 años. Los controles de acercar y alejar SHALL cambiar conjuntamente el rango visible y el detalle temporal de gráfica y tabla; al acercar, la persona SHALL poder arrastrar horizontalmente la gráfica para mover el periodo. Al pasar el cursor sobre la gráfica, SHALL mostrar los datos del mes bajo el cursor y actualizar la edad seleccionada. SHALL conservar un selector de edad utilizable con teclado. SHALL permitir alternar la vista real y nominal sin alterar los supuestos. La línea de meta SHALL permanecer horizontal en vista real y crecer en vista nominal con inflación positiva.

#### Scenario: Zoom y desplazamiento de la trayectoria
- **WHEN** la persona acerca la gráfica y la arrastra hacia un periodo posterior
- **THEN** la gráfica y las filas de la tabla muestran el mismo nuevo rango de edades sin cambiar los cálculos del plan

#### Scenario: Consulta directa en la gráfica
- **WHEN** la persona pasa el cursor por un punto de la gráfica
- **THEN** ve la edad y los importes de ese mes en la unidad monetaria activa

#### Scenario: Inspección de la trayectoria
- **WHEN** la persona consulta un año proyectado
- **THEN** puede ver la edad, ingreso, gastos, aporte o déficit, patrimonio y meta de ese momento con la unidad monetaria indicada

#### Scenario: Agotamiento ilustrativo
- **WHEN** el retiro mensual proyectado agota el patrimonio antes de la edad final de planificación bajo los supuestos constantes
- **THEN** el sistema señala la edad aproximada de agotamiento y evita representar patrimonio negativo como dinero disponible

### Requirement: Jerarquía clara de la interfaz
El sistema SHALL presentar la pregunta y luego las secciones plegables «Tu situación actual», «Supuestos de la proyección» y «Tu objetivo», en ese orden, inicialmente abiertas, sin repetir selectores de unidad para definir el capital. SHALL conservar en el navegador las entradas numéricas, el modo de pregunta, el método de meta y la vista monetaria al recargar. «Restablecer» SHALL devolver esos ajustes a sus valores iniciales y conservar ese restablecimiento al recargar. SHALL destacar junto al resultado principal el capital nominal necesario en la fecha de referencia, los años usados para ajustarlo y su equivalencia en Bs de hoy. En «Ingreso necesario», la fecha de referencia SHALL ser la edad objetivo; en «Edad de logro», SHALL ser la primera edad alcanzada o, si no se alcanza, los 100 años con una etiqueta explícita de que la meta sigue pendiente. La vista real o nominal de la trayectoria SHALL ser un control separado para explorar importes, no para definir la meta. Los detalles de sueldo, ahorro y trayectoria SHALL seguir a la respuesta principal en una secuencia legible en móvil y escritorio.

#### Scenario: Meta ajustada destacada
- **WHEN** la persona tiene 22 años, elige retiro a los 42, meta de Bs 2.000.000 de hoy e inflación anual de 5%
- **THEN** la respuesta muestra de forma prominente «Bs 5.306.595 necesarios a los 42 años», el plazo de 20 años y «equivale a Bs 2.000.000 de hoy» sin requerir cambiar la vista monetaria

#### Scenario: Meta pendiente al final del horizonte
- **WHEN** la meta no se alcanza en «Edad de logro»
- **THEN** la página distingue el capital nominal equivalente a la edad final de planificación de un logro real y mantiene visible el resultado «No se alcanza en el horizonte»

#### Scenario: Ajustes tras recargar
- **WHEN** la persona cambia valores y selecciones del escenario y recarga la página
- **THEN** los mismos ajustes y la vista monetaria reaparecen; las tres secciones de controles comienzan abiertas

#### Scenario: Restablecimiento persistente
- **WHEN** la persona pulsa «Restablecer» y recarga la página
- **THEN** ve los valores iniciales en lugar de los ajustes anteriores

### Requirement: Supuestos y límites visibles
El sistema SHALL explicar que los resultados son escenarios hipotéticos, que el rendimiento y la inflación constantes no representan volatilidad real, que la tasa inicial de retiro no garantiza duración del capital y que el límite fijo de 100 años no predice la longevidad. SHALL mostrar de forma accesible que los ingresos son netos, los aumentos salariales ocurren al completar cada intervalo, los gastos se indexan con inflación y las aportaciones ocurren al fin de cada mes.

#### Scenario: Consulta de metodología
- **WHEN** la persona abre la explicación del cálculo
- **THEN** puede identificar qué tasas son reales o nominales, cómo se determina la meta y qué significan los resultados sin recurrir al análisis original
