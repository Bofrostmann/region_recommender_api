/**   region_recommender_api - 14.10.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 *
 *    Calculates similarity between user input vector and region vector. Not really that great, just a test
 */

const Recommender = require('./Recommender');
const CosineSimilarity = require('compute-cosine-similarity');
const SkyscannerAPI = require('../data/SkyscannerAPI');


module.exports = class extends Recommender {
    constructor(regions, budget, days, start, algorithm_id, origin, api_calls) {
        super(regions, budget, days, start, algorithm_id, origin);
        this.remaining_api_calls = api_calls;
    }

    applyRecommender(user_features) {
        //calculate scores, using cosine similarity
        let user_vector = [],
            region_vector = [];

        //create user vector
        Object.values(user_features).forEach(feature => {
            if (feature.value > 0) {
                user_vector.push(feature.value * 25);
            }
        });
        // push the desired weatherscore: 100
        user_vector.push(100);

        this.regions.forEach(region => {

            region_vector = [];
            Object.values(user_features).forEach(feature => {
                if (feature.value > 0) {
                    region_vector.push(region.getScoreForFeatureInSeason(feature.key, 'spring'));
                }
            });
            region_vector.push(region.getWeather());
            region.setScore(CosineSimilarity(user_vector, region_vector));
        });

        this.regions.sort(function (a, b) {
            return parseFloat(b.getScore()) - parseFloat(a.getScore());
        });

        let promises = [];
        const skyscanner = new SkyscannerAPI();
        this.regions.forEach(region => {
            if (this.remaining_api_calls > 0 && region.getAirports().length) {
                promises.push(skyscanner.getBestRouteForAirports(
                    this.origin,
                    region.getAirports().map(airport => (airport.iata_code)),
                    this.start_date,
                    this.end_date).then(trip => {
                    if (typeof trip !== "undefined") {
                        region.setCheapestTrip(trip);
                    }
                }));
                this.remaining_api_calls--;
            }
        });

        return Promise.all(promises);
    }
};