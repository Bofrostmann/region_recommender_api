const express = require('express');
const router = express.Router();
const Database = require('../data/DataBase');
const Recommender = require('./../recommender/Recommender');
const CosineRecommender = require('../recommender/CosineRecommender');
const LegacyRecommender = require('../recommender/LegacyRecommender');
const IataAPI = require('../data/IataAPI');
const jwt = require('jwt-simple');

const createRegions = require('../scripts/CreateRegions');
const updateParents = require('../scripts/UpdateParents');
const setZoomLevels = require('../scripts/setZoomLevel');

module.exports = function (app, authenticator) {
    /* GET home page. */

    router.get('/', function (req, res) {
        res.send("this is the recommender API");
    });

    router.get('/activeActivities', (req, res) => {
        const db = new Database();
        db.getActiveActivities().then(result => {
                const feature_object = {};
                Object.values(result).forEach(feature => {
                    feature_object[feature.key] = {key: feature.key, label: feature.label};
                });
                res.json(feature_object);
            },
            error => {
                console.log("error!", error);
            });
        db.close();
    });

    router.get('/allActivities', authenticator.authenticate(), (req, res) => {
        const db = new Database();
        db.getActivities().then(result => {
                const feature_object = {};
                Object.values(result).forEach(feature => {
                    feature_object[feature.key] = feature;
                });
                res.json(feature_object);
            },
            error => {
                console.log("error!", error);
            });
        db.close();
    });


    router.get('/regions', (req, res) => {
        const db = new Database();
        db.getRegions().then(result => {
                const region_object = {};
                Object.values(result).forEach(region => {
                    region_object[region.unique_name] = region;
                });
                res.json(region_object);
            },
            error => {
                console.log("error!", error);
            });
        db.close();
    });
    router.get('/algorithms', (req, res) => {
        const db = new Database();
        db.getAlgorithms().then(result => {
                const algorithms_object = {};
                Object.values(result).forEach(algorithm => {
                    algorithms_object[algorithm.key] = algorithm;
                });
                res.json(algorithms_object);
            },
            error => {
                console.log("error!", error);
            });
        db.close();
    });

    router.post('/getVariablesOfAlgorithm', authenticator.authenticate(), (req, res) => {
        const db = new Database();
        db.getVariablesOfAlgorithm(req.body.algorithm_id).then(result => {
                res.json(result);
            },
            error => {
                console.log("error!", error);
            });
        db.close();
    });

    router.post('/activitiesOfRegion', authenticator.authenticate(), (req, res) => {
        const db = new Database();
        db.getActivitiesOfRegion(req.body.region_id).then(result => {
                res.json(result);
            },
            error => {
                console.log("error!", error);
            });
        db.close();
    });

    router.post('/recommendations', (req, res) => {
        let user_id = "";
        if (typeof req.body.session_key_container !== "undefined") {
            try {
                let session_token_container = jwt.decode(req.body.session_key_container, process.env.SESSION_SECRET);
                if (session_token_container.version === process.env.SESSION_SECRET_VERSION) {
                    user_id = session_token_container.user_id;
                }
            } catch (e) {
                user_id = "";
            }
        }
        const db = new Database();
        let number_of_recommendations;
        db.getSettings()
            .then(settings => {
                number_of_recommendations = db.helper$getSetting(settings, 'number_of_recommendations');
            })
            .then(() => {
                return db.beginTransaction();
            })
            .then(() => {
                return db.checkAndCreateUserId(user_id);
            })
            .then(user_id_from_db => {
                return Recommender.getRegionsFromDB(req.body.activities, req.body.regions)
                    .then(regions => {
                        let algorithm_settings = {regions};
                        return db.getAlgorithms()
                            .then(algorithms => {
                                algorithm_settings.algorithms = algorithms;
                                return algorithm_settings;
                            });
                    })
                    .then(algorithm_settings => {
                        let recommender_promise,
                            recommender;
                        const active_algoritmhs = algorithm_settings.algorithms.filter(algo => algo.is_active );
                        const algorithm = active_algoritmhs[Math.floor(Math.random() * active_algoritmhs.length)];
                        console.log("algorithm.key", algorithm.key);
                        if (algorithm.is_active) {
                            switch (algorithm.key) {
                                case 'cosine_recommender':
                                    recommender = new CosineRecommender(algorithm_settings.regions, req.body.budget, req.body.days, req.body.start, algorithm.id, req.body.origin);
                                    recommender_promise = recommender.fillAirports()
                                        .then(() => {
                                            return recommender.applyRecommender(req.body.activities);
                                        })
                                        .then(() => {
                                            return recommender;
                                        });
                                    break;
                                case 'legacy_recommender':
                                    recommender = new LegacyRecommender(algorithm_settings.regions, req.body.budget, req.body.days, req.body.start, algorithm.id);
                                    recommender.applyRecommender();
                                    recommender_promise = Promise.resolve(recommender);
                            }
                        }
                        recommender_promise
                            .then(recommender => {

                                let recommendations_array = [];
                                for (let i = 0; i < number_of_recommendations && i < recommender.getRegions().length; i++) {
                                    let region = recommender.getRegions()[i];
                                    recommendations_array.push({
                                        region: {
                                            name: region.getName(),
                                            price: region.getTotalCost(),
                                            id: region.getId(),
                                            key: region.getUniqueName()
                                        },
                                        flight: region.getCheapestTrip(),
                                        duration: parseInt(req.body.days),
                                        total: region.getTotalCost() + region.getCheapestTrip().price,
                                        algorithm_id: recommender.getAlgorithmId()
                                    })
                                }

                                return db.logQueryAndResults(req.body, recommendations_array, user_id_from_db)
                                    .then(() => (recommendations_array));
                            })
                            .then(recommendations => {
                                res.json({
                                    result: recommendations,
                                    token: jwt.encode({
                                        version: process.env.SESSION_SECRET_VERSION,
                                        user_id: user_id_from_db
                                    }, process.env.SESSION_SECRET)
                                });

                            })
                            .then(() => {
                                db.commit();
                            });

                    });

            });
    });

    router.post('/genericSingleUpdate', authenticator.authenticate(), (req, res) => {
        const db = new Database();
        switch (req.body.key) {
            case 'activity':
                db.updateActivity(req.body.data.activity_key, req.body.data.label, req.body.data.is_active, req.body.data.id).then(success => {
                    res.json({success: true});
                }, err => {
                    res.json({success: false});
                    console.log('error in genericSingleUpdate', req.body, err);
                });
                break;
            case 'region':
                db.updateRegion(req.body.data).then(success => {
                    res.json({success: true});
                }, err => {
                    console.log('error in genericSingleUpdate', req.body, err);
                });

                break;
            case 'feedback':
                db.createOrUpdateFeedbackQuestions(req.body.data)
                    .then(success => {
                        res.json({success: true});
                    }, err => {
                        console.log('error in genericSingleUpdate', req.body, err);
                    });
                break;
            case 'settings':
                db.createOrUpdateSettings(req.body.data)
                    .then(success => {
                        res.json({success: true});
                    }, err => {
                        console.log('error in genericSingleUpdate', req.body, err);
                    });
                break;
            case 'algorithm':
                db.updateAlgorithmWithForeignKeyTables(req.body.data)
                    .then(success => {
                        res.json({success: true});
                    }, err => {
                        console.log('error in genericSingleUpdate', req.body, err);
                    });
                break;
            default:
                console.log('error in genericSingleUpdate: Invalid activity_key', req.body.key);
                res.json({success: false});
        }
    });


    router.post('/getAirportsOfRegion', authenticator.authenticate(), (req, res) => {
        const db = new Database();
        db.getAirportsOfRegion(req.body.region_id).then(result => {
                res.json(result);
            },
            error => {
                console.log("error!", error);
            });
        db.close();
    });


    router.post('/getTimeOfTravelQualitiesOfRegion', authenticator.authenticate(), (req, res) => {
        const db = new Database();
        db.getTimeOfTravelQualitiesOfRegion(req.body.region_id).then(result => {
                res.json(result[0]);
            },
            error => {
                console.log("error!", error);
            });
        db.close();
    });


    router.post('/genericSingleCreate', authenticator.authenticate(), (req, res) => {
        const db = new Database();
        switch (req.body.key) {
            case 'activity':
                db.insertActivity(req.body.data.activity_key, req.body.data.label, req.body.data.is_active).then(success => {
                    res.json({success: true});
                }, err => {
                    res.json({success: false});
                    console.log('error in genericSingleUpdate', req.body, err);
                });
                break;
            case 'region':
                db.createRegionWithForeignTables(req.body.data).then(success => {
                    res.json({success: true});
                }, err => {
                    console.log('error in genericSingleCreate', req.body, err);
                    res.json({success: false});
                });
                break;
            case 'algorithm':
                db.createAlgorithmWithForeignTables(req.body.data).then(success => {
                    res.json({success: true});
                }, err => {
                    console.log('error in genericSingleCreate', req.body, err);
                    res.json({success: false});
                });
                break;
            default:
                console.log('error in genericSingleCreate: Invalid activity_key', req.body.key);
                res.json({success: false});
        }
    });


    router.post('/genericSingleDelete', authenticator.authenticate(), (req, res) => {
        const db = new Database();
        switch (req.body.key) {
            case 'activity':
                db.deleteActivity(req.body.data.id).then(success => {
                    res.json({success: true});
                }, err => {
                    res.json({success: false});
                    console.log('error in genericSingleDelete', req.body, err);
                });
                break;
            case 'region':
                db.deleteRegionWithForeignTables(req.body.data.id).then(success => {
                    res.json({success: true});
                }, err => {
                    res.json({success: false});
                    console.log('error in genericSingleDelete', req.body, err);
                });
                break;
            case 'algorithm':
                db.deleteAlgorithmWithForeignTables(req.body.data.id).then(success => {
                    res.json({success: true});
                }, err => {
                    res.json({success: false});
                    console.log('error in genericSingleDelete', req.body, err);
                });
                break;
            default:
                console.log('error in genericSingleDelete: Invalid activity_key', req.body.key);
                res.json({success: false});
        }
    });

    router.get('/getFeedbackQuestions', (req, res) => {
        const db = new Database();
        db.getFeedbackQuestions().then(questions => {
                res.json(questions);
            },
            error => {
                console.log("error in getFeedbackQuestions!", error);
            });
        db.close();
    });

    router.post('/submitFeedbackAnswers', (req, res) => {
        const db = new Database();
        db.storeFeebackQuestionAnswers(req.body.data).then(result => {
                res.json({success: true});
                db.close();
            },
            error => {
                console.log("error in getFeedbackQuestions!", error);
            });
    });

    router.get('/getActiveFeedbackQuestions', (req, res) => {
        const db = new Database();
        db.getActiveFeedbackQuestions().then(questions => {
                res.json(questions);
            },
            error => {
                console.log("error in getActiveFeedbackQuestions!", error);
            });
        db.close();
    });


    router.get('/settings', (req, res) => {
        const db = new Database();
        db.getSettings().then(questions => {
                res.json(questions);
            },
            error => {
                console.log("error in get settings!", error);
            });
        db.close();
    });

    router.get('/runScript', (req, res) => {
        res.header({"Content-Type": "text/html"});
        switch (req.query.script) {
            case 'create':
                createRegions().then(string => {
                    res.write(string);
                    res.end();
                });
                break;
            case 'updateParents':
                updateParents().then(string => {
                    res.write(string);
                    res.end();
                });
                break;
            case 'setZoomLevel':
                setZoomLevels().then(string => {
                    res.write(string);
                    res.end();
                });
                break;
        }
    });

    router.post('/login', (req, res) => {
        if (req.body.password === process.env.MANAGER_PASSWORD) {
            res.json({token: jwt.encode({version: process.env.API_SECRET_VERSION}, process.env.API_SECRET)});
        } else {
            res.sendStatus(401);
        }
    });

    router.post('/validateLogin', authenticator.authenticate(), (req, res) => {
        res.json({success: true});
    });

    router.post('/airportAutocomplete', (req, res) => {
        const api = new IataAPI();
        api.getAutocomplete(req.body.query).then(result => {
            res.json({result});
        });
    });


    app.use('/recommenderAPI', router);
}
;



