#!/usr/bin/env casperjs

var fs     = require('fs');
var utils  = require('utils');
var casper = require('casper').create({
    verbose      : true,
    logLevel     : 'error',
    waitTimeout  : 15000,
    pageSettings : {
        loadImages  : false,
        loadPlugins : false,
        userAgent   : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/600.6.3 (KHTML, like Gecko) Version/7.1.6 Safari/537.85.15',
        webSecurityEnabled : false,
        ignoreSslErrors    : true,
    },
});

// Get command line args
var group = casper.cli.args[0];
var count = casper.cli.args[1];

casper.thenPress = function(key) {
    return this.then(function() {
        this.page.sendEvent("keypress", key);
    });
};

var lastTitle;
casper.waitTopic = function(then) {
    return this
        .wait(100)
        .waitFor(function() {
            var title = this.fetchText("#t-t");
            if (title && title != lastTitle) {
                lastTitle = title;
                return true;
            }
            else if (title) {
                this.page.sendEvent("keypress", "j");
                return false;
            }
            else if (this.exists('.MV0LWFC-fb-f')) {
                this.page.sendEvent("keypress", "j");
                this.page.sendEvent("keypress", "o");
                return false;
            }
            else {
                return false;
            }
        })
        .wait(100);
}

casper.nextTopic = function(then) {
    return this
        .thenPress("j")
        .waitTopic()
        .then(then);
}

casper.firstTopic = function(then) {
    return this
        .thenPress("o")
        .waitTopic()
        .then(then);
}

var topics = {};
casper.processTopic = function() {
    var url   = this.getCurrentUrl();
    var id    = url.match(/[^\/]+$/)[0];
    var title = this.fetchText('#t-t');
    topics[id] = {
        id    : id,
        url   : url,
        title : title,
        posts : this.evaluate(function() {
            return __utils__
                .findAll("#tm-tl > div")
                .filter(function(post) {
                    return !post.innerText.match(/This message has been deleted/);
                })
                .map(function(node, i) {
                    var post  = {
                        i     : i,
                        user  : node.querySelector('._username').innerText,
                        date  : node.querySelector('.MV0LWFC-nb-Q.MV0LWFC-b-Cb').title,
                        body  : node.querySelector('.MV0LWFC-nb-P').innerText,
                    };
                    var links = node.querySelectorAll('.MV0LWFC-fd-a a');
                    if (links) {
                        post.links = Array.prototype.map.call(links, function(link) {
                            return { href : link.href, label : link.innerText };
                        });
                    }
                    return post;
                });
        }),
    };
    this.then(function() { this.echo(title) });
    return this;
}

casper.dumpTopics = function() {
    return this.then(function() { fs.write(count + "-" + group + ".json", JSON.stringify(topics, null, 2), 'w') });
}

casper.fetchTopics = function(n) {
    this.firstTopic(function() { this.processTopic() });
    for (i = 1; i < n; i++)
        this.nextTopic(function() { this.processTopic() });
    return this;
}


casper
    .start('https://groups.google.com/forum/#!forum/' + group)
    .run(function() { this.echo("Scraping " + group ) })
    .fetchTopics(count)
    .dumpTopics()
    .then(function() { this.exit() });
