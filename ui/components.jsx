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
          <td>{record.hostname}</td>
          <td>{record.pid}</td>
          <td>{record.direction}</td>
          <td><abbr title={record.url}>{record.url.substr(0, 100)}</abbr></td>
          <td>{addCommas(Math.round(record.duration))}ms</td>
          <td>{new Date(record.time).toLocaleString()}</td>
        </tr>
      );
    });
    return(
      <table className="table table-striped table-condensed">
        <thead>
          <tr>
            <td>ID</td>
            <td>Host</td>
            <td>PID</td>
            <td>Direction</td>
            <td>URL</td>
            <td>Duration</td>
            <td>Time</td>
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
