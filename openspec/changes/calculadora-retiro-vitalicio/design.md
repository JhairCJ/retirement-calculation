# Design

## Context

Ya existe una aplicación React local con un motor mensual de acumulación y retiro. Véanse `proposal.md` y `specs/planificacion-retiro/spec.md` para el comportamiento revisado. Los aumentos salariales por intervalo y el sueldo final ya están implementados. La opción añadida de meta nominal futura fija confundió la interpretación buscada; debe retirarse y la cifra ajustada por inflación debe pasar al primer plano.

## Goals / Non-Goals

**Goals:**
- Una aplicación React ligera que funcione sin servidor y recalcula de inmediato.
- Un motor de cálculo puro, separado de la interfaz, con convenciones financieras explícitas, aumentos salariales discretos y casos reproducibles.
- Una interfaz legible en móvil y escritorio, con controles accesibles, gráficos y explicación de unidades.

**Non-Goals:**
- Cuentas, almacenamiento remoto, integración bancaria o cotizaciones en tiempo real.
- Recomendaciones de inversión personalizadas, impuestos por jurisdicción o simulación probabilística de mercados.
- Pronosticar la edad de fallecimiento. Los 100 años son solo el límite fijo de la simulación.

## Decisions

### React con Vite y TypeScript, sin backend

La entrada y los resultados pertenecen a una sola sesión local; no hay operaciones que exijan identidad o persistencia remota. Vite permite iniciar el proyecto pequeño y TypeScript ayuda a mantener claras las unidades de cada tasa. Alternativa considerada: backend para hacer los cálculos; añade despliegue y superficie de fallo sin aportar valor a esta versión.

### Cálculo mensual en poder adquisitivo actual

El motor mantiene el patrimonio en bolivianos de hoy y usa tasas anuales efectivas convertidas a tasas mensuales compuestas. La persona introduce rendimiento nominal anual; el motor deriva el rendimiento real mediante `(1 + rendimiento_nominal) / (1 + inflación) - 1` y lo muestra en la interfaz. Para cada mes de acumulación: crecen los activos con el rendimiento real mensual y, al final, se aplica el flujo neto de ingreso menos gastos de ese mes. El sueldo nominal del mes `m` será `sueldo_inicial × (1 + aumento) ^ floor((m - 1) / intervalo_meses)`; así los meses 1 a N reciben el mismo sueldo y el primer aumento se cobra desde el mes N+1. Los gastos nominales crecen con la inflación. Ambos flujos se deflactan antes de alimentar el patrimonio real. Un flujo negativo reduce el patrimonio; si no alcanza, se registra el gasto descubierto y el patrimonio queda en cero. No se modelan deuda ni rentas adicionales.

La vista nominal de cada mes se obtiene multiplicando importes reales por el factor de inflación acumulada. Toda meta de capital, directa o derivada del gasto, se define en Bs de hoy. El umbral real permanece constante y su equivalente nominal del mes `m` es `meta × factorInflación(m)`. El ingreso necesario se resolverá contra el umbral real del mes objetivo; la edad de logro se detectará contra el mismo umbral real en cada mes, incluido el mes cero. La gráfica y la tabla usarán estas cifras coherentes: línea horizontal en Bs de hoy y creciente en Bs nominales si la inflación es positiva. La interfaz calculará la cifra nominal destacada en la edad objetivo, de primer logro o del horizonte pendiente, según la pregunta. Alternativa considerada: mantener dos simulaciones independientes, real y nominal; podrían divergir por redondeo o por aplicar tasas incoherentes. Para que el sueldo mostrado coincida exactamente con los meses de aumento, los resultados conservarán el importe nominal pagado en cada mes además de su equivalente real.

### Dos preguntas sobre el mismo motor

En «Ingreso necesario», una búsqueda binaria obtiene el menor ingreso mensual inicial que cubre todos los gastos proyectados y llega a la meta al mes de la edad objetivo. Los aumentos discretos elegidos se aplican a ese ingreso inicial. Si el patrimonio inicial ya alcanza la meta sin nuevos aportes, el resultado puede ser cero y la interfaz lo explicará; los gastos durante el camino siguen formando parte de la simulación. La búsqueda tiene un límite de iteraciones y muestra un estado no calculable si se exceden límites numéricos razonables. Después de resolver el ingreso, se recorre la trayectoria para localizar también el primer mes de logro, que puede ser anterior a la edad objetivo.

En «Edad para alcanzar la meta», se simula mes a mes el ingreso inicial indicado hasta la edad final de planificación y se devuelve el primer mes en que el patrimonio real llega a la meta. Se mostrarán años y meses, no una edad redondeada que sugiera precisión falsa. Alternativa considerada: una fórmula cerrada de anualidades; no permite tratar correctamente aumentos puntuales, gastos crecientes ni meses con flujos negativos.

### Sueldo final

El sueldo final será el sueldo del último mes de trabajo efectivamente modelado: el mes anterior al retiro planificado o el mes en que se alcanza la meta, según el modo. Si la meta ya estaba cubierta al inicio, se mostrará el sueldo de hoy como referencia y se aclarará que no hubo meses de trabajo proyectados. La interfaz mostrará el sueldo nominal pagado ese mes y su equivalente en Bs de hoy, calculado con la inflación acumulada hasta el mismo mes. Si la meta no se alcanza, usará el último mes del horizonte y lo etiquetará como tal.

### Meta de capital y retiro ilustrativo

Un selector determina si la meta activa es un capital directo o el capital derivado del gasto de retiro y la tasa inicial de retiro (`12 × gasto / tasa`). Ambas entradas están en Bs de hoy y no necesitan selector adicional de interpretación monetaria. La tasa de retiro solo convierte capital y gasto iniciales; no se usará como rendimiento del patrimonio. El retiro inicial real implícito para el capital directo será `metaReal × tasa / 12`, mientras el retiro nominal inicial se obtiene aplicando el factor de inflación del mes de retiro. Para el gasto de retiro ingresado en Bs de hoy, el retiro real inicial permanece igual al gasto indicado. La proyección posterior al retiro comienza al mes siguiente de alcanzar la meta (o al cumplir la edad objetivo en el modo de ingreso necesario), retira el gasto real al inicio de cada mes y aplica después el rendimiento real constante al saldo. El gasto real permanece constante; en nominal aumenta con inflación. Si el saldo no cubre un retiro, se marca el agotamiento. La proyección es ilustrativa y no produce una probabilidad de éxito.

### Presentación y estado

Los controles comparten un único estado de escenario y los resultados se derivan de él, sin guardar copias calculadas. Se retirará el estado `capitalMode` y su selector. La pantalla tendrá una secuencia clara: pregunta; situación actual; supuestos secundarios; objetivo; respuesta principal; detalles de ahorro, sueldo; trayectoria; metodología. Las tres secciones de entradas se podrán plegar. El horizonte se fijará en los 100 años. El capital nominal ajustado tendrá una tarjeta destacada inmediatamente junto a la respuesta, con edad, años transcurridos y equivalencia en Bs de hoy, sin depender del selector de vista. En «Edad de logro» sin meta alcanzada, el equivalente nominal a los 100 años se etiquetará como referencia pendiente. El selector Bs de hoy/Bs futuros se reservará para explorar la trayectoria. La gráfica y la tabla compartirán un rango visible que comienza en la edad actual y termina a los 100 años; acercar y alejar cambiará la densidad de datos, el cursor consultará meses concretos y el arrastre horizontal desplazará el rango cuando haya zoom. Se conservará un selector de edad accesible con teclado. En móvil se apilarán estos bloques en el mismo orden. Se usarán controles nativos etiquetados y gráficos SVG con una tabla textual equivalente para teclado y lectores de pantalla. Alternativa considerada: biblioteca de gráficos de gran tamaño; SVG evita una dependencia innecesaria.

## Risks / Trade-offs

- [Rendimientos constantes pueden dar una impresión excesiva de certeza] → Etiquetar todas las cifras como ilustrativas, mostrar supuestos junto al resultado y explicar que la volatilidad puede cambiar mucho el resultado.
- [Una tasa de retiro publicada para otra cartera o país puede parecer garantía local] → No codificar una tasa «segura»; usar 3% solo como valor inicial editable y explicar que no es promesa de sostenibilidad.
- [Tasas cercanas a límites extremos pueden desbordar los cálculos] → Validar rangos finitos, limitar el horizonte a una edad de planificación razonable y comprobar cada resultado antes de presentarlo.
- [El salario nominal creciente puede ocultar pérdida de poder adquisitivo] → Mostrar el sueldo final en Bs nominales y de hoy, además de ofrecer el cambio de vista real/nominal.
- [Los aumentos discretos pueden confundirse con una tasa anual] → Etiquetar explícitamente «por aumento» y «cada N meses», y mostrar el sueldo del último mes trabajado.
- [La cifra real como resultado principal puede ocultar el monto a acumular en el futuro] → Destacar el equivalente nominal a la edad de referencia y mostrar al lado el capital de hoy y los años de inflación usados.
- [El modelo no incluye comisiones, impuestos ni cambios de gastos por edad] → Indicar que se deben descontar comisiones e impuestos del rendimiento nominal antes de introducirlo y que el gasto inicial se mantiene en términos reales por simplificación.

## Migration Plan

No hay datos de usuario que migrar. Se elimina el selector de meta nominal fija y se mantiene el cálculo de meta real que ya era el valor inicial. La aplicación podrá seguir publicándose como sitio estático; revertir consiste en restaurar la versión anterior.
