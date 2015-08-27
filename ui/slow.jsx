var addCommas = function(x) {
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};
var isNumeric = function (n){
  return !isNaN(parseFloat(n)) && isFinite(n);
};

var Page = React.createClass({
  render(){
    return (
      <div>
        <div><h1>Slow Transactions</h1></div>
          <InjectedComponentSet
            tagName="div"
            containerRequired={false}
            matching={{role: 'slow-transactions-stats'}}
            exposedProps={{segments: [
                {
                  title: 'Last Minute',
                  minutes: 1,
                },
                {
                  title: 'Last 5 Minutes',
                  minutes: 5,
                },
                {
                  title: 'Last 15 Minutes',
                  minutes: 15,
                },
              ]}}
            />
        <InjectedComponentSet
          tagName="div"
          containerRequired={false}
          matching={{role: 'slow-transactions-table'}}
          exposedProps={{limit: 100}}
          />
      </div>
    );
  }
});

Pages.register('SlowTransactions', Page);
