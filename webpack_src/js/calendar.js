import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';

function fillIcsCalendar(embedTag) {
    let icsUrl = embedTag.getAttribute("src");
    $.getJSON(jsonUrl, function (data) {
        if (data.length > 0) {
        //    Await acceptance and merging of https://github.com/fullcalendar/fullcalendar/pull/5969  for full implementation.
        }
    });
}

export function fillCalendars() {
    var sheetEmbedTags = [...document.querySelectorAll('.calendar')];
    sheetEmbedTags.forEach(function (embedTag) {
        fillIcsCalendar(embedTag);
    });
}
