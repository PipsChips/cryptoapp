import React, { Component } from 'react';
import './App.css';
import moment from 'moment';
import {ma} from 'moving-averages';
var sma = require('sma');

class App extends Component {
  constructor() {
    super();

    this.state = {
      currencies: null,
      timestamp: null,
      selectedSymbol: "",
      startDate: "",
      endDate: "",
      closingPrices: [],
      smaRange: null,
      smaPrices: []
    };

    this.log = this.log.bind(this);
    this.symbolChange = this.symbolChange.bind(this);
    this.calculate = this.calculate.bind(this);
    this.dateChanged = this.dateChanged.bind(this);
    this.smaRangeChanged = this.smaRangeChanged.bind(this);
    
    fetch('https://min-api.cryptocompare.com/data/all/coinlist')
    .then(response => response.json())
    .then(json => {
      var defaultWatchlistNames = [];
      var defaultWatchlistIds = json.DefaultWatchlist.CoinIs.split(",");

      for(var currency in json.Data) {
        if (defaultWatchlistIds.includes(json.Data[currency].Id)) {
          defaultWatchlistNames.push(currency);
        }
      } 

      this.setState({currencies: defaultWatchlistNames});
      this.setState({selectedSymbol: defaultWatchlistNames[0]});
    });
  }


  log() {
    console.log(this);
    console.log("date selected");
  }

  symbolChange(e) {
    this.setState({selectedSymbol: e.target.value});
    console.log("symbol changed to " + e.target.value);
  }

  calculate(e) {
    e.preventDefault();

    var symbol = this.state.selectedSymbol;
    var startDate = moment(this.state.startDate,'YYYY/MM/DD');
    var endDate = moment(this.state.endDate,'YYYY/MM/DD');
    var diffDays = endDate.diff(startDate, 'days');
    var timestamp = parseInt(moment(endDate).format("X"));
    var endPointUrl = `https://min-api.cryptocompare.com/data/histoday?fsym=${symbol}&tsym=EUR&limit=${diffDays}&aggregate=1&toTs=${timestamp}`;
    console.log(endPointUrl);

    fetch(endPointUrl).then(res => res.json())
    .then(json => {
      this.setState({closingPrices: json.Data.map(day => day.close)});
    })
    .then(() => {
      this.setState({smaPrices: ma(this.state.closingPrices, this.state.smaRange)});
    })
    .then(() => {
      console.log(this.state.closingPrices);
      console.log(this.state.smaPrices);
    });
  }

  dateChanged(date, e) {
    date === 'startDate' ? 
      this.setState({startDate: e.target.value}, () => console.log(this.state.startDate)) : 
      this.setState({endDate: e.target.value}, () => console.log(this.state.endDate));

    this.setState({closingPrices: []});
    this.setState({smaPrices: []});    
  }

  smaRangeChanged(e) {
    this.setState({smaRange: parseInt(e.target.value)});
    this.setState({smaPrices: []});    
  }

  render() {
    return (
      <div className="App">
        <form onSubmit={this.calculate}>
          <select value={this.state.selectedSymbol} onChange={this.symbolChange}>
            {this.state.currencies && this.state.currencies.map(curr => 
                <option value={curr} key={curr}>{curr}</option>) 
            }
          </select>
          <br />
          <input type="date" onChange={this.log} onChange={this.dateChanged.bind(this, 'startDate')} />
          <br />
          <input type="date" onChange={this.log} onChange={this.dateChanged.bind(this, 'endDate')} />
          <br />
          <label htmlFor="smaRange">SMA(<i>Range</i>)</label>
          <input id="smaRange" type="number" value={this.state.smaRange} min="1" onChange={this.smaRangeChanged} />
          <br />
          <input type="submit" value="Calculate" />
        </form>
        {(this.state.closingPrices.length > 0) && <h3>Closing Prices:</h3>}
        <ol>
          {this.state.closingPrices.map(price => <li key={price}>{price}</li>)}
        </ol>
        {(this.state.smaPrices.length > 0) && <h3>SMA({this.state.smaRange}):</h3>}
        <ol start={this.state.smaRange}>
          {this.state.smaPrices.map(sma => <li key={sma.toFixed(2)}>{sma.toFixed(2)}</li>)}
        </ol>
      </div>
    );
  }
}

export default App;
