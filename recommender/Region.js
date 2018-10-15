/**   region_recommender_api - 13.10.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */


module.exports = class {
    constructor(region, travel_months, days) {
        // this is not the best class, ever. But since region is a big data object
        // that we get from the db, we cannot really predict the fields it has
        this.region = region;
        this._calcWeatherScore(travel_months);
        this.region.total_cost = this.region.cost_per_day * days;
        this.score = 0;
    }

    setScore(val) {
        this.score = val;
    }

    getScore() {
        return this.score;
    }

    _calcWeatherScore(travel_months) {
        this.region.weather = 0;
        // Add the score of all months that are within the travel dates
        travel_months.forEach(month => {
            this.region.weather += parseInt(this.region[month], 10);
        });
    }

    getScoreForFeatureInSeason(feature, season) {
        return this.region[feature + '_' + season];
    }

    getTotalCost() {
        return this.region.total_cost;
    }

    getWeather() {
        return this.region.weather;
    }

    getUniqueName() {
        return this.region.unique_name;
    }

    getName() {
        return this.region.name;
    }
};