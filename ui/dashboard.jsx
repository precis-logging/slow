var SlowSection = React.createClass({
  render(){
    return(
      <div>
        <h2 className="sub-header">Slow Transactions</h2>
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
      </div>
    );
  }
});

Actions.register(SlowSection, {role: 'dashboard-section'});
