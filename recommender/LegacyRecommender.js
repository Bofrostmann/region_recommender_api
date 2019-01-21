/**   region_recommender_api - 14.10.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */

const Recommender = require('./Recommender');
module.exports = class extends Recommender {
    constructor(regions, budget, days, start, algorithm_id) {
        super(regions, budget, days, start, algorithm_id);
    }

    applyRecommender() {
        this.regions.sort(function (a, b) {
            return parseFloat(b.getWeather()) - parseFloat(a.getWeather());
        });

        // Number of total results in the final regions array
        var regionsCount = 10;

        // Check if the top regions have the same country prefix
        this._checkDuplicateCountryPrefix(regionsCount);
    }

    _checkDuplicateCountryPrefix(regionsCount) {
        let result_regions = [],
            current_region,
            unique_name_split,
            continent_prefix,
            result_unique_name_split,
            is_duplicate_prefix = false;

        // Add first region to the list of results
        result_regions.push(this.regions.shift());
        // Get the number of regions specified in regionsCount
        while (this.regions.length > 0 && result_regions.length < regionsCount) {
            // Reset flag from previous iteration
            is_duplicate_prefix = false;
            // Get a new region from the array
            current_region = this.regions.shift();
            // Add unique name prefix to array
            unique_name_split = current_region.getUniqueName().split('_');
            if (unique_name_split.length > 1) {
                continent_prefix = unique_name_split[0];
            } else {
                // If there is no name prefix that means it is a new country so we can add it
                result_regions.push(current_region);
                continue;
            }

            // Search current results for duplicate continent prefixes
            for (let j = 0; j < result_regions.length; j++) {
                // Get the unique name prefix in the current result region
                result_unique_name_split = result_regions[j].getUniqueName().split('_');
                if (result_unique_name_split.length > 1 && result_unique_name_split[0] === continent_prefix) {
                    // If there is no name prefix that means it is a new country so we can keep iterating
                    // If the prefix already exists we don't want to add the region to our results
                    is_duplicate_prefix = true;
                    break;
                }
            }
            // If the current region wasn't a duplicate, add it to the results
            if (!is_duplicate_prefix) {
                result_regions.push(current_region);
            }
        }
        this.regions = result_regions;
    }
};