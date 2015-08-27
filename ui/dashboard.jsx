var SlowSection = React.createClass({
  render(){
    return(
      <div>
        <h2 className="sub-header">Slow Transactions</h2>
        <InjectedComponentSet
          tagName="div"
          containerRequired={false}
          matching={{role: 'slow-transactions-table'}}
          exposedProps={{limit: 5}}
          />
      </div>
    );
  }
});

Actions.register(SlowSection, {role: 'dashboard-section'});
