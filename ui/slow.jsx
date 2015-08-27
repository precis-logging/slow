var Page = React.createClass({
  render(){
    return (
      <div>
        <div><h1>Slow Transactions</h1></div>
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
