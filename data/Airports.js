/**   region_recommender_api - 01.11.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */

const axios = require('axios');

module.exports = class Airports {
    fillDataBase() {
        return axios.get('https://en.wikipedia.org/w/api.php?action=parse&page=List_of_international_airports_by_country&prop=wikitext&section=24&format=json')
            .catch(error => {
                console.log(error);
            }).then(success => {
                const table = success.data.parse.wikitext['*'].split('|-');
                let current_country = '',
                    location_col = -1,
                    name_col = -1,
                    iata_col = -1,
                    passenger_col = -1,
                    is_header_row = false;
                let entries = table.forEach(row => {
                    is_header_row = false;
                    /*get the country headline*/
                    if (row.match(/'''[a-zA-Z][a-zA-Z\s]*'''/)) {
                        current_country = row.match(/'''[a-zA-Z][a-zA-Z\s]*'''/)[0].match(/[a-zA-Z][a-zA-Z\s]*/)[0];
                        is_header_row = true;
                    }
                    // get the table cols
                    if (row.match(/ class="wikitable"/)) {
                        is_header_row = true;
                        location_col = -1;
                        name_col = -1;
                        iata_col = -1;
                        passenger_col = -1;
                        row.split('!').forEach((label, i) => {
                            const label_clean = label.substring(0, label.length - 1);
                            if (label_clean === 'Location') {
                                location_col = i - 1;
                            } else if (label_clean === 'Airport') {
                                name_col = i - 1;
                            } else if (label_clean === 'IATA Code') {
                                iata_col = i - 1;
                            } else if (label_clean.match(/201\d Passengers/)) {
                                passenger_col = i - 1;
                            }
                        });
                        console.log(current_country,
                            'location_col:' + location_col,
                            'name:' + name_col,
                            'iata:' + iata_col,
                            'passenger:' + passenger_col);
                    }

                    if (!is_header_row) {
                        console.log(row);
                        const row_split = row.match(/\|\|/) ? row.split('||'): row.split('|');
                        let entry = {};
                        if (location_col > -1)
                        entry.location = getCleanColOfTable(row_split[location_col]);
                        if (name_col > -1)
                        entry.name = getCleanColOfTable(row_split[name_col]);
                        if (iata_col> -1)
                        entry.iata = getCleanColOfTable(row_split[iata_col]);
                        if (passenger_col > -1)
                            entry.passengers = getCleanColOfTable(row_split[passenger_col]);
                        console.log(entry);
                    }

                });
            });
    }
};

function getCleanColOfTable(text) {
    console.log('text:' + text + '|');

    const actual_col = text.match(/\[/) ? text.match(/\[\[.*]]/)[0]: text;
    return actual_col.substring(2,actual_col.length-2);
}