---
name: ui-align
description: Проверить или отладить выравнивание верхней панели BB с системными кнопками macOS.
---

`bb ui-align status` показывает последнюю геометрию из клиентского окна.

При `nativeReservation: true` и `enabled: true` значения `controlCenterY` и `targetCenterY` должны совпадать с точностью до округления. `awaitingFrontend: true` означает, что клиент ещё не прислал данные. Настройки плагина находятся в Settings → Installed plugins → UI Align; `offsetY` задаёт поправку в диапазоне −10…10 пунктов macOS.

Исходники находятся в `plugins/ui-align/` репозитория `bb-plugins`. Команды разработки выполнять из каталога плагина. После изменений выполнить `npm run typecheck`, `bb plugin build`, `bb plugin reload ui-align`, затем проверить состояние командой выше. `bb plugin disable ui-align` полностью убирает коррекцию. После крупных обновлений BB проверить селектор шапки и класс, резервирующий место для нативных кнопок.
