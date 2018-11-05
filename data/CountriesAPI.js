/**   region_recommender_api - 27.10.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */
const axios = require('axios');

module.exports = class CountriesAPI {
    constructor() {
    }

    getCitiesOfCountryCodeList(code_list) {
        /* code_list separated by ; */
        return axios.get('https://restcountries.eu/rest/v2/alpha?codes=' + code_list)
            .catch(error => {
                console.log(error);
            });
    };
};