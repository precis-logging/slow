const DEFAULT_THRESHOLD = 1000;
const DEFAULT_RETAIN_COUNT = 100;

var Handler = function(options){
  this.threshold = options.threshold || DEFAULT_THRESHOLD;
  this.retain = options.retainCount || DEFAULT_RETAIN_COUNT;
  this.event = options.event;
  this.sockets = options.sockets;
  this.logger = options.logger;
  this.records = [];
};

Handler.prototype.push = function(data){
  if((!data.duration) || (data.duration < this.threshold)){
    return;
  }
  this.records.push(data);
  this.sockets.emit(this.event, data);
  if(this.records.length>this.retain){
    this.records = this.records.slice(this.records.length-this.retain);
  }
};

module.exports = {Handler};
