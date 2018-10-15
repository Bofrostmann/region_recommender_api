const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const Connection = require('./../database/Connection');
const Recommender = require('./../recommender/Recommender');
const LegacyRecommender = require('./../recommender/LegacyRecommender');
const SimpleRecommender = require('../recommender/CosineRecommender');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.send("this is the recommender API");
});

router.get('/features', (req, res, next) => {
    const db = new Connection();
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


router.post('/recommendations', (req, res, next) => {
    const db = new Connection();
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

module.exports = router;
