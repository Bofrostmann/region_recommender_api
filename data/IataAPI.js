/**   region_recommender_api - 13.11.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */

const axios = require('axios');

module.exports = class IataAPI {
    getAutocomplete(query) {
        return axios.get('http://iatacodes.org/api/v6/autocomplete?api_key=' + process.env.API_KEY_IATA + '&query=' + query)
            .then(result => {
                /*  result.data.response.airports [{code, name, country_name}]
                    result.data.response.citites[{code, name, country_name}]
                 */
                let result_array = [],
                    airport_result;
                if (typeof result.data.response !== 'undefined' && result.data.response.airports.length > 0) {
                    result.data.response.airports.forEach(airport => {
                        airport_result = {
                            code: airport.code,
                            name: airport.name,
                            country: airport.country_name,
                            city: ''
                        };
                        result.data.response.cities.forEach(city => {
                            if (city.code === airport.code) {
                                airport_result.city = city.name;
                            }
                        });
                        result_array.push(airport_result);
                    });
                    return result_array;
                } else {
                    return [];
                }
            })
            .catch(error => {
                console.log(error);
            });
    };
};