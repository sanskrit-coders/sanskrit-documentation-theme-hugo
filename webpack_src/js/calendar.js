import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';

function fillIcsCalendar(embedTag) {
    let icsUrl = embedTag.getAttribute("src");
    fetch(jsonUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.length > 0) {
                // Await acceptance and merging of https://github.com/fullcalendar/fullcalendar/pull/5969 for full implementation.
            }
        })
        .catch(error => console.error('There was a problem with the fetch operation:', error));

}

export function fillCalendars() {
    var sheetEmbedTags = [...document.querySelectorAll('.calendar')];
    sheetEmbedTags.forEach(function (embedTag) {
        fillIcsCalendar(embedTag);
    });
}
