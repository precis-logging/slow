var {
  Link,
} = ReactRouter;

var sortStats = function(a, b){
  var t1 = (new Date(a.time)).getTime();
  var t2 = (new Date(b.time)).getTime();
  return t1-t2;
};

/*
var addCommas = function(x) {
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};
var isNumeric = function (n){
  return !isNaN(parseFloat(n)) && isFinite(n);
};
*/
var {
  addCommas,
  isNumeric
} = Support;

var escapeHTML = (function(){
  var div = document.createElement('div');
  return function(str){
    div.innerHTML = '';
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };
})();

var SlowTransactionStatsView = React.createClass({
  render(){
    var props = this.props.stats;
    var pc = props.slow>0?Math.round(10000 * (props.slow / props.count))/100:0.0;
    var ipc = props.inboundSlow>0?Math.round(10000 * (props.inboundSlow / props.inbound))/100:0.0;
    var opc = props.outboundSlow>0?Math.round(10000 * (props.outboundSlow / props.outbound))/100:0.0;
    var psStyle = pc>1?{color: 'red', fontWeight: 'bold'}:{};
    return (
      <div>
        <h3>{props.title}</h3>
        <div><label>Since:</label> {props.since?new Date(props.since).toLocaleString():''}</div>
        <div><label>Slow:</label> {addCommas(props.slow)}</div>
        <div><label>Total:</label> {addCommas(props.count)}</div>
        <div><label>Slowest:</label> {addCommas(Math.floor(props.slowest))}ms</div>
        <div><label>Inbound:</label> {addCommas(Math.floor(props.inbound))}</div>
        <div><label>Outbound:</label> {addCommas(Math.floor(props.outbound))}</div>
        <div><label>Inbound Slow:</label> {addCommas(Math.floor(props.inboundSlow))} ({ipc}%)</div>
        <div><label>Outbound Slow:</label> {addCommas(Math.floor(props.outboundSlow))} ({opc}%)</div>
        <div><label>Percent Slow:</label> <span style={psStyle}>{pc}%</span></div>
      </div>
    );
  }
});

var SlowTransactionStats = React.createClass({
  getInitialState(){
    return {
      stats: []
    }
  },
  updateState(SlowTransactions){
    var stats = SlowTransactions.items();
    this.setState({stats});
  },
  componentDidMount(){
    DataStore.getStore('SlowTransactionStats', function(err, SlowTransactions){
      if(err){
        alert(err);
        return console.error(err);
      }
      this.unlisten = SlowTransactions.listen(()=>this.updateState(SlowTransactions));
      this.updateState(SlowTransactions);
    }.bind(this));
  },
  componentWillUnmount(){
    this.unlisten&&this.unlisten();
  },
  render(){
    var now = new Date();
    now = now.getTime();
    var blocks = this.props.segments.reduce((blocks, item)=>{
      blocks[item.title] = {
        count: 0,
        slow: 0,
        inbound: 0,
        outbound: 0,
        inboundSlow: 0,
        outboundSlow: 0,
        slowest: 0,
        title: item.title,
        window: (new Date(now-(1000 * 60 * (item.minutes||1)))).getTime(),
        since: false
      };
      return blocks;
    }, {});
    var segs = Object.keys(blocks).map((key)=>blocks[key]);
    var grouped = this.state.stats.reduce((accum, item)=>{
      var time = new Date(item.time).getTime();
      segs.forEach(function(segment){
        if(time>=segment.window){
          segment.count += item.stats.count;
          segment.slow += item.stats.slow;
          segment.inbound +=  item.stats.inbound||0;
          segment.outbound +=  item.stats.outbound||0;
          segment.inboundSlow +=  item.stats.inboundSlow||0;
          segment.outboundSlow +=  item.stats.outboundSlow||0;
          if(segment.slowest < item.stats.slowest){
            segment.slowest = item.stats.slowest;
          }
          if((!segment.since)||(time<segment.since)){
            segment.since = time;
          }
        }
      });
      return accum;
    }, blocks);
    var stats = Object.keys(grouped).map((key)=>{
      return (
        <div className="col-xl-4 col-lg-4 col-md-4 col-sm-12 col-xs-12" key={key}>
          <SlowTransactionStatsView stats={grouped[key]} />
        </div>
      );
    });
    return (
      <div className="row">
        {stats}
      </div>
    );
  }
});

Actions.register(SlowTransactionStats, {role: 'slow-transactions-stats'});

var SlowTransactionsTable = React.createClass({
  getInitialState(){
    return {
      transactions: []
    }
  },
  updateState(SlowTransactions){
    var transactions = SlowTransactions.items();
    this.setState({transactions});
  },
  componentDidMount(){
    DataStore.getStore('SlowTransactions', function(err, SlowTransactions){
      if(err){
        alert(err);
        return console.error(err);
      }
      this.unlisten = SlowTransactions.listen(()=>this.updateState(SlowTransactions));
      this.updateState(SlowTransactions);
    }.bind(this));
  },
  componentWillUnmount(){
    this.unlisten&&this.unlisten();
  },
  render(){
    var limit = this.props.limit;
    var records = this.state.transactions.reverse();
    if(limit && (records.length > limit)){
      records = records.slice(0, limit);
    }
    var recordRows = records.map((record)=>{
      return(
        <tr key={record._id}>
          <td><Link to={"/slow/inspect/"+record._id}>{record._id}</Link></td>
          <td><Link to={"/slow/inspect/"+record._id}>{record.hostname}</Link></td>
          <td><Link to={"/slow/inspect/"+record._id}>{record.pid}</Link></td>
          <td><Link to={"/slow/inspect/"+record._id}>{record.direction}</Link></td>
          <td><abbr title={record.url}>{record.url.substr(0, 100)}</abbr></td>
          <td><Link to={"/slow/inspect/"+record._id}>{addCommas(Math.round(record.duration))}ms</Link></td>
          <td><Link to={"/slow/inspect/"+record._id}>{new Date(record.time).toLocaleString()}</Link></td>
        </tr>
      );
    });
    return(
      <table className="table table-striped table-condensed">
        <thead>
          <tr>
            <th>ID</th>
            <th>Host</th>
            <th>PID</th>
            <th>Direction</th>
            <th>URL</th>
            <th>Duration</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {recordRows}
        </tbody>
      </table>
    );
  }
});

Actions.register(SlowTransactionsTable, {role: 'slow-transactions-table'});

var TimeSeries2Chart = D3RRC.TimeSeries2Chart;

var SlowTransactionsGraph = React.createClass({
  getInitialState(){
    return {
      stats: []
    }
  },
  updateState(SlowTransactions){
    var stats = SlowTransactions.items();
    this.setState({stats});
  },
  componentDidMount(){
    DataStore.getStore('SlowTransactionStats', function(err, SlowTransactions){
      if(err){
        alert(err);
        return console.error(err);
      }
      this.unlisten = SlowTransactions.listen(()=>this.updateState(SlowTransactions));
      this.updateState(SlowTransactions);
    }.bind(this));
  },
  componentWillUnmount(){
    this.unlisten&&this.unlisten();
  },
  render(){
    var windowTime = new Date();
    windowTime.setMinutes(windowTime.getMinutes()-15);
    var data = this.state.stats.sort(sortStats).map((stat)=>{
      let val = stat.stats.slow / stat.stats.count;
      val = Math.round(val * 10000)/100;
      return [new Date(stat.time), val];
    }).filter((item)=>item[0].getTime()>=windowTime);
    var style={
      '.area': 'fill: steelblue; clip-path: url(#clip);',
      '.axis path': 'fill: none; stroke: #000; shape-rendering: crispEdges;',
      '.axis line': 'fill: none; stroke: #000; shape-rendering: crispEdges;',
      '.brush .extent': 'stroke: #fff; fill-opacity: .125; shape-rendering: crispEdges;',
    };
    var contents = this.state.stats.length>0?<TimeSeries2Chart
      chart-height={200}
      chart-margin={{bottom: 50}}
      chart-style={style}
      data={data}
      />:<span>Loading...</span>;
    return (
      <div>{contents}</div>
    );
  }
});

Actions.register(SlowTransactionsGraph, {role: 'slow-transactions-graph'});
