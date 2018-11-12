const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const Database = require('../data/DataBase');
const Recommender = require('./../recommender/Recommender');
const SimpleRecommender = require('../recommender/CosineRecommender');
const Airports = require('../data/Airports');
const jwt = require('jwt-simple');

const createRegions = require('../scripts/CreateRegions');
const updateParents = require('../scripts/UpdateParents');

module.exports = function (app, authenticator) {
    /* GET home page. */

    router.get('/', function (req, res, next) {
        res.send("this is the recommender API");
    });

    router.get('/features', (req, res, next) => {
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

    router.get('/allFeatureData', authenticator.authenticate(), (req, res, next) => {
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


    router.get('/regions', authenticator.authenticate(), (req, res, next) => {
        const db = new Database();
        db.getRegions().then(result => {
                const feature_object = {};
                Object.values(result).forEach(region => {
                    feature_object[region.unique_name] = region;
                });
                res.json(feature_object);
            },
            error => {
                console.log("error!", error);
            });
        db.close();
    });

    router.post('/featuresOfRegion', authenticator.authenticate(), (req, res, next) => {
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


    router.post('/recommendations', (req, res, next) => {
        Recommender.getRegionsFromDB(req.body.features, req.body.regions).then(result => {
            const recommender = new SimpleRecommender(result, req.body.budget, req.body.days, req.body.start);
            recommender.applyRecommender(req.body.features);
            const return_array = recommender.getRegions().map(region => {
                return {
                    region: {name: region.getName(), price: region.getTotalCost()},
                    flight: {url: "bla blub", price: 100, name: "Lufthansa"},
                    duration: req.body.days,
                    total: region.getTotalCost() + 100
                }
            });
            res.json(return_array);
        });
    });
    router.post('/genericSingleUpdate', authenticator.authenticate(), (req, res, next) => {
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
            default:
                console.log('error in genericSingleUpdate: Invalid feature_key', req.body.key);
                res.json({success: false});
        }
    });

    router.post('/getAirportsOfRegion', authenticator.authenticate(), (req, res, next) => {
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


    router.post('/genericSingleCreate', authenticator.authenticate(), (req, res, next) => {
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


    router.post('/genericSingleDelete', authenticator.authenticate(), (req, res, next) => {
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

    router.get('/runScript', (req, res, next) => {
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
        }
    });

    router.post('/login', (req, res, next) => {
        if (req.body.password === process.env.MANAGER_PASSWORD) {
            res.json({token: jwt.encode({version: process.env.API_SECRET_VERSION}, process.env.API_SECRET)});
        } else {
            res.sendStatus(401);
        }
    });

    router.post('/validateLogin', authenticator.authenticate(), (req, res, next) => {
        console.log("hier");
        res.json({success: true});
    });

    app.use('/recommenderAPI', router);
};



