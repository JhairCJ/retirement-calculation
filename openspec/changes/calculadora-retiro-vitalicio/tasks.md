# Tasks

## 1. Base de la aplicación

- [x] 1.1 Crear la aplicación React con Vite y TypeScript, scripts de desarrollo y compilación, y verificar que instala dependencias y compila una página inicial.
- [x] 1.2 Definir el tipo de escenario, valores iniciales y validación de entradas; verificar manualmente que edades incompatibles, campos vacíos y tasas fuera de rango muestran errores sin resultados inválidos.

## 2. Motor de planificación

- [x] 2.1 Implementar la conversión de tasas anuales efectivas a meses, la meta directa o derivada y las vistas real/nominal; verificar con pruebas los ejemplos Bs 5.000 al 3% → Bs 2.000.000 y Bs 2.000.000 a 20 años con 5% → aproximadamente Bs 5.306.595.
- [x] 2.2 Implementar la acumulación mes a mes con patrimonio inicial, sueldo creciente, gastos indexados, flujos al final del mes y déficit descubierto; verificar mediante pruebas que 0% real, diez años y Bs 12.500 mensuales producen Bs 1.500.000.
- [x] 2.3 Implementar el cálculo de ingreso inicial mínimo para una edad objetivo, incluidos capital ya suficiente y parámetros inviables; verificar con pruebas el ejemplo de Bs 15.000 de ingreso para Bs 1.500.000 en diez años sin rendimiento ni inflación.
- [x] 2.4 Implementar el cálculo del primer mes en que se alcanza la meta o el estado «No se alcanza en el horizonte»; verificar con pruebas la edad en años y meses y que salario e inflación iguales conservan el ingreso real.
- [x] 2.5 Implementar el retiro ilustrativo hasta la edad de planificación con retiros al inicio de mes; verificar con pruebas el retiro inicial implícito y la detección de agotamiento sin saldos disponibles negativos.

## 3. Interfaz y explicación

- [x] 3.1 Construir los controles etiquetados, selector de pregunta y método de meta, errores de campo y botón «Restablecer»; verificar en el navegador que cada cambio válido recalcula y que el teclado puede operar los controles.
- [x] 3.2 Presentar ingreso requerido o edad de logro, ahorro inicial, meta, retiro inicial y crecimiento salarial real implícito con unidades explícitas; verificar en el navegador los dos ejemplos numéricos de la especificación.
- [x] 3.3 Crear la trayectoria consultable por edad en vista real y nominal, con alternativa textual accesible y señal de agotamiento; verificar en móvil y escritorio que los valores seleccionados coinciden con los del motor.
- [x] 3.4 Añadir la explicación de supuestos, límites, aportes y retiros, y la aclaración de que «edad de logro» no predice la muerte; verificar que se puede consultar desde la página sin abrir documentación externa.

## 4. Integración

- [x] 4.1 Ejecutar las pruebas del motor, la compilación de producción y una revisión funcional de ambos modos con entradas válidas e inválidas; corregir los fallos encontrados y verificar de nuevo.

## 5. Aumentos por intervalo y comparaciones

- [x] 5.1 Sustituir la tasa salarial anual continua por porcentaje nominal por aumento e intervalo entero de meses, con 5% cada 12 meses como valores iniciales; verificar con pruebas meses 1–6 a Bs 8.000 y 7–12 a Bs 8.800 cuando el aumento es 10% semestral, además de intervalos inválidos.
- [x] 5.2 Actualizar el cálculo de ingreso inicial y edad de logro para usar los aumentos discretos y encontrar el primer mes de logro también en «Ingreso necesario»; verificar con pruebas los casos sin aumentos, logro anticipado y meta fuera del horizonte.
- [x] 5.3 Calcular el sueldo nominal del último mes trabajado y su equivalente en Bs de hoy, incluidos logro inicial y meta no alcanzada; verificar con pruebas el ejemplo de Bs 8.800 en el mes 12 y la conversión Bs 10.000 nominales / 1,25 = Bs 8.000 reales.
- [x] 5.4 Implementar el escenario sin inflación conservando retorno nominal, sueldo inicial y eventos salariales; verificar con pruebas igualdad de edades cuando inflación es 0%, comparación con inflación positiva y ausencia de diferencia numérica cuando una meta no se alcanza.
- [x] 5.5 Actualizar controles, resumen de sueldo final, comparación de edades y explicación de supuestos; verificar en navegador que los cambios de intervalo recalculan ambos modos y que las unidades y estados «No se alcanza» son claros en móvil y escritorio.

## 6. Integración de la revisión

- [x] 6.1 Ejecutar pruebas, lint, compilación y revisión funcional de ambos modos con intervalos válidos e inválidos; corregir los fallos encontrados y verificar de nuevo.

## 7. Interpretación de la meta de capital (implementación previa que se reemplaza)

- [x] 7.1 Añadir el modo de meta directa «Bs de hoy» o «Bs futuros» con el primero como valor inicial; calcular el umbral real y nominal para cada mes y cubrir con pruebas ambos ejemplos de Bs 2.000.000 a 20 años con 5% de inflación.
- [x] 7.2 Aplicar el umbral mensual al ingreso necesario, al primer mes de logro y a la comparación sin inflación; comprobar con pruebas que una meta nominal alcanzada antes del plazo no exige el capital real del plazo objetivo.
- [x] 7.3 Calcular el retiro inicial implícito en Bs de hoy y nominales al mes de retiro para ambos modos, y mantener la meta derivada del gasto como meta real; verificar los ejemplos de tasa del 3%.
- [x] 7.4 Añadir el selector y las etiquetas de unidad en controles, resultados, gráfica y tabla; verificar en navegador los dos modos de pregunta, ambas vistas monetarias y las líneas de meta en escritorio y móvil.
- [x] 7.5 Ejecutar pruebas, lint, compilación, validación OpenSpec y revisión funcional; corregir los fallos encontrados.

## 8. Meta indexada y orden de la interfaz

- [x] 8.1 Retirar el estado, selector y ramas de cálculo de «Bs futuros fijos»; dejar toda meta directa y derivada en Bs de hoy y verificar que el umbral real permanece constante mientras el nominal crece con inflación.
- [x] 8.2 Destacar el capital nominal ajustado a la edad objetivo en «Ingreso necesario» y a la primera edad de logro en «Edad de logro»; mostrar al lado la meta en Bs de hoy y los años de inflación aplicados, incluidos los casos de logro inicial y meta pendiente al horizonte.
- [x] 8.3 Reorganizar los controles y resultados según la secuencia del diseño, eliminar selectores monetarios redundantes y mantener la vista real/nominal solo para explorar la trayectoria; comprobar que el resultado principal y la meta futura son legibles en móvil y escritorio.
- [x] 8.4 Actualizar las pruebas del motor y del navegador para Bs 2.000.000 de hoy a 20 años con 5% → aproximadamente Bs 5.306.595 nominales, cambios de edad e inflación, primer logro y meta fuera del horizonte; retirar pruebas del modo nominal fijo.
- [x] 8.5 Ejecutar pruebas, lint, compilación, validación OpenSpec y revisión funcional; corregir los fallos encontrados.

## 9. Horizonte fijo y exploración de la trayectoria

- [x] 9.1 Fijar la planificación de la página hasta los 100 años, retirar el campo de edad final y cubrir el límite de retiro a los 100 sin proyectar meses posteriores.
- [x] 9.2 Añadir zoom compartido para gráfica y tabla, con rango inicial desde la edad actual hasta los 100 años y mayor detalle temporal al acercar.
- [x] 9.3 Permitir consulta mensual al pasar el cursor y desplazamiento horizontal del rango al arrastrar la gráfica, conservando el selector de edad para teclado.
- [x] 9.4 Verificar pruebas del motor, lint, compilación, validación OpenSpec e interacción en escritorio y móvil.

## 10. Simplificación de resultados

- [x] 10.1 Retirar de la interfaz y del motor la comparación hipotética sin inflación, junto con sus pruebas y estilos. Las tareas anteriores sobre esa comparación quedan reemplazadas.
- [x] 10.2 Quitar la ayuda redundante del rendimiento y el aviso de que el patrimonio no se agota; conservar el aviso cuando se proyecta agotamiento.
- [x] 10.3 Validar pruebas, lint, compilación, OpenSpec y revisión funcional en escritorio y móvil.

## 11. Persistencia de ajustes

- [x] 11.1 Guardar y restaurar las entradas y selecciones del escenario en el almacenamiento local del navegador, con valores iniciales si no hay datos válidos.
- [x] 11.2 Abrir inicialmente «Supuestos de la proyección» y comprobar recarga y «Restablecer» en navegador.
- [x] 11.3 Ejecutar pruebas, lint, compilación y validación OpenSpec.

## 12. Exploración sin deslizador y panel independiente

- [x] 12.1 Quitar el deslizador de edad y permitir recorrer la gráfica con las flechas del teclado además del cursor.
- [x] 12.2 Dar al panel de ajustes un desplazamiento vertical propio y mantenerlo visible junto a los resultados en escritorio; conservar desplazamiento normal en móvil.
- [x] 12.3 Verificar pruebas, lint, compilación, interacción en navegador y validación OpenSpec.



