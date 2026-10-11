from pathlib import Path
import re

from playwright.sync_api import sync_playwright


OUTPUT = Path('artifacts')
OUTPUT.mkdir(exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    errors = []
    desktop = browser.new_page(viewport={"width": 1440, "height": 900})
    desktop.on('pageerror', lambda error: errors.append(str(error)))
    desktop.goto('http://localhost:5173')
    desktop.wait_for_load_state('networkidle')

    assert desktop.get_by_text('Ingreso neto mensual inicial necesario').is_visible()
    assert desktop.get_by_role('button', name='Bs futuros fijos').count() == 0
    assert desktop.locator('#horizonAge').count() == 0
    assert '22 años → 100 años' in desktop.locator('.zoom-toolbar').inner_text()
    assert '5.306.595' in desktop.locator('.capital-focus').inner_text()
    assert '2.000.000 de hoy' in desktop.locator('.capital-focus').inner_text()
    assert '20 años' in desktop.locator('.capital-focus').inner_text()
    sections = desktop.locator('.control-details')
    assert sections.locator('summary').all_inner_texts() == [
        '01 · Tu situación actual',
        '02 · Supuestos de la proyección',
        '03 · Tu objetivo',
    ]
    assert sections.nth(0).get_attribute('open') is not None
    assert sections.nth(1).get_attribute('open') is None
    assert sections.nth(2).get_attribute('open') is not None
    sections.nth(0).locator('summary').click()
    assert sections.nth(0).get_attribute('open') is None
    sections.nth(0).locator('summary').click()
    sections.nth(2).locator('summary').click()
    assert sections.nth(2).get_attribute('open') is None
    sections.nth(2).locator('summary').click()
    retirement_metric = desktop.locator('.metric').filter(has_text='Retiro mensual derivado de tu meta')
    assert 'Bs 5.000' in retirement_metric.inner_text()
    assert 'Tus gastos de hoy son Bs 2.500/mes' in retirement_metric.inner_text()
    initial_income = desktop.locator('.answer-card h2').inner_text()
    desktop.screenshot(path=str(OUTPUT / 'desktop.png'), full_page=True)
    print('Meta a 20 años:', desktop.locator('.capital-focus h2').inner_text())

    desktop.locator('#targetAge').fill('47')
    assert '6.772.710' in desktop.locator('.capital-focus').inner_text()
    desktop.locator('#targetAge').fill('42')
    desktop.locator('#inflation').fill('0')
    assert '2.000.000' in desktop.locator('.capital-focus h2').inner_text()
    desktop.locator('#inflation').fill('5')
    assert desktop.locator('.answer-card h2').inner_text() == initial_income

    sections.nth(1).locator('summary').click()
    desktop.locator('#salaryIntervalMonths').fill('6')
    assert desktop.locator('.answer-card h2').inner_text() != initial_income
    desktop.locator('#salaryIntervalMonths').fill('12')
    desktop.locator('#targetAge').fill('32')
    desktop.locator('#targetCapital').fill('1500000')
    desktop.locator('#nominalReturn').fill('0')
    desktop.locator('#inflation').fill('0')
    desktop.locator('#salaryGrowth').fill('0')
    assert '15.000' in desktop.locator('.answer-card h2').inner_text()
    assert desktop.get_by_text('¿Y si no hubiera inflación?').count() == 0
    assert desktop.get_by_text('El patrimonio no se agota antes de los 100 años', exact=False).count() == 0

    desktop.get_by_role('button', name='Edad de logro').click()
    desktop.locator('#monthlyIncome').fill('15000')
    assert '32 años' in desktop.locator('.answer-card h2').inner_text()
    assert '1.500.000' in desktop.locator('.capital-focus h2').inner_text()
    desktop.locator('#inflation').fill('5')
    assert desktop.locator('.capital-focus h2').inner_text() != 'Bs 1.500.000'
    desktop.locator('#initialCapital').fill('1600000')
    assert '0 años' in desktop.locator('.capital-focus').inner_text()
    assert '1.500.000' in desktop.locator('.capital-focus h2').inner_text()
    desktop.locator('#initialCapital').fill('0')
    desktop.locator('#monthlyIncome').fill('2500')
    assert desktop.locator('.answer-card h2').inner_text() == 'No se alcanza en el horizonte'
    assert 'meta pendiente' in desktop.locator('.capital-focus').inner_text().lower()
    assert '100 años' in desktop.locator('.capital-focus').inner_text()

    desktop.locator('#salaryIntervalMonths').fill('0')
    assert desktop.locator('#salaryIntervalMonths').get_attribute('aria-invalid') == 'true'
    desktop.locator('#salaryIntervalMonths').fill('1.5')
    assert desktop.get_by_text('Usa un número entero de meses.').is_visible()
    desktop.locator('#salaryIntervalMonths').fill('12')
    desktop.locator('#monthlyIncome').fill('')
    assert desktop.get_by_text('Hay valores por corregir.').is_visible()
    desktop.get_by_role('button', name='Restablecer').click()
    assert desktop.locator('#monthlyIncome').count() == 0
    assert '5.306.595' in desktop.locator('.capital-focus').inner_text()
    desktop.locator('.data-details summary').click()
    full_rows = desktop.locator('.data-details tbody tr').count()
    desktop.get_by_role('button', name='Acercar gráfica y tabla').click()
    assert desktop.locator('.data-details tbody tr').count() < full_rows
    zoomed_range = desktop.locator('.zoom-toolbar strong').inner_text()
    assert zoomed_range != '22 años → 100 años'
    desktop.screenshot(path=str(OUTPUT / 'zoomed.png'), full_page=True)
    chart = desktop.locator('.chart-scroll svg')
    chart.scroll_into_view_if_needed()
    box = chart.bounding_box()
    assert box is not None
    x = box['x'] + box['width'] * 0.65
    y = box['y'] + box['height'] * 0.45
    desktop.mouse.move(x, y)
    assert desktop.locator('.chart-tooltip').is_visible()
    desktop.screenshot(path=str(OUTPUT / 'hover.png'), full_page=True)
    desktop.mouse.down()
    desktop.mouse.move(x - 120, y, steps=6)
    desktop.mouse.up()
    assert desktop.locator('.zoom-toolbar strong').inner_text() != zoomed_range
    desktop.get_by_role('button', name='Alejar gráfica y tabla').click()
    assert '22 años → 100 años' in desktop.locator('.zoom-toolbar').inner_text()
    assert desktop.locator('.data-details tbody tr').count() == full_rows

    desktop.reload()
    desktop.wait_for_load_state('networkidle')
    desktop.locator('#targetCapital').fill('9000000')
    desktop.get_by_role('button', name='Gasto al retirarte').focus()
    desktop.keyboard.press('Space')
    assert desktop.locator('#retirementSpending').is_visible()
    assert desktop.get_by_text('Gasto mensual elegido para el retiro').is_visible()
    assert '2.000.000 de hoy' in desktop.locator('.capital-focus').inner_text()
    assert 'Bs 2.000.000 de hoy' in desktop.locator('.goal-preview').inner_text()
    assert 'no se usa en este modo' in desktop.locator('.goal-preview').inner_text()
    desktop.locator('#retirementSpending').fill('6000')
    assert 'Bs 2.400.000 de hoy' in desktop.locator('.goal-preview').inner_text()
    desktop.locator('#retirementSpending').fill('5000')
    desktop.screenshot(path=str(OUTPUT / 'spending-mode.png'), full_page=True)
    desktop.locator('#age-select').focus()
    desktop.keyboard.press('ArrowRight')
    assert 'Bs 5.000' in desktop.locator('.selected-details').inner_text()
    assert 'Bs de hoy: importes futuros descontados' in desktop.locator('.selected-details').inner_text()
    selected_age = desktop.locator('.age-selector label strong').inner_text()
    desktop.get_by_role('button', name='Bs futuros', exact=True).click()
    assert 'Bs 13.321' in desktop.locator('.selected-details').inner_text()
    assert 'Bs futuros: importes nominales' in desktop.locator('.selected-details').inner_text()
    assert desktop.locator('.age-selector label strong').inner_text() == selected_age
    desktop.get_by_role('button', name='Restablecer').click()
    desktop.get_by_role('button', name='Bs futuros', exact=True).click()
    assert '5.306.595' in desktop.locator('.capital-focus').inner_text()
    goal_path = desktop.locator('.goal-path').get_attribute('d')
    assert len(set(re.findall(r'[ML][\d.]+,([\d.]+)', goal_path))) > 1
    desktop.get_by_role('button', name='Bs de hoy', exact=True).click()
    goal_path = desktop.locator('.goal-path').get_attribute('d')
    assert len(set(re.findall(r'[ML][\d.]+,([\d.]+)', goal_path))) == 1

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    mobile.on('pageerror', lambda error: errors.append(str(error)))
    mobile.goto('http://localhost:5173')
    mobile.wait_for_load_state('networkidle')
    mobile.screenshot(path=str(OUTPUT / 'mobile.png'), full_page=True)
    assert not mobile.evaluate('document.documentElement.scrollWidth > window.innerWidth')
    assert mobile.locator('.capital-focus h2').is_visible()
    assert '5.306.595' in mobile.locator('.capital-focus h2').inner_text()
    assert not errors, errors
    print('Cálculos, escritorio y móvil: OK')
    browser.close()
