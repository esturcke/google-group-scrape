#!/usr/bin/env casperjs

var fs     = require('fs');
var utils  = require('utils');
var casper = require('casper').create({
    verbose      : true,
    logLevel     : 'warning',
    pageSettings : {
        loadImages  : false,
        loadPlugins : false,
        userAgent   : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/600.6.3 (KHTML, like Gecko) Version/7.1.6 Safari/537.85.15',
        webSecurityEnabled : false,
        ignoreSslErrors    : true,
    },
});

var lastTitle;
casper.waitTopic = function(then) {
    return this
        .waitFor(function() {
            var title = this.getTitle();
            if (title.match(/- Google Groups$/) && lastTitle != title) {
                lastTitle = title;
                return true;
            }
            else {
                if (title.match(/elixir-lang-talk/)) {
                    this.page.sendEvent("keypress", "j");
                    this.wait(500);
                    this.page.sendEvent("keypress", "o");
                    this.wait(500);
                }
                return false;
            }
        })
        .wait(100, then);
}

casper.nextTopic = function(then) {
    return this
        .then(function() { this.page.sendEvent("keypress", "j") })
        .waitTopic(then);
}

casper.firstTopic = function(then) {
    return this
        .then(function() {
            this.page.sendEvent("keypress", "o");
        })
        .waitTopic(then);
}

var topics = [];
casper.processTopic = function() {
    topics.push({
        title : this.fetchText('#t-t'),
        url   : this.getCurrentUrl(),
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
                        body  : node.querySelector('.MV0LWFC-fd-a').innerText,
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
    });
    this.echo(this.fetchText('#t-t'));
    return this;
}

casper.dumpTopics = function() {
    return this.then(function() { fs.write(casper.cli.args[1] + "-" + casper.cli.args[0] + ".json", JSON.stringify(topics, null, 2), 'w') });
}

casper.fetchTopics = function(n) {
    this.firstTopic(function() { this.processTopic() });
    for (i = 1; i < n; i++)
        this.nextTopic(function() { this.processTopic() });
    return this.dumpTopics();
}


casper
    .start('https://groups.google.com/forum/#!forum/' + casper.cli.args[0])
    .run(function() { this.echo("Scraping " + this.cli.args[0]) })
    .fetchTopics(casper.cli.args[1])
    .then(function() { this.exit() });
