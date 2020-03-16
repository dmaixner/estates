var fs = require('fs');

var express = require('express');
var util = require('../util');

var router = express.Router();

/* GET reports. */
router.get('/', function (req, res) {
    new Promise(function (resolveDir, rejectDir) {
        fs.readdir("./data/", function (error, subDirs) {
            if (error) {
                return rejectDir(error);
            }

            var files = subDirs.map(function (subDir) {
                return subDir + "/data.json";
            });

            var counter = 0;
            Promise.all(files.map(function (file) {
                return new Promise(function (resolve, reject) {
                    counter++;
                    fs.readFile("./data/" + file, function (error, fileContent) {
                        if (error) {
                            return reject(error);
                        }
                        return resolve(JSON.parse(fileContent));
                    });
                })
            })).then(function (fileContents) {
                console.log("Read " + counter + " files.");
                return resolveDir(fileContents);
            }).catch(function (error) {
                return rejectDir(error);
            });
        })
    }).then(function (jsonData) {
        var fromDate = new Date();
        if (req.query.days && isFinite(req.query.days)) {
            fromDate.setDate(fromDate.getDate() - req.query.days);
        }
        jsonData = jsonData.filter(function (json) {
            return new Date(json.date).setHours(0, 0, 0, 0) >= fromDate.setHours(0, 0, 0, 0);
        }).sort(function (a, b) {
            return b.date - a.date;
        });
        if (req.query.limit && isFinite(req.query.limit)) {
            jsonData = jsonData.slice(0, req.query.limit);
        }
        console.log("Found " + jsonData.length + " estates.");

        var responsePage = "";
        jsonData.forEach(function (estate) {
            responsePage += util.formatEstate(estate);
        });
        res.send(responsePage);
    }).catch(function (error) {
        console.error("!!! " + error);
    });
});

module.exports = router;
