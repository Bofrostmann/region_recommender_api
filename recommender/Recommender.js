/**   region_recommender_api - 13.10.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */

const Connection = require('../data/DataBase');
const Region = require('./Region');

module.exports = class {
    constructor(regions, budget, days, start, origin) {
        this.regions = [];
        this.days = days;
        start = start.split('/');
        this.start_date = new Date(start[2], parseInt(start[1], 10) - 1, start[0]);
        this.end_date = new Date(this.start_date);
        this.end_date.setDate(this.start_date.getDate() + parseInt(this.days));
        console.log("start:", this.start_date);
        console.log("end:", this.end_date);
        console.log("days:", this.days);
        this.travel_months = this._calculateTravelMonths();
        this.origin = origin;

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
    };

    getRegions() {
        return this.regions;
    }

    //abstract
    applyRecommender() {
        throw new Error("Abstract method 'applyRecommender' is not implemented in subclass !");
    }

    _calculateTravelMonths() {
        const month_names = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
            start_month = this.start_date.getMonth(),
            end_month = this.end_date.getMonth();
        let travel_months = [];
        // Get all months the user is going to travel in
        for (let i = start_month; i <= end_month; i++) {
            travel_months.push(month_names[i]);
        }
        return travel_months;
    }
};
