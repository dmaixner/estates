var config = require('./config');

module.exports = {
    formatEstate: function (estate) {
        var result = "";

        var localityArray = estate.locality.match(/(([^,]*), ?)?([^,]*)(, okres.*)?/);
        var city = localityArray.reverse().find(function (element) {
            if (element && !element.startsWith("okres ")) {
                return element;
            }
        });

        var nextMonday = new Date();
        nextMonday.setDate(nextMonday.getDate() - nextMonday.getDay() + 8);

        result += "City: " + city + " (" + estate.locality + ") [<a href='http://jizdnirady.idnes.cz/vlakyautobusymhd/spojeni/?time=7:00&date=" + nextMonday.getDate() + "." + (nextMonday.getMonth() + 1) + "." + nextMonday.getFullYear() + "&t=Kridlovicka&f=" + city + "'>IDOS</a>] [<a href='https://mapy.cz/zakladni?q=" + city + "'>MAP</a>]<br>";
        if (estate.date) {
            result += "Date: " + new Date(estate.date) + "<br>";
        }
        result += "Name: <a href='" + estate.link + "'>" + estate.name + "</a><br>";
        result += "Price: " + estate.price + "<br>";
        if (estate.hash) {
            result += "Hash: " + estate.hash + "<br>";
        }
        var counter = 0;
        result += estate.images.reduce(function (images, img) {
            counter++;
            if (counter <= config.maxImages) {
                return images += "<img width='400px' height='300px' display='inline' src='" + img + "' />";
            }
            else {
                return images;
            }
        }, "");
        result += "<br>";
        result += "<hr>";
        return result;
    }
}