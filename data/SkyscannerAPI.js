/**   region_recommender_api - 27.10.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */


var unirest = require('unirest');

module.exports = class SkyscannerAPI {
    static _numberOfDays(start_string, end_string) {
        const start = new Date(start_string),
            end = new Date(end_string);
        return Math.round(Math.abs((start.getTime() - end.getTime()) / (1000 * 60 * 60 * 24)));
    };

    getBestRouteForAirports(origin, destinations, start, end) {
        const number_of_days = SkyscannerAPI._numberOfDays(start, end),
            offset = 4;

        const formatDate = (date) => {
            const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
            let daystring = date.getDate().toString();
            if (daystring.length === 1) {
                daystring = '0' + daystring;
            }
            return date.getFullYear() + '-' + months[date.getMonth()] + '-' + daystring;
        };
        start = formatDate(start);
        end = formatDate(end);

        let promises = [];
        destinations.forEach(destination => {
            promises.push(new Promise((resolve, reject) => {
                const url = "https://skyscanner-skyscanner-flight-search-mdcinnovations-v1.p.rapidapi.com/apiservices/browseroutes/v1.0/DE/EUR/en-US"
                    + "/" + origin
                    + "/" + destination
                    + "/" + start
                    + "/" + end;
                return unirest.get(url)
                    .header("X-RapidAPI-Key", "KWix2GSybMmsh1999juAzdar2uUpp128qnTjsngHALJPEoSc2K")
                    .end(function (result) {
                        if (result.clientError) {
                            console.log('request: ', url);
                            console.log('error: ', result.body);
                            return reject("an error occured in the skyscannerAPI! See log for details");
                        } else {
                            // TODO: Sort results, replace dates and destination
                            resolve(result.body);
                        }
                    });
            }));
        });

        return Promise.all(promises).then(results => {
            const createUrl = (origin, destination, start, end) => {
                return 'http://partners.api.skyscanner.net/apiservices/referral/v1.0/DE/EUR/en-US'
                    + '/' + origin
                    + '/' + destination
                    + '/' + start
                    + '/' + end
            };

            const createTrip = (quote, result) => {
                return {
                    price: quote.MinPrice,
                    url: createUrl(
                        origin,
                        result.Places.find(place => (place.PlaceId === quote.OutboundLeg.DestinationId)).IataCode,
                        quote.OutboundLeg.DepartureDate.split('T')[0],
                        quote.InboundLeg.DepartureDate.split('T')[0]
                    )
                };
            };
            let lowest = {};
            results.forEach(result => {
                //find lowest price of result
                result.Quotes.forEach(quote => {
                    if (Math.abs(SkyscannerAPI._numberOfDays(quote.OutboundLeg.DepartureDate, quote.InboundLeg.DepartureDate) - number_of_days) <= offset) {
                        if (typeof lowest.price === 'undefined' || lowest.price > quote.MinPrice) {
                            lowest = createTrip(quote, result);
                        }
                    }
                });
            });
            return lowest;
        }).catch(reason => {
            console.log(reason);
        });
    };
};

