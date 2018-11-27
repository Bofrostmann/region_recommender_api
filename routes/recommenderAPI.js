const express = require('express');
const router = express.Router();
const Database = require('../data/DataBase');
const Recommender = require('./../recommender/Recommender');
const CosineRecommender = require('../recommender/CosineRecommender');
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

    router.get('/features', (req, res) => {
        const db = new Database();
        db.getFeatures().then(result => {
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

    router.get('/allFeatureData', authenticator.authenticate(), (req, res) => {
        const db = new Database();
        db.getFeatures().then(result => {
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

    router.post('/featuresOfRegion', authenticator.authenticate(), (req, res) => {
        const db = new Database();
        console.log(req.body);
        db.getFeaturesOfRegion(req.body.region_id).then(result => {
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
            let session_token_container = jwt.decode(req.body.session_key_container, process.env.SESSION_SECRET);
            if (session_token_container.version === process.env.SESSION_SECRET_VERSION) {
                user_id = session_token_container.user_id;
            }
        }
        const db = new Database();
        db.beginTransaction()
            .then(() => {
                return db.checkAndCreateUserId(user_id);
            })
            .then(user_id_from_db => {
                return Recommender.getRegionsFromDB(req.body.features, req.body.regions)
                    .then(result => {
                        const recommender = new CosineRecommender(result, req.body.budget, req.body.days, req.body.start, req.body.origin);
                        recommender.fillAirports()
                            .then(() => {
                                return recommender.applyRecommender(req.body.features);
                            })
                            .then(() => {
                                const recommended_regions = recommender.getRegions();
                                const recommendations_array = recommended_regions.map(region => {
                                    let cheapest_trip = region.getCheapestTrip(),
                                        price = 0;
                                    if (typeof cheapest_trip !== "undefined" && cheapest_trip !== {}) {
                                        price = cheapest_trip.price;
                                    }
                                    return {
                                        region: {
                                            name: region.getName(),
                                            price: region.getTotalCost(),
                                            id: region.getId()
                                        },
                                        flight: cheapest_trip,
                                        duration: parseInt(req.body.days),
                                        total: region.getTotalCost() + price
                                    }
                                });
                                return db.logQueryAndResults(req.body, recommendations_array, user_id_from_db).then( () => (recommendations_array));
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
            case 'feature':
                db.updateFeature(req.body.data.feature_key, req.body.data.label, req.body.data.id).then(success => {
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
            default:
                console.log('error in genericSingleUpdate: Invalid feature_key', req.body.key);
                res.json({success: false});
        }
    });

    router.post('/getAirportsOfRegion', authenticator.authenticate(), (req, res) => {
        const db = new Database();
        db.getAirportsOfRegion(req.body.region_id).then(result => {
                console.log('result', result);
                res.json(result);
            },
            error => {
                console.log("error!", error);
            });
        db.close();
    });


    router.post('/genericSingleCreate', authenticator.authenticate(), (req, res) => {
        const db = new Database();
        switch (req.body.key) {
            case 'feature':
                db.insertFeature(req.body.data.feature_key, req.body.data.label).then(success => {
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
            default:
                console.log('error in genericSingleCreate: Invalid feature_key', req.body.key);
                res.json({success: false});
        }
    });


    router.post('/genericSingleDelete', authenticator.authenticate(), (req, res) => {
        const db = new Database();
        switch (req.body.key) {
            case 'feature':
                db.deleteFeature(req.body.data.id).then(success => {
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
            default:
                console.log('error in genericSingleDelete: Invalid feature_key', req.body.key);
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
        console.log("hier");
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



