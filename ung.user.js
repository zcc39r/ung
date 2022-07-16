// ==UserScript==
// @name        Uꞑ
// @namespace   http://tampermonkey.net/
// @version     1.5.0
// @description Export relatives data from Genotek account
// @author      Rustam Usmanov
// @match       https://lk.genotek.ru/*
// @grant       unsafeWindow
// @updateURL   https://raw.githubusercontent.com/zcc39r/ung/master/ung.user.js
// @downloadURL https://raw.githubusercontent.com/zcc39r/ung/master/ung.user.js
// @supportURL  https://github.com/zcc39r/ung/issues
// ==/UserScript==

var relatives = new Map();
var allTubesAvailable = new Map();
var me;
var gg;

String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

var observeDOM = (function(){
  var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

  return function( obj, callback ){
    if (!obj || obj.nodeType !== 1) return;

    if (MutationObserver) {
      var mutationObserver = new MutationObserver(callback)
      mutationObserver.observe(obj, { childList:true, subtree:true })
      return mutationObserver
    } else if( window.addEventListener ){
      obj.addEventListener('DOMNodeInserted', callback, false)
      obj.addEventListener('DOMNodeRemoved', callback, false)
    }
  }
})()

function placeRepresentation(p) {
    return Object.keys(p).map(key => p[key]).join(' ');
}

function getCurrentTubeId() {
    const currentPatient = JSON.parse(unsafeWindow.localStorage.getItem('currentPatient'));
    return ((currentPatient || {}).tubeId || '').toUpperCase();
}

function getCurrentName() {
    const currentPatient = JSON.parse(unsafeWindow.localStorage.getItem('currentPatient'));
    return `${(currentPatient || {}).name || ''} ${(currentPatient || {}).lastName || ''}`;
}

function getRelativesContent() {
    const tubeId = getCurrentTubeId();
    me.patients.concat(me.shared).filter(r => !allTubesAvailable.has(r.tubeId) && r.tubeId.length > 0).forEach(r => {
        let x = new Object();
        x.name = r.name + (' ' + r.secondName + ' ').replaceAll("\\s+", " ") + r.lastName;
        allTubesAvailable.set(r.tubeId.toUpperCase(), x);
    });
    allTubesAvailable.forEach((v, k) => {
        if (v.matches === undefined || v.matches.length == 0) {
            v.matches = (relatives.get(k) || []).map(r => r.tube_relative.tubeId.toUpperCase());
        }
    });
    let c = `<html>
    <head><title>${getCurrentName()}: родственники</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <style>
    TABLE {
    border: solid;
    border-width: thin;
    border-collapse: collapse;
    }
    TD, TH {
    border: solid;
    border-width: thin;
    padding-left: 1em;
    padding-right: 1em;
    }
    .c {
    text-align: center;
    }
    </style>
    <script type="text/javascript">
    var allTubes = ${JSON.stringify(Array.from(allTubesAvailable.entries()))};
addEvent(window, "load", startup);

function startup() {
    sortables_init();
    addInCommonFilter();
}

function addInCommonFilter() {
    const form = document.getElementById('inCommon');
    const myId = document.querySelector('.main').id;
    const others = allTubes.filter(i => i[0] !== myId && i[1].matches.length > 0);
    if (others.length > 0) {
        let label = document.createElement('label');
        label.innerHTML = 'Общие с: ';
        form.appendChild(label);
    }
    others.forEach(i => {
        let input = document.createElement('input');
        input.setAttribute('type', 'checkbox');
        input.setAttribute('name', i[0]);
        input.setAttribute('onClick', "toggle('" + i[0] + "')");
        form.appendChild(input);
        let name = document.createElement('span');
        name.innerHTML = i[1].name;
        form.appendChild(name);
    });
}

function toggle(id) {
    const form = document.getElementById('inCommon');
    const input = form.querySelector('input[name='+ id + ']');
    input.checked == !input.checked;

    const selected = Array.from(form.querySelectorAll('input[type=checkbox]:checked')).map(i => i.name);
    const matches = (selected.length > 0) ? Array.from(allTubes.filter(i => selected.includes(i[0]))).map(i => i[1].matches).reduce((p, c) => p.filter(x => c.includes(x))) : [];
    const rows = Array.from(document.querySelectorAll('tr[id]'));
    rows.forEach(r => r.style.display = (selected.length == 0 || matches.includes(r.id)) ? "table-row" : 'none');
}

var SORT_COLUMN_INDEX;

function sortables_init() {
    if (!document.getElementsByTagName) return;
    tbls = document.getElementsByTagName("table");
    for (ti=0;ti<tbls.length;ti++) {
        thisTbl = tbls[ti];
        ts_makeSortable(thisTbl);
    }
}

function ts_makeSortable(table) {
    for (var i = 0; i < table.tHead.rows.length; i++)
      for (var j=0;j<table.tHead.rows[i].cells.length;j++) {
        var cell = table.tHead.rows[i].cells[j];
        var n = cell.id;
        if (n != '') {
          var txt = ts_getInnerText(cell);
          cell.innerHTML = '<a href="#" class="sortheader" '+
        'onclick="ts_resortTable(this, '+n+');return false;">' +
        txt+'<span class="sortarrow">&nbsp;&nbsp;&nbsp;</span></a>';
        }
    }
}

function ts_getInnerText(el) {
        if (typeof el == "string") return el;
        if (typeof el == "undefined") { return el };
        if (el.innerText) return el.innerText;
        var str = "";
        var x = "";

        var cs = el.childNodes;
        var l = cs.length;

        for (var i = 0; i < l && x.length == 0; i++) {
                switch (cs[i].nodeType) {
                        case 1:
                                str += ts_getInnerText(cs[i]);
                                break;
                        case 3:
                                str += cs[i].nodeValue;
                                break;
                }
                x = str.replace(\/(\\s+)\/g, "");
        }
        return str;
}

function ts_resortTable(lnk,clid) {
    var span;
    for (var ci=0;ci<lnk.childNodes.length;ci++) {
        if (lnk.childNodes[ci].tagName && lnk.childNodes[ci].tagName.toLowerCase() == 'span') span = lnk.childNodes[ci];
    }
    var spantext = ts_getInnerText(span);
    var td = lnk.parentNode;
    var column = clid || td.cellIndex;
    var table = getParent(td,'TABLE');

    if (table.tBodies[0].rows.length <= 1) return;
    var itm = ts_getInnerText(table.tBodies[0].rows[0].cells[column]);
    sortfn = ts_sort_caseinsensitive;
    if (itm.match(\/^-?[\\d\\.]+$\/)) sortfn = ts_sort_numeric;
    if (itm == '-') sortfn = ts_sort_numeric;
    if (itm == '∞') sortfn = ts_sort_numeric;
    SORT_COLUMN_INDEX = column;
    var newRows = new Array();
    for (j=0;j<table.tBodies[0].rows.length;j++) { newRows[j] = table.tBodies[0].rows[j]; }

    newRows.sort(sortfn);

    if (span.getAttribute("sortdir") == 'down') {
        ARROW = '&nbsp;&nbsp;&uarr;';
        newRows.reverse();
        span.setAttribute('sortdir','up');
    } else {
        ARROW = '&nbsp;&nbsp;&darr;';
        span.setAttribute('sortdir','down');
    }

    for (i=0;i<newRows.length;i++) { if (!newRows[i].className || (newRows[i].className && (newRows[i].className.indexOf('sortbottom') == -1))) table.tBodies[0].appendChild(newRows[i]);}
    for (i=0;i<newRows.length;i++) { if (newRows[i].className && (newRows[i].className.indexOf('sortbottom') != -1)) table.tBodies[0].appendChild(newRows[i]);}

    var allspans = document.getElementsByTagName("span");
    for (var ci=0;ci<allspans.length;ci++) {
        if (allspans[ci].className == 'sortarrow') {
            if (getParent(allspans[ci],"table") == getParent(lnk,"table")) { // in the same table as us?
                allspans[ci].innerHTML = '&nbsp;&nbsp;&nbsp;';
            }
        }
    }

    span.innerHTML = ARROW;
}

function getParent(el, pTagName) {
        if (el == null) return null;
        else if (el.nodeType == 1 && el.tagName.toLowerCase() == pTagName.toLowerCase())
                return el;
        else
                return getParent(el.parentNode, pTagName);
}
function ts_sort_date(a,b) {
    aa = ts_getInnerText(a.cells[SORT_COLUMN_INDEX]);
    bb = ts_getInnerText(b.cells[SORT_COLUMN_INDEX]);
    if (aa.length == 10) {
        dt1 = aa.substr(6,4)+aa.substr(3,2)+aa.substr(0,2);
    } else {
        yr = aa.substr(6,2);
        if (parseInt(yr) < 50) { yr = '20'+yr; } else { yr = '19'+yr; }
        dt1 = yr+aa.substr(3,2)+aa.substr(0,2);
    }
    if (bb.length == 10) {
        dt2 = bb.substr(6,4)+bb.substr(3,2)+bb.substr(0,2);
    } else {
        yr = bb.substr(6,2);
        if (parseInt(yr) < 50) { yr = '20'+yr; } else { yr = '19'+yr; }
        dt2 = yr+bb.substr(3,2)+bb.substr(0,2);
    }
    if (dt1==dt2) return 0;
    if (dt1<dt2) return -1;
    return 1;
}

function ts_sort_currency(a,b) {
    aa = ts_getInnerText(a.cells[SORT_COLUMN_INDEX]).replace(/[^0-9.]/g,'');
    bb = ts_getInnerText(b.cells[SORT_COLUMN_INDEX]).replace(/[^0-9.]/g,'');
    return parseFloat(aa) - parseFloat(bb);
}

function ts_sort_numeric(a,b) {
    if (ts_getInnerText(a.cells[SORT_COLUMN_INDEX]) == '∞')
      aa = Infinity;
    else
      aa = parseFloat(ts_getInnerText(a.cells[SORT_COLUMN_INDEX]));
    if (isNaN(aa)) aa = 0;
    if (ts_getInnerText(b.cells[SORT_COLUMN_INDEX]) == '∞')
      bb = Infinity;
    else
      bb = parseFloat(ts_getInnerText(b.cells[SORT_COLUMN_INDEX]));
    if (isNaN(bb)) bb = 0;
    return aa-bb;
}

function ts_sort_caseinsensitive(a,b) {
    aa = ts_getInnerText(a.cells[SORT_COLUMN_INDEX]).toLowerCase();
    bb = ts_getInnerText(b.cells[SORT_COLUMN_INDEX]).toLowerCase();
    if (aa==bb) return 0;
    if (aa<bb) return -1;
    return 1;
}

function ts_sort_default(a,b) {
    aa = ts_getInnerText(a.cells[SORT_COLUMN_INDEX]);
    bb = ts_getInnerText(b.cells[SORT_COLUMN_INDEX]);
    if (aa==bb) return 0;
    if (aa<bb) return -1;
    return 1;
}

function addEvent(elm, evType, fn, useCapture) {
  if (elm.addEventListener){
    elm.addEventListener(evType, fn, useCapture);
    return true;
  } else if (elm.attachEvent){
    var r = elm.attachEvent("on"+evType, fn);
    return r;
  } else {
    alert("Handler could not be removed");
  }
}

  </script>
    </head>
    <body>
    <div>
    <form id="inCommon">
    </form>
    </div>
    <table class="main" id="${tubeId}"><caption>${getCurrentName()}: родственники</caption>
    <thead>
    <tr>
    <th class="c" id="0">Имя</th>
    <th class="c" id="1">Возраст</th>
    <th class="c" id="2">Пол</th>
    <th class="c" id="3">Сумма IBD-сегментов</th>
    <th class="c" id="4">% совпадения</th>
    <th class="c" id="5">Макс. IBD-сегмент</th>
    <th class="c" id="6">Mt</th>
    <th class="c" id="7">Y</th>
    <th class="c" id="8">Дата</th>
    <th class="c">Возможные фамилии</th>
    <th class="c">Возможные места рождения</th>
    <th class="c">Этническая принадлежность БОП</th>
    </tr>
    </thead>
    <tbody>`;
    relatives.get(getCurrentTubeId()).forEach(r => { c+= `<tr id="${r.tube_relative.tubeId.toUpperCase()}">
    <td>${r.relative_info.last_name || ''}, ${r.relative_info.name || ''} ${r.relative_info.second_name || ''}</td>
    <td class="c">${r.relative_info.age || '-'}</td>
    <td class="c">${r.relative_info.gender === 'male' ? 'М' : 'Ж'}</td>
    <td class="c">${Math.round(r.tube_relative.totalCm || 0)}</td>
    <td class="c">${r.tube_relative.totalPercent || 0}</td>
    <td class="c">${Math.round(r.tube_relative.largestIBDCm || 0)}</td>
    <td class="c">${r.tube_relative.maternalHaplogroup || ''}</td>
    <td class="c">${r.tube_relative.paternalHaplogroup || ''}</td>
    <td class="c">${r.tube_relative.date || ''}</td>
    <td class="c">${(r.tube_relative.genealogicalTreeSurnames || []).sort().join(', ')}</td>
    <td class="c">${(r.tube_relative.genealogicalTreeBirthplaces || []).map(p => placeRepresentation(p)).join(', ')}</td>
    <td class="c">${(r.tube_relative.ethnicityOfMRCA || []).sort().join(', ')}</td>
    </tr>`});
    c += `</tbody>
    </table>
    </body>
    </html>`;
    return c;
}

function getRootPersonId() {
    return gg.nodes.find(n => n.relationName === 'Я').id;
}

function dateToString(d) {
    let res = '';

    if (d == null) {
        return res;
    }

    if (d.year != null) {
        res = d.year;
    }
    if (d.month != null) {
        res += '-' + String(d.month).padStart(2, 0);
    }
    if (d.day != null) {
        res += '-' + String(d.day).padStart(2, 0);
    }

    return res;
}

function addPlace(d, places, name, type, ref) {
    let place = d.createElement('placeobj');
    const pid = 'pi' + name.hashCode();
    place.setAttribute('handle', pid);
    place.setAttribute('id', pid);
    place.setAttribute('type', type);
    let e = d.createElement('ptitle');
    e.innerHTML = name;
    place.appendChild(e);
    e = d.createElement('pname');
    e.setAttribute('value', name);
    place.appendChild(e);
    if (ref != null) {
        e = d.createElement('placeref');
        e.setAttribute('hlink', ref);
        place.appendChild(e);
    }
    places.appendChild(place);
}

function processPlace(d, places, place) {
    let placeId = null;

    const { country, region, area, city, settlement } = place;
    if (country != null) {
        placeId = 'pi' + country.hashCode();
        if (places.querySelector('#' + placeId) == null) {
            addPlace(d, places, country, 'Country', null);
        }
    }
    if (region != null) {
        placeId = 'pi' + region.hashCode();
        if (places.querySelector('#' + placeId) == null) {
            addPlace(d, places, region, 'State', country && ('pi' + country.hashCode()));
        }
    }
    if (area != null) {
        placeId = 'pi' + area.hashCode();
        if (places.querySelector('#' + placeId) == null) {
            addPlace(d, places, area, 'County', region && ('pi' + region.hashCode()) || country && ('pi' + country.hashCode()));
        }
    }
    if (city != null) {
        placeId = 'pi' + city.hashCode();
        if (places.querySelector('#' + placeId) == null) {
            addPlace(d, places, city, 'City', area && ('pi' + area.hashCode()) || region && ('pi' + region.hashCode()) || country && ('pi' + country.hashCode()));
        }
    }
    if (settlement != null) {
        placeId = 'pi' + settlement.hashCode();
        if (places.querySelector('#' + placeId) == null) {
            addPlace(d, places, settlement, 'Village', city && ('pi' + city.hashCode()) || area && ('pi' + area.hashCode()) || region && ('pi' + region.hashCode()) || country && ('pi' + country.hashCode()));
        }
    }
    if (placeId == null && place && place.length > 0) {
        placeId = 'pi' + place.hashCode();
        if (places.querySelector('#' + placeId) == null) {
            addPlace(d, places, place, 'Unknown', null);
        }
    }

    return placeId;
}

function addEvent(d, events, places, type, date, place, id) {
    let x = dateToString(date);
    const eventId = (id == null) ? 'e' + self.crypto.randomUUID() : id;
    let event = d.createElement('event');
    event.setAttribute('handle', eventId);
    event.setAttribute('id', eventId);
    let e = d.createElement('type');
    e.innerHTML = type;
    event.appendChild(e);
    if (x !== '') {
        e = d.createElement('dateval');
        e.setAttribute('val', x);
        event.appendChild(e);
    }
    if (place != null && place.length > 0) {
        const placeId = processPlace(d, places, place[0]);
        if (placeId != null) {
            e = d.createElement('place');
            e.setAttribute('hlink', placeId);
            event.appendChild(e);
        }
    }
    events.appendChild(event);

    return eventId;
}

function addFamily(d, families, type, id) {
    const familyId = (id == null) ? self.crypto.randomUUID() : id;
    let family = d.createElement('family');
    family.setAttribute('handle', familyId);
    family.setAttribute('id', familyId);
    let e = d.createElement('rel');
    e.setAttribute('type', type);
    family.appendChild(e);
    families.appendChild(family);

    return family;
}

function getParentFamily(families, relatives) {
    let res = null;

    const parentId = (relatives.filter(r => r.relationType === 'parent')[0] || {}).id;
    if (parentId != null) {
        const parent = families.querySelector('father[hlink=p' + parentId + '], mother[hlink=p' + parentId + ']');
        if (parent != null) {
            res = parent.parentElement;
        }
    }

    return res;
}

function getGGContent() {
    const d = document.implementation.createDocument('http://gramps-project.org/xml/1.7.1/', 'database');
    const root = d.documentElement;
    const h = d.createElement('header');
    root.appendChild(h);
    let e = d.createElement('created');
    e.setAttribute('date', new Date().toISOString().slice(0, 10));
    e.setAttribute('version', 'Uꞑ-1.5.0');
    h.appendChild(e);
    let rs = d.createElement('researcher');
    e = d.createElement('resname');
    e.innerHTML = getCurrentName();
    rs.appendChild(e);
    h.appendChild(rs);
    const events = d.createElement('events');
    root.appendChild(events);
    const people = d.createElement('people');
    people.setAttribute('home', 'p' + getRootPersonId());
    root.appendChild(people);
    const families = d.createElement('families');
    root.appendChild(families);
    const places = d.createElement('places');
    root.appendChild(places);
    gg.nodes.filter(n => !(n.id.startsWith('imaginary') || n.id.startsWith('fake'))).forEach(n => {
        let person = d.createElement('person');
        person.setAttribute('handle', 'p' + n.id);
        person.setAttribute('id', 'p' + n.id);
        e = d.createElement('gender');
        e.innerHTML = (n.type === 'FEMALE') ? 'F' : 'M';
        person.appendChild(e);
        let name = d.createElement('name');
        name.setAttribute('type', 'Birth Name');
        if (n.card.name.length > 0) {
            e = d.createElement('first');
            e.innerHTML = n.card.name[0];
            name.appendChild(e);
        }
        if (n.card.surname.length > 0) {
            e = d.createElement('surname');
            e.setAttribute('derivation', n.card.maidenName.length > 0 ? "Taken" : "Given");
            e.innerHTML = n.card.surname[0];
            name.appendChild(e);
        }
        if (n.card.maidenName.length > 0) {
            e = d.createElement('surname');
            e.setAttribute('derivation', "Given");
            e.setAttribute('prim', "0");
            e.innerHTML = n.card.maidenName[0];
            name.appendChild(e);
        }
        if (n.card.middleName.length > 0) {
            e = d.createElement('surname');
            e.setAttribute('derivation', "Patronymic");
            e.setAttribute('prim', "0");
            e.innerHTML = n.card.middleName[0];
            name.appendChild(e);
        }
        person.appendChild(name);
        if (n.card.birthdate.length > 0) {
            const eventId = addEvent(d, events, places, 'Birth', n.card.birthdate[0], (n.card.birthplaceParsed.length > 0) ? n.card.birthplaceParsed : n.card.birthplace, null);
            e = d.createElement('eventref');
            e.setAttribute('hlink', eventId);
            e.setAttribute('role', 'Primary');
            person.appendChild(e);
        }
        if (n.card.deathdate.length > 0 && n.card.liveOrDead === 0) {
            const eventId = addEvent(d, events, places, 'Death', n.card.deathdate[0], (n.card.deathplaceParsed.length > 0) ? n.card.deathplaceParsed : n.card.deathplace, null);
            e = d.createElement('eventref');
            e.setAttribute('hlink', eventId);
            e.setAttribute('role', 'Primary');
            person.appendChild(e);
        }
        n.card.relationships.forEach(r => {
            let familyId = 'f' + ((n.type === 'FEMALE') ? r.with + '_' + n.id : n.id + '_' + r.with);
            let family = d.querySelector('#' + familyId);
            if (family == null) {
                family = addFamily(d, families, (r.type === 'official') ? ((r.finished === 1) ? 'Unmarried' : 'Married') : 'Unknown', familyId);
            }
            e = d.createElement((n.type === 'FEMALE') ? 'mother' : 'father');
            e.setAttribute('hlink', 'p' + n.id);
            family.appendChild(e);
            e = d.createElement('parentin');
            e.setAttribute('hlink', familyId);
            person.appendChild(e);

            let marriageId = 'm' + ((n.type === 'FEMALE') ? r.with + '_' + n.id : n.id + '_' + r.with);
            if (d.querySelector('#' + marriageId) == null) {
                addEvent(d, events, places, 'Marriage', (r.from || [])[0], null, marriageId);
            }
            e = d.createElement('eventref');
            e.setAttribute('hlink', marriageId);
            e.setAttribute('role', 'Primary');
            person.appendChild(e);
            if (families.querySelector('family eventref[hlink=' + marriageId + ']') == null) {
                e = d.createElement('eventref');
                e.setAttribute('hlink', marriageId);
                e.setAttribute('role', 'Family');
                family.appendChild(e);
            }
            if (r.finished === 1) {
                let divorceId = 'd' + ((n.type === 'FEMALE') ? r.with + '_' + n.id : n.id + '_' + r.with);
                if (d.querySelector('#' + divorceId) == null) {
                    addEvent(d, events, places, 'Divorce', (r.to || [])[0], null, divorceId);
                }
                e = d.createElement('eventref');
                e.setAttribute('hlink', divorceId);
                e.setAttribute('role', 'Primary');
                person.appendChild(e);
                if (families.querySelector('family eventref[hlink=' + divorceId + ']') == null) {
                    e = d.createElement('eventref');
                    e.setAttribute('hlink', divorceId);
                    e.setAttribute('role', 'Family');
                    family.appendChild(e);
                }
            }
        });
        if (n.card.relationships.length === 0 && n.card.relatives.filter(r => r.relationType === 'child').length > 0) {
            let familyId = 'f' + ((n.type === 'FEMALE') ? '_' + n.id : n.id + '_');
            let family = addFamily(d, families, 'Unknown', familyId);
            e = d.createElement((n.type === 'FEMALE') ? 'mother' : 'father');
            e.setAttribute('hlink', 'p' + n.id);
            family.appendChild(e);
            e = d.createElement('parentin');
            e.setAttribute('hlink', familyId);
            person.appendChild(e);
        }
        people.appendChild(person);
    });
    gg.nodes.filter(n => !(n.id.startsWith('imaginary') || n.id.startsWith('fake'))).forEach(n => {
        const person = people.querySelector('#p' + n.id);
        const parentFamily = getParentFamily(families, n.card.relatives);
        if (parentFamily != null) {
            e = d.createElement('childref');
            e.setAttribute('hlink', 'p' + n.id);
            parentFamily.appendChild(e);
            e = d.createElement('childof');
            e.setAttribute('hlink', parentFamily.getAttribute('handle'));
            person.appendChild(e);
        }
    });
    return new XMLSerializer().serializeToString(d.documentElement);
}

function addMyControls() {
    const toolbar = document.querySelector('.find-relation__filters-flex:not(.shimmer)');
    if (toolbar && toolbar.querySelector('#ung') === null) {
        let downloadLink = document.createElement('a');
        downloadLink.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(getRelativesContent()));
        downloadLink.setAttribute('download', 'ung.html');
        downloadLink.setAttribute('id', 'ung');
        downloadLink.innerHTML = '<i class="fa fa-download fa-lg" aria-hidden="true"></i>';
        toolbar.appendChild(downloadLink);
    }
    const tree_actions = document.querySelector('.find-relation-graph__modal-header, app-genealogical-tree div.main-header__title');
    if (gg != null && tree_actions && tree_actions.querySelector('#unggg') === null) {
        let downloadLink = document.createElement('a');
        downloadLink.setAttribute('href', 'data:application/xml;charset=utf-8,' + encodeURIComponent(getGGContent()));
        downloadLink.setAttribute('download', 'ung.gramps');
        downloadLink.setAttribute('id', 'unggg');
        downloadLink.innerHTML = '<i class="fa fa-download fa-lg" aria-hidden="true"></i>';
        tree_actions.appendChild(downloadLink);
        gg = null;
    }
}

(function(open) {
    XMLHttpRequest.prototype.open = function() {
        this.addEventListener("readystatechange", function() {
            if (this.responseURL.startsWith('https://lk2-back.genotek.ru/api/v1/site/1/relatives/')
                || this.responseURL.startsWith('https://lk2-back.genotek.ru/api/v1/patients/')
                || this.responseURL.startsWith('https://lk2-back.genotek.ru/api/v1/genealogy-graph/')) {
                if (this.readyState == 2) {
                    this.responseType='json';
                }
                if (this.readyState == 4) {
                    if (this.responseURL.startsWith('https://lk2-back.genotek.ru/api/v1/genealogy-graph/')) {
                        gg = this.response.data;
                        if (gg != null) {
                            addMyControls();
                        }
                    }
                    if (this.responseURL.startsWith('https://lk2-back.genotek.ru/api/v1/site/1/relatives/')) {
                        if (!this.responseURL.includes('/genealogy-graph/')) {
                            let rels = null;
                            if (this.response.data) {
                               rels = JSON.parse(decodeURIComponent(escape(atob(this.response.data)))).relatives;
                            }
                            if (rels != null) {
                                const u = new URL(this.responseURL);
                                const tubeId = u.pathname.substring(u.pathname.lastIndexOf('/') + 1);
                                relatives.set(tubeId, rels);
                                if (getCurrentTubeId() === tubeId) {
                                    addMyControls();
                                }
                            }
                        } else {
                            gg = this.response.data;
                            if (gg != null) {
                                addMyControls();
                            }
                        }
                    }
                    if (this.responseURL.startsWith('https://lk2-back.genotek.ru/api/v1/patients/') && this.response.patients) {
                        me = this.response;
                    }
                }
            }
        }, false);
        open.apply(this, arguments);
    }
})(XMLHttpRequest.prototype.open);

observeDOM(document.body, function(m) {
    if (relatives.has(getCurrentTubeId())) {
      addMyControls();
    }
    if (gg != null) {
        addMyControls();
    }
});

console.log('Uꞑ');
