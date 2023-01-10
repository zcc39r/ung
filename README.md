# Uꞑ
Экспорт сведений о родственниках из личного кабинета Генотек в автономный HTML-документ с возможностью сортировки и фильтрации. Экспорт генеалогического древа в формате XML в схеме [Gramps в. 1.7.1](https://www.gramps-project.org/wiki/index.php/Gramps_XML).

## Требования

1. Современный браузер с поддержкой JavaScript.
2. Система управления пользовательскими скриптами, например, [Tampermonkey](https://www.tampermonkey.net/)

## Установка

Установка осуществляется непосредственно по [ссылке](https://raw.githubusercontent.com/zcc39r/ung/master/ung.user.js).

## Использование

В личном кабинете Генотек в разделе [Поиск родственников](https://lk.genotek.ru/ancestry/relatives) в панели фильтров появится ссылка на документ с экспортируемыми сведениями. При активации этой ссылки проиcходит загрузка документа в формате HTML. После открытия документа появляются возможности сортировки по ссылкам в шапке таблицы и фильтрации общих для нескольких профилей родственников. **Фильтрация общих с каким-либо профилем родственников возможна при предварительном посещении раздела [Поиск родственников](https://lk.genotek.ru/ancestry/relatives) в этом профиле.** При просмотре собственного генеалогического древа, либо древа родственника в заголовке окна появится ссылка на документ с экспортируемыми сведениями. При активации этой ссылки происходит загрузка документа в формате XML в схеме Gramps. Полученные данные древа можно импортировать и экспортировать в иные форматы при помощи [Gramps](https://gramps-project.org/).

## Проблемы и пожелания

Проблемы и пожелания следует фиксировать в разделе [Issues](https://github.com/zcc39r/ung/issues).
