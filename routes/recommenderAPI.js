const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const Connection = require('./../database/Connection');

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
    db.getRecommendedRegions(req.body.features, req.body.regions).then(result => {
        const return_array = result.map(region => {
            region.price = 550;
            return {
                region: region,
                flight: {url: "bla blub", price: 100, name: "Lufthansa"},
                duration: 20,
                total: 650
            }
        });
        res.json(return_array);
    });
});

module.exports = router;
