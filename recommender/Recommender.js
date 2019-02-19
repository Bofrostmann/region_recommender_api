/**   region_recommender_api - 13.10.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */

const Connection = require('../data/DataBase');
const Region = require('./Region');
const Constants = require('../data/Constants');

module.exports = class {
    constructor(regions, budget, days, start, algorithm_id, origin) {
        this.regions = [];
        this.days = days;
        this.start_date = start;
        this.end_date = new Date(this.start_date);
        this.end_date.setDate(this.start_date.getDate() + parseInt(this.days));
        this.travel_months = this._calculateTravelMonths();
        this.origin = origin;
        this.algorithm_id = algorithm_id;

        regions.forEach(element => {
            let region = new Region(element, this.travel_months, days);
            if (region.getTotalCost() <= budget) {
                this.regions.push(region);
            }
        });
    }

    static getRegionsFromDB(features, regions) {
        const db = new Connection();
        return db.getInterestingRegions(features, regions).then(result => {
            db.close();
            return result;
        });
    }

    getAlgorithmId() {
        return this.algorithm_id;
    }

    fillAirports() {
        let promises = [];
        const db = new Connection();
        this.regions.forEach(region => {

            promises.push(db.getAirportsOfRegion(region.getId()).then(airports => {
                region.setAirports(airports)
            }));
        });

        return Promise.all(promises).then(() => {
            db.close();
        });
    }
    ;

    getRegions() {
        return this.regions;
    }

    //abstract
    applyRecommender() {
        throw new Error("Abstract method 'applyRecommender' is not implemented in subclass !");
    }

    _calculateTravelMonths() {
        const start_month = this.start_date.getMonth(),
            end_month = this.end_date.getMonth();
        let travel_months = [];
        // Get all months the user is going to travel in
        for (let i = start_month; i <= end_month; i++) {
            travel_months.push(Constants.MONTHS[i].key);
        }
        return travel_months;
    }
};
