var {
  Link,
} = ReactRouter;

var addCommas = function(x) {
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};
var isNumeric = function (n){
  return !isNaN(parseFloat(n)) && isFinite(n);
};
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
    var psStyle = pc>1?{color: 'red', fontWeight: 'bold'}:{};
    return (
      <div>
        <h3>{props.title}</h3>
        <div><label>Since:</label> {new Date(props.window).toLocaleString()}</div>
        <div><label>Slow:</label> {addCommas(props.slow)}</div>
        <div><label>Total:</label> {addCommas(props.count)}</div>
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
        title: item.title,
        window: (new Date(now-(1000 * 60 * (item.minutes||1)))).getTime()
      };
      return blocks;
    }, {});
    var segs = Object.keys(blocks).map((key)=>blocks[key]);
    var grouped = this.state.stats.reduce((accum, item)=>{
      var time = new Date(item.time).getTime();
      segs.forEach(function(segment){
        if(time>segment.window){
          segment.count += item.stats.count;
          segment.slow += item.stats.slow;
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
