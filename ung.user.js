// ==UserScript==
// @name        Uꞑ
// @namespace   http://tampermonkey.net/
// @version     1.1.1
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

function getCurrentTubeId() {
    const currentPatient = JSON.parse(unsafeWindow.localStorage.getItem('currentPatient'));
    return ((currentPatient || {}).tubeId || '').toUpperCase();
}

function getCurrentName() {
    const currentPatient = JSON.parse(unsafeWindow.localStorage.getItem('currentPatient'));
    return `${(currentPatient || {}).name || ''} ${(currentPatient || {}).lastName || ''}`;
}

function getContent() {
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
    <th class="c" id="4">Mt</th>
    <th class="c" id="5">Y</th>
    <th class="c" id="6">Дата</th>
    </tr>
    </thead>
    <tbody>`;
    relatives.get(getCurrentTubeId()).forEach(r => { c+= `<tr id="${r.tube_relative.tubeId.toUpperCase()}">
    <td>${r.relative_info.last_name || ''}, ${r.relative_info.name || ''} ${r.relative_info.second_name || ''}</td>
    <td class="c">${r.relative_info.age || '-'}</td>
    <td class="c">${r.relative_info.gender === 'male' ? 'М' : 'Ж'}</td>
    <td class="c">${Math.round(r.tube_relative.totalCm || 0)}</td>
    <td class="c">${r.tube_relative.maternalHaplogroup || ''}</td>
    <td class="c">${r.tube_relative.paternalHaplogroup || ''}</td>
    <td class="c">${r.tube_relative.date || ''}</td>
    </tr>`});
    c += `</tbody>
    </table>
    </body>
    </html>`;
    return c;
}

function addMyControls() {
    const toolbar = document.querySelector('.find-relation__filters-flex:not(.shimmer)');
    if (toolbar && toolbar.querySelector('#ung') === null) {
        let downloadLink = document.createElement('a');
        downloadLink.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(getContent()));
        downloadLink.setAttribute('download', 'ung.html');
        downloadLink.setAttribute('id', 'ung');
        downloadLink.innerHTML = '<i class="fa fa-download fa-lg" aria-hidden="true"></i>';
        toolbar.appendChild(downloadLink);
    }
}

(function(open) {
    XMLHttpRequest.prototype.open = function() {
        this.addEventListener("readystatechange", function() {
            if (this.responseURL.startsWith('https://lk2-back.genotek.ru/api/v1/site/1/relatives/') || this.responseURL.startsWith('https://lk2-back.genotek.ru/api/v1/patients/')
) {
                if (this.readyState == 2) {
                    this.responseType='json';
                }
                if (this.readyState == 4) {
                    if (this.responseURL.startsWith('https://lk2-back.genotek.ru/api/v1/site/1/relatives/')) {
                        if (this.response.relatives) {
                            const u = new URL(this.responseURL);
                            const tubeId = u.pathname.substring(u.pathname.lastIndexOf('/') + 1);
                            relatives.set(tubeId, this.response.relatives);
                            if (getCurrentTubeId() === tubeId) {
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
});

console.log('Uꞑ');
