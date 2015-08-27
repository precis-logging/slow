var Joi = require('joi');
var path = require('path');
var Handler = require('./lib/handler').Handler;
var utils = require('precis-utils');
var defaults = utils.defaults;

var getLatest = function(req, reply){
  return reply(this.handler.records);
};

var getTransaction = function(req, reply){
  var id = req.params.id;
  var matches = this.handler.records.filter((record)=>{
    return record._id.toString() === id;
  });
  return reply(matches.length?matches[0]:null);
};

var routes = function(){
  return [
    {
      method: 'GET',
      path: '/api/v1/slow/transactions',
      config:{
        description: 'Returns the latest slow transactions',
        tags: ['api'],
        handler: getLatest.bind(this)
      },
    },
    {
      method: 'GET',
      path: '/api/v1/slow/transaction/{id}',
      config:{
        description: 'Returns the specific slow transactions',
        tags: ['api'],
        validate: {
          params: {
            id: Joi.string().required(),
          },
        },
        handler: getTransaction.bind(this)
      },
    },
  ];
};

var registerUi = function(){
  return [
    {
      pages: [
        {
          route: '/slow/overview',
          title: 'Slow Transactions',
          name: 'SlowTransactions',
          section: 'Slow Transactions',
          filename: path.resolve(__dirname, 'ui/slow.jsx'),
        },
        {
          route: '/slow/inspect/:id',
          name: 'InspectSlowTransaction',
          filename: path.resolve(__dirname, 'ui/inspect.jsx'),
        },
      ]
    },
    {
      components: [
        {
          name: 'SlowTransactionsDashboard',
          filename: path.resolve(__dirname, 'ui/dashboard.jsx'),
        },
        {
          name: 'SlowTransactionsComponents',
          filename: path.resolve(__dirname, 'ui/components.jsx'),
        },
      ],
    },
    {
      stores: [
        {
          name: 'SlowTransactions',
          socketEvent: {
            event: 'slow::update',
            prefetch: '/api/v1/slow/transactions',
          }
        }
      ]
    },
  ];
};

var Plugin = function(options){
  var logger = options.logger;
  var config = this.config = defaults({display: {}}, options);
  var server = options.server;
  var ui = options.ui;
  var sockets = this.sockets = options.sockets;

  this.handler = new Handler(defaults({
    logger: logger,
    sockets: sockets,
    event: 'slow::update',
  }, config));

  server.route(routes.call(this));
  ui.register(registerUi.call(this));
};

Plugin.prototype.push = function(record){
  if(!this.handler){
    return setImmediate(function(){
      this.push(record);
    }.bind(this));
  }
  this.handler.push(record);
};

module.exports = Plugin;
