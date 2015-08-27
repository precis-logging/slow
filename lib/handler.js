const DEFAULT_THRESHOLD = 1000;
const DEFAULT_RETAIN_COUNT = 100;
var noop = function(){};

var Handler = function(options){
  this.threshold = options.threshold || DEFAULT_THRESHOLD;
  this.retain = options.retainCount || DEFAULT_RETAIN_COUNT;
  this.event = options.event;
  this.statsEvent = options.statsEvent;
  this.sockets = options.sockets;
  this.logger = options.logger;
  this.store = options.store;
  this.records = [];
  this.buckets = [];
};

Handler.prototype.getBucket = function(time){
  var i = this.buckets.length-1;
  var bkt = new Date(Date.parse(time));
  bkt.setMilliseconds(0);
  bkt.setSeconds(0);
  var key = bkt.getTime();
  while(i>-1){
    if(this.buckets[i].key===key){
      return this.buckets[i];
    }
    i--;
  }
  var bucket = {
    key: key,
    time: bkt,
    stats: {
      count: 0,
      slow: 0
    }
  };
  this.buckets.push(bucket);
  return bucket;
};

Handler.prototype.checkTrimBuckets = function(){
  var eol = new Date();
  var eol = eol.getTime()-(1000*60*15);
  while(this.buckets && (this.buckets[0].time.getTime()<eol)){
    this.buckets.shift();
  }
};

Handler.prototype.enqueueStatsUpdate = function(bucket){
  var tmr = bucket.enqueueTimer;
  if(!tmr){
    //clearTimeout(tmr);
    bucket.enqueueTimer = setTimeout(function(){
      bucket.enqueueTimer = false;
      this.sockets.emit(this.statsEvent, {
        _id: bucket.key,
        key: bucket.key,
        time: bucket.time,
        stats: {
          count: bucket.stats.count,
          slow: bucket.stats.slow
        }
      });
    }.bind(this), 1000);
  }
};

Handler.prototype.push = function(data){
  if(!data.duration){
    return;
  }
  var bucket = this.getBucket(data.time);//.items.push(data);
  bucket.stats.count++;
  if(data.duration < this.threshold){
    return this.enqueueStatsUpdate(bucket);
  }
  bucket.stats.slow++;
  this.records.push(data);
  this.sockets.emit(this.event, data);
  this.store.insert(data, noop);
  if(this.records.length>this.retain){
    this.records = this.records.slice(this.records.length-this.retain);
  }
  this.checkTrimBuckets();
  this.enqueueStatsUpdate(bucket);
};

module.exports = {Handler};
