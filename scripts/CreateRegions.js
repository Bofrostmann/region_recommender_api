/**   region_recommender_api - 05.11.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */

const REGIONS = require('./regions');
const Database = require('../data/DataBase');


module.exports = function CreateRegions() {
    const db = new Database();
    this.regions_to_create = [];
    this.regions_to_update = [];
    return db.getRegions()
        .then(regions => {
            this.regions = regions;
        })
        .then(() => {
            let ret_string = '';
            ret_string = handleRegion(REGIONS, 0);

            if (this.regions_to_create.length > 0) {
                db.query('INSERT INTO regions (' +
                    'unique_name, ' +
                    'name, ' +
                    'cost_per_day, ' +
                    'parent_id) VALUES ?', [this.regions_to_create])
                    .then(() => {
                        db.close();
                    });
            }

            return JSON.stringify(this.regions_to_create);

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
    if (!region_exists) {
        this.regions_to_create.push([u_name, u_name, 0, current_parent_id]);
        ret_string = u_name;
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