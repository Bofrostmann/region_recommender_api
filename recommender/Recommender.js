/**   region_recommender_api - 13.10.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */

const Connection = require('./../database/Connection');
const Region = require('./Region');

module.exports = class {
    constructor(regions, budget, days, start) {
        this.regions = [];
        this.days = days;
        start = start.split('/');
        this.start_date = new Date(start[2], parseInt(start[1], 10) - 1, start[0]);
        this.travel_months = this._calculateTravelMonths();
        regions.forEach(element => {
            let region = new Region(element, this.travel_months, days);
            if (region.getTotalCost() <= budget) {
                this.regions.push(region);
            }
        });
    }

    static getRegionsFromDB(features, regions) {
        const db = new Connection(),
            region_promise = db.getInterestingRegions(features, regions);
        db.close();
        return region_promise;
    }

    getRegions() {
        return this.regions;
    }

    //abstract
    applyRecommender() {
        throw new Error("Abstract method 'applyRecommender' is not implemented in subclass !");
    }

    _calculateTravelMonths() {
        let month = new Date(this.start_date);
        month.setDate(this.start_date.getDate() + parseInt(this.days));
        const month_names = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
            start_month = this.start_date.getMonth(),
            end_month = month.getMonth();
        let travel_months = [];
        // Get all months the user is going to travel in
        for (let i = start_month; i <= end_month; i++) {
            travel_months.push(month_names[i]);
        }
        return travel_months;
    }
};
