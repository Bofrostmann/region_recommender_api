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
                if (err) {
                    console.log("error in beginTransaction");
                    return reject(err);
                }
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
            console.log("commiting");
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
                if (err) {
                    console.log('this.sql', this.sql);
                    return reject(err);
                } else {
                    if (typeof rows.affectedRows !== "undefined") {
                        console.log('query took ' + (new Date().getTime() - start_time) + 'ms');
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
            return this.query('INSERT INTO feature2region(feature_id, region_id, quality_spring, quality_summer, quality_autumn, quality_winter) VALUES ?', [feature_quality_array]);
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
            if ((typeof data['airport_name$' + i] !== 'undefined' && data['airport_name$' + i] !== '') ||
                (typeof data['airport_city$' + i] !== 'undefined' && data['airport_city$' + i] !== '') ||
                (typeof data['airport_iata_code$' + i] !== 'undefined' && data['airport_iata_code$' + i] !== '')) {
                airport_arrray.push([data['airport_name$' + i], data['airport_city$' + i], data['airport_iata_code$' + i], region_id]);
            }
        }
        if (airport_arrray.length > 0) {
            return this.query('INSERT INTO airports(name, city, iata_code, region_id) VALUES ?', [airport_arrray]);
        }
    }


    updateRegion(data) {
        return this.beginTransaction()
            .then(() => {
                return this.deleteFeatureQualitiesOfRegion(data.id);
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
                return this.query('UPDATE regions R ' +
                    'SET R.unique_name = ?, R.name = ?, R.cost_per_day = ? , R.parent_id = ?, R.max_zoom_level = ? ' +
                    'WHERE R.id = ?', [data.unique_name, data.name, data.cost_per_day, data.parent_id, data.max_zoom_level, data.id]);
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
                'regions.parent_id = ?, ' +
                'regions.max_zoom_level = ?',
                [data.unique_name, data.name, parseInt(data.cost_per_day), data.parent_id, data.max_zoom_level])
                .then(success => {
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

        return this.query("SELECT r.id, r.name, r.cost_per_day, r.unique_name, wq.*" + feature_select_string +
            " FROM regions r, weather_qualities wq" + feature_tables_string +
            " WHERE r.weather_quality_id = wq.id" +
            " AND r.unique_name IN (?)" + feature_condition_string, [regions]);
    };

    createOrUpdateFeedbackQuestions(data) {
        return this.beginTransaction()
            .then(() => {
                return this.query("SELECT fq.*" +
                    " FROM feedback_questions fq" +
                    " WHERE fq.id IN (?)", [data.questions])
            })
            .then(questions_in_db => {
                let promise_array = [];
                console.log("q_in_db", questions_in_db);
                questions_in_db.forEach(question => {
                    promise_array.push(this.query('UPDATE feedback_questions FQ ' +
                        'SET FQ.key = ?, FQ.text = ?, FQ.is_active = ? ' +
                        'WHERE FQ.id = ?', [
                        data['question_key_' + question.id],
                        data['question_text_' + question.id],
                        data['question_is_active_' + question.id], question.id]));
                    data.questions.splice(data.questions.indexOf(question.id), 1);
                });
                // wait for all updates to finish
                return Promise.all(promise_array);
            })
            .then(() => {
                let insert_array = [];
                data.questions.forEach(question => {
                    insert_array.push([
                        data['question_key_' + question],
                        data['question_text_' + question],
                        data['question_is_active_' + question]
                    ]);
                });
                if (insert_array.length) {
                    return this.query("INSERT INTO feedback_questions (`key`, `text`, is_active) VALUES ?", [insert_array]);
                }
            })
            .then(() => {
                return this.commit();
            });
    };

    getFeedbackQuestions() {
        return this.query("SELECT * FROM feedback_questions");
    };

    getActiveFeedbackQuestions() {
        return this.query("SELECT * FROM feedback_questions WHERE is_active = 1");
    };

    createUser() {
        return this.query("INSERT INTO users (id) VALUES (NULL);")
            .then(result => {
                return result.insertId;
            });
    }

    checkAndCreateUserId(id) {
        let promise;
        if (typeof id !== "undefined" && id !== "") {
            promise = this.query("SELECT * FROM users WHERE id = ?", [id])
                .then(users => {
                    if (users.length) {
                        console.log("user:", users);
                        return users[0].id;
                    } else {
                        return this.createUser();
                    }
                });
        } else {
            promise = this.createUser();
        }
        return promise;
    }

    logQueryAndResults(query_data, recommended_region_data, user_id) {
        const regions = JSON.stringify(query_data.regions),
            start_array = query_data.start.split('/'),
            start = new Date(start_array[2], parseInt(start_array[1], 10) - 1, start_array[0]);
        return this.query("INSERT INTO queries SET " +
            "queries.regions = ?, " +
            "queries.origin = ?, " +
            "queries.start_date = ?, " +
            "queries.budget = ?, " +
            "queries.days = ?, " +
            "queries.user_id = ?",
            [regions, query_data.origin, start, query_data.budget, query_data.days, user_id])
            .then(result_query => {
                let promises = [];
                recommended_region_data.forEach(region => {
                    promises.push(
                        this.query("INSERT INTO results " +
                            "(query_id, region_id, region_cost, flight_cost, flight_url, duration) " +
                            "VALUES (?, ?, ?, ?, ?, ?)",
                            [
                                result_query.insertId,
                                region.region.id,
                                region.region.price,
                                region.flight.price,
                                region.flight.url,
                                region.duration
                            ])
                            .then(result_results => {
                                region.result_id = result_results.insertId;
                                console.log("id", result_results.insertId);
                            }));
                });
                return Promise.all(promises);
            });
    }

    storeFeebackQuestionAnswers(data) {
        return this.beginTransaction()
            .then(() => {
                return this.query("DELETE FROM result2feedback_question WHERE result_id = ?", [data.result_id])
            })
            .then(() => {
                let insert_array = [];
                Object.keys(data.answers).forEach(key => {
                    const question_id = key.split("_")[1];
                    insert_array.push([question_id, data.result_id, data.answers["question_" + question_id]])
                });
                if (insert_array.length) {
                    return this.query("INSERT INTO result2feedback_question " +
                        "(feedback_question_id, result_id, rating) " +
                        "VALUES ?", [insert_array])
                        .then();
                }
            })
            .then(() => {
                return this.commit();
            });
    }

};

