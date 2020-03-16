# About

App using [sreality](https://www.sreality.cz/) server to search for new estates every time it's launched.

# Features

It was used to keep track of only those estates which I was interested in.

Also every estate is shown only once, so you are not seeing the same estates every day.
But if e.g. price was changed, estate is shown again.

# Installation
You need [nodejs](https://nodejs.org/en/) to run this.

From command prompt run:
```
npm install
```

# Configuration

First of all you need to find the correct URL which provides wanted data from the server.
I have used Chrome's DevTools (F12) to do it:

1. open DevTools
1. open the [sreality](https://www.sreality.cz/) web page and search for the estates you want to save,
with all the filters you desire
1. in DevTools filter out XHR requests and search for last `estates` call:
    ![devtools](_res/devtools.jpg)
1. copy link of this call (right click mouse) and use it in next step
1. edit `config.js` and paste the link from previous step in `pageUrls` array, e.g.
    ```json
    pageUrls: [
        "https://www.sreality.cz/api/cs/v2/estates?category_main_cb=2&category_sub_cb=37&category_type_cb=1&locality_region_id=14&per_page=20&tms=1584342289053"
    ]
    ```
1. recommendation: remove `tms` parameter and change `per_page` to 80:
    ```json
    pageUrls: [
        "https://www.sreality.cz/api/cs/v2/estates?category_main_cb=2&category_sub_cb=37&category_type_cb=1&locality_region_id=14&per_page=80"
    ]
    ```

You can repeat this as many times you want, just separate pasted links in the `pageUrls` array by comma.

# Usage

From command prompt run:
```
node bin/www
```

In browser, open [localhost:8139/estates](http://localhost:8139/estates).
This ppage is used for searching new estates on server.

There is also simple report page, you can find it here: [localhost:8139/reports](http://localhost:8139/reports).

# Notes

If you would like to change link for the IDOS search, you can do it in `util.js`.