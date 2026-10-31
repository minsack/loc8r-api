const { response } = require('express');
const request = require('request');

const apiOptions = {
    server: 'http://localhost:3000'
};

if (process.env.NODE_ENV === 'production') {
    apiOptions.server = process.env.RENDER_EXTERNAL_URL;
}

const formatDistance = (distance) => {
    let thisDistance = 0;
    let unit = 'm';

    if (distance > 1000) {
        thisDistance = parseFloat(distance / 1000).toFixed(1);
        unit = 'km';
    } else {
        thisDistance = Math.floor(distance);
    }

    return thisDistance + unit;
};

/* GET 'home' page */
const renderHomepage = (req, res, responseBody) => {
    let message = null;

    if (!(responseBody instanceof Array)) {
        message = 'API lookup error';
        responseBody = [];
    } else {
        if (!responseBody.length) {
            message = 'No places found nearby';
        }
    }

    res.render('locations-list', {
        title: 'Home by',
        pageHeader: {
            title: 'Loc8r',
            strapline: 'Find places to work with wifi near you!'
        },
        sidebar: "Looking for wifi and a seat? Loc8r helps you find places to work when out and about. Perhaps with coffee, cake or a pint? Let Loc8r help you find the place you're looking for.",
        locations: responseBody,
        message: message
    });
};

const homelist = (req, res) => {
    const path = '/api/locations';
    const requestOptions = {
        url: `${apiOptions.server}${path}`,
        method: 'GET',
        json: {},
        qs: {
            lng: 127.263767089376,
            lat: 37.010187333414,
            maxDistance: 20
        }
    };

    request(requestOptions, (err, response, body) => {
        let data = [];

        if (!err && response.statusCode === 200 && body.length) {
            data = body.map((item) => {
                item.distance = formatDistance(item.distance);
                return item;
            });
        }

        renderHomepage(req, res, data);
    });
};

/* GET 'location info' page */
const renderDetailPage = (req, res, locDetail) => {
    res.render('location-info', {
        title: locDetail.name,
        pageHeader: {
            title: locDetail.name
        },
        sidebar: {
            context: 'is on Loc8r because it has accessible wifi and space to sit down with your laptop and get some work done.',
            callToAction: 'If you\'ve been and you like it - or if you don\'t - please leave a review to help other people just like you.'
        },
        location: locDetail
    });
};

const getLocationInfo = (req, res, callback) => {
    const path = `/api/locations/${req.params.locationid}`;
    const requestOptions = {
        url: `${apiOptions.server}${path}`,
        method: 'GET',
        json: {}
    };

    request(requestOptions, (err, response, body) => {
        if (err || !response) {
            return showError(req, res, 500);
        }

        const statusCode = response.statusCode;

        if (statusCode === 200 && body) {
            body.coords = {
                lng: body.coords.coordinates[0],
                lat: body.coords.coordinates[1]
            };

            callback(req, res, body);
        } else {
            showError(req, res, statusCode);
        }
    });
};

    const locationInfo = (req, res) => {
        getLocationInfo(req, res,
            (req, res, responseData) => renderDetailPage(req, res, responseData)
        );
    };

    /* GET 'Add review' page */
    const renderReviewForm = (req, res, { name }) => {
        res.render('location-review-form', {
            title: `Review ${name} on Loc8r`,
            pageHeader: {
                title: `Review ${name}`
            },
            error: req.query.err
        });
    };

    const addReview = (req, res) => {
        getLocationInfo(req, res,
            (req, res, responseData) =>
                renderReviewForm(req, res, responseData)
        );
    };

    const doAddReview = (req, res) => {
        const locationid = req.params.locationid;
        const path = `/api/locations/${locationid}/reviews`;

        const postdata = {
            author: req.body.name,
            rating: parseInt(req.body.rating, 10),
            reviewText: req.body.review
        };

        const requestOptions = {
            url: `${apiOptions.server}${path}`,
            method: 'POST',
            json: postdata
        };

        request(requestOptions, (err, response, body) => {
            const statusCode = response ? response.statusCode : 500;

            if (!err && statusCode === 201) {
                res.redirect(`/location/${locationid}`);
            } else if (
                statusCode === 400 &&
                body &&
                body.name === 'ValidationError'
            ) {
                res.redirect(
                    `/location/${locationid}/review/new?err=val`
                );
            } else {
                showError(req, res, statusCode);
            }
        });
    };

    const showError = (req, res, status) => {
        let title = '';
        let content = '';

        if (status === 404) {
            title = '404, page not found';
            content = 'Oh dear. Looks like you can\'t find this page. Sorry.';
        } else {
            title = `${status}, something's gone wrong`;
            content = 'Something, somewhere, has gone just a little bit wrong.';
        }

        res.status(status);
        res.render('generic-text', {
            title,
            content
        });
    };

    module.exports = {
        homelist,
        locationInfo,
        addReview,
        doAddReview
    };