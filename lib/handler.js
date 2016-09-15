const DEFAULT_THRESHOLD = 1000;
const DEFAULT_RETAIN_COUNT = 100;
const TIME_TO_BUCKET = 1000 * 60 * 15;
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
  bkt.setSeconds(Math.floor(bkt.getSeconds()/15)*15);
  var tim = bkt.getTime();
  var key = 'slow_'+tim;
  this.checkTrimBuckets(tim);
  while(i>-1){
    if(this.buckets[i] && (this.buckets[i].key===key)){
      return this.buckets[i];
    }
    i--;
  }
  var bucket = {
    key: key,
    time: bkt,
    stamp: tim,
    stats: {
      count: 0,
      slow: 0,
      slowest: 0,
    }
  };
  this.buckets.push(bucket);
  return bucket;
};

Handler.prototype.checkTrimBuckets = function(time){
  var eol = (time || ((new Date()).getTime()))-(TIME_TO_BUCKET);
  this.buckets = this.buckets.filter((bucket)=>bucket && (bucket.stamp >= eol));
};

Handler.prototype.enqueueStatsUpdate = function(bucket){
  var tmr = bucket.enqueueTimer;
  if(!tmr){
    bucket.enqueueTimer = setTimeout(function(){
      var eventData = {
          _id: bucket.key,
          key: bucket.key,
          time: bucket.time,
          stamp: bucket.stamp,
          stats: bucket.stats,
        };
      bucket.enqueueTimer = false;
      this.sockets.emit(this.statsEvent, eventData);
    }.bind(this), 1000);
  }
};

Handler.prototype.enqueueSlowRecord = function(record){
  var tmr = this._slowRecordTimer;
  if(!tmr){
    this._slowRecords = [record];
    return this._slowRecordTimer = setTimeout(function(){
      this.sockets.emit(this.event, this._slowRecords);
      this._slowRecordTimer = false;
    }.bind(this));
  }
  this._slowRecords.push(record);
};

var convertv1 = function(record){
  /*
  "name" : "classroom-ui",
"envConfig" : "stg",
"appVersion" : "2.78.10",
"source" : "server",
"hostname" : "stg-use1b-pr-09-ocv2-02x78x10-0001",
"pid" : NumberInt(1135),
"level" : NumberInt(30),
"direction" : "inbound",
"start" : 6.7596817435553E7,
"started" : ISODate("2016-05-01T21:41:08.911+0000"),
"complete" : 6.7596819441958E7,
"completed" : ISODate("2016-05-01T21:41:08.913+0000"),
"duration" : 2.006404995918274,
"conversationId" : "1462138868911-1135-4596",
"url" : "/status",
"method" : "GET",
*/
  var info = record.data[1];
  var direction = (record.data[0].split(/[\t ]+/).shift()||'inbound').toLowerCase();
  var cid = info['Correlation-Id'];
  return {
    _id: record._id,
    direction: direction,
    envConfig: record.env,
    appVersion: record.version,
    source: record.source || 'server',
    hostname: record.host,
    pid: record.pid,
    level: record.level,
    start: info.startTime,
    complete: info.endTime,
    duration: info.duration,
    conversationId: cid,
    correlationId: cid,
    url: info.URL,
    method: info.method || 'GET',
    res: info.Response || info.Payload,
    time: record.dateTime,
    src: record,
    v: 1
  };
};

Handler.prototype.push = function(raw){
  var data = (raw.data && (raw.data[1]||{}).duration)?convertv1(raw):raw;
  if(!data.duration){
    return;
  }
  var bucket = this.getBucket(data.time);
  bucket.stats.count++;
  if(data.direction){
    bucket.stats[data.direction] = (bucket.stats[data.direction]||0)+1;
  }
  if(data.duration < this.threshold){
    return this.enqueueStatsUpdate(bucket);
  }
  if(data.direction){
    bucket.stats[data.direction+'Slow'] = (bucket.stats[data.direction+'Slow']||0)+1;
  }
  bucket.stats.slow++;
  this.records.push(data);
  //this.sockets.emit(this.event, data);
  this.enqueueSlowRecord(data);
  this.store.insert(data, noop);
  if(data.duration > bucket.stats.slowest){
    bucket.stats.slowest = data.duration;
  }
  if(this.records.length>this.retain){
    this.records = this.records.slice(this.records.length-this.retain);
  }
  //this.checkTrimBuckets();
  this.enqueueStatsUpdate(bucket);
};

module.exports = {Handler};
