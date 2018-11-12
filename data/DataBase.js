/**   region_recommender_frontend - 30.09.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */

const mysql = require('mysql');

module.exports = class {
    constructor() {
        this.con = mysql.createConnection({
            host: process.env.DB_IP,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: "recommender"
        });
        this.con.connect(function (err) {
            if (err) throw err;
        });
    };

    beginTransaction() {
        return new Promise((resolve, reject) => {
            this.con.beginTransaction(err => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.con.end(err => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    };

    commit() {
        return new Promise((resolve, reject) => {
            this.con.commit(err => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    };

    rollback(error) {
        return new Promise((resolve, reject) => {
            this.con.rollback(err => {
                return reject(error);
            });
        });
    };

    query(sql, args) {
        return new Promise((resolve, reject) => {
            const start_time = new Date().getTime();
            this.con.query(sql, args, function (err, rows) {
                console.log('query took ' + (new Date().getTime() - start_time) + 'ms');
                if (err) {
                    console.log('this.sql', this.sql);
                    return reject(err);
                } else {
                    if (typeof rows.affectedRows !== "undefined") {
                        console.log('affected Rows: ' + rows.affectedRows);
                    }
                }
                resolve(rows);
            });
        });
    };

    getFeatures() {
        return this.query("SELECT F.key, F.label, F.id FROM features F");
    };

    updateFeature(key, label, id) {
        return this.query("UPDATE features F SET F.key = ?, F.label = ? " +
            "WHERE F.id = ?", [key, label, id])
    }

    insertFeature(key, label) {
        return this.query("INSERT INTO features SET features.key = ?, features.label = ? ", [key, label]);
    }

    deleteFeature(id) {
        return this.deleteFeatureQualitiesOfFeature(id)
            .then(() => {
                return this.query("DELETE FROM features WHERE id = ? ", [id]);
            });
    }

    getRegions() {
        return this.query("SELECT R.* FROM regions R");
    };

    deleteFeatureQualitiesOfFeature(feature_id) {
        return this.query("DELETE FROM feature2region WHERE feature_id = ?", [feature_id]);
    }

    getFeaturesOfRegion(id) {
        return this.query("SELECT F.key, F2R.* FROM feature2region F2R, features F " +
            "WHERE F2R.region_id = ? " +
            "AND F.id = F2R.feature_id", [id]);
    };

    deleteFeatureQualitiesOfRegion(region_id) {
        return this.query("DELETE FROM feature2region WHERE region_id = ?", [region_id]);
    }

    insertFeatureQualities(data, region_id) {
        const seasons = ["spring", "summer", "autumn", "winter"];
        let error = '';
        return this.getFeatures().then(result => {
            let feature_qualities = {},
                feature_quality_array = [];
            result.forEach(feature => {
                feature_qualities = {};
                seasons.forEach(season => {
                    if (typeof data[feature.key + '$' + season] !== "undefined"
                        && data[feature.key + '$' + season] !== '') {
                        feature_qualities[season] = data[feature.key + '$' + season];
                    }
                });
                /* A valid feature has either all 4 qualities set, or no quality at all*/
                if (Object.values(feature_qualities).length === 4 && error === '') {
                    feature_quality_array.push([feature.id, region_id, feature_qualities.spring, feature_qualities.summer, feature_qualities.autumn, feature_qualities.winter]);
                } else if (Object.values(feature_qualities).length !== 0) {
                    error = 'invalid feature data!';
                    console.log(error, feature.key);
                }
            });
            this.query('INSERT INTO feature2region(feature_id, region_id, quality_spring, quality_summer, quality_autumn, quality_winter) VALUES ?', [feature_quality_array]);
        });
    }

    deleteAirportsOfRegion(region_id) {
        return this.query('DELETE FROM airports WHERE region_id = ?', [region_id]);
    }


    getAirportsOfRegion(region_id) {
        return this.query('SELECT * FROM airports A WHERE A.region_id = ?', [region_id]);
    }


    insertAirportsForRegion(data, region_id) {
        let airport_arrray = [];
        for (let i = 0; i < data.number_of_airports; i++) {
            airport_arrray.push([data['airport_name$' + i], data['airport_city$' + i], data['airport_iata_code$' + i], region_id]);
        }
        if (airport_arrray.length > 0) {
            return this.query('INSERT INTO airports(name, city, iata_code, region_id) VALUES ?', [airport_arrray]);
        }
    }


    updateRegion(data) {
        return this.beginTransaction()
            .then(() => {
                this.deleteFeatureQualitiesOfRegion(data.id);
            })
            .then(() => {
                return this.insertFeatureQualities(data, data.id);
            })
            .then(() => {
                return this.deleteAirportsOfRegion(data.id);
            })
            .then(() => {
                return this.insertAirportsForRegion(data, data.id);
            })
            .then(() => {
                return this.query('UPDATE regions R SET R.unique_name = ?, R.name = ?, R.cost_per_day = ? , R.parent_id = ? ' +
                    'WHERE R.id = ?', [data.unique_name, data.name, data.cost_per_day, data.parent_id, data.id]);
            })
            .then(() => {
                return this.commit("testing phase");
            });
    };

    createRegionWithForeignTables(data) {
        return this.beginTransaction().then(() => {
            return this.query('INSERT INTO regions SET ' +
                'regions.unique_name = ?, ' +
                'regions.name = ?, ' +
                'regions.cost_per_day = ?, ' +
                'regions.parent_id = ?', [data.unique_name, data.name, parseInt(data.cost_per_day), data.parent_id]).then(success => {
                this.insertFeatureQualities(data, success.insertId).then(() => {
                    return this.commit();
                }, err => {
                    return this.rollback("error in createRegionWithFeatureQualities. Rolling back. Error: \n" + err);
                });
            });
        });
    }

    deleteRegionWithForeignTables(region_id) {
        console.log("id", region_id);
        return this.beginTransaction()
            .then(() => {
                return this.deleteFeatureQualitiesOfRegion(region_id)
            })
            .then(() => {
                return this.deleteAirportsOfRegion(region_id);
            })
            .then(() => {
                return this.query('DELETE FROM regions WHERE regions.id = ?', [region_id]);
            })
            .then(() => {
                console.log("commiting");
                return this.commit();
            });
    }
    ;

    getInterestingRegions(features, regions) {
        let feature_condition_string = '',
            feature_tables_string = '',
            feature_select_string = '',
            f2r = '';
        Object.values(features).forEach((feature, i) => {
            if (feature.value > 0) {
                f2r = 'f2r' + i;
                feature_tables_string = feature_tables_string + ', feature2region ' + f2r + ', features f' + i;
                feature_condition_string = feature_condition_string + ' AND r.id = ' + f2r + '.region_id' +
                    ' AND f' + i + '.key = ' + this.con.escape(feature.key) +
                    ' AND f' + i + '.id = ' + f2r + '.feature_id' +
                    ' AND ' + f2r + '.quality_spring > 0';
                feature_select_string = feature_select_string +
                    ', ' + f2r + '.quality_spring AS ' + this.con.escape(feature.key + '_spring') +
                    ', ' + f2r + '.quality_summer AS ' + this.con.escape(feature.key + '_summer') +
                    ', ' + f2r + '.quality_autumn AS ' + this.con.escape(feature.key + '_autumn') +
                    ', ' + f2r + '.quality_winter AS ' + this.con.escape(feature.key + '_winter');
            }
        });

        return this.query("SELECT r.name, r.cost_per_day, r.unique_name, wq.*" + feature_select_string +
            " FROM regions r, weather_qualities wq" + feature_tables_string +
            " WHERE r.weather_quality_id = wq.id" +
            " AND r.unique_name IN (?)" + feature_condition_string, [regions]);
    }
}
;

