import React, { Component } from 'react';
import { Chart } from 'react-google-charts';
//import PropTypes from 'prop-types';
import './App.css';
import moment from 'moment';
var sma = require('sma');

class App extends Component {
  constructor() {
    super();

    this.state = {
      currencies: [],
      timestamp: null,
      selectedSymbol: "",
      startDate: "",
      endDate: "",
      closingPrices: [],
      openingPrices: [],
      highPrices: [],
      lowPrices: [],
      smaRange: 2,
      smaPrices: [],
      dates: [],
      chartData: []
    };

    this.symbolChanged = this.symbolChanged.bind(this);
    this.calculate = this.calculate.bind(this);
    this.dateChanged = this.dateChanged.bind(this);
    this.smaRangeChanged = this.smaRangeChanged.bind(this);
  }

  componentWillMount(){
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

      this.setState({
        currencies: defaultWatchlistNames,
        selectedSymbol: defaultWatchlistNames[0]
      });
    });
  }

  symbolChanged(e) {
    this.setState({
      selectedSymbol: e.target.value, 
      chartData: []
    });
  }

  dateChanged(date, e) {
    date === 'startDate' ? this.setState({startDate: e.target.value}) : this.setState({endDate: e.target.value});
    this.setState({chartData: []});
  }

  smaRangeChanged(e) {
    this.setState({
      smaRange: parseInt(e.target.value), 
      chartData: []
    });
  }

  calculate(e) {
    e.preventDefault();

    var { selectedSymbol, smaRange, startDate, endDate } = this.state;
    startDate = moment(startDate,'YYYY/MM/DD');
    endDate = moment(endDate,'YYYY/MM/DD');
    var diffDays = endDate.diff(startDate, 'days');
    var timestamp = parseInt(moment(endDate.add(1, 'days')).format("X"));
    var endPointUrl = `https://min-api.cryptocompare.com/data/histoday?fsym=${selectedSymbol}&` +
      `tsym=EUR&limit=${diffDays}&aggregate=1&toTs=${timestamp}`;
    console.log(endPointUrl);

    fetch(endPointUrl).then(res => res.json())
      .then(json => {
        this.setState({
          closingPrices: json.Data.map(day => day.close),
          openingPrices: json.Data.map(day => day.open),
          highPrices: json.Data.map(day => day.high),
          lowPrices: json.Data.map(day => day.low),
          dates: json.Data.map(day => moment.unix(day.time).format("YYYY/MM/DD"))
        });
      })
      .then(() => {
        this.setState({
          smaPrices: sma(this.state.closingPrices, smaRange, (n) => n.toFixed(4)).map(n => parseFloat(n))
        });
      })
      .then(() => {
        var { dates, lowPrices: lp, highPrices: hp, openingPrices: op, closingPrices: cp, smaPrices: sp, smaRange: sr } = this.state;
        var newData = [['Date', 'L(H)-H(L), Open-Close', 'Open', 'Close', 'High', `SMA(${sr})`, 'Closing Price']];

        for (var i = 0; i < dates.length; i++) {
          if(i < sr - 1) {
            if(cp[i] > op[i]) {
              newData.push([dates[i], lp[i], op[i], cp[i], hp[i], null, cp[i]]);
            }
            else {
              newData.push([dates[i], hp[i], op[i], cp[i], lp[i], null, cp[i]]);
            }
          }
          else {
            if(cp[i] > op[i]) {
              newData.push([dates[i], lp[i], op[i], cp[i], hp[i], sp[i - sr + 1], cp[i]]);
            }
            else {
              newData.push([dates[i], hp[i], op[i], cp[i], lp[i], sp[i - sr + 1], cp[i]]);
            }
          }
        }

        this.setState({chartData: newData});
      });
  }

  render() {
    var props = {
      chartType:"ComboChart",
      data: this.state.chartData,
      width:"100%",
      height: 1000,
      options:{
        title:`Candlestick & SMA(${this.state.smaRange}) & Closing price Chart for: ${this.state.selectedSymbol} in EUR(\u20AC)`,
        seriesType: "candlesticks",
        series: {
          1: {type: "line"},
          2: {type: 'line'}
        },
        legend:"none"
      }
    };

    var marginRight = {
      marginRight: 2 + 'em'
    };

    var marginTop = {
      marginTop: 1 + 'em'
    };

    return (
      <div className="App">      
        <form onSubmit={this.calculate} style={marginTop}>
          <label htmlFor="symbol"><b>Select Cryptocurrency: </b></label>
          <select id="symbol" value={this.state.selectedSymbol} style={marginRight} onChange={this.symbolChanged}>
            {this.state.currencies && this.state.currencies.map(curr =>
                <option value={curr} key={curr}>{curr}</option>)
            }
          </select>

          <label htmlFor="startDate"><b>Start Date: </b></label>
          <input id="startDate" type="date" max={moment(moment()).format("YYYY-MM-DD")} 
            style={marginRight} onChange={this.dateChanged.bind(this, 'startDate')} />

          <label htmlFor="endDate"><b>End Date: </b></label>
          <input id="endDate" type="date" 
            min={moment(this.state.startDate).add(1, 'days').format("YYYY-MM-DD")} 
            max={moment(moment()).format("YYYY-MM-DD")}
            style={marginRight} onChange={this.dateChanged.bind(this, 'endDate')} />

          <label htmlFor="smaRange">SMA(<b>Range</b>): </label>
          <input id="smaRange" type="number" value={this.state.smaRange} min="1" 
            style={marginRight} onChange={this.smaRangeChanged} />

          <input type="submit" value="Calculate" />
        </form>

        {(this.state.chartData.length > 0) && (this.state.endDate > this.state.startDate) && <Chart  {...props} />}
      </div>
    );
  }
}

export default App;
