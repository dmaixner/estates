var fs = require('fs');
var path = require("path");
var urlLib = require("url");
var crypto = require('crypto');

var express = require('express');
var axios = require('axios');
var config = require('../config');
var util = require('../util');

var router = express.Router();

var getFileFromUrl = function (hash, url) {
    return "./data/" + hash + "/" + path.basename(urlLib.parse(url).pathname);
}

var makeLink = function (estate) {
    return "https://www.sreality.cz/detail/prodej/dum/rodinny/" + estate.seo.locality + estate._links.self.href.substring(estate._links.self.href.lastIndexOf("/"))
}

var downloadImages = function (hash, imageArray) {
    console.log("... getting images: " + hash)

    return axios.all(imageArray.map(function (image) {
        return axios({
            method: "get",
            url: image,
            timeout: 60000,
            responseType: "stream"
        });
    })).then(function (resultsArr) {
        console.log("...... images download started: " + hash);
        for (var i = 0; i < resultsArr.length; i++) {
            var imageFile = getFileFromUrl(hash, resultsArr[i].config.url);
            resultsArr[i].data.pipe(fs.createWriteStream(imageFile));
        }
        console.log("...... images download finished: " + hash);
        return imageFile;
    }).catch(function (error) {
        console.error("!!! ERROR while downloading images (" + hash + ") > " + error);
    });
}

var downloadEstate = function (estate) {
    // get estate detail
    return function () { // promise factory
        console.log("getting estate " + estate.hash + ": " + estate.name + " / " + estate.locality + " (" + estate.price_czk.value_raw + ")");
        return axios.get("https://www.sreality.cz/api" + estate._links.self.href)
            .then(function (response) {
                console.log("... estate download started: " + estate.hash);
                var estateDetail = response.data;

                // for special hidden price
                if (!estateDetail.price_czk.value_raw) {
                    console.log("... found estate with price 1: " + estate.name + " => " + estate.hash);
                    estateDetail.price_czk.value_raw = estate.price_czk.value_raw;
                }

                if (estate.name !== estateDetail.name.value) {
                    console.log("!!! name different, was: " + estate.name + " and now is: " + estateDetail.name.value + " => " + estate.hash);
                }
                if (estate.locality !== estateDetail.locality.value) {
                    console.log("!!! locality different, was: " + estate.locality + " and now is: " + estateDetail.locality.value + " => " + estate.hash);
                }
                if (estate.price_czk.value_raw !== estateDetail.price_czk.value_raw) {
                    console.log("!!! price different, was: " + estate.price_czk.value_raw + " and now is: " + estateDetail.price_czk.value_raw + " => " + estate.hash);
                }

                var dataJson = {};
                dataJson.locality = estateDetail.locality.value;
                dataJson.name = estateDetail.name.value;
                dataJson.price = estateDetail.price_czk.value_raw;

                dataJson.previews = estate._links.images.map(function (image) {
                    return getFileFromUrl(estate.hash, image.href);
                });

                dataJson.images = estateDetail._embedded.images.map(function (image) {
                    return getFileFromUrl(estate.hash, image._links.self.href);
                });

                dataJson.description = estateDetail.meta_description;
                if (estateDetail._embedded.seller) {
                    dataJson.seller = estateDetail._embedded.seller._embedded.premise.name;
                    dataJson.seller_user = estateDetail._embedded.seller.user_name;
                } else {
                    dataJson.seller = estateDetail.contact.name;
                    dataJson.seller_user = estateDetail.contact.email;
                }
                dataJson.text = estateDetail.text.value;
                dataJson.link = makeLink(estateDetail);
                dataJson.date = Date.now();

                fs.writeFile("./data/" + estate.hash + "/data.json", JSON.stringify(dataJson), function (error) {
                    if (error) {
                        console.error("!!! " + error);
                    }
                    console.log("...... estate details saved: " + estate.hash);
                });
                console.log("... estate download finished: " + estate.hash);
                return estateDetail;
            }).catch(function (error) {
                console.error("!!! ERROR while downloading estate (" + estate.hash + ") > " + error);
            }).then(function (estateDetail) {
                // download all images
                return downloadImages(estate.hash, estateDetail._embedded.images.map(function (image) {
                    return image._links.self.href;
                }));
            }).catch(function (error) {
                console.error("!!! ERROR while downloading images (" + estate.hash + ") > " + error);
            });
    }
}

/* GET estates. */
router.get('/', function (req, res) {
    var counter = 0;

    axios.all(config.pageUrls.map(function (pageUrl) {
        return axios.get(pageUrl);
    })).then(function (resultsArr) {
        var responsePage = "";
        var estatesToDownload = [];
        for (var i = 0; i < resultsArr.length; i++) {
            var json = resultsArr[i].data;
            responsePage += "Number of estates: " + json._embedded.estates.length + "/" + json.result_size + "<br>";
            responsePage += "URL: " + resultsArr[i].config.url + "<hr>";
            estatesToDownload = estatesToDownload.concat(json._embedded.estates.map(function (estate) {
                estate.hash = crypto.createHash('sha256').update(estate.locality + estate.name + estate.price_czk.value_raw).digest("hex");

                try {
                    fs.statSync("./data/" + estate.hash);
                    // console.log("### found estate: " + estate.hash + ": " + estate.name + " / " + estate.locality + " (" + estate.price_czk.value_raw + ")");
                    return false; // we want to filter this out
                } catch (error) {
                    // directory not found, we haven't downloaded estate yet
                    var responseData = {};
                    responseData.hash = estate.hash;
                    responseData.locality = estate.locality;
                    responseData.link = makeLink(estate);
                    responseData.name = estate.name;
                    responseData.price = estate.price_czk.value_raw;
                    responseData.images = estate._links.images.map(function (img) {
                        return img.href;
                    });
                    responsePage += util.formatEstate(responseData);

                    fs.mkdirSync("./data/" + estate.hash);
                    return estate;
                }
            }).filter(function (estate) {
                return estate;
            }));
        }
        res.send(responsePage);
        console.log("Analysis finished. Downloading " + estatesToDownload.length + " estates.");
        return estatesToDownload;
    }).catch(function (error) {
        console.error("!!! " + error);
    }).then(function (estatesToDownload) {
        return estatesToDownload.reduce(function (res, estate) {
            counter++;
            return res.then(downloadEstate(estate));
        }, Promise.resolve());
    }).catch(function (error) {
        console.error("!!! " + error);
    }).then(function () {
        console.log("Download has finished, " + counter + " estates downloaded.");
        return true;
    }).catch(function (error) {
        console.error("!!! " + error);
    });
});

module.exports = router;
