/**   region_recommender_api - 05.11.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */

const REGIONS = require('./regions');
const Database = require('../data/DataBase');


module.exports = function updateParents() {
    const db = new Database();
    this.regions_to_update = [];
    return db.getRegions()
        .then(regions => {
            this.regions = regions;
        })
        .then(() => {
            let ret_string = '';
            ret_string = handleRegion(REGIONS, 0);

            if (this.regions_to_update.length > 0) {
                this.regions_to_update.forEach(region => {
                    db.query('UPDATE regions R SET R.parent_id = ? ' +
                        'WHERE R.id = ?', [region.parent_id, region.id]);
                });
            }

            return JSON.stringify(this.regions_to_update);

        });
};


function handleRegion(region, current_parent_id) {
    let u_name = '',
        region_exists = false,
        id = current_parent_id;
    if (typeof region.u_name !== 'undefined') {
        u_name = region.u_name;
    } else {
        u_name = region.name
    }

    this.regions.forEach(db_region => {
        if (db_region.unique_name === u_name) {
            region_exists = true;
            id = db_region.id;
        }
    });
    let ret_string = '';
    if (region_exists) {
        ret_string = u_name + (current_parent_id);
        this.regions_to_update.push({id, parent_id: current_parent_id});
    }
    if (typeof region.subregions === 'undefined') {
        return ret_string;
    } else {
        region.subregions.forEach(sub_region => {
            ret_string = ret_string + '<br/>' + handleRegion(sub_region, id);
        });
        return ret_string;
    }
}