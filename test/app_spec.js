var http = require("http");
var express = require("../");
var request = require("supertest");
var expect = require("chai").expect;

describe("app", function(){
  var app = express();
  
  describe("create http server", function(){
    it("responds to /foo with 404", function(done){
      var server = http.createServer(app);
      request(server).get("/foo").expect(404).end(done);
    });
  });
  
  describe("#listen", function(){
    var port = 7000;
    var server;
    
    before(function(done){ server = app.listen(port, done);});

    it("should return an http server", function(done){
      expect(server).to.be.instanceof(http.Server);
    });
    
    it("responds to /foo with 404", function(done){
      request("http://localhost:" + port).get("/foo").expect(404).end(done);
    });
    
  });
});

describe("app.use", function(){
  var app
    , m1 = function(){}
    , m2 = function(){};

  before(function(){
    app = express();
  });

  it("should be able to add middlewares to queue", function(){
    app.use(m1);
    app.use(m2);
    expect(app.queue.length).to.eql(2);
  });
});

describe("calling middleware queue", function(){
  var app;
  
  beforeEach(function(){
    app = express();
  });
  
  it("should be able to be able to call a single middleware", function(done){
    var m1 = function(req, res, next) {
      res.end("hello from m1");
    }
    app.use(m1);
    request(app).get("/test").expect("hello from m1").end(done);
  });

  it("should be able to call next to go to the next middleware", function(done){
    var calls = [];
    var m1 = function(req, res, next) {
      calls.push("m1");
      next();
    }
    var m2 = function(req, res, next) {
      calls.push("m2");
      next();
    }
    app.use(m1).use(m2);
    request(app).get("/test").end(function(err){
      expect(calls).to.deep.equal(["m1", "m2"]);
      done(err);
    });
  });  
});

describe("error handling", function(){
  var app;
  beforeEach(function(){
    app = express();
  });
  it("should return 500 for unhandled error", function(done){
    var m1 = function(req, res, next) {
      next(new Error("boom!"));
    }
    app.use(m1);
    request(app).get("/").expect(500).end(done);
  });
  it("should return 500 for uncaught error", function(done){
    var m1 = function(req, res, next) {
      throw new Error("boom!");
    }
    app.use(m1);
    request(app).get("/").expect(500).end(done);
  });
  it("should skip error handlers if next is called without an error", function(done){
    var m1 = function(req, res, next) {
      next();
    }
    var e1 = function(err, req, res, next) {
    }
    var m2 = function(req, res, next) {
      res.end("m2");
    }
    app.use(m1).use(e1).use(m2);
    request(app).get("/").expect("m2").end(done);
  });
  it("should skip normal middlewares if next is called with an error", function(done){
    var m1 = function(req, res, next) {
      next(new Error("boom!"));
    }
    var m2 = function(req, res, next) {
    }
    var e1 = function(err, req, res, next) {
      res.end("e1");
    }
    app.use(m1).use(m2).use(e1);
    request(app).get("/").expect("e1").end(done);
  });
});

describe("app embed", function(){
  var app, subApp;
  beforeEach(function(){
    app = new express();
    subApp = new express();
  });
  it("should pass unhandled request to parent", function(done){
    app.use(subApp);
    app.use(function(req, res){ res.end("m2"); });
    request(app).get("/").expect("m2").end(done);
  });
  it("should pass unhandled error to parent", function(done){
    subApp.use(function(req, res, next){ next("m1 error")});
    app.use(subApp);
    app.use(function(err, req, res, next){res.end(err)});
    request(app).get("/").expect("m1 error").end(done);
  });
});
