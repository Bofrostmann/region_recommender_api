/**   region_recommender_frontend - 30.09.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */

const mysql = require('mysql');
const Constants = require('./Constants');


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

    getActivities() {
        return this.query("SELECT F.key, F.label, F.id, F.is_active FROM features F");
    };

    getActiveActivities() {
        return this.query("SELECT F.key, F.label, F.id FROM features F WHERE F.is_active = 1");
    }

    updateActivity(key, label, is_active, id) {
        return this.query("UPDATE features F SET F.key = ?, F.label = ?, F.is_active = ? " +
            "WHERE F.id = ?", [key, label, is_active, id])
    }

    insertActivity(key, label, is_active) {
        return this.query("INSERT INTO features SET features.key = ?, features.label = ?, features.is_active = ? ", [key, label, is_active]);
    }

    deleteActivity(id) {
        return this.deleteActivityQualitiesOfActivity(id)
            .then(() => {
                return this.query("DELETE FROM features WHERE id = ? ", [id]);
            });
    }

    getRegions() {
        return this.query("SELECT R.* FROM regions R");
    };

    getAlgorithms() {
        return this.query("SELECT A.* FROM algorithms A");
    };

    getVariablesOfAlgorithm(algorithm_id) {
        return this.query("SELECT V2A.* FROM variables2algorithm V2A " +
            "WHERE algorithm_id = ?", [algorithm_id]);
    }

    deleteActivityQualitiesOfActivity(activity_id) {
        return this.query("DELETE FROM feature2region WHERE feature_id = ?", [activity_id]);
    }

    getActivitiesOfRegion(id) {
        return this.query("SELECT F.key, F2R.* FROM feature2region F2R, features F " +
            "WHERE F2R.region_id = ? " +
            "AND F.id = F2R.feature_id", [id]);
    };

    deleteActivityQualitiesOfRegion(region_id) {
        return this.query("DELETE FROM feature2region WHERE region_id = ?", [region_id]);
    }

    insertActivityQualities(data, region_id) {
        const seasons = ["spring", "summer", "autumn", "winter"];
        let error = '';
        return this.getActivities().then(result => {
            let activity_qualities = {},
                activity_quality_array = [];
            result.forEach(activity => {
                activity_qualities = {};
                seasons.forEach(season => {
                    if (typeof data[activity.key + '$' + season] !== "undefined"
                        && data[activity.key + '$' + season] !== '') {
                        activity_qualities[season] = data[activity.key + '$' + season];
                    }
                });
                /* A valid activity has either all 4 qualities set, or no quality at all*/
                if (Object.values(activity_qualities).length === 4 && error === '') {
                    activity_quality_array.push([activity.id, region_id, activity_qualities.spring, activity_qualities.summer, activity_qualities.autumn, activity_qualities.winter]);
                } else if (Object.values(activity_qualities).length !== 0) {
                    error = 'invalid activity data!';
                    console.log(error, activity.key);
                }
            });
            if (activity_quality_array.length) {
                return this.query('INSERT INTO feature2region(feature_id, region_id, quality_spring, quality_summer, quality_autumn, quality_winter) VALUES ?', [activity_quality_array]);
            }
        });
    }

    deleteAirportsOfRegion(region_id) {
        return this.query('DELETE FROM airports WHERE region_id = ?', [region_id]);
    }

    getAirportsOfRegion(region_id) {
        return this.query('SELECT * FROM airports A WHERE A.region_id = ?', [region_id]);
    }

    getTimeOfTravelQualitiesOfRegion(region_id) {
        return this.query('SELECT * FROM time_of_travel_quality2region TTQ2R WHERE TTQ2R.region_id = ?', [region_id]);
    }


    insertAirportsForRegion(data, region_id) {
        let airport_arrray = [];
        data.airports.forEach(i => {
            if ((typeof data['airport_name$' + i] !== 'undefined' && data['airport_name$' + i] !== '') ||
                (typeof data['airport_city$' + i] !== 'undefined' && data['airport_city$' + i] !== '') ||
                (typeof data['airport_country$' + i] !== 'undefined' && data['airport_country$' + i] !== '') ||
                (typeof data['airport_iata_code$' + i] !== 'undefined' && data['airport_iata_code$' + i] !== '')) {
                airport_arrray.push([
                    data['airport_name$' + i],
                    data['airport_city$' + i],
                    data['airport_country$' + i],
                    data['airport_iata_code$' + i],
                    region_id]);
            }
        });
        if (airport_arrray.length > 0) {
            return this.query('INSERT INTO airports(name, city, country, iata_code, region_id) VALUES ?', [airport_arrray]);
        }
    }

    deleteTimeOfTravelQualitiesOfRegion(region_id) {
        return this.query('DELETE FROM time_of_travel_quality2region WHERE region_id = ?', [region_id]);

    }

    insertTimeOfTravelQualitiesOfRegion(data, region_id) {
        let values = {region_id};
        Constants.MONTHS.forEach(month => {
            values[month.key] = data["quality$" + month.key];
        });
        return this.query('INSERT INTO time_of_travel_quality2region SET ?', [values]);
    }

    updateRegion(data) {
        return this.beginTransaction()
            .then(() => {
                return this.deleteActivityQualitiesOfRegion(data.id);
            })
            .then(() => {
                return this.insertActivityQualities(data, data.id);
            })
            .then(() => {
                return this.deleteAirportsOfRegion(data.id);
            })
            .then(() => {
                return this.insertAirportsForRegion(data, data.id);
            })
            .then(() => {
                return this.deleteTimeOfTravelQualitiesOfRegion(data.id);
            })
            .then(() => {
                return this.insertTimeOfTravelQualitiesOfRegion(data, data.id);
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
                    return this.insertActivityQualities(data, success.insertId)
                        .then(() => {
                            return this.insertTimeOfTravelQualitiesOfRegion(data, success.insertId);
                        })
                        .then(() => {
                            return this.commit();
                        }, err => {
                            return this.rollback("error in createRegionWithActivityQualities. Rolling back. Error: \n" + err);
                        });
                });
        });
    }

    deleteRegionWithForeignTables(region_id) {
        return this.beginTransaction()
            .then(() => {
                return this.deleteActivityQualitiesOfRegion(region_id)
            })
            .then(() => {
                return this.deleteAirportsOfRegion(region_id);
            })
            .then(() => {
                return this.deleteTimeOfTravelQualitiesOfRegion(region_id);
            })
            .then(() => {
                return this.query('DELETE FROM regions WHERE regions.id = ?', [region_id]);
            })
            .then(() => {
                return this.commit();
            });
    };


    createAlgorithmWithForeignTables(data) {
        return this.beginTransaction()
            .then(() => {
                return this.query('INSERT INTO algorithms SET ' +
                    'algorithms.key = ?, ' +
                    'algorithms.name = ?, ' +
                    'algorithms.is_active = ?',
                    [data.key, data.name, data.is_active])
                    .then(success => {
                        return this.insertAlgorithmVariables(data, success.insertId)
                    })
                    .then(() => {
                        return this.commit();
                    });
            });
    };

    updateAlgorithmWithForeignKeyTables(data) {
        return this.beginTransaction()
            .then(() => {
                return this.query('UPDATE algorithms A ' +
                    'SET A.`key` = ?, ' +
                    'A.name = ?, ' +
                    'A.is_active = ? ' +
                    'WHERE A.id = ?', [data.key, data.name, data.is_active, data.id]);
            })
            .then(() => {
                return this.deleteAgorithmVariables(data.id);
            })
            .then(() => {
                return this.insertAlgorithmVariables(data, data.id);
            })
            .then(() => {
                return this.commit();
            });
    };

    deleteAlgorithmWithForeignTables(algorithm_id) {
        return this.beginTransaction()
            .then(() => {
                return this.deleteAgorithmVariables(algorithm_id);
            })
            .then(() => {
                return this.query("DELETE FROM algorithms WHERE id = ?", [algorithm_id]);
            })
            .then(() => {
                return this.commit();
            });
    }

    insertAlgorithmVariables(data, algorithm_id) {
        let values = [];
        data.variables.forEach(variable_id => {
            values.push([algorithm_id, data['variable_key$' + variable_id], data['variable_value$' + variable_id]]);
        });
        if (values.length) {
            return this.query('INSERT INTO variables2algorithm (`algorithm_id`, `key`, `value`) VALUES ?', [values]);
        }
    };

    deleteAgorithmVariables(algorithm_id) {
        return this.query('DELETE FROM variables2algorithm WHERE algorithm_id = ?', [algorithm_id]);
    };

    getInterestingRegions(activities, regions) {
        let activity_condition_string = '',
            activity_tables_string = '',
            activity_select_string = '',
            f2r = '';
        Object.values(activities).forEach((activity, i) => {
            if (activity.value > 0) {
                f2r = 'f2r' + i;
                activity_tables_string = activity_tables_string + ', feature2region ' + f2r + ', features f' + i;
                activity_condition_string = activity_condition_string + ' AND r.id = ' + f2r + '.region_id' +
                    ' AND f' + i + '.key = ' + this.con.escape(activity.key) +
                    ' AND f' + i + '.id = ' + f2r + '.feature_id' +
                    ' AND ' + f2r + '.quality_spring > 0';
                activity_select_string = activity_select_string +
                    ', ' + f2r + '.quality_spring AS ' + this.con.escape(activity.key + '_spring') +
                    ', ' + f2r + '.quality_summer AS ' + this.con.escape(activity.key + '_summer') +
                    ', ' + f2r + '.quality_autumn AS ' + this.con.escape(activity.key + '_autumn') +
                    ', ' + f2r + '.quality_winter AS ' + this.con.escape(activity.key + '_winter');
            }
        });

        return this.query("SELECT r.id, r.name, r.cost_per_day, r.unique_name, tq.*" + activity_select_string +
            " FROM regions r, time_of_travel_quality2region tq" + activity_tables_string +
            " WHERE r.id = tq.region_id" +
            " AND r.unique_name IN (?)" + activity_condition_string, [regions]);
    }
    ;

    createOrUpdateFeedbackQuestions(data) {
        if (data.questions.length === 0) {
            return this.beginTransaction()
                .then(() => {
                    return this.query("DELETE FROM result2feedback_question");
                })
                .then(() => {
                    return this.query("DELETE FROM feedback_questions");
                })
                .then(() => {
                    return this.commit();
                });
        }
        return this.beginTransaction()
            .then(() => {
                return this.query("DELETE FROM result2feedback_question " +
                    " WHERE feedback_question_id NOT IN (?)", [data.questions])
            })
            .then(() => {
                return this.query("DELETE FROM feedback_questions " +
                    " WHERE id NOT IN (?)", [data.questions])
            })
            .then(() => {
                return this.query("SELECT fq.*" +
                    " FROM feedback_questions fq" +
                    " WHERE fq.id IN (?)", [data.questions])
            })
            .then(questions_in_db => {
                let promise_array = [];
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

    getSettings() {
        return this.query("SELECT * FROM general_settings");
    };
    helper$getSetting(settings, key) {
        let value;
        console.log("settings", settings);
        settings.forEach(setting => {
            if (setting.key === key) {
                value = setting.value;
            }
        });
        return value;
    };

    createOrUpdateSettings(data) {
        if (data.settings.length === 0) {
            return this.beginTransaction()
                .then(() => {
                    return this.query("DELETE FROM general_settings");
                })
                .then(() => {
                    return this.commit();
                });
        }
        return this.beginTransaction()
            .then(() => {
                return this.query("DELETE FROM general_settings " +
                    " WHERE id NOT IN (?)", [data.settings]);
            })
            .then(() => {
                return this.query("SELECT GS.*" +
                    " FROM general_settings GS" +
                    " WHERE GS.id IN (?)", [data.settings]);
            })
            .then(settings_in_db => {
                let promise_array = [];
                settings_in_db.forEach(setting => {
                    promise_array.push(this.query('UPDATE general_settings GS ' +
                        'SET GS.key = ?, GS.value = ? ' +
                        'WHERE GS.id = ?', [
                        data['key_' + setting.id],
                        data['value_' + setting.id],
                        setting.id]));
                    data.settings.splice(data.settings.indexOf(setting.id), 1);
                });
                // wait for all updates to finish
                return Promise.all(promise_array);
            })
            .then(() => {
                let insert_array = [];
                data.settings.forEach(setting => {
                    insert_array.push([
                        data['key_' + setting],
                        data['value_' + setting]
                    ]);
                });
                if (insert_array.length) {
                    return this.query("INSERT INTO general_settings (`key`, `value`) VALUES ?", [insert_array]);
                }
            })
            .then(() => {
                return this.commit();
            });
    }

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

}
;

