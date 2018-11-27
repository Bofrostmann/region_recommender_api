/**   region_recommender_api - 05.11.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */

const REGIONS = require('./regions');
const Database = require('../data/DataBase');

const DEBUG_MODE = false;

module.exports = function updateParents() {
    const db = new Database();
    this.regions_to_update = [];
    return db.getRegions()
        .then(regions => {
            this.db_regions = regions;
        })
        .then(() => {
            handleRegion(REGIONS, 0);
            let ret_string = '';

            if (this.regions_to_update.length > 0) {

                this.regions_to_update.forEach(region => {
                    ret_string = ret_string + '<br/>' + region.id + ' '+ region.u_name + '(' + region.max_zoom_level + ')';
                    if (!DEBUG_MODE) {
                        db.query('UPDATE regions R SET R.max_zoom_level = ? ' +
                            'WHERE R.id = ?', [region.max_zoom_level, region.id]);
                    }
                });
            }

            return ret_string;

        });
};


function handleRegion(region) {
    let u_name = '',
        region_exists = false,
        id = '';
    if (typeof region.u_name !== 'undefined') {
        u_name = region.u_name;
    } else {
        u_name = region.name
    }

    this.db_regions.forEach(db_region => {
        if (db_region.unique_name === u_name) {
            region_exists = true;
            id = db_region.id;
        }
    });

    if (region_exists && typeof region.maxZoomLevel !== 'undefined') {
        this.regions_to_update.push({u_name, id, max_zoom_level: region.maxZoomLevel});

        if (typeof region.subregions !== 'undefined') {
            region.subregions.forEach(sub_region => {
                handleRegion(sub_region);
            });
        }
    }
    return '';
}