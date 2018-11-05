/**   region_recommender_api - 27.10.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */


var unirest = require('unirest');

module.exports = class SkyscannerAPI {
    constructor() {
    }

    getTest() {
        return unirest.get("https://skyscanner-skyscanner-flight-search-v1.p.mashape.com/apiservices/browsedates/v1.0/US/USD/en-US/SFO-sky/LAX-sky/2018-11/2018-11")
            .header("X-Mashape-Key", "KAbHwsWfUJmshMjtRryquDFNBaosp1sXW21jsn5jZHEOvf640z")
            .header("X-Mashape-Host", "skyscanner-skyscanner-flight-search-v1.p.mashape.com");
    }
};

