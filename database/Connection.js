/**   region_recommender_frontend - 30.09.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */

const mysql = require('mysql');

module.exports = class {
    constructor() {
        this.con = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "password",
            database: "sys"
        });
        this.con.connect(function (err) {
            if (err) throw err;
        });
    };

    query(sql, args) {
        return new Promise((resolve, reject) => {
            const start_time = new Date().getTime();
            this.con.query(sql, args, function (err, rows) {
                console.log('query took ' + ( new Date().getTime() - start_time) + 'ms');
                if (err) {
                    console.log('this.sql', this.sql);
                    return reject(err);
                }
                resolve(rows);
            });
        });
    };

    getFeatures() {
        return this.query("SELECT F.key, F.label FROM features F");
    };


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
            " AND r.unique_name IN (?)" + feature_condition_string , [regions]);
    }

    close() {
        return new Promise((resolve, reject) => {
            this.con.end(err => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
};

